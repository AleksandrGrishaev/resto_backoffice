<!-- src/views/pos/payment/dialogs/PrintReceiptDialog.vue -->
<!--
  Print Receipt Dialog
  Shown after successful payment.
  - For CASH: auto-prints receipt (mandatory)
  - For other methods: shows Skip/Print options
-->
<template>
  <v-dialog v-model="dialogModel" max-width="400" persistent :scrim="true">
    <v-card class="print-receipt-dialog">
      <!-- Success Header -->
      <v-card-title class="text-center pt-6">
        <v-icon color="success" size="64" class="mb-2">mdi-check-circle</v-icon>
        <div class="text-h5 font-weight-bold">Payment Successful!</div>
      </v-card-title>

      <v-card-text class="text-center pb-2">
        <!-- Payment Summary -->
        <div class="payment-summary mb-4">
          <div class="text-body-2 text-medium-emphasis">Amount Paid</div>
          <div class="text-h4 font-weight-bold">{{ formatAmount(amount) }}</div>

          <v-chip :color="methodColor" size="small" class="mt-2">
            {{ paymentMethod.toUpperCase() }}
          </v-chip>

          <!-- Change for cash payments -->
          <div v-if="isCash && change > 0" class="change-display mt-3">
            <div class="text-body-2 text-medium-emphasis">Change</div>
            <div class="text-h5 font-weight-bold text-primary">{{ formatAmount(change) }}</div>
          </div>
        </div>

        <v-divider class="mb-4" />

        <!-- Print Status -->
        <div class="print-status">
          <!-- Auto-printing for cash -->
          <template v-if="isCash && isPrinterConnected">
            <div v-if="isPrinting" class="d-flex flex-column align-center gap-2">
              <v-progress-circular indeterminate color="primary" size="32" />
              <div class="text-body-1">Printing receipt...</div>
            </div>

            <div v-else-if="printError" class="text-error">
              <v-icon color="error" class="mr-1">mdi-alert-circle</v-icon>
              {{ printError }}
            </div>

            <div v-else-if="printSuccess" class="text-success">
              <v-icon color="success" class="mr-1">mdi-check</v-icon>
              Receipt printed!
            </div>
          </template>

          <!-- Optional print for other methods -->
          <template v-else-if="!isCash && isPrinterConnected">
            <div class="text-body-1 text-medium-emphasis mb-2">Print receipt?</div>
          </template>

          <!-- No printer connected -->
          <template v-else-if="!isPrinterConnected">
            <div class="text-body-2 text-medium-emphasis">
              <v-icon size="small" class="mr-1">mdi-printer-off</v-icon>
              Printer not connected
            </div>
          </template>
        </div>
      </v-card-text>

      <v-card-actions class="justify-center pb-6 pt-2 gap-3">
        <!-- For Cash: just Close button (after print complete) -->
        <template v-if="isCash">
          <v-btn
            color="primary"
            size="large"
            variant="flat"
            min-width="150"
            :disabled="isPrinting"
            @click="handleClose"
          >
            {{ isPrinting ? 'Printing...' : 'Close' }}
          </v-btn>
        </template>

        <!-- For other methods: Skip and Print buttons -->
        <template v-else>
          <v-btn
            color="default"
            size="large"
            variant="outlined"
            min-width="120"
            :disabled="isPrinting"
            @click="handleSkip"
          >
            Skip
          </v-btn>

          <v-btn
            v-if="isPrinterConnected"
            color="primary"
            size="large"
            variant="flat"
            min-width="120"
            :loading="isPrinting"
            @click="handlePrint"
          >
            <v-icon start>mdi-printer</v-icon>
            Print
          </v-btn>

          <v-btn
            v-else
            color="primary"
            size="large"
            variant="flat"
            min-width="120"
            @click="handleClose"
          >
            Done
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePrinter } from '@/core/printing'
import type { ReceiptData } from '@/core/printing/types'
import { formatIDR } from '@/utils'

// Props
interface Props {
  modelValue: boolean
  receiptData: ReceiptData | null
  paymentMethod: string
  amount: number
  receivedAmount?: number
  change?: number
}

const props = withDefaults(defineProps<Props>(), {
  receivedAmount: 0,
  change: 0
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  printed: []
}>()

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Printer
const { isConnected: isPrinterConnected, printPaymentReceipt } = usePrinter()

// State
const isPrinting = ref(false)
const printSuccess = ref(false)
const printError = ref<string | null>(null)

// Computed
const isCash = computed(() => props.paymentMethod.toLowerCase() === 'cash')

const methodColor = computed(() => {
  switch (props.paymentMethod.toLowerCase()) {
    case 'cash':
      return 'success'
    case 'card':
      return 'primary'
    case 'qr':
      return 'info'
    default:
      return 'secondary'
  }
})

// Watch for dialog open - auto-print for cash
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      // Reset state
      isPrinting.value = false
      printSuccess.value = false
      printError.value = null

      // Auto-print for cash if printer is connected
      if (isCash.value && isPrinterConnected.value && props.receiptData) {
        await doPrint()
      }
    }
  }
)

// Methods
function formatAmount(value: number): string {
  return formatIDR(value)
}

async function doPrint(): Promise<void> {
  if (!props.receiptData || isPrinting.value) return

  isPrinting.value = true
  printError.value = null

  try {
    const result = await printPaymentReceipt(props.receiptData)

    if (result.success) {
      printSuccess.value = true
      emit('printed')
    } else {
      printError.value = result.error || 'Failed to print receipt'
    }
  } catch (err) {
    printError.value = err instanceof Error ? err.message : 'Print failed'
  } finally {
    isPrinting.value = false
  }
}

async function handlePrint(): Promise<void> {
  await doPrint()
}

function handleSkip(): void {
  dialogModel.value = false
  emit('close')
}

function handleClose(): void {
  dialogModel.value = false
  emit('close')
}
</script>

<style scoped>
.print-receipt-dialog {
  border-radius: 16px;
}

.payment-summary {
  padding: 16px;
}

.change-display {
  padding: 12px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
}

.print-status {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
