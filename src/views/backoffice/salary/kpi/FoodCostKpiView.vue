<!-- src/views/backoffice/salary/kpi/FoodCostKpiView.vue -->
<template>
  <v-container fluid class="food-cost-kpi-view">
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center gap-4">
        <v-btn icon variant="text" @click="router.back()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div>
          <h1 class="text-h5 mb-1">Food Cost KPI</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">Monthly COGS analysis by department</p>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          label="Month"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="selectedDepartment"
          :items="departmentOptions"
          label="Department"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3" class="d-flex align-center">
        <v-btn color="primary" :loading="loading" @click="loadData">
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- KPI Card -->
    <v-row class="mb-4">
      <v-col cols="12">
        <FoodCostKpiCard
          :metrics="monthKpi"
          :department="apiDepartment || 'all'"
          :loading="loading"
          :error="error"
        />
      </v-col>
    </v-row>

    <!-- COGS Breakdown Table -->
    <v-row>
      <v-col cols="12">
        <FoodCostKpiTab
          :metrics="monthKpi"
          :department="apiDepartment || 'all'"
          :loading="loading"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFoodCostKpi } from '@/stores/kitchenKpi/composables'
import FoodCostKpiCard from '@/views/kitchen/kpi/components/FoodCostKpiCard.vue'
import FoodCostKpiTab from '@/views/kitchen/kpi/components/FoodCostKpiTab.vue'

const router = useRouter()

// =============================================
// STATE
// =============================================

const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM format
const selectedDepartment = ref<'all' | 'kitchen' | 'bar'>('all')

// Generate last 12 months for selection
const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = date.toISOString().slice(0, 7)
    const title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ title, value })
  }
  return options
})

const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

// =============================================
// COMPUTED
// =============================================

const apiDepartment = computed(() => {
  return selectedDepartment.value === 'all' ? null : selectedDepartment.value
})

// =============================================
// COMPOSABLES
// =============================================

const departmentRef = computed(() => selectedDepartment.value)

const { monthKpi, loading, error, loadMonthKpi } = useFoodCostKpi(departmentRef)

// =============================================
// METHODS
// =============================================

const loadData = async () => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1, 15) // Middle of month
  await loadMonthKpi(date)
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.food-cost-kpi-view {
  padding: var(--spacing-lg);
}
</style>
