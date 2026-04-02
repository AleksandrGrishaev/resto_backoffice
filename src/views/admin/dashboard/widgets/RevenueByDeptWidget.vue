<!-- src/views/admin/dashboard/widgets/RevenueByDeptWidget.vue -->
<template>
  <WidgetCard
    title="Revenue by Department"
    icon="mdi-chart-timeline-variant"
    size="large"
    :loading="loading"
  >
    <div v-if="hasData" class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="no-data">No revenue data for this period</div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { TimeUtils } from '@/utils'
import type { DepartmentRevenue } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend)

const props = defineProps<{
  revenueByDepartment: DepartmentRevenue[]
  loading: boolean
}>()

const hasData = computed(() => props.revenueByDepartment.length > 0)

const deptColors: Record<string, string> = {
  kitchen: '#ff9676',
  bar: '#76b0ff',
  other: '#92c9af'
}

const chartData = computed(() => {
  if (!hasData.value) return { labels: [], datasets: [] }

  // Get unique sorted dates and departments
  const dates = [...new Set(props.revenueByDepartment.map(r => r.date))].sort()
  const departments = [...new Set(props.revenueByDepartment.map(r => r.department))]

  // Build lookup
  const lookup = new Map<string, number>()
  for (const r of props.revenueByDepartment) {
    lookup.set(`${r.date}|${r.department}`, r.revenue)
  }

  const labels = dates.map(d => TimeUtils.formatDateForDisplay(d))

  const datasets = departments.map(dept => ({
    label: capitalize(dept),
    data: dates.map(d => lookup.get(`${d}|${dept}`) || 0),
    borderColor: deptColors[dept] || '#a395e9',
    backgroundColor: (deptColors[dept] || '#a395e9') + '20',
    borderWidth: 2,
    pointRadius: dates.length <= 7 ? 4 : 2,
    pointHoverRadius: 6,
    tension: 0.3,
    fill: true
  }))

  return { labels, datasets }
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
      padding: 10,
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: Rp ${Number(ctx.raw).toLocaleString()}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)',
        font: { size: 10 },
        callback: (val: any) => `Rp ${(val / 1000).toFixed(0)}k`
      },
      beginAtZero: true
    }
  }
}))

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
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
  height: 120px;
  opacity: 0.4;
  font-size: 13px;
}
</style>
