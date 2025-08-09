// src/stores/supplier/supplierStore.ts - ENHANCED VERSION

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierService } from './supplierService'
import type {
  SupplierState,
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  Bill,
  RequestConsolidation,
  CreateSupplierData,
  CreateProcurementRequestData,
  CreatePurchaseOrderData,
  CreateBillData,
  CreateConsolidationData
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
    // NEW: Enhanced data
    bills: [],
    consolidations: [],
    loading: {
      suppliers: false,
      requests: false,
      orders: false,
      acceptance: false,
      // NEW: Enhanced loading states
      bills: false,
      consolidation: false,
      payment: false
    },
    error: null,
    // Enhanced workflow state
    currentRequest: undefined,
    currentOrder: undefined,
    currentAcceptance: undefined,
    currentConsolidation: undefined, // NEW
    selectedRequestIds: [], // NEW
    filters: {
      department: 'all',
      supplier: 'all',
      status: 'all'
    }
  })

  // ============================================================================
  // COMPUTED GETTERS (Enhanced)
  // ============================================================================

  const activeSuppliers = computed(() => state.value.suppliers.filter(s => s.isActive))

  const pendingRequests = computed(() =>
    state.value.procurementRequests.filter(r => r.status === 'submitted')
  )

  const approvedRequests = computed(() =>
    state.value.procurementRequests.filter(r => r.status === 'approved')
  )

  const activeOrders = computed(() =>
    state.value.purchaseOrders.filter(o => ['sent', 'confirmed', 'in_transit'].includes(o.status))
  )

  const totalOutstanding = computed(() =>
    state.value.suppliers.reduce((sum, supplier) => {
      return sum + Math.max(0, -supplier.currentBalance) // negative balance means we owe them
    }, 0)
  )

  // NEW: Bills computed
  const unpaidBills = computed(() => state.value.bills.filter(b => b.status !== 'paid'))

  const overdueBills = computed(() => {
    const now = new Date()
    return state.value.bills.filter(b => b.status !== 'paid' && new Date(b.dueDate) < now)
  })

  // NEW: Consolidations computed
  const draftConsolidations = computed(() =>
    state.value.consolidations.filter(c => c.status === 'draft')
  )

  const processedConsolidations = computed(() =>
    state.value.consolidations.filter(c => c.status === 'processed')
  )

  // Enhanced statistics
  const statistics = computed(() => ({
    totalSuppliers: state.value.suppliers.length,
    activeSuppliers: activeSuppliers.value.length,
    pendingRequests: pendingRequests.value.length,
    approvedRequests: approvedRequests.value.length,
    activeOrders: activeOrders.value.length,
    totalOutstanding: totalOutstanding.value,
    totalRequests: state.value.procurementRequests.length,
    totalOrders: state.value.purchaseOrders.length,
    totalAcceptances: state.value.receiptAcceptances.length,
    // NEW: Enhanced statistics
    totalBills: state.value.bills.length,
    unpaidBills: unpaidBills.value.length,
    overdueBills: overdueBills.value.length,
    totalConsolidations: state.value.consolidations.length,
    draftConsolidations: draftConsolidations.value.length,
    totalBillValue: state.value.bills.reduce((sum, b) => sum + b.finalAmount, 0),
    unpaidBillValue: unpaidBills.value.reduce((sum, b) => sum + b.finalAmount, 0)
  }))

  // ============================================================================
  // EXISTING SUPPLIER ACTIONS (unchanged)
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
  // EXISTING PROCUREMENT REQUEST ACTIONS (unchanged)
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
  // ENHANCED PURCHASE ORDER ACTIONS
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
      await Promise.all([fetchPurchaseOrders(), fetchProcurementRequests()])
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  // ============================================================================
  // EXISTING RECEIPT ACCEPTANCE ACTIONS (unchanged)
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
  // NEW: REQUEST CONSOLIDATION ACTIONS
  // ============================================================================

  async function createConsolidation(
    requestIds: string[],
    consolidatedBy: string,
    notes?: string
  ): Promise<RequestConsolidation> {
    try {
      state.value.loading.consolidation = true
      state.value.error = null

      // FIX: Enhanced validation before creating consolidation
      if (!requestIds || requestIds.length === 0) {
        throw new Error('No request IDs provided for consolidation')
      }

      if (!consolidatedBy || consolidatedBy.trim() === '') {
        throw new Error('Consolidated by field is required')
      }

      // Validate requests exist and are in correct state
      const availableRequests = state.value.procurementRequests.filter(
        r => requestIds.includes(r.id) && r.status === 'approved'
      )

      if (availableRequests.length === 0) {
        throw new Error('No approved requests found for consolidation')
      }

      if (availableRequests.length !== requestIds.length) {
        const foundIds = availableRequests.map(r => r.id)
        const missingIds = requestIds.filter(id => !foundIds.includes(id))
        throw new Error(
          `Some requests are not available for consolidation: ${missingIds.join(', ')}`
        )
      }

      // Validate that requests have items
      const requestsWithItems = availableRequests.filter(r => r.items && r.items.length > 0)
      if (requestsWithItems.length === 0) {
        throw new Error('No requests with items found for consolidation')
      }

      // Validate that suppliers exist for the items
      const allItems = requestsWithItems.flatMap(r => r.items || [])
      const suppliersForItems = allItems.map(item => {
        return state.value.suppliers.filter(
          s =>
            s.isActive &&
            s.products &&
            Array.isArray(s.products) &&
            s.products.includes(item.itemId)
        )
      })

      const itemsWithoutSuppliers = allItems.filter(
        (item, index) => suppliersForItems[index].length === 0
      )

      if (itemsWithoutSuppliers.length > 0) {
        const itemNames = itemsWithoutSuppliers.map(item => item.itemName).join(', ')
        throw new Error(`No suppliers found for items: ${itemNames}`)
      }

      DebugUtils.info(MODULE_NAME, 'Creating consolidation with validation passed', {
        requestIds,
        requestCount: requestsWithItems.length,
        itemCount: allItems.length,
        consolidatedBy
      })

      // Create consolidation data
      const data: CreateConsolidationData = {
        requestIds: requestsWithItems.map(r => r.id), // Use only validated requests
        consolidatedBy: consolidatedBy.trim(),
        notes
      }

      const consolidation = await supplierService.createConsolidation(data)
      state.value.consolidations.unshift(consolidation)
      state.value.currentConsolidation = consolidation

      DebugUtils.info(MODULE_NAME, 'Consolidation created successfully', {
        consolidationId: consolidation.id,
        consolidationNumber: consolidation.consolidationNumber,
        supplierGroups: consolidation.supplierGroups.length
      })

      return consolidation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create consolidation'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create consolidation', { error, requestIds })
      throw error
    } finally {
      state.value.loading.consolidation = false
    }
  }

  // Convenience method that accepts requestIds directly
  async function createConsolidationFromIds(
    requestIds: string[],
    options: {
      consolidatedBy?: string
      notes?: string
    } = {}
  ): Promise<RequestConsolidation> {
    const consolidatedBy = options.consolidatedBy || 'Current User' // TODO: Get from auth store
    return createConsolidation(requestIds, consolidatedBy, options.notes)
  }

  async function createOrdersFromConsolidation(consolidationId: string): Promise<PurchaseOrder[]> {
    try {
      state.value.loading.consolidation = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating orders from consolidation', { consolidationId })

      const orders = await supplierService.createOrdersFromConsolidation(consolidationId)

      // Update orders in state
      orders.forEach(order => {
        state.value.purchaseOrders.unshift(order)
      })

      // Update consolidation in state
      const consolidationIndex = state.value.consolidations.findIndex(c => c.id === consolidationId)
      if (consolidationIndex !== -1) {
        state.value.consolidations[consolidationIndex] = {
          ...state.value.consolidations[consolidationIndex],
          status: 'processed',
          generatedOrderIds: orders.map(o => o.id),
          updatedAt: new Date().toISOString()
        }
      }

      // Update requests status
      const consolidation = state.value.consolidations[consolidationIndex]
      if (consolidation) {
        consolidation.sourceRequestIds.forEach(requestId => {
          const requestIndex = state.value.procurementRequests.findIndex(r => r.id === requestId)
          if (requestIndex !== -1) {
            state.value.procurementRequests[requestIndex] = {
              ...state.value.procurementRequests[requestIndex],
              status: 'converted',
              consolidationId: consolidation.id,
              updatedAt: new Date().toISOString()
            }
          }
        })
      }

      DebugUtils.info(MODULE_NAME, 'Orders created from consolidation successfully', {
        consolidationId,
        orderCount: orders.length
      })

      return orders
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create orders from consolidation'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create orders from consolidation', { error })
      throw error
    } finally {
      state.value.loading.consolidation = false
    }
  }

  async function fetchConsolidations() {
    try {
      state.value.loading.consolidation = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching consolidations')
      const consolidations = await supplierService.getConsolidations()
      state.value.consolidations = consolidations

      DebugUtils.info(MODULE_NAME, 'Consolidations loaded successfully', {
        count: consolidations.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch consolidations'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch consolidations', { error })
      throw error
    } finally {
      state.value.loading.consolidation = false
    }
  }

  // ============================================================================
  // NEW: BILLS MANAGEMENT ACTIONS
  // ============================================================================

  async function createBillFromPurchaseOrder(
    purchaseOrderId: string,
    issuedBy: string,
    customDueDate?: string
  ): Promise<Bill> {
    try {
      state.value.loading.bills = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating bill from purchase order', {
        purchaseOrderId,
        issuedBy
      })

      const bill = await supplierService.createBillFromPurchaseOrder(
        purchaseOrderId,
        issuedBy,
        customDueDate
      )

      state.value.bills.unshift(bill)

      // Update purchase order with bill ID
      const orderIndex = state.value.purchaseOrders.findIndex(o => o.id === purchaseOrderId)
      if (orderIndex !== -1) {
        state.value.purchaseOrders[orderIndex] = {
          ...state.value.purchaseOrders[orderIndex],
          billId: bill.id,
          paymentStatus: 'pending',
          updatedAt: new Date().toISOString()
        }
      }

      DebugUtils.info(MODULE_NAME, 'Bill created successfully', {
        billId: bill.id,
        billNumber: bill.billNumber
      })

      return bill
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create bill'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to create bill', { error })
      throw error
    } finally {
      state.value.loading.bills = false
    }
  }

  async function markBillAsPaid(billId: string, accountTransactionId: string): Promise<void> {
    try {
      state.value.loading.payment = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Marking bill as paid', { billId, accountTransactionId })

      await supplierService.markBillAsPaid(billId, accountTransactionId)

      // Update bill in state
      const billIndex = state.value.bills.findIndex(b => b.id === billId)
      if (billIndex !== -1) {
        const bill = state.value.bills[billIndex]
        state.value.bills[billIndex] = {
          ...bill,
          status: 'paid',
          paymentStatus: 'paid',
          paidAt: new Date().toISOString(),
          accountTransactionId,
          updatedAt: new Date().toISOString()
        }

        // Update related purchase order
        const orderIndex = state.value.purchaseOrders.findIndex(o => o.id === bill.purchaseOrderId)
        if (orderIndex !== -1) {
          state.value.purchaseOrders[orderIndex] = {
            ...state.value.purchaseOrders[orderIndex],
            paymentStatus: 'paid',
            accountTransactionId,
            updatedAt: new Date().toISOString()
          }
        }

        // Update supplier balance
        const supplierIndex = state.value.suppliers.findIndex(s => s.id === bill.supplierId)
        if (supplierIndex !== -1) {
          const supplier = state.value.suppliers[supplierIndex]
          state.value.suppliers[supplierIndex] = {
            ...supplier,
            currentBalance: supplier.currentBalance + bill.finalAmount,
            totalPaid: (supplier.totalPaid || 0) + bill.finalAmount,
            updatedAt: new Date().toISOString()
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Bill marked as paid successfully', { billId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark bill as paid'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to mark bill as paid', { error })
      throw error
    } finally {
      state.value.loading.payment = false
    }
  }

  async function fetchBills() {
    try {
      state.value.loading.bills = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching bills')
      const bills = await supplierService.getBills()
      state.value.bills = bills

      DebugUtils.info(MODULE_NAME, 'Bills loaded successfully', {
        count: bills.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch bills'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to fetch bills', { error })
      throw error
    } finally {
      state.value.loading.bills = false
    }
  }

  // ============================================================================
  // ENHANCED HELPER METHODS
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

  // NEW: Enhanced helper methods
  function getBillsBySupplier(supplierId: string): Bill[] {
    return state.value.bills.filter(b => b.supplierId === supplierId)
  }

  function getConsolidationById(id: string): RequestConsolidation | undefined {
    return state.value.consolidations.find(c => c.id === id)
  }

  function getBillById(id: string): Bill | undefined {
    return state.value.bills.find(b => b.id === id)
  }

  function selectRequestsForConsolidation(requestIds: string[]): void {
    state.value.selectedRequestIds = [...requestIds]
    DebugUtils.info(MODULE_NAME, 'Selected requests for consolidation', { requestIds })
  }

  function clearSelectedRequests(): void {
    state.value.selectedRequestIds = []
    state.value.currentConsolidation = undefined
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

  // NEW: Workflow management
  function setCurrentConsolidation(consolidation: RequestConsolidation | undefined) {
    state.value.currentConsolidation = consolidation
  }

  function setCurrentRequest(request: ProcurementRequest | undefined) {
    state.value.currentRequest = request
  }

  function setCurrentOrder(order: PurchaseOrder | undefined) {
    state.value.currentOrder = order
  }

  function setCurrentAcceptance(acceptance: ReceiptAcceptance | undefined) {
    state.value.currentAcceptance = acceptance
  }

  // ============================================================================
  // ENHANCED INITIALIZATION
  // ============================================================================

  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing enhanced supplier store')
      state.value.error = null

      // Load all data in parallel
      await Promise.all([
        fetchSuppliers(),
        fetchProcurementRequests(),
        fetchPurchaseOrders(),
        fetchReceiptAcceptances(),
        // NEW: Enhanced data loading
        fetchBills(),
        fetchConsolidations()
      ])

      DebugUtils.info(MODULE_NAME, 'Enhanced supplier store initialized successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize supplier store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, 'Failed to initialize supplier store', { error })
      throw error
    }
  }

  // ============================================================================
  // RETURN ENHANCED PUBLIC API
  // ============================================================================

  return {
    // State
    state,

    // Enhanced Computed Getters
    activeSuppliers,
    pendingRequests,
    approvedRequests,
    activeOrders,
    totalOutstanding,
    unpaidBills,
    overdueBills,
    draftConsolidations,
    processedConsolidations,
    statistics,

    // Existing Supplier Actions
    fetchSuppliers,
    createSupplier,
    updateSupplier,

    // Existing Procurement Request Actions
    fetchProcurementRequests,
    createProcurementRequest,
    updateProcurementRequest,

    // Enhanced Purchase Order Actions
    fetchPurchaseOrders,
    createPurchaseOrder,

    // Existing Receipt Acceptance Actions
    fetchReceiptAcceptances,

    // NEW: Request Consolidation Actions
    createConsolidation,
    createOrdersFromConsolidation,
    fetchConsolidations,

    // NEW: Bills Management Actions
    createBillFromPurchaseOrder,
    markBillAsPaid,
    fetchBills,

    // Enhanced Helper Methods
    getSupplierById,
    getOrdersBySupplier,
    getRequestsByDepartment,
    getBillsBySupplier,
    getConsolidationById,
    getBillById,
    selectRequestsForConsolidation,
    clearSelectedRequests,
    getOrderSuggestions,
    clearError,
    setFilters,

    // NEW: Workflow Management
    setCurrentConsolidation,
    setCurrentRequest,
    setCurrentOrder,
    setCurrentAcceptance,

    // Enhanced Initialize
    initialize
  }
})
