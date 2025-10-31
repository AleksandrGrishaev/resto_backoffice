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
          v-if="selectedDepartment !== 'all'"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-clipboard-list"
          :disabled="storageStore.state.loading.balances"
          @click="openInventoryDialog"
        >
          Count Inventory
        </v-btn>
        <writeoff-widget
          v-if="selectedDepartment !== 'all'"
          :department="selectedDepartment"
          @success="handleWriteOffSuccess"
          @refresh-needed="refreshCurrentData"
        />

        <!-- ✅ Сообщение когда выбрано All -->
        <v-alert
          v-if="selectedDepartment === 'all'"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-0"
        >
          Select Kitchen or Bar tab to perform inventory operations
        </v-alert>
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
      <!-- ✅ Вкладка All -->
      <v-tab value="all">
        <v-icon icon="mdi-warehouse" class="mr-2" />
        All Products
        <v-chip v-if="tabCounts.all > 0" size="small" class="ml-2" variant="tonal">
          {{ tabCounts.all }}
        </v-chip>
      </v-tab>

      <!-- ✅ Вкладка Kitchen -->
      <v-tab value="kitchen">
        <v-icon icon="mdi-silverware-fork-knife" class="mr-2" />
        Kitchen
        <v-chip
          v-if="tabCounts.kitchen > 0"
          size="small"
          class="ml-2"
          variant="tonal"
          color="success"
        >
          {{ tabCounts.kitchen }}
        </v-chip>
      </v-tab>

      <!-- ✅ Вкладка Bar -->
      <v-tab value="bar">
        <v-icon icon="mdi-coffee" class="mr-2" />
        Bar
        <v-chip v-if="tabCounts.bar > 0" size="small" class="ml-2" variant="tonal" color="info">
          {{ tabCounts.bar }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Alerts Banner (только для конкретных департаментов) -->
    <storage-alerts
      v-if="isStoreReady && selectedDepartment !== 'all'"
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
        <v-chip v-if="filteredInventories.length > 0" size="small" class="ml-2" variant="tonal">
          {{ filteredInventories.length }}
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
        <div v-if="filteredBalances.length === 0">
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
          :loading="isLoading"
          :show-zero-stock="showZeroStock"
          :storage-store="storageStore"
          :department="selectedDepartment === 'all' ? undefined : selectedDepartment"
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
          :loading="storageStore.state.loading.operations"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>

      <!-- Inventories Tab -->
      <v-tabs-window-item value="inventories">
        <div v-if="filteredInventories.length === 0">
          <v-empty-state
            headline="No Inventories Found"
            title="No inventory records for this department"
            text="Start an inventory to track and correct stock levels."
          >
            <template #actions>
              <v-btn
                v-if="selectedDepartment !== 'all'"
                color="primary"
                variant="flat"
                @click="openInventoryDialog"
              >
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                Start Product Inventory
              </v-btn>
              <v-alert v-else type="info" variant="tonal" class="mt-4">
                Select Kitchen or Bar tab to start inventory
              </v-alert>
            </template>
          </v-empty-state>
        </div>
        <storage-inventories-table
          v-else
          :inventories="filteredInventories"
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

    <!-- Inventory Dialog -->
    <inventory-dialog
      v-model="showInventoryDialog"
      :department="selectedDepartment"
      :existing-inventory="editingInventory"
      @success="handleInventorySuccess"
      @error="handleOperationError"
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
import { useInventory } from '@/stores/storage'
import type { Department } from '@/stores/productsStore/types'
import type { InventoryDocument } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import WriteoffWidget from './components/writeoff/WriteOffWidget.vue'
import StorageAlerts from './components/StorageAlerts.vue'
import StorageStockTable from './components/StorageStockTable.vue'
import StorageOperationsTable from './components/StorageOperationsTable.vue'
import StorageInventoriesTable from './components/StorageInventoriesTable.vue'
import StorageAnalyticsTab from './components/tabs/StorageAnalyticsTab.vue'
import InventoryDialog from './components/InventoryDialog.vue'

const MODULE_NAME = 'StorageView'

// ===========================
// STORES & COMPOSABLES
// ===========================

const storageStore = useStorageStore()
const productsStore = useProductsStore()
const writeOff = useWriteOff()
const inventory = useInventory()

// ===========================
// STATE
// ===========================

const selectedDepartment = ref<Department | 'all'>('all')
const selectedTab = ref('products')
const showInventoryDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const editingInventory = ref<InventoryDocument | null>(null)
const showZeroStock = ref(false)
const isViewReady = ref(false)

// ===========================
// COMPUTED - Store Status
// ===========================

const isStoreReady = computed(() => {
  return (
    isViewReady.value &&
    storageStore.initialized &&
    storageStore.state &&
    storageStore.filteredBalances !== undefined
  )
})

const isLoading = computed(() => {
  return (
    !isViewReady.value ||
    !storageStore.initialized ||
    storageStore.state?.loading?.balances ||
    storageStore.state?.loading?.operations ||
    productsStore.loading
  )
})

// ===========================
// COMPUTED - Filtered Data через inventory composable
// ===========================

const filteredBalances = computed(() => {
  return inventory.filteredBalances.value
})

const filteredInventories = computed(() => {
  return inventory.filteredInventories.value
})

const displayProductBalances = computed(() => {
  if (showZeroStock.value) {
    return filteredBalances.value
  }
  return filteredBalances.value.filter(b => b.totalQuantity > 0)
})

// ===========================
// COMPUTED - Tab Counts
// ===========================

const balancesCounts = computed(() => inventory.balancesCounts.value)

const tabCounts = computed(() => ({
  all: balancesCounts.value.all,
  kitchen: balancesCounts.value.kitchen,
  bar: balancesCounts.value.bar
}))

// ===========================
// COMPUTED - Operations & Inventories
// ===========================

const recentOperations = computed(() => {
  if (selectedDepartment.value === 'all') {
    return storageStore.state?.operations || []
  }
  return (storageStore.state?.operations || []).filter(
    op => op.department === selectedDepartment.value
  )
})

// ===========================
// COMPUTED - Alerts (только для конкретных департаментов)
// ===========================

const enhancedAlertCounts = computed(() => {
  if (selectedDepartment.value === 'all') {
    return {
      expired: 0,
      expiring: 0,
      lowStock: 0
    }
  }

  const balances = filteredBalances.value

  return {
    expired: balances.filter(b => b.hasExpired).length,
    expiring: balances.filter(b => b.hasNearExpiry && !b.hasExpired).length,
    lowStock: balances.filter(b => b.belowMinStock).length
  }
})

// ===========================
// METHODS - Dialog Handlers
// ===========================

function openInventoryDialog() {
  if (selectedDepartment.value === 'all') {
    errorMessage.value = 'Please select Kitchen or Bar tab to start inventory'
    showErrorSnackbar.value = true
    return
  }

  editingInventory.value = null
  showInventoryDialog.value = true
  DebugUtils.info(MODULE_NAME, 'Opening inventory dialog', {
    department: selectedDepartment.value
  })
}

function handleStartInventory() {
  openInventoryDialog()
}

function handleEditInventory(inventoryDoc: InventoryDocument) {
  editingInventory.value = inventoryDoc
  selectedDepartment.value = inventoryDoc.department
  showInventoryDialog.value = true
  DebugUtils.info(MODULE_NAME, 'Editing inventory', {
    inventoryId: inventoryDoc.id,
    department: inventoryDoc.department
  })
}

async function handleInventorySuccess(message: string = 'Inventory completed successfully') {
  try {
    DebugUtils.info(MODULE_NAME, 'Inventory completed, refreshing data')
    successMessage.value = message
    showSuccessSnackbar.value = true

    await Promise.all([
      storageStore.fetchBalances(
        selectedDepartment.value === 'all' ? undefined : selectedDepartment.value
      ),
      storageStore.fetchOperations(
        selectedDepartment.value === 'all' ? undefined : selectedDepartment.value
      ),
      storageStore.fetchInventories(
        selectedDepartment.value === 'all' ? undefined : selectedDepartment.value
      )
    ])

    showInventoryDialog.value = false
    editingInventory.value = null
    DebugUtils.info(MODULE_NAME, 'Data refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
    handleOperationError('Inventory completed but failed to refresh data')
  }
}

function handleOperationError(message: string) {
  DebugUtils.error(MODULE_NAME, 'Operation error', { message })
  errorMessage.value = message
  showErrorSnackbar.value = true
}

// ===========================
// METHODS - Write-off Handlers
// ===========================

async function handleWriteOffSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true
  await refreshCurrentData()
}

function handleWriteOffFromBalance(balance: any) {
  DebugUtils.info(MODULE_NAME, 'Write-off requested from balance', {
    itemId: balance.itemId,
    itemName: balance.itemName
  })
  // Write-off widget handles this
}

// ===========================
// METHODS - Filters
// ===========================

function toggleZeroStockFilter() {
  showZeroStock.value = !showZeroStock.value
  DebugUtils.info(MODULE_NAME, 'Zero stock filter toggled', {
    showZeroStock: showZeroStock.value
  })
}

function showExpiringItems() {
  storageStore.setSearchFilter('')
  storageStore.toggleNearExpiryFilter()
  selectedTab.value = 'products'
}

function showExpiredItems() {
  storageStore.setSearchFilter('')
  storageStore.toggleExpiredFilter()
  selectedTab.value = 'products'
}

function showLowStockItems() {
  storageStore.setSearchFilter('')
  storageStore.toggleLowStockFilter()
  selectedTab.value = 'products'
}

// ===========================
// METHODS - Data Refresh
// ===========================

async function refreshCurrentData() {
  try {
    DebugUtils.info(MODULE_NAME, 'Refreshing current data')
    await Promise.all([
      storageStore.fetchBalances(
        selectedDepartment.value === 'all' ? undefined : selectedDepartment.value
      ),
      storageStore.fetchOperations(
        selectedDepartment.value === 'all' ? undefined : selectedDepartment.value
      )
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
  }
}

async function forceRefresh() {
  try {
    DebugUtils.info(MODULE_NAME, 'Force refresh requested')
    await storageStore.initialize()
    isViewReady.value = true
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Force refresh failed', { error })
  }
}

// ===========================
// WATCHERS
// ===========================

watch(
  selectedDepartment,
  newDepartment => {
    inventory.selectedDepartment.value = newDepartment
  },
  { immediate: true }
) // ✅ immediate: true чтобы синхронизировать сразу

watch(selectedDepartment, async (newDepartment, oldDepartment) => {
  if (newDepartment === oldDepartment || !isStoreReady.value) return

  try {
    DebugUtils.info(MODULE_NAME, 'Department changed', {
      from: oldDepartment,
      to: newDepartment
    })

    DebugUtils.info(MODULE_NAME, 'Department filter applied', {
      department: newDepartment,
      balancesCount: filteredBalances.value.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to change department', { error })
  }
})

// ===========================
// LIFECYCLE
// ===========================

onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'StorageView mounted, initializing...')

    if (!storageStore.initialized) {
      await storageStore.initialize()
    }

    await nextTick()
    isViewReady.value = true

    DebugUtils.info(MODULE_NAME, 'StorageView ready', {
      initialized: storageStore.initialized,
      balances: storageStore.state?.balances?.length || 0,
      operations: storageStore.state?.operations?.length || 0
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize StorageView', { error })
    errorMessage.value = 'Failed to load storage data'
    showErrorSnackbar.value = true
  }
})
</script>

<style scoped>
.storage-view {
  padding: 24px;
}
</style>
