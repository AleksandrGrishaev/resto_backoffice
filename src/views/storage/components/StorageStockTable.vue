<!-- src/views/storage/components/StorageStockTable.vue -->
<template>
  <div class="storage-stock-table">
    <!-- Filters and Search -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search items..."
          variant="outlined"
          density="compact"
          hide-details
          style="width: 300px"
          clearable
        />

        <v-btn color="warning" variant="outlined" size="small" @click="toggleNearExpiryFilter">
          <v-icon icon="mdi-clock-alert-outline" class="mr-1" />
          Expiring ({{ expiringCount }})
        </v-btn>

        <v-btn color="info" variant="outlined" size="small" @click="toggleLowStockFilter">
          <v-icon icon="mdi-package-variant" class="mr-1" />
          Low Stock ({{ lowStockCount }})
        </v-btn>
      </div>

      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-clipboard-list"
        @click="$emit('inventory', itemType)"
      >
        Start Inventory
      </v-btn>
    </div>

    <!-- Stock Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="balances"
        :loading="loading"
        :search="searchQuery"
        item-key="itemId"
        class="elevation-0"
        :items-per-page="25"
      >
        <!-- Item Name -->
        <template #[`item.itemName`]="{ item }">
          <div class="d-flex align-center">
            <div class="item-info">
              <div class="font-weight-medium">{{ item.itemName }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatItemType(item.itemType) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Stock Quantity -->
        <template #[`item.stock`]="{ item }">
          <div class="d-flex align-center">
            <div>
              <div class="font-weight-medium">
                {{ formatQuantity(item.totalQuantity, item.unit) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ item.batches.length }} batch{{ item.batches.length !== 1 ? 'es' : '' }}
              </div>
            </div>
          </div>
        </template>

        <!-- Cost Information -->
        <template #[`item.cost`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ formatCurrency(item.averageCost) }}/{{ item.unit }}
            </div>
            <div class="d-flex align-center text-caption">
              <v-icon
                :icon="getCostTrendIcon(item.costTrend)"
                :color="getCostTrendColor(item.costTrend)"
                size="14"
                class="mr-1"
              />
              <span :class="getCostTrendColor(item.costTrend)">
                {{ formatCostTrend(item.costTrend) }}
              </span>
            </div>
          </div>
        </template>

        <!-- Total Value -->
        <template #[`item.totalValue`]="{ item }">
          <div class="font-weight-medium">
            {{ formatCurrency(item.totalValue) }}
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <div class="d-flex flex-column gap-1">
            <v-chip v-if="item.hasExpired" size="x-small" color="error" variant="flat">
              Expired
            </v-chip>
            <v-chip v-else-if="item.hasNearExpiry" size="x-small" color="warning" variant="flat">
              Expiring Soon
            </v-chip>
            <v-chip v-if="item.belowMinStock" size="x-small" color="info" variant="flat">
              Low Stock
            </v-chip>
            <v-chip
              v-if="!item.hasExpired && !item.hasNearExpiry && !item.belowMinStock"
              size="x-small"
              color="success"
              variant="flat"
            >
              OK
            </v-chip>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-minus-circle"
              @click="$emit('consumption', item.itemId, item.itemType)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Consumption</v-tooltip>
            </v-btn>

            <v-btn
              size="small"
              variant="text"
              color="info"
              icon="mdi-information"
              @click="showItemDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-package-variant-closed" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">No items found</div>
            <div class="text-body-2 text-medium-emphasis">
              No {{ formatItemType(itemType) }} in {{ department }} inventory
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Item Details Dialog -->
    <item-details-dialog v-model="showDetailsDialog" :item="selectedItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StorageBalance, StorageItemType, StorageDepartment } from '@/stores/storage'

// Components
import ItemDetailsDialog from './ItemDetailsDialog.vue'

// Props
interface Props {
  balances: StorageBalance[]
  loading: boolean
  itemType: StorageItemType
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  consumption: [itemId: string, itemType: StorageItemType]
  inventory: [itemType: StorageItemType]
}>()

// State
const searchQuery = ref('')
const showDetailsDialog = ref(false)
const selectedItem = ref<StorageBalance | null>(null)

// Computed
const headers = computed(() => [
  { title: 'Item', key: 'itemName', sortable: true },
  { title: 'Stock', key: 'stock', sortable: false },
  { title: 'Avg Cost', key: 'cost', sortable: true, value: 'averageCost' },
  { title: 'Total Value', key: 'totalValue', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const expiringCount = computed(() => props.balances.filter(b => b.hasNearExpiry).length)

const lowStockCount = computed(() => props.balances.filter(b => b.belowMinStock).length)

// Methods
function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Product' : 'Preparation'
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString()} ${unit}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getCostTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'mdi-trending-up'
    case 'down':
      return 'mdi-trending-down'
    default:
      return 'mdi-minus'
  }
}

function getCostTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-error'
    case 'down':
      return 'text-success'
    default:
      return 'text-medium-emphasis'
  }
}

function formatCostTrend(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'Rising'
    case 'down':
      return 'Falling'
    default:
      return 'Stable'
  }
}

function showItemDetails(item: StorageBalance) {
  selectedItem.value = item
  showDetailsDialog.value = true
}

function toggleNearExpiryFilter() {
  // TODO: Implement filter toggle
}

function toggleLowStockFilter() {
  // TODO: Implement filter toggle
}
</script>

<style lang="scss" scoped>
.storage-stock-table {
  .gap-2 {
    gap: 8px;
  }

  .item-info {
    min-width: 0;
  }
}
</style>
