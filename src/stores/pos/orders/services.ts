// src/stores/pos/orders/services.ts
// Updated for order_items table architecture (Migration 053-054)

import type {
  PosOrder,
  PosBill,
  PosBillItem,
  ServiceResponse,
  OrderType,
  PosMenuItem,
  OrderPaymentStatus,
  ItemPaymentStatus
} from '../types'
import type { MenuItemVariant, SelectedModifier } from '@/stores/menu'
import { TimeUtils, generateId, extractErrorDetails } from '@/utils'
import { departmentNotificationService } from '../service/DepartmentNotificationService'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  toSupabaseInsert,
  toSupabaseUpdate,
  fromSupabase,
  toOrderItemInsert,
  toOrderItemUpdate,
  fromOrderItemRow,
  extractItemsForInsert,
  buildStatusUpdatePayload
} from './supabaseMappers'
import { executeSupabaseMutation } from '@/utils/supabase'

/**
 * Order service - handles storage operations
 * Uses dual-write pattern: Supabase (online) + localStorage (offline backup)
 *
 * Architecture (Migration 053-054):
 * - orders table: order metadata + bills JSONB (without items)
 * - order_items table: individual items with status, department, KPI timestamps
 */
export class OrdersService {
  private readonly ORDERS_KEY = 'pos_orders'
  private readonly BILLS_KEY = 'pos_bills'
  private readonly ITEMS_KEY = 'pos_order_items' // Renamed from pos_bill_items

  /**
   * Check if Supabase is available
   */
  private isSupabaseAvailable(): boolean {
    return ENV.useSupabase && !!supabase
  }

  /**
   * Get orders from storage (with smart filtering)
   * Sprint 8: Only load active orders + today's orders by default
   * @param options.all - загрузить ВСЕ заказы (для отчётов)
   *
   * ✅ PERFORMANCE FIX: Only load active orders + today
   * - All unpaid/partial orders (active, need attention)
   * - Today's paid orders (for reference)
   * This reduces 343 orders → ~50-100 orders
   */
  async getAllOrders(options?: { all?: boolean }): Promise<ServiceResponse<PosOrder[]>> {
    try {
      // Try to load from Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        // ✅ Sprint 8: More aggressive filtering - today only (not 2 days)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dateFilter = today.toISOString()

        // Query 1: Load orders with smart filtering
        // - All unpaid/partial orders (always load - they need attention)
        // - Paid orders only from today (for reference)
        let query = supabase.from('orders').select('*')

        if (!options?.all) {
          query = query.or(`payment_status.neq.paid,created_at.gte.${dateFilter}`)
        }

        const { data: ordersData, error: ordersError } = await query
          .order('created_at', { ascending: false })
          .limit(options?.all ? 500 : 100) // Reduced limit for faster loading

        if (!ordersError && ordersData) {
          // Query 2: Load all items for these orders
          const orderIds = ordersData.map(o => o.id)

          if (orderIds.length > 0) {
            const { data: itemsData, error: itemsError } = await supabase
              .from('order_items')
              .select('*')
              .in('order_id', orderIds)

            if (!itemsError && itemsData) {
              // Group items by order_id in single pass (O(n) instead of O(n²))
              const itemsByOrderId = new Map<string, PosBillItem[]>()
              itemsData.forEach(row => {
                const item = fromOrderItemRow(row)
                const existing = itemsByOrderId.get(row.order_id) || []
                existing.push(item)
                itemsByOrderId.set(row.order_id, existing)
              })

              // Assemble orders with items
              const orders = ordersData.map(orderRow => {
                const orderItems = itemsByOrderId.get(orderRow.id) || []
                return fromSupabase(orderRow, orderItems)
              })

              console.log('✅ Loaded orders from Supabase:', {
                ordersCount: orders.length,
                itemsCount: itemsData.length
              })
              return { success: true, data: orders }
            }
          } else {
            // No orders, return empty
            console.log('✅ No orders in Supabase')
            return { success: true, data: [] }
          }
        }

        // Log error but continue to localStorage fallback
        if (ordersError) {
          console.warn(
            '⚠️ Supabase load failed, falling back to localStorage:',
            ordersError.message
          )
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.ORDERS_KEY)
      const orders = stored ? JSON.parse(stored) : []

      // Load bills for each order
      for (const order of orders) {
        order.bills = await this.getBillsByOrderId(order.id)
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      console.log('📦 Loaded orders from localStorage:', orders.length)
      return { success: true, data: orders }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load orders'
      }
    }
  }

  /**
   * Create a new order
   * NEW: INSERT into orders + INSERT into order_items
   */
  async createOrder(
    type: OrderType,
    tableId?: string,
    customerName?: string
  ): Promise<ServiceResponse<PosOrder>>
  async createOrder(orderData: {
    type: OrderType
    tableId?: string
    customerName?: string
    waiterName?: string
  }): Promise<ServiceResponse<PosOrder>>
  async createOrder(
    typeOrData:
      | OrderType
      | {
          type: OrderType
          tableId?: string
          customerName?: string
          waiterName?: string
        },
    tableId?: string,
    customerName?: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Normalize input
      const orderData =
        typeof typeOrData === 'string' ? { type: typeOrData, tableId, customerName } : typeOrData

      console.log('🔧 OrdersService.createOrder called with:', orderData)

      const orderNumber = this.generateOrderNumber()

      const newOrder: PosOrder = {
        id: generateId(),
        orderNumber,
        type: orderData.type,
        status: 'draft',
        paymentStatus: 'unpaid',
        tableId: orderData.tableId,
        customerName: orderData.customerName,
        waiterName: orderData.waiterName,
        bills: [],
        totalAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        finalAmount: 0,
        paymentIds: [],
        paidAmount: 0,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      console.log('✅ Created order object:', {
        id: newOrder.id,
        type: newOrder.type,
        orderNumber: newOrder.orderNumber
      })

      // Create first bill automatically
      const firstBill = await this.createBillForOrder(newOrder.id, 'Bill 1')
      if (firstBill.success && firstBill.data) {
        newOrder.bills = [firstBill.data]
      }

      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseRow = toSupabaseInsert(newOrder)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('orders').insert(supabaseRow)
            if (error) throw error
          }, 'OrdersService.createOrder')

          // Note: No items to insert yet (order is empty)
          console.log('✅ Order saved to Supabase:', newOrder.orderNumber)
        } catch (error) {
          console.error('❌ Supabase save failed:', extractErrorDetails(error))
          // Continue to localStorage (offline fallback)
        }
      }

      // Always save to localStorage (backup)
      const orders = await this.getAllOrders()
      const ordersList = orders.success && orders.data ? orders.data : []
      ordersList.push(newOrder)

      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(ordersList.map(o => ({ ...o, bills: [] })))
      )

      console.log('💾 Order saved to localStorage (backup):', {
        id: newOrder.id,
        type: newOrder.type,
        saved: true
      })

      return { success: true, data: newOrder }
    } catch (error) {
      console.error('❌ OrdersService.createOrder error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order'
      }
    }
  }

  /**
   * Add item to bill
   * NEW: INSERT into order_items table
   */
  async addItemToBill(
    orderId: string,
    billId: string,
    menuItem: PosMenuItem,
    selectedVariant: MenuItemVariant,
    quantity: number,
    modifications: any[] = [],
    selectedModifiers?: SelectedModifier[]
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // Calculate modifiers total
      const modifiersTotal = selectedModifiers
        ? selectedModifiers.reduce((sum, mod) => sum + mod.priceAdjustment, 0)
        : 0

      // Legacy modifier price
      const legacyModificationPrice = modifications.reduce((sum, mod) => sum + (mod.price || 0), 0)

      // Base variant price
      const unitPrice = selectedVariant.price

      // Total price per unit
      const pricePerUnit = unitPrice + modifiersTotal + legacyModificationPrice

      // Total with quantity
      const totalPrice = pricePerUnit * quantity

      const newItem: PosBillItem = {
        id: generateId(),
        billId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        quantity,
        unitPrice,
        totalPrice,
        discounts: [],
        modifications: modifications.map(mod => ({
          id: mod.id,
          name: mod.name,
          price: mod.price || 0
        })),
        selectedModifiers: selectedModifiers || [],
        modifiersTotal,
        department: menuItem.department || 'kitchen',
        status: 'draft',
        paymentStatus: 'unpaid',
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      console.log('➕ Adding item to bill:', {
        itemName: menuItem.name,
        variantName: selectedVariant.name,
        unitPrice,
        modifiersTotal,
        quantity,
        totalPrice,
        department: newItem.department
      })

      // Get bill number for denormalization
      const bills = this.getAllStoredBills()
      const bill = bills.find(b => b.id === billId)
      const billNumber = bill?.billNumber || ''

      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const itemRow = toOrderItemInsert(newItem, orderId, billNumber)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('order_items').insert(itemRow)
            if (error) throw error
          }, 'OrdersService.addItemToBill')

          console.log('✅ Item saved to Supabase order_items:', newItem.menuItemName)
        } catch (error) {
          console.error('❌ Supabase item insert failed:', extractErrorDetails(error))
        }
      }

      // Always save to localStorage
      const items = await this.getItemsByBillId(billId)
      items.push(newItem)
      await this.saveItemsForBill(billId, items)

      return { success: true, data: newItem }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item'
      }
    }
  }

  /**
   * Update item quantity
   * NEW: UPDATE order_items table
   */
  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      const allItems = this.getAllStoredItems()
      const itemIndex = allItems.findIndex(item => item.id === itemId)

      if (itemIndex === -1) {
        throw new Error('Item not found')
      }

      const item = allItems[itemIndex]
      const unitPrice = item.totalPrice / item.quantity

      const updatedItem: PosBillItem = {
        ...item,
        quantity,
        totalPrice: unitPrice * quantity,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Try Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update({
                quantity,
                total_price: updatedItem.totalPrice,
                updated_at: updatedItem.updatedAt
              })
              .eq('id', itemId)
            if (error) throw error
          }, 'OrdersService.updateItemQuantity')

          console.log('✅ Item quantity updated in Supabase:', itemId)
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      // Always update localStorage
      allItems[itemIndex] = updatedItem
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true, data: updatedItem }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item quantity'
      }
    }
  }

  /**
   * Remove item from bill
   * NEW: DELETE from order_items table
   */
  async removeItemFromBill(itemId: string): Promise<ServiceResponse<void>> {
    try {
      // Try Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('order_items').delete().eq('id', itemId)
            if (error) throw error
          }, 'OrdersService.removeItemFromBill')

          console.log('✅ Item deleted from Supabase:', itemId)
        } catch (error) {
          console.error('❌ Supabase delete failed:', extractErrorDetails(error))
        }
      }

      // Always remove from localStorage
      const allItems = this.getAllStoredItems()
      const itemIndex = allItems.findIndex(item => item.id === itemId)

      if (itemIndex === -1) {
        throw new Error('Item not found')
      }

      allItems.splice(itemIndex, 1)
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item'
      }
    }
  }

  /**
   * Cancel item (mark as cancelled, don't delete)
   * For items that have been sent to kitchen (waiting, cooking, ready)
   */
  async cancelItem(
    itemId: string,
    cancellationData: {
      reason: string
      notes?: string
      cancelledBy: string
      writeOffOperationId?: string
    }
  ): Promise<ServiceResponse<void>> {
    try {
      const cancelledAt = TimeUtils.getCurrentLocalISO()

      // Try Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update({
                status: 'cancelled',
                cancelled_at: cancelledAt,
                cancelled_by: cancellationData.cancelledBy,
                cancellation_reason: cancellationData.reason,
                cancellation_notes: cancellationData.notes || null,
                write_off_operation_id: cancellationData.writeOffOperationId || null,
                updated_at: cancelledAt
              })
              .eq('id', itemId)
            if (error) throw error
          }, 'OrdersService.cancelItem')

          console.log('✅ Item cancelled in Supabase:', itemId)
        } catch (error) {
          console.error('❌ Supabase cancel failed:', extractErrorDetails(error))
        }
      }

      // Always update localStorage
      const allItems = this.getAllStoredItems()
      const itemIndex = allItems.findIndex(item => item.id === itemId)

      if (itemIndex === -1) {
        throw new Error('Item not found')
      }

      allItems[itemIndex] = {
        ...allItems[itemIndex],
        status: 'cancelled',
        cancelledAt,
        cancelledBy: cancellationData.cancelledBy,
        cancellationReason: cancellationData.reason,
        cancellationNotes: cancellationData.notes,
        writeOffOperationId: cancellationData.writeOffOperationId,
        updatedAt: cancelledAt
      }

      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel item'
      }
    }
  }

  /**
   * Update write-off operation ID on a cancelled item (called after background write-off completes)
   */
  async updateItemWriteOffId(
    itemId: string,
    writeOffOperationId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const updatedAt = TimeUtils.getCurrentLocalISO()

      // Try Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update({
                write_off_operation_id: writeOffOperationId,
                updated_at: updatedAt
              })
              .eq('id', itemId)
            if (error) throw error
          }, 'OrdersService.updateItemWriteOffId')

          console.log('✅ Item write-off ID updated in Supabase:', itemId)
        } catch (error) {
          console.error('❌ Supabase update write-off ID failed:', extractErrorDetails(error))
        }
      }

      // Always update localStorage
      const allItems = this.getAllStoredItems()
      const itemIndex = allItems.findIndex(item => item.id === itemId)

      if (itemIndex !== -1) {
        allItems[itemIndex] = {
          ...allItems[itemIndex],
          writeOffOperationId,
          updatedAt
        }
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update write-off ID'
      }
    }
  }

  /**
   * Send order to kitchen
   * NEW: UPDATE order_items SET status='waiting' with KPI timestamp
   */
  async sendOrderToKitchen(orderId: string): Promise<ServiceResponse<PosOrder>> {
    try {
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        throw new Error('Order not found')
      }

      const updatedOrder: PosOrder = {
        ...orders.data[orderIndex],
        status: 'waiting',
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Collect item IDs to update
      const itemIdsToUpdate: string[] = []
      const allItems = this.getAllStoredItems()
      const sentToKitchenAt = TimeUtils.getCurrentLocalISO()

      for (const bill of updatedOrder.bills) {
        for (const item of bill.items) {
          if (item.status === 'draft') {
            itemIdsToUpdate.push(item.id)

            // Update in localStorage
            const itemIndex = allItems.findIndex(i => i.id === item.id)
            if (itemIndex !== -1) {
              const existingItem = allItems[itemIndex]
              allItems[itemIndex] = {
                ...existingItem,
                status: 'waiting',
                sentToKitchenAt,
                updatedAt: TimeUtils.getCurrentLocalISO()
              }

              // Update in memory
              item.status = 'waiting'
              item.sentToKitchenAt = sentToKitchenAt
              item.kitchenNotes = existingItem.kitchenNotes

              console.log('📤 Item sent to kitchen:', {
                itemId: item.id,
                itemName: item.menuItemName,
                department: item.department,
                hasNote: !!existingItem.kitchenNotes
              })
            }
          }
        }
      }

      // Try Supabase - batch update items
      if (this.isSupabaseAvailable() && itemIdsToUpdate.length > 0) {
        try {
          const statusPayload = buildStatusUpdatePayload('waiting')

          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update(statusPayload)
              .in('id', itemIdsToUpdate)
            if (error) throw error
          }, 'OrdersService.sendOrderToKitchen.items')

          // Also update order status
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('orders')
              .update({
                status: 'waiting',
                updated_at: updatedOrder.updatedAt
              })
              .eq('id', orderId)
            if (error) throw error
          }, 'OrdersService.sendOrderToKitchen.order')

          console.log('✅ Order and items sent to kitchen in Supabase:', {
            orderId,
            itemsCount: itemIdsToUpdate.length
          })
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      // Save to localStorage
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send order to kitchen'
      }
    }
  }

  /**
   * Update item note (kitchen notes)
   */
  async updateItemNote(itemId: string, note: string): Promise<ServiceResponse<PosBillItem>> {
    try {
      const allItems = this.getAllStoredItems()
      const itemIndex = allItems.findIndex(item => item.id === itemId)

      if (itemIndex === -1) {
        throw new Error('Item not found')
      }

      const item = allItems[itemIndex]

      const updatedItem: PosBillItem = {
        ...item,
        kitchenNotes: note.trim() || undefined,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      console.log('📝 Updating item note:', {
        itemId,
        itemName: item.menuItemName,
        newNote: note
      })

      // Try Supabase
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update({
                kitchen_notes: updatedItem.kitchenNotes || null,
                updated_at: updatedItem.updatedAt
              })
              .eq('id', itemId)
            if (error) throw error
          }, 'OrdersService.updateItemNote')

          console.log('✅ Item note updated in Supabase:', itemId)
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      // Always update localStorage
      allItems[itemIndex] = updatedItem
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true, data: updatedItem }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item note'
      }
    }
  }

  /**
   * Update items status (batch)
   * NEW: UPDATE order_items with KPI timestamps
   */
  async updateItemsStatus(
    itemIds: string[],
    newStatus: 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
  ): Promise<ServiceResponse<void>> {
    try {
      const allItems = this.getAllStoredItems()

      itemIds.forEach(itemId => {
        const itemIndex = allItems.findIndex(item => item.id === itemId)
        if (itemIndex !== -1) {
          allItems[itemIndex].status = newStatus
          allItems[itemIndex].updatedAt = new Date().toISOString()
        }
      })

      // Try Supabase
      if (this.isSupabaseAvailable() && itemIds.length > 0) {
        try {
          const statusPayload = buildStatusUpdatePayload(newStatus)

          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update(statusPayload)
              .in('id', itemIds)
            if (error) throw error
          }, 'OrdersService.updateItemsStatus')

          console.log('✅ Items status updated in Supabase:', { itemIds, newStatus })
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update items status'
      }
    }
  }

  /**
   * Update items payment status
   */
  async updateItemsPaymentStatus(
    itemIds: string[],
    newPaymentStatus: ItemPaymentStatus
  ): Promise<ServiceResponse<void>> {
    try {
      const allItems = this.getAllStoredItems()

      itemIds.forEach(itemId => {
        const itemIndex = allItems.findIndex(item => item.id === itemId)
        if (itemIndex !== -1) {
          allItems[itemIndex].paymentStatus = newPaymentStatus
          allItems[itemIndex].updatedAt = new Date().toISOString()
        }
      })

      // Try Supabase
      if (this.isSupabaseAvailable() && itemIds.length > 0) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update({
                payment_status: newPaymentStatus,
                updated_at: new Date().toISOString()
              })
              .in('id', itemIds)
            if (error) throw error
          }, 'OrdersService.updateItemsPaymentStatus')

          console.log('✅ Items payment status updated in Supabase:', { itemIds, newPaymentStatus })
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update items payment status'
      }
    }
  }

  /**
   * Save and notify order (send to kitchen with notifications)
   */
  async saveAndNotifyOrder(
    orderId: string,
    tableNumber?: string
  ): Promise<
    ServiceResponse<{
      order: PosOrder
      notificationsSent: boolean
    }>
  > {
    try {
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const order = orders.data.find(o => o.id === orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      // Merge kitchenNotes from localStorage
      const allLocalItems = this.getAllStoredItems()
      order.bills.forEach(bill => {
        bill.items.forEach(item => {
          const localItem = allLocalItems.find(i => i.id === item.id)
          if (localItem?.kitchenNotes) {
            item.kitchenNotes = localItem.kitchenNotes
          }
        })
      })

      // Find new items (draft status)
      const newItems: PosBillItem[] = []
      order.bills.forEach(bill => {
        bill.items.forEach(item => {
          if (item.status === 'draft') {
            newItems.push(item)
          }
        })
      })

      console.log('💾 Saving order with new items:', {
        orderId,
        newItemsCount: newItems.length
      })

      // Send notifications to departments
      let notificationsSent = false
      if (newItems.length > 0) {
        const notificationResult = await departmentNotificationService.distributeAndNotify(
          order,
          newItems,
          tableNumber
        )

        if (notificationResult.success) {
          // Update items status to 'waiting'
          const itemIdsToUpdate = newItems.map(item => item.id)
          const sentToKitchenAt = new Date().toISOString()

          order.bills.forEach(bill => {
            bill.items.forEach(item => {
              if (item.status === 'draft') {
                item.status = 'waiting'
                item.sentToKitchenAt = sentToKitchenAt
              }
            })
          })

          // Update order status
          if (order.status === 'draft') {
            order.status = 'waiting'
            console.log(`📊 Order status updated: draft → waiting`)
          }

          // Update in Supabase
          if (this.isSupabaseAvailable() && itemIdsToUpdate.length > 0) {
            try {
              const statusPayload = buildStatusUpdatePayload('waiting')

              await executeSupabaseMutation(async () => {
                const { error } = await supabase
                  .from('order_items')
                  .update(statusPayload)
                  .in('id', itemIdsToUpdate)
                if (error) throw error
              }, 'OrdersService.saveAndNotifyOrder.items')

              await executeSupabaseMutation(async () => {
                const { error } = await supabase
                  .from('orders')
                  .update({
                    status: order.status,
                    updated_at: order.updatedAt
                  })
                  .eq('id', orderId)
                if (error) throw error
              }, 'OrdersService.saveAndNotifyOrder.order')
            } catch (error) {
              console.error('❌ Supabase update failed:', extractErrorDetails(error))
            }
          }

          notificationsSent = true
        }
      }

      // Update timestamp
      order.updatedAt = new Date().toISOString()

      // Save to localStorage
      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex !== -1) {
        orders.data[orderIndex] = order

        localStorage.setItem(
          this.ORDERS_KEY,
          JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
        )

        // Save items
        for (const bill of order.bills) {
          const allItems = this.getAllStoredItems()
          const filteredItems = allItems.filter(item => item.billId !== bill.id)
          filteredItems.push(...bill.items)
          localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filteredItems))
        }
      }

      return {
        success: true,
        data: { order, notificationsSent }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save order'
      }
    }
  }

  /**
   * Update order (simple update without notifications)
   */
  async updateOrder(order: PosOrder): Promise<ServiceResponse<PosOrder>> {
    try {
      order.updatedAt = TimeUtils.getCurrentLocalISO()

      // Try Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          // Update order
          const supabaseRow = toSupabaseUpdate(order)
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('orders').update(supabaseRow).eq('id', order.id)
            if (error) throw error
          }, 'OrdersService.updateOrder')

          // Update items - get existing items from Supabase
          const { data: existingItems } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', order.id)

          const existingItemIds = new Set((existingItems || []).map(i => i.id))
          const currentItemIds = new Set<string>()

          // Upsert all items (use actual upsert to handle merged items from other orders)
          for (const bill of order.bills) {
            for (const item of bill.items) {
              currentItemIds.add(item.id)

              // Use upsert to handle both existing items and merged items from other orders
              // Merged items have different order_id in DB but same item.id
              const insertPayload = toOrderItemInsert(item, order.id, bill.billNumber)
              const { error: upsertError } = await supabase
                .from('order_items')
                .upsert(insertPayload, { onConflict: 'id' })

              if (upsertError) {
                console.error('❌ Item upsert failed:', item.id, upsertError.message)
              }
            }
          }

          // Delete removed items
          for (const existingId of existingItemIds) {
            if (!currentItemIds.has(existingId)) {
              await supabase.from('order_items').delete().eq('id', existingId)
            }
          }

          console.log('✅ Order updated in Supabase:', order.orderNumber)
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      // Always update localStorage
      const storedOrders = localStorage.getItem(this.ORDERS_KEY)
      const allOrders: PosOrder[] = storedOrders ? JSON.parse(storedOrders) : []

      const orderIndex = allOrders.findIndex(o => o.id === order.id)
      if (orderIndex !== -1) {
        allOrders[orderIndex] = { ...order, bills: [] }
      } else {
        allOrders.push({ ...order, bills: [] })
      }

      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(allOrders))

      // Save bills and items
      for (const bill of order.bills) {
        const allBills = this.getAllStoredBills()
        const billIndex = allBills.findIndex(b => b.id === bill.id)
        if (billIndex !== -1) {
          allBills[billIndex] = { ...bill, items: [] }
        } else {
          allBills.push({ ...bill, items: [] })
        }
        localStorage.setItem(this.BILLS_KEY, JSON.stringify(allBills))

        const allItems = this.getAllStoredItems()
        const filteredItems = allItems.filter(item => item.billId !== bill.id)
        filteredItems.push(...bill.items)
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filteredItems))
      }

      console.log('💾 Order updated in localStorage', {
        orderId: order.id,
        billsCount: order.bills.length
      })

      return { success: true, data: order }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order'
      }
    }
  }

  /**
   * Delete an order completely (for empty takeaway/delivery orders)
   * Only allowed if order has no paid items
   */
  async deleteOrder(orderId: string): Promise<ServiceResponse<void>> {
    try {
      // Delete from Supabase first
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            // Delete all order items first (foreign key constraint)
            const { error: itemsError } = await supabase
              .from('order_items')
              .delete()
              .eq('order_id', orderId)
            if (itemsError) throw itemsError

            // Then delete the order itself
            const { error: orderError } = await supabase.from('orders').delete().eq('id', orderId)
            if (orderError) throw orderError
          }, 'OrdersService.deleteOrder')

          console.log('✅ Order deleted from Supabase:', orderId)
        } catch (error) {
          console.error('❌ Supabase delete failed:', extractErrorDetails(error))
          throw error // Re-throw to prevent inconsistent state
        }
      }

      // Update localStorage
      const storedOrders = localStorage.getItem(this.ORDERS_KEY)
      if (storedOrders) {
        const orders = JSON.parse(storedOrders)
        const filteredOrders = orders.filter((o: PosOrder) => o.id !== orderId)
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(filteredOrders))
      }

      // Note: items in localStorage will be cleaned up on next sync
      // They don't have orderId field, but are linked via billId

      console.log('🗑️ Order deleted:', orderId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order'
      }
    }
  }

  async addBillToOrder(orderId: string, billName: string): Promise<ServiceResponse<PosBill>> {
    try {
      return await this.createBillForOrder(orderId, billName)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add bill'
      }
    }
  }

  async sendItemsToKitchen(orderId: string, itemIds: string[]): Promise<ServiceResponse<PosOrder>> {
    try {
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        throw new Error('Order not found')
      }

      const updatedOrder: PosOrder = {
        ...orders.data[orderIndex],
        status: 'waiting',
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      const sentToKitchenAt = TimeUtils.getCurrentLocalISO()

      // Update selected items
      for (const bill of updatedOrder.bills) {
        for (const item of bill.items) {
          if (itemIds.includes(item.id) && item.status === 'draft') {
            item.status = 'waiting'
            item.sentToKitchenAt = sentToKitchenAt
          }
        }
      }

      // Update in Supabase
      if (this.isSupabaseAvailable() && itemIds.length > 0) {
        try {
          const statusPayload = buildStatusUpdatePayload('waiting')

          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('order_items')
              .update(statusPayload)
              .in('id', itemIds)
            if (error) throw error
          }, 'OrdersService.sendItemsToKitchen')
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      // Update localStorage
      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send items to kitchen'
      }
    }
  }

  async closeOrder(orderId: string): Promise<ServiceResponse<PosOrder>> {
    try {
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        throw new Error('Order not found')
      }

      const updatedOrder: PosOrder = {
        ...orders.data[orderIndex],
        status: 'served',
        paymentStatus: 'paid',
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update in Supabase
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('orders')
              .update({
                status: 'served',
                payment_status: 'paid',
                updated_at: updatedOrder.updatedAt
              })
              .eq('id', orderId)
            if (error) throw error
          }, 'OrdersService.closeOrder')
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close order'
      }
    }
  }

  async updateOrderPaymentStatus(
    orderId: string,
    newPaymentStatus: OrderPaymentStatus
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        throw new Error('Order not found')
      }

      const updatedOrder: PosOrder = {
        ...orders.data[orderIndex],
        paymentStatus: newPaymentStatus,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update in Supabase
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('orders')
              .update({
                payment_status: newPaymentStatus,
                updated_at: updatedOrder.updatedAt
              })
              .eq('id', orderId)
            if (error) throw error
          }, 'OrdersService.updateOrderPaymentStatus')
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
        }
      }

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order payment status'
      }
    }
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private async createBillForOrder(
    orderId: string,
    billName: string
  ): Promise<ServiceResponse<PosBill>> {
    const newBill: PosBill = {
      id: generateId(),
      billNumber: this.generateBillNumber(),
      orderId,
      name: billName,
      status: 'draft',
      items: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      createdAt: TimeUtils.getCurrentLocalISO(),
      updatedAt: TimeUtils.getCurrentLocalISO()
    }

    const bills = this.getAllStoredBills()
    bills.push(newBill)
    localStorage.setItem(this.BILLS_KEY, JSON.stringify(bills))

    return { success: true, data: newBill }
  }

  private async getBillsByOrderId(orderId: string): Promise<PosBill[]> {
    const allBills = this.getAllStoredBills()
    const orderBills = allBills.filter(bill => bill.orderId === orderId)

    for (const bill of orderBills) {
      bill.items = await this.getItemsByBillId(bill.id)
    }

    return orderBills
  }

  private async getItemsByBillId(billId: string): Promise<PosBillItem[]> {
    const allItems = this.getAllStoredItems()
    return allItems.filter(item => item.billId === billId)
  }

  private async saveItemsForBill(billId: string, items: PosBillItem[]): Promise<void> {
    const allItems = this.getAllStoredItems()
    const filteredItems = allItems.filter(item => item.billId !== billId)
    filteredItems.push(...items)
    localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filteredItems))
  }

  private getAllStoredBills(): PosBill[] {
    const stored = localStorage.getItem(this.BILLS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  private getAllStoredItems(): PosBillItem[] {
    const stored = localStorage.getItem(this.ITEMS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  private generateOrderNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.getTime().toString().slice(-4)
    return `ORD-${dateStr}-${timeStr}`
  }

  private generateBillNumber(): string {
    const date = new Date()
    const timeStr = date.getTime().toString().slice(-6)
    return `BILL-${timeStr}`
  }
}
