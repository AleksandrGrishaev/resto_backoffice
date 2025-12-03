// src/stores/pos/orders/services.ts
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
import { toSupabaseInsert, toSupabaseUpdate, fromSupabase } from './supabaseMappers'
import { executeSupabaseMutation } from '@/utils/supabase'

/**
 * Order service - handles storage operations
 * Uses dual-write pattern: Supabase (online) + localStorage (offline backup)
 */
export class OrdersService {
  private readonly ORDERS_KEY = 'pos_orders'
  private readonly BILLS_KEY = 'pos_bills'
  private readonly ITEMS_KEY = 'pos_bill_items'

  /**
   * Check if Supabase is available
   */
  private isSupabaseAvailable(): boolean {
    return ENV.useSupabase && !!supabase
  }

  /**
   * Get all orders from storage
   * Tries Supabase first (if online), falls back to localStorage
   */
  async getAllOrders(): Promise<ServiceResponse<PosOrder[]>> {
    try {
      // Try to load from Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          console.log('✅ Loaded orders from Supabase:', data.length)
          return { success: true, data: data.map(fromSupabase) }
        }

        // Log error but continue to localStorage fallback
        if (error) {
          console.warn('⚠️ Supabase load failed, falling back to localStorage:', error.message)
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.ORDERS_KEY)
      const orders = stored ? JSON.parse(stored) : []

      // Загружаем счета для каждого заказа
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
   * Сохранить заказ и отправить уведомления в отделы
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
      // 1. Загружаем текущий заказ
      const orders = await this.getAllOrders()
      if (!orders.success || !orders.data) {
        throw new Error('Failed to load orders')
      }

      const order = orders.data.find(o => o.id === orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      // ✅ CRITICAL FIX: Load items from localStorage to get fresh kitchenNotes
      const allLocalItems = this.getAllStoredItems()
      console.log('📦 Merging items from localStorage before save:', {
        supabaseItems: order.bills.flatMap(b => b.items).length,
        localStorageItems: allLocalItems.length
      })

      // Merge kitchenNotes from localStorage into order.bills
      order.bills.forEach(bill => {
        bill.items.forEach(item => {
          const localItem = allLocalItems.find(i => i.id === item.id)
          if (localItem?.kitchenNotes) {
            item.kitchenNotes = localItem.kitchenNotes
            console.log('✅ Restored kitchenNotes from localStorage:', {
              itemId: item.id,
              itemName: item.menuItemName,
              note: localItem.kitchenNotes
            })
          }
        })
      })

      // 2. Находим новые позиции (status: 'draft')
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

      // 3. Отправляем уведомления в отделы если есть новые позиции
      let notificationsSent = false
      if (newItems.length > 0) {
        const notificationResult = await departmentNotificationService.distributeAndNotify(
          order,
          newItems,
          tableNumber
        )

        if (notificationResult.success) {
          // 4. Обновляем статусы позиций на 'waiting'
          order.bills.forEach(bill => {
            bill.items.forEach(item => {
              if (item.status === 'draft') {
                item.status = 'waiting'
                item.sentToKitchenAt = new Date().toISOString()
              }
            })
          })

          // ДОБАВИТЬ: Обновляем статус заказа на 'waiting'
          if (order.status === 'draft') {
            order.status = 'waiting'
            console.log(`📊 Order status updated: draft → waiting`)
          }

          notificationsSent = true
        }
      }

      // 5. Обновляем timestamp заказа
      order.updatedAt = new Date().toISOString()

      // 6. Сохраняем обновленный заказ
      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex !== -1) {
        orders.data[orderIndex] = order

        localStorage.setItem(
          this.ORDERS_KEY,
          JSON.stringify(orders.data.map(o => ({ ...o, bills: [] })))
        )

        // Сохраняем bills отдельно
        for (const bill of order.bills) {
          const allItems = this.getAllStoredItems()
          const filteredItems = allItems.filter(item => item.billId !== bill.id)
          filteredItems.push(...bill.items)
          localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filteredItems))
        }
      }

      return {
        success: true,
        data: {
          order,
          notificationsSent
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save order'
      }
    }
  }

  /**
   * Обновить статус позиций
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

      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update items status'
      }
    }
  }

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
      // Нормализуем входные данные
      const orderData =
        typeof typeOrData === 'string'
          ? {
              type: typeOrData,
              tableId,
              customerName
            }
          : typeOrData

      console.log('🔧 OrdersService.createOrder called with:', orderData)

      const orderNumber = this.generateOrderNumber()

      const newOrder: PosOrder = {
        id: generateId(), // UUID for Supabase compatibility
        orderNumber,
        type: orderData.type, // ВАЖНО: правильно сохраняем тип
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
        paymentIds: [], // Payment Architecture
        paidAmount: 0, // Payment Architecture
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      console.log('✅ Created order object:', {
        id: newOrder.id,
        type: newOrder.type,
        orderNumber: newOrder.orderNumber
      })

      // Создаем первый счет автоматически
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

      // ВАЖНО: сохраняем заказ с правильным типом
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(
          ordersList.map(o => ({
            ...o,
            bills: [] // Счета сохраняем отдельно
          }))
        )
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

  async addItemToBill(
    orderId: string,
    billId: string,
    menuItem: PosMenuItem,
    selectedVariant: MenuItemVariant,
    quantity: number,
    modifications: any[] = [], // DEPRECATED: для обратной совместимости
    selectedModifiers?: SelectedModifier[] // NEW: модификаторы из menu system
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // Рассчитываем сумму модификаторов
      const modifiersTotal = selectedModifiers
        ? selectedModifiers.reduce((sum, mod) => sum + mod.priceAdjustment, 0)
        : 0

      // Для обратной совместимости со старой системой
      const legacyModificationPrice = modifications.reduce((sum, mod) => sum + (mod.price || 0), 0)

      // Базовая цена варианта (без модификаторов)
      const unitPrice = selectedVariant.price

      // Итоговая цена за единицу (базовая + модификаторы)
      const pricePerUnit = unitPrice + modifiersTotal + legacyModificationPrice

      // Итоговая цена с учетом количества
      const totalPrice = pricePerUnit * quantity

      const newItem: PosBillItem = {
        id: generateId(), // UUID for Supabase compatibility
        billId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        quantity,
        unitPrice, // Базовая цена варианта (БЕЗ модификаторов)
        totalPrice, // Итоговая цена (unitPrice + modifiersTotal) * quantity
        discounts: [],

        // DEPRECATED: старая система модификаторов
        modifications: modifications.map(mod => ({
          id: mod.id,
          name: mod.name,
          price: mod.price || 0
        })),

        // NEW: новая система модификаторов
        selectedModifiers: selectedModifiers || [],
        modifiersTotal, // Сумма доплат за модификаторы (за 1 штуку)

        // Department routing
        department: menuItem.department || 'kitchen', // Default to kitchen if not specified

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
        modifiersCount: selectedModifiers?.length || 0,
        quantity,
        totalPrice
      })

      // Сохраняем товар
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

  async updateItemNote(itemId: string, note: string): Promise<ServiceResponse<PosBillItem>> {
    try {
      // Найти товар во всех счетах
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
        oldNote: item.kitchenNotes,
        newNote: note,
        updatedItem
      })

      // Сохраняем обновленный товар
      allItems[itemIndex] = updatedItem
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      console.log('✅ Item note saved successfully:', {
        itemId,
        hasNote: !!updatedItem.kitchenNotes,
        noteLength: updatedItem.kitchenNotes?.length
      })

      return { success: true, data: updatedItem }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item note'
      }
    }
  }

  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // Найти товар во всех счетах
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

  async removeItemFromBill(itemId: string): Promise<ServiceResponse<void>> {
    try {
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

      // Обновить статус только выбранных товаров
      for (const bill of updatedOrder.bills) {
        for (const item of bill.items) {
          if (itemIds.includes(item.id) && item.status === 'draft') {
            item.sentToKitchenAt = TimeUtils.getCurrentLocalISO()
          }
        }
      }

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(
          orders.data.map(o => ({
            ...o,
            bills: []
          }))
        )
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send items to kitchen'
      }
    }
  }

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

      // Обновить статус всех товаров в заказе
      const allItems = this.getAllStoredItems()
      for (const bill of updatedOrder.bills) {
        for (const item of bill.items) {
          if (item.status === 'draft') {
            const sentToKitchenAt = TimeUtils.getCurrentLocalISO()

            // ✅ CRITICAL FIX: Find existing item in localStorage to preserve kitchenNotes
            const itemIndex = allItems.findIndex(i => i.id === item.id)
            if (itemIndex !== -1) {
              const existingItem = allItems[itemIndex]

              // Update only status fields, preserve kitchenNotes and other local data
              allItems[itemIndex] = {
                ...existingItem, // Keep all existing data (including kitchenNotes!)
                status: 'waiting',
                sentToKitchenAt,
                updatedAt: TimeUtils.getCurrentLocalISO()
              }

              // Also update the item in updatedOrder.bills to reflect changes
              item.status = 'waiting'
              item.sentToKitchenAt = sentToKitchenAt
              item.kitchenNotes = existingItem.kitchenNotes // Preserve note in memory

              console.log('📤 Item sent to kitchen:', {
                itemId: item.id,
                itemName: item.menuItemName,
                status: item.status,
                hasNote: !!existingItem.kitchenNotes,
                note: existingItem.kitchenNotes
              })
            }
          }
        }
      }

      // ✅ FIX: Save updated items to localStorage
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(allItems))

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(
          orders.data.map(o => ({
            ...o,
            bills: []
          }))
        )
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send order to kitchen'
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
        status: 'served', // статус готовности
        paymentStatus: 'paid',
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      orders.data[orderIndex] = updatedOrder
      localStorage.setItem(
        this.ORDERS_KEY,
        JSON.stringify(
          orders.data.map(o => ({
            ...o,
            bills: []
          }))
        )
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close order'
      }
    }
  }

  /**
   * Update order in storage (simple update without notifications)
   * Dual-write: Supabase (if online) + localStorage (always)
   * Used by payment system to update order payment status
   */
  async updateOrder(order: PosOrder): Promise<ServiceResponse<PosOrder>> {
    try {
      // Update order timestamp
      order.updatedAt = TimeUtils.getCurrentLocalISO()

      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseRow = toSupabaseUpdate(order)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('orders').update(supabaseRow).eq('id', order.id)
            if (error) throw error
          }, 'OrdersService.updateOrder')
          console.log('✅ Order updated in Supabase:', order.orderNumber, {
            billsCount: order.bills.length,
            totalItems: order.bills.reduce((sum, b) => sum + b.items.length, 0)
          })
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
          // Continue to localStorage (offline fallback)
        }
      }

      // Always update in localStorage (backup) - read from LOCAL storage, not Supabase!
      const storedOrders = localStorage.getItem(this.ORDERS_KEY)
      const allOrders: PosOrder[] = storedOrders ? JSON.parse(storedOrders) : []

      // Find and update order
      const orderIndex = allOrders.findIndex(o => o.id === order.id)
      if (orderIndex !== -1) {
        allOrders[orderIndex] = { ...order, bills: [] } // Store without bills (3-level pattern)
      } else {
        // Order not found, add it
        allOrders.push({ ...order, bills: [] })
      }

      // Save orders (without bills)
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(allOrders))

      // Save bills and items (3-level structure)
      for (const bill of order.bills) {
        // Update bill in storage
        const allBills = this.getAllStoredBills()
        const billIndex = allBills.findIndex(b => b.id === bill.id)
        if (billIndex !== -1) {
          allBills[billIndex] = { ...bill, items: [] } // Store without items
        } else {
          allBills.push({ ...bill, items: [] })
        }
        localStorage.setItem(this.BILLS_KEY, JSON.stringify(allBills))

        // Update items for this bill
        const allItems = this.getAllStoredItems()
        const filteredItems = allItems.filter(item => item.billId !== bill.id)
        filteredItems.push(...bill.items)
        localStorage.setItem(this.ITEMS_KEY, JSON.stringify(filteredItems))
      }

      console.log('💾 Order updated in localStorage (backup)', {
        orderId: order.id,
        billsCount: order.bills.length,
        itemsCount: order.bills.reduce((sum, b) => sum + b.items.length, 0)
      })

      return { success: true, data: order }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order'
      }
    }
  }

  private async createBillForOrder(
    orderId: string,
    billName: string
  ): Promise<ServiceResponse<PosBill>> {
    const newBill: PosBill = {
      id: generateId(), // UUID for Supabase compatibility
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

    // Сохраняем счет
    const bills = this.getAllStoredBills()
    bills.push(newBill)
    localStorage.setItem(this.BILLS_KEY, JSON.stringify(bills))

    return { success: true, data: newBill }
  }

  // STATUS

  /**
   * Обновить статус оплаты позиций
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
   * Обновить статус оплаты заказа
   */
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
  private async getBillsByOrderId(orderId: string): Promise<PosBill[]> {
    const allBills = this.getAllStoredBills()
    const orderBills = allBills.filter(bill => bill.orderId === orderId)

    // Загружаем товары для каждого счета
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

    // Удаляем старые товары этого счета
    const filteredItems = allItems.filter(item => item.billId !== billId)

    // Добавляем новые товары
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
