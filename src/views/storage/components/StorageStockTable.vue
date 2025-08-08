<!-- src/views/storage/components/StorageStockTable.vue - ФИНАЛЬНАЯ ВЕРСИЯ -->
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

        <v-btn
          color="warning"
          variant="outlined"
          size="small"
          :class="{ 'bg-warning': filters.showNearExpiry }"
          @click="toggleNearExpiryFilter"
        >
          <v-icon icon="mdi-clock-alert-outline" class="mr-1" />
          Expiring ({{ expiringCount }})
        </v-btn>

        <v-btn
          color="info"
          variant="outlined"
          size="small"
          :class="{ 'bg-info': filters.showLowStock }"
          @click="toggleLowStockFilter"
        >
          <v-icon icon="mdi-package-variant" class="mr-1" />
          Low Stock ({{ lowStockCount }})
        </v-btn>

        <v-btn
          color="error"
          variant="outlined"
          size="small"
          :class="{ 'bg-error': filters.showExpired }"
          @click="toggleExpiredFilter"
        >
          <v-icon icon="mdi-alert-circle" class="mr-1" />
          Expired ({{ expiredCount }})
        </v-btn>
      </div>

      <!-- ✅ УДАЛЕНЫ дублирующие кнопки - они есть в главном view -->
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="filters.showExpired"
          size="small"
          closable
          color="error"
          @click:close="toggleExpiredFilter"
        >
          Expired Items
        </v-chip>

        <v-chip
          v-if="filters.showNearExpiry"
          size="small"
          closable
          color="warning"
          @click:close="toggleNearExpiryFilter"
        >
          Expiring Soon
        </v-chip>

        <v-chip
          v-if="filters.showLowStock"
          size="small"
          closable
          color="info"
          @click:close="toggleLowStockFilter"
        >
          Low Stock
        </v-chip>

        <v-btn size="small" variant="text" @click="clearAllFilters">Clear All</v-btn>
      </div>
    </div>

    <!-- Stock Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredBalances"
        :loading="loading"
        :search="searchQuery"
        item-key="itemId"
        class="elevation-0"
        :items-per-page="25"
        :sort-by="[{ key: 'itemName', order: 'asc' }]"
      >
        <!-- Item Name -->
        <template #[`item.itemName`]="{ item }">
          <div class="d-flex align-center">
            <div class="item-icon mr-3">
              {{ getItemIcon(item.itemType) }}
            </div>
            <div class="item-info">
              <div class="font-weight-medium">{{ item.itemName }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatItemType(item.itemType) }}
                <span v-if="item.itemType === 'product'" class="ml-1">• ID: {{ item.itemId }}</span>
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
                <span v-if="item.batches.length > 0" class="ml-1">
                  • Oldest: {{ formatDate(item.oldestBatchDate) }}
                </span>
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
              <span v-if="item.latestCost !== item.averageCost" class="ml-1 text-medium-emphasis">
                (Latest: {{ formatCurrency(item.latestCost) }})
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
            <!-- Expiry Status -->
            <v-chip v-if="item.hasExpired" size="x-small" color="error" variant="flat">
              <v-icon icon="mdi-alert-circle" size="12" class="mr-1" />
              Expired
            </v-chip>
            <v-chip v-else-if="item.hasNearExpiry" size="x-small" color="warning" variant="flat">
              <v-icon icon="mdi-clock-alert-outline" size="12" class="mr-1" />
              Expiring Soon
            </v-chip>

            <!-- Stock Level Status -->
            <v-chip
              v-if="item.belowMinStock"
              size="x-small"
              color="info"
              variant="flat"
              class="mt-1"
            >
              <v-icon icon="mdi-package-variant" size="12" class="mr-1" />
              Low Stock
            </v-chip>

            <!-- All Good Status -->
            <v-chip
              v-if="!item.hasExpired && !item.hasNearExpiry && !item.belowMinStock"
              size="x-small"
              color="success"
              variant="flat"
            >
              <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
              OK
            </v-chip>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center">
            <!-- ✅ УПРОЩЕНО: Только одна кнопка -->
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-information"
              @click="showItemDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details & Batches</v-tooltip>
            </v-btn>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-package-variant-closed" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No items match filters' : 'No items found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : `No ${formatItemType(itemType)} in ${formatDepartment(department)} inventory`
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearAllFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <div class="text-caption text-medium-emphasis">
                Use "Add Stock" button in the header to add your first items
              </div>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading stock data...</div>
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
const emit = defineEmits<{
  // ✅ УДАЛЕНЫ дублирующие emits
}>()

// State
const searchQuery = ref('')
const showDetailsDialog = ref(false)
const selectedItem = ref<StorageBalance | null>(null)

const filters = ref({
  showExpired: false,
  showNearExpiry: false,
  showLowStock: false
})

// Computed
const headers = computed(() => [
  { title: 'Item', key: 'itemName', sortable: true, width: '250px' },
  { title: 'Stock', key: 'stock', sortable: false, width: '200px' },
  { title: 'Cost', key: 'cost', sortable: true, value: 'averageCost', width: '180px' },
  { title: 'Total Value', key: 'totalValue', sortable: true, width: '150px' },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '60px' } // ✅ УМЕНЬШЕНО с 100px до 60px
])

const filteredBalances = computed(() => {
  let items = [...props.balances]

  // Apply status filters
  if (filters.value.showExpired) {
    items = items.filter(item => item.hasExpired)
  }
  if (filters.value.showNearExpiry) {
    items = items.filter(item => item.hasNearExpiry)
  }
  if (filters.value.showLowStock) {
    items = items.filter(item => item.belowMinStock)
  }

  return items
})

const hasActiveFilters = computed(
  () => filters.value.showExpired || filters.value.showNearExpiry || filters.value.showLowStock
)

const expiringCount = computed(() => props.balances.filter(b => b.hasNearExpiry).length)
const lowStockCount = computed(() => props.balances.filter(b => b.belowMinStock).length)
const expiredCount = computed(() => props.balances.filter(b => b.hasExpired).length)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Products' : 'Preparations'
}

function getItemIcon(type: StorageItemType): string {
  return type === 'product' ? '🥩' : '🍲'
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
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

function toggleExpiredFilter() {
  filters.value.showExpired = !filters.value.showExpired
}

function toggleNearExpiryFilter() {
  filters.value.showNearExpiry = !filters.value.showNearExpiry
}

function toggleLowStockFilter() {
  filters.value.showLowStock = !filters.value.showLowStock
}

function clearAllFilters() {
  filters.value = {
    showExpired: false,
    showNearExpiry: false,
    showLowStock: false
  }
  searchQuery.value = ''
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

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
  }

  // Active filter styling
  .bg-warning {
    background-color: rgb(var(--v-theme-warning)) !important;
    color: rgb(var(--v-theme-on-warning)) !important;
  }

  .bg-info {
    background-color: rgb(var(--v-theme-info)) !important;
    color: rgb(var(--v-theme-on-info)) !important;
  }

  .bg-error {
    background-color: rgb(var(--v-theme-error)) !important;
    color: rgb(var(--v-theme-on-error)) !important;
  }
}
</style>
