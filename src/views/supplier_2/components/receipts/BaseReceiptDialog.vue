<!-- src/views/supplier_2/components/receipts/BaseReceiptDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1400px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-truck-check" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">
              {{
                isEditMode
                  ? `Edit Receipt ${currentReceipt?.receiptNumber}`
                  : 'Start Receipt Process'
              }}
            </div>
            <div class="text-caption opacity-90">
              {{ order?.orderNumber }} - {{ order?.supplierName }}
            </div>
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Receipt Header Info -->
        <div class="pa-4 border-b bg-surface">
          <v-row>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="receiptForm.receivedBy"
                label="Received By"
                variant="outlined"
                density="compact"
                :readonly="isEditMode && currentReceipt?.status === 'completed'"
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-text-field
                v-model="receiptForm.deliveryDate"
                label="Delivery Date"
                type="datetime-local"
                variant="outlined"
                density="compact"
                :readonly="isEditMode && currentReceipt?.status === 'completed'"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-textarea
                v-model="receiptForm.notes"
                label="Receipt Notes"
                variant="outlined"
                density="compact"
                rows="1"
                auto-grow
                :readonly="isEditMode && currentReceipt?.status === 'completed'"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Order Summary -->
        <div class="pa-4 border-b">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Order Summary</div>
            <div class="d-flex gap-2">
              <v-chip size="small" :color="getOrderStatusColor(order?.status)" variant="tonal">
                {{ order?.status }}
              </v-chip>
              <v-chip
                size="small"
                :color="getPaymentStatusColor(order?.paymentStatus)"
                variant="flat"
              >
                {{ order?.paymentStatus }}
              </v-chip>
            </div>
          </div>

          <v-row dense>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Order Date</div>
              <div class="text-body-2">{{ formatDate(order?.orderDate) }}</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Expected Delivery</div>
              <div class="text-body-2">
                {{
                  order?.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'Not set'
                }}
              </div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Original Total</div>
              <div class="text-body-2 font-weight-bold">
                {{ formatCurrency(order?.totalAmount || 0) }}
              </div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Actual Total</div>
              <div class="text-body-2 font-weight-bold" :class="getActualTotalClass()">
                {{ formatCurrency(calculatedActualTotal) }}
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Financial Impact Summary -->
        <div v-if="hasDiscrepancies" class="pa-4 border-b bg-warning-lighten-5">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2" />
              <div class="text-subtitle-2 font-weight-bold">Discrepancies Detected</div>
            </div>

            <div class="text-right">
              <div class="text-caption text-medium-emphasis">Financial Impact</div>
              <div class="text-h6 font-weight-bold" :class="getFinancialImpactClass()">
                {{ formatFinancialImpact() }}
              </div>
            </div>
          </div>

          <div class="mt-2">
            <v-chip
              v-if="hasQuantityDiscrepancies"
              size="small"
              color="info"
              variant="tonal"
              class="mr-2"
            >
              {{ quantityDiscrepancyCount }} quantity issues
            </v-chip>

            <v-chip v-if="hasPriceDiscrepancies" size="small" color="warning" variant="tonal">
              {{ priceDiscrepancyCount }} price changes
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
                variant="outlined"
                density="compact"
                hide-details
                min="0"
                step="0.1"
                :readonly="isCompleted"
                :class="{ 'qty-discrepancy': hasItemQuantityDiscrepancy(item) }"
                @update:model-value="updateItemCalculations(item)"
              />
            </template>

            <!-- Quantity Comparison -->
            <template #[`item.quantityComparison`]="{ item }">
              <div class="text-center">
                <div class="text-body-2">
                  <span :class="getQuantityComparisonClass(item)">
                    {{ getQuantityDifferenceText(item) }}
                  </span>
                </div>
                <div v-if="hasItemQuantityDiscrepancy(item)" class="text-caption">
                  <v-icon
                    :icon="getQuantityDifferenceIcon(item)"
                    :color="getQuantityComparisonColor(item)"
                    size="12"
                    class="mr-1"
                  />
                  {{ getQuantityDifferencePercent(item) }}
                </div>
              </div>
            </template>

            <!-- Actual Price Input -->
            <template #[`item.actualPrice`]="{ item }">
              <v-text-field
                v-model.number="item.actualPrice"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                min="0"
                step="1000"
                :readonly="isCompleted"
                :class="{ 'price-discrepancy': hasItemPriceDiscrepancy(item) }"
                @update:model-value="updateItemCalculations(item)"
              />
            </template>

            <!-- Price Comparison -->
            <template #[`item.priceComparison`]="{ item }">
              <div class="text-center">
                <div v-if="hasItemPriceDiscrepancy(item)" class="text-body-2">
                  <span :class="getPriceComparisonClass(item)">
                    {{ getPriceDifferenceText(item) }}
                  </span>
                </div>
                <div v-else class="text-body-2 text-success">Same price</div>
              </div>
            </template>

            <!-- Line Total -->
            <template #[`item.lineTotal`]="{ item }">
              <div class="text-right">
                <div class="text-body-2 font-weight-bold">
                  {{ formatCurrency(calculateLineTotal(item)) }}
                </div>
                <div
                  v-if="hasItemDiscrepancy(item)"
                  class="text-caption"
                  :class="getLineTotalImpactClass(item)"
                >
                  {{ formatLineTotalImpact(item) }}
                </div>
              </div>
            </template>

            <!-- Item Status -->
            <template #[`item.status`]="{ item }">
              <v-chip size="small" :color="getItemStatusColor(item)" variant="tonal">
                <v-icon :icon="getItemStatusIcon(item)" size="12" class="mr-1" />
                {{ getItemStatusText(item) }}
              </v-chip>
            </template>

            <!-- Item Notes -->
            <template #[`item.notes`]="{ item }">
              <v-text-field
                v-model="item.notes"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="Add notes..."
                :readonly="isCompleted"
              />
            </template>
          </v-data-table>

          <!-- Receipt Totals -->
          <div class="mt-4 pa-3 bg-surface rounded border">
            <v-row align="center">
              <v-col cols="12" md="8">
                <div class="d-flex gap-4">
                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Total Items</div>
                    <div class="text-h6 font-weight-bold">{{ receiptForm.items.length }}</div>
                  </div>

                  <v-divider vertical />

                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Items with Issues</div>
                    <div class="text-h6 font-weight-bold text-warning">
                      {{ discrepantItemsCount }}
                    </div>
                  </div>

                  <v-divider vertical />

                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Original Total</div>
                    <div class="text-h6">{{ formatCurrency(order?.totalAmount || 0) }}</div>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="4">
                <div class="text-right">
                  <div class="text-caption text-medium-emphasis">Actual Receipt Total</div>
                  <div class="text-h5 font-weight-bold" :class="getActualTotalClass()">
                    {{ formatCurrency(calculatedActualTotal) }}
                  </div>
                  <div
                    v-if="financialImpact !== 0"
                    class="text-body-2"
                    :class="getFinancialImpactClass()"
                  >
                    {{ formatFinancialImpact() }} vs ordered
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <div class="d-flex align-center">
          <v-icon
            :icon="hasDiscrepancies ? 'mdi-alert-triangle' : 'mdi-check-circle'"
            :color="hasDiscrepancies ? 'warning' : 'success'"
            class="mr-2"
          />
          <div class="text-body-2">
            {{
              hasDiscrepancies
                ? 'Discrepancies detected - review before completing'
                : 'No discrepancies found'
            }}
          </div>
        </div>

        <v-spacer />

        <v-btn color="grey" variant="outlined" @click="closeDialog">Cancel</v-btn>

        <v-btn
          v-if="!isEditMode"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-content-save"
          :disabled="!canSave"
          :loading="isSaving"
          @click="saveDraft"
        >
          Save Draft
        </v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-check-circle"
          :disabled="!canComplete"
          :loading="isCompleting"
          @click="completeReceipt"
        >
          {{ isEditMode ? 'Update & Complete' : 'Complete Receipt' }}
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
import { ref, computed, watch, onMounted } from 'vue'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import type {
  PurchaseOrder,
  Receipt,
  CreateReceiptData,
  ReceiptItem
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
// COMPOSABLES
// =============================================

const {
  startReceipt,
  completeReceipt: completeReceiptAction,
  updateReceiptItem,
  formatCurrency,
  getStatusColor,
  calculateDiscrepancies
} = useReceipts()

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

// ИСПРАВЛЕНИЕ: Правильная структура ReceiptItem
interface ReceiptFormItem extends ReceiptItem {
  unit?: string // Добавляем unit для совместимости
}

// Form state
const receiptForm = ref({
  receivedBy: 'Warehouse Manager',
  deliveryDate: new Date().toISOString().slice(0, 16),
  notes: '',
  items: [] as ReceiptFormItem[]
})

// Current receipt state
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
  { title: 'Received Qty', key: 'receivedQuantity', sortable: false, width: '130px' },
  { title: 'Qty Comparison', key: 'quantityComparison', sortable: false, width: '140px' },
  { title: 'Actual Price', key: 'actualPrice', sortable: false, width: '130px' },
  { title: 'Price Change', key: 'priceComparison', sortable: false, width: '120px' },
  { title: 'Line Total', key: 'lineTotal', sortable: false, width: '130px', align: 'end' },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Notes', key: 'notes', sortable: false, width: '200px' }
]

// =============================================
// METHODS
// =============================================

async function initializeReceipt() {
  if (!props.order) return

  try {
    isLoading.value = true

    if (isEditMode.value && props.receipt) {
      // Edit existing receipt
      currentReceipt.value = props.receipt
      receiptForm.value = {
        receivedBy: props.receipt.receivedBy,
        deliveryDate: props.receipt.deliveryDate.slice(0, 16),
        notes: props.receipt.notes || '',
        items: props.receipt.items.map(item => ({
          ...item,
          unit: getItemUnit(item.itemId) // Добавляем unit
        }))
      }
    } else {
      // Start new receipt - ИСПРАВЛЕНИЕ: создаем items из order
      receiptForm.value.items = props.order.items.map(orderItem => ({
        id: `receipt-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        orderItemId: orderItem.id,
        itemId: orderItem.itemId,
        itemName: orderItem.itemName,
        orderedQuantity: orderItem.orderedQuantity,
        receivedQuantity: orderItem.orderedQuantity, // Start with ordered quantity
        orderedPrice: orderItem.pricePerUnit,
        actualPrice: orderItem.pricePerUnit, // Start with ordered price
        notes: '',
        unit: orderItem.unit
      }))
    }
  } catch (error: any) {
    console.error('Error initializing receipt:', error)
    emits('error', error.message || 'Failed to initialize receipt')
  } finally {
    isLoading.value = false
  }
}

function autoFillFromOrder() {
  if (!props.order) return

  receiptForm.value.items = receiptForm.value.items.map(item => ({
    ...item,
    receivedQuantity: item.orderedQuantity,
    actualPrice: item.orderedPrice
  }))
}

function resetToOriginal() {
  if (!props.order) return

  receiptForm.value.items = receiptForm.value.items.map(item => ({
    ...item,
    receivedQuantity: item.orderedQuantity,
    actualPrice: item.orderedPrice,
    notes: ''
  }))
}

function updateItemCalculations(item: ReceiptFormItem) {
  // Ensure actualPrice is set
  if (item.actualPrice === undefined || item.actualPrice === null) {
    item.actualPrice = item.orderedPrice
  }

  // Validate received quantity
  if (item.receivedQuantity < 0) {
    item.receivedQuantity = 0
  }
}

async function saveDraft() {
  if (!canSave.value) return

  try {
    isSaving.value = true

    // ИСПРАВЛЕНИЕ: Сначала создаем receipt если не в edit mode
    if (!currentReceipt.value) {
      const receiptData: CreateReceiptData = {
        purchaseOrderId: props.order!.id,
        receivedBy: receiptForm.value.receivedBy,
        items: receiptForm.value.items.map(item => ({
          orderItemId: item.orderItemId,
          receivedQuantity: item.receivedQuantity,
          actualPrice: item.actualPrice !== item.orderedPrice ? item.actualPrice : undefined,
          notes: item.notes || undefined
        })),
        notes: receiptForm.value.notes || undefined
      }

      currentReceipt.value = await startReceipt(props.order!.id, receiptForm.value.receivedBy)
    }

    // Update receipt items individually
    for (const item of receiptForm.value.items) {
      await updateReceiptItem(
        currentReceipt.value.id,
        item.id,
        item.receivedQuantity,
        item.actualPrice,
        item.notes
      )
    }

    emits('success', 'Receipt draft saved successfully')
  } catch (error: any) {
    console.error('Error saving draft:', error)
    emits('error', error.message || 'Failed to save draft')
  } finally {
    isSaving.value = false
  }
}

function completeReceipt() {
  showConfirmDialog.value = true
}

async function confirmComplete() {
  if (!canComplete.value) return

  try {
    isCompleting.value = true

    // Сначала сохраняем draft если нужно
    if (!currentReceipt.value) {
      await saveDraft()
    }

    if (currentReceipt.value) {
      // Then complete the receipt
      await completeReceiptAction(currentReceipt.value.id)

      showConfirmDialog.value = false
      emits('success', `Receipt ${currentReceipt.value.receiptNumber} completed successfully`)
      closeDialog()
    }
  } catch (error: any) {
    console.error('Error completing receipt:', error)
    emits('error', error.message || 'Failed to complete receipt')
  } finally {
    isCompleting.value = false
  }
}

function closeDialog() {
  isOpen.value = false

  // Reset form after animation
  setTimeout(() => {
    receiptForm.value = {
      receivedBy: 'Warehouse Manager',
      deliveryDate: new Date().toISOString().slice(0, 16),
      notes: '',
      items: []
    }
    currentReceipt.value = null
  }, 300)
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function calculateLineTotal(item: ReceiptFormItem): number {
  const price = item.actualPrice !== undefined ? item.actualPrice : item.orderedPrice
  return item.receivedQuantity * price
}

function hasItemDiscrepancy(item: ReceiptFormItem): boolean {
  return hasItemQuantityDiscrepancy(item) || hasItemPriceDiscrepancy(item)
}

function hasItemQuantityDiscrepancy(item: ReceiptFormItem): boolean {
  return Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.01
}

function hasItemPriceDiscrepancy(item: ReceiptFormItem): boolean {
  return item.actualPrice !== undefined && Math.abs(item.actualPrice - item.orderedPrice) > 0.01
}

function getItemStatusText(item: ReceiptFormItem): string {
  if (!hasItemDiscrepancy(item)) return 'OK'

  const hasQty = hasItemQuantityDiscrepancy(item)
  const hasPrice = hasItemPriceDiscrepancy(item)

  if (hasQty && hasPrice) return 'Both Issues'
  if (hasQty) return 'Qty Issue'
  if (hasPrice) return 'Price Issue'
  return 'OK'
}

function getItemStatusColor(item: ReceiptFormItem): string {
  const status = getItemStatusText(item)
  if (status === 'OK') return 'success'
  if (status === 'Both Issues') return 'error'
  return 'warning'
}

function getItemStatusIcon(item: ReceiptFormItem): string {
  const status = getItemStatusText(item)
  if (status === 'OK') return 'mdi-check-circle'
  if (status === 'Both Issues') return 'mdi-alert-circle'
  return 'mdi-alert-triangle'
}

function getQuantityDifferenceText(item: ReceiptFormItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'Exact'
  return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`
}

function getQuantityDifferencePercent(item: ReceiptFormItem): string {
  if (item.orderedQuantity === 0) return '0%'
  const percent = ((item.receivedQuantity - item.orderedQuantity) / item.orderedQuantity) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function getQuantityDifferenceIcon(item: ReceiptFormItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (diff > 0) return 'mdi-arrow-up'
  if (diff < 0) return 'mdi-arrow-down'
  return 'mdi-equal'
}

function getQuantityComparisonClass(item: ReceiptFormItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'text-success'
  return diff > 0 ? 'text-info' : 'text-warning'
}

function getQuantityComparisonColor(item: ReceiptFormItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'success'
  return diff > 0 ? 'info' : 'warning'
}

function getPriceDifferenceText(item: ReceiptFormItem): string {
  if (!item.actualPrice) return 'No change'
  const diff = item.actualPrice - item.orderedPrice
  return diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
}

function getPriceComparisonClass(item: ReceiptFormItem): string {
  if (!item.actualPrice) return 'text-success'
  const diff = item.actualPrice - item.orderedPrice
  if (Math.abs(diff) < 0.01) return 'text-success'
  return diff > 0 ? 'text-error' : 'text-success'
}

function formatLineTotalImpact(item: ReceiptFormItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return '±0'
  return diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
}

function getLineTotalImpactClass(item: ReceiptFormItem): string {
  const originalTotal = item.orderedQuantity * item.orderedPrice
  const actualTotal = calculateLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return 'text-success'
  return diff > 0 ? 'text-error' : 'text-success'
}

function getActualTotalClass(): string {
  if (Math.abs(financialImpact.value) < 1000) return 'text-success'
  return financialImpact.value > 0 ? 'text-error' : 'text-success'
}

function getFinancialImpactClass(): string {
  if (Math.abs(financialImpact.value) < 1000) return 'text-success'
  return financialImpact.value > 0 ? 'text-error' : 'text-success'
}

function formatFinancialImpact(): string {
  if (Math.abs(financialImpact.value) < 1000) return '±0'
  return financialImpact.value > 0
    ? `+${formatCurrency(financialImpact.value)}`
    : formatCurrency(financialImpact.value)
}

function getOrderStatusColor(status?: string): string {
  const colorMap: Record<string, string> = {
    draft: 'grey',
    sent: 'blue',
    confirmed: 'orange',
    delivered: 'green',
    cancelled: 'red'
  }
  return colorMap[status || ''] || 'grey'
}

function getPaymentStatusColor(paymentStatus?: string): string {
  const colorMap: Record<string, string> = {
    pending: 'orange',
    paid: 'green'
  }
  return colorMap[paymentStatus || ''] || 'grey'
}

function getItemUnit(itemId: string): string {
  // In real app, would get from ProductsStore
  if (itemId.includes('beer') || itemId.includes('cola')) return 'piece'
  return 'kg'
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  newValue => {
    if (newValue && props.order) {
      initializeReceipt()
    }
  }
)

watch(
  () => props.order,
  newOrder => {
    if (newOrder && isOpen.value) {
      initializeReceipt()
    }
  }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  if (isOpen.value && props.order) {
    initializeReceipt()
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

// Confirmation dialog styling
.v-dialog .v-card {
  .v-alert {
    margin-bottom: 16px;
  }

  ul {
    padding-left: 20px;

    li {
      margin-bottom: 4px;
    }
  }
}

// Status indicators
.v-icon.text-warning {
  animation: pulseWarning 2s infinite;
}

@keyframes pulseWarning {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.7;
  }
}

// Input focus states
.v-text-field:focus-within {
  &.qty-discrepancy :deep(.v-field) {
    border-left-color: rgb(var(--v-theme-warning));
    box-shadow: 0 0 0 1px rgb(var(--v-theme-warning), 0.3);
  }

  &.price-discrepancy :deep(.v-field) {
    border-left-color: rgb(var(--v-theme-error));
    box-shadow: 0 0 0 1px rgb(var(--v-theme-error), 0.3);
  }
}
</style>
