<!-- src/views/admin/dashboard/components/DashboardHeader.vue -->
<template>
  <div class="dashboard-header">
    <div class="header-left">
      <h2 class="header-title">Dashboard</h2>
      <span class="header-date-label">{{ periodLabel }}</span>
    </div>

    <div class="header-actions">
      <!-- Period type selector -->
      <v-btn-toggle
        :model-value="periodType"
        mandatory
        density="compact"
        color="primary"
        class="period-toggle"
        @update:model-value="onPeriodTypeChange"
      >
        <v-btn
          v-for="preset in PERIOD_PRESETS"
          :key="preset.type"
          :value="preset.type"
          size="small"
          class="period-btn"
        >
          {{ preset.label }}
        </v-btn>
      </v-btn-toggle>

      <v-divider vertical class="mx-2" />

      <!-- Date navigation -->
      <v-btn icon variant="text" size="small" @click="navigatePrev">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>

      <v-menu v-model="showDatePicker" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" size="small" class="date-btn">
            <v-icon start size="16">mdi-calendar</v-icon>
            {{ formattedRange }}
          </v-btn>
        </template>
        <v-date-picker
          :model-value="datePickerValue"
          color="primary"
          @update:model-value="onDateSelected"
        />
      </v-menu>

      <v-btn icon variant="text" size="small" :disabled="isCurrentPeriod" @click="navigateNext">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>

      <v-btn v-if="!isCurrentPeriod" variant="text" size="small" class="today-btn" @click="goToday">
        Today
      </v-btn>

      <v-divider vertical class="mx-1" />

      <!-- Widget settings -->
      <v-btn icon variant="text" size="small" @click="emit('toggle-settings')">
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TimeUtils } from '@/utils'
import { PERIOD_PRESETS } from '../types'
import type { PeriodType, DateRange } from '../types'

const props = defineProps<{
  range: DateRange
  periodType: PeriodType
}>()

const emit = defineEmits<{
  'update:range': [range: DateRange]
  'update:periodType': [type: PeriodType]
  'toggle-settings': []
}>()

const showDatePicker = ref(false)

const today = computed(() => TimeUtils.getCurrentLocalDate())

const isCurrentPeriod = computed(() => props.range.to >= today.value)

const isSingleDay = computed(() => props.range.from === props.range.to)

const formattedRange = computed(() => {
  if (isSingleDay.value) {
    return TimeUtils.formatDateForDisplay(props.range.from)
  }
  const from = TimeUtils.formatDateForDisplay(props.range.from)
  const to = TimeUtils.formatDateForDisplay(props.range.to)
  return `${from} — ${to}`
})

const periodLabel = computed(() => {
  if (isSingleDay.value) {
    if (TimeUtils.isToday(props.range.from)) return 'Today'
    if (TimeUtils.isYesterday(props.range.from)) return 'Yesterday'
    return TimeUtils.formatDateToDisplay(props.range.from, 'EEEE')
  }
  if (props.periodType === 'week') {
    return isCurrentPeriod.value ? 'This week' : TimeUtils.formatDateForDisplay(props.range.from)
  }
  if (props.periodType === 'month')
    return TimeUtils.formatDateToDisplay(props.range.from, 'MMMM yyyy')
  return 'Custom range'
})

const datePickerValue = computed(() => new Date(props.range.from + 'T12:00:00'))

function onPeriodTypeChange(type: PeriodType) {
  emit('update:periodType', type)
  const range = buildRange(type, today.value)
  emit('update:range', range)
}

function onDateSelected(val: any) {
  if (!val) return
  const d = val instanceof Date ? val : new Date(val)
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const range = buildRange(props.periodType, dateStr)
  emit('update:range', range)
  showDatePicker.value = false
}

function navigatePrev() {
  const range = shiftRange(props.range, props.periodType, -1)
  emit('update:range', range)
}

function navigateNext() {
  const range = shiftRange(props.range, props.periodType, 1)
  // Don't navigate into the future
  if (range.from > today.value) return
  if (range.to > today.value) range.to = today.value
  emit('update:range', range)
}

function goToday() {
  emit('update:range', buildRange(props.periodType, today.value))
}

// --- Helpers ---

function buildRange(type: PeriodType, anchorDate: string): DateRange {
  const d = new Date(anchorDate + 'T12:00:00')

  switch (type) {
    case 'day':
      return { from: anchorDate, to: anchorDate }
    case 'week': {
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: fmt(monday), to: clampToday(fmt(sunday)) }
    }
    case 'month': {
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: fmt(first), to: clampToday(fmt(last)) }
    }
    case 'custom':
      return { from: anchorDate, to: anchorDate }
  }
}

function shiftRange(range: DateRange, type: PeriodType, direction: number): DateRange {
  const from = new Date(range.from + 'T12:00:00')

  switch (type) {
    case 'day':
      from.setDate(from.getDate() + direction)
      return { from: fmt(from), to: fmt(from) }
    case 'week':
      from.setDate(from.getDate() + direction * 7)
      return buildRange('week', fmt(from))
    case 'month':
      from.setMonth(from.getMonth() + direction)
      return buildRange('month', fmt(from))
    case 'custom': {
      const to = new Date(range.to + 'T12:00:00')
      const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      from.setDate(from.getDate() + direction * days)
      const newTo = new Date(from)
      newTo.setDate(from.getDate() + days - 1)
      return { from: fmt(from), to: clampToday(fmt(newTo)) }
    }
  }
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clampToday(date: string): string {
  const t = TimeUtils.getCurrentLocalDate()
  return date > t ? t : date
}
</script>

<style scoped lang="scss">
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.header-date-label {
  font-size: 13px;
  opacity: 0.5;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.period-toggle {
  border-radius: 8px;
}

.period-btn {
  text-transform: none !important;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: normal;
}

.date-btn {
  text-transform: none;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: normal;
}

.today-btn {
  text-transform: none;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: normal;
}
</style>
