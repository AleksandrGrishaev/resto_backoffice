<!-- src/views/supplier_2/components/orders/order/OrderItemsWidget.vue -->
<template>
  <div class="order-items-widget">
    <div class="text-subtitle-1 font-weight-bold mb-3">Order Items ({{ items.length }})</div>

    <v-data-table
      :headers="headers"
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

    <!-- Order Total -->
    <div class="d-flex justify-end mt-4 pa-3 rounded">
      <div class="mr-8">
        <div class="text-caption text-medium-emphasis mb-1">Total Packages:</div>
        <div class="text-h6 font-weight-bold">{{ totalPackages }}</div>
      </div>
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Order Total:</div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatCurrency(orderTotal) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderItem } from '@/stores/supplier_2/types'

// =============================================
// PROPS
// =============================================

interface Props {
  items: OrderItem[]
}

const props = defineProps<Props>()

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  {
    title: 'Item',
    key: 'itemName',
    sortable: false,
    width: '200px'
  },
  {
    title: 'Package',
    key: 'package',
    sortable: false,
    width: '150px'
  },
  {
    title: 'Ordered',
    key: 'orderedQuantity',
    sortable: false,
    width: '100px',
    align: 'end'
  },
  {
    title: 'Received',
    key: 'receivedQuantity',
    sortable: false,
    width: '100px',
    align: 'end'
  },
  {
    title: 'Price/Package',
    key: 'packagePrice',
    sortable: false,
    width: '130px',
    align: 'end'
  },
  {
    title: 'Price/Unit',
    key: 'pricePerUnit',
    sortable: false,
    width: '120px',
    align: 'end'
  },
  {
    title: 'Total',
    key: 'totalPrice',
    sortable: false,
    width: '130px',
    align: 'end'
  },
  {
    title: 'Status',
    key: 'status',
    sortable: false,
    width: '100px',
    align: 'center'
  }
]

// =============================================
// COMPUTED
// =============================================

const totalPackages = computed(() => {
  return props.items.reduce((sum, item) => sum + (item.packageQuantity || 0), 0)
})

const orderTotal = computed(() => {
  return props.items.reduce((sum, item) => sum + item.totalPrice, 0)
})

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
