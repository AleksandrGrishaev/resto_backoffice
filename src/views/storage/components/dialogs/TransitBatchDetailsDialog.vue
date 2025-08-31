<!-- TransitBatchDetailsDialog.vue - Dialog for viewing transit batch details -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    scrollable
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-card v-if="batch">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-truck-delivery" color="orange" class="mr-3" />
          <div>
            <div class="text-h6">Transit Batch Details</div>
            <div class="text-caption text-medium-emphasis">{{ batch.batchNumber }}</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:model-value', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="py-4">
        <!-- Product Information -->
        <div class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Product Information</h3>
          <div class="d-flex align-center mb-2">
            <v-icon :icon="getCategoryIcon()" color="primary" size="20" class="mr-2" />
            <span class="font-weight-medium">{{ batch.itemName || 'Unknown Product' }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Department: {{ formatDepartment(batch.department) }}
          </div>
        </div>

        <!-- Quantity & Value -->
        <div class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Quantity & Value</h3>
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Quantity</div>
              <div class="text-h6 font-weight-bold text-orange">
                {{ formatQuantity(batch.currentQuantity, batch.unit) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Total Value</div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(batch.totalValue) }}
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Cost per Unit</div>
              <div class="text-body-1">
                {{ formatCurrency(batch.costPerUnit) }}/{{ batch.unit }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Initial Quantity</div>
              <div class="text-body-1">{{ formatQuantity(batch.initialQuantity, batch.unit) }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- Supplier Information -->
        <div class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Supplier Information</h3>
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-store" color="primary" size="20" class="mr-2" />
            <span class="font-weight-medium">{{ batch.supplierName || 'Unknown Supplier' }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis mb-1">
            Purchase Order: {{ batch.purchaseOrderId || 'N/A' }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Supplier ID: {{ batch.supplierId || 'N/A' }}
          </div>
        </div>

        <!-- Delivery Information -->
        <div class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Delivery Information</h3>
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Planned Delivery</div>
              <div
                class="text-body-1 font-weight-medium"
                :class="getDeliveryDateClass(batch.plannedDeliveryDate)"
              >
                {{ formatDate(batch.plannedDeliveryDate) }}
              </div>
              <div class="text-caption" :class="getDeliveryStatusClass(batch.plannedDeliveryDate)">
                {{ getDeliveryStatus(batch.plannedDeliveryDate) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Status</div>
              <v-chip
                :color="getStatusColor(batch.plannedDeliveryDate)"
                size="small"
                variant="flat"
              >
                <v-icon :icon="getStatusIcon(batch.plannedDeliveryDate)" size="14" class="mr-1" />
                {{ getStatusText(batch.plannedDeliveryDate) }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row v-if="batch.actualDeliveryDate">
            <v-col cols="12">
              <div class="text-body-2 text-medium-emphasis">Actual Delivery</div>
              <div class="text-body-1">{{ formatDate(batch.actualDeliveryDate) }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- Batch Information -->
        <div class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Batch Information</h3>
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Batch Number</div>
              <div class="text-body-1 font-weight-medium">{{ batch.batchNumber }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Source Type</div>
              <div class="text-body-1">{{ formatSourceType(batch.sourceType) }}</div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Created</div>
              <div class="text-body-1">{{ formatDateTime(batch.createdAt) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-medium-emphasis">Last Updated</div>
              <div class="text-body-1">{{ formatDateTime(batch.updatedAt) }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- Notes -->
        <div v-if="batch.notes" class="mb-4">
          <h3 class="text-subtitle-1 mb-2">Notes</h3>
          <v-card variant="tonal" class="pa-3">
            <div class="text-body-2">{{ batch.notes }}</div>
          </v-card>
        </div>

        <!-- Actions Alert -->
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <template #prepend>
            <v-icon icon="mdi-information" />
          </template>
          <div>
            <strong>This item is in transit</strong>
            <div class="text-caption">
              Use the Suppliers module to process the receipt when the delivery arrives.
            </div>
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-receipt"
          :to="`/suppliers?tab=receipts&orderId=${batch.purchaseOrderId}`"
        >
          Process Receipt
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-file-document"
          :to="`/suppliers?tab=orders&orderId=${batch.purchaseOrderId}`"
        >
          View Order
        </v-btn>
        <v-btn variant="text" @click="$emit('update:model-value', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import type { StorageBatch, StorageDepartment } from '@/stores/storage'

// Props
interface Props {
  modelValue: boolean
  batch: StorageBatch | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:model-value': [value: boolean]
}>()

// Store
const productsStore = useProductsStore()

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString()} ${unit}`
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not set'

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatSourceType(sourceType: string): string {
  const sourceTypeMap: Record<string, string> = {
    purchase: 'Purchase Order',
    correction: 'Stock Correction',
    opening_balance: 'Opening Balance',
    inventory_adjustment: 'Inventory Adjustment'
  }

  return sourceTypeMap[sourceType] || sourceType
}

function getDeliveryStatus(dateString?: string): string {
  if (!dateString) return 'No delivery date set'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else {
    return `${diffDays} days remaining`
  }
}

function getDeliveryDateClass(dateString?: string): string {
  if (!dateString) return 'text-medium-emphasis'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-error'
  if (diffDays === 0) return 'text-info'
  return ''
}

function getDeliveryStatusClass(dateString?: string): string {
  if (!dateString) return 'text-medium-emphasis'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-error'
  if (diffDays === 0) return 'text-info'
  return 'text-medium-emphasis'
}

function getStatusColor(dateString?: string): string {
  if (!dateString) return 'grey'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'error'
  if (diffDays === 0) return 'info'
  return 'orange'
}

function getStatusIcon(dateString?: string): string {
  if (!dateString) return 'mdi-help-circle'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'mdi-truck-alert'
  if (diffDays === 0) return 'mdi-calendar-today'
  return 'mdi-truck-delivery'
}

function getStatusText(dateString?: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due Today'
  return 'In Transit'
}

function getCategoryIcon(): string {
  if (!props.batch?.itemName) return 'mdi-package-variant'

  try {
    const product = productsStore.products?.find(p => p.id === props.batch?.itemId)
    const category = product?.category || 'other'

    const iconMap: Record<string, string> = {
      meat: 'mdi-food-steak',
      vegetables: 'mdi-carrot',
      spices: 'mdi-seed',
      dairy: 'mdi-cow',
      grains: 'mdi-grain',
      beverages: 'mdi-cup',
      alcohol: 'mdi-bottle-wine',
      other: 'mdi-package-variant'
    }

    return iconMap[category.toLowerCase()] || 'mdi-package-variant'
  } catch (error) {
    return 'mdi-package-variant'
  }
}
</script>

<style lang="scss" scoped>
.v-card-title {
  padding: 16px 24px;
}

.v-card-text {
  max-height: 500px;
  overflow-y: auto;
}

.text-orange {
  color: rgb(var(--v-theme-warning));
}
</style>
