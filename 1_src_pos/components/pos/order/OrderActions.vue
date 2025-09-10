<!-- src/components/pos/order/OrderActions.vue -->
<template>
  <div class="order-actions px-4 py-3">
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      class="mb-3"
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>
    <div class="buttons-container">
      <v-btn
        class="action-btn"
        :variant="orderStore.hasUnsavedChanges ? 'flat' : 'tonal'"
        :color="orderStore.hasUnsavedChanges ? 'primary' : 'grey-darken-3'"
        height="44"
        :disabled="!orderStore.canSave"
        @click="handleSave"
      >
        Save Bill
        <template v-if="orderStore.hasUnsavedChanges">*</template>
      </v-btn>
      <v-btn
        class="action-btn"
        color="primary"
        height="44"
        :disabled="!canCheckout"
        @click="handleCheckout"
      >
        Checkout
      </v-btn>
      <!-- Move Button -->
      <move-button />
    </div>

    <!-- Payment Dialog -->
    <payment-dialog
      v-model="showPaymentDialog"
      :selected-items="billStore.selection.selectedItems"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { useOrderStore } from '@/stores/order.store'
import { useBillStore } from '@/stores/bill.store'
import MoveButton from './MoveButton.vue'
import PaymentDialog from '@/components/payment/PaymentDialog.vue'
import { BillItem } from '@/types'

const MODULE_NAME = 'OrderActions'
const orderStore = useOrderStore()
const billStore = useBillStore()

const errorMessage = ref<string | null>(null)
const showPaymentDialog = ref(false)

const emit = defineEmits<{
  save: []
}>()

const handleSave = async () => {
  DebugUtils.debug(MODULE_NAME, 'Save bill clicked')
  errorMessage.value = null
  try {
    await orderStore.confirmOrder()
    emit('save')
  } catch (error) {
    console.error('Failed to save bill:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save bill'
  }
}

const canCheckout = computed(() => {
  // Если нет активного заказа или счетов, оплата невозможна
  if (!orderStore.bills.length) return false

  // Проверяем есть ли неоплаченные счета в заказе
  const hasUnpaidBills = orderStore.bills.some(
    bill =>
      bill.items.length > 0 && // счет не пустой
      bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  )

  return hasUnpaidBills
})

const handleCheckout = () => {
  DebugUtils.debug(MODULE_NAME, 'Checkout clicked')

  // Если нет выбранных счетов, выбираем все неоплаченные
  if (billStore.selection.selectedBills.size === 0) {
    orderStore.bills.forEach(bill => {
      // Выбираем только счета где есть неоплаченные позиции
      if (bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')) {
        billStore.toggleBillSelection(bill.id)
      }
    })
    billStore.selection.selectionMode = 'bills'
  }

  showPaymentDialog.value = true
}
</script>

<style scoped>
.order-actions {
  border-top: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.buttons-container {
  display: flex;
  gap: 16px;
  width: 100%;
}

.action-btn {
  flex: 1;
  font-weight: 500;
  letter-spacing: 0.0125em;
  text-transform: none;
  font-size: 0.875rem;
  border-radius: 8px;
}
</style>
