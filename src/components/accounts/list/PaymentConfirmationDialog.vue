<template>
  <v-dialog v-model="dialogModel" max-width="600" persistent>
    <v-card v-if="payment">
      <v-card-title class="d-flex align-center">
        <v-icon
          :icon="getPriorityIcon(payment.priority)"
          :color="getPriorityColor(payment.priority)"
          class="mr-2"
        />
        Подтверждение платежа
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
                    <strong>Счет:</strong>
                    {{ payment.invoiceNumber }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h4 font-weight-bold mb-1">
                    {{ formatAmount(payment.amount) }}
                  </div>
                  <v-chip :color="getPriorityColor(payment.priority)" size="small" variant="flat">
                    {{ getPriorityLabel(payment.priority) }}
                  </v-chip>
                </div>
              </div>

              <div v-if="payment.dueDate" class="d-flex align-center mb-2">
                <v-icon icon="mdi-calendar" size="small" class="mr-2" />
                <span class="text-body-2">
                  Срок оплаты: {{ formatDate(payment.dueDate) }}
                  <span v-if="isOverdue" class="text-error font-weight-bold ml-2">
                    (ПРОСРОЧЕНО)
                  </span>
                </span>
              </div>

              <div v-if="payment.notes" class="mt-3">
                <div class="text-caption text-medium-emphasis mb-1">Примечания:</div>
                <div class="text-body-2">{{ payment.notes }}</div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Выбор счета для списания -->
        <div class="account-selection">
          <h4 class="text-h6 mb-3">Выберите счет для списания</h4>

          <v-select
            v-model="selectedAccountId"
            :items="accountItems"
            item-title="label"
            item-value="value"
            label="Счет для списания"
            :rules="[v => !!v || 'Выберите счет']"
            required
            variant="outlined"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon :icon="item.raw.icon" class="mr-2" />
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  Баланс: {{ formatAmount(item.raw.balance) }}
                  <span v-if="item.raw.balance < payment.amount" class="text-error ml-2">
                    (Недостаточно средств)
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-select>

          <!-- Предупреждение о недостатке средств -->
          <v-alert
            v-if="selectedAccount && selectedAccount.balance < payment.amount"
            type="warning"
            variant="tonal"
            class="mt-3"
          >
            <template #prepend>
              <v-icon icon="mdi-alert" />
            </template>
            <div>
              <strong>Недостаточно средств на счете</strong>
              <div class="text-body-2 mt-1">
                Доступно: {{ formatAmount(selectedAccount.balance) }}
                <br />
                Требуется: {{ formatAmount(payment.amount) }}
                <br />
                Не хватает: {{ formatAmount(payment.amount - selectedAccount.balance) }}
              </div>
            </div>
          </v-alert>

          <!-- Подтверждение суммы -->
          <div v-if="selectedAccount" class="mt-4">
            <v-card variant="outlined" color="info">
              <v-card-text>
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Будет списано с счета:</div>
                    <div class="font-weight-bold">{{ selectedAccount.name }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-h6 font-weight-bold">{{ formatAmount(payment.amount) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Остаток: {{ formatAmount(selectedAccount.balance - payment.amount) }}
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
        <v-btn variant="text" @click="handleCancel">Отмена</v-btn>

        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon icon="mdi-credit-card-check" class="mr-2" />
          Подтвердить платеж
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth.store'
import { formatAmount, formatDate } from '@/utils/formatter'
import type { PendingPayment, Account } from '@/stores/account'
import { PAYMENT_PRIORITIES } from '@/stores/account'

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

    await accountStore.processPayment({
      paymentId: props.payment.id,
      accountId: selectedAccountId.value,
      performedBy: {
        type: 'user',
        id: authStore.userId,
        name: authStore.userName
      }
    })

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
</style>
