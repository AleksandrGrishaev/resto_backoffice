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
                variant="tonal"
                color="primary"
                size="small"
                prepend-icon="mdi-content-save-outline"
                :disabled="completedBaskets === 0 || isLoading"
                :loading="isLoading && !isSending"
                @click="saveAllDrafts"
              >
                Save Drafts ({{ completedBaskets }})
              </v-btn>
              <v-btn
                color="success"
                variant="flat"
                size="small"
                prepend-icon="mdi-send"
                :disabled="completedBaskets === 0 || isLoading"
                :loading="isSending"
                @click="sendAllOrders"
              >
                Send to Supplier ({{ completedBaskets }})
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
          <!-- Unassigned Items Widget -->
          <div v-if="hasUnassignedItems" class="mb-6">
            <UnassignedItemsWidget
              :items="unassignedBasket?.items || []"
              :suppliers="availableSuppliers"
              @assign-to-supplier="handleAssignToSupplier"
            />
          </div>

          <!-- Supplier Baskets Widget -->
          <div v-if="completedBaskets > 0">
            <SupplierBasketsWidget
              :baskets="supplierBaskets"
              @create-order="createOrderFromBasket"
              @move-to-unassigned="handleMoveToUnassigned"
              @add-supplier="showNewSupplierDialog = true"
              @package-selected="handlePackageSelected"
              @package-id-updated="handlePackageIdUpdated"
              @items-initialized="updateBasketTotals"
            />
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
          variant="tonal"
          color="primary"
          prepend-icon="mdi-content-save-outline"
          :disabled="completedBaskets === 0 || isLoading"
          :loading="isLoading && !isSending"
          @click="saveAllDrafts"
        >
          Save Drafts
        </v-btn>
        <v-btn
          color="success"
          prepend-icon="mdi-send"
          class="ml-2"
          :disabled="completedBaskets === 0 || isLoading"
          :loading="isSending"
          @click="sendAllOrders"
        >
          Send to Supplier
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
import { useCounteragentsStore } from '@/stores/counteragents'
import { useProductsStore } from '@/stores/productsStore'
import { isUnitDivisible } from '@/types/measurementUnits'
import type { SupplierBasket } from '@/stores/supplier_2/types'
import UnassignedItemsWidget from './basket/UnassignedItemsWidget.vue'
import SupplierBasketsWidget from './basket/SupplierBasketsWidget.vue'

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
  (e: 'orders-completed'): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const { selectedRequestIds, formatCurrency } = useProcurementRequests()
const { createOrderFromBasket: createOrderFromBasketAction, sendOrder } = usePurchaseOrders()
const supplierStore = useSupplierStore()
const counteragentsStore = useCounteragentsStore()
const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const isLoading = ref(false)
const isSending = ref(false)
const showRequestDetails = ref(false)
const showNewSupplierDialog = ref(false)

const supplierBaskets = ref<SupplierBasket[]>([])
const unassignedBasket = ref<SupplierBasket | null>(null)

const newSupplier = ref({
  name: '',
  paymentTerms: 'Net 30'
})

const availableSuppliers = computed(() => {
  return counteragentsStore.supplierCounterAgents
    .filter(supplier => supplier.isActive)
    .map(supplier => ({
      id: supplier.id,
      name: supplier.displayName || supplier.name,
      paymentTerms: supplier.paymentTerms || 'on_delivery'
    }))
})

// =============================================
// COMPUTED
// =============================================

const selectedRequests = computed(() => {
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

// =============================================
// WATCHERS
// =============================================

watch(isOpen, newValue => {
  if (newValue && props.requestIds.length > 0) {
    console.log('Dialog opened, refreshing baskets for:', props.requestIds)
    refreshBaskets()
  }
})

// =============================================
// METHODS
// =============================================

async function refreshBaskets() {
  try {
    isLoading.value = true

    console.log('Refreshing baskets for request IDs:', props.requestIds)

    const submittedRequests = supplierStore.state.requests.filter(
      req => props.requestIds.includes(req.id) && req.status === 'submitted'
    )

    console.log('Found submitted requests:', submittedRequests.length)

    if (submittedRequests.length === 0) {
      console.log('No submitted requests found for IDs:', props.requestIds)

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

    await supplierStore.createSupplierBaskets(submittedRequests.map(req => req.id))

    const storeBaskets = supplierStore.state.supplierBaskets || []

    unassignedBasket.value = storeBaskets.find(basket => basket.supplierId === null) || null
    supplierBaskets.value = storeBaskets.filter(basket => basket.supplierId !== null)

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

function handleAssignToSupplier(supplierId: string, supplierName: string, itemIds: string[]) {
  console.log('handleAssignToSupplier:', { supplierId, supplierName, itemIds })

  if (itemIds.length === 0 || !unassignedBasket.value) {
    console.log('No items or no unassigned basket')
    return
  }

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

  itemIds.forEach(itemId => {
    const itemIndex = unassignedBasket.value!.items.findIndex(item => item.itemId === itemId)
    if (itemIndex > -1) {
      const item = unassignedBasket.value!.items.splice(itemIndex, 1)[0]

      console.log('📦 Item before processing:', {
        itemName: item.itemName,
        packageId: item.packageId,
        packageName: item.packageName,
        packageQuantity: item.packageQuantity,
        recommendedPackageId: item.recommendedPackageId
      })

      // ✅ FIX: Если есть packageId из request - используем его
      if (item.packageId) {
        const pkg = productsStore.getPackageById(item.packageId)
        if (pkg) {
          // Пересчитываем количество упаковок если нужно
          if (!item.packageQuantity) {
            const rawQty = item.totalQuantity / pkg.packageSize
            item.packageQuantity = isUnitDivisible(item.unit)
              ? Math.round(rawQty * 100) / 100
              : Math.ceil(rawQty)
          }

          // Обновляем цену если нужно
          if (!item.estimatedPackagePrice) {
            const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
            item.estimatedPackagePrice = packagePrice
          }

          console.log('✅ Package from request preserved:', {
            item: item.itemName,
            package: pkg.packageName,
            quantity: item.packageQuantity,
            price: item.estimatedPackagePrice
          })
        }
      }
      // Fallback: если нет packageId, но есть recommendedPackageId
      else if (item.recommendedPackageId) {
        const pkg = productsStore.getPackageById(item.recommendedPackageId)
        if (pkg) {
          item.packageId = item.recommendedPackageId
          item.packageName = item.recommendedPackageName

          const rawQty = item.totalQuantity / pkg.packageSize
          item.packageQuantity = isUnitDivisible(item.unit)
            ? Math.round(rawQty * 100) / 100
            : Math.ceil(rawQty)

          const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
          item.estimatedPackagePrice = packagePrice

          console.log('Auto-initialized from recommendedPackage:', {
            item: item.itemName,
            package: pkg.packageName,
            quantity: item.packageQuantity,
            price: item.estimatedPackagePrice
          })
        }
      }

      supplierBasket!.items.push(item)
      console.log(
        'Moved item:',
        item.itemName,
        'to',
        supplierName,
        'with packageId:',
        item.packageId
      )
    }
  })

  updateBasketTotals()

  emits('success', `${itemIds.length} item(s) assigned to ${supplierName}`)
}

function handleMoveToUnassigned(itemId: string, supplierId: string) {
  const supplierBasket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!supplierBasket || !unassignedBasket.value) return

  const itemIndex = supplierBasket.items.findIndex(item => item.itemId === itemId)
  if (itemIndex > -1) {
    const item = supplierBasket.items.splice(itemIndex, 1)[0]

    // ✅ Сохраняем выбранную упаковку в рекомендованную при возврате
    if (item.packageId) {
      item.recommendedPackageId = item.packageId
      item.recommendedPackageName = item.packageName
    }

    unassignedBasket.value.items.push(item)
  }

  updateBasketTotals()
  emits('success', 'Item moved to unassigned')
}

function handlePackageSelected(
  supplierId: string,
  itemId: string,
  data: {
    packageId: string
    packageQuantity: number
    resultingBaseQuantity: number
    totalCost: number
  }
) {
  const basket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!basket) return

  const item = basket.items.find(i => i.itemId === itemId)
  if (!item) return

  const pkg = productsStore.getPackageById(data.packageId)
  if (pkg) {
    item.packageId = pkg.id
    item.packageName = pkg.packageName
    item.packageQuantity = data.packageQuantity

    // ✅ ИСПРАВЛЕНО: Используем item.estimatedBaseCost из request, не из продукта
    // estimatedBaseCost - это цена за базовую единицу из request (user-entered или weighted average)
    const totalCostFromRequest = item.estimatedBaseCost * data.resultingBaseQuantity
    item.estimatedPackagePrice = totalCostFromRequest / data.packageQuantity

    console.log('Package selected:', {
      item: item.itemName,
      package: pkg.packageName,
      quantity: data.packageQuantity,
      estimatedBaseCost: item.estimatedBaseCost,
      resultingBaseQuantity: data.resultingBaseQuantity,
      pricePerPackage: item.estimatedPackagePrice,
      total: totalCostFromRequest
    })
  }

  updateBasketTotals()
}

function handlePackageIdUpdated(supplierId: string, itemId: string, packageId: string | undefined) {
  const basket = supplierBaskets.value.find(b => b.supplierId === supplierId)
  if (!basket) return

  const item = basket.items.find(i => i.itemId === itemId)
  if (!item) return

  if (!packageId) {
    item.packageId = undefined
    item.packageName = undefined
    item.packageQuantity = undefined
    item.estimatedPackagePrice = undefined
    return
  }

  const pkg = productsStore.getPackageById(packageId)
  if (pkg) {
    item.packageId = pkg.id
    item.packageName = pkg.packageName
    item.estimatedPackagePrice = pkg.estimatedPrice
  }

  updateBasketTotals()
}

function updateBasketTotals() {
  console.log('=== UPDATE BASKET TOTALS ===')

  // Unassigned - по базовой стоимости
  if (unassignedBasket.value) {
    unassignedBasket.value.totalItems = unassignedBasket.value.items.length
    unassignedBasket.value.estimatedTotal = unassignedBasket.value.items.reduce((sum, item) => {
      const cost = (item.estimatedBaseCost || 0) * item.totalQuantity
      console.log(`  Unassigned: ${item.itemName} = ${cost}`)
      return sum + cost
    }, 0)
    console.log(`📦 Unassigned Total: ${unassignedBasket.value.estimatedTotal}`)
  }

  // Supplier baskets - по упаковкам
  supplierBaskets.value.forEach(basket => {
    basket.totalItems = basket.items.length

    console.log(`\n🏪 ${basket.supplierName}:`)

    basket.estimatedTotal = basket.items.reduce((sum, item) => {
      let itemCost = 0

      // Если есть полные данные об упаковке
      if (item.packageId && item.packageQuantity && item.estimatedPackagePrice) {
        itemCost = item.estimatedPackagePrice * item.packageQuantity
        console.log(
          `  ✅ ${item.itemName}: ${item.packageQuantity} × ${item.estimatedPackagePrice} = ${itemCost}`
        )
      }
      // Если есть packageId но нет цены - рассчитываем из estimatedBaseCost
      else if (item.packageId && item.packageQuantity) {
        const pkg = productsStore.getPackageById(item.packageId)
        if (pkg) {
          // ✅ ИСПРАВЛЕНО: Используем item.estimatedBaseCost из request, не из продукта
          const packagePrice = (item.estimatedBaseCost || 0) * pkg.packageSize
          itemCost = packagePrice * item.packageQuantity
          console.log(
            `  📦 ${item.itemName}: ${item.packageQuantity} × ${packagePrice} = ${itemCost} (from request price)`
          )
        } else {
          itemCost = (item.estimatedBaseCost || 0) * item.totalQuantity
          console.log(`  ⚠️ ${item.itemName}: package not found, using base = ${itemCost}`)
        }
      }
      // Fallback на базовую стоимость
      else {
        itemCost = (item.estimatedBaseCost || 0) * item.totalQuantity
        console.log(`  ⚠️ ${item.itemName}: no package, using base = ${itemCost}`)
      }

      return sum + itemCost
    }, 0)

    console.log(`  💰 ${basket.supplierName} Total: ${basket.estimatedTotal}`)
  })

  console.log('=== END UPDATE ===\n')
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

    basket.items = []
    updateBasketTotals()
  } catch (error: any) {
    console.error('Error creating order:', error)
    emits('error', error.message || 'Failed to create order')
  } finally {
    isLoading.value = false
  }
}

async function saveAllDrafts() {
  if (isLoading.value || isSending.value) return

  const readyBaskets = supplierBaskets.value.filter(basket => basket.items.length > 0)

  if (readyBaskets.length === 0) {
    emits('error', 'No baskets ready for order creation')
    return
  }

  try {
    isLoading.value = true
    const createdOrderIds: string[] = []

    for (const basket of readyBaskets) {
      const order = await createOrderFromBasketAction(basket)
      createdOrderIds.push(order.id)
      // Clear basket immediately after successful creation to prevent duplicates
      basket.items = []
    }

    updateBasketTotals()

    const unassignedCount = unassignedBasket.value?.items.length || 0
    let message = `${createdOrderIds.length} draft orders saved successfully`

    if (unassignedCount > 0) {
      message += `. ${unassignedCount} items remain unassigned.`
    }

    emits('success', message)

    if (unassignedCount === 0) {
      emits('orders-completed')
      emits('order-created', createdOrderIds)
    } else {
      emits('order-created', createdOrderIds)
    }
  } catch (error: any) {
    console.error('Error saving draft orders:', error)
    emits('error', 'Failed to save draft orders')
  } finally {
    isLoading.value = false
  }
}

async function sendAllOrders() {
  if (isLoading.value || isSending.value) return

  const readyBaskets = supplierBaskets.value.filter(basket => basket.items.length > 0)

  if (readyBaskets.length === 0) {
    emits('error', 'No baskets ready for order creation')
    return
  }

  try {
    isLoading.value = true
    isSending.value = true
    const createdOrderIds: string[] = []

    for (const basket of readyBaskets) {
      // Create order first
      const order = await createOrderFromBasketAction(basket)
      // Then send it to supplier
      await sendOrder(order.id)
      createdOrderIds.push(order.id)
      // Clear basket immediately after successful creation to prevent duplicates
      basket.items = []
    }

    updateBasketTotals()

    const unassignedCount = unassignedBasket.value?.items.length || 0
    let message = `${createdOrderIds.length} orders sent to suppliers`

    if (unassignedCount > 0) {
      message += `. ${unassignedCount} items remain unassigned.`
    }

    emits('success', message)

    if (unassignedCount === 0) {
      emits('orders-completed')
      emits('order-created', createdOrderIds)
    } else {
      emits('order-created', createdOrderIds)
    }
  } catch (error: any) {
    console.error('Error sending orders:', error)
    emits('error', 'Failed to send orders to suppliers')
  } finally {
    isLoading.value = false
    isSending.value = false
  }
}

function addNewSupplier() {
  const supplier = {
    id: `supplier-${Date.now()}`,
    name: newSupplier.value.name.trim(),
    paymentTerms: newSupplier.value.paymentTerms
  }

  availableSuppliers.value.push(supplier)

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

function closeDialog() {
  isOpen.value = false

  setTimeout(() => {
    showRequestDetails.value = false
    supplierBaskets.value = []
    unassignedBasket.value = null
  }, 300)
}

function getDepartmentColor(department: string) {
  return department === 'kitchen' ? 'orange' : 'purple'
}

function getDepartmentIcon(department: string) {
  return department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}
</script>
