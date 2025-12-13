<!-- src/views/kitchen/preparation/components/HistoryTab.vue -->
<!-- History Tab - Shows completed production tasks and write-offs for today -->
<template>
  <div class="history-tab">
    <!-- Loading State -->
    <div v-if="loading" class="history-loading">
      <v-progress-circular indeterminate size="32" />
      <span class="ml-2">Loading history...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="history-error">
      <v-icon size="48" color="error" class="mb-3">mdi-alert-circle-outline</v-icon>
      <p class="text-body-2 text-error mb-3">{{ error }}</p>
      <v-btn variant="outlined" color="primary" size="small" @click="refreshHistory">
        <v-icon start>mdi-refresh</v-icon>
        Retry
      </v-btn>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredItems.length === 0" class="history-empty">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-history</v-icon>
      <h3 class="text-h6 mb-2">No Operations Today</h3>
      <p class="text-body-2 text-medium-emphasis">
        {{ emptyStateMessage }}
      </p>
    </div>

    <!-- History Content -->
    <div v-else class="history-content">
      <!-- Summary Card -->
      <v-card variant="tonal" :color="summaryColor" class="mb-4">
        <v-card-text class="py-3">
          <!-- Summary Stats Row -->
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center">
              <v-icon size="24" class="mr-3">mdi-chart-timeline-variant</v-icon>
              <div>
                <div class="text-h6 font-weight-bold">{{ totalCount }} Operations</div>
                <div class="text-caption">Today's activity</div>
              </div>
            </div>
          </div>

          <!-- Stats Pills -->
          <div class="d-flex flex-wrap gap-2">
            <v-chip color="success" size="small" variant="flat">
              <v-icon start size="14">mdi-check-circle</v-icon>
              {{ productionCount }} Produced ({{ formattedTotalProduced }})
            </v-chip>
            <v-chip v-if="writeOffCount > 0" color="error" size="small" variant="flat">
              <v-icon start size="14">mdi-delete-outline</v-icon>
              {{ writeOffCount }} Written Off
            </v-chip>
          </div>
        </v-card-text>
      </v-card>

      <!-- Filter Chips -->
      <div class="filter-chips mb-4">
        <v-chip-group v-model="selectedFilter" mandatory>
          <v-chip
            value="all"
            :color="filter === 'all' ? 'primary' : undefined"
            variant="outlined"
            filter
          >
            All ({{ totalCount }})
          </v-chip>
          <v-chip
            value="production"
            :color="filter === 'production' ? 'success' : undefined"
            variant="outlined"
            filter
          >
            Productions ({{ productionCount }})
          </v-chip>
          <v-chip
            value="writeoff"
            :color="filter === 'writeoff' ? 'error' : undefined"
            variant="outlined"
            filter
          >
            Write-offs ({{ writeOffCount }})
          </v-chip>
        </v-chip-group>
      </div>

      <!-- History List -->
      <div class="history-list">
        <HistoryItemCard v-for="item in filteredItems" :key="item.id" :item="item" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import HistoryItemCard from './HistoryItemCard.vue'
import { useHistoryTab } from '@/stores/kitchenKpi'
import type { HistoryFilterType } from '@/stores/kitchenKpi'

// =============================================
// PROPS
// =============================================

interface Props {
  department?: 'kitchen' | 'bar' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  department: 'all'
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  (e: 'count-change', count: number): void
}>()

// =============================================
// COMPOSABLE
// =============================================

const {
  filteredItems,
  loading,
  error,
  filter,
  totalCount,
  productionCount,
  writeOffCount,
  formattedTotalProduced,
  loadHistory,
  refreshHistory,
  setFilter
} = useHistoryTab(props.department)

// =============================================
// COMPUTED
// =============================================

/**
 * v-model for filter chip group
 */
const selectedFilter = computed({
  get: () => filter.value,
  set: (value: HistoryFilterType) => setFilter(value)
})

/**
 * Summary card color based on content
 */
const summaryColor = computed(() => {
  if (writeOffCount.value > productionCount.value) return 'warning'
  return 'success'
})

/**
 * Empty state message based on filter
 */
const emptyStateMessage = computed(() => {
  if (filter.value === 'production') {
    return 'No production tasks completed today.'
  }
  if (filter.value === 'writeoff') {
    return 'No write-offs recorded today.'
  }
  return 'Completed productions and write-offs will appear here.'
})

// =============================================
// WATCHERS
// =============================================

// Emit count change when totalCount changes
watch(
  totalCount,
  count => {
    emit('count-change', count)
  },
  { immediate: true }
)

// Reload when department changes
watch(
  () => props.department,
  () => {
    loadHistory()
  }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadHistory()
})

// =============================================
// EXPOSE
// =============================================

defineExpose({
  refreshHistory,
  totalCount
})
</script>

<style scoped lang="scss">
.history-tab {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.history-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--v-theme-on-surface);
}

.history-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.history-content {
  display: flex;
  flex-direction: column;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gap-2 {
  gap: 8px;
}
</style>
