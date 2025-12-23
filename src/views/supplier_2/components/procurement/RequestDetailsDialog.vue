<!-- src/views/supplier_2/components/procurement/RequestDetailsDialog.vue -->
<!-- ✅ UPDATED: Added package information display -->
<template>
  <v-dialog v-model="isOpen" max-width="1000px" scrollable>
    <v-card v-if="request">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-3 bg-primary">
        <div>
          <div class="text-h6 font-weight-bold text-white">{{ request.requestNumber }}</div>
          <div class="text-caption text-white" style="opacity: 0.9">Request Details</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Request Info - Compact -->
        <div class="pa-3">
          <div class="d-flex flex-wrap align-center gap-2 mb-2">
            <v-chip :color="getStatusColor(request.status)" size="small" variant="tonal">
              {{ request.status.toUpperCase() }}
            </v-chip>
            <v-chip :color="getPriorityColor(request.priority)" size="small" variant="tonal">
              {{ request.priority.toUpperCase() }}
            </v-chip>
            <v-chip :color="getDepartmentColor(request.department)" size="small" variant="tonal">
              <v-icon :icon="getDepartmentIcon(request.department)" size="14" class="mr-1" />
              {{ request.department.toUpperCase() }}
            </v-chip>
          </div>

          <div class="text-body-2 mb-1">
            <strong>By:</strong>
            {{ request.requestedBy }} •
            <strong>Created:</strong>
            {{ formatDate(request.createdAt) }}
          </div>

          <div v-if="request.notes" class="text-body-2">
            <strong>Notes:</strong>
            {{ request.notes }}
          </div>
        </div>

        <v-divider />

        <!-- Two Tables Layout -->
        <div class="pa-3">
          <v-row>
            <!-- Left: Requested Items -->
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-2">Requested Items</div>

              <v-table density="compact" class="border">
                <thead>
                  <tr>
                    <th class="text-left">Item</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in request.items" :key="item.id" :class="getItemRowClass(item)">
                    <td>
                      <div class="d-flex align-center justify-space-between">
                        <div style="flex: 1">
                          <div
                            class="text-body-2 font-weight-medium"
                            :class="getItemTextClass(item)"
                          >
                            {{ item.itemName }}
                          </div>

                          <!-- ✅ NEW: Package Info -->
                          <div v-if="getPackageInfo(item)" class="package-chip mt-1">
                            <v-icon size="12" class="mr-1">mdi-package-variant</v-icon>
                            <span class="text-caption">
                              {{ getPackageInfo(item)?.display }}
                            </span>
                          </div>

                          <div v-if="item.notes" class="text-caption text-warning mt-1">
                            {{ item.notes }}
                          </div>
                        </div>

                        <!-- Status indicator -->
                        <div v-if="isItemOrdered(item)">
                          <v-icon icon="mdi-check-circle" color="success" size="16" />
                        </div>
                      </div>
                    </td>
                    <td class="text-center">
                      <v-chip
                        size="x-small"
                        :variant="isItemOrdered(item) ? 'tonal' : 'outlined'"
                        :color="isItemOrdered(item) ? 'success' : 'grey'"
                      >
                        {{ formatQuantity(item.requestedQuantity, item.itemId) }}
                        <span v-if="isItemPartiallyOrdered(item)" class="ml-1">
                          / {{ formatQuantity(getOrderedQuantityForItem(item), item.itemId) }}
                        </span>
                      </v-chip>
                    </td>
                    <td class="text-right">
                      <div class="text-body-2" :class="getItemTextClass(item)">
                        {{ formatItemPrice(item) }}
                      </div>
                      <div
                        class="text-caption text-medium-emphasis"
                        :class="getItemTextClass(item)"
                      >
                        {{ formatCurrency(calculateItemTotal(item)) }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Requested Total -->
              <div class="pa-2 text-right">
                <div class="text-subtitle-2 font-weight-bold">
                  Total: {{ formatCurrency(calculateEstimatedTotal(request)) }}
                </div>
              </div>
            </v-col>

            <!-- Right: Ordered Items -->
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-2">Orders Created</div>

              <div v-if="getOrderedItems().length > 0">
                <v-table density="compact" class="border">
                  <thead>
                    <tr>
                      <th class="text-left">Order / Item</th>
                      <th class="text-center">Quantity</th>
                      <th class="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="orderGroup in getOrderedItems()" :key="orderGroup.orderId">
                      <!-- Order Header Row -->
                      <tr class="bg-surface">
                        <td colspan="3" class="pa-1">
                          <div class="d-flex align-center justify-space-between">
                            <div class="text-caption font-weight-bold text-success">
                              {{ orderGroup.orderNumber }} - {{ orderGroup.supplierName }}
                            </div>
                            <v-btn
                              icon="mdi-open-in-new"
                              variant="text"
                              size="x-small"
                              color="success"
                              @click="goToOrder(orderGroup.orderId)"
                            />
                          </div>
                        </td>
                      </tr>
                      <!-- Order Items -->
                      <tr v-for="orderItem in orderGroup.items" :key="orderItem.itemId">
                        <td>
                          <div class="text-body-2">{{ orderItem.itemName }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ formatDate(orderGroup.orderDate) }}
                          </div>
                        </td>
                        <td class="text-center">
                          <v-chip size="x-small" variant="tonal" color="success">
                            {{ formatQuantity(orderItem.orderedQuantity, orderItem.itemId) }}
                          </v-chip>
                        </td>
                        <td class="text-right">
                          <div class="text-body-2">
                            {{ formatOrderItemPrice(orderItem) }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ formatCurrency(orderItem.orderedQuantity * orderItem.pricePerUnit) }}
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </v-table>

                <!-- Ordered Total -->
                <div class="pa-2 text-right">
                  <div class="text-subtitle-2 font-weight-bold text-success">
                    Ordered: {{ formatCurrency(getOrderedTotal()) }}
                  </div>
                </div>
              </div>

              <!-- No Orders -->
              <div v-else class="text-center pa-4">
                <v-icon icon="mdi-information-outline" color="grey" size="32" class="mb-2" />
                <div class="text-body-2 text-medium-emphasis">No orders created yet</div>
              </div>
            </v-col>
          </v-row>

          <!-- Summary Bar -->
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center pa-2">
            <div class="text-body-2">
              {{ getOrderedItemsCount() }} of {{ request.items.length }} items ordered
            </div>

            <div class="d-flex align-center gap-2">
              <div v-if="getRemainingValue() > 0" class="text-body-2 text-warning">
                Remaining: {{ formatCurrency(getRemainingValue()) }}
              </div>

              <v-btn
                v-if="request.status === 'submitted' && hasUnorderedItems()"
                color="warning"
                variant="outlined"
                size="small"
                prepend-icon="mdi-cart-plus"
                @click="createOrder"
              >
                Create Order
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn color="grey" variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { formatQuantityWithUnit } from '@/utils/quantityFormatter'
import type { ProcurementRequest, PurchaseOrder, RequestItem } from '@/stores/supplier_2/types'
import type { Product } from '@/stores/productsStore/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  request: ProcurementRequest | null
  orders: PurchaseOrder[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'go-to-order', orderId: string): void
  (e: 'create-order', request: ProcurementRequest): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// =============================================
// PRODUCT & FORMATTING HELPERS
// =============================================

function getProduct(itemId: string): Product | null {
  return productsStore.products.find(p => p.id === itemId) || null
}

/**
 * ✅ NEW: Get package information for display
 */
function getPackageInfo(item: RequestItem): { display: string } | null {
  const product = getProduct(item.itemId)
  if (!product) return null

  // If package selected, show it
  if (item.packageId && item.packageName) {
    const pkg = productsStore.getPackageById(item.packageId)
    if (pkg) {
      const calculation = productsStore.calculatePackageQuantity(
        item.itemId,
        item.requestedQuantity,
        pkg.id
      )
      return {
        display: `${calculation.suggestedPackages} × ${pkg.packageName}`
      }
    }
  }

  // ✅ ИСПРАВЛЕНИЕ: Проверяем, есть ли базовая активная упаковка в packageOptions
  const basePackage = product.packageOptions.find(pkg => pkg.isActive && pkg.packageSize === 1)
  if (basePackage) {
    return {
      display: `${item.requestedQuantity} × ${basePackage.packageName}`
    }
  }

  // Если нет базовой упаковки, показываем просто количество
  return {
    display: `${item.requestedQuantity} ${getUnitLabel(product.baseUnit)}`
  }
}

function getUnitLabel(baseUnit: string): string {
  const labels: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc'
  }
  return labels[baseUnit] || baseUnit
}

function formatQuantity(quantity: number, itemId: string): string {
  const product = getProduct(itemId)
  if (!product) return `${quantity}`

  return formatQuantityWithUnit(quantity, product)
}

function getBaseCostPerUnit(itemId: string): number {
  const product = getProduct(itemId)

  if (!product) {
    console.error(`RequestDetailsDialog: Product not found: ${itemId}`)
    throw new Error(`Product not found: ${itemId}`)
  }

  if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
    return product.baseCostPerUnit
  }

  console.error(`RequestDetailsDialog: No baseCostPerUnit for ${itemId}`, {
    product: {
      id: product.id,
      name: product.name,
      baseCostPerUnit: product.baseCostPerUnit,
      baseUnit: product.baseUnit
    }
  })

  throw new Error(`No baseCostPerUnit for product: ${product.name}`)
}

function calculateItemTotal(item: any): number {
  const baseCostPerUnit = item.estimatedPrice || getBaseCostPerUnit(item.itemId)
  return item.requestedQuantity * baseCostPerUnit
}

function formatItemPrice(item: any): string {
  const product = getProduct(item.itemId)
  const baseCostPerUnit = item.estimatedPrice || getBaseCostPerUnit(item.itemId)

  if (!product) return formatCurrency(baseCostPerUnit) + '/unit'

  if (product.baseUnit === 'gram') {
    return formatCurrency(baseCostPerUnit * 1000) + '/kg'
  } else if (product.baseUnit === 'ml') {
    return formatCurrency(baseCostPerUnit * 1000) + '/L'
  } else {
    return formatCurrency(baseCostPerUnit) + '/pcs'
  }
}

function formatOrderItemPrice(orderItem: any): string {
  const product = getProduct(orderItem.itemId)

  if (!product) return formatCurrency(orderItem.pricePerUnit) + '/unit'

  if (product.baseUnit === 'gram') {
    return formatCurrency(orderItem.pricePerUnit * 1000) + '/kg'
  } else if (product.baseUnit === 'ml') {
    return formatCurrency(orderItem.pricePerUnit * 1000) + '/L'
  } else {
    return formatCurrency(orderItem.pricePerUnit) + '/pcs'
  }
}

// =============================================
// ORDER ANALYSIS METHODS
// =============================================

function getOrderedItems() {
  if (!props.request) return []

  const relatedOrders = props.orders.filter(order => order.requestIds.includes(props.request!.id))

  return relatedOrders
    .map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      supplierName: order.supplierName,
      orderDate: order.orderDate,
      items: order.items
        .filter(orderItem =>
          props.request!.items.some(reqItem => reqItem.itemId === orderItem.itemId)
        )
        .map(orderItem => {
          const requestItem = props.request!.items.find(
            reqItem => reqItem.itemId === orderItem.itemId
          )
          return {
            ...orderItem,
            itemName: requestItem?.itemName || orderItem.itemName
          }
        })
    }))
    .filter(orderGroup => orderGroup.items.length > 0)
}

function getOrderedTotal() {
  return getOrderedItems().reduce((total, orderGroup) => {
    return (
      total +
      orderGroup.items.reduce((orderTotal, item) => {
        return orderTotal + item.orderedQuantity * item.pricePerUnit
      }, 0)
    )
  }, 0)
}

function getRemainingValue() {
  if (!props.request) return 0

  const requestedTotal = calculateEstimatedTotal(props.request)
  const orderedTotal = getOrderedTotal()

  return Math.max(0, requestedTotal - orderedTotal)
}

function isItemOrdered(item: any): boolean {
  return getOrderedQuantityForItem(item) > 0
}

function isItemPartiallyOrdered(item: any): boolean {
  const orderedQty = getOrderedQuantityForItem(item)
  return orderedQty > 0 && orderedQty < item.requestedQuantity
}

function getOrderedQuantityForItem(item: any): number {
  return getOrderedItems().reduce((total, orderGroup) => {
    const orderItem = orderGroup.items.find(oi => oi.itemId === item.itemId)
    return total + (orderItem?.orderedQuantity || 0)
  }, 0)
}

function getItemRowClass(item: any): string {
  if (isItemOrdered(item)) {
    return 'ordered-item'
  }
  return ''
}

function getItemTextClass(item: any): string {
  if (isItemOrdered(item)) {
    return 'text-muted'
  }
  return ''
}

function hasUnorderedItems() {
  if (!props.request) return false

  return props.request.items.some(item => {
    const orderedQuantity = getOrderedQuantityForItem(item)
    return orderedQuantity < item.requestedQuantity
  })
}

function getOrderedItemsCount() {
  if (!props.request) return 0

  return props.request.items.filter(item => {
    return getOrderedItems().some(orderGroup =>
      orderGroup.items.some(oi => oi.itemId === item.itemId)
    )
  }).length
}

function calculateEstimatedTotal(request: ProcurementRequest): number {
  return request.items.reduce((sum, item) => {
    return sum + calculateItemTotal(item)
  }, 0)
}

// =============================================
// DIALOG METHODS
// =============================================

function closeDialog() {
  isOpen.value = false
}

function goToOrder(orderId: string) {
  emits('go-to-order', orderId)
}

function createOrder() {
  if (props.request) {
    emits('create-order', props.request)
  }
}

// =============================================
// FORMATTING & UTILITY FUNCTIONS
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusColor(status: string): string {
  const colors = {
    draft: 'grey',
    submitted: 'blue',
    converted: 'success',
    approved: 'success',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

function getPriorityColor(priority: string): string {
  const colors = {
    normal: 'blue',
    urgent: 'orange'
  }
  return colors[priority as keyof typeof colors] || 'blue'
}

function getDepartmentColor(department: string): string {
  return department === 'kitchen' ? 'orange' : 'purple'
}

function getDepartmentIcon(department: string): string {
  return department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}
</script>

<style scoped>
.border {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

.text-muted {
  opacity: 0.5;
}

.ordered-item {
  background-color: rgb(var(--v-theme-success), 0.05);
}

.v-table {
  background: transparent;
}

.v-table > .v-table__wrapper > table > thead > tr > th {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
}

.v-table > .v-table__wrapper > table > tbody > tr > td {
  font-size: 0.8rem;
  padding: 4px 8px;
}

.bg-surface {
  background-color: rgb(var(--v-theme-surface-variant), 0.5);
}

/* ✅ NEW: Package chip styling */
.package-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background-color: rgb(var(--v-theme-success), 0.1);
  border: 1px solid rgb(var(--v-theme-success), 0.3);
  border-radius: 4px;
  color: rgb(var(--v-theme-success));
  font-size: 0.7rem;
}
</style>
