<!-- src/views/supplier/components/consolidation/NewOrdersTab.vue -->
<template>
  <div class="new-orders-tab">
    <!-- Simple Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h3 class="text-h5 font-weight-bold">Consolidation Orders</h3>
        <p class="text-body-2 text-medium-emphasis ma-0">
          Create purchase orders from approved requests
        </p>
      </div>

      <v-chip :color="currentStep === 3 ? 'success' : 'primary'" size="default" variant="tonal">
        {{ getStatusText() }}
      </v-chip>
    </div>

    <!-- Step Content -->
    <div class="workflow-content">
      <!-- Step 1: Request Selection -->
      <div v-if="currentStep === 1">
        <request-selection-card
          :requests="supplierStore.approvedRequests"
          :loading="supplierStore.state.loading.requests"
          @consolidate="handleConsolidation"
        />

        <!-- Quick Actions -->
        <v-card variant="outlined" class="mt-4">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="font-weight-medium">Need more requests?</div>
                <div class="text-caption text-medium-emphasis">
                  Create or approve procurement requests
                </div>
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="$emit('create-request')"
                >
                  Create Request
                </v-btn>
                <v-btn
                  color="primary"
                  variant="text"
                  size="small"
                  prepend-icon="mdi-refresh"
                  @click="refreshRequests"
                >
                  Refresh
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Step 2: Product-Focused Preview -->
      <div v-if="currentStep === 2">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6">Order Preview</div>
              <div class="text-caption text-medium-emphasis">
                {{ currentConsolidation?.supplierGroups.length }} orders will be created
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn variant="outlined" size="small" @click="goBackToSelection">
                Edit Selection
              </v-btn>
              <v-btn
                color="success"
                variant="flat"
                size="small"
                prepend-icon="mdi-check"
                :loading="supplierStore.state.loading.consolidation"
                @click="handleCreateOrders"
              >
                Create Orders
              </v-btn>
            </div>
          </v-card-title>

          <v-divider />

          <!-- Product-Focused Order Preview -->
          <div v-if="currentConsolidation">
            <div
              v-for="(group, index) in currentConsolidation.supplierGroups"
              :key="group.supplierId"
              class="supplier-group"
            >
              <!-- Supplier Header -->
              <div class="supplier-header pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-avatar size="32" color="primary" class="mr-3">
                      <span class="text-caption font-weight-bold">
                        {{ group.supplierName.charAt(0) }}
                      </span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">{{ group.supplierName }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Order #{{ index + 1 }} • {{ group.items.length }} products
                      </div>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-h6 font-weight-bold text-success">
                      {{ formatCurrency(group.totalAmount) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Total Amount</div>
                  </div>
                </div>
              </div>

              <!-- Products Grid -->
              <div class="products-grid pa-4 pt-0">
                <v-row>
                  <v-col v-for="item in group.items" :key="item.id" cols="12" sm="6" md="4">
                    <v-card variant="outlined" class="product-card h-100" hover>
                      <v-card-text class="pa-3">
                        <!-- Product Header -->
                        <div class="d-flex align-center mb-2">
                          <v-avatar size="24" color="surface-variant" class="mr-2">
                            <v-icon :icon="getProductIcon(item.category)" size="14" />
                          </v-avatar>
                          <div class="font-weight-medium text-body-2">
                            {{ item.productName }}
                          </div>
                        </div>

                        <!-- Product Details -->
                        <div class="product-details mb-3">
                          <div class="d-flex justify-space-between align-center mb-1">
                            <span class="text-caption text-medium-emphasis">Quantity:</span>
                            <span class="text-caption font-weight-medium">
                              {{ item.quantity }} {{ item.unit }}
                            </span>
                          </div>

                          <div class="d-flex justify-space-between align-center mb-1">
                            <span class="text-caption text-medium-emphasis">Unit Price:</span>
                            <span class="text-caption font-weight-medium">
                              {{ formatCurrency(item.unitPrice) }}
                            </span>
                          </div>

                          <div v-if="item.specifications" class="text-caption text-medium-emphasis">
                            {{ item.specifications }}
                          </div>
                        </div>

                        <!-- Product Total -->
                        <v-divider class="mb-2" />
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-body-2 font-weight-medium">Total:</span>
                          <span class="text-body-2 font-weight-bold text-primary">
                            {{ formatCurrency(item.totalPrice) }}
                          </span>
                        </div>

                        <!-- Request Source -->
                        <div class="mt-2">
                          <v-chip size="x-small" variant="tonal" color="info">
                            Request #{{ item.requestId.slice(-4) }}
                          </v-chip>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>

              <v-divider v-if="index < currentConsolidation.supplierGroups.length - 1" />
            </div>
          </div>
        </v-card>
      </div>

      <!-- Step 3: Success State -->
      <div v-if="currentStep === 3">
        <v-card class="text-center pa-8">
          <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4" />

          <div class="text-h5 font-weight-bold text-success mb-2">Orders Created Successfully!</div>

          <div class="text-body-1 text-medium-emphasis mb-6">
            {{ generatedOrdersCount }} purchase order{{ generatedOrdersCount !== 1 ? 's' : '' }}
            created from your consolidation
          </div>

          <!-- Created Orders Summary -->
          <v-row v-if="generatedOrders.length > 0" class="mb-6">
            <v-col
              v-for="order in generatedOrders.slice(0, 4)"
              :key="order.id"
              cols="12"
              sm="6"
              md="3"
            >
              <v-card variant="tonal" color="success">
                <v-card-text class="pa-4">
                  <div class="font-weight-medium mb-1">
                    {{ order.orderNumber }}
                  </div>
                  <div class="text-caption text-medium-emphasis mb-2">
                    {{ order.supplierName }}
                  </div>
                  <div class="text-h6 font-weight-bold text-success">
                    {{ formatCurrency(order.totalAmount) }}
                  </div>
                  <div class="text-caption">{{ order.items.length }} products</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col v-if="generatedOrders.length > 4" cols="12" sm="6" md="3">
              <v-card variant="outlined" class="d-flex align-center justify-center h-100">
                <v-card-text class="text-center">
                  <div class="text-h6 font-weight-bold">+{{ generatedOrders.length - 4 }}</div>
                  <div class="text-caption text-medium-emphasis">more orders</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Actions -->
          <div class="d-flex justify-center gap-3">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-package-variant"
              @click="viewGeneratedOrders"
            >
              View All Orders
            </v-btn>
            <v-btn
              color="success"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="startNewConsolidation"
            >
              New Consolidation
            </v-btn>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Compact Stats -->
    <v-card variant="flat" color="surface" class="mt-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <div class="text-body-2 font-weight-medium text-medium-emphasis">Today's Activity</div>
          <div class="d-flex gap-6">
            <div class="text-center">
              <div class="text-subtitle-2 font-weight-bold">
                {{ todayStats.consolidations }}
              </div>
              <div class="text-caption text-medium-emphasis">Consolidations</div>
            </div>
            <div class="text-center">
              <div class="text-subtitle-2 font-weight-bold">
                {{ todayStats.orders }}
              </div>
              <div class="text-caption text-medium-emphasis">Orders</div>
            </div>
            <div class="text-center">
              <div class="text-subtitle-2 font-weight-bold">
                {{ formatCurrency(todayStats.totalValue) }}
              </div>
              <div class="text-caption text-medium-emphasis">Total Value</div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import { formatCurrency } from '@/stores/supplier'
import type { RequestConsolidation, PurchaseOrder } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

// Import consolidation components
import RequestSelectionCard from './RequestSelectionCard.vue'

const MODULE_NAME = 'NewOrdersTab'

// Emits
const emit = defineEmits<{
  'create-request': []
  'view-orders': [orderIds: string[]]
  error: [message: string]
  success: [message: string]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const currentStep = ref(1)
const currentConsolidation = ref<RequestConsolidation | null>(null)
const generatedOrders = ref<PurchaseOrder[]>([])

// Computed
const generatedOrdersCount = computed(() => generatedOrders.value.length)

const todayStats = computed(() => {
  const today = new Date().toISOString().split('T')[0]

  const todayConsolidations = supplierStore.state.consolidations.filter(c =>
    c.consolidationDate.startsWith(today)
  )

  const todayOrders = supplierStore.state.purchaseOrders.filter(o => o.orderDate.startsWith(today))

  return {
    consolidations: todayConsolidations.length,
    orders: todayOrders.length,
    totalValue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  }
})

// Methods
function getStatusText(): string {
  switch (currentStep.value) {
    case 1:
      return 'Select Requests'
    case 2:
      return 'Review Order'
    case 3:
      return 'Orders Created'
    default:
      return 'Unknown'
  }
}

function getProductIcon(category: string): string {
  const icons: Record<string, string> = {
    office: 'mdi-office-building',
    technology: 'mdi-laptop',
    supplies: 'mdi-package-variant',
    furniture: 'mdi-chair-rolling',
    maintenance: 'mdi-tools',
    food: 'mdi-food',
    medical: 'mdi-medical-bag',
    default: 'mdi-package'
  }
  return icons[category.toLowerCase()] || icons.default
}

// Event Handlers
async function handleConsolidation(requestIds: string[]) {
  try {
    DebugUtils.info(MODULE_NAME, 'Starting consolidation', {
      requestIds,
      count: requestIds.length
    })

    const consolidation = await supplierStore.createConsolidation(requestIds, 'Current User')

    currentConsolidation.value = consolidation
    currentStep.value = 2

    emit('success', `Consolidation created with ${requestIds.length} requests`)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create consolidation', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to create consolidation')
  }
}

async function handleCreateOrders() {
  if (!currentConsolidation.value) return

  try {
    const orders = await supplierStore.createOrdersFromConsolidation(currentConsolidation.value.id)

    generatedOrders.value = orders
    currentStep.value = 3

    emit('success', `${orders.length} purchase orders created successfully`)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create orders', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to create orders')
  }
}

function goBackToSelection() {
  currentStep.value = 1
  currentConsolidation.value = null
}

function viewGeneratedOrders() {
  if (generatedOrders.value.length > 0) {
    const orderIds = generatedOrders.value.map(o => o.id)
    emit('view-orders', orderIds)
  }
}

function startNewConsolidation() {
  currentStep.value = 1
  currentConsolidation.value = null
  generatedOrders.value = []
}

async function refreshRequests() {
  try {
    await supplierStore.fetchProcurementRequests()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh requests', { error })
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      supplierStore.fetchProcurementRequests(),
      supplierStore.fetchConsolidations(),
      supplierStore.fetchPurchaseOrders()
    ])
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error })
    emit('error', 'Failed to load consolidation data')
  }
})
</script>

<style lang="scss" scoped>
.new-orders-tab {
  .workflow-content {
    transition: all 0.3s ease;
  }
}

.supplier-group {
  &:not(:last-child) {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}

.supplier-header {
  background: rgba(var(--v-theme-surface), 0.5);
}

.products-grid {
  background: transparent;
}

.product-card {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.product-details {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.2);
  padding-left: 8px;
}

// Success animation
@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.text-success {
  &.animate-success {
    animation: successPulse 0.6s ease-out;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .supplier-header {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 12px;
      text-align: left;
    }
  }

  .products-grid {
    .v-col {
      padding: 4px;
    }
  }
}
</style>
