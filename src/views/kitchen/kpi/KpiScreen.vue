<!-- src/views/kitchen/kpi/KpiScreen.vue -->
<template>
  <div class="kpi-screen">
    <!-- KPI Type Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="kpi-tabs">
      <v-tab value="time">
        <v-icon icon="mdi-clock-outline" class="mr-2" />
        Time
      </v-tab>
      <v-tab value="foodcost">
        <v-icon icon="mdi-currency-usd" class="mr-2" />
        Food Cost
      </v-tab>
    </v-tabs>

    <!-- Dashboard Cards -->
    <div class="kpi-cards">
      <TimeKpiCard
        v-if="activeTab === 'time'"
        :metrics="currentRealtimeKpi"
        :department="effectiveDepartment"
        :loading="loading.today"
      />
      <FoodCostKpiCard
        v-else-if="activeTab === 'foodcost'"
        :metrics="foodCostKpi"
        :department="effectiveDepartment"
        :loading="foodCostLoading"
        :error="foodCostError"
      />
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
      <FoodCostKpiTab
        v-else-if="activeTab === 'foodcost'"
        :metrics="foodCostKpi"
        :department="effectiveDepartment"
        :loading="foodCostLoading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTimeKpi, useFoodCostKpi } from '@/stores/kitchenKpi/composables'
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

// Food Cost KPI composable
const {
  monthKpi: foodCostKpi,
  loading: foodCostLoading,
  error: foodCostError,
  loadMonthKpi
} = useFoodCostKpi(departmentRef)

// =============================================
// METHODS
// =============================================

/**
 * Load Time KPI data
 */
const loadTimeKpiData = async () => {
  DebugUtils.debug(MODULE_NAME, 'Loading Time KPI data', { department: props.selectedDepartment })
  await Promise.all([
    loadTodayKpi(apiDepartment.value),
    loadHistoricalDetail(undefined, undefined, apiDepartment.value, DETAIL_LIMIT, 0)
  ])
  detailOffset.value = DETAIL_LIMIT
}

/**
 * Load Food Cost KPI data
 */
const loadFoodCostData = async () => {
  DebugUtils.debug(MODULE_NAME, 'Loading Food Cost KPI data', {
    department: props.selectedDepartment
  })
  await loadMonthKpi()
}

/**
 * Load data based on active tab
 */
const loadData = async () => {
  if (activeTab.value === 'time') {
    await loadTimeKpiData()
  } else if (activeTab.value === 'foodcost') {
    await loadFoodCostData()
  }
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

// Load data when switching tabs
watch(activeTab, () => {
  loadData()
})

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

.kpi-tabs {
  flex-shrink: 0;
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.kpi-content {
  display: flex;
  flex-direction: column;
}

/* Responsive */
@media (max-width: 768px) {
  .kpi-screen {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }
}
</style>
