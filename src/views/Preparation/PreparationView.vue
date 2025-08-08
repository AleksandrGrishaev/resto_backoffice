<!-- src/views/preparation/PreparationView.vue - Адаптация StorageView для полуфабрикатов -->
<template>
  <div class="preparation-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">🍲 Preparation Management</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Semi-finished products tracking with FIFO cost calculation and short shelf life management
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-chef-hat"
          :disabled="preparationStore.state.loading.balances"
          @click="showProductionDialog = true"
        >
          Add Production
        </v-btn>

        <v-btn
          color="warning"
          variant="outlined"
          prepend-icon="mdi-minus-circle"
          :disabled="preparationStore.state.loading.balances"
          @click="showConsumptionDialog = true"
        >
          Use Preparations
        </v-btn>

        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-clipboard-list"
          :disabled="preparationStore.state.loading.balances"
          @click="openInventoryDialog"
        >
          Start Inventory
        </v-btn>
      </div>
    </div>

    <!-- ✅ Error Alert -->
    <v-alert
      v-if="preparationStore.state.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="preparationStore.clearError"
    >
      <v-alert-title>Preparation Error</v-alert-title>
      {{ preparationStore.state.error }}
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
    <preparation-alerts
      :alerts="alertCounts"
      :department="selectedDepartment"
      class="mb-4"
      @show-expiring="showExpiringItems"
      @show-expired="showExpiredItems"
      @show-low-stock="showLowStockItems"
    />

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
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
      <!-- Preparations Tab -->
      <v-tabs-window-item value="preparations">
        <div v-if="preparationBalances.length === 0 && !preparationStore.state.loading.balances">
          <v-empty-state
            headline="No Preparations Found"
            title="No preparations available for this department"
            text="Add preparations through production or check if recipes are loaded."
          >
            <template #actions>
              <v-btn color="success" variant="flat" @click="showProductionDialog = true">
                <v-icon icon="mdi-chef-hat" class="mr-2" />
                Add Production
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <preparation-stock-table
          v-else
          :balances="preparationBalances"
          :loading="preparationStore.state.loading.balances"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>

      <!-- Operations Tab -->
      <v-tabs-window-item value="operations">
        <div v-if="recentOperations.length === 0 && !preparationStore.state.loading.operations">
          <v-empty-state
            headline="No Operations Found"
            title="No recent operations for this department"
            text="Operations will appear here after production or consumption activities."
          />
        </div>

        <preparation-operations-table
          v-else
          :operations="recentOperations"
          :loading="preparationStore.state.loading.operations"
          :department="selectedDepartment"
        />
      </v-tabs-window-item>

      <!-- Inventories Tab -->
      <v-tabs-window-item value="inventories">
        <div v-if="recentInventories.length === 0 && !preparationStore.state.loading.inventory">
          <v-empty-state
            headline="No Inventories Found"
            title="No inventory records for this department"
            text="Start an inventory to track and correct preparation stock levels."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="openInventoryDialog">
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                Start Preparation Inventory
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <preparation-inventories-table
          v-else
          :inventories="recentInventories"
          :loading="preparationStore.state.loading.inventory"
          :department="selectedDepartment"
          @edit-inventory="handleEditInventory"
          @start-inventory="handleStartInventory"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Dialogs -->
    <preparation-production-dialog
      v-model="showProductionDialog"
      :department="selectedDepartment"
      @success="handleOperationSuccess"
      @error="handleOperationError"
    />

    <preparation-consumption-dialog
      v-model="showConsumptionDialog"
      :department="selectedDepartment"
      @success="handleOperationSuccess"
      @error="handleOperationError"
    />

    <preparation-inventory-dialog
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
import { ref, computed, onMounted, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type { PreparationDepartment, PreparationInventoryDocument } from '@/stores/preparation'
import { DebugUtils } from '@/utils'

// Components
import PreparationAlerts from './components/PreparationAlerts.vue'
import PreparationStockTable from './components/PreparationStockTable.vue'
import PreparationOperationsTable from './components/PreparationOperationsTable.vue'
import PreparationInventoriesTable from './components/PreparationInventoriesTable.vue'
import PreparationProductionDialog from './components/PreparationProductionDialog.vue'
import PreparationConsumptionDialog from './components/PreparationConsumptionDialog.vue'
import PreparationInventoryDialog from './components/PreparationInventoryDialog.vue'

const MODULE_NAME = 'PreparationView'

// Store
const preparationStore = usePreparationStore()

// State
const selectedDepartment = ref<PreparationDepartment>('kitchen')
const selectedTab = ref('preparations')
const showProductionDialog = ref(false)
const showConsumptionDialog = ref(false)
const showInventoryDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const editingInventory = ref<PreparationInventoryDocument | null>(null)

// Computed
const preparationBalances = computed(() => {
  try {
    return (
      preparationStore.filteredBalances.filter(
        b => b && b.department === selectedDepartment.value
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
      preparationStore.state.operations
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
    if (!preparationStore.state.inventories) return []
    return preparationStore.state.inventories
      .filter(inv => inv && inv.department === selectedDepartment.value)
      .slice(0, 20)
  } catch (error) {
    console.warn('Error filtering recent inventories:', error)
    return []
  }
})

const alertCounts = computed(() => {
  try {
    return preparationStore.alertCounts || { expiring: 0, expired: 0, lowStock: 0 }
  } catch (error) {
    console.warn('Error getting alert counts:', error)
    return { expiring: 0, expired: 0, lowStock: 0 }
  }
})

const kitchenItemCount = computed(() => {
  try {
    return preparationStore.departmentBalances('kitchen').length
  } catch (error) {
    return 0
  }
})

const barItemCount = computed(() => {
  try {
    return preparationStore.departmentBalances('bar').length
  } catch (error) {
    return 0
  }
})

// Methods
function openInventoryDialog() {
  try {
    editingInventory.value = null // Reset when creating new inventory
    showInventoryDialog.value = true

    DebugUtils.info(MODULE_NAME, 'Opening preparation inventory dialog', {
      department: selectedDepartment.value
    })
  } catch (error) {
    console.warn('Error opening inventory dialog:', error)
    handleOperationError('Failed to open inventory dialog')
  }
}

function showExpiringItems() {
  try {
    if (preparationStore.toggleNearExpiryFilter) {
      preparationStore.toggleNearExpiryFilter()
    }
    selectedTab.value = 'preparations'
  } catch (error) {
    console.warn('Error showing expiring items:', error)
  }
}

function showExpiredItems() {
  try {
    if (preparationStore.toggleExpiredFilter) {
      preparationStore.toggleExpiredFilter()
    }
    selectedTab.value = 'preparations'
  } catch (error) {
    console.warn('Error showing expired items:', error)
  }
}

function showLowStockItems() {
  try {
    if (preparationStore.toggleLowStockFilter) {
      preparationStore.toggleLowStockFilter()
    }
    selectedTab.value = 'preparations'
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
      preparationStore.fetchBalances(selectedDepartment.value),
      preparationStore.fetchOperations(selectedDepartment.value)
    ])

    // Close dialogs
    showProductionDialog.value = false
    showConsumptionDialog.value = false

    DebugUtils.info(MODULE_NAME, 'Data refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error })
    handleOperationError('Operation completed but failed to refresh data')
  }
}

async function handleInventorySuccess(message: string = 'Inventory completed successfully') {
  try {
    DebugUtils.info(MODULE_NAME, 'Inventory completed, refreshing data')

    successMessage.value = message
    showSuccessSnackbar.value = true

    await Promise.all([
      preparationStore.fetchBalances(selectedDepartment.value),
      preparationStore.fetchOperations(selectedDepartment.value),
      preparationStore.fetchInventories(selectedDepartment.value)
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

  // Close all dialogs
  showProductionDialog.value = false
  showConsumptionDialog.value = false
  showInventoryDialog.value = false
  editingInventory.value = null
}

function handleEditInventory(inventory: PreparationInventoryDocument) {
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
    // Open inventory dialog
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

    // Clear filters when changing department
    if (preparationStore.clearFilters) {
      preparationStore.clearFilters()
    }
    if (preparationStore.setDepartmentFilter) {
      preparationStore.setDepartmentFilter(newDepartment)
    }

    await Promise.all([
      preparationStore.fetchBalances(newDepartment),
      preparationStore.fetchOperations(newDepartment),
      preparationStore.fetchInventories
        ? preparationStore.fetchInventories(newDepartment)
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
    DebugUtils.info(MODULE_NAME, 'PreparationView mounted, initializing data')
    await preparationStore.initialize()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize preparation data', { error })
    handleOperationError('Failed to initialize preparation management system')
  }
})
</script>

<style lang="scss" scoped>
.preparation-view {
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
