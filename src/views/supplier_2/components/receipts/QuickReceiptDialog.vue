<!-- src/views/supplier_2/components/receipts/QuickReceiptDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" persistent scrollable>
    <v-card class="quick-receipt-dialog">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-flash" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">Quick Receipt Entry</div>
            <div class="text-caption opacity-90">
              Simplified receipt creation for historical data
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <!-- Main Content -->
      <v-card-text class="pa-4">
        <v-form ref="formRef" @submit.prevent="saveReceipt">
          <!-- Supplier Selection -->
          <v-row>
            <v-col cols="12" md="6">
              <v-autocomplete
                :key="`supplier-select-${form.supplierId || 'empty'}`"
                v-model="form.supplierId"
                :items="suppliers"
                item-title="display_name"
                item-value="id"
                label="Supplier *"
                prepend-inner-icon="mdi-store"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Supplier is required']"
                @update:model-value="handleSupplierChange"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon
                        :icon="item.raw.is_preferred ? 'mdi-star' : 'mdi-store'"
                        :color="item.raw.is_preferred ? 'warning' : 'default'"
                      />
                    </template>
                    <template #subtitle>
                      <span v-if="item.raw.payment_terms" class="text-caption">
                        {{ item.raw.payment_terms }}
                      </span>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.deliveryDate"
                label="Delivery Date *"
                type="datetime-local"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Date is required']"
              />
            </v-col>
          </v-row>

          <!-- Duplicate from Last Receipt -->
          <v-row v-if="form.supplierId && lastReceipt">
            <v-col cols="12">
              <v-alert type="info" variant="tonal" density="compact">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <strong>Last receipt from this supplier:</strong>
                    {{ lastReceipt.receipt_number }} - {{ formatDate(lastReceipt.delivery_date) }} -
                    {{ lastReceipt.items.length }} items
                  </div>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-content-copy"
                    @click="duplicateLastReceipt"
                  >
                    Duplicate Items
                  </v-btn>
                </div>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Items Table -->
          <v-row>
            <v-col cols="12">
              <div class="d-flex align-center justify-space-between mb-3">
                <h3 class="text-h6">Items</h3>
                <v-btn color="primary" variant="outlined" prepend-icon="mdi-plus" @click="addItem">
                  Add Item
                </v-btn>
              </div>

              <v-table density="compact" class="items-table">
                <thead>
                  <tr>
                    <th style="width: 25%">Product</th>
                    <th style="width: 20%">Package</th>
                    <th style="width: 10%">Qty</th>
                    <th style="width: 15%">Price/pkg (IDR)</th>
                    <th style="width: 10%">Total qty</th>
                    <th style="width: 12%">Total (IDR)</th>
                    <th style="width: 8%">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in form.items" :key="index">
                    <!-- Product Selection -->
                    <td>
                      <v-autocomplete
                        :key="`product-${index}-${item.productId || 'empty'}`"
                        v-model="item.productId"
                        :items="products"
                        item-title="name"
                        item-value="id"
                        placeholder="Select product"
                        variant="outlined"
                        density="compact"
                        hide-details
                        @update:model-value="handleProductChange(index)"
                      >
                        <template #item="{ props: itemProps, item: product }">
                          <v-list-item v-bind="itemProps">
                            <template #subtitle>
                              <span class="text-caption">
                                {{ product.raw.category }} - {{ product.raw.baseUnit }}
                              </span>
                            </template>
                          </v-list-item>
                        </template>
                      </v-autocomplete>
                    </td>

                    <!-- Package Selection -->
                    <td>
                      <v-select
                        v-model="item.packageId"
                        :items="getProductPackages(item.productId)"
                        placeholder="Select package"
                        variant="outlined"
                        density="compact"
                        hide-details
                        :disabled="!item.productId"
                        @update:model-value="handlePackageChange(index, $event)"
                      >
                        <template #append>
                          <v-btn
                            icon="mdi-plus"
                            size="x-small"
                            variant="text"
                            color="primary"
                            :disabled="!item.productId"
                            @click.stop="showAddPackageDialog(index)"
                          />
                        </template>
                      </v-select>
                    </td>

                    <!-- Package Quantity -->
                    <td>
                      <v-text-field
                        v-model.number="item.packageQuantity"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        min="0"
                        step="1"
                        :disabled="!item.packageId"
                        @update:model-value="handlePackageQuantityChange(index)"
                      />
                    </td>

                    <!-- Package Price -->
                    <td>
                      <v-text-field
                        v-model.number="item.unitPrice"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        min="0"
                        step="1"
                        :disabled="!item.packageId"
                        @update:model-value="calculateItemTotal(index)"
                      />
                    </td>

                    <!-- Total Quantity (readonly) -->
                    <td>
                      <v-text-field
                        :model-value="`${item.quantity} ${item.unit}`"
                        variant="outlined"
                        density="compact"
                        hide-details
                        readonly
                        class="text-caption"
                      />
                    </td>

                    <!-- Total Price -->
                    <td>
                      <v-text-field
                        :model-value="formatCurrency(item.total)"
                        variant="outlined"
                        density="compact"
                        hide-details
                        readonly
                        class="font-weight-bold"
                      />
                    </td>

                    <!-- Actions -->
                    <td>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeItem(index)"
                      />
                    </td>
                  </tr>

                  <!-- Empty State -->
                  <tr v-if="form.items.length === 0">
                    <td colspan="6" class="text-center pa-4 text-medium-emphasis">
                      No items added. Click "Add Item" or "Duplicate Items" to start.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-col>
          </v-row>

          <!-- Tax Fields -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-checkbox
                v-model="form.includeTax"
                label="Include Tax in Receipt"
                color="primary"
                density="comfortable"
                hide-details
              />
            </v-col>
          </v-row>

          <v-row v-if="form.includeTax">
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="form.taxAmount"
                label="Tax Amount (IDR)"
                type="number"
                prepend-inner-icon="mdi-receipt-text"
                variant="outlined"
                density="comfortable"
                hint="Total tax amount (included in item prices)"
                persistent-hint
                @update:model-value="onTaxAmountChange"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="form.taxPercentage"
                label="Tax Percentage"
                type="number"
                prepend-inner-icon="mdi-percent"
                variant="outlined"
                density="comfortable"
                suffix="%"
                hint="Tax % (for reference only)"
                persistent-hint
                @update:model-value="onTaxPercentageChange"
              />
            </v-col>
          </v-row>

          <!-- Summary -->
          <v-row class="mt-4">
            <v-col cols="12" md="6">
              <v-textarea
                v-model="form.notes"
                label="Notes"
                placeholder="Optional notes about this receipt..."
                variant="outlined"
                density="comfortable"
                rows="3"
                hide-details
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="tonal" color="primary">
                <v-card-text>
                  <div class="d-flex justify-space-between mb-2">
                    <span>Items Count:</span>
                    <strong>{{ form.items.length }}</strong>
                  </div>

                  <div class="d-flex justify-space-between mb-2">
                    <span>Subtotal:</span>
                    <strong>{{ formatCurrency(subtotal) }}</strong>
                  </div>

                  <div
                    v-if="form.includeTax && form.taxAmount"
                    class="d-flex justify-space-between mb-2"
                  >
                    <span>Tax:</span>
                    <strong>{{ formatCurrency(form.taxAmount) }}</strong>
                  </div>

                  <v-divider class="my-2" />

                  <div class="d-flex justify-space-between mb-3">
                    <span class="text-h6">Total Amount:</span>
                    <strong class="text-h6">{{ formatCurrency(totalAmount) }}</strong>
                  </div>

                  <v-divider class="my-3" />

                  <!-- Payment Status Note -->
                  <v-alert type="info" density="compact" variant="tonal">
                    <div class="text-caption">
                      <strong>Note:</strong>
                      Use Account Store to manage payments for this receipt after creation.
                    </div>
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 bg-surface border-t">
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canSave"
          :loading="isSaving"
          @click="saveReceipt"
        >
          <v-icon start icon="mdi-flash" />
          Create Receipt
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Package Creation Dialog -->
    <quick-add-package-dialog
      v-if="
        currentItemIndexForPackage !== null && form.items[currentItemIndexForPackage]?.productId
      "
      v-model="showPackageDialog"
      :product-id="form.items[currentItemIndexForPackage]?.productId"
      @package-created="handlePackageCreated"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier_2'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import { useProductsStore } from '@/stores/productsStore'
import { useCounteragentsStore } from '@/stores/counteragents'
import { TimeUtils } from '@/utils/time'
import { DebugUtils } from '@/utils'
import QuickAddPackageDialog from '../shared/package/QuickAddPackageDialog.vue'

const MODULE_NAME = 'QuickReceiptDialog'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const supplierStore = useSupplierStore()
const { startReceipt } = useReceipts()
const productsStore = useProductsStore()
const counteragentsStore = useCounteragentsStore()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const formRef = ref<any>(null)
const isSaving = ref(false)

// Package dialog state
const showPackageDialog = ref(false)
const currentItemIndexForPackage = ref<number | null>(null)

interface QuickReceiptItem {
  productId: string
  productName: string
  packageId: string
  packageName: string
  packageQuantity: number
  packageUnit: string
  packageSize: number
  quantity: number // базовое количество (в граммах/мл/штуках)
  unit: string // базовая единица (kg, ml, piece)
  unitPrice: number // цена за упаковку
  baseCost: number // цена за базовую единицу
  total: number
}

const form = ref({
  supplierId: '',
  deliveryDate: TimeUtils.formatForHTMLInput(),
  items: [] as QuickReceiptItem[],
  notes: '',
  includeTax: false,
  taxAmount: undefined as number | undefined,
  taxPercentage: undefined as number | undefined
})

const lastReceipt = ref<any>(null)

// =============================================
// COMPUTED
// =============================================

const suppliers = computed(() => {
  return counteragentsStore.counteragents
    .filter(ca => ca.type === 'supplier' && ca.isActive)
    .map(s => ({
      ...s,
      display_name: s.displayName || s.name
    }))
})

const selectedSupplier = computed(() => {
  if (!form.value.supplierId) return undefined
  return suppliers.value.find(s => s.id === form.value.supplierId)
})

const products = computed(() => {
  return productsStore.products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category || 'Uncategorized',
    baseUnit: p.baseUnit || 'kg'
  }))
})

const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + item.total, 0)
})

const totalAmount = computed(() => {
  const base = subtotal.value
  if (form.value.includeTax && form.value.taxAmount) {
    return base + form.value.taxAmount
  }
  return base
})

const canSave = computed(() => {
  return (
    form.value.supplierId &&
    form.value.deliveryDate &&
    form.value.items.length > 0 &&
    form.value.items.every(item => item.productId && item.quantity > 0 && item.unitPrice >= 0) &&
    !isSaving.value
  )
})

// =============================================
// METHODS - Item Management
// =============================================

function addItem() {
  form.value.items.push({
    productId: '',
    productName: '',
    packageId: '',
    packageName: '',
    packageQuantity: 0,
    packageUnit: '',
    packageSize: 0,
    quantity: 0,
    unit: 'kg',
    unitPrice: 0,
    baseCost: 0,
    total: 0
  })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

function handleProductChange(index: number) {
  const item = form.value.items?.[index]
  if (!item) return

  const product = productsStore.products.find(p => p.id === item.productId)

  DebugUtils.info(MODULE_NAME, 'Product changed', {
    index,
    productId: item.productId,
    productName: product?.name,
    hasPackages: !!product?.packageOptions,
    packagesCount: product?.packageOptions?.length || 0
  })

  if (product) {
    item.productName = product.name
    item.unit = product.baseUnit || 'kg'

    // Выбираем первую упаковку по умолчанию
    if (product.packageOptions && product.packageOptions.length > 0) {
      const firstPackage = product.packageOptions[0]
      DebugUtils.info(MODULE_NAME, 'Auto-selecting first package', {
        packageId: firstPackage.id,
        packageName: firstPackage.packageName
      })
      handlePackageChange(index, firstPackage.id)
    } else {
      // Если нет упаковок, создаем дефолтную
      DebugUtils.info(MODULE_NAME, 'No packages found, using default', {
        productId: item.productId
      })
      item.packageId = 'default'
      item.packageName = 'Unit'
      item.packageSize = 1
      item.packageUnit = item.unit
      item.packageQuantity = 0
    }
  }
}

function handlePackageChange(index: number, packageId: string) {
  const item = form.value.items?.[index]
  if (!item || !item.productId) return

  const product = productsStore.products.find(p => p.id === item.productId)
  if (!product || !product.packageOptions) return

  const selectedPackage = product.packageOptions.find(p => p.id === packageId)
  if (!selectedPackage) return

  item.packageId = selectedPackage.id
  item.packageName = selectedPackage.packageName
  item.packageSize = selectedPackage.packageSize
  item.packageUnit = selectedPackage.packageUnit
  item.baseCost = selectedPackage.baseCostPerUnit || 0

  // Пересчитываем количество в базовых единицах
  updateQuantityFromPackages(index)
}

function handlePackageQuantityChange(index: number) {
  updateQuantityFromPackages(index)
}

function updateQuantityFromPackages(index: number) {
  const item = form.value.items?.[index]
  if (!item) return

  // Количество в базовых единицах = количество упаковок × размер упаковки
  item.quantity = (item.packageQuantity || 0) * (item.packageSize || 0)

  // Пересчитываем стоимость
  calculateItemTotal(index)
}

function getProductPackages(productId: string) {
  const product = productsStore.products.find(p => p.id === productId)

  DebugUtils.info(MODULE_NAME, 'Getting packages for product', {
    productId,
    productName: product?.name,
    hasPackages: !!product?.packageOptions,
    packagesCount: product?.packageOptions?.length || 0
  })

  if (!product || !product.packageOptions || product.packageOptions.length === 0) {
    return []
  }

  const result = product.packageOptions.map(pkg => ({
    value: pkg.id,
    title: `${pkg.packageName} (${pkg.packageSize} ${pkg.packageUnit})`
  }))

  DebugUtils.info(MODULE_NAME, 'Packages mapped', { count: result.length, packages: result })

  return result
}

function calculateItemTotal(index: number) {
  const item = form.value.items?.[index]
  if (!item) return

  // total = количество упаковок × цена за упаковку
  item.total = (item.packageQuantity || 0) * (item.unitPrice || 0)

  // Обновляем baseCost если указана цена за упаковку
  if (item.unitPrice && item.packageSize) {
    item.baseCost = item.unitPrice / item.packageSize
  }
}

// =============================================
// METHODS - Package Dialog
// =============================================

function showAddPackageDialog(index: number) {
  DebugUtils.info(MODULE_NAME, 'Opening package dialog', { index })
  currentItemIndexForPackage.value = index
  showPackageDialog.value = true
}

function handlePackageCreated(newPackage: any) {
  DebugUtils.info(MODULE_NAME, 'Package created', { packageId: newPackage.id })

  if (currentItemIndexForPackage.value !== null) {
    const index = currentItemIndexForPackage.value
    const item = form.value.items?.[index]

    if (item && item.productId) {
      // Refresh product packages and select the new one
      // The product should have the new package now
      handlePackageChange(index, newPackage.id)
    }
  }

  showPackageDialog.value = false
  currentItemIndexForPackage.value = null
}

// =============================================
// METHODS - Supplier & Duplicate
// =============================================

async function handleSupplierChange() {
  if (!form.value.supplierId) {
    lastReceipt.value = null
    return
  }

  DebugUtils.info(MODULE_NAME, 'Loading last receipt for supplier', {
    supplierId: form.value.supplierId
  })

  try {
    // Найдем последний receipt от этого поставщика
    const receipts = await supplierStore.getReceipts()
    const supplierReceipts = receipts
      .filter((r: any) => {
        // Найдем order для receipt
        const order = supplierStore.state.orders.find((o: any) => o.id === r.purchaseOrderId)
        return order?.supplierId === form.value.supplierId
      })
      .sort((a: any, b: any) => {
        return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
      })

    if (supplierReceipts.length > 0) {
      lastReceipt.value = supplierReceipts[0]
      DebugUtils.info(MODULE_NAME, 'Found last receipt', {
        receiptNumber: lastReceipt.value.receipt_number,
        itemsCount: lastReceipt.value.items.length
      })
    } else {
      lastReceipt.value = null
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error loading last receipt', { error })
    lastReceipt.value = null
  }
}

function duplicateLastReceipt() {
  if (!lastReceipt.value) return

  DebugUtils.info(MODULE_NAME, 'Duplicating last receipt', {
    receiptId: lastReceipt.value.id
  })

  form.value.items = lastReceipt.value.items.map((receiptItem: any) => {
    const product = productsStore.products.find(p => p.id === receiptItem.itemId)

    // Try to get package info from receipt item or fallback to product's first package
    const packageId = receiptItem.packageId || product?.packageOptions?.[0]?.id || 'default'
    const packageInfo = product?.packageOptions?.find(p => p.id === packageId) || {
      id: 'default',
      name: 'Unit',
      packageSize: 1,
      packageUnit: receiptItem.unit || product?.baseUnit || 'kg',
      baseCostPerUnit: receiptItem.actualBaseCost || receiptItem.orderedBaseCost || 0
    }

    const receivedQty = receiptItem.receivedQuantity || 0
    const packageSize = packageInfo.packageSize || 1
    const packageQuantity = Math.ceil(receivedQty / packageSize)
    const unitPrice =
      packageQuantity > 0
        ? (receiptItem.actualBaseCost || receiptItem.orderedBaseCost || 0) * packageSize
        : 0

    return {
      productId: receiptItem.itemId,
      productName: receiptItem.itemName,
      packageId: packageInfo.id,
      packageName: packageInfo.name,
      packageQuantity,
      packageUnit: packageInfo.packageUnit,
      packageSize: packageInfo.packageSize,
      quantity: receivedQty,
      unit: receiptItem.unit || product?.baseUnit || 'kg',
      unitPrice,
      baseCost: receiptItem.actualBaseCost || receiptItem.orderedBaseCost || 0,
      total: receivedQty * (receiptItem.actualBaseCost || receiptItem.orderedBaseCost || 0)
    }
  })

  DebugUtils.info(MODULE_NAME, 'Items duplicated', { count: form.value.items.length })
}

// =============================================
// METHODS - Tax Calculations
// =============================================

let taxSyncInProgress = false

/**
 * When tax amount changes, calculate and update percentage
 */
function onTaxAmountChange(value: number | undefined) {
  if (taxSyncInProgress) return
  if (!value || value <= 0) {
    form.value.taxPercentage = undefined
    return
  }

  taxSyncInProgress = true
  const base = subtotal.value
  if (base > 0) {
    // Calculate percentage from amount
    form.value.taxPercentage = Number(((value / base) * 100).toFixed(2))
  }
  taxSyncInProgress = false
}

/**
 * When tax percentage changes, calculate and update amount
 */
function onTaxPercentageChange(value: number | undefined) {
  if (taxSyncInProgress) return
  if (!value || value <= 0) {
    form.value.taxAmount = undefined
    return
  }

  taxSyncInProgress = true
  const base = subtotal.value
  if (base > 0) {
    // Calculate amount from percentage
    form.value.taxAmount = Math.round((base * value) / 100)
  }
  taxSyncInProgress = false
}

// =============================================
// METHODS - Save
// =============================================

async function saveReceipt() {
  if (!canSave.value) return

  const { valid } = await formRef.value?.validate()
  if (!valid) return

  DebugUtils.info(MODULE_NAME, 'Creating quick receipt', {
    supplierId: form.value.supplierId,
    itemsCount: form.value.items.length,
    totalAmount: totalAmount.value
  })

  isSaving.value = true
  try {
    // 1. Создаем dummy order через supplierStore.createOrder
    const supplier = selectedSupplier.value
    if (!supplier) {
      throw new Error('Supplier not found')
    }

    // Prepare order items in CreateOrderData format
    const orderItemsData = form.value.items.map(item => ({
      itemId: item.productId,
      quantity: item.quantity, // Base quantity (grams, ml, pieces)
      packageId: item.packageId,
      pricePerUnit: item.baseCost // Price per base unit
    }))

    // Create order via store (this saves to Supabase)
    const createdOrder = await supplierStore.createOrder({
      supplierId: form.value.supplierId,
      requestIds: [], // Quick receipts don't have associated requests
      items: orderItemsData,
      notes: 'Quick Receipt Entry (Archive)',
      expectedDeliveryDate: form.value.deliveryDate
    })

    DebugUtils.info(MODULE_NAME, 'Order created in Supabase', {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber
    })

    // 2. Update order status to 'delivered' (skip 'sent' to avoid creating transit batches)
    // QuickReceipt is for archive data - goods already received, no need for transit flow
    await supplierStore.updateOrder(createdOrder.id, {
      status: 'delivered'
    })

    DebugUtils.info(MODULE_NAME, 'Order marked as delivered (archive mode)', {
      orderId: createdOrder.id,
      status: 'delivered'
    })

    // 3. Create receipt through startReceipt
    const receiptData = {
      purchaseOrderId: createdOrder.id,
      receivedBy: 'Quick Entry',
      items: createdOrder.items.map(item => ({
        orderItemId: item.id,
        receivedQuantity: item.orderedQuantity,
        actualPrice: item.pricePerUnit,
        notes: ''
      }))
    }

    const receipt = await startReceipt(createdOrder.id, receiptData)

    DebugUtils.info(MODULE_NAME, 'Receipt created', {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber
    })

    // 4. Update delivery date, notes, and tax
    await supplierStore.updateReceipt(receipt.id, {
      deliveryDate: form.value.deliveryDate,
      notes: form.value.notes || 'Quick Receipt Entry',
      taxAmount: form.value.includeTax ? form.value.taxAmount : undefined,
      taxPercentage: form.value.includeTax ? form.value.taxPercentage : undefined
    })

    // 4.5. ✅ TAX DISTRIBUTION: Add proportional tax to actualBaseCost
    if (form.value.includeTax && form.value.taxAmount && form.value.taxAmount > 0) {
      const updatedReceipt = await supplierStore.getReceiptById(receipt.id)
      if (updatedReceipt) {
        const receiptSubtotal = subtotal.value
        if (receiptSubtotal > 0) {
          updatedReceipt.items.forEach(item => {
            const lineTotal = item.receivedQuantity * (item.actualBaseCost || item.orderedBaseCost)
            const proportion = lineTotal / receiptSubtotal
            const itemTax = form.value.taxAmount! * proportion
            const taxPerUnit = item.receivedQuantity > 0 ? itemTax / item.receivedQuantity : 0

            // Add tax to actualBaseCost
            if (item.actualBaseCost !== undefined) {
              item.actualBaseCost = item.actualBaseCost + taxPerUnit
            } else {
              item.actualBaseCost = item.orderedBaseCost + taxPerUnit
            }
          })

          // Save updated items with tax-inclusive prices
          await supplierStore.updateReceipt(receipt.id, {
            items: updatedReceipt.items
          })

          DebugUtils.info(MODULE_NAME, 'Tax distributed to item prices', {
            taxAmount: form.value.taxAmount,
            subtotal: receiptSubtotal,
            itemsUpdated: updatedReceipt.items.length
          })
        }
      }
    }

    // 5. Complete receipt (auto-complete for quick entry)
    const completedReceipt = await supplierStore.completeReceipt(receipt.id)

    DebugUtils.info(MODULE_NAME, 'Quick receipt completed successfully', {
      receiptId: completedReceipt.id,
      receiptNumber: completedReceipt.receiptNumber,
      orderNumber: createdOrder.orderNumber,
      status: completedReceipt.status
    })

    emits(
      'success',
      `Receipt ${completedReceipt.receiptNumber} completed successfully from order ${createdOrder.orderNumber}`
    )
    closeDialog()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create quick receipt', { error })
    emits('error', `Failed to create receipt: ${error}`)
  } finally {
    isSaving.value = false
  }
}

function closeDialog() {
  // Reset form first, then clear formRef
  form.value.supplierId = ''
  form.value.deliveryDate = TimeUtils.formatForHTMLInput()
  form.value.items = []
  form.value.notes = ''
  form.value.includeTax = false
  form.value.taxAmount = undefined
  form.value.taxPercentage = undefined
  lastReceipt.value = null

  // Reset form validation after a tick
  setTimeout(() => {
    formRef.value?.reset()
  }, 100)

  emits('update:modelValue', false)
}

// =============================================
// UTILITY
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid date'
  }
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Dialog opened', {
        supplierId: form.value.supplierId,
        hasLastReceipt: !!lastReceipt.value,
        itemsCount: form.value.items.length
      })
    }
  }
)
</script>

<style lang="scss" scoped>
.quick-receipt-dialog {
  .v-card {
    border-radius: 12px;
  }
}

.items-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;

  th {
    font-weight: 600;
    background-color: rgba(var(--v-theme-surface-variant), 0.5);
  }
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.bg-surface {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}
</style>
