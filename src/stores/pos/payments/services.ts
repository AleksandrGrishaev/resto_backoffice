// src/stores/pos/payments/services.ts
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'
import { TimeUtils } from '@/utils'

/**
 * Payment service - handles storage operations
 * Currently uses localStorage, can be swapped with API/Firebase later
 */
export class PaymentsService {
  private readonly STORAGE_KEY = 'pos_payments'

  /**
   * Get all payments from storage
   */
  async getAllPayments(): Promise<ServiceResponse<PosPayment[]>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const payments = stored ? JSON.parse(stored) : []

      return { success: true, data: payments }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payments'
      }
    }
  }

  /**
   * Save payment to storage
   */
  async savePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      payments.push(payment)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))

      return { success: true, data: payment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save payment'
      }
    }
  }

  /**
   * Update existing payment
   */
  async updatePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      const index = payments.findIndex(p => p.id === payment.id)
      if (index === -1) {
        return { success: false, error: 'Payment not found' }
      }

      payment.updatedAt = TimeUtils.getCurrentLocalISO()
      payments[index] = payment
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))

      return { success: true, data: payment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment'
      }
    }
  }

  /**
   * Process new payment
   */
  async processPayment(paymentData: {
    orderId: string
    billIds: string[]
    itemIds: string[]
    method: PaymentMethod
    amount: number
    receivedAmount?: number
    processedBy: string
  }): Promise<ServiceResponse<PosPayment>> {
    try {
      const paymentNumber = this.generatePaymentNumber()

      const newPayment: PosPayment = {
        id: `payment_${Date.now()}`,
        paymentNumber,
        orderId: paymentData.orderId,
        billIds: paymentData.billIds,
        itemIds: paymentData.itemIds,
        method: paymentData.method,
        status: 'pending',
        amount: paymentData.amount,
        receivedAmount: paymentData.receivedAmount,
        changeAmount: paymentData.receivedAmount
          ? Math.max(0, paymentData.receivedAmount - paymentData.amount)
          : undefined,
        receiptPrinted: false,
        processedBy: paymentData.processedBy,
        processedAt: TimeUtils.getCurrentLocalISO(),
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 500))

      // 95% success rate (simulate failures)
      const isPaymentSuccessful = Math.random() > 0.05

      if (isPaymentSuccessful) {
        newPayment.status = 'completed'
      } else {
        newPayment.status = 'failed'
        return { success: false, error: 'Payment processing failed' }
      }

      // Save payment
      return await this.savePayment(newPayment)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      }
    }
  }

  /**
   * Process refund
   */
  async refundPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      if (!allPayments.success || !allPayments.data) {
        throw new Error('Failed to load payments')
      }

      const originalPayment = allPayments.data.find(p => p.id === paymentId)
      if (!originalPayment) {
        throw new Error('Payment not found')
      }

      if (originalPayment.status !== 'completed') {
        throw new Error('Cannot refund incomplete payment')
      }

      const refundAmount = amount || originalPayment.amount

      // Create refund payment (negative amount)
      const refundPayment: PosPayment = {
        id: `refund_${Date.now()}`,
        paymentNumber: this.generatePaymentNumber(),
        orderId: originalPayment.orderId,
        billIds: originalPayment.billIds,
        itemIds: originalPayment.itemIds,
        method: originalPayment.method,
        status: 'refunded',
        amount: -refundAmount, // Negative!
        processedBy: originalPayment.processedBy,
        processedAt: TimeUtils.getCurrentLocalISO(),
        refundedAt: TimeUtils.getCurrentLocalISO(),
        refundReason: reason,
        originalPaymentId: paymentId,
        receiptPrinted: false,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Save refund
      const result = await this.savePayment(refundPayment)

      if (result.success) {
        // Update original payment status
        originalPayment.status = 'refunded'
        originalPayment.updatedAt = TimeUtils.getCurrentLocalISO()
        await this.updatePayment(originalPayment)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refund payment'
      }
    }
  }

  /**
   * Print receipt
   */
  async printReceipt(payment: PosPayment): Promise<ServiceResponse<void>> {
    try {
      // Simulate printing
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log('🖨️ Printing receipt:', {
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        method: payment.method,
        processedAt: payment.processedAt
      })

      // TODO: Integrate with printer
      // await printerService.printReceipt(payment)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print receipt'
      }
    }
  }

  /**
   * Generate payment number
   */
  private generatePaymentNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.getTime().toString().slice(-6)
    return `PAY-${dateStr}-${timeStr}`
  }
}
