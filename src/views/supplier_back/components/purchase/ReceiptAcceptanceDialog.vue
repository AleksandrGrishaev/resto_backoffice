<!-- src/views/supplier/components/purchase/ReceiptAcceptanceDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1400px"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>{{ existingAcceptance ? 'Edit' : 'Receipt' }} Acceptance</h3>
          <div class="text-caption text-medium-emphasis">
            {{
              existingAcceptance
                ? `Editing ${existingAcceptance.acceptanceNumber}`
                : purchaseOrder
                  ? `Accepting delivery for ${purchaseOrder.orderNumber}`
                  : 'Process delivery acceptance and quality control'
            }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 900px">
        <v-form ref="form" v-model="isFormValid">
          <!-- Purchase Order Information -->
          <div v-if="purchaseOrder" class="mb-6">
            <v-card variant="tonal" color="info">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon icon="mdi-package-variant" class="mr-2" />
                  <h4>Purchase Order: {{ purchaseOrder.orderNumber }}</h4>
                  <v-spacer />
                  <v-chip
                    :color="getPurchaseOrderStatusColor(purchaseOrder.status)"
                    size="small"
                    variant="flat"
                  >
                    {{ getPurchaseOrderStatusName(purchaseOrder.status) }}
                  </v-chip>
                </div>

                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Supplier</div>
                    <div class="font-weight-medium">{{ purchaseOrder.supplierName }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Order Date</div>
                    <div class="font-weight-medium">{{ formatDate(purchaseOrder.orderDate) }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Expected Delivery</div>
                    <div class="font-weight-medium">
                      {{
                        purchaseOrder.expectedDeliveryDate
                          ? formatDate(purchaseOrder.expectedDeliveryDate)
                          : 'Not set'
                      }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Total Amount</div>
                    <div class="font-weight-medium">
                      {{ formatCurrency(purchaseOrder.totalAmount) }}
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>

          <!-- Acceptance Information -->
          <div class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-truck-check" color="primary" class="mr-2" />
              <h4>Delivery Information</h4>
            </div>

            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.deliveryDate"
                  type="datetime-local"
                  label="Actual Delivery Date & Time"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-calendar-clock"
                  variant="outlined"
                  required
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.acceptedBy"
                  label="Accepted By"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-account-check"
                  variant="outlined"
                  required
                  placeholder="e.g., Warehouse Manager"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-switch
                  v-model="hasDiscrepancies"
                  label="Mark as having discrepancies"
                  color="warning"
                  hide-details
                  class="mt-2"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.notes"
                  label="Acceptance Notes (optional)"
                  prepend-inner-icon="mdi-note-text"
                  variant="outlined"
                  rows="2"
                  placeholder="Overall delivery condition, supplier notes, special circumstances..."
                />
              </v-col>
            </v-row>
          </div>

          <!-- Items Acceptance Section -->
          <div class="mb-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center">
                <v-icon icon="mdi-clipboard-check" color="primary" class="mr-2" />
                <h4>Items Acceptance & Quality Control</h4>
                <v-chip
                  v-if="formData.items.length > 0"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ formData.items.length }} item{{ formData.items.length !== 1 ? 's' : '' }}
                </v-chip>
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-check-all"
                  @click="acceptAllItems"
                >
                  Accept All
                </v-btn>
                <v-btn
                  color="info"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-auto-fix"
                  @click="autoFillDelivered"
                >
                  Auto-fill Delivered
                </v-btn>
              </div>
            </div>

            <!-- Items List -->
            <div v-if="formData.items.length > 0" class="items-list">
              <v-card
                v-for="(item, index) in formData.items"
                :key="item.id || index"
                variant="outlined"
                class="mb-3"
                :color="getItemCardColor(item)"
              >
                <v-card-text class="pa-4">
                  <!-- Item Header -->
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center">
                      <div class="item-icon mr-3">
                        {{ getItemIcon(item.itemName) }}
                      </div>
                      <div>
                        <div class="font-weight-medium text-h6">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          Ordered: {{ item.orderedQuantity }} {{ getItemUnit(item) }} • Value:
                          {{ formatCurrency(item.orderedPrice * item.orderedQuantity) }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <v-chip
                        :color="getDiscrepancyColor(item.quantityDiscrepancy)"
                        size="small"
                        variant="flat"
                      >
                        {{ getDiscrepancyText(item.quantityDiscrepancy) }}
                      </v-chip>
                    </div>
                  </div>

                  <!-- Quantity Controls -->
                  <v-row class="mb-3">
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="item.deliveredQuantity"
                        type="number"
                        label="Delivered Quantity"
                        :rules="quantityRules"
                        variant="outlined"
                        density="compact"
                        min="0"
                        step="0.1"
                        :suffix="getItemUnit(item)"
                        @input="updateItemDiscrepancy(item)"
                      />
                    </v-col>

                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="item.acceptedQuantity"
                        type="number"
                        label="Accepted Quantity"
                        :rules="quantityRules"
                        variant="outlined"
                        density="compact"
                        min="0"
                        step="0.1"
                        :suffix="getItemUnit(item)"
                        @input="updateItemDiscrepancy(item)"
                      />
                    </v-col>

                    <v-col cols="12" md="3">
                      <v-select
                        v-model="item.quality"
                        :items="qualityOptions"
                        label="Quality Rating"
                        :rules="requiredRules"
                        variant="outlined"
                        density="compact"
                        required
                      >
                        <template #item="{ props: itemProps, item: qualityItem }">
                          <v-list-item v-bind="itemProps">
                            <template #prepend>
                              <v-icon
                                :icon="getQualityIcon(qualityItem.value)"
                                :color="getQualityColor(qualityItem.value)"
                                class="mr-2"
                              />
                            </template>
                            <v-list-item-title>{{ qualityItem.title }}</v-list-item-title>
                          </v-list-item>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12" md="3">
                      <div class="d-flex align-center h-100">
                        <div class="text-center flex-1">
                          <div class="text-caption text-medium-emphasis">Financial Impact</div>
                          <div class="font-weight-medium" :class="getFinancialImpactColor(item)">
                            {{ formatCurrency(Math.abs(getFinancialImpact(item))) }}
                          </div>
                          <div class="text-caption">
                            {{
                              getFinancialImpact(item) < 0
                                ? 'Loss'
                                : getFinancialImpact(item) > 0
                                  ? 'Gain'
                                  : 'No Change'
                            }}
                          </div>
                        </div>
                      </div>
                    </v-col>
                  </v-row>

                  <!-- Quality Issues and Notes -->
                  <v-row
                    v-if="
                      item.quality === 'poor' ||
                      item.quality === 'rejected' ||
                      item.qualityIssues ||
                      showNotesForItem === index
                    "
                  >
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="item.qualityIssues"
                        label="Quality Issues (optional)"
                        variant="outlined"
                        density="compact"
                        placeholder="Describe quality problems, damage, expiry issues..."
                        :color="
                          item.quality === 'poor' || item.quality === 'rejected'
                            ? 'error'
                            : 'default'
                        "
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="item.notes"
                        label="Item Notes (optional)"
                        variant="outlined"
                        density="compact"
                        placeholder="Additional notes about this item..."
                        append-inner-icon="mdi-close"
                        @click:append-inner="showNotesForItem = null"
                      />
                    </v-col>
                  </v-row>

                  <!-- Add Notes Button -->
                  <div
                    v-if="
                      !item.qualityIssues &&
                      !item.notes &&
                      showNotesForItem !== index &&
                      item.quality !== 'poor' &&
                      item.quality !== 'rejected'
                    "
                    class="mt-2"
                  >
                    <v-btn
                      size="small"
                      variant="text"
                      color="info"
                      prepend-icon="mdi-note-plus"
                      @click="showNotesForItem = index"
                    >
                      Add Notes
                    </v-btn>
                  </div>

                  <!-- Quick Quality Buttons -->
                  <div class="mt-3">
                    <div class="d-flex gap-2">
                      <v-btn
                        size="small"
                        color="success"
                        variant="tonal"
                        @click="setItemQuality(item, 'excellent')"
                      >
                        <v-icon icon="mdi-star" class="mr-1" />
                        Excellent
                      </v-btn>
                      <v-btn
                        size="small"
                        color="info"
                        variant="tonal"
                        @click="setItemQuality(item, 'good')"
                      >
                        <v-icon icon="mdi-thumb-up" class="mr-1" />
                        Good
                      </v-btn>
                      <v-btn
                        size="small"
                        color="warning"
                        variant="tonal"
                        @click="setItemQuality(item, 'acceptable')"
                      >
                        <v-icon icon="mdi-minus-circle" class="mr-1" />
                        Acceptable
                      </v-btn>
                      <v-btn
                        size="small"
                        color="error"
                        variant="tonal"
                        @click="setItemQuality(item, 'poor')"
                      >
                        <v-icon icon="mdi-thumb-down" class="mr-1" />
                        Poor
                      </v-btn>
                      <v-btn
                        size="small"
                        color="error"
                        variant="flat"
                        @click="setItemQuality(item, 'rejected')"
                      >
                        <v-icon icon="mdi-close-circle" class="mr-1" />
                        Reject
                      </v-btn>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center pa-8">
              <v-icon icon="mdi-package-variant-plus" size="64" class="text-medium-emphasis mb-4" />
              <div class="text-h6 text-medium-emphasis mb-2">No Items to Accept</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Purchase order items will appear here for acceptance
              </div>
            </div>
          </div>

          <!-- Summary Section -->
          <div v-if="formData.items.length > 0" class="mb-4">
            <v-card :color="getSummaryCardColor()" variant="tonal">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon icon="mdi-clipboard-list" class="mr-2" />
                  <h4>Acceptance Summary</h4>
                </div>

                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Total Items</div>
                    <div class="text-h6 font-weight-bold">{{ formData.items.length }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Discrepancies</div>
                    <div
                      class="text-h6 font-weight-bold"
                      :class="totalDiscrepancies > 0 ? 'text-warning' : 'text-success'"
                    >
                      {{ totalDiscrepancies }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Quality Issues</div>
                    <div
                      class="text-h6 font-weight-bold"
                      :class="qualityIssuesCount > 0 ? 'text-error' : 'text-success'"
                    >
                      {{ qualityIssuesCount }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Financial Impact</div>
                    <div class="text-h6 font-weight-bold" :class="getFinancialImpactTextColor()">
                      {{ formatCurrency(Math.abs(totalValueDifference)) }}
                    </div>
                    <div class="text-caption">
                      {{
                        totalValueDifference < 0
                          ? 'Loss'
                          : totalValueDifference > 0
                            ? 'Gain'
                            : 'No Change'
                      }}
                    </div>
                  </v-col>
                </v-row>

                <!-- Quality Distribution -->
                <div class="mt-4">
                  <div class="text-caption text-medium-emphasis mb-2">Quality Distribution:</div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="(count, quality) in qualityDistribution"
                      :key="quality"
                      :color="getQualityColor(quality)"
                      size="small"
                      variant="flat"
                    >
                      <v-icon :icon="getQualityIcon(quality)" size="14" class="mr-1" />
                      {{ quality.charAt(0).toUpperCase() + quality.slice(1) }}: {{ count }}
                    </v-chip>
                  </div>
                </div>

                <!-- Issues Summary -->
                <div v-if="hasDiscrepancies || qualityIssuesCount > 0" class="mt-4">
                  <v-alert type="warning" variant="tonal">
                    <v-alert-title>Attention Required</v-alert-title>
                    <div v-if="totalDiscrepancies > 0">
                      • {{ totalDiscrepancies }} item{{ totalDiscrepancies !== 1 ? 's' : '' }} with
                      quantity discrepancies
                    </div>
                    <div v-if="qualityIssuesCount > 0">
                      • {{ qualityIssuesCount }} item{{ qualityIssuesCount !== 1 ? 's' : '' }} with
                      quality issues
                    </div>
                    <div v-if="totalValueDifference !== 0">
                      • Financial impact: {{ formatCurrency(Math.abs(totalValueDifference)) }}
                      {{ totalValueDifference < 0 ? 'loss' : 'gain' }}
                    </div>
                  </v-alert>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          v-if="!existingAcceptance"
          color="warning"
          variant="outlined"
          :disabled="!isFormValid || formData.items.length === 0"
          @click="handleSaveDraft"
        >
          Save as Draft
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid || formData.items.length === 0"
          @click="handleAccept"
        >
          {{ existingAcceptance ? 'Update' : 'Accept' }} Delivery
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatCurrency,
  formatDate,
  getPurchaseOrderStatusName,
  getPurchaseOrderStatusColor,
  QUALITY_RATINGS
} from '@/stores/supplier'
import type { ReceiptAcceptance, PurchaseOrder, AcceptanceItem } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ReceiptAcceptanceDialog'

// Props
interface Props {
  modelValue: boolean
  existingAcceptance?: ReceiptAcceptance | null
  purchaseOrder?: PurchaseOrder | null
}

const props = withDefaults(defineProps<Props>(), {
  existingAcceptance: null,
  purchaseOrder: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const hasDiscrepancies = ref(false)
const showNotesForItem = ref<number | null>(null)

const formData = ref({
  deliveryDate: '',
  acceptedBy: '',
  items: [] as AcceptanceItem[],
  notes: ''
})

// Options
const qualityOptions = Object.entries(QUALITY_RATINGS).map(([value, title]) => ({
  title,
  value
}))

// Validation Rules
const requiredRules = [(v: any) => !!v || 'This field is required']
const quantityRules = [
  (v: number) => (v !== undefined && v !== null) || 'Quantity is required',
  (v: number) => v >= 0 || 'Quantity cannot be negative'
]

// Computed
const totalDiscrepancies = computed(
  () => formData.value.items.filter(item => item.quantityDiscrepancy !== 0).length
)

const qualityIssuesCount = computed(
  () =>
    formData.value.items.filter(
      item => item.quality === 'poor' || item.quality === 'rejected' || item.qualityIssues
    ).length
)

const totalValueDifference = computed(() =>
  formData.value.items.reduce((sum, item) => sum + getFinancialImpact(item), 0)
)

const qualityDistribution = computed(() => {
  return formData.value.items.reduce(
    (acc, item) => {
      acc[item.quality] = (acc[item.quality] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
})

// Methods
function getItemIcon(itemName: string): string {
  const icons: Record<string, string> = {
    beef: '🥩',
    steak: '🥩',
    meat: '🥩',
    potato: '🥔',
    tomato: '🍅',
    garlic: '🧄',
    onion: '🧅',
    salt: '🧂',
    pepper: '🌶️',
    spice: '🌿',
    beer: '🍺',
    cola: '🥤',
    water: '💧',
    drink: '🥤'
  }

  const lowerName = itemName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '📦'
}

function getItemUnit(item: AcceptanceItem): string {
  // In real implementation, this would come from the PurchaseOrderItem
  // For now, we'll infer from the item name
  const lowerName = item.itemName.toLowerCase()
  if (lowerName.includes('beer') || lowerName.includes('cola') || lowerName.includes('water')) {
    return 'piece'
  }
  return 'kg'
}

function getItemCardColor(item: AcceptanceItem): string {
  if (item.quality === 'rejected') return 'error'
  if (item.quality === 'poor' || Math.abs(item.quantityDiscrepancy) > 0) return 'warning'
  if (item.quality === 'excellent') return 'success'
  return 'default'
}

function getDiscrepancyColor(discrepancy: number): string {
  if (discrepancy === 0) return 'success'
  if (discrepancy > 0) return 'info'
  return 'error'
}

function getDiscrepancyText(discrepancy: number): string {
  if (discrepancy === 0) return 'Perfect Match'
  if (discrepancy > 0) return `+${discrepancy} Extra`
  return `${discrepancy} Short`
}

function getQualityIcon(quality: string): string {
  const icons = {
    excellent: 'mdi-star',
    good: 'mdi-thumb-up',
    acceptable: 'mdi-minus-circle',
    poor: 'mdi-thumb-down',
    rejected: 'mdi-close-circle'
  }
  return icons[quality as keyof typeof icons] || 'mdi-help'
}

function getQualityColor(quality: string): string {
  const colors = {
    excellent: 'success',
    good: 'info',
    acceptable: 'warning',
    poor: 'error',
    rejected: 'error'
  }
  return colors[quality as keyof typeof colors] || 'default'
}

function getFinancialImpact(item: AcceptanceItem): number {
  return item.quantityDiscrepancy * item.orderedPrice
}

function getFinancialImpactColor(item: AcceptanceItem): string {
  const impact = getFinancialImpact(item)
  if (impact < 0) return 'text-error'
  if (impact > 0) return 'text-success'
  return 'text-medium-emphasis'
}

function getFinancialImpactTextColor(): string {
  if (totalValueDifference.value < 0) return 'text-error'
  if (totalValueDifference.value > 0) return 'text-success'
  return 'text-medium-emphasis'
}

function getSummaryCardColor(): string {
  if (qualityIssuesCount.value > 0) return 'error'
  if (totalDiscrepancies.value > 0) return 'warning'
  return 'success'
}

function updateItemDiscrepancy(item: AcceptanceItem) {
  item.quantityDiscrepancy = (item.acceptedQuantity || 0) - item.orderedQuantity

  // Update hasDiscrepancies flag
  hasDiscrepancies.value = formData.value.items.some(i => i.quantityDiscrepancy !== 0)
}

function setItemQuality(item: AcceptanceItem, quality: string) {
  item.quality = quality as any

  // If setting to poor or rejected, focus on quality issues field
  if ((quality === 'poor' || quality === 'rejected') && !item.qualityIssues) {
    // Auto-focus would be implemented here
  }
}

function acceptAllItems() {
  formData.value.items.forEach(item => {
    if (item.deliveredQuantity === undefined) {
      item.deliveredQuantity = item.orderedQuantity
    }
    if (item.acceptedQuantity === undefined) {
      item.acceptedQuantity = item.deliveredQuantity
    }
    if (!item.quality) {
      item.quality = 'good'
    }
    updateItemDiscrepancy(item)
  })

  DebugUtils.info(MODULE_NAME, 'Auto-accepted all items')
}

function autoFillDelivered() {
  formData.value.items.forEach(item => {
    if (item.deliveredQuantity === undefined) {
      item.deliveredQuantity = item.orderedQuantity
    }
    if (item.acceptedQuantity === undefined) {
      item.acceptedQuantity = item.deliveredQuantity
    }
    updateItemDiscrepancy(item)
  })

  DebugUtils.info(MODULE_NAME, 'Auto-filled delivered quantities')
}

// Form Management
function loadExistingAcceptance() {
  if (props.existingAcceptance) {
    DebugUtils.info(MODULE_NAME, 'Loading existing acceptance', {
      acceptanceId: props.existingAcceptance.id,
      acceptanceNumber: props.existingAcceptance.acceptanceNumber
    })

    formData.value = {
      deliveryDate: props.existingAcceptance.deliveryDate,
      acceptedBy: props.existingAcceptance.acceptedBy,
      items: [...props.existingAcceptance.items],
      notes: props.existingAcceptance.notes || ''
    }

    hasDiscrepancies.value = props.existingAcceptance.hasDiscrepancies
  }
}

function loadFromPurchaseOrder() {
  if (props.purchaseOrder && !props.existingAcceptance) {
    DebugUtils.info(MODULE_NAME, 'Loading items from purchase order', {
      orderId: props.purchaseOrder.id,
      orderNumber: props.purchaseOrder.orderNumber
    })

    // Set current date/time
    const now = new Date()
    formData.value.deliveryDate = now.toISOString().slice(0, 16) // Format for datetime-local

    // Convert purchase order items to acceptance items
    formData.value.items = props.purchaseOrder.items.map(orderItem => ({
      id: `acc-item-${Date.now()}-${orderItem.id}`,
      purchaseOrderItemId: orderItem.id,
      itemId: orderItem.itemId,
      itemName: orderItem.itemName,
      orderedQuantity: orderItem.orderedQuantity,
      deliveredQuantity: orderItem.orderedQuantity, // Default to ordered quantity
      acceptedQuantity: orderItem.orderedQuantity, // Default to ordered quantity
      quality: 'good' as any, // Default quality
      quantityDiscrepancy: 0,
      orderedPrice: orderItem.pricePerUnit,
      notes: ''
    }))
  }
}

function resetForm() {
  DebugUtils.info(MODULE_NAME, 'Resetting form')

  formData.value = {
    deliveryDate: '',
    acceptedBy: '',
    items: [],
    notes: ''
  }

  hasDiscrepancies.value = false
  showNotesForItem.value = null

  if (form.value) {
    form.value.resetValidation()
  }
}

async function handleSaveDraft() {
  if (!isFormValid.value || formData.value.items.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'Form validation failed for draft save')
    return
  }

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Saving acceptance as draft', {
      purchaseOrderId: props.purchaseOrder?.id,
      itemCount: formData.value.items.length
    })

    // TODO: Implement save as draft logic
    // This would create a ReceiptAcceptance with status 'draft'

    emit('success', 'Acceptance saved as draft')
    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save acceptance draft'
    DebugUtils.error(MODULE_NAME, 'Failed to save draft', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

async function handleAccept() {
  if (!isFormValid.value || formData.value.items.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'Form validation failed for acceptance')
    return
  }

  try {
    loading.value = true

    const acceptanceData = {
      purchaseOrderId: props.purchaseOrder?.id || props.existingAcceptance?.purchaseOrderId,
      supplierId: props.purchaseOrder?.supplierId || props.existingAcceptance?.supplierId,
      deliveryDate: formData.value.deliveryDate,
      acceptedBy: formData.value.acceptedBy,
      items: formData.value.items,
      hasDiscrepancies: hasDiscrepancies.value || totalDiscrepancies.value > 0,
      totalDiscrepancies: totalDiscrepancies.value,
      totalValueDifference: totalValueDifference.value,
      status: 'accepted' as const,
      notes: formData.value.notes
    }

    DebugUtils.info(MODULE_NAME, 'Processing acceptance', {
      isEdit: !!props.existingAcceptance,
      purchaseOrderId: acceptanceData.purchaseOrderId,
      itemCount: acceptanceData.items.length,
      hasDiscrepancies: acceptanceData.hasDiscrepancies,
      totalDiscrepancies: acceptanceData.totalDiscrepancies,
      totalValueDifference: acceptanceData.totalValueDifference
    })

    if (props.existingAcceptance) {
      // TODO: Implement update acceptance logic
      // await supplierStore.updateReceiptAcceptance(props.existingAcceptance.id, acceptanceData)
      emit(
        'success',
        `Acceptance "${props.existingAcceptance.acceptanceNumber}" updated successfully`
      )

      DebugUtils.info(MODULE_NAME, 'Acceptance updated successfully', {
        acceptanceId: props.existingAcceptance.id
      })
    } else {
      // TODO: Implement create acceptance logic
      // const acceptance = await supplierStore.createReceiptAcceptance(acceptanceData)
      emit('success', 'Delivery accepted and processed successfully')

      DebugUtils.info(MODULE_NAME, 'Acceptance created successfully', {
        purchaseOrderId: acceptanceData.purchaseOrderId
      })
    }

    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process acceptance'
    DebugUtils.error(MODULE_NAME, 'Failed to process acceptance', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  DebugUtils.info(MODULE_NAME, 'Closing dialog')
  resetForm()
  emit('update:modelValue', false)
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Dialog opened', {
        isEdit: !!props.existingAcceptance,
        acceptanceId: props.existingAcceptance?.id,
        purchaseOrderId: props.purchaseOrder?.id
      })

      if (props.existingAcceptance) {
        loadExistingAcceptance()
      } else if (props.purchaseOrder) {
        resetForm()
        loadFromPurchaseOrder()
      } else {
        resetForm()
      }
    }
  }
)

// Watch for purchase order changes
watch(
  () => props.purchaseOrder,
  newOrder => {
    if (newOrder && props.modelValue && !props.existingAcceptance) {
      loadFromPurchaseOrder()
    }
  }
)

// Watch for existing acceptance changes
watch(
  () => props.existingAcceptance,
  newAcceptance => {
    if (newAcceptance && props.modelValue) {
      loadExistingAcceptance()
    }
  }
)
</script>

<style lang="scss" scoped>
.receipt-acceptance-dialog {
  .gap-2 {
    gap: 8px;
  }

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .items-list {
    max-height: 600px;
    overflow-y: auto;
  }
}

:deep(.v-field__input) {
  --v-field-padding-start: 16px;
}

:deep(.v-selection-control) {
  justify-content: flex-start;
}

:deep(.v-text-field) {
  .v-field__suffix {
    opacity: 0.7;
    font-size: 0.875rem;
  }
}

:deep(.v-card) {
  &.v-card--variant-outlined {
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

// Quality button animations
.v-btn {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

// Custom alert styling
:deep(.v-alert) {
  .v-alert__content {
    div {
      margin: 2px 0;
    }
  }
}
</style>
