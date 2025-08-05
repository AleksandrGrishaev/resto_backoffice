<!-- src/views/storage/StorageView.vue - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ -->
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
          :disabled="storageStore.state.loading.balances"
          @click="showConsumptionDialog = true"
        >
          Multi Consumption
        </v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-plus-circle"
          :disabled="storageStore.state.loading.balances"
          @click="showReceiptDialog = true"
        >
          Receipt/Correction
        </v-btn>
      </div>
    </div>

    <!-- ✅ Error Alert -->
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
      :alerts="alertCounts"
      :department="selectedDepartment"
      class="mb-4"
      @show-expiring="showExpiringItems"
      @show-low-stock="showLowStockItems"
    />

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
      <v-tab value="products">
        Products
        <v-chip v-if="productBalances.length > 0" size="small" class="ml-2" variant="tonal">
          {{ productBalances.length }}
        </v-chip>
      </v-tab>
      <v-tab value="preparations">
        Preparations
        <v-chip v-if="preparationBalances.length > 0" size="small" class="ml-2" variant="tonal">
          {{ preparationBalances.length }}
        </v-chip>
      </v-tab>
      <v-tab value="operations">
        Recent Operations
        <v-chip v-if="recentOperations.length > 0" size="small" class="ml-2" variant="tonal">
          {{ recentOperations.length }}
        </v-chip>
      </v-tab>
      <v-tab value="inventories">
        Inventories
        <v-chip v-if="recentInventories.length > 0" size="small" class="ml-2" variant="tonal">
          {{ recentInventories.length }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Content -->
    <v-tabs-window v-model="selectedTab">
      <!-- Products Tab -->
      <v-tabs-window-item value="products">
        <div v-if="productBalances.length === 0 && !storageStore.state.loading.balances">
          <v-empty-state
            headline="No Products Found"
            title="No products available for this department"
            text="Add products through the Receipt/Correction dialog or check if products are loaded."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="showReceiptDialog = true">
                Add Products
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <storage-stock-table
          v-else
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
        <div v-if="preparationBalances.length === 0 && !storageStore.state.loading.balances">
          <v-empty-state
            headline="No Preparations Found"
            title="No preparations available for this department"
            text="Preparations are created through recipe production or manual addition."
          >
            <template #actions>
              <v-btn color="primary" variant="outlined" @click="showReceiptDialog = true">
                Add Preparation
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <storage-stock-table
          v-else
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
        <div v-if="recentOperations.length === 0 && !storageStore.state.loading.operations">
          <v-empty-state
            headline="No Operations Found"
            title="No recent operations for this department"
            text="Operations will appear here after consumption, receipt, or inventory activities."
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
              <v-btn color="primary" variant="flat" @click="openInventoryDialog('product')">
                Start Product Inventory
              </v-btn>
              <v-btn color="primary" variant="outlined" @click="openInventoryDialog('preparation')">
                Start Preparation Inventory
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <storage-inventories-table
          v-else
          :inventories="recentInventories"
          :loading="storageStore.state.loading.inventory"
          :department="selectedDepartment"
          @edit-inventory="handleEditInventory"
          @start-inventory="handleStartInventory"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Dialogs -->
    <multi-consumption-dialog
      v-model="showConsumptionDialog"
      :department="selectedDepartment"
      :initial-items="consumptionItems"
      @success="handleOperationSuccess"
      @error="handleOperationError"
    />

    <receipt-dialog
      v-model="showReceiptDialog"
      :department="selectedDepartment"
      @success="handleOperationSuccess"
      @error="handleOperationError"
    />

    <!-- ✅ ИСПРАВЛЕНО: Передаем existingInventory -->
    <inventory-dialog
      v-model="showInventoryDialog"
      :department="selectedDepartment"
      :item-type="inventoryItemType"
      :existing-inventory="editingInventory"
      @success="handleInventorySuccess"
      @error="handleOperationError"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000" location="top">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type {
  StorageDepartment,
  StorageItemType,
  ConsumptionItem,
  InventoryDocument
} from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import StorageAlerts from './components/StorageAlerts.vue'
import StorageStockTable from './components/StorageStockTable.vue'
import StorageOperationsTable from './components/StorageOperationsTable.vue'
import StorageInventoriesTable from './components/StorageInventoriesTable.vue'
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
const showSuccessSnackbar = ref(false)
const successMessage = ref('')
const editingInventory = ref<InventoryDocument | null>(null) // ✅ ДОБАВЛЕНО

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
function openConsumptionForItem(itemId: string, itemType: StorageItemType) {
  try {
    const itemName = storageStore.getItemName ? storageStore.getItemName(itemId, itemType) : itemId

    consumptionItems.value = [
      {
        itemId,
        itemType,
        quantity: 1,
        notes: `Quick consumption of ${itemName}`
      }
    ]
    showConsumptionDialog.value = true

    DebugUtils.info(MODULE_NAME, 'Opening consumption dialog for item', {
      itemId,
      itemType,
      itemName
    })
  } catch (error) {
    console.warn('Error opening consumption dialog:', error)
    handleOperationError('Failed to open consumption dialog')
  }
}

// ✅ ИСПРАВЛЕНО: Сброс editingInventory при создании новой инвентаризации
function openInventoryDialog(itemType: StorageItemType) {
  try {
    inventoryItemType.value = itemType
    editingInventory.value = null // ✅ ДОБАВЛЕНО: сбрасываем при создании новой
    showInventoryDialog.value = true

    DebugUtils.info(MODULE_NAME, 'Opening inventory dialog', {
      itemType,
      department: selectedDepartment.value
    })
  } catch (error) {
    console.warn('Error opening inventory dialog:', error)
    handleOperationError('Failed to open inventory dialog')
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

async function handleOperationSuccess(message: string = 'Operation completed successfully') {
  try {
    DebugUtils.info(MODULE_NAME, 'Operation completed, refreshing data')

    successMessage.value = message
    showSuccessSnackbar.value = true

    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchOperations(selectedDepartment.value)
    ])

    // Закрываем диалоги
    showConsumptionDialog.value = false
    showReceiptDialog.value = false

    DebugUtils.info(MODULE_NAME, 'Data refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
    handleOperationError('Operation completed but failed to refresh data')
  }
}

// ✅ ИСПРАВЛЕНО: Очистка editingInventory при успехе
async function handleInventorySuccess(message: string = 'Inventory completed successfully') {
  try {
    DebugUtils.info(MODULE_NAME, 'Inventory completed, refreshing data')

    successMessage.value = message
    showSuccessSnackbar.value = true

    await Promise.all([
      storageStore.fetchBalances(selectedDepartment.value),
      storageStore.fetchOperations(selectedDepartment.value),
      storageStore.fetchInventories(selectedDepartment.value)
    ])

    showInventoryDialog.value = false
    editingInventory.value = null // ✅ ДОБАВЛЕНО: очищаем после успешного завершения

    DebugUtils.info(MODULE_NAME, 'Inventory data refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
    handleOperationError('Inventory completed but failed to refresh data')
  }
}

function handleOperationError(message: string) {
  DebugUtils.error(MODULE_NAME, 'Operation error', { message })

  // Устанавливаем ошибку в store для отображения
  if (storageStore.state) {
    storageStore.state.error = message
  }

  // Закрываем все диалоги
  showConsumptionDialog.value = false
  showReceiptDialog.value = false
  showInventoryDialog.value = false
  editingInventory.value = null // ✅ ДОБАВЛЕНО: очищаем при ошибке
}

// ✅ ИСПРАВЛЕНО: Правильная передача существующей инвентаризации
function handleEditInventory(inventory: InventoryDocument) {
  try {
    selectedDepartment.value = inventory.department
    inventoryItemType.value = inventory.itemType
    editingInventory.value = inventory // ✅ ИСПРАВЛЕНО: устанавливаем редактируемую инвентаризацию

    showInventoryDialog.value = true

    DebugUtils.info(MODULE_NAME, 'Editing inventory from table', {
      inventoryId: inventory.id,
      department: inventory.department,
      itemType: inventory.itemType,
      status: inventory.status
    })
  } catch (error) {
    console.warn('Error editing inventory:', error)
    handleOperationError('Failed to edit inventory')
  }
}

// ✅ ДОБАВЛЕНО: Обработчик для начала новой инвентаризации из таблицы
function handleStartInventory() {
  try {
    // Открываем диалог инвентаризации с товарами по умолчанию
    inventoryItemType.value = 'product'
    editingInventory.value = null
    showInventoryDialog.value = true

    DebugUtils.info(MODULE_NAME, 'Starting new inventory from table', {
      department: selectedDepartment.value,
      itemType: inventoryItemType.value
    })
  } catch (error) {
    console.warn('Error starting new inventory:', error)
    handleOperationError('Failed to start new inventory')
  }
}

// Watch для обновления данных при смене департамента
watch(selectedDepartment, async (newDepartment, oldDepartment) => {
  if (newDepartment === oldDepartment) return

  try {
    DebugUtils.info(MODULE_NAME, 'Department changed', {
      from: oldDepartment,
      to: newDepartment
    })

    // Очищаем фильтры при смене департамента
    if (storageStore.clearFilters) {
      storageStore.clearFilters()
    }
    if (storageStore.setDepartmentFilter) {
      storageStore.setDepartmentFilter(newDepartment)
    }

    await Promise.all([
      storageStore.fetchBalances(newDepartment),
      storageStore.fetchOperations(newDepartment),
      storageStore.fetchInventories
        ? storageStore.fetchInventories(newDepartment)
        : Promise.resolve()
    ])

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
</style>
