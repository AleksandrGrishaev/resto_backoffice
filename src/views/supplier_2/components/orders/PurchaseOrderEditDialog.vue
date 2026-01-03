<!-- src/views/supplier_2/components/orders/PurchaseOrderEditDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1400px" persistent scrollable>
    <v-card v-if="editableOrder">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-pencil" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">Edit Order</div>
            <div class="text-caption opacity-90">
              {{ editableOrder.orderNumber }} | {{ editableOrder.supplierName }}
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-2">
          <v-chip
            v-if="hasChanges"
            size="small"
            color="warning"
            variant="flat"
            prepend-icon="mdi-alert"
          >
            Unsaved Changes
          </v-chip>
          <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
        </div>
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-0">
        <!-- Order Info -->
        <div class="pa-4 bg-surface border-b">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-3">Order Information</div>

              <v-text-field
                v-model="editableOrder.orderNumber"
                label="Order Number"
                prepend-inner-icon="mdi-identifier"
                variant="outlined"
                density="compact"
                disabled
                class="mb-3"
              />

              <v-select
                v-model="editableOrder.status"
                :items="statusOptions"
                label="Status"
                prepend-inner-icon="mdi-flag"
                variant="outlined"
                density="compact"
                :disabled="!canEditStatus"
                class="mb-3"
              />

              <v-text-field
                v-model="editableOrder.supplierName"
                label="Supplier"
                prepend-inner-icon="mdi-truck"
                variant="outlined"
                density="compact"
                disabled
                class="mb-3"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-3">Dates & Payment</div>

              <v-text-field
                v-model="orderDateFormatted"
                label="Order Date"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="compact"
                type="date"
                :disabled="!canEditBasicInfo"
                class="mb-3"
              />

              <v-text-field
                v-model="expectedDeliveryFormatted"
                label="Expected Delivery"
                prepend-inner-icon="mdi-truck-delivery"
                variant="outlined"
                density="compact"
                type="date"
                :disabled="!canEditBasicInfo"
                class="mb-3"
              />

              <v-select
                v-model="editableOrder.billStatus"
                :items="billStatusOptions"
                label="Bill Status"
                prepend-inner-icon="mdi-credit-card"
                variant="outlined"
                density="compact"
                :disabled="!canEditBillStatus"
                class="mb-3"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Order Items Widget -->
        <div class="pa-4 border-b">
          <EditableOrderItemsWidget
            :items="editableOrder.items"
            :can-edit="canEditItems"
            :received-item-ids="receivedItemIds"
            @item-changed="handleItemChanged"
            @remove-item="confirmRemoveItem"
          />
        </div>

        <!-- Notes -->
        <div class="pa-4">
          <v-textarea
            v-model="editableOrder.notes"
            :disabled="!canEditBasicInfo"
            label="Notes"
            variant="outlined"
            rows="3"
            placeholder="Additional notes for this order..."
          />
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>

        <v-spacer />

        <!-- Action Buttons based on status -->
        <v-btn
          v-if="canSendOrder"
          color="info"
          variant="outlined"
          prepend-icon="mdi-send"
          :loading="sending"
          class="mr-2"
          @click="sendOrder"
        >
          Send to Supplier
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!canSave"
          :loading="saving"
          prepend-icon="mdi-content-save"
          @click="saveOrder"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Remove Item Confirmation -->
    <v-dialog v-model="showRemoveItemDialog" max-width="400px">
      <v-card>
        <v-card-title>Remove Item</v-card-title>
        <v-card-text>Are you sure you want to remove this item from the order?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showRemoveItemDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="removeItem">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Unsaved Changes Warning -->
    <v-dialog v-model="showUnsavedChangesDialog" max-width="400px">
      <v-card>
        <v-card-title>Unsaved Changes</v-card-title>
        <v-card-text>
          You have unsaved changes. Are you sure you want to close without saving?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showUnsavedChangesDialog = false">Cancel</v-btn>
          <v-btn color="warning" @click="forceClose">Close Without Saving</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PurchaseOrder, OrderItem } from '@/stores/supplier_2/types'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import EditableOrderItemsWidget from './order-edit/EditableOrderItemsWidget.vue'
import { DebugUtils } from '@/utils'
import { extractErrorDetails } from '@/utils/errors'

const MODULE_NAME = 'PurchaseOrderEditDialog'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'order-updated', order: PurchaseOrder): void
  (e: 'order-sent', order: PurchaseOrder): void
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const { updateOrder, sendOrderToSupplier, formatCurrency } = usePurchaseOrders()

const { receipts } = useReceipts()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = ref(false)
const editableOrder = ref<PurchaseOrder | null>(null)
const originalOrderJson = ref('')

// Dialog states
const showRemoveItemDialog = ref(false)
const showUnsavedChangesDialog = ref(false)
const itemToRemoveIndex = ref(-1)

// Loading states
const saving = ref(false)
const sending = ref(false)

// =============================================
// OPTIONS
// =============================================

const statusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Sent', value: 'sent' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' }
]

const billStatusOptions = [
  { title: 'Not Billed', value: 'not_billed' },
  { title: 'Billed', value: 'billed' },
  { title: 'Partially Paid', value: 'partially_paid' },
  { title: 'Fully Paid', value: 'fully_paid' },
  { title: 'Overdue', value: 'overdue' },
  { title: 'Overpaid', value: 'overpaid' }
]

// =============================================
// COMPUTED
// =============================================

const hasChanges = computed(() => {
  if (!editableOrder.value) return false
  return originalOrderJson.value !== JSON.stringify(editableOrder.value)
})

const canSave = computed(() => {
  return editableOrder.value && hasChanges.value && !saving.value
})

const canEditBasicInfo = computed(() => {
  return editableOrder.value?.status === 'draft'
})

const canEditItems = computed(() => {
  return editableOrder.value?.status === 'draft'
})

const canEditStatus = computed(() => {
  return editableOrder.value && ['draft', 'sent'].includes(editableOrder.value.status)
})

const canEditBillStatus = computed(() => {
  return editableOrder.value && ['sent', 'delivered'].includes(editableOrder.value.status)
})

const canSendOrder = computed(() => {
  return editableOrder.value?.status === 'draft'
})

const receivedItemIds = computed(() => {
  if (!editableOrder.value) return []

  // Находим все items, которые были получены в completed receipts
  const receivedIds: string[] = []

  receipts.value
    .filter(
      receipt =>
        receipt.purchaseOrderId === editableOrder.value!.id && receipt.status === 'completed'
    )
    .forEach(receipt => {
      receipt.items.forEach(receiptItem => {
        if (receiptItem.orderItemId && !receivedIds.includes(receiptItem.orderItemId)) {
          receivedIds.push(receiptItem.orderItemId)
        }
      })
    })

  return receivedIds
})

const orderDateFormatted = computed({
  get: () => editableOrder.value?.orderDate?.split('T')[0] || '',
  set: (value: string) => {
    if (editableOrder.value && value) {
      editableOrder.value.orderDate = `${value}T00:00:00.000Z`
    }
  }
})

const expectedDeliveryFormatted = computed({
  get: () => editableOrder.value?.expectedDeliveryDate?.split('T')[0] || '',
  set: (value: string) => {
    if (editableOrder.value && value) {
      editableOrder.value.expectedDeliveryDate = `${value}T00:00:00.000Z`
    }
  }
})

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  newValue => {
    isOpen.value = newValue
    if (newValue && props.order) {
      initializeOrder()
    }
  }
)

watch(isOpen, newValue => {
  if (!newValue) {
    emits('update:modelValue', false)
  }
})

// =============================================
// METHODS
// =============================================

function initializeOrder() {
  if (!props.order) return

  // Deep clone the order
  editableOrder.value = JSON.parse(JSON.stringify(props.order))
  originalOrderJson.value = JSON.stringify(editableOrder.value)

  DebugUtils.info(MODULE_NAME, 'Order initialized for editing', {
    orderNumber: editableOrder.value.orderNumber,
    itemsCount: editableOrder.value.items.length
  })
}

function handleClose() {
  if (hasChanges.value) {
    showUnsavedChangesDialog.value = true
  } else {
    forceClose()
  }
}

function forceClose() {
  showUnsavedChangesDialog.value = false
  editableOrder.value = null
  originalOrderJson.value = ''
  isOpen.value = false
}

async function saveOrder() {
  if (!editableOrder.value || !canSave.value) return

  saving.value = true
  try {
    // Пересчитываем totalAmount на основе items
    const newTotalAmount = editableOrder.value.items.reduce((sum, item) => sum + item.totalPrice, 0)

    const updatedOrder = await updateOrder(editableOrder.value.id, {
      status: editableOrder.value.status,
      billStatus: editableOrder.value.billStatus,
      expectedDeliveryDate: editableOrder.value.expectedDeliveryDate,
      notes: editableOrder.value.notes
      // items обновляются автоматически через handleItemChanged
    })

    // Update local state
    editableOrder.value = updatedOrder
    originalOrderJson.value = JSON.stringify(updatedOrder)

    emits('order-updated', updatedOrder)
    emits('success', `Order ${updatedOrder.orderNumber} updated successfully`)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save order', { error })
    emits('error', `Failed to save order: ${extractErrorDetails(error).message}`)
  } finally {
    saving.value = false
  }
}

async function sendOrder() {
  if (!editableOrder.value) return

  sending.value = true
  try {
    const sentOrder = await sendOrderToSupplier(editableOrder.value.id)

    editableOrder.value = sentOrder
    originalOrderJson.value = JSON.stringify(sentOrder)

    emits('order-sent', sentOrder)
    emits('success', `Order ${sentOrder.orderNumber} sent to supplier`)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to send order', { error })
    emits('error', `Failed to send order: ${extractErrorDetails(error).message}`)
  } finally {
    sending.value = false
  }
}

function handleItemChanged(item: OrderItem, index: number) {
  if (!editableOrder.value) return

  // Обновляем item в массиве
  editableOrder.value.items[index] = { ...item }

  // Пересчитываем общую сумму заказа
  editableOrder.value.totalAmount = editableOrder.value.items.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  )

  DebugUtils.info(MODULE_NAME, 'Item updated', {
    itemName: item.itemName,
    packageQuantity: item.packageQuantity,
    totalPrice: item.totalPrice,
    orderTotal: editableOrder.value.totalAmount
  })
}

function confirmRemoveItem(index: number) {
  const item = editableOrder.value?.items[index]
  if (!item) return

  // Проверяем, не был ли item получен
  if (receivedItemIds.value.includes(item.id)) {
    emits('error', 'Cannot remove received item')
    return
  }

  itemToRemoveIndex.value = index
  showRemoveItemDialog.value = true
}

function removeItem() {
  if (editableOrder.value && itemToRemoveIndex.value >= 0) {
    editableOrder.value.items.splice(itemToRemoveIndex.value, 1)

    // Пересчитываем общую сумму
    editableOrder.value.totalAmount = editableOrder.value.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    )
  }

  showRemoveItemDialog.value = false
  itemToRemoveIndex.value = -1
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.bg-surface {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}
</style>
