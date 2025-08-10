<!-- src/views/supplier_2/components/receipts/ReceiptTable.vue -->
<template>
  <div class="receipt-table">
    <!-- Filters Bar -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              clearable
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="discrepancyFilter"
              :items="discrepancyOptions"
              label="Discrepancies"
              variant="outlined"
              density="compact"
              clearable
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="searchQuery"
              label="Search receipts..."
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="refreshData"
            >
              Refresh
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredReceipts"
      :loading="loading"
      class="elevation-1"
      :items-per-page="25"
      :sort-by="[{ key: 'deliveryDate', order: 'desc' }]"
    >
      <!-- Receipt Number -->
      <template #[`item.receiptNumber`]="{ item }">
        <div class="d-flex align-center">
          <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal" class="mr-2">
            {{ item.receiptNumber }}
          </v-chip>

          <v-icon v-if="item.hasDiscrepancies" icon="mdi-alert-triangle" color="warning" size="16">
            <v-tooltip activator="parent" location="top">Has discrepancies</v-tooltip>
          </v-icon>
        </div>
      </template>

      <!-- Purchase Order -->
      <template #[`item.purchaseOrder`]="{ item }">
        <div class="text-subtitle-2 font-weight-medium">
          {{ getPurchaseOrderNumber(item.purchaseOrderId) }}
        </div>
      </template>

      <!-- Status -->
      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="getStatusColor(item.status)" variant="flat">
          <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
          {{ getStatusText(item.status) }}
        </v-chip>
      </template>

      <!-- Discrepancies -->
      <template #[`item.hasDiscrepancies`]="{ item }">
        <div class="text-center">
          <v-chip
            size="small"
            :color="item.hasDiscrepancies ? 'warning' : 'success'"
            variant="flat"
          >
            <v-icon
              :icon="item.hasDiscrepancies ? 'mdi-alert-triangle' : 'mdi-check-circle'"
              size="14"
              class="mr-1"
            />
            {{ item.hasDiscrepancies ? 'Yes' : 'No' }}
          </v-chip>
        </div>
      </template>

      <!-- Items Count -->
      <template #[`item.itemsCount`]="{ item }">
        <div class="text-center">
          <v-chip size="small" variant="outlined">{{ item.items.length }} items</v-chip>
        </div>
      </template>

      <!-- Financial Impact -->
      <template #[`item.financialImpact`]="{ item }">
        <div class="text-right">
          <div class="font-weight-bold" :class="getFinancialImpactClass(item)">
            {{ formatFinancialImpact(item) }}
          </div>
          <div class="text-caption text-medium-emphasis">vs ordered</div>
        </div>
      </template>

      <!-- Delivery Date -->
      <template #[`item.deliveryDate`]="{ item }">
        <div class="text-body-2">
          {{ formatDate(item.deliveryDate) }}
        </div>
        <div class="text-caption text-medium-emphasis">by {{ item.receivedBy }}</div>
      </template>

      <!-- Storage Status -->
      <template #[`item.storageStatus`]="{ item }">
        <div class="text-center">
          <v-chip v-if="item.storageOperationId" size="small" color="success" variant="tonal">
            <v-icon icon="mdi-check-circle" size="14" class="mr-1" />
            Stored
          </v-chip>
          <v-chip v-else size="small" color="grey" variant="outlined">
            <v-icon icon="mdi-clock" size="14" class="mr-1" />
            Pending
          </v-chip>
        </div>
      </template>

      <!-- Actions -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <!-- View Details -->
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            color="info"
            @click="$emit('view-details', item)"
          >
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>

          <!-- Edit -->
          <v-btn
            v-if="item.status === 'draft'"
            icon="mdi-pencil"
            variant="text"
            size="small"
            color="primary"
            @click="$emit('edit-receipt', item)"
          >
            <v-tooltip activator="parent" location="top">Edit Receipt</v-tooltip>
          </v-btn>

          <!-- Complete -->
          <v-btn
            v-if="item.status === 'draft'"
            icon="mdi-check-circle"
            variant="text"
            size="small"
            color="success"
            @click="$emit('complete-receipt', item)"
          >
            <v-tooltip activator="parent" location="top">Complete Receipt</v-tooltip>
          </v-btn>

          <!-- View Storage -->
          <v-btn
            v-if="item.storageOperationId"
            icon="mdi-package-variant"
            variant="text"
            size="small"
            color="purple"
            @click="$emit('view-storage', item.storageOperationId)"
          >
            <v-tooltip activator="parent" location="top">View Storage Operation</v-tooltip>
          </v-btn>
        </div>
      </template>

      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row@10" />
      </template>

      <!-- No data state -->
      <template #no-data>
        <div class="text-center pa-4">
          <v-icon icon="mdi-truck-check-outline" size="48" color="grey" class="mb-2" />
          <div class="text-body-1 text-medium-emphasis">No receipts found</div>
          <div class="text-body-2 text-medium-emphasis">
            Try adjusting your filters or start receiving orders
          </div>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Receipt } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  receipts: Receipt[]
  loading: boolean
}

interface Emits {
  (e: 'view-details', receipt: Receipt): void
  (e: 'edit-receipt', receipt: Receipt): void
  (e: 'complete-receipt', receipt: Receipt): void
  (e: 'view-storage', operationId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const statusFilter = ref<string>()
const discrepancyFilter = ref<boolean | string>()
const searchQuery = ref('')

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  { title: 'Receipt #', key: 'receiptNumber', sortable: true, width: '140px' },
  { title: 'Purchase Order', key: 'purchaseOrder', sortable: false, width: '150px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Discrepancies', key: 'hasDiscrepancies', sortable: true, width: '120px' },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' },
  {
    title: 'Financial Impact',
    key: 'financialImpact',
    sortable: false,
    width: '140px',
    align: 'end'
  },
  { title: 'Delivery Date', key: 'deliveryDate', sortable: true, width: '140px' },
  { title: 'Storage', key: 'storageStatus', sortable: false, width: '100px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '180px', align: 'center' }
]

// =============================================
// FILTER OPTIONS
// =============================================

const statusOptions = [
  { title: 'All Statuses', value: undefined },
  { title: 'Draft', value: 'draft' },
  { title: 'Completed', value: 'completed' }
]

const discrepancyOptions = [
  { title: 'All Receipts', value: undefined },
  { title: 'With Discrepancies', value: true },
  { title: 'No Discrepancies', value: false }
]

// =============================================
// COMPUTED
// =============================================

const filteredReceipts = computed(() => {
  let filtered = props.receipts || []

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(receipt => receipt.status === statusFilter.value)
  }

  // Discrepancy filter
  if (discrepancyFilter.value !== undefined) {
    filtered = filtered.filter(receipt => receipt.hasDiscrepancies === discrepancyFilter.value)
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      receipt =>
        receipt.receiptNumber.toLowerCase().includes(query) ||
        receipt.receivedBy.toLowerCase().includes(query) ||
        receipt.notes?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// =============================================
// METHODS
// =============================================

function refreshData() {
  console.log('Refreshing receipts data')
  // Emit refresh event or call store method
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'orange',
    completed: 'green'
  }
  return colorMap[status] || 'grey'
}

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    draft: 'Draft',
    completed: 'Completed'
  }
  return textMap[status] || status
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'mdi-file-edit',
    completed: 'mdi-check-circle'
  }
  return iconMap[status] || 'mdi-help-circle'
}

function getPurchaseOrderNumber(orderId: string): string {
  return `PO-${orderId.slice(-3)}`
}

function formatFinancialImpact(receipt: Receipt): string {
  // Защита от ошибок
  if (!receipt.items || !Array.isArray(receipt.items)) {
    return '±0'
  }

  // Simple calculation - in real app would use more complex logic
  const originalTotal = receipt.items.reduce(
    (sum, item) => sum + (item.orderedQuantity || 0) * (item.orderedPrice || 0),
    0
  )

  const actualTotal = receipt.items.reduce(
    (sum, item) =>
      sum + (item.receivedQuantity || 0) * (item.actualPrice || item.orderedPrice || 0),
    0
  )

  const difference = actualTotal - originalTotal

  if (Math.abs(difference) < 1000) return '±0'
  return difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)
}

function getFinancialImpactClass(receipt: Receipt): string {
  // Защита от ошибок
  if (!receipt.items || !Array.isArray(receipt.items)) {
    return 'text-success'
  }

  const originalTotal = receipt.items.reduce(
    (sum, item) => sum + (item.orderedQuantity || 0) * (item.orderedPrice || 0),
    0
  )

  const actualTotal = receipt.items.reduce(
    (sum, item) =>
      sum + (item.receivedQuantity || 0) * (item.actualPrice || item.orderedPrice || 0),
    0
  )

  const difference = actualTotal - originalTotal

  if (Math.abs(difference) < 1000) return 'text-success'
  return difference > 0 ? 'text-error' : 'text-success'
}

function formatCurrency(amount: number): string {
  // Защита от NaN
  if (isNaN(amount) || !isFinite(amount)) {
    return 'Rp 0'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  // Защита от невалидных дат
  if (!dateString) {
    return 'Invalid date'
  }

  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}
</script>

<style lang="scss" scoped>
.receipt-table {
  .v-data-table {
    border-radius: 8px;
  }
}

.gap-1 {
  gap: 4px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgb(var(--v-theme-surface-variant), 0.1);
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

@media (max-width: 768px) {
  .v-data-table {
    :deep(.v-data-table__th),
    :deep(.v-data-table__td) {
      padding: 8px 4px;
      font-size: 0.8rem;
    }
  }
}
</style>
