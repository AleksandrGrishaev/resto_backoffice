<!-- src/views/storage/StorageView.vue - FIXED: Proper store access and error handling -->
<template>
  <div class="storage-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">📦 Product Storage</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Raw ingredients inventory with FIFO cost tracking
        </p>
        <v-chip size="small" color="primary" variant="tonal" class="mt-1">
          <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
          Products Only
        </v-chip>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-clipboard-list"
          :disabled="storageStore.state.value.loading.balances"
          @click="openInventoryDialog"
        >
          Count Inventory
        </v-btn>
        <writeoff-widget
          v-if="selectedDepartment"
          :department="selectedDepartment"
          @success="handleWriteOffSuccess"
          @refresh-needed="refreshCurrentData"
        />
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="storageStore.state.value.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="storageStore.clearError"
    >
      <v-alert-title>Storage Error</v-alert-title>
      {{ storageStore.state.value.error }}
    </v-alert>

    <!-- Department Tabs -->
    <v-tabs v-model="selectedDepartment" class="mb-4" color="primary">
      <v-tab value="kitchen">
        <v-icon icon="mdi-silverware-fork-knife" class="mr-2" />
        Kitchen
        <v-chip v-if="kitchenItemCount > 0" size="small" class="ml-2" variant="tonal">
          {{ kitchenItemCount }}
        </v-chip>
      </v-tab>
      <v-tab value="bar">
        <v-icon icon="mdi-coffee" class="mr-2" />
        Bar
        <v-chip v-if="barItemCount > 0" size="small" class="ml-2" variant="tonal">
          {{ barItemCount }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Alerts Banner -->
    <storage-alerts
      v-if="isStoreReady"
      :alerts="enhancedAlertCounts"
      :department="selectedDepartment"
      class="mb-4"
      @show-expiring="showExpiringItems"
      @show-expired="showExpiredItems"
      @show-low-stock="showLowStockItems"
    />

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
      <v-tab value="products">
        <v-icon icon="mdi-package-variant" class="mr-2" />
        Raw Products
        <v-chip v-if="displayProductBalances.length > 0" size="small" class="ml-2" variant="tonal">
          {{ displayProductBalances.length }}
        </v-chip>
      </v-tab>
      <v-tab value="operations">
        <v-icon icon="mdi-history" class="mr-2" />
        Operations
        <v-chip v-if="recentOperations.length > 0" size="small" class="ml-2" variant="tonal">
          {{ recentOperations.length }}
        </v-chip>
      </v-tab>
      <v-tab value="inventories">
        <v-icon icon="mdi-clipboard-list" class="mr-2" />
        Inventories
        <v-chip v-if="recentInventories.length > 0" size="small" class="ml-2" variant="tonal">
          {{ recentInventories.length }}
        </v-chip>
      </v-tab>
      <v-tab value="analytics">
        <v-icon icon="mdi-chart-line" class="mr-2" />
        Analytics
      </v-tab>
    </v-tabs>

    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="ml-4">Loading storage data...</span>
    </div>

    <!-- Content -->
    <v-tabs-window v-else-if="isStoreReady" v-model="selectedTab">
      <!-- Products Tab -->
      <v-tabs-window-item value="products">
        <div v-if="allProductBalances.length === 0">
          <v-empty-state
            headline="No Products Found"
            title="No products available for this department"
            text="Products will appear here after supplier deliveries. Use the Suppliers module to order and receive inventory."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" to="/suppliers" prepend-icon="mdi-truck">
                Go to Suppliers
              </v-btn>
            </template>
          </v-empty-state>
        </div>
        <storage-stock-table
          v-else
          :balances="allProductBalances"
          :loading="isLoading"
          :show-zero-stock="showZeroStock"
          :storage-store="storageStore"
          :department="selectedDepartment"
          @write-off="handleWriteOffFromBalance"
          @toggle-zero-stock="toggleZeroStockFilter"
        />
      </v-tabs-window-item>

      <!-- Operations Tab -->
      <v-tabs-window-item value="operations">
        <div v-if="recentOperations.length === 0">
          <v-empty-state
            headline="No Operations Found"
            title="No recent operations for this department"
            text="Operations will appear here after supplier deliveries or inventory activities."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" to="/suppliers" prepend-icon="mdi-truck">
                Go to Suppliers
              </v-btn>
            </template>
          </v-empty-state>
        </div>
        <storage-operations-table
          v-else
          :operations="recentOperations"
          :loading="storageStore.state.value.loading.operations"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>

      <!-- Inventories Tab -->
      <v-tabs-window-item value="inventories">
        <div v-if="recentInventories.length === 0">
          <v-empty-state
            headline="No Inventories Found"
            title="No inventory records for this department"
            text="Start an inventory to track and correct stock levels."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="openInventoryDialog">
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                Start Product Inventory
              </v-btn>
            </template>
          </v-empty-state>
        </div>
        <storage-inventories-table
          v-else
          :inventories="recentInventories"
          :loading="storageStore.state.value.loading.inventory"
          :department="selectedDepartment"
          :show-zero-stock="showZeroStock"
          @edit-inventory="handleEditInventory"
          @start-inventory="handleStartInventory"
          @toggle-zero-stock="toggleZeroStockFilter"
        />
      </v-tabs-window-item>

      <!-- Analytics Tab -->
      <v-tabs-window-item value="analytics">
        <storage-analytics-tab :department="selectedDepartment" />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Dialogs -->
    <inventory-dialog
      v-model="showInventoryDialog"
      :department="selectedDepartment"
      item-type="product"
      :existing-inventory="editingInventory"
      :show-zero-stock="showZeroStock"
      @success="handleInventorySuccess"
      @error="handleOperationError"
      @toggle-zero-stock="toggleZeroStockFilter"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000" location="top">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000" location="top">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showErrorSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useWriteOff } from '@/stores/storage'
import type { StorageDepartment, InventoryDocument } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Import Write-off Components
import WriteoffWidget from './components/writeoff/WriteOffWidget.vue'

// Components
import StorageAlerts from './components/StorageAlerts.vue'
import StorageStockTable from './components/StorageStockTable.vue'
import StorageOperationsTable from './components/StorageOperationsTable.vue'
import StorageInventoriesTable from './components/StorageInventoriesTable.vue'
import StorageAnalyticsTab from './components/tabs/StorageAnalyticsTab.vue'
import InventoryDialog from './components/InventoryDialog.vue'

const MODULE_NAME = 'StorageView'

// Store & Composables
const storageStore = useStorageStore()
const productsStore = useProductsStore()
const writeOff = useWriteOff()

// State
const selectedDepartment = ref<StorageDepartment>('kitchen')
const selectedTab = ref('products')
const showInventoryDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const editingInventory = ref<InventoryDocument | null>(null)
const showZeroStock = ref(false)
const isInitialized = ref(false)

// ✅ FIXED: Store readiness check
const isStoreReady = computed(() => {
  return (
    isInitialized.value &&
    storageStore.state?.value &&
    storageStore.filteredBalances?.value !== undefined
  )
})

const isLoading = computed(() => {
  return (
    !isInitialized.value ||
    storageStore.state?.value?.loading?.balances ||
    storageStore.state?.value?.loading?.operations
  )
})

// ✅ FIXED: Safe access to store data
const allProductBalances = computed(() => {
  if (!isStoreReady.value || !storageStore.filteredBalances?.value) {
    return []
  }

  try {
    return storageStore.filteredBalances.value.filter(
      b => b && b.itemType === 'product' && b.department === selectedDepartment.value
    )
  } catch (error) {
    console.warn('Error filtering all product balances:', error)
    return []
  }
})

const recentOperations = computed(() => {
  if (!isStoreReady.value || !storageStore.state?.value?.operations) {
    return []
  }

  try {
    return storageStore.state.value.operations
      .filter(op => op && op.department === selectedDepartment.value)
      .slice(0, 20)
  } catch (error) {
    console.warn('Error filtering recent operations:', error)
    return []
  }
})

const recentInventories = computed(() => {
  if (!isStoreReady.value || !storageStore.state?.value?.inventories) {
    return []
  }

  try {
    return storageStore.state.value.inventories
      .filter(inv => inv && inv.department === selectedDepartment.value)
      .slice(0, 20)
  } catch (error) {
    console.warn('Error filtering recent inventories:', error)
    return []
  }
})

// ✅ FIXED: Proper computed property access
const alertCounts = computed(() => {
  if (!isStoreReady.value) {
    return { expiring: 0, expired: 0, lowStock: 0 }
  }

  try {
    return {
      expiring: storageStore.nearExpiryItemsCount?.value || 0,
      expired: storageStore.expiredItemsCount?.value || 0,
      lowStock: storageStore.lowStockItemsCount?.value || 0
    }
  } catch (error) {
    console.warn('Error getting alert counts:', error)
    return { expiring: 0, expired: 0, lowStock: 0 }
  }
})

const enhancedAlertCounts = computed(() => {
  return {
    ...alertCounts.value
  }
})

// ✅ FIXED: Department counts with proper safety checks
const kitchenItemCount = computed(() => {
  if (!isStoreReady.value) return 0

  try {
    return allProductBalances.value.filter(b => b.department === 'kitchen').length
  } catch (error) {
    return 0
  }
})

const barItemCount = computed(() => {
  if (!isStoreReady.value) return 0

  try {
    return allProductBalances.value.filter(b => b.department === 'bar').length
  } catch (error) {
    return 0
  }
})

// ✅ FIXED: Safe product category access
function getProductCategoryForSorting(itemId: string): string {
  try {
    const product = productsStore.products?.find(p => p.id === itemId)
    return product?.category || 'other'
  } catch (error) {
    return 'other'
  }
}

// ✅ FIXED: Enhanced sorting with proper safety checks
const displayProductBalances = computed(() => {
  if (!isStoreReady.value) return []

  const all = allProductBalances.value

  if (showZeroStock.value) {
    // When filter is active, show products with zero OR negative stock
    return all
      .filter(b => b.totalQuantity <= 0)
      .sort((a, b) => {
        // First: Negative stock items (more critical)
        if (a.totalQuantity < 0 && b.totalQuantity >= 0) return -1
        if (a.totalQuantity >= 0 && b.totalQuantity < 0) return 1

        // Then by category
        const categoryA = getProductCategoryForSorting(a.itemId)
        const categoryB = getProductCategoryForSorting(b.itemId)
        const categoryCompare = categoryA.localeCompare(categoryB)
        if (categoryCompare !== 0) return categoryCompare

        // Finally by name
        return a.itemName.localeCompare(b.itemName)
      })
  }

  // Default view - show ALL products with proper grouping
  const withPositiveStock = all
    .filter(b => b.totalQuantity > 0)
    .sort((a, b) => {
      const categoryA = getProductCategoryForSorting(a.itemId)
      const categoryB = getProductCategoryForSorting(b.itemId)

      const categoryCompare = categoryA.localeCompare(categoryB)
      if (categoryCompare !== 0) return categoryCompare

      return a.itemName.localeCompare(b.itemName)
    })

  // Negative stock items (show them prominently after positive stock)
  const withNegativeStock = all
    .filter(b => b.totalQuantity < 0)
    .sort((a, b) => {
      const categoryA = getProductCategoryForSorting(a.itemId)
      const categoryB = getProductCategoryForSorting(b.itemId)

      const categoryCompare = categoryA.localeCompare(categoryB)
      if (categoryCompare !== 0) return categoryCompare

      return a.itemName.localeCompare(b.itemName)
    })

  // Positive stock first, then negative stock (critical items visible)
  return [...withPositiveStock, ...withNegativeStock]
})

// Methods
function openInventoryDialog() {
  try {
    editingInventory.value = null
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Opening inventory dialog', {
      department: selectedDepartment.value
    })
  } catch (error) {
    console.warn('Error opening inventory dialog:', error)
    handleOperationError('Failed to open inventory dialog')
  }
}

function toggleZeroStockFilter() {
  try {
    showZeroStock.value = !showZeroStock.value
    DebugUtils.info(MODULE_NAME, 'Toggled zero stock filter', {
      showZeroStock: showZeroStock.value,
      department: selectedDepartment.value
    })
  } catch (error) {
    console.warn('Error toggling zero stock filter:', error)
  }
}

// Alert handlers
function showExpiringItems() {
  // Implementation for showing expiring items
}

function showExpiredItems() {
  // Implementation for showing expired items
}

function showLowStockItems() {
  // Implementation for showing low stock items
}

function handleWriteOffFromBalance(productData: any) {
  try {
    DebugUtils.info(MODULE_NAME, 'Write-off initiated from balance table', { productData })
  } catch (error) {
    console.warn('Error handling write-off from balance:', error)
    handleOperationError('Failed to initiate write-off')
  }
}

async function handleWriteOffSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true

  try {
    await refreshCurrentData()
  } catch (error) {
    DebugUtils.warn(MODULE_NAME, 'Failed to refresh data after write-off', { error })
  }
}

async function refreshCurrentData() {
  if (!isStoreReady.value) return

  try {
    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchOperations(selectedDepartment.value)
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
  }
}

async function handleInventorySuccess(message: string = 'Inventory completed successfully') {
  try {
    DebugUtils.info(MODULE_NAME, 'Inventory completed, refreshing data')
    successMessage.value = message
    showSuccessSnackbar.value = true

    if (storageStore.fetchInventories) {
      await Promise.all([
        storageStore.fetchBalances(selectedDepartment.value),
        storageStore.fetchOperations(selectedDepartment.value),
        storageStore.fetchInventories(selectedDepartment.value)
      ])
    } else {
      await Promise.all([
        storageStore.fetchBalances(selectedDepartment.value),
        storageStore.fetchOperations(selectedDepartment.value)
      ])
    }

    showInventoryDialog.value = false
    editingInventory.value = null
    DebugUtils.info(MODULE_NAME, 'Inventory data refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
    handleOperationError('Inventory completed but failed to refresh data')
  }
}

function handleOperationError(message: string) {
  DebugUtils.error(MODULE_NAME, 'Operation error', { message })
  errorMessage.value = message
  showErrorSnackbar.value = true
  showInventoryDialog.value = false
  editingInventory.value = null
}

function handleEditInventory(inventory: InventoryDocument) {
  try {
    selectedDepartment.value = inventory.department
    editingInventory.value = inventory
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Editing inventory from table', {
      inventoryId: inventory.id,
      department: inventory.department,
      status: inventory.status
    })
  } catch (error) {
    console.warn('Error editing inventory:', error)
    handleOperationError('Failed to edit inventory')
  }
}

function handleStartInventory() {
  try {
    editingInventory.value = null
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Starting new inventory from table', {
      department: selectedDepartment.value
    })
  } catch (error) {
    console.warn('Error starting new inventory:', error)
    handleOperationError('Failed to start new inventory')
  }
}

// Watch for department changes
watch(selectedDepartment, async (newDepartment, oldDepartment) => {
  if (newDepartment === oldDepartment || !isStoreReady.value) return

  try {
    DebugUtils.info(MODULE_NAME, 'Department changed', {
      from: oldDepartment,
      to: newDepartment
    })

    // Reset filters when changing department
    showZeroStock.value = false

    if (storageStore.clearFilters) {
      storageStore.clearFilters()
    }
    if (storageStore.setDepartmentFilter) {
      storageStore.setDepartmentFilter(newDepartment)
    }

    await refreshCurrentData()
    DebugUtils.info(MODULE_NAME, 'Department data loaded successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load department data', { error })
    handleOperationError(`Failed to load data for ${newDepartment} department`)
  }
})

// ✅ FIXED: Proper initialization lifecycle
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'StorageView mounted, initializing data')

    // Wait for next tick to ensure DOM is ready
    await nextTick()

    // Initialize the store
    await storageStore.initialize()

    // Mark as initialized
    isInitialized.value = true

    DebugUtils.info(MODULE_NAME, 'StorageView initialized successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize storage data', { error })
    handleOperationError('Failed to initialize storage management system')
    isInitialized.value = false
  }
})
</script>

<style lang="scss" scoped>
.storage-view {
  padding: 24px;
}

.gap-2 {
  gap: 8px;
}

.quick-actions-bar {
  .quick-stat {
    text-align: center;
    min-width: 100px;
  }
}

.writeoff-manager {
  .v-chip-group {
    gap: 8px;
  }
}

.v-alert {
  border-radius: 12px;
  &.v-alert--variant-tonal {
    border-left: 4px solid currentColor;
  }
}

.v-tabs {
  .v-tab {
    text-transform: none;
    font-weight: 500;
    .v-chip {
      margin-left: 8px;
      font-size: 0.75rem;
    }
  }
}

.v-empty-state {
  padding: 48px 24px;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .storage-view {
    padding: 16px;
  }
  .d-flex.justify-space-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .d-flex.justify-space-between > div:last-child {
    align-self: stretch;
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .v-tabs {
    overflow-x: auto;
  }
  .d-flex.gap-2 {
    flex-wrap: wrap;
    gap: 8px;
  }
  .quick-actions-bar .d-flex {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
