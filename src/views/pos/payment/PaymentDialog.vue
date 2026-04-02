<!-- src/views/pos/payment/PaymentDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    persistent
    content-class="payment-dialog-wrapper"
    @update:model-value="handleClose"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cash-register" class="mr-2" />
          <span>Payment Checkout</span>
        </div>
        <div class="d-flex align-center gap-2">
          <!-- Printer Status -->
          <PrinterStatus />
          <v-btn icon variant="text" size="small" @click="handleClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text class="dialog-content pa-0">
        <v-row no-gutters class="fill-height">
          <!-- LEFT COLUMN: Items + Customer -->
          <v-col cols="12" md="5" class="left-column d-flex flex-column">
            <!-- Items List (scrollable) -->
            <div class="items-scroll flex-grow-1 pa-4">
              <PaymentItemsList v-if="items.length > 0" :items="items" />
            </div>

            <!-- Customer/Loyalty + Guest Count (pinned at bottom of left column) -->
            <div
              v-if="customerId || stampCardInfo || totalGuestCount > 0"
              class="loyalty-section d-flex align-center flex-wrap gap-3 px-4 py-3"
            >
              <!-- Guest Count Chip (sum of all bills being paid) -->
              <v-chip
                v-if="totalGuestCount > 0"
                color="light-blue"
                variant="flat"
                size="small"
                class="mr-1"
                @click="showGuestCountEdit = true"
              >
                <v-icon start size="14">mdi-account-group</v-icon>
                {{ totalGuestCount }} guest{{ totalGuestCount > 1 ? 's' : '' }}
              </v-chip>
              <v-chip
                v-if="customerName"
                color="blue"
                variant="tonal"
                size="small"
                closable
                @click:close="emit('update:customer', null)"
              >
                <v-icon start size="14">mdi-account-star</v-icon>
                {{ customerName }}
                <span v-if="customerBalance > 0" class="ml-1">
                  — {{ formatPrice(customerBalance) }}
                </span>
              </v-chip>
              <v-chip
                v-if="customerPersonalDiscount > 0"
                color="orange"
                variant="tonal"
                size="small"
              >
                <v-icon start size="14">mdi-percent</v-icon>
                {{ customerPersonalDiscount }}% {{ customerDiscountNote || 'Personal' }}
              </v-chip>
              <v-chip
                v-if="stampCardInfo"
                color="amber-darken-2"
                variant="tonal"
                size="small"
                closable
                @click:close="emit('update:card', null)"
              >
                <v-icon start size="14">mdi-stamper</v-icon>
                #{{ stampCardInfo.cardNumber }} — {{ stampCardInfo.stamps }}/{{
                  stampCardInfo.stampsPerCycle
                }}
                <span v-if="stampCardInfo.activeReward" class="ml-1 text-success">
                  ({{ stampCardInfo.activeReward.category }})
                </span>
              </v-chip>
              <v-btn icon size="x-small" variant="text" @click="emit('open-loyalty', 'customer')">
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
            </div>
          </v-col>

          <!-- RIGHT COLUMN: Summary + Payment (scrollable) -->
          <v-col cols="12" md="7" class="right-column" style="padding: 20px 16px 24px">
            <!-- Order Summary (Compact) -->
            <div class="order-summary-compact mb-3">
              <h3 class="text-subtitle-2 font-weight-bold mb-1">Order Summary</h3>

              <div class="summary-row-compact">
                <span class="text-body-2">Subtotal:</span>
                <span class="text-body-2">{{ formatPrice(amount) }}</span>
              </div>

              <div v-if="itemDiscounts > 0" class="summary-row-compact">
                <span class="text-body-2 text-medium-emphasis">
                  <v-icon size="12" class="mr-1">mdi-tag</v-icon>
                  Product Discount:
                </span>
                <span class="text-body-2 text-success">-{{ formatPrice(itemDiscounts) }}</span>
              </div>

              <div v-if="localDiscount > 0" class="summary-row-compact">
                <span class="text-body-2 text-medium-emphasis">
                  <v-icon size="12" class="mr-1">mdi-tag-multiple</v-icon>
                  <template v-if="hasPersonalDiscount">
                    {{ customerDiscountNote || 'Owner Family' }} ({{ customerPersonalDiscount }}%):
                  </template>
                  <template v-else>Bill Discount:</template>
                </span>
                <span class="text-body-2 text-success">-{{ formatPrice(localDiscount) }}</span>
              </div>

              <template v-if="taxMode === 'inclusive'">
                <div class="summary-row-compact">
                  <span class="text-body-2 text-medium-emphasis">
                    <v-icon size="12" class="mr-1">mdi-information</v-icon>
                    Taxes included in price
                  </span>
                </div>
              </template>
              <template v-else>
                <div v-for="tax in taxBreakdown" :key="tax.name" class="summary-row-compact">
                  <span class="text-body-2">{{ tax.name }} ({{ tax.percentage }}%):</span>
                  <span class="text-body-2">{{ formatPrice(tax.amount) }}</span>
                </div>
              </template>

              <v-divider class="my-2" />

              <template v-if="effectivePointsRedeem > 0">
                <div class="summary-row-compact">
                  <span class="text-body-2 text-deep-purple">
                    <v-icon size="12" class="mr-1">mdi-wallet</v-icon>
                    Points Used:
                  </span>
                  <span class="text-body-2 text-success">
                    -{{ formatPrice(effectivePointsRedeem) }}
                  </span>
                </div>
              </template>

              <div class="summary-row-compact">
                <span class="text-h6 font-weight-bold">Total:</span>
                <span class="text-h6 font-weight-bold text-primary">
                  {{ formatPrice(totalAmount) }}
                </span>
              </div>

              <!-- Stamps earned info -->
              <div v-if="stampCardInfo && stampsEarned > 0" class="stamps-earned-row mt-2">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-body-2 d-flex align-center">
                    <v-icon size="16" color="amber-darken-2" class="mr-1">mdi-stamper</v-icon>
                    Stamps earned:
                  </span>
                  <span class="text-body-2 font-weight-bold text-amber-darken-2">
                    +{{ stampsEarned }}
                    <span class="text-medium-emphasis font-weight-regular">
                      ({{ stampCardInfo.stamps }} + {{ stampsEarned }} =
                      {{ stampCardInfo.stamps + stampsEarned }}/{{ stampCardInfo.stampsPerCycle }})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Use Points Section -->
            <div v-if="customerId && customerBalance > 0" class="use-points mb-3">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                  <v-icon size="18" color="deep-purple">mdi-wallet</v-icon>
                  <span class="text-body-2 font-weight-medium">
                    {{ customerName || 'Customer' }} — {{ formatPrice(customerBalance) }}
                  </span>
                </div>
                <v-switch
                  v-model="usePoints"
                  color="deep-purple"
                  density="compact"
                  hide-details
                  label="Use Points"
                />
              </div>
              <div v-if="usePoints" class="mt-2">
                <v-text-field
                  v-model.number="pointsToRedeem"
                  type="number"
                  label="Points to redeem (IDR)"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :min="0"
                  :max="Math.min(customerBalance, amountAfterDiscount + totalTaxAmount)"
                  prefix="Rp"
                >
                  <template #append-inner>
                    <v-btn
                      size="small"
                      variant="text"
                      color="deep-purple"
                      @click="
                        pointsToRedeem = Math.min(
                          customerBalance,
                          amountAfterDiscount + totalTaxAmount
                        )
                      "
                    >
                      MAX
                    </v-btn>
                  </template>
                </v-text-field>
              </div>
            </div>

            <!-- Payment Method Selection -->
            <div class="payment-method mb-3">
              <h3 class="text-subtitle-2 font-weight-bold mb-2">Payment Method</h3>

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
                    height="72"
                    min-width="80"
                    @click="toggle"
                  >
                    <v-card-text
                      class="pa-2 text-center d-flex flex-column align-center justify-center"
                      style="height: 100%"
                    >
                      <v-icon
                        :icon="method.icon || getDefaultIcon(method.type)"
                        :color="isSelected ? 'white' : method.iconColor || 'primary'"
                        size="24"
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
            <div v-if="selectedMethod === 'cash'" class="cash-payment">
              <NumericInputField
                v-model="cashReceived"
                label="Cash Received"
                prefix="Rp"
                :min="0"
                :max="999999999"
                :format-as-currency="true"
                variant="outlined"
                density="compact"
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
              </NumericInputField>

              <!-- Change Display -->
              <div v-if="change > 0" class="change-display mt-2">
                <span class="text-body-2">Change:</span>
                <span class="text-h6 font-weight-bold text-success">{{ formatPrice(change) }}</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="px-6 pb-4">
        <!-- Pre-Bill Print Button (always visible for fraud tracking) -->
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-printer"
          :loading="isPrintingPreBill"
          :disabled="!isPrinterConnected"
          @click="handlePrintPreBill"
        >
          <template v-if="preBillPrinted">
            <v-icon color="success" size="16" class="me-1">mdi-check</v-icon>
            Re-Print Pre-Bill
          </template>
          <template v-else>Pre-Bill</template>
        </v-btn>

        <!-- Discount Menu (3 options) -->
        <v-menu v-if="currentBill" location="top start">
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="outlined"
              color="primary"
              prepend-icon="mdi-tag-percent"
              class="ml-2"
              v-bind="menuProps"
            >
              {{ localDiscount > 0 || effectivePointsRedeem > 0 ? 'Discount' : 'Add Discount' }}
            </v-btn>
          </template>

          <v-list density="compact" min-width="220">
            <!-- Customer / Card -->
            <v-list-item prepend-icon="mdi-account-star" @click="emit('open-loyalty', 'customer')">
              <v-list-item-title>
                {{ customerId ? 'Change Customer / Card' : 'Add Customer / Card' }}
              </v-list-item-title>
              <v-list-item-subtitle v-if="customerName">{{ customerName }}</v-list-item-subtitle>
              <v-list-item-subtitle v-else>Loyalty, stamps, points</v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-1" />

            <!-- Manual Discount (disabled when personal discount is active) -->
            <v-list-item
              prepend-icon="mdi-pencil"
              :disabled="hasPersonalDiscount"
              @click="handleOpenDiscountDialog"
            >
              <v-list-item-title>Manual Discount</v-list-item-title>
              <v-list-item-subtitle v-if="hasPersonalDiscount">
                Overridden by personal discount ({{ customerPersonalDiscount }}%)
              </v-list-item-subtitle>
              <v-list-item-subtitle v-else>Custom amount or %</v-list-item-subtitle>
            </v-list-item>

            <!-- Stamp Card Reward (disabled when personal discount is active) -->
            <v-list-item
              v-if="stampCardInfo?.activeReward"
              prepend-icon="mdi-gift"
              :disabled="hasPersonalDiscount"
              @click="handleStampCardReward"
            >
              <v-list-item-title>Stamp Card Reward</v-list-item-title>
              <v-list-item-subtitle v-if="hasPersonalDiscount">
                Overridden by personal discount
              </v-list-item-subtitle>
              <v-list-item-subtitle v-else>
                {{ stampCardInfo.activeReward.category }} — up to
                {{ formatPrice(stampCardInfo.activeReward.maxDiscount) }}
              </v-list-item-subtitle>
            </v-list-item>

            <!-- Points / Cashback (only if customer with balance) -->
            <v-list-item
              v-if="customerId && customerBalance > 0"
              prepend-icon="mdi-wallet"
              @click="handleTogglePoints"
            >
              <v-list-item-title>Use Points</v-list-item-title>
              <v-list-item-subtitle>
                Balance: {{ formatPrice(customerBalance) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>

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

    <!-- Guest Count Edit Dialog -->
    <GuestCountDialog v-model="showGuestCountEdit" @confirm="handleGuestCountUpdate" />

    <!-- Bill Discount Dialog (preview mode - don't save to order) -->
    <BillDiscountDialog
      v-model="showBillDiscountDialog"
      :bill="currentBill"
      :apply-to-order="false"
      :stamp-card-reward="stampCardInfo?.activeReward || null"
      @success="handleDiscountSuccess"
      @cancel="handleDiscountCancel"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PosBillItem, PosBill, PreBillSnapshot } from '@/stores/pos/types'
import type { StampCardInfo } from '@/stores/loyalty'
import type { ReceiptData, ReceiptItem } from '@/core/printing/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useLoyaltyStore } from '@/stores/loyalty'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { useChannelsStore } from '@/stores/channels'
import { DISCOUNT_REASON_LABELS } from '@/stores/discounts/constants'
import { DebugUtils, TimeUtils } from '@/utils'
import { usePrinter } from '@/core/printing'
import { supabase } from '@/supabase/client'
import { createPreBillSnapshot } from '@/stores/pos/utils/preBillTracking'
import PaymentItemsList from './widgets/PaymentItemsList.vue'
import PrinterStatus from './widgets/PrinterStatus.vue'
import BillDiscountDialog from '../order/dialogs/BillDiscountDialog.vue'
import GuestCountDialog from '../order/dialogs/GuestCountDialog.vue'
import type { Customer } from '@/stores/customers'

interface Props {
  modelValue: boolean
  amount: number
  discount?: number
  serviceTax?: number
  governmentTax?: number
  billIds?: string[]
  orderId?: string
  items?: PosBillItem[]
  channelId?: string
  customerId?: string | null
  customerBalance?: number
  customerName?: string
  customerPersonalDiscount?: number
  customerDiscountNote?: string
  stampCardInfo?: StampCardInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  discount: 0,
  serviceTax: 0,
  governmentTax: 0,
  billIds: () => [],
  orderId: '',
  items: () => [],
  channelId: '',
  customerId: null,
  customerBalance: 0,
  customerName: '',
  customerPersonalDiscount: 0,
  customerDiscountNote: '',
  stampCardInfo: null
})

// Stores
const ordersStore = usePosOrdersStore()
const paymentSettingsStore = usePaymentSettingsStore()
const channelsStore = useChannelsStore()
const loyaltyStore = useLoyaltyStore()

// Printer
const { isConnected: isPrinterConnected, settings: printerSettings, printPreBill } = usePrinter()
const isPrintingPreBill = ref(false)

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
    stampCardReward?: {
      stamps: number
      category: string
      categoryIds: string[]
      maxDiscount: number
    }
  }
  pointsRedeemed?: number
}

interface PreBillPrintedData {
  billId: string
  snapshot: PreBillSnapshot
  printedAt: string
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: PaymentData]
  cancel: []
  'pre-bill-printed': [data: PreBillPrintedData]
  'update:customer': [customer: Customer | null]
  'update:card': [card: StampCardInfo | null]
  'open-loyalty': [tab: 'card' | 'customer']
}>()

// State
const selectedMethod = ref<string>('cash')
const cashReceived = ref<number>(0)
const processing = ref(false)
const localDiscount = ref<number>(0) // Temporary bill discount (not saved to order)
const localDiscountReason = ref<string>('') // Reason for bill discount
const showBillDiscountDialog = ref(false)
const showGuestCountEdit = ref(false)
const preBillPrinted = ref(false) // Track if pre-bill was printed in this session
const usePoints = ref(false) // Whether to apply loyalty points
const pointsToRedeem = ref<number>(0) // Amount of points to redeem
let resetTimer: ReturnType<typeof setTimeout> | null = null // L2: cancellable reset timer

// Payment Methods — filtered by channel if available
const availablePaymentMethods = computed(() => {
  // If channelId provided, filter by channel's linked payment methods
  if (props.channelId) {
    const channelMethods = channelsStore.getPaymentMethodsForChannel(props.channelId)
    if (channelMethods.length > 0) {
      return channelMethods.map(cm => ({
        code: cm.paymentMethodCode,
        name: cm.paymentMethodName,
        icon: cm.paymentMethodIcon,
        iconColor: cm.paymentMethodIconColor,
        type: cm.paymentMethodType
      }))
    }
  }

  // Fallback: all active methods from global store
  const methods = paymentSettingsStore.activePaymentMethods
  if (methods.length === 0) {
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

// Total guest count across all bills being paid
const totalGuestCount = computed((): number => {
  const order = ordersStore.currentOrder
  if (!order || !props.billIds?.length) return 0
  return props.billIds.reduce((sum, id) => {
    const bill = order.bills.find(b => b.id === id)
    return sum + (bill?.guestCount || 0)
  }, 0)
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

// Dynamic taxes — channel-aware
const channelTaxes = computed(() => {
  if (props.channelId) {
    const channel = channelsStore.getChannelById(props.channelId)
    if (channel?.taxes?.length) return channel.taxes
  }
  // Fallback: global active taxes
  return paymentSettingsStore.activeTaxes.map(t => ({
    taxId: t.id,
    taxName: t.name,
    taxPercentage: t.percentage
  }))
})

const taxMode = computed(() => {
  if (props.channelId) {
    const channel = channelsStore.getChannelById(props.channelId)
    return channel?.taxMode || 'exclusive'
  }
  return 'exclusive'
})

const taxBreakdown = computed(() => {
  return channelTaxes.value.map(tax => ({
    name: tax.taxName,
    percentage: tax.taxPercentage,
    amount: amountAfterDiscount.value * (tax.taxPercentage / 100)
  }))
})

const totalTaxAmount = computed(() => {
  if (taxMode.value === 'inclusive') return 0 // Tax already in price
  return taxBreakdown.value.reduce((sum, t) => sum + t.amount, 0)
})

const effectivePointsRedeem = computed(() => {
  if (!usePoints.value || pointsToRedeem.value <= 0) return 0
  const subtotalWithTax = amountAfterDiscount.value + totalTaxAmount.value
  // Cannot redeem more than balance or more than the total
  return Math.min(pointsToRedeem.value, props.customerBalance, subtotalWithTax)
})

const hasPersonalDiscount = computed(() => (props.customerPersonalDiscount || 0) > 0)

// Whether any discount is applied (bill, item, or points)
const hasAnyDiscount = computed(
  () => localDiscount.value > 0 || itemDiscounts.value > 0 || effectivePointsRedeem.value > 0
)

const rawTotalAmount = computed(() => {
  return amountAfterDiscount.value + totalTaxAmount.value - effectivePointsRedeem.value
})

// Round to nearest 1000 when discount is applied; difference absorbed into discount
const totalAmount = computed(() => {
  if (hasAnyDiscount.value) {
    return Math.round(rawTotalAmount.value / 1000) * 1000
  }
  return rawTotalAmount.value
})

// Positive = rounded down (discount increases), negative = rounded up (discount decreases)
const discountRoundingAdjustment = computed(() => {
  return rawTotalAmount.value - totalAmount.value
})

// Stamps earned calculation: floor(total / threshold)
const stampsEarned = computed(() => {
  const threshold = loyaltyStore.stampThreshold
  if (threshold <= 0 || totalAmount.value <= 0) return 0
  return Math.floor(totalAmount.value / threshold)
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

  // Include bill discount if applied (with rounding adjustment absorbed into discount)
  const adjustedDiscount = localDiscount.value + discountRoundingAdjustment.value
  if (adjustedDiscount > 0) {
    paymentData.billDiscount = {
      amount: adjustedDiscount,
      reason: localDiscountReason.value || (discountRoundingAdjustment.value ? 'rounding' : ''),
      type: 'bill',
      value: adjustedDiscount
    }

    // Include stamp card reward metadata for post-payment consumption
    if (localStampCardReward.value) {
      paymentData.billDiscount.stampCardReward = { ...localStampCardReward.value }
    }

    console.log('💰 Bill discount included in payment:', {
      original: localDiscount.value,
      rounding: discountRoundingAdjustment.value,
      adjusted: adjustedDiscount
    })
  }

  // Include points redemption if used
  if (effectivePointsRedeem.value > 0) {
    paymentData.pointsRedeemed = effectivePointsRedeem.value
  }

  emit('confirm', paymentData)

  // L2 FIX: Reset only after dialog actually closes (watcher handles it)
  // Just clear processing flag with a short delay
  resetTimer = setTimeout(() => {
    processing.value = false
  }, 500)
}

const resetForm = () => {
  // Default to first available method (may not be 'cash' for delivery channels)
  selectedMethod.value = availablePaymentMethods.value[0]?.code || 'cash'
  cashReceived.value = 0
  localDiscount.value = 0
  localDiscountReason.value = ''
  localStampCardReward.value = null
  preBillPrinted.value = false
  usePoints.value = false
  pointsToRedeem.value = 0
}

/**
 * Auto-apply personal discount when customer has one.
 * Personal discount replaces any manual discount.
 */
const applyPersonalDiscount = () => {
  if (props.customerPersonalDiscount > 0) {
    const discountAmount = amountAfterItemDiscounts.value * (props.customerPersonalDiscount / 100)
    localDiscount.value = Math.round(discountAmount)
    localDiscountReason.value = 'owner_family'
    localStampCardReward.value = null
    console.log('🏷️ Personal discount auto-applied:', {
      pct: props.customerPersonalDiscount,
      amount: localDiscount.value,
      note: props.customerDiscountNote
    })
  }
}

const handleOpenDiscountDialog = () => {
  if (!currentBill.value) {
    console.warn('No bill selected for discount')
    return
  }
  showBillDiscountDialog.value = true
}

const handleStampCardReward = () => {
  // Opens BillDiscountDialog with stamp card reward auto-selected
  // The dialog will auto-configure via its stampCardReward prop
  handleOpenDiscountDialog()
}

const handleTogglePoints = () => {
  usePoints.value = !usePoints.value
  if (usePoints.value && pointsToRedeem.value <= 0) {
    // Default to max available
    pointsToRedeem.value = Math.min(
      props.customerBalance,
      amountAfterDiscount.value + totalTaxAmount.value
    )
  }
}

// Store stampCardReward data from BillDiscountDialog for post-payment consumption
const localStampCardReward = ref<{
  stamps: number
  category: string
  categoryIds: string[]
  maxDiscount: number
} | null>(null)

const handleDiscountSuccess = async (discountData: {
  amount: number
  reason: string
  stampCardReward?: { stamps: number; category: string; categoryIds: string[]; maxDiscount: number }
}) => {
  // Bill discount applied successfully via BillDiscountDialog
  // Store temporarily in PaymentDialog (NOT saved to order yet)
  localDiscount.value = discountData.amount
  localDiscountReason.value = discountData.reason
  localStampCardReward.value = discountData.stampCardReward || null
  console.log('💰 Temporary bill discount set in PaymentDialog:', {
    amount: localDiscount.value,
    reason: localDiscountReason.value,
    stampCardReward: localStampCardReward.value
  })
  showBillDiscountDialog.value = false
}

const handleDiscountCancel = () => {
  showBillDiscountDialog.value = false
}

const handleGuestCountUpdate = async (count: number) => {
  const bill = currentBill.value
  if (!bill || !props.orderId) return
  try {
    await ordersStore.updateBillGuestCount(props.orderId, bill.id, count)
  } catch (err) {
    DebugUtils.error('PaymentDialog', 'Failed to update guest count', { error: err })
  }
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

// Build receipt data from current items
const buildReceiptData = (): ReceiptData => {
  const order = ordersStore.currentOrder
  const items: ReceiptItem[] = props.items.map(item => ({
    name: item.menuItemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    modifiers: item.modifiers?.map(m => m.name) || [],
    discount: item.discounts?.reduce(
      (sum, d) => sum + (d.type === 'percentage' ? (item.totalPrice * d.value) / 100 : d.value),
      0
    )
  }))

  return {
    type: 'pre-bill',
    restaurantName: printerSettings.value.restaurantName,
    restaurantAddress: printerSettings.value.restaurantAddress,
    restaurantPhone: printerSettings.value.restaurantPhone,
    orderNumber: order?.orderNumber || '',
    tableNumber: order?.tableId ? `Table ${order.tableId}` : undefined,
    orderType: order?.type || 'dine_in',
    waiterName: order?.waiterName,
    dateTime: TimeUtils.formatDateTimeForDisplay(new Date()),
    items,
    subtotal: props.amount,
    itemDiscounts: itemDiscounts.value,
    billDiscount: localDiscount.value + discountRoundingAdjustment.value,
    billDiscountReason: localDiscountReason.value,
    subtotalAfterDiscounts: amountAfterDiscount.value,
    taxes: taxBreakdown.value,
    taxInclusive: taxMode.value === 'inclusive',
    totalAmount: totalAmount.value,
    footerMessage: printerSettings.value.footerMessage,
    loyalty:
      effectivePointsRedeem.value > 0 || (props.customerBalance && props.customerBalance > 0)
        ? {
            customerName: props.customerName || undefined,
            pointsRedeemed:
              effectivePointsRedeem.value > 0 ? effectivePointsRedeem.value : undefined,
            pointsBalance:
              props.customerBalance > 0
                ? props.customerBalance - effectivePointsRedeem.value
                : undefined
          }
        : undefined
  }
}

// Print pre-bill and create snapshot for fraud tracking
const handlePrintPreBill = async (): Promise<void> => {
  if (!isPrinterConnected.value || isPrintingPreBill.value) return
  if (!currentBill.value) {
    console.warn('No bill available for pre-bill print')
    return
  }

  isPrintingPreBill.value = true
  try {
    const receiptData = buildReceiptData()

    // Auto-generate invite QR for orders without customer
    if (!props.customerId && ordersStore.currentOrder?.id) {
      try {
        const { data } = await supabase.rpc('create_order_invite', {
          p_order_id: ordersStore.currentOrder.id
        })
        if (data?.success && data?.url) {
          receiptData.inviteQR = {
            url: data.url,
            message: 'Scan to collect stamps!'
          }
        }
      } catch (e) {
        DebugUtils.error('PaymentDialog', 'Failed to create order invite', { error: e })
      }
    }

    const result = await printPreBill(receiptData)

    if (result.success) {
      // Create snapshot for fraud tracking
      const snapshot = createPreBillSnapshot(currentBill.value, totalAmount.value)
      const printedAt = new Date().toISOString()

      // Emit event to parent to save the snapshot
      emit('pre-bill-printed', {
        billId: currentBill.value.id,
        snapshot,
        printedAt
      })

      preBillPrinted.value = true

      DebugUtils.info('PaymentDialog', 'Pre-bill printed with snapshot', {
        billId: currentBill.value.id,
        itemCount: snapshot.itemCount,
        total: snapshot.total
      })
    } else {
      console.error('Failed to print pre-bill:', result.error)
    }
  } catch (err) {
    console.error('Print error:', err)
  } finally {
    isPrintingPreBill.value = false
  }
}

// Ensure payment methods are loaded
const ensurePaymentMethodsLoaded = async () => {
  console.log('🔍 PaymentDialog: Checking payment methods...', {
    currentCount: paymentSettingsStore.paymentMethods.length,
    activeCount: paymentSettingsStore.activePaymentMethods.length
  })

  if (paymentSettingsStore.paymentMethods.length === 0) {
    console.warn('⚠️ PaymentDialog: Payment methods EMPTY, fetching from Supabase...')
    try {
      await paymentSettingsStore.fetchPaymentMethods()
      console.log('✅ PaymentDialog: Payment methods loaded', {
        count: paymentSettingsStore.paymentMethods.length,
        methods: paymentSettingsStore.paymentMethods.map(m => m.name)
      })
    } catch (error) {
      console.error('❌ PaymentDialog: Failed to load payment methods', error)
    }
  } else {
    console.log('✅ PaymentDialog: Payment methods already loaded', {
      count: paymentSettingsStore.paymentMethods.length
    })
  }
}

// Re-apply personal discount when customer changes while dialog is open
watch(
  () => props.customerPersonalDiscount,
  newPct => {
    if (!props.modelValue) return
    if (newPct > 0) {
      applyPersonalDiscount()
      // Recalculate cash received
      setTimeout(() => {
        if (selectedMethod.value === 'cash') {
          cashReceived.value = totalAmount.value
        }
      }, 50)
    } else if (localDiscountReason.value === 'owner_family') {
      // Customer changed to one without personal discount — clear auto-discount
      localDiscount.value = 0
      localDiscountReason.value = ''
    }
  }
)

// Auto-fill cashReceived when switching to cash method
watch(selectedMethod, newMethod => {
  if (newMethod === 'cash' && cashReceived.value === 0) {
    cashReceived.value = totalAmount.value
  }
})

// Watchers
watch(
  () => props.modelValue,
  async newValue => {
    if (newValue) {
      // L2 FIX: Cancel any pending reset timer from previous confirm
      if (resetTimer) {
        clearTimeout(resetTimer)
        resetTimer = null
      }
      processing.value = false
      // Ensure payment methods are loaded when dialog opens
      await ensurePaymentMethodsLoaded()
      // Reset form when dialog opens (selects first available method)
      resetForm()
      // Auto-apply personal discount if customer has one
      applyPersonalDiscount()
      // Auto-fill exact amount for cash payments
      setTimeout(() => {
        if (selectedMethod.value === 'cash') {
          cashReceived.value = totalAmount.value
        }
      }, 100)
    }
  }
)
</script>

<style scoped>
/* Dialog card: flex column, constrained to viewport */
.v-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-height: 90dvh;
}

.dialog-content {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
}

/* Left column: items list + loyalty at bottom */
.left-column {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.items-scroll {
  overflow-y: auto;
  min-height: 0;
}

.loyalty-section {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
  flex-shrink: 0;
}

/* Right column */
.right-column {
  min-height: 0;
}

/* Compact summary rows */
.summary-row-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.summary-row-compact:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

/* Change display */
.change-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(var(--v-theme-success), 0.08);
  border-radius: 6px;
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

@media (max-width: 960px) {
  .left-column {
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }
}
</style>

<!-- Global style for dialog wrapper -->
<style>
.payment-dialog-wrapper {
  max-height: calc(100vh - 32px) !important;
  max-height: calc(100dvh - 32px) !important;
  margin: 16px !important;
}
</style>
