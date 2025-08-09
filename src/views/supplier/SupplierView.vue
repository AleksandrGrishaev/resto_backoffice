<!-- src/views/supplier/SupplierView.vue -->
<template>
  <div class="supplier-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">🏪 Suppliers & Procurement</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage suppliers, procurement requests, and purchase orders
        </p>
        <v-chip size="small" color="primary" variant="tonal" class="mt-1">
          <v-icon icon="mdi-truck-delivery" size="14" class="mr-1" />
          Phase 3: Procurement Management
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
          <v-col cols="6" md="3">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.activeSuppliers.length }}</div>
              <div class="text-caption text-medium-emphasis">Active Suppliers</div>
            </div>
          </v-col>
          <v-col cols="6" md="3">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.pendingRequests.length }}</div>
              <div class="text-caption text-medium-emphasis">Pending Requests</div>
            </div>
          </v-col>
          <v-col cols="6" md="3">
            <div class="text-center">
              <div class="text-h6 font-weight-bold">{{ supplierStore.activeOrders.length }}</div>
              <div class="text-caption text-medium-emphasis">Active Orders</div>
            </div>
          </v-col>
          <v-col cols="6" md="3">
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
            text="Create purchase orders from procurement requests."
          >
            <template #actions>
              <v-btn color="primary" variant="flat" @click="selectedTab = 'requests'">
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
    <v-dialog v-model="showInfoDialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-information" color="info" class="mr-2" />
          About Procurement Management
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="mb-4">
            <h4 class="mb-2">What is Procurement Management?</h4>
            <p class="text-body-2">
              Procurement Management handles the complete workflow from identifying needs to
              receiving goods from suppliers.
            </p>
          </div>

          <div class="mb-4">
            <h4 class="mb-2">Workflow:</h4>
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
                <strong>Purchase Order:</strong>
                Converts requests into orders to suppliers
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
                <strong>Supplier Management:</strong>
                Track contacts, terms, and performance
              </li>
              <li>
                <strong>Smart Suggestions:</strong>
                Auto-suggest orders based on stock levels
              </li>
              <li>
                <strong>Financial Tracking:</strong>
                Monitor debts and payment terms
              </li>
              <li>
                <strong>Quality Control:</strong>
                Accept/reject deliveries with notes
              </li>
              <li>
                <strong>Integration:</strong>
                Works with Storage and Account modules
              </li>
            </ul>
          </div>

          <v-alert type="info" variant="tonal">
            <v-alert-title>Integration Note</v-alert-title>
            This module integrates with Storage for inventory updates and Account for payment
            tracking.
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
import { ref, onMounted } from 'vue'
import { useSupplierStore, formatCurrency } from '@/stores/supplier'
import type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance
} from '@/stores/supplier'
import { DebugUtils } from '@/utils'

// Components (будут созданы позже)
import SupplierTable from './components/supplier/SupplierTable.vue'
import SupplierDialog from './components/supplier/SupplierDialog.vue'
import ProcurementTable from './components/procurement/ProcurementTable.vue'
import ProcurementRequestDialog from './components/procurement/ProcurementRequestDialog.vue'
import OrderAssistantDialog from './components/procurement/OrderAssistantDialog.vue'
import PurchaseOrderTable from './components/purchase/PurchaseOrderTable.vue'
import PurchaseOrderDialog from './components/purchase/PurchaseOrderDialog.vue'
import AcceptanceTable from './components/purchase/AcceptanceTable.vue'
import ReceiptAcceptanceDialog from './components/purchase/ReceiptAcceptanceDialog.vue'

const MODULE_NAME = 'SupplierView'

// Store
const supplierStore = useSupplierStore()

// State
const selectedTab = ref('requests')
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

// Event Handlers
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
    selectedTab.value = 'requests'

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
      supplierStore.fetchProcurementRequests()
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
</style>
