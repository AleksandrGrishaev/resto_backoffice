<template>
  <v-table hover>
    <thead>
      <tr>
        <th class="text-left">Date</th>
        <th class="text-left">Type</th>
        <th class="text-left">Category</th>
        <th class="text-right">Amount</th>
        <th class="text-right">Balance</th>
        <th class="text-left">Description</th>
        <th class="text-left">Created By</th>
        <th v-if="canEdit" class="text-center">Actions</th>
      </tr>
    </thead>

    <tbody>
      <template v-if="!loading">
        <tr
          v-for="operation in operations"
          :key="operation.id"
          :class="{ 'correction-row': operation.isCorrection }"
        >
          <td>{{ formatTransactionDateTime(operation.createdAt) }}</td>
          <td>
            <v-icon
              :icon="getOperationTypeIcon(operation.type)"
              :color="getOperationTypeColor(operation.type)"
              size="small"
              class="mr-2"
            />
            {{ getOperationTypeLabel(operation.type) }}
          </td>
          <td>
            <template v-if="operation.expenseCategory">
              {{ getExpenseCategoryLabel(operation.expenseCategory) }}
            </template>
          </td>
          <td class="text-right" :class="getAmountClass(operation)">
            {{ formatIDR(operation.amount) }}
          </td>
          <td class="text-right">
            {{ formatIDR(operation.balanceAfter) }}
          </td>
          <td>{{ operation.description }}</td>
          <td>
            <div class="performer">
              <v-icon
                :icon="operation.performedBy.type === 'user' ? 'mdi-account' : 'mdi-api'"
                size="small"
                class="mr-2"
              />
              {{ operation.performedBy.name }}
            </div>
          </td>
          <td v-if="canEdit" class="text-center">
            <v-btn
              icon
              size="small"
              variant="text"
              :disabled="!canEditOperation(operation)"
              @click="emit('edit', operation)"
            >
              <v-icon size="small">mdi-pencil</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>

      <tr v-if="loading || (!loading && operations.length === 0)">
        <td :colspan="canEdit ? 8 : 7" class="text-center py-4">
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="primary"
            size="24"
            class="mr-2"
          />
          {{ loading ? 'Loading...' : 'No operations' }}
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
// ✅ ИСПРАВЛЕНО: Добавлен импорт formatDateTime
import { formatDateTime } from '@/utils/formatter'
import type { Transaction, ExpenseCategory } from '@/stores/account'
import { EXPENSE_CATEGORIES } from '@/stores/account'

// Props
interface Props {
  operations: Transaction[]
  loading: boolean
}

const props = withDefaults(defineProps<Props>(), {
  operations: () => [],
  loading: false
})

const emit = defineEmits<{
  edit: [operation: Transaction]
}>()

// Store
const authStore = useAuthStore()
const canEdit = computed(() => authStore.isAdmin)

// ✅ ИСПРАВЛЕНО: Добавлена функция форматирования даты транзакции
function formatTransactionDateTime(date: string | Date): string {
  try {
    return formatDateTime(date)
  } catch (error) {
    console.warn('Error formatting transaction datetime:', error)
    return String(date)
  }
}

// Helpers
function getOperationTypeIcon(type: Transaction['type']): string {
  const icons = {
    income: 'mdi-plus-circle',
    expense: 'mdi-minus-circle',
    transfer: 'mdi-bank-transfer',
    correction: 'mdi-cash-sync'
  }
  return icons[type]
}

function getOperationTypeColor(type: Transaction['type']): string {
  const colors = {
    income: 'success',
    expense: 'error',
    transfer: 'info',
    correction: 'warning'
  }
  return colors[type]
}

function getOperationTypeLabel(type: Transaction['type']): string {
  const labels = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    correction: 'Correction'
  }
  return labels[type]
}

function getExpenseCategoryLabel(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES[category.type][category.category]
}

function getAmountClass(operation: Transaction) {
  return {
    'text-success': operation.type === 'income',
    'text-error': operation.type === 'expense',
    'text-warning': operation.type === 'correction'
  }
}

function canEditOperation(operation: Transaction): boolean {
  return canEdit.value && operation.performedBy.type === 'user' && !operation.isCorrection
}
</script>

<style lang="scss" scoped>
.performer {
  display: flex;
  align-items: center;
}

.correction-row {
  background-color: rgba(var(--v-theme-warning), 0.1);
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}
</style>
