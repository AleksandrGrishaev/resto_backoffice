<!-- src/views/pos/order/components/OrderActions.vue -->
<template>
  <div class="order-actions">
    <div class="actions-content pa-4">
      <!-- Error Alert -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        closable
        class="mb-3"
        @click:close="clearError"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Success Alert -->
      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        closable
        class="mb-3"
        @click:close="clearSuccess"
      >
        {{ successMessage }}
      </v-alert>

      <!-- Action Buttons Row -->
      <div class="action-buttons d-flex gap-3">
        <!-- Save Button -->
        <BaseButton
          :variant="hasUnsavedChanges ? 'flat' : 'outlined'"
          :color="hasUnsavedChanges ? 'primary' : undefined"
          size="large"
          class="flex-grow-1"
          :disabled="!canSave"
          :loading="saving"
          start-icon="mdi-content-save"
          @click="handleSave"
        >
          Save Bill
          <span v-if="hasUnsavedChanges" class="unsaved-indicator">*</span>
        </BaseButton>

        <!-- Checkout Button -->
        <BaseButton
          color="success"
          variant="flat"
          size="large"
          class="flex-grow-1"
          :disabled="!canCheckout"
          :loading="processing"
          start-icon="mdi-credit-card"
          @click="handleCheckout"
        >
          Checkout
          <template v-if="ordersStore.selectedItemsCount > 0">
            ({{ ordersStore.selectedItemsCount }})
          </template>
        </BaseButton>

        <!-- Move Items Button -->
        <BaseButton
          variant="outlined"
          size="large"
          :disabled="!canMove"
          icon="mdi-arrow-right"
          @click="handleMove"
        />
      </div>

      <!-- Checkout Summary (only when items selected) -->
      <div
        v-if="ordersStore.selectedItemsCount > 0"
        class="checkout-summary mt-3 pa-3 rounded bg-success-lighten-5 border-success"
      >
        <div class="d-flex justify-space-between align-center">
          <div class="text-subtitle-2 font-weight-medium">
            Selected Items ({{ ordersStore.selectedItemsCount }})
          </div>
          <div class="text-h6 font-weight-bold text-success">
            {{ formatPrice(selectedItemsAmount) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder, PosBill } from '@/stores/pos/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import BaseButton from '@/components/atoms/buttons/BaseButton.vue'

// Store
const ordersStore = usePosOrdersStore()

// Props
interface Props {
  order: PosOrder | null
  bills: PosBill[]
  activeBill: PosBill | null
  hasUnsavedChanges?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasUnsavedChanges: false
})

// Emits
const emit = defineEmits<{
  save: []
  move: []
  checkout: [items: string[], amount: number]
}>()

// State
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const saving = ref(false)
const processing = ref(false)

// Computed - Action Availability
const canSave = computed((): boolean => {
  return !!props.order && props.hasUnsavedChanges
})

const canMove = computed((): boolean => {
  return ordersStore.hasSelection
})

const canCheckout = computed((): boolean => {
  if (!props.order) return false
  const hasItems = props.bills.some(bill => bill.items.length > 0)
  const hasUnpaidBills = props.bills.some(bill => bill.paymentStatus !== 'paid')
  return hasItems && hasUnpaidBills
})

// Computed - Amounts
const selectedItemsAmount = computed((): number => {
  if (ordersStore.selectedItemsCount === 0) return 0

  return props.bills.reduce((sum, bill) => {
    return (
      sum +
      bill.items.reduce((billSum, item) => {
        return ordersStore.isItemSelected(item.id) ? billSum + item.totalPrice : billSum
      }, 0)
    )
  }, 0)
})

const checkoutAmount = computed((): number => {
  if (ordersStore.selectedItemsCount > 0) {
    return selectedItemsAmount.value
  }

  // Calculate total amount of all unpaid bills
  return props.bills.reduce((sum, bill) => {
    return bill.paymentStatus === 'paid' ? sum : sum + bill.total
  }, 0)
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const clearError = (): void => {
  errorMessage.value = null
}

const clearSuccess = (): void => {
  successMessage.value = null
}

const showSuccess = (message: string): void => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

const showError = (message: string): void => {
  errorMessage.value = message
}

// Action Handlers
const handleSave = async (): Promise<void> => {
  if (!canSave.value) return

  try {
    saving.value = true
    clearError()
    emit('save')
    showSuccess('Bill saved successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save bill'
    showError(message)
  } finally {
    saving.value = false
  }
}

const handleMove = (): void => {
  if (!canMove.value) return
  emit('move')
}

const handleCheckout = async (): Promise<void> => {
  if (!canCheckout.value) return

  try {
    processing.value = true
    clearError()

    console.log('🔍 [OrderActions] Checkout started:', {
      hasSelection: ordersStore.hasSelection,
      selectedItemsCount: ordersStore.selectedItemsCount,
      selectedItemIds: ordersStore.selectedItemIds,
      selectedBillsCount: ordersStore.selectedBillsCount
    })

    // Если есть выбранные items - используем их (но только unpaid)
    // Если нет - собираем ВСЕ unpaid items из непоплаченных счетов
    let itemsToCheckout = ordersStore.selectedItemIds

    if (itemsToCheckout.length === 0) {
      // Собрать все unpaid items из unpaid bills
      itemsToCheckout = props.bills
        .filter(bill => bill.paymentStatus !== 'paid')
        .flatMap(bill =>
          bill.items
            .filter(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
            .map(item => item.id)
        )
      console.log('🔍 [OrderActions] No selection, using all unpaid items:', itemsToCheckout)
    } else {
      // НОВОЕ: фильтруем только unpaid items из выбранных
      const unpaidItems = itemsToCheckout.filter(itemId => {
        // Найти item во всех bills
        for (const bill of props.bills) {
          const item = bill.items.find(i => i.id === itemId)
          if (item) {
            return item.paymentStatus !== 'paid' && item.status !== 'cancelled'
          }
        }
        return false
      })

      if (unpaidItems.length === 0) {
        showError('All selected items are already paid')
        processing.value = false
        return
      }

      if (unpaidItems.length < itemsToCheckout.length) {
        const skippedCount = itemsToCheckout.length - unpaidItems.length
        console.log(`⚠️ [OrderActions] Skipped ${skippedCount} already paid items from selection`)
      }

      itemsToCheckout = unpaidItems
      console.log('🔍 [OrderActions] Using selected unpaid items:', itemsToCheckout)
    }

    if (itemsToCheckout.length === 0) {
      showError('No unpaid items to checkout')
      processing.value = false
      return
    }

    emit('checkout', itemsToCheckout, checkoutAmount.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process checkout'
    showError(message)
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.order-actions {
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.actions-content {
  padding: var(--spacing-md);
}

.action-buttons {
  gap: var(--spacing-sm);
}

.unsaved-indicator {
  color: rgb(var(--v-theme-warning));
  font-weight: bold;
  margin-left: var(--spacing-xs);
}

.checkout-summary {
  border: 1px solid rgba(var(--v-theme-success), 0.2);
  background: rgba(var(--v-theme-success), 0.05);
}

@media (max-width: 768px) {
  .actions-content {
    padding: var(--spacing-sm);
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .flex-grow-1 {
    flex-grow: 0;
  }
}
</style>
