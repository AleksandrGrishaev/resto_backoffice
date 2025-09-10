<!-- src/views/counteragents/components/dialogs/BalanceCorrectionDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="600" persistent>
    <v-card>
      <v-card-title class="correction-header">
        <v-icon icon="mdi-scale-balance" class="me-2" />
        Adjust Balance for {{ counteragent?.name }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Current Balance Display -->
        <div class="current-balance-section mb-6">
          <div class="text-subtitle-2 mb-3">Current Balance</div>
          <v-chip
            :color="currentBalanceColor"
            variant="tonal"
            size="large"
            class="balance-display-chip"
          >
            <v-icon :icon="currentBalanceIcon" start />
            {{ formatCurrency(Math.abs(currentBalance)) }}
          </v-chip>
        </div>

        <!-- Correction Form -->
        <v-form ref="correctionForm" v-model="formValid" @submit.prevent="submitCorrection">
          <!-- New Balance Input -->
          <v-text-field
            v-model.number="formData.newBalance"
            label="New Balance Amount"
            type="number"
            variant="outlined"
            prefix="Rp"
            :rules="validationRules.newBalance"
            :error-messages="validationErrors"
            class="mb-4"
            step="1000"
          >
            <template #append-inner>
              <v-tooltip text="Enter the target balance amount">
                <template #activator="{ props }">
                  <v-icon v-bind="props" icon="mdi-help-circle" size="small" color="grey" />
                </template>
              </v-tooltip>
            </template>
          </v-text-field>

          <!-- Reason Selection -->
          <v-select
            v-model="formData.reason"
            label="Reason for Adjustment"
            variant="outlined"
            :items="correctionReasons"
            :rules="validationRules.reason"
            class="mb-4"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  <span class="text-caption text-medium-emphasis">
                    {{ getReasonDescription(item.value) }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Notes"
            variant="outlined"
            rows="3"
            :placeholder="getNotesPlaceholder()"
            :rules="validationRules.notes"
            counter="500"
            class="mb-4"
          />

          <!-- Preview Section -->
          <v-card
            v-if="previewInfo.hasChange"
            variant="outlined"
            :color="previewInfo.isIncrease ? 'info' : 'warning'"
            class="preview-card"
          >
            <v-card-text class="py-3">
              <div class="d-flex align-center">
                <v-icon
                  :icon="previewInfo.isIncrease ? 'mdi-trending-up' : 'mdi-trending-down'"
                  :color="previewInfo.isIncrease ? 'info' : 'warning'"
                  class="me-3"
                />
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ previewInfo.description }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    From {{ formatCurrency(Math.abs(currentBalance)) }} to
                    {{ formatCurrency(Math.abs(formData.newBalance)) }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Warning for large changes -->
          <v-alert v-if="isLargeChange" type="warning" variant="tonal" class="mt-4">
            <template #prepend>
              <v-icon icon="mdi-alert" />
            </template>
            <div class="text-body-2">
              This is a significant balance change. Please ensure all details are correct.
            </div>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submitCorrection"
        >
          Apply Adjustment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Counteragent } from '@/stores/counteragents'
import {
  balanceCorrectionService,
  BALANCE_CORRECTION_REASONS,
  REASON_DESCRIPTIONS,
  type BalanceCorrectionData,
  type BalanceCorrectionReason
} from '@/stores/counteragents/services/balanceCorrectionService'
import { formatIDR } from '@/utils/currency'

interface Props {
  modelValue: boolean
  counteragent: Counteragent | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [result: { oldBalance: number; newBalance: number; correctionAmount: number }]
  error: [error: string]
}>()

// =============================================
// STATE
// =============================================

const correctionForm = ref()
const formValid = ref(false)
const loading = ref(false)

const formData = ref<BalanceCorrectionData>({
  newBalance: 0,
  reason: '' as BalanceCorrectionReason,
  notes: ''
})

const validationErrors = ref<string[]>([])
const showCorrectionHistory = ref(false)
const correctionHistory = ref<any[]>([])
const loadCorrectionHistory = async () => {
  if (!props.counteragent) return

  try {
    correctionHistory.value = await balanceCorrectionService.getCorrectionHistory(
      props.counteragent.id
    )
  } catch (error) {
    console.error('Failed to load correction history:', error)
  }
}
// =============================================
// COMPUTED
// =============================================

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const currentBalance = computed(() => props.counteragent?.currentBalance || 0)

const currentBalanceColor = computed(() => {
  if (currentBalance.value > 0) return 'success'
  if (currentBalance.value < 0) return 'error'
  return 'default'
})

const currentBalanceIcon = computed(() => {
  if (currentBalance.value > 0) return 'mdi-cash-plus'
  if (currentBalance.value < 0) return 'mdi-cash-minus'
  return 'mdi-scale-balance'
})

const correctionReasons = computed(() => BALANCE_CORRECTION_REASONS)

const previewInfo = computed(() => {
  return balanceCorrectionService.getPreviewInfo(formData.value.newBalance, currentBalance.value)
})

const isLargeChange = computed(() => {
  const threshold = 10000000 // 10 million IDR
  return Math.abs(previewInfo.value.correctionAmount) > threshold
})

const canSubmit = computed(() => {
  return (
    formValid.value &&
    previewInfo.value.hasChange &&
    !loading.value &&
    validationErrors.value.length === 0
  )
})

// =============================================
// VALIDATION RULES
// =============================================

const validationRules = {
  newBalance: [
    (v: any) => (v !== '' && v !== null && v !== undefined) || 'New balance is required',
    (v: number) => !isNaN(v) || 'Must be a valid number',
    (v: number) => Math.abs(v) <= 999999999999 || 'Amount too large'
  ],
  reason: [(v: string) => !!v || 'Reason is required'],
  notes: [
    (v: string) => {
      if (formData.value.reason === 'other' && !v?.trim()) {
        return 'Notes are required when reason is "Other"'
      }
      if (v && v.length > 500) {
        return 'Notes must be less than 500 characters'
      }
      return true
    }
  ]
}

// =============================================
// METHODS
// =============================================

const formatCurrency = (amount: number): string => {
  return formatIDR(amount)
}

const getReasonDescription = (reason: BalanceCorrectionReason): string => {
  return REASON_DESCRIPTIONS[reason] || ''
}

const getNotesPlaceholder = (): string => {
  if (formData.value.reason === 'other') {
    return 'Please provide details about this adjustment...'
  }
  return 'Optional: Provide additional context for this adjustment...'
}

const resetForm = () => {
  formData.value = {
    newBalance: currentBalance.value,
    reason: '' as BalanceCorrectionReason,
    notes: ''
  }
  validationErrors.value = []

  // Reset form validation
  nextTick(() => {
    correctionForm.value?.resetValidation()
  })
}

const closeDialog = () => {
  if (!loading.value) {
    emit('update:modelValue', false)
  }
}

const submitCorrection = async () => {
  if (!props.counteragent || !canSubmit.value) return

  // Validate form
  const { valid } = await correctionForm.value.validate()
  if (!valid) return

  // Additional validation through service
  const validation = balanceCorrectionService.validateCorrectionData(
    formData.value,
    currentBalance.value
  )

  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  loading.value = true
  validationErrors.value = []

  try {
    const result = await balanceCorrectionService.applyBalanceCorrection(
      props.counteragent,
      formData.value
      // Можно добавить userId если есть auth: authStore.currentUser?.id
    )

    if (result.success) {
      // Emit только базовую информацию
      emit('success', {
        oldBalance: result.oldBalance,
        newBalance: result.newBalance,
        correctionAmount: result.correctionAmount
      })
    } else {
      emit('error', result.error || 'Failed to apply correction')
    }
  } catch (error) {
    console.error('Balance correction failed:', error)
    emit('error', error instanceof Error ? error.message : 'Unknown error occurred')
  } finally {
    loading.value = false
  }
}

// =============================================
// WATCHERS
// =============================================

// Reset form when dialog opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && props.counteragent) {
      resetForm()
    }
  }
)

// Clear validation errors when form data changes
watch(
  formData,
  () => {
    validationErrors.value = []
  },
  { deep: true }
)
</script>

<style scoped>
.correction-header {
  background: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.current-balance-section {
  padding: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.balance-display-chip {
  font-weight: 600;
  font-size: 1.1rem;
}

.preview-card {
  border-left: 4px solid currentColor;
}

.v-text-field .v-input__details {
  margin-top: 4px;
}
</style>
