<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Shift History</h1>
      </v-col>
    </v-row>

    <!-- Shifts Table -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="tableItems"
              :loading="loading"
              :items-per-page="20"
              density="comfortable"
              class="shift-history-table"
              @click:row="handleRowClick"
            >
              <!-- Name Column -->
              <template #[`item.name`]="{ item }">
                <div>
                  <div class="font-weight-bold">{{ item.name }}</div>
                  <div class="text-caption text-grey">{{ item.cashier }}</div>
                </div>
              </template>

              <!-- Start Time Column -->
              <template #[`item.startTime`]="{ item }">
                {{ formatDateTime(item.startTime) }}
              </template>

              <!-- End Time Column -->
              <template #[`item.endTime`]="{ item }">
                {{ item.endTime ? formatDateTime(item.endTime) : '—' }}
              </template>

              <!-- Total Sales Column -->
              <template #[`item.totalSales`]="{ item }">
                <span class="font-weight-bold text-success">
                  {{ formatCurrency(item.totalSales) }}
                </span>
              </template>

              <!-- Total Expected Column -->
              <template #[`item.totalExpected`]="{ item }">
                <span class="font-weight-medium">{{ formatCurrency(item.totalExpected) }}</span>
              </template>

              <!-- Total Actual Column -->
              <template #[`item.totalActual`]="{ item }">
                <span class="font-weight-medium">{{ formatCurrency(item.totalActual) }}</span>
              </template>

              <!-- Discrepancy Column (Shortage/Overage) -->
              <template #[`item.discrepancy`]="{ item }">
                <v-chip
                  v-if="item.discrepancy !== 0"
                  :color="getDiscrepancyColor(item.discrepancyType)"
                  size="small"
                >
                  {{ item.discrepancyType === 'overage' ? '+' : '-'
                  }}{{ formatCurrency(Math.abs(item.discrepancy)) }}
                </v-chip>
                <v-chip v-else color="success" size="small">OK</v-chip>
              </template>

              <!-- Sync Status Column -->
              <template #[`item.syncStatus`]="{ item }">
                <v-tooltip :text="getSyncTooltip(item)" location="top">
                  <template #activator="{ props }">
                    <v-chip
                      v-bind="props"
                      :color="getSyncStatusColor(item.syncStatus)"
                      size="small"
                      :prepend-icon="getSyncStatusIcon(item.syncStatus)"
                    >
                      {{ getSyncStatusLabel(item.syncStatus) }}
                    </v-chip>
                  </template>
                </v-tooltip>
              </template>

              <!-- Actions Column -->
              <template #[`item.actions`]="{ item }">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="text"
                  @click.stop="viewShiftDetails(item.id)"
                />
                <v-btn
                  v-if="item.syncError"
                  icon="mdi-sync"
                  size="small"
                  variant="text"
                  color="warning"
                  :loading="retryingSyncId === item.id"
                  @click.stop="retrySync(item.id)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Shift Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="1200px" scrollable>
      <v-card v-if="selectedShift">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ selectedShift.shiftNumber }}</span>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>
        <v-card-text>
          <!-- Reuse ShiftManagementView component in read-only mode -->
          <shift-management-view
            :shift-id="selectedShift.id"
            :read-only="true"
            @close="showDetailsDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import type { PosShift } from '@/stores/pos/shifts/types'
import ShiftManagementView from '@/views/pos/shifts/ShiftManagementView.vue'
// ✅ Sprint 6: Import SyncService
import { useSyncService } from '@/core/sync/SyncService'

const shiftsStore = useShiftsStore()
const syncService = useSyncService()

// State
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showDetailsDialog = ref(false)
const selectedShift = ref<PosShift | null>(null)
const retryingSyncId = ref<string | null>(null)

// Table headers (simplified as requested)
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Start Time', key: 'startTime', sortable: true },
  { title: 'End Time', key: 'endTime', sortable: true },
  { title: 'Total Sales', key: 'totalSales', align: 'end' as const, sortable: true },
  { title: 'Expected Cash', key: 'totalExpected', align: 'end' as const, sortable: true },
  { title: 'Actual Cash', key: 'totalActual', align: 'end' as const, sortable: true },
  { title: 'Discrepancy', key: 'discrepancy', align: 'end' as const, sortable: true },
  { title: 'Sync', key: 'syncStatus', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '100px' }
]

// Computed: Transform shifts to table items
const tableItems = computed(() => {
  return shiftsStore.shifts
    .filter(shift => shift.status === 'completed') // Only show completed shifts
    .map(shift => {
      // ✅ Fix: Calculate totalSales from paymentMethods (saved in shift record)
      const totalSales =
        shift.paymentMethods?.reduce((sum, pm) => sum + pm.amount, 0) || shift.totalSales || 0

      // ✅ Use saved cash_discrepancy from shift (already calculated during close)
      const discrepancy = shift.cashDiscrepancy || 0
      const discrepancyType = shift.cashDiscrepancyType || 'none'

      return {
        id: shift.id,
        name: shift.shiftNumber,
        cashier: shift.cashierName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        totalSales,
        totalExpected: shift.expectedCash || 0,
        totalActual: shift.endingCash || 0,
        discrepancy,
        discrepancyType,
        syncStatus: getSyncStatus(shift),
        syncError: shift.syncError,
        syncAttempts: shift.syncAttempts || 0
      }
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) // Newest first
})

// Methods
function getSyncStatus(shift: PosShift): 'synced' | 'pending' | 'failed' {
  if (shift.syncedToAccount) return 'synced'
  if (shift.syncError) return 'failed'
  return 'pending'
}

function getSyncStatusLabel(status: 'synced' | 'pending' | 'failed'): string {
  switch (status) {
    case 'synced':
      return 'Synced'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
  }
}

function getSyncStatusColor(status: 'synced' | 'pending' | 'failed'): string {
  switch (status) {
    case 'synced':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
      return 'error'
  }
}

function getSyncStatusIcon(status: 'synced' | 'pending' | 'failed'): string {
  switch (status) {
    case 'synced':
      return 'mdi-check-circle'
    case 'pending':
      return 'mdi-clock-outline'
    case 'failed':
      return 'mdi-alert-circle'
  }
}

function getSyncTooltip(item: {
  syncStatus: string
  syncAttempts?: number
  syncError?: string
}): string {
  if (item.syncStatus === 'synced') {
    return 'Synced to account successfully'
  } else if (item.syncStatus === 'failed') {
    return `Sync failed (${item.syncAttempts || 0} attempts): ${item.syncError || 'Unknown error'}`
  } else {
    return 'Pending synchronization'
  }
}

function getDiscrepancyColor(discrepancyType: string): string {
  if (discrepancyType === 'none') return 'success'
  if (discrepancyType === 'overage') return 'info' // Overage (excess) - blue
  return 'error' // Shortage - red
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function handleRowClick(_event: unknown, row: { item: { id: string } }): void {
  viewShiftDetails(row.item.id)
}

function viewShiftDetails(shiftId: string): void {
  const shift = shiftsStore.shifts.find(s => s.id === shiftId)
  if (shift) {
    selectedShift.value = shift
    showDetailsDialog.value = true
  }
}

async function retrySync(shiftId: string): Promise<void> {
  try {
    retryingSyncId.value = shiftId
    const shift = shiftsStore.shifts.find(s => s.id === shiftId)

    if (!shift) {
      throw new Error('Shift not found')
    }

    // ✅ Sprint 6: Use SyncService instead of shiftsStore.processSyncQueue()
    // Find existing queue item or add new one
    const existingItems = await syncService.getQueue({
      entityType: 'shift',
      entityId: shift.id
    })

    if (existingItems.length > 0) {
      // Retry existing item
      const result = await syncService.processItem(existingItems[0].id)
      if (!result.success) {
        throw new Error(result.error)
      }
    } else {
      // Add to queue and process
      const itemId = syncService.addToQueue({
        entityType: 'shift',
        entityId: shift.id,
        operation: 'update',
        priority: 'critical',
        data: shift,
        maxAttempts: 10
      })

      const result = await syncService.processItem(itemId)
      if (!result.success) {
        throw new Error(result.error)
      }
    }

    // Reload shifts to update UI
    await loadShifts()

    console.log('✅ Shift sync retry succeeded')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to retry sync'
    showError.value = true
  } finally {
    retryingSyncId.value = null
  }
}

async function loadShifts(): Promise<void> {
  try {
    loading.value = true
    showError.value = false

    const result = await shiftsStore.loadShifts()

    if (!result.success) {
      throw new Error(result.error || 'Failed to load shifts')
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load shifts'
    showError.value = true
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadShifts()
})
</script>

<style scoped lang="scss">
.shift-history-table {
  cursor: pointer;

  :deep(tbody tr:hover) {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
