<template>
  <v-alert
    v-if="show"
    :type="alertType"
    variant="tonal"
    closable
    class="mb-4"
    @click:close="$emit('dismiss')"
  >
    <div class="d-flex align-center justify-space-between">
      <!-- Основное сообщение -->
      <div>
        <div class="text-subtitle-2 mb-1">
          {{ alertTitle }}
        </div>
        <div class="text-body-2 text-grey-400">
          {{ alertMessage }}
        </div>
      </div>

      <!-- Действия (для планшета - справа) -->
      <div class="ml-4 d-flex align-center">
        <span class="text-h6 mx-3">
          {{ formatCurrency(Math.abs(shortfallAmount)) }}
        </span>

        <v-btn
          v-if="shortfallType === 'overpayment'"
          variant="text"
          color="primary"
          size="small"
          @click="$emit('create-credit-note')"
        >
          Create Credit
        </v-btn>

        <v-btn
          v-if="shortfallType === 'underpayment'"
          variant="text"
          color="warning"
          size="small"
          @click="$emit('request-additional-payment')"
        >
          Request Payment
        </v-btn>
      </div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  show: boolean
  shortfallAmount: number // (+) = переплата, (-) = недоплата
  paidAmount?: number
  deliveredAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
  'create-credit-note': []
  'request-additional-payment': []
}>()

// =============================================
// COMPUTED
// =============================================

const shortfallType = computed(() => {
  return props.shortfallAmount > 0 ? 'overpayment' : 'underpayment'
})

const alertType = computed(() => {
  return shortfallType.value === 'overpayment' ? 'info' : 'warning'
})

const alertTitle = computed(() => {
  if (shortfallType.value === 'overpayment') {
    return 'Overpayment detected'
  }
  return 'Underpayment detected'
})

const alertMessage = computed(() => {
  const delivered = props.deliveredAmount ? formatCurrency(props.deliveredAmount) : 'N/A'
  const paid = props.paidAmount ? formatCurrency(props.paidAmount) : 'N/A'

  if (shortfallType.value === 'overpayment') {
    return `Paid ${paid} for delivered ${delivered}`
  }
  return `Delivered ${delivered} but only paid ${paid}`
})

// =============================================
// METHODS
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
</script>
