<!-- src/views/pos/shifts/dialogs/RefundDialog.vue -->
<template>
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h6">Create Refund</div>
          <div v-if="payment" class="text-caption">{{ payment.paymentNumber }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text class="pa-4">
        <!-- Payment Info -->
        <v-alert v-if="payment" color="warning" variant="tonal" class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-alert</v-icon>
            <div>
              <div class="font-weight-bold">Refund Amount</div>
              <div class="text-h6">{{ formatPrice(payment.amount) }}</div>
              <div class="text-caption">
                Payment Method: {{ getPaymentMethodName(payment.method) }}
              </div>
            </div>
          </div>
        </v-alert>

        <!-- Refund Reason Form -->
        <v-form ref="formRef" v-model="formValid">
          <v-textarea
            v-model="refundReason"
            label="Refund Reason *"
            placeholder="Please describe the reason for refund..."
            :rules="[rules.required, rules.minLength]"
            rows="4"
            variant="outlined"
            counter="200"
            maxlength="200"
            hint="Required: Minimum 10 characters"
            persistent-hint
            autofocus
          >
            <template #prepend-inner>
              <v-icon>mdi-text</v-icon>
            </template>
          </v-textarea>
        </v-form>

        <!-- Warning Message -->
        <v-alert color="error" variant="outlined" density="compact" class="mt-4">
          <div class="text-caption">
            <v-icon size="small" class="mr-1">mdi-information</v-icon>
            This action cannot be undone. The payment will be marked as refunded and the amount will
            be deducted from the shift cash balance.
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="error"
          variant="flat"
          prepend-icon="mdi-cash-refund"
          :loading="loading"
          :disabled="!formValid || !refundReason.trim()"
          @click="handleCreateRefund"
        >
          Create Refund
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosPayment } from '@/stores/pos/types'

// Props & Emits
interface Props {
  modelValue: boolean
  payment: PosPayment | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  payment: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'refund-confirmed': [reason: string]
}>()

// State
const dialog = ref(props.modelValue)
const formRef = ref()
const formValid = ref(false)
const refundReason = ref('')
const loading = ref(false)

// Validation Rules
const rules = {
  required: (v: string) => !!v || 'Refund reason is required',
  minLength: (v: string) => (v && v.length >= 10) || 'Reason must be at least 10 characters'
}

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      // Reset form when dialog opens
      refundReason.value = ''
      if (formRef.value) {
        formRef.value.resetValidation()
      }
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function handleCancel() {
  if (!loading.value) {
    dialog.value = false
  }
}

async function handleCreateRefund() {
  if (!formValid.value || !refundReason.value.trim()) {
    return
  }

  loading.value = true
  try {
    // Emit confirmation with reason
    emit('refund-confirmed', refundReason.value.trim())
    // Dialog will be closed by parent component after successful refund
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

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code'
  }
  return names[method] || method
}
</script>

<style scoped>
/* Add any custom styles if needed */
</style>
