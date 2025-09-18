// src/stores/pos/orders/services.ts
import type {
  PosOrder,
  PosBill,
  PosBillItem,
  ServiceResponse,
  OrderType,
  PosMenuItem
} from '../types'
import type { MenuItemVariant } from '@/stores/menu'
import { TimeUtils } from '@/utils'
import { departmentNotificationService } from '../service/DepartmentNotificationService'

export class OrdersService {
  private readonly ORDERS_KEY = 'pos_orders'
  private readonly BILLS_KEY = 'pos_bills'
  private readonly ITEMS_KEY = 'pos_bill_items'

  async getAllOrders(): Promise<ServiceResponse<PosOrder[]>> {
    try {
      const stored = localStorage.getItem(this.ORDERS_KEY)
      const orders = stored ? JSON.parse(stored) : []

      // Загружаем счета для каждого заказа
      for (const order of orders) {
        order.bills = await this.getBillsByOrderId(order.id)
      }

      await new Promise(resolve => setTimeout(resolve, 100))

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
          notificationsSent = true
        }
      }

      // 5. Сохраняем обновленный заказ
      const orderIndex = orders.data.findIndex(o => o.id === orderId)
      if (orderIndex !== -1) {
        orders.data[orderIndex] = {
          ...order,
          updatedAt: new Date().toISOString()
        }

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
        id: `order_${Date.now()}`,
        orderNumber,
        type: orderData.type, // ВАЖНО: правильно сохраняем тип
        status: 'draft',
        tableId: orderData.tableId,
        customerName: orderData.customerName,
        waiterName: orderData.waiterName,
        bills: [],
        totalAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        finalAmount: 0,
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

      // Сохраняем заказ
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

      console.log('💾 Saved order to localStorage:', {
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
    modifications: any[]
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // Сначала рассчитываем цену модификаций
      const modificationPrice = modifications.reduce((sum, mod) => sum + mod.price, 0)

      // Правильная цена = цена варианта + модификации
      const finalUnitPrice = selectedVariant.price + modificationPrice
      const finalTotalPrice = finalUnitPrice * quantity

      const newItem: PosBillItem = {
        id: `item_${Date.now()}`,
        billId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        quantity,
        unitPrice: finalUnitPrice, // ИСПРАВЛЕНО: включает модификации
        totalPrice: finalTotalPrice, // ИСПРАВЛЕНО: правильная итоговая цена
        discounts: [],
        modifications: modifications.map(mod => ({
          id: mod.id,
          name: mod.name,
          price: mod.price
        })),
        status: 'draft', // Статус остается правильным
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // УБИРАЕМ эту строку - она перезаписывала правильную цену:
      // newItem.totalPrice = (menuItem.price + modificationPrice) * quantity

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
        status: 'confirmed',
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
        status: 'confirmed',
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Обновить статус всех товаров в заказе
      for (const bill of updatedOrder.bills) {
        for (const item of bill.items) {
          if (item.status === 'draft') {
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
        status: 'paid',
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

  private async createBillForOrder(
    orderId: string,
    billName: string
  ): Promise<ServiceResponse<PosBill>> {
    const newBill: PosBill = {
      id: `bill_${Date.now()}`,
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
