<!-- src/views/admin/dashboard/widgets/LoyaltySalesWidget.vue -->
<template>
  <WidgetCard title="Customer Loyalty" icon="mdi-account-heart" size="medium" :loading="loading">
    <div v-if="hasData" class="loyalty-content">
      <!-- Donut -->
      <div class="chart-wrap">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>

      <!-- Legend / breakdown -->
      <div class="loyalty-list">
        <div v-for="item in loyaltySales" :key="item.type" class="loyalty-row">
          <div class="loyalty-dot" :style="{ background: getColor(item.type) }" />
          <div class="loyalty-info">
            <span class="loyalty-label">{{ getLabel(item.type) }}</span>
            <span class="loyalty-meta">{{ item.orders }} orders</span>
          </div>
          <div class="loyalty-value">{{ formatIDR(item.revenue) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="no-data">No customer data</div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { formatIDR } from '@/utils'
import type { LoyaltySale } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps<{
  loyaltySales: LoyaltySale[]
  loading: boolean
}>()

const hasData = computed(() => props.loyaltySales.some(l => l.orders > 0))

const colors: Record<string, string> = {
  anonymous: '#666',
  cashback: '#a395e9',
  stamp_card: '#92c9af'
}

function getColor(type: string): string {
  return colors[type] || '#76b0ff'
}

function getLabel(type: string): string {
  const map: Record<string, string> = {
    anonymous: 'No Loyalty',
    cashback: 'Cashback',
    stamp_card: 'Stamp Card'
  }
  return map[type] || type
}

const chartData = computed(() => ({
  labels: props.loyaltySales.map(l => getLabel(l.type)),
  datasets: [
    {
      data: props.loyaltySales.map(l => l.revenue),
      backgroundColor: props.loyaltySales.map(l => getColor(l.type)),
      borderWidth: 0,
      cutout: '65%'
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
</script>

<style scoped lang="scss">
.loyalty-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-wrap {
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loyalty-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loyalty-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.loyalty-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.loyalty-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.loyalty-label {
  font-size: 13px;
  font-weight: 600;
}

.loyalty-meta {
  font-size: 11px;
  opacity: 0.4;
}

.loyalty-value {
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
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
