// src/stores/counteragents/integrations/automatedPayments.ts

import { DebugUtils } from '@/utils'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'

const MODULE_NAME = 'AutomatedPayments'

export class AutomatedPayments {
  // =============================================
  // 1. ЗАКАЗ СО СТАТУСОМ DELIVERED → ЗАДОЛЖЕННОСТЬ
  // =============================================

  static async handleOrderReceived(order: PurchaseOrder): Promise<void> {
    try {
      console.log(`📦 Order ${order.orderNumber} delivered - creating debt`)

      // Проверяем, что заказ доставлен
      if (order.status !== 'delivered') return

      // Проверяем, есть ли уже счет или платёж
      const { useAccountStore } = await import('@/stores/account')
      const accountStore = useAccountStore()

      // Wait a bit to allow confirmPendingPayment to complete first (race condition prevention)
      // confirmPendingPayment runs after completeReceipt() which triggers this automation
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force refresh to get latest data (avoid race condition with confirmPendingPayment)
      await accountStore.fetchPayments(true)
      const existingBills = await accountStore.getPaymentsByOrder(order.id)

      // Check for any existing payment (pending OR completed)
      // This prevents creating duplicate when confirmPendingPayment already processed a payment
      if (existingBills.length > 0) {
        console.log(`AutomatedPayments: Bill already exists for order ${order.orderNumber}`, {
          count: existingBills.length,
          statuses: existingBills.map(b => b.status)
        })
        return
      }

      // Create debt/bill for order
      const debtAmount = order.actualDeliveredAmount || order.totalAmount

      await accountStore.createPayment({
        counteragentId: order.supplierId,
        counteragentName: order.supplierName,
        amount: debtAmount,
        description: `Payment for order ${order.orderNumber}`,
        category: 'supplier',
        invoiceNumber: `DEBT-${order.orderNumber}`,
        priority: 'medium',

        // Связываем с заказом
        linkedOrders: [
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            linkedAmount: debtAmount,
            linkedAt: new Date().toISOString(),
            isActive: true
          }
        ],

        autoCreated: true,
        sourceOrderId: order.id,

        createdBy: {
          type: 'system',
          id: 'auto_system',
          name: 'Автоматическая система'
        }
      })

      console.log(`✅ Debt created: ${debtAmount} for order ${order.orderNumber}`)

      // Обновляем баланс контрагента
      await this.updateCounteragentBalance(order.supplierId)
    } catch (error) {
      console.error('Failed to create debt from order:', error)
    }
  }

  // =============================================
  // 2. СЧЕТ ОПЛАЧЕН → ОБНОВЛЯЕМ БАЛАНС
  // =============================================

  static async handlePaymentCompleted(payment: PendingPayment): Promise<void> {
    try {
      console.log(`💰 Payment ${payment.id} completed - updating balance`)

      if (payment.status !== 'completed') return

      // Обновляем баланс контрагента
      if (payment.counteragentId) {
        await this.updateCounteragentBalance(payment.counteragentId)
      }

      // Обновляем статусы связанных заказов
      if (payment.linkedOrders?.length) {
        for (const orderLink of payment.linkedOrders) {
          if (!orderLink.isActive) continue
          await this.updateOrderBillStatus(orderLink.orderId)
        }
      }

      console.log(`✅ Payment processed: ${payment.amount}`)
    } catch (error) {
      console.error('Failed to handle completed payment:', error)
    }
  }

  // =============================================
  // 3. ПЕРЕСЧЕТ БАЛАНСА КОНТРАГЕНТА
  // =============================================

  static async updateCounteragentBalance(counteragentId: string): Promise<void> {
    try {
      const { useAccountStore, useCounteragentsStore } = await Promise.all([
        import('@/stores/account'),
        import('@/stores/counteragents')
      ]).then(([account, counteragents]) => ({
        useAccountStore: account.useAccountStore,
        useCounteragentsStore: counteragents.useCounteragentsStore
      }))

      const accountStore = useAccountStore()
      const counteragentsStore = useCounteragentsStore()

      // Получаем все платежи контрагента
      await accountStore.fetchPayments()

      const allPayments = accountStore.state.pendingPayments || []
      const payments = allPayments.filter(p => p.counteragentId === counteragentId) || []

      // Простая логика расчета баланса
      let totalDebt = 0 // pending платежи = долги поставщику
      let totalPaid = 0 // completed платежи = наши оплаты поставщику

      for (const payment of payments) {
        const amount = payment.amount || 0

        if (payment.status === 'pending') {
          totalDebt += amount // Долг поставщику
        } else if (payment.status === 'completed') {
          totalPaid += amount // Оплачено поставщику
        }
      }

      // БАЛАНС = оплачено минус долги
      // Отрицательный баланс = мы должны поставщику
      // Положительный баланс = поставщик должен нам (или предоплата)
      const currentBalance = totalPaid - totalDebt

      // Обновляем контрагента с защитой от undefined
      await counteragentsStore.updateCounteragent(counteragentId, {
        currentBalance: currentBalance || 0,
        lastBalanceUpdate: new Date().toISOString()
      })

      console.log(`📊 Balance updated for ${counteragentId}: ${currentBalance}`, {
        totalDebt,
        totalPaid,
        paymentsCount: payments.length
      })
    } catch (error) {
      console.error('Failed to update counteragent balance:', error)

      // В случае ошибки устанавливаем баланс в 0
      try {
        const { useCounteragentsStore } = await import('@/stores/counteragents')
        const counteragentsStore = useCounteragentsStore()
        await counteragentsStore.updateCounteragent(counteragentId, {
          currentBalance: 0,
          lastBalanceUpdate: new Date().toISOString()
        })
      } catch (fallbackError) {
        console.error('Failed to set fallback balance:', fallbackError)
      }
    }
  }

  // =============================================
  // 4. ОБНОВЛЕНИЕ СТАТУСА СЧЕТА ЗАКАЗА
  // =============================================

  static async updateOrderBillStatus(orderId: string): Promise<void> {
    try {
      const { useSupplierStore, useAccountStore } = await Promise.all([
        import('@/stores/supplier_2'),
        import('@/stores/account')
      ]).then(([supplier, account]) => ({
        useSupplierStore: supplier.useSupplierStore,
        useAccountStore: account.useAccountStore
      }))

      const supplierStore = useSupplierStore()
      const accountStore = useAccountStore()

      // Получаем заказ через существующий метод getOrders
      await supplierStore.getOrders()
      const order = supplierStore.state.orders.find(o => o.id === orderId)
      if (!order) return

      // ✅ Используем actualDeliveredAmount если есть (после receipt), иначе totalAmount
      const orderAmount = order.actualDeliveredAmount || order.totalAmount

      // Получаем все счета для заказа
      await accountStore.fetchPayments()
      const bills = await accountStore.getPaymentsByOrder(orderId)

      let totalBilled = 0
      let totalPaid = 0

      for (const bill of bills) {
        const orderLink = bill.linkedOrders?.find(link => link.orderId === orderId && link.isActive)
        if (!orderLink) continue

        totalBilled += orderLink.linkedAmount

        if (bill.status === 'completed') {
          // ✅ Используем paid_amount если есть (реальная сумма оплаты), иначе linkedAmount
          totalPaid += bill.paidAmount || orderLink.linkedAmount
        }
      }

      // Определяем новый статус
      // ✅ Сравниваем с orderAmount (actualDeliveredAmount), а не с totalBilled
      let newBillStatus: string

      if (totalBilled === 0) {
        newBillStatus = 'not_billed'
      } else if (totalPaid === 0) {
        newBillStatus = 'billed'
      } else if (totalPaid > orderAmount) {
        newBillStatus = 'overpaid'
      } else if (totalPaid >= orderAmount) {
        newBillStatus = 'fully_paid'
      } else {
        newBillStatus = 'partially_paid'
      }

      console.log(`📝 Bill status calculation for ${order.orderNumber}:`, {
        orderAmount,
        totalBilled,
        totalPaid,
        currentStatus: order.billStatus,
        newBillStatus
      })

      // Обновляем заказ если статус изменился
      if (order.billStatus !== newBillStatus) {
        await supplierStore.updateOrder(orderId, {
          billStatus: newBillStatus,
          billStatusCalculatedAt: new Date().toISOString()
        })

        console.log(
          `📝 Order ${order.orderNumber} bill status updated: ${order.billStatus} → ${newBillStatus}`
        )
      }
    } catch (error) {
      console.error('Failed to update order bill status:', error)
    }
  }

  // =============================================
  // 5. ХУКИ ДЛЯ ИНТЕГРАЦИИ
  // =============================================

  static async onOrderStatusChanged(order: PurchaseOrder, previousStatus?: string): Promise<void> {
    // Если заказ перешел в статус доставлен
    if (order.status === 'delivered' && previousStatus !== 'delivered') {
      await this.handleOrderReceived(order)
    }
  }

  static async onPaymentStatusChanged(
    payment: PendingPayment,
    previousStatus?: string
  ): Promise<void> {
    // Если платеж стал оплаченным
    if (payment.status === 'completed' && previousStatus !== 'completed') {
      await this.handlePaymentCompleted(payment)
    }
  }
}

// =============================================
// МЕТОДЫ ДЛЯ ДОБАВЛЕНИЯ В STORES
// =============================================

// ДЛЯ ACCOUNT STORE - добавить эти методы:
export const accountStoreMethods = `
// Добавить в src/stores/account/store.ts:

async function getPaymentsByCounteragent(counteragentId: string): Promise<PendingPayment[]> {
  try {
    await fetchPayments()
    return state.value.pendingPayments.filter(payment =>
      payment.counteragentId === counteragentId
    )
  } catch (error) {
    console.error('Failed to get payments by counteragent:', error)
    return []
  }
}

// И в return добавить:
return {
  // ... существующие методы
  getPaymentsByCounteragent
}
`

// ДЛЯ SUPPLIER STORE - добавить в updateOrder:
export const supplierStoreIntegration = `
// В src/stores/supplier_2/supplierStore.ts в функции updateOrder, добавить ПЕРЕД return:

try {
  // Получаем исходный заказ для сравнения
  const originalOrder = state.value.orders.find(o => o.id === id)

  if (originalOrder && data.status && data.status !== originalOrder.status) {
    const { AutomatedPayments } = await import('@/stores/counteragents/integrations/automatedPayments')

    // Асинхронно запускаем автоматизацию
    AutomatedPayments.onOrderStatusChanged(updatedOrder, originalOrder.status).catch(error => {
      console.warn('Order automation failed:', error)
    })
  }
} catch (error) {
  console.warn('Failed to trigger order automation:', error)
}
`

// ДЛЯ ACCOUNT STORE - добавить в updatePayment:
export const accountStoreIntegration = `
// В src/stores/account/store.ts в функции updatePayment, добавить в конце:

try {
  // Получаем исходный платеж для сравнения
  const originalPayment = state.value.pendingPayments.find(p => p.id === paymentId)

  if (originalPayment && updates.status && updates.status !== originalPayment.status) {
    const { AutomatedPayments } = await import('@/stores/counteragents/integrations/automatedPayments')

    // Асинхронно запускаем автоматизацию
    AutomatedPayments.onPaymentStatusChanged(updatedPayment, originalPayment.status).catch(error => {
      console.warn('Payment automation failed:', error)
    })
  }
} catch (error) {
  console.warn('Failed to trigger payment automation:', error)
}
`
