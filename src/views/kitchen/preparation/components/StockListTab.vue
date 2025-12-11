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

    <!-- Stock List -->
    <div v-else class="stock-list">
      <StockItemCard
        v-for="balance in filteredBalances"
        :key="balance.preparationId"
        :balance="balance"
        @produce="handleProduce"
        @write-off="handleWriteOff"
      />
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
import { ref, computed } from 'vue'
import StockItemCard from './StockItemCard.vue'
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

  // Storage location filter (if we had storage location data)
  // Note: This would need storage location field in PreparationBalance
  // For now, we skip this filter if not 'all'
  // if (storageFilter.value !== 'all') {
  //   result = result.filter(b => b.storageLocation === storageFilter.value)
  // }

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
</script>

<style scoped lang="scss">
.stock-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex scroll containers */
  height: 100%;
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
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0; /* Important for flex scroll containers */
  -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
  overscroll-behavior: contain; /* Prevent scroll chaining */
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
