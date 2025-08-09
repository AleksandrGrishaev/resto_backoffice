// src/stores/supplier/supplierStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierService } from './supplierService'
import type {
  SupplierState,
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  CreateSupplierData,
  CreateProcurementRequestData,
  CreatePurchaseOrderData
} from './types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'SupplierStore'

export const useSupplierStore = defineStore('supplier', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const state = ref<SupplierState>({
    suppliers: [],
    procurementRequests: [],
    purchaseOrders: [],
    receiptAcceptances: [],
    loading: {
      suppliers: false,
      requests: false,
      orders: false,
      acceptance: false
    },
    error: null,
    filters: {
      department: 'all',
      supplier: 'all',
      status: 'all'
    }
  })

  // ============================================================================
  // COMPUTED GETTERS
  // ============================================================================

  const activeSuppliers = computed(() => state.value.suppliers.filter(s => s.isActive))

  const pendingRequests = computed(() =>
    state.value.procurementRequests.filter(r => r.status === 'submitted')
  )

  const activeOrders = computed(() =>
    state.value.purchaseOrders.filter(o => ['sent', 'confirmed', 'in_transit'].includes(o.status))
  )

  const totalOutstanding = computed(() =>
    state.value.suppliers.reduce((sum, supplier) => {
      return sum + Math.max(0, -supplier.currentBalance) // negative balance means we owe them
    }, 0)
  )

  const statistics = computed(() => ({
    totalSuppliers: state.value.suppliers.length,
    activeSuppliers: activeSuppliers.value.length,
    pendingRequests: pendingRequests.value.length,
    activeOrders: activeOrders.value.length,
    totalOutstanding: totalOutstanding.value,
    totalRequests: state.value.procurementRequests.length,
    totalOrders: state.value.purchaseOrders.length,
    totalAcceptances: state.value.receiptAcceptances.length
  }))

  // ============================================================================
  // SUPPLIER ACTIONS
  // ============================================================================

  async function fetchSuppliers(force = false) {
    if (state.value.loading.suppliers && !force) return

    try {
      state.value.loading.suppliers = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching suppliers')
      const suppliers = await supplierService.getSuppliers()
      state.value.suppliers = suppliers

      DebugUtils.info(MODULE_NAME, 'Suppliers loaded successfully', {
        count: suppliers.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch suppliers'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch suppliers', { error })
      throw error
    } finally {
      state.value.loading.suppliers = false
    }
  }

  async function createSupplier(data: CreateSupplierData): Promise<Supplier> {
    try {
      state.value.loading.suppliers = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating supplier', { data })

      const supplier = await supplierService.createSupplier(data)

      // Optimistic update - add to beginning of array
      state.value.suppliers.unshift(supplier)

      DebugUtils.info(MODULE_NAME, 'Supplier created successfully', {
        supplierId: supplier.id,
        name: supplier.name
      })

      return supplier
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create supplier'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create supplier', { error })

      // Remove optimistic update on error
      await fetchSuppliers(true)
      throw error
    } finally {
      state.value.loading.suppliers = false
    }
  }

  async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    try {
      state.value.loading.suppliers = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Updating supplier', { id, data })

      const updatedSupplier = await supplierService.updateSupplier(id, data)

      // Update in state
      const index = state.value.suppliers.findIndex(s => s.id === id)
      if (index !== -1) {
        state.value.suppliers[index] = updatedSupplier
      }

      DebugUtils.info(MODULE_NAME, 'Supplier updated successfully', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update supplier'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to update supplier', { error })
      throw error
    } finally {
      state.value.loading.suppliers = false
    }
  }

  // ============================================================================
  // PROCUREMENT REQUEST ACTIONS
  // ============================================================================

  async function fetchProcurementRequests(department?: 'kitchen' | 'bar') {
    try {
      state.value.loading.requests = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching procurement requests', { department })
      const requests = await supplierService.getProcurementRequests(department)
      state.value.procurementRequests = requests

      DebugUtils.info(MODULE_NAME, 'Procurement requests loaded successfully', {
        count: requests.length
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch procurement requests'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch procurement requests', { error })
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  async function createProcurementRequest(
    data: CreateProcurementRequestData
  ): Promise<ProcurementRequest> {
    try {
      state.value.loading.requests = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating procurement request', { data })

      const request = await supplierService.createProcurementRequest(data)

      // Optimistic update
      state.value.procurementRequests.unshift(request)

      DebugUtils.info(MODULE_NAME, 'Procurement request created successfully', {
        requestId: request.id,
        requestNumber: request.requestNumber
      })

      return request
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create procurement request'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create procurement request', { error })

      // Refresh data on error
      await fetchProcurementRequests()
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  async function updateProcurementRequest(
    id: string,
    data: Partial<ProcurementRequest>
  ): Promise<void> {
    try {
      state.value.loading.requests = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Updating procurement request', { id })

      const updatedRequest = await supplierService.updateProcurementRequest(id, data)

      // Update in state
      const index = state.value.procurementRequests.findIndex(r => r.id === id)
      if (index !== -1) {
        state.value.procurementRequests[index] = updatedRequest
      }

      DebugUtils.info(MODULE_NAME, 'Procurement request updated successfully', { id })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update procurement request'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to update procurement request', { error })
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  // ============================================================================
  // PURCHASE ORDER ACTIONS
  // ============================================================================

  async function fetchPurchaseOrders() {
    try {
      state.value.loading.orders = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching purchase orders')
      const orders = await supplierService.getPurchaseOrders()
      state.value.purchaseOrders = orders

      DebugUtils.info(MODULE_NAME, 'Purchase orders loaded successfully', {
        count: orders.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch purchase orders'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch purchase orders', { error })
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  async function createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    try {
      state.value.loading.orders = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating purchase order', { data })

      const order = await supplierService.createPurchaseOrder(data)

      // Optimistic update
      state.value.purchaseOrders.unshift(order)

      // Update related requests status
      data.requestIds.forEach(requestId => {
        const requestIndex = state.value.procurementRequests.findIndex(r => r.id === requestId)
        if (requestIndex !== -1) {
          state.value.procurementRequests[requestIndex] = {
            ...state.value.procurementRequests[requestIndex],
            status: 'converted',
            purchaseOrderIds: [
              ...state.value.procurementRequests[requestIndex].purchaseOrderIds,
              order.id
            ],
            updatedAt: new Date().toISOString()
          }
        }
      })

      DebugUtils.info(MODULE_NAME, 'Purchase order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber
      })

      return order
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create purchase order'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create purchase order', { error })

      // Refresh data on error
      await Promise.all([fetchPurchaseOrders(), fetchProcurementRequests()])
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  // ============================================================================
  // RECEIPT ACCEPTANCE ACTIONS
  // ============================================================================

  async function fetchReceiptAcceptances() {
    try {
      state.value.loading.acceptance = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching receipt acceptances')
      const acceptances = await supplierService.getReceiptAcceptances()
      state.value.receiptAcceptances = acceptances

      DebugUtils.info(MODULE_NAME, 'Receipt acceptances loaded successfully', {
        count: acceptances.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch receipt acceptances'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch receipt acceptances', { error })
      throw error
    } finally {
      state.value.loading.acceptance = false
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  function getSupplierById(id: string): Supplier | undefined {
    return state.value.suppliers.find(s => s.id === id)
  }

  function getOrdersBySupplier(supplierId: string): PurchaseOrder[] {
    return state.value.purchaseOrders.filter(o => o.supplierId === supplierId)
  }

  function getRequestsByDepartment(department: 'kitchen' | 'bar'): ProcurementRequest[] {
    return state.value.procurementRequests.filter(r => r.department === department)
  }

  async function getOrderSuggestions(department: 'kitchen' | 'bar') {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting order suggestions', { department })
      return await supplierService.getOrderSuggestions(department)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get order suggestions', { error })
      return []
    }
  }

  function clearError() {
    state.value.error = null
  }

  function setFilters(filters: Partial<typeof state.value.filters>) {
    state.value.filters = { ...state.value.filters, ...filters }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing supplier store')
      state.value.error = null

      // Load all data in parallel
      await Promise.all([
        fetchSuppliers(),
        fetchProcurementRequests(),
        fetchPurchaseOrders(),
        fetchReceiptAcceptances()
      ])

      DebugUtils.info(MODULE_NAME, 'Supplier store initialized successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize supplier store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to initialize supplier store', { error })
      throw error
    }
  }

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    // State
    state,

    // Computed Getters
    activeSuppliers,
    pendingRequests,
    activeOrders,
    totalOutstanding,
    statistics,

    // Supplier Actions
    fetchSuppliers,
    createSupplier,
    updateSupplier,

    // Procurement Request Actions
    fetchProcurementRequests,
    createProcurementRequest,
    updateProcurementRequest,

    // Purchase Order Actions
    fetchPurchaseOrders,
    createPurchaseOrder,

    // Receipt Acceptance Actions
    fetchReceiptAcceptances,

    // Helper Methods
    getSupplierById,
    getOrdersBySupplier,
    getRequestsByDepartment,
    getOrderSuggestions,
    clearError,
    setFilters,

    // Initialize
    initialize
  }
})
