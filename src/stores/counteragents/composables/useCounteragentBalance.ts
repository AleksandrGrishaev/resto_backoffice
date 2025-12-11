// src/stores/counteragents/composables/useCounteragentBalance.ts

/**
 * Composable для работы с балансами контрагентов
 * Баланс = Оплачено - Получено (на основе completed receipts)
 */

export interface BalanceBreakdown {
  totalReceived: number // Стоимость полученных товаров (completed receipts)
  totalPaid: number // Сумма оплат за эти товары
  balance: number // totalPaid - totalReceived (положительный = переплата, отрицательный = долг)
  ordersWithReceipts: number // Количество заказов с completed receipts
}

export function useCounteragentBalance() {
  /**
   * Получить детальную разбивку баланса контрагента
   * Основано на ПОЛУЧЕННЫХ товарах (completed receipts), а не на pending платежах
   */
  const getBalanceBreakdown = async (counteragentId: string): Promise<BalanceBreakdown> => {
    try {
      const { useSupplierStore } = await import('@/stores/supplier_2')
      const { useAccountStore } = await import('@/stores/account')

      const supplierStore = useSupplierStore()
      const accountStore = useAccountStore()

      // 1. Получить заказы для этого контрагента с completed receipts
      const ordersWithReceipts = supplierStore.state.orders.filter(order => {
        if (order.supplierId !== counteragentId) return false
        if (order.status !== 'delivered') return false

        // Должен быть completed receipt
        const hasCompletedReceipt = supplierStore.state.receipts.some(
          r => r.purchaseOrderId === order.id && r.status === 'completed'
        )
        return hasCompletedReceipt
      })

      // 2. Рассчитать общую стоимость полученных товаров
      const totalReceived = ordersWithReceipts.reduce((sum, order) => {
        // Используем actualDeliveredAmount если есть (после приёмки с расхождениями)
        return sum + (order.actualDeliveredAmount || order.totalAmount)
      }, 0)

      // 3. Рассчитать сумму оплат за эти заказы
      let totalPaid = 0
      for (const order of ordersWithReceipts) {
        // Найти completed платежи, привязанные к этому заказу
        const payments = accountStore.state.pendingPayments.filter(
          p =>
            p.status === 'completed' &&
            p.linkedOrders?.some(l => l.orderId === order.id && l.isActive)
        )

        for (const payment of payments) {
          const link = payment.linkedOrders?.find(l => l.orderId === order.id && l.isActive)
          if (link) {
            totalPaid += link.linkedAmount
          }
        }
      }

      // 4. Баланс = Оплачено - Получено
      // Положительный = переплата (кредит)
      // Отрицательный = недоплата (долг)
      return {
        totalReceived,
        totalPaid,
        balance: totalPaid - totalReceived,
        ordersWithReceipts: ordersWithReceipts.length
      }
    } catch (error) {
      console.error('Failed to get balance breakdown:', error)
      return {
        totalReceived: 0,
        totalPaid: 0,
        balance: 0,
        ordersWithReceipts: 0
      }
    }
  }

  /**
   * Рассчитать баланс контрагента
   * Balance = Total Paid - Total Received (from completed receipts)
   * Positive = credit (overpaid)
   * Negative = debt (underpaid for received goods)
   */
  const calculateBalance = async (counteragentId: string): Promise<number> => {
    const breakdown = await getBalanceBreakdown(counteragentId)
    return breakdown.balance
  }

  /**
   * Обновить баланс контрагента
   */
  const updateCounteragentBalance = async (counteragentId: string): Promise<void> => {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const counteragent = counteragentsStore.counteragents.find(ca => ca.id === counteragentId)
      if (counteragent) {
        counteragent.currentBalance = await calculateBalance(counteragentId)
        counteragent.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update balance:', error)
    }
  }

  /**
   * Обновить балансы всех поставщиков
   */
  const syncAllSupplierBalances = async (): Promise<void> => {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const suppliers = counteragentsStore.counteragents.filter(ca => ca.type === 'supplier')

      // Обновляем балансы последовательно (простое решение)
      for (const supplier of suppliers) {
        await updateCounteragentBalance(supplier.id)
      }

      console.log(`Updated balances for ${suppliers.length} suppliers`)
    } catch (error) {
      console.error('Failed to sync supplier balances:', error)
    }
  }

  /**
   * Форматировать баланс для отображения
   */
  const formatBalance = (balance: number): string => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(balance))

    if (balance > 0) return `+${formatted}`
    if (balance < 0) return `-${formatted}`
    return formatted
  }

  /**
   * Получить цвет для баланса
   */
  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return 'success' // кредит (переплата)
    if (balance < 0) return 'warning' // долг
    return 'default' // ноль
  }

  /**
   * Получить иконку для баланса
   */
  const getBalanceIcon = (balance: number): string => {
    if (balance > 0) return 'mdi-arrow-up-circle'
    if (balance < 0) return 'mdi-arrow-down-circle'
    return 'mdi-check-circle'
  }

  /**
   * Получить текст статуса баланса
   */
  const getBalanceText = (balance: number): string => {
    if (balance > 0) return 'Credit'
    if (balance < 0) return 'Debt'
    return 'Balanced'
  }

  return {
    // Расчеты
    calculateBalance,
    getBalanceBreakdown,
    updateCounteragentBalance,
    syncAllSupplierBalances,

    // Форматирование для UI
    formatBalance,
    getBalanceColor,
    getBalanceIcon,
    getBalanceText
  }
}
