<!-- TransitOverviewTab.vue - Overview of items in transit -->
<template>
  <div class="transit-overview-tab">
    <!-- Transit Metrics Cards -->
    <div class="d-flex gap-4 mb-6">
      <!-- Total Items in Transit -->
      <v-card class="flex-1">
        <v-card-text>
          <div class="d-flex align-center">
            <v-icon icon="mdi-truck-delivery" color="orange" size="36" class="mr-4" />
            <div>
              <div class="text-h4 font-weight-bold text-orange">
                {{ transitMetrics.totalTransitItems }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Items in Transit</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Total Value -->
      <v-card class="flex-1">
        <v-card-text>
          <div class="d-flex align-center">
            <v-icon icon="mdi-currency-usd" color="green" size="36" class="mr-4" />
            <div>
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(transitMetrics.totalTransitValue) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Total Transit Value</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Overdue Deliveries -->
      <v-card class="flex-1" :color="transitMetrics.overdueCount > 0 ? 'error' : undefined">
        <v-card-text>
          <div class="d-flex align-center">
            <v-icon
              icon="mdi-truck-alert"
              :color="transitMetrics.overdueCount > 0 ? 'white' : 'error'"
              size="36"
              class="mr-4"
            />
            <div>
              <div
                class="text-h4 font-weight-bold"
                :class="transitMetrics.overdueCount > 0 ? 'text-white' : 'text-error'"
              >
                {{ transitMetrics.overdueCount }}
              </div>
              <div
                class="text-body-2"
                :class="transitMetrics.overdueCount > 0 ? 'text-white' : 'text-medium-emphasis'"
              >
                Overdue Deliveries
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Due Today -->
      <v-card class="flex-1" :color="transitMetrics.dueTodayCount > 0 ? 'info' : undefined">
        <v-card-text>
          <div class="d-flex align-center">
            <v-icon
              icon="mdi-calendar-today"
              :color="transitMetrics.dueTodayCount > 0 ? 'white' : 'info'"
              size="36"
              class="mr-4"
            />
            <div>
              <div
                class="text-h4 font-weight-bold"
                :class="transitMetrics.dueTodayCount > 0 ? 'text-white' : 'text-info'"
              >
                {{ transitMetrics.dueTodayCount }}
              </div>
              <div
                class="text-body-2"
                :class="transitMetrics.dueTodayCount > 0 ? 'text-white' : 'text-medium-emphasis'"
              >
                Due Today
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Delivery Alerts -->
    <div v-if="deliveryAlerts.length > 0" class="mb-6">
      <h3 class="text-h6 mb-3">
        <v-icon icon="mdi-alert" class="mr-2" />
        Delivery Alerts
      </h3>
      <div class="d-flex flex-column gap-2">
        <v-alert
          v-for="alert in deliveryAlerts"
          :key="`${alert.batchId}-${alert.type}`"
          :type="
            alert.severity === 'critical'
              ? 'error'
              : alert.severity === 'warning'
                ? 'warning'
                : 'info'
          "
          variant="tonal"
          density="compact"
        >
          <template #prepend>
            <v-icon :icon="alert.type === 'overdue' ? 'mdi-truck-alert' : 'mdi-truck-delivery'" />
          </template>
          <div class="d-flex align-center justify-space-between w-100">
            <div>
              <strong>{{ alert.message }}</strong>
              <div class="text-caption">
                {{ alert.itemName }}
                <span v-if="alert.daysOverdue" class="text-error">
                  • {{ alert.daysOverdue }} days overdue
                </span>
              </div>
            </div>
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="outlined"
                :color="alert.severity === 'critical' ? 'error' : 'primary'"
                prepend-icon="mdi-receipt"
                :to="`/suppliers?tab=receipts&orderId=${alert.orderId}`"
              >
                Process Receipt
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                prepend-icon="mdi-file-document"
                :to="`/suppliers?tab=orders&orderId=${alert.orderId}`"
              >
                View Order
              </v-btn>
            </div>
          </div>
        </v-alert>
      </div>
    </div>

    <!-- Transit Items Table -->
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-truck-delivery" class="mr-2" />
          Items in Transit
        </div>
        <div class="d-flex gap-2">
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            label="Filter by status"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 200px"
            clearable
          />
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="refreshTransitData"
          >
            Refresh
          </v-btn>
        </div>
      </v-card-title>

      <v-data-table
        :headers="transitTableHeaders"
        :items="filteredTransitBatches"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'plannedDeliveryDate', order: 'asc' }]"
      >
        <!-- Product Name -->
        <template #[`item.itemName`]="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="getCategoryIcon(item.itemId)"
              :color="getCategoryColor(item.itemId)"
              size="20"
              class="mr-2"
            />
            <div>
              <div class="font-weight-medium">{{ item.itemName }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.batchNumber }}</div>
            </div>
          </div>
        </template>

        <!-- Quantity -->
        <template #[`item.quantity`]="{ item }">
          <div class="font-weight-medium">
            {{ formatQuantity(item.currentQuantity, item.unit) }}
          </div>
        </template>

        <!-- Supplier -->
        <template #[`item.supplier`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.supplierName }}</div>
            <div class="text-caption text-medium-emphasis">Order: {{ item.purchaseOrderId }}</div>
          </div>
        </template>

        <!-- Planned Delivery -->
        <template #[`item.plannedDeliveryDate`]="{ item }">
          <div>
            <div class="font-weight-medium" :class="getDeliveryDateClass(item.plannedDeliveryDate)">
              {{ formatDate(item.plannedDeliveryDate) }}
            </div>
            <div class="text-caption" :class="getDeliveryStatusClass(item.plannedDeliveryDate)">
              {{ getDeliveryStatus(item.plannedDeliveryDate) }}
            </div>
          </div>
        </template>

        <!-- Value -->
        <template #[`item.totalValue`]="{ item }">
          <div class="font-weight-medium">
            {{ formatCurrency(item.totalValue) }}
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="getStatusColor(item.plannedDeliveryDate)" size="small" variant="flat">
            <v-icon :icon="getStatusIcon(item.plannedDeliveryDate)" size="14" class="mr-1" />
            {{ getStatusText(item.plannedDeliveryDate) }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-receipt"
              :to="`/suppliers?tab=receipts&orderId=${item.purchaseOrderId}`"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Process Receipt</v-tooltip>
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-file-document"
              :to="`/suppliers?tab=orders&orderId=${item.purchaseOrderId}`"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Order Details</v-tooltip>
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="orange"
              icon="mdi-information"
              @click="showBatchDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Batch Details</v-tooltip>
            </v-btn>
          </div>
        </template>

        <!-- No Data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-truck-delivery-outline" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasFilters ? 'No transit items match filters' : 'No items in transit' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasFilters
                  ? 'Try adjusting your filters'
                  : `No deliveries are expected for ${formatDepartment(department)}`
              }}
            </div>
            <div v-if="hasFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="primary" variant="flat" to="/suppliers" prepend-icon="mdi-truck">
                Create Orders
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading transit data...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Batch Details Dialog -->
    <transit-batch-details-dialog v-model="showBatchDialog" :batch="selectedBatch" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import type { StorageBatch, StorageDepartment } from '@/stores/storage'

// Components
import TransitBatchDetailsDialog from '../dialogs/TransitBatchDetailsDialog.vue'

// Props
interface Props {
  department: StorageDepartment
  transitMetrics: {
    totalTransitItems: number
    totalTransitValue: number
    overdueCount: number
    dueTodayCount: number
  }
  deliveryAlerts: Array<{
    type: string
    severity: string
    message: string
    batchId: string
    orderId: string
    itemName: string
    daysOverdue?: number
  }>
}

const props = defineProps<Props>()

// Stores
const storageStore = useStorageStore()
const productsStore = useProductsStore()

// State
const loading = ref(false)
const statusFilter = ref<string | null>(null)
const showBatchDialog = ref(false)
const selectedBatch = ref<StorageBatch | null>(null)

// Computed
const transitBatches = computed(() => {
  if (!storageStore.transitBatches) return []

  return storageStore.transitBatches.filter(batch => batch.department === props.department)
})

const statusFilterOptions = computed(() => [
  { title: 'All Statuses', value: null },
  { title: 'Due Today', value: 'due_today' },
  { title: 'Overdue', value: 'overdue' },
  { title: 'On Time', value: 'on_time' }
])

const filteredTransitBatches = computed(() => {
  let batches = [...transitBatches.value]

  if (statusFilter.value) {
    const now = new Date()
    batches = batches.filter(batch => {
      if (!batch.plannedDeliveryDate) return false

      const deliveryDate = new Date(batch.plannedDeliveryDate)
      const diffTime = deliveryDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      switch (statusFilter.value) {
        case 'due_today':
          return diffDays === 0
        case 'overdue':
          return diffDays < 0
        case 'on_time':
          return diffDays > 0
        default:
          return true
      }
    })
  }

  return batches
})

const hasFilters = computed(() => statusFilter.value !== null)

const transitTableHeaders = computed(() => [
  { title: 'Product', key: 'itemName', sortable: false, width: '200px' },
  { title: 'Quantity', key: 'quantity', sortable: false, width: '120px' },
  { title: 'Supplier', key: 'supplier', sortable: false, width: '180px' },
  { title: 'Planned Delivery', key: 'plannedDeliveryDate', sortable: true, width: '150px' },
  { title: 'Value', key: 'totalValue', sortable: false, width: '120px' },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '150px' }
])

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString()} ${unit}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getDeliveryStatus(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else {
    return `${diffDays} days remaining`
  }
}

function getDeliveryDateClass(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-error'
  if (diffDays === 0) return 'text-info'
  return ''
}

function getDeliveryStatusClass(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-error'
  if (diffDays === 0) return 'text-info'
  return 'text-medium-emphasis'
}

function getStatusColor(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'error'
  if (diffDays === 0) return 'info'
  return 'orange'
}

function getStatusIcon(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'mdi-truck-alert'
  if (diffDays === 0) return 'mdi-calendar-today'
  return 'mdi-truck-delivery'
}

function getStatusText(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due Today'
  return 'In Transit'
}

function getCategoryIcon(itemId: string): string {
  try {
    const product = productsStore.products?.find(p => p.id === itemId)
    const category = product?.category || 'other'

    const iconMap: Record<string, string> = {
      meat: 'mdi-food-steak',
      vegetables: 'mdi-carrot',
      spices: 'mdi-seed',
      dairy: 'mdi-cow',
      grains: 'mdi-grain',
      beverages: 'mdi-cup',
      alcohol: 'mdi-bottle-wine',
      other: 'mdi-package-variant'
    }

    return iconMap[category.toLowerCase()] || 'mdi-package-variant'
  } catch (error) {
    return 'mdi-package-variant'
  }
}

function getCategoryColor(itemId: string): string {
  try {
    const product = productsStore.products?.find(p => p.id === itemId)
    const category = product?.category || 'other'

    const colorMap: Record<string, string> = {
      meat: 'red-darken-2',
      vegetables: 'green-darken-2',
      spices: 'orange-darken-2',
      dairy: 'blue-darken-2',
      grains: 'amber-darken-2',
      beverages: 'cyan-darken-2',
      alcohol: 'purple-darken-2',
      other: 'grey-darken-2'
    }

    return colorMap[category.toLowerCase()] || 'grey-darken-2'
  } catch (error) {
    return 'grey-darken-2'
  }
}

function showBatchDetails(batch: StorageBatch) {
  selectedBatch.value = batch
  showBatchDialog.value = true
}

async function refreshTransitData() {
  loading.value = true
  try {
    // This would typically refresh the data from the store
    await storageStore.fetchBalances(props.department)
  } catch (error) {
    console.error('Failed to refresh transit data:', error)
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  statusFilter.value = null
}
</script>

<style lang="scss" scoped>
.transit-overview-tab {
  .flex-1 {
    flex: 1;
  }

  .gap-4 {
    gap: 16px;
  }

  .gap-2 {
    gap: 8px;
  }

  .text-orange {
    color: rgb(var(--v-theme-warning));
  }
}
</style>
