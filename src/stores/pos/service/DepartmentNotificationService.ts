// src/stores/pos/services/DepartmentNotificationService.ts
import type { PosBillItem, PosOrder, OrderType } from '../types'
import type { Department } from '@/stores/menu/types'
import type { MenuItem } from '@/stores/menu/types'
import { useMenuStore } from '@/stores/menu'
import { TimeUtils } from '@/utils'

// =============================================
// ТИПЫ ДЛЯ УВЕДОМЛЕНИЙ ОТДЕЛОВ
// =============================================

export interface DepartmentItem {
  itemId: string
  menuItemId: string
  itemName: string
  variantName: string
  quantity: number
  modifications: ItemModification[]
  kitchenNotes?: string
  urgency: 'normal' | 'urgent'
  estimatedTime?: number // в минутах
}

export interface ItemModification {
  id: string
  name: string
  price: number
}

export interface DepartmentNotification {
  notificationId: string
  department: Department
  items: DepartmentItem[]
  orderInfo: {
    orderId: string
    orderNumber: string
    orderType: OrderType
    tableNumber?: string
    customerName?: string
    waiterName?: string
  }
  timestamp: string
  totalItems: number
  estimatedTotalTime?: number
  urgencyLevel: 'normal' | 'urgent'
}

export interface NotificationResult {
  success: boolean
  kitchenNotifications: DepartmentNotification[]
  barNotifications: DepartmentNotification[]
  error?: string
}

// =============================================
// SERVICE IMPLEMENTATION
// =============================================

export class DepartmentNotificationService {
  private readonly NOTIFICATIONS_KEY = 'pos_department_notifications'

  /**
   * Основная функция распределения позиций по отделам и создания уведомлений
   */
  async distributeAndNotify(
    order: PosOrder,
    newItems: PosBillItem[],
    tableNumber?: string
  ): Promise<NotificationResult> {
    try {
      console.log('🔄 Starting department distribution for order:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        newItemsCount: newItems.length
      })

      // Получаем menu store для определения department каждого блюда
      const menuStore = useMenuStore()

      // Группируем позиции по отделам
      const { kitchenItems, barItems } = await this.groupItemsByDepartment(newItems, menuStore)

      const notifications: DepartmentNotification[] = []

      // Создаем уведомление для кухни если есть позиции
      if (kitchenItems.length > 0) {
        const kitchenNotification = this.createDepartmentNotification(
          'kitchen',
          kitchenItems,
          order,
          tableNumber
        )
        notifications.push(kitchenNotification)

        // Отправляем уведомление в кухню
        await this.sendToKitchen(kitchenNotification)
      }

      // Создаем уведомление для бара если есть позиции
      if (barItems.length > 0) {
        const barNotification = this.createDepartmentNotification(
          'bar',
          barItems,
          order,
          tableNumber
        )
        notifications.push(barNotification)

        // Отправляем уведомление в бар
        await this.sendToBar(barNotification)
      }

      // Сохраняем уведомления в localStorage для истории
      await this.saveNotifications(notifications)

      console.log('✅ Department distribution completed:', {
        kitchenItems: kitchenItems.length,
        barItems: barItems.length,
        totalNotifications: notifications.length
      })

      return {
        success: true,
        kitchenNotifications: notifications.filter(n => n.department === 'kitchen'),
        barNotifications: notifications.filter(n => n.department === 'bar')
      }
    } catch (error) {
      console.error('❌ Department distribution failed:', error)

      return {
        success: false,
        kitchenNotifications: [],
        barNotifications: [],
        error: error instanceof Error ? error.message : 'Distribution failed'
      }
    }
  }

  /**
   * Группировка позиций по отделам на основе menu data
   */
  private async groupItemsByDepartment(
    items: PosBillItem[],
    menuStore: any
  ): Promise<{ kitchenItems: DepartmentItem[]; barItems: DepartmentItem[] }> {
    const kitchenItems: DepartmentItem[] = []
    const barItems: DepartmentItem[] = []

    for (const item of items) {
      // Находим menu item для определения department
      const menuItem = menuStore.menuItems.find(item => item.id === item.menuItemId)

      // Note: Menu item may not be found if using POS menu items instead of backoffice menu
      // Default to kitchen department in this case

      // Определяем department (по умолчанию kitchen если не найдено)
      const department: Department = menuItem?.department || 'kitchen'

      // Конвертируем в DepartmentItem
      const departmentItem: DepartmentItem = {
        itemId: item.id,
        menuItemId: item.menuItemId,
        itemName: item.menuItemName,
        variantName: item.variantName || '',
        quantity: item.quantity,
        modifications: item.modifications || [],
        kitchenNotes: item.kitchenNotes,
        urgency: this.determineUrgency(item),
        estimatedTime: menuItem?.preparationTime || 15 // дефолт 15 минут
      }

      // Распределяем по отделам
      if (department === 'kitchen') {
        kitchenItems.push(departmentItem)
      } else {
        barItems.push(departmentItem)
      }
    }

    return { kitchenItems, barItems }
  }

  /**
   * Создание уведомления для отдела
   */
  private createDepartmentNotification(
    department: Department,
    items: DepartmentItem[],
    order: PosOrder,
    tableNumber?: string
  ): DepartmentNotification {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const estimatedTotalTime = Math.max(...items.map(item => item.estimatedTime || 15))
    const urgencyLevel = items.some(item => item.urgency === 'urgent') ? 'urgent' : 'normal'

    return {
      notificationId: `notif_${department}_${Date.now()}`,
      department,
      items,
      orderInfo: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.type,
        tableNumber: tableNumber || (order.tableId ? `Table ${order.tableId}` : undefined),
        customerName: order.customerName,
        waiterName: order.waiterName
      },
      timestamp: TimeUtils.getCurrentLocalISO(),
      totalItems,
      estimatedTotalTime,
      urgencyLevel
    }
  }

  /**
   * Отправка уведомления в кухню (пока console.log)
   */
  private async sendToKitchen(notification: DepartmentNotification): Promise<void> {
    console.log('🍳 KITCHEN ORDER NOTIFICATION:')
    console.log('=====================================')
    console.log(`Order: ${notification.orderInfo.orderNumber}`)
    console.log(`Type: ${this.formatOrderType(notification.orderInfo.orderType)}`)

    if (notification.orderInfo.tableNumber) {
      console.log(`Table: ${notification.orderInfo.tableNumber}`)
    }

    if (notification.orderInfo.customerName) {
      console.log(`Customer: ${notification.orderInfo.customerName}`)
    }

    console.log(`Items (${notification.totalItems} total):`)
    notification.items.forEach(item => {
      console.log(`  • ${item.quantity}x ${item.itemName}`)
      if (item.variantName) {
        console.log(`    Variant: ${item.variantName}`)
      }
      if (item.modifications.length > 0) {
        console.log(`    Modifications: ${item.modifications.map(m => m.name).join(', ')}`)
      }
      if (item.kitchenNotes) {
        console.log(`    Notes: ${item.kitchenNotes}`)
      }
    })

    console.log(`Estimated time: ${notification.estimatedTotalTime} minutes`)
    console.log(`Urgency: ${notification.urgencyLevel.toUpperCase()}`)
    console.log(`Time: ${new Date(notification.timestamp).toLocaleTimeString()}`)
    console.log('=====================================')

    // TODO: Здесь будет реальная отправка на кухонный монитор
    // await KitchenDisplayService.sendNotification(notification)
  }

  /**
   * Отправка уведомления в бар (пока console.log)
   */
  private async sendToBar(notification: DepartmentNotification): Promise<void> {
    console.log('🍺 BAR ORDER NOTIFICATION:')
    console.log('=====================================')
    console.log(`Order: ${notification.orderInfo.orderNumber}`)
    console.log(`Type: ${this.formatOrderType(notification.orderInfo.orderType)}`)

    if (notification.orderInfo.tableNumber) {
      console.log(`Table: ${notification.orderInfo.tableNumber}`)
    }

    if (notification.orderInfo.customerName) {
      console.log(`Customer: ${notification.orderInfo.customerName}`)
    }

    console.log(`Drinks (${notification.totalItems} total):`)
    notification.items.forEach(item => {
      console.log(`  • ${item.quantity}x ${item.itemName}`)
      if (item.variantName) {
        console.log(`    Size: ${item.variantName}`)
      }
      if (item.modifications.length > 0) {
        console.log(`    Modifications: ${item.modifications.map(m => m.name).join(', ')}`)
      }
      if (item.kitchenNotes) {
        console.log(`    Notes: ${item.kitchenNotes}`)
      }
    })

    console.log(`Estimated time: ${notification.estimatedTotalTime} minutes`)
    console.log(`Urgency: ${notification.urgencyLevel.toUpperCase()}`)
    console.log(`Time: ${new Date(notification.timestamp).toLocaleTimeString()}`)
    console.log('=====================================')

    // TODO: Здесь будет реальная отправка на барный монитор
    // await BarDisplayService.sendNotification(notification)
  }

  /**
   * Определение срочности заказа
   */
  private determineUrgency(item: PosBillItem): 'normal' | 'urgent' {
    // Пока простая логика - все normal
    // TODO: Добавить логику на основе времени ожидания, типа заказа и т.д.

    // Пример будущей логики:
    // if (item.kitchenNotes?.toLowerCase().includes('urgent')) return 'urgent'
    // if (item.createdAt < some_threshold) return 'urgent'

    return 'normal'
  }

  /**
   * Форматирование типа заказа для отображения
   */
  private formatOrderType(type: OrderType): string {
    const types = {
      dine_in: 'Dine In',
      takeaway: 'Takeaway',
      delivery: 'Delivery'
    }
    return types[type]
  }

  /**
   * Сохранение уведомлений в localStorage для истории
   */
  private async saveNotifications(notifications: DepartmentNotification[]): Promise<void> {
    try {
      const stored = localStorage.getItem(this.NOTIFICATIONS_KEY)
      const history = stored ? JSON.parse(stored) : []

      // Добавляем новые уведомления
      history.push(...notifications)

      // Ограничиваем историю последними 100 уведомлениями
      const limitedHistory = history.slice(-100)

      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(limitedHistory))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  /**
   * Получение истории уведомлений
   */
  async getNotificationHistory(department?: Department): Promise<DepartmentNotification[]> {
    try {
      const stored = localStorage.getItem(this.NOTIFICATIONS_KEY)
      const history = stored ? JSON.parse(stored) : []

      if (department) {
        return history.filter((n: DepartmentNotification) => n.department === department)
      }

      return history
    } catch (error) {
      console.error('Failed to load notification history:', error)
      return []
    }
  }

  /**
   * Очистка старых уведомлений (старше суток)
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.NOTIFICATIONS_KEY)
      if (!stored) return

      const history = JSON.parse(stored)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const filtered = history.filter((n: DepartmentNotification) => n.timestamp > oneDayAgo)

      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(filtered))

      console.log(`🧹 Cleaned up ${history.length - filtered.length} old notifications`)
    } catch (error) {
      console.error('Failed to cleanup notifications:', error)
    }
  }
}

// Экспорт singleton instance
export const departmentNotificationService = new DepartmentNotificationService()
