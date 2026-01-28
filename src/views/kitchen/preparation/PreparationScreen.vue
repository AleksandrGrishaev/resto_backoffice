<!-- src/views/kitchen/preparation/PreparationScreen.vue -->
<!-- Kitchen Preparation Management - Main Screen with Tabs -->
<template>
  <div class="preparation-screen">
    <!-- Header with Title and Action Buttons -->
    <div class="preparation-header">
      <div class="header-title">
        <h1 class="text-h5 font-weight-bold">Preparation Management</h1>
        <SyncStatusIndicator class="ml-2" />
      </div>

      <!-- Action Buttons -->
      <div class="header-actions">
        <v-btn
          variant="outlined"
          class="action-btn"
          :loading="isRefreshing"
          @click="handleRefreshSchedule"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>

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
      <v-tab value="history">
        <v-icon start>mdi-history</v-icon>
        History
        <v-badge
          v-if="historyCount > 0"
          :content="historyCount"
          color="success"
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
            @view-details="handleViewDetails"
          />
        </v-window-item>

        <!-- History Tab -->
        <v-window-item value="history">
          <HistoryTab
            ref="historyTabRef"
            :department="userDepartment"
            @count-change="handleHistoryCountChange"
          />
        </v-window-item>
      </v-window>
    </div>

    <!-- Dialogs -->
    <SimpleProductionDialog
      v-model="showProductionDialog"
      :preselected-preparation-id="selectedPreparationId"
      @success="handleProductionSuccess"
      @completed="handleBackgroundTaskCompleted"
      @error="handleError"
    />

    <PrepWriteOffDialog
      v-model="showPrepWriteOffDialog"
      :preselected-preparation-id="selectedPreparationId"
      @success="handleWriteOffSuccess"
      @completed="handleBackgroundTaskCompleted"
      @error="handleError"
    />

    <ProductWriteOffDialog
      v-model="showProductWriteOffDialog"
      @success="handleProductWriteOffSuccess"
      @completed="handleBackgroundTaskCompleted"
      @error="handleError"
    />

    <ScheduleConfirmDialog
      v-model="showScheduleConfirmDialog"
      :task="selectedTask"
      @confirmed="handleTaskConfirmed"
      @completed="handleBackgroundTaskCompleted"
      @cancelled="handleTaskCancelled"
    />

    <!-- Single Item Write-off Dialog (from Stock List trash icon) -->
    <PreparationQuantityDialog
      v-model="showSingleWriteOffDialog"
      :preparation="selectedPreparation"
      :department="userDepartment"
      @confirm="handleSingleWriteOffConfirm"
      @cancel="handleSingleWriteOffCancel"
    />

    <!-- Preparation Item Details Dialog (Batches + Write-offs) -->
    <PrepItemDetailsDialog v-model="showItemDetailsDialog" :item="selectedBalanceForDetails" />

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
import { useSyncStatus } from '@/stores/kitchenKpi/composables/useSyncStatus'
import ProductionScheduleTab from './components/ProductionScheduleTab.vue'
import StockListTab from './components/StockListTab.vue'
import HistoryTab from './components/HistoryTab.vue'
import SyncStatusIndicator from './components/SyncStatusIndicator.vue'
import {
  SimpleProductionDialog,
  PrepWriteOffDialog,
  ProductWriteOffDialog,
  ScheduleConfirmDialog
} from './dialogs'
import PreparationQuantityDialog from '@/views/Preparation/components/writeoff/PreparationQuantityDialog.vue'
import PrepItemDetailsDialog from './dialogs/PrepItemDetailsDialog.vue'
import { useBackgroundTasks } from '@/core/background'
import type { PreparationBalance, ProductionRecommendation } from '@/stores/preparation/types'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type { ComponentPublicInstance } from 'vue'

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
const { addPrepWriteOffTask } = useBackgroundTasks()

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
// SYNC STATUS (Sprint 7)
// =============================================

const { isOnline, hasPendingSync, triggerSync } = useSyncStatus()

// =============================================
// STATE
// =============================================

const activeTab = ref<'schedule' | 'stock' | 'history'>('schedule')
const isLoading = ref(false)
const isRefreshing = ref(false)
const error = ref<string | null>(null)

// Dialog state
const showProductionDialog = ref(false)
const showPrepWriteOffDialog = ref(false)
const showProductWriteOffDialog = ref(false)
const showScheduleConfirmDialog = ref(false)
const showSingleWriteOffDialog = ref(false)
const showItemDetailsDialog = ref(false)
const selectedPreparationId = ref<string | null>(null)
const selectedPreparation = ref<{ id: string; name: string; unit: string } | null>(null)
const selectedTask = ref<ProductionScheduleItem | null>(null)
const selectedBalanceForDetails = ref<PreparationBalance | null>(null)

// Template refs
const historyTabRef = ref<ComponentPublicInstance<{ refreshHistory: () => Promise<void> }> | null>(
  null
)

// History count for badge (updated via @count-change event)
const historyCount = ref(0)

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

    // Auto-fulfill tasks that have sufficient stock
    const fulfilledCount = await kpiStore.autoFulfillTasks(userDepartment.value)
    if (fulfilledCount > 0) {
      showSnackbar(`${fulfilledCount} task(s) auto-fulfilled based on stock`, 'success')
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Refresh schedule and check for auto-fulfillment
 */
async function handleRefreshSchedule(): Promise<void> {
  try {
    isRefreshing.value = true

    DebugUtils.info(MODULE_NAME, 'Refreshing schedule with auto-fulfillment check...')

    const result = await kpiStore.refreshScheduleWithAutoFulfill(userDepartment.value)

    if (result.fulfilled > 0) {
      showSnackbar(`Refreshed! ${result.fulfilled} task(s) auto-fulfilled`, 'success')
    } else {
      showSnackbar('Schedule refreshed', 'info')
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh schedule', { error: err })
    showSnackbar('Failed to refresh schedule', 'error')
  } finally {
    isRefreshing.value = false
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
 * Open single-item preparation write-off dialog for specific preparation (from Stock List trash icon)
 */
function openPrepWriteOffDialogForPrep(preparationId: string): void {
  // Get preparation details from balance
  const balance = preparationStore.getBalance(preparationId, userDepartment.value)
  if (balance) {
    selectedPreparation.value = {
      id: preparationId,
      name: balance.preparationName,
      unit: balance.unit
    }
    showSingleWriteOffDialog.value = true
    DebugUtils.debug(MODULE_NAME, 'Opening single write-off dialog for prep', {
      preparationId,
      name: balance.preparationName
    })
  } else {
    // Fallback to multi-select dialog if balance not found
    selectedPreparationId.value = preparationId
    showPrepWriteOffDialog.value = true
    DebugUtils.debug(MODULE_NAME, 'Fallback to prep write-off dialog (balance not found)', {
      preparationId
    })
  }
}

/**
 * Open product write-off dialog
 */
function openProductWriteOffDialog(): void {
  showProductWriteOffDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening product write-off dialog')
}

/**
 * Handle view details for a preparation item
 */
function handleViewDetails(balance: PreparationBalance): void {
  selectedBalanceForDetails.value = balance
  showItemDetailsDialog.value = true
  DebugUtils.debug(MODULE_NAME, 'Opening item details dialog', {
    preparationId: balance.preparationId,
    preparationName: balance.preparationName
  })
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
 * Handle successful production (dialog closed, task queued)
 * Note: Don't reload data here - wait for @completed event when background task finishes
 */
function handleProductionSuccess(message: string): void {
  showSnackbar(message, 'info')
}

/**
 * Handle successful preparation write-off (dialog closed, task queued)
 * Note: Don't reload data here - wait for @completed event when background task finishes
 */
function handleWriteOffSuccess(message: string): void {
  showSnackbar(message, 'info')
}

/**
 * Handle successful product write-off (dialog closed, task queued)
 * Note: Don't reload data here - wait for @completed event when background task finishes
 */
function handleProductWriteOffSuccess(message: string): void {
  showSnackbar(message, 'info')
}

/**
 * Handle background task completion - reload data to show updated history
 */
function handleBackgroundTaskCompleted(): void {
  DebugUtils.info(MODULE_NAME, 'Background task completed, refreshing data...')
  loadData()
  // Also refresh history tab if it exists
  historyTabRef.value?.refreshHistory?.()
}

/**
 * Handle history count change from HistoryTab
 */
function handleHistoryCountChange(count: number): void {
  historyCount.value = count
}

/**
 * Handle dialog error
 */
function handleError(errorMessage: string): void {
  showSnackbar(errorMessage, 'error')
}

/**
 * Handle task confirmation from schedule (dialog closed, task queued)
 * Note: Don't reload data here - wait for @completed event when background task finishes
 */
function handleTaskConfirmed(data: { taskId: string; quantity: number; notes: string }): void {
  showSnackbar('Processing task completion...', 'info')
  selectedTask.value = null
  DebugUtils.info(MODULE_NAME, 'Task confirmed, waiting for background completion', data)
}

/**
 * Handle task cancellation
 */
function handleTaskCancelled(): void {
  selectedTask.value = null
}

/**
 * Handle single preparation write-off confirmation (from Stock List trash icon)
 */
function handleSingleWriteOffConfirm(
  preparation: { id: string; name: string; unit: string },
  quantity: number,
  notes: string
): void {
  DebugUtils.info(MODULE_NAME, 'Processing single preparation write-off', {
    preparationId: preparation.id,
    preparationName: preparation.name,
    quantity,
    notes
  })

  // Queue background task
  addPrepWriteOffTask(
    {
      items: [
        {
          preparationId: preparation.id,
          preparationName: preparation.name,
          quantity,
          unit: preparation.unit
        }
      ],
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      reason: 'expiration', // Default reason for single item write-off
      notes: notes || 'Write-off from Stock List',
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        affectsKpi: true // Expiration affects KPI
      }
    },
    {
      onSuccess: (message: string) => {
        showSnackbar(message, 'success')
        handleBackgroundTaskCompleted()
      },
      onError: (message: string) => {
        showSnackbar(message, 'error')
      }
    }
  )

  // Close dialog and show processing message
  showSingleWriteOffDialog.value = false
  selectedPreparation.value = null
  showSnackbar(`Processing write-off of ${preparation.name}...`, 'info')
}

/**
 * Handle single write-off dialog cancellation
 */
function handleSingleWriteOffCancel(): void {
  showSingleWriteOffDialog.value = false
  selectedPreparation.value = null
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
 * Handle online/offline status with auto-sync
 */
async function handleOnlineStatus(): Promise<void> {
  if (navigator.onLine) {
    DebugUtils.info(MODULE_NAME, 'Back online, syncing and refreshing data...')

    // Trigger sync if there are pending items
    if (hasPendingSync.value) {
      await triggerSync()
    }

    // Refresh data from server
    await loadData()
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
