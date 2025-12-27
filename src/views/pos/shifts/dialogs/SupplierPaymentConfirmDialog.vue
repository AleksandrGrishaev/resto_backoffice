<!-- src/views/pos/shifts/dialogs/SupplierPaymentConfirmDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="700"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="payment">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-warning">
        <v-icon icon="mdi-cash-check" color="white" class="me-3" />
        <span class="text-white">Confirm Supplier Payment</span>
      </v-card-title>

      <v-divider />

      <!-- Payment Details -->
      <v-card-text class="pa-4">
        <!-- Payment Info -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon icon="mdi-account-tie" color="primary" class="me-3" />
              <div>
                <div class="text-overline">Counteragent</div>
                <div class="text-h6">{{ payment.counteragentName }}</div>
              </div>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Planned Amount:</span>
              <span class="text-h6">Rp {{ formatCurrency(payment.amount) }}</span>
            </div>

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Category:</span>
              <v-chip size="small" color="primary">{{ payment.category }}</v-chip>
            </div>

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Priority:</span>
              <v-chip size="small" :color="getPriorityColor(payment.priority)">
                {{ payment.priority }}
              </v-chip>
            </div>

            <div
              v-if="payment.invoiceNumber"
              class="d-flex justify-space-between align-center mb-2"
            >
              <span class="text-body-2">Invoice Number:</span>
              <span class="font-weight-medium">{{ payment.invoiceNumber }}</span>
            </div>

            <div v-if="payment.dueDate" class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Due Date:</span>
              <span class="font-weight-medium">{{ formatDate(payment.dueDate) }}</span>
            </div>

            <v-divider class="my-3" />

            <div class="mb-2">
              <div class="text-overline mb-1">Description</div>
              <div class="text-body-2">{{ payment.description }}</div>
            </div>

            <div v-if="payment.notes" class="mt-3">
              <div class="text-overline mb-1">Notes</div>
              <div class="text-body-2 text-medium-emphasis">{{ payment.notes }}</div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Action Form -->
        <v-form ref="formRef" v-model="formValid">
          <!-- Action Tabs -->
          <v-tabs v-model="actionTab" color="primary" class="mb-4">
            <v-tab value="confirm">
              <v-icon icon="mdi-check-circle" start />
              Confirm
            </v-tab>
            <v-tab value="reject">
              <v-icon icon="mdi-close-circle" start />
              Reject
            </v-tab>
          </v-tabs>

          <v-window v-model="actionTab">
            <!-- Confirm Tab -->
            <v-window-item value="confirm">
              <div class="mb-4">
                <NumericInputField
                  v-model="form.actualAmount"
                  label="Actual Amount"
                  variant="outlined"
                  :min="0"
                  :max="999999999"
                  :format-as-currency="true"
                  prefix="Rp"
                  :rules="[rules.required, rules.positive]"
                  prepend-inner-icon="mdi-currency-usd"
                  hint="Enter actual amount paid (can differ from planned)"
                  persistent-hint
                />
              </div>

              <div class="mb-4">
                <v-textarea
                  v-model="form.notes"
                  label="Notes (Optional)"
                  variant="outlined"
                  prepend-inner-icon="mdi-note"
                  rows="2"
                  hint="Any notes about this payment"
                  persistent-hint
                />
              </div>

              <!-- Amount difference warning -->
              <v-alert
                v-if="showAmountDifference"
                :type="amountDifferenceType"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                <div class="d-flex align-center">
                  <v-icon :icon="amountDifferenceIcon" class="me-2" />
                  <div>
                    <div class="text-subtitle-2">{{ amountDifferenceText }}</div>
                    <div class="text-caption">
                      Difference: Rp {{ formatCurrency(Math.abs(amountDifference)) }}
                    </div>
                  </div>
                </div>
              </v-alert>
            </v-window-item>

            <!-- Reject Tab -->
            <v-window-item value="reject">
              <div class="mb-4">
                <v-textarea
                  v-model="form.rejectionReason"
                  label="Rejection Reason *"
                  variant="outlined"
                  :rules="actionTab === 'reject' ? [rules.required] : []"
                  prepend-inner-icon="mdi-alert-circle"
                  rows="4"
                  hint="Explain why this payment is being rejected"
                  persistent-hint
                />
              </div>

              <v-alert type="warning" variant="tonal" density="compact">
                <div class="text-caption">
                  Rejecting this payment will notify the backoffice manager. The payment will remain
                  in pending status and can be resubmitted after addressing the issue.
                </div>
              </v-alert>
            </v-window-item>
          </v-window>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
        <v-btn
          v-if="actionTab === 'confirm'"
          color="success"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="confirmPayment"
        >
          <v-icon icon="mdi-check-bold" start />
          Confirm Payment
        </v-btn>
        <v-btn
          v-if="actionTab === 'reject'"
          color="error"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="rejectPayment"
        >
          <v-icon icon="mdi-close-thick" start />
          Reject Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useAuthStore } from '@/stores/auth'
import type { PendingPayment } from '@/stores/account/types'
import type { ConfirmSupplierPaymentDto, RejectSupplierPaymentDto } from '@/stores/pos/shifts/types'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
  payment: PendingPayment | null
  shiftId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'payment-confirmed': [paymentId: string]
  'payment-rejected': [paymentId: string]
}>()

// Stores
const shiftsStore = useShiftsStore()
const authStore = useAuthStore()

// Local state
const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const formRef = ref()
const formValid = ref(false)
const loading = ref(false)
const actionTab = ref<'confirm' | 'reject'>('confirm')

const form = ref({
  actualAmount: 0,
  notes: '',
  rejectionReason: ''
})

// Computed
const showAmountDifference = computed(() => {
  if (!props.payment || form.value.actualAmount === 0) return false
  return Math.abs(amountDifference.value) > 0
})

const amountDifference = computed(() => {
  if (!props.payment) return 0
  return form.value.actualAmount - props.payment.amount
})

const amountDifferenceType = computed(() => {
  if (amountDifference.value > 0) return 'info'
  if (amountDifference.value < 0) return 'warning'
  return 'success'
})

const amountDifferenceIcon = computed(() => {
  if (amountDifference.value > 0) return 'mdi-arrow-up-circle'
  if (amountDifference.value < 0) return 'mdi-arrow-down-circle'
  return 'mdi-check-circle'
})

const amountDifferenceText = computed(() => {
  if (amountDifference.value > 0) return 'Paying more than planned'
  if (amountDifference.value < 0) return 'Paying less than planned'
  return 'Amount matches planned'
})

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required',
  positive: (v: number) => v > 0 || 'Amount must be greater than 0'
}

// Methods
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[priority] || 'default'
}

async function confirmPayment() {
  if (!formRef.value || !props.payment) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    const confirmData: ConfirmSupplierPaymentDto = {
      shiftId: props.shiftId,
      paymentId: props.payment.id,
      actualAmount:
        form.value.actualAmount !== props.payment.amount ? form.value.actualAmount : undefined,
      notes: form.value.notes || undefined,
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    }

    const result = await shiftsStore.confirmExpense(confirmData)

    if (result.success) {
      emit('payment-confirmed', props.payment.id)
      closeDialog()
      resetForm()
    } else {
      console.error('Failed to confirm payment:', result.error)
      alert('Failed to confirm payment: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error confirming payment:', error)
    alert('Error confirming payment')
  } finally {
    loading.value = false
  }
}

async function rejectPayment() {
  if (!formRef.value || !props.payment) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    const rejectData: RejectSupplierPaymentDto = {
      shiftId: props.shiftId,
      paymentId: props.payment.id,
      reason: form.value.rejectionReason,
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    }

    const result = await shiftsStore.rejectExpense(rejectData)

    if (result.success) {
      emit('payment-rejected', props.payment.id)
      closeDialog()
      resetForm()
    } else {
      console.error('Failed to reject payment:', result.error)
      alert('Failed to reject payment: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error rejecting payment:', error)
    alert('Error rejecting payment')
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

function resetForm() {
  form.value = {
    actualAmount: 0,
    notes: '',
    rejectionReason: ''
  }
  actionTab.value = 'confirm'
  formRef.value?.resetValidation()
}

// Watch payment change to update form
watch(
  () => props.payment,
  newPayment => {
    if (newPayment) {
      form.value.actualAmount = newPayment.amount
    }
  },
  { immediate: true }
)

// Watch dialog close to reset form
watch(dialog, newValue => {
  if (!newValue) {
    resetForm()
  }
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
