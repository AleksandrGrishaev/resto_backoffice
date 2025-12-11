// src/stores/supplier_2/supplierService.ts - MIGRATED TO SUPABASE

import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useSupplierStorageIntegration } from './integrations/storageIntegration'
import { useCounteragentsStore } from '@/stores/counteragents'
import { supabase } from '@/supabase/client'
import { generateId } from '@/utils/id'
import { isUnitDivisible } from '@/types/measurementUnits'
import {
  mapRequestFromDB,
  mapRequestToDB,
  mapRequestItemToDB,
  mapOrderFromDB,
  mapOrderToDB,
  mapOrderItemToDB,
  mapReceiptFromDB,
  mapReceiptToDB,
  mapReceiptItemToDB
} from './supabaseMappers'

import { DebugUtils, extractErrorDetails } from '@/utils'
import {
  executeSupabaseQuery,
  executeSupabaseSingle,
  executeSupabaseMutation
} from '@/utils/supabase'
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
  // ✅ REMOVED: private requests array (now using Supabase - Phase 1)
  // ✅ REMOVED: private orders array (now using Supabase - Phase 2)
  // ✅ REMOVED: private receipts array (now using Supabase - Phase 3)
  private storageIntegration = useSupplierStorageIntegration()

  constructor() {}

  // =============================================
  // LOAD DATA FROM COORDINATOR (Phase 1: Requests migrated to Supabase)
  // =============================================

  async loadDataFromCoordinator(): Promise<void> {
    // ✅ PHASE 1-3 COMPLETE: All data now loaded from Supabase
    // ✅ REMOVED: requests (Phase 1)
    // ✅ REMOVED: orders (Phase 2)
    // ✅ REMOVED: receipts (Phase 3)
    // This method is kept for compatibility, will be removed in Phase 4

    DebugUtils.info(MODULE_NAME, '✅ All data now loaded from Supabase (Phase 1-3 complete)', {
      message: 'Mock data coordinator no longer used'
    })
  }

  // =============================================
  // PROCUREMENT REQUESTS METHODS
  // =============================================

  async getRequests(): Promise<ProcurementRequest[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching requests from Supabase...')

      // Fetch requests with items in a single query
      const data = await executeSupabaseQuery(
        supabase
          .from('supplierstore_requests')
          .select('*, supplierstore_request_items(*)')
          .order('created_at', { ascending: false }),
        `${MODULE_NAME}.getRequests`
      )

      // Map database rows to TypeScript objects
      const requests = data.map(dbRequest =>
        mapRequestFromDB(dbRequest, dbRequest.supplierstore_request_items || [])
      )

      DebugUtils.info(MODULE_NAME, 'Requests fetched from Supabase', {
        count: requests.length
      })

      return requests
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching requests', extractErrorDetails(error))
      throw error
    }
  }

  async getRequestById(id: string): Promise<ProcurementRequest | null> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching request by ID from Supabase', { id })

      // Fetch request with items
      const data = await executeSupabaseSingle(
        supabase
          .from('supplierstore_requests')
          .select('*, supplierstore_request_items(*)')
          .eq('id', id),
        `${MODULE_NAME}.getRequestById`
      )

      if (!data) {
        DebugUtils.warn(MODULE_NAME, 'Request not found', { id })
        return null
      }

      const request = mapRequestFromDB(data, data.supplierstore_request_items || [])

      DebugUtils.info(MODULE_NAME, 'Request fetched by ID', {
        id,
        requestNumber: request.requestNumber
      })

      return request
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching request by ID', {
        id,
        ...extractErrorDetails(error)
      })
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
      await executeSupabaseMutation(async () => {
        const { data: insertedRequest, error: requestError } = await supabase
          .from('supplierstore_requests')
          .insert([mapRequestToDB(newRequest)])
          .select()
          .single()

        if (requestError) throw requestError
      }, `${MODULE_NAME}.createRequest.insertRequest`)

      // Insert request items
      if (newRequest.items.length > 0) {
        const itemsToInsert = newRequest.items.map(item => mapRequestItemToDB(item, requestId))

        try {
          await executeSupabaseMutation(async () => {
            const { error: itemsError } = await supabase
              .from('supplierstore_request_items')
              .insert(itemsToInsert)

            if (itemsError) throw itemsError
          }, `${MODULE_NAME}.createRequest.insertItems`)
        } catch (itemsError) {
          DebugUtils.error(
            MODULE_NAME,
            'Failed to insert request items',
            extractErrorDetails(itemsError)
          )
          // Rollback: delete the request
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('supplierstore_requests')
              .delete()
              .eq('id', requestId)
            if (error) throw error
          }, `${MODULE_NAME}.createRequest.rollback`)
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
      DebugUtils.error(MODULE_NAME, 'Error creating request', extractErrorDetails(error))
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

      await executeSupabaseMutation(async () => {
        const { error: requestError } = await supabase
          .from('supplierstore_requests')
          .update(updateData)
          .eq('id', id)

        if (requestError) throw requestError
      }, `${MODULE_NAME}.updateRequest.updateMain`)

      // If items are updated, replace all items
      if (data.items) {
        // Delete old items
        await executeSupabaseMutation(async () => {
          const { error: deleteError } = await supabase
            .from('supplierstore_request_items')
            .delete()
            .eq('request_id', id)

          if (deleteError) throw deleteError
        }, `${MODULE_NAME}.updateRequest.deleteOldItems`)

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => {
            const itemWithId: RequestItem = {
              ...item,
              id: item.id || generateId()
            }
            return mapRequestItemToDB(itemWithId, id)
          })

          await executeSupabaseMutation(async () => {
            const { error: itemsError } = await supabase
              .from('supplierstore_request_items')
              .insert(itemsToInsert)

            if (itemsError) throw itemsError
          }, `${MODULE_NAME}.updateRequest.insertNewItems`)
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
      DebugUtils.error(MODULE_NAME, 'Error updating request', { id, ...extractErrorDetails(error) })
      throw error
    }
  }

  /**
   * ✅ Check if request can be deleted
   * Returns { canDelete: boolean, reason?: string }
   */
  async canDeleteRequest(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      // 1. Get request to check status
      const request = await this.getRequestById(id)
      if (!request) {
        return { canDelete: false, reason: 'Request not found' }
      }

      // 2. Check status - only draft and submitted can be deleted
      const allowedStatuses = ['draft', 'submitted']
      if (!allowedStatuses.includes(request.status)) {
        return {
          canDelete: false,
          reason: `Cannot delete request with status "${request.status}". Only draft and submitted requests can be deleted.`
        }
      }

      // 3. Check if any orders reference this request
      const orders = await this.getOrders()
      const ordersWithThisRequest = orders.filter(order => order.requestIds.includes(id))

      if (ordersWithThisRequest.length > 0) {
        const orderNumbers = ordersWithThisRequest.map(o => o.orderNumber).join(', ')
        return {
          canDelete: false,
          reason: `Cannot delete request. It is referenced by order(s): ${orderNumbers}`
        }
      }

      return { canDelete: true }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error checking if request can be deleted', {
        id,
        ...extractErrorDetails(error)
      })
      return { canDelete: false, reason: 'Error checking delete eligibility' }
    }
  }

  async deleteRequest(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting request from Supabase', { id })

      // ✅ Validate before deleting
      const { canDelete, reason } = await this.canDeleteRequest(id)
      if (!canDelete) {
        throw new Error(reason || 'Cannot delete this request')
      }

      // Delete request (CASCADE will auto-delete items)
      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('supplierstore_requests').delete().eq('id', id)
        if (error) throw error
      }, `${MODULE_NAME}.deleteRequest`)

      DebugUtils.info(MODULE_NAME, 'Request deleted successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting request', { id, ...extractErrorDetails(error) })
      throw error
    }
  }

  // =============================================
  // PURCHASE ORDERS METHODS
  // =============================================

  async getOrders(): Promise<PurchaseOrder[]> {
    try {
      const data = await executeSupabaseQuery(
        supabase
          .from('supplierstore_orders')
          .select('*, supplierstore_order_items(*)')
          .order('created_at', { ascending: false }),
        `${MODULE_NAME}.getOrders`
      )

      const orders = data.map(dbOrder =>
        mapOrderFromDB(dbOrder, dbOrder.supplierstore_order_items || [])
      )

      DebugUtils.info(MODULE_NAME, 'Orders fetched from Supabase', {
        count: orders.length
      })

      return orders
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Error fetching orders from Supabase',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  async getOrderById(id: string): Promise<PurchaseOrder | null> {
    try {
      const data = await executeSupabaseSingle(
        supabase
          .from('supplierstore_orders')
          .select('*, supplierstore_order_items(*)')
          .eq('id', id),
        `${MODULE_NAME}.getOrderById`
      )

      if (!data) return null

      const order = mapOrderFromDB(data, data.supplierstore_order_items || [])

      DebugUtils.info(MODULE_NAME, 'Order fetched from Supabase', {
        orderId: id,
        orderNumber: order.orderNumber
      })

      return order
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching order by id from Supabase', {
        id,
        ...extractErrorDetails(error)
      })
      throw error
    }
  }

  async createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    // ✅ ПОЛУЧАЕМ ДОСТУП К STORES
    const productsStore = useProductsStore()

    // ✅ REFACTORED: Use prices from request/basket (item.pricePerUnit) instead of Storage query
    // Price priority: item.pricePerUnit (from basket) > product.lastKnownCost > product.baseCostPerUnit

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
      // Для делимых единиц (gram, kg, ml, liter) - разрешаем дробные упаковки
      // Для неделимых (piece, pack, portion) - округляем вверх
      const rawPackageQuantity = item.quantity / pkg.packageSize
      const packageQuantity = isUnitDivisible(product.baseUnit)
        ? Math.round(rawPackageQuantity * 100) / 100 // Round to 2 decimal places
        : Math.ceil(rawPackageQuantity) // Round up for indivisible units

      // ✅ REFACTORED: Price priority from basket > product.lastKnownCost > baseCostPerUnit
      const pricePerUnit = item.pricePerUnit ?? product.lastKnownCost ?? pkg.baseCostPerUnit
      const hasUserPrice = item.pricePerUnit != null && item.pricePerUnit > 0

      // ✅ FIXED: Calculate package price from pricePerUnit when user/request price exists
      // Priority: item.packagePrice > calculated from pricePerUnit > pkg.packagePrice > fallback
      let packagePrice: number
      if (item.packagePrice != null && item.packagePrice > 0) {
        // Explicit package price from basket
        packagePrice = item.packagePrice
      } else if (hasUserPrice || product.lastKnownCost != null) {
        // Calculate from determined pricePerUnit (user price or lastKnownCost)
        packagePrice = pricePerUnit * pkg.packageSize
      } else {
        // Fallback to package's stored price
        packagePrice = pkg.packagePrice ?? pkg.baseCostPerUnit * pkg.packageSize
      }
      const totalPrice = packageQuantity * packagePrice

      orderItems.push({
        id: generateId(),
        itemId: item.itemId,
        itemName: product.name,

        department: (item as { department?: string }).department, // Optional department

        // Количества
        orderedQuantity: item.quantity, // В базовых единицах
        unit: product.baseUnit, // Базовая единица

        // ✅ ПОЛЯ УПАКОВКИ
        packageId: pkg.id,
        packageName: pkg.packageName,
        packageQuantity,
        packageUnit: pkg.packageUnit,

        // ✅ ЦЕНЫ (now using basket price or product.lastKnownCost)
        pricePerUnit,
        packagePrice,
        totalPrice,

        // Метаданные
        isEstimatedPrice: !hasUserPrice && product.lastKnownCost == null,
        lastPriceDate: hasUserPrice || product.lastKnownCost ? new Date().toISOString() : undefined,
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
      await executeSupabaseMutation(async () => {
        const { data: insertedOrder, error: orderError } = await supabase
          .from('supplierstore_orders')
          .insert([mapOrderToDB(newOrder)])
          .select()
          .single()

        if (orderError) throw orderError
      }, `${MODULE_NAME}.createOrder.insertOrder`)

      // ✅ INSERT ORDER ITEMS TO SUPABASE
      if (orderItems.length > 0) {
        const itemsToInsert = orderItems.map(item => mapOrderItemToDB(item, orderId))

        try {
          await executeSupabaseMutation(async () => {
            const { error: itemsError } = await supabase
              .from('supplierstore_order_items')
              .insert(itemsToInsert)

            if (itemsError) throw itemsError
          }, `${MODULE_NAME}.createOrder.insertItems`)
        } catch (itemsError) {
          // Rollback: delete the order
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('supplierstore_orders').delete().eq('id', orderId)
            if (error) throw error
          }, `${MODULE_NAME}.createOrder.rollback`)
          throw itemsError
        }
      }

      // ✅ UPDATE RELATED REQUESTS IN SUPABASE (link to order)
      if (data.requestIds && data.requestIds.length > 0) {
        for (const requestId of data.requestIds) {
          try {
            // Fetch the request
            const dbRequest = await executeSupabaseSingle(
              supabase
                .from('supplierstore_requests')
                .select('purchase_order_ids')
                .eq('id', requestId),
              `${MODULE_NAME}.createOrder.fetchRequest`
            )

            if (!dbRequest) {
              DebugUtils.warn(MODULE_NAME, 'Request not found for linking', { requestId })
              continue
            }

            // Add order ID to purchase_order_ids array
            const updatedOrderIds = [...(dbRequest.purchase_order_ids || []), orderId]

            // Update the request
            await executeSupabaseMutation(async () => {
              const { error: updateError } = await supabase
                .from('supplierstore_requests')
                .update({
                  purchase_order_ids: updatedOrderIds,
                  updated_at: timestamp
                })
                .eq('id', requestId)

              if (updateError) throw updateError
            }, `${MODULE_NAME}.createOrder.linkRequest`)
          } catch (error) {
            DebugUtils.warn(MODULE_NAME, 'Failed to link request to order', {
              requestId,
              orderId,
              ...extractErrorDetails(error)
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
        requestIds: data.requestIds
      })

      return newOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating order in Supabase', extractErrorDetails(error))
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
      await executeSupabaseMutation(async () => {
        const { error: orderError } = await supabase
          .from('supplierstore_orders')
          .update(mapOrderToDB(updatedOrder))
          .eq('id', id)

        if (orderError) throw orderError
      }, `${MODULE_NAME}.updateOrder.updateMain`)

      // If items are being updated, replace them
      if (data.items) {
        // Delete existing items
        await executeSupabaseMutation(async () => {
          const { error: deleteError } = await supabase
            .from('supplierstore_order_items')
            .delete()
            .eq('order_id', id)

          if (deleteError) throw deleteError
        }, `${MODULE_NAME}.updateOrder.deleteOldItems`)

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => mapOrderItemToDB(item, id))

          await executeSupabaseMutation(async () => {
            const { error: insertError } = await supabase
              .from('supplierstore_order_items')
              .insert(itemsToInsert)

            if (insertError) throw insertError
          }, `${MODULE_NAME}.updateOrder.insertNewItems`)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Purchase order updated in Supabase', {
        orderId: id,
        updatedFields: Object.keys(data),
        itemsUpdated: !!data.items
      })

      return updatedOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating order in Supabase', {
        id,
        ...extractErrorDetails(error)
      })
      throw error
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      // Delete order from Supabase (CASCADE will delete order items)
      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('supplierstore_orders').delete().eq('id', id)
        if (error) throw error
      }, `${MODULE_NAME}.deleteOrder`)

      DebugUtils.info(MODULE_NAME, 'Purchase order deleted from Supabase (with CASCADE)', {
        orderId: id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting order from Supabase', {
        id,
        ...extractErrorDetails(error)
      })
      throw error
    }
  }

  // =============================================
  // RECEIPTS METHODS
  // =============================================

  async getReceipts(): Promise<Receipt[]> {
    try {
      // ✅ FETCH FROM SUPABASE (Phase 3)
      const data = await executeSupabaseQuery(
        supabase
          .from('supplierstore_receipts')
          .select('*, supplierstore_receipt_items(*)')
          .order('delivery_date', { ascending: false }),
        `${MODULE_NAME}.getReceipts`
      )

      const receipts = data.map(dbReceipt =>
        mapReceiptFromDB(dbReceipt, dbReceipt.supplierstore_receipt_items || [])
      )

      DebugUtils.info(MODULE_NAME, '✅ Receipts loaded from Supabase', { count: receipts.length })
      return receipts
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Failed to fetch receipts from Supabase',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    try {
      // ✅ FETCH FROM SUPABASE (Phase 3)
      const data = await executeSupabaseSingle(
        supabase
          .from('supplierstore_receipts')
          .select('*, supplierstore_receipt_items(*)')
          .eq('id', id),
        `${MODULE_NAME}.getReceiptById`
      )

      if (!data) return null

      return mapReceiptFromDB(data, data.supplierstore_receipt_items || [])
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch receipt from Supabase', {
        error: extractErrorDetails(error),
        id
      })
      throw error
    }
  }

  async createReceipt(data: CreateReceiptData): Promise<Receipt> {
    // ✅ FETCH ORDER FROM SUPABASE (Phase 2)
    const order = await this.getOrderById(data.purchaseOrderId)
    if (!order) {
      throw new Error(`Order with id ${data.purchaseOrderId} not found`)
    }

    const receiptId = generateId()
    const timestamp = new Date().toISOString()
    const receiptNumber = await this.generateReceiptNumber()

    // Build receipt items from order items
    const receiptItems = data.items.map(item => {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId)
      if (!orderItem) {
        throw new Error(`Order item with id ${item.orderItemId} not found`)
      }

      return {
        id: generateId(),
        orderItemId: item.orderItemId,
        itemId: orderItem.itemId,
        itemName: orderItem.itemName,

        // Quantities (always in base units)
        orderedQuantity: orderItem.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        unit: orderItem.unit,

        // Package info
        packageId: orderItem.packageId,
        packageName: orderItem.packageName,
        orderedPackageQuantity: orderItem.packageQuantity,
        receivedPackageQuantity: item.receivedPackageQuantity || 0,
        packageUnit: orderItem.packageUnit,

        // Pricing
        orderedPrice: orderItem.pricePerUnit,
        actualPrice: item.actualPrice || orderItem.pricePerUnit,
        orderedBaseCost: orderItem.pricePerUnit,
        actualBaseCost: item.actualPrice || orderItem.pricePerUnit,

        notes: item.notes
      }
    })

    const newReceipt: Receipt = {
      id: receiptId,
      receiptNumber,
      purchaseOrderId: data.purchaseOrderId,
      deliveryDate: timestamp,
      receivedBy: data.receivedBy,
      items: receiptItems,
      hasDiscrepancies: this.calculateDiscrepancies(data, order),
      status: 'draft',
      notes: data.notes,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    // ✅ INSERT TO SUPABASE (Phase 3)
    await executeSupabaseMutation(async () => {
      const { data: dbReceipt, error: receiptError } = await supabase
        .from('supplierstore_receipts')
        .insert([mapReceiptToDB(newReceipt)])
        .select()
        .single()

      if (receiptError) throw receiptError
    }, `${MODULE_NAME}.createReceipt.insertReceipt`)

    // ✅ INSERT ITEMS TO SUPABASE
    const itemsToInsert = receiptItems.map(item => mapReceiptItemToDB(item, receiptId))

    try {
      await executeSupabaseMutation(async () => {
        const { error: itemsError } = await supabase
          .from('supplierstore_receipt_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }, `${MODULE_NAME}.createReceipt.insertItems`)
    } catch (itemsError) {
      DebugUtils.error(
        MODULE_NAME,
        'Failed to create receipt items in Supabase',
        extractErrorDetails(itemsError)
      )
      // Rollback: delete the receipt
      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('supplierstore_receipts').delete().eq('id', receiptId)
        if (error) throw error
      }, `${MODULE_NAME}.createReceipt.rollback`)
      throw itemsError
    }

    DebugUtils.info(MODULE_NAME, '✅ Receipt created in Supabase', {
      receiptId: newReceipt.id,
      receiptNumber: newReceipt.receiptNumber,
      orderId: data.purchaseOrderId,
      itemCount: newReceipt.items.length,
      hasDiscrepancies: newReceipt.hasDiscrepancies
    })

    return newReceipt
  }

  async completeReceipt(id: string, notes?: string): Promise<Receipt> {
    // ✅ FETCH RECEIPT FROM SUPABASE (Phase 3)
    const receipt = await this.getReceiptById(id)
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

    const timestamp = new Date().toISOString()

    // Update receipt status
    receipt.status = 'completed'
    receipt.notes = notes || receipt.notes
    receipt.closedAt = timestamp
    receipt.updatedAt = timestamp

    // Update order status
    if (order.status === 'confirmed') {
      order.status = 'delivered'
      order.receiptId = receipt.id
      order.updatedAt = timestamp

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

    // ✅ UPDATE RECEIPT IN SUPABASE (Phase 3)
    await executeSupabaseMutation(async () => {
      const { error: receiptError } = await supabase
        .from('supplierstore_receipts')
        .update({
          status: receipt.status,
          notes: receipt.notes,
          closed_at: receipt.closedAt,
          updated_at: receipt.updatedAt,
          storage_operation_id: receipt.storageOperationId ?? null
        })
        .eq('id', id)

      if (receiptError) throw receiptError
    }, `${MODULE_NAME}.completeReceipt.updateReceipt`)

    // ✅ UPDATE ORDER IN SUPABASE (already implemented in Phase 2)
    await this.updateOrder(order.id, {
      status: order.status,
      receiptId: order.receiptId,
      totalAmount: order.totalAmount,
      isEstimatedTotal: order.isEstimatedTotal,
      items: order.items
    })

    DebugUtils.info(MODULE_NAME, '✅ Receipt completed successfully with full integration', {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      storageOperationId: receipt.storageOperationId,
      orderId: order.id,
      orderStatus: order.status
    })

    return receipt
  }

  async updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    // ✅ FETCH RECEIPT FROM SUPABASE (Phase 3)
    const receipt = await this.getReceiptById(id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    const timestamp = new Date().toISOString()

    // Update receipt object
    Object.assign(receipt, {
      ...data,
      updatedAt: timestamp
    })

    // ✅ UPDATE IN SUPABASE (Phase 3)
    const updateData: any = {
      updated_at: timestamp
    }

    // Map only provided fields
    if (data.notes !== undefined) updateData.notes = data.notes ?? null
    if (data.receivedBy !== undefined) updateData.received_by = data.receivedBy
    if (data.deliveryDate !== undefined) updateData.delivery_date = data.deliveryDate
    if (data.status !== undefined) updateData.status = data.status
    if (data.hasDiscrepancies !== undefined) updateData.has_discrepancies = data.hasDiscrepancies

    await executeSupabaseMutation(async () => {
      const { error } = await supabase
        .from('supplierstore_receipts')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
    }, `${MODULE_NAME}.updateReceipt.updateMain`)

    // If items provided, update them (delete old, insert new)
    if (data.items) {
      // Delete old items
      await executeSupabaseMutation(async () => {
        const { error } = await supabase
          .from('supplierstore_receipt_items')
          .delete()
          .eq('receipt_id', id)
        if (error) throw error
      }, `${MODULE_NAME}.updateReceipt.deleteOldItems`)

      // Insert new items
      const itemsToInsert = data.items.map(item => mapReceiptItemToDB(item, id))
      await executeSupabaseMutation(async () => {
        const { error: itemsError } = await supabase
          .from('supplierstore_receipt_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }, `${MODULE_NAME}.updateReceipt.insertNewItems`)

      receipt.items = data.items
    }

    DebugUtils.info(MODULE_NAME, '✅ Receipt updated in Supabase', { receiptId: id })
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
        ...extractErrorDetails(error),
        department
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

      const data = await executeSupabaseQuery(
        query,
        `${MODULE_NAME}.filterSuggestionsWithExistingRequests`
      )

      const relevantRequests = data.map(dbRequest =>
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
          ...extractErrorDetails(error),
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
      DebugUtils.error(MODULE_NAME, 'Failed to get latest prices', {
        ...extractErrorDetails(error),
        itemIds
      })
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
      DebugUtils.error(MODULE_NAME, 'Failed to refresh suggestions', {
        ...extractErrorDetails(error),
        department
      })
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
      const data = await executeSupabaseQuery(
        supabase
          .from('supplierstore_requests')
          .select('*, supplierstore_request_items(*)')
          .in('id', requestIds),
        `${MODULE_NAME}.createSupplierBaskets`
      )

      const requests = data.map(dbRequest =>
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

          // ✅ FIX: Add await (method is async since Phase 2)
          const orderedQuantity = await this.getOrderedQuantityForItem(request.id, item.itemId)
          const remainingQuantity = item.requestedQuantity - orderedQuantity

          console.log(
            `Item ${item.itemName}: requested=${item.requestedQuantity}, ordered=${orderedQuantity}, remaining=${remainingQuantity}`
          )

          if (remainingQuantity > 0) {
            const existingItem = unassignedItems.find(ui => ui.itemId === item.itemId)

            // ✅ Используем цену из request если есть, иначе из продукта
            const itemPrice = item.estimatedPrice ?? product.baseCostPerUnit
            console.log(
              `  Price for ${item.itemName}: request=${item.estimatedPrice}, product=${product.baseCostPerUnit}, using=${itemPrice}`
            )

            if (existingItem) {
              // ✅ Weighted average: (oldQty * oldPrice + newQty * newPrice) / totalQty
              const oldTotal = existingItem.totalQuantity * existingItem.estimatedBaseCost
              const newTotal = remainingQuantity * itemPrice
              const newTotalQuantity = existingItem.totalQuantity + remainingQuantity
              const weightedAvg = (oldTotal + newTotal) / newTotalQuantity

              console.log(
                `  Weighted average: (${existingItem.totalQuantity}×${existingItem.estimatedBaseCost} + ${remainingQuantity}×${itemPrice}) / ${newTotalQuantity} = ${weightedAvg}`
              )

              existingItem.estimatedBaseCost = weightedAvg
              existingItem.totalQuantity = newTotalQuantity

              existingItem.sources.push({
                requestId: request.id,
                requestNumber: request.requestNumber,
                department: request.department,
                quantity: remainingQuantity,
                packageId: item.packageId,
                packageQuantity: item.packageQuantity,
                estimatedPrice: itemPrice // ✅ Сохраняем цену источника
              })
            } else {
              unassignedItems.push({
                itemId: item.itemId,
                itemName: item.itemName,
                category: product.category, // ✅ Из продукта
                totalQuantity: remainingQuantity,

                // ✅ Используем цену из request если есть
                unit: product.baseUnit,
                estimatedBaseCost: itemPrice,

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
                    packageQuantity: item.packageQuantity,
                    estimatedPrice: itemPrice // ✅ Сохраняем цену источника
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
      DebugUtils.error(MODULE_NAME, 'Failed to create supplier baskets', extractErrorDetails(error))
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

  private async generateReceiptNumber(): Promise<string> {
    // ✅ COUNT FROM SUPABASE (Phase 3)
    const { count, error } = await supabase
      .from('supplierstore_receipts')
      .select('*', { count: 'exact', head: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to count receipts for number generation', { error })
      throw error
    }

    const receiptCount = (count || 0) + 1
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `RCP-${month}${day}-${String(receiptCount).padStart(3, '0')}`
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
    try {
      const productsStore = useProductsStore()
      const product = productsStore.getProductById(itemId)
      if (product) {
        return product.name
      }
    } catch (error) {
      DebugUtils.debug(MODULE_NAME, 'Failed to get product name from store', { itemId, error })
    }

    // Fallback to hardcoded names if product not found in store
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
    try {
      const productsStore = useProductsStore()
      const product = productsStore.getProductById(itemId)
      if (product) {
        return product.baseUnit
      }
    } catch (error) {
      DebugUtils.debug(MODULE_NAME, 'Failed to get product unit from store', { itemId, error })
    }

    // Fallback to simple heuristics if product not found in store
    if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water'))
      return 'piece'
    if (itemId.includes('oil') || itemId.includes('milk')) return 'ml'
    return 'gram'
  }
}

export const supplierService = new SupplierService()
export default supplierService
