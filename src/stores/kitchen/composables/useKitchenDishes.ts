// src/stores/kitchen/composables/useKitchenDishes.ts
import { computed, type Ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { useAuthStore } from '@/stores/auth'
import type {
  PosOrder,
  PosBillItem,
  OrderStatus,
  ServiceResponse,
  Department
} from '@/stores/pos/types'

/**
 * Kitchen Dish (expanded from bill item)
 * Каждое блюдо - отдельная карточка на экране
 */
export interface KitchenDish {
  // Dish identity
  id: string // unique ID для каждого экземпляра блюда
  itemId: string // ID оригинального bill item

  // Dish info
  name: string
  quantity: 1 // Всегда 1, так как каждое блюдо - отдельная карточка
  status: 'waiting' | 'cooking' | 'ready'
  kitchenNotes?: string
  department?: Department // Which department should prepare this item (kitchen or bar)

  // Order context
  orderId: string
  orderNumber: string
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  tableNumber?: string

  // Timing
  createdAt: string
  sentToKitchenAt?: string

  // Bill context (для группировки)
  billId: string
  billNumber: string
}

/**
 * Kitchen Dishes Composable
 * Разбивает заказы на отдельные блюда для KDS
 * Поддерживает role-based filtering для Kitchen и Bar
 *
 * @param selectedDepartment - Optional ref для admin manual department selection ('all' | 'kitchen' | 'bar')
 */
export function useKitchenDishes(selectedDepartment?: Ref<'all' | 'kitchen' | 'bar' | undefined>) {
  const posOrdersStore = usePosOrdersStore()
  const authStore = useAuthStore()

  /**
   * Разбить bill item на отдельные блюда
   * Если quantity = 3, создаем 3 отдельных карточки
   */
  function expandBillItemToDishes(item: PosBillItem, order: PosOrder, bill: any): KitchenDish[] {
    const dishes: KitchenDish[] = []

    // Извлекаем номер стола из tableId
    let tableNumber: string | undefined
    if (order.type === 'dine_in' && order.tableId) {
      const match = order.tableId.match(/table_(\d+)/)
      tableNumber = match ? match[1] : order.tableId
    }

    // Создаем отдельную карточку для каждого экземпляра блюда
    for (let i = 0; i < item.quantity; i++) {
      dishes.push({
        id: `${item.id}_${i}`, // Уникальный ID для каждого экземпляра
        itemId: item.id,
        name: item.menuItemName,
        quantity: 1, // Всегда 1
        status: item.status as 'waiting' | 'cooking' | 'ready',
        kitchenNotes: item.kitchenNotes,
        department: item.department || 'kitchen', // Default to kitchen if not specified
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.type,
        tableNumber,
        createdAt: order.createdAt,
        sentToKitchenAt: item.sentToKitchenAt,
        billId: bill.id,
        billNumber: bill.billNumber
      })
    }

    return dishes
  }

  /**
   * Определить разрешенные департаменты на основе роли пользователя
   * Admin может переключаться между департаментами, остальные видят только свой
   */
  const allowedDepartments = computed((): Department[] => {
    const roles = authStore.userRoles
    const isAdmin = roles.includes('admin')
    const isKitchen = roles.includes('kitchen')
    const isBar = roles.includes('bar')

    // Admin: manual selection via selectedDepartment prop
    if (isAdmin) {
      const selected = selectedDepartment?.value
      if (selected === 'all') return ['kitchen', 'bar']
      if (selected === 'kitchen') return ['kitchen']
      if (selected === 'bar') return ['bar']
      // Default for admin: show all
      return ['kitchen', 'bar']
    }

    // Kitchen role: only kitchen items
    if (isKitchen) return ['kitchen']

    // Bar role: only bar items
    if (isBar) return ['bar']

    // Fallback: show kitchen by default
    return ['kitchen']
  })

  /**
   * Все блюда для отображения (статусы: waiting, cooking, ready)
   * Фильтрация по department на основе роли пользователя
   */
  const kitchenDishes = computed((): KitchenDish[] => {
    const dishes: KitchenDish[] = []
    const allowed = allowedDepartments.value

    // Проходим по всем заказам
    for (const order of posOrdersStore.orders) {
      // Проходим по всем bills в заказе
      for (const bill of order.bills) {
        // Проходим по всем items в bill
        for (const item of bill.items) {
          // Определяем department (default: 'kitchen' если не указан)
          const itemDepartment = item.department || 'kitchen'

          // Фильтруем только Kitchen/Bar статусы И разрешенные департаменты
          if (
            ['waiting', 'cooking', 'ready'].includes(item.status) &&
            allowed.includes(itemDepartment)
          ) {
            // Разворачиваем item в отдельные блюда
            const expandedDishes = expandBillItemToDishes(item, order, bill)
            dishes.push(...expandedDishes)
          }
        }
      }
    }

    return dishes
  })

  /**
   * Группировка блюд по статусам (для колонок)
   * Сортировка по времени создания (старые сверху)
   */
  const dishesByStatus = computed(() => ({
    waiting: kitchenDishes.value
      .filter(d => d.status === 'waiting')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    cooking: kitchenDishes.value
      .filter(d => d.status === 'cooking')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    ready: kitchenDishes.value
      .filter(d => d.status === 'ready')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }))

  /**
   * Статистика блюд
   */
  const dishesStats = computed(() => ({
    total: kitchenDishes.value.length,
    waiting: dishesByStatus.value.waiting.length,
    cooking: dishesByStatus.value.cooking.length,
    ready: dishesByStatus.value.ready.length
  }))

  /**
   * Группировка блюд по заказам (для визуальной связи)
   */
  const dishesByOrder = computed(() => {
    const grouped = new Map<string, KitchenDish[]>()

    for (const dish of kitchenDishes.value) {
      if (!grouped.has(dish.orderNumber)) {
        grouped.set(dish.orderNumber, [])
      }
      grouped.get(dish.orderNumber)!.push(dish)
    }

    return grouped
  })

  /**
   * Получить цвет заказа (для визуальной связи блюд)
   */
  function getOrderColor(orderNumber: string): string {
    // Генерируем стабильный цвет на основе номера заказа
    const colors = [
      '#FF6B6B', // red
      '#4ECDC4', // cyan
      '#45B7D1', // blue
      '#FFA07A', // orange
      '#98D8C8', // mint
      '#F7DC6F', // yellow
      '#BB8FCE', // purple
      '#85C1E2', // sky blue
      '#F8B739', // gold
      '#52B788' // green
    ]

    // Используем хеш номера заказа для выбора цвета
    const hash = orderNumber.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Обновить статус блюда
   * Обновляет статус через Kitchen Service → Supabase
   */
  async function updateDishStatus(
    dish: KitchenDish,
    newStatus: 'waiting' | 'cooking' | 'ready'
  ): Promise<ServiceResponse<any>> {
    try {
      // Импортируем Kitchen Service динамически для избежания циклических зависимостей
      const { kitchenService } = await import('../kitchenService')

      // Обновляем статус item через Supabase
      const result = await kitchenService.updateItemStatus(dish.orderId, dish.itemId, newStatus)

      if (result.success) {
        // Auto-update order status based on all items
        await kitchenService.checkAndUpdateOrderStatus(dish.orderId)

        return { success: true }
      }

      return { success: false, error: result.error }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update dish status'
      return { success: false, error: message }
    }
  }

  /**
   * Получить кол-во блюд в заказе по статусу
   */
  function getOrderDishesCount(
    orderNumber: string,
    status?: 'waiting' | 'cooking' | 'ready'
  ): number {
    const orderDishes = dishesByOrder.value.get(orderNumber) || []
    if (!status) return orderDishes.length
    return orderDishes.filter(d => d.status === status).length
  }

  return {
    // Data
    kitchenDishes,
    dishesByStatus,
    dishesStats,
    dishesByOrder,

    // Methods
    updateDishStatus,
    getOrderColor,
    getOrderDishesCount
  }
}
