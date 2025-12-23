<!-- src/views/pos/payment/PaymentDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="1000" persistent @update:model-value="handleClose">
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

      <v-card-text class="pt-4 pb-2">
        <v-row>
          <!-- LEFT COLUMN: Items List -->
          <v-col cols="12" md="5" class="items-column pr-md-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">Items to Pay ({{ items.length }})</h3>
            <PaymentItemsList v-if="items.length > 0" :items="items" />
          </v-col>

          <!-- RIGHT COLUMN: Order Summary + Payment -->
          <v-col cols="12" md="7" class="payment-column pl-md-4">
            <!-- Order Summary (Compact) -->
            <div class="order-summary-compact mb-4">
              <h3 class="text-subtitle-1 font-weight-bold mb-2">Order Summary</h3>

              <div class="summary-row-compact">
                <span class="text-body-2">Subtotal:</span>
                <span class="text-body-2">{{ formatPrice(amount) }}</span>
              </div>

              <!-- Item Discounts (already applied to items) -->
              <div v-if="itemDiscounts > 0" class="summary-row-compact">
                <span class="text-body-2 text-medium-emphasis">
                  <v-icon size="12" class="mr-1">mdi-tag</v-icon>
                  Product Discount:
                </span>
                <span class="text-body-2 text-success">-{{ formatPrice(itemDiscounts) }}</span>
              </div>

              <!-- Bill Discount (applied to whole bill) -->
              <div v-if="localDiscount > 0" class="summary-row-compact">
                <span class="text-body-2 text-medium-emphasis">
                  <v-icon size="12" class="mr-1">mdi-tag-multiple</v-icon>
                  Bill Discount:
                </span>
                <span class="text-body-2 text-success">-{{ formatPrice(localDiscount) }}</span>
              </div>

              <div v-if="recalculatedServiceTax > 0" class="summary-row-compact">
                <span class="text-body-2">Service Tax (5%):</span>
                <span class="text-body-2">{{ formatPrice(recalculatedServiceTax) }}</span>
              </div>

              <div v-if="recalculatedGovernmentTax > 0" class="summary-row-compact">
                <span class="text-body-2">Government Tax (10%):</span>
                <span class="text-body-2">{{ formatPrice(recalculatedGovernmentTax) }}</span>
              </div>

              <v-divider class="my-2" />

              <div class="summary-row-compact">
                <span class="text-h6 font-weight-bold">Total:</span>
                <span class="text-h6 font-weight-bold text-primary">
                  {{ formatPrice(totalAmount) }}
                </span>
              </div>
            </div>

            <!-- Payment Method Selection (Horizontal Slider) -->
            <div class="payment-method mb-4">
              <h3 class="text-subtitle-1 font-weight-bold mb-2">Payment Method</h3>

              <v-slide-group v-model="selectedMethod" mandatory show-arrows class="payment-slider">
                <v-slide-group-item
                  v-for="method in availablePaymentMethods"
                  :key="method.code"
                  v-slot="{ isSelected, toggle }"
                  :value="method.code"
                >
                  <v-card
                    :color="isSelected ? 'primary' : 'surface'"
                    :variant="isSelected ? 'flat' : 'outlined'"
                    class="ma-1 payment-method-card"
                    height="80"
                    min-width="90"
                    @click="toggle"
                  >
                    <v-card-text
                      class="pa-2 text-center d-flex flex-column align-center justify-center"
                      style="height: 100%"
                    >
                      <v-icon
                        :icon="method.icon || getDefaultIcon(method.type)"
                        :color="isSelected ? 'white' : method.iconColor || 'primary'"
                        size="28"
                      />
                      <div class="text-caption mt-1" :class="isSelected ? 'text-white' : ''">
                        {{ method.name }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-slide-group-item>
              </v-slide-group>
            </div>

            <!-- Cash Payment Details -->
            <div v-if="selectedMethod === 'cash'" class="cash-payment mb-4">
              <v-text-field
                v-model.number="cashReceived"
                label="Cash Received"
                prefix="Rp"
                type="number"
                variant="outlined"
                density="compact"
                :min="totalAmount"
                :rules="[cashValidationRule]"
                :error="cashReceived > 0 && cashReceived < totalAmount"
                hide-details
              >
                <template #append-inner>
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    @click="cashReceived = totalAmount"
                  >
                    EXACT
                  </v-btn>
                </template>
              </v-text-field>

              <!-- Change Display -->
              <v-alert
                v-if="change > 0"
                type="success"
                variant="tonal"
                class="mt-2"
                density="compact"
              >
                <div class="d-flex justify-space-between align-center">
                  <span class="text-body-2">Change:</span>
                  <span class="text-h6 font-weight-bold">{{ formatPrice(change) }}</span>
                </div>
              </v-alert>
            </div>

            <!-- Bank Payment Info (Card, QR, BNI, etc.) -->
            <div v-if="selectedMethodType === 'bank'" class="bank-payment mb-4">
              <v-alert type="info" variant="tonal" density="compact">
                <div class="d-flex align-center">
                  <v-icon
                    :icon="selectedMethodIcon"
                    :color="selectedMethodColor"
                    class="mr-2"
                    size="24"
                  />
                  <div class="text-body-2">
                    Waiting for {{ selectedMethodName }} payment confirmation
                  </div>
                </div>
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="px-6 pb-4">
        <!-- Add/Update Discount Button (left side) -->
        <v-btn
          v-if="currentBill"
          variant="outlined"
          color="primary"
          prepend-icon="mdi-tag-percent"
          @click="handleOpenDiscountDialog"
        >
          {{ localDiscount > 0 ? 'Update Discount' : 'Add Discount' }}
        </v-btn>

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

    <!-- Bill Discount Dialog (preview mode - don't save to order) -->
    <BillDiscountDialog
      v-model="showBillDiscountDialog"
      :bill="currentBill"
      :apply-to-order="false"
      @success="handleDiscountSuccess"
      @cancel="handleDiscountCancel"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosBillItem, PosBill } from '@/stores/pos/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { DISCOUNT_REASON_LABELS } from '@/stores/discounts/constants'
import PaymentItemsList from './widgets/PaymentItemsList.vue'
import BillDiscountDialog from '../order/dialogs/BillDiscountDialog.vue'

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

// Stores
const ordersStore = usePosOrdersStore()
const paymentSettingsStore = usePaymentSettingsStore()

interface PaymentData {
  method: string
  amount: number
  receivedAmount?: number
  change?: number
  billDiscount?: {
    amount: number
    reason: string
    type: string
    value: number
  }
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: PaymentData]
  cancel: []
}>()

// State
const selectedMethod = ref<string>('cash')
const cashReceived = ref<number>(0)
const processing = ref(false)
const localDiscount = ref<number>(0) // Temporary bill discount (not saved to order)
const localDiscountReason = ref<string>('') // Reason for bill discount
const showBillDiscountDialog = ref(false)

// Payment Methods (already sorted by displayOrder from the store)
const availablePaymentMethods = computed(() => {
  const methods = paymentSettingsStore.activePaymentMethods
  if (methods.length === 0) {
    // Fallback to cash if no methods loaded yet
    return [{ code: 'cash', name: 'Cash', icon: 'mdi-cash', iconColor: 'success', type: 'cash' }]
  }
  return methods.map(method => ({
    code: method.code,
    name: method.name,
    icon: method.icon,
    iconColor: method.iconColor,
    type: method.type
  }))
})

// Selected payment method info (for bank payment alert)
const selectedMethodType = computed(() => {
  const method = availablePaymentMethods.value.find(m => m.code === selectedMethod.value)
  return method?.type || 'cash'
})

const selectedMethodIcon = computed(() => {
  const method = availablePaymentMethods.value.find(m => m.code === selectedMethod.value)
  return method?.icon || getDefaultIcon(selectedMethodType.value)
})

const selectedMethodColor = computed(() => {
  const method = availablePaymentMethods.value.find(m => m.code === selectedMethod.value)
  return method?.iconColor || 'primary'
})

const selectedMethodName = computed(() => {
  const method = availablePaymentMethods.value.find(m => m.code === selectedMethod.value)
  return method?.name || selectedMethod.value
})

// Computed
const currentBill = computed((): PosBill | null => {
  if (!props.billIds || props.billIds.length === 0) return null
  const order = ordersStore.currentOrder
  if (!order) return null
  // Get the original bill
  const originalBill = order.bills.find((b: any) => b.id === props.billIds[0])
  if (!originalBill) return null

  // Create a temporary bill with ONLY the items being paid (props.items)
  // This excludes already paid items and cancelled items
  return {
    ...originalBill,
    items: props.items.filter(item => item.paymentStatus !== 'paid' && item.status !== 'cancelled')
  }
})

// Calculate total item discounts from items
const itemDiscounts = computed(() => {
  if (!props.items || props.items.length === 0) return 0

  return props.items.reduce((total, item) => {
    if (!item.discounts || item.discounts.length === 0) return total

    const itemDiscountAmount = item.discounts.reduce((sum: number, discount: any) => {
      if (discount.type === 'percentage') {
        return sum + (item.totalPrice * discount.value) / 100
      } else {
        return sum + discount.value
      }
    }, 0)

    return total + itemDiscountAmount
  }, 0)
})

// Amount after item discounts (this is the base for bill discount)
const amountAfterItemDiscounts = computed(() => {
  return Math.max(0, props.amount - itemDiscounts.value)
})

// Recalculate taxes based on amount after ALL discounts (item + bill)
const amountAfterDiscount = computed(() => {
  return Math.max(0, amountAfterItemDiscounts.value - localDiscount.value)
})

const recalculatedServiceTax = computed(() => {
  return amountAfterDiscount.value * 0.05 // 5%
})

const recalculatedGovernmentTax = computed(() => {
  return amountAfterDiscount.value * 0.1 // 10%
})

const totalAmount = computed(() => {
  return amountAfterDiscount.value + recalculatedServiceTax.value + recalculatedGovernmentTax.value
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

  // Include bill discount if applied
  if (localDiscount.value > 0) {
    paymentData.billDiscount = {
      amount: localDiscount.value,
      reason: localDiscountReason.value,
      type: 'bill', // Mark as bill-level discount
      value: localDiscount.value // For now, store the calculated amount
    }

    console.log('💰 Bill discount included in payment:', paymentData.billDiscount)
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
  localDiscount.value = 0
  localDiscountReason.value = ''
}

const handleOpenDiscountDialog = () => {
  if (!currentBill.value) {
    console.warn('No bill selected for discount')
    return
  }
  showBillDiscountDialog.value = true
}

const handleDiscountSuccess = async (discountData: { amount: number; reason: string }) => {
  // Bill discount applied successfully via BillDiscountDialog
  // Store temporarily in PaymentDialog (NOT saved to order yet)
  localDiscount.value = discountData.amount
  localDiscountReason.value = discountData.reason
  console.log('💰 Temporary bill discount set in PaymentDialog:', {
    amount: localDiscount.value,
    reason: localDiscountReason.value
  })
  showBillDiscountDialog.value = false
}

const handleDiscountCancel = () => {
  showBillDiscountDialog.value = false
}

const getMethodColor = (code: string): string => {
  const colorMap: Record<string, string> = {
    cash: 'success',
    card: 'primary',
    qr: 'info',
    bni: 'warning',
    gojek: 'success',
    grab: 'success'
  }
  return colorMap[code] || 'primary'
}

const getDefaultIcon = (type: string): string => {
  switch (type) {
    case 'cash':
      return 'mdi-cash'
    case 'bank':
      return 'mdi-credit-card'
    default:
      return 'mdi-wallet'
  }
}

const getDiscountReasonLabel = (reason: string): string => {
  return DISCOUNT_REASON_LABELS[reason as keyof typeof DISCOUNT_REASON_LABELS] || reason
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
/* Two-column layout */
.items-column {
  max-height: 450px;
  overflow-y: auto;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

@media (max-width: 960px) {
  .items-column {
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    max-height: 300px;
  }
}

.payment-column {
  min-height: 400px;
}

/* Compact summary rows */
.summary-row-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.summary-row-compact:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

/* Payment method slider */
.payment-slider {
  margin: 0 -8px;
}

.payment-method-card {
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.payment-method-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Payment input sections */
.cash-payment,
.bank-payment {
  min-height: 60px;
}
</style>
