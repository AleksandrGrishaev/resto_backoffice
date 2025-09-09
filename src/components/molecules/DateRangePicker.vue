<!-- src/components/molecules/DateRangePicker.vue -->
<template>
  <div class="date-range-picker">
    <v-menu
      v-model="menu"
      :close-on-content-click="false"
      transition="scale-transition"
      offset-y
      min-width="auto"
    >
      <template #activator="{ props: menuProps }">
        <v-text-field
          v-bind="{ ...menuProps, ...$attrs }"
          :model-value="displayValue"
          :label="label"
          :placeholder="placeholder"
          :readonly="readonly"
          :disabled="disabled"
          :error="error"
          :error-messages="errorMessages"
          :hint="hint"
          :persistent-hint="persistentHint"
          :prepend-icon="prependIcon"
          :append-icon="appendIcon || 'mdi-calendar-range'"
          :variant="variant"
          :density="density"
          :clearable="clearable"
          @click:clear="handleClear"
          @click:append="menu = !menu"
        />
      </template>

      <v-card min-width="320" max-width="600">
        <v-card-text class="pa-4">
          <!-- Quick Selection Buttons -->
          <div class="quick-selection mb-4">
            <div class="text-subtitle-2 mb-2">Quick Selection</div>
            <div class="quick-buttons">
              <v-btn-toggle
                v-model="selectedQuickRange"
                variant="outlined"
                density="compact"
                mandatory="{false}"
                @update:model-value="handleQuickSelection"
              >
                <v-btn value="today" size="small">Today</v-btn>
                <v-btn value="yesterday" size="small">Yesterday</v-btn>
                <v-btn value="thisWeek" size="small">This Week</v-btn>
                <v-btn value="lastWeek" size="small">Last Week</v-btn>
                <v-btn value="thisMonth" size="small">This Month</v-btn>
                <v-btn value="lastMonth" size="small">Last Month</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <v-divider class="mb-4" />

          <!-- Custom Date Range -->
          <div class="custom-range">
            <div class="text-subtitle-2 mb-3">Custom Range</div>
            <v-row dense>
              <v-col cols="6">
                <DatePicker
                  v-model="internalDateFrom"
                  label="From Date"
                  :max="internalDateTo || maxDate"
                  :min="minDate"
                  density="compact"
                  variant="outlined"
                  @update:model-value="updateRange"
                />
              </v-col>
              <v-col cols="6">
                <DatePicker
                  v-model="internalDateTo"
                  label="To Date"
                  :min="internalDateFrom || minDate"
                  :max="maxDate"
                  density="compact"
                  variant="outlined"
                  @update:model-value="updateRange"
                />
              </v-col>
            </v-row>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleClear">Clear</v-btn>
          <v-btn color="primary" @click="menu = false">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  format,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  parseISO,
  isValid
} from 'date-fns'
import DatePicker from '@/components/atoms/DatePicker.vue'

export interface DateRange {
  dateFrom: string | null
  dateTo: string | null
}

interface Props {
  modelValue?: DateRange
  label?: string
  placeholder?: string
  readonly?: boolean
  disabled?: boolean
  error?: boolean
  errorMessages?: string | string[]
  hint?: string
  persistentHint?: boolean
  prependIcon?: string
  appendIcon?: string
  variant?:
    | 'filled'
    | 'outlined'
    | 'plain'
    | 'underlined'
    | 'solo'
    | 'solo-inverted'
    | 'solo-filled'
  density?: 'default' | 'comfortable' | 'compact'
  clearable?: boolean
  minDate?: string
  maxDate?: string
  dateFormat?: string
  displayFormat?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Date Range',
  placeholder: 'Select date range',
  variant: 'outlined',
  density: 'default',
  clearable: true,
  dateFormat: 'yyyy-MM-dd',
  displayFormat: 'dd.MM.yyyy'
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
}>()

// State
const menu = ref(false)
const selectedQuickRange = ref<string | null>(null)
const internalDateFrom = ref<string | null>(props.modelValue?.dateFrom || null)
const internalDateTo = ref<string | null>(props.modelValue?.dateTo || null)

// Computed
const displayValue = computed(() => {
  if (!internalDateFrom.value && !internalDateTo.value) {
    return ''
  }

  try {
    const fromDisplay = internalDateFrom.value
      ? format(parseISO(internalDateFrom.value), props.displayFormat)
      : ''

    const toDisplay = internalDateTo.value
      ? format(parseISO(internalDateTo.value), props.displayFormat)
      : ''

    if (fromDisplay && toDisplay) {
      return `${fromDisplay} - ${toDisplay}`
    } else if (fromDisplay) {
      return `From ${fromDisplay}`
    } else if (toDisplay) {
      return `Until ${toDisplay}`
    }

    return ''
  } catch (error) {
    console.warn('Error formatting date range:', error)
    return ''
  }
})

// Quick selection ranges
const quickRanges = {
  today: () => ({
    dateFrom: format(startOfToday(), props.dateFormat),
    dateTo: format(endOfToday(), props.dateFormat)
  }),
  yesterday: () => ({
    dateFrom: format(startOfYesterday(), props.dateFormat),
    dateTo: format(endOfYesterday(), props.dateFormat)
  }),
  thisWeek: () => ({
    dateFrom: format(startOfWeek(new Date(), { weekStartsOn: 1 }), props.dateFormat),
    dateTo: format(endOfWeek(new Date(), { weekStartsOn: 1 }), props.dateFormat)
  }),
  lastWeek: () => {
    const lastWeek = subWeeks(new Date(), 1)
    return {
      dateFrom: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), props.dateFormat),
      dateTo: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), props.dateFormat)
    }
  },
  thisMonth: () => ({
    dateFrom: format(startOfMonth(new Date()), props.dateFormat),
    dateTo: format(endOfMonth(new Date()), props.dateFormat)
  }),
  lastMonth: () => {
    const lastMonth = subMonths(new Date(), 1)
    return {
      dateFrom: format(startOfMonth(lastMonth), props.dateFormat),
      dateTo: format(endOfMonth(lastMonth), props.dateFormat)
    }
  }
}

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      internalDateFrom.value = newValue.dateFrom
      internalDateTo.value = newValue.dateTo
    } else {
      internalDateFrom.value = null
      internalDateTo.value = null
    }
  },
  { immediate: true, deep: true }
)

// Methods
function handleQuickSelection(range: string) {
  if (!range || !quickRanges[range as keyof typeof quickRanges]) return

  const { dateFrom, dateTo } = quickRanges[range as keyof typeof quickRanges]()
  internalDateFrom.value = dateFrom
  internalDateTo.value = dateTo
  updateRange()
}

function updateRange() {
  selectedQuickRange.value = null // Clear quick selection when manual input

  emit('update:modelValue', {
    dateFrom: internalDateFrom.value,
    dateTo: internalDateTo.value
  })
}

function handleClear() {
  internalDateFrom.value = null
  internalDateTo.value = null
  selectedQuickRange.value = null
  emit('update:modelValue', {
    dateFrom: null,
    dateTo: null
  })
}
</script>

<style lang="scss" scoped>
.date-range-picker {
  width: 100%;
}

.quick-selection {
  .quick-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .v-btn-toggle {
      width: 100%;

      .v-btn {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.75rem;
      }
    }
  }
}

.custom-range {
  .v-row {
    margin: 0;
  }
}

// Responsive adjustments
@media (max-width: 600px) {
  .quick-buttons .v-btn-toggle .v-btn {
    font-size: 0.7rem;
    padding: 0 8px;
  }
}
</style>
