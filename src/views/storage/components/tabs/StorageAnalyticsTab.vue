// src/views/storage/components/tabs/StorageAnalyticsTab.vue //
src/views/storage/components/tabs/StorageAnalyticsTab.vue
<!-- src/components/storage/tabs/StorageAnalyticsTab.vue -->
<template>
  <div class="storage-analytics">
    <!-- Header with Controls -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h2 class="text-h4 font-weight-bold">Storage Analytics</h2>
        <p class="text-body-1 text-medium-emphasis mt-1">
          Comprehensive analysis of storage operations and write-offs
        </p>
      </div>

      <!-- Global Filters -->
      <div class="d-flex align-center gap-3">
        <v-select
          v-model="filters.department"
          :items="departmentOptions"
          label="Department"
          variant="outlined"
          density="compact"
          style="width: 150px"
          hide-details
        />
        <v-select
          v-model="filters.period"
          :items="periodOptions"
          label="Period"
          variant="outlined"
          density="compact"
          style="width: 120px"
          hide-details
        />
        <v-btn icon="mdi-refresh" variant="outlined" @click="refreshAllData" />
      </div>
    </div>

    <!-- Main Statistics Widget -->
    <div class="mb-6">
      <WriteOffStatsWidget
        :department="filters.department"
        :period="filters.period"
        :auto-refresh="false"
      />
    </div>

    <!-- Secondary Analytics -->
    <v-row class="mb-6">
      <!-- Recent Write-offs -->
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-history" color="primary" />
              Recent Write-offs
            </div>
            <v-btn
              variant="text"
              size="small"
              append-icon="mdi-open-in-new"
              @click="showAllOperations = true"
            >
              View All
            </v-btn>
          </v-card-title>
          <v-divider />

          <div v-if="recentWriteOffs.length === 0" class="pa-8 text-center">
            <v-icon icon="mdi-clipboard-check" size="64" class="mb-4 text-medium-emphasis" />
            <h3 class="text-medium-emphasis mb-2">No Recent Write-offs</h3>
            <p class="text-body-2 text-medium-emphasis">
              No write-off operations found for the selected period.
            </p>
          </div>

          <div v-else class="pa-0">
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="operation in recentWriteOffs.slice(0, 10)"
                :key="operation.id"
                class="px-4 py-3"
              >
                <template #prepend>
                  <v-avatar :color="getReasonColor(operation.writeOffDetails?.reason)" size="32">
                    <v-icon
                      :icon="getReasonIcon(operation.writeOffDetails?.reason)"
                      color="white"
                      size="16"
                    />
                  </v-avatar>
                </template>

                <v-list-item-title class="d-flex align-center justify-space-between">
                  <span>{{ operation.documentNumber }}</span>
                  <v-chip
                    :color="operation.writeOffDetails?.affectsKPI ? 'error' : 'success'"
                    size="x-small"
                    variant="flat"
                  >
                    {{ operation.writeOffDetails?.affectsKPI ? 'KPI' : 'OK' }}
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      {{ getReasonText(operation.writeOffDetails?.reason) }} •
                      {{ operation.department }} • {{ operation.items.length }} item{{
                        operation.items.length !== 1 ? 's' : ''
                      }}
                    </div>
                    <strong>{{ formatIDR(operation.totalValue || 0) }}</strong>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ formatOperationDate(operation.operationDate) }} by
                    {{ operation.responsiblePerson }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-col>

      <!-- Quick Actions -->
      <v-col cols="12" lg="4">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="mdi-flash" color="primary" />
            Quick Actions
          </v-card-title>
          <v-card-text class="pa-4">
            <div class="d-flex flex-column gap-3">
              <!-- Quick Write-off -->
              <QuickWriteOffButton
                :department="filters.department === 'all' ? 'kitchen' : filters.department"
              />

              <!-- Start Inventory -->
              <v-btn
                variant="outlined"
                prepend-icon="mdi-clipboard-list"
                block
                @click="startInventory"
              >
                Start Inventory
              </v-btn>

              <!-- Export Report -->
              <v-btn variant="outlined" prepend-icon="mdi-download" block @click="exportReport">
                Export Report
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Alerts Card -->
        <v-card>
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="mdi-alert" color="warning" />
            Alerts & Warnings
          </v-card-title>
          <v-card-text class="pa-4">
            <div v-if="totalAlertsCount === 0" class="text-center py-4">
              <v-icon icon="mdi-shield-check" size="48" color="success" class="mb-2" />
              <div class="text-success font-weight-medium">All Clear!</div>
              <div class="text-caption text-medium-emphasis">No issues detected</div>
            </div>
            <div v-else class="space-y-3">
              <!-- Expired Products -->
              <div
                v-if="alertCounts.expired > 0"
                class="d-flex align-center justify-space-between pa-3 rounded"
                style="background-color: rgba(244, 67, 54, 0.1)"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon icon="mdi-clock-alert" color="error" />
                  <span class="font-weight-medium">Expired Products</span>
                </div>
                <v-chip color="error" size="small">{{ alertCounts.expired }}</v-chip>
              </div>

              <!-- Near Expiry -->
              <div
                v-if="alertCounts.expiring > 0"
                class="d-flex align-center justify-space-between pa-3 rounded"
                style="background-color: rgba(255, 152, 0, 0.1)"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon icon="mdi-clock-outline" color="warning" />
                  <span class="font-weight-medium">Expiring Soon</span>
                </div>
                <v-chip color="warning" size="small">{{ alertCounts.expiring }}</v-chip>
              </div>

              <!-- Low Stock -->
              <div
                v-if="alertCounts.lowStock > 0"
                class="d-flex align-center justify-space-between pa-3 rounded"
                style="background-color: rgba(33, 150, 243, 0.1)"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon icon="mdi-package-down" color="info" />
                  <span class="font-weight-medium">Low Stock</span>
                </div>
                <v-chip color="info" size="small">{{ alertCounts.lowStock }}</v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detailed Analysis Section -->
    <v-row>
      <!-- Trends Chart (Placeholder) -->
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="mdi-chart-line" color="primary" />
            Write-off Trends
          </v-card-title>
          <v-card-text class="pa-6">
            <div class="text-center py-8">
              <v-icon
                icon="mdi-chart-timeline-variant"
                size="64"
                class="mb-4 text-medium-emphasis"
              />
              <h3 class="text-medium-emphasis mb-2">Trends Chart</h3>
              <p class="text-body-2 text-medium-emphasis">
                Chart visualization will be implemented here.
                <br />
                Show daily/weekly write-off amounts and trends.
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Products by Write-offs -->
      <v-col cols="12" lg="4">
        <v-card>
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="mdi-trophy" color="primary" />
            Top Products by Write-offs
          </v-card-title>
          <v-card-text class="pa-4">
            <div class="text-center py-8">
              <v-icon icon="mdi-podium" size="48" class="mb-4 text-medium-emphasis" />
              <div class="text-medium-emphasis">Coming Soon</div>
              <div class="text-caption text-medium-emphasis">
                Analysis of most written-off products
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- All Operations Dialog -->
    <v-dialog v-model="showAllOperations" max-width="1200" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div>All Storage Operations</div>
          <v-btn icon="mdi-close" variant="text" @click="showAllOperations = false" />
        </v-card-title>
        <v-divider />
        <v-card-text style="height: 600px" class="pa-0">
          <v-data-table
            :headers="operationHeaders"
            :items="filteredOperations"
            :items-per-page="25"
            density="compact"
            class="text-caption"
          >
            <template #[`item.operationType`]="{ item }">
              <v-chip
                :color="getOperationTypeColor(item.operationType)"
                size="x-small"
                variant="flat"
              >
                {{ item.operationType.replace('_', ' ').toUpperCase() }}
              </v-chip>
            </template>

            <template #[`item.totalValue`]="{ item }">
              <strong>{{ formatIDR(item.totalValue || 0) }}</strong>
            </template>

            <template #[`item.operationDate`]="{ item }">
              {{ formatOperationDate(item.operationDate) }}
            </template>

            <template #[`item.writeOffDetails`]="{ item }">
              <div v-if="item.writeOffDetails">
                <v-chip
                  :color="item.writeOffDetails.affectsKPI ? 'error' : 'success'"
                  size="x-small"
                  variant="flat"
                >
                  {{ getReasonText(item.writeOffDetails.reason) }}
                </v-chip>
              </div>
              <span v-else>-</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWriteOff } from '@/stores/storage'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils'
import WriteOffStatsWidget from '../widgets/WriteOffStatsWidget.vue'
import QuickWriteOffButton from '../widgets/QuickWriteOffButton.vue'
import type { StorageDepartment, WriteOffReason } from '@/stores/storage/types'

// Composables
const writeOff = useWriteOff()
const storageStore = useStorageStore()

// State
const showAllOperations = ref(false)

// Filters
const filters = ref({
  department: 'all' as StorageDepartment | 'all',
  period: 'month' as 'week' | 'month' | 'quarter' | 'year'
})

// Options
const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const periodOptions = [
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' },
  { title: 'Quarter', value: 'quarter' },
  { title: 'Year', value: 'year' }
]

// Computed
const recentWriteOffs = computed(() => writeOff.recentWriteOffs.value)

const filteredOperations = computed(() => {
  let operations = storageStore.filteredOperations

  if (filters.value.department !== 'all') {
    operations = operations.filter(op => op.department === filters.value.department)
  }

  return operations
})

const alertCounts = computed(() => storageStore.alertCounts)

const totalAlertsCount = computed(
  () => alertCounts.value.expired + alertCounts.value.expiring + alertCounts.value.lowStock
)

// Table headers for operations dialog
const operationHeaders = [
  { title: 'Document #', key: 'documentNumber', width: '120px' },
  { title: 'Type', key: 'operationType', width: '100px' },
  { title: 'Department', key: 'department', width: '100px' },
  { title: 'Date', key: 'operationDate', width: '120px' },
  { title: 'Items', key: 'items.length', width: '80px' },
  { title: 'Value', key: 'totalValue', width: '120px' },
  { title: 'Reason', key: 'writeOffDetails', width: '120px' },
  { title: 'Responsible', key: 'responsiblePerson', width: '150px' }
]

// Methods
function refreshAllData() {
  storageStore.fetchBalances()
  storageStore.fetchOperations()
}

function getReasonColor(reason?: WriteOffReason): string {
  if (!reason) return 'grey'

  const reasonInfo = writeOff.getReasonInfo(reason)
  return reasonInfo.color
}

function getReasonIcon(reason?: WriteOffReason): string {
  if (!reason) return 'mdi-help'

  const icons: Record<WriteOffReason, string> = {
    expired: 'mdi-clock-alert',
    spoiled: 'mdi-delete-variant',
    other: 'mdi-help-circle',
    education: 'mdi-school',
    test: 'mdi-test-tube'
  }

  return icons[reason] || 'mdi-help'
}

function getReasonText(reason?: WriteOffReason): string {
  if (!reason) return 'Unknown'

  const reasonInfo = writeOff.getReasonInfo(reason)
  return reasonInfo.title
}

function getOperationTypeColor(type: string): string {
  const colors: Record<string, string> = {
    receipt: 'success',
    write_off: 'error',
    correction: 'warning',
    inventory: 'info'
  }

  return colors[type] || 'default'
}

function formatOperationDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffHours < 168) {
    // 7 days
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

function startInventory() {
  // TODO: Implement start inventory dialog
  console.log('Start inventory for department:', filters.value.department)
}

function exportReport() {
  // TODO: Implement export functionality
  console.log('Export report for:', filters.value)
}

// Watch filters
watch(
  filters,
  () => {
    refreshAllData()
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  refreshAllData()
})
</script>

<style scoped>
.storage-analytics {
  max-width: 100%;
  padding: 0;
}

.space-y-3 > * + * {
  margin-top: 12px;
}

/* Ensure cards have consistent height in rows */
.v-row .v-col .v-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-row .v-col .v-card .v-card-text {
  flex-grow: 1;
}

/* Custom alert styling */
.rounded {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .storage-analytics .d-flex.justify-space-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .storage-analytics .d-flex.justify-space-between > div:last-child {
    align-self: stretch;
  }
}
</style>
