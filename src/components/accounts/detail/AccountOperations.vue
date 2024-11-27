// src/components/accounts/detail/AccountOperations.vue
<template>
  <v-table hover>
    <thead>
      <tr>
        <th class="text-left">Дата</th>
        <th class="text-left">Тип</th>
        <th class="text-left">Категория</th>
        <th class="text-right">Сумма</th>
        <th class="text-right">Баланс</th>
        <th class="text-left">Описание</th>
        <th class="text-left">Кем создано</th>
        <th v-if="canEdit" class="text-center">Действия</th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="operation in operations"
        :key="operation.id"
        :class="{ 'correction-row': operation.isCorrection }"
      >
        <td>{{ formatDateTime(operation.createdAt) }}</td>
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
          {{ formatAmount(operation.amount) }}
        </td>
        <td class="text-right">
          {{ formatAmount(operation.balanceAfter) }}
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

      <tr v-if="operations.length === 0">
        <td :colspan="canEdit ? 8 : 7" class="text-center py-4">
          {{ loading ? 'Загрузка...' : 'Нет операций' }}
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store' // Заменяем useUserStore на useAuthStore
import { formatDateTime, formatAmount } from '@/utils/formatter'
import type { Transaction, ExpenseCategory } from '@/types/transaction'
import { EXPENSE_CATEGORIES } from '@/types/transaction'

const emit = defineEmits<{
  edit: [operation: Transaction]
}>()

// Store
const authStore = useAuthStore() // Заменяем userStore на authStore
const canEdit = computed(() => authStore.isAdmin) // Используем authStore.isAdmin

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
    income: 'Приход',
    expense: 'Расход',
    transfer: 'Перевод',
    correction: 'Корректировка'
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
