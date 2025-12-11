<!-- src/views/supplier_2/components/receipts/BaseReceiptDialog.vue - UPDATED WITH WIDGET -->
<template>
  <v-dialog v-model="isOpen" max-width="1400px" persistent>
    <v-card v-if="props.order" class="receipt-dialog">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-truck-check" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">
              {{ isEditMode ? 'Edit Receipt' : 'Create Receipt' }}
            </div>
            <div class="text-caption opacity-90">
              Order: {{ props.order.orderNumber }} | {{ props.order.supplierName }}
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <!-- Loading State -->
      <div v-if="isLoading" class="pa-8 text-center">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
        <div class="text-h6 mb-2">Initializing Receipt...</div>
        <div class="text-body-2 text-medium-emphasis">Setting up items from purchase order</div>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Receipt Info -->
        <div class="pa-4 bg-surface border-b">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-2">Receipt Information</div>
              <v-text-field
                v-model="receiptForm.receivedBy"
                label="Received By"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                density="compact"
                :disabled="isCompleted"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-2">Delivery Date</div>
              <v-text-field
                v-model="receiptForm.deliveryDate"
                label="Delivery Date"
                type="datetime-local"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="compact"
                :disabled="isCompleted"
              />
            </v-col>
          </v-row>

          <!-- Order Summary -->
          <div class="d-flex align-center gap-4 mt-2">
            <v-chip color="info" size="small">
              <v-icon start icon="mdi-package" />
              {{ props.order.items.length }} items ordered
            </v-chip>
            <v-chip color="success" size="small">
              <v-icon start icon="mdi-currency-usd" />
              {{ formatCurrency(props.order.totalAmount) }} total
            </v-chip>
            <v-chip
              v-if="props.order.status"
              :color="getStatusColor(props.order.status)"
              size="small"
            >
              {{ props.order.status }}
            </v-chip>
          </div>
        </div>

        <!-- Financial Impact Summary -->
        <div v-if="hasDiscrepancies" class="pa-4 bg-warning-lighten-5 border-b">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2" />
              <div>
                <div class="text-subtitle-2 font-weight-bold text-warning">
                  Discrepancies Detected
                </div>
                <div class="text-body-2">
                  Check items table for quantity and price discrepancies
                </div>
              </div>
            </div>
            <v-chip :color="financialImpact >= 0 ? 'error' : 'success'" variant="flat" size="large">
              {{ formatFinancialImpact() }}
            </v-chip>
          </div>
        </div>

        <!-- Items Widget -->
        <div class="pa-4">
          <EditableReceiptItemsWidget
            :items="receiptForm.items"
            :is-completed="isCompleted"
            @item-changed="handleItemChanged"
            @auto-fill="autoFillFromOrder"
          />
        </div>

        <!-- Notes -->
        <div class="pa-4 bg-surface border-t">
          <v-textarea
            v-model="receiptForm.notes"
            label="Receipt Notes"
            placeholder="Add any additional notes about this receipt..."
            variant="outlined"
            density="compact"
            rows="3"
            :disabled="isCompleted"
          />
        </div>
      </div>

      <!-- Actions -->
      <v-card-actions class="pa-4 bg-surface border-t">
        <div v-if="hasDiscrepancies" class="d-flex align-center mr-4">
          <v-icon icon="mdi-alert-triangle" color="warning" size="20" class="mr-2" />
          <span class="text-body-2 text-warning">Discrepancies detected</span>
        </div>

        <v-spacer />

        <v-btn @click="closeDialog">Cancel</v-btn>

        <v-btn
          v-if="!isCompleted"
          color="primary"
          variant="outlined"
          :disabled="!canSave"
          :loading="isSaving"
          @click="saveReceipt"
        >
          Save Draft
        </v-btn>

        <v-btn
          v-if="!isCompleted"
          color="success"
          variant="flat"
          :disabled="!canComplete"
          :loading="isCompleting"
          @click="showConfirmDialog = true"
        >
          {{ hasDiscrepancies ? 'Complete with Discrepancies' : 'Complete Receipt' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            :icon="hasDiscrepancies ? 'mdi-alert-triangle' : 'mdi-check-circle'"
            :color="hasDiscrepancies ? 'warning' : 'success'"
            class="mr-2"
          />
          Confirm Receipt Completion
        </v-card-title>

        <v-card-text class="pa-4">
          <div v-if="hasDiscrepancies" class="mb-4">
            <v-alert type="warning" variant="tonal">
              <v-alert-title>Discrepancies Detected</v-alert-title>
              You have items with quantity or price discrepancies. Financial impact:
              <strong>{{ formatFinancialImpact() }}</strong>
            </v-alert>
          </div>

          <div class="mb-3">
            <h4>Receipt Summary:</h4>
            <ul class="text-body-2 mt-2">
              <li>{{ receiptForm.items.length }} items processed</li>
              <li>Received by: {{ receiptForm.receivedBy }}</li>
              <li>Delivery date: {{ formatDate(receiptForm.deliveryDate) }}</li>
              <li>Total value: {{ formatCurrency(calculatedActualTotal) }}</li>
            </ul>
          </div>

          <div class="text-body-2 text-medium-emphasis">
            Completing this receipt will:
            <ul class="mt-1">
              <li>Create a storage operation to update inventory</li>
              <li>Update the purchase order status to "delivered"</li>
              <li>Lock this receipt from further editing</li>
              <li>Update product costs based on actual prices</li>
            </ul>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn color="success" variant="flat" :loading="isCompleting" @click="confirmComplete">
            Confirm & Complete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import { useProductsStore } from '@/stores/productsStore'
import { TimeUtils } from '@/utils/time'
import { DebugUtils } from '@/utils'
import type {
  PurchaseOrder,
  Receipt,
  ReceiptItem,
  CreateReceiptData
} from '@/stores/supplier_2/types'
import EditableReceiptItemsWidget from './receipt-edit/EditableReceiptItemsWidget.vue'

const MODULE_NAME = 'BaseReceiptDialog'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
  receipt?: Receipt | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES & STORES
// =============================================

const {
  startReceipt,
  completeReceipt: completeReceiptAction,
  updateReceipt,
  formatCurrency,
  getStatusColor
} = useReceipts()

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const isLoading = ref(false)
const isSaving = ref(false)
const isCompleting = ref(false)
const showConfirmDialog = ref(false)

interface ReceiptFormItem extends ReceiptItem {
  unit?: string
  packageId?: string
  receivedPackageQuantity?: number
  actualPackagePrice?: number
}

const receiptForm = ref({
  receivedBy: 'Warehouse Manager',
  deliveryDate: TimeUtils.formatForHTMLInput(),
  notes: '',
  items: [] as ReceiptFormItem[]
})

const currentReceipt = ref<Receipt | null>(null)

// =============================================
// COMPUTED
// =============================================

const isEditMode = computed(() => !!props.receipt)
const isCompleted = computed(() => currentReceipt.value?.status === 'completed')

const calculatedActualTotal = computed(() => {
  if (!receiptForm.value.items || !Array.isArray(receiptForm.value.items)) {
    return 0
  }
  return receiptForm.value.items.reduce((total, item) => {
    return total + calculateLineTotal(item)
  }, 0)
})

/**
 * Expected total = receivedQuantity × orderedPrice for each item
 * This is what we WOULD pay without any price adjustments (market rounding)
 */
const expectedTotal = computed(() => {
  if (!receiptForm.value.items || !Array.isArray(receiptForm.value.items)) {
    return 0
  }
  return receiptForm.value.items.reduce((total, item) => {
    // Expected = received quantity × ordered price (no adjustments)
    return total + item.receivedQuantity * item.orderedPrice
  }, 0)
})

/**
 * Financial impact = difference between actual paid and expected
 * Positive = we paid MORE than expected (bad)
 * Negative = we paid LESS than expected (market rounding in our favor)
 */
const financialImpact = computed(() => {
  return calculatedActualTotal.value - expectedTotal.value
})

const hasDiscrepancies = computed(() => {
  return receiptForm.value.items?.some(item => hasItemDiscrepancy(item)) || false
})

const canSave = computed(() => {
  return (
    receiptForm.value.receivedBy &&
    typeof receiptForm.value.receivedBy === 'string' &&
    receiptForm.value.receivedBy.trim() !== '' &&
    receiptForm.value.items.length > 0 &&
    !isCompleted.value
  )
})

const canComplete = computed(() => {
  return (
    canSave.value &&
    receiptForm.value.items.every(item => item.receivedQuantity >= 0) &&
    !isCompleting.value
  )
})

// =============================================
// METHODS - Initialization
// =============================================

async function initializeReceipt() {
  if (!props.order) return

  DebugUtils.info(MODULE_NAME, 'Initializing receipt', {
    orderId: props.order.id,
    isEditMode: isEditMode.value
  })

  isLoading.value = true
  try {
    if (isEditMode.value && props.receipt) {
      DebugUtils.info(MODULE_NAME, 'Loading existing receipt for editing', {
        receiptId: props.receipt.id
      })
      currentReceipt.value = props.receipt
      setupReceiptForm()
    } else {
      DebugUtils.info(MODULE_NAME, 'Creating new receipt from order', {
        orderId: props.order.id
      })

      const createData: CreateReceiptData = {
        purchaseOrderId: props.order.id,
        receivedBy: receiptForm.value.receivedBy,
        items: props.order.items.map(orderItem => ({
          orderItemId: orderItem.id,
          receivedQuantity: orderItem.orderedQuantity,
          actualPrice: undefined,
          notes: ''
        }))
      }

      const newReceipt = await startReceipt(props.order.id, createData)
      currentReceipt.value = newReceipt
      setupReceiptForm()
    }

    DebugUtils.info(MODULE_NAME, 'Receipt initialized successfully', {
      receiptId: currentReceipt.value?.id,
      itemsCount: receiptForm.value.items.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize receipt', { error })
    emits('error', `Failed to initialize receipt: ${error}`)
    closeDialog()
  } finally {
    isLoading.value = false
  }
}

function setupReceiptForm() {
  if (!currentReceipt.value || !props.order) return

  DebugUtils.info(MODULE_NAME, 'Setting up form with receipt data', {
    receiptId: currentReceipt.value.id,
    itemsCount: currentReceipt.value.items.length
  })

  receiptForm.value.receivedBy = currentReceipt.value.receivedBy || 'Warehouse Manager'
  receiptForm.value.deliveryDate = TimeUtils.formatForHTMLInput(currentReceipt.value.deliveryDate)
  receiptForm.value.notes = currentReceipt.value.notes || ''

  // ✅ ИСПРАВЛЕНО: Заполняем все поля упаковок из OrderItem и ReceiptItem
  receiptForm.value.items = currentReceipt.value.items.map(receiptItem => {
    const orderItem = props.order!.items.find(oi => oi.id === receiptItem.orderItemId)

    if (!orderItem) {
      DebugUtils.warn(MODULE_NAME, 'Order item not found for receipt item', {
        receiptItemId: receiptItem.id,
        orderItemId: receiptItem.orderItemId
      })
    }

    return {
      ...receiptItem,

      // Базовые поля (уже были)
      unit: orderItem?.unit || getItemUnit(receiptItem.itemId),

      // ✅ НОВОЕ: Поля упаковок из OrderItem
      packageId: receiptItem.packageId || orderItem?.packageId || '',
      packageName: receiptItem.packageName || orderItem?.packageName || '',
      packageUnit: receiptItem.packageUnit || orderItem?.packageUnit || '',

      // ✅ НОВОЕ: Количества упаковок
      orderedPackageQuantity: receiptItem.orderedPackageQuantity || orderItem?.packageQuantity || 0,
      receivedPackageQuantity:
        receiptItem.receivedPackageQuantity ||
        (receiptItem.receivedPackageQuantity !== undefined
          ? receiptItem.receivedPackageQuantity
          : orderItem?.packageQuantity || 0),

      // ✅ НОВОЕ: Цены упаковок
      orderedPrice: receiptItem.orderedPrice || orderItem?.packagePrice || 0,
      actualPrice: receiptItem.actualPrice,
      actualPackagePrice: receiptItem.actualPrice, // actualPrice = цена за упаковку

      // ✅ НОВОЕ: Базовые цены (для расчетов)
      orderedBaseCost: receiptItem.orderedBaseCost || orderItem?.pricePerUnit || 0,
      actualBaseCost: receiptItem.actualBaseCost
    } as ReceiptFormItem
  })

  DebugUtils.debug(MODULE_NAME, 'Form setup complete with package data', {
    itemsCount: receiptForm.value.items.length,
    sampleItem: receiptForm.value.items[0]
      ? {
          itemName: receiptForm.value.items[0].itemName,
          packageId: receiptForm.value.items[0].packageId,
          packageName: receiptForm.value.items[0].packageName,
          orderedPackages: receiptForm.value.items[0].orderedPackageQuantity,
          receivedPackages: receiptForm.value.items[0].receivedPackageQuantity
        }
      : null
  })
}

// =============================================
// METHODS - Actions
// =============================================

function handleItemChanged(item: ReceiptFormItem, index: number) {
  if (!receiptForm.value.items) return

  receiptForm.value.items[index] = { ...item }

  DebugUtils.debug(MODULE_NAME, 'Receipt item updated', {
    itemName: item.itemName,
    receivedQuantity: item.receivedQuantity,
    actualPrice: item.actualPrice
  })
}

async function saveReceipt() {
  if (!currentReceipt.value || !canSave.value) return

  DebugUtils.info(MODULE_NAME, 'Saving receipt', { receiptId: currentReceipt.value.id })

  isSaving.value = true
  try {
    const updateData = {
      notes: receiptForm.value.notes
    }

    await updateReceipt(currentReceipt.value.id, updateData)
    emits('success', 'Receipt saved successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save receipt', { error })
    emits('error', `Failed to save receipt: ${error}`)
  } finally {
    isSaving.value = false
  }
}

async function confirmComplete() {
  if (!currentReceipt.value || !canComplete.value) return

  DebugUtils.info(MODULE_NAME, 'Completing receipt', {
    receiptId: currentReceipt.value.id,
    hasDiscrepancies: hasDiscrepancies.value,
    financialImpact: financialImpact.value
  })

  isCompleting.value = true
  try {
    currentReceipt.value.receivedBy = receiptForm.value.receivedBy
    currentReceipt.value.deliveryDate = receiptForm.value.deliveryDate
    currentReceipt.value.notes = receiptForm.value.notes

    // ✅ ИСПРАВЛЕНО: Копируем ВСЕ поля включая упаковки
    receiptForm.value.items.forEach(formItem => {
      const receiptItem = currentReceipt.value!.items.find(ri => ri.id === formItem.id)
      if (receiptItem) {
        // Базовые поля
        receiptItem.receivedQuantity = formItem.receivedQuantity
        receiptItem.notes = formItem.notes

        // ✅ НОВОЕ: Поля упаковок
        receiptItem.packageId = formItem.packageId
        receiptItem.packageName = formItem.packageName
        receiptItem.packageUnit = formItem.packageUnit
        receiptItem.receivedPackageQuantity = formItem.receivedPackageQuantity

        // ✅ НОВОЕ: Цены (actualPrice в ReceiptItem = цена за упаковку)
        receiptItem.actualPrice = formItem.actualPackagePrice || formItem.actualPrice
        receiptItem.actualBaseCost =
          formItem.actualBaseCost ||
          (formItem.actualPackagePrice && formItem.packageId
            ? calculateBaseCostFromPackagePrice(formItem)
            : undefined)
      }
    })

    const completedReceipt = await completeReceiptAction(
      currentReceipt.value.id,
      receiptForm.value.notes
    )

    DebugUtils.info(MODULE_NAME, 'Receipt completed successfully', {
      receiptId: completedReceipt.id,
      receiptNumber: completedReceipt.receiptNumber,
      storageOperationId: completedReceipt.storageOperationId
    })

    emits(
      'success',
      `Receipt ${completedReceipt.receiptNumber} completed and integrated with storage`
    )

    showConfirmDialog.value = false
    closeDialog()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to complete receipt', { error })
    emits('error', `Failed to complete receipt: ${error}`)
  } finally {
    isCompleting.value = false
  }
}

function calculateBaseCostFromPackagePrice(item: ReceiptFormItem): number | undefined {
  if (!item.actualPackagePrice || !item.packageId) return undefined

  const pkg = productsStore.getPackageById(item.packageId)
  if (!pkg) return undefined

  return item.actualPackagePrice / pkg.packageSize
}

function autoFillFromOrder() {
  if (!props.order || isCompleted.value) return

  DebugUtils.info(MODULE_NAME, 'Auto-filling quantities from order')

  receiptForm.value.items.forEach(item => {
    const orderItem = props.order!.items.find(oi => oi.id === item.orderItemId)
    if (orderItem) {
      item.receivedQuantity = orderItem.orderedQuantity
      item.actualPrice = undefined
      item.actualPackagePrice = undefined
      item.receivedPackageQuantity = undefined
    }
  })

  DebugUtils.info(MODULE_NAME, 'Auto-fill completed')
}

function closeDialog() {
  DebugUtils.info(MODULE_NAME, 'Closing dialog')

  currentReceipt.value = null
  receiptForm.value.items = []
  showConfirmDialog.value = false
  isLoading.value = false
  isSaving.value = false
  isCompleting.value = false

  emits('update:modelValue', false)
}

// =============================================
// METHODS - Item Calculations
// =============================================

function calculateLineTotal(item: ReceiptFormItem): number {
  const price = item.actualPrice || item.orderedPrice
  return item.receivedQuantity * price
}

function hasItemDiscrepancy(item: ReceiptFormItem): boolean {
  const qtyDiff = Math.abs(item.receivedQuantity - item.orderedQuantity)
  const priceDiff = item.actualPrice ? Math.abs(item.actualPrice - item.orderedPrice) : 0
  return qtyDiff > 0.001 || priceDiff > 0.01
}

// =============================================
// UTILITY METHODS
// =============================================

function getItemUnit(itemId: string | any): string {
  const id = typeof itemId === 'string' ? itemId : itemId?.itemId || ''

  if (id.includes('beer') || id.includes('cola')) return 'piece'
  if (id.includes('flour') || id.includes('sugar')) return 'kg'
  return 'kg'
}

function formatFinancialImpact(): string {
  const impact = financialImpact.value
  const sign = impact >= 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(impact))}`
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not set'

  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error formatting date', { error })
    return 'Invalid date'
  }
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => [props.modelValue, props.order],
  async ([isOpen, order]) => {
    DebugUtils.debug(MODULE_NAME, 'Dialog state changed', { isOpen, orderId: order?.id })

    if (isOpen && order && !isLoading.value) {
      await nextTick()
      await initializeReceipt()
    }
  },
  { immediate: true }
)

watch(
  () => props.receipt,
  newReceipt => {
    DebugUtils.debug(MODULE_NAME, 'Receipt prop changed', { receiptId: newReceipt?.id })

    if (newReceipt && props.modelValue) {
      currentReceipt.value = newReceipt
      setupReceiptForm()
    }
  }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  DebugUtils.info(MODULE_NAME, 'Component mounted', {
    isOpen: props.modelValue,
    orderId: props.order?.id,
    receiptId: props.receipt?.id
  })

  if (props.modelValue && props.order) {
    nextTick(() => {
      initializeReceipt()
    })
  }
})
</script>

<style lang="scss" scoped>
.receipt-dialog {
  .v-card {
    border-radius: 12px;
  }
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.gap-4 {
  gap: 16px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

.bg-warning-lighten-5 {
  background-color: rgb(var(--v-theme-warning), 0.1) !important;
}

.bg-surface {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

@media (max-width: 768px) {
  .gap-4 {
    gap: 8px;
  }
}
</style>
