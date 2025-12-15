<!-- src/views/pos/shifts/dialogs/EndShiftDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="700"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-stop-circle" color="warning" class="me-3" />
          <span>End Shift</span>
        </div>

        <v-chip v-if="currentShift" color="info" size="small">
          {{ formatShiftDuration(currentShift.startTime) }} elapsed
        </v-chip>
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text v-if="currentShift && shiftReport" class="pa-4">
        <!-- ✅ NEW: Account Store Warning -->
        <div v-if="!isAccountStoreReady" class="mb-4">
          <v-alert color="error" variant="tonal">
            <div class="font-weight-bold mb-2">Account Store Not Ready</div>
            <div>Account Store is not initialized. Shift cannot be closed until it's ready.</div>
            <div v-if="accountStoreError" class="mt-2 text-caption">
              {{ accountStoreError }}
            </div>
          </v-alert>
        </div>

        <!-- ✅ Refunded Orders Warning -->
        <div v-if="hasRefundedOrders" class="mb-4">
          <v-alert color="error" variant="tonal">
            <div class="font-weight-bold mb-2">Cannot Close Shift: Refunded Items</div>
            <div>
              There {{ ordersWithRefundedItems.length === 1 ? 'is' : 'are' }}
              <strong>{{ ordersWithRefundedItems.length }}</strong>
              order{{ ordersWithRefundedItems.length === 1 ? '' : 's' }}
              with refunded items. Please resolve these before closing the shift.
            </div>
            <div class="mt-2">
              <div
                v-for="{ order, refundedItems } in ordersWithRefundedItems"
                :key="order.id"
                class="text-caption"
              >
                • Order #{{ order.orderNumber }}:
                <span v-for="(item, idx) in refundedItems" :key="item.id">
                  {{ item.menuItemName }} ({{ formatCurrency(item.totalPrice) }}){{
                    idx < refundedItems.length - 1 ? ', ' : ''
                  }}
                </span>
              </div>
            </div>
          </v-alert>
        </div>

        <!-- Validation Warnings -->
        <div v-if="validationWarnings.length > 0" class="mb-4">
          <v-alert color="warning" variant="tonal">
            <div class="font-weight-bold mb-2">Warnings before ending shift:</div>
            <ul class="mb-0">
              <li v-for="warning in validationWarnings" :key="warning">{{ warning }}</li>
            </ul>
          </v-alert>
        </div>

        <!-- Shift Summary -->
        <div class="shift-summary mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-chart-line" class="me-2" />
            Shift Performance
          </div>

          <v-row>
            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-primary">
                  {{ shiftReport.summary.totalTransactions }}
                </div>
                <div class="text-caption text-medium-emphasis">Orders</div>
              </v-card>
            </v-col>

            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-success">
                  {{ formatCurrency(shiftReport.summary.totalSales) }}
                </div>
                <div class="text-caption text-medium-emphasis">Total Sales</div>
              </v-card>
            </v-col>

            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-info">
                  {{ formatCurrency(shiftReport.summary.averageTransactionValue) }}
                </div>
                <div class="text-caption text-medium-emphasis">Avg. Order</div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Payment Methods Breakdown -->
        <div class="payment-breakdown mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-cash-multiple" class="me-2" />
            Payment Methods
          </div>

          <v-row>
            <v-col v-for="method in topPaymentMethods" :key="method.methodId" cols="6">
              <div class="payment-method-card pa-3 border rounded">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-bold">{{ method.methodName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ method.count }} transactions
                    </div>
                  </div>
                  <div class="text-end">
                    <div class="font-weight-bold">{{ formatCurrency(method.amount) }}</div>
                    <div class="text-caption text-success">{{ method.percentage.toFixed(1) }}%</div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Cash Count Section -->
        <div class="cash-count mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-cash-register" class="me-2" />
            Cash Register Count
          </div>

          <v-row>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3">
                <div class="text-subtitle-2 mb-2">Expected Cash</div>
                <div class="text-h5 font-weight-bold">
                  {{ formatCurrency(expectedCash) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Starting: {{ formatCurrency(currentShift.startingCash) }} + Sales:
                  {{ formatCurrency(cashSales) }}
                  <span v-if="totalExpenses > 0" class="text-error">
                    - Expenses: {{ formatCurrency(totalExpenses) }}
                  </span>
                </div>
              </v-card>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model.number="form.endingCash"
                label="Actual Cash Count"
                variant="outlined"
                type="number"
                min="0"
                step="1000"
                prefix="Rp"
                :rules="[rules.required, rules.nonNegative]"
                :color="discrepancyColor"
                persistent-hint
                :hint="discrepancyHint"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Discrepancy Info -->
        <div v-if="cashDiscrepancy !== 0" class="mb-4">
          <v-alert :color="discrepancyColor" variant="tonal">
            <div class="font-weight-bold">
              {{ cashDiscrepancy > 0 ? 'Cash Overage' : 'Cash Shortage' }}
            </div>
            <div>
              {{ cashDiscrepancy > 0 ? 'Extra' : 'Missing' }}:
              {{ formatCurrency(Math.abs(cashDiscrepancy)) }}
            </div>
          </v-alert>
        </div>

        <!-- Corrections Section -->
        <div v-if="form.corrections.length > 0" class="corrections mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-file-edit" class="me-2" />
            Corrections & Adjustments
          </div>

          <div
            v-for="(correction, index) in form.corrections"
            :key="index"
            class="correction-item pa-3 border rounded mb-2"
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="font-weight-bold">
                  {{ correction.type.replace('_', ' ').toUpperCase() }}
                </div>
                <div class="text-caption">{{ correction.description }}</div>
              </div>
              <div class="text-end">
                <div class="font-weight-bold">{{ formatCurrency(correction.amount) }}</div>
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  color="error"
                  variant="text"
                  @click="removeCorrection(index)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Add Correction -->
        <div class="add-correction mb-4">
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            @click="showAddCorrection = true"
          >
            Add Correction
          </v-btn>
        </div>

        <!-- Final Notes -->
        <div class="final-notes">
          <v-textarea
            v-model="form.notes"
            label="End of Shift Notes"
            variant="outlined"
            rows="3"
            hint="Any important notes about this shift"
            persistent-hint
          />
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="closeDialog">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="warning"
          size="large"
          :loading="loading"
          :disabled="!canEndShift"
          @click="endShift"
        >
          <v-icon start>mdi-stop</v-icon>
          End Shift
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Correction Dialog -->
    <v-dialog v-model="showAddCorrection" max-width="400">
      <v-card>
        <v-card-title>Add Correction</v-card-title>
        <v-card-text>
          <v-select
            v-model="newCorrection.type"
            :items="correctionTypes"
            label="Correction Type"
            variant="outlined"
            class="mb-3"
          />

          <v-text-field
            v-model.number="newCorrection.amount"
            label="Amount"
            variant="outlined"
            type="number"
            prefix="Rp"
            class="mb-3"
          />

          <v-textarea
            v-model="newCorrection.description"
            label="Description"
            variant="outlined"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAddCorrection = false">Cancel</v-btn>
          <v-btn color="primary" @click="addCorrection">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useShiftsComposables } from '@/stores/pos/shifts/composables'
import { useAccountStore } from '@/stores/account'
import type {
  EndShiftDto,
  ShiftCorrection,
  TransactionPerformer,
  ShiftAccountBalance
} from '@/stores/pos/shifts/types'
import type { PosPayment } from '@/stores/pos/types'

// Props
interface Props {
  modelValue: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'shift-ended': [shiftData: any]
}>()

// Stores
const shiftsStore = useShiftsStore()
const paymentsStore = usePosPaymentsStore()
const accountStore = useAccountStore()
const ordersStore = usePosOrdersStore()
const {
  formatShiftDuration,
  formatCurrency,
  canEndShift: checkCanEndShift,
  getCashDiscrepancyColor
} = useShiftsComposables()

// State
const dialog = ref(props.modelValue)
const loading = ref(false)
const showAddCorrection = ref(false)
const accountStoreError = ref('')

const form = ref<Omit<EndShiftDto, 'shiftId' | 'performedBy'>>({
  endingCash: 0,
  actualAccountBalances: {},
  corrections: [],
  notes: ''
})

const newCorrection = ref({
  type: 'cash_adjustment' as ShiftCorrection['type'],
  amount: 0,
  description: '',
  reason: ''
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required',
  nonNegative: (value: number) => value >= 0 || 'Amount cannot be negative'
}

const correctionTypes = [
  { title: 'Cash Adjustment', value: 'cash_adjustment' },
  { title: 'Payment Correction', value: 'payment_correction' },
  { title: 'Refund', value: 'refund' },
  { title: 'Void', value: 'void' },
  { title: 'Other', value: 'other' }
]

// Computed
const currentShift = computed(() => shiftsStore.currentShift)

const shiftReport = computed(() =>
  currentShift.value ? shiftsStore.getShiftReport(currentShift.value.id) : null
)

const validationCheck = computed(() =>
  checkCanEndShift(currentShift.value, shiftsStore.pendingSyncTransactions)
)

const validationWarnings = computed(() => validationCheck.value.warnings || [])

// ✅ NEW: Check if Account Store is ready
const isAccountStoreReady = computed(() => {
  return accountStore.accounts && accountStore.accounts.length > 0
})

// ✅ Check for orders with refunded items
const ordersWithRefundedItems = computed(() => {
  if (!currentShift.value) return []
  const shiftStartTime = new Date(currentShift.value.startTime).getTime()

  return ordersStore.orders
    .filter(order => {
      const orderTime = new Date(order.createdAt).getTime()
      if (orderTime < shiftStartTime) return false

      // Check if order has refunded status OR any items with refunded status
      if (order.paymentStatus === 'refunded') return true

      // Check items in all bills
      return order.bills.some(bill => bill.items.some(item => item.paymentStatus === 'refunded'))
    })
    .map(order => {
      // Get refunded items for display
      const refundedItems = order.bills.flatMap(bill =>
        bill.items.filter(item => item.paymentStatus === 'refunded')
      )
      return { order, refundedItems }
    })
})

const hasRefundedOrders = computed(() => ordersWithRefundedItems.value.length > 0)

const canEndShift = computed(
  () =>
    validationCheck.value.canEnd &&
    form.value.endingCash > 0 &&
    isAccountStoreReady.value &&
    !hasRefundedOrders.value
)

// ✅ FIX: Get real payments for this shift
const shiftPayments = computed(() => {
  if (!currentShift.value) return []
  return paymentsStore.getShiftPayments(currentShift.value.id)
})

// ✅ FIX: Calculate cash sales from real payments (not shift.paymentMethods)
const cashSales = computed(() => {
  let cashReceived = 0
  let cashRefunded = 0

  shiftPayments.value.forEach((p: PosPayment) => {
    if (p.status === 'completed' || p.status === 'refunded') {
      if (p.method === 'cash') {
        if (p.amount > 0) {
          cashReceived += p.amount
        } else {
          cashRefunded += Math.abs(p.amount)
        }
      }
    }
  })

  return cashReceived - cashRefunded
})

// ✅ FIX: Calculate total expenses
const totalExpenses = computed(() => {
  if (!currentShift.value) return 0
  return currentShift.value.expenseOperations
    .filter(exp => exp.status === 'completed')
    .reduce((sum, exp) => sum + exp.amount, 0)
})

const expectedCash = computed(() => {
  if (!currentShift.value) return 0
  // Expected = Starting + Sales - Expenses
  return currentShift.value.startingCash + cashSales.value - totalExpenses.value
})

const cashDiscrepancy = computed(() => form.value.endingCash - expectedCash.value)

const discrepancyColor = computed(() => getCashDiscrepancyColor(cashDiscrepancy.value))

const discrepancyHint = computed(() => {
  if (cashDiscrepancy.value === 0) return 'Perfect match!'
  const type = cashDiscrepancy.value > 0 ? 'overage' : 'shortage'
  return `${formatCurrency(Math.abs(cashDiscrepancy.value))} ${type}`
})

// ✅ FIX: Calculate payment methods summary from real payments
const topPaymentMethods = computed(() => {
  const methodsMap = new Map<
    string,
    {
      methodId: string
      methodName: string
      methodType: string
      count: number
      amount: number
      percentage: number
    }
  >()

  // Initialize payment methods
  const methods = [
    { methodId: 'cash', methodName: 'Cash', methodType: 'cash' },
    { methodId: 'card', methodName: 'Card', methodType: 'card' },
    { methodId: 'qr', methodName: 'QR Code', methodType: 'qr' }
  ]

  methods.forEach(m => {
    methodsMap.set(m.methodType, { ...m, count: 0, amount: 0, percentage: 0 })
  })

  // Calculate totals from real payments
  let totalAmount = 0
  shiftPayments.value.forEach((p: PosPayment) => {
    if (p.status === 'completed' || p.status === 'refunded') {
      const method = methodsMap.get(p.method)
      if (method) {
        method.count++
        method.amount += p.amount
      }
      totalAmount += p.amount
    }
  })

  // Calculate percentages
  methodsMap.forEach(method => {
    method.percentage = totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0
  })

  // Return top 4 methods by amount
  return Array.from(methodsMap.values())
    .filter(m => m.count > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)
})

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      initializeForm()
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function initializeForm() {
  if (!currentShift.value) return

  // Set expected ending cash as default
  form.value.endingCash = expectedCash.value
  form.value.corrections = []
  form.value.notes = ''

  // Initialize account balances
  form.value.actualAccountBalances = {}
  currentShift.value.accountBalances.forEach((balance: ShiftAccountBalance) => {
    form.value.actualAccountBalances[balance.accountId] =
      balance.expectedBalance || balance.startingBalance
  })
}

function closeDialog() {
  dialog.value = false
  loading.value = false
}

function addCorrection() {
  if (!newCorrection.value.amount || !newCorrection.value.description) return

  const performer: TransactionPerformer = {
    type: 'user',
    id: currentShift.value?.cashierId || 'unknown',
    name: currentShift.value?.cashierName || 'Unknown'
  }

  const correction = {
    type: newCorrection.value.type,
    amount: newCorrection.value.amount,
    reason: newCorrection.value.type.replace('_', ' '),
    description: newCorrection.value.description,
    performedBy: performer,
    affectsReporting: true
  }

  form.value.corrections.push(correction)

  // Reset form
  newCorrection.value = {
    type: 'cash_adjustment',
    amount: 0,
    description: '',
    reason: ''
  }

  showAddCorrection.value = false
}

function removeCorrection(index: number) {
  form.value.corrections.splice(index, 1)
}

async function endShift() {
  if (!currentShift.value) return

  // ✅ NEW: Validate Account Store before proceeding
  if (!isAccountStoreReady.value) {
    console.error('❌ Cannot close shift: Account Store not initialized')
    accountStoreError.value = 'Account Store is not ready. Attempting to initialize...'

    // Try to initialize
    console.log('🔄 Attempting to initialize Account Store...')
    try {
      await accountStore.initializeStore()

      if (!isAccountStoreReady.value) {
        console.error('❌ Account Store initialization failed')
        accountStoreError.value =
          'Account Store failed to initialize. Please refresh the page and try again.'
        return
      }

      console.log('✅ Account Store initialized successfully')
      accountStoreError.value = ''
    } catch (error) {
      console.error('❌ Error initializing Account Store:', error)
      accountStoreError.value =
        'Failed to initialize Account Store. Please refresh the page and try again.'
      return
    }
  }

  if (!canEndShift.value) return

  loading.value = true

  try {
    // ✅ DEBUG: Log source data
    console.log('🔍 EndShiftDialog - Source data:', {
      shiftPaymentsCount: shiftPayments.value.length,
      topPaymentMethodsCount: topPaymentMethods.value.length,
      topPaymentMethods: topPaymentMethods.value,
      currentShiftPaymentMethods: currentShift.value.paymentMethods
    })

    // ✅ CRITICAL FIX: Update currentShift paymentMethods from real payments before closing
    // Convert topPaymentMethods (computed from real payments) to PaymentMethodSummary[]
    currentShift.value.paymentMethods = topPaymentMethods.value.map(pm => ({
      methodId: pm.methodId,
      methodName: pm.methodName,
      methodType: pm.methodType as any, // Will be 'cash' | 'card' | 'qr'
      count: pm.count,
      amount: pm.amount
    }))

    // ✅ NEW: Log state before closing
    console.log('📊 Closing shift with state:', {
      shiftId: currentShift.value.id,
      totalSales: currentShift.value.totalSales,
      paymentMethods: currentShift.value.paymentMethods,
      accountStoreAccounts: accountStore.accounts?.length || 0
    })

    const performer: TransactionPerformer = {
      type: 'user',
      id: currentShift.value.cashierId,
      name: currentShift.value.cashierName
    }

    const dto: EndShiftDto = {
      shiftId: currentShift.value.id,
      endingCash: form.value.endingCash,
      actualAccountBalances: form.value.actualAccountBalances,
      corrections: form.value.corrections,
      notes: form.value.notes,
      performedBy: performer,
      // Pass calculated payment methods from real payments
      paymentMethods: currentShift.value.paymentMethods
    }

    const result = await shiftsStore.endShift(dto)

    if (result.success && result.data) {
      const shiftData = {
        shift: result.data,
        endTime: new Date().toISOString(),
        discrepancy: cashDiscrepancy.value
      }

      emit('shift-ended', shiftData)
      closeDialog()
      console.log('✅ Shift ended successfully:', result.data.shiftNumber)

      // Show success message
      // TODO: Add toast notification
    } else {
      console.error('❌ Failed to end shift:', result.error)
      accountStoreError.value = result.error || 'Failed to end shift'
      throw new Error(result.error || 'Failed to end shift')
    }
  } catch (error) {
    console.error('❌ Error ending shift:', error)
    accountStoreError.value = error instanceof Error ? error.message : 'Failed to end shift'
    // TODO: Show error dialog or toast
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  if (dialog.value) {
    initializeForm()
  }
})
</script>

<style scoped>
.v-card-title {
  background-color: rgba(255, 255, 255, 0.02);
}

.shift-summary .v-card {
  transition: all 0.2s ease;
}

.shift-summary .v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.payment-method-card {
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
}

.payment-method-card:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.correction-item {
  background-color: rgba(255, 255, 255, 0.02);
}

.border {
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}
</style>
