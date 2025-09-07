// src/stores/supplier_2/integrations/accountIntegration.ts

import { DebugUtils } from '@/utils'
import type { PurchaseOrder } from '../types'
import type {
  PendingPayment,
  CreatePaymentDto,
  UpdatePaymentAmountDto,
  AmountChange
} from '@/stores/account'

const MODULE_NAME = 'SupplierAccountIntegration'

export class SupplierAccountIntegration {
  private _accountStore: ReturnType<typeof import('@/stores/account').useAccountStore> | null = null
  private _authStore: ReturnType<typeof import('@/stores/auth.store').useAuthStore> | null = null

  private async getAccountStore() {
    if (!this._accountStore) {
      const { useAccountStore } = await import('@/stores/account')
      this._accountStore = useAccountStore()
    }
    return this._accountStore
  }

  private async getAuthStore() {
    if (!this._authStore) {
      const { useAuthStore } = await import('@/stores/auth.store')
      this._authStore = useAuthStore()
    }
    return this._authStore
  }

  // =============================================
  // СОЗДАНИЕ СЧЕТА ИЗ ЗАКАЗА
  // =============================================

  async createBillFromOrder(order: PurchaseOrder): Promise<PendingPayment> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating bill from order', { orderId: order.id })

      const accountStore = await this.getAccountStore()
      const authStore = await this.getAuthStore()

      const createDto: CreatePaymentDto = {
        counteragentId: order.supplierId,
        counteragentName: order.supplierName,
        amount: order.totalAmount,
        description: `Purchase order ${order.orderNumber}`,
        category: 'supplier',
        invoiceNumber: order.orderNumber,
        priority: 'medium',

        // ✅ НОВЫЕ ПОЛЯ вместо purchaseOrderId
        usedAmount: 0,
        linkedOrders: [
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            linkedAmount: order.totalAmount,
            linkedAt: new Date().toISOString(),
            isActive: true
          }
        ],

        sourceOrderId: order.id,
        autoSyncEnabled: true,
        createdBy: {
          type: 'user',
          id: authStore.currentUser?.id || 'system',
          name: authStore.currentUser?.name || 'System'
        }
      }

      const payment = await accountStore.createPayment(createDto)

      DebugUtils.info(MODULE_NAME, 'Bill created successfully', {
        paymentId: payment.id,
        orderId: order.id
      })

      return payment
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create bill from order', { error })
      throw error
    }
  }

  // =============================================
  // СИНХРОНИЗАЦИЯ СУММЫ СЧЕТА
  // =============================================

  async syncBillAmount(order: PurchaseOrder): Promise<void> {
    try {
      if (!order.billId) {
        DebugUtils.warn(MODULE_NAME, 'Cannot sync bill amount - no bill ID', { orderId: order.id })
        return
      }

      DebugUtils.info(MODULE_NAME, 'Syncing bill amount after receipt', {
        orderId: order.id,
        billId: order.billId,
        actualDeliveredAmount: order.actualDeliveredAmount,
        orderStatus: order.status,
        hasDiscrepancies: order.hasReceiptDiscrepancies
      })

      // ✅ НОВОЕ: В новой системе НЕ МЕНЯЕМ amount платежа
      // Вместо этого обновляем usedAmount для completed платежей
      if (order.status === 'delivered' && order.actualDeliveredAmount) {
        await this.updatePaymentUsedAmount(order.billId, order)
      }

      DebugUtils.info(MODULE_NAME, 'Bill sync completed', {
        orderId: order.id,
        billId: order.billId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to sync bill amount', { error })
      throw error
    }
  }

  // ✅ ИСПРАВИТЬ - использовать прямое обновление объекта
  private async updatePaymentUsedAmount(paymentId: string, order: PurchaseOrder): Promise<void> {
    try {
      const accountStore = await this.getAccountStore()

      const payment = await accountStore.getPaymentById(paymentId)
      if (!payment) {
        DebugUtils.warn(MODULE_NAME, 'Payment not found for usedAmount update', { paymentId })
        return
      }

      if (payment.status !== 'completed') {
        DebugUtils.info(MODULE_NAME, 'Payment not completed, skipping usedAmount update', {
          paymentId,
          status: payment.status
        })
        return
      }

      // Находим привязку к текущему заказу
      const orderLink = payment.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
      if (!orderLink) {
        DebugUtils.warn(MODULE_NAME, 'No active link found for payment and order', {
          paymentId,
          orderId: order.id
        })
        return
      }

      // Вычисляем фактически использованную сумму
      const actualDeliveredAmount = order.actualDeliveredAmount || order.totalAmount

      // ✅ ИСПРАВЛЕНИЕ: Прямое обновление объекта
      payment.usedAmount = actualDeliveredAmount
      payment.updatedAt = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Payment usedAmount updated', {
        paymentId,
        orderId: order.id,
        usedAmount: actualDeliveredAmount,
        availableAmount: payment.amount - actualDeliveredAmount
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment usedAmount', { error })
      throw error
    }
  }
  // ========== ДОБАВИТЬ НОВЫЕ ФУНКЦИИ В КОНЕЦ КЛАССА ПЕРЕД ЗАКРЫВАЮЩЕЙ СКОБКОЙ ==========

  // ✅ НОВАЯ ФУНКЦИЯ: Проверка возможности массового обновления платежей
  async canUpdateMultiplePayments(paymentIds: string[]): Promise<{
    canUpdate: boolean
    updatablePayments: string[]
    blockedPayments: Array<{ id: string; reason: string }>
  }> {
    try {
      const accountStore = await this.getAccountStore()
      const results = {
        canUpdate: false,
        updatablePayments: [] as string[],
        blockedPayments: [] as Array<{ id: string; reason: string }>
      }

      for (const paymentId of paymentIds) {
        const canUpdate = await this.canUpdateBillAmount(paymentId)

        if (canUpdate) {
          results.updatablePayments.push(paymentId)
        } else {
          const payment = await accountStore.getPaymentById(paymentId)
          results.blockedPayments.push({
            id: paymentId,
            reason: payment?.status === 'completed' ? 'already_paid' : 'processing'
          })
        }
      }

      results.canUpdate = results.updatablePayments.length > 0

      DebugUtils.info(MODULE_NAME, 'Multiple payments update check completed', {
        totalPayments: paymentIds.length,
        updatable: results.updatablePayments.length,
        blocked: results.blockedPayments.length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to check multiple payments update capability', {
        error
      })
      throw error
    }
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Пакетное обновление платежей заказа
  async syncMultipleOrderPayments(
    orderId: string,
    paymentUpdates: Array<{ paymentId: string; newAmount: number; reason?: string }>
  ): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting batch payment sync', {
        orderId,
        updatesCount: paymentUpdates.length
      })

      const accountStore = await this.getAccountStore()
      const authStore = await this.getAuthStore()

      // Проверяем возможность обновления всех платежей
      const paymentIds = paymentUpdates.map(u => u.paymentId)
      const updateCheck = await this.canUpdateMultiplePayments(paymentIds)

      if (updateCheck.blockedPayments.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Some payments cannot be updated', {
          blockedPayments: updateCheck.blockedPayments
        })
      }

      // Обновляем только разрешенные платежи
      const successfulUpdates: string[] = []
      const failedUpdates: Array<{ paymentId: string; error: any }> = []

      for (const update of paymentUpdates) {
        if (!updateCheck.updatablePayments.includes(update.paymentId)) {
          continue // Пропускаем заблокированные платежи
        }

        try {
          const updateDto: UpdatePaymentAmountDto = {
            paymentId: update.paymentId,
            newAmount: update.newAmount,
            reason: update.reason || 'order_updated',
            userId: authStore.currentUser?.id,
            notes: `Batch sync for order ${orderId}`
          }

          await accountStore.updatePaymentAmount(updateDto)
          successfulUpdates.push(update.paymentId)

          DebugUtils.debug(MODULE_NAME, 'Payment updated in batch', {
            paymentId: update.paymentId,
            newAmount: update.newAmount
          })
        } catch (updateError) {
          failedUpdates.push({
            paymentId: update.paymentId,
            error: updateError
          })
          DebugUtils.error(MODULE_NAME, 'Failed to update payment in batch', {
            paymentId: update.paymentId,
            error: updateError
          })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Batch payment sync completed', {
        orderId,
        totalUpdates: paymentUpdates.length,
        successful: successfulUpdates.length,
        failed: failedUpdates.length,
        blocked: updateCheck.blockedPayments.length
      })

      // Если есть критические ошибки, выбрасываем исключение
      if (failedUpdates.length > 0 && successfulUpdates.length === 0) {
        throw new Error(`All payment updates failed for order ${orderId}`)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Batch payment sync failed', { error, orderId })
      throw error
    }
  }

  // ✅ УПРОСТИТЬ: В новой системе можем всегда обновлять usedAmount
  private async canUpdateBillAmount(paymentId: string): Promise<boolean> {
    // В новой системе всегда можем обновить usedAmount
    return true
  }

  // =============================================
  // ПОЛУЧЕНИЕ ИНФОРМАЦИИ О СЧЕТЕ
  // =============================================

  async getBillInfo(billId: string): Promise<PendingPayment | null> {
    try {
      const accountStore = await this.getAccountStore()
      return await accountStore.getPaymentById(billId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get bill info', { error })
      return null
    }
  }

  async getBillsForOrder(orderId: string): Promise<PendingPayment[]> {
    try {
      const accountStore = await this.getAccountStore()
      // ✅ ИСПРАВЛЕНИЕ: Используем новый метод
      return await accountStore.getPaymentsByOrder(orderId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get bills for order', { error })
      return []
    }
  }

  // =============================================
  // ОТМЕНА СЧЕТА
  // =============================================

  async cancelBillForOrder(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Cancelling bills for order', { orderId })

      const bills = await this.getBillsForOrder(orderId)
      const accountStore = await this.getAccountStore()

      for (const bill of bills) {
        if (bill.status === 'pending') {
          // ✅ НОВОЕ: Отвязываем платеж от заказа вместо полной отмены
          await accountStore.unlinkPaymentFromOrder(bill.id, orderId)
          DebugUtils.info(MODULE_NAME, 'Bill unlinked from order', {
            billId: bill.id,
            orderId
          })

          // Если после отвязки у платежа нет активных связей, отменяем его
          const hasOtherActiveLinks = bill.linkedOrders?.some(
            o => o.orderId !== orderId && o.isActive
          )

          if (!hasOtherActiveLinks) {
            await accountStore.cancelPayment(bill.id)
            DebugUtils.info(MODULE_NAME, 'Bill cancelled (no other active links)', {
              billId: bill.id
            })
          }
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cancel bills for order', { error })
      throw error
    }
  }

  // =============================================
  // ОБРАБОТКА НЕДОПОСТАВОК
  // =============================================

  async handleShortfall(order: PurchaseOrder, actualAmount: number): Promise<void> {
    try {
      if (actualAmount >= order.totalAmount) {
        DebugUtils.info(MODULE_NAME, 'No shortfall detected', {
          orderId: order.id,
          totalAmount: order.totalAmount,
          actualAmount
        })
        return
      }

      const shortfallAmount = order.totalAmount - actualAmount

      DebugUtils.info(MODULE_NAME, 'Handling shortfall', {
        orderId: order.id,
        totalAmount: order.totalAmount,
        actualAmount,
        shortfallAmount
      })

      // В будущих версиях здесь можно создать кредит-ноту
      // Пока просто логируем

      DebugUtils.warn(MODULE_NAME, 'Shortfall detected - manual intervention required', {
        orderId: order.id,
        shortfallAmount
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to handle shortfall', { error })
      throw error
    }
  }

  // =============================================
  // СТАТИСТИКА И АНАЛИТИКА
  // =============================================

  async getOrderPaymentStatus(orderId: string): Promise<{
    hasBills: boolean
    totalBilled: number
    totalPaid: number
    pendingAmount: number
    status: 'not_billed' | 'pending' | 'partial' | 'paid'
  }> {
    try {
      const bills = await this.getBillsForOrder(orderId)

      if (bills.length === 0) {
        return {
          hasBills: false,
          totalBilled: 0,
          totalPaid: 0,
          pendingAmount: 0,
          status: 'not_billed'
        }
      }

      const totalBilled = bills.reduce((sum, bill) => sum + bill.amount, 0)
      const paidBills = bills.filter(bill => bill.status === 'completed')
      const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0)
      const pendingAmount = totalBilled - totalPaid

      let status: 'not_billed' | 'pending' | 'partial' | 'paid'
      if (totalPaid === 0) {
        status = 'pending'
      } else if (totalPaid < totalBilled) {
        status = 'partial'
      } else {
        status = 'paid'
      }

      return {
        hasBills: true,
        totalBilled,
        totalPaid,
        pendingAmount,
        status
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get order payment status', { error })
      return {
        hasBills: false,
        totalBilled: 0,
        totalPaid: 0,
        pendingAmount: 0,
        status: 'not_billed'
      }
    }
  }
}

// Экспортируем singleton instance
export const supplierAccountIntegration = new SupplierAccountIntegration()
