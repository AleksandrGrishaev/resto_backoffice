<!-- src/views/preparation/components/PreparationConsumptionDialog.vue - Компонент потребления полуфабрикатов -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Use Preparations - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">
            Record preparation usage with FIFO cost calculation
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid" @submit.prevent="handleSubmit">
          <!-- Responsible Person -->
          <v-text-field
            v-model="formData.responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <!-- Usage Details -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Usage Details</v-card-title>
            <v-card-text class="pb-2">
              <v-row>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="formData.consumptionDetails.reason"
                    label="Usage Reason"
                    :items="usageReasonOptions"
                    :rules="[v => !!v || 'Required field']"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.consumptionDetails.relatedName"
                    label="Related Item (Menu/Order)"
                    variant="outlined"
                    density="compact"
                    :placeholder="getRelatedPlaceholder()"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="formData.consumptionDetails.portionCount"
                    label="Portions Count"
                    type="number"
                    min="1"
                    variant="outlined"
                    density="compact"
                    :disabled="!isPortionCountRelevant()"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Quick Add Section -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label>Popular Preparations</v-label>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="showAddItemDialog = true"
              >
                Add Preparation
              </v-btn>
            </div>

            <!-- Quick Add Buttons -->
            <div class="d-flex flex-wrap gap-2 mb-4">
              <v-btn
                v-for="prep in quickPreparations"
                :key="prep.id"
                size="small"
                variant="outlined"
                @click="addQuickPreparation(prep)"
              >
                🍲 {{ prep.name }}
              </v-btn>
            </div>
          </div>

          <!-- Preparations List -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label>Preparations to Use ({{ formData.items.length }})</v-label>
              <v-chip v-if="totalValue > 0" color="primary" variant="tonal" size="small">
                Total: {{ formatCurrency(totalValue) }}
              </v-chip>
            </div>

            <!-- Items List -->
            <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-chef-hat" size="48" class="mb-2" />
              <div>No preparations added yet</div>
              <div class="text-caption">Add preparations to record their usage</div>
            </div>

            <div v-else class="consumption-items">
              <preparation-consumption-item-card
                v-for="(item, index) in formData.items"
                :key="index"
                v-model="formData.items[index]"
                :department="department"
                class="mb-3"
                @remove="removeItem(index)"
                @error="handleItemError"
              />
            </div>
          </div>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-4"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          Record Usage
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <add-preparation-consumption-item-dialog
      v-model="showAddItemDialog"
      :department="department"
      @add-item="handleAddItem"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type {
  PreparationDepartment,
  CreatePreparationConsumptionData,
  PreparationConsumptionItem
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

// Components
import PreparationConsumptionItemCard from './PreparationConsumptionItemCard.vue'
import AddPreparationConsumptionItemDialog from './AddPreparationConsumptionItemDialog.vue'

const MODULE_NAME = 'PreparationConsumptionDialog'

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)

const formData = ref<CreatePreparationConsumptionData>({
  department: props.department,
  responsiblePerson: '',
  items: [],
  consumptionDetails: {
    reason: 'menu_item',
    relatedName: '',
    portionCount: 1
  },
  notes: ''
})

// Computed
const usageReasonOptions = computed(() => [
  { title: 'Menu Item', value: 'menu_item' },
  { title: 'Catering Order', value: 'catering' },
  { title: 'Waste/Spoilage', value: 'waste' },
  { title: 'Expired', value: 'expired' },
  { title: 'Damage', value: 'damage' },
  { title: 'Other', value: 'other' }
])

const quickPreparations = computed(() => {
  try {
    return preparationStore.quickPreparations(props.department).slice(0, 6)
  } catch (error) {
    return []
  }
})

const totalValue = computed(() => {
  try {
    return formData.value.items.reduce((sum, item) => {
      const cost = preparationStore.calculateConsumptionCost(
        item.preparationId,
        props.department,
        item.quantity
      )
      return sum + cost
    }, 0)
  } catch (error) {
    return 0
  }
})

const canSubmit = computed(
  () =>
    isFormValid.value &&
    formData.value.items.length > 0 &&
    !loading.value &&
    formData.value.consumptionDetails.reason
)

// Methods
function formatDepartment(dept: PreparationDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatUsageReason(reason: string): string {
  const reasons: Record<string, string> = {
    menu_item: 'Menu Item',
    catering: 'Catering',
    waste: 'Waste',
    expired: 'Expired',
    damage: 'Damage',
    other: 'Other'
  }
  return reasons[reason] || reason
}

function getRelatedPlaceholder(): string {
  switch (formData.value.consumptionDetails.reason) {
    case 'menu_item':
      return 'e.g., Beef Rendang, Pasta Marinara'
    case 'catering':
      return 'e.g., Wedding Order #123'
    case 'waste':
      return 'e.g., Quality issue'
    default:
      return 'Optional description'
  }
}

function isPortionCountRelevant(): boolean {
  return ['menu_item', 'catering'].includes(formData.value.consumptionDetails.reason)
}

function addQuickPreparation(prep: any) {
  const existingIndex = formData.value.items.findIndex(item => item.preparationId === prep.id)

  if (existingIndex !== -1) {
    // Increase quantity if already exists
    formData.value.items[existingIndex].quantity += 100 // 100g default
  } else {
    // Add new item
    const newItem: PreparationConsumptionItem = {
      preparationId: prep.id,
      quantity: 100, // 100g default
      notes: ''
    }
    formData.value.items.push(newItem)
  }
}

function handleAddItem(item: PreparationConsumptionItem) {
  formData.value.items.push(item)
  showAddItemDialog.value = false
}

function removeItem(index: number) {
  formData.value.items.splice(index, 1)
}

function handleItemError(message: string) {
  emit('error', message)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Submitting preparation consumption', {
      formData: formData.value
    })

    await preparationStore.createConsumption(formData.value)

    DebugUtils.info(MODULE_NAME, 'Preparation consumption created successfully')

    const message = `Used ${formData.value.items.length} preparation${formData.value.items.length !== 1 ? 's' : ''} for ${formatUsageReason(formData.value.consumptionDetails.reason)}`
    emit('success', message)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create preparation consumption', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to record usage')
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  formData.value = {
    department: props.department,
    responsiblePerson: '',
    items: [],
    consumptionDetails: {
      reason: 'menu_item',
      relatedName: '',
      portionCount: 1
    },
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>

<style lang="scss" scoped>
.consumption-items {
  max-height: 400px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}
</style>
