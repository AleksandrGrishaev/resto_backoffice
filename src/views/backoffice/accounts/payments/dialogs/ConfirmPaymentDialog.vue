<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/ConfirmPaymentDialog.vue
// Sprint 5: Confirm Pending Payment Dialog

import { ref, computed, watch } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import { useAccountStore } from '@/stores/account'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  modelValue: boolean
  payment: PendingPayment | null
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payment: PendingPayment, accountId: string, actualAmount: number): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const accountStore = useAccountStore()

// =============================================
// STATE
// =============================================

const selectedAccountId = ref<string>('')
const actualAmount = ref(0)
const notes = ref('')

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Get all active accounts for payment (cash, bank, card)
const availableAccounts = computed(() => {
  return accountStore.activeAccounts
})

const amountDifference = computed(() => {
  if (!props.payment) return 0
  return actualAmount.value - props.payment.amount
})

// Get selected account for balance check
const selectedAccount = computed(() => {
  return availableAccounts.value.find(a => a.id === selectedAccountId.value)
})

// Check if account has sufficient balance
const hasSufficientBalance = computed(() => {
  if (!selectedAccount.value) return true
  return selectedAccount.value.balance >= actualAmount.value
})

const canConfirm = computed(() => {
  return selectedAccountId.value !== '' && actualAmount.value > 0
})

// =============================================
// WATCHERS
// =============================================

// Reset state when payment changes
watch(
  () => props.payment,
  newPayment => {
    if (newPayment) {
      actualAmount.value = newPayment.amount
      notes.value = ''
      // Pre-select assigned account or first cash account
      if (newPayment.assignedToAccount) {
        selectedAccountId.value = newPayment.assignedToAccount
      } else if (availableAccounts.value.length > 0) {
        const cashAccount = availableAccounts.value.find(a => a.type === 'cash')
        selectedAccountId.value = cashAccount?.id || availableAccounts.value[0].id
      }
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function handleConfirm() {
  if (!props.payment || !canConfirm.value) return
  emit('confirm', props.payment, selectedAccountId.value, actualAmount.value)
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  return TimeUtils.formatDateForDisplay(dateStr)
}

function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    default: 'mdi-wallet'
  }
  return icons[type] || icons.default
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card v-if="payment">
      <v-card-title class="d-flex align-center">
        <v-icon start color="success">mdi-check-circle</v-icon>
        Confirm Payment
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Payment Info -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-subtitle-2">{{ payment.counteragentName }}</div>
              <div class="text-caption text-grey">
                {{ payment.description || 'No description' }}
              </div>
              <div v-if="payment.invoiceNumber" class="text-caption">
                Invoice: {{ payment.invoiceNumber }}
              </div>
            </div>
            <div class="text-h6 font-weight-bold text-primary">
              {{ formatIDR(payment.amount) }}
            </div>
          </div>
        </v-alert>

        <!-- Due Date Info -->
        <div v-if="payment.dueDate" class="mb-4">
          <v-chip
            :color="new Date(payment.dueDate) < new Date() ? 'error' : 'warning'"
            variant="tonal"
            size="small"
          >
            <v-icon start size="small">mdi-calendar</v-icon>
            Due: {{ formatDate(payment.dueDate) }}
          </v-chip>
        </div>

        <!-- Select Account -->
        <v-select
          v-model="selectedAccountId"
          :items="availableAccounts"
          item-title="name"
          item-value="id"
          label="Pay from Account *"
          variant="outlined"
          density="compact"
          class="mb-4"
          :rules="[v => !!v || 'Account is required']"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-icon :icon="getAccountIcon(item.raw.type)" size="small" />
              </template>
              <template #append>
                <span class="text-caption">{{ formatIDR(item.raw.balance) }}</span>
              </template>
            </v-list-item>
          </template>
        </v-select>

        <!-- Insufficient Balance Warning -->
        <v-alert
          v-if="selectedAccount && !hasSufficientBalance"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <v-icon start size="small">mdi-alert</v-icon>
          Insufficient balance. Account has {{ formatIDR(selectedAccount.balance) }}, but payment
          requires {{ formatIDR(actualAmount) }}.
        </v-alert>

        <!-- Actual Amount -->
        <v-text-field
          v-model.number="actualAmount"
          label="Actual Payment Amount *"
          type="number"
          variant="outlined"
          density="compact"
          prefix="Rp"
          class="mb-4"
          :rules="[v => v > 0 || 'Amount must be positive']"
        />

        <!-- Amount Comparison -->
        <div
          v-if="amountDifference !== 0"
          class="amount-comparison pa-3 bg-grey-lighten-4 rounded mb-4"
        >
          <div class="d-flex justify-space-between text-body-2">
            <span>Expected:</span>
            <span>{{ formatIDR(payment.amount) }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2">
            <span>Actual:</span>
            <span>{{ formatIDR(actualAmount) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between font-weight-medium">
            <span>Difference:</span>
            <span :class="amountDifference > 0 ? 'text-error' : 'text-success'">
              {{ amountDifference > 0 ? '+' : '' }}{{ formatIDR(amountDifference) }}
            </span>
          </div>

          <v-alert
            v-if="Math.abs(amountDifference) > 0"
            :type="amountDifference > 0 ? 'warning' : 'info'"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            <template v-if="amountDifference > 0">
              Overpayment will be added to counteragent balance.
            </template>
            <template v-else>
              Underpayment. Remaining balance: {{ formatIDR(Math.abs(amountDifference)) }}
            </template>
          </v-alert>
        </div>

        <!-- Notes -->
        <v-textarea
          v-model="notes"
          label="Notes (optional)"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="success"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon start>mdi-check</v-icon>
          Confirm Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.amount-comparison {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
