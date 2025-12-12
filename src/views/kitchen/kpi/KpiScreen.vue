<!-- src/views/kitchen/kpi/KpiScreen.vue -->
<template>
  <div class="kpi-screen">
    <!-- Header -->
    <div class="kpi-header">
      <h1 class="kpi-title">Kitchen KPI</h1>
      <div class="kpi-header-actions">
        <v-btn-toggle v-model="activeTab" mandatory density="compact" color="primary">
          <v-btn value="time" size="small">
            <v-icon start size="18">mdi-clock-outline</v-icon>
            Time
          </v-btn>
          <v-btn value="foodcost" size="small" disabled>
            <v-icon start size="18">mdi-currency-usd</v-icon>
            Food Cost
          </v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="kpi-cards">
      <TimeKpiCard
        v-if="activeTab === 'time'"
        :metrics="currentRealtimeKpi"
        :department="effectiveDepartment"
        :loading="loading.today"
      />
      <FoodCostKpiCard v-else-if="activeTab === 'foodcost'" />
    </div>

    <!-- Detail Tabs -->
    <div class="kpi-content">
      <TimeKpiTab
        v-if="activeTab === 'time'"
        :metrics="currentRealtimeKpi"
        :historical-detail="historicalDetail"
        :loading="loading.detail"
        :department="effectiveDepartment"
        @load-more="handleLoadMore"
      />
      <FoodCostKpiTab v-else-if="activeTab === 'foodcost'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTimeKpi } from '@/stores/kitchenKpi/composables'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import TimeKpiCard from './components/TimeKpiCard.vue'
import TimeKpiTab from './components/TimeKpiTab.vue'
import FoodCostKpiCard from './components/FoodCostKpiCard.vue'
import FoodCostKpiTab from './components/FoodCostKpiTab.vue'

const MODULE_NAME = 'KpiScreen'

// =============================================
// PROPS
// =============================================

interface Props {
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

const props = withDefaults(defineProps<Props>(), {
  selectedDepartment: 'all'
})

// =============================================
// STORES
// =============================================

const authStore = useAuthStore()

// =============================================
// STATE
// =============================================

const activeTab = ref<'time' | 'foodcost'>('time')
const detailOffset = ref(0)
const DETAIL_LIMIT = 50

// =============================================
// COMPUTED
// =============================================

/**
 * Effective department based on user role
 * - Admin: can see all or selected department
 * - Kitchen staff: only kitchen
 * - Bar staff: only bar
 */
const effectiveDepartment = computed((): 'all' | 'kitchen' | 'bar' => {
  const roles = authStore.userRoles
  const isAdmin = roles.includes('admin')

  // Admin can select any department
  if (isAdmin) {
    return props.selectedDepartment
  }

  // Kitchen staff - only kitchen
  if (roles.includes('kitchen')) {
    return 'kitchen'
  }

  // Bar staff - only bar
  if (roles.includes('bar')) {
    return 'bar'
  }

  // Default to kitchen
  return 'kitchen'
})

// Convert to API format (null for 'all')
const apiDepartment = computed(() => {
  return effectiveDepartment.value === 'all' ? null : effectiveDepartment.value
})

// =============================================
// COMPOSABLES
// =============================================

// Create a ref for department to pass to useTimeKpi
const departmentRef = computed(() => effectiveDepartment.value)

const { currentRealtimeKpi, historicalDetail, loading, loadHistoricalDetail, loadTodayKpi } =
  useTimeKpi(departmentRef)

// =============================================
// METHODS
// =============================================

/**
 * Load initial data
 */
const loadData = async () => {
  DebugUtils.debug(MODULE_NAME, 'Loading KPI data', { department: props.selectedDepartment })
  await Promise.all([
    loadTodayKpi(apiDepartment.value),
    loadHistoricalDetail(undefined, undefined, apiDepartment.value, DETAIL_LIMIT, 0)
  ])
  detailOffset.value = DETAIL_LIMIT
}

/**
 * Handle load more for pagination
 */
const handleLoadMore = async () => {
  await loadHistoricalDetail(
    undefined,
    undefined,
    apiDepartment.value,
    DETAIL_LIMIT,
    detailOffset.value
  )
  detailOffset.value += DETAIL_LIMIT
}

// =============================================
// WATCHERS
// =============================================

// Reload data when department changes
watch(
  () => props.selectedDepartment,
  () => {
    detailOffset.value = 0
    loadData()
  }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.kpi-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
  overflow-y: auto;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.kpi-title {
  font-size: var(--text-xl);
  font-weight: 600;
  margin: 0;
}

.kpi-header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.kpi-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Responsive */
@media (max-width: 768px) {
  .kpi-screen {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .kpi-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .kpi-title {
    font-size: var(--text-lg);
  }
}
</style>
