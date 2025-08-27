<!-- src/views/supplier_2/components/orders/BaseSupplierBaskets.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cart-variant" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">📦 Create Orders from Requests</div>
            <div class="text-caption opacity-90">
              Assign items to suppliers and create purchase orders
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Request Summary -->
        <div class="pa-4 bg-surface border-b">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-bold mb-1">
                Processing {{ selectedRequestIds.length }} Request(s)
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Total {{ totalItems }} items • Est. {{ formatCurrency(totalEstimatedValue) }}
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                color="info"
                variant="outlined"
                size="small"
                prepend-icon="mdi-information"
                @click="showRequestDetails = !showRequestDetails"
              >
                {{ showRequestDetails ? 'Hide' : 'Show' }} Details
              </v-btn>

              <v-btn
                color="success"
                variant="flat"
                size="small"
                prepend-icon="mdi-cart-plus"
                :disabled="completedBaskets === 0 || isLoading"
                :loading="isLoading"
                @click="createAllOrders"
              >
                Create All Orders ({{ completedBaskets }})
              </v-btn>
            </div>
          </div>

          <!-- Request Details -->
          <v-expand-transition>
            <div v-show="showRequestDetails" class="mt-4">
              <v-card variant="outlined">
                <v-card-text class="pa-3">
                  <div class="text-subtitle-2 mb-2">Requests being processed:</div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="request in selectedRequests"
                      :key="request.id"
                      size="small"
                      :color="getDepartmentColor(request.department)"
                      variant="tonal"
                    >
                      <v-icon
                        :icon="getDepartmentIcon(request.department)"
                        size="14"
                        class="mr-1"
                      />
                      {{ request.requestNumber }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-expand-transition>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <div class="text-body-1">Processing requests and grouping items...</div>
        </div>

        <!-- Content -->
        <div v-else-if="hasUnassignedItems || completedBaskets > 0" class="pa-4">
          <!-- Unassigned Items -->
          <div v-if="hasUnassignedItems" class="mb-6">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-h6 font-weight-bold">
                🔄 Unassigned Items ({{ unassignedBasket.items.length }})
              </div>

              <div class="d-flex gap-2">
                <v-select
                  v-model="selectedCategory"
                  :items="categoryOptions"
                  label="Filter by category"
                  variant="outlined"
                  density="compact"
                  style="width: 200px"
                  @update:model-value="filterByCategory"
                />

                <v-btn
                  v-if="selectedUnassignedItems.length > 0"
                  color="primary"
                  size="small"
                  @click="selectAllUnassigned"
                >
                  Select All ({{ filteredUnassignedItems.length }})
                </v-btn>

                <v-btn
                  v-if="selectedUnassignedItems.length > 0"
                  color="warning"
                  size="small"
                  @click="clearAllSelections"
                >
                  Clear Selection
                </v-btn>
              </div>
            </div>

            <v-card variant="outlined">
              <v-card-text class="pa-3">
                <v-row>
                  <v-col
                    v-for="item in filteredUnassignedItems"
                    :key="item.itemId"
                    cols="12"
                    md="6"
                    lg="3"
                  >
                    <v-card
                      variant="outlined"
                      class="pa-2 cursor-pointer"
                      :class="{ 'border-primary': selectedUnassignedItems.includes(item.itemId) }"
                      @click="toggleUnassignedItem(item.itemId)"
                    >
                      <!-- Header: Name and Quantity -->
                      <div class="d-flex justify-space-between align-center mb-2">
                        <div class="flex-grow-1">
                          <div class="font-weight-bold text-body-2 mb-1">{{ item.itemName }}</div>

                          <!-- Quantity - more prominent -->
                          <v-chip
                            size="small"
                            color="primary"
                            variant="flat"
                            class="font-weight-bold"
                          >
                            {{ item.totalQuantity }} {{ item.unit }}
                          </v-chip>
                        </div>

                        <!-- Checkbox -->
                        <v-checkbox
                          :model-value="selectedUnassignedItems.includes(item.itemId)"
                          hide-details
                          density="compact"
                          @click.stop
                          @update:model-value="toggleUnassignedItem(item.itemId)"
                        />
                      </div>

                      <!-- Department Sources - compact -->
                      <div class="mb-2">
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip
                            v-for="source in item.sources"
                            :key="source.requestId"
                            size="x-small"
                            :color="getDepartmentColor(source.department)"
                            variant="tonal"
                            class="px-2"
                          >
                            <v-icon
                              :icon="getDepartmentIcon(source.department)"
                              size="10"
                              class="mr-1"
                            />
                            {{ source.quantity }}
                          </v-chip>
                        </div>
                      </div>

                      <!-- Price -->
                      <div class="text-right">
                        <div class="text-body-2 font-weight-bold text-success">
                          {{ formatCurrency(item.estimatedPrice * item.totalQuantity) }}
                        </div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Bulk Assignment Actions -->
                <div v-if="selectedUnassignedItems.length > 0" class="mt-4 pa-3 bg-surface rounded">
                  <div class="text-subtitle-2 mb-3">
                    Assign {{ selectedUnassignedItems.length }} selected item(s) to supplier:
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-btn
                      v-for="supplier in availableSuppliers"
                      :key="supplier.id"
                      color="primary"
                      size="small"
                      variant="outlined"
                      @click="assignToSupplier(supplier.id, supplier.name)"
                    >
                      {{ supplier.name }}
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Supplier Baskets - Only show suppliers with items -->
          <div v-if="completedBaskets > 0">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-h6 font-weight-bold">
                🏪 Supplier Baskets ({{ completedBaskets }})
              </div>

              <v-btn
                color="success"
                size="small"
                prepend-icon="mdi-plus"
                @click="showNewSupplierDialog = true"
              >
                Add Supplier
              </v-btn>
            </div>

            <v-row>
              <v-col
                v-for="basket in supplierBaskets.filter(b => b.items.length > 0)"
                :key="basket.supplierId"
                cols="12"
                lg="6"
              >
                <v-card variant="outlined" class="h-100">
                  <!-- Supplier Header -->
                  <v-card-title class="pa-3 bg-surface">
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">
                          {{ basket.supplierName }}
                        </div>
                        <div class="text-body-2 text-medium-emphasis">
                          {{ basket.totalItems }} items •
                          {{ formatCurrency(basket.estimatedTotal) }}
                        </div>
                      </div>

                      <v-btn
                        color="primary"
                        size="small"
                        :disabled="basket.items.length === 0 || isLoading"
                        :loading="isLoading"
                        @click="createOrderFromBasket(basket)"
                      >
                        Create Order
                      </v-btn>
                    </div>
                  </v-card-title>

                  <v-divider />

                  <!-- Items -->
                  <v-card-text class="pa-3">
                    <div
                      v-for="item in basket.items"
                      :key="item.itemId"
                      class="d-flex align-center justify-space-between py-2 border-b"
                    >
                      <div class="flex-grow-1">
                        <div class="font-weight-bold text-body-2">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.totalQuantity }} {{ item.unit }}
                        </div>

                        <!-- Sources -->
                        <div class="d-flex flex-wrap gap-1 mt-1">
                          <v-chip
                            v-for="source in item.sources"
                            :key="source.requestId"
                            size="x-small"
                            :color="getDepartmentColor(source.department)"
                            variant="tonal"
                          >
                            {{ source.requestNumber }}: {{ source.quantity }}
                          </v-chip>
                        </div>
                      </div>

                      <div class="text-right ml-2">
                        <div class="text-body-2 font-weight-bold">
                          {{ formatCurrency(item.estimatedPrice * item.totalQuantity) }}
                        </div>

                        <v-btn
                          icon="mdi-arrow-left"
                          size="x-small"
                          variant="text"
                          color="warning"
                          @click="moveItemToUnassigned(item.itemId, basket.supplierId)"
                        >
                          <v-tooltip activator="parent" location="top">
                            Move to unassigned
                          </v-tooltip>
                        </v-btn>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center pa-8">
          <v-icon icon="mdi-cart-off" size="64" color="grey" class="mb-4" />
          <div class="text-h6 mb-2">No Items to Process</div>
          <div class="text-body-2 text-medium-emphasis">
            Selected requests are empty or already processed
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="isLoading" @click="closeDialog">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="success"
          :disabled="completedBaskets === 0 || isLoading"
          :loading="isLoading"
          @click="createAllOrders"
        >
          Create All Orders ({{ completedBaskets }})
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add New Supplier Dialog -->
    <v-dialog v-model="showNewSupplierDialog" max-width="400px">
      <v-card>
        <v-card-title>Add New Supplier</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSupplier.name"
            label="Supplier Name"
            variant="outlined"
            class="mb-3"
          />

          <v-select
            v-model="newSupplier.paymentTerms"
            :items="['Net 7', 'Net 15', 'Net 30', 'Net 45', 'Cash']"
            label="Payment Terms"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-btn @click="showNewSupplierDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" :disabled="!newSupplier.name.trim()" @click="addNewSupplier">
            Add Supplier
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProcurementRequests } from '@/stores/supplier_2/composables/useProcurementRequests'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useSupplierStore } from '@/stores/supplier_2/supplierStore'
import type { SupplierBasket, UnassignedItem } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  requestIds: string[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: string): void // Для уведомлений, НЕ закрывает диалог
  (e: 'error', message: string): void
  (e: 'order-created', orderIds: string[]): void // Для создания заказов
  (e: 'orders-completed'): void // НОВЫЙ: для закрытия диалога после всех заказов
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const {
  selectedRequestIds,
  groupRequestsForOrders,
  assignItemsToSupplier,
  moveItemsToUnassigned,
  clearSupplierBaskets,
  formatCurrency
} = useProcurementRequests()

const { createOrderFromBasket: createOrderFromBasketAction } = usePurchaseOrders()

const supplierStore = useSupplierStore()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const isLoading = ref(false)
const showRequestDetails = ref(false)
const showNewSupplierDialog = ref(false)
const selectedCategory = ref('all')
const selectedUnassignedItems = ref<string[]>([])

// Mock data - вернул оригинальную структуру
const supplierBaskets = ref<SupplierBasket[]>([])
const unassignedBasket = ref<SupplierBasket | null>(null)

const newSupplier = ref({
  name: '',
  paymentTerms: 'Net 30'
})

const availableSuppliers = ref([
  { id: 'ca-premium-meat-co', name: 'Premium Meat Company', paymentTerms: 'Net 15' },
  { id: 'ca-fresh-veg-market', name: 'Fresh Vegetable Market', paymentTerms: 'Net 30' },
  { id: 'ca-beverage-distribution', name: 'Jakarta Beverage Distribution', paymentTerms: 'Net 7' },
  { id: 'ca-dairy-plus', name: 'Dairy Products Plus', paymentTerms: 'Net 14' }
])

// =============================================
// COMPUTED
// =============================================

const selectedRequests = computed(() => {
  // Mock requests data
  return [
    {
      id: 'req-001',
      requestNumber: 'REQ-KITCHEN-001',
      department: 'kitchen' as const,
      requestedBy: 'Chef Maria',
      items: []
    },
    {
      id: 'req-002',
      requestNumber: 'REQ-BAR-001',
      department: 'bar' as const,
      requestedBy: 'Bartender John',
      items: []
    }
  ].filter(req => props.requestIds.includes(req.id))
})

const filteredUnassignedItems = computed(() => {
  if (!unassignedBasket.value) return []

  if (selectedCategory.value === 'all') {
    return unassignedBasket.value.items
  }

  return unassignedBasket.value.items.filter(item => item.category === selectedCategory.value)
})

const totalItems = computed(() => {
  const unassigned = unassignedBasket.value?.totalItems || 0
  const assigned = supplierBaskets.value.reduce((sum, basket) => sum + basket.totalItems, 0)
  return unassigned + assigned
})

const totalEstimatedValue = computed(() => {
  const unassigned = unassignedBasket.value?.estimatedTotal || 0
  const assigned = supplierBaskets.value.reduce((sum, basket) => sum + basket.estimatedTotal, 0)
  return unassigned + assigned
})

const hasUnassignedItems = computed(() => {
  return unassignedBasket.value && unassignedBasket.value.items.length > 0
})

const completedBaskets = computed(() => {
  return supplierBaskets.value.filter(basket => basket.items.length > 0).length
})

const categoryOptions = [
  { title: 'All Categories', value: 'all' },
  { title: 'Meat', value: 'meat' },
  { title: 'Vegetables', value: 'vegetables' },
  { title: 'Beverages', value: 'beverages' },
  { title: 'Dairy', value: 'dairy' }
]

// =============================================
// WATCHERS - исправил логику загрузки
// =============================================

watch(
  () => props.requestIds,
  newRequestIds => {
    if (newRequestIds && newRequestIds.length > 0) {
      console.log('RequestIds changed:', newRequestIds)
      // НЕ вызываем refreshBaskets здесь автоматически
    }
  },
  { immediate: true }
)

// ИСПРАВЛЕНИЕ: добавил watch на открытие диалога
watch(isOpen, newValue => {
  if (newValue && props.requestIds.length > 0) {
    console.log('Dialog opened, refreshing baskets for:', props.requestIds)
    refreshBaskets()
  }
})

// =============================================
// METHODS - восстановил оригинальную логику
// =============================================

async function refreshBaskets() {
  try {
    isLoading.value = true

    console.log('Refreshing baskets for request IDs:', props.requestIds)

    // ✅ ИСПРАВЛЕНИЕ: Ищем заявки со статусом 'submitted'
    // Они могут содержать частично заказанные товары
    const submittedRequests = supplierStore.state.requests.filter(
      req => props.requestIds.includes(req.id) && req.status === 'submitted'
    )

    console.log('Found submitted requests:', submittedRequests.length)

    if (submittedRequests.length === 0) {
      console.log('No submitted requests found for IDs:', props.requestIds)

      // ✅ НОВАЯ ЛОГИКА: Проверяем, есть ли заявки с другими статусами
      const allRequests = supplierStore.state.requests.filter(req =>
        props.requestIds.includes(req.id)
      )

      if (allRequests.length > 0) {
        const statusCounts = allRequests.reduce(
          (acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        console.log('All requests status breakdown:', statusCounts)

        // Если все заявки converted/approved - показываем сообщение
        emits(
          'error',
          `All selected requests are already processed: ${Object.entries(statusCounts)
            .map(([status, count]) => `${count} ${status}`)
            .join(', ')}`
        )
      } else {
        emits('error', 'No requests found with provided IDs')
      }

      unassignedBasket.value = null
      supplierBaskets.value = []
      return
    }

    // Создаем корзины только для submitted заявок
    await supplierStore.createSupplierBaskets(submittedRequests.map(req => req.id))

    // Копируем данные из store
    const storeBaskets = supplierStore.state.supplierBaskets || []

    // Разделяем на assigned и unassigned
    unassignedBasket.value = storeBaskets.find(basket => basket.supplierId === null) || null
    supplierBaskets.value = storeBaskets.filter(basket => basket.supplierId !== null)

    // ✅ ВАЖНО: Фильтруем только товары, которые НЕ были заказаны
    if (unassignedBasket.value) {
      const originalItemCount = unassignedBasket.value.items.length

      // Здесь нужна логика исключения уже заказанных товаров
      // Пока что показываем все товары из submitted заявок

      console.log(`Unassigned basket: ${unassignedBasket.value.items.length} items`)
    }

    console.log('Baskets refreshed with real data:', {
      requests: submittedRequests.length,
      items: unassignedBasket.value?.items.length || 0,
      totalValue: unassignedBasket.value?.estimatedTotal || 0,
      suppliers: supplierBaskets.value.length
    })
  } catch (error: any) {
    console.error('Error refreshing baskets:', error)
    emits('error', error.message || 'Failed to load supplier baskets')
  } finally {
    isLoading.value = false
  }
}

function getItemCategory(itemId: string): string {
  if (itemId.includes('beef') || itemId.includes('steak')) return 'meat'
  if (
    itemId.includes('potato') ||
    itemId.includes('tomato') ||
    itemId.includes('garlic') ||
    itemId.includes('onion')
  )
    return 'vegetables'
  if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water'))
    return 'beverages'
  if (itemId.includes('butter') || itemId.includes('milk')) return 'dairy'
  return 'other'
}

function getDefaultPrice(itemId: string): number {
  // Fallback prices if estimatedPrice is 0
  const defaultPrices: Record<string, number> = {
    'prod-beef-steak': 180000,
    'prod-potato': 8000,
    'prod-garlic': 25000,
    'prod-beer-bintang-330': 12000,
    'prod-cola-330': 8000,
    'prod-tomato': 12000,
    'prod-onion': 6000
  }
  return defaultPrices[itemId] || 1000
}

function toggleUnassignedItem(itemId: string) {
  const index = selectedUnassignedItems.value.indexOf(itemId)
  if (index > -1) {
    selectedUnassignedItems.value.splice(index, 1)
  } else {
    selectedUnassignedItems.value.push(itemId)
  }
}

function selectAllUnassigned() {
  if (!unassignedBasket.value) return
  selectedUnassignedItems.value = filteredUnassignedItems.value.map(item => item.itemId)
}

function clearAllSelections() {
  selectedUnassignedItems.value = []
}

// ИСПРАВЛЕНО: правильная логика назначения без закрытия диалога
function assignToSupplier(supplierId: string, supplierName: string) {
  console.log('assignToSupplier called:', {
    supplierId,
    supplierName,
    selectedItems: selectedUnassignedItems.value.length
  })

  if (selectedUnassignedItems.value.length === 0 || !unassignedBasket.value) {
    console.log('No items selected or no unassigned basket')
    return
  }

  // Find supplier basket
  let supplierBasket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!supplierBasket) {
    supplierBasket = {
      supplierId,
      supplierName,
      items: [],
      totalItems: 0,
      estimatedTotal: 0
    }
    supplierBaskets.value.push(supplierBasket)
    console.log('Created new supplier basket for:', supplierName)
  }

  // Move selected items
  const itemsToMove = selectedUnassignedItems.value.slice()
  console.log('Moving items:', itemsToMove)

  itemsToMove.forEach(itemId => {
    const itemIndex = unassignedBasket.value!.items.findIndex(item => item.itemId === itemId)
    if (itemIndex > -1) {
      const item = unassignedBasket.value!.items.splice(itemIndex, 1)[0]
      supplierBasket!.items.push(item)
      console.log('Moved item:', item.itemName, 'to', supplierName)
    }
  })

  // Recalculate totals
  updateBasketTotals()

  // Clear selection
  selectedUnassignedItems.value = []

  console.log('Assignment completed. Items in supplier basket:', supplierBasket.items.length)

  // ВАЖНО: НЕ эмитим 'order-created' или другие события которые могут закрыть диалог
  emits('success', `${itemsToMove.length} item(s) assigned to ${supplierName}`)
}

function moveItemToUnassigned(itemId: string, supplierId: string) {
  const supplierBasket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!supplierBasket || !unassignedBasket.value) return

  const itemIndex = supplierBasket.items.findIndex(item => item.itemId === itemId)
  if (itemIndex > -1) {
    const item = supplierBasket.items.splice(itemIndex, 1)[0]
    unassignedBasket.value.items.push(item)
  }

  updateBasketTotals()
  emits('success', 'Item moved to unassigned')
}

function updateBasketTotals() {
  // Update unassigned basket
  if (unassignedBasket.value) {
    unassignedBasket.value.totalItems = unassignedBasket.value.items.length
    unassignedBasket.value.estimatedTotal = unassignedBasket.value.items.reduce(
      (sum, item) => sum + item.estimatedPrice * item.totalQuantity,
      0
    )
  }

  // Update supplier baskets
  supplierBaskets.value.forEach(basket => {
    basket.totalItems = basket.items.length
    basket.estimatedTotal = basket.items.reduce(
      (sum, item) => sum + item.estimatedPrice * item.totalQuantity,
      0
    )
  })
}

async function createOrderFromBasket(basket: SupplierBasket) {
  if (basket.items.length === 0) {
    emits('error', 'Cannot create order from empty basket')
    return
  }

  try {
    isLoading.value = true

    const newOrder = await createOrderFromBasketAction(basket)
    emits('success', `Order ${newOrder.orderNumber} created for ${basket.supplierName}`)

    // Remove items from basket after creating order
    basket.items = []
    updateBasketTotals()
  } catch (error: any) {
    console.error('Error creating order:', error)
    emits('error', error.message || 'Failed to create order')
  } finally {
    isLoading.value = false
  }
}

async function createAllOrders() {
  const readyBaskets = supplierBaskets.value.filter(basket => basket.items.length > 0)

  if (readyBaskets.length === 0) {
    emits('error', 'No baskets ready for order creation')
    return
  }

  try {
    isLoading.value = true
    const createdOrderIds = []

    for (const basket of readyBaskets) {
      const order = await createOrderFromBasketAction(basket)
      createdOrderIds.push(order.id)

      // ИСПРАВЛЕНИЕ: НЕ очищаем корзину, оставляем товары для визуализации
      // basket.items = []
    }

    // ИСПРАВЛЕНИЕ: Показываем сколько товаров осталось неназначенными
    const unassignedCount = unassignedBasket.value?.items.length || 0
    let message = `${createdOrderIds.length} orders created successfully`

    if (unassignedCount > 0) {
      message += `. ${unassignedCount} items remain unassigned - you can assign them later or create additional orders.`
    }

    emits('success', message)

    // ИСПРАВЛЕНИЕ: Не закрываем диалог автоматически, если есть неназначенные товары
    if (unassignedCount === 0) {
      emits('orders-completed')
      emits('order-created', createdOrderIds)
    } else {
      // Просто уведомляем о созданных заказах, но диалог остается открытым
      emits('order-created', createdOrderIds)
    }
  } catch (error: any) {
    console.error('Error creating all orders:', error)
    emits('error', 'Failed to create orders')
  } finally {
    isLoading.value = false
  }
}

function addNewSupplier() {
  const supplier = {
    id: `supplier-${Date.now()}`,
    name: newSupplier.value.name.trim(),
    paymentTerms: newSupplier.value.paymentTerms
  }

  availableSuppliers.value.push(supplier)

  // Add empty basket for new supplier
  supplierBaskets.value.push({
    supplierId: supplier.id,
    supplierName: supplier.name,
    items: [],
    totalItems: 0,
    estimatedTotal: 0
  })

  newSupplier.value = { name: '', paymentTerms: 'Net 30' }
  showNewSupplierDialog.value = false
  emits('success', `Supplier ${supplier.name} added`)
}

function filterByCategory() {
  selectedUnassignedItems.value = []
}

function closeDialog() {
  isOpen.value = false

  setTimeout(() => {
    selectedCategory.value = 'all'
    selectedUnassignedItems.value = []
    showRequestDetails.value = false
    supplierBaskets.value = []
    unassignedBasket.value = null
  }, 300)
}

// Helper functions
function getDepartmentColor(department: string) {
  return department === 'kitchen' ? 'orange' : 'purple'
}

function getDepartmentIcon(department: string) {
  return department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}
</script>
