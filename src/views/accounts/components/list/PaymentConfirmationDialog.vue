<template>
  <v-dialog v-model="dialogModel" max-width="800" persistent>
    <v-card v-if="payment">
      <v-card-title class="d-flex align-center">
        <v-icon
          :icon="getPriorityIcon(payment.priority)"
          :color="getPriorityColor(payment.priority)"
          class="mr-2"
        />
        Payment Confirmation
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <v-card-text class="py-4">
        <!-- Информация о платеже -->
        <div class="payment-info mb-4">
          <v-card variant="outlined">
            <v-card-text>
              <div class="d-flex justify-space-between align-start mb-3">
                <div>
                  <h3 class="text-h6 mb-1">{{ payment.counteragentName }}</h3>
                  <p class="text-body-2 text-medium-emphasis mb-2">
                    {{ payment.description }}
                  </p>
                  <div v-if="payment.invoiceNumber" class="text-caption">
                    <strong>Invoice:</strong>
                    {{ payment.invoiceNumber }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h4 font-weight-bold mb-1">
                    {{ formatIDR(payment.amount) }}
                  </div>
                  <v-chip :color="getPriorityColor(payment.priority)" size="small" variant="flat">
                    {{ getPriorityLabel(payment.priority) }}
                  </v-chip>
                </div>
              </div>

              <div v-if="payment.dueDate" class="d-flex align-center mb-2">
                <v-icon icon="mdi-calendar" size="small" class="mr-2" />
                <span class="text-body-2">
                  Due Date: {{ formatDate(payment.dueDate) }}
                  <span v-if="isOverdue" class="text-error font-weight-bold ml-2">(OVERDUE)</span>
                </span>
              </div>

              <div v-if="payment.notes" class="mt-3">
                <div class="text-caption text-medium-emphasis mb-1">Notes:</div>
                <div class="text-body-2">{{ payment.notes }}</div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- ✅ НОВОЕ: Supplier Payment Context Widget -->
        <supplier-payment-context-widget
          v-if="isSupplierPayment"
          :payment="payment"
          :related-order-ids="payment.linkedOrders?.map(order => order.orderId) || []"
          mode="pending-payment"
          class="mb-4"
        />

        <!-- Выбор счета для списания -->
        <div class="account-selection">
          <h4 class="text-h6 mb-3">Select Account for Payment</h4>

          <v-select
            v-model="selectedAccountId"
            :items="accountItems"
            item-title="label"
            item-value="value"
            label="Payment Account"
            :rules="[v => !!v || 'Select an account']"
            required
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #prepend>
                  <v-icon :icon="item.raw.icon" />
                </template>
                <template #append>
                  <div class="text-right">
                    <div class="text-body-2">{{ formatIDR(item.raw.balance) }}</div>
                    <div
                      class="text-caption"
                      :class="item.raw.balance >= payment.amount ? 'text-success' : 'text-error'"
                    >
                      {{ item.raw.balance >= payment.amount ? 'Sufficient' : 'Insufficient' }}
                    </div>
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Предварительный просмотр списания -->
          <div v-if="selectedAccount" class="mt-4">
            <v-card variant="outlined" color="info">
              <v-card-text>
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Will be charged from:</div>
                    <div class="font-weight-bold">{{ selectedAccount.name }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-h6 font-weight-bold">{{ formatIDR(payment.amount) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Remaining: {{ formatIDR(selectedAccount.balance - payment.amount) }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-3">
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon icon="mdi-credit-card-check" class="mr-2" />
          Confirm Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { formatDate } from '@/utils/formatter'

import type { PendingPayment, Account } from '@/stores/account'
import { PAYMENT_PRIORITIES } from '@/stores/account'

import SupplierPaymentContextWidget from '../dialogs/transaction-detail/SupplierPaymentContextWidget.vue'
import type { Transaction } from '../../../../stores/account'

interface Props {
  modelValue: boolean
  payment: PendingPayment | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

// Stores
const accountStore = useAccountStore()
const authStore = useAuthStore()

// State
const selectedAccountId = ref<string | null>(null)
const loading = ref(false)

// Computed
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isSupplierPayment = computed(() => {
  return (
    props.payment?.category === 'supplier' &&
    props.payment?.linkedOrders &&
    props.payment.linkedOrders.length > 0
  )
})

const activeAccounts = computed(() => accountStore.activeAccounts)

const accountItems = computed(() =>
  activeAccounts.value.map(account => ({
    label: account.name,
    value: account.id,
    name: account.name,
    balance: account.balance,
    icon: getAccountIcon(account.type)
  }))
)

const selectedAccount = computed(() => {
  if (!selectedAccountId.value) return null
  return activeAccounts.value.find(acc => acc.id === selectedAccountId.value) || null
})

const isOverdue = computed(() => {
  if (!props.payment?.dueDate) return false
  return new Date(props.payment.dueDate) < new Date()
})

const canConfirm = computed(() => {
  return (
    selectedAccountId.value &&
    selectedAccount.value &&
    selectedAccount.value.balance >= (props.payment?.amount || 0)
  )
})

const paymentAsTransaction = computed((): Transaction | null => {
  if (!props.payment || !isSupplierPayment.value) return null

  // Создаем "псевдо-транзакцию" для совместимости с виджетом
  return {
    id: `payment-${props.payment.id}`,
    accountId: '', // Не важно для виджета
    type: 'expense',
    amount: props.payment.amount,
    balanceAfter: 0, // Не важно для виджета
    description: props.payment.description,
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: props.payment.createdBy,
    status: 'completed',

    // Ключевые поля для виджета
    counteragentId: props.payment.counteragentId,
    counteragentName: props.payment.counteragentName,
    relatedOrderIds: props.payment.linkedOrders?.map(order => order.orderId) || [],
    relatedPaymentId: props.payment.id,

    createdAt: props.payment.createdAt,
    updatedAt: props.payment.updatedAt
  } as Transaction
})

// Methods
function getPriorityIcon(priority: PendingPayment['priority']) {
  const icons = {
    urgent: 'mdi-alert-circle',
    high: 'mdi-arrow-up-bold',
    medium: 'mdi-minus',
    low: 'mdi-arrow-down-bold'
  }
  return icons[priority]
}

function getPriorityColor(priority: PendingPayment['priority']) {
  const colors = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[priority]
}

function getPriorityLabel(priority: PendingPayment['priority']) {
  return PAYMENT_PRIORITIES[priority]
}

function getAccountIcon(type: Account['type']) {
  const icons = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    gojeck: 'mdi-wallet',
    grab: 'mdi-wallet'
  }
  return icons[type] || 'mdi-help-circle'
}

async function handleConfirm() {
  if (!props.payment || !selectedAccountId.value) return

  try {
    loading.value = true

    // ✅ Sprint 3: Сначала назначаем платеж на счет
    // Это установит requiresCashierConfirmation=true для POS кассы
    await accountStore.assignPaymentToAccount(props.payment.id, selectedAccountId.value)

    // ✅ Sprint 3: Проверяем, требуется ли подтверждение кассира
    const { POS_CASH_ACCOUNT_ID } = await import('@/stores/account/types')
    const isPOSCashAccount = selectedAccountId.value === POS_CASH_ACCOUNT_ID

    if (!isPOSCashAccount) {
      // Для обычных счетов (не POS касса) - сразу обрабатываем платеж
      await accountStore.processPayment({
        paymentId: props.payment.id,
        accountId: selectedAccountId.value,
        performedBy: {
          type: 'user',
          id: authStore.userId,
          name: authStore.userName
        }
      })
    }
    // Для POS кассы платеж уже назначен и ждет подтверждения кассира

    emit('success')
    handleCancel()
  } catch (error) {
    console.error('Failed to process payment:', error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  selectedAccountId.value = null
  emit('update:modelValue', false)
}

// Watch for dialog changes to reset form
watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) {
      selectedAccountId.value = null
    }
  }
)
</script>

<style lang="scss" scoped>
.payment-info {
  .v-card {
    background-color: rgb(var(--v-theme-surface-variant));
  }
}

.account-selection {
  .v-select {
    margin-bottom: 0;
  }
}

.payment-info {
  .v-card {
    background-color: rgb(var(--v-theme-surface-variant));
  }
}

.account-selection {
  .v-select {
    margin-bottom: 0;
  }
}
</style>
