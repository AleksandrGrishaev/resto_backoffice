<!-- src/views/admin/dashboard/widgets/SummaryWidget.vue -->
<template>
  <WidgetCard title="Summary" icon="mdi-chart-box-outline" size="full" :loading="loading">
    <div class="summary-grid">
      <MetricCard
        label="Gross Revenue"
        :value="summary.grossRevenue"
        icon="mdi-cash-register"
        color="primary"
        format="currency"
        :delta="summary.revenueDelta"
      />
      <MetricCard
        label="Net Revenue"
        :value="summary.netRevenue"
        icon="mdi-cash"
        color="success"
        format="currency"
      />
      <MetricCard
        label="Orders"
        :value="summary.totalOrders"
        icon="mdi-receipt"
        color="info"
        format="number"
        :delta="summary.ordersDelta"
      />
      <MetricCard
        label="Guests"
        :value="summary.totalGuests"
        icon="mdi-account-group"
        color="secondary"
        format="number"
      />
      <MetricCard
        label="Avg Check / Guest"
        :value="summary.avgCheckPerGuest"
        icon="mdi-account-cash"
        color="warning"
        format="currency"
        :delta="summary.avgCheckDelta"
      />
      <MetricCard
        label="Food Cost"
        :value="summary.foodCostPercent"
        icon="mdi-food"
        color="error"
        format="percent"
        :delta="summary.foodCostDelta"
        invert-delta
      />
      <MetricCard
        label="Discounts"
        :value="summary.totalDiscounts"
        icon="mdi-tag-minus"
        color="warning"
        format="currency"
      />
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import type { DaySummary } from '../types'
import WidgetCard from '../components/WidgetCard.vue'
import MetricCard from '../components/MetricCard.vue'

defineProps<{
  summary: DaySummary
  loading: boolean
}>()
</script>

<style scoped lang="scss">
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
</style>
