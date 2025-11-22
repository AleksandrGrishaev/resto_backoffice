// src/stores/supplier_2/supplierService.ts - MIGRATED TO SUPABASE

import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useSupplierStorageIntegration } from './integrations/storageIntegration'
import { getProductDefinition } from '@/stores/shared/productDefinitions'
import { useCounteragentsStore } from '@/stores/counteragents'
import { supabase } from '@/supabase/client'
import { generateId } from '@/utils/id'
import {
  mapRequestFromDB,
  mapRequestToDB,
  mapRequestItemToDB,
  mapOrderFromDB,
  mapOrderToDB,
  mapOrderItemToDB
} from './supabaseMappers'

import { DebugUtils } from '@/utils'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  CreateRequestData,
  CreateOrderData,
  CreateReceiptData,
  UpdateRequestData,
  UpdateOrderData,
  UpdateReceiptData,
  SupplierBasket,
  UnassignedItem,
  Department,
  OrderItem,
  RequestItem
} from './types'

const MODULE_NAME = 'SupplierService'

class SupplierService {
  // ✅ REMOVED: private requests array (now using Supabase)
  // ✅ REMOVED: private orders array (now using Supabase)
  private receipts: Receipt[] = []
  private storageIntegration = useSupplierStorageIntegration()

  constructor() {}

  // =============================================
  // LOAD DATA FROM COORDINATOR (Phase 1: Requests migrated to Supabase)
  // =============================================

  async loadDataFromCoordinator(): void {
    try {
      const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
      const supplierData = mockDataCoordinator.getSupplierStoreData()

      // ✅ REMOVED: this.requests = [...supplierData.requests] (now using Supabase)
      // ✅ REMOVED: this.orders = [...supplierData.orders] (now using Supabase)
      this.receipts = [...supplierData.receipts]

      DebugUtils.info(MODULE_NAME, 'Data loaded from coordinator (receipts only)', {
        receipts: this.receipts.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load data from coordinator', { error })
      // Keep empty arrays as fallback
    }
  }

  // =============================================
  // PROCUREMENT REQUESTS METHODS
  // =============================================

  async getRequests(): Promise<ProcurementRequest[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching requests from Supabase...')

      // Fetch requests with items in a single query
      const { data, error } = await supabase
        .from('supplierstore_requests')
        .select('*, supplierstore_request_items(*)')
        .order('created_at', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch requests from Supabase', { error })
        throw error
      }

      // Map database rows to TypeScript objects
      const requests = (data || []).map(dbRequest =>
        mapRequestFromDB(dbRequest, dbRequest.supplierstore_request_items || [])
      )

      DebugUtils.info(MODULE_NAME, 'Requests fetched from Supabase', {
        count: requests.length
      })

      return requests
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching requests', { error })
      throw error
    }
  }

  async getRequestById(id: string): Promise<ProcurementRequest | null> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching request by ID from Supabase', { id })

      // Fetch request with items
      const { data, error } = await supabase
        .from('supplierstore_requests')
        .select('*, supplierstore_request_items(*)')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          DebugUtils.warn(MODULE_NAME, 'Request not found', { id })
          return null
        }
        DebugUtils.error(MODULE_NAME, 'Failed to fetch request by ID', { id, error })
        throw error
      }

      const request = mapRequestFromDB(data, data.supplierstore_request_items || [])

      DebugUtils.info(MODULE_NAME, 'Request fetched by ID', {
        id,
        requestNumber: request.requestNumber
      })

      return request
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching request by ID', { id, error })
      throw error
    }
  }

  async createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    try {
      const requestId = generateId()
      const timestamp = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Creating request in Supabase', {
        requestId,
        department: data.department,
        itemsCount: data.items.length
      })

      // Generate request number
      const requestNumber = await this.generateRequestNumber(data.department)

      // Prepare request data
      const newRequest: ProcurementRequest = {
        id: requestId,
        requestNumber,
        department: data.department,
        requestedBy: data.requestedBy,
        items: data.items.map(item => ({
          ...item,
          id: generateId()
        })),
        status: 'draft',
        priority: data.priority || 'normal',
        purchaseOrderIds: [],
        notes: data.notes,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      // Insert request (main record)
      const { data: insertedRequest, error: requestError } = await supabase
        .from('supplierstore_requests')
        .insert([mapRequestToDB(newRequest)])
        .select()
        .single()

      if (requestError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert request', { requestError })
        throw requestError
      }

      // Insert request items
      if (newRequest.items.length > 0) {
        const itemsToInsert = newRequest.items.map(item => mapRequestItemToDB(item, requestId))

        const { error: itemsError } = await supabase
          .from('supplierstore_request_items')
          .insert(itemsToInsert)

        if (itemsError) {
          DebugUtils.error(MODULE_NAME, 'Failed to insert request items', { itemsError })
          // Rollback: delete the request
          await supabase.from('supplierstore_requests').delete().eq('id', requestId)
          throw itemsError
        }
      }

      DebugUtils.info(MODULE_NAME, 'Request created successfully in Supabase', {
        requestId,
        requestNumber,
        itemsCount: newRequest.items.length
      })

      return newRequest
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating request', { error })
      throw error
    }
  }

  async updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    try {
      const timestamp = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Updating request in Supabase', { id })

      // Update main request record
      const updateData: any = {
        updated_at: timestamp
      }

      if (data.status !== undefined) updateData.status = data.status
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.purchaseOrderIds !== undefined) updateData.purchase_order_ids = data.purchaseOrderIds

      const { error: requestError } = await supabase
        .from('supplierstore_requests')
        .update(updateData)
        .eq('id', id)

      if (requestError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update request', { id, requestError })
        throw requestError
      }

      // If items are updated, replace all items
      if (data.items) {
        // Delete old items
        const { error: deleteError } = await supabase
          .from('supplierstore_request_items')
          .delete()
          .eq('request_id', id)

        if (deleteError) {
          DebugUtils.error(MODULE_NAME, 'Failed to delete old request items', { deleteError })
          throw deleteError
        }

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => {
            const itemWithId: RequestItem = {
              ...item,
              id: item.id || generateId()
            }
            return mapRequestItemToDB(itemWithId, id)
          })

          const { error: itemsError } = await supabase
            .from('supplierstore_request_items')
            .insert(itemsToInsert)

          if (itemsError) {
            DebugUtils.error(MODULE_NAME, 'Failed to insert new request items', { itemsError })
            throw itemsError
          }
        }
      }

      // Fetch updated request
      const updatedRequest = await this.getRequestById(id)
      if (!updatedRequest) {
        throw new Error(`Request ${id} not found after update`)
      }

      DebugUtils.info(MODULE_NAME, 'Request updated successfully', { id })
      return updatedRequest
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating request', { id, error })
      throw error
    }
  }

  async deleteRequest(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting request from Supabase', { id })

      // Delete request (CASCADE will auto-delete items)
      const { error } = await supabase.from('supplierstore_requests').delete().eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to delete request', { id, error })
        throw error
      }

      DebugUtils.info(MODULE_NAME, 'Request deleted successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting request', { id, error })
      throw error
    }
  }

  // =============================================
  // PURCHASE ORDERS METHODS
  // =============================================

  async getOrders(): Promise<PurchaseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('supplierstore_orders')
        .select('*, supplierstore_order_items(*)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const orders = (data || []).map(dbOrder =>
        mapOrderFromDB(dbOrder, dbOrder.supplierstore_order_items || [])
      )

      DebugUtils.info(MODULE_NAME, 'Orders fetched from Supabase', {
        count: orders.length
      })

      return orders
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching orders from Supabase', { error })
      throw error
    }
  }

  async getOrderById(id: string): Promise<PurchaseOrder | null> {
    try {
      const { data, error } = await supabase
        .from('supplierstore_orders')
        .select('*, supplierstore_order_items(*)')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw error
      }

      const order = mapOrderFromDB(data, data.supplierstore_order_items || [])

      DebugUtils.info(MODULE_NAME, 'Order fetched from Supabase', {
        orderId: id,
        orderNumber: order.orderNumber
      })

      return order
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching order by id from Supabase', { id, error })
      throw error
    }
  }

  async createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    // ✅ ПОЛУЧАЕМ ДОСТУП К STORES
    const productsStore = useProductsStore()

    // Get latest prices from storage if available
    const itemIds = data.items.map(item => item.itemId)
    const latestPrices: Record<string, number> = {}

    try {
      const storageStore = useStorageStore()
      if (storageStore && storageStore.getBalance) {
        for (const itemId of itemIds) {
          try {
            // ✅ ИСПРАВЛЕНИЕ: пробуем получить баланс из обоих департаментов
            let latestCost: number | null = null

            // Пробуем кухню
            try {
              const kitchenBalance = storageStore.getBalance(itemId, 'kitchen')
              if (kitchenBalance && kitchenBalance.latestCost > 0) {
                latestCost = kitchenBalance.latestCost
              }
            } catch {
              // Ignore kitchen errors
            }

            // Если не нашли на кухне, пробуем бар
            if (!latestCost) {
              try {
                const barBalance = storageStore.getBalance(itemId, 'bar')
                if (barBalance && barBalance.latestCost > 0) {
                  latestCost = barBalance.latestCost
                }
              } catch {
                // Ignore bar errors
              }
            }

            if (latestCost) {
              latestPrices[itemId] = latestCost
            }
          } catch (error) {
            // Ignore individual item errors
          }
        }
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Could not access storage store, using provided prices', {
        error
      })
    }

    // ✅ СОЗДАЕМ ITEMS С ПОЛЯМИ УПАКОВОК
    const orderItems: OrderItem[] = []

    for (const item of data.items) {
      // Получаем информацию об упаковке
      const pkg = productsStore.getPackageById(item.packageId)

      if (!pkg) {
        throw new Error(`Package ${item.packageId} not found for item ${item.itemId}`)
      }

      // Получаем продукт для базовой информации
      const product = productsStore.products.find(p => p.id === item.itemId)
      if (!product) {
        throw new Error(`Product ${item.itemId} not found`)
      }

      // Рассчитываем упаковки
      const packageQuantity = Math.ceil(item.quantity / pkg.packageSize)
      const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
      const pricePerUnit = latestPrices[item.itemId] || pkg.baseCostPerUnit
      const totalPrice = packageQuantity * packagePrice

      orderItems.push({
        id: generateId(),
        itemId: item.itemId,
        itemName: product.name,

        department: item.department, // ✅ СОХРАНИТЬ DEPARTMENT

        // Количества
        orderedQuantity: item.quantity, // В базовых единицах
        unit: product.baseUnit, // Базовая единица

        // ✅ ПОЛЯ УПАКОВКИ
        packageId: pkg.id,
        packageName: pkg.packageName,
        packageQuantity,
        packageUnit: pkg.packageUnit,

        // ✅ ЦЕНЫ
        pricePerUnit,
        packagePrice,
        totalPrice,

        // Метаданные
        isEstimatedPrice: !latestPrices[item.itemId],
        lastPriceDate: latestPrices[item.itemId] ? new Date().toISOString() : undefined,
        status: 'ordered'
      })
    }

    // Generate order ID and timestamp
    const orderId = generateId()
    const timestamp = new Date().toISOString()
    const orderNumber = await this.generateOrderNumber()

    // Создаем заказ
    const newOrder: PurchaseOrder = {
      id: orderId,
      orderNumber,
      supplierId: data.supplierId,
      supplierName: await this.getSupplierName(data.supplierId),
      orderDate: timestamp,
      expectedDeliveryDate: data.expectedDeliveryDate,

      items: orderItems,

      totalAmount: orderItems.reduce((sum, item) => sum + item.totalPrice, 0),
      isEstimatedTotal: orderItems.some(item => item.isEstimatedPrice),

      status: 'draft',
      billStatus: 'not_billed', // ✅ ИЗМЕНЕНО с paymentStatus

      requestIds: data.requestIds || [],
      notes: data.notes,

      createdAt: timestamp,
      updatedAt: timestamp
    }

    try {
      // ✅ INSERT ORDER TO SUPABASE
      const { data: insertedOrder, error: orderError } = await supabase
        .from('supplierstore_orders')
        .insert([mapOrderToDB(newOrder)])
        .select()
        .single()

      if (orderError) throw orderError

      // ✅ INSERT ORDER ITEMS TO SUPABASE
      if (orderItems.length > 0) {
        const itemsToInsert = orderItems.map(item => mapOrderItemToDB(item, orderId))

        const { error: itemsError } = await supabase
          .from('supplierstore_order_items')
          .insert(itemsToInsert)

        if (itemsError) {
          // Rollback: delete the order
          await supabase.from('supplierstore_orders').delete().eq('id', orderId)
          throw itemsError
        }
      }

      // ✅ UPDATE RELATED REQUESTS IN SUPABASE (link to order)
      if (data.requestIds && data.requestIds.length > 0) {
        for (const requestId of data.requestIds) {
          // Fetch the request
          const { data: dbRequest, error: fetchError } = await supabase
            .from('supplierstore_requests')
            .select('purchase_order_ids')
            .eq('id', requestId)
            .single()

          if (fetchError) {
            DebugUtils.warn(MODULE_NAME, 'Failed to fetch request for linking', {
              requestId,
              error: fetchError
            })
            continue
          }

          // Add order ID to purchase_order_ids array
          const updatedOrderIds = [...(dbRequest.purchase_order_ids || []), orderId]

          // Update the request
          const { error: updateError } = await supabase
            .from('supplierstore_requests')
            .update({
              purchase_order_ids: updatedOrderIds,
              updated_at: timestamp
            })
            .eq('id', requestId)

          if (updateError) {
            DebugUtils.warn(MODULE_NAME, 'Failed to link request to order', {
              requestId,
              orderId,
              error: updateError
            })
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Purchase order created in Supabase with packages', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        supplierId: data.supplierId,
        itemCount: newOrder.items.length,
        totalAmount: newOrder.totalAmount,
        totalPackages: orderItems.reduce((sum, item) => sum + item.packageQuantity, 0),
        usedLatestPrices: Object.keys(latestPrices).length > 0,
        requestIds: data.requestIds
      })

      return newOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating order in Supabase', { error })
      throw error
    }
  }

  async updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      // Fetch current order from Supabase
      const currentOrder = await this.getOrderById(id)
      if (!currentOrder) {
        throw new Error(`Order with id ${id} not found`)
      }

      // Merge update data with current order
      const updatedOrder: PurchaseOrder = {
        ...currentOrder,
        ...data,
        updatedAt: new Date().toISOString()
      }

      // Update order in Supabase
      const { error: orderError } = await supabase
        .from('supplierstore_orders')
        .update(mapOrderToDB(updatedOrder))
        .eq('id', id)

      if (orderError) throw orderError

      // If items are being updated, replace them
      if (data.items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('supplierstore_order_items')
          .delete()
          .eq('order_id', id)

        if (deleteError) throw deleteError

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => mapOrderItemToDB(item, id))

          const { error: insertError } = await supabase
            .from('supplierstore_order_items')
            .insert(itemsToInsert)

          if (insertError) throw insertError
        }
      }

      DebugUtils.info(MODULE_NAME, 'Purchase order updated in Supabase', {
        orderId: id,
        updatedFields: Object.keys(data),
        itemsUpdated: !!data.items
      })

      return updatedOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating order in Supabase', { id, error })
      throw error
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      // Delete order from Supabase (CASCADE will delete order items)
      const { error } = await supabase.from('supplierstore_orders').delete().eq('id', id)

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'Purchase order deleted from Supabase (with CASCADE)', {
        orderId: id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting order from Supabase', { id, error })
      throw error
    }
  }

  // =============================================
  // RECEIPTS METHODS
  // =============================================

  async getReceipts(): Promise<Receipt[]> {
    await this.delay(100)
    return [...this.receipts]
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    await this.delay(50)
    return this.receipts.find(receipt => receipt.id === id) || null
  }

  async createReceipt(data: CreateReceiptData): Promise<Receipt> {
    await this.delay(200)

    // ✅ FETCH ORDER FROM SUPABASE (Phase 2)
    const order = await this.getOrderById(data.purchaseOrderId)
    if (!order) {
      throw new Error(`Order with id ${data.purchaseOrderId} not found`)
    }

    const newReceipt: Receipt = {
      id: `receipt-${Date.now()}`,
      receiptNumber: this.generateReceiptNumber(),
      purchaseOrderId: data.purchaseOrderId,
      deliveryDate: new Date().toISOString(),
      receivedBy: data.receivedBy,
      items: data.items.map(item => {
        const orderItem = order.items.find(oi => oi.id === item.orderItemId)
        if (!orderItem) {
          throw new Error(`Order item with id ${item.orderItemId} not found`)
        }

        return {
          id: `receipt-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          orderItemId: item.orderItemId,
          itemId: orderItem.itemId,
          itemName: orderItem.itemName,
          orderedQuantity: orderItem.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          orderedPrice: orderItem.pricePerUnit,
          actualPrice: item.actualPrice || orderItem.pricePerUnit,
          notes: item.notes
        }
      }),
      hasDiscrepancies: this.calculateDiscrepancies(data, order),
      status: 'draft',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.receipts.unshift(newReceipt)

    DebugUtils.info(MODULE_NAME, 'Receipt created', {
      receiptId: newReceipt.id,
      orderId: data.purchaseOrderId,
      itemCount: newReceipt.items.length,
      hasDiscrepancies: newReceipt.hasDiscrepancies
    })

    return newReceipt
  }

  async completeReceipt(id: string, notes?: string): Promise<Receipt> {
    await this.delay(200)

    const receipt = this.receipts.find(r => r.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    if (receipt.status !== 'draft') {
      throw new Error('Only draft receipts can be completed')
    }

    // ✅ FETCH ORDER FROM SUPABASE (Phase 2)
    const order = await this.getOrderById(receipt.purchaseOrderId)
    if (!order) {
      throw new Error(`Order not found for receipt ${id}`)
    }

    DebugUtils.info(MODULE_NAME, 'Completing receipt with storage integration', {
      receiptId: id,
      receiptNumber: receipt.receiptNumber,
      orderId: order.id
    })

    // Update receipt status
    receipt.status = 'completed'
    receipt.notes = notes || receipt.notes
    receipt.updatedAt = new Date().toISOString()

    // Update order status
    if (order.status === 'confirmed') {
      order.status = 'delivered'
      order.receiptId = receipt.id
      order.updatedAt = new Date().toISOString()

      // Update order items with received quantities
      receipt.items.forEach(receiptItem => {
        const orderItem = order.items.find(oi => oi.id === receiptItem.orderItemId)
        if (orderItem) {
          orderItem.receivedQuantity = receiptItem.receivedQuantity
          orderItem.status = 'received'

          // Update price if changed
          if (receiptItem.actualPrice && receiptItem.actualPrice !== receiptItem.orderedPrice) {
            orderItem.pricePerUnit = receiptItem.actualPrice
            orderItem.totalPrice = receiptItem.receivedQuantity * receiptItem.actualPrice
            orderItem.isEstimatedPrice = false
          }
        }
      })

      // Recalculate order total
      order.totalAmount = order.items.reduce(
        (sum, item) => sum + (item.receivedQuantity || item.orderedQuantity) * item.pricePerUnit,
        0
      )
      order.isEstimatedTotal = false
    }

    // Try to create storage operations (don't fail if error)
    try {
      const operationId = await this.storageIntegration.createReceiptOperation(receipt, order)
      receipt.storageOperationId = operationId

      DebugUtils.info(MODULE_NAME, 'Storage operation created successfully', {
        receiptId: id,
        operationId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Storage operation failed, but receipt completed', {
        receiptId: id,
        error
      })
    }

    // Try to update product prices (don't fail if error)
    try {
      await this.storageIntegration.updateProductPrices(receipt)

      DebugUtils.info(MODULE_NAME, 'Product prices updated successfully', {
        receiptId: id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Price update failed, but receipt completed', {
        receiptId: id,
        error
      })
    }

    DebugUtils.info(MODULE_NAME, 'Receipt completed successfully with full integration', {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      storageOperationId: receipt.storageOperationId,
      orderId: order.id,
      orderStatus: order.status
    })

    return receipt
  }

  async updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    await this.delay(150)

    const receipt = this.receipts.find(rec => rec.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    Object.assign(receipt, {
      ...data,
      updatedAt: new Date().toISOString()
    })

    DebugUtils.info(MODULE_NAME, 'Receipt updated', { receiptId: id })
    return receipt
  }

  // =============================================
  // ORDER SUGGESTIONS - FROM COORDINATOR
  // =============================================

  async getOrderSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting order suggestions', {
        department: department || 'all',
        source: 'ALWAYS_dynamic_from_storage'
      })

      // ✅ ВСЕГДА используем только динамические данные из Storage
      const suggestions = await this.storageIntegration.getSuggestionsFromStock(department)

      DebugUtils.info(MODULE_NAME, 'Dynamic suggestions loaded successfully', {
        department: department || 'all',
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        medium: suggestions.filter(s => s.urgency === 'medium').length,
        low: suggestions.filter(s => s.urgency === 'low').length,
        source: 'dynamic_storage_integration'
      })

      // ✅ ВАЛИДАЦИЯ: Проверяем корректность данных
      const validSuggestions = suggestions.filter(
        s =>
          s.itemId &&
          s.itemName &&
          typeof s.currentStock === 'number' &&
          typeof s.minStock === 'number' &&
          s.currentStock >= 0 &&
          s.minStock >= 0
      )

      if (validSuggestions.length !== suggestions.length) {
        DebugUtils.warn(MODULE_NAME, 'Some suggestions were invalid and filtered out', {
          total: suggestions.length,
          valid: validSuggestions.length,
          filtered: suggestions.length - validSuggestions.length,
          invalidSuggestions: suggestions
            .filter(s => !validSuggestions.includes(s))
            .map(s => ({
              itemId: s.itemId,
              issue: !s.itemId
                ? 'missing itemId'
                : !s.itemName
                  ? 'missing itemName'
                  : 'invalid stock values'
            }))
        })
      }

      // ✅ ФИЛЬТРАЦИЯ: Убираем товары с существующими активными заявками
      const filteredSuggestions = await this.filterSuggestionsWithExistingRequests(
        validSuggestions,
        department
      )

      DebugUtils.info(MODULE_NAME, 'Order suggestions processed successfully', {
        department: department || 'all',
        dataSource: 'dynamic_storage_integration',
        totalSuggestions: suggestions.length,
        validSuggestions: validSuggestions.length,
        filteredOut: validSuggestions.length - filteredSuggestions.length,
        finalSuggestions: filteredSuggestions.length,
        sampleSuggestions: filteredSuggestions.slice(0, 3).map(s => ({
          itemName: s.itemName,
          currentStock: s.currentStock,
          minStock: s.minStock,
          urgency: s.urgency
        }))
      })

      return filteredSuggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get order suggestions', {
        error,
        department,
        errorMessage: error instanceof Error ? error.message : String(error)
      })

      // ✅ При ошибке возвращаем пустой массив, НЕ fallback на mock
      DebugUtils.warn(
        MODULE_NAME,
        'Returning empty suggestions due to error - no fallback to mock data'
      )
      return []
    }
  }

  // ✅ UPDATED: filterSuggestionsWithExistingRequests now fetches from Supabase
  private async filterSuggestionsWithExistingRequests(
    suggestions: OrderSuggestion[],
    department?: Department
  ): Promise<OrderSuggestion[]> {
    try {
      // Fetch active requests from Supabase (draft + submitted, NOT converted/cancelled)
      let query = supabase
        .from('supplierstore_requests')
        .select('*, supplierstore_request_items(*)')
        .in('status', ['draft', 'submitted'])

      // Filter by department if specified
      if (department) {
        query = query.eq('department', department)
      }

      const { data, error } = await query

      if (error) {
        DebugUtils.warn(MODULE_NAME, 'Failed to fetch active requests, skipping filter', { error })
        return suggestions
      }

      const relevantRequests = (data || []).map(dbRequest =>
        mapRequestFromDB(dbRequest, dbRequest.supplierstore_request_items || [])
      )

      if (relevantRequests.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'No active requests found, returning all suggestions', {
          department: department || 'all',
          suggestionsCount: suggestions.length
        })
        return suggestions
      }

      // Calculate already requested quantities per item
      const requestedQuantities: Record<string, number> = {}

      relevantRequests.forEach(request => {
        request.items.forEach(item => {
          const currentRequested = requestedQuantities[item.itemId] || 0
          requestedQuantities[item.itemId] = currentRequested + item.requestedQuantity
        })
      })

      DebugUtils.debug(MODULE_NAME, 'Calculated requested quantities', {
        requestedQuantities,
        activeRequests: relevantRequests.length,
        department: department || 'all'
      })

      // Filter suggestions
      const filtered = suggestions.filter(suggestion => {
        const alreadyRequested = requestedQuantities[suggestion.itemId] || 0

        // Remove suggestion if already requested enough
        if (alreadyRequested >= suggestion.suggestedQuantity) {
          DebugUtils.debug(MODULE_NAME, 'Removing suggestion - already requested enough', {
            itemId: suggestion.itemId,
            itemName: suggestion.itemName,
            suggestedQuantity: suggestion.suggestedQuantity,
            alreadyRequested
          })
          return false
        }

        // Reduce suggested quantity if partially requested
        if (alreadyRequested > 0) {
          const originalQuantity = suggestion.suggestedQuantity
          suggestion.suggestedQuantity = Math.max(
            0,
            suggestion.suggestedQuantity - alreadyRequested
          )

          DebugUtils.debug(MODULE_NAME, 'Reducing suggestion quantity', {
            itemId: suggestion.itemId,
            itemName: suggestion.itemName,
            originalQuantity,
            alreadyRequested,
            newSuggestedQuantity: suggestion.suggestedQuantity
          })
        }

        return true
      })

      DebugUtils.debug(MODULE_NAME, 'Filtered suggestions with existing requests', {
        originalCount: suggestions.length,
        filteredCount: filtered.length,
        removedCount: suggestions.length - filtered.length,
        department: department || 'all'
      })

      return filtered
    } catch (error) {
      DebugUtils.warn(
        MODULE_NAME,
        'Error filtering existing requests, returning original suggestions',
        {
          error,
          suggestionsCount: suggestions.length
        }
      )
      return suggestions
    }
  }

  // =============================================
  // ✅ НОВЫЙ МЕТОД: Получение актуальных цен из Storage (усовершенствованный)
  // =============================================

  async getLatestPrices(itemIds: string[]): Promise<Record<string, number>> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting latest prices', {
        itemIds,
        source: 'attempting_storage_integration'
      })

      // Пытаемся получить цены через storageIntegration
      const storagePrice = await this.storageIntegration.getLatestPrices(itemIds)

      // Дополняем недостающие цены из Products Store
      const productsStore = useProductsStore()
      const combinedPrices: Record<string, number> = {}

      for (const itemId of itemIds) {
        // Приоритет 1: цена из Storage (самая актуальная)
        if (storagePrice[itemId] && storagePrice[itemId] > 0) {
          combinedPrices[itemId] = storagePrice[itemId]
          continue
        }

        // Приоритет 2: цена из Products Store
        const product = productsStore.products.find(p => p.id === itemId)
        if (product) {
          if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
            combinedPrices[itemId] = product.baseCostPerUnit
          } else if (product.costPerUnit && product.costPerUnit > 0) {
            combinedPrices[itemId] = product.costPerUnit
          }
        }
      }

      DebugUtils.debug(MODULE_NAME, 'Latest prices retrieved', {
        requested: itemIds.length,
        found: Object.keys(combinedPrices).length,
        fromStorage: Object.keys(storagePrice).length,
        fromProducts: Object.keys(combinedPrices).length - Object.keys(storagePrice).length
      })

      return combinedPrices
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get latest prices', { error, itemIds })
      return {}
    }
  }

  // =============================================
  // ✅ НОВЫЙ МЕТОД: Принудительное обновление suggestions
  // =============================================

  async refreshSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Force refreshing suggestions', {
        department: department || 'all'
      })

      // Инвалидируем кэш перед получением новых данных
      this.storageIntegration.invalidateCache()

      // Получаем свежие suggestions
      const suggestions = await this.getOrderSuggestions(department)

      DebugUtils.info(MODULE_NAME, 'Suggestions force refreshed', {
        department: department || 'all',
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length
      })

      return suggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh suggestions', { error, department })
      return []
    }
  }
  // =============================================
  // SUPPLIER BASKET METHODS
  // =============================================

  async createSupplierBaskets(requestIds: string[]): Promise<SupplierBasket[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating supplier baskets from requests', {
        requestIds
      })

      // Fetch requests from Supabase
      const { data, error } = await supabase
        .from('supplierstore_requests')
        .select('*, supplierstore_request_items(*)')
        .in('id', requestIds)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch requests for baskets', { error })
        throw error
      }

      const requests = (data || []).map(dbRequest =>
        mapRequestFromDB(dbRequest, dbRequest.supplierstore_request_items || [])
      )

      if (requests.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No requests found for baskets', { requestIds })
        return []
      }

      // ✅ Импортируем productsStore в начале метода
      const { useProductsStore } = await import('@/stores/productsStore')
      const productsStore = useProductsStore()

      const unassignedItems: UnassignedItem[] = []

      for (const request of requests) {
        console.log(`Processing request ${request.requestNumber} (${request.status})`)

        for (const item of request.items) {
          // ✅ ПОЛУЧАЕМ ПРОДУКТ ДЛЯ БАЗОВЫХ ДАННЫХ
          const product = productsStore.getProductById(item.itemId)

          if (!product) {
            console.warn(`Product not found: ${item.itemId}, skipping item`)
            continue
          }

          const orderedQuantity = this.getOrderedQuantityForItem(request.id, item.itemId)
          const remainingQuantity = item.requestedQuantity - orderedQuantity

          console.log(
            `Item ${item.itemName}: requested=${item.requestedQuantity}, ordered=${orderedQuantity}, remaining=${remainingQuantity}`
          )

          if (remainingQuantity > 0) {
            const existingItem = unassignedItems.find(ui => ui.itemId === item.itemId)

            if (existingItem) {
              existingItem.totalQuantity += remainingQuantity
              existingItem.sources.push({
                requestId: request.id,
                requestNumber: request.requestNumber,
                department: request.department,
                quantity: remainingQuantity,
                packageId: item.packageId,
                packageQuantity: item.packageQuantity
              })
            } else {
              unassignedItems.push({
                itemId: item.itemId,
                itemName: item.itemName,
                category: product.category, // ✅ Из продукта
                totalQuantity: remainingQuantity,

                // ✅ КРИТИЧНО: Заполняем из продукта
                unit: product.baseUnit,
                estimatedBaseCost: product.baseCostPerUnit,

                // Рекомендованная упаковка из request
                recommendedPackageId: item.packageId,
                recommendedPackageName: item.packageName,

                sources: [
                  {
                    requestId: request.id,
                    requestNumber: request.requestNumber,
                    department: request.department,
                    quantity: remainingQuantity,
                    packageId: item.packageId,
                    packageQuantity: item.packageQuantity
                  }
                ]
              })
            }
          } else {
            console.log(`Item ${item.itemName} is fully ordered, skipping`)
          }
        }
      }

      const baskets: SupplierBasket[] = [
        {
          supplierId: null,
          supplierName: 'Unassigned',
          items: unassignedItems,
          totalItems: unassignedItems.length,
          // ✅ Считаем по baseCostPerUnit
          estimatedTotal: unassignedItems.reduce(
            (sum, item) => sum + item.totalQuantity * item.estimatedBaseCost,
            0
          )
        }
      ]

      console.log(
        `Created baskets: ${unassignedItems.length} unassigned items from ${requests.length} requests`
      )

      return baskets
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create supplier baskets', { error })
      throw error
    }
  }

  private async getOrderedQuantityForItem(requestId: string, itemId: string): Promise<number> {
    let totalOrdered = 0

    // ✅ FETCH ORDERS FROM SUPABASE (Phase 2)
    const allOrders = await this.getOrders()
    const relatedOrders = allOrders.filter(order => order.requestIds.includes(requestId))

    for (const order of relatedOrders) {
      const orderItem = order.items.find(item => item.itemId === itemId)
      if (orderItem) {
        totalOrdered += orderItem.orderedQuantity
      }
    }

    return totalOrdered
  }

  // =============================================
  // STATISTICS
  // =============================================

  async getStatistics() {
    await this.delay(50)

    // ✅ FETCH FROM SUPABASE (Phase 2)
    const requests = await this.getRequests()
    const orders = await this.getOrders()

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'submitted').length,
      totalOrders: orders.length,
      ordersAwaitingPayment: orders.filter(o => o.billStatus === 'pending').length,
      ordersAwaitingDelivery: orders.filter(o => o.status === 'sent' && o.billStatus === 'billed')
        .length,
      totalReceipts: this.receipts.length,
      pendingReceipts: this.receipts.filter(r => r.status === 'draft').length,
      urgentSuggestions: 0
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateDiscrepancies(data: CreateReceiptData, order: PurchaseOrder): boolean {
    return data.items.some(item => {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId)
      if (!orderItem) return false

      // Check quantity discrepancy
      if (Math.abs(item.receivedQuantity - orderItem.orderedQuantity) > 0.01) {
        return true
      }

      // Check price discrepancy
      if (item.actualPrice && Math.abs(item.actualPrice - orderItem.pricePerUnit) > 0.01) {
        return true
      }

      return false
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async generateRequestNumber(department: Department): Promise<string> {
    try {
      const departmentPrefix = department === 'kitchen' ? 'KIT' : 'BAR'
      const date = new Date()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      // Count existing requests for this department
      const { count, error } = await supabase
        .from('supplierstore_requests')
        .select('*', { count: 'exact', head: true })
        .eq('department', department)

      if (error) {
        DebugUtils.warn(MODULE_NAME, 'Failed to count requests, using fallback', { error })
        // Fallback to timestamp-based number
        return `REQ-${departmentPrefix}-${month}${day}-${String(Date.now()).slice(-3)}`
      }

      const sequence = (count || 0) + 1

      return `REQ-${departmentPrefix}-${month}${day}-${String(sequence).padStart(3, '0')}`
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error generating request number', { error })
      // Fallback
      const departmentPrefix = department === 'kitchen' ? 'KIT' : 'BAR'
      const date = new Date()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `REQ-${departmentPrefix}-${month}${day}-${String(Date.now()).slice(-3)}`
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    try {
      // Count orders from Supabase
      const { count, error } = await supabase
        .from('supplierstore_orders')
        .select('*', { count: 'exact', head: true })

      if (error) {
        DebugUtils.warn(MODULE_NAME, 'Failed to count orders from Supabase, using timestamp', {
          error
        })
        // Fallback to timestamp-based number
        return `PO-${month}${day}-${String(Date.now()).slice(-3)}`
      }

      const sequence = (count || 0) + 1
      return `PO-${month}${day}-${String(sequence).padStart(3, '0')}`
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Error generating order number, using timestamp', { error })
      return `PO-${month}${day}-${String(Date.now()).slice(-3)}`
    }
  }

  private generateReceiptNumber(): string {
    const count = this.receipts.length + 1
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `RCP-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private async getSupplierName(supplierId: string): Promise<string> {
    try {
      // Получаем counteragentsStore
      const counteragentsStore = useCounteragentsStore()

      // Ищем поставщика по ID
      const supplier = counteragentsStore.getCounteragentById(supplierId)

      if (supplier) {
        // Возвращаем displayName если есть, иначе name
        return supplier.displayName || supplier.name
      }

      // Если поставщик не найден, логируем предупреждение и возвращаем fallback
      DebugUtils.warn(MODULE_NAME, 'Supplier not found in counteragentsStore', {
        supplierId,
        availableSuppliers: counteragentsStore.supplierCounterAgents.map(s => ({
          id: s.id,
          name: s.name
        }))
      })

      return 'Unknown Supplier'
    } catch (error) {
      // В случае ошибки логируем и возвращаем fallback
      DebugUtils.error(MODULE_NAME, 'Error getting supplier name from counteragentsStore', {
        supplierId,
        error
      })

      return 'Unknown Supplier'
    }
  }
  private async getItemName(itemId: string): Promise<string> {
    const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
    const product = mockDataCoordinator.getProductDefinition(itemId)
    if (product) {
      return product.name
    }

    const itemNames: Record<string, string> = {
      'prod-beef-steak': 'Beef Steak',
      'prod-potato': 'Potato',
      'prod-garlic': 'Garlic',
      'prod-tomato': 'Fresh Tomato',
      'prod-onion': 'Onion',
      'prod-olive-oil': 'Olive Oil',
      'prod-milk': 'Milk 3.2%',
      'prod-butter': 'Butter',
      'prod-salt': 'Salt',
      'prod-black-pepper': 'Black Pepper',
      'prod-oregano': 'Oregano',
      'prod-basil': 'Fresh Basil',
      'prod-beer-bintang-330': 'Bintang Beer 330ml',
      'prod-beer-bintang-500': 'Bintang Beer 500ml',
      'prod-cola-330': 'Coca-Cola 330ml',
      'prod-water-500': 'Mineral Water 500ml'
    }
    return itemNames[itemId] || 'Unknown Item'
  }

  private async getItemUnit(itemId: string): string {
    const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
    const product = mockDataCoordinator.getProductDefinition(itemId)
    if (product) {
      return product.baseUnit
    }

    if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water'))
      return 'piece'
    if (itemId.includes('oil') || itemId.includes('milk')) return 'ml'
    return 'gram'
  }
}

export const supplierService = new SupplierService()
export default supplierService
