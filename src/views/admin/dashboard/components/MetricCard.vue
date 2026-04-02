<!-- src/views/admin/dashboard/components/MetricCard.vue -->
<template>
  <div class="metric-card">
    <div class="metric-icon-wrap">
      <v-icon :size="20" :color="color">{{ icon }}</v-icon>
    </div>
    <div class="metric-info">
      <div class="metric-label">{{ label }}</div>
      <div class="metric-value">{{ formattedValue }}</div>
    </div>
    <div v-if="delta != null" :class="['metric-delta', deltaClass]">
      <v-icon size="14">{{ deltaIcon }}</v-icon>
      <span>{{ formattedDelta }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils'

const props = defineProps<{
  label: string
  value: number
  icon: string
  color?: string
  format?: 'currency' | 'number' | 'percent'
  delta?: number | null
  invertDelta?: boolean // true = lower is better (e.g., food cost)
}>()

const formattedValue = computed(() => {
  switch (props.format) {
    case 'currency':
      return formatIDR(props.value)
    case 'percent':
      return `${props.value.toFixed(1)}%`
    case 'number':
    default:
      return props.value.toLocaleString()
  }
})

const formattedDelta = computed(() => {
  if (props.delta == null) return ''
  const abs = Math.abs(props.delta)
  // For percent format, show percentage points
  if (props.format === 'percent') return `${abs}%`
  return `${abs}%`
})

const deltaClass = computed(() => {
  if (props.delta == null || props.delta === 0) return 'neutral'
  const positive = props.delta > 0
  const good = props.invertDelta ? !positive : positive
  return good ? 'positive' : 'negative'
})

const deltaIcon = computed(() => {
  if (props.delta == null || props.delta === 0) return 'mdi-minus'
  return props.delta > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
})
</script>

<style scoped lang="scss">
.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  min-width: 0;
}

.metric-icon-wrap {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  font-size: 17px;
  font-weight: 700;
  margin-top: 2px;
  white-space: nowrap;
}

.metric-delta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 6px;

  &.positive {
    color: #4caf50;
    background: rgba(76, 175, 80, 0.12);
  }

  &.negative {
    color: #ef5350;
    background: rgba(239, 83, 80, 0.12);
  }

  &.neutral {
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
}
</style>
