<!-- src/views/storage/StorageView.vue - FIXED: Proper display of negative stock -->
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
          :disabled="storageStore.state.loading.balances"
          @click="openInventoryDialog"
        >
          Count Inventory
        </v-btn>
        <writeoff-widget
          :department="selectedDepartment"
          @success="handleWriteOffSuccess"
          @refresh-needed="refreshCurrentData"
        />
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="storageStore.state.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="storageStore.clearError"
    >
      <v-alert-title>Storage Error</v-alert-title>
      {{ storageStore.state.error }}
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

    <!-- Content -->
    <v-tabs-window v-model="selectedTab">
      <!-- Products Tab -->
      <v-tabs-window-item value="products">
        <div v-if="allProductBalances.length === 0 && !storageStore.state.loading.balances">
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
          :balances="displayProductBalances"
          :loading="storageStore.state.loading.balances"
          item-type="product"
          :department="selectedDepartment"
          :show-zero-stock="showZeroStock"
          @write-off="handleWriteOffFromBalance"
          @toggle-zero-stock="toggleZeroStockFilter"
        />
      </v-tabs-window-item>

      <!-- Operations Tab -->
      <v-tabs-window-item value="operations">
        <div v-if="recentOperations.length === 0 && !storageStore.state.loading.operations">
          <v-empty-state
            headline="No Operations Found"
            title="No recent operations for this department"
            text="Operations will appear here after supplier deliveries or inventory activities."
          />
        </div>
        <storage-operations-table
          v-else
          :operations="recentOperations"
          :loading="storageStore.state.loading.operations"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>

      <!-- Inventories Tab -->
      <v-tabs-window-item value="inventories">
        <div v-if="recentInventories.length === 0 && !storageStore.state.loading.inventory">
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
          :loading="storageStore.state.loading.inventory"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useWriteOff } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
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

// ✅ ADDED: Development mode check
const isDevelopment = computed(() => {
  return process.env.NODE_ENV === 'development' || import.meta.env?.DEV
})

// Enhanced computed properties with zero stock handling
const allProductBalances = computed(() => {
  try {
    const filtered =
      storageStore.filteredBalances.filter(
        b => b && b.itemType === 'product' && b.department === selectedDepartment.value
      ) || []

    // ✅ DEBUG: Log all balances in development
    if (isDevelopment.value) {
      console.log(`All product balances for ${selectedDepartment.value}:`, filtered.length)
      console.log(
        'Negative stock products:',
        filtered.filter(b => b.totalQuantity < 0)
      )
      console.log(
        'Zero stock products:',
        filtered.filter(b => b.totalQuantity === 0)
      )
      console.log(
        'Positive stock products:',
        filtered.filter(b => b.totalQuantity > 0)
      )
    }

    return filtered
  } catch (error) {
    console.warn('Error filtering all product balances:', error)
    return []
  }
})

// ✅ FIXED: Enhanced sorting with proper negative stock handling
const displayProductBalances = computed(() => {
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

  // ✅ FIXED: Default view - show ALL products with proper grouping
  const withPositiveStock = all
    .filter(b => b.totalQuantity > 0)
    .sort((a, b) => {
      const categoryA = getProductCategoryForSorting(a.itemId)
      const categoryB = getProductCategoryForSorting(b.itemId)

      const categoryCompare = categoryA.localeCompare(categoryB)
      if (categoryCompare !== 0) return categoryCompare

      return a.itemName.localeCompare(b.itemName)
    })

  // ✅ CRITICAL: Negative stock items (show them prominently after positive stock)
  const withNegativeStock = all
    .filter(b => b.totalQuantity < 0)
    .sort((a, b) => {
      const categoryA = getProductCategoryForSorting(a.itemId)
      const categoryB = getProductCategoryForSorting(b.itemId)

      const categoryCompare = categoryA.localeCompare(categoryB)
      if (categoryCompare !== 0) return categoryCompare

      return a.itemName.localeCompare(b.itemName)
    })

  const withZeroStock = all
    .filter(b => b.totalQuantity === 0)
    .sort((a, b) => {
      const categoryA = getProductCategoryForSorting(a.itemId)
      const categoryB = getProductCategoryForSorting(b.itemId)

      const categoryCompare = categoryA.localeCompare(categoryB)
      if (categoryCompare !== 0) return categoryCompare

      return a.itemName.localeCompare(b.itemName)
    })

  // ✅ FIXED: Order: positive stock first, then negative stock (critical), then zero stock
  const result = [...withPositiveStock, ...withNegativeStock, ...withZeroStock]

  // ✅ DEBUG: Log the result in development
  if (isDevelopment.value) {
    console.log('Display product balances result:', {
      total: result.length,
      positive: withPositiveStock.length,
      negative: withNegativeStock.length,
      zero: withZeroStock.length,
      negativeItems: withNegativeStock.map(b => ({ name: b.itemName, qty: b.totalQuantity }))
    })
  }

  return result
})

// Helper function to get product category for sorting
function getProductCategoryForSorting(productId: string): string {
  try {
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.category) return 'ZZZ-Other'

    const categoryMap: Record<string, string> = {
      meat: 'A-Meat',
      vegetables: 'B-Vegetables',
      spices: 'C-Spices',
      dairy: 'D-Dairy',
      grains: 'E-Grains',
      beverages: 'F-Beverages',
      alcohol: 'G-Alcohol',
      other: 'H-Other'
    }

    return categoryMap[product.category] || `H-${product.category}`
  } catch (error) {
    return 'ZZZ-Other'
  }
}

// ✅ FIXED: Include negative stock products in "out of stock" category
const zeroStockProducts = computed(() => {
  try {
    return allProductBalances.value.filter(b => b.totalQuantity <= 0)
  } catch (error) {
    console.warn('Error filtering zero stock products:', error)
    return []
  }
})

// ✅ ADDED: Debug info computed property
const debugInfo = computed(() => {
  const all = allProductBalances.value
  return {
    totalProducts: all.length,
    negativeStockCount: all.filter(b => b.totalQuantity < 0).length,
    zeroStockCount: all.filter(b => b.totalQuantity === 0).length,
    positiveStockCount: all.filter(b => b.totalQuantity > 0).length
  }
})

const recentOperations = computed(() => {
  try {
    return (
      storageStore.state.operations
        .filter(op => op && op.department === selectedDepartment.value)
        .slice(0, 20) || []
    )
  } catch (error) {
    console.warn('Error filtering recent operations:', error)
    return []
  }
})

const recentInventories = computed(() => {
  try {
    if (!storageStore.state.inventories) return []
    return storageStore.state.inventories
      .filter(inv => inv && inv.department === selectedDepartment.value)
      .slice(0, 20)
  } catch (error) {
    console.warn('Error filtering recent inventories:', error)
    return []
  }
})

const alertCounts = computed(() => {
  try {
    return storageStore.alertCounts || { expiring: 0, expired: 0, lowStock: 0 }
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

const hasAlerts = computed(
  () =>
    alertCounts.value.expired > 0 ||
    alertCounts.value.expiring > 0 ||
    alertCounts.value.lowStock > 0
)

const kitchenItemCount = computed(() => {
  try {
    return storageStore.departmentBalances('kitchen').length
  } catch (error) {
    return 0
  }
})

const barItemCount = computed(() => {
  try {
    return storageStore.departmentBalances('bar').length
  } catch (error) {
    return 0
  }
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

function showExpiringItems() {
  try {
    if (storageStore.toggleNearExpiryFilter) {
      storageStore.toggleNearExpiryFilter()
    }
    selectedTab.value = 'products'
  } catch (error) {
    console.warn('Error showing expiring items:', error)
  }
}

function showExpiredItems() {
  try {
    if (storageStore.toggleExpiredFilter) {
      storageStore.toggleExpiredFilter()
    }
    selectedTab.value = 'products'
  } catch (error) {
    console.warn('Error showing expired items:', error)
  }
}

function showLowStockItems() {
  try {
    if (storageStore.toggleLowStockFilter) {
      storageStore.toggleLowStockFilter()
    }
    selectedTab.value = 'products'
  } catch (error) {
    console.warn('Error showing low stock items:', error)
  }
}

function showZeroStockItems() {
  try {
    showZeroStock.value = true
    selectedTab.value = 'products'

    DebugUtils.info(MODULE_NAME, 'Showing zero stock products', {
      department: selectedDepartment.value,
      zeroStockCount: zeroStockProducts.value.length
    })
  } catch (error) {
    console.warn('Error showing zero stock items:', error)
  }
}

function toggleZeroStockFilter() {
  showZeroStock.value = !showZeroStock.value

  DebugUtils.info(MODULE_NAME, 'Toggled zero stock filter', {
    showZeroStock: showZeroStock.value,
    department: selectedDepartment.value,
    zeroStockCount: zeroStockProducts.value.length
  })
}

async function handleExpiredWriteOff() {
  try {
    const operation = await writeOff.writeOffExpiredProducts(
      selectedDepartment.value,
      'System Auto Write-off',
      'Bulk write-off of all expired products'
    )
    if (operation) {
      successMessage.value = 'All expired products written off successfully!'
      showSuccessSnackbar.value = true
      await refreshCurrentData()
    }
  } catch (error) {
    console.error('Failed to write-off expired products:', error)
    handleOperationError('Failed to write-off expired products')
  }
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
    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchOperations(selectedDepartment.value),
      storageStore.fetchInventories
        ? storageStore.fetchInventories(selectedDepartment.value)
        : Promise.resolve()
    ])
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
  if (newDepartment === oldDepartment) return
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

// Lifecycle
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'StorageView mounted, initializing data')
    await storageStore.initialize()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize storage data', { error })
    handleOperationError('Failed to initialize storage management system')
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
