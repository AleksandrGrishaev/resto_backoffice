<!-- src/views/pos/shifts/dialogs/StartShiftDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-play-circle" color="success" class="me-3" />
        <span>Start Shift</span>
      </v-card-title>

      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-4">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="startShift">
          <!-- Cashier Info -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Cashier Information</div>

            <v-text-field
              v-model="form.cashierName"
              label="Cashier Name"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-account"
              required
            />
          </div>

          <!-- Starting Cash -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Cash Register</div>

            <!-- ✅ Sprint 4: Expected cash reminder -->
            <v-alert color="info" variant="tonal" class="mb-3" density="compact">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon start size="small">mdi-information</v-icon>
                  <span class="text-body-2">Expected cash in register:</span>
                </div>
                <span class="font-weight-bold text-h6">
                  {{ formatIDR(expectedCashInRegister) }}
                </span>
              </div>
              <div class="text-caption mt-1" style="opacity: 0.8">
                Based on current balance in Main Cash Account (acc_1)
              </div>
            </v-alert>

            <v-text-field
              v-model.number="form.startingCash"
              label="Starting Cash Amount"
              variant="outlined"
              type="number"
              min="0"
              step="1000"
              prefix="Rp"
              :rules="[rules.required, rules.nonNegative]"
              prepend-inner-icon="mdi-cash"
              hint="Count and enter the actual cash amount in the register"
              persistent-hint
            />

            <!-- ✅ Sprint 4: Cash mismatch warning -->
            <v-alert
              v-if="cashMatchWarning.show"
              color="warning"
              variant="tonal"
              class="mt-3"
              density="compact"
            >
              <div class="d-flex align-center">
                <v-icon start size="small">mdi-alert</v-icon>
                <div>
                  <div class="font-weight-bold">Cash Amount Mismatch</div>
                  <div class="text-caption">{{ cashMatchWarning.message }}</div>
                  <div class="text-caption mt-1">
                    Please verify the count. If correct, add a note explaining the difference.
                  </div>
                </div>
              </div>
            </v-alert>
          </div>

          <!-- Device & Location -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Terminal Information</div>

            <v-text-field
              v-model="form.deviceId"
              label="Device ID"
              variant="outlined"
              prepend-inner-icon="mdi-desktop-classic"
              readonly
              hint="Auto-detected terminal identifier"
            />

            <v-text-field
              v-model="form.location"
              label="Location"
              variant="outlined"
              prepend-inner-icon="mdi-map-marker"
              class="mt-3"
            />
          </div>

          <!-- Shift Notes -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Notes (Optional)</div>

            <v-textarea
              v-model="form.notes"
              label="Shift Notes"
              variant="outlined"
              rows="3"
              max-rows="5"
              prepend-inner-icon="mdi-note-text"
              hint="Any important notes for this shift"
              persistent-hint
            />
          </div>

          <!-- Start Time Info -->
          <v-alert color="info" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-icon start>mdi-clock</v-icon>
              <div>
                <div class="font-weight-bold">Shift Start Time</div>
                <div class="text-caption">{{ formatDateTime(new Date()) }}</div>
              </div>
            </div>
          </v-alert>

          <!-- Validation Checks -->
          <div v-if="validationCheck && !validationCheck.canStart" class="mb-4">
            <v-alert color="warning" variant="tonal">
              <div class="font-weight-bold">Cannot Start Shift</div>
              <div>{{ validationCheck.reason }}</div>
            </v-alert>
          </div>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="closeDialog">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="success"
          size="large"
          :loading="loading"
          :disabled="!formValid || !canStartShift"
          @click="startShift"
        >
          <v-icon start>mdi-play</v-icon>
          Start Shift
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useShiftsComposables } from '@/stores/pos/shifts/composables'
import { useAccountStore } from '@/stores/account'
import { POS_CASH_ACCOUNT_ID } from '@/stores/account/types'
import type { CreateShiftDto } from '@/stores/pos/shifts/types'
import { formatIDR } from '@/utils'

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
  'shift-started': [shiftData: any]
}>()

// Stores
const shiftsStore = useShiftsStore()
const accountStore = useAccountStore()
const { formatTime, formatDate, canStartShift: checkCanStartShift } = useShiftsComposables()

// Refs
const formRef = ref()

// State
const dialog = ref(props.modelValue)
const loading = ref(false)
const formValid = ref(false)

const form = ref<CreateShiftDto & { deviceId: string; location: string }>({
  cashierId: '', // TODO: Get from auth store
  cashierName: 'Current Cashier', // TODO: Get from auth store
  startingCash: 0, // Will be set from acc_1 balance on mount
  notes: '',
  deviceId: 'pos_terminal_main',
  location: 'Main Counter'
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required',
  nonNegative: (value: number) => value >= 0 || 'Amount cannot be negative'
}

// Computed
const currentTime = computed(() => new Date())

const validationCheck = computed(() => checkCanStartShift(shiftsStore.currentShift))

const canStartShift = computed(() => validationCheck.value.canStart && formValid.value)

// ✅ Sprint 4: Get expected cash from acc_1 balance
const expectedCashInRegister = computed(() => {
  const cashAccount = accountStore.accounts.find(acc => acc.id === POS_CASH_ACCOUNT_ID)
  return cashAccount?.balance || 0
})

// Check if starting cash matches expected amount
const cashMatchWarning = computed(() => {
  const difference = Math.abs(form.value.startingCash - expectedCashInRegister.value)
  const threshold = 10000 // 10k IDR threshold for warning

  if (difference > threshold) {
    return {
      show: true,
      message:
        difference > expectedCashInRegister.value
          ? `Entered amount is ${formatIDR(difference)} MORE than expected`
          : `Entered amount is ${formatIDR(difference)} LESS than expected`
    }
  }

  return { show: false, message: '' }
})

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      resetForm()
      checkCurrentState()
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function resetForm() {
  // ✅ Sprint 4: Auto-fill starting cash from acc_1 balance
  const expectedCash = expectedCashInRegister.value || 50000

  form.value = {
    cashierId: 'cashier_current', // TODO: Get from auth store
    cashierName: 'Current Cashier', // TODO: Get from auth store
    startingCash: expectedCash,
    notes: '',
    deviceId: 'pos_terminal_main',
    location: 'Main Counter'
  }

  if (formRef.value) {
    formRef.value.resetValidation()
  }
}

function closeDialog() {
  dialog.value = false
  loading.value = false
}

async function startShift() {
  if (!formValid.value || !canStartShift.value) return

  loading.value = true

  try {
    const dto: CreateShiftDto = {
      cashierId: form.value.cashierId,
      cashierName: form.value.cashierName,
      startingCash: form.value.startingCash,
      notes: form.value.notes,
      deviceId: form.value.deviceId,
      location: form.value.location
    }

    const result = await shiftsStore.startShift(dto)

    if (result.success && result.data) {
      const shiftData = {
        shift: result.data,
        startTime: new Date().toISOString()
      }

      emit('shift-started', shiftData)
      closeDialog()
      console.log('✅ Shift started successfully:', result.data.shiftNumber)

      // Show success message
      // TODO: Add toast notification
    } else {
      console.error('❌ Failed to start shift:', result.error)
      // TODO: Show error message to user
      throw new Error(result.error || 'Failed to start shift')
    }
  } catch (error) {
    console.error('❌ Error starting shift:', error)
    // TODO: Show error dialog or toast
  } finally {
    loading.value = false
  }
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function checkCurrentState() {
  // Load shifts to check current state
  if (shiftsStore.shifts.length === 0) {
    await shiftsStore.loadShifts()
  }

  // ✅ Sprint 4: Load accounts to get acc_1 balance
  if (accountStore.accounts.length === 0) {
    await accountStore.fetchAccounts()
  }

  // Set initial starting cash from expected amount
  if (form.value.startingCash === 0) {
    form.value.startingCash = expectedCashInRegister.value || 50000
  }
}

// Initialize on mount
onMounted(async () => {
  // Auto-generate cashier ID based on current user
  // TODO: Integrate with auth store when available
  form.value.cashierId = `cashier_${Date.now()}`

  // ✅ Sprint 4: Load account data to get expected cash
  await checkCurrentState()
})
</script>

<style scoped>
.v-card-title {
  background-color: rgba(255, 255, 255, 0.02);
}

.text-subtitle-2 {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.v-alert {
  border-radius: 8px;
}

.v-text-field {
  margin-bottom: 8px;
}

.v-textarea {
  margin-bottom: 8px;
}
</style>
