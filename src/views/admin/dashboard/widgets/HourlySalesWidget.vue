<!-- src/views/admin/dashboard/widgets/HourlySalesWidget.vue -->
<template>
  <WidgetCard title="Sales by Hour" icon="mdi-chart-bar" size="large" :loading="loading">
    <div class="chart-container">
      <Bar v-if="chartData" :data="chartData as any" :options="chartOptions as any" />
      <div v-else class="no-data">No sales data</div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatIDR } from '@/utils'
import type { DateRange, HourlySale, StaffHourly } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  hourlySales: HourlySale[]
  staffByHour: StaffHourly[]
  dateRange: DateRange
  loading: boolean
}>()

const dayCount = computed(() => {
  const d1 = new Date(props.dateRange.from)
  const d2 = new Date(props.dateRange.to)
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1)
})

const isMultiDay = computed(() => dayCount.value > 1)

/** Build per-point radius array: show dot only where count changes from previous hour */
function transitionPoints(data: number[], radius = 4): number[] {
  return data.map((v, i) => {
    if (i === 0) return v > 0 ? radius : 0
    if (v !== data[i - 1]) return radius
    // Also mark the last non-zero before a drop to 0
    if (i < data.length - 1 && data[i + 1] !== v) return radius
    return 0
  })
}

const chartData = computed(() => {
  if (!props.hourlySales.length) return null

  // Build full hour range (8-23)
  const hours = Array.from({ length: 16 }, (_, i) => i + 8)
  const salesMap = new Map(props.hourlySales.map(s => [s.hour, s]))
  const staffMap = new Map(props.staffByHour.map(s => [s.hour, s]))

  // Stacked: each line = cumulative total so you see total headcount
  // Kitchen at bottom, Bar on top of Kitchen, Service on top of both
  const kitchenData = hours.map(h => staffMap.get(h)?.kitchen || 0)
  const barData = hours.map((h, i) => kitchenData[i] + (staffMap.get(h)?.bar || 0))
  const serviceData = hours.map((h, i) => barData[i] + (staffMap.get(h)?.service || 0))

  return {
    labels: hours.map(h => `${h}:00`),
    datasets: [
      {
        type: 'bar',
        label: 'Revenue',
        data: hours.map(h => salesMap.get(h)?.revenue || 0),
        backgroundColor: 'rgba(163, 149, 233, 0.6)',
        borderColor: 'rgba(163, 149, 233, 1)',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.85,
        categoryPercentage: 0.9,
        yAxisID: 'y',
        order: 2
      },
      {
        type: 'line',
        label: 'Service staff',
        data: serviceData,
        borderColor: '#92c9af',
        backgroundColor: 'rgba(146, 201, 175, 0.12)',
        borderWidth: 2,
        pointRadius: transitionPoints(serviceData),
        pointBackgroundColor: '#92c9af',
        pointBorderColor: '#1a1a1e',
        pointBorderWidth: 2,
        stepped: 'before' as const,
        fill: 'origin',
        yAxisID: 'y1',
        order: 0
      },
      {
        type: 'line',
        label: 'Bar staff',
        data: barData,
        borderColor: '#76b0ff',
        backgroundColor: 'rgba(118, 176, 255, 0.15)',
        borderWidth: 2,
        pointRadius: transitionPoints(barData),
        pointBackgroundColor: '#76b0ff',
        pointBorderColor: '#1a1a1e',
        pointBorderWidth: 2,
        stepped: 'before' as const,
        fill: 'origin',
        yAxisID: 'y1',
        order: 0
      },
      {
        type: 'line',
        label: 'Kitchen staff',
        data: kitchenData,
        borderColor: '#ff9676',
        backgroundColor: 'rgba(255, 150, 118, 0.2)',
        borderWidth: 2,
        pointRadius: transitionPoints(kitchenData),
        pointBackgroundColor: '#ff9676',
        pointBorderColor: '#1a1a1e',
        pointBorderWidth: 2,
        stepped: 'before' as const,
        fill: 'origin',
        yAxisID: 'y1',
        order: 0
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: { size: 11 },
        boxWidth: 12,
        padding: 12
      }
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 30, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (ctx: any) => {
          if (ctx.dataset.yAxisID === 'y') {
            return ` Revenue: ${formatIDR(Number(ctx.raw))}`
          }
          // Datasets order: Revenue, Service(stacked), Bar(stacked), Kitchen(base)
          // Service = total, Bar = kitchen+bar, Kitchen = kitchen only
          // Show unstacked values in tooltip
          const items = ctx.chart.data.datasets
          const idx = ctx.dataIndex
          const serviceStacked = Number(items[1]?.data?.[idx] || 0)
          const barStacked = Number(items[2]?.data?.[idx] || 0)
          const kitchenVal = Number(items[3]?.data?.[idx] || 0)
          const barVal = barStacked - kitchenVal
          const serviceVal = serviceStacked - barStacked

          const label = ctx.dataset.label
          let val = 0
          if (label === 'Kitchen staff') val = kitchenVal
          else if (label === 'Bar staff') val = barVal
          else if (label === 'Service staff') val = serviceVal
          if (val === 0) return ''
          const suffix = isMultiDay.value ? 'h' : ''
          return ` ${label}: ${val}${suffix}`
        },
        afterBody: (items: any[]) => {
          const revenue = Number(items[0]?.raw || 0)
          // Service dataset has the total stacked value
          const totalStaff = Number(items[1]?.raw || 0)
          if (revenue > 0 && totalStaff === 0) {
            return '\n⚠ No staff scheduled — revenue present'
          }
          if (revenue === 0 && totalStaff > 0) {
            return '\n⚠ Staff on duty — no revenue'
          }
          if (revenue > 3_000_000 && totalStaff <= 2) {
            return '\n⚠ High revenue, low staffing'
          }
          return ''
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.06)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
        font: { size: 10 }
      }
    },
    y: {
      position: 'left' as const,
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
        font: { size: 10 },
        callback: (val: any) => `Rp ${(val / 1000).toFixed(0)}k`
      }
    },
    y1: {
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      ticks: {
        color: 'rgba(255, 255, 255, 0.4)',
        font: { size: 10 },
        ...(isMultiDay.value ? {} : { stepSize: 1 })
      },
      title: {
        display: true,
        text: isMultiDay.value ? 'Hours' : 'Staff',
        color: 'rgba(255, 255, 255, 0.4)',
        font: { size: 10 }
      },
      beginAtZero: true
    }
  }
}))
</script>

<style scoped lang="scss">
.chart-container {
  height: 280px;
  position: relative;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.4;
  font-size: 13px;
}
</style>
