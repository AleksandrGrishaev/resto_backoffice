<template>
  <v-dialog v-model="dialogModel" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex align-center bg-warning">
        <v-icon class="mr-2">mdi-undo</v-icon>
        Process Refund
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Original payment info -->
        <v-alert v-if="payment" type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-subtitle-2">Original Payment</div>
              <div class="text-caption">{{ payment.paymentNumber }}</div>
            </div>
            <div class="text-right">
              <div class="text-h6 font-weight-bold">
                {{ formatPrice(payment.amount) }}
              </div>
              <div class="text-caption">{{ formatPaymentMethod(payment.method) }}</div>
            </div>
          </div>
        </v-alert>

        <!-- Refund type selection -->
        <v-radio-group v-model="refundType" label="Refund Type">
          <v-radio label="Full Refund" value="full" />
          <v-radio label="Partial Refund" value="partial" />
        </v-radio-group>

        <!-- Partial refund amount -->
        <v-text-field
          v-if="refundType === 'partial'"
          v-model.number="refundAmount"
          type="number"
          label="Refund Amount"
          prefix="Rp"
          :rules="[
            v => !!v || 'Amount is required',
            v => v > 0 || 'Amount must be greater than 0',
            v => v <= (payment?.amount || 0) || 'Amount cannot exceed original payment'
          ]"
          :max="payment?.amount"
          variant="outlined"
          density="comfortable"
        />

        <!-- Refund reason (required) -->
        <v-textarea
          v-model="refundReason"
          label="Refund Reason *"
          placeholder="Enter reason for refund (e.g., customer return, wrong item, etc.)"
          :rules="[
            v => !!v || 'Reason is required',
            v => v.length >= 5 || 'Reason must be at least 5 characters'
          ]"
          variant="outlined"
          density="comfortable"
          rows="3"
          counter
          :maxlength="200"
        />

        <!-- Refund summary -->
        <v-card variant="outlined" class="mt-4">
          <v-card-text>
            <div class="text-subtitle-2 mb-2">Refund Summary</div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2">Refund Amount:</span>
              <span class="text-body-1 font-weight-bold text-error">
                {{ formatPrice(calculatedRefundAmount) }}
              </span>
            </div>
            <div class="d-flex justify-space-between">
              <span class="text-body-2">Method:</span>
              <span class="text-body-2">{{ formatPaymentMethod(payment?.method || '') }}</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Warning for cash refunds -->
        <v-alert v-if="payment?.method === 'cash'" type="warning" variant="tonal" class="mt-4">
          <div class="text-caption">
            Cash refund: {{ formatPrice(calculatedRefundAmount) }} will be returned to customer.
            Please ensure you have sufficient cash in register.
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="warning"
          variant="flat"
          :loading="loading"
          :disabled="!isValid"
          @click="handleConfirm"
        >
          Process Refund
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import type { PosPayment } from '@/stores/pos/types'

interface Props {
  modelValue: boolean
  payment: PosPayment | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [refundPayment: PosPayment]
  error: [error: string]
}>()

const paymentsStore = usePosPaymentsStore()

// ===== STATE =====

const refundType = ref<'full' | 'partial'>('full')
const refundAmount = ref<number>(0)
const refundReason = ref('')
const loading = ref(false)

// ===== COMPUTED =====

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const calculatedRefundAmount = computed(() => {
  if (!props.payment) return 0
  return refundType.value === 'full' ? props.payment.amount : refundAmount.value
})

const isValid = computed(() => {
  if (!refundReason.value || refundReason.value.length < 5) return false
  if (refundType.value === 'partial') {
    return refundAmount.value > 0 && refundAmount.value <= (props.payment?.amount || 0)
  }
  return true
})

// ===== WATCHERS =====

// Reset form when dialog opens
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      resetForm()
      if (props.payment) {
        refundAmount.value = props.payment.amount
      }
    }
  }
)

// ===== METHODS =====

function resetForm(): void {
  refundType.value = 'full'
  refundAmount.value = 0
  refundReason.value = ''
  loading.value = false
}

function handleCancel(): void {
  emit('update:modelValue', false)
  resetForm()
}

async function handleConfirm(): Promise<void> {
  if (!props.payment || !isValid.value) return

  loading.value = true

  try {
    const result = await paymentsStore.processRefund(
      props.payment.id,
      refundReason.value,
      refundType.value === 'full' ? undefined : refundAmount.value
    )

    if (result.success && result.data) {
      emit('success', result.data)
      emit('update:modelValue', false)
      resetForm()
    } else {
      throw new Error(result.error || 'Refund processing failed')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code'
  }
  return methods[method] || method
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
