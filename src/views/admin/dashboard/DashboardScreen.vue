<!-- src/views/admin/dashboard/DashboardScreen.vue -->
<template>
  <div class="dashboard-screen">
    <DashboardHeader
      :range="dateRange"
      :period-type="periodType"
      @update:range="dateRange = $event"
      @update:period-type="periodType = $event"
      @toggle-settings="showSettings = !showSettings"
    />

    <div class="dashboard-body">
      <!-- Widget settings panel -->
      <v-slide-x-reverse-transition>
        <div v-if="showSettings" class="settings-panel">
          <div class="settings-header">
            <span class="settings-title">Widgets</span>
            <v-btn icon variant="text" size="x-small" @click="showSettings = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
          <div class="settings-list">
            <div v-for="def in widgetDefs" :key="def.id" class="settings-item">
              <v-switch
                :model-value="isWidgetVisible(def.id)"
                color="primary"
                density="compact"
                hide-details
                @update:model-value="toggleWidget(def.id, $event as boolean)"
              />
              <v-icon size="16" class="mr-1">{{ def.icon }}</v-icon>
              <span class="settings-item-label">{{ def.title }}</span>
            </div>
          </div>
        </div>
      </v-slide-x-reverse-transition>

      <!-- Error banner -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-3"
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>

      <!-- Widgets grid -->
      <div class="widgets-grid">
        <SummaryWidget
          v-if="isWidgetVisible('summary')"
          :summary="data.summary"
          :loading="loading"
        />
        <HourlySalesWidget
          v-if="isWidgetVisible('hourly-sales')"
          :hourly-sales="data.hourlySales"
          :staff-by-hour="data.staffByHour"
          :loading="loading"
        />
        <RevenueByDeptWidget
          v-if="isWidgetVisible('revenue-by-dept')"
          :revenue-by-department="data.revenueByDepartment"
          :loading="loading"
        />
        <WriteOffsWidget
          v-if="isWidgetVisible('write-offs')"
          :write-offs="data.writeOffs"
          :loading="loading"
        />
        <PaymentMethodsWidget
          v-if="isWidgetVisible('payment-methods')"
          :payment-methods="data.paymentMethods"
          :loading="loading"
        />
        <DepartmentSalesWidget
          v-if="isWidgetVisible('department-sales')"
          :department-sales="data.departmentSales"
          :loading="loading"
        />
        <ChannelSalesWidget
          v-if="isWidgetVisible('channel-sales')"
          :channel-sales="data.channelSales"
          :loading="loading"
        />
        <LoyaltySalesWidget
          v-if="isWidgetVisible('loyalty-sales')"
          :loyalty-sales="data.loyaltySales"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { TimeUtils } from '@/utils'
import DashboardHeader from './components/DashboardHeader.vue'
import SummaryWidget from './widgets/SummaryWidget.vue'
import HourlySalesWidget from './widgets/HourlySalesWidget.vue'
import RevenueByDeptWidget from './widgets/RevenueByDeptWidget.vue'
import WriteOffsWidget from './widgets/WriteOffsWidget.vue'
import PaymentMethodsWidget from './widgets/PaymentMethodsWidget.vue'
import DepartmentSalesWidget from './widgets/DepartmentSalesWidget.vue'
import ChannelSalesWidget from './widgets/ChannelSalesWidget.vue'
import LoyaltySalesWidget from './widgets/LoyaltySalesWidget.vue'
import { fetchDashboardData } from './services/dashboardService'
import { WIDGET_DEFINITIONS } from './types'
import type { DashboardData, DashboardConfig, PeriodType, DateRange } from './types'

const STORAGE_KEY = 'admin_dashboard_config'

const widgetDefs = WIDGET_DEFINITIONS

const loading = ref(false)
const error = ref('')
const showSettings = ref(false)

const today = TimeUtils.getCurrentLocalDate()
const periodType = ref<PeriodType>('day')
const dateRange = ref<DateRange>({ from: today, to: today })

const emptyData: DashboardData = {
  summary: {
    grossRevenue: 0,
    netRevenue: 0,
    totalOrders: 0,
    totalGuests: 0,
    avgCheckPerGuest: 0,
    foodCostPercent: 0,
    totalFoodCost: 0,
    totalDiscounts: 0,
    totalTax: 0,
    revenueDelta: null,
    ordersDelta: null,
    avgCheckDelta: null,
    foodCostDelta: null
  },
  hourlySales: [],
  staffByHour: [],
  writeOffs: { total: 0, byType: [], byDepartment: [] },
  paymentMethods: { cash: 0, card: 0, qr: 0 },
  departmentSales: [],
  revenueByDepartment: [],
  channelSales: [],
  loyaltySales: []
}

const data = ref<DashboardData>({ ...emptyData })

// Widget config from localStorage
const widgetConfig = ref<DashboardConfig>(loadConfig())

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardConfig
      // Merge with current definitions (handle new widgets)
      const existingIds = new Set(parsed.widgets.map(w => w.id))
      for (const def of WIDGET_DEFINITIONS) {
        if (!existingIds.has(def.id)) {
          parsed.widgets.push({ id: def.id, visible: true })
        }
      }
      return parsed
    }
  } catch {
    /* ignore */
  }
  return {
    widgets: WIDGET_DEFINITIONS.map(w => ({ id: w.id, visible: true }))
  }
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetConfig.value))
}

function isWidgetVisible(id: string): boolean {
  const w = widgetConfig.value.widgets.find(w => w.id === id)
  return w ? w.visible : true
}

function toggleWidget(id: string, visible: boolean) {
  const w = widgetConfig.value.widgets.find(w => w.id === id)
  if (w) {
    w.visible = visible
    saveConfig()
  }
}

// Race condition guard: ignore stale responses on rapid date switching
let requestId = 0

async function loadData() {
  const currentRequest = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await fetchDashboardData(dateRange.value)
    // Only apply if this is still the latest request
    if (currentRequest !== requestId) return
    data.value = result
  } catch (e: any) {
    if (currentRequest !== requestId) return
    console.error('Dashboard load error:', e)
    error.value = `Failed to load dashboard data: ${e?.message || 'Unknown error'}`
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
    }
  }
}

watch(dateRange, () => loadData(), { deep: true })

onMounted(() => loadData())
</script>

<style scoped lang="scss">
.dashboard-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
  position: relative;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

// Settings panel
.settings-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  background: rgba(26, 26, 30, 0.98);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.settings-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-item-label {
  font-size: 13px;
}

@media (max-width: 1100px) {
  .widgets-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-body {
    padding: 12px;
  }
}
</style>
