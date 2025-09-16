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

      <!-- Primary Actions Row -->
      <div class="primary-actions d-flex gap-2 mb-3">
        <!-- Save Bill Button -->
        <v-btn
          :color="hasUnsavedChanges ? 'primary' : 'surface-variant'"
          :variant="hasUnsavedChanges ? 'flat' : 'outlined'"
          size="large"
          class="flex-grow-1 save-btn"
          :disabled="!canSave"
          :loading="saving"
          @click="handleSave"
        >
          <v-icon start>{{ hasUnsavedChanges ? 'mdi-content-save' : 'mdi-check' }}</v-icon>
          Save Bill
          <span v-if="hasUnsavedChanges" class="unsaved-indicator">*</span>
        </v-btn>

        <!-- Send to Kitchen Button -->
        <v-btn
          color="warning"
          variant="flat"
          size="large"
          class="flex-grow-1"
          :disabled="!canSendToKitchen"
          :loading="sendingToKitchen"
          @click="handleSendToKitchen"
        >
          <v-icon start>mdi-chef-hat</v-icon>
          Send to Kitchen
        </v-btn>
      </div>

      <!-- Secondary Actions Row -->
      <div class="secondary-actions d-flex gap-2 mb-3">
        <!-- Print Bill Button -->
        <v-btn
          variant="outlined"
          size="large"
          class="flex-grow-1"
          :disabled="!canPrint"
          @click="handlePrint"
        >
          <v-icon start>mdi-printer</v-icon>
          Print Bill
        </v-btn>

        <!-- Move Items Button -->
        <v-btn
          variant="outlined"
          size="large"
          class="flex-grow-1"
          :disabled="!canMove"
          @click="handleMove"
        >
          <v-icon start>mdi-arrow-right</v-icon>
          Move Items
        </v-btn>
      </div>

      <!-- Checkout Section -->
      <div v-if="showCheckout" class="checkout-section">
        <v-divider class="mb-3" />

        <!-- Checkout Summary -->
        <div class="checkout-summary mb-3 pa-3 rounded" :class="checkoutSummaryClass">
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="checkout-label text-subtitle-2 font-weight-medium">
              {{ checkoutLabel }}
            </div>
            <div class="checkout-amount text-h6 font-weight-bold">
              {{ formatPrice(checkoutAmount) }}
            </div>
          </div>

          <div
            v-if="selectedItemsCount > 0"
            class="checkout-details text-caption text-medium-emphasis"
          >
            {{ selectedItemsCount }} items selected
          </div>
          <div v-else class="checkout-details text-caption text-medium-emphasis">
            {{ totalItemsCount }} items total
          </div>
        </div>

        <!-- Checkout Button -->
        <v-btn
          color="success"
          variant="flat"
          size="x-large"
          block
          class="checkout-btn"
          :disabled="!canCheckout"
          :loading="processing"
          @click="handleCheckout"
        >
          <v-icon start size="24">mdi-credit-card</v-icon>
          <span class="text-h6">
            {{ checkoutButtonText }}
          </span>
        </v-btn>
      </div>

      <!-- Quick Actions (collapsed by default) -->
      <div v-if="showQuickActions" class="quick-actions mt-3">
        <v-divider class="mb-3" />

        <div class="quick-actions-header d-flex align-center justify-space-between mb-2">
          <div class="text-caption text-medium-emphasis font-weight-medium">QUICK ACTIONS</div>
          <v-btn icon variant="text" size="x-small" @click="toggleQuickActions">
            <v-icon>{{ quickActionsExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </v-btn>
        </div>

        <v-expand-transition>
          <div v-show="quickActionsExpanded" class="quick-actions-content d-flex flex-wrap gap-1">
            <v-btn
              size="small"
              variant="outlined"
              :disabled="!canDuplicate"
              @click="handleDuplicate"
            >
              <v-icon start size="16">mdi-content-duplicate</v-icon>
              Duplicate
            </v-btn>

            <v-btn size="small" variant="outlined" :disabled="!canSplit" @click="handleSplit">
              <v-icon start size="16">mdi-call-split</v-icon>
              Split Bill
            </v-btn>

            <v-btn size="small" variant="outlined" :disabled="!canMerge" @click="handleMerge">
              <v-icon start size="16">mdi-call-merge</v-icon>
              Merge Bills
            </v-btn>

            <v-btn
              size="small"
              variant="outlined"
              color="error"
              :disabled="!canCancel"
              @click="handleCancel"
            >
              <v-icon start size="16">mdi-cancel</v-icon>
              Cancel Order
            </v-btn>
          </div>
        </v-expand-transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder, PosBill } from '@/stores/pos/types'

// Props
interface Props {
  order: PosOrder | null
  bills: PosBill[]
  activeBill: PosBill | null
  selectedItems?: string[]
  hasUnsavedChanges?: boolean
  showQuickActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedItems: () => [],
  hasUnsavedChanges: false,
  showQuickActions: false
})

// Emits
const emit = defineEmits<{
  save: []
  'send-to-kitchen': []
  print: []
  move: []
  checkout: [items: string[], amount: number]
  duplicate: []
  split: []
  merge: []
  cancel: []
}>()

// State
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const saving = ref(false)
const sendingToKitchen = ref(false)
const processing = ref(false)
const quickActionsExpanded = ref(false)

// Computed - Action Availability
const canSave = computed((): boolean => {
  return !!props.order && props.hasUnsavedChanges
})

const canSendToKitchen = computed((): boolean => {
  if (!props.order || !props.activeBill) return false
  return props.activeBill.items.some(item => item.status === 'active')
})

const canPrint = computed((): boolean => {
  return !!props.order && props.bills.some(bill => bill.items.length > 0)
})

const canMove = computed((): boolean => {
  return props.selectedItems.length > 0 || (props.activeBill?.items.length || 0) > 0
})

const canCheckout = computed((): boolean => {
  if (!props.order) return false
  const hasItems = props.bills.some(bill => bill.items.length > 0)
  const hasUnpaidBills = props.bills.some(bill => bill.paymentStatus !== 'paid')
  return hasItems && hasUnpaidBills
})

const canDuplicate = computed((): boolean => {
  return !!props.activeBill && props.activeBill.items.length > 0
})

const canSplit = computed((): boolean => {
  return !!props.activeBill && props.activeBill.items.length > 1
})

const canMerge = computed((): boolean => {
  return props.bills.length > 1
})

const canCancel = computed((): boolean => {
  return !!props.order && props.order.status !== 'cancelled'
})

// Computed - Checkout Section
const showCheckout = computed((): boolean => {
  return !!props.order && props.bills.some(bill => bill.items.length > 0)
})

const selectedItemsCount = computed((): number => {
  return props.selectedItems.length
})

const totalItemsCount = computed((): number => {
  return props.bills.reduce((sum, bill) => sum + bill.items.length, 0)
})

const checkoutAmount = computed((): number => {
  if (props.selectedItems.length > 0) {
    // Calculate amount for selected items
    return props.bills.reduce((sum, bill) => {
      return (
        sum +
        bill.items.reduce((billSum, item) => {
          return props.selectedItems.includes(item.id) ? billSum + item.totalPrice : billSum
        }, 0)
      )
    }, 0)
  }

  // Calculate total amount for all unpaid bills
  return props.bills.reduce((sum, bill) => {
    return bill.paymentStatus === 'paid' ? sum : sum + bill.total
  }, 0)
})

const checkoutLabel = computed((): string => {
  return props.selectedItems.length > 0 ? 'Selected Items' : 'Total Amount'
})

const checkoutButtonText = computed((): string => {
  return props.selectedItems.length > 0 ? 'Checkout Selected' : 'Checkout All'
})

const checkoutSummaryClass = computed((): string => {
  const baseClass = 'bg-success-lighten-5'
  return props.selectedItems.length > 0 ? `${baseClass} border-success` : baseClass
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

const toggleQuickActions = (): void => {
  quickActionsExpanded.value = !quickActionsExpanded.value
}

// Action Handlers
const handleSave = async (): Promise<void> => {
  if (!canSave.value) return

  try {
    saving.value = true
    clearError()

    console.log('💾 Save bill action:', {
      orderId: props.order?.id,
      billsCount: props.bills.length,
      hasUnsavedChanges: props.hasUnsavedChanges
    })

    emit('save')
    showSuccess('Bill saved successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save bill'
    showError(message)
  } finally {
    saving.value = false
  }
}

const handleSendToKitchen = async (): Promise<void> => {
  if (!canSendToKitchen.value) return

  try {
    sendingToKitchen.value = true
    clearError()

    console.log('🍳 Send to kitchen action:', {
      orderId: props.order?.id,
      activeBillId: props.activeBill?.id,
      itemsCount: props.activeBill?.items.length
    })

    emit('send-to-kitchen')
    showSuccess('Order sent to kitchen')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send to kitchen'
    showError(message)
  } finally {
    sendingToKitchen.value = false
  }
}

const handlePrint = (): void => {
  console.log('🖨️ Print bill action:', {
    orderId: props.order?.id,
    billsCount: props.bills.length
  })

  emit('print')
}

const handleMove = (): void => {
  console.log('↗️ Move items action:', {
    selectedItems: props.selectedItems,
    activeBillId: props.activeBill?.id
  })

  emit('move')
}

const handleCheckout = async (): Promise<void> => {
  if (!canCheckout.value) return

  try {
    processing.value = true
    clearError()

    console.log('💳 Checkout action:', {
      orderId: props.order?.id,
      selectedItems: props.selectedItems,
      checkoutAmount: checkoutAmount.value
    })

    emit('checkout', props.selectedItems, checkoutAmount.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process checkout'
    showError(message)
  } finally {
    processing.value = false
  }
}

const handleDuplicate = (): void => {
  console.log('📄 Duplicate action:', { activeBillId: props.activeBill?.id })
  emit('duplicate')
}

const handleSplit = (): void => {
  console.log('✂️ Split bill action:', { activeBillId: props.activeBill?.id })
  emit('split')
}

const handleMerge = (): void => {
  console.log('🔗 Merge bills action:', { billsCount: props.bills.length })
  emit('merge')
}

const handleCancel = (): void => {
  console.log('❌ Cancel order action:', { orderId: props.order?.id })
  emit('cancel')
}
</script>

<style scoped>
/* =============================================
   ORDER ACTIONS LAYOUT
   ============================================= */

.order-actions {
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.actions-content {
  padding: var(--spacing-md);
}

/* =============================================
   ACTION BUTTONS
   ============================================= */

.primary-actions,
.secondary-actions {
  gap: var(--spacing-sm);
}

.save-btn {
  position: relative;
  transition: all 0.3s ease;
}

.unsaved-indicator {
  color: rgb(var(--v-theme-warning));
  font-weight: bold;
  margin-left: var(--spacing-xs);
}

.checkout-btn {
  min-height: 56px;
  border-radius: var(--v-border-radius-lg);
  box-shadow: 0 4px 12px rgba(var(--v-theme-success), 0.3);
}

.checkout-btn:hover {
  box-shadow: 0 6px 16px rgba(var(--v-theme-success), 0.4);
  transform: translateY(-2px);
}

/* =============================================
   CHECKOUT SECTION
   ============================================= */

.checkout-section {
  background: rgba(var(--v-theme-success), 0.02);
  border-radius: var(--v-border-radius-lg);
  padding: var(--spacing-md);
  margin: 0 calc(-1 * var(--spacing-sm));
}

.checkout-summary {
  border: 1px solid rgba(var(--v-theme-success), 0.2);
  background: rgba(var(--v-theme-success), 0.05);
}

.checkout-amount {
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-success));
}

/* =============================================
   QUICK ACTIONS
   ============================================= */

.quick-actions {
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: var(--v-border-radius-md);
  padding: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-xs));
}

.quick-actions-header {
  user-select: none;
}

.quick-actions-content {
  gap: var(--spacing-xs);
}

/* =============================================
   ALERTS
   ============================================= */

.v-alert {
  border-radius: var(--v-border-radius-md);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .actions-content {
    padding: var(--spacing-sm);
  }

  .primary-actions,
  .secondary-actions {
    flex-direction: column;
  }

  .checkout-section {
    padding: var(--spacing-sm);
  }

  .checkout-btn {
    min-height: 48px;
  }
}

@media (max-width: 480px) {
  .quick-actions-content {
    flex-direction: column;
  }

  .quick-actions-content .v-btn {
    justify-content: flex-start;
  }
}

/* =============================================
   LOADING STATES
   ============================================= */

.order-actions.loading {
  opacity: 0.8;
  pointer-events: none;
}

.v-btn:disabled {
  opacity: 0.4;
}

.v-btn.v-btn--loading {
  opacity: 0.8;
}

/* =============================================
   ANIMATIONS
   ============================================= */

.order-actions {
  transition: all 0.3s ease;
}

.v-btn {
  transition: all 0.2s ease;
}

.checkout-summary {
  transition: all 0.3s ease;
}

.checkout-summary:hover {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.08);
}

/* =============================================
   FOCUS STATES
   ============================================= */

.v-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* =============================================
   STATUS INDICATORS
   ============================================= */

.save-btn.v-btn--variant-flat {
  background: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.save-btn.v-btn--variant-outlined {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
