<!-- src/views/supplier_2/components/supplier_2/BaseSupplierBaskets.vue -->
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
                color="grey"
                variant="outlined"
                size="small"
                prepend-icon="mdi-refresh"
                :loading="isLoading"
                @click="refreshBaskets"
              >
                Refresh
              </v-btn>
            </div>
          </div>

          <!-- Request Details -->
          <v-expand-transition>
            <div v-if="showRequestDetails" class="mt-3">
              <v-row>
                <v-col
                  v-for="request in selectedRequests"
                  :key="request.id"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <v-card variant="outlined" density="compact">
                    <v-card-text class="pa-3">
                      <div class="d-flex align-center justify-space-between mb-2">
                        <div class="text-subtitle-2 font-weight-bold">
                          {{ request.requestNumber }}
                        </div>
                        <v-chip
                          size="small"
                          :color="getDepartmentColor(request.department)"
                          variant="tonal"
                        >
                          {{ request.department }}
                        </v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ request.items.length }} items • {{ request.requestedBy }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="pa-6 text-center">
          <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
          <div class="text-body-1">Grouping items by suppliers...</div>
        </div>

        <!-- Supplier Baskets -->
        <div v-else class="pa-4">
          <!-- Category Filter -->
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center gap-3">
              <div class="text-subtitle-1 font-weight-bold">Supplier Assignment</div>
              <v-chip-group
                v-model="selectedCategory"
                color="primary"
                variant="tonal"
                @update:model-value="filterByCategory"
              >
                <v-chip value="all">All Categories</v-chip>
                <v-chip value="meat">Meat</v-chip>
                <v-chip value="vegetables">Vegetables</v-chip>
                <v-chip value="beverages">Beverages</v-chip>
                <v-chip value="dairy">Dairy</v-chip>
              </v-chip-group>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                v-if="hasUnassignedItems"
                color="warning"
                variant="outlined"
                size="small"
                prepend-icon="mdi-select-all"
                @click="selectAllUnassigned"
              >
                Select All Unassigned
              </v-btn>

              <v-btn
                color="grey"
                variant="text"
                size="small"
                prepend-icon="mdi-select-off"
                @click="clearAllSelections"
              >
                Clear Selections
              </v-btn>
            </div>
          </div>

          <!-- Baskets Container -->
          <v-row>
            <!-- Unassigned Items Basket -->
            <v-col cols="12" lg="6">
              <v-card
                variant="outlined"
                class="basket-card h-100"
                :class="{ 'basket-warning': hasUnassignedItems }"
              >
                <v-card-title
                  class="d-flex align-center justify-space-between pa-3 bg-warning-lighten-4"
                >
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-help-circle" color="warning" class="mr-2" />
                    <div>
                      <div class="text-subtitle-1 font-weight-bold">Unassigned Items</div>
                      <div class="text-caption">
                        {{ unassignedBasket?.totalItems || 0 }} items •
                        {{ formatCurrency(unassignedBasket?.estimatedTotal || 0) }}
                      </div>
                    </div>
                  </div>

                  <v-menu>
                    <template #activator="{ props: menuProps }">
                      <v-btn
                        v-bind="menuProps"
                        color="primary"
                        variant="flat"
                        size="small"
                        prepend-icon="mdi-account-plus"
                        :disabled="selectedUnassignedItems.length === 0"
                      >
                        Assign to Supplier
                      </v-btn>
                    </template>

                    <v-list>
                      <v-list-item
                        v-for="supplier in availableSuppliers"
                        :key="supplier.id"
                        @click="assignToSupplier(supplier.id, supplier.name)"
                      >
                        <v-list-item-title>{{ supplier.name }}</v-list-item-title>
                        <v-list-item-subtitle>{{ supplier.paymentTerms }}</v-list-item-subtitle>
                      </v-list-item>

                      <v-divider />

                      <v-list-item @click="showNewSupplierDialog = true">
                        <v-list-item-title>
                          <v-icon icon="mdi-plus" class="mr-2" />
                          Add New Supplier
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-card-title>

                <v-card-text class="pa-0 basket-content">
                  <div
                    v-if="!unassignedBasket || unassignedBasket.items.length === 0"
                    class="pa-4 text-center"
                  >
                    <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-2" />
                    <div class="text-body-2 text-medium-emphasis">
                      All items assigned to suppliers
                    </div>
                  </div>

                  <div v-else>
                    <div
                      v-for="item in filteredUnassignedItems"
                      :key="item.itemId"
                      class="item-row"
                      :class="{ 'item-selected': selectedUnassignedItems.includes(item.itemId) }"
                      @click="toggleUnassignedItem(item.itemId)"
                    >
                      <div class="d-flex align-center pa-3">
                        <v-checkbox-btn
                          :model-value="selectedUnassignedItems.includes(item.itemId)"
                          color="primary"
                          class="mr-3"
                          @click.stop="toggleUnassignedItem(item.itemId)"
                        />

                        <div class="flex-grow-1">
                          <div class="d-flex align-center justify-space-between">
                            <div>
                              <div class="text-subtitle-2 font-weight-bold">
                                {{ item.itemName }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ item.totalQuantity }} {{ item.unit }} •
                                {{ formatCurrency(item.estimatedPrice) }}/{{ item.unit }}
                              </div>
                              <div class="text-caption">
                                <v-chip
                                  size="x-small"
                                  :color="getCategoryColor(item.category)"
                                  variant="tonal"
                                  class="mr-1"
                                >
                                  {{ item.category }}
                                </v-chip>
                                From {{ item.sources.length }} request(s)
                              </div>
                            </div>

                            <div class="text-right">
                              <div class="text-subtitle-2 font-weight-bold">
                                {{ formatCurrency(item.totalQuantity * item.estimatedPrice) }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Supplier Baskets -->
            <v-col cols="12" lg="6">
              <div class="supplier-baskets-container">
                <div v-for="basket in supplierBaskets" :key="basket.supplierId" class="mb-3">
                  <v-card
                    variant="outlined"
                    class="basket-card"
                    :class="{ 'basket-ready': basket.items.length > 0 }"
                  >
                    <v-card-title
                      class="d-flex align-center justify-space-between pa-3 bg-success-lighten-4"
                    >
                      <div class="d-flex align-center">
                        <v-icon icon="mdi-store" color="success" class="mr-2" />
                        <div>
                          <div class="text-subtitle-1 font-weight-bold">
                            {{ basket.supplierName }}
                          </div>
                          <div class="text-caption">
                            {{ basket.totalItems }} items •
                            {{ formatCurrency(basket.estimatedTotal) }}
                          </div>
                        </div>
                      </div>

                      <div class="d-flex gap-2">
                        <v-btn
                          v-if="basket.items.length > 0"
                          color="success"
                          variant="flat"
                          size="small"
                          prepend-icon="mdi-cart-plus"
                          @click="createOrderFromBasket(basket)"
                        >
                          Create Order
                        </v-btn>

                        <v-btn
                          v-if="basket.items.length > 0"
                          color="grey"
                          variant="outlined"
                          size="small"
                          icon="mdi-delete"
                          @click="clearBasket(basket.supplierId!)"
                        />
                      </div>
                    </v-card-title>

                    <v-card-text class="pa-0 basket-content">
                      <div v-if="basket.items.length === 0" class="pa-4 text-center">
                        <v-icon icon="mdi-cart-outline" color="grey" size="32" class="mb-2" />
                        <div class="text-body-2 text-medium-emphasis">No items assigned yet</div>
                      </div>

                      <div v-else>
                        <div v-for="item in basket.items" :key="item.itemId" class="item-row">
                          <div class="d-flex align-center justify-space-between pa-3">
                            <div class="flex-grow-1">
                              <div class="text-subtitle-2 font-weight-bold">
                                {{ item.itemName }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ item.totalQuantity }} {{ item.unit }} •
                                {{ formatCurrency(item.estimatedPrice) }}/{{ item.unit }}
                              </div>
                            </div>

                            <div class="d-flex align-center gap-2">
                              <div class="text-subtitle-2 font-weight-bold">
                                {{ formatCurrency(item.totalQuantity * item.estimatedPrice) }}
                              </div>
                              <v-btn
                                icon="mdi-arrow-left"
                                variant="text"
                                size="small"
                                color="warning"
                                @click="moveToUnassigned(item.itemId, basket.supplierId!)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>

                <!-- Add Supplier Button -->
                <v-btn
                  color="primary"
                  variant="outlined"
                  block
                  prepend-icon="mdi-plus"
                  @click="showNewSupplierDialog = true"
                >
                  Add New Supplier
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t bg-surface">
        <div class="d-flex align-center">
          <v-icon icon="mdi-information" color="info" class="mr-2" />
          <div class="text-body-2 text-medium-emphasis">
            {{ completedBaskets }} of {{ totalBaskets }} suppliers ready for orders
          </div>
        </div>

        <v-spacer />

        <v-btn color="grey" variant="outlined" @click="closeDialog">Cancel</v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-cart-multiple"
          :disabled="completedBaskets === 0"
          @click="createAllOrders"
        >
          Create All Orders ({{ completedBaskets }})
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- New Supplier Dialog -->
    <v-dialog v-model="showNewSupplierDialog" max-width="500px">
      <v-card>
        <v-card-title>Add New Supplier</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSupplier.name"
            label="Supplier Name"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="newSupplier.paymentTerms"
            label="Payment Terms"
            variant="outlined"
            placeholder="e.g., Net 30"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showNewSupplierDialog = false">Cancel</v-btn>
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
  (e: 'success', message: string): void
  (e: 'error', message: string): void
  (e: 'order-created', orderIds: string[]): void
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

const { createOrderFromBasket: createOrderFromBasketAction, formatCurrency: formatOrderCurrency } =
  usePurchaseOrders()

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

// Mock data
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

const totalBaskets = computed(() => {
  return supplierBaskets.value.length
})

// =============================================
// METHODS
// =============================================

async function refreshBaskets() {
  try {
    isLoading.value = true

    // Mock basket creation
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create mock baskets
    unassignedBasket.value = {
      supplierId: null,
      supplierName: 'Unassigned',
      items: [
        {
          itemId: 'prod-beef-steak',
          itemName: 'Beef Steak',
          category: 'meat',
          totalQuantity: 5,
          unit: 'kg',
          estimatedPrice: 180000,
          sources: [
            {
              requestId: 'req-001',
              requestNumber: 'REQ-KITCHEN-001',
              department: 'kitchen',
              quantity: 5
            }
          ]
        },
        {
          itemId: 'prod-potato',
          itemName: 'Potato',
          category: 'vegetables',
          totalQuantity: 10,
          unit: 'kg',
          estimatedPrice: 8000,
          sources: [
            {
              requestId: 'req-001',
              requestNumber: 'REQ-KITCHEN-001',
              department: 'kitchen',
              quantity: 10
            }
          ]
        }
      ],
      totalItems: 2,
      estimatedTotal: 980000
    }

    supplierBaskets.value = []
  } catch (error) {
    console.error('Error refreshing baskets:', error)
    emits('error', 'Failed to refresh supplier baskets')
  } finally {
    isLoading.value = false
  }
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

function assignToSupplier(supplierId: string, supplierName: string) {
  if (selectedUnassignedItems.value.length === 0) return

  // Find or create supplier basket
  let basket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!basket) {
    basket = {
      supplierId,
      supplierName,
      items: [],
      totalItems: 0,
      estimatedTotal: 0
    }
    supplierBaskets.value.push(basket)
  }

  // Move items from unassigned to supplier basket
  selectedUnassignedItems.value.forEach(itemId => {
    const itemIndex = unassignedBasket.value!.items.findIndex(item => item.itemId === itemId)
    if (itemIndex > -1) {
      const item = unassignedBasket.value!.items.splice(itemIndex, 1)[0]
      basket!.items.push(item)
    }
  })

  // Recalculate totals
  updateBasketTotals()
  selectedUnassignedItems.value = []
}

function moveToUnassigned(itemId: string, supplierId: string) {
  const basket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!basket || !unassignedBasket.value) return

  const itemIndex = basket.items.findIndex(item => item.itemId === itemId)
  if (itemIndex > -1) {
    const item = basket.items.splice(itemIndex, 1)[0]
    unassignedBasket.value.items.push(item)
    updateBasketTotals()
  }
}

function clearBasket(supplierId: string) {
  const basket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!basket || !unassignedBasket.value) return

  // Move all items back to unassigned
  basket.items.forEach(item => {
    unassignedBasket.value!.items.push(item)
  })

  basket.items = []
  updateBasketTotals()
}

function updateBasketTotals() {
  // Update unassigned basket
  if (unassignedBasket.value) {
    unassignedBasket.value.totalItems = unassignedBasket.value.items.length
    unassignedBasket.value.estimatedTotal = unassignedBasket.value.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )
  }

  // Update supplier baskets
  supplierBaskets.value.forEach(basket => {
    basket.totalItems = basket.items.length
    basket.estimatedTotal = basket.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )
  })
}

async function createOrderFromBasket(basket: SupplierBasket) {
  try {
    // Use the action from composable
    await createOrderFromBasketAction(basket)

    const orderNumber = `PO-${Date.now().toString().slice(-3)}`
    emits('success', `Order ${orderNumber} created for ${basket.supplierName}`)

    // Remove basket after order creation
    const index = supplierBaskets.value.findIndex(b => b.supplierId === basket.supplierId)
    if (index > -1) {
      supplierBaskets.value.splice(index, 1)
    }
  } catch (error) {
    console.error('Error creating order:', error)
    emits('error', 'Failed to create order')
  }
}

async function createAllOrders() {
  const readyBaskets = supplierBaskets.value.filter(basket => basket.items.length > 0)

  try {
    const createdOrders = []

    for (const basket of readyBaskets) {
      await createOrderFromBasket(basket)
      createdOrders.push(`PO-${Date.now()}`)
    }

    emits('order-created', createdOrders)
    closeDialog()
  } catch (error) {
    console.error('Error creating all orders:', error)
    emits('error', 'Failed to create some orders')
  }
}

function addNewSupplier() {
  const supplier = {
    id: `supplier-${Date.now()}`,
    name: newSupplier.value.name.trim(),
    paymentTerms: newSupplier.value.paymentTerms
  }

  availableSuppliers.value.push(supplier)

  // Reset form
  newSupplier.value = { name: '', paymentTerms: 'Net 30' }
  showNewSupplierDialog.value = false

  emits('success', `Supplier ${supplier.name} added successfully`)
}

function filterByCategory() {
  selectedUnassignedItems.value = []
}

function closeDialog() {
  isOpen.value = false

  // Reset state
  setTimeout(() => {
    selectedUnassignedItems.value = []
    selectedCategory.value = 'all'
    showRequestDetails.value = false
  }, 300)
}

// Helper functions
function getDepartmentColor(department: string) {
  return department === 'kitchen' ? 'orange' : 'blue'
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    meat: 'red',
    vegetables: 'green',
    beverages: 'blue',
    dairy: 'yellow',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.requestIds,
  newIds => {
    if (newIds.length > 0 && isOpen.value) {
      refreshBaskets()
    }
  }
)

watch(isOpen, newValue => {
  if (newValue && props.requestIds.length > 0) {
    refreshBaskets()
  }
})
</script>

<style lang="scss" scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.basket-card {
  transition: all 0.2s ease;

  &.basket-warning {
    border-left: 4px solid rgb(var(--v-theme-warning));
  }

  &.basket-ready {
    border-left: 4px solid rgb(var(--v-theme-success));
  }
}

.basket-content {
  max-height: 300px;
  overflow-y: auto;
}

.item-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));

  &:hover {
    background-color: rgb(var(--v-theme-surface-variant), 0.1);
  }

  &.item-selected {
    background-color: rgb(var(--v-theme-primary), 0.1);
  }

  &:last-child {
    border-bottom: none;
  }
}

.supplier-baskets-container {
  max-height: 600px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Responsive adjustments
@media (max-width: 1024px) {
  .basket-content {
    max-height: 250px;
  }

  .supplier-baskets-container {
    max-height: 500px;
  }
}
</style>
