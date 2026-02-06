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
import { calculateTaxBreakdown } from '../helpers/taxCalculationHelper'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

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

      // ===== CHECK FOR EXISTING TRANSACTIONS (idempotency) =====
      // If sync was interrupted mid-way (app backgrounded), some transactions may already exist.
      // Use shift.id (unique per shift) instead of shiftNumber (can be shared between shifts).
      let existingDescriptions: Set<string> = new Set()

      try {
        const { data: existingTxns } = await supabase
          .from('transactions')
          .select('description')
          .eq('related_payment_id', shift.id)

        if (existingTxns) {
          existingDescriptions = new Set(existingTxns.map(t => t.description))
          if (existingDescriptions.size > 0) {
            console.warn(
              `⚠️ Found ${existingDescriptions.size} existing transactions for shift ${shift.id} (partial sync recovery)`
            )
          }
        }
      } catch {
        console.warn('⚠️ Could not check for existing transactions, proceeding with creation')
      }

      // ===== LOAD SALES TRANSACTIONS FOR CHANNEL-AWARE TAX CALCULATION =====
      let shiftSalesTxs: any[] = []
      try {
        const { useSalesStore } = await import('@/stores/sales')
        const salesStore = useSalesStore()
        shiftSalesTxs = salesStore.transactions.filter((tx: any) => tx.shiftId === shift.id)
        if (shiftSalesTxs.length > 0) {
          console.log(
            `📊 Found ${shiftSalesTxs.length} sales transactions for shift ${shift.shiftNumber} (channel-aware taxes)`
          )
        }
      } catch {
        console.warn('⚠️ Could not load sales transactions, will use global tax rates')
      }

      // ===== PRE-LOAD CHANNEL DATA FOR COMMISSION CALCULATION =====
      let orderChannelMap = new Map<string, string>()
      let channelCommissions = new Map<
        string,
        { channelName: string; channelCode: string; commissionPercent: number }
      >()

      if (shiftSalesTxs.length > 0) {
        // Collect unique order IDs from sales transactions
        const uniqueOrderIds = [...new Set(shiftSalesTxs.map((tx: any) => tx.orderId))]
        orderChannelMap = await this.loadOrderChannelMap(uniqueOrderIds)

        // Load commission rates for channels that appear
        const uniqueChannelIds = [...new Set(orderChannelMap.values())]
        channelCommissions = await this.loadChannelCommissions(uniqueChannelIds)

        if (channelCommissions.size > 0) {
          console.log(
            `📊 Channels with commissions: ${[...channelCommissions.entries()].map(([, v]) => `${v.channelName} (${v.commissionPercent}%)`).join(', ')}`
          )
        }
      }

      // ===== CREATE TRANSACTIONS FOR ALL PAYMENT METHODS =====

      for (const pmSummary of shift.paymentMethods) {
        if (pmSummary.amount <= 0) continue // Skip empty payment methods

        // Find payment method configuration by ID (methodId contains UUID like 'pm_xxx')
        const paymentMethod = allPaymentMethods.find(pm => pm.id === pmSummary.methodId)
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

        // ===== SPRINT 9: TAX BREAKDOWN (channel-aware from SalesTransactions) =====
        // Get tax names from configured taxes
        let serviceTaxName = 'Service Tax'
        let localTaxName = 'Local Tax'
        let serviceTaxRate = 0.05
        let localTaxRate = 0.1

        try {
          const pmStore = usePaymentSettingsStore()
          const activeTaxes = pmStore.activeTaxes
          if (activeTaxes.length >= 1) {
            serviceTaxName = activeTaxes[0].name
            serviceTaxRate = activeTaxes[0].percentage / 100
          }
          if (activeTaxes.length >= 2) {
            localTaxName = activeTaxes[1].name
            localTaxRate = activeTaxes[1].percentage / 100
          }
        } catch {
          // Use defaults if store unavailable
        }

        // Try to use pre-calculated per-order taxes from SalesTransactions (channel-aware)
        let taxBreakdown: { pureRevenue: number; serviceTaxAmount: number; localTaxAmount: number }

        // Match by PM code (e.g. 'cash', 'gopay', 'bni') — SalesTransaction.paymentMethod stores code
        const methodCode = paymentMethod.code
        const methodTxs = shiftSalesTxs.filter((tx: any) => tx.paymentMethod === methodCode)

        if (methodTxs.length > 0) {
          // Use actual per-order taxes (already channel-aware from salesStore)
          const aggServiceTax = methodTxs.reduce(
            (sum: number, tx: any) => sum + (tx.serviceTaxAmount || 0),
            0
          )
          const aggGovTax = methodTxs.reduce(
            (sum: number, tx: any) => sum + (tx.governmentTaxAmount || 0),
            0
          )
          taxBreakdown = {
            pureRevenue: Math.round(netAmount - aggServiceTax - aggGovTax),
            serviceTaxAmount: aggServiceTax,
            localTaxAmount: aggGovTax
          }
          console.log(
            `  📊 Channel-aware taxes from ${methodTxs.length} transactions for ${pmSummary.methodName}: revenue=${taxBreakdown.pureRevenue}, ${serviceTaxName}=${taxBreakdown.serviceTaxAmount}, ${localTaxName}=${taxBreakdown.localTaxAmount}`
          )
        } else {
          // Fallback: use global tax rates (reverse calc from total)
          taxBreakdown = calculateTaxBreakdown(netAmount, { serviceTaxRate, localTaxRate })
          console.log(
            `  📊 Fallback tax breakdown for ${pmSummary.methodName}: revenue=${taxBreakdown.pureRevenue}, ${serviceTaxName}=${taxBreakdown.serviceTaxAmount}, ${localTaxName}=${taxBreakdown.localTaxAmount}`
          )
        }

        // 1. Create REVENUE transaction (pure sales without taxes)
        const revenueDesc = `POS Shift ${shift.shiftNumber} - ${pmSummary.methodName} Revenue`
        if (existingDescriptions.has(revenueDesc)) {
          console.log(
            `  ⏭️ Revenue already exists for ${pmSummary.methodName}, skipping (partial sync recovery)`
          )
        } else {
          const revenueTransaction = await accountStore.createOperation({
            accountId: paymentMethod.accountId,
            type: 'income',
            amount: taxBreakdown.pureRevenue,
            description: revenueDesc,
            expenseCategory: {
              type: 'income',
              category: 'sales'
            },
            performedBy: {
              type: 'user',
              id: shift.cashierId,
              name: shift.cashierName
            },
            relatedPaymentId: shift.id
          })
          transactionIds.push(revenueTransaction.id)
          console.log(
            `✅ Revenue transaction created: ${revenueTransaction.id} (${taxBreakdown.pureRevenue} → sales)`
          )
        }

        // 2. Create SERVICE TAX transaction
        const serviceTaxDesc = `POS Shift ${shift.shiftNumber} - ${pmSummary.methodName} ${serviceTaxName} (${Math.round(serviceTaxRate * 100)}%)`
        if (taxBreakdown.serviceTaxAmount > 0) {
          if (existingDescriptions.has(serviceTaxDesc)) {
            console.log(`  ⏭️ Service tax already exists for ${pmSummary.methodName}, skipping`)
          } else {
            const serviceTaxTransaction = await accountStore.createOperation({
              accountId: paymentMethod.accountId,
              type: 'income',
              amount: taxBreakdown.serviceTaxAmount,
              description: serviceTaxDesc,
              expenseCategory: {
                type: 'income',
                category: 'service_tax'
              },
              performedBy: {
                type: 'user',
                id: shift.cashierId,
                name: shift.cashierName
              },
              relatedPaymentId: shift.id
            })
            transactionIds.push(serviceTaxTransaction.id)
            console.log(
              `✅ Service tax transaction created: ${serviceTaxTransaction.id} (${taxBreakdown.serviceTaxAmount} → service_tax)`
            )
          }
        }

        // 3. Create LOCAL TAX transaction
        const localTaxDesc = `POS Shift ${shift.shiftNumber} - ${pmSummary.methodName} ${localTaxName} (${Math.round(localTaxRate * 100)}%)`
        if (taxBreakdown.localTaxAmount > 0) {
          if (existingDescriptions.has(localTaxDesc)) {
            console.log(`  ⏭️ Local tax already exists for ${pmSummary.methodName}, skipping`)
          } else {
            const localTaxTransaction = await accountStore.createOperation({
              accountId: paymentMethod.accountId,
              type: 'income',
              amount: taxBreakdown.localTaxAmount,
              description: localTaxDesc,
              expenseCategory: {
                type: 'income',
                category: 'local_tax'
              },
              performedBy: {
                type: 'user',
                id: shift.cashierId,
                name: shift.cashierName
              },
              relatedPaymentId: shift.id
            })
            transactionIds.push(localTaxTransaction.id)
            console.log(
              `✅ Local tax transaction created: ${localTaxTransaction.id} (${taxBreakdown.localTaxAmount} → local_tax)`
            )
          }
        }

        // 4. Create PLATFORM COMMISSION expense transactions (per channel)
        if (methodTxs.length > 0 && channelCommissions.size > 0) {
          // Group sales transactions by channel
          const txsByChannel = new Map<string, any[]>()
          for (const tx of methodTxs) {
            const channelId = orderChannelMap.get(tx.orderId)
            if (channelId && channelCommissions.has(channelId)) {
              const arr = txsByChannel.get(channelId) || []
              arr.push(tx)
              txsByChannel.set(channelId, arr)
            }
          }

          // Channel code → commission category mapping
          const COMMISSION_CATEGORY: Record<string, string> = {
            gobiz: 'gojek_commission',
            grab: 'grab_commission'
          }

          for (const [channelId, channelTxs] of txsByChannel) {
            const channelInfo = channelCommissions.get(channelId)!
            // Commission base = full customer-paid amount (revenue + taxes)
            const commissionBase = channelTxs.reduce(
              (sum: number, tx: any) =>
                sum + (tx.profitCalculation.finalRevenue + (tx.totalTaxAmount || 0)),
              0
            )
            const commissionAmount = Math.round(
              (commissionBase * channelInfo.commissionPercent) / 100
            )

            if (commissionAmount <= 0) continue

            // Use channel-specific category or fallback to generic
            const categoryCode =
              COMMISSION_CATEGORY[channelInfo.channelCode] || 'platform_commission'

            const commissionDesc = `POS Shift ${shift.shiftNumber} - ${channelInfo.channelName} Commission (${channelInfo.commissionPercent}%)`
            if (existingDescriptions.has(commissionDesc)) {
              console.log(`  ⏭️ Commission already exists for ${channelInfo.channelName}, skipping`)
            } else {
              const commissionTransaction = await accountStore.createOperation({
                accountId: paymentMethod.accountId,
                type: 'expense',
                amount: commissionAmount,
                description: commissionDesc,
                expenseCategory: {
                  type: 'expense',
                  category: categoryCode
                },
                performedBy: {
                  type: 'user',
                  id: shift.cashierId,
                  name: shift.cashierName
                },
                relatedPaymentId: shift.id
              })
              transactionIds.push(commissionTransaction.id)
              console.log(
                `✅ Commission expense created: ${commissionTransaction.id} (${commissionAmount} → ${channelInfo.channelName} ${channelInfo.commissionPercent}%)`
              )
            }
          }
        }
      }

      // ===== SPRINT 8: CREATE INDIVIDUAL EXPENSE TRANSACTIONS =====

      // Process each expense operation individually
      for (const expense of shift.expenseOperations) {
        // Only process completed direct expenses
        // Skip account_payment - already processed via account store directly
        if (expense.status !== 'completed' || expense.type !== 'direct_expense') {
          if (expense.type === 'account_payment') {
            console.log(
              `⏭️ Skipping account_payment ${expense.id}: already processed via account store`
            )
          } else {
            console.log(
              `⏭️ Skipping expense ${expense.id}: status=${expense.status}, type=${expense.type}`
            )
          }
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
            type: 'expense',
            category: expense.category
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
        exp =>
          (exp.status === 'confirmed' || exp.status === 'completed') &&
          exp.type === 'supplier_payment'
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

      // Account payments - already processed via account store, just log for audit
      const accountPayments = shift.expenseOperations.filter(
        exp => exp.status === 'completed' && exp.type === 'account_payment'
      )

      if (accountPayments.length > 0) {
        console.log(
          `💳 Found ${accountPayments.length} account payments in shift (already synced via account store)`
        )
        const totalAccountPayments = accountPayments.reduce((sum, p) => sum + p.amount, 0)
        console.log(`   Total account payments: ${totalAccountPayments}`)

        // Add their transaction IDs if they exist
        for (const payment of accountPayments) {
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
      shift.syncStatus = 'synced'
      shift.pendingSync = false

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
   * Load order → channel_id mapping for given order IDs
   */
  private async loadOrderChannelMap(orderIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (orderIds.length === 0) return map

    try {
      const { data } = await supabase.from('orders').select('id, channel_id').in('id', orderIds)

      if (data) {
        for (const row of data) {
          if (row.channel_id) {
            map.set(row.id, row.channel_id)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load order channel map:', error)
    }
    return map
  }

  /**
   * Load channel commission rates (only channels with commission > 0)
   */
  private async loadChannelCommissions(
    channelIds: string[]
  ): Promise<Map<string, { channelName: string; channelCode: string; commissionPercent: number }>> {
    const map = new Map<
      string,
      { channelName: string; channelCode: string; commissionPercent: number }
    >()
    if (channelIds.length === 0) return map

    try {
      const { data } = await supabase
        .from('sales_channels')
        .select('id, code, name, commission_percent')
        .in('id', channelIds)
        .gt('commission_percent', 0)

      if (data) {
        for (const row of data) {
          map.set(row.id, {
            channelName: row.name,
            channelCode: (row as any).code || '',
            commissionPercent: Number(row.commission_percent)
          })
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load channel commissions:', error)
    }
    return map
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
