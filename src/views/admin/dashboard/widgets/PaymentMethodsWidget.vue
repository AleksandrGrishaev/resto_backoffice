<!-- src/views/admin/dashboard/widgets/PaymentMethodsWidget.vue -->
<template>
  <WidgetCard
    title="Payment Methods"
    icon="mdi-credit-card-outline"
    size="small"
    :loading="loading"
  >
    <div v-if="hasData" class="payment-content">
      <div class="chart-wrap">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <div class="legend">
        <div v-for="item in legendItems" :key="item.label" class="legend-item">
          <div class="legend-dot" :style="{ background: item.color }" />
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-value">{{ item.formatted }}</span>
          <span class="legend-pct">{{ item.pct }}%</span>
        </div>
      </div>
    </div>
    <div v-else class="no-data">No payment data</div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { formatIDR } from '@/utils'
import type { PaymentBreakdown } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps<{
  paymentMethods: PaymentBreakdown
  loading: boolean
}>()

const total = computed(
  () => props.paymentMethods.cash + props.paymentMethods.card + props.paymentMethods.qr
)
const hasData = computed(() => total.value > 0)

const colors = {
  cash: '#92c9af',
  card: '#a395e9',
  qr: '#76b0ff'
}

const chartData = computed(() => ({
  labels: ['Cash', 'Card', 'QR'],
  datasets: [
    {
      data: [props.paymentMethods.cash, props.paymentMethods.card, props.paymentMethods.qr],
      backgroundColor: [colors.cash, colors.card, colors.qr],
      borderWidth: 0,
      cutout: '70%'
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 30, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      callbacks: {
        label: (ctx: any) => `${ctx.label}: ${formatIDR(Number(ctx.raw))}`
      }
    }
  }
}

const legendItems = computed(() => {
  const t = total.value
  return [
    {
      label: 'Cash',
      color: colors.cash,
      value: props.paymentMethods.cash,
      formatted: formatIDR(props.paymentMethods.cash),
      pct: t > 0 ? Math.round((props.paymentMethods.cash / t) * 100) : 0
    },
    {
      label: 'Card',
      color: colors.card,
      value: props.paymentMethods.card,
      formatted: formatIDR(props.paymentMethods.card),
      pct: t > 0 ? Math.round((props.paymentMethods.card / t) * 100) : 0
    },
    {
      label: 'QR',
      color: colors.qr,
      value: props.paymentMethods.qr,
      formatted: formatIDR(props.paymentMethods.qr),
      pct: t > 0 ? Math.round((props.paymentMethods.qr / t) * 100) : 0
    }
  ]
})
</script>

<style scoped lang="scss">
.payment-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chart-wrap {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 12px;
  opacity: 0.6;
  width: 40px;
}

.legend-value {
  font-size: 12px;
  font-weight: 600;
  flex: 1;
}

.legend-pct {
  font-size: 11px;
  opacity: 0.4;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  opacity: 0.4;
  font-size: 13px;
}
</style>
