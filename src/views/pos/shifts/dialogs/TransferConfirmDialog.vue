<!-- src/views/pos/shifts/dialogs/TransferConfirmDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="transfer">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-info">
        <v-icon icon="mdi-bank-transfer-in" color="white" class="me-3" />
        <span class="text-white">Confirm Incoming Transfer</span>
      </v-card-title>

      <v-divider />

      <!-- Transfer Details -->
      <v-card-text class="pa-4">
        <!-- Transfer Info -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon icon="mdi-bank" color="primary" class="me-3" />
              <div>
                <div class="text-overline">From Account</div>
                <div class="text-h6">{{ fromAccountName }}</div>
              </div>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Amount:</span>
              <span class="text-h5 text-success font-weight-bold">
                +Rp {{ formatCurrency(transfer.amount) }}
              </span>
            </div>

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Date:</span>
              <span class="font-weight-medium">{{ formatDate(transfer.createdAt) }}</span>
            </div>

            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2">Time:</span>
              <span class="font-weight-medium">{{ formatTime(transfer.createdAt) }}</span>
            </div>

            <v-divider class="my-3" />

            <div class="mb-2">
              <div class="text-overline mb-1">Description</div>
              <div class="text-body-2">{{ transfer.description }}</div>
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
              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                <div class="text-body-2">
                  Confirming this transfer will add
                  <strong>Rp {{ formatCurrency(transfer.amount) }}</strong>
                  to your cash register balance.
                </div>
              </v-alert>

              <div class="mb-4">
                <v-textarea
                  v-model="form.notes"
                  label="Notes (Optional)"
                  variant="outlined"
                  prepend-inner-icon="mdi-note"
                  rows="2"
                  hint="Any notes about this transfer"
                  persistent-hint
                />
              </div>
            </v-window-item>

            <!-- Reject Tab -->
            <v-window-item value="reject">
              <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
                <div class="text-body-2">
                  Rejecting this transfer will create a
                  <strong>reverse transfer</strong>
                  to return the money to the source account.
                </div>
              </v-alert>

              <div class="mb-4">
                <v-textarea
                  v-model="form.rejectionReason"
                  label="Rejection Reason *"
                  variant="outlined"
                  :rules="actionTab === 'reject' ? [rules.required] : []"
                  prepend-inner-icon="mdi-alert-circle"
                  rows="3"
                  hint="Explain why this transfer is being rejected"
                  persistent-hint
                />
              </div>
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
          :disabled="loading"
          @click="confirmTransfer"
        >
          <v-icon icon="mdi-check-bold" start />
          Confirm Transfer
        </v-btn>
        <v-btn
          v-if="actionTab === 'reject'"
          color="error"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="rejectTransfer"
        >
          <v-icon icon="mdi-close-thick" start />
          Reject Transfer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/stores/account/types'
import type { ConfirmTransferDto, RejectTransferDto } from '@/stores/pos/shifts/types'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
  transfer: Transaction | null
  shiftId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'transfer-confirmed': [transactionId: string]
  'transfer-rejected': [transactionId: string]
}>()

// Stores
const shiftsStore = useShiftsStore()
const accountStore = useAccountStore()
const authStore = useAuthStore()

// Local state
const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const formRef = ref()
const formValid = ref(true)
const loading = ref(false)
const actionTab = ref<'confirm' | 'reject'>('confirm')

const form = ref({
  notes: '',
  rejectionReason: ''
})

// Computed
const fromAccountName = computed(() => {
  if (!props.transfer?.transferDetails?.fromAccountId) return 'Unknown Account'
  const account = accountStore.getAccountById(props.transfer.transferDetails.fromAccountId)
  return account?.name || 'Unknown Account'
})

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required'
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

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function confirmTransfer() {
  if (!props.transfer) return

  try {
    loading.value = true

    const confirmData: ConfirmTransferDto = {
      shiftId: props.shiftId,
      transactionId: props.transfer.id,
      notes: form.value.notes || undefined,
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    }

    const result = await shiftsStore.confirmTransfer(confirmData)

    if (result.success) {
      emit('transfer-confirmed', props.transfer.id)
      closeDialog()
      resetForm()
    } else {
      console.error('Failed to confirm transfer:', result.error)
      alert('Failed to confirm transfer: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error confirming transfer:', error)
    alert('Error confirming transfer')
  } finally {
    loading.value = false
  }
}

async function rejectTransfer() {
  if (!formRef.value || !props.transfer) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    const rejectData: RejectTransferDto = {
      shiftId: props.shiftId,
      transactionId: props.transfer.id,
      reason: form.value.rejectionReason,
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    }

    const result = await shiftsStore.rejectTransfer(rejectData)

    if (result.success) {
      emit('transfer-rejected', props.transfer.id)
      closeDialog()
      resetForm()
    } else {
      console.error('Failed to reject transfer:', result.error)
      alert('Failed to reject transfer: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error rejecting transfer:', error)
    alert('Error rejecting transfer')
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

function resetForm() {
  form.value = {
    notes: '',
    rejectionReason: ''
  }
  actionTab.value = 'confirm'
  formRef.value?.resetValidation()
}

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
