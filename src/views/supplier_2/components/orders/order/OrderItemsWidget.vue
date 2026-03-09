<!-- src/views/supplier_2/components/orders/order/OrderItemsWidget.vue -->
<template>
  <div class="order-items-widget">
    <div class="text-subtitle-1 font-weight-bold mb-3">
      {{ hasReceipt ? 'Items Comparison' : 'Order Items' }} ({{ items.length }})
    </div>

    <!-- ========== COMPARISON MODE (when receipt completed) ========== -->
    <v-data-table
      v-if="hasReceipt"
      :headers="comparisonHeaders"
      :items="comparisonItems"
      density="compact"
      :items-per-page="-1"
      hide-default-footer
    >
      <!-- Item Column -->
      <template #[`item.itemName`]="{ item }">
        <div>
          <div class="text-body-2 font-weight-bold">{{ item.itemName }}</div>
          <div class="text-caption text-medium-emphasis">
            Order: {{ item.orderedQuantity }} {{ item.unit }}
          </div>
        </div>
      </template>

      <!-- Qty (Received/Ordered) -->
      <template #[`item.qty`]="{ item }">
        <div class="text-center">
          <div>
            <span class="text-body-2 font-weight-bold">{{ item.receivedQuantity }}</span>
            <span class="text-medium-emphasis">/ {{ item.orderedQuantity }}</span>
          </div>
          <div
            v-if="item.qtyDiff !== 0"
            class="text-caption"
            :class="item.qtyDiff > 0 ? 'text-info' : 'text-error'"
          >
            {{ item.qtyDiff > 0 ? '+' : '' }}{{ item.qtyDiff }}
          </div>
          <div v-else class="text-caption text-medium-emphasis">exact</div>
        </div>
      </template>

      <!-- Pkg Price -->
      <template #[`item.pkgPrice`]="{ item }">
        <div class="text-right">
          <div class="text-body-2 font-weight-medium">
            {{ formatCurrency(item.actualPkgPrice) }}
          </div>
          <div v-if="item.priceChanged" class="text-caption text-warning">
            was {{ formatCurrency(item.orderedPkgPrice) }}
          </div>
          <div v-else class="text-caption text-medium-emphasis">same price</div>
        </div>
      </template>

      <!-- Line Total -->
      <template #[`item.lineTotal`]="{ item }">
        <div class="text-right">
          <div class="text-body-1 font-weight-bold">
            {{ formatCurrency(item.lineTotal) }}
          </div>
          <div
            v-if="item.totalDiff !== 0"
            class="text-caption"
            :class="item.totalDiff > 0 ? 'text-warning' : 'text-error'"
          >
            {{ item.totalDiff > 0 ? '+' : '' }}{{ formatCurrency(item.totalDiff) }}
          </div>
        </div>
      </template>

      <!-- Status -->
      <template #[`item.status`]="{ item }">
        <v-chip :color="item.statusColor" size="small" variant="flat">
          {{ item.statusLabel }}
        </v-chip>
      </template>
    </v-data-table>

    <!-- ========== NORMAL MODE (no receipt) ========== -->
    <v-data-table
      v-else
      :headers="orderHeaders"
      :items="items"
      density="compact"
      :items-per-page="-1"
      hide-default-footer
    >
      <!-- Item Name Column -->
      <template #[`item.itemName`]="{ item }">
        <div class="d-flex align-center gap-2">
          <v-avatar color="primary" size="32" variant="tonal">
            <v-icon size="18">mdi-package-variant</v-icon>
          </v-avatar>
          <div>
            <div class="text-body-2 font-weight-medium">{{ item.itemName }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ item.orderedQuantity }} {{ item.unit }}
            </div>
          </div>
        </div>
      </template>

      <!-- Package Column -->
      <template #[`item.package`]="{ item }">
        <div>
          <v-chip color="primary" size="small" variant="tonal" class="mb-1">
            {{ item.packageName }}
          </v-chip>
          <div class="text-caption text-medium-emphasis">
            {{ item.packageQuantity }} × {{ item.packageUnit }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getPackageSize(item) }} {{ item.unit }}/pkg
          </div>
        </div>
      </template>

      <!-- Ordered Quantity Column -->
      <template #[`item.orderedQuantity`]="{ item }">
        <div class="text-right">
          <div class="text-body-2 font-weight-medium">{{ item.orderedQuantity }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.unit }}</div>
        </div>
      </template>

      <!-- Received Quantity Column -->
      <template #[`item.receivedQuantity`]="{ item }">
        <div class="text-right">
          <div v-if="item.receivedQuantity" class="text-body-2 font-weight-medium">
            {{ item.receivedQuantity }}
          </div>
          <div v-else class="text-caption text-medium-emphasis">-</div>

          <!-- Discrepancy indicator -->
          <div
            v-if="item.receivedQuantity && item.receivedQuantity !== item.orderedQuantity"
            class="text-caption text-warning"
          >
            <v-icon size="12">mdi-alert</v-icon>
            {{ item.receivedQuantity - item.orderedQuantity }}
          </div>
        </div>
      </template>

      <!-- Price per Package Column -->
      <template #[`item.packagePrice`]="{ item }">
        <div class="text-right">
          <div class="text-body-2 font-weight-medium">
            {{ formatCurrency(item.packagePrice) }}
          </div>
          <div class="text-caption text-medium-emphasis">per package</div>
        </div>
      </template>

      <!-- Price per Base Unit Column -->
      <template #[`item.pricePerUnit`]="{ item }">
        <div class="text-right">
          <div class="text-caption text-medium-emphasis">
            {{ formatCurrency(item.pricePerUnit) }}
          </div>
          <div class="text-caption text-medium-emphasis">per {{ item.unit }}</div>

          <!-- Estimated price indicator -->
          <v-chip
            v-if="item.isEstimatedPrice"
            size="x-small"
            color="warning"
            variant="tonal"
            class="mt-1"
          >
            Est.
          </v-chip>
        </div>
      </template>

      <!-- Total Price Column -->
      <template #[`item.totalPrice`]="{ item }">
        <div class="text-right">
          <div class="text-body-1 font-weight-bold text-success">
            {{ formatCurrency(item.totalPrice) }}
          </div>
        </div>
      </template>

      <!-- Status Column -->
      <template #[`item.status`]="{ item }">
        <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
          <v-icon v-if="item.status === 'received'" start size="14">mdi-check</v-icon>
          {{ item.status }}
        </v-chip>
      </template>
    </v-data-table>

    <!-- Totals -->
    <div class="d-flex justify-end mt-4 pa-3 rounded">
      <div class="mr-8">
        <div class="text-caption text-medium-emphasis mb-1">
          {{ hasReceipt ? 'Ordered Packages:' : 'Total Packages:' }}
        </div>
        <div class="text-h6 font-weight-bold">{{ totalPackages }}</div>
      </div>
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Order Total:</div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatCurrency(orderTotal) }}
        </div>
      </div>
    </div>

    <!-- Received Totals (comparison mode) -->
    <div v-if="hasReceipt" class="received-totals d-flex justify-end mt-2 pa-3 rounded">
      <div class="mr-8">
        <div class="text-caption text-medium-emphasis mb-1">Received Packages:</div>
        <div class="text-h6 font-weight-bold">{{ receivedTotalPackages }}</div>
      </div>
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Received Total:</div>
        <div class="text-h6 font-weight-bold text-success">
          {{ formatCurrency(receivedTotal) }}
        </div>
      </div>
      <div v-if="receivedDifference !== 0" class="ml-8">
        <div class="text-caption text-medium-emphasis mb-1">Difference:</div>
        <div
          class="text-h6 font-weight-bold"
          :class="receivedDifference > 0 ? 'text-warning' : 'text-error'"
        >
          {{ receivedDifference > 0 ? '+' : '' }}{{ formatCurrency(receivedDifference) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderItem, Receipt, ReceiptItem } from '@/stores/supplier_2/types'

// =============================================
// PROPS
// =============================================

interface Props {
  items: OrderItem[]
  receipt?: Receipt | null
}

const props = defineProps<Props>()

// =============================================
// COMPUTED
// =============================================

const hasReceipt = computed(() => props.receipt?.status === 'completed')

// Receipt items indexed by orderItemId for quick lookup
const receiptItemMap = computed(() => {
  const map = new Map<string, ReceiptItem>()
  if (!props.receipt) return map
  for (const ri of props.receipt.items) {
    map.set(ri.orderItemId, ri)
  }
  return map
})

// Merged comparison items
const comparisonItems = computed(() => {
  return props.items.map(orderItem => {
    const ri = receiptItemMap.value.get(orderItem.id)

    const receivedQty = ri?.receivedQuantity ?? 0
    const orderedQty = orderItem.orderedQuantity
    const qtyDiff = receivedQty - orderedQty

    const orderedPkgPrice = orderItem.packagePrice
    const actualPkgPrice = ri?.actualPrice ?? ri?.orderedPrice ?? orderedPkgPrice
    const priceChanged = ri ? Math.abs(actualPkgPrice - orderedPkgPrice) > 0.5 : false

    const receivedPkgs = ri?.receivedPackageQuantity ?? 0
    const lineTotal = actualPkgPrice * receivedPkgs
    const orderedTotal = orderItem.totalPrice
    const totalDiff = lineTotal - orderedTotal

    // Determine status
    const hasQtyIssue = qtyDiff !== 0
    const hasPriceIssue = priceChanged
    let statusLabel = 'OK'
    let statusColor = 'success'
    if (hasQtyIssue && hasPriceIssue) {
      statusLabel = 'Both Issues'
      statusColor = 'error'
    } else if (hasQtyIssue) {
      statusLabel = 'Qty Issue'
      statusColor = 'warning'
    } else if (hasPriceIssue) {
      statusLabel = 'Price Issue'
      statusColor = 'warning'
    }

    return {
      id: orderItem.id,
      itemName: orderItem.itemName,
      unit: orderItem.unit,
      orderedQuantity: orderedQty,
      receivedQuantity: receivedQty,
      qtyDiff,
      orderedPkgPrice,
      actualPkgPrice,
      priceChanged,
      lineTotal,
      totalDiff,
      statusLabel,
      statusColor
    }
  })
})

// Totals
const totalPackages = computed(() => {
  return props.items.reduce((sum, item) => sum + (item.packageQuantity || 0), 0)
})

const orderTotal = computed(() => {
  return props.items.reduce((sum, item) => sum + item.totalPrice, 0)
})

const receivedTotalPackages = computed(() => {
  if (!props.receipt) return 0
  return props.receipt.items.reduce((sum, item) => sum + (item.receivedPackageQuantity || 0), 0)
})

const receivedTotal = computed(() => {
  if (!props.receipt) return 0
  return (
    props.receipt.items.reduce((sum, item) => {
      const price = item.actualPrice ?? item.orderedPrice
      return sum + price * (item.receivedPackageQuantity || 0)
    }, 0) + (props.receipt.taxAmount || 0)
  )
})

const receivedDifference = computed(() => {
  return receivedTotal.value - orderTotal.value
})

// =============================================
// TABLE HEADERS
// =============================================

const comparisonHeaders = [
  { title: 'Item', key: 'itemName', sortable: false, width: '200px' },
  {
    title: 'Qty (Received/Ordered)',
    key: 'qty',
    sortable: false,
    width: '180px',
    align: 'center' as const
  },
  { title: 'Pkg Price', key: 'pkgPrice', sortable: false, width: '150px', align: 'end' as const },
  { title: 'Line Total', key: 'lineTotal', sortable: false, width: '150px', align: 'end' as const },
  { title: 'Status', key: 'status', sortable: false, width: '120px', align: 'center' as const }
]

const orderHeaders = [
  { title: 'Item', key: 'itemName', sortable: false, width: '200px' },
  { title: 'Package', key: 'package', sortable: false, width: '150px' },
  {
    title: 'Ordered',
    key: 'orderedQuantity',
    sortable: false,
    width: '100px',
    align: 'end' as const
  },
  {
    title: 'Received',
    key: 'receivedQuantity',
    sortable: false,
    width: '100px',
    align: 'end' as const
  },
  {
    title: 'Price/Package',
    key: 'packagePrice',
    sortable: false,
    width: '130px',
    align: 'end' as const
  },
  {
    title: 'Price/Unit',
    key: 'pricePerUnit',
    sortable: false,
    width: '120px',
    align: 'end' as const
  },
  { title: 'Total', key: 'totalPrice', sortable: false, width: '130px', align: 'end' as const },
  { title: 'Status', key: 'status', sortable: false, width: '100px', align: 'center' as const }
]

// =============================================
// METHODS
// =============================================

function getPackageSize(item: OrderItem): number {
  if (!item.packageQuantity) return 0
  return Math.round((item.orderedQuantity / item.packageQuantity) * 100) / 100
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ordered: 'grey',
    received: 'success',
    cancelled: 'error'
  }
  return colorMap[status] || 'grey'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
</script>

<style scoped>
.order-items-widget {
  /* Table styling */
  :deep(.v-data-table) {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 4px;
  }

  :deep(.v-data-table__thead) {
    background-color: rgba(var(--v-theme-surface-variant), 0.3);
  }

  :deep(.v-data-table__tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.04) !important;
  }

  /* Compact spacing */
  :deep(.v-data-table__td),
  :deep(.v-data-table__th) {
    padding: 8px 12px !important;
  }
}

.received-totals {
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  background: rgba(var(--v-theme-success), 0.05);
}

@media (max-width: 768px) {
  .order-items-widget {
    :deep(.v-data-table__td),
    :deep(.v-data-table__th) {
      padding: 6px 8px !important;
      font-size: 0.8rem;
    }
  }
}
</style>
