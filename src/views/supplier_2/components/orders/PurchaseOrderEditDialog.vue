<!-- src/views/supplier_2/components/orders/PurchaseOrderEditDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" persistent>
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
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
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
                v-model="editableOrder.paymentStatus"
                :items="billStatusOptions"
                label="Payment Status"
                prepend-inner-icon="mdi-credit-card"
                variant="outlined"
                density="compact"
                :disabled="!canEditBillStatus"
                class="mb-3"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Order Items -->
        <div class="pa-4">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-2 font-weight-bold">Order Items</div>
            <v-btn
              v-if="canEditItems"
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-plus"
              @click="showAddItemDialog = true"
            >
              Add Item
            </v-btn>
          </div>

          <v-table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
                <th v-if="canEditItems" width="80">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in editableOrder.items" :key="item.id">
                <td>
                  <div class="d-flex align-center">
                    <v-icon :icon="getItemIcon(item.itemId)" size="20" class="mr-2" />
                    <div>
                      <div class="font-weight-medium">{{ item.itemName || 'Unknown Item' }}</div>
                      <div class="text-caption text-medium-emphasis">ID: {{ item.itemId }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <v-text-field
                    v-model.number="item.orderedQuantity"
                    :disabled="!canEditItems || isItemReceived(item)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    step="0.01"
                    min="0"
                    hide-details
                    style="width: 120px"
                    class="text-right"
                    @input="validateQuantity(item)"
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ item.unit || 'unit' }}
                  </div>
                </td>
                <td class="text-right">
                  <v-text-field
                    v-model.number="item.pricePerUnit"
                    :disabled="!canEditItems || isItemReceived(item)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    step="0.01"
                    min="0"
                    hide-details
                    style="width: 140px"
                    class="text-right"
                    @input="validatePrice(item)"
                  />
                </td>
                <td class="text-right">
                  <div class="font-weight-medium">
                    {{ formatCurrency(calculateItemTotal(item)) }}
                  </div>
                </td>
                <td v-if="canEditItems">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    size="small"
                    color="error"
                    :disabled="isItemReceived(item)"
                    @click="confirmRemoveItem(index)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Totals -->
          <div class="d-flex justify-end border-t pt-4 mt-4">
            <div class="text-right">
              <div class="d-flex justify-between align-center mb-1">
                <span class="text-body-2 text-medium-emphasis mr-8">Subtotal:</span>
                <span class="font-weight-medium">{{ formatCurrency(orderTotals.subtotal) }}</span>
              </div>
              <div class="d-flex justify-between align-center mb-1">
                <span class="text-body-2 text-medium-emphasis mr-8">Tax:</span>
                <span>{{ formatCurrency(orderTotals.tax) }}</span>
              </div>
              <div class="d-flex justify-between align-center mb-2">
                <span class="text-body-2 text-medium-emphasis mr-8">Shipping:</span>
                <span>{{ formatCurrency(orderTotals.shipping) }}</span>
              </div>
              <v-divider class="mb-2" />
              <div class="d-flex justify-between align-center">
                <span class="text-h6 font-weight-bold mr-8">Total:</span>
                <span class="text-h6 font-weight-bold text-primary">
                  {{ formatCurrency(orderTotals.total) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <v-divider />

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
      <v-card-actions class="pa-4">
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

    <!-- Dialogs -->

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="600px">
      <v-card>
        <v-card-title>Add Item to Order</v-card-title>
        <v-card-text>
          <!-- Add item form would go here -->
          <div class="text-center pa-4">
            <div class="text-body-1 mb-2">Add Item Form</div>
            <div class="text-body-2 text-medium-emphasis">
              TODO: Implement add item functionality
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="showAddItemDialog = false">Add Item</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, computed, watch, nextTick } from 'vue'
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/supplier_2/supplier.types'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'

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

// Composables
const {
  updateOrder,
  sendOrder: sendOrderAction,
  // confirmOrder: confirmOrderAction, // ❌ УБИРАЕМ
  formatCurrency
} = usePurchaseOrders()
const { receipts } = useReceipts()

// Reactive state
const isOpen = ref(false)
const editableOrder = ref<PurchaseOrder | null>(null)
const originalOrderJson = ref('')

// Dialog states
const showAddItemDialog = ref(false)
const showRemoveItemDialog = ref(false)
const showUnsavedChangesDialog = ref(false)
const itemToRemoveIndex = ref(-1)

// Loading states
const saving = ref(false)
const sending = ref(false)

// Options
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

// Computed
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

const orderDateFormatted = computed({
  get: () => editableOrder.value?.orderDate?.split('T')[0] || '',
  set: (value: string) => {
    if (editableOrder.value && value) {
      editableOrder.value.orderDate = `${value}T00:00:00.000Z`
    }
  }
})

const expectedDeliveryFormatted = computed({
  get: () => editableOrder.value?.expectedDelivery?.split('T')[0] || '',
  set: (value: string) => {
    if (editableOrder.value && value) {
      editableOrder.value.expectedDelivery = `${value}T00:00:00.000Z`
    }
  }
})

const orderTotals = computed(() => {
  if (!editableOrder.value) return { subtotal: 0, tax: 0, shipping: 0, total: 0 }

  const subtotal = editableOrder.value.items.reduce(
    (sum, item) => sum + item.orderedQuantity * item.pricePerUnit,
    0
  )

  const tax = 0 // TODO: Calculate tax
  const shipping = 0 // TODO: Calculate shipping
  const total = subtotal + tax + shipping

  return { subtotal, tax, shipping, total }
})

// Watchers
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

// Methods
function initializeOrder() {
  if (!props.order) return

  // Deep clone the order
  editableOrder.value = JSON.parse(JSON.stringify(props.order))
  originalOrderJson.value = JSON.stringify(editableOrder.value)

  console.log('Order initialized for editing:', editableOrder.value.orderNumber)
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
    const updatedOrder = await updateOrder(editableOrder.value.id, {
      status: editableOrder.value.status,
      orderDate: editableOrder.value.orderDate,
      expectedDelivery: editableOrder.value.expectedDelivery,
      billStatus: editableOrder.value.billStatus,
      notes: editableOrder.value.notes,
      items: editableOrder.value.items
    })

    // Update local state
    editableOrder.value = updatedOrder
    originalOrderJson.value = JSON.stringify(updatedOrder)

    emits('order-updated', updatedOrder)
    emits('success', `Order ${updatedOrder.orderNumber} updated successfully`)
  } catch (error) {
    console.error('Failed to save order:', error)
    emits('error', `Failed to save order: ${error}`)
  } finally {
    saving.value = false
  }
}

async function sendOrder() {
  if (!editableOrder.value) return

  sending.value = true
  try {
    const sentOrder = await sendOrderAction(editableOrder.value.id)

    editableOrder.value = sentOrder
    originalOrderJson.value = JSON.stringify(sentOrder)

    emits('order-sent', sentOrder)
    emits('success', `Order ${sentOrder.orderNumber} sent to supplier`)
  } catch (error) {
    console.error('Failed to send order:', error)
    emits('error', `Failed to send order: ${error}`)
  } finally {
    sending.value = false
  }
}

function calculateItemTotal(item: PurchaseOrderItem): number {
  return item.orderedQuantity * item.pricePerUnit
}

function validateQuantity(item: PurchaseOrderItem) {
  if (item.orderedQuantity < 0) {
    item.orderedQuantity = 0
  }
}

function validatePrice(item: PurchaseOrderItem) {
  if (item.pricePerUnit < 0) {
    item.pricePerUnit = 0
  }
}

function isItemReceived(item: PurchaseOrderItem): boolean {
  if (!editableOrder.value) return false

  // Check if this item has been received in any completed receipt
  return receipts.value.some(
    receipt =>
      receipt.purchaseOrderId === editableOrder.value!.id &&
      receipt.status === 'completed' &&
      receipt.items.some(receiptItem => receiptItem.orderItemId === item.id)
  )
}

function confirmRemoveItem(index: number) {
  const item = editableOrder.value?.items[index]
  if (!item || isItemReceived(item)) return

  itemToRemoveIndex.value = index
  showRemoveItemDialog.value = true
}

function removeItem() {
  if (editableOrder.value && itemToRemoveIndex.value >= 0) {
    editableOrder.value.items.splice(itemToRemoveIndex.value, 1)
  }
  showRemoveItemDialog.value = false
  itemToRemoveIndex.value = -1
}

function getItemIcon(itemId: string): string {
  // Simple icon mapping - could be enhanced with product data
  return 'mdi-package-variant'
}
</script>

<style scoped>
.v-table tbody tr:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
