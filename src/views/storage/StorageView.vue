<!-- src/views/storage/StorageView.vue -->
<template>
  <div class="storage-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">📦 Storage Management</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Inventory tracking with FIFO cost calculation
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-minus-circle"
          @click="showConsumptionDialog = true"
        >
          Multi Consumption
        </v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-plus-circle"
          @click="showReceiptDialog = true"
        >
          Receipt/Correction
        </v-btn>
      </div>
    </div>

    <!-- Department Tabs -->
    <v-tabs v-model="selectedDepartment" class="mb-4" color="primary">
      <v-tab value="kitchen">
        <v-icon icon="mdi-silverware-fork-knife" class="mr-2" />
        Kitchen
      </v-tab>
      <v-tab value="bar">
        <v-icon icon="mdi-coffee" class="mr-2" />
        Bar
      </v-tab>
    </v-tabs>

    <!-- Alerts Banner -->
    <storage-alerts
      :alerts="alertCounts"
      :department="selectedDepartment"
      class="mb-4"
      @show-expiring="showExpiringItems"
      @show-low-stock="showLowStockItems"
    />

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
      <v-tab value="products">Products</v-tab>
      <v-tab value="preparations">Preparations</v-tab>
      <v-tab value="operations">Recent Operations</v-tab>
    </v-tabs>

    <!-- Content -->
    <v-tabs-window v-model="selectedTab">
      <!-- Products Tab -->
      <v-tabs-window-item value="products">
        <storage-stock-table
          v-if="selectedTab === 'products'"
          :balances="productBalances"
          :loading="storageStore.state.loading.balances"
          item-type="product"
          :department="selectedDepartment"
          @consumption="openConsumptionForItem"
          @inventory="openInventoryDialog"
        />
      </v-tabs-window-item>

      <!-- Preparations Tab -->
      <v-tabs-window-item value="preparations">
        <storage-stock-table
          v-if="selectedTab === 'preparations'"
          :balances="preparationBalances"
          :loading="storageStore.state.loading.balances"
          item-type="preparation"
          :department="selectedDepartment"
          @consumption="openConsumptionForItem"
          @inventory="openInventoryDialog"
        />
      </v-tabs-window-item>

      <!-- Operations Tab -->
      <v-tabs-window-item value="operations">
        <storage-operations-table
          v-if="selectedTab === 'operations'"
          :operations="recentOperations"
          :loading="storageStore.state.loading.operations"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Dialogs -->
    <multi-consumption-dialog
      v-model="showConsumptionDialog"
      :department="selectedDepartment"
      :initial-items="consumptionItems"
      @success="handleOperationSuccess"
    />

    <receipt-dialog
      v-model="showReceiptDialog"
      :department="selectedDepartment"
      @success="handleOperationSuccess"
    />

    <inventory-dialog
      v-model="showInventoryDialog"
      :department="selectedDepartment"
      :item-type="inventoryItemType"
      @success="handleInventorySuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type { StorageDepartment, StorageItemType, ConsumptionItem } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components (using direct imports to avoid undefined components)
import StorageAlerts from './components/StorageAlerts.vue'
import StorageStockTable from './components/StorageStockTable.vue'
import StorageOperationsTable from './components/StorageOperationsTable.vue'
import MultiConsumptionDialog from './components/MultiConsumptionDialog.vue'
import ReceiptDialog from './components/ReceiptDialog.vue'
import InventoryDialog from './components/InventoryDialog.vue'

const MODULE_NAME = 'StorageView'

// Store
const storageStore = useStorageStore()

// State
const selectedDepartment = ref<StorageDepartment>('kitchen')
const selectedTab = ref('products')
const showConsumptionDialog = ref(false)
const showReceiptDialog = ref(false)
const showInventoryDialog = ref(false)
const inventoryItemType = ref<StorageItemType>('product')
const consumptionItems = ref<ConsumptionItem[]>([])

// Computed
const productBalances = computed(() => {
  try {
    return (
      storageStore.filteredBalances.filter(
        b => b && b.itemType === 'product' && b.department === selectedDepartment.value
      ) || []
    )
  } catch (error) {
    console.warn('Error filtering product balances:', error)
    return []
  }
})

const preparationBalances = computed(() => {
  try {
    return (
      storageStore.filteredBalances.filter(
        b => b && b.itemType === 'preparation' && b.department === selectedDepartment.value
      ) || []
    )
  } catch (error) {
    console.warn('Error filtering preparation balances:', error)
    return []
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

const alertCounts = computed(() => {
  try {
    return storageStore.alertCounts || { expiring: 0, expired: 0, lowStock: 0 }
  } catch (error) {
    console.warn('Error getting alert counts:', error)
    return { expiring: 0, expired: 0, lowStock: 0 }
  }
})

// Methods
function openConsumptionForItem(itemId: string, itemType: StorageItemType) {
  try {
    consumptionItems.value = [
      {
        itemId,
        itemType,
        quantity: 1,
        notes: ''
      }
    ]
    showConsumptionDialog.value = true
  } catch (error) {
    console.warn('Error opening consumption dialog:', error)
  }
}

function openInventoryDialog(itemType: StorageItemType) {
  try {
    inventoryItemType.value = itemType
    showInventoryDialog.value = true
  } catch (error) {
    console.warn('Error opening inventory dialog:', error)
  }
}

function showExpiringItems() {
  try {
    storageStore.toggleNearExpiryFilter()
    selectedTab.value = 'products'
  } catch (error) {
    console.warn('Error showing expiring items:', error)
  }
}

function showLowStockItems() {
  try {
    storageStore.toggleLowStockFilter()
    selectedTab.value = 'products'
  } catch (error) {
    console.warn('Error showing low stock items:', error)
  }
}

async function handleOperationSuccess() {
  try {
    DebugUtils.info(MODULE_NAME, 'Operation completed, refreshing data')
    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchOperations(selectedDepartment.value)
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
  }
}

async function handleInventorySuccess() {
  try {
    DebugUtils.info(MODULE_NAME, 'Inventory completed, refreshing data')
    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchInventories(selectedDepartment.value)
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
  }
}

// Watch department changes
watch(selectedDepartment, async newDepartment => {
  try {
    DebugUtils.info(MODULE_NAME, 'Department changed', { department: newDepartment })
    await Promise.all([
      storageStore.fetchBalances(newDepartment),
      storageStore.fetchOperations(newDepartment)
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load department data', { error })
  }
})

// Lifecycle
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'StorageView mounted, initializing data')
    await storageStore.initialize()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize storage data', { error })
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
</style>
