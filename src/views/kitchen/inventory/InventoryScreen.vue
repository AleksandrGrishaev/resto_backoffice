<!-- src/views/kitchen/inventory/InventoryScreen.vue -->
<template>
  <div class="inventory-screen">
    <!-- Header -->
    <div class="inventory-header">
      <div class="header-content">
        <div class="header-title">
          <h1 class="text-h5 font-weight-bold">Inventory</h1>
          <v-chip
            :color="effectiveDepartment === 'kitchen' ? 'success' : 'info'"
            size="small"
            class="ml-2"
          >
            <v-icon start size="16">
              {{ effectiveDepartment === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail' }}
            </v-icon>
            {{ effectiveDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
          </v-chip>
        </div>
        <div class="header-actions">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="!isStorageReady"
            @click="startNewInventory"
          >
            <v-icon start>mdi-clipboard-plus</v-icon>
            Start Inventory
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="inventory-loading">
      <v-progress-circular indeterminate size="48" color="primary" />
      <p class="mt-4 text-medium-emphasis">Loading inventory data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="inventory-error">
      <v-icon size="48" color="error" class="mb-4">mdi-alert-circle</v-icon>
      <p class="text-h6 mb-2">Failed to load inventory</p>
      <p class="text-medium-emphasis mb-4">{{ error }}</p>
      <v-btn color="primary" variant="outlined" @click="retryLoad">
        <v-icon start>mdi-refresh</v-icon>
        Retry
      </v-btn>
    </div>

    <!-- Content -->
    <div v-else class="inventory-content">
      <!-- Stats Cards -->
      <div v-if="isStorageReady" class="stats-section mb-6">
        <v-row>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="info" class="mb-2">mdi-package-variant</v-icon>
                <div class="text-h5 font-weight-bold">{{ productCount }}</div>
                <div class="text-caption text-medium-emphasis">Products</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="warning" class="mb-2">mdi-file-document-edit</v-icon>
                <div class="text-h5 font-weight-bold">{{ draftCount }}</div>
                <div class="text-caption text-medium-emphasis">Draft</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="success" class="mb-2">mdi-clipboard-check</v-icon>
                <div class="text-h5 font-weight-bold">{{ completedCount }}</div>
                <div class="text-caption text-medium-emphasis">Completed</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="primary" class="mb-2">mdi-calendar</v-icon>
                <div class="text-body-1 font-weight-bold">{{ lastInventoryDate }}</div>
                <div class="text-caption text-medium-emphasis">Last Count</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Inventory History -->
      <div class="history-section">
        <div class="section-header d-flex align-center justify-space-between mb-4">
          <h2 class="text-h6">Inventory History</h2>
          <v-chip size="small" variant="tonal">{{ departmentInventories.length }} records</v-chip>
        </div>

        <!-- Empty State -->
        <v-card v-if="departmentInventories.length === 0" variant="outlined" class="empty-state">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey" class="mb-4">mdi-clipboard-text-outline</v-icon>
            <h3 class="text-h6 mb-2">No inventory records</h3>
            <p class="text-medium-emphasis mb-6">
              Start your first inventory count to track stock levels
            </p>
            <v-btn color="primary" variant="flat" size="large" @click="startNewInventory">
              <v-icon start>mdi-clipboard-plus</v-icon>
              Start First Inventory
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Inventory List -->
        <div v-else class="inventory-list">
          <v-card
            v-for="inv in departmentInventories"
            :key="inv.id"
            variant="outlined"
            class="inventory-item mb-3"
            @click="handleInventoryClick(inv)"
          >
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div class="d-flex align-center">
                <v-icon
                  :color="inv.status === 'draft' ? 'warning' : 'success'"
                  size="32"
                  class="mr-4"
                >
                  {{ inv.status === 'draft' ? 'mdi-file-document-edit' : 'mdi-clipboard-check' }}
                </v-icon>
                <div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ inv.documentNumber || 'Draft' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDate(inv.inventoryDate) }} - {{ inv.responsiblePerson }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <div class="text-right">
                  <div class="text-body-2">{{ inv.totalItems }} items</div>
                  <div
                    v-if="inv.totalDiscrepancies > 0"
                    class="text-caption"
                    :class="inv.totalDiscrepancies > 0 ? 'text-warning' : 'text-success'"
                  >
                    {{ inv.totalDiscrepancies }} discrepancies
                  </div>
                </div>
                <v-chip :color="inv.status === 'draft' ? 'warning' : 'success'" size="small">
                  {{ inv.status === 'draft' ? 'Draft' : 'Completed' }}
                </v-chip>
                <v-icon color="grey">mdi-chevron-right</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Inventory Dialog -->
    <KitchenInventoryDialog
      v-model="showInventoryDialog"
      :department="effectiveDepartment"
      :existing-inventory="selectedInventory"
      @success="handleSuccess"
      @error="handleError"
    />

    <!-- Details Dialog (for completed inventories) -->
    <InventoryDetailsDialog v-model="showDetailsDialog" :inventory="selectedInventory" />

    <!-- Snackbar -->
    <v-snackbar v-model="showSnackbar" :color="snackbarColor" :timeout="4000">
      {{ snackbarMessage }}
      <template #actions>
        <v-btn variant="text" @click="showSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useAuthStore } from '@/stores/auth'
import { useInventory } from '@/stores/storage'
import type { InventoryDocument } from '@/stores/storage'
import type { Department } from '@/stores/productsStore/types'
import { DebugUtils, TimeUtils } from '@/utils'
import KitchenInventoryDialog from './KitchenInventoryDialog.vue'
import InventoryDetailsDialog from '@/views/storage/components/InventoryDetailsDialog.vue'

const MODULE_NAME = 'InventoryScreen'

// =============================================
// PROPS
// =============================================

interface Props {
  selectedDepartment: 'all' | 'kitchen' | 'bar'
}

const props = defineProps<Props>()

// =============================================
// STORES & COMPOSABLES
// =============================================

const storageStore = useStorageStore()
const authStore = useAuthStore()
const inventory = useInventory()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const error = ref<string | null>(null)
const showInventoryDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedInventory = ref<InventoryDocument | null>(null)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// =============================================
// COMPUTED
// =============================================

/**
 * Effective department based on user role
 * Kitchen user sees kitchen, Bar user sees bar, Admin uses selected
 */
const effectiveDepartment = computed<Department>(() => {
  const roles = authStore.userRoles

  // Bar-only user
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }

  // Admin with specific selection (not 'all')
  if (roles.includes('admin') && props.selectedDepartment !== 'all') {
    return props.selectedDepartment as Department
  }

  // Default to kitchen
  return 'kitchen'
})

/**
 * Check if storage store is ready
 */
const isStorageReady = computed(() => {
  return storageStore.initialized && storageStore.state?.balances?.length >= 0
})

/**
 * Get inventories for current department
 */
const departmentInventories = computed(() => {
  if (!storageStore.state?.inventories) return []

  return storageStore.state.inventories
    .filter(inv => inv.department === effectiveDepartment.value)
    .sort((a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime())
})

/**
 * Count products for current department
 */
const productCount = computed(() => {
  return inventory.balancesCounts.value[effectiveDepartment.value] || 0
})

/**
 * Draft inventories count
 */
const draftCount = computed(() => {
  return departmentInventories.value.filter(inv => inv.status === 'draft').length
})

/**
 * Completed inventories count
 */
const completedCount = computed(() => {
  return departmentInventories.value.filter(inv => inv.status === 'confirmed').length
})

/**
 * Last inventory date
 */
const lastInventoryDate = computed(() => {
  const completed = departmentInventories.value.filter(inv => inv.status === 'confirmed')
  if (completed.length === 0) return 'Never'

  const lastDate = completed[0].inventoryDate
  return TimeUtils.formatDateForDisplay(lastDate)
})

// =============================================
// METHODS
// =============================================

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}

/**
 * Start new inventory
 */
function startNewInventory() {
  selectedInventory.value = null
  showInventoryDialog.value = true
  DebugUtils.info(MODULE_NAME, 'Starting new inventory', {
    department: effectiveDepartment.value
  })
}

/**
 * Handle inventory item click
 */
function handleInventoryClick(inv: InventoryDocument) {
  selectedInventory.value = inv

  if (inv.status === 'draft') {
    // Open dialog to continue editing
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Continuing draft inventory', {
      inventoryId: inv.id
    })
  } else {
    // Open details dialog for viewing
    showDetailsDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Viewing completed inventory', {
      inventoryId: inv.id
    })
  }
}

/**
 * Handle success from dialog
 */
function handleSuccess(message: string) {
  snackbarMessage.value = message
  snackbarColor.value = 'success'
  showSnackbar.value = true
  showInventoryDialog.value = false
  selectedInventory.value = null

  // Refresh data
  loadData()
}

/**
 * Handle error from dialog
 */
function handleError(message: string) {
  snackbarMessage.value = message
  snackbarColor.value = 'error'
  showSnackbar.value = true
}

/**
 * Load data
 */
async function loadData() {
  if (storageStore.initialized) {
    try {
      await storageStore.fetchBalances()
      await storageStore.fetchInventories()
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error: err })
    }
  }
}

/**
 * Retry loading
 */
async function retryLoad() {
  isLoading.value = true
  error.value = null

  try {
    if (!storageStore.initialized) {
      await storageStore.initialize()
    } else {
      await loadData()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    DebugUtils.error(MODULE_NAME, 'Retry failed', { error: err })
  } finally {
    isLoading.value = false
  }
}

// =============================================
// WATCHERS
// =============================================

/**
 * Update inventory composable department when prop changes
 */
watch(
  () => effectiveDepartment.value,
  newDept => {
    inventory.selectedDepartment.value = newDept
    DebugUtils.debug(MODULE_NAME, 'Department changed', { department: newDept })
  },
  { immediate: true }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.info(MODULE_NAME, 'Component mounted', {
    department: effectiveDepartment.value,
    storageInitialized: storageStore.initialized
  })

  // Storage store should already be loaded by initialization
  // Just refresh if needed
  if (storageStore.initialized) {
    await loadData()
  }
})
</script>

<style scoped lang="scss">
.inventory-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-background);
}

.inventory-header {
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

.header-title {
  display: flex;
  align-items: center;
}

.inventory-loading,
.inventory-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

.inventory-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.stat-card {
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.inventory-item {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
    border-color: rgb(var(--v-theme-primary));
  }
}

.empty-state {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .inventory-header {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .header-actions {
    display: flex;

    .v-btn {
      flex: 1;
    }
  }

  .inventory-content {
    padding: var(--spacing-md);
  }
}
</style>
