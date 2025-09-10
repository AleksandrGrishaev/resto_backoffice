// src/stores/pos/payments/services.ts
import type { PosPayment, ServiceResponse, PaymentMethod, PaymentStatus } from '../types'
import { TimeUtils } from '@/utils'

export class PaymentsService {
  private readonly STORAGE_KEY = 'pos_payments'

  async getAllPayments(): Promise<ServiceResponse<PosPayment[]>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const payments = stored ? JSON.parse(stored) : []

      await new Promise(resolve => setTimeout(resolve, 100))

      return { success: true, data: payments }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payments'
      }
    }
  }

  async processPayment(paymentData: {
    orderId: string
    billIds: string[]
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

      // Симуляция обработки платежа
      await new Promise(resolve => setTimeout(resolve, 500))

      // Имитация успешного платежа (в реальности здесь будет интеграция с платежными системами)
      const isPaymentSuccessful = Math.random() > 0.05 // 95% успешных платежей

      if (isPaymentSuccessful) {
        newPayment.status = 'completed'
      } else {
        newPayment.status = 'failed'
        return {
          success: false,
          error: 'Payment processing failed'
        }
      }

      // Сохраняем платеж
      const payments = await this.getAllPayments()
      const paymentsList = payments.success && payments.data ? payments.data : []
      paymentsList.push(newPayment)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(paymentsList))

      return { success: true, data: newPayment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      }
    }
  }

  async refundPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    try {
      const payments = await this.getAllPayments()
      if (!payments.success || !payments.data) {
        throw new Error('Failed to load payments')
      }

      const paymentIndex = payments.data.findIndex(p => p.id === paymentId)
      if (paymentIndex === -1) {
        throw new Error('Payment not found')
      }

      const payment = payments.data[paymentIndex]
      if (payment.status !== 'completed') {
        throw new Error('Cannot refund incomplete payment')
      }

      const refundAmount = amount || payment.amount
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount')
      }

      // Симуляция обработки возврата
      await new Promise(resolve => setTimeout(resolve, 300))

      const updatedPayment: PosPayment = {
        ...payment,
        status: 'refunded',
        refundedAt: TimeUtils.getCurrentLocalISO(),
        refundReason: reason,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      payments.data[paymentIndex] = updatedPayment
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments.data))

      return { success: true, data: updatedPayment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refund payment'
      }
    }
  }

  async printReceipt(payment: PosPayment): Promise<ServiceResponse<void>> {
    try {
      // Симуляция печати чека
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log('Printing receipt:', {
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        method: payment.method,
        processedAt: payment.processedAt
      })

      // В реальности здесь будет интеграция с принтером
      // await printerService.printReceipt(payment)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print receipt'
      }
    }
  }

  private generatePaymentNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.getTime().toString().slice(-6)
    return `PAY-${dateStr}-${timeStr}`
  }
}
