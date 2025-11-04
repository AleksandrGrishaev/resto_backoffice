<!-- src/views/pos/payment/PaymentDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="600" persistent @update:model-value="handleClose">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cash-register" class="mr-2" />
          <span>Payment Checkout</span>
        </div>
        <v-btn icon variant="text" size="small" @click="handleClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Order Summary -->
        <div class="order-summary mb-6">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Order Summary</h3>

          <div class="summary-row">
            <span class="text-medium-emphasis">Subtotal:</span>
            <span>{{ formatPrice(amount) }}</span>
          </div>

          <div v-if="discount > 0" class="summary-row">
            <span class="text-medium-emphasis">Discount:</span>
            <span class="text-success">-{{ formatPrice(discount) }}</span>
          </div>

          <div v-if="serviceTax > 0" class="summary-row">
            <span class="text-medium-emphasis">Service Tax (5%):</span>
            <span>{{ formatPrice(serviceTax) }}</span>
          </div>

          <div v-if="governmentTax > 0" class="summary-row">
            <span class="text-medium-emphasis">Government Tax (10%):</span>
            <span>{{ formatPrice(governmentTax) }}</span>
          </div>

          <v-divider class="my-3" />

          <div class="summary-row text-h6 font-weight-bold">
            <span>Total:</span>
            <span class="text-primary">{{ formatPrice(totalAmount) }}</span>
          </div>
        </div>

        <!-- Items List (if provided) -->
        <PaymentItemsList v-if="items.length > 0" :items="items" class="mb-4" />

        <!-- Payment Method Selection -->
        <div class="payment-method mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Payment Method</h3>

          <v-radio-group v-model="selectedMethod" inline hide-details>
            <v-radio value="cash" color="success">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-cash" class="mr-2" size="20" />
                  <span>Cash</span>
                </div>
              </template>
            </v-radio>

            <v-radio value="card" color="primary">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-credit-card" class="mr-2" size="20" />
                  <span>Card</span>
                </div>
              </template>
            </v-radio>

            <v-radio value="qr" color="info">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-qrcode" class="mr-2" size="20" />
                  <span>QR Code</span>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <!-- Cash Payment Details -->
        <div v-if="selectedMethod === 'cash'" class="cash-payment">
          <v-text-field
            v-model.number="cashReceived"
            label="Cash Received"
            prefix="Rp"
            type="number"
            variant="outlined"
            :min="totalAmount"
            :rules="[cashValidationRule]"
            :error="cashReceived > 0 && cashReceived < totalAmount"
            :hint="
              cashReceived > 0 && cashReceived < totalAmount
                ? 'Amount must be at least the total'
                : ''
            "
            persistent-hint
          >
            <template #append-inner>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click="cashReceived = totalAmount"
              >
                Exact
              </v-btn>
            </template>
          </v-text-field>

          <!-- Change Display -->
          <v-alert
            v-if="change > 0"
            type="success"
            variant="tonal"
            class="mt-4"
            border="start"
            prominent
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-subtitle-2">Change to Return:</div>
                <div class="text-h5 font-weight-bold">{{ formatPrice(change) }}</div>
              </div>
              <v-icon size="48">mdi-cash-multiple</v-icon>
            </div>
          </v-alert>
        </div>

        <!-- Card Payment Info -->
        <div v-if="selectedMethod === 'card'" class="card-payment">
          <v-alert type="info" variant="tonal" border="start">
            <div class="d-flex align-center">
              <v-icon icon="mdi-credit-card-outline" class="mr-3" size="32" />
              <div>
                <div class="text-subtitle-2 font-weight-bold">Card Payment</div>
                <div class="text-caption">Please process the card payment on the terminal</div>
              </div>
            </div>
          </v-alert>
        </div>

        <!-- QR Payment Info -->
        <div v-if="selectedMethod === 'qr'" class="qr-payment">
          <v-alert type="info" variant="tonal" border="start">
            <div class="d-flex align-center">
              <v-icon icon="mdi-qrcode-scan" class="mr-3" size="32" />
              <div>
                <div class="text-subtitle-2 font-weight-bold">QR Code Payment</div>
                <div class="text-caption">Customer will scan QR code to complete payment</div>
              </div>
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          size="large"
          :disabled="!canConfirm"
          :loading="processing"
          @click="handleConfirm"
        >
          <v-icon start>mdi-check-circle</v-icon>
          Complete Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosBillItem } from '@/stores/pos/types'
import PaymentItemsList from './widgets/PaymentItemsList.vue'

interface Props {
  modelValue: boolean
  amount: number
  discount?: number
  serviceTax?: number
  governmentTax?: number
  billIds?: string[]
  orderId?: string
  items?: PosBillItem[]
}

const props = withDefaults(defineProps<Props>(), {
  discount: 0,
  serviceTax: 0,
  governmentTax: 0,
  billIds: () => [],
  orderId: '',
  items: () => []
})

interface PaymentData {
  method: 'cash' | 'card' | 'qr'
  amount: number
  receivedAmount?: number
  change?: number
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: PaymentData]
  cancel: []
}>()

// State
const selectedMethod = ref<'cash' | 'card' | 'qr'>('cash')
const cashReceived = ref<number>(0)
const processing = ref(false)

// Computed
const totalAmount = computed(() => {
  return props.amount - props.discount + props.serviceTax + props.governmentTax
})

const change = computed(() => {
  if (selectedMethod.value !== 'cash') return 0
  if (cashReceived.value <= 0) return 0
  return Math.max(0, cashReceived.value - totalAmount.value)
})

const canConfirm = computed(() => {
  if (selectedMethod.value === 'cash') {
    return cashReceived.value >= totalAmount.value
  }
  return true
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const cashValidationRule = (value: number) => {
  if (!value || value < totalAmount.value) {
    return `Minimum amount is ${formatPrice(totalAmount.value)}`
  }
  return true
}

const handleClose = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const handleConfirm = () => {
  if (!canConfirm.value) return

  processing.value = true

  const paymentData: PaymentData = {
    method: selectedMethod.value,
    amount: totalAmount.value
  }

  if (selectedMethod.value === 'cash') {
    paymentData.receivedAmount = cashReceived.value
    paymentData.change = change.value
  }

  emit('confirm', paymentData)

  // Reset form (will be closed by parent)
  setTimeout(() => {
    processing.value = false
    resetForm()
  }, 500)
}

const resetForm = () => {
  selectedMethod.value = 'cash'
  cashReceived.value = 0
}

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      // Reset form when dialog opens
      resetForm()
      // Auto-fill exact amount for convenience
      setTimeout(() => {
        cashReceived.value = totalAmount.value
      }, 100)
    }
  }
)
</script>

<style scoped>
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 0.95rem;
}

.summary-row:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.payment-method :deep(.v-radio) {
  padding: 12px 16px;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  margin-right: 12px;
  transition: all 0.2s ease;
}

.payment-method :deep(.v-radio:hover) {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.04);
}

.payment-method :deep(.v-selection-control--dirty) {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.cash-payment,
.card-payment,
.qr-payment {
  margin-top: 16px;
}
</style>
