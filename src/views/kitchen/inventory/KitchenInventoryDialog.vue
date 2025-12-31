<!-- src/views/kitchen/inventory/KitchenInventoryDialog.vue -->
<!-- Touch-optimized inventory dialog for Kitchen/Bar Monitor -->
<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isMobile"
    max-width="900px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="kitchen-inventory-dialog">
      <!-- Header -->
      <v-card-title class="dialog-header pa-4">
        <div class="d-flex align-center justify-space-between w-100">
          <div>
            <h3 class="text-h6 font-weight-bold">
              {{ existingInventory ? 'Continue' : 'New' }} Inventory
            </h3>
            <v-chip
              :color="department === 'kitchen' ? 'success' : 'info'"
              size="small"
              class="mt-1"
            >
              <v-icon start size="14">
                {{ department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail' }}
              </v-icon>
              {{ department === 'kitchen' ? 'Kitchen' : 'Bar' }}
            </v-chip>
          </div>
          <v-btn icon="mdi-close" variant="text" size="large" @click="handleClose" />
        </div>
      </v-card-title>

      <v-divider />

      <!-- Progress Section -->
      <div class="progress-section pa-4">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-1">
            <strong>{{ countedItems }}</strong>
            / {{ totalItems }} counted
          </span>
          <span class="text-body-2 text-medium-emphasis">{{ progressPercentage.toFixed(0) }}%</span>
        </div>
        <v-progress-linear :model-value="progressPercentage" height="10" rounded color="primary" />
      </div>

      <!-- Filter Section -->
      <div class="filter-section px-4 pb-2">
        <!-- Row 1: Search + Category + Days Filter -->
        <div class="d-flex align-center flex-wrap gap-2 mb-3">
          <!-- Search by name -->
          <v-text-field
            v-model="searchQuery"
            placeholder="Search..."
            density="compact"
            hide-details
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            clearable
            class="search-field"
          />

          <!-- Category filter -->
          <v-select
            v-model="selectedCategory"
            :items="categoryOptions"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="Category"
            clearable
            class="category-select"
          />

          <!-- Days filter -->
          <v-select
            v-model="daysFilter"
            :items="daysFilterOptions"
            density="compact"
            hide-details
            variant="outlined"
            class="days-select"
          />

          <v-spacer />

          <!-- Sort selector -->
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            density="compact"
            hide-details
            variant="outlined"
            class="sort-select"
          />
        </div>

        <!-- Row 2: Status Chips -->
        <v-chip-group v-model="filterType" mandatory selected-class="text-primary">
          <v-chip value="all" filter variant="outlined">All ({{ totalItems }})</v-chip>
          <v-chip value="uncounted" filter variant="outlined">
            Uncounted ({{ uncountedCount }})
          </v-chip>
          <v-chip value="discrepancy" filter variant="outlined" color="warning">
            Diff ({{ discrepancyCount }})
          </v-chip>
          <v-chip value="stale" filter variant="outlined" color="info">
            Stale ({{ staleCount }})
          </v-chip>
        </v-chip-group>
      </div>

      <v-divider />

      <!-- Items List -->
      <v-card-text class="items-section pa-0">
        <div v-if="isLoading" class="text-center py-12">
          <v-progress-circular indeterminate size="48" color="primary" />
          <p class="mt-4 text-medium-emphasis">Loading products...</p>
        </div>

        <div v-else-if="filteredItems.length === 0" class="text-center py-12">
          <v-icon size="48" color="grey" class="mb-4">mdi-clipboard-check</v-icon>
          <p v-if="filterType === 'uncounted'" class="text-h6">All items counted!</p>
          <p v-else-if="filterType === 'discrepancy'" class="text-h6">No discrepancies</p>
          <p v-else class="text-h6">No products available</p>
          <v-btn
            v-if="filterType !== 'all'"
            variant="outlined"
            class="mt-4"
            @click="filterType = 'all'"
          >
            Show All
          </v-btn>
        </div>

        <div v-else class="items-list">
          <KitchenInventoryItemRow
            v-for="item in filteredItems"
            :key="item.id"
            :model-value="item"
            :responsible-person="responsiblePerson"
            @update:model-value="updateItem"
          />
        </div>
      </v-card-text>

      <v-divider />

      <!-- Summary -->
      <div v-if="hasChanges" class="summary-section pa-4">
        <v-row dense>
          <v-col cols="4" class="text-center">
            <div class="text-caption text-medium-emphasis">Counted</div>
            <div class="text-h6 text-primary">{{ countedItems }}</div>
          </v-col>
          <v-col cols="4" class="text-center">
            <div class="text-caption text-medium-emphasis">Discrepancies</div>
            <div class="text-h6" :class="discrepancyCount > 0 ? 'text-warning' : 'text-success'">
              {{ discrepancyCount }}
            </div>
          </v-col>
          <v-col cols="4" class="text-center">
            <div class="text-caption text-medium-emphasis">Value Impact</div>
            <div
              class="text-h6"
              :class="
                valueDifference > 0 ? 'text-success' : valueDifference < 0 ? 'text-error' : ''
              "
            >
              {{ formatCurrency(valueDifference) }}
            </div>
          </v-col>
        </v-row>
      </div>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="actions-section pa-4">
        <v-btn variant="outlined" size="large" min-width="100" @click="handleClose">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="warning"
          variant="outlined"
          size="large"
          min-width="120"
          :loading="isSaving"
          :disabled="!canSaveDraft"
          @click="handleSaveDraft"
        >
          Save Draft
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          size="large"
          min-width="120"
          :loading="isSaving"
          :disabled="!canComplete"
          @click="handleComplete"
        >
          Complete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useAuthStore } from '@/stores/auth'
import { useInventory } from '@/stores/storage'
import type { InventoryDocument, InventoryItem, CreateInventoryData } from '@/stores/storage'
import type { Department } from '@/stores/productsStore/types'
import { DebugUtils } from '@/utils'
import KitchenInventoryItemRow from './components/KitchenInventoryItemRow.vue'

const MODULE_NAME = 'KitchenInventoryDialog'

// =============================================
// PROPS
// =============================================

interface Props {
  modelValue: boolean
  department: Department
  existingInventory?: InventoryDocument | null
}

const props = withDefaults(defineProps<Props>(), {
  existingInventory: null
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// =============================================
// COMPOSABLES
// =============================================

const { mobile: isMobile } = useDisplay()
const storageStore = useStorageStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const inventory = useInventory()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const isSaving = ref(false)
const filterType = ref<'all' | 'uncounted' | 'discrepancy' | 'stale'>('all')
const sortBy = ref<'name' | 'last_counted'>('name')
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const daysFilter = ref<number | null>(null) // null = all, number = max days since count
const inventoryItems = ref<InventoryItem[]>([])
const currentInventory = ref<InventoryDocument | null>(null)

// Constants
const STALE_DAYS_THRESHOLD = 7

// Sort options for dropdown
const sortOptions = [
  { title: 'Name', value: 'name' },
  { title: 'Last Count', value: 'last_counted' }
]

// Days filter options
const daysFilterOptions = [
  { title: 'All Days', value: null },
  { title: '> 3 days', value: 3 },
  { title: '> 7 days', value: 7 },
  { title: '> 14 days', value: 14 },
  { title: '> 30 days', value: 30 }
]

// Category options - computed from products
const categoryOptions = computed(() => {
  const categories = productsStore.categories || []
  return categories.map(cat => ({
    title: cat.name,
    value: cat.key
  }))
})

// =============================================
// COMPUTED
// =============================================

/**
 * Responsible person - use current user name
 */
const responsiblePerson = computed(() => {
  return authStore.userName || 'User'
})

/**
 * Total items count
 */
const totalItems = computed(() => inventoryItems.value.length)

/**
 * Counted items
 */
const countedItems = computed(() => {
  return inventoryItems.value.filter(item => hasItemBeenCounted(item)).length
})

/**
 * Uncounted items count
 */
const uncountedCount = computed(() => {
  return totalItems.value - countedItems.value
})

/**
 * Progress percentage
 */
const progressPercentage = computed(() => {
  if (totalItems.value === 0) return 0
  return (countedItems.value / totalItems.value) * 100
})

/**
 * Discrepancy count
 */
const discrepancyCount = computed(() => {
  return inventoryItems.value.filter(item => Math.abs(item.difference) > 0.01).length
})

/**
 * Stale items count (not counted in STALE_DAYS_THRESHOLD days or never counted)
 */
const staleCount = computed(() => {
  const now = new Date()
  return inventoryItems.value.filter(item => {
    if (!item.lastCountedAt) return true // Never counted = stale
    const lastCounted = new Date(item.lastCountedAt)
    const daysSince = Math.floor((now.getTime() - lastCounted.getTime()) / (1000 * 60 * 60 * 24))
    return daysSince > STALE_DAYS_THRESHOLD
  }).length
})

/**
 * Total value difference
 */
const valueDifference = computed(() => {
  return inventoryItems.value.reduce((sum, item) => sum + item.valueDifference, 0)
})

/**
 * Has any changes been made
 */
const hasChanges = computed(() => {
  return inventoryItems.value.some(item => hasItemBeenCounted(item))
})

/**
 * Can save as draft
 */
const canSaveDraft = computed(() => {
  return hasChanges.value && !isSaving.value
})

/**
 * Can complete inventory
 */
const canComplete = computed(() => {
  return hasChanges.value && totalItems.value > 0 && !isSaving.value
})

/**
 * Helper to calculate days since last count
 */
function getDaysSinceLastCount(item: InventoryItem): number | null {
  if (!item.lastCountedAt) return null
  const lastCounted = new Date(item.lastCountedAt)
  const now = new Date()
  return Math.floor((now.getTime() - lastCounted.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Filtered and sorted items
 */
const filteredItems = computed(() => {
  let items = [...inventoryItems.value]

  // 1. Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    items = items.filter(item => item.itemName.toLowerCase().includes(query))
  }

  // 2. Apply category filter
  if (selectedCategory.value) {
    items = items.filter(item => item.category === selectedCategory.value)
  }

  // 3. Apply days filter
  if (daysFilter.value !== null) {
    items = items.filter(item => {
      const days = getDaysSinceLastCount(item)
      if (days === null) return true // Never counted = include
      return days > daysFilter.value!
    })
  }

  // 4. Apply status filter
  switch (filterType.value) {
    case 'uncounted':
      items = items.filter(item => !hasItemBeenCounted(item))
      break
    case 'discrepancy':
      items = items.filter(item => Math.abs(item.difference) > 0.01)
      break
    case 'stale':
      items = items.filter(item => {
        const days = getDaysSinceLastCount(item)
        if (days === null) return true
        return days > STALE_DAYS_THRESHOLD
      })
      break
    default:
      break
  }

  // 5. Apply sort
  items.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.itemName.localeCompare(b.itemName)
      case 'last_counted':
        // Oldest first (never counted items come first)
        const daysA = getDaysSinceLastCount(a)
        const daysB = getDaysSinceLastCount(b)
        // null (never counted) should come first
        if (daysA === null && daysB === null) return 0
        if (daysA === null) return -1
        if (daysB === null) return 1
        // More days = older = higher priority
        return daysB - daysA
      default:
        return 0
    }
  })

  return items
})

// =============================================
// METHODS
// =============================================

/**
 * Check if item has been counted
 * Only returns true if user explicitly interacted with the item
 */
function hasItemBeenCounted(item: InventoryItem): boolean {
  return (
    item.confirmed === true || // User explicitly confirmed
    item.userInteracted === true || // User interacted (clicked +/-, entered value)
    !!item.countedBy // Has countedBy set (from previous session)
  )
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  if (Math.abs(amount) < 1) return 'Rp 0'

  const prefix = amount > 0 ? '+' : ''
  return (
    prefix +
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  )
}

/**
 * Initialize inventory items from balances
 */
function initializeItems() {
  DebugUtils.info(MODULE_NAME, 'Initializing inventory items', {
    department: props.department
  })

  // Set department filter for inventory composable
  inventory.selectedDepartment.value = props.department

  const balances = inventory.filteredBalances.value

  if (!balances || balances.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'No balances available', { department: props.department })
    inventoryItems.value = []
    return
  }

  inventoryItems.value = balances.map(balance => {
    // Get product info from productsStore
    const product = productsStore.products.find(p => p.id === balance.itemId)
    return {
      id: `inv-${balance.itemId}-${Date.now()}`,
      itemId: balance.itemId,
      itemType: balance.itemType,
      itemName: balance.itemName,
      category: product?.category?.key || product?.category, // Support both object and string format
      systemQuantity: balance.totalQuantity,
      actualQuantity: balance.totalQuantity,
      difference: 0,
      unit: balance.unit,
      averageCost: balance.averageCost,
      valueDifference: 0,
      notes: '',
      countedBy: '',
      confirmed: false,
      userInteracted: false,
      lastCountedAt: product?.lastCountedAt
    }
  })

  DebugUtils.info(MODULE_NAME, 'Inventory items initialized', {
    count: inventoryItems.value.length
  })
}

/**
 * Load existing inventory
 */
function loadExistingInventory() {
  if (!props.existingInventory) return

  DebugUtils.info(MODULE_NAME, 'Loading existing inventory', {
    inventoryId: props.existingInventory.id,
    status: props.existingInventory.status
  })

  currentInventory.value = props.existingInventory

  if (props.existingInventory.items?.length > 0) {
    inventoryItems.value = [...props.existingInventory.items]
  } else {
    initializeItems()
  }
}

/**
 * Update single item
 */
function updateItem(updatedItem: InventoryItem) {
  const index = inventoryItems.value.findIndex(item => item.id === updatedItem.id)
  if (index !== -1) {
    inventoryItems.value[index] = updatedItem
  }
}

/**
 * Handle save draft
 */
async function handleSaveDraft() {
  if (!canSaveDraft.value) return

  try {
    isSaving.value = true

    DebugUtils.info(MODULE_NAME, 'Saving draft', {
      department: props.department,
      itemsCount: inventoryItems.value.length
    })

    // Create inventory if not exists
    if (!currentInventory.value) {
      const data: CreateInventoryData = {
        department: props.department,
        responsiblePerson: responsiblePerson.value
      }
      currentInventory.value = await inventory.startInventory(data)
    }

    // Update items
    await inventory.updateInventory(currentInventory.value.id, inventoryItems.value)

    emit('success', `Draft saved. ${countedItems.value}/${totalItems.value} items counted.`)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save draft', { error })
    emit('error', 'Failed to save draft')
  } finally {
    isSaving.value = false
  }
}

/**
 * Handle complete
 */
async function handleComplete() {
  if (!canComplete.value) return

  try {
    isSaving.value = true

    DebugUtils.info(MODULE_NAME, 'Completing inventory', {
      department: props.department,
      discrepancies: discrepancyCount.value
    })

    // Create inventory if not exists
    if (!currentInventory.value) {
      const data: CreateInventoryData = {
        department: props.department,
        responsiblePerson: responsiblePerson.value
      }
      currentInventory.value = await inventory.startInventory(data)
    }

    // Update and finalize
    await inventory.updateInventory(currentInventory.value.id, inventoryItems.value)
    await inventory.finalizeInventory(currentInventory.value.id)

    const msg =
      discrepancyCount.value > 0
        ? `Inventory completed. ${discrepancyCount.value} discrepancies found.`
        : 'Inventory completed successfully. No discrepancies.'

    emit('success', msg)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to complete inventory', { error })
    emit('error', 'Failed to complete inventory')
  } finally {
    isSaving.value = false
  }
}

/**
 * Handle close
 */
function handleClose() {
  inventoryItems.value = []
  currentInventory.value = null
  // Reset all filters
  filterType.value = 'all'
  searchQuery.value = ''
  selectedCategory.value = null
  daysFilter.value = null
  sortBy.value = 'name'
  emit('update:modelValue', false)
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      isLoading.value = true

      setTimeout(() => {
        if (props.existingInventory) {
          loadExistingInventory()
        } else {
          initializeItems()
        }
        isLoading.value = false
      }, 100)
    }
  }
)

watch(
  () => props.department,
  () => {
    if (props.modelValue && !props.existingInventory) {
      initializeItems()
    }
  }
)
</script>

<style scoped lang="scss">
.kitchen-inventory-dialog {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.dialog-header {
  background-color: var(--v-theme-surface);
}

.progress-section {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.filter-section {
  background-color: var(--v-theme-surface);
}

.search-field {
  max-width: 180px;
  min-width: 140px;
}

.category-select {
  max-width: 150px;
  min-width: 120px;
}

.days-select {
  max-width: 130px;
  min-width: 110px;
}

.sort-select {
  max-width: 140px;
  min-width: 120px;
}

.items-section {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  background-color: var(--v-theme-background);
}

.items-list {
  padding: var(--spacing-sm);
}

.summary-section {
  background-color: rgba(var(--v-theme-info), 0.04);
}

.actions-section {
  background-color: var(--v-theme-surface);
}

/* Mobile fullscreen adjustments */
@media (max-width: 600px) {
  .kitchen-inventory-dialog {
    max-height: 100vh;
  }

  .items-section {
    max-height: none;
    flex: 1;
  }
}
</style>
