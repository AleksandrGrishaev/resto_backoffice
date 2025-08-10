<!-- src/views/supplier_2/components/receipts/ReceiptDetailsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1000px">
    <v-card v-if="receipt">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div>
          <div class="text-h6">{{ receipt.receiptNumber }}</div>
          <div class="text-caption opacity-90">Receipt Details & Analysis</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Receipt Summary -->
        <div class="pa-4 border-b">
          <v-row>
            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Purchase Order</div>
              <v-chip variant="outlined" size="small">
                {{ getPurchaseOrderNumber(receipt.purchaseOrderId) }}
              </v-chip>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Status</div>
              <v-chip size="small" :color="getStatusColor(receipt.status)" variant="flat">
                {{ getStatusText(receipt.status) }}
              </v-chip>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Discrepancies</div>
              <v-chip
                size="small"
                :color="receipt.hasDiscrepancies ? 'warning' : 'success'"
                variant="flat"
              >
                {{ receipt.hasDiscrepancies ? 'Yes' : 'No' }}
              </v-chip>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Financial Impact</div>
              <div class="text-h6 font-weight-bold" :class="getFinancialImpactClass()">
                {{ formatFinancialImpact() }}
              </div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Delivery Date</div>
              <div class="text-body-2">{{ formatDate(receipt.deliveryDate) }}</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Received By</div>
              <div class="text-body-2">{{ receipt.receivedBy }}</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Storage Operation</div>
              <v-chip
                v-if="receipt.storageOperationId"
                size="small"
                color="success"
                variant="tonal"
                @click="$emit('view-storage', receipt.storageOperationId)"
              >
                <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
                View Operation
              </v-chip>
              <div v-else class="text-body-2 text-medium-emphasis">Not created yet</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Summary</div>
              <div class="text-body-2">{{ receipt.items.length }} items received</div>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Notes</div>
              <div class="text-body-2">{{ receipt.notes || 'No notes' }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- Discrepancy Alert -->
        <div v-if="receipt.hasDiscrepancies" class="pa-4 bg-warning-lighten-5 border-b">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2" />
              <div class="text-subtitle-2 font-weight-bold">Discrepancies Detected</div>
            </div>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-alert-circle"
              @click="showDiscrepanciesDialog = true"
            >
              View Details
            </v-btn>
          </div>

          <div class="mt-2">
            <div class="text-body-2">
              {{ discrepantItemsCount }} items have quantity or price discrepancies
            </div>
          </div>
        </div>

        <!-- Items Comparison -->
        <div class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Items Comparison ({{ receipt.items.length }})
          </div>

          <v-data-table
            :headers="itemHeaders"
            :items="receipt.items"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
          >
            <!-- Item Name -->
            <template #[`item.itemName`]="{ item }">
              <div>
                <div class="text-subtitle-2 font-weight-bold">{{ item.itemName }}</div>
                <div class="text-caption text-medium-emphasis">
                  Order: {{ item.orderedQuantity }} {{ getItemUnit(item) }}
                </div>
              </div>
            </template>

            <!-- Quantity Comparison -->
            <template #[`item.quantityComparison`]="{ item }">
              <div class="text-center">
                <div class="text-body-2">
                  <span class="font-weight-bold">{{ item.receivedQuantity }}</span>
                  <span class="text-medium-emphasis">/ {{ item.orderedQuantity }}</span>
                </div>
                <div class="text-caption" :class="getQuantityDiscrepancyClass(item)">
                  {{ getQuantityDiscrepancyText(item) }}
                </div>
              </div>
            </template>

            <!-- Price Comparison -->
            <template #[`item.priceComparison`]="{ item }">
              <div class="text-right">
                <div class="text-body-2">
                  <span class="font-weight-bold">
                    {{ formatCurrency(item.actualPrice || item.orderedPrice) }}
                  </span>
                </div>
                <div
                  v-if="hasPriceDiscrepancy(item)"
                  class="text-caption"
                  :class="getPriceDiscrepancyClass(item)"
                >
                  was {{ formatCurrency(item.orderedPrice) }}
                </div>
                <div v-else class="text-caption text-success">same price</div>
              </div>
            </template>

            <!-- Line Total -->
            <template #[`item.lineTotal`]="{ item }">
              <div class="text-right">
                <div class="font-weight-bold">
                  {{ formatCurrency(calculateLineTotal(item)) }}
                </div>
                <div
                  v-if="hasItemDiscrepancy(item)"
                  class="text-caption"
                  :class="getLineTotalImpactClass(item)"
                >
                  {{ formatLineTotalImpact(item) }}
                </div>
              </div>
            </template>

            <!-- Item Status -->
            <template #[`item.itemStatus`]="{ item }">
              <v-chip size="x-small" :color="getItemStatusColor(item)" variant="tonal">
                {{ getItemStatusText(item) }}
              </v-chip>
            </template>

            <!-- Notes -->
            <template #[`item.notes`]="{ item }">
              <div class="text-body-2">{{ item.notes || '-' }}</div>
            </template>
          </v-data-table>

          <!-- Receipt Totals -->
          <div class="d-flex justify-end mt-4 pa-3 bg-surface rounded">
            <div class="text-right">
              <div class="text-body-2 text-medium-emphasis mb-1">Financial Impact:</div>
              <div class="text-h6 font-weight-bold" :class="getFinancialImpactClass()">
                {{ formatFinancialImpact() }}
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-spacer />

        <v-btn
          v-if="receipt.status === 'draft'"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-pencil"
          @click="$emit('edit-receipt', receipt)"
        >
          Edit Receipt
        </v-btn>

        <v-btn
          v-if="receipt.status === 'draft'"
          color="success"
          variant="flat"
          prepend-icon="mdi-check-circle"
          @click="$emit('complete-receipt', receipt)"
        >
          Complete Receipt
        </v-btn>

        <v-btn color="grey" variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Discrepancies Dialog -->
    <receipt-discrepancies-dialog v-model="showDiscrepanciesDialog" :receipt="receipt" />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Receipt, ReceiptItem } from '@/stores/supplier_2/types'
import ReceiptDiscrepanciesDialog from './ReceiptDiscrepanciesDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  receipt: Receipt | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit-receipt', receipt: Receipt): void
  (e: 'complete-receipt', receipt: Receipt): void
  (e: 'view-storage', operationId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const showDiscrepanciesDialog = ref(false)

// =============================================
// TABLE CONFIGURATION
// =============================================

const itemHeaders = [
  { title: 'Item', key: 'itemName', sortable: false, width: '200px' },
  {
    title: 'Qty (Received/Ordered)',
    key: 'quantityComparison',
    sortable: false,
    width: '160px',
    align: 'center'
  },
  { title: 'Price', key: 'priceComparison', sortable: false, width: '120px', align: 'end' },
  { title: 'Line Total', key: 'lineTotal', sortable: false, width: '120px', align: 'end' },
  { title: 'Status', key: 'itemStatus', sortable: false, width: '100px' },
  { title: 'Notes', key: 'notes', sortable: false }
]

// =============================================
// COMPUTED
// =============================================

const discrepantItemsCount = computed(() => {
  if (!props.receipt) return 0
  return props.receipt.items.filter(item => hasItemDiscrepancy(item)).length
})

const totalFinancialImpact = computed(() => {
  if (!props.receipt) return 0

  const originalTotal = props.receipt.items.reduce(
    (sum, item) => sum + item.orderedQuantity * item.orderedPrice,
    0
  )

  const actualTotal = props.receipt.items.reduce(
    (sum, item) => sum + item.receivedQuantity * (item.actualPrice || item.orderedPrice),
    0
  )

  return actualTotal - originalTotal
})

// =============================================
// METHODS
// =============================================

function closeDialog() {
  isOpen.value = false
  showDiscrepanciesDialog.value = false
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

function getPurchaseOrderNumber(orderId: string): string {
  return `PO-${orderId.slice(-3)}`
}

function getItemUnit(item: ReceiptItem): string {
  // In real app, would get from ProductsStore
  if (
    item.itemName.toLowerCase().includes('beer') ||
    item.itemName.toLowerCase().includes('cola')
  ) {
    return 'piece'
  }
  return 'kg'
}

function hasItemDiscrepancy(item: ReceiptItem): boolean {
  return hasQuantityDiscrepancy(item) || hasPriceDiscrepancy(item)
}

function hasQuantityDiscrepancy(item: ReceiptItem): boolean {
  return Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.01
}

function hasPriceDiscrepancy(item: ReceiptItem): boolean {
  return item.actualPrice !== undefined && Math.abs(item.actualPrice - item.orderedPrice) > 0.01
}

function getQuantityDiscrepancyText(item: ReceiptItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'exact'
  return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`
}

function getQuantityDiscrepancyClass(item: ReceiptItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'text-success'
  return diff > 0 ? 'text-info' : 'text-warning'
}

function getPriceDiscrepancyClass(item: ReceiptItem): string {
  if (!item.actualPrice) return 'text-success'
  const diff = item.actualPrice - item.orderedPrice
  return diff > 0 ? 'text-error' : 'text-success'
}

function calculateLineTotal(item: ReceiptItem): number {
  const price = item.actualPrice || item.orderedPrice
  return item.receivedQuantity * price
}

function formatLineTotalImpact(item: ReceiptItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return '±0'
  return diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
}

function getLineTotalImpactClass(item: ReceiptItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return 'text-success'
  return diff > 0 ? 'text-error' : 'text-success'
}

function getItemStatusText(item: ReceiptItem): string {
  if (!hasItemDiscrepancy(item)) return 'OK'

  const hasQty = hasQuantityDiscrepancy(item)
  const hasPrice = hasPriceDiscrepancy(item)

  if (hasQty && hasPrice) return 'Both Issues'
  if (hasQty) return 'Qty Issue'
  if (hasPrice) return 'Price Issue'
  return 'OK'
}

function getItemStatusColor(item: ReceiptItem): string {
  const status = getItemStatusText(item)
  if (status === 'OK') return 'success'
  if (status === 'Both Issues') return 'error'
  return 'warning'
}

function formatFinancialImpact(): string {
  const impact = totalFinancialImpact.value
  if (Math.abs(impact) < 1000) return '±0'
  return impact > 0 ? `+${formatCurrency(impact)}` : formatCurrency(impact)
}

function getFinancialImpactClass(): string {
  const impact = totalFinancialImpact.value
  if (Math.abs(impact) < 1000) return 'text-success'
  return impact > 0 ? 'text-error' : 'text-success'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style lang="scss" scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.bg-warning-lighten-5 {
  background-color: rgb(var(--v-theme-warning), 0.1) !important;
}

.text-medium-emphasis {
  opacity: 0.7;
}

.v-chip {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-info {
  color: rgb(var(--v-theme-info)) !important;
}

@media (max-width: 768px) {
  .v-data-table {
    :deep(.v-data-table__th),
    :deep(.v-data-table__td) {
      padding: 6px 8px;
      font-size: 0.875rem;
    }
  }
}
</style>
