<!-- src/views/debug/SyncMonitorView.vue - Sync Monitor with History -->
<template>
  <div class="sync-monitor-view">
    <!-- Header -->
    <v-app-bar flat color="surface" class="sync-header">
      <v-toolbar-title class="d-flex align-center">
        <v-icon class="me-2">mdi-sync</v-icon>
        Sync Monitor
        <v-chip
          v-if="currentTab === 'queue' && stats"
          class="ms-3"
          size="small"
          :color="getStatusColor()"
          variant="tonal"
        >
          {{ stats.totalItems }} items in queue
        </v-chip>
        <v-chip
          v-if="currentTab === 'history' && historyStats"
          class="ms-3"
          size="small"
          color="info"
          variant="tonal"
        >
          {{ historyStats.totalSyncs }} syncs in history
        </v-chip>
      </v-toolbar-title>

      <v-spacer />

      <!-- Global Actions -->
      <v-btn :loading="isRefreshing" icon="mdi-refresh" variant="text" @click="refreshData">
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent">Refresh</v-tooltip>
      </v-btn>

      <v-btn
        v-if="currentTab === 'queue'"
        :disabled="!stats || stats.totalItems === 0"
        icon="mdi-delete-sweep"
        variant="text"
        color="error"
        @click="confirmClearQueue"
      >
        <v-icon>mdi-delete-sweep</v-icon>
        <v-tooltip activator="parent">Clear Queue</v-tooltip>
      </v-btn>

      <v-btn
        v-if="currentTab === 'history'"
        :disabled="!historyStats || historyStats.totalSyncs === 0"
        icon="mdi-delete-sweep"
        variant="text"
        color="error"
        @click="confirmClearHistory"
      >
        <v-icon>mdi-delete-sweep</v-icon>
        <v-tooltip activator="parent">Clear History</v-tooltip>
      </v-btn>
    </v-app-bar>

    <!-- Tabs -->
    <v-tabs v-model="currentTab" class="sync-tabs" color="primary">
      <v-tab value="queue">
        <v-icon start>mdi-format-list-bulleted</v-icon>
        Queue
      </v-tab>
      <v-tab value="history">
        <v-icon start>mdi-history</v-icon>
        History
      </v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="currentTab" class="sync-content-window">
      <!-- Queue Tab -->
      <v-window-item value="queue">
        <div class="sync-content pa-4">
          <!-- Stats Cards -->
          <v-row class="mb-4">
            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="primary">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ stats?.totalItems || 0 }}</div>
                  <div class="text-caption">Total Items</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="warning">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ stats?.pendingItems || 0 }}</div>
                  <div class="text-caption">Pending</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="info">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ stats?.processingItems || 0 }}</div>
                  <div class="text-caption">Processing</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="error">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ stats?.failedItems || 0 }}</div>
                  <div class="text-caption">Failed</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Service Status -->
          <v-card class="mb-4" variant="tonal">
            <v-card-title class="d-flex align-center justify-space-between">
              <span>
                <v-icon start>mdi-information</v-icon>
                Service Status
              </span>
              <v-chip :color="status?.isRunning ? 'success' : 'error'" variant="tonal" size="small">
                {{ status?.isRunning ? 'Running' : 'Stopped' }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-body-2">
                    <strong>Status:</strong>
                    {{ status?.isPaused ? 'Paused' : status?.isRunning ? 'Running' : 'Stopped' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-body-2">
                    <strong>Currently Processing:</strong>
                    {{ status?.currentlyProcessing || 'None' }}
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Filters -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon start>mdi-filter</v-icon>
              Filters
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.entityType"
                    :items="entityTypeOptions"
                    label="Entity Type"
                    clearable
                    density="compact"
                    @update:model-value="applyFilters"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Status"
                    clearable
                    density="compact"
                    @update:model-value="applyFilters"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.priority"
                    :items="priorityOptions"
                    label="Priority"
                    clearable
                    density="compact"
                    @update:model-value="applyFilters"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Queue Items Table -->
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>
                <v-icon start>mdi-format-list-bulleted</v-icon>
                Sync Queue ({{ filteredItems.length }} items)
              </span>
              <v-btn
                v-if="stats && stats.failedItems > 0"
                color="warning"
                variant="tonal"
                size="small"
                prepend-icon="mdi-refresh"
                @click="retryAllFailed"
              >
                Retry Failed
              </v-btn>
            </v-card-title>

            <v-card-text>
              <!-- Empty State -->
              <div v-if="filteredItems.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey">mdi-inbox</v-icon>
                <p class="text-h6 mt-4">No sync items in queue</p>
                <p class="text-body-2 text-medium-emphasis">
                  All items have been synchronized successfully
                </p>
              </div>

              <!-- Items Table -->
              <v-table v-else density="comfortable">
                <thead>
                  <tr>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Operation</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Created</th>
                    <th>Last Attempt</th>
                    <th>Error</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredItems" :key="item.id">
                    <td>
                      <v-chip size="small" variant="tonal">
                        {{ item.entityType }}
                      </v-chip>
                    </td>
                    <td class="text-caption">{{ formatEntityId(item.entityId) }}</td>
                    <td>
                      <v-chip
                        size="small"
                        :color="getOperationColor(item.operation)"
                        variant="tonal"
                      >
                        {{ item.operation }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip size="small" :color="getPriorityColor(item.priority)" variant="tonal">
                        {{ item.priority }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip size="small" :color="getItemStatusColor(item.status)" variant="tonal">
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="item.attempts >= item.maxAttempts ? 'error' : 'default'"
                        variant="tonal"
                      >
                        {{ item.attempts }}/{{ item.maxAttempts }}
                      </v-chip>
                    </td>
                    <td class="text-caption">{{ formatTimestamp(item.createdAt) }}</td>
                    <td class="text-caption">
                      {{ item.lastAttempt ? formatTimestamp(item.lastAttempt) : '-' }}
                    </td>
                    <td>
                      <v-tooltip v-if="item.lastError" location="top">
                        <template #activator="{ props }">
                          <v-icon v-bind="props" color="error" size="small">
                            mdi-alert-circle
                          </v-icon>
                        </template>
                        {{ item.lastError }}
                      </v-tooltip>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <v-btn
                        icon="mdi-refresh"
                        size="x-small"
                        variant="text"
                        @click="retryItem(item.id)"
                      >
                        <v-icon>mdi-refresh</v-icon>
                        <v-tooltip activator="parent">Retry</v-tooltip>
                      </v-btn>
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeItem(item.id)"
                      >
                        <v-icon>mdi-delete</v-icon>
                        <v-tooltip activator="parent">Remove</v-tooltip>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </div>
      </v-window-item>

      <!-- History Tab -->
      <v-window-item value="history">
        <div class="sync-content pa-4">
          <!-- History Stats Cards -->
          <v-row class="mb-4">
            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="primary">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ historyStats?.totalSyncs || 0 }}</div>
                  <div class="text-caption">Total Syncs</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="success">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">
                    {{ historyStats?.successfulSyncs || 0 }}
                  </div>
                  <div class="text-caption">Successful</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="error">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ historyStats?.failedSyncs || 0 }}</div>
                  <div class="text-caption">Failed</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
              <v-card variant="tonal" color="info">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">
                    {{ formatDuration(historyStats?.averageDuration || 0) }}
                  </div>
                  <div class="text-caption">Avg Duration</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Last 24 Hours Stats -->
          <v-card class="mb-4" variant="tonal" color="info">
            <v-card-title>
              <v-icon start>mdi-clock-outline</v-icon>
              Last 24 Hours
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="4" class="text-center">
                  <div class="text-h6">{{ historyStats?.last24Hours.total || 0 }}</div>
                  <div class="text-caption">Total</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <div class="text-h6 text-success">
                    {{ historyStats?.last24Hours.success || 0 }}
                  </div>
                  <div class="text-caption">Success</div>
                </v-col>
                <v-col cols="4" class="text-center">
                  <div class="text-h6 text-error">{{ historyStats?.last24Hours.failed || 0 }}</div>
                  <div class="text-caption">Failed</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- History Filters -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon start>mdi-filter</v-icon>
              Filters
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="historyFilters.entityType"
                    :items="entityTypeOptions"
                    label="Entity Type"
                    clearable
                    density="compact"
                    @update:model-value="applyHistoryFilters"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="historyFilters.status"
                    :items="historyStatusOptions"
                    label="Status"
                    clearable
                    density="compact"
                    @update:model-value="applyHistoryFilters"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="historyFilters.priority"
                    :items="priorityOptions"
                    label="Priority"
                    clearable
                    density="compact"
                    @update:model-value="applyHistoryFilters"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-btn block color="primary" variant="outlined" @click="clearHistoryFilters">
                    Clear Filters
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- History Table -->
          <v-card>
            <v-card-title>
              <v-icon start>mdi-history</v-icon>
              Sync History ({{ filteredHistory.length }} items)
            </v-card-title>

            <v-card-text>
              <!-- Empty State -->
              <div v-if="filteredHistory.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey">mdi-inbox</v-icon>
                <p class="text-h6 mt-4">No sync history</p>
                <p class="text-body-2 text-medium-emphasis">
                  Sync history will appear here after operations complete
                </p>
              </div>

              <!-- History Table -->
              <v-table v-else density="comfortable">
                <thead>
                  <tr>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Operation</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Duration</th>
                    <th>Completed</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredHistory" :key="item.id">
                    <td>
                      <v-chip size="small" variant="tonal">
                        {{ item.entityType }}
                      </v-chip>
                    </td>
                    <td class="text-caption">{{ formatEntityId(item.entityId) }}</td>
                    <td>
                      <v-chip
                        size="small"
                        :color="getOperationColor(item.operation)"
                        variant="tonal"
                      >
                        {{ item.operation }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip size="small" :color="getPriorityColor(item.priority)" variant="tonal">
                        {{ item.priority }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="item.status === 'success' ? 'success' : 'error'"
                        variant="tonal"
                      >
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td>{{ item.attempts }}</td>
                    <td class="text-caption">{{ formatDuration(item.duration) }}</td>
                    <td class="text-caption">{{ formatTimestamp(item.completedAt) }}</td>
                    <td>
                      <v-tooltip v-if="item.error" location="top">
                        <template #activator="{ props }">
                          <v-icon v-bind="props" color="error" size="small">
                            mdi-alert-circle
                          </v-icon>
                        </template>
                        {{ item.error }}
                      </v-tooltip>
                      <span v-else>-</span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </div>
      </v-window-item>
    </v-window>

    <!-- Confirm Clear Queue Dialog -->
    <v-dialog v-model="showClearDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="warning">mdi-alert</v-icon>
          Clear Sync Queue?
        </v-card-title>
        <v-card-text>
          Are you sure you want to clear the entire sync queue? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" @click="clearQueue">Clear Queue</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Clear History Dialog -->
    <v-dialog v-model="showClearHistoryDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="warning">mdi-alert</v-icon>
          Clear Sync History?
        </v-card-title>
        <v-card-text>
          Are you sure you want to clear the sync history? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearHistoryDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" @click="clearHistory">Clear History</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showErrorSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncService } from '@/core/sync/SyncService'
import type {
  SyncQueueItem,
  SyncStats,
  SyncServiceStatus,
  QueueFilters,
  SyncEntityType,
  SyncItemStatus,
  SyncPriority,
  SyncOperation,
  SyncHistoryItem,
  HistoryFilters,
  HistoryStats
} from '@/core/sync/types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'SyncMonitorView'

// =============================================
// SETUP
// =============================================

const syncService = useSyncService()

// State
const currentTab = ref<'queue' | 'history'>('queue')
const isRefreshing = ref(false)
const queueItems = ref<SyncQueueItem[]>([])
const historyItems = ref<SyncHistoryItem[]>([])
const stats = ref<SyncStats | null>(null)
const historyStats = ref<HistoryStats | null>(null)
const status = ref<SyncServiceStatus | null>(null)
const showClearDialog = ref(false)
const showClearHistoryDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Auto-refresh interval
let refreshInterval: number | null = null

// Filters
const filters = ref<QueueFilters>({
  entityType: undefined,
  status: undefined,
  priority: undefined
})

const historyFilters = ref<HistoryFilters>({
  entityType: undefined,
  status: undefined,
  priority: undefined
})

// Filter options
const entityTypeOptions = ref<Array<{ title: string; value: SyncEntityType }>>([
  { title: 'Shift', value: 'shift' },
  { title: 'Transaction', value: 'transaction' },
  { title: 'Discount', value: 'discount' },
  { title: 'Customer', value: 'customer' },
  { title: 'Product', value: 'product' },
  { title: 'Order', value: 'order' }
])

const statusOptions = ref<Array<{ title: string; value: SyncItemStatus }>>([
  { title: 'Pending', value: 'pending' },
  { title: 'Processing', value: 'processing' },
  { title: 'Success', value: 'success' },
  { title: 'Failed', value: 'failed' },
  { title: 'Cancelled', value: 'cancelled' }
])

const historyStatusOptions = ref<Array<{ title: string; value: 'success' | 'failed' }>>([
  { title: 'Success', value: 'success' },
  { title: 'Failed', value: 'failed' }
])

const priorityOptions = ref<Array<{ title: string; value: SyncPriority }>>([
  { title: 'Critical', value: 'critical' },
  { title: 'High', value: 'high' },
  { title: 'Normal', value: 'normal' },
  { title: 'Low', value: 'low' }
])

// =============================================
// COMPUTED
// =============================================

const filteredItems = computed(() => {
  return queueItems.value
})

const filteredHistory = computed(() => {
  return historyItems.value
})

// =============================================
// METHODS
// =============================================

async function loadQueueData() {
  try {
    queueItems.value = await syncService.getQueue(filters.value)
    stats.value = await syncService.getStats()
    status.value = syncService.getStatus()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load queue data', { error })
  }
}

async function loadHistoryData() {
  try {
    historyItems.value = await syncService.getHistory(historyFilters.value)
    historyStats.value = await syncService.getHistoryStats()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load history data', { error })
  }
}

async function loadData() {
  if (currentTab.value === 'queue') {
    await loadQueueData()
  } else {
    await loadHistoryData()
  }
}

async function refreshData() {
  isRefreshing.value = true
  try {
    await loadData()
  } finally {
    isRefreshing.value = false
  }
}

async function applyFilters() {
  await loadQueueData()
}

async function applyHistoryFilters() {
  await loadHistoryData()
}

function clearHistoryFilters() {
  historyFilters.value = {
    entityType: undefined,
    status: undefined,
    priority: undefined
  }
  applyHistoryFilters()
}

async function retryItem(itemId: string) {
  try {
    const result = await syncService.processItem(itemId)
    if (result.success) {
      successMessage.value = 'Item synced successfully'
      showSuccessSnackbar.value = true
    } else {
      errorMessage.value = result.error || 'Sync failed'
      showErrorSnackbar.value = true
    }
    await loadQueueData()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to retry item', { error })
    errorMessage.value = 'Failed to retry sync'
    showErrorSnackbar.value = true
  }
}

async function removeItem(itemId: string) {
  try {
    syncService.removeFromQueue(itemId)
    successMessage.value = 'Item removed from queue'
    showSuccessSnackbar.value = true
    await loadQueueData()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to remove item', { error })
    errorMessage.value = 'Failed to remove item'
    showErrorSnackbar.value = true
  }
}

async function retryAllFailed() {
  try {
    const report = await syncService.retryFailed()
    successMessage.value = `Processed ${report.processed} items: ${report.succeeded} succeeded, ${report.failed} failed`
    showSuccessSnackbar.value = true
    await loadQueueData()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to retry failed items', { error })
    errorMessage.value = 'Failed to retry failed items'
    showErrorSnackbar.value = true
  }
}

function confirmClearQueue() {
  showClearDialog.value = true
}

function confirmClearHistory() {
  showClearHistoryDialog.value = true
}

async function clearQueue() {
  try {
    await syncService.clearQueue()
    showClearDialog.value = false
    successMessage.value = 'Queue cleared successfully'
    showSuccessSnackbar.value = true
    await loadQueueData()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to clear queue', { error })
    errorMessage.value = 'Failed to clear queue'
    showErrorSnackbar.value = true
  }
}

async function clearHistory() {
  try {
    await syncService.clearHistory()
    showClearHistoryDialog.value = false
    successMessage.value = 'History cleared successfully'
    showSuccessSnackbar.value = true
    await loadHistoryData()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to clear history', { error })
    errorMessage.value = 'Failed to clear history'
    showErrorSnackbar.value = true
  }
}

// =============================================
// FORMATTERS & HELPERS
// =============================================

function formatTimestamp(timestamp: string): string {
  return TimeUtils.formatDateTimeForDisplay(new Date(timestamp))
}

function formatEntityId(id: string): string {
  return id.length > 12 ? `${id.substring(0, 12)}...` : id
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function getStatusColor(): string {
  if (!stats.value) return 'grey'
  if (stats.value.failedItems > 0) return 'error'
  if (stats.value.processingItems > 0) return 'info'
  if (stats.value.pendingItems > 0) return 'warning'
  return 'success'
}

function getOperationColor(operation: SyncOperation): string {
  switch (operation) {
    case 'create':
      return 'success'
    case 'update':
      return 'info'
    case 'delete':
      return 'error'
    default:
      return 'default'
  }
}

function getPriorityColor(priority: SyncPriority): string {
  switch (priority) {
    case 'critical':
      return 'error'
    case 'high':
      return 'warning'
    case 'normal':
      return 'info'
    case 'low':
      return 'default'
    default:
      return 'default'
  }
}

function getItemStatusColor(status: SyncItemStatus): string {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'processing':
      return 'info'
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    case 'cancelled':
      return 'default'
    default:
      return 'default'
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.info(MODULE_NAME, 'Initializing Sync Monitor')
  await loadData()

  // Auto-refresh every 5 seconds
  refreshInterval = window.setInterval(() => {
    loadData()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style lang="scss" scoped>
.sync-monitor-view {
  height: 100vh;
  background: rgb(var(--v-theme-background));
  display: flex;
  flex-direction: column;
}

.sync-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sync-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sync-content-window {
  flex: 1;
  overflow-y: auto;
}

.sync-content {
  height: 100%;
}

.v-table {
  th {
    white-space: nowrap;
    font-weight: 600;
  }

  td {
    white-space: nowrap;
  }
}
</style>
