<!-- src/views/storage/components/InventoryDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Inventory - {{ formatDepartment(department) }} {{ formatItemType(itemType) }}</h3>
          <div class="text-caption text-medium-emphasis">
            Count all items and enter actual quantities
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Responsible Person -->
          <v-text-field
            v-model="responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <!-- Progress and Filter -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div>
                <div class="text-subtitle-1">
                  Progress: {{ countedItems }}/{{ totalItems }} items counted
                </div>
                <v-progress-linear
                  :model-value="progressPercentage"
                  height="6"
                  rounded
                  color="primary"
                  class="mt-1"
                />
              </div>

              <v-btn-toggle v-model="filterType" density="compact">
                <v-btn value="all" size="small">All</v-btn>
                <v-btn value="discrepancy" size="small">Discrepancies</v-btn>
                <v-btn value="uncounted" size="small">Uncounted</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <!-- Items List -->
          <div class="inventory-items">
            <div v-if="filteredItems.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-clipboard-list" size="48" class="mb-2" />
              <div>No items to count</div>
              <div class="text-caption">All {{ formatItemType(itemType) }} have been counted</div>
            </div>

            <div v-else>
              <inventory-item-row
                v-for="item in filteredItems"
                :key="item.id"
                v-model="inventoryItems[getItemIndex(item.id)]"
                class="mb-2"
              />
            </div>
          </div>

          <!-- Summary -->
          <v-card v-if="hasSummary" variant="tonal" color="info" class="mt-4">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-medium mb-2">Inventory Summary</div>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Total Items</div>
                  <div class="text-h6">{{ totalItems }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Discrepancies</div>
                  <div
                    class="text-h6"
                    :class="discrepancyCount > 0 ? 'text-warning' : 'text-success'"
                  >
                    {{ discrepancyCount }}
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Value Difference</div>
                  <div
                    class="text-h6"
                    :class="valueDifference !== 0 ? 'text-warning' : 'text-success'"
                  >
                    {{ formatCurrency(valueDifference) }}
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Status</div>
                  <v-chip :color="isComplete ? 'success' : 'warning'" size="small" variant="flat">
                    {{ isComplete ? 'Complete' : 'In Progress' }}
                  </v-chip>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
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
          {{ isComplete ? 'Finalize Inventory' : 'Save Draft' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type {
  StorageDepartment,
  StorageItemType,
  CreateInventoryData,
  InventoryItem
} from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import InventoryItemRow from './InventoryItemRow.vue'

const MODULE_NAME = 'InventoryDialog'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
  itemType: StorageItemType
}

const props = defineProps<Props>()

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
const responsiblePerson = ref('')
const filterType = ref('all')
const inventoryItems = ref<InventoryItem[]>([])

// Computed
const availableBalances = computed(() =>
  storageStore.state.balances.filter(
    b => b.department === props.department && b.itemType === props.itemType && b.totalQuantity > 0
  )
)

const filteredItems = computed(() => {
  switch (filterType.value) {
    case 'discrepancy':
      return inventoryItems.value.filter(item => item.difference !== 0)
    case 'uncounted':
      return inventoryItems.value.filter(item => item.actualQuantity === item.systemQuantity)
    default:
      return inventoryItems.value
  }
})

const totalItems = computed(() => inventoryItems.value.length)

const countedItems = computed(
  () => inventoryItems.value.filter(item => item.actualQuantity !== item.systemQuantity).length
)

const progressPercentage = computed(() =>
  totalItems.value > 0 ? (countedItems.value / totalItems.value) * 100 : 0
)

const discrepancyCount = computed(
  () => inventoryItems.value.filter(item => item.difference !== 0).length
)

const valueDifference = computed(() =>
  inventoryItems.value.reduce((sum, item) => sum + item.valueDifference, 0)
)

const isComplete = computed(() => countedItems.value === totalItems.value)

const hasSummary = computed(() => inventoryItems.value.length > 0)

const canSubmit = computed(() => isFormValid.value && responsiblePerson.value && !loading.value)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Products' : 'Preparations'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getItemIndex(itemId: string): number {
  return inventoryItems.value.findIndex(item => item.id === itemId)
}

function initializeInventoryItems() {
  inventoryItems.value = availableBalances.value.map(balance => ({
    id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    itemId: balance.itemId,
    itemType: balance.itemType,
    itemName: balance.itemName,
    systemQuantity: balance.totalQuantity,
    actualQuantity: balance.totalQuantity, // Default to system quantity
    difference: 0,
    unit: balance.unit,
    averageCost: balance.averageCost,
    valueDifference: 0,
    notes: '',
    countedBy: ''
  }))
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Starting inventory', {
      department: props.department,
      itemType: props.itemType,
      responsiblePerson: responsiblePerson.value
    })

    const inventoryData: CreateInventoryData = {
      department: props.department,
      itemType: props.itemType,
      responsiblePerson: responsiblePerson.value
    }

    await storageStore.startInventory(inventoryData)

    DebugUtils.info(MODULE_NAME, 'Inventory started successfully')
    emit('success')
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to start inventory', { error })
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  responsiblePerson.value = ''
  filterType.value = 'all'
  inventoryItems.value = []

  if (form.value) {
    form.value.resetValidation()
  }
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      initializeInventoryItems()
    }
  }
)
</script>

<style lang="scss" scoped>
.inventory-items {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  padding: 8px;
}
</style>
