<script setup lang="ts">
// src/views/pos/receipts/dialogs/ReceiptDialog.vue
// Sprint 6: POS Receipt Module - Receipt Dialog with Payment Info

import { ref, computed, watch } from 'vue'
import type {
  PendingOrderForReceipt,
  ReceiptFormData,
  ReceiptFormItem
} from '@/stores/pos/receipts'
import { formatIDR } from '@/utils'
import ReceiptItemRow from '../components/ReceiptItemRow.vue'
import PaymentInfoWidget from '../components/PaymentInfoWidget.vue'
import PackageChangeDialog from './PackageChangeDialog.vue'

interface Props {
  modelValue: boolean
  order: PendingOrderForReceipt | null
  formData: ReceiptFormData | null
  submitting?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'update:quantity', itemId: string, quantity: number): void
  (e: 'update:packageQuantity', itemId: string, packageQuantity: number): void
  (e: 'update:price', itemId: string, price: number): void
  (e: 'update:packagePrice', itemId: string, packagePrice: number): void
  (e: 'update:lineTotal', itemId: string, lineTotal: number | undefined): void
  (e: 'change-package', itemId: string, packageId: string, packageQuantity: number): void
  (e: 'complete'): void
  (e: 'complete-with-payment', amount: number): void
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false
})

const emit = defineEmits<Emits>()

// =============================================
// STATE
// =============================================

const showPayment = ref(false)
const paymentAmount = ref(0)

// Package change dialog state
const showPackageChangeDialog = ref(false)
const selectedItemForPackageChange = ref<ReceiptFormItem | null>(null)

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const totalDifference = computed(() => {
  if (!props.formData) return 0
  return props.formData.actualTotal - props.formData.expectedTotal
})

const differenceColor = computed(() => {
  if (totalDifference.value === 0) return 'success'
  if (totalDifference.value > 0) return 'error' // More expensive
  return 'warning' // Less expensive
})

const itemsWithDiscrepancies = computed(() => {
  if (!props.formData) return []
  return props.formData.items.filter(item => item.hasDiscrepancy)
})

const canComplete = computed(() => {
  return props.formData && props.formData.items.length > 0
})

// Check if order is fully paid
const isFullyPaid = computed(() => {
  return props.order?.billStatus === 'fully_paid'
})

// Calculate if additional payment is needed after receipt
// This happens when actualTotal > already paid amount
const needsAdditionalPayment = computed(() => {
  if (!props.order || !props.formData) return false

  // If not fully paid, payment may be needed
  if (!isFullyPaid.value) return true

  // If fully paid, check if actual total increased (discrepancy)
  // actualTotal might be more than what was already paid
  const actualTotal = props.formData.actualTotal
  const originalTotal = props.order.totalAmount

  // If actual is more than original, need additional payment for difference
  return actualTotal > originalTotal
})

// Check if ADD PAYMENT button should be disabled
const canAddPayment = computed(() => {
  // Fully paid AND no additional payment needed → disable
  if (isFullyPaid.value && !needsAdditionalPayment.value) return false

  // Otherwise allow adding payment
  return true
})

// Calculate unpaid amount based on billStatus
const unpaidAmount = computed(() => {
  if (!props.order || !props.formData) return 0

  const actualTotal = props.formData.actualTotal
  const billStatus = props.order.billStatus

  // For fully paid orders with discrepancy, pay only the difference
  if (billStatus === 'fully_paid') {
    const originalTotal = props.order.totalAmount
    const difference = actualTotal - originalTotal
    return Math.max(0, difference) // Only positive differences
  }

  // For partially paid orders, pay the unpaid balance
  if (billStatus === 'partially_paid') {
    const paidAmount = props.order.paidAmount ?? 0
    return Math.max(0, actualTotal - paidAmount)
  }

  // For not_billed/billed orders, pay the full actual total
  return actualTotal
})

// =============================================
// WATCH
// =============================================

// Reset payment when order changes
// Auto-enable payment section if order has pending payment
watch(
  () => props.order,
  newOrder => {
    if (newOrder?.hasPendingPayment) {
      // Auto-enable payment section for orders with pending payment
      showPayment.value = true
      // Use pending payment amount as default
      paymentAmount.value = newOrder.pendingPaymentAmount ?? unpaidAmount.value
    } else {
      showPayment.value = false
      paymentAmount.value = unpaidAmount.value
    }
  },
  { immediate: true }
)

// Update payment amount when unpaid amount changes
watch(
  () => unpaidAmount.value,
  newUnpaidAmount => {
    if (showPayment.value) {
      paymentAmount.value = newUnpaidAmount
    }
  }
)

// Auto-enable payment section when actualTotal increases and additional payment needed
// This handles the case when receipt has discrepancy (actual > original)
watch(
  () => needsAdditionalPayment.value,
  (needsPayment, wasNeedingPayment) => {
    // If order was fully paid but now needs additional payment (due to receipt discrepancy)
    if (needsPayment && !wasNeedingPayment && isFullyPaid.value) {
      console.log('💰 Receipt discrepancy detected: order needs additional payment')
      showPayment.value = true

      // Use unpaidAmount for correct calculation
      paymentAmount.value = unpaidAmount.value

      console.log(`💰 Additional payment needed: ${paymentAmount.value}`, {
        actualTotal: props.formData?.actualTotal,
        originalTotal: props.order?.totalAmount,
        unpaidAmount: unpaidAmount.value
      })
    }
  }
)

// =============================================
// METHODS
// =============================================

function handleClose() {
  emit('close')
}

function togglePayment() {
  showPayment.value = !showPayment.value
  if (showPayment.value) {
    paymentAmount.value = unpaidAmount.value
  }
}

function handleQuantityUpdate(itemId: string, quantity: number) {
  emit('update:quantity', itemId, quantity)
}

function handlePackageQuantityUpdate(itemId: string, packageQuantity: number) {
  emit('update:packageQuantity', itemId, packageQuantity)
}

function handlePriceUpdate(itemId: string, price: number) {
  emit('update:price', itemId, price)
}

function handlePackagePriceUpdate(itemId: string, packagePrice: number) {
  emit('update:packagePrice', itemId, packagePrice)
}

function handleLineTotalUpdate(itemId: string, lineTotal: number | undefined) {
  emit('update:lineTotal', itemId, lineTotal)
}

function handleChangePackage(itemId: string) {
  const item = props.formData?.items.find(i => i.orderItemId === itemId)
  if (!item) return

  selectedItemForPackageChange.value = item
  showPackageChangeDialog.value = true
}

function handlePackageChanged(data: {
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
}) {
  if (!selectedItemForPackageChange.value) return

  emit(
    'change-package',
    selectedItemForPackageChange.value.orderItemId,
    data.packageId,
    data.packageQuantity
  )

  showPackageChangeDialog.value = false
  selectedItemForPackageChange.value = null
}

function handleComplete() {
  emit('complete')
}

function handleCompleteWithPayment() {
  emit('complete-with-payment', paymentAmount.value)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1000" persistent scrollable>
    <v-card v-if="order && formData" class="receipt-dialog">
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 bg-primary">
        <v-icon start color="white">mdi-package-down</v-icon>
        <span class="text-white">Receipt: {{ order.orderNumber }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
      </v-card-title>

      <!-- Order Info Row -->
      <div class="pa-4 d-flex align-center">
        <div>
          <div class="text-subtitle-2 text-grey">Supplier</div>
          <div class="text-body-1 font-weight-medium">{{ order.supplierName }}</div>
        </div>
        <v-spacer />
        <div class="text-right">
          <div class="text-subtitle-2 text-grey">Items</div>
          <div class="text-body-1 font-weight-medium">{{ formData.items.length }}</div>
        </div>
      </div>

      <v-divider />

      <!-- Content with two columns on larger screens -->
      <v-card-text class="pa-0" style="max-height: 60vh; overflow-y: auto">
        <v-row no-gutters>
          <!-- Left: Items Table -->
          <v-col cols="12" lg="8">
            <v-table density="compact">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px"></th>
                  <th>Product</th>
                  <th style="width: 100px">Package</th>
                  <th style="width: 100px">Received</th>
                  <th style="width: 120px">Price</th>
                  <th class="text-right" style="width: 120px">Line Total</th>
                </tr>
              </thead>
              <tbody>
                <ReceiptItemRow
                  v-for="item in formData.items"
                  :key="item.orderItemId"
                  :item="item"
                  :disabled="submitting"
                  @update:quantity="handleQuantityUpdate"
                  @update:package-quantity="handlePackageQuantityUpdate"
                  @update:price="handlePriceUpdate"
                  @update:package-price="handlePackagePriceUpdate"
                  @update:line-total="handleLineTotalUpdate"
                  @change-package="handleChangePackage"
                />
              </tbody>
            </v-table>
          </v-col>

          <!-- Right: Summary & Payment Info -->
          <v-col cols="12" lg="4" class="border-s">
            <div class="pa-4">
              <!-- Discrepancy Warning -->
              <v-alert
                v-if="formData.hasDiscrepancies"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                <div class="font-weight-medium">
                  {{ itemsWithDiscrepancies.length }} item{{
                    itemsWithDiscrepancies.length !== 1 ? 's' : ''
                  }}
                  with discrepancies
                </div>
              </v-alert>

              <v-alert v-else type="success" variant="tonal" density="compact" class="mb-4">
                <v-icon start size="small">mdi-check-circle</v-icon>
                All items match order
              </v-alert>

              <!-- Totals -->
              <div class="totals-section pa-3 rounded mb-4">
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-2 text-grey">Expected Total:</span>
                  <span class="text-body-2">{{ formatIDR(formData.expectedTotal) }}</span>
                </div>
                <v-divider class="my-2" />
                <div class="d-flex justify-space-between">
                  <span class="text-body-1 font-weight-bold">Actual Total:</span>
                  <span class="text-h6 font-weight-bold">
                    {{ formatIDR(formData.actualTotal) }}
                  </span>
                </div>
                <div v-if="totalDifference !== 0" class="d-flex justify-space-between mt-2">
                  <span class="text-body-2 text-grey">Difference:</span>
                  <span class="text-body-2 font-weight-medium" :class="`text-${differenceColor}`">
                    {{ totalDifference > 0 ? '+' : '' }}{{ formatIDR(totalDifference) }}
                  </span>
                </div>
              </div>

              <!-- Payment Info Widget -->
              <PaymentInfoWidget :order="order" class="mb-4" />

              <!-- Payment Input Section -->
              <v-expand-transition>
                <div v-if="showPayment" class="payment-section pa-3 rounded mb-4">
                  <div class="d-flex align-center mb-2">
                    <v-icon start color="success" size="small">mdi-cash</v-icon>
                    <span class="text-subtitle-2">Payment Amount</span>
                  </div>

                  <v-text-field
                    v-model.number="paymentAmount"
                    type="number"
                    variant="outlined"
                    density="compact"
                    prefix="Rp"
                    :disabled="submitting"
                    hide-details
                    class="mb-2"
                  />

                  <div class="text-caption">
                    <span v-if="paymentAmount === formData.actualTotal" class="text-success">
                      <v-icon size="x-small">mdi-check</v-icon>
                      Exact amount
                    </span>
                    <span v-else-if="paymentAmount > formData.actualTotal" class="text-warning">
                      <v-icon size="x-small">mdi-alert</v-icon>
                      Overpayment: {{ formatIDR(paymentAmount - formData.actualTotal) }}
                    </span>
                    <span v-else class="text-error">
                      <v-icon size="x-small">mdi-alert</v-icon>
                      Underpayment: {{ formatIDR(formData.actualTotal - paymentAmount) }}
                    </span>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="submitting || !canAddPayment" @click="togglePayment">
          <v-icon start>{{ showPayment ? 'mdi-cash-remove' : 'mdi-cash-plus' }}</v-icon>
          {{ showPayment ? 'Remove Payment' : 'Add Payment' }}
        </v-btn>

        <v-spacer />

        <v-btn variant="text" :disabled="submitting" @click="handleClose">Cancel</v-btn>

        <v-btn
          v-if="!showPayment"
          color="primary"
          :loading="submitting"
          :disabled="!canComplete"
          @click="handleComplete"
        >
          <v-icon start>mdi-check</v-icon>
          Complete Receipt
        </v-btn>

        <v-btn
          v-else
          color="success"
          :loading="submitting"
          :disabled="!canComplete || paymentAmount <= 0"
          @click="handleCompleteWithPayment"
        >
          <v-icon start>mdi-cash-check</v-icon>
          Complete with Payment
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Package Change Dialog -->
    <PackageChangeDialog
      v-model="showPackageChangeDialog"
      :product-id="selectedItemForPackageChange?.productId"
      :product-name="selectedItemForPackageChange?.productName"
      :current-package-id="selectedItemForPackageChange?.packageId"
      :current-package-quantity="selectedItemForPackageChange?.receivedPackageQuantity"
      :required-quantity="selectedItemForPackageChange?.receivedQuantity"
      @package-changed="handlePackageChanged"
    />
  </v-dialog>
</template>

<style scoped lang="scss">
.receipt-dialog {
  .totals-section {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    background-color: rgba(var(--v-theme-surface), 0.4);
  }

  .payment-section {
    border: 1px solid rgba(var(--v-theme-success), 0.3);
    background-color: rgba(var(--v-theme-success), 0.08);
  }

  .border-s {
    border-left: 1px solid rgba(var(--v-border-color), 0.12);
  }
}
</style>
