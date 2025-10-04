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
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleClose" />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-0" style="max-height: 70vh">
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

          <!-- Items Table -->
          <div v-if="editableOrder.items.length > 0" class="items-container">
            <v-card
              v-for="(item, index) in editableOrder.items"
              :key="item.id"
              variant="outlined"
              class="mb-3"
              :class="{ 'item-disabled': isItemReceived(item) }"
            >
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-3">
                  <!-- Item Info -->
                  <div class="d-flex align-center gap-3">
                    <v-avatar color="primary" size="40" variant="tonal">
                      <v-icon>{{ getItemIcon(item.itemId) }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-subtitle-1 font-weight-bold">{{ item.itemName }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Base: {{ item.orderedQuantity }} {{ item.unit }}
                      </div>
                    </div>
                  </div>

                  <!-- Status badges -->
                  <div class="d-flex align-center gap-2">
                    <v-chip v-if="isItemReceived(item)" color="success" size="small" variant="flat">
                      <v-icon start size="16">mdi-check</v-icon>
                      Received
                    </v-chip>
                    <v-chip v-else color="grey" size="small" variant="tonal">
                      {{ item.status }}
                    </v-chip>

                    <v-btn
                      v-if="canEditItems && !isItemReceived(item)"
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="confirmRemoveItem(index)"
                    />
                  </div>
                </div>

                <v-divider class="mb-3" />

                <!-- Package Information -->
                <div class="package-info-grid mb-3">
                  <!-- Current Package -->
                  <div>
                    <div class="text-caption text-medium-emphasis mb-1">Package Type</div>
                    <v-chip color="primary" size="small" variant="tonal">
                      <v-icon start size="16">mdi-package-variant</v-icon>
                      {{ item.packageName }}
                    </v-chip>
                  </div>

                  <!-- Package Quantity -->
                  <div>
                    <div class="text-caption text-medium-emphasis mb-1">Quantity</div>
                    <div class="text-body-1 font-weight-bold">
                      {{ item.packageQuantity }} × {{ item.packageUnit }}
                    </div>
                  </div>

                  <!-- Package Size -->
                  <div>
                    <div class="text-caption text-medium-emphasis mb-1">Package Size</div>
                    <div class="text-body-2">
                      {{ getPackageSize(item) }} {{ item.unit }} per package
                    </div>
                  </div>

                  <!-- Package Price -->
                  <div>
                    <div class="text-caption text-medium-emphasis mb-1">Price per Package</div>
                    <v-text-field
                      v-if="canEditItems && !isItemReceived(item)"
                      :model-value="item.packagePrice"
                      type="number"
                      density="compact"
                      variant="outlined"
                      hide-details
                      min="0"
                      step="100"
                      @update:model-value="updatePackagePrice(item, $event)"
                      @blur="validatePrice(item)"
                    />
                    <div v-else class="text-body-1 font-weight-medium">
                      {{ formatCurrency(item.packagePrice) }}
                    </div>
                  </div>

                  <!-- Total Price -->
                  <div>
                    <div class="text-caption text-medium-emphasis mb-1">Total Price</div>
                    <div class="text-h6 font-weight-bold text-success">
                      {{ formatCurrency(calculateItemTotal(item)) }}
                    </div>
                  </div>
                </div>

                <!-- Change Package Option -->
                <div v-if="canEditItems && !isItemReceived(item)">
                  <v-divider class="mb-3" />
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-swap-horizontal"
                    @click="openPackageSelector(item, index)"
                  >
                    Change Package
                  </v-btn>
                </div>

                <!-- Estimated Price Warning -->
                <v-alert
                  v-if="item.isEstimatedPrice"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                >
                  <div class="text-caption">
                    Price is estimated based on last purchase
                    <span v-if="item.lastPriceDate">({{ formatDate(item.lastPriceDate) }})</span>
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </div>

          <!-- Empty State -->
          <v-alert v-else type="info" variant="tonal" class="text-center">
            <div class="text-body-1 mb-2">No items in this order</div>
            <div class="text-body-2">Click "Add Item" to add products to this order</div>
          </v-alert>
        </div>

        <!-- Notes -->
        <div class="pa-4 border-t">
          <v-textarea
            v-model="editableOrder.notes"
            label="Order Notes"
            prepend-inner-icon="mdi-note-text"
            variant="outlined"
            rows="2"
            :disabled="!canEditBasicInfo"
          />
        </div>

        <!-- Order Summary -->
        <div class="pa-4 bg-surface-variant border-t">
          <v-row>
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Items</div>
              <div class="text-h6 font-weight-bold">{{ editableOrder.items.length }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Packages</div>
              <div class="text-h6 font-weight-bold">{{ totalPackages }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis">Total Amount</div>
              <div class="text-h5 font-weight-bold text-primary">
                {{ formatCurrency(orderTotal) }}
              </div>
              <v-chip
                v-if="editableOrder.isEstimatedTotal"
                size="x-small"
                color="warning"
                variant="tonal"
              >
                Estimated
              </v-chip>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-spacer />

        <v-btn
          v-if="canSendOrder"
          color="success"
          variant="flat"
          prepend-icon="mdi-send"
          :loading="sending"
          :disabled="!canSave"
          @click="sendOrder"
        >
          Save & Send Order
        </v-btn>

        <v-btn
          v-else
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save"
          :loading="saving"
          :disabled="!canSave"
          @click="saveOrder"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Package Selector Dialog -->
    <v-dialog v-model="showPackageSelectorDialog" max-width="800px" persistent>
      <v-card v-if="selectedItemForPackageChange">
        <v-card-title class="pa-4 bg-primary text-white">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6">Change Package</div>
              <div class="text-caption opacity-90">
                {{ selectedItemForPackageChange.itemName }}
              </div>
            </div>
            <v-btn icon="mdi-close" variant="text" color="white" @click="closePackageSelector" />
          </div>
        </v-card-title>

        <v-card-text class="pa-4">
          <package-selector
            :product-id="selectedItemForPackageChange.itemId"
            :required-base-quantity="selectedItemForPackageChange.orderedQuantity"
            :selected-package-id="selectedItemForPackageChange.packageId"
            mode="required"
            layout="vertical"
            @package-selected="handlePackageChange"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Remove Item Confirmation -->
    <v-dialog v-model="showRemoveItemDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Remove Item?</v-card-title>
        <v-card-text>Are you sure you want to remove this item from the order?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showRemoveItemDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="removeItem">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Unsaved Changes Dialog -->
    <v-dialog v-model="showUnsavedChangesDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Unsaved Changes</v-card-title>
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
import { useProductsStore } from '@/stores/productsStore'
import PackageSelector from '../shared/PackageSelector.vue'

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
const { updateOrder, sendOrder: sendOrderAction, formatCurrency } = usePurchaseOrders()
const { receipts } = useReceipts()
const productsStore = useProductsStore()

// Reactive state
const isOpen = ref(false)
const editableOrder = ref<PurchaseOrder | null>(null)
const originalOrderJson = ref('')

// Dialog states
const showPackageSelectorDialog = ref(false)
const showRemoveItemDialog = ref(false)
const showUnsavedChangesDialog = ref(false)
const selectedItemForPackageChange = ref<OrderItem | null>(null)
const selectedItemIndex = ref<number>(-1)
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
  { title: 'Fully Paid', value: 'fully_paid' }
]

// Computed
const canEditStatus = computed(() => editableOrder.value?.status === 'draft')
const canEditBasicInfo = computed(() => editableOrder.value?.status === 'draft')
const canEditBillStatus = computed(() => editableOrder.value?.status !== 'cancelled')
const canEditItems = computed(() => editableOrder.value?.status === 'draft')
const canSendOrder = computed(() => editableOrder.value?.status === 'draft')

const orderDateFormatted = computed({
  get: () => editableOrder.value?.orderDate?.split('T')[0] || '',
  set: val => {
    if (editableOrder.value) {
      editableOrder.value.orderDate = new Date(val).toISOString()
    }
  }
})

const expectedDeliveryFormatted = computed({
  get: () => editableOrder.value?.expectedDeliveryDate?.split('T')[0] || '',
  set: val => {
    if (editableOrder.value) {
      editableOrder.value.expectedDeliveryDate = new Date(val).toISOString()
    }
  }
})

const hasChanges = computed(() => {
  if (!editableOrder.value) return false
  return JSON.stringify(editableOrder.value) !== originalOrderJson.value
})

const orderTotal = computed(() => {
  if (!editableOrder.value) return 0
  return editableOrder.value.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
})

const totalPackages = computed(() => {
  if (!editableOrder.value) return 0
  return editableOrder.value.items.reduce((sum, item) => sum + item.packageQuantity, 0)
})

const canSave = computed(() => {
  if (!editableOrder.value) return false
  if (!hasChanges.value) return false
  if (editableOrder.value.items.length === 0) return false
  // Validate all items have packages
  return editableOrder.value.items.every(item => item.packageId && item.packageQuantity > 0)
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
  editableOrder.value = JSON.parse(JSON.stringify(props.order))
  originalOrderJson.value = JSON.stringify(editableOrder.value)
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

function getPackageSize(item: OrderItem): number {
  // Calculate package size from base quantity
  return item.orderedQuantity / item.packageQuantity
}

function updatePackagePrice(item: OrderItem, newPrice: string | number) {
  const price = typeof newPrice === 'string' ? parseFloat(newPrice) : newPrice
  if (isNaN(price)) return

  item.packagePrice = price
  // Recalculate pricePerUnit from packagePrice
  const packageSize = getPackageSize(item)
  item.pricePerUnit = price / packageSize
}

function calculateItemTotal(item: OrderItem): number {
  return item.packageQuantity * item.packagePrice
}

function validatePrice(item: OrderItem) {
  if (item.packagePrice < 0) {
    item.packagePrice = 0
  }
}

function isItemReceived(item: OrderItem): boolean {
  if (!editableOrder.value) return false
  return receipts.value.some(
    receipt =>
      receipt.purchaseOrderId === editableOrder.value!.id &&
      receipt.status === 'completed' &&
      receipt.items.some(receiptItem => receiptItem.orderItemId === item.id)
  )
}

function openPackageSelector(item: OrderItem, index: number) {
  selectedItemForPackageChange.value = item
  selectedItemIndex.value = index
  showPackageSelectorDialog.value = true
}

function closePackageSelector() {
  showPackageSelectorDialog.value = false
  selectedItemForPackageChange.value = null
  selectedItemIndex.value = -1
}

function handlePackageChange(data: {
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
}) {
  if (!editableOrder.value || selectedItemIndex.value < 0) return

  const item = editableOrder.value.items[selectedItemIndex.value]
  const pkg = productsStore.getPackageById(data.packageId)

  if (!pkg) {
    emits('error', 'Package not found')
    return
  }

  // Update item with new package
  item.packageId = data.packageId
  item.packageName = pkg.packageName
  item.packageQuantity = data.packageQuantity
  item.packageUnit = pkg.packageUnit
  item.orderedQuantity = data.resultingBaseQuantity

  // Update prices
  const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  item.packagePrice = packagePrice
  item.pricePerUnit = pkg.baseCostPerUnit

  closePackageSelector()
  emits('success', `Package changed to ${pkg.packageName}`)
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

async function saveOrder() {
  if (!editableOrder.value || !canSave.value) return

  saving.value = true
  try {
    const updatedOrder = await updateOrder(editableOrder.value.id, {
      status: editableOrder.value.status,
      orderDate: editableOrder.value.orderDate,
      expectedDelivery: editableOrder.value.expectedDelivery,
      paymentStatus: editableOrder.value.paymentStatus,
      notes: editableOrder.value.notes,
      items: editableOrder.value.items
    })

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

function getItemIcon(itemId: string): string {
  return 'mdi-package-variant'
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.items-container {
  max-height: 60vh;
  overflow-y: auto;
}

.item-disabled {
  opacity: 0.7;
  pointer-events: none;
}

.package-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

@media (max-width: 960px) {
  .package-info-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
