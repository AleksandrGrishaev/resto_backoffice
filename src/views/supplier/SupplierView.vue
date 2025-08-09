<!-- src/views/supplier/SupplierView.vue -->
<template>
  <div class="supplier-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">🏪 Suppliers & Procurement</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage suppliers, procurement requests, and purchase orders with smart consolidation
        </p>
        <v-chip size="small" color="primary" variant="tonal" class="mt-1">
          <v-icon icon="mdi-truck-delivery" size="14" class="mr-1" />
          Phase 3: Procurement Management + Consolidation
        </v-chip>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-plus-circle"
          :disabled="supplierStore.state.loading.suppliers"
          @click="showSupplierDialog = true"
        >
          Add Supplier
        </v-btn>

        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-clipboard-list"
          :disabled="supplierStore.state.loading.requests"
          @click="showOrderAssistantDialog = true"
        >
          Order Assistant
        </v-btn>

        <v-btn
          color="warning"
          variant="outlined"
          prepend-icon="mdi-merge"
          :disabled="supplierStore.approvedRequests.length === 0"
          @click="goToConsolidation"
        >
          Quick Consolidate
        </v-btn>

        <!-- Info Button -->
        <v-btn
          color="info"
          variant="text"
          icon="mdi-information-outline"
          @click="showInfoDialog = true"
        >
          <v-icon />
          <v-tooltip activator="parent" location="bottom">About Procurement</v-tooltip>
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="supplierStore.state.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="supplierStore.clearError"
    >
      <v-alert-title>Procurement Error</v-alert-title>
      {{ supplierStore.state.error }}
    </v-alert>

    <!-- Quick Stats Bar -->
    <v-card variant="tonal" color="info" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.activeSuppliers.length }}</div>
              <div class="text-caption text-medium-emphasis">Active Suppliers</div>
            </div>
          </v-col>
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">
                {{ supplierStore.approvedRequests.length }}
              </div>
              <div class="text-caption text-medium-emphasis">Ready to Consolidate</div>
            </div>
          </v-col>
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.pendingRequests.length }}</div>
              <div class="text-caption text-medium-emphasis">Pending Requests</div>
            </div>
          </v-col>
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.activeOrders.length }}</div>
              <div class="text-caption text-medium-emphasis">Active Orders</div>
            </div>
          </v-col>
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ todayConsolidations }}</div>
              <div class="text-caption text-medium-emphasis">Today's Consolidations</div>
            </div>
          </v-col>
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(supplierStore.totalOutstanding) }}
              </div>
              <div class="text-caption text-medium-emphasis">Outstanding Debt</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4" color="primary">
      <v-tab value="consolidation">
        <v-icon icon="mdi-merge" class="mr-2" />
        Consolidation
        <v-chip
          v-if="supplierStore.approvedRequests.length > 0"
          size="small"
          class="ml-2"
          variant="tonal"
          color="success"
        >
          {{ supplierStore.approvedRequests.length }} ready
        </v-chip>
        <v-chip
          v-if="supplierStore.draftConsolidations.length > 0"
          size="small"
          class="ml-1"
          variant="flat"
          color="warning"
        >
          {{ supplierStore.draftConsolidations.length }} draft
        </v-chip>
      </v-tab>
      <v-tab value="requests">
        <v-icon icon="mdi-clipboard-list" class="mr-2" />
        Requests
        <v-chip
          v-if="supplierStore.pendingRequests.length > 0"
          size="small"
          class="ml-2"
          variant="tonal"
        >
          {{ supplierStore.pendingRequests.length }}
        </v-chip>
      </v-tab>
      <v-tab value="orders">
        <v-icon icon="mdi-package-variant" class="mr-2" />
        Purchase Orders
        <v-chip
          v-if="supplierStore.activeOrders.length > 0"
          size="small"
          class="ml-2"
          variant="tonal"
        >
          {{ supplierStore.activeOrders.length }}
        </v-chip>
      </v-tab>
      <v-tab value="suppliers">
        <v-icon icon="mdi-store" class="mr-2" />
        Suppliers
        <v-chip
          v-if="supplierStore.activeSuppliers.length > 0"
          size="small"
          class="ml-2"
          variant="tonal"
        >
          {{ supplierStore.activeSuppliers.length }}
        </v-chip>
      </v-tab>
      <v-tab value="acceptance">
        <v-icon icon="mdi-truck-check" class="mr-2" />
        Acceptance
        <v-chip
          v-if="supplierStore.state.receiptAcceptances.length > 0"
          size="small"
          class="ml-2"
          variant="tonal"
        >
          {{ supplierStore.state.receiptAcceptances.length }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Content -->
    <v-tabs-window v-model="selectedTab">
      <!-- Consolidation Tab -->
      <v-tabs-window-item value="consolidation">
        <new-orders-tab
          @create-request="handleCreateRequest"
          @view-orders="handleViewOrders"
          @success="handleSuccess"
          @error="handleError"
        />
      </v-tabs-window-item>

      <!-- Procurement Requests Tab -->
      <v-tabs-window-item value="requests">
        <div
          v-if="
            supplierStore.state.procurementRequests.length === 0 &&
            !supplierStore.state.loading.requests
          "
        >
          <v-empty-state
            headline="No Procurement Requests"
            title="No procurement requests found"
            text="Create your first procurement request using the Order Assistant."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="showOrderAssistantDialog = true">
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                Start Order Assistant
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <procurement-table
          v-else
          :requests="supplierStore.state.procurementRequests"
          :loading="supplierStore.state.loading.requests"
          @edit-request="handleEditRequest"
          @create-order="handleCreateOrderFromRequest"
          @create-request="handleCreateRequest"
        />
      </v-tabs-window-item>

      <!-- Purchase Orders Tab -->
      <v-tabs-window-item value="orders">
        <div
          v-if="
            supplierStore.state.purchaseOrders.length === 0 && !supplierStore.state.loading.orders
          "
        >
          <v-empty-state
            headline="No Purchase Orders"
            title="No purchase orders found"
            text="Create purchase orders from procurement requests using consolidation workflow."
          >
            <template #actions>
              <v-btn color="success" variant="flat" @click="goToConsolidation">
                <v-icon icon="mdi-merge" class="mr-2" />
                Start Consolidation
              </v-btn>
              <v-btn color="primary" variant="outlined" @click="selectedTab = 'requests'">
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                View Requests
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <purchase-order-table
          v-else
          :orders="supplierStore.state.purchaseOrders"
          :loading="supplierStore.state.loading.orders"
          @edit-order="handleEditOrder"
          @start-acceptance="handleStartAcceptance"
          @create-order="handleCreateNewOrder"
        />
      </v-tabs-window-item>

      <!-- Suppliers Tab -->
      <v-tabs-window-item value="suppliers">
        <div
          v-if="
            supplierStore.state.suppliers.length === 0 && !supplierStore.state.loading.suppliers
          "
        >
          <v-empty-state
            headline="No Suppliers"
            title="No suppliers registered"
            text="Add your first supplier to start procurement management."
          >
            <template #actions>
              <v-btn color="success" variant="flat" @click="showSupplierDialog = true">
                <v-icon icon="mdi-plus-circle" class="mr-2" />
                Add Supplier
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <supplier-table
          v-else
          :suppliers="supplierStore.state.suppliers"
          :loading="supplierStore.state.loading.suppliers"
          @edit-supplier="handleEditSupplier"
          @view-details="handleViewSupplierDetails"
        />
      </v-tabs-window-item>

      <!-- Acceptance Tab -->
      <v-tabs-window-item value="acceptance">
        <div
          v-if="
            supplierStore.state.receiptAcceptances.length === 0 &&
            !supplierStore.state.loading.acceptance
          "
        >
          <v-empty-state
            headline="No Receipt Acceptances"
            title="No receipt acceptances found"
            text="Acceptances will appear here when you receive deliveries."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="selectedTab = 'orders'">
                <v-icon icon="mdi-package-variant" class="mr-2" />
                View Orders
              </v-btn>
            </template>
          </v-empty-state>
        </div>

        <acceptance-table
          v-else
          :acceptances="supplierStore.state.receiptAcceptances"
          :loading="supplierStore.state.loading.acceptance"
          @edit-acceptance="handleEditAcceptance"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Dialogs -->
    <supplier-dialog
      v-model="showSupplierDialog"
      :existing-supplier="editingSupplier"
      @success="handleSupplierSuccess"
      @error="handleError"
    />

    <order-assistant-dialog
      v-model="showOrderAssistantDialog"
      @success="handleOrderAssistantSuccess"
      @error="handleError"
    />

    <procurement-request-dialog
      v-model="showRequestDialog"
      :existing-request="editingRequest"
      @success="handleRequestSuccess"
      @error="handleError"
    />

    <purchase-order-dialog
      v-model="showOrderDialog"
      :existing-order="editingOrder"
      :request-ids="selectedRequestIds"
      @success="handleOrderSuccess"
      @error="handleError"
    />

    <receipt-acceptance-dialog
      v-model="showAcceptanceDialog"
      :purchase-order="acceptanceOrder"
      @success="handleAcceptanceSuccess"
      @error="handleError"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000" location="top">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000" location="top">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showErrorSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Info Dialog -->
    <v-dialog v-model="showInfoDialog" max-width="700px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-information" color="info" class="mr-2" />
          About Procurement Management & Consolidation
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="mb-4">
            <h4 class="mb-2">What is Procurement Management?</h4>
            <p class="text-body-2">
              Procurement Management handles the complete workflow from identifying needs to
              receiving goods from suppliers, with smart consolidation to optimize orders.
            </p>
          </div>

          <div class="mb-4">
            <h4 class="mb-2">Enhanced Workflow with Consolidation:</h4>
            <ol class="text-body-2">
              <li>
                <strong>Order Assistant:</strong>
                Identifies low stock items and suggests orders
              </li>
              <li>
                <strong>Procurement Request:</strong>
                Creates formal request for supplies
              </li>
              <li>
                <strong>Smart Consolidation:</strong>
                Groups requests by supplier for efficient ordering
              </li>
              <li>
                <strong>Purchase Order:</strong>
                Creates optimized orders to suppliers
              </li>
              <li>
                <strong>Receipt Acceptance:</strong>
                Confirms delivery and quality
              </li>
              <li>
                <strong>Storage Integration:</strong>
                Updates inventory with FIFO tracking
              </li>
            </ol>
          </div>

          <div class="mb-4">
            <h4 class="mb-2">Key Features:</h4>
            <ul class="text-body-2">
              <li>
                <strong>Smart Consolidation:</strong>
                Automatically groups items by supplier to minimize orders
              </li>
              <li>
                <strong>Supplier Management:</strong>
                Track contacts, terms, and performance
              </li>
              <li>
                <strong>Intelligent Suggestions:</strong>
                Auto-suggest orders based on stock levels and consumption patterns
              </li>
              <li>
                <strong>Financial Tracking:</strong>
                Monitor debts, payment terms, and cost optimization
              </li>
              <li>
                <strong>Quality Control:</strong>
                Accept/reject deliveries with detailed notes
              </li>
              <li>
                <strong>Full Integration:</strong>
                Works seamlessly with Storage and Account modules
              </li>
            </ul>
          </div>

          <v-alert type="success" variant="tonal" class="mb-4">
            <v-alert-title>New: Consolidation Workflow</v-alert-title>
            The consolidation feature automatically groups approved requests by supplier, reducing
            the number of orders and improving cost efficiency.
          </v-alert>

          <v-alert type="info" variant="tonal">
            <v-alert-title>Integration Note</v-alert-title>
            This module integrates with Storage for inventory updates, Account for payment tracking,
            and provides detailed consolidation reports.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="showInfoDialog = false">Got it</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupplierStore, formatCurrency } from '@/stores/supplier'
import type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance
} from '@/stores/supplier'
import { DebugUtils } from '@/utils'

// Components
import SupplierTable from './components/supplier/SupplierTable.vue'
import SupplierDialog from './components/supplier/SupplierDialog.vue'
import ProcurementTable from './components/procurement/ProcurementTable.vue'
import ProcurementRequestDialog from './components/procurement/ProcurementRequestDialog.vue'
import OrderAssistantDialog from './components/procurement/OrderAssistantDialog.vue'
import PurchaseOrderTable from './components/purchase/PurchaseOrderTable.vue'
import PurchaseOrderDialog from './components/purchase/PurchaseOrderDialog.vue'
import AcceptanceTable from './components/purchase/AcceptanceTable.vue'
import ReceiptAcceptanceDialog from './components/purchase/ReceiptAcceptanceDialog.vue'
import NewOrdersTab from './components/consolidation/NewOrdersTab.vue'

const MODULE_NAME = 'SupplierView'

// Store
const supplierStore = useSupplierStore()

// State
const selectedTab = ref('consolidation') // Start with consolidation tab
const showSupplierDialog = ref(false)
const showOrderAssistantDialog = ref(false)
const showRequestDialog = ref(false)
const showOrderDialog = ref(false)
const showAcceptanceDialog = ref(false)
const showInfoDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Editing state
const editingSupplier = ref<Supplier | null>(null)
const editingRequest = ref<ProcurementRequest | null>(null)
const editingOrder = ref<PurchaseOrder | null>(null)
const acceptanceOrder = ref<PurchaseOrder | null>(null)
const selectedRequestIds = ref<string[]>([])

// Computed properties
const todayConsolidations = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return supplierStore.state.consolidations.filter(c => c.consolidationDate.startsWith(today))
    .length
})

// Event Handlers
function handleCreateRequest() {
  showOrderAssistantDialog.value = true
  DebugUtils.info(MODULE_NAME, 'Create request from consolidation tab')
}

function handleViewOrders(orderIds: string[]) {
  selectedTab.value = 'orders'
  // TODO: Highlight or filter to show specific orders
  DebugUtils.info(MODULE_NAME, 'View orders from consolidation', { orderIds })
}

function handleSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true
  DebugUtils.info(MODULE_NAME, 'Success from consolidation', { message })
}

function goToConsolidation() {
  selectedTab.value = 'consolidation'
  DebugUtils.info(MODULE_NAME, 'Navigate to consolidation tab')
}

function handleEditSupplier(supplier: Supplier) {
  editingSupplier.value = supplier
  showSupplierDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Editing supplier', {
    supplierId: supplier.id,
    name: supplier.name
  })
}

function handleViewSupplierDetails(supplier: Supplier) {
  // TODO: Implement supplier details view or navigate to details page
  DebugUtils.info(MODULE_NAME, 'View supplier details', {
    supplierId: supplier.id,
    name: supplier.name
  })

  // For now, just edit the supplier
  handleEditSupplier(supplier)
}

function handleEditRequest(request: ProcurementRequest) {
  editingRequest.value = request
  showRequestDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Editing procurement request', {
    requestId: request.id,
    requestNumber: request.requestNumber
  })
}

function handleCreateOrderFromRequest(request: ProcurementRequest) {
  selectedRequestIds.value = [request.id]
  editingOrder.value = null
  showOrderDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Creating order from request', {
    requestId: request.id,
    requestNumber: request.requestNumber
  })
}

function handleCreateNewOrder() {
  selectedRequestIds.value = []
  editingOrder.value = null
  showOrderDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Creating new purchase order')
}

function handleEditOrder(order: PurchaseOrder) {
  editingOrder.value = order
  selectedRequestIds.value = []
  showOrderDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Editing purchase order', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
}

function handleStartAcceptance(order: PurchaseOrder) {
  acceptanceOrder.value = order
  showAcceptanceDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Starting acceptance for order', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
}

function handleEditAcceptance(acceptance: ReceiptAcceptance) {
  // TODO: Implement acceptance editing
  DebugUtils.info(MODULE_NAME, 'Edit acceptance', {
    acceptanceId: acceptance.id,
    acceptanceNumber: acceptance.acceptanceNumber
  })
}

// Success Handlers
async function handleSupplierSuccess(message: string = 'Supplier saved successfully') {
  try {
    successMessage.value = message
    showSuccessSnackbar.value = true
    showSupplierDialog.value = false
    editingSupplier.value = null

    await supplierStore.fetchSuppliers()

    DebugUtils.info(MODULE_NAME, 'Supplier operation completed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh after supplier success', { error })
    handleError('Supplier saved but failed to refresh data')
  }
}

async function handleOrderAssistantSuccess(message: string = 'Procurement request created') {
  try {
    successMessage.value = message
    showSuccessSnackbar.value = true
    showOrderAssistantDialog.value = false

    await supplierStore.fetchProcurementRequests()

    // If we have approved requests, show consolidation tab
    if (supplierStore.approvedRequests.length > 0) {
      selectedTab.value = 'consolidation'
    } else {
      selectedTab.value = 'requests'
    }

    DebugUtils.info(MODULE_NAME, 'Order assistant completed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh after order assistant success', { error })
    handleError('Request created but failed to refresh data')
  }
}

async function handleRequestSuccess(message: string = 'Procurement request saved') {
  try {
    successMessage.value = message
    showSuccessSnackbar.value = true
    showRequestDialog.value = false
    editingRequest.value = null

    await supplierStore.fetchProcurementRequests()

    DebugUtils.info(MODULE_NAME, 'Procurement request operation completed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh after request success', { error })
    handleError('Request saved but failed to refresh data')
  }
}

async function handleOrderSuccess(message: string = 'Purchase order saved') {
  try {
    successMessage.value = message
    showSuccessSnackbar.value = true
    showOrderDialog.value = false
    editingOrder.value = null
    selectedRequestIds.value = []

    await Promise.all([
      supplierStore.fetchPurchaseOrders(),
      supplierStore.fetchProcurementRequests(),
      supplierStore.fetchConsolidations() // Also refresh consolidations
    ])
    selectedTab.value = 'orders'

    DebugUtils.info(MODULE_NAME, 'Purchase order operation completed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh after order success', { error })
    handleError('Order saved but failed to refresh data')
  }
}

async function handleAcceptanceSuccess(message: string = 'Receipt accepted successfully') {
  try {
    successMessage.value = message
    showSuccessSnackbar.value = true
    showAcceptanceDialog.value = false
    acceptanceOrder.value = null

    await Promise.all([
      supplierStore.fetchPurchaseOrders(),
      supplierStore.fetchReceiptAcceptances()
      // TODO: Refresh storage data as well
    ])
    selectedTab.value = 'acceptance'

    DebugUtils.info(MODULE_NAME, 'Receipt acceptance completed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to refresh after acceptance success', { error })
    handleError('Acceptance completed but failed to refresh data')
  }
}

function handleError(message: string) {
  DebugUtils.error(MODULE_NAME, 'Operation error', { message })

  errorMessage.value = message
  showErrorSnackbar.value = true

  // Close all dialogs
  showSupplierDialog.value = false
  showOrderAssistantDialog.value = false
  showRequestDialog.value = false
  showOrderDialog.value = false
  showAcceptanceDialog.value = false

  // Reset editing state
  editingSupplier.value = null
  editingRequest.value = null
  editingOrder.value = null
  acceptanceOrder.value = null
  selectedRequestIds.value = []
}

// Lifecycle
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'SupplierView mounted, initializing data')
    await supplierStore.initialize()

    DebugUtils.info(MODULE_NAME, 'SupplierView initialized successfully')

    // If there are approved requests ready for consolidation, highlight them
    if (supplierStore.approvedRequests.length > 0) {
      setTimeout(() => {
        handleSuccess(`${supplierStore.approvedRequests.length} requests ready for consolidation`)
      }, 1000)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize supplier data', { error })
    handleError('Failed to initialize procurement management system')
  }
})
</script>

<style lang="scss" scoped>
.supplier-view {
  padding: 24px;
}

.gap-2 {
  gap: 8px;
}

.v-alert {
  border-radius: 12px;

  &.v-alert--variant-tonal {
    border-left: 4px solid currentColor;
  }
}

.v-tabs {
  .v-tab {
    text-transform: none;
    font-weight: 500;

    .v-chip {
      margin-left: 8px;
      font-size: 0.75rem;
    }
  }
}

.v-empty-state {
  padding: 48px 24px;
  text-align: center;
}

// Consolidation tab highlighting
.v-tab[aria-selected='true'] {
  &[value='consolidation'] {
    .v-chip {
      animation: pulse 2s infinite;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

// Enhanced stats bar styling
.text-h6 {
  line-height: 1.2;
}

// Success highlighting for ready consolidation items
.text-success.animate-ready {
  animation: readyBounce 0.6s ease-out;
}

@keyframes readyBounce {
  0%,
  20%,
  53%,
  80%,
  100% {
    transform: scale(1);
  }
  40%,
  43% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(1.05);
  }
  90% {
    transform: scale(1.02);
  }
}
</style>
