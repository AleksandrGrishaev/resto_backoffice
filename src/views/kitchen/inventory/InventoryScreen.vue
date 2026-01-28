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

          <!-- Tab Switcher: Products / Preparations -->
          <v-btn-toggle v-model="inventoryType" mandatory density="compact" class="ml-4">
            <v-btn value="products" size="small">
              <v-icon start size="16">mdi-package-variant</v-icon>
              Products
            </v-btn>
            <v-btn value="preparations" size="small">
              <v-icon start size="16">mdi-food-variant</v-icon>
              Preparations
            </v-btn>
          </v-btn-toggle>
        </div>
        <div class="header-actions">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="inventoryType === 'products' ? !isStorageReady : !isPreparationStoreReady"
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
      <!-- Stats Cards: Products -->
      <div v-if="inventoryType === 'products' && isStorageReady" class="stats-section mb-6">
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

      <!-- Stats Cards: Preparations -->
      <div
        v-if="inventoryType === 'preparations' && isPreparationStoreReady"
        class="stats-section mb-6"
      >
        <v-row>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="info" class="mb-2">mdi-food-variant</v-icon>
                <div class="text-h5 font-weight-bold">{{ preparationCount }}</div>
                <div class="text-caption text-medium-emphasis">Preparations</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="warning" class="mb-2">mdi-file-document-edit</v-icon>
                <div class="text-h5 font-weight-bold">{{ preparationDraftCount }}</div>
                <div class="text-caption text-medium-emphasis">Draft</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="success" class="mb-2">mdi-clipboard-check</v-icon>
                <div class="text-h5 font-weight-bold">{{ preparationCompletedCount }}</div>
                <div class="text-caption text-medium-emphasis">Completed</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="stat-card">
              <v-card-text class="text-center">
                <v-icon size="32" color="primary" class="mb-2">mdi-calendar</v-icon>
                <div class="text-body-1 font-weight-bold">{{ lastPreparationInventoryDate }}</div>
                <div class="text-caption text-medium-emphasis">Last Count</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Inventory History: Products -->
      <div v-if="inventoryType === 'products'" class="history-section">
        <div class="section-header d-flex align-center justify-space-between mb-4">
          <h2 class="text-h6">Product Inventory History</h2>
          <v-chip size="small" variant="tonal">{{ departmentInventories.length }} records</v-chip>
        </div>

        <!-- Empty State -->
        <v-card v-if="departmentInventories.length === 0" variant="outlined" class="empty-state">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey" class="mb-4">mdi-clipboard-text-outline</v-icon>
            <h3 class="text-h6 mb-2">No product inventory records</h3>
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

      <!-- Inventory History: Preparations -->
      <div v-if="inventoryType === 'preparations'" class="history-section">
        <div class="section-header d-flex align-center justify-space-between mb-4">
          <h2 class="text-h6">Preparation Inventory History</h2>
          <v-chip size="small" variant="tonal">
            {{ departmentPreparationInventories.length }} records
          </v-chip>
        </div>

        <!-- Empty State -->
        <v-card
          v-if="departmentPreparationInventories.length === 0"
          variant="outlined"
          class="empty-state"
        >
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey" class="mb-4">mdi-clipboard-text-outline</v-icon>
            <h3 class="text-h6 mb-2">No preparation inventory records</h3>
            <p class="text-medium-emphasis mb-6">
              Start your first preparation inventory to track semi-finished product levels
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
            v-for="inv in departmentPreparationInventories"
            :key="inv.id"
            variant="outlined"
            class="inventory-item mb-3"
            @click="handlePreparationInventoryClick(inv)"
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

    <!-- Inventory Dialog: Products -->
    <KitchenInventoryDialog
      v-model="showInventoryDialog"
      :department="effectiveDepartment"
      :existing-inventory="selectedInventory"
      @success="handleSuccess"
      @error="handleError"
    />

    <!-- Inventory Dialog: Preparations -->
    <KitchenPreparationInventoryDialog
      v-model="showPreparationInventoryDialog"
      :department="effectiveDepartment"
      :existing-inventory="selectedPreparationInventory"
      @success="handleSuccess"
      @error="handleError"
    />

    <!-- Details Dialog (for completed product inventories) -->
    <InventoryDetailsDialog v-model="showDetailsDialog" :inventory="selectedInventory" />

    <!-- Details Dialog (for completed preparation inventories) -->
    <PreparationInventoryDetailsDialog
      v-model="showPreparationDetailsDialog"
      :inventory="selectedPreparationInventory"
    />

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
import { useProductsStore } from '@/stores/productsStore'
import { useAuthStore } from '@/stores/auth'
import { useRecipesStore } from '@/stores/recipes'
import { usePreparationStore } from '@/stores/preparation'
import { useInventory } from '@/stores/storage'
import type { InventoryDocument } from '@/stores/storage'
import type { PreparationInventoryDocument } from '@/stores/preparation'
import type { Department } from '@/stores/productsStore/types'
import { DebugUtils, TimeUtils } from '@/utils'
import KitchenInventoryDialog from './KitchenInventoryDialog.vue'
import KitchenPreparationInventoryDialog from './KitchenPreparationInventoryDialog.vue'
import InventoryDetailsDialog from '@/views/storage/components/InventoryDetailsDialog.vue'
import PreparationInventoryDetailsDialog from '@/views/Preparation/components/InventoryDetailsDialog.vue'

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
const productsStore = useProductsStore()
const authStore = useAuthStore()
const recipesStore = useRecipesStore()
const preparationStore = usePreparationStore()
const inventory = useInventory()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const error = ref<string | null>(null)
const inventoryType = ref<'products' | 'preparations'>('products')
const showInventoryDialog = ref(false)
const showPreparationInventoryDialog = ref(false)
const showDetailsDialog = ref(false)
const showPreparationDetailsDialog = ref(false)
const selectedInventory = ref<InventoryDocument | null>(null)
const selectedPreparationInventory = ref<PreparationInventoryDocument | null>(null)
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
// COMPUTED: PREPARATIONS
// =============================================

/**
 * Check if preparation store is ready
 */
const isPreparationStoreReady = computed(() => {
  return preparationStore.state?.balances?.length >= 0
})

/**
 * Get preparation inventories for current department
 */
const departmentPreparationInventories = computed(() => {
  if (!preparationStore.state?.inventories) return []

  return preparationStore.state.inventories
    .filter(inv => inv.department === effectiveDepartment.value)
    .sort((a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime())
})

/**
 * Count preparations for current department
 */
const preparationCount = computed(() => {
  if (!preparationStore.state?.balances) return 0
  return preparationStore.state.balances.filter(b => b.department === effectiveDepartment.value)
    .length
})

/**
 * Draft preparation inventories count
 */
const preparationDraftCount = computed(() => {
  return departmentPreparationInventories.value.filter(inv => inv.status === 'draft').length
})

/**
 * Completed preparation inventories count
 */
const preparationCompletedCount = computed(() => {
  return departmentPreparationInventories.value.filter(inv => inv.status === 'confirmed').length
})

/**
 * Last preparation inventory date
 */
const lastPreparationInventoryDate = computed(() => {
  const completed = departmentPreparationInventories.value.filter(inv => inv.status === 'confirmed')
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
  if (inventoryType.value === 'products') {
    selectedInventory.value = null
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Starting new product inventory', {
      department: effectiveDepartment.value
    })
  } else {
    selectedPreparationInventory.value = null
    showPreparationInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Starting new preparation inventory', {
      department: effectiveDepartment.value
    })
  }
}

/**
 * Handle product inventory item click
 */
function handleInventoryClick(inv: InventoryDocument) {
  selectedInventory.value = inv

  if (inv.status === 'draft') {
    // Open dialog to continue editing
    showInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Continuing draft product inventory', {
      inventoryId: inv.id
    })
  } else {
    // Open details dialog for viewing
    showDetailsDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Viewing completed product inventory', {
      inventoryId: inv.id
    })
  }
}

/**
 * Handle preparation inventory item click
 */
function handlePreparationInventoryClick(inv: PreparationInventoryDocument) {
  selectedPreparationInventory.value = inv

  if (inv.status === 'draft') {
    // Open dialog to continue editing
    showPreparationInventoryDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Continuing draft preparation inventory', {
      inventoryId: inv.id
    })
  } else {
    // Open details dialog for viewing
    showPreparationDetailsDialog.value = true
    DebugUtils.info(MODULE_NAME, 'Viewing completed preparation inventory', {
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
  showPreparationInventoryDialog.value = false
  selectedInventory.value = null
  selectedPreparationInventory.value = null

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
 * Load data (refresh existing data)
 */
async function loadData() {
  try {
    // Refresh product inventory data
    if (storageStore.initialized) {
      await Promise.all([storageStore.fetchBalances(), storageStore.fetchInventories()])
    }

    // Refresh preparation inventory data
    if (preparationStore.state?.balances) {
      await Promise.all([preparationStore.fetchBalances(), preparationStore.fetchInventories()])
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh data', { error: err })
  }
}

/**
 * Lazy load required stores for Inventory
 * Products and Storage are not loaded by default in Kitchen context
 * to optimize initial load time (99% of kitchen users don't need inventory)
 */
async function initializeRequiredStores(): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    // Step 1: Load products if not loaded (required for balance calculation)
    if (productsStore.products.length === 0) {
      DebugUtils.info(MODULE_NAME, 'Lazy loading products store...')
      await productsStore.loadProducts()
      DebugUtils.info(MODULE_NAME, 'Products loaded', {
        count: productsStore.products.length
      })
    }

    // Step 2: Initialize or refresh storage store
    if (!storageStore.initialized) {
      DebugUtils.info(MODULE_NAME, 'Lazy loading storage store...')
      await storageStore.initialize()
      DebugUtils.info(MODULE_NAME, 'Storage initialized', {
        balances: storageStore.state.balances.length
      })
    } else {
      // Already initialized, just refresh storage data
      await storageStore.fetchBalances()
      await storageStore.fetchInventories()
    }

    // Step 3: Load recipes store (required for preparation names)
    if (recipesStore.preparations.length === 0) {
      DebugUtils.info(MODULE_NAME, 'Lazy loading recipes store (preparations)...')
      await recipesStore.fetchPreparations()
      DebugUtils.info(MODULE_NAME, 'Preparations loaded', {
        count: recipesStore.preparations.length
      })
    }

    // Step 4: Initialize preparation store
    if (!preparationStore.state?.balances?.length) {
      DebugUtils.info(MODULE_NAME, 'Lazy loading preparation store...')
      await preparationStore.initialize()
      DebugUtils.info(MODULE_NAME, 'Preparation store initialized', {
        balances: preparationStore.state.balances.length,
        inventories: preparationStore.state.inventories.length
      })
    } else {
      // Already initialized, just refresh preparation data
      await preparationStore.fetchBalances()
      await preparationStore.fetchInventories()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load inventory data'
    DebugUtils.error(MODULE_NAME, 'Failed to initialize required stores', { error: err })
  } finally {
    isLoading.value = false
  }
}

/**
 * Retry loading - reuses initializeRequiredStores for consistency
 */
async function retryLoad() {
  await initializeRequiredStores()
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
    storageInitialized: storageStore.initialized,
    productsLoaded: productsStore.products.length > 0
  })

  // Lazy load products and storage stores
  await initializeRequiredStores()
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
