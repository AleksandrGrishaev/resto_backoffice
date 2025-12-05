<!-- src/views/preparation/components/PreparationStockTable.vue - UPDATED: Categories, Write-off, Better Sorting -->
<template>
  <div class="preparation-stock-table">
    <!-- Filters and Search -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Filter by type"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 200px"
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
          <v-icon icon="mdi-chef-hat" class="mr-1" />
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

        <!-- Out of Stock Filter -->
        <v-btn
          color="grey"
          variant="outlined"
          size="small"
          :class="{ 'bg-grey': showZeroStock }"
          @click="$emit('toggle-zero-stock')"
        >
          <v-icon icon="mdi-package-variant-closed" class="mr-1" />
          No Stock ({{ outOfStockCount }})
        </v-btn>
      </div>

      <!-- Write-off Button -->
      <div>
        <preparation-writeoff-widget
          :department="department"
          @success="handleWriteOffSuccess"
          @refresh-needed="$emit('refresh-needed')"
        />
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
          Expired
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
          {{ getPreparationCategoryName(selectedCategory) }}
        </v-chip>

        <v-chip
          v-if="showZeroStock"
          size="small"
          closable
          color="grey"
          @click:close="$emit('toggle-zero-stock')"
        >
          No Stock
        </v-chip>

        <v-btn size="small" variant="text" @click="clearAllFilters">Clear All</v-btn>
      </div>
    </div>

    <!-- Out of Stock Info Banner -->
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
          <strong>{{ outOfStockCount }} preparations are out of stock</strong>
          - showing preparations without inventory
          <span v-if="negativeStockCount > 0" class="text-error ml-1">
            ({{ negativeStockCount }} with negative stock - critical!)
          </span>
          <div class="text-caption">These preparations need to be produced</div>
        </div>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          prepend-icon="mdi-chef-hat"
          @click="$emit('add-production')"
        >
          Add Production
        </v-btn>
      </div>
    </v-alert>

    <!-- Stock Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="sortedFilteredBalances"
        :loading="loading"
        :search="searchQuery"
        item-key="preparationId"
        class="elevation-0"
        :items-per-page="25"
        disable-sort
      >
        <!-- Preparation Name -->
        <template #[`item.preparationName`]="{ item }">
          <div class="d-flex align-center">
            <div class="preparation-icon mr-3">
              {{ getPreparationIcon(item.preparationId) }}
            </div>
            <div class="item-info">
              <div class="font-weight-medium" :class="getItemNameClass(item)">
                {{ item.preparationName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ getPreparationType(item.preparationId) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Category -->
        <template #[`item.category`]="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="getCategoryIcon(getPreparationCategory(item.preparationId))"
              :color="getCategoryColor(getPreparationCategory(item.preparationId))"
              size="18"
              class="mr-2"
            />
            <span class="text-caption">
              {{ getPreparationCategoryDisplay(item.preparationId) }}
            </span>
          </div>
        </template>

        <!-- Stock Quantity -->
        <template #[`item.stock`]="{ item }">
          <div class="d-flex align-center">
            <div>
              <div class="font-weight-medium" :class="getStockQuantityClass(item)">
                {{ formatQuantity(item.totalQuantity, item.unit, item.preparationId) }}
              </div>
              <!-- ⭐ PHASE 2: Show portion info chip for portion-type preparations -->
              <v-chip
                v-if="getPreparationPortionInfo(item.preparationId).isPortionType"
                size="x-small"
                color="secondary"
                variant="tonal"
                class="mt-1"
              >
                <v-icon icon="mdi-silverware-fork-knife" size="10" class="mr-1" />
                {{ getPreparationPortionInfo(item.preparationId).portionSize }}g per portion
              </v-chip>
              <div class="text-caption text-medium-emphasis">
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

        <!-- Cost Information -->
        <template #[`item.cost`]="{ item }">
          <div>
            <div class="font-weight-medium" :class="getCostDisplayClass(item)">
              <!-- ⭐ PHASE 2: Show cost per portion for portion-type -->
              <template v-if="getPreparationPortionInfo(item.preparationId).isPortionType">
                {{
                  formatCurrency(
                    item.averageCost * getPreparationPortionInfo(item.preparationId).portionSize
                  )
                }}/portion
                <div v-if="item.totalQuantity <= 0" class="text-caption text-medium-emphasis">
                  (last known)
                </div>
              </template>
              <template v-else-if="item.totalQuantity <= 0">
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
            <!-- Out of Stock Status -->
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
              {{ item.totalQuantity < 0 ? 'Negative Stock' : 'No Stock' }}
            </v-chip>

            <!-- Existing status chips for items with stock -->
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
                <v-icon icon="mdi-chef-hat" size="12" class="mr-1" />
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
                {{ item.totalQuantity <= 0 ? 'View Preparation Info' : 'View Details & Batches' }}
              </v-tooltip>
            </v-btn>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-chef-hat" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No preparations match filters' : 'No preparations found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : `No preparations in ${formatDepartment(department)} inventory`
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearAllFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn
                color="success"
                variant="flat"
                prepend-icon="mdi-chef-hat"
                @click="$emit('add-production')"
              >
                Add Production
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading preparation data...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Item Details Dialog -->
    <preparation-item-details-dialog v-model="showDetailsDialog" :item="selectedItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import type { PreparationBalance, PreparationDepartment } from '@/stores/preparation'

// Components
import PreparationItemDetailsDialog from './PreparationItemDetailsDialog.vue'
import PreparationWriteoffWidget from './writeoff/PreparationWriteOffWidget.vue'

// Props
interface Props {
  balances: PreparationBalance[]
  loading: boolean
  department: PreparationDepartment
  showZeroStock?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showZeroStock: false
})

// Emits
const emit = defineEmits<{
  'write-off': [preparationData: any]
  'toggle-zero-stock': []
  'refresh-needed': []
  'add-production': []
}>()

// Store
const recipesStore = useRecipesStore()

// State
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const showDetailsDialog = ref(false)
const selectedItem = ref<PreparationBalance | null>(null)

const filters = ref({
  showExpired: false,
  showNearExpiry: false,
  showLowStock: false
})

// ✅ Helper functions using store getters
const getPreparationCategoryName = (categoryId: string) =>
  recipesStore.getPreparationCategoryName(categoryId)

const getPreparationCategoryColor = (categoryId: string) =>
  recipesStore.getPreparationCategoryColor(categoryId)

const getPreparationCategoryEmoji = (categoryId: string) =>
  recipesStore.getPreparationCategoryEmoji(categoryId)

// Computed
const headers = computed(() => [
  { title: 'Preparation', key: 'preparationName', sortable: false, width: '200px' },
  { title: 'Type', key: 'category', sortable: false, width: '120px' },
  { title: 'Stock', key: 'stock', sortable: false, width: '180px' },
  { title: 'Cost', key: 'cost', sortable: false, width: '150px' },
  { title: 'Total Value', key: 'totalValue', sortable: false, width: '120px' },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '60px' }
])

const filteredBalances = computed(() => {
  let items = [...props.balances]

  // Apply category filter first
  if (selectedCategory.value) {
    items = items.filter(
      item => getPreparationCategory(item.preparationId) === selectedCategory.value
    )
  }

  // Apply out of stock filter
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

// Custom sorting to show items by stock status
const sortedFilteredBalances = computed(() => {
  return [...filteredBalances.value].sort((a, b) => {
    // Primary sort: Stock status (items with stock first, then negative stock, then zero stock)
    if (a.totalQuantity > 0 && b.totalQuantity <= 0) return -1
    if (a.totalQuantity <= 0 && b.totalQuantity > 0) return 1

    // Within out-of-stock items: negative stock first (more critical)
    if (a.totalQuantity <= 0 && b.totalQuantity <= 0) {
      if (a.totalQuantity < 0 && b.totalQuantity === 0) return -1
      if (a.totalQuantity === 0 && b.totalQuantity < 0) return 1
    }

    // Secondary sort: By category
    const categoryA = getPreparationCategory(a.preparationId)
    const categoryB = getPreparationCategory(b.preparationId)
    const categoryCompare = categoryA.localeCompare(categoryB)
    if (categoryCompare !== 0) return categoryCompare

    // Tertiary sort: Alphabetical by name within each group
    return a.preparationName.localeCompare(b.preparationName)
  })
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
const outOfStockCount = computed(() => props.balances.filter(b => b.totalQuantity <= 0).length)
const negativeStockCount = computed(() => props.balances.filter(b => b.totalQuantity < 0).length)

// Category options for the filter
const categoryOptions = computed(() => {
  const categories = new Set<string>()

  props.balances.forEach(balance => {
    const categoryId = getPreparationCategory(balance.preparationId)
    if (categoryId) {
      categories.add(categoryId)
    }
  })

  return Array.from(categories)
    .map(categoryId => ({
      title: getPreparationCategoryName(categoryId),
      value: categoryId
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

// Style helper methods
function getItemNameClass(item: PreparationBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getStockQuantityClass(item: PreparationBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getCostDisplayClass(item: PreparationBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

function getValueDisplayClass(item: PreparationBalance): string {
  if (item.totalQuantity < 0) return 'text-error'
  if (item.totalQuantity === 0) return 'text-medium-emphasis'
  return ''
}

// Methods
function formatDepartment(dept: PreparationDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getPreparationCategory(preparationId: string): string {
  try {
    const preparation = recipesStore.preparations.find(p => p.id === preparationId)
    if (!preparation) return ''

    // preparation.type is now UUID (FK to preparation_categories)
    return preparation.type
  } catch (error) {
    console.warn('Error getting preparation category:', error)
    return ''
  }
}

function getPreparationCategoryDisplay(preparationId: string): string {
  const categoryId = getPreparationCategory(preparationId)
  return getPreparationCategoryName(categoryId)
}

function getPreparationType(preparationId: string): string {
  try {
    const preparation = recipesStore.preparations.find(p => p.id === preparationId)
    if (!preparation) return 'preparation'

    // preparation.type is UUID, get display name
    return getPreparationCategoryName(preparation.type)
  } catch (error) {
    return 'preparation'
  }
}

function getPreparationIcon(preparationId: string): string {
  const categoryId = getPreparationCategory(preparationId)
  return getPreparationCategoryEmoji(categoryId)
}

// ⭐ PHASE 2: Get portion info for a preparation
function getPreparationPortionInfo(preparationId: string): {
  isPortionType: boolean
  portionSize: number | null
} {
  const preparation = recipesStore.preparations.find(p => p.id === preparationId)
  if (!preparation) return { isPortionType: false, portionSize: null }

  return {
    isPortionType: preparation.portionType === 'portion' && !!preparation.portionSize,
    portionSize: preparation.portionSize || null
  }
}

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    sauce: 'mdi-bottle-tonic',
    base: 'mdi-pot-steam',
    garnish: 'mdi-leaf',
    marinade: 'mdi-food-variant',
    dough: 'mdi-bread-slice',
    filling: 'mdi-food-drumstick',
    other: 'mdi-chef-hat'
  }
  return iconMap[category] || 'mdi-chef-hat'
}

function getCategoryColor(categoryId: string): string {
  return getPreparationCategoryColor(categoryId)
}

function formatQuantity(quantity: number, unit: string, preparationId?: string): string {
  // ⭐ PHASE 2: If preparationId provided, check for portion type
  if (preparationId) {
    const portionInfo = getPreparationPortionInfo(preparationId)
    if (portionInfo.isPortionType && portionInfo.portionSize) {
      const portions = Math.floor(quantity / portionInfo.portionSize)
      // Show only portions count (no grams)
      return `${portions} portions`
    }
  }
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

function showItemDetails(item: PreparationBalance) {
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

function handleWriteOffSuccess(message: string) {
  emit('refresh-needed')
}
</script>

<style lang="scss" scoped>
.preparation-stock-table {
  .gap-2 {
    gap: 8px;
  }

  .item-info {
    min-width: 0;
  }

  .preparation-icon {
    font-size: 18px;
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

  .bg-grey {
    background-color: rgb(var(--v-theme-surface-variant)) !important;
    color: rgb(var(--v-theme-on-surface-variant)) !important;
  }
}
</style>
