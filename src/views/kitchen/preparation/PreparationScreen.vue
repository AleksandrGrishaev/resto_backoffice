<!-- src/views/kitchen/preparation/PreparationScreen.vue -->
<!-- Kitchen Preparation Management - Main Screen with Tabs -->
<template>
  <div class="preparation-screen">
    <!-- Header with Title and Action Buttons -->
    <div class="preparation-header">
      <div class="header-title">
        <h1 class="text-h5 font-weight-bold">Preparation Management</h1>
        <v-chip v-if="!isOnline" color="warning" size="small" variant="flat" class="ml-2">
          <v-icon start size="small">mdi-cloud-off-outline</v-icon>
          Offline
        </v-chip>
      </div>

      <!-- Action Buttons -->
      <div class="header-actions">
        <v-btn
          variant="outlined"
          class="action-btn"
          :loading="kpiStore.loading.recommendations"
          @click="handleRegenerateSchedule"
        >
          <v-icon start>mdi-lightbulb-outline</v-icon>
          Generate Schedule
        </v-btn>

        <v-btn color="primary" variant="flat" class="action-btn" @click="openProductionDialog">
          <v-icon start>mdi-plus</v-icon>
          New Production
        </v-btn>

        <v-btn color="warning" variant="flat" class="action-btn" @click="openPrepWriteOffDialog">
          <v-icon start>mdi-package-variant-remove</v-icon>
          Write-off Prep
        </v-btn>

        <v-btn color="error" variant="flat" class="action-btn" @click="openProductWriteOffDialog">
          <v-icon start>mdi-delete-outline</v-icon>
          Write-off Product
        </v-btn>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <v-tabs v-model="activeTab" color="primary" class="preparation-tabs">
      <v-tab value="schedule">
        <v-icon start>mdi-clipboard-list-outline</v-icon>
        Production Schedule
        <v-badge
          v-if="pendingTasksCount > 0"
          :content="pendingTasksCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="stock">
        <v-icon start>mdi-package-variant</v-icon>
        Stock List
        <v-badge
          v-if="lowStockCount > 0"
          :content="lowStockCount"
          color="warning"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <div class="preparation-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="content-loading">
        <v-progress-circular indeterminate size="48" color="primary" />
        <p class="mt-4 text-medium-emphasis">Loading preparation data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="content-error">
        <v-icon size="48" color="error" class="mb-4">mdi-alert-circle-outline</v-icon>
        <p class="text-body-1 mb-4">{{ error }}</p>
        <v-btn color="primary" variant="outlined" @click="loadData">
          <v-icon start>mdi-refresh</v-icon>
          Retry
        </v-btn>
      </div>

      <!-- Tab Windows -->
      <v-window v-else v-model="activeTab" class="tab-window">
        <!-- Schedule Tab -->
        <v-window-item value="schedule">
          <ProductionScheduleTab
            :schedule-items="scheduleBySlot"
            :recommendations="activeRecommendations"
            :loading="kpiStore.loading.schedule"
            :recommendations-loading="kpiStore.loading.recommendations"
            @complete-task="handleCompleteTask"
            @start-task="handleStartTask"
            @generate-recommendations="handleGenerateRecommendations"
            @apply-recommendation="handleApplyRecommendation"
            @apply-all-recommendations="handleApplyAllRecommendations"
            @dismiss-recommendation="handleDismissRecommendation"
          />
        </v-window-item>

        <!-- Stock Tab -->
        <v-window-item value="stock">
          <StockListTab
            :balances="filteredBalances"
            :loading="preparationStore.state.loading.balances"
            @produce="openProductionDialogForPrep"
            @write-off="openPrepWriteOffDialogForPrep"
          />
        </v-window-item>
      </v-window>
    </div>

    <!-- Dialogs -->
    <SimpleProductionDialog
      v-model="showProductionDialog"
      :preselected-preparation-id="selectedPreparationId"
      @success="handleProductionSuccess"
      @error="handleError"
    />

    <PrepWriteOffDialog
      v-model="showPrepWriteOffDialog"
      :preselected-preparation-id="selectedPreparationId"
      @success="handleWriteOffSuccess"
      @error="handleError"
    />

    <ProductWriteOffDialog
      v-model="showProductWriteOffDialog"
      @success="handleProductWriteOffSuccess"
      @error="handleError"
    />

    <ScheduleConfirmDialog
      v-model="showScheduleConfirmDialog"
      :task="selectedTask"
      @confirmed="handleTaskConfirmed"
      @cancelled="handleTaskCancelled"
    />

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import { useRecommendations } from '@/stores/kitchenKpi/composables/useRecommendations'
import ProductionScheduleTab from './components/ProductionScheduleTab.vue'
import StockListTab from './components/StockListTab.vue'
import {
  SimpleProductionDialog,
  PrepWriteOffDialog,
  ProductWriteOffDialog,
  ScheduleConfirmDialog
} from './dialogs'
import type { PreparationBalance, ProductionRecommendation } from '@/stores/preparation/types'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

const MODULE_NAME = 'PreparationScreen'

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'navigate-to-orders': []
}>()

// =============================================
// STORES
// =============================================

const preparationStore = usePreparationStore()
const kpiStore = useKitchenKpiStore()
const authStore = useAuthStore()

// =============================================
// RECOMMENDATIONS COMPOSABLE
// =============================================

const {
  recommendations,
  loading: recommendationsLoading,
  activeRecommendations,
  hasRecommendations,
  generateRecommendations,
  applyAllToSchedule,
  applySingleToSchedule,
  dismissRecommendation
} = useRecommendations()

// =============================================
// STATE
// =============================================

const activeTab = ref<'schedule' | 'stock'>('schedule')
const isLoading = ref(false)
const error = ref<string | null>(null)
const isOnline = ref(navigator.onLine)

// Dialog state
const showProductionDialog = ref(false)
const showPrepWriteOffDialog = ref(false)
const showProductWriteOffDialog = ref(false)
const showScheduleConfirmDialog = ref(false)
const selectedPreparationId = ref<string | null>(null)
const selectedTask = ref<ProductionScheduleItem | null>(null)

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// =============================================
// COMPUTED
// =============================================

/**
 * User's department based on role
 */
const userDepartment = computed<'kitchen' | 'bar'>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

/**
 * Schedule items grouped by slot
 */
const scheduleBySlot = computed(() => kpiStore.scheduleBySlot)

/**
 * Pending tasks count for badge
 */
const pendingTasksCount = computed(() => {
  const summary = kpiStore.scheduleSummary
  return summary?.pendingTasks || 0
})

/**
 * Filtered balances by user's department
 */
const filteredBalances = computed<PreparationBalance[]>(() => {
  const balances = preparationStore.state.balances || []

  // Admin sees all, kitchen/bar see only their department
  if (authStore.isAdmin) {
    return balances
  }

  return balances.filter(b => b.department === userDepartment.value || b.department === 'all')
})

/**
 * Low stock items count for badge
 */
const lowStockCount = computed(() => {
  return filteredBalances.value.filter(b => b.belowMinStock || b.hasNearExpiry || b.hasExpired)
    .length
})

// =============================================
// METHODS
// =============================================

/**
 * Load all data
 */
async function loadData(): Promise<void> {
  try {
    isLoading.value = true
    error.value = null

    DebugUtils.info(MODULE_NAME, 'Loading preparation data...')

    // Load schedule and balances in parallel
    await Promise.all([
      kpiStore.loadSchedule({ department: userDepartment.value }),
      preparationStore.fetchBalances(userDepartment.value)
    ])

    DebugUtils.info(MODULE_NAME, 'Preparation data loaded', {
      scheduleItems: kpiStore.scheduleItems.length,
      balances: filteredBalances.value.length
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Open production dialog
 */
function openProductionDialog(): void {
  selectedPreparationId.value = null
  showProductionDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening production dialog')
}

/**
 * Open production dialog for specific preparation
 */
function openProductionDialogForPrep(preparationId: string): void {
  selectedPreparationId.value = preparationId
  showProductionDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening production dialog for prep', { preparationId })
}

/**
 * Open preparation write-off dialog
 */
function openPrepWriteOffDialog(): void {
  selectedPreparationId.value = null
  showPrepWriteOffDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening prep write-off dialog')
}

/**
 * Open preparation write-off dialog for specific preparation
 */
function openPrepWriteOffDialogForPrep(preparationId: string): void {
  selectedPreparationId.value = preparationId
  showPrepWriteOffDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening prep write-off dialog for prep', { preparationId })
}

/**
 * Open product write-off dialog
 */
function openProductWriteOffDialog(): void {
  showProductWriteOffDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening product write-off dialog')
}

/**
 * Handle schedule task completion - opens confirm dialog
 */
async function handleCompleteTask(task: ProductionScheduleItem): Promise<void> {
  selectedTask.value = task
  showScheduleConfirmDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening schedule confirm dialog', { taskId: task.id })
}

/**
 * Handle starting a task (mark as in_progress)
 */
async function handleStartTask(task: ProductionScheduleItem): Promise<void> {
  try {
    await kpiStore.updateTaskStatus(task.id, 'in_progress')
    DebugUtils.debug(MODULE_NAME, 'Task started', { taskId: task.id })
    showSnackbar('Task started', 'info')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to start task', { error: err })
    showSnackbar('Failed to start task', 'error')
  }
}

// =============================================
// RECOMMENDATIONS HANDLERS
// =============================================

/**
 * Generate recommendations
 */
async function handleGenerateRecommendations(): Promise<void> {
  try {
    await generateRecommendations(userDepartment.value)
    DebugUtils.info(MODULE_NAME, 'Recommendations generated', {
      count: activeRecommendations.value.length
    })
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to generate recommendations', { error: err })
    showSnackbar('Failed to generate recommendations', 'error')
  }
}

/**
 * Regenerate schedule (button handler)
 */
async function handleRegenerateSchedule(): Promise<void> {
  try {
    await generateRecommendations(userDepartment.value)
    if (activeRecommendations.value.length > 0) {
      showSnackbar(`${activeRecommendations.value.length} recommendations generated`, 'info')
    } else {
      showSnackbar('All preparations are well-stocked', 'success')
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to regenerate schedule', { error: err })
    showSnackbar('Failed to generate recommendations', 'error')
  }
}

/**
 * Apply single recommendation to schedule
 */
async function handleApplyRecommendation(recommendation: ProductionRecommendation): Promise<void> {
  try {
    await applySingleToSchedule(recommendation, userDepartment.value)
    await loadData() // Refresh schedule
    showSnackbar(`${recommendation.preparationName} added to schedule`, 'success')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to apply recommendation', { error: err })
    showSnackbar('Failed to add to schedule', 'error')
  }
}

/**
 * Apply all recommendations to schedule
 */
async function handleApplyAllRecommendations(): Promise<void> {
  try {
    const count = activeRecommendations.value.length
    await applyAllToSchedule(userDepartment.value)
    await loadData() // Refresh schedule
    showSnackbar(`${count} items added to schedule`, 'success')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to apply recommendations', { error: err })
    showSnackbar('Failed to add to schedule', 'error')
  }
}

/**
 * Dismiss a recommendation
 */
function handleDismissRecommendation(id: string): void {
  dismissRecommendation(id)
  DebugUtils.debug(MODULE_NAME, 'Recommendation dismissed', { id })
}

// =============================================
// DIALOG EVENT HANDLERS
// =============================================

/**
 * Handle successful production
 */
function handleProductionSuccess(message: string): void {
  showSnackbar(message, 'success')
  loadData() // Refresh data
}

/**
 * Handle successful preparation write-off
 */
function handleWriteOffSuccess(message: string): void {
  showSnackbar(message, 'success')
  loadData()
}

/**
 * Handle successful product write-off
 */
function handleProductWriteOffSuccess(message: string): void {
  showSnackbar(message, 'success')
  loadData()
}

/**
 * Handle dialog error
 */
function handleError(errorMessage: string): void {
  showSnackbar(errorMessage, 'error')
}

/**
 * Handle task confirmation from schedule
 */
function handleTaskConfirmed(data: { taskId: string; quantity: number; notes: string }): void {
  showSnackbar('Task completed successfully', 'success')
  selectedTask.value = null
  loadData()
  DebugUtils.info(MODULE_NAME, 'Task confirmed', data)
}

/**
 * Handle task cancellation
 */
function handleTaskCancelled(): void {
  selectedTask.value = null
}

/**
 * Show snackbar notification
 */
function showSnackbar(message: string, color: 'success' | 'error' | 'info' | 'warning'): void {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

/**
 * Handle online/offline status
 */
function handleOnlineStatus(): void {
  isOnline.value = navigator.onLine
  if (isOnline.value) {
    DebugUtils.info(MODULE_NAME, 'Back online, refreshing data...')
    loadData()
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  window.addEventListener('online', handleOnlineStatus)
  window.addEventListener('offline', handleOnlineStatus)

  await loadData()

  // Auto-generate recommendations if schedule is empty
  if (kpiStore.scheduleItems.length === 0) {
    DebugUtils.info(MODULE_NAME, 'Schedule empty, auto-generating recommendations...')
    await handleGenerateRecommendations()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatus)
  window.removeEventListener('offline', handleOnlineStatus)
})

// Watch for department changes (admin switching departments)
watch(userDepartment, () => {
  loadData()
})
</script>

<style scoped lang="scss">
.preparation-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-background);
}

.preparation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-wrap: wrap;
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  text-transform: none;
}

.preparation-tabs {
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.preparation-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex scroll containers */
}

.content-loading,
.content-error {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.tab-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.v-window__container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.v-window-item) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: auto !important;
}

@media (max-width: 768px) {
  .preparation-header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
  }

  .header-title {
    justify-content: center;
    margin-bottom: 8px;
  }

  .header-actions {
    justify-content: center;
  }

  .action-btn {
    flex: 1;
    min-width: 100px;
  }
}
</style>
