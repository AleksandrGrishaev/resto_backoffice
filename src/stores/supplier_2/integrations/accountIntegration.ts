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
        purchaseOrderId: order.id,
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

      DebugUtils.info(MODULE_NAME, 'Syncing bill amount', {
        orderId: order.id,
        billId: order.billId,
        newAmount: order.totalAmount
      })

      const canUpdate = await this.canUpdateBillAmount(order.billId)
      if (!canUpdate) {
        DebugUtils.warn(MODULE_NAME, 'Bill amount sync blocked - payment already processed', {
          orderId: order.id,
          billId: order.billId
        })
        return
      }

      const accountStore = await this.getAccountStore()
      const authStore = await this.getAuthStore()

      const updateDto: UpdatePaymentAmountDto = {
        paymentId: order.billId,
        newAmount: order.totalAmount,
        reason: 'order_updated',
        userId: authStore.currentUser?.id,
        notes: `Auto-sync from order ${order.orderNumber}`
      }

      await accountStore.updatePaymentAmount(updateDto)

      DebugUtils.info(MODULE_NAME, 'Bill amount synced successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to sync bill amount', { error })
      throw error
    }
  }

  async canUpdateBillAmount(billId: string): Promise<boolean> {
    try {
      const accountStore = await this.getAccountStore()
      const payment = await accountStore.getPaymentById(billId)

      if (!payment) {
        DebugUtils.warn(MODULE_NAME, 'Payment not found', { billId })
        return false
      }

      // Блокируем автообновление если есть платежи
      const canUpdate = payment.status === 'pending' && payment.autoSyncEnabled !== false

      DebugUtils.info(MODULE_NAME, 'Bill amount update check', {
        billId,
        status: payment.status,
        autoSyncEnabled: payment.autoSyncEnabled,
        canUpdate
      })

      return canUpdate
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to check bill update permissions', { error })
      return false
    }
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
      return await accountStore.getPaymentsByPurchaseOrder(orderId)
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
          await accountStore.cancelPayment(bill.id)
          DebugUtils.info(MODULE_NAME, 'Bill cancelled', { billId: bill.id })
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
