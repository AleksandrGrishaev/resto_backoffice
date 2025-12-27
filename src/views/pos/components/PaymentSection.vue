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
            <v-btn value="cash" size="large">
              <v-icon start>mdi-cash</v-icon>
              Наличные
            </v-btn>
            <v-btn value="card" size="large">
              <v-icon start>mdi-credit-card</v-icon>
              Карта
            </v-btn>
            <v-btn value="qr" size="large">
              <v-icon start>mdi-qrcode</v-icon>
              QR-код
            </v-btn>
          </v-btn-toggle>

          <!-- Cash Payment -->
          <div v-if="selectedPaymentMethod === 'cash'" class="cash-payment">
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

          <!-- Card Payment -->
          <div v-if="selectedPaymentMethod === 'card'" class="card-payment">
            <v-alert color="info" variant="tonal">
              <div class="text-center">
                <v-icon size="48" class="mb-2">mdi-credit-card</v-icon>
                <div>Вставьте или приложите карту к терминалу</div>
                <div class="text-caption">Сумма: ₽{{ totalAmount.toFixed(2) }}</div>
              </div>
            </v-alert>
          </div>

          <!-- QR Payment -->
          <div v-if="selectedPaymentMethod === 'qr'" class="qr-payment">
            <v-alert color="info" variant="tonal">
              <div class="text-center">
                <v-icon size="48" class="mb-2">mdi-qrcode</v-icon>
                <div>Покажите QR-код клиенту для оплаты</div>
                <div class="text-caption">Сумма: ₽{{ totalAmount.toFixed(2) }}</div>
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

// State
const dialog = ref(props.modelValue)
const selectedPaymentMethod = ref<PaymentMethod>('cash')
const receivedAmount = ref(0)
const processing = ref(false)

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
  if (selectedPaymentMethod.value !== 'cash') return 0
  return Math.max(0, receivedAmount.value - totalAmount.value)
})

const canProcessPayment = computed(() => {
  if (!order.value || billsToPay.value.length === 0) return false

  if (selectedPaymentMethod.value === 'cash') {
    return receivedAmount.value >= totalAmount.value
  }

  return true // For card and QR payments
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
  if (selectedPaymentMethod.value === 'cash') {
    receivedAmount.value = newAmount
  }
})

// Methods
function handleDialogUpdate(value: boolean) {
  dialog.value = value
}

function initializePayment() {
  if (!order.value) return

  // Reset form
  selectedPaymentMethod.value = 'cash'
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

    let result
    if (selectedPaymentMethod.value === 'cash') {
      result = await paymentsStore.processSimplePayment(
        order.value.id,
        billIds,
        'cash',
        totalAmount.value,
        receivedAmount.value
      )
    } else {
      result = await paymentsStore.processSimplePayment(
        order.value.id,
        billIds,
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
.card-payment,
.qr-payment {
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
