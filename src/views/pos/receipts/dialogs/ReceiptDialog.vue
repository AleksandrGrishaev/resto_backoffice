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
import QuickVerifyMode from '@/components/receipt/QuickVerifyMode.vue'
import type { ReceiptItemInput, ReceiptItemOutput } from '@/composables/useQuickVerifyMode'

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
  (e: 'update:tax', includeTax: boolean, taxAmount?: number, taxPercentage?: number): void
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

// Tax state
const includeTax = ref(false)
const taxAmount = ref<number | undefined>(undefined)
const taxPercentage = ref<number | undefined>(undefined)
let taxSyncInProgress = false

// Package change dialog state
const showPackageChangeDialog = ref(false)
const selectedItemForPackageChange = ref<ReceiptFormItem | null>(null)

// Quick Verify state
const showQuickVerify = ref(false)

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

// Grand total including tax
const grandTotal = computed(() => {
  const subtotal = props.formData?.actualTotal ?? 0
  const tax = includeTax.value && taxAmount.value ? taxAmount.value : 0
  return subtotal + tax
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

/**
 * Convert POS receipt items to Quick Verify input format
 */
const quickVerifyItems = computed((): ReceiptItemInput[] => {
  if (!props.formData) return []

  return props.formData.items.map(item => {
    const packageSize = item.packageSize || 1
    const packagePrice = item.actualPrice || item.orderedPrice || 0
    const receivedPkgQty =
      item.receivedPackageQuantity ||
      (packageSize > 0 ? Math.ceil(item.receivedQuantity / packageSize) : item.receivedQuantity)
    const lineTotal = item.actualLineTotal || item.actualTotal || receivedPkgQty * packagePrice

    return {
      id: item.orderItemId,
      itemName: item.productName,
      orderedQuantity: item.orderedQuantity,
      orderedUnit: item.unit || 'gram',
      packageName: item.packageName,
      packageSize: packageSize,
      packageUnit: item.packageUnit,
      receivedPackageQuantity: receivedPkgQty,
      actualPackagePrice: packagePrice,
      actualLineTotal: lineTotal
    }
  })
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

// Reset payment and tax when order changes
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

    // Reset tax state when order changes
    includeTax.value = false
    taxAmount.value = undefined
    taxPercentage.value = undefined
  },
  { immediate: true }
)

// Sync tax state from formData (if loaded from existing receipt)
watch(
  () => props.formData,
  newFormData => {
    if (newFormData) {
      includeTax.value = newFormData.includeTax ?? false
      taxAmount.value = newFormData.taxAmount
      taxPercentage.value = newFormData.taxPercentage
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

// =============================================
// TAX METHODS
// =============================================

/**
 * Toggle tax inclusion
 */
function toggleTax() {
  includeTax.value = !includeTax.value
  if (!includeTax.value) {
    taxAmount.value = undefined
    taxPercentage.value = undefined
  }
  emitTaxUpdate()
}

/**
 * When tax amount changes, calculate percentage
 */
function onTaxAmountChange(value: number | null | undefined) {
  if (taxSyncInProgress) return

  taxAmount.value = value ?? undefined

  if (!value || value <= 0) {
    taxPercentage.value = undefined
    emitTaxUpdate()
    return
  }

  taxSyncInProgress = true
  const subtotal = props.formData?.actualTotal || 0
  if (subtotal > 0) {
    taxPercentage.value = Number(((value / subtotal) * 100).toFixed(2))
  }
  taxSyncInProgress = false
  emitTaxUpdate()
}

/**
 * When tax percentage changes, calculate amount
 */
function onTaxPercentageChange(value: number | null | undefined) {
  if (taxSyncInProgress) return

  taxPercentage.value = value ?? undefined

  if (!value || value <= 0) {
    taxAmount.value = undefined
    emitTaxUpdate()
    return
  }

  taxSyncInProgress = true
  const subtotal = props.formData?.actualTotal || 0
  if (subtotal > 0) {
    taxAmount.value = Math.round((subtotal * value) / 100)
  }
  taxSyncInProgress = false
  emitTaxUpdate()
}

/**
 * Emit tax update to parent
 */
function emitTaxUpdate() {
  emit('update:tax', includeTax.value, taxAmount.value, taxPercentage.value)
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

/**
 * Handle Quick Verify completion - apply changes via emits
 */
function handleQuickVerifyComplete(modifiedItems: ReceiptItemOutput[]) {
  if (!props.formData) return

  modifiedItems.forEach(modifiedItem => {
    const formItem = props.formData?.items.find(i => i.orderItemId === modifiedItem.id)
    if (!formItem) return

    const packageSize = formItem.packageSize || 1

    // Update quantities
    const newPackageQty = modifiedItem.receivedPackageQuantity
    const newBaseQty = newPackageQty * packageSize

    // Emit updates
    emit('update:packageQuantity', modifiedItem.id, newPackageQty)
    emit('update:quantity', modifiedItem.id, newBaseQty)
    emit('update:packagePrice', modifiedItem.id, modifiedItem.actualPackagePrice)

    // If line total was manually adjusted
    if (modifiedItem.actualLineTotal !== newPackageQty * modifiedItem.actualPackagePrice) {
      emit('update:lineTotal', modifiedItem.id, modifiedItem.actualLineTotal)
    }
  })

  showQuickVerify.value = false
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1100" persistent scrollable>
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
            <!-- Quick Verify Button -->
            <div class="d-flex align-center justify-space-between px-4 pt-3">
              <div class="text-subtitle-2 font-weight-bold">
                Receipt Items ({{ formData.items.length }})
              </div>
              <v-btn
                v-if="formData.items.length > 0 && !submitting"
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-lightning-bolt"
                @click="showQuickVerify = true"
              >
                Quick Verify
              </v-btn>
            </div>
            <v-table density="compact">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px"></th>
                  <th>Product</th>
                  <th style="width: 110px">Package</th>
                  <th style="width: 100px">Received</th>
                  <th style="width: 150px">Price</th>
                  <th class="text-right" style="width: 150px">Line Total</th>
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
                  <span class="text-body-1 font-weight-bold">Subtotal:</span>
                  <span class="text-body-1 font-weight-bold">
                    {{ formatIDR(formData.actualTotal) }}
                  </span>
                </div>

                <!-- Tax Section -->
                <v-expand-transition>
                  <div v-if="includeTax" class="mt-3">
                    <div class="d-flex align-center gap-2 mb-2">
                      <NumericInputField
                        :model-value="taxAmount"
                        label="Tax Amount"
                        variant="outlined"
                        density="compact"
                        prefix="Rp"
                        :min="0"
                        :max="999999999"
                        :format-as-currency="true"
                        hide-details
                        class="flex-grow-1"
                        :disabled="submitting"
                        @update:model-value="onTaxAmountChange($event)"
                      />
                      <NumericInputField
                        :model-value="taxPercentage"
                        label="%"
                        variant="outlined"
                        density="compact"
                        suffix="%"
                        :min="0"
                        :max="100"
                        :step="0.1"
                        :decimal-places="2"
                        hide-details
                        style="min-width: 100px"
                        :disabled="submitting"
                        @update:model-value="onTaxPercentageChange($event)"
                      />
                    </div>
                  </div>
                </v-expand-transition>

                <!-- Tax Toggle Button -->
                <v-btn
                  variant="text"
                  size="small"
                  :color="includeTax ? 'error' : 'primary'"
                  class="mt-2"
                  :disabled="submitting"
                  @click="toggleTax"
                >
                  <v-icon start size="small">
                    {{ includeTax ? 'mdi-minus-circle' : 'mdi-plus-circle' }}
                  </v-icon>
                  {{ includeTax ? 'Remove Tax' : 'Add Tax' }}
                </v-btn>

                <!-- Grand Total (with tax) -->
                <v-divider v-if="includeTax && taxAmount" class="my-2" />
                <div v-if="includeTax && taxAmount" class="d-flex justify-space-between">
                  <span class="text-h6 font-weight-bold">Grand Total:</span>
                  <span class="text-h6 font-weight-bold text-primary">
                    {{ formatIDR(grandTotal) }}
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

                  <NumericInputField
                    v-model="paymentAmount"
                    variant="outlined"
                    density="compact"
                    prefix="Rp"
                    :min="0"
                    :max="999999999"
                    :format-as-currency="true"
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

    <!-- Quick Verify Mode -->
    <QuickVerifyMode
      v-model="showQuickVerify"
      :items="quickVerifyItems"
      @complete="handleQuickVerifyComplete"
      @exit="showQuickVerify = false"
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
