// src/views/supplier/components/consolidation/NewOrdersTab.vue
<!-- src/views/supplier/components/consolidation/NewOrdersTab.vue -->
<template>
  <div class="new-orders-tab">
    <!-- Workflow Progress Indicator -->
    <v-card variant="tonal" color="info" class="mb-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-progress-check" color="info" class="mr-2" />
          <h4>Consolidation Workflow</h4>
          <v-spacer />
          <v-chip :color="getWorkflowStatusColor()" size="small" variant="flat">
            {{ getWorkflowStatusText() }}
          </v-chip>
        </div>

        <v-stepper
          v-model="currentStep"
          :items="workflowSteps"
          hide-actions
          class="workflow-stepper"
          flat
        >
          <template #icon="{ item }">
            <v-icon :color="getStepColor(item)" :icon="getStepIcon(item)" size="20" />
          </template>
        </v-stepper>
      </v-card-text>
    </v-card>

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
                <div class="font-weight-medium">Need More Requests?</div>
                <div class="text-caption text-medium-emphasis">
                  Create new procurement requests or approve existing ones
                </div>
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-clipboard-plus"
                  @click="$emit('create-request')"
                >
                  Create Request
                </v-btn>
                <v-btn
                  color="info"
                  variant="outlined"
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

      <!-- Step 2: Consolidation Preview -->
      <div v-if="currentStep === 2">
        <consolidation-preview-card
          v-if="currentConsolidation"
          :consolidation="currentConsolidation"
          :creating-orders="supplierStore.state.loading.consolidation"
          @create-orders="handleCreateOrders"
          @edit="handleEditConsolidation"
        />

        <!-- Navigation -->
        <v-card variant="outlined" class="mt-4">
          <v-card-actions class="pa-4">
            <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="goBackToSelection">
              Back to Selection
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="currentConsolidation && currentConsolidation.status === 'processed'"
              color="success"
              variant="flat"
              prepend-icon="mdi-package-variant"
              @click="viewGeneratedOrders"
            >
              View Created Orders
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>

      <!-- Step 3: Orders Created -->
      <div v-if="currentStep === 3">
        <v-card>
          <v-card-text class="pa-6 text-center">
            <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4" />
            <div class="text-h5 font-weight-bold text-success mb-2">
              Orders Created Successfully!
            </div>
            <div class="text-body-1 text-medium-emphasis mb-4">
              {{ generatedOrdersCount }} purchase order{{
                generatedOrdersCount !== 1 ? 's' : ''
              }}
              created from consolidation {{ currentConsolidation?.consolidationNumber }}
            </div>

            <!-- Created Orders Summary -->
            <v-card v-if="generatedOrders.length > 0" variant="tonal" color="success" class="mb-4">
              <v-card-text class="pa-4">
                <div class="text-h6 mb-3">Created Purchase Orders</div>
                <v-row>
                  <v-col v-for="order in generatedOrders" :key="order.id" cols="12" md="6">
                    <v-card variant="outlined">
                      <v-card-text class="pa-3">
                        <div class="d-flex align-center justify-space-between">
                          <div>
                            <div class="font-weight-medium">{{ order.orderNumber }}</div>
                            <div class="text-caption text-medium-emphasis">
                              {{ order.supplierName }}
                            </div>
                          </div>
                          <div class="text-right">
                            <div class="font-weight-bold text-success">
                              {{ formatCurrency(order.totalAmount) }}
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              {{ order.items.length }} items
                            </div>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

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
                prepend-icon="mdi-plus-circle"
                @click="startNewConsolidation"
              >
                Start New Consolidation
              </v-btn>
              <v-btn
                variant="outlined"
                prepend-icon="mdi-file-pdf-box"
                @click="exportConsolidationReport"
              >
                Export Report
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Step 4: Bills Management (Optional) -->
      <div v-if="currentStep === 4">
        <bills-management-card
          :bills="supplierStore.unpaidBills"
          :loading="supplierStore.state.loading.bills"
          @create-bill="handleCreateBill"
          @pay-bill="handlePayBill"
        />
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <v-card variant="tonal" color="surface" class="mt-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-chart-line" color="primary" class="mr-2" />
            <div class="font-weight-medium">Today's Progress</div>
          </div>
          <div class="d-flex gap-6">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ todayStats.consolidations }}</div>
              <div class="text-caption text-medium-emphasis">Consolidations</div>
            </div>
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ todayStats.orders }}</div>
              <div class="text-caption text-medium-emphasis">Orders Created</div>
            </div>
            <div class="text-center">
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(todayStats.totalValue) }}
              </div>
              <div class="text-caption text-medium-emphasis">Total Value</div>
            </div>
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ todayStats.suppliers }}</div>
              <div class="text-caption text-medium-emphasis">Suppliers</div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Recent Activity -->
    <v-card class="mt-4">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-history" color="info" class="mr-2" />
        Recent Consolidation Activity
        <v-spacer />
        <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="refreshActivity">
          Refresh
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-timeline v-if="recentActivity.length > 0" density="compact" class="pa-4">
          <v-timeline-item
            v-for="activity in recentActivity"
            :key="activity.id"
            :icon="getActivityIcon(activity.type)"
            :dot-color="getActivityColor(activity.type)"
            size="small"
          >
            <template #opposite>
              <div class="text-caption text-medium-emphasis">
                {{ formatTimeAgo(activity.timestamp) }}
              </div>
            </template>

            <div>
              <div class="font-weight-medium">{{ activity.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ activity.description }}</div>
              <div v-if="activity.details" class="text-caption text-primary mt-1">
                {{ activity.details }}
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>

        <div v-else class="text-center pa-8 text-medium-emphasis">
          <v-icon icon="mdi-history" size="48" class="mb-2" />
          <div>No recent activity</div>
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
import { DebugUtils, TimeUtils } from '@/utils'

// Import consolidation components
import RequestSelectionCard from './RequestSelectionCard.vue'
import ConsolidationPreviewCard from './ConsolidationPreviewCard.vue'
// Note: BillsManagementCard would be implemented later when bills move to Account Store

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

// Workflow Steps
const workflowSteps = [
  {
    title: 'Select Requests',
    value: 1,
    status: 'active',
    description: 'Choose approved requests to consolidate'
  },
  {
    title: 'Review Consolidation',
    value: 2,
    status: 'pending',
    description: 'Preview grouped items and suppliers'
  },
  {
    title: 'Orders Created',
    value: 3,
    status: 'pending',
    description: 'Purchase orders generated and ready'
  }
]

// Computed
const generatedOrdersCount = computed(() => generatedOrders.value.length)

const todayStats = computed(() => {
  const today = new Date().toISOString().split('T')[0]

  // Filter today's data
  const todayConsolidations = supplierStore.state.consolidations.filter(c =>
    c.consolidationDate.startsWith(today)
  )

  const todayOrders = supplierStore.state.purchaseOrders.filter(o => o.orderDate.startsWith(today))

  return {
    consolidations: todayConsolidations.length,
    orders: todayOrders.length,
    totalValue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    suppliers: new Set(todayOrders.map(o => o.supplierId)).size
  }
})

const recentActivity = computed(() => {
  const activities = []

  // Add consolidation activities
  supplierStore.state.consolidations
    .filter(c => c.status === 'processed')
    .slice(0, 3)
    .forEach(consolidation => {
      activities.push({
        id: `consolidation-${consolidation.id}`,
        type: 'consolidation',
        title: `Consolidation ${consolidation.consolidationNumber} completed`,
        description: `${consolidation.supplierGroups.length} purchase orders created`,
        details: `${consolidation.sourceRequestIds.length} requests → ${consolidation.supplierGroups.length} orders`,
        timestamp: consolidation.updatedAt
      })
    })

  // Add recent order activities
  supplierStore.state.purchaseOrders
    .filter(o => o.status === 'sent' || o.status === 'confirmed')
    .slice(0, 2)
    .forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `Order ${order.orderNumber} ${order.status}`,
        description: `${order.supplierName} • ${formatCurrency(order.totalAmount)}`,
        details: `${order.items.length} items`,
        timestamp: order.updatedAt
      })
    })

  // Sort by timestamp
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
})

// Methods
function getWorkflowStatusColor(): string {
  switch (currentStep.value) {
    case 1:
      return 'warning'
    case 2:
      return 'info'
    case 3:
      return 'success'
    default:
      return 'default'
  }
}

function getWorkflowStatusText(): string {
  switch (currentStep.value) {
    case 1:
      return 'Select Requests'
    case 2:
      return 'Review Consolidation'
    case 3:
      return 'Orders Created'
    default:
      return 'Unknown'
  }
}

function getStepColor(item: any): string {
  if (item.value < currentStep.value) return 'success'
  if (item.value === currentStep.value) return 'primary'
  return 'default'
}

function getStepIcon(item: any): string {
  if (item.value < currentStep.value) return 'mdi-check'

  switch (item.value) {
    case 1:
      return 'mdi-clipboard-list'
    case 2:
      return 'mdi-merge'
    case 3:
      return 'mdi-package-variant'
    default:
      return 'mdi-circle'
  }
}

function getActivityIcon(type: string): string {
  const icons = {
    consolidation: 'mdi-merge',
    order: 'mdi-package-variant',
    bill: 'mdi-file-document',
    payment: 'mdi-credit-card'
  }
  return icons[type as keyof typeof icons] || 'mdi-circle'
}

function getActivityColor(type: string): string {
  const colors = {
    consolidation: 'success',
    order: 'primary',
    bill: 'warning',
    payment: 'info'
  }
  return colors[type as keyof typeof colors] || 'default'
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return 'Just now'
  }
}

// Event Handlers
async function handleConsolidation(requestIds: string[]) {
  try {
    DebugUtils.info(MODULE_NAME, 'Starting consolidation', {
      requestIds,
      count: requestIds.length
    })

    const consolidation = await supplierStore.createConsolidation(
      requestIds,
      'Current User' // TODO: Get from auth store
    )

    currentConsolidation.value = consolidation
    currentStep.value = 2

    emit('success', `Consolidation created with ${requestIds.length} requests`)

    DebugUtils.info(MODULE_NAME, 'Consolidation created successfully', {
      consolidationId: consolidation.id,
      consolidationNumber: consolidation.consolidationNumber,
      supplierGroups: consolidation.supplierGroups.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create consolidation', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to create consolidation')
  }
}

async function handleCreateOrders() {
  if (!currentConsolidation.value) {
    DebugUtils.warn(MODULE_NAME, 'No consolidation to create orders from')
    return
  }

  try {
    DebugUtils.info(MODULE_NAME, 'Creating orders from consolidation', {
      consolidationId: currentConsolidation.value.id,
      expectedOrderCount: currentConsolidation.value.supplierGroups.length
    })

    const orders = await supplierStore.createOrdersFromConsolidation(currentConsolidation.value.id)

    generatedOrders.value = orders
    currentStep.value = 3

    emit('success', `${orders.length} purchase orders created successfully`)

    DebugUtils.info(MODULE_NAME, 'Orders created successfully', {
      orderCount: orders.length,
      orderIds: orders.map(o => o.id),
      totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0)
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create orders', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to create purchase orders')
  }
}

function handleEditConsolidation() {
  // Go back to step 1 to modify the consolidation
  currentStep.value = 1
  currentConsolidation.value = null

  DebugUtils.info(MODULE_NAME, 'Editing consolidation - returned to selection')
}

function goBackToSelection() {
  currentStep.value = 1
  currentConsolidation.value = null

  DebugUtils.info(MODULE_NAME, 'User went back to request selection')
}

function viewGeneratedOrders() {
  if (generatedOrders.value.length > 0) {
    const orderIds = generatedOrders.value.map(o => o.id)
    emit('view-orders', orderIds)

    DebugUtils.info(MODULE_NAME, 'View generated orders', {
      orderIds,
      count: orderIds.length
    })
  }
}

function startNewConsolidation() {
  currentStep.value = 1
  currentConsolidation.value = null
  generatedOrders.value = []

  DebugUtils.info(MODULE_NAME, 'Starting new consolidation workflow')
}

function exportConsolidationReport() {
  if (!currentConsolidation.value) return

  DebugUtils.info(MODULE_NAME, 'Export consolidation report', {
    consolidationId: currentConsolidation.value.id,
    consolidationNumber: currentConsolidation.value.consolidationNumber
  })

  // TODO: Implement PDF export functionality
}

async function refreshRequests() {
  try {
    await supplierStore.fetchProcurementRequests()
    DebugUtils.info(MODULE_NAME, 'Requests refreshed')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh requests', { error })
  }
}

async function refreshActivity() {
  try {
    await Promise.all([supplierStore.fetchConsolidations(), supplierStore.fetchPurchaseOrders()])
    DebugUtils.info(MODULE_NAME, 'Activity refreshed')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh activity', { error })
  }
}

// Bills management (placeholder for future Account Store integration)
function handleCreateBill(orderId: string) {
  DebugUtils.info(MODULE_NAME, 'Create bill from order', { orderId })
  // TODO: Will be implemented when bills move to Account Store
}

function handlePayBill(billId: string) {
  DebugUtils.info(MODULE_NAME, 'Pay bill', { billId })
  // TODO: Will be implemented when bills move to Account Store
}

// Lifecycle
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'NewOrdersTab mounted, loading data')

    await Promise.all([
      supplierStore.fetchProcurementRequests(),
      supplierStore.fetchConsolidations(),
      supplierStore.fetchPurchaseOrders()
    ])

    DebugUtils.info(MODULE_NAME, 'NewOrdersTab data loaded successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error })
    emit('error', 'Failed to load consolidation data')
  }
})
</script>

<style lang="scss" scoped>
.new-orders-tab {
  .workflow-stepper {
    background: transparent;
    box-shadow: none;
  }

  .workflow-content {
    min-height: 400px;
  }
}

:deep(.v-stepper) {
  box-shadow: none;
  background: transparent;

  .v-stepper-header {
    box-shadow: none;
    background: transparent;
  }

  .v-stepper-item {
    .v-stepper-item__avatar {
      margin-right: 16px;
    }
  }
}

:deep(.v-timeline) {
  .v-timeline-item {
    .v-timeline-item__body {
      padding-bottom: 16px;
    }
  }
}

// Animation for step transitions
.workflow-content {
  transition: all 0.3s ease;
}

// Success state animations
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
</style>
