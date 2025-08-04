<!-- src/views/storage/components/MultiConsumptionDialog.vue -->
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
          <h3>Multi-Item Consumption - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">
            Consume multiple items with FIFO cost calculation
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

          <!-- Consumption Reason -->
          <div class="mb-4">
            <v-label class="mb-2">Usage Type</v-label>
            <v-select
              v-model="formData.consumptionDetails.reason"
              :items="reasonOptions"
              variant="outlined"
              class="mb-2"
            />

            <!-- Related Item Selection -->
            <v-text-field
              v-if="formData.consumptionDetails.reason !== 'other'"
              v-model="formData.consumptionDetails.relatedName"
              :label="getRelatedLabel()"
              variant="outlined"
              placeholder="Start typing to search..."
            />

            <!-- Portion Count -->
            <v-text-field
              v-if="formData.consumptionDetails.reason === 'recipe'"
              v-model.number="formData.consumptionDetails.portionCount"
              label="Portion Count"
              type="number"
              min="1"
              variant="outlined"
            />
          </div>

          <!-- Quick Add Buttons -->
          <div class="mb-4">
            <v-label class="mb-2">Quick Add Popular Items</v-label>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                v-for="item in quickItems"
                :key="item.id"
                size="small"
                variant="outlined"
                @click="addQuickItem(item)"
              >
                {{ getItemIcon(item.type) }} {{ item.name }}
              </v-btn>
            </div>
          </div>

          <!-- Items to Consume -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label>Items to Consume</v-label>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="addItem"
              >
                Add Item
              </v-btn>
            </div>

            <!-- Consumption Items List -->
            <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-package-variant" size="48" class="mb-2" />
              <div>No items added yet</div>
              <div class="text-caption">Click "Add Item" or use quick add buttons</div>
            </div>

            <div v-else class="consumption-items">
              <consumption-item-card
                v-for="(item, index) in formData.items"
                :key="index"
                v-model="formData.items[index]"
                :department="department"
                class="mb-3"
                @remove="removeItem(index)"
              />
            </div>
          </div>

          <!-- Total Cost -->
          <v-card v-if="totalCost > 0" variant="tonal" color="primary" class="mb-4">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-subtitle-1 font-weight-medium">Total Cost</div>
                <div class="text-caption">Based on FIFO calculation</div>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatCurrency(totalCost) }}
              </div>
            </v-card-text>
          </v-card>

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
          Confirm Consumption
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <add-consumption-item-dialog
      v-model="showAddItemDialog"
      :department="department"
      @add-item="handleAddItem"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type { StorageDepartment, ConsumptionItem, CreateConsumptionData } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import ConsumptionItemCard from './ConsumptionItemCard.vue'
import AddConsumptionItemDialog from './AddConsumptionItemDialog.vue'

const MODULE_NAME = 'MultiConsumptionDialog'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
  initialItems?: ConsumptionItem[]
}

const props = withDefaults(defineProps<Props>(), {
  initialItems: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

// Store
const storageStore = useStorageStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)

const formData = ref<CreateConsumptionData>({
  department: props.department,
  responsiblePerson: '',
  items: [],
  consumptionDetails: {
    reason: 'other',
    relatedId: '',
    relatedName: '',
    portionCount: 1
  },
  notes: ''
})

// Computed
const reasonOptions = computed(() => [
  { title: 'Recipe/Cooking', value: 'recipe' },
  { title: 'Menu Item', value: 'menu_item' },
  { title: 'Waste/Spoiled', value: 'waste' },
  { title: 'Expired', value: 'expired' },
  { title: 'Other', value: 'other' }
])

const quickItems = computed(() => {
  // Mock quick items - in real app, get from store
  return [
    { id: 'beef-steak', name: 'Beef Steak', type: 'product' },
    { id: 'potato', name: 'Potato', type: 'product' },
    { id: 'garlic', name: 'Garlic', type: 'product' },
    { id: 'beef-rendang-prep', name: 'Beef Rendang', type: 'preparation' }
  ].filter(
    item =>
      // Filter by department - simplified logic
      props.department === 'kitchen' || item.type === 'product'
  )
})

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => {
    try {
      return (
        sum +
        storageStore.calculateConsumptionCost(
          item.itemId,
          item.itemType,
          props.department,
          item.quantity
        )
      )
    } catch {
      return sum
    }
  }, 0)
})

const canSubmit = computed(
  () => isFormValid.value && formData.value.items.length > 0 && !loading.value
)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getRelatedLabel(): string {
  switch (formData.value.consumptionDetails?.reason) {
    case 'recipe':
      return 'Recipe Name'
    case 'menu_item':
      return 'Menu Item'
    default:
      return 'Related Item'
  }
}

function getItemIcon(type: string): string {
  return type === 'product' ? '🥩' : '🍲'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

interface QuickItem {
  id: string
  name: string
  type: 'product' | 'preparation'
}

function addQuickItem(item: QuickItem) {
  const existingIndex = formData.value.items.findIndex(i => i.itemId === item.id)

  if (existingIndex !== -1) {
    // Increase quantity if item already exists
    formData.value.items[existingIndex].quantity += 1
  } else {
    // Add new item
    formData.value.items.push({
      itemId: item.id,
      itemType: item.type as 'product' | 'preparation',
      quantity: 1,
      notes: ''
    })
  }
}

function addItem() {
  showAddItemDialog.value = true
}

function handleAddItem(item: ConsumptionItem) {
  formData.value.items.push(item)
  showAddItemDialog.value = false
}

function removeItem(index: number) {
  formData.value.items.splice(index, 1)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Submitting consumption', { formData: formData.value })

    await storageStore.createConsumption(formData.value)

    DebugUtils.info(MODULE_NAME, 'Consumption created successfully')
    emit('success')
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create consumption', { error })
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
      reason: 'other',
      relatedId: '',
      relatedName: '',
      portionCount: 1
    },
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}

// Watch for prop changes
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      formData.value.department = props.department
      if (props.initialItems.length > 0) {
        formData.value.items = [...props.initialItems]
      }
    }
  }
)

watch(
  () => props.department,
  newDept => {
    formData.value.department = newDept
  }
)
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

<style lang="scss" scoped>
.consumption-items {
  max-height: 400px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}
</style>
