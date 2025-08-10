// src/stores/supplier_2/composables/useProcurementRequests.ts

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import type {
  ProcurementRequest,
  CreateRequestData,
  UpdateRequestData,
  RequestFilters,
  SupplierBasket,
  UnassignedItem,
  Department
} from '../types'

export function useProcurementRequests() {
  const supplierStore = useSupplierStore()

  // =============================================
  // STATE
  // =============================================

  const filters = ref<RequestFilters>({
    status: 'all',
    department: 'all',
    priority: 'all'
  })

  const selectedRequestIds = ref<string[]>([])

  // =============================================
  // COMPUTED
  // =============================================

  // ИСПРАВЛЕНИЕ: Безопасный доступ к данным store
  const requests = computed(() => {
    return Array.isArray(supplierStore.state.requests) ? supplierStore.state.requests : []
  })

  const currentRequest = computed(() => supplierStore.state.currentRequest)
  const isLoading = computed(() => supplierStore.state.loading.requests)

  const filteredRequests = computed(() => {
    return requests.value.filter(request => {
      if (
        filters.value.status &&
        filters.value.status !== 'all' &&
        request.status !== filters.value.status
      ) {
        return false
      }
      if (
        filters.value.department &&
        filters.value.department !== 'all' &&
        request.department !== filters.value.department
      ) {
        return false
      }
      if (
        filters.value.priority &&
        filters.value.priority !== 'all' &&
        request.priority !== filters.value.priority
      ) {
        return false
      }
      return true
    })
  })

  const draftRequests = computed(() => requests.value.filter(req => req.status === 'draft'))
  const submittedRequests = computed(() => requests.value.filter(req => req.status === 'submitted'))

  const requestsForOrders = computed(() => requests.value.filter(req => req.status === 'submitted'))

  const requestStatistics = computed(() => ({
    total: requests.value.length,
    draft: draftRequests.value.length,
    submitted: submittedRequests.value.length,
    converted: requests.value.filter(req => req.status === 'converted').length,
    cancelled: requests.value.filter(req => req.status === 'cancelled').length
  }))

  // =============================================
  // ACTIONS - CRUD Operations
  // =============================================

  /**
   * Fetch all requests
   */
  async function fetchRequests() {
    try {
      console.log('ProcurementRequests: Fetching requests')
      await supplierStore.fetchRequests()
      console.log(`ProcurementRequests: Fetched ${requests.value.length} requests`)
    } catch (error) {
      console.error('ProcurementRequests: Error fetching requests:', error)
      throw error
    }
  }

  /**
   * Create new request
   */
  async function createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    try {
      console.log('ProcurementRequests: Creating request', data)
      const newRequest = await supplierStore.createRequest(data)
      console.log(`ProcurementRequests: Created request ${newRequest.requestNumber}`)
      return newRequest
    } catch (error) {
      console.error('ProcurementRequests: Error creating request:', error)
      throw error
    }
  }

  /**
   * Update request
   */
  async function updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    try {
      console.log(`ProcurementRequests: Updating request ${id}`, data)
      const updatedRequest = await supplierStore.updateRequest(id, data)
      console.log(`ProcurementRequests: Updated request ${id}`)
      return updatedRequest
    } catch (error) {
      console.error('ProcurementRequests: Error updating request:', error)
      throw error
    }
  }

  /**
   * Delete request
   */
  async function deleteRequest(id: string): Promise<void> {
    try {
      console.log(`ProcurementRequests: Deleting request ${id}`)
      await supplierStore.deleteRequest(id)
      console.log(`ProcurementRequests: Deleted request ${id}`)
    } catch (error) {
      console.error('ProcurementRequests: Error deleting request:', error)
      throw error
    }
  }

  /**
   * Submit request (change status to submitted)
   */
  async function submitRequest(id: string): Promise<ProcurementRequest> {
    return updateRequest(id, { status: 'submitted' })
  }

  /**
   * Cancel request
   */
  async function cancelRequest(id: string): Promise<ProcurementRequest> {
    return updateRequest(id, { status: 'cancelled' })
  }

  // =============================================
  // ACTIONS - Supplier Basket Operations
  // =============================================

  /**
   * Group requests into supplier baskets for order creation
   */
  async function groupRequestsForOrders(requestIds: string[]): Promise<SupplierBasket[]> {
    try {
      console.log('ProcurementRequests: Grouping requests for orders', requestIds)

      await supplierStore.createSupplierBaskets(requestIds)
      selectedRequestIds.value = [...requestIds]

      const baskets = Array.isArray(supplierStore.state.supplierBaskets)
        ? supplierStore.state.supplierBaskets
        : []

      console.log(`ProcurementRequests: Created ${baskets.length} supplier baskets`)
      return baskets
    } catch (error) {
      console.error('ProcurementRequests: Error grouping requests:', error)
      throw error
    }
  }

  /**
   * Assign items to supplier basket
   */
  function assignItemsToSupplier(itemIds: string[], supplierId: string, supplierName: string) {
    const baskets = Array.isArray(supplierStore.state.supplierBaskets)
      ? supplierStore.state.supplierBaskets
      : []
    const unassignedBasket = baskets.find(b => b.supplierId === null)

    if (!unassignedBasket) {
      console.warn('ProcurementRequests: No unassigned basket found')
      return
    }

    // Find or create supplier basket
    let supplierBasket = baskets.find(b => b.supplierId === supplierId)
    if (!supplierBasket) {
      supplierBasket = {
        supplierId,
        supplierName,
        items: [],
        totalItems: 0,
        estimatedTotal: 0
      }
      baskets.push(supplierBasket)
    }

    // Move items from unassigned to supplier basket
    itemIds.forEach(itemId => {
      const itemIndex = unassignedBasket.items.findIndex(item => item.itemId === itemId)
      if (itemIndex !== -1) {
        const item = unassignedBasket.items.splice(itemIndex, 1)[0]
        supplierBasket!.items.push(item)
      }
    })

    // Recalculate totals
    unassignedBasket.totalItems = unassignedBasket.items.length
    unassignedBasket.estimatedTotal = unassignedBasket.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )

    supplierBasket.totalItems = supplierBasket.items.length
    supplierBasket.estimatedTotal = supplierBasket.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )

    console.log(`ProcurementRequests: Assigned ${itemIds.length} items to ${supplierName}`)
  }

  /**
   * Move items back to unassigned
   */
  function moveItemsToUnassigned(itemIds: string[], fromSupplierId: string) {
    const baskets = Array.isArray(supplierStore.state.supplierBaskets)
      ? supplierStore.state.supplierBaskets
      : []
    const unassignedBasket = baskets.find(b => b.supplierId === null)
    const supplierBasket = baskets.find(b => b.supplierId === fromSupplierId)

    if (!unassignedBasket || !supplierBasket) {
      console.warn('ProcurementRequests: Required baskets not found')
      return
    }

    // Move items back to unassigned
    itemIds.forEach(itemId => {
      const itemIndex = supplierBasket.items.findIndex(item => item.itemId === itemId)
      if (itemIndex !== -1) {
        const item = supplierBasket.items.splice(itemIndex, 1)[0]
        unassignedBasket.items.push(item)
      }
    })

    // Recalculate totals
    unassignedBasket.totalItems = unassignedBasket.items.length
    unassignedBasket.estimatedTotal = unassignedBasket.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )

    supplierBasket.totalItems = supplierBasket.items.length
    supplierBasket.estimatedTotal = supplierBasket.items.reduce(
      (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
      0
    )

    console.log(`ProcurementRequests: Moved ${itemIds.length} items back to unassigned`)
  }

  /**
   * Clear all supplier baskets
   */
  function clearSupplierBaskets() {
    supplierStore.clearSupplierBaskets()
    selectedRequestIds.value = []
    console.log('ProcurementRequests: Cleared all supplier baskets')
  }

  // =============================================
  // ACTIONS - Selection & Filtering
  // =============================================

  /**
   * Set current request
   */
  function setCurrentRequest(request: ProcurementRequest | undefined) {
    supplierStore.setCurrentRequest(request)
  }

  /**
   * Update filters
   */
  function updateFilters(newFilters: Partial<RequestFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    console.log('ProcurementRequests: Updated filters', filters.value)
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    filters.value = {
      status: 'all',
      department: 'all',
      priority: 'all'
    }
    console.log('ProcurementRequests: Cleared all filters')
  }

  /**
   * Select/deselect request for order creation
   */
  function toggleRequestSelection(requestId: string) {
    const index = selectedRequestIds.value.indexOf(requestId)
    if (index !== -1) {
      selectedRequestIds.value.splice(index, 1)
    } else {
      selectedRequestIds.value.push(requestId)
    }
    console.log(`ProcurementRequests: Toggled selection for request ${requestId}`)
  }

  /**
   * Select all submitted requests
   */
  function selectAllSubmittedRequests() {
    selectedRequestIds.value = submittedRequests.value.map(req => req.id)
    console.log(
      `ProcurementRequests: Selected all ${selectedRequestIds.value.length} submitted requests`
    )
  }

  /**
   * Clear request selection
   */
  function clearRequestSelection() {
    selectedRequestIds.value = []
    console.log('ProcurementRequests: Cleared request selection')
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  /**
   * Get request by ID
   */
  function getRequestById(id: string): ProcurementRequest | undefined {
    return requests.value.find(req => req.id === id)
  }

  /**
   * Get requests by status
   */
  function getRequestsByStatus(status: ProcurementRequest['status']): ProcurementRequest[] {
    return requests.value.filter(req => req.status === status)
  }

  /**
   * Get requests by department
   */
  function getRequestsByDepartment(department: Department): ProcurementRequest[] {
    return requests.value.filter(req => req.department === department)
  }

  /**
   * Check if request can be converted to order
   */
  function canConvertToOrder(request: ProcurementRequest): boolean {
    return request.status === 'submitted' && request.items.length > 0
  }

  /**
   * Check if request can be edited
   */
  function canEditRequest(request: ProcurementRequest): boolean {
    return ['draft', 'submitted'].includes(request.status)
  }

  /**
   * Check if request can be deleted
   */
  function canDeleteRequest(request: ProcurementRequest): boolean {
    return request.status === 'draft'
  }

  /**
   * Get status color for UI
   */
  function getStatusColor(status: ProcurementRequest['status']): string {
    switch (status) {
      case 'draft':
        return 'grey'
      case 'submitted':
        return 'blue'
      case 'converted':
        return 'green'
      case 'cancelled':
        return 'red'
      default:
        return 'default'
    }
  }

  /**
   * Get priority color for UI
   */
  function getPriorityColor(priority: ProcurementRequest['priority']): string {
    switch (priority) {
      case 'urgent':
        return 'red'
      case 'normal':
        return 'green'
      default:
        return 'default'
    }
  }

  /**
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // =============================================
  // INITIALIZATION - УБИРАЕМ АВТОЗАГРУЗКУ
  // =============================================

  // ИСПРАВЛЕНИЕ: Убираем автозагрузку из синхронного кода

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State
    filters,
    selectedRequestIds,

    // Computed
    requests,
    currentRequest,
    filteredRequests,
    draftRequests,
    submittedRequests,
    requestsForOrders,
    requestStatistics,
    isLoading,

    // CRUD Actions
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    submitRequest,
    cancelRequest,

    // Supplier Basket Actions
    groupRequestsForOrders,
    assignItemsToSupplier,
    moveItemsToUnassigned,
    clearSupplierBaskets,

    // Selection & Filtering
    setCurrentRequest,
    updateFilters,
    clearFilters,
    toggleRequestSelection,
    selectAllSubmittedRequests,
    clearRequestSelection,

    // Helpers
    getRequestById,
    getRequestsByStatus,
    getRequestsByDepartment,
    canConvertToOrder,
    canEditRequest,
    canDeleteRequest,
    getStatusColor,
    getPriorityColor,
    formatCurrency
  }
}
