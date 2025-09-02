<!-- src/views/supplier_2/components/receipts/BaseReceiptDialog.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
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
                  {{ discrepantItemsCount }} Discrepancies Detected
                </div>
                <div class="text-body-2">
                  {{ quantityDiscrepancyCount }} quantity, {{ priceDiscrepancyCount }} price
                  discrepancies
                </div>
              </div>
            </div>
            <v-chip :color="financialImpact >= 0 ? 'success' : 'error'" variant="flat" size="large">
              {{ formatFinancialImpact() }}
            </v-chip>
          </div>
        </div>

        <!-- Items Table -->
        <div class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">
              Receipt Items ({{ receiptForm.items.length }})
            </div>

            <div class="d-flex gap-2">
              <v-btn
                color="info"
                variant="outlined"
                size="small"
                prepend-icon="mdi-auto-fix"
                :disabled="isCompleted"
                @click="autoFillFromOrder"
              >
                Auto Fill from Order
              </v-btn>

              <v-btn
                color="warning"
                variant="outlined"
                size="small"
                prepend-icon="mdi-backup-restore"
                :disabled="isCompleted"
                @click="resetToOriginal"
              >
                Reset to Original
              </v-btn>
            </div>
          </div>

          <v-data-table
            :headers="itemHeaders"
            :items="receiptForm.items"
            :loading="isLoading"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
            class="receipt-items-table"
          >
            <!-- Item Name with Order Info -->
            <template #[`item.itemInfo`]="{ item }">
              <div>
                <div class="text-subtitle-2 font-weight-bold">{{ item.itemName }}</div>
                <div class="text-caption text-medium-emphasis">
                  Order: {{ item.orderedQuantity }} {{ getItemUnit(item) }} @
                  {{ formatCurrency(item.orderedPrice) }}
                </div>
              </div>
            </template>

            <!-- Received Quantity Input -->
            <template #[`item.receivedQuantity`]="{ item }">
              <v-text-field
                v-model.number="item.receivedQuantity"
                type="number"
                step="0.001"
                min="0"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :disabled="isCompleted"
                :class="{
                  'qty-discrepancy': hasItemQuantityDiscrepancy(item)
                }"
                @blur="updateItemCalculations(item)"
              />
            </template>

            <!-- Actual Price Input -->
            <template #[`item.actualPrice`]="{ item }">
              <v-text-field
                v-model.number="item.actualPrice"
                type="number"
                step="0.01"
                min="0"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :disabled="isCompleted"
                :placeholder="formatCurrency(item.orderedPrice)"
                :class="{
                  'price-discrepancy': hasItemPriceDiscrepancy(item)
                }"
                @blur="updateItemCalculations(item)"
              />
            </template>

            <!-- Line Total -->
            <template #[`item.lineTotal`]="{ item }">
              <div class="text-end">
                <div class="font-weight-bold">{{ formatCurrency(calculateLineTotal(item)) }}</div>
                <div
                  v-if="hasItemDiscrepancy(item)"
                  class="text-caption"
                  :class="getLineTotalDiffClass(item)"
                >
                  {{ formatLineTotalDiff(item) }}
                </div>
              </div>
            </template>

            <!-- Status -->
            <template #[`item.status`]="{ item }">
              <v-chip
                size="small"
                :color="getItemStatusColor(item)"
                :variant="hasItemDiscrepancy(item) ? 'flat' : 'tonal'"
              >
                <v-icon v-if="hasItemDiscrepancy(item)" start :icon="getItemStatusIcon(item)" />
                {{ getItemStatusText(item) }}
              </v-chip>
            </template>

            <!-- Notes Input -->
            <template #[`item.notes`]="{ item }">
              <v-text-field
                v-model="item.notes"
                placeholder="Add notes..."
                variant="outlined"
                density="compact"
                hide-details="auto"
                :disabled="isCompleted"
              />
            </template>
          </v-data-table>
        </div>

        <!-- Summary -->
        <div class="pa-4 bg-surface border-t">
          <v-row>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="receiptForm.notes"
                label="Receipt Notes"
                placeholder="Add any additional notes about this receipt..."
                variant="outlined"
                density="compact"
                rows="3"
                :disabled="isCompleted"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-3">Receipt Summary</div>
              <div class="d-flex justify-space-between mb-2">
                <span>Items processed:</span>
                <span class="font-weight-bold">{{ receiptForm.items.length }}</span>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Original total:</span>
                <span>{{ formatCurrency(props.order.totalAmount) }}</span>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Actual total:</span>
                <span class="font-weight-bold">{{ formatCurrency(calculatedActualTotal) }}</span>
              </div>
              <v-divider class="my-2" />
              <div class="d-flex justify-space-between">
                <span class="font-weight-bold">Financial impact:</span>
                <span
                  class="font-weight-bold"
                  :class="financialImpact >= 0 ? 'text-success' : 'text-error'"
                >
                  {{ formatFinancialImpact() }}
                </span>
              </div>
            </v-col>
          </v-row>
        </div>
      </div>

      <!-- Actions -->
      <v-card-actions class="pa-4 bg-surface border-t">
        <div v-if="hasDiscrepancies" class="d-flex align-center mr-4">
          <v-icon icon="mdi-alert-triangle" color="warning" size="20" class="mr-2" />
          <span class="text-body-2 text-warning">{{ discrepantItemsCount }} discrepancies</span>
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
              You have {{ discrepantItemsCount }} items with quantity or price discrepancies.
              Financial impact:
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

import type {
  PurchaseOrder,
  Receipt,
  ReceiptItem,
  CreateReceiptData
} from '@/stores/supplier_2/types'

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

// ✅ ИСПРАВЛЕНО: Правильная структура формы
interface ReceiptFormItem extends ReceiptItem {
  unit?: string
}

const receiptForm = ref({
  receivedBy: 'Warehouse Manager',
  deliveryDate: TimeUtils.formatForHTMLInput(), // ✅ ИСПРАВЛЕНО
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

const financialImpact = computed(() => {
  const originalTotal = props.order?.totalAmount || 0
  return calculatedActualTotal.value - originalTotal
})

const hasDiscrepancies = computed(() => {
  return receiptForm.value.items?.some(item => hasItemDiscrepancy(item)) || false
})

const hasQuantityDiscrepancies = computed(() => {
  return receiptForm.value.items?.some(item => hasItemQuantityDiscrepancy(item)) || false
})

const hasPriceDiscrepancies = computed(() => {
  return receiptForm.value.items?.some(item => hasItemPriceDiscrepancy(item)) || false
})

const quantityDiscrepancyCount = computed(() => {
  return receiptForm.value.items?.filter(item => hasItemQuantityDiscrepancy(item)).length || 0
})

const priceDiscrepancyCount = computed(() => {
  return receiptForm.value.items?.filter(item => hasItemPriceDiscrepancy(item)).length || 0
})

const discrepantItemsCount = computed(() => {
  return receiptForm.value.items?.filter(item => hasItemDiscrepancy(item)).length || 0
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
// TABLE CONFIGURATION
// =============================================

const itemHeaders = [
  { title: 'Item', key: 'itemInfo', sortable: false, width: '200px' },
  { title: 'Received Qty', key: 'receivedQuantity', sortable: false, width: '120px' },
  { title: 'Actual Price', key: 'actualPrice', sortable: false, width: '120px' },
  { title: 'Line Total', key: 'lineTotal', sortable: false, width: '140px', align: 'end' },
  { title: 'Status', key: 'status', sortable: false, width: '140px' },
  { title: 'Notes', key: 'notes', sortable: false, width: '200px' }
]

// =============================================
// METHODS - Initialization
// =============================================

async function initializeReceipt() {
  if (!props.order) return

  console.log('BaseReceiptDialog: Initializing receipt', {
    orderId: props.order.id,
    isEditMode: isEditMode.value
  })

  isLoading.value = true
  try {
    if (isEditMode.value && props.receipt) {
      // Режим редактирования - загружаем существующий receipt
      console.log('BaseReceiptDialog: Loading existing receipt for editing', props.receipt.id)
      currentReceipt.value = props.receipt
      setupReceiptForm()
    } else {
      // Режим создания - создаем новый receipt
      console.log('BaseReceiptDialog: Creating new receipt from order', props.order.id)

      const createData: CreateReceiptData = {
        purchaseOrderId: props.order.id,
        receivedBy: receiptForm.value.receivedBy,
        items: props.order.items.map(orderItem => ({
          orderItemId: orderItem.id,
          receivedQuantity: orderItem.orderedQuantity, // Предзаполняем заказанным количеством
          actualPrice: undefined, // Оставляем пустым - будет использоваться orderedPrice
          notes: ''
        }))
      }

      const newReceipt = await startReceipt(props.order.id, createData)
      currentReceipt.value = newReceipt
      setupReceiptForm()
    }

    console.log('BaseReceiptDialog: Receipt initialized successfully', {
      receiptId: currentReceipt.value?.id,
      itemsCount: receiptForm.value.items.length
    })
  } catch (error) {
    console.error('BaseReceiptDialog: Failed to initialize receipt', error)
    emits('error', `Failed to initialize receipt: ${error}`)
    closeDialog()
  } finally {
    isLoading.value = false
  }
}

function setupReceiptForm() {
  if (!currentReceipt.value || !props.order) return

  console.log('BaseReceiptDialog: Setting up form with receipt data', {
    receiptId: currentReceipt.value.id,
    itemsCount: currentReceipt.value.items.length
  })

  // Заполняем основную информацию с проверками типов
  receiptForm.value.receivedBy = currentReceipt.value.receivedBy || 'Warehouse Manager'
  // ✅ ИСПРАВЛЕНО: Убираем дублирование логики
  receiptForm.value.deliveryDate = TimeUtils.formatForHTMLInput(currentReceipt.value.deliveryDate)
  receiptForm.value.notes = currentReceipt.value.notes || ''

  // Заполняем items
  receiptForm.value.items = currentReceipt.value.items.map(receiptItem => {
    const orderItem = props.order!.items.find(oi => oi.id === receiptItem.orderItemId)

    return {
      ...receiptItem,
      unit: orderItem?.unit || getItemUnit(receiptItem.itemId),
      actualPrice: receiptItem.actualPrice || undefined
    } as ReceiptFormItem
  })

  console.log('BaseReceiptDialog: Form setup complete', {
    itemsCount: receiptForm.value.items.length,
    receivedBy: receiptForm.value.receivedBy,
    deliveryDate: receiptForm.value.deliveryDate, // ✅ ДОБАВЛЕНО для отладки
    hasDiscrepancies: hasDiscrepancies.value
  })
}

// =============================================
// METHODS - Actions
// =============================================

async function saveReceipt() {
  if (!currentReceipt.value || !canSave.value) return

  console.log('BaseReceiptDialog: Saving receipt', currentReceipt.value.id)

  isSaving.value = true
  try {
    const updateData = {
      notes: receiptForm.value.notes
      // TODO: Обновить items если изменились
    }

    await updateReceipt(currentReceipt.value.id, updateData)
    emits('success', `Receipt saved successfully`)
  } catch (error) {
    console.error('BaseReceiptDialog: Failed to save receipt', error)
    emits('error', `Failed to save receipt: ${error}`)
  } finally {
    isSaving.value = false
  }
}

async function confirmComplete() {
  if (!currentReceipt.value || !canComplete.value) return

  console.log('BaseReceiptDialog: Completing receipt', {
    receiptId: currentReceipt.value.id,
    hasDiscrepancies: hasDiscrepancies.value,
    financialImpact: financialImpact.value
  })

  isCompleting.value = true
  try {
    // Обновляем текущий receipt с данными из формы перед завершением
    currentReceipt.value.receivedBy = receiptForm.value.receivedBy
    currentReceipt.value.deliveryDate = receiptForm.value.deliveryDate
    currentReceipt.value.notes = receiptForm.value.notes

    // Обновляем items с актуальными данными
    receiptForm.value.items.forEach(formItem => {
      const receiptItem = currentReceipt.value!.items.find(ri => ri.id === formItem.id)
      if (receiptItem) {
        receiptItem.receivedQuantity = formItem.receivedQuantity
        receiptItem.actualPrice = formItem.actualPrice
        receiptItem.notes = formItem.notes
      }
    })

    const completedReceipt = await completeReceiptAction(
      currentReceipt.value.id,
      receiptForm.value.notes
    )

    console.log('BaseReceiptDialog: Receipt completed successfully', {
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
    console.error('BaseReceiptDialog: Failed to complete receipt', error)
    emits('error', `Failed to complete receipt: ${error}`)
  } finally {
    isCompleting.value = false
  }
}

function autoFillFromOrder() {
  if (!props.order || isCompleted.value) return

  console.log('BaseReceiptDialog: Auto-filling quantities from order')

  receiptForm.value.items.forEach(item => {
    const orderItem = props.order!.items.find(oi => oi.id === item.orderItemId)
    if (orderItem) {
      item.receivedQuantity = orderItem.orderedQuantity
      item.actualPrice = undefined // Очищаем, чтобы использовался orderedPrice
    }
  })

  console.log('BaseReceiptDialog: Auto-fill completed')
}

function resetToOriginal() {
  if (!props.order || !currentReceipt.value || isCompleted.value) return

  console.log('BaseReceiptDialog: Resetting form to original values')

  // Возвращаем к исходным значениям receipt
  setupReceiptForm()

  console.log('BaseReceiptDialog: Reset completed')
}

function closeDialog() {
  console.log('BaseReceiptDialog: Closing dialog')

  // Очищаем состояние
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

function updateItemCalculations(item: ReceiptFormItem) {
  // Можно добавить дополнительную логику пересчета
  console.log('BaseReceiptDialog: Item calculations updated', {
    itemId: item.itemId,
    receivedQuantity: item.receivedQuantity,
    actualPrice: item.actualPrice,
    lineTotal: calculateLineTotal(item)
  })
}

// =============================================
// METHODS - Discrepancy Analysis
// =============================================

function hasItemDiscrepancy(item: ReceiptFormItem): boolean {
  return hasItemQuantityDiscrepancy(item) || hasItemPriceDiscrepancy(item)
}

function hasItemQuantityDiscrepancy(item: ReceiptFormItem): boolean {
  const diff = Math.abs(item.receivedQuantity - item.orderedQuantity)
  return diff > 0.001 // Учитываем погрешности с плавающей точкой
}

function hasItemPriceDiscrepancy(item: ReceiptFormItem): boolean {
  if (!item.actualPrice) return false
  const diff = Math.abs(item.actualPrice - item.orderedPrice)
  return diff > 0.01 // Учитываем погрешности в копейках
}

function getItemStatusColor(item: ReceiptFormItem): string {
  if (!hasItemDiscrepancy(item)) return 'success'
  if (hasItemQuantityDiscrepancy(item) && hasItemPriceDiscrepancy(item)) return 'error'
  if (hasItemQuantityDiscrepancy(item)) return 'warning'
  if (hasItemPriceDiscrepancy(item)) return 'info'
  return 'success'
}

function getItemStatusIcon(item: ReceiptFormItem): string {
  if (hasItemQuantityDiscrepancy(item) && hasItemPriceDiscrepancy(item)) {
    return 'mdi-alert-circle'
  }
  if (hasItemQuantityDiscrepancy(item)) return 'mdi-scale'
  if (hasItemPriceDiscrepancy(item)) return 'mdi-currency-usd'
  return 'mdi-check'
}

function getItemStatusText(item: ReceiptFormItem): string {
  if (hasItemQuantityDiscrepancy(item) && hasItemPriceDiscrepancy(item)) {
    return 'Qty & Price'
  }
  if (hasItemQuantityDiscrepancy(item)) return 'Quantity'
  if (hasItemPriceDiscrepancy(item)) return 'Price'
  return 'OK'
}

function formatLineTotalDiff(item: ReceiptFormItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  const sign = diff >= 0 ? '+' : ''
  return `${sign}${formatCurrency(diff)}`
}

function getLineTotalDiffClass(item: ReceiptFormItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 0.01) return 'text-success'
  return diff > 0 ? 'text-error' : 'text-success'
}

// =============================================
// UTILITY METHODS
// =============================================

function getItemUnit(itemId: string | any): string {
  // Проверяем что itemId это строка
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
    console.error('BaseReceiptDialog: Error formatting date', error)
    return 'Invalid date'
  }
}

// =============================================
// WATCHERS
// =============================================

// ✅ ИСПРАВЛЕНО: Правильная инициализация при открытии диалога
watch(
  () => [props.modelValue, props.order],
  async ([isOpen, order]) => {
    console.log('BaseReceiptDialog: Dialog state changed', { isOpen, orderId: order?.id })

    if (isOpen && order && !isLoading.value) {
      // Небольшая задержка чтобы DOM обновился
      await nextTick()
      await initializeReceipt()
    }
  },
  { immediate: true }
)

// Следим за изменениями в receipt prop
watch(
  () => props.receipt,
  newReceipt => {
    console.log('BaseReceiptDialog: Receipt prop changed', { receiptId: newReceipt?.id })

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
  console.log('BaseReceiptDialog: Component mounted', {
    isOpen: props.modelValue,
    orderId: props.order?.id,
    receiptId: props.receipt?.id
  })

  // Если диалог уже открыт при монтировании, инициализируем
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

.border {
  border: 1px solid rgb(var(--v-theme-surface-variant));
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Receipt items table styling
.receipt-items-table {
  .v-data-table__th,
  .v-data-table__td {
    border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
    padding: 8px 12px;
  }

  .v-data-table__th {
    background-color: rgb(var(--v-theme-surface-variant), 0.3);
    font-weight: 600;
  }
}

// Discrepancy highlighting
.qty-discrepancy {
  :deep(.v-field) {
    border-left: 3px solid rgb(var(--v-theme-warning));
  }
}

.price-discrepancy {
  :deep(.v-field) {
    border-left: 3px solid rgb(var(--v-theme-error));
  }
}

// Financial impact colors
.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-info {
  color: rgb(var(--v-theme-info)) !important;
}

// Summary cards
.bg-warning-lighten-5 {
  background-color: rgb(var(--v-theme-warning), 0.1) !important;
}

// Animations
.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.v-text-field.qty-discrepancy,
.v-text-field.price-discrepancy {
  animation: highlightDiscrepancy 0.5s ease-out;
}

@keyframes highlightDiscrepancy {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

// Loading states
.v-skeleton-loader {
  border-radius: 8px;
}

// Responsive adjustments
@media (max-width: 1200px) {
  .receipt-items-table {
    .v-data-table__th,
    .v-data-table__td {
      padding: 6px 8px;
      font-size: 0.875rem;
    }
  }
}

@media (max-width: 768px) {
  .receipt-items-table {
    .v-data-table__th,
    .v-data-table__td {
      padding: 4px 6px;
      font-size: 0.8rem;
    }
  }

  .gap-4 {
    gap: 8px;
  }

  .v-row {
    margin: 0;
  }
}
</style>
