<!-- src/views/pos/components/PaymentDialog.vue -->
<template>
  <v-dialog v-model="dialog" max-width="600" persistent @update:model-value="handleDialogUpdate">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Оплата заказа</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
      </v-card-title>

      <v-divider />

      <!-- Order Summary -->
      <v-card-text v-if="order" class="pa-4">
        <div class="order-info mb-4">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-h6">{{ order.orderNumber }}</span>
            <v-chip :color="getOrderStatusColor(order.status)" size="small">
              {{ getOrderStatusText(order.status) }}
            </v-chip>
          </div>

          <!-- Bills to pay -->
          <div class="bills-summary mb-3">
            <div class="text-subtitle-2 mb-2">Счета к оплате:</div>
            <v-card variant="outlined" class="pa-2">
              <div
                v-for="bill in billsToPay"
                :key="bill.id"
                class="d-flex justify-space-between py-1"
              >
                <span>{{ bill.name }}</span>
                <span class="font-weight-bold">₽{{ bill.total.toFixed(2) }}</span>
              </div>
            </v-card>
          </div>

          <!-- Total -->
          <div class="total-section">
            <v-divider class="mb-2" />
            <div class="d-flex justify-space-between text-h6 font-weight-bold">
              <span>Итого к оплате:</span>
              <span>₽{{ totalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Methods -->
        <div class="payment-methods mb-4">
          <div class="text-subtitle-1 mb-3">Способ оплаты:</div>

          <v-btn-toggle
            v-model="selectedPaymentMethod"
            mandatory
            variant="outlined"
            class="payment-toggle mb-3"
          >
            <v-btn
              v-for="method in availablePaymentMethods"
              :key="method.code"
              :value="method.code"
              size="large"
            >
              <v-icon start>{{ method.icon }}</v-icon>
              {{ method.name }}
            </v-btn>
          </v-btn-toggle>

          <!-- Cash Payment -->
          <div v-if="selectedMethodType === 'cash'" class="cash-payment">
            <NumericInputField
              v-model="receivedAmount"
              label="Получено наличными"
              prefix="₽"
              variant="outlined"
              :min="0"
              :max="999999999"
              :format-as-currency="true"
              :error="receivedAmount < totalAmount"
              :error-messages="receivedAmount < totalAmount ? 'Сумма меньше к оплате' : ''"
            />

            <div v-if="changeAmount > 0" class="change-amount mt-2">
              <v-alert color="info" variant="tonal">
                <div class="d-flex justify-space-between align-center">
                  <span>Сдача:</span>
                  <span class="text-h6 font-weight-bold">₽{{ changeAmount.toFixed(2) }}</span>
                </div>
              </v-alert>
            </div>
          </div>

          <!-- Bank/Electronic Payment -->
          <div v-if="selectedMethodType === 'bank'" class="card-payment">
            <v-alert color="info" variant="tonal">
              <div class="text-center">
                <v-icon size="48" class="mb-2">
                  {{
                    availablePaymentMethods.find(m => m.code === selectedPaymentMethod)?.icon ||
                    'mdi-credit-card'
                  }}
                </v-icon>
                <div>Waiting for payment confirmation</div>
                <div class="text-caption">Amount: ₽{{ totalAmount.toFixed(2) }}</div>
              </div>
            </v-alert>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="processing" @click="closeDialog">Отмена</v-btn>

        <v-spacer />

        <v-btn
          color="success"
          size="large"
          :loading="processing"
          :disabled="!canProcessPayment"
          @click="processPayment"
        >
          <v-icon start>mdi-cash-check</v-icon>
          Оплатить ₽{{ totalAmount.toFixed(2) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import type { PosOrder, PaymentMethod, OrderStatus } from '@/stores/pos/types'

// Props
interface Props {
  modelValue: boolean
  orderId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'payment-completed': [orderId: string]
}>()

// Stores
const ordersStore = usePosOrdersStore()
const paymentsStore = usePosPaymentsStore()
const paymentSettingsStore = usePaymentSettingsStore()

// State
const dialog = ref(props.modelValue)
const selectedPaymentMethod = ref<PaymentMethod>('cash')
const receivedAmount = ref(0)
const processing = ref(false)

// Payment methods from settings
const availablePaymentMethods = computed(() => {
  // ✅ Force reactive dependency on activePaymentMethods.length
  const methodsCount = paymentSettingsStore.activePaymentMethods.length

  if (methodsCount === 0) {
    // Return empty array if no methods loaded yet (will trigger re-computation when data loads)
    return []
  }

  return paymentSettingsStore.activePaymentMethods.map(method => ({
    code: method.code,
    name: method.name,
    icon: method.icon || getDefaultIcon(method.type),
    type: method.type
  }))
})

// Get the type of currently selected payment method
const selectedMethodType = computed(() => {
  const method = availablePaymentMethods.value.find(m => m.code === selectedPaymentMethod.value)
  return method?.type || 'cash'
})

function getDefaultIcon(type: string): string {
  switch (type) {
    case 'cash':
      return 'mdi-cash'
    case 'bank':
      return 'mdi-credit-card'
    default:
      return 'mdi-wallet'
  }
}

// Computed
const order = computed(() => {
  if (!props.orderId) return ordersStore.currentOrder
  return ordersStore.orders.find(o => o.id === props.orderId) || null
})

const billsToPay = computed(() => {
  if (!order.value) return []
  return order.value.bills.filter(bill => bill.status === 'active' && bill.paymentStatus !== 'paid')
})

const totalAmount = computed(() => {
  return billsToPay.value.reduce((sum, bill) => sum + bill.total, 0)
})

const changeAmount = computed(() => {
  if (selectedMethodType.value !== 'cash') return 0
  return Math.max(0, receivedAmount.value - totalAmount.value)
})

const canProcessPayment = computed(() => {
  if (!order.value || billsToPay.value.length === 0) return false

  if (selectedMethodType.value === 'cash') {
    return receivedAmount.value >= totalAmount.value
  }

  return true // For bank/electronic payments
})

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      initializePayment()
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

watch(totalAmount, newAmount => {
  if (selectedMethodType.value === 'cash') {
    receivedAmount.value = newAmount
  }
})

// ✅ Re-initialize when payment methods load
watch(
  () => paymentSettingsStore.activePaymentMethods.length,
  (count, oldCount) => {
    if (count > 0 && oldCount === 0 && dialog.value) {
      // Payment methods just loaded and dialog is open - re-initialize
      console.log('💳 Payment methods loaded, re-initializing payment dialog')
      initializePayment()
    }
  }
)

// Methods
function handleDialogUpdate(value: boolean) {
  dialog.value = value
}

function initializePayment() {
  if (!order.value) return

  // Reset form - select first available payment method or fallback to 'cash'
  selectedPaymentMethod.value = availablePaymentMethods.value[0]?.code || 'cash'
  receivedAmount.value = totalAmount.value
  processing.value = false
}

function closeDialog() {
  dialog.value = false
  processing.value = false
}

async function processPayment() {
  if (!order.value || !canProcessPayment.value) return

  processing.value = true

  try {
    const billIds = billsToPay.value.map(bill => bill.id)

    // 🆕 Collect all item IDs from bills being paid
    const itemIds: string[] = []
    for (const bill of billsToPay.value) {
      for (const item of bill.items) {
        if (item.status !== 'cancelled') {
          itemIds.push(item.id)
        }
      }
    }

    let result
    if (selectedMethodType.value === 'cash') {
      result = await paymentsStore.processSimplePayment(
        order.value.id,
        billIds,
        itemIds,
        selectedPaymentMethod.value,
        totalAmount.value,
        receivedAmount.value
      )
    } else {
      result = await paymentsStore.processSimplePayment(
        order.value.id,
        billIds,
        itemIds,
        selectedPaymentMethod.value,
        totalAmount.value
      )
    }

    if (result.success) {
      console.log('✅ Платеж обработан успешно')

      // Print receipt if needed
      if (result.data) {
        await paymentsStore.printReceipt(result.data.id)
      }

      emit('payment-completed', order.value.id)
      closeDialog()
    } else {
      console.error('❌ Ошибка обработки платежа:', result.error)
      // TODO: Show error message
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    processing.value = false
  }
}

// Helper functions
function getOrderStatusText(status: OrderStatus): string {
  const statuses = {
    draft: 'Черновик',
    confirmed: 'Подтвержден',
    preparing: 'Готовится',
    ready: 'Готов',
    served: 'Подан',
    paid: 'Оплачен',
    cancelled: 'Отменен'
  }
  return statuses[status] || status
}

function getOrderStatusColor(status: OrderStatus): string {
  const colors = {
    draft: 'grey',
    confirmed: 'info',
    preparing: 'warning',
    ready: 'success',
    served: 'primary',
    paid: 'green',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}
</script>

<style scoped>
.payment-toggle {
  width: 100%;
}

.payment-toggle .v-btn {
  flex: 1;
}

.cash-payment,
.card-payment {
  min-height: 120px;
}

.change-amount {
  border-radius: 8px;
}

.bills-summary {
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}

.total-section {
  background-color: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
}
</style>
