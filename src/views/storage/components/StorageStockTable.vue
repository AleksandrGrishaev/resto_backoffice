<!-- src/views/storage/components/StorageStockTable.vue - ПОЛНАЯ ВЕРСИЯ С ТРАНЗИТОМ -->
<template>
  <div class="storage-stock-table">
    <!-- Filters and Search -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Filter by category"
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

        <!-- ✅ FIXED: Out of Stock Filter Button (includes negative stock) -->
        <v-btn
          color="grey"
          variant="outlined"
          size="small"
          :class="{ 'bg-grey': showZeroStock }"
          @click="$emit('toggle-zero-stock')"
        >
          <v-icon icon="mdi-package-variant-closed" class="mr-1" />
          Out of Stock ({{ outOfStockCount }})
        </v-btn>
      </div>
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
          Expired Products
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

        <v-chip
          v-if="selectedCategory"
          size="small"
          closable
          color="primary"
          @click:close="selectedCategory = null"
        >
          {{ PRODUCT_CATEGORIES[selectedCategory] || selectedCategory }}
        </v-chip>

        <v-chip
          v-if="showZeroStock"
          size="small"
          closable
          color="grey"
          @click:close="$emit('toggle-zero-stock')"
        >
          Out of Stock
        </v-chip>

        <v-btn size="small" variant="text" @click="clearAllFilters">Clear All</v-btn>
      </div>
    </div>

    <!-- ✅ FIXED: Out of Stock Info Banner (includes negative stock warning) -->
    <v-alert
      v-if="showZeroStock && outOfStockCount > 0"
      type="info"
      variant="tonal"
      class="mb-4"
      density="compact"
    >
      <template #prepend>
        <v-icon icon="mdi-information" />
      </template>
      <div class="d-flex align-center justify-space-between w-100">
        <div>
          <strong>{{ outOfStockCount }} products are out of stock</strong>
          - showing products without inventory
          <span v-if="negativeStockCount > 0" class="text-error ml-1">
            ({{ negativeStockCount }} with negative stock - critical!)
          </span>
          <div class="text-caption">
            These products need to be ordered through the Suppliers module
          </div>
        </div>
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          prepend-icon="mdi-truck"
          to="/suppliers"
        >
          Order Supplies
        </v-btn>
      </div>
    </v-alert>

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
        :custom-sort="customSort"
        disable-sort
      >
        <!-- Product Name -->
        <template #[`item.itemName`]="{ item }">
          <div class="font-weight-medium" :class="getItemNameClass(item)">
            {{ item.itemName }}
            <!-- ✅ НОВОЕ: Индикатор товаров с транзитом -->
            <v-icon v-if="hasTransitForItem(item)" color="orange" size="14" class="ml-1">
              mdi-plus
            </v-icon>
          </div>
        </template>

        <!-- Category -->
        <template #[`item.category`]="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="getCategoryIcon(getProductCategory(item.itemId))"
              :color="getCategoryColor(getProductCategory(item.itemId))"
              size="18"
              class="mr-2"
            />
            <span class="text-caption">{{ getProductCategoryDisplay(item.itemId) }}</span>
          </div>
        </template>

        <!-- ✅ НОВАЯ КОЛОНКА: Used In Departments -->
        <template #[`item.departments`]="{ item }">
          <div class="d-flex flex-column gap-2">
            <v-chip
              v-for="dept in getProductDepartments(item.itemId)"
              :key="dept"
              size="x-small"
              :color="dept === 'kitchen' ? 'orange' : 'blue'"
              variant="tonal"
            >
              <v-icon
                :icon="dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
                size="12"
                class="mr-1"
              />
              {{ dept === 'kitchen' ? 'Kitchen' : 'Bar' }}
            </v-chip>
          </div>
        </template>

        <!-- Stock Column -->
        <template #[`item.stock`]="{ item }">
          <div class="d-flex align-center">
            <div>
              <!-- ✅ FIXED: Handle zero and negative stock display -->
              <div class="font-weight-medium" :class="getStockQuantityClass(item)">
                {{ formatQuantity(item.totalQuantity, item.unit) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                <!-- ✅ FIXED: Different info for out of stock including negative -->
                <template v-if="item.totalQuantity < 0">
                  <span class="text-error">Critical: Negative stock!</span>
                </template>
                <template v-else-if="item.totalQuantity === 0">No stock available</template>
                <template v-else>
                  {{ item.batches.length }} batch{{ item.batches.length !== 1 ? 'es' : '' }}
                  <span v-if="item.batches.length > 0" class="ml-1">
                    • Oldest: {{ formatDate(item.oldestBatchDate) }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </template>

        <!-- ✅ НОВАЯ КОЛОНКА: В пути -->
        <template #[`item.transit`]="{ item }">
          <div class="d-flex align-center">
            <div>
              <div class="font-weight-medium" :class="getTransitQuantityClass(item)">
                {{ formatQuantity(getTransitQuantity(item), item.unit) }}
              </div>
              <div v-if="getTransitQuantity(item) > 0" class="text-caption">
                <div class="d-flex align-center">
                  <!-- Индикатор статуса доставки -->
                  <v-icon :color="getTransitStatusColor(item)" size="12" class="mr-1">
                    {{ getTransitStatusIcon(item) }}
                  </v-icon>
                  <span :class="getTransitStatusTextClass(item)">
                    {{ getTransitStatusText(item) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Cost Information -->
        <template #[`item.cost`]="{ item }">
          <div>
            <!-- ✅ FIXED: Handle zero and negative stock cost display -->
            <div class="font-weight-medium" :class="getCostDisplayClass(item)">
              <template v-if="item.totalQuantity <= 0">
                {{ formatCurrency(item.averageCost) }}/{{ item.unit }}
                <div class="text-caption text-medium-emphasis">(last known)</div>
              </template>
              <template v-else>{{ formatCurrency(item.averageCost) }}/{{ item.unit }}</template>
            </div>
            <div v-if="item.totalQuantity > 0" class="d-flex align-center text-caption">
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
          <div class="font-weight-medium" :class="getValueDisplayClass(item)">
            {{ formatCurrency(item.totalValue) }}
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <div class="d-flex flex-column gap-1">
            <!-- ✅ FIXED: Out of Stock Status for zero AND negative stock -->
            <v-chip
              v-if="item.totalQuantity <= 0"
              size="x-small"
              :color="item.totalQuantity < 0 ? 'error' : 'grey'"
              variant="flat"
            >
              <v-icon
                :icon="item.totalQuantity < 0 ? 'mdi-alert-circle' : 'mdi-package-variant-closed'"
                size="12"
                class="mr-1"
              />
              {{ item.totalQuantity < 0 ? 'Negative Stock' : 'Out of Stock' }}
            </v-chip>

            <!-- Existing status chips for products with stock -->
            <template v-else>
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
            </template>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-information"
              @click="showItemDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">
                {{ item.totalQuantity <= 0 ? 'View Product Info' : 'View Details & Batches' }}
              </v-tooltip>
            </v-btn>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-package-variant-closed" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No products match filters' : 'No products found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : `No products in ${formatDepartment(department)} inventory`
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearAllFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="primary" variant="flat" to="/suppliers" prepend-icon="mdi-truck">
                Order from Suppliers
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading product stock data...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Item Details Dialog -->
    <item-details-dialog v-model="showDetailsDialog" :item="selectedItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import type { StorageBalance, StorageDepartment } from '@/stores/storage'
import { DebugUtils } from '@/utils/debugger'

const MODULE_NAME = 'StorageStockTable'

// Components
import ItemDetailsDialog from './ItemDetailsDialog.vue'

// Props
interface Props {
  balances: StorageBalance[]
  loading: boolean
  department?: StorageDepartment // ✅ ИЗМЕНЕНО: сделать optional
  showZeroStock?: boolean
  storageStore: any
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showZeroStock: false,
  department: undefined // ✅ ДОБАВЛЕНО: default undefined для 'all'
})

// Emits
const emit = defineEmits<{
  'write-off': [productData: any]
  'toggle-zero-stock': []
}>()

// Store
const productsStore = useProductsStore()

// State
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const showDetailsDialog = ref(false)
const selectedItem = ref<StorageBalance | null>(null)

const filters = ref({
  showExpired: false,
  showNearExpiry: false,
  showLowStock: false
})

// Computed
const headers = computed(() => {
  const baseHeaders = [
    { title: 'Product', key: 'itemName', sortable: false, width: '200px' },
    { title: 'Category', key: 'category', sortable: false, width: '150px' }
  ]

  // ✅ НОВОЕ: добавляем колонку "Used In" только для вкладки All
  if (!props.department) {
    baseHeaders.push({
      title: 'Used In',
      key: 'departments',
      sortable: false,
      width: '60px'
    })
  }

  baseHeaders.push(
    { title: 'Stock', key: 'stock', sortable: false, width: '200px' },
    { title: 'In Transit', key: 'transit', sortable: false, width: '180px' },
    { title: 'Cost', key: 'cost', sortable: false, width: '180px' },
    { title: 'Total Value', key: 'totalValue', sortable: false, width: '150px' },
    { title: 'Status', key: 'status', sortable: false, width: '120px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '60px' }
  )

  return baseHeaders
})

// ✅ FIXED: Custom sorting to show out of stock items last (including negative stock)
const customSort = (items: StorageBalance[], sortBy: any[]) => {
  return [...items].sort((a, b) => {
    // Primary sort: Stock status (products with stock first, then negative stock, then zero stock)
    if (a.totalQuantity > 0 && b.totalQuantity <= 0) return -1
    if (a.totalQuantity <= 0 && b.totalQuantity > 0) return 1

    // Within out-of-stock items: negative stock first (more critical)
    if (a.totalQuantity <= 0 && b.totalQuantity <= 0) {
      if (a.totalQuantity < 0 && b.totalQuantity === 0) return -1
      if (a.totalQuantity === 0 && b.totalQuantity < 0) return 1
    }

    // Secondary sort: Alphabetical by name within each group
    return a.itemName.localeCompare(b.itemName)
  })
}

const filteredBalances = computed(() => {
  let items = [...props.balances]

  // Apply category filter first
  if (selectedCategory.value) {
    items = items.filter(item => getProductCategory(item.itemId) === selectedCategory.value)
  }

  // ✅ FIXED: Apply out of stock filter (includes negative stock)
  if (props.showZeroStock) {
    items = items.filter(item => item.totalQuantity <= 0)
  }

  // Apply other status filters
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
  () =>
    filters.value.showExpired ||
    filters.value.showNearExpiry ||
    filters.value.showLowStock ||
    selectedCategory.value !== null ||
    props.showZeroStock
)

const expiringCount = computed(() => props.balances.filter(b => b.hasNearExpiry).length)
const lowStockCount = computed(() => props.balances.filter(b => b.belowMinStock).length)
const expiredCount = computed(() => props.balances.filter(b => b.hasExpired).length)

// ✅ FIXED: Out of stock count (zero AND negative stock)
const outOfStockCount = computed(() => props.balances.filter(b => b.totalQuantity <= 0).length)

// ✅ NEW: Separate negative stock count for alerts
const negativeStockCount = computed(() => props.balances.filter(b => b.totalQuantity < 0).length)

// Category options for the filter
const categoryOptions = computed(() => {
  const categories = new Set<string>()

  props.balances.forEach(balance => {
    const category = getProductCategory(balance.itemId)
    if (category) {
      categories.add(category)
    }
  })

  return Array.from(categories)
    .sort()
    .map(category => ({
      title: PRODUCT_CATEGORIES[category] || category,
      value: category
    }))
})

// ===========================
// DEPARTMENT-FILTERED TRANSIT BATCHES
// ===========================

const departmentTransitBatches = computed(() => {
  if (!props.storageStore?.transitBatches) {
    return []
  }

  // If department not specified - show all transit batches
  if (!props.department) {
    return props.storageStore.transitBatches
  }

  // Filter by Product.usedInDepartments
  return props.storageStore.transitBatches.filter((batch: any) => {
    const product = productsStore.products?.find(p => p.id === batch.itemId)
    if (!product) {
      return false
    }
    return product.usedInDepartments.includes(props.department!)
  })
})

// ===========================
// ТРАНЗИТНЫЕ BATCH-И МЕТОДЫ
// ===========================

function hasTransitForItem(item: StorageBalance): boolean {
  return departmentTransitBatches.value.some((batch: any) => batch.itemId === item.itemId)
}

function getTransitQuantity(item: StorageBalance): number {
  if (!departmentTransitBatches.value.length) return 0

  return departmentTransitBatches.value
    .filter((batch: any) => batch.itemId === item.itemId)
    .reduce((sum: number, batch: any) => sum + batch.currentQuantity, 0)
}

function getTransitStatusColor(item: StorageBalance): string {
  const transitBatches = departmentTransitBatches.value.filter(
    (batch: any) => batch.itemId === item.itemId
  )

  if (transitBatches.length === 0) return 'grey'

  // Check if any batch is overdue
  const now = new Date()
  const hasOverdue = transitBatches.some((batch: any) => {
    if (!batch.plannedDeliveryDate) return false
    return new Date(batch.plannedDeliveryDate) < now
  })

  if (hasOverdue) return 'error'

  // Check if any batch delivers today
  const hasToday = transitBatches.some((batch: any) => {
    if (!batch.plannedDeliveryDate) return false
    const deliveryDate = new Date(batch.plannedDeliveryDate)
    return deliveryDate.toDateString() === now.toDateString()
  })

  if (hasToday) return 'warning'

  return 'orange' // Future delivery
}

function getTransitStatusIcon(item: StorageBalance): string {
  const color = getTransitStatusColor(item)
  switch (color) {
    case 'error':
      return 'mdi-alert-circle'
    case 'warning':
      return 'mdi-clock-alert'
    default:
      return 'mdi-truck-delivery'
  }
}

function getProductDepartments(productId: string): ('kitchen' | 'bar')[] {
  try {
    const product = productsStore.products.find(p => p.id === productId)
    return product?.usedInDepartments || []
  } catch (error) {
    console.warn('Error getting product departments:', error)
    return []
  }
}

function getTransitStatusText(item: StorageBalance): string {
  const transitBatches = departmentTransitBatches.value.filter(
    (batch: any) => batch.itemId === item.itemId
  )

  if (transitBatches.length === 0) return 'No transit'

  const now = new Date()

  // Check for overdue
  const overdueBatch = transitBatches.find((batch: any) => {
    if (!batch.plannedDeliveryDate) return false
    return new Date(batch.plannedDeliveryDate) < now
  })

  if (overdueBatch) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(overdueBatch.plannedDeliveryDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    return `Overdue ${daysOverdue}d`
  }

  // Check for today
  const todayBatch = transitBatches.find((batch: any) => {
    if (!batch.plannedDeliveryDate) return false
    const deliveryDate = new Date(batch.plannedDeliveryDate)
    return deliveryDate.toDateString() === now.toDateString()
  })

  if (todayBatch) {
    return 'Arriving today'
  }

  // Find nearest delivery
  const sortedBatches = [...transitBatches]
    .filter((batch: any) => batch.plannedDeliveryDate)
    .sort(
      (a: any, b: any) =>
        new Date(a.plannedDeliveryDate).getTime() - new Date(b.plannedDeliveryDate).getTime()
    )

  if (sortedBatches.length > 0) {
    const nearestDate = new Date(sortedBatches[0].plannedDeliveryDate)
    const daysUntil = Math.ceil((nearestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return `In ${daysUntil}d`
  }

  return `${transitBatches.length} batch${transitBatches.length > 1 ? 'es' : ''}`
}

function getTransitQuantityClass(item: StorageBalance): string {
  const quantity = getTransitQuantity(item)
  if (quantity === 0) return 'text-medium-emphasis'

  const color = getTransitStatusColor(item)
  switch (color) {
    case 'error':
      return 'text-error'
    case 'warning':
      return 'text-warning'
    default:
      return 'text-orange'
  }
}

function getTransitStatusTextClass(item: StorageBalance): string {
  const color = getTransitStatusColor(item)
  switch (color) {
    case 'error':
      return 'text-error'
    case 'warning':
      return 'text-warning'
    default:
      return 'text-orange'
  }
}

// ===========================
// СУЩЕСТВУЮЩИЕ МЕТОДЫ
// ===========================

// ✅ FIXED: Style helper methods for zero and negative stock items
function getItemNameClass(item: StorageBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getStockQuantityClass(item: StorageBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getCostDisplayClass(item: StorageBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getValueDisplayClass(item: StorageBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getProductCategory(productId: string): string {
  try {
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.category) return ''

    return PRODUCT_CATEGORIES[product.category] || product.category
  } catch (error) {
    console.warn('Error getting product category:', error)
    return ''
  }
}

function getProductCategoryDisplay(productId: string): string {
  try {
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.category) return 'Other'

    return PRODUCT_CATEGORIES[product.category] || product.category
  } catch (error) {
    console.warn('Error getting product category display:', error)
    return 'Other'
  }
}

function getCategoryIcon(category: string): string {
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
}

function getCategoryColor(category: string): string {
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
  selectedCategory.value = null

  // Also clear out of stock filter
  if (props.showZeroStock) {
    emit('toggle-zero-stock')
  }
}
</script>

<style lang="scss" scoped>
.storage-stock-table {
  .gap-2 {
    gap: 8px;
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

  // Out of stock filter styling
  .bg-grey {
    background-color: rgb(var(--v-theme-surface-variant)) !important;
    color: rgb(var(--v-theme-on-surface-variant)) !important;
  }
}

// Стили для транзитных элементов
.text-orange {
  color: #ff9800 !important;
}
</style>
