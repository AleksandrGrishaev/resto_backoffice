/**
 * Sprint 6: ShiftSyncAdapter
 *
 * Adapter for synchronizing completed shifts to Account Store (acc_1).
 * Implements ISyncAdapter pattern for shift entity type.
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { PosShift } from '@/stores/pos/shifts/types'
import { useAccountStore } from '@/stores/account'
import { POS_CASH_ACCOUNT_ID } from '@/stores/account/types'

export class ShiftSyncAdapter implements ISyncAdapter<PosShift> {
  entityType = 'shift' as const

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

      const transactionIds: string[] = []

      // ===== CALCULATE SHIFT TOTALS =====

      // 1. Net income from cash payments (cash received - refunds)
      const cashPaymentMethod = shift.paymentMethods.find(pm => pm.methodType === 'cash')
      const cashReceived = cashPaymentMethod?.amount || 0

      const cashRefunds = shift.corrections
        .filter(c => c.type === 'refund')
        .reduce((sum, c) => sum + c.amount, 0)

      const netIncome = cashReceived - cashRefunds

      // 2. Direct expenses (completed only)
      const totalDirectExpenses = shift.expenseOperations
        .filter(exp => exp.type === 'direct_expense' && exp.status === 'completed')
        .reduce((sum, exp) => sum + exp.amount, 0)

      // 3. Cash corrections
      const totalCorrections = shift.corrections
        .filter(c => c.type === 'cash_adjustment')
        .reduce((sum, c) => sum + c.amount, 0)

      console.log(`🔄 Syncing shift ${shift.shiftNumber} to account:
        - Cash received: ${cashReceived}
        - Cash refunds: ${cashRefunds}
        - Net income: ${netIncome}
        - Direct expenses: ${totalDirectExpenses}
        - Corrections: ${totalCorrections}`)

      // ===== CREATE TRANSACTIONS IN acc_1 =====

      // Transaction #1: Net income (if positive)
      if (netIncome > 0) {
        const incomeTransaction = await accountStore.createOperation({
          accountId: POS_CASH_ACCOUNT_ID,
          type: 'income',
          amount: netIncome,
          description: `POS Shift ${shift.shiftNumber} - Net Income`,
          performedBy: {
            type: 'user',
            id: shift.cashierId,
            name: shift.cashierName
          }
        })

        transactionIds.push(incomeTransaction.id)
        console.log(`✅ Income transaction created: ${incomeTransaction.id}`)
      }

      // Transaction #2: Direct expenses (if any)
      if (totalDirectExpenses > 0) {
        const expenseTransaction = await accountStore.createOperation({
          accountId: POS_CASH_ACCOUNT_ID,
          type: 'expense',
          amount: totalDirectExpenses,
          description: `POS Shift ${shift.shiftNumber} - Direct Expenses`,
          expenseCategory: {
            type: 'daily',
            category: 'other'
          },
          performedBy: {
            type: 'user',
            id: shift.cashierId,
            name: shift.cashierName
          }
        })

        transactionIds.push(expenseTransaction.id)
        console.log(`✅ Expense transaction created: ${expenseTransaction.id}`)
      }

      // Transaction #3: Corrections (if non-zero)
      if (totalCorrections !== 0) {
        const correctionTransaction = await accountStore.createOperation({
          accountId: POS_CASH_ACCOUNT_ID,
          type: 'correction',
          amount: Math.abs(totalCorrections),
          description: `POS Shift ${shift.shiftNumber} - Cash Corrections (${totalCorrections > 0 ? 'Overage' : 'Shortage'})`,
          performedBy: {
            type: 'user',
            id: shift.cashierId,
            name: shift.cashierName
          }
        })

        transactionIds.push(correctionTransaction.id)
        console.log(`✅ Correction transaction created: ${correctionTransaction.id}`)
      }

      // ===== UPDATE SHIFT WITH SYNC INFO =====

      shift.syncedToAccount = true
      shift.syncedAt = new Date().toISOString()
      shift.accountTransactionIds = transactionIds
      shift.syncError = undefined
      shift.syncAttempts = item.attempts
      shift.lastSyncAttempt = new Date().toISOString()

      // Save updated shift to localStorage
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
    // Check if shift is completed
    if (shift.status !== 'completed') {
      console.warn('⚠️ Shift validation failed: not completed')
      return false
    }

    // Check if already synced
    if (shift.syncedToAccount) {
      console.warn('⚠️ Shift validation failed: already synced')
      return false
    }

    // Check if account store is available
    const accountStore = useAccountStore()
    if (!accountStore.accounts || accountStore.accounts.length === 0) {
      console.warn('⚠️ Shift validation failed: account store not initialized')
      return false
    }

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
