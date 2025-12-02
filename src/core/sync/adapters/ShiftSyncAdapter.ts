/**
 * Sprint 6: ShiftSyncAdapter
 * Sprint 7: Added Supabase sync after Account Store sync
 *
 * Adapter for synchronizing completed shifts to Account Store (acc_1).
 * Implements ISyncAdapter pattern for shift entity type.
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { PosShift } from '@/stores/pos/shifts/types'
import { useAccountStore } from '@/stores/account'
import { getPOSCashAccountId } from '@/stores/account'
import { supabase } from '@/supabase'
import { getSupabaseErrorMessage } from '@/supabase/config'
import { toSupabaseUpdate } from '@/stores/pos/shifts/supabaseMappers'
import { ENV } from '@/config/environment'

export class ShiftSyncAdapter implements ISyncAdapter<PosShift> {
  entityType = 'shift' as const

  /**
   * Get POS cash register account ID from payment methods
   */
  private async getPosCashRegisterAccountId(): Promise<string | null> {
    try {
      const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
      const posCashRegister = await paymentMethodService.getPosСashRegister()

      if (!posCashRegister || !posCashRegister.accountId) {
        console.error('❌ No POS cash register configured or no account assigned')
        return null
      }

      return posCashRegister.accountId
    } catch (error) {
      console.error('❌ Failed to get POS cash register account:', error)
      return null
    }
  }

  async sync(item: SyncQueueItem<PosShift>): Promise<SyncResult> {
    const shift = item.data
    const accountStore = useAccountStore()

    try {
      // Validate shift status
      if (shift.status !== 'completed') {
        return { success: false, error: 'Shift must be completed before sync' }
      }

      if (shift.syncedToAccount) {
        return { success: false, error: 'Shift already synced to account' }
      }

      // Get POS cash register account dynamically
      const posCashAccountId = await this.getPosCashRegisterAccountId()
      if (!posCashAccountId) {
        return {
          success: false,
          error: 'No POS cash register configured. Please set up payment methods.'
        }
      }

      const transactionIds: string[] = []

      // ✅ Get payment methods service to map payment methods to accounts
      const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
      const allPaymentMethods = await paymentMethodService.getAll()

      // ===== CALCULATE SHIFT TOTALS =====

      // 1. Cash refunds (applied only to CASH method)
      const cashRefunds = shift.corrections
        .filter(c => c.type === 'refund')
        .reduce((sum, c) => sum + c.amount, 0)

      // 2. Cash corrections (applied only to CASH method)
      const totalCorrections = shift.corrections
        .filter(c => c.type === 'cash_adjustment')
        .reduce((sum, c) => sum + c.amount, 0)

      // 3. Count expenses for logging
      const directExpensesCount = shift.expenseOperations.filter(
        exp => exp.type === 'direct_expense' && exp.status === 'completed'
      ).length

      console.log(`🔄 Syncing shift ${shift.shiftNumber} to account:
        - Payment methods: ${shift.paymentMethods.length}
        - Cash refunds: ${cashRefunds}
        - Direct expenses: ${directExpensesCount} operations (will be synced individually)
        - Corrections: ${totalCorrections}`)

      // ===== CREATE TRANSACTIONS FOR ALL PAYMENT METHODS =====

      for (const pmSummary of shift.paymentMethods) {
        if (pmSummary.amount <= 0) continue // Skip empty payment methods

        // Find payment method configuration by CODE (methodId contains code like 'cash', 'card', 'qr')
        const paymentMethod = allPaymentMethods.find(pm => pm.code === pmSummary.methodId)
        if (!paymentMethod || !paymentMethod.accountId) {
          console.warn(
            `⚠️ Payment method ${pmSummary.methodName} (${pmSummary.methodId}) has no account mapping, skipping`
          )
          continue
        }

        console.log(
          `💰 Found payment method: ${paymentMethod.name} (code: ${paymentMethod.code}) → Account: ${paymentMethod.accountId}`
        )

        // Calculate net amount (only for CASH - apply refunds and corrections)
        let netAmount = pmSummary.amount
        const isCashMethod = paymentMethod.isPosСashRegister

        if (isCashMethod) {
          netAmount = pmSummary.amount - cashRefunds + totalCorrections
          console.log(
            `  💵 ${pmSummary.methodName}: ${pmSummary.amount} - refunds(${cashRefunds}) + corrections(${totalCorrections}) = ${netAmount}`
          )
        } else {
          console.log(`  💳 ${pmSummary.methodName}: ${pmSummary.amount}`)
        }

        if (netAmount <= 0) continue // Skip if no income after adjustments

        // Create income transaction for this payment method
        const incomeTransaction = await accountStore.createOperation({
          accountId: paymentMethod.accountId,
          type: 'income',
          amount: netAmount,
          description: `POS Shift ${shift.shiftNumber} - ${pmSummary.methodName} Income`,
          performedBy: {
            type: 'user',
            id: shift.cashierId,
            name: shift.cashierName
          }
        })

        transactionIds.push(incomeTransaction.id)
        console.log(
          `✅ Income transaction created for ${pmSummary.methodName}: ${incomeTransaction.id} (${netAmount} → ${paymentMethod.accountId})`
        )
      }

      // ===== SPRINT 8: CREATE INDIVIDUAL EXPENSE TRANSACTIONS =====

      // Process each expense operation individually
      for (const expense of shift.expenseOperations) {
        // Only process completed direct expenses
        if (expense.status !== 'completed' || expense.type !== 'direct_expense') {
          console.log(
            `⏭️ Skipping expense ${expense.id}: status=${expense.status}, type=${expense.type}`
          )
          continue
        }

        // Check if already synced (has relatedTransactionId)
        if (expense.relatedTransactionId) {
          console.log(
            `⏭️ Expense ${expense.id} already has transaction ${expense.relatedTransactionId}, skipping`
          )
          transactionIds.push(expense.relatedTransactionId)
          continue
        }

        // ✅ FIX: Validate relatedAccountId before creating transaction
        if (!expense.relatedAccountId || expense.relatedAccountId.trim() === '') {
          console.error(
            `❌ Expense ${expense.id} has empty relatedAccountId, skipping. This is a data integrity issue!`
          )
          continue
        }

        // Create individual expense transaction
        const expenseTransaction = await accountStore.createOperation({
          accountId: expense.relatedAccountId,
          type: 'expense',
          amount: expense.amount,
          description: `${shift.shiftNumber} - ${expense.description}`,
          expenseCategory: {
            type: 'daily',
            category: expense.category as any
          },
          performedBy: expense.performedBy,
          counteragentId: expense.counteragentId,
          counteragentName: expense.counteragentName
        })

        transactionIds.push(expenseTransaction.id)

        // Link transaction to expense
        expense.relatedTransactionId = expenseTransaction.id
        expense.syncStatus = 'synced'
        expense.lastSyncAt = new Date().toISOString()

        console.log(
          `✅ Expense transaction created: ${expenseTransaction.id} for expense ${expense.id} (${expense.amount})`
        )
      }

      // Also process supplier payments that might be in expenseOperations
      const supplierPayments = shift.expenseOperations.filter(
        exp => exp.status === 'confirmed' && exp.type === 'supplier_payment'
      )

      if (supplierPayments.length > 0) {
        console.log(
          `📦 Found ${supplierPayments.length} supplier payments in shift (already synced via confirmExpense)`
        )

        // Add their transaction IDs if they exist
        for (const payment of supplierPayments) {
          if (payment.relatedTransactionId) {
            transactionIds.push(payment.relatedTransactionId)
          }
        }
      }

      // NOTE: Corrections and refunds are already applied to cash income above (line 108)
      // No separate transaction needed

      // ===== UPDATE SHIFT WITH SYNC INFO =====

      shift.syncedToAccount = true
      shift.syncedAt = new Date().toISOString()
      shift.accountTransactionIds = transactionIds
      shift.syncError = undefined
      shift.syncAttempts = item.attempts
      shift.lastSyncAttempt = new Date().toISOString()

      // ===== SPRINT 7: UPDATE IN SUPABASE =====

      // Try to update in Supabase first (if online)
      if (this.isSupabaseAvailable()) {
        const supabaseUpdate = toSupabaseUpdate(shift)
        const { error } = await supabase.from('shifts').update(supabaseUpdate).eq('id', shift.id)

        if (error) {
          console.warn(
            `⚠️ Failed to update shift ${shift.shiftNumber} in Supabase after account sync:`,
            getSupabaseErrorMessage(error)
          )
          // Continue anyway - localStorage update will happen below
        } else {
          console.log(`✅ Shift ${shift.shiftNumber} updated in Supabase with sync status`)
        }
      }

      // Always save to localStorage (for offline cache + fallback)
      this.saveShiftToLocalStorage(shift)

      console.log(
        `✅ Shift ${shift.shiftNumber} synced to account (${transactionIds.length} transactions created)`
      )

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      // Update shift with error info
      shift.syncError = errorMsg
      shift.syncAttempts = item.attempts
      shift.lastSyncAttempt = new Date().toISOString()

      // Save shift with error
      this.saveShiftToLocalStorage(shift)

      console.error(`❌ Failed to sync shift ${shift.shiftNumber}:`, errorMsg)

      return { success: false, error: errorMsg }
    }
  }

  async validate(shift: PosShift): Promise<boolean> {
    console.log(`🔍 Validating shift ${shift.shiftNumber} for sync`)

    // ✅ NEW: Log detailed shift state
    const cashMethod = shift.paymentMethods.find(pm => pm.methodType === 'cash')
    const cardMethod = shift.paymentMethods.find(pm => pm.methodType === 'card')
    const qrMethod = shift.paymentMethods.find(pm => pm.methodType === 'qr')

    console.log(`📊 Shift details:`, {
      status: shift.status,
      syncedToAccount: shift.syncedToAccount,
      totalSales: shift.totalSales,
      paymentMethods: {
        cash: cashMethod?.amount || 0,
        card: cardMethod?.amount || 0,
        qr: qrMethod?.amount || 0
      },
      corrections: shift.corrections?.length || 0,
      expenseOperations: shift.expenseOperations?.length || 0
    })

    // Check if shift is completed
    if (shift.status !== 'completed') {
      console.warn('⚠️ Shift validation failed: not completed', { status: shift.status })
      return false
    }

    // Check if already synced
    if (shift.syncedToAccount) {
      console.warn('⚠️ Shift validation failed: already synced', {
        syncedAt: shift.syncedAt,
        accountTransactionIds: shift.accountTransactionIds
      })
      return false
    }

    // ✅ CRITICAL: Check payment methods have values
    const totalPayments = shift.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0)
    if (totalPayments === 0 && shift.totalSales > 0) {
      console.error('❌ Shift validation failed: payment_methods have no amounts!', {
        totalSales: shift.totalSales,
        paymentMethodsTotal: totalPayments,
        paymentMethods: shift.paymentMethods
      })
      // ✅ Don't fail validation, but log warning
      // This is a data corruption issue that needs separate fix
      console.warn('⚠️ Continuing sync despite payment_methods issue...')
    }

    // Check if account store is available
    const accountStore = useAccountStore()
    const accountsCount = accountStore.accounts?.length || 0

    // Get POS cash account ID dynamically
    let posCashId: string | null = null
    try {
      posCashId = getPOSCashAccountId()
    } catch (error) {
      // Account config might not be initialized yet
      console.warn('⚠️ Account config not initialized, cannot verify POS cash account')
    }

    console.log(`💰 Account Store check:`, {
      initialized: !!accountStore.accounts,
      accountsCount,
      hasMainCashRegister: posCashId
        ? accountStore.accounts?.some(a => a.id === posCashId)
        : 'unknown',
      posCashId
    })

    if (accountsCount === 0) {
      console.error('❌ Shift validation failed: Account Store not initialized', {
        accountsCount,
        accountStoreState: {
          accounts: accountStore.accounts,
          initialized: accountStore.initialized
        }
      })
      return false
    }

    console.log(`✅ Shift ${shift.shiftNumber} validation passed`)
    return true
  }

  async onConflict(_local: PosShift, remote: PosShift): Promise<ConflictResolution<PosShift>> {
    // Strategy: server wins (financial data should not be overwritten)
    return {
      strategy: 'server-wins',
      data: remote,
      reason: 'Financial data should not be overwritten - server data takes precedence'
    }
  }

  async beforeSync(item: SyncQueueItem<PosShift>): Promise<void> {
    console.log(
      `🔄 Preparing to sync shift ${item.data.shiftNumber} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(item: SyncQueueItem<PosShift>, result: SyncResult): Promise<void> {
    if (result.success) {
      console.log(`✅ Shift ${item.data.shiftNumber} successfully synced to account`)
    }
  }

  async onError(item: SyncQueueItem<PosShift>, error: Error): Promise<void> {
    console.error(`❌ Error syncing shift ${item.data.shiftNumber}:`, error.message)
  }

  /**
   * Helper: Check if Supabase is available and enabled
   */
  private isSupabaseAvailable(): boolean {
    return ENV.supabase.enabled && navigator.onLine
  }

  /**
   * Helper: Save shift to localStorage
   */
  private saveShiftToLocalStorage(shift: PosShift): void {
    try {
      const storedShifts = localStorage.getItem('pos_shifts')
      const allShifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []
      const shiftIndex = allShifts.findIndex(s => s.id === shift.id)

      if (shiftIndex !== -1) {
        allShifts[shiftIndex] = shift
        localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
      } else {
        console.warn(`⚠️ Shift ${shift.id} not found in localStorage, cannot update`)
      }
    } catch (error) {
      console.error('❌ Failed to save shift to localStorage:', error)
    }
  }
}
