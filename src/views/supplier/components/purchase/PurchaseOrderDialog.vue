<!-- src/views/supplier/components/purchase/PurchaseOrderDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1200px"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>{{ existingOrder ? 'Edit' : 'Create' }} Purchase Order</h3>
          <div class="text-caption text-medium-emphasis">
            {{
              existingOrder
                ? `Editing ${existingOrder.orderNumber}`
                : requestIds.length > 0
                  ? `Creating order from ${requestIds.length} request(s)`
                  : 'Create a new purchase order'
            }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 800px">
        <v-form ref="form" v-model="isFormValid">
          <!-- Basic Information Section -->
          <div class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-information" color="primary" class="mr-2" />
              <h4>Order Information</h4>
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="formData.supplierId"
                  :items="availableSuppliers"
                  item-title="name"
                  item-value="id"
                  label="Supplier"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  required
                  :disabled="!!existingOrder"
                  @update:model-value="handleSupplierChange"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <div class="supplier-preview-icon mr-3">
                          {{ getSupplierIcon(item.raw.type) }}
                        </div>
                      </template>
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ getSupplierTypeName(item.raw.type) }} •
                        {{ getPaymentTermsName(item.raw.paymentTerms) }}
                        <span v-if="item.raw.reliability" class="ml-2">
                          • {{ getReliabilityName(item.raw.reliability) }}
                        </span>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="3">
                <v-text-field
                  v-model="formData.expectedDeliveryDate"
                  type="date"
                  label="Expected Delivery"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  :min="minDeliveryDate"
                />
              </v-col>

              <v-col cols="12" md="3">
                <v-select
                  v-model="formData.deliveryMethod"
                  :items="deliveryMethodOptions"
                  label="Delivery Method"
                  prepend-inner-icon="mdi-truck"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.paymentTerms"
                  :items="paymentTermsOptions"
                  label="Payment Terms"
                  prepend-inner-icon="mdi-credit-card"
                  variant="outlined"
                  :hint="
                    selectedSupplier
                      ? `Supplier default: ${getPaymentTermsName(selectedSupplier.paymentTerms)}`
                      : ''
                  "
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-textarea
                  v-model="formData.notes"
                  label="Order Notes (optional)"
                  prepend-inner-icon="mdi-note-text"
                  variant="outlined"
                  rows="2"
                  placeholder="Special instructions, delivery notes, quality requirements..."
                />
              </v-col>
            </v-row>
          </div>

          <!-- Supplier Info Card -->
          <div v-if="selectedSupplier" class="mb-6">
            <v-card variant="tonal" color="info">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-3">
                  <div class="supplier-preview-icon mr-3">
                    {{ getSupplierIcon(selectedSupplier.type) }}
                  </div>
                  <div>
                    <div class="font-weight-medium text-h6">{{ selectedSupplier.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ getSupplierTypeName(selectedSupplier.type) }}
                    </div>
                  </div>
                  <v-spacer />
                  <v-chip
                    :color="getReliabilityColor(selectedSupplier.reliability)"
                    size="small"
                    variant="flat"
                  >
                    {{ getReliabilityName(selectedSupplier.reliability) }}
                  </v-chip>
                </div>

                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Contact</div>
                    <div class="font-weight-medium">
                      {{ selectedSupplier.contactPerson || 'Not specified' }}
                    </div>
                    <div class="text-caption">
                      {{ selectedSupplier.phone || selectedSupplier.email || '' }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Payment Terms</div>
                    <div class="font-weight-medium">
                      {{ getPaymentTermsName(selectedSupplier.paymentTerms) }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Current Balance</div>
                    <div
                      class="font-weight-medium"
                      :class="getBalanceColor(selectedSupplier.currentBalance)"
                    >
                      {{ formatCurrency(Math.abs(selectedSupplier.currentBalance)) }}
                    </div>
                    <div class="text-caption">
                      {{ getBalanceDescription(selectedSupplier.currentBalance) }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Total Orders</div>
                    <div class="font-weight-medium">{{ selectedSupplier.totalOrders || 0 }}</div>
                    <div class="text-caption">
                      {{ formatCurrency(selectedSupplier.totalOrderValue || 0) }}
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>

          <!-- Items Section -->
          <div class="mb-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center">
                <v-icon icon="mdi-package-variant" color="primary" class="mr-2" />
                <h4>Order Items</h4>
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
                  v-if="requestIds.length > 0"
                  color="info"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-clipboard-list"
                  @click="loadItemsFromRequests"
                >
                  Load from Requests
                </v-btn>
                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="showAddItemDialog = true"
                >
                  Add Item
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
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center">
                      <div class="item-icon mr-3">
                        {{ getItemIcon(item.itemName) }}
                      </div>
                      <div>
                        <div class="font-weight-medium text-h6">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          Ordering {{ item.orderedQuantity }} {{ item.unit }}
                        </div>
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeItem(index)"
                    >
                      <v-icon />
                      <v-tooltip activator="parent">Remove Item</v-tooltip>
                    </v-btn>
                  </div>

                  <v-row>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="item.orderedQuantity"
                        type="number"
                        label="Quantity"
                        :rules="quantityRules"
                        variant="outlined"
                        density="compact"
                        min="0"
                        step="0.1"
                        :suffix="item.unit"
                        @input="updateItemTotal(item)"
                      />
                    </v-col>

                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="item.pricePerUnit"
                        type="number"
                        label="Price per Unit"
                        :rules="priceRules"
                        variant="outlined"
                        density="compact"
                        min="0"
                        step="1000"
                        prefix="Rp"
                        @input="updateItemTotal(item)"
                      />
                    </v-col>

                    <v-col cols="12" md="3">
                      <v-text-field
                        :model-value="formatCurrency(item.totalPrice)"
                        label="Total Price"
                        variant="outlined"
                        density="compact"
                        readonly
                        :color="item.totalPrice > 0 ? 'success' : 'default'"
                      />
                    </v-col>

                    <v-col cols="12" md="3">
                      <div class="d-flex align-center h-100">
                        <v-btn
                          size="small"
                          variant="text"
                          color="info"
                          prepend-icon="mdi-note-plus"
                          @click="showNotesForItem = showNotesForItem === index ? null : index"
                        >
                          {{ item.notes ? 'Edit Notes' : 'Add Notes' }}
                        </v-btn>
                      </div>
                    </v-col>
                  </v-row>

                  <v-row v-if="showNotesForItem === index">
                    <v-col cols="12">
                      <v-text-field
                        v-model="item.notes"
                        label="Item Notes (optional)"
                        variant="outlined"
                        density="compact"
                        placeholder="Quality specifications, special instructions..."
                        append-inner-icon="mdi-close"
                        @click:append-inner="showNotesForItem = null"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center pa-8">
              <v-icon icon="mdi-package-variant-plus" size="64" class="text-medium-emphasis mb-4" />
              <div class="text-h6 text-medium-emphasis mb-2">No Items Added</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Add items to create a purchase order
              </div>
              <div class="d-flex justify-center gap-2">
                <v-btn
                  v-if="requestIds.length > 0"
                  color="info"
                  variant="outlined"
                  @click="loadItemsFromRequests"
                >
                  <v-icon icon="mdi-clipboard-list" class="mr-2" />
                  Load from Requests
                </v-btn>
                <v-btn color="success" variant="flat" @click="showAddItemDialog = true">
                  <v-icon icon="mdi-plus-circle" class="mr-2" />
                  Add First Item
                </v-btn>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div v-if="formData.items.length > 0" class="mb-4">
            <v-card variant="tonal" color="success">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon icon="mdi-calculator" class="mr-2" />
                  <h4>Order Summary</h4>
                </div>

                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Subtotal</div>
                    <div class="text-h6 font-weight-bold">{{ formatCurrency(subtotal) }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Tax ({{ taxRate }}%)</div>
                    <div class="text-h6 font-weight-bold">{{ formatCurrency(taxAmount) }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Discount</div>
                    <div class="text-h6 font-weight-bold text-success">
                      -{{ formatCurrency(discountAmount) }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Total Amount</div>
                    <div class="text-h4 font-weight-bold text-primary">
                      {{ formatCurrency(totalAmount) }}
                    </div>
                  </v-col>
                </v-row>

                <!-- Tax and Discount Controls -->
                <v-row class="mt-2">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="formData.taxAmount"
                      type="number"
                      label="Tax Amount (optional)"
                      variant="outlined"
                      density="compact"
                      prefix="Rp"
                      min="0"
                      :placeholder="`Auto: ${formatCurrency(taxAmount)}`"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="formData.discountAmount"
                      type="number"
                      label="Discount Amount (optional)"
                      variant="outlined"
                      density="compact"
                      prefix="Rp"
                      min="0"
                    />
                  </v-col>
                </v-row>

                <!-- Supplier Financial Impact -->
                <div v-if="selectedSupplier" class="mt-4">
                  <v-divider class="mb-3" />
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="text-caption text-medium-emphasis">After this order</div>
                      <div class="font-weight-medium">
                        New balance:
                        <span
                          :class="getBalanceColor(selectedSupplier.currentBalance - totalAmount)"
                        >
                          {{
                            formatCurrency(Math.abs(selectedSupplier.currentBalance - totalAmount))
                          }}
                        </span>
                        ({{ getBalanceDescription(selectedSupplier.currentBalance - totalAmount) }})
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-medium-emphasis">Payment Method</div>
                      <v-chip
                        :color="getPaymentTermsColor(formData.paymentTerms)"
                        size="small"
                        variant="tonal"
                      >
                        {{ getPaymentTermsName(formData.paymentTerms) }}
                      </v-chip>
                    </div>
                  </div>
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
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid || formData.items.length === 0"
          @click="handleSave"
        >
          {{ existingOrder ? 'Update' : 'Create' }} Order
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>Add Item to Order</h3>
            <div class="text-caption text-medium-emphasis">
              Select a product and specify quantity and price
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showAddItemDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="addItemForm" v-model="isAddItemFormValid">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="newItem.itemId"
                  :items="availableItems"
                  item-title="name"
                  item-value="id"
                  label="Select Product"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-package-variant"
                  variant="outlined"
                  clearable
                  @update:model-value="handleItemSelect"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <div class="item-preview-icon mr-3">
                          {{ getItemIcon(item.raw.name) }}
                        </div>
                      </template>
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        Unit: {{ item.raw.unit }}
                        <span v-if="item.raw.lastPrice" class="ml-2">
                          • Last price: {{ formatCurrency(item.raw.lastPrice) }}
                        </span>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="newItem.orderedQuantity"
                  type="number"
                  label="Quantity"
                  :rules="quantityRules"
                  variant="outlined"
                  min="0"
                  step="0.1"
                  :suffix="selectedItemUnit"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="newItem.pricePerUnit"
                  type="number"
                  label="Price per Unit"
                  :rules="priceRules"
                  variant="outlined"
                  min="0"
                  step="1000"
                  prefix="Rp"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="formatCurrency(newItem.orderedQuantity * newItem.pricePerUnit)"
                  label="Total Price"
                  variant="outlined"
                  readonly
                  color="success"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="newItem.notes"
                  label="Item Notes (optional)"
                  variant="outlined"
                  placeholder="Quality specifications, delivery instructions..."
                />
              </v-col>
            </v-row>

            <!-- Selected Item Preview -->
            <div v-if="selectedItemData" class="mt-4">
              <v-card variant="tonal" color="info">
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <div class="item-preview-icon mr-3">
                      {{ getItemIcon(selectedItemData.name) }}
                    </div>
                    <div>
                      <div class="font-weight-medium">{{ selectedItemData.name }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Unit: {{ selectedItemData.unit }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex justify-space-between">
                    <div>
                      <div class="text-caption text-medium-emphasis">Order Details</div>
                      <div class="font-weight-medium">
                        {{ newItem.orderedQuantity || 0 }} {{ selectedItemData.unit }} ×
                        {{ formatCurrency(newItem.pricePerUnit || 0) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-medium-emphasis">Total Cost</div>
                      <div class="text-h6 font-weight-bold text-primary">
                        {{
                          formatCurrency(
                            (newItem.orderedQuantity || 0) * (newItem.pricePerUnit || 0)
                          )
                        }}
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!isAddItemFormValid" @click="addItem">
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  getSupplierIcon,
  getSupplierTypeName,
  getPaymentTermsName,
  getReliabilityName,
  getReliabilityColor,
  formatCurrency,
  DELIVERY_METHODS,
  PAYMENT_TERMS
} from '@/stores/supplier'
import type {
  PurchaseOrder,
  CreatePurchaseOrderData,
  PurchaseOrderItem,
  Supplier
} from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PurchaseOrderDialog'

// Props
interface Props {
  modelValue: boolean
  existingOrder?: PurchaseOrder | null
  requestIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  existingOrder: null,
  requestIds: () => []
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
const addItemForm = ref()
const isFormValid = ref(false)
const isAddItemFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)
const showNotesForItem = ref<number | null>(null)

const formData = ref<CreatePurchaseOrderData>({
  supplierId: '',
  requestIds: [],
  items: [],
  expectedDeliveryDate: '',
  paymentTerms: 'on_delivery',
  deliveryMethod: 'delivery',
  notes: ''
})

const newItem = ref({
  itemId: '',
  orderedQuantity: 1,
  pricePerUnit: 0,
  notes: ''
})

// Constants
const taxRate = 11 // 11% PPN in Indonesia
const minDeliveryDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

// Mock available items (in real app, this would come from ProductStore)
const availableItems = ref([
  { id: 'prod-beef-steak', name: 'Beef Steak', unit: 'kg', lastPrice: 185000 },
  { id: 'prod-potato', name: 'Potato', unit: 'kg', lastPrice: 8000 },
  { id: 'prod-tomato', name: 'Tomato', unit: 'kg', lastPrice: 12000 },
  { id: 'prod-garlic', name: 'Garlic', unit: 'kg', lastPrice: 25000 },
  { id: 'prod-onion', name: 'Onion', unit: 'kg', lastPrice: 15000 },
  { id: 'prod-salt', name: 'Salt', unit: 'kg', lastPrice: 5000 },
  { id: 'prod-black-pepper', name: 'Black Pepper', unit: 'kg', lastPrice: 120000 },
  { id: 'prod-beer-bintang-330', name: 'Bintang Beer 330ml', unit: 'piece', lastPrice: 12000 },
  { id: 'prod-cola-330', name: 'Coca-Cola 330ml', unit: 'piece', lastPrice: 8000 },
  { id: 'prod-water-500', name: 'Water 500ml', unit: 'piece', lastPrice: 3000 }
])

// Options
const deliveryMethodOptions = Object.entries(DELIVERY_METHODS).map(([value, title]) => ({
  title,
  value
}))

const paymentTermsOptions = Object.entries(PAYMENT_TERMS).map(([value, title]) => ({
  title,
  value
}))

// Validation Rules
const requiredRules = [(v: any) => !!v || 'This field is required']
const quantityRules = [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0'
]
const priceRules = [
  (v: number) => (v !== undefined && v !== null) || 'Price is required',
  (v: number) => v >= 0 || 'Price cannot be negative'
]

// Computed
const availableSuppliers = computed(() => supplierStore.activeSuppliers)

const selectedSupplier = computed(() => {
  if (!formData.value.supplierId) return null
  return supplierStore.getSupplierById(formData.value.supplierId)
})

const selectedItemData = computed(() => {
  if (!newItem.value.itemId) return null
  return availableItems.value.find(item => item.id === newItem.value.itemId)
})

const selectedItemUnit = computed(() => selectedItemData.value?.unit || '')

const subtotal = computed(() =>
  formData.value.items.reduce((sum, item) => sum + item.totalPrice, 0)
)

const taxAmount = computed(() =>
  formData.value.taxAmount !== undefined
    ? formData.value.taxAmount
    : Math.round((subtotal.value * taxRate) / 100)
)

const discountAmount = computed(() => formData.value.discountAmount || 0)

const totalAmount = computed(() => subtotal.value + taxAmount.value - discountAmount.value)

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

function getBalanceColor(balance: number): string {
  if (balance < 0) return 'text-error' // we owe them
  if (balance > 0) return 'text-success' // they owe us
  return 'text-medium-emphasis'
}

function getBalanceDescription(balance: number): string {
  if (balance < 0) return 'We owe'
  if (balance > 0) return 'They owe'
  return 'Balanced'
}

function getPaymentTermsColor(terms: string): string {
  const colors = {
    prepaid: 'success',
    on_delivery: 'warning',
    monthly: 'info',
    custom: 'default'
  }
  return colors[terms as keyof typeof colors] || 'default'
}

function updateItemTotal(item: PurchaseOrderItem) {
  item.totalPrice = (item.orderedQuantity || 0) * (item.pricePerUnit || 0)
}

// Supplier Management
function handleSupplierChange() {
  if (selectedSupplier.value) {
    // Auto-fill payment terms with supplier's default
    formData.value.paymentTerms = selectedSupplier.value.paymentTerms

    DebugUtils.info(MODULE_NAME, 'Supplier selected', {
      supplierId: selectedSupplier.value.id,
      name: selectedSupplier.value.name,
      paymentTerms: selectedSupplier.value.paymentTerms
    })
  }
}

// Item Management
function handleItemSelect() {
  const item = availableItems.value.find(i => i.id === newItem.value.itemId)
  if (item) {
    // Auto-suggest price based on last price
    newItem.value.pricePerUnit = item.lastPrice || 0

    DebugUtils.info(MODULE_NAME, 'Item selected for order', {
      itemId: item.id,
      name: item.name,
      suggestedPrice: item.lastPrice
    })
  }
}

function addItem() {
  if (!isAddItemFormValid.value || !selectedItemData.value) return

  // Check if item already exists
  const existingIndex = formData.value.items.findIndex(i => i.itemId === newItem.value.itemId)
  if (existingIndex !== -1) {
    // Update existing item
    const existingItem = formData.value.items[existingIndex]
    existingItem.orderedQuantity = newItem.value.orderedQuantity
    existingItem.pricePerUnit = newItem.value.pricePerUnit
    existingItem.totalPrice = newItem.value.orderedQuantity * newItem.value.pricePerUnit
    existingItem.notes = newItem.value.notes
  } else {
    // Add new item
    formData.value.items.push({
      id: `item-${Date.now()}`,
      itemId: newItem.value.itemId,
      itemName: selectedItemData.value.name,
      orderedQuantity: newItem.value.orderedQuantity,
      unit: selectedItemData.value.unit,
      pricePerUnit: newItem.value.pricePerUnit,
      totalPrice: newItem.value.orderedQuantity * newItem.value.pricePerUnit,
      notes: newItem.value.notes
    })
  }

  // Reset form
  newItem.value = {
    itemId: '',
    orderedQuantity: 1,
    pricePerUnit: 0,
    notes: ''
  }
  showAddItemDialog.value = false

  DebugUtils.info(MODULE_NAME, 'Item added to order', {
    itemId: selectedItemData.value.id,
    itemName: selectedItemData.value.name,
    quantity: newItem.value.orderedQuantity,
    price: newItem.value.pricePerUnit
  })
}

function removeItem(index: number) {
  const item = formData.value.items[index]
  formData.value.items.splice(index, 1)

  DebugUtils.info(MODULE_NAME, 'Item removed from order', {
    itemId: item.itemId,
    itemName: item.itemName
  })
}

async function loadItemsFromRequests() {
  if (props.requestIds.length === 0) return

  try {
    DebugUtils.info(MODULE_NAME, 'Loading items from requests', {
      requestIds: props.requestIds
    })

    // In real implementation, this would fetch request data from the store
    // For now, we'll simulate loading some items
    const mockRequestItems = [
      {
        id: `item-${Date.now()}-1`,
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5,
        unit: 'kg',
        pricePerUnit: 185000,
        totalPrice: 925000,
        notes: 'From procurement request'
      },
      {
        id: `item-${Date.now()}-2`,
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2,
        unit: 'kg',
        pricePerUnit: 25000,
        totalPrice: 50000,
        notes: 'Urgent - low stock'
      }
    ]

    formData.value.items = [...formData.value.items, ...mockRequestItems]
    formData.value.requestIds = props.requestIds

    DebugUtils.info(MODULE_NAME, 'Items loaded from requests', {
      itemCount: mockRequestItems.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load items from requests', { error })
    emit('error', 'Failed to load items from procurement requests')
  }
}

// Form Management
function loadExistingOrder() {
  if (props.existingOrder) {
    DebugUtils.info(MODULE_NAME, 'Loading existing order', {
      orderId: props.existingOrder.id,
      orderNumber: props.existingOrder.orderNumber
    })

    formData.value = {
      supplierId: props.existingOrder.supplierId,
      requestIds: [...props.existingOrder.requestIds],
      items: [...props.existingOrder.items],
      expectedDeliveryDate: props.existingOrder.expectedDeliveryDate || '',
      paymentTerms: props.existingOrder.paymentTerms,
      deliveryMethod: props.existingOrder.deliveryMethod,
      notes: props.existingOrder.notes || '',
      taxAmount: props.existingOrder.taxAmount,
      discountAmount: props.existingOrder.discountAmount
    }
  }
}

function resetForm() {
  DebugUtils.info(MODULE_NAME, 'Resetting form')

  formData.value = {
    supplierId: '',
    requestIds: [...props.requestIds],
    items: [],
    expectedDeliveryDate: '',
    paymentTerms: 'on_delivery',
    deliveryMethod: 'delivery',
    notes: ''
  }

  newItem.value = {
    itemId: '',
    orderedQuantity: 1,
    pricePerUnit: 0,
    notes: ''
  }

  showNotesForItem.value = null

  if (form.value) {
    form.value.resetValidation()
  }
}

async function handleSave() {
  if (!isFormValid.value || formData.value.items.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'Form validation failed')
    return
  }

  try {
    loading.value = true

    // Update total amount in formData
    const orderData = {
      ...formData.value,
      items: formData.value.items.map(item => ({
        ...item,
        totalPrice: item.orderedQuantity * item.pricePerUnit
      }))
    }

    DebugUtils.info(MODULE_NAME, 'Saving purchase order', {
      isEdit: !!props.existingOrder,
      supplierId: orderData.supplierId,
      itemCount: orderData.items.length,
      totalAmount: totalAmount.value
    })

    if (props.existingOrder) {
      // TODO: Implement update order logic
      // await supplierStore.updatePurchaseOrder(props.existingOrder.id, orderData)
      emit('success', `Order "${props.existingOrder.orderNumber}" updated successfully`)

      DebugUtils.info(MODULE_NAME, 'Order updated successfully', {
        orderId: props.existingOrder.id
      })
    } else {
      const order = await supplierStore.createPurchaseOrder(orderData)
      emit('success', `Order "${order.orderNumber}" created successfully`)

      DebugUtils.info(MODULE_NAME, 'Order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber
      })
    }

    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save purchase order'
    DebugUtils.error(MODULE_NAME, 'Failed to save order', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  DebugUtils.info(MODULE_NAME, 'Closing dialog')
  resetForm()
  showAddItemDialog.value = false
  emit('update:modelValue', false)
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Dialog opened', {
        isEdit: !!props.existingOrder,
        orderId: props.existingOrder?.id,
        requestIds: props.requestIds
      })

      if (props.existingOrder) {
        loadExistingOrder()
      } else {
        resetForm()
        if (props.requestIds.length > 0) {
          // Auto-load items from requests when creating new order
          setTimeout(() => loadItemsFromRequests(), 100)
        }
      }
    }
  }
)

// Watch for existing order changes
watch(
  () => props.existingOrder,
  newOrder => {
    if (newOrder && props.modelValue) {
      loadExistingOrder()
    }
  }
)
</script>

<style lang="scss" scoped>
.purchase-order-dialog {
  .gap-2 {
    gap: 8px;
  }

  .supplier-preview-icon,
  .item-icon,
  .item-preview-icon {
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
    max-height: 500px;
    overflow-y: auto;
  }
}

:deep(.v-field__input) {
  --v-field-padding-start: 16px;
}

:deep(.v-selection-control) {
  justify-content: flex-start;
}

:deep(.v-autocomplete) {
  .v-list-item {
    .v-list-item-title {
      font-weight: 500;
    }

    .v-list-item-subtitle {
      font-size: 0.75rem;
      opacity: 0.7;
    }
  }
}
</style>
