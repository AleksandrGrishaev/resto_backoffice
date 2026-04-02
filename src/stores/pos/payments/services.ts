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
   * Get payments from storage (with smart filtering)
   * Sprint 8: Only loads today's payments + current shift by default
   * @param options.shiftId - фильтр по ID смены
   * @param options.all - загрузить ВСЕ платежи (для отчётов)
   */
  async getAllPayments(options?: {
    shiftId?: string
    all?: boolean
  }): Promise<ServiceResponse<PosPayment[]>> {
    try {
      // Try to load from Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        let query = supabase.from('payments').select('*')

        // ✅ Sprint 8: Smart filtering для POS
        if (!options?.all) {
          if (options?.shiftId) {
            // Если передан shiftId — загружаем только платежи этой смены
            query = query.eq('shift_id', options.shiftId)
          } else {
            // По умолчанию: только сегодняшние платежи
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            query = query.gte('created_at', today.toISOString())
          }
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(options?.all ? 1000 : 200)

        if (!error && data) {
          const filterType = options?.all
            ? 'all'
            : options?.shiftId
              ? `shift:${options.shiftId}`
              : 'today'
          console.log('✅ Loaded payments from Supabase:', data.length, `(${filterType})`)

          // Cache in localStorage (only for non-filtered requests)
          if (!options?.shiftId) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.map(fromSupabase)))
          }

          return { success: true, data: data.map(fromSupabase) }
        }

        // Log error but continue to localStorage fallback
        if (error) {
          console.warn('⚠️ Supabase load failed, falling back to localStorage:', error.message)
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.STORAGE_KEY)
      let payments: PosPayment[] = stored ? JSON.parse(stored) : []

      // Apply filtering to cached data too
      if (!options?.all && options?.shiftId) {
        payments = payments.filter(p => p.shiftId === options.shiftId)
      }

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
   * ✅ Sprint 8: Lazy load платежей за период (для отчётов)
   */
  async getPaymentsForDateRange(
    startDate: string,
    endDate: string
  ): Promise<ServiceResponse<PosPayment[]>> {
    try {
      if (!this.isSupabaseAvailable()) {
        return { success: false, error: 'Supabase not available' }
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      console.log('✅ Loaded payments for date range:', data?.length || 0)
      return { success: true, data: (data || []).map(fromSupabase) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payments for date range'
      }
    }
  }

  /**
   * Save payment to storage
   * Dual-write: Supabase (if online) + localStorage (always)
   *
   * ✅ FIX: Uses UPSERT instead of INSERT to handle idempotency
   * This prevents duplicate payments when timeout causes retry
   */
  async savePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      // Try Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseRow = toSupabaseInsert(payment)

        try {
          await executeSupabaseMutation(
            async () => {
              // ✅ FIX: Use UPSERT instead of INSERT for idempotency
              // If payment with same ID already exists (from previous timeout), update it
              // This prevents duplicate key violations (error code 23505)
              const { error } = await supabase.from('payments').upsert(supabaseRow, {
                onConflict: 'id', // If ID exists, update
                ignoreDuplicates: false // Allow updates on conflict
              })

              if (error) {
                // Log but don't throw on duplicate - it means payment was already saved
                if (error.code === '23505') {
                  console.warn('⚠️ Payment already exists (duplicate from retry), skipping', {
                    paymentId: payment.id,
                    paymentNumber: payment.paymentNumber
                  })
                  return // Success - payment is already in database
                }
                throw error
              }
            },
            'PaymentsService.savePayment',
            {
              maxRetries: 2, // Reduce retries for mutations to prevent duplicates
              timeout: 10000 // Reduce timeout to 10s for faster failure detection
            }
          )
          console.log('✅ Payment saved to Supabase:', payment.paymentNumber)
        } catch (error) {
          console.error('❌ Supabase save failed:', extractErrorDetails(error))
          // Continue to localStorage (offline fallback)
        }
      }

      // ✅ EGRESS FIX: Update localStorage directly without full reload
      // Previously: getAllPayments() loaded today's payments from Supabase
      // Now: Read existing cache, add new payment, save back
      const cachedData = localStorage.getItem(this.STORAGE_KEY)
      const payments: PosPayment[] = cachedData ? JSON.parse(cachedData) : []
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

      // ✅ EGRESS FIX: Update localStorage directly without full reload
      const cachedData = localStorage.getItem(this.STORAGE_KEY)
      const payments: PosPayment[] = cachedData ? JSON.parse(cachedData) : []

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
    order?: any // ✅ SPRINT 8: Pass order for tax calculations
    customerId?: string
    customerName?: string
  }): Promise<ServiceResponse<PosPayment>> {
    try {
      const paymentNumber = this.generatePaymentNumber()

      // ✅ SPRINT 8: Calculate payment details with tax breakdown
      let details: Record<string, any> = {}

      if (paymentData.order && paymentData.order.revenueBreakdown) {
        const rb = paymentData.order.revenueBreakdown
        details = {
          subtotal: rb.plannedRevenue,
          itemDiscounts: rb.itemDiscounts,
          billDiscount: rb.billDiscounts,
          subtotalAfterDiscounts: rb.actualRevenue,
          taxes: rb.taxes || [], // Array of {taxId, name, percentage, amount}
          totalTaxes: rb.totalTaxes,
          totalAmount: paymentData.amount
        }
      }

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
        customerId: paymentData.customerId,
        customerName: paymentData.customerName,
        details, // ✅ SPRINT 8: Add tax breakdown details
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
        customerId: originalPayment.customerId,
        customerName: originalPayment.customerName,
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
   * Delete payment (for rollback on error)
   * Used when payment was created but subsequent operations failed
   */
  async deletePayment(paymentId: string): Promise<ServiceResponse<void>> {
    try {
      // Delete from Supabase
      if (this.isSupabaseAvailable()) {
        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('payments').delete().eq('id', paymentId)
            if (error) throw error
          }, 'PaymentsService.deletePayment')
          console.log('✅ Payment deleted from Supabase:', paymentId)
        } catch (error) {
          console.error('❌ Supabase delete failed:', extractErrorDetails(error))
          throw error // Re-throw - this is critical for rollback
        }
      }

      // Delete from localStorage
      const cachedData = localStorage.getItem(this.STORAGE_KEY)
      if (cachedData) {
        const payments: PosPayment[] = JSON.parse(cachedData)
        const filtered = payments.filter(p => p.id !== paymentId)
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
        console.log('💾 Payment deleted from localStorage')
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment'
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
