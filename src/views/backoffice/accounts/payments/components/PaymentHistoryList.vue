<script setup lang="ts">
// src/views/backoffice/accounts/payments/components/PaymentHistoryList.vue
// Sprint 4: Payment History List Component

import { computed, ref } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  expenses: ShiftExpenseOperation[]
  loading?: boolean
}

interface Emits {
  (e: 'view', expense: ShiftExpenseOperation): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// =============================================
// STATE
// =============================================

const searchQuery = ref('')
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')

// =============================================
// COMPUTED
// =============================================

const filteredExpenses = computed(() => {
  let result = [...props.expenses]

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      exp =>
        exp.counteragentName?.toLowerCase().includes(query) ||
        exp.invoiceNumber?.toLowerCase().includes(query) ||
        exp.description?.toLowerCase().includes(query)
    )
  }

  // Filter by date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (dateFilter.value === 'today') {
    result = result.filter(exp => new Date(exp.createdAt) >= today)
  } else if (dateFilter.value === 'week') {
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    result = result.filter(exp => new Date(exp.createdAt) >= weekAgo)
  } else if (dateFilter.value === 'month') {
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    result = result.filter(exp => new Date(exp.createdAt) >= monthAgo)
  }

  // Sort by date descending
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const totalLinkedAmount = computed(() => {
  return filteredExpenses.value.reduce((sum, exp) => sum + exp.amount, 0)
})

// =============================================
// METHODS
// =============================================

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}

function getStatusColor(status: ShiftExpenseOperation['status']): string {
  switch (status) {
    case 'completed':
      return 'success'
    case 'confirmed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
      return 'error'
    default:
      return 'grey'
  }
}

function handleView(expense: ShiftExpenseOperation) {
  emit('view', expense)
}
</script>

<template>
  <v-card-text>
    <!-- Filters -->
    <div class="d-flex gap-4 mb-4 flex-wrap">
      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        label="Search"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="flex-grow-1"
        style="max-width: 300px"
      />

      <!-- Date Filter -->
      <v-btn-toggle
        v-model="dateFilter"
        mandatory
        color="primary"
        variant="outlined"
        density="compact"
      >
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="today" size="small">Today</v-btn>
        <v-btn value="week" size="small">Week</v-btn>
        <v-btn value="month" size="small">Month</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-alert v-else-if="filteredExpenses.length === 0" type="info" variant="tonal">
      <v-icon start>mdi-information</v-icon>
      No payment history found.
    </v-alert>

    <!-- History List -->
    <template v-else>
      <!-- Summary -->
      <v-alert type="success" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-icon start size="small">mdi-check-circle</v-icon>
            {{ filteredExpenses.length }} linked payment(s)
          </span>
          <span class="font-weight-bold">Total: {{ formatIDR(totalLinkedAmount) }}</span>
        </div>
      </v-alert>

      <!-- List -->
      <v-list lines="two">
        <v-list-item
          v-for="expense in filteredExpenses"
          :key="expense.id"
          class="mb-2 border rounded history-item"
        >
          <template #prepend>
            <v-avatar color="success" variant="tonal">
              <v-icon>mdi-link-variant</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ expense.counteragentName || 'Unknown Supplier' }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex flex-wrap gap-2 mt-1">
              <!-- Amount -->
              <v-chip size="small" color="success" variant="tonal">
                {{ formatIDR(expense.amount) }}
              </v-chip>

              <!-- Status -->
              <v-chip size="x-small" :color="getStatusColor(expense.status)" variant="flat">
                {{ expense.status }}
              </v-chip>

              <!-- Linked Invoice -->
              <v-chip
                v-if="expense.linkedOrderId"
                size="x-small"
                color="primary"
                variant="outlined"
              >
                <v-icon start size="x-small">mdi-file-document</v-icon>
                {{ expense.invoiceNumber || expense.linkedOrderId.slice(0, 8) }}
              </v-chip>

              <!-- Date -->
              <v-chip size="x-small" variant="outlined">
                <v-icon start size="x-small">mdi-calendar</v-icon>
                {{ formatDate(expense.createdAt) }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <!-- Performed By -->
          <div v-if="expense.performedBy" class="text-caption text-grey mt-2">
            <v-icon size="x-small" class="mr-1">mdi-account</v-icon>
            {{ expense.performedBy.name }}
            <span v-if="expense.confirmedBy" class="ml-2">
              | Confirmed by: {{ expense.confirmedBy.name }}
            </span>
          </div>

          <template #append>
            <v-btn icon variant="text" size="small" color="grey" @click="handleView(expense)">
              <v-icon>mdi-eye</v-icon>
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-card-text>
</template>

<style scoped lang="scss">
.history-item {
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-success), 0.04);
  }
}
</style>
