<!-- src/views/accounts/components/dialogs/TransactionDetailDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="800px" persistent>
    <v-card>
      <!-- Основной контент: Header + BasicInfo -->
      <transaction-detail-content :transaction="transaction" @close="closeDialog" />

      <!-- Специальные виджеты -->
      <component
        :is="getWidgetComponent(transaction)"
        v-if="getWidgetComponent(transaction)"
        :transaction="transaction"
      />

      <!-- Actions -->
      <v-card-actions>
        <v-spacer />
        <v-btn variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TransactionDetailContent from './transaction-detail/TransactionDetailContent.vue'
import SupplierPaymentContextWidget from './transaction-detail/SupplierPaymentContextWidget.vue'
import type { Transaction } from '@/stores/account'

interface Props {
  modelValue: boolean
  transaction: Transaction | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Methods
function closeDialog() {
  emit('update:modelValue', false)
}

function getWidgetComponent(transaction: Transaction | null) {
  if (!transaction) return null

  // Определяем тип виджета на основе транзакции
  if (isSupplierPayment(transaction)) {
    return SupplierPaymentContextWidget
  }

  return null
}

function isSupplierPayment(transaction: Transaction): boolean {
  return (
    transaction.type === 'expense' &&
    transaction.counteragentId &&
    transaction.expenseCategory?.category === 'product'
  )
}
</script>
