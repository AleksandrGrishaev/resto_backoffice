<!-- src/views/kitchen/preparation/components/StockListTab.vue -->
<!-- Stock List Tab - Shows preparation inventory with search and filters -->
<template>
  <div class="stock-tab">
    <!-- Toolbar -->
    <div class="stock-toolbar">
      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        density="compact"
        variant="outlined"
        placeholder="Search preparations..."
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        class="search-field"
      />

      <!-- Storage Location Filter -->
      <v-btn-toggle
        v-model="storageFilter"
        mandatory
        density="compact"
        color="primary"
        class="storage-filter"
      >
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="fridge" size="small">
          <v-icon start size="small">mdi-fridge</v-icon>
          Fridge
        </v-btn>
        <v-btn value="shelf" size="small">
          <v-icon start size="small">mdi-archive</v-icon>
          Shelf
        </v-btn>
        <v-btn value="freezer" size="small">
          <v-icon start size="small">mdi-snowflake</v-icon>
          Freezer
        </v-btn>
      </v-btn-toggle>

      <!-- Status Filter -->
      <v-btn-toggle v-model="statusFilter" density="compact" color="warning" class="status-filter">
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="low" size="small">
          <v-icon start size="small" color="warning">mdi-alert</v-icon>
          Low
        </v-btn>
        <v-btn value="expiring" size="small">
          <v-icon start size="small" color="error">mdi-clock-alert</v-icon>
          Expiring
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="stock-loading">
      <v-progress-circular indeterminate size="32" />
      <span class="ml-2">Loading stock data...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredBalances.length === 0" class="stock-empty">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant</v-icon>
      <h3 class="text-h6 mb-2">No Preparations Found</h3>
      <p class="text-body-2 text-medium-emphasis">
        <template v-if="searchQuery || storageFilter !== 'all' || statusFilter !== 'all'">
          No preparations match your filters.
          <v-btn variant="text" color="primary" @click="clearFilters">Clear Filters</v-btn>
        </template>
        <template v-else>No preparations available in your department.</template>
      </p>
    </div>

    <!-- Stock List grouped by category -->
    <div v-else class="stock-list">
      <template v-for="group in groupedBalances" :key="group.categoryId">
        <div class="category-section">
          <div class="category-header" @click="toggleCategory(group.categoryId)">
            <v-icon size="14" :class="{ rotated: collapsedCategories.has(group.categoryId) }">
              mdi-chevron-down
            </v-icon>
            <span class="category-emoji">{{ group.categoryEmoji }}</span>
            <span class="category-name">{{ group.categoryName }}</span>
            <span class="category-count text-medium-emphasis">({{ group.items.length }})</span>
            <span class="category-summary">
              <span v-if="group.expiredCount" class="text-error">
                {{ group.expiredCount }} expired
              </span>
              <span v-if="group.lowCount" class="text-warning">{{ group.lowCount }} low</span>
            </span>
          </div>
          <template v-if="!collapsedCategories.has(group.categoryId)">
            <StockItemCard
              v-for="balance in group.items"
              :key="balance.preparationId"
              :balance="balance"
              @produce="handleProduce"
              @write-off="handleWriteOff"
              @view-details="handleViewDetails"
            />
          </template>
        </div>
      </template>
    </div>

    <!-- Summary Footer -->
    <div v-if="filteredBalances.length > 0" class="stock-footer">
      <span class="text-caption text-medium-emphasis">
        Showing {{ filteredBalances.length }} of {{ balances.length }} preparations
      </span>
      <span v-if="lowStockCount > 0" class="text-caption text-warning ml-4">
        {{ lowStockCount }} low stock
      </span>
      <span v-if="expiringCount > 0" class="text-caption text-error ml-4">
        {{ expiringCount }} expiring soon
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import StockItemCard from './StockItemCard.vue'
import { useRecipesStore } from '@/stores/recipes'
import type { PreparationBalance } from '@/stores/preparation/types'

// =============================================
// PROPS
// =============================================

interface Props {
  balances: PreparationBalance[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  produce: [preparationId: string]
  'write-off': [preparationId: string]
  'view-details': [balance: PreparationBalance]
}>()

// =============================================
// STATE
// =============================================

const searchQuery = ref('')
const storageFilter = ref<'all' | 'fridge' | 'shelf' | 'freezer'>('all')
const statusFilter = ref<'all' | 'low' | 'expiring'>('all')

// =============================================
// COMPUTED
// =============================================

/**
 * Filtered balances based on search and filters
 */
const filteredBalances = computed<PreparationBalance[]>(() => {
  let result = props.balances

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(b => b.preparationName.toLowerCase().includes(query))
  }

  // Storage location filter: show only preparations that have stock in the selected location
  if (storageFilter.value !== 'all') {
    result = result.filter(b =>
      b.batches?.some(
        batch => batch.currentQuantity > 0 && batch.storageLocation === storageFilter.value
      )
    )
  }

  // Status filter
  if (statusFilter.value === 'low') {
    result = result.filter(b => b.belowMinStock || b.totalQuantity === 0)
  } else if (statusFilter.value === 'expiring') {
    result = result.filter(b => b.hasNearExpiry || b.hasExpired)
  }

  // Sort: problematic items first, then alphabetically
  return result.sort((a, b) => {
    // Expired first
    if (a.hasExpired && !b.hasExpired) return -1
    if (!a.hasExpired && b.hasExpired) return 1

    // Near expiry second
    if (a.hasNearExpiry && !b.hasNearExpiry) return -1
    if (!a.hasNearExpiry && b.hasNearExpiry) return 1

    // Low stock third
    if (a.belowMinStock && !b.belowMinStock) return -1
    if (!a.belowMinStock && b.belowMinStock) return 1

    // Out of stock
    if (a.totalQuantity === 0 && b.totalQuantity > 0) return -1
    if (a.totalQuantity > 0 && b.totalQuantity === 0) return 1

    // Alphabetically
    return a.preparationName.localeCompare(b.preparationName)
  })
})

/**
 * Count of low stock items
 */
const lowStockCount = computed(() => {
  return props.balances.filter(b => b.belowMinStock || b.totalQuantity === 0).length
})

/**
 * Count of expiring items
 */
const expiringCount = computed(() => {
  return props.balances.filter(b => b.hasNearExpiry || b.hasExpired).length
})

// =============================================
// CATEGORY GROUPING
// =============================================

const recipesStore = useRecipesStore()
const collapsedCategories = reactive(new Set<string>())

interface BalanceGroup {
  categoryId: string
  categoryName: string
  categoryEmoji: string
  items: PreparationBalance[]
  expiredCount: number
  lowCount: number
}

const groupedBalances = computed<BalanceGroup[]>(() => {
  const groups = new Map<string, BalanceGroup>()

  for (const balance of filteredBalances.value) {
    const preparation = recipesStore.preparations.find(p => p.id === balance.preparationId)
    const categoryId = preparation?.type || '__uncategorized__'

    if (!groups.has(categoryId)) {
      groups.set(categoryId, {
        categoryId,
        categoryName: recipesStore.getPreparationCategoryName(categoryId),
        categoryEmoji: recipesStore.getPreparationCategoryEmoji(categoryId),
        items: [],
        expiredCount: 0,
        lowCount: 0
      })
    }

    const group = groups.get(categoryId)!
    group.items.push(balance)
    if (balance.hasExpired) group.expiredCount++
    if (balance.belowMinStock || balance.totalQuantity === 0) group.lowCount++
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Groups with problems first
    const aProblems = a.expiredCount + a.lowCount
    const bProblems = b.expiredCount + b.lowCount
    if (aProblems !== bProblems) return bProblems - aProblems
    return a.categoryName.localeCompare(b.categoryName)
  })
})

function toggleCategory(categoryId: string): void {
  if (collapsedCategories.has(categoryId)) {
    collapsedCategories.delete(categoryId)
  } else {
    collapsedCategories.add(categoryId)
  }
}

// =============================================
// METHODS
// =============================================

function clearFilters(): void {
  searchQuery.value = ''
  storageFilter.value = 'all'
  statusFilter.value = 'all'
}

function handleProduce(preparationId: string): void {
  emit('produce', preparationId)
}

function handleWriteOff(preparationId: string): void {
  emit('write-off', preparationId)
}

function handleViewDetails(balance: PreparationBalance): void {
  emit('view-details', balance)
}
</script>

<style scoped lang="scss">
.stock-tab {
  display: flex;
  flex-direction: column;
}

.stock-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-wrap: wrap;
}

.search-field {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.storage-filter,
.status-filter {
  flex-shrink: 0;
}

.stock-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--v-theme-on-surface);
}

.stock-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.stock-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-section {
  margin-bottom: 4px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  margin-bottom: 6px;

  &:active {
    background-color: rgba(var(--v-theme-on-surface), 0.1);
  }

  .v-icon {
    transition: transform 0.2s;

    &.rotated {
      transform: rotate(-90deg);
    }
  }
}

.category-emoji {
  font-size: 16px;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
}

.category-count {
  font-size: 12px;
}

.category-summary {
  margin-left: auto;
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-weight: 500;
}

.stock-footer {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--v-theme-surface);
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 768px) {
  .stock-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .search-field {
    max-width: none;
  }

  .storage-filter,
  .status-filter {
    width: 100%;
    justify-content: center;
  }
}
</style>
