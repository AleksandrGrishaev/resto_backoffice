<template>
  <div class="account-operations-filter">
    <v-menu v-model="dateMenu" :close-on-content-click="false">
      <template #activator="{ isActive }">
        <v-btn variant="outlined" :class="{ active: isActive }" class="mr-2">
          {{ getDateRangeLabel }}
          <v-icon right>mdi-calendar</v-icon>
        </v-btn>
      </template>

      <v-card min-width="300">
        <v-card-text>
          <div class="d-flex flex-column gap-4">
            <v-btn-toggle v-model="selectedRange" mandatory class="range-toggle">
              <v-btn value="today">Today</v-btn>
              <v-btn value="week">Week</v-btn>
              <v-btn value="month">Month</v-btn>
              <v-btn value="custom">Custom</v-btn>
            </v-btn-toggle>

            <template v-if="selectedRange === 'custom'">
              <v-text-field v-model="filters.dateFrom" label="From" type="date" density="compact" />
              <v-text-field v-model="filters.dateTo" label="To" type="date" density="compact" />
            </template>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="applyDateFilter">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

    <v-select
      v-model="filters.type"
      label="Operation Type"
      :items="operationTypes"
      clearable
      density="compact"
      hide-details
      style="max-width: 200px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { startOfToday, startOfWeek, startOfMonth, format } from 'date-fns'
import type { OperationType } from '@/stores/account'

const props = defineProps<{
  modelValue: {
    dateFrom: string | null
    dateTo: string | null
    type: OperationType | null
  }
}>()

const emit = defineEmits<{
  'update:model-value': [filters: typeof props.modelValue]
}>()

// State
const dateMenu = ref(false)
const selectedRange = ref('today')
const filters = ref({ ...props.modelValue })

// Computed
const operationTypes = [
  { title: 'All Operations', value: null },
  { title: 'Income', value: 'income' },
  { title: 'Expense', value: 'expense' },
  { title: 'Transfers', value: 'transfer' },
  { title: 'Corrections', value: 'correction' }
]

const getDateRangeLabel = computed(() => {
  if (!filters.value.dateFrom) return 'Select Period'

  if (filters.value.dateFrom === filters.value.dateTo) {
    return format(new Date(filters.value.dateFrom), 'dd.MM.yyyy')
  }

  return `${format(new Date(filters.value.dateFrom), 'dd.MM.yyyy')} - ${format(
    new Date(filters.value.dateTo || ''),
    'dd.MM.yyyy'
  )}`
})

// Watch for direct filter changes
watch(
  () => filters.value,
  newValue => {
    emit('update:model-value', { ...newValue })
  },
  { deep: true }
)

// Methods
function applyDateFilter() {
  const today = startOfToday()

  switch (selectedRange.value) {
    case 'today':
      filters.value.dateFrom = format(today, 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
    case 'week':
      filters.value.dateFrom = format(startOfWeek(today), 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
    case 'month':
      filters.value.dateFrom = format(startOfMonth(today), 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
  }

  dateMenu.value = false
}
</script>

<style lang="scss" scoped>
.account-operations-filter {
  display: flex;
  align-items: center;
  gap: 16px;
}

.range-toggle {
  width: 100%;

  :deep(.v-btn) {
    flex: 1;
  }
}

.gap-4 {
  gap: 16px;
}
</style>
