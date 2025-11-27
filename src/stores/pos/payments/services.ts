// src/stores/pos/payments/services.ts
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'
import { TimeUtils, generateId, extractErrorDetails } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import { toSupabaseInsert, toSupabaseUpdate, fromSupabase } from './supabaseMappers'
import { executeSupabaseMutation } from '@/utils/supabase'

/**
 * Payment service - handles storage operations
 * Uses dual-write pattern: Supabase (online) + localStorage (offline backup)
 */
export class PaymentsService {
  private readonly STORAGE_KEY = 'pos_payments'

  /**
   * Check if Supabase is available
   */
  private isSupabaseAvailable(): boolean {
    return ENV.useSupabase && !!supabase
  }

  /**
   * Get all payments from storage
   * Tries Supabase first (if online), falls back to localStorage
   */
  async getAllPayments(): Promise<ServiceResponse<PosPayment[]>> {
    try {
      // Try to load from Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          console.log('✅ Loaded payments from Supabase:', data.length)
          return { success: true, data: data.map(fromSupabase) }
        }

        // Log error but continue to localStorage fallback
        if (error) {
          console.warn('⚠️ Supabase load failed, falling back to localStorage:', error.message)
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const payments = stored ? JSON.parse(stored) : []
      console.log('📦 Loaded payments from localStorage:', payments.length)

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
   * Dual-write: Supabase (if online) + localStorage (always)
   */
  async savePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseRow = toSupabaseInsert(payment)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('payments').insert(supabaseRow)
            if (error) throw error
          }, 'PaymentsService.savePayment')
          console.log('✅ Payment saved to Supabase:', payment.paymentNumber)
        } catch (error) {
          console.error('❌ Supabase save failed:', extractErrorDetails(error))
          // Continue to localStorage (offline fallback)
        }
      }

      // Always save to localStorage (backup)
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      payments.push(payment)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))
      console.log('💾 Payment saved to localStorage (backup)')

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
   * Dual-write: Supabase (if online) + localStorage (always)
   */
  async updatePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      payment.updatedAt = TimeUtils.getCurrentLocalISO()

      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseRow = toSupabaseUpdate(payment)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('payments')
              .update(supabaseRow)
              .eq('id', payment.id)
            if (error) throw error
          }, 'PaymentsService.updatePayment')
          console.log('✅ Payment updated in Supabase:', payment.paymentNumber)
        } catch (error) {
          console.error('❌ Supabase update failed:', extractErrorDetails(error))
          // Continue to localStorage (offline fallback)
        }
      }

      // Always update in localStorage (backup)
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      const index = payments.findIndex(p => p.id === payment.id)
      if (index === -1) {
        return { success: false, error: 'Payment not found in localStorage' }
      }

      payments[index] = payment
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))
      console.log('💾 Payment updated in localStorage (backup)')

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
    shiftId?: string // 🆕 Add shiftId parameter
  }): Promise<ServiceResponse<PosPayment>> {
    try {
      const paymentNumber = this.generatePaymentNumber()

      const newPayment: PosPayment = {
        id: generateId(), // UUID for Supabase compatibility
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
        shiftId: paymentData.shiftId, // 🆕 Add shiftId to payment
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
    amount?: number,
    refundedBy?: string
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
        id: generateId(), // UUID for Supabase compatibility
        paymentNumber: this.generatePaymentNumber(),
        orderId: originalPayment.orderId,
        billIds: originalPayment.billIds,
        itemIds: originalPayment.itemIds,
        method: originalPayment.method,
        status: 'refunded',
        amount: -refundAmount, // Negative!
        processedBy: originalPayment.processedBy,
        shiftId: originalPayment.shiftId, // 🆕 Copy shiftId from original payment
        processedAt: TimeUtils.getCurrentLocalISO(),
        refundedAt: TimeUtils.getCurrentLocalISO(),
        refundReason: reason,
        refundedBy: refundedBy || originalPayment.processedBy, // 🆕 Who performed refund
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
