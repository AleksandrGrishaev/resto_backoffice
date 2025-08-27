<!-- src/views/supplier_2/components/procurement/RequestDetailsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="900px" scrollable>
    <v-card v-if="request">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
        <div>
          <div class="text-h6 font-weight-bold">{{ request.requestNumber }}</div>
          <div class="text-caption opacity-90">Request Details with Orders</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Request Info -->
        <div class="pa-4 border-b">
          <div class="d-flex align-center gap-3 mb-3">
            <v-chip :color="getStatusColor(request.status)" size="small" variant="tonal">
              {{ request.status.toUpperCase() }}
            </v-chip>
            <v-chip :color="getPriorityColor(request.priority)" size="small" variant="outlined">
              {{ request.priority.toUpperCase() }}
            </v-chip>
            <v-chip :color="getDepartmentColor(request.department)" size="small" variant="flat">
              <v-icon :icon="getDepartmentIcon(request.department)" size="14" class="mr-1" />
              {{ request.department.toUpperCase() }}
            </v-chip>
          </div>

          <div class="text-body-2 text-medium-emphasis mb-2">
            <strong>Requested by:</strong>
            {{ request.requestedBy }} •
            <strong>Created:</strong>
            {{ formatDate(request.createdAt) }}
          </div>

          <div v-if="request.notes" class="text-body-2">
            <strong>Notes:</strong>
            {{ request.notes }}
          </div>
        </div>

        <!-- Items with Order Information -->
        <div class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-4">
            📦 Requested Items ({{ request.items.length }})
          </div>

          <!-- Item Cards -->
          <div class="space-y-3">
            <v-card v-for="item in request.items" :key="item.id" variant="outlined" class="mb-3">
              <!-- Item Header -->
              <div class="pa-3 bg-grey-lighten-5 border-b">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-subtitle-2 font-weight-bold">{{ item.itemName }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ item.requestedQuantity }} {{ item.unit }} • Est.
                      {{ formatCurrency(getEstimatedPrice(item.itemId)) }}/{{ item.unit }}
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-body-1 font-weight-bold">
                      {{ formatCurrency(item.requestedQuantity * getEstimatedPrice(item.itemId)) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Est. Total</div>
                  </div>
                </div>

                <div v-if="item.notes" class="text-body-2 mt-2 text-orange-darken-2">
                  <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                  {{ item.notes }}
                </div>
              </div>

              <!-- Order Information -->
              <div class="pa-3">
                <div v-if="getOrdersForItem(item.itemId).length > 0">
                  <div class="text-body-2 font-weight-medium mb-2 text-success-darken-1">
                    <v-icon icon="mdi-check-circle" size="16" class="mr-1" />
                    Orders Created
                  </div>

                  <div class="space-y-2">
                    <div
                      v-for="orderInfo in getOrdersForItem(item.itemId)"
                      :key="orderInfo.orderId"
                      class="d-flex align-center justify-space-between pa-2 bg-success-lighten-5 rounded"
                    >
                      <div class="d-flex align-center gap-3">
                        <v-icon icon="mdi-receipt" color="success" size="18" />
                        <div>
                          <div class="text-body-2 font-weight-medium">
                            {{ orderInfo.orderNumber }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ orderInfo.supplierName }} • {{ formatDate(orderInfo.orderDate) }}
                          </div>
                        </div>
                      </div>

                      <div class="text-right">
                        <div class="text-body-2 font-weight-bold">
                          {{ orderInfo.orderedQuantity }} {{ item.unit }}
                        </div>
                        <div class="text-caption">
                          {{ formatCurrency(orderInfo.pricePerUnit) }}/{{ item.unit }}
                        </div>
                      </div>

                      <v-btn
                        icon="mdi-open-in-new"
                        variant="text"
                        size="small"
                        color="success"
                        @click="goToOrder(orderInfo.orderId)"
                      />
                    </div>
                  </div>

                  <!-- Remaining Quantity -->
                  <div v-if="getRemainingQuantity(item) > 0" class="mt-3">
                    <v-alert type="warning" variant="tonal" density="compact" class="text-body-2">
                      <v-icon icon="mdi-alert-circle-outline" class="mr-2" />
                      <strong>{{ getRemainingQuantity(item) }} {{ item.unit }}</strong>
                      still needs to be ordered
                    </v-alert>
                  </div>

                  <!-- Fully Ordered -->
                  <div v-else class="mt-3">
                    <v-alert type="success" variant="tonal" density="compact" class="text-body-2">
                      <v-icon icon="mdi-check-circle" class="mr-2" />
                      Fully ordered
                    </v-alert>
                  </div>
                </div>

                <!-- No Orders Yet -->
                <div v-else>
                  <v-alert type="info" variant="tonal" density="compact" class="text-body-2">
                    <v-icon icon="mdi-information-outline" class="mr-2" />
                    No orders created yet
                  </v-alert>
                </div>
              </div>
            </v-card>
          </div>

          <!-- Summary -->
          <v-card variant="tonal" color="primary" class="mt-4">
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-subtitle-2 font-weight-bold">Request Summary</div>
                  <div class="text-body-2">
                    {{ getOrderedItemsCount() }} of {{ request.items.length }} items ordered
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h6 font-weight-bold">
                    {{ formatCurrency(calculateEstimatedTotal(request)) }}
                  </div>
                  <div class="text-caption">Estimated Total</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-spacer />

        <!-- Create Order Button (if applicable) -->
        <v-btn
          v-if="request.status === 'submitted' && hasUnorderedItems()"
          color="warning"
          variant="flat"
          prepend-icon="mdi-cart-plus"
          @click="createOrder"
        >
          Create Order
        </v-btn>

        <v-btn color="grey" variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProcurementRequest, PurchaseOrder } from '@/stores/supplier_2/types'

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
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// =============================================
// METHODS
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

/**
 * Получает все заказы для конкретного товара из данной заявки
 */
function getOrdersForItem(itemId: string) {
  if (!props.request) return []

  const relatedOrders = props.orders.filter(order => order.requestIds.includes(props.request!.id))

  const orderInfos = []

  for (const order of relatedOrders) {
    const orderItem = order.items.find(item => item.itemId === itemId)
    if (orderItem) {
      orderInfos.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        supplierName: order.supplierName,
        orderDate: order.orderDate,
        orderedQuantity: orderItem.orderedQuantity,
        pricePerUnit: orderItem.pricePerUnit
      })
    }
  }

  return orderInfos
}

/**
 * Подсчитывает оставшееся количество для заказа
 */
function getRemainingQuantity(item: any) {
  const orderedQuantity = getOrdersForItem(item.itemId).reduce(
    (sum, order) => sum + order.orderedQuantity,
    0
  )

  return Math.max(0, item.requestedQuantity - orderedQuantity)
}

/**
 * Проверяет есть ли незаказанные товары
 */
function hasUnorderedItems() {
  if (!props.request) return false

  return props.request.items.some(item => getRemainingQuantity(item) > 0)
}

/**
 * Подсчитывает количество заказанных товаров
 */
function getOrderedItemsCount() {
  if (!props.request) return 0

  return props.request.items.filter(item => getOrdersForItem(item.itemId).length > 0).length
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
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getEstimatedPrice(itemId: string): number {
  // Hardcoded prices - в реальном приложении из ProductsStore
  const prices: Record<string, number> = {
    'prod-beef-steak': 180000,
    'prod-potato': 8000,
    'prod-garlic': 25000,
    'prod-tomato': 12000,
    'prod-beer-bintang-330': 12000,
    'prod-cola-330': 8000,
    'prod-butter': 45000,
    'prod-chicken-breast': 85000,
    'prod-onion': 15000,
    'prod-rice': 12000
  }
  return prices[itemId] || 0
}

function calculateEstimatedTotal(request: ProcurementRequest): number {
  return request.items.reduce((sum, item) => {
    return sum + item.requestedQuantity * getEstimatedPrice(item.itemId)
  }, 0)
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
