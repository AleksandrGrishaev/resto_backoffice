// src/stores/pos/shifts/shiftsStore.ts - БАЗОВЫЙ SHIFT STORE

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PosShift,
  ShiftStatus,
  CreateShiftDto,
  EndShiftDto,
  UpdateShiftDto,
  ShiftTransaction,
  ShiftCorrection,
  ShiftAccountBalance,
  PaymentMethodSummary,
  ShiftReport,
  ServiceResponse,
  ShiftExpenseOperation,
  CreateDirectExpenseDto,
  ConfirmSupplierPaymentDto,
  RejectSupplierPaymentDto,
  SyncQueueItem,
  CreateLinkedExpenseDto,
  CreateUnlinkedExpenseDto,
  CreateAccountPaymentExpenseDto,
  // Sprint 10: Transfer Operations
  ShiftTransferOperation,
  ConfirmTransferDto,
  RejectTransferDto
} from './types'
import { ShiftsService } from './services'
import { useShiftsComposables } from './composables'
import { useAccountStore, paymentService } from '@/stores/account'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ShiftsStore'

// ✅ Sprint 5: Sync queue localStorage key
const SYNC_QUEUE_KEY = 'pos_sync_queue'
const MAX_SYNC_ATTEMPTS = 10 // Максимальное количество попыток

export const useShiftsStore = defineStore('posShifts', () => {
  // ===== STATE =====
  const shifts = ref<PosShift[]>([])
  const currentShift = ref<PosShift | null>(null)
  const transactions = ref<ShiftTransaction[]>([])
  const loading = ref({
    create: false,
    end: false,
    sync: false,
    list: false
  })
  const error = ref<string | null>(null)

  // ===== SERVICES =====
  const shiftsService = new ShiftsService()
  const accountStore = useAccountStore()

  // ===== COMPUTED =====
  const isShiftActive = computed(() => currentShift.value?.status === 'active')

  const currentShiftTransactions = computed(() =>
    currentShift.value ? transactions.value.filter(t => t.shiftId === currentShift.value!.id) : []
  )

  const pendingSyncTransactions = computed(() =>
    currentShiftTransactions.value.filter(
      t => t.syncStatus === 'pending' || t.syncStatus === 'failed'
    )
  )

  const todayShifts = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return shifts.value.filter(shift => shift.startTime.startsWith(today))
  })

  const shiftStats = computed(() => ({
    total: shifts.value.length,
    active: shifts.value.filter(s => s.status === 'active').length,
    today: todayShifts.value.length,
    pendingSync: shifts.value.filter(s => s.syncStatus === 'pending').length
  }))

  // ===== ACTIONS =====

  /**
   * Get POS cash register account ID from payment methods
   * Returns the account ID of the payment method marked as POS cash register
   */
  async function getPosCashRegisterAccountId(): Promise<string | null> {
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

  /**
   * Загрузить смены
   */
  async function loadShifts(): Promise<ServiceResponse<PosShift[]>> {
    try {
      loading.value.list = true
      error.value = null

      // Инициализировать сервис (загрузит mock данные если нужно)
      const initResult = await shiftsService.initialize()
      if (!initResult.success) {
        throw new Error(initResult.error)
      }

      const result = await shiftsService.loadShifts()

      if (result.success && result.data) {
        shifts.value = result.data

        // Восстановить активную смену если есть
        const activeShift = shifts.value.find(s => s.status === 'active')
        if (activeShift) {
          currentShift.value = activeShift
          // Загрузить транзакции активной смены
          await loadShiftTransactions(activeShift.id)
        }

        console.log(`Loaded ${shifts.value.length} shifts`)
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load shifts'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.list = false
    }
  }

  /**
   * Начать новую смену
   */
  async function startShift(dto: CreateShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      loading.value.create = true
      error.value = null

      // Проверить что нет активной смены
      if (currentShift.value?.status === 'active') {
        throw new Error('Active shift already exists')
      }

      const result = await shiftsService.createShift(dto)

      if (result.success && result.data) {
        const newShift = result.data
        shifts.value.push(newShift)
        currentShift.value = newShift

        // Создать начальные балансы счетов
        await initializeShiftAccountBalances(newShift)

        console.log('✅ Смена начата:', newShift.shiftNumber)
      }

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start shift'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Завершить смену (✅ Sprint 6: Using SyncService)
   * ВАЖНО: Смена ВСЕГДА закрывается локально, даже без интернета
   * Sync в account происходит асинхронно через SyncService
   */
  async function endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      loading.value.end = true
      error.value = null

      if (!currentShift.value) {
        throw new Error('No active shift to end')
      }

      // 1. ВСЕГДА закрываем смену локально (offline-first)
      const result = await shiftsService.endShift(dto)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to close shift locally')
      }

      const closedShift = result.data

      // 2. ✅ Sprint 6: Добавить в SyncService queue
      const { useSyncService } = await import('@/core/sync/SyncService')
      const syncService = useSyncService()

      // ✅ FIX: await addToQueue to avoid race condition
      await syncService.addToQueue({
        entityType: 'shift',
        entityId: closedShift.id,
        operation: 'update',
        priority: 'critical',
        data: closedShift,
        maxAttempts: 10
      })

      // 3. Попытка немедленной синхронизации (не блокируем UI)
      syncService.processQueue().catch(err => {
        console.warn('⚠️ Immediate sync failed, will retry later:', err)
      })

      // 4. ВСЕГДА обновляем store и возвращаем success
      const index = shifts.value.findIndex(s => s.id === closedShift.id)
      if (index !== -1) {
        shifts.value[index] = closedShift
      }

      currentShift.value = null
      console.log('✅ Shift closed locally:', closedShift.shiftNumber)

      return { success: true, data: closedShift }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end shift'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.end = false
    }
  }

  /**
   * Добавить транзакцию в смену
   */
  async function addShiftTransaction(
    orderId: string,
    paymentId: string,
    accountId: string,
    amount: number,
    description: string
  ): Promise<ServiceResponse<ShiftTransaction>> {
    try {
      if (!currentShift.value) {
        throw new Error('No active shift')
      }

      const transaction: ShiftTransaction = {
        id: `shift_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId,
        type: 'income',
        amount,
        description,
        performedBy: {
          type: 'user',
          id: currentShift.value.cashierId,
          name: currentShift.value.cashierName
        },
        shiftId: currentShift.value.id,
        orderId,
        paymentId,
        syncStatus: 'pending',
        syncAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      transactions.value.push(transaction)

      // Обновить статистику смены
      await updateShiftStats()

      console.log('✅ Транзакция добавлена в смену:', transaction.id)

      return { success: true, data: transaction }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add transaction'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Синхронизация с Account Store
   */
  async function syncWithAccountStore(): Promise<ServiceResponse<void>> {
    try {
      loading.value.sync = true
      error.value = null

      const pendingTransactions = pendingSyncTransactions.value

      if (pendingTransactions.length === 0) {
        return { success: true }
      }

      let syncedCount = 0
      let failedCount = 0

      for (const transaction of pendingTransactions) {
        try {
          // Создать операцию в Account Store
          const result = await accountStore.createOperation({
            accountId: transaction.accountId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            performedBy: transaction.performedBy,
            relatedOrderIds: transaction.orderId ? [transaction.orderId] : undefined
          })

          if (result.success) {
            // Обновить статус синхронизации
            transaction.syncStatus = 'synced'
            transaction.lastSyncAttempt = new Date().toISOString()
            syncedCount++
          } else {
            throw new Error(result.error)
          }
        } catch (err) {
          transaction.syncStatus = 'failed'
          transaction.syncAttempts++
          transaction.syncError = err instanceof Error ? err.message : 'Sync failed'
          transaction.lastSyncAttempt = new Date().toISOString()
          failedCount++
        }
      }

      // Обновить статус смены
      if (currentShift.value) {
        const allSynced = currentShiftTransactions.value.every(t => t.syncStatus === 'synced')
        currentShift.value.syncStatus = allSynced ? 'synced' : 'pending'
        currentShift.value.lastSyncAt = new Date().toISOString()
        currentShift.value.pendingSync = !allSynced
      }

      console.log(`✅ Синхронизация завершена: ${syncedCount} успешно, ${failedCount} ошибок`)

      return {
        success: failedCount === 0,
        error: failedCount > 0 ? `${failedCount} transactions failed to sync` : undefined
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.sync = false
    }
  }

  /**
   * Добавить коррекцию
   */
  async function addCorrection(
    type: ShiftCorrection['type'],
    amount: number,
    reason: string,
    description: string
  ): Promise<ServiceResponse<ShiftCorrection>> {
    try {
      if (!currentShift.value) {
        throw new Error('No active shift')
      }

      const correction: ShiftCorrection = {
        id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shiftId: currentShift.value.id,
        type,
        amount,
        reason,
        description,
        performedBy: {
          type: 'user',
          id: currentShift.value.cashierId,
          name: currentShift.value.cashierName
        },
        affectsReporting: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      currentShift.value.corrections.push(correction)

      console.log('✅ Коррекция добавлена:', correction.id)

      return { success: true, data: correction }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add correction'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Получить отчет по смене
   */
  function getShiftReport(shiftId: string): ShiftReport | null {
    const shift = shifts.value.find(s => s.id === shiftId)
    if (!shift) return null

    const shiftTransactions = transactions.value.filter(t => t.shiftId === shiftId)

    return {
      shift,
      summary: {
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: shift.duration,
        totalSales: shift.totalSales,
        totalTransactions: shift.totalTransactions,
        averageTransactionValue:
          shift.totalTransactions > 0 ? shift.totalSales / shift.totalTransactions : 0,
        // ✅ Dynamic sales by payment type (not hardcoded methods)
        cashSales: shift.paymentMethods
          .filter(p => p.methodType === 'cash')
          .reduce((sum, p) => sum + p.amount, 0),
        electronicSales: shift.paymentMethods
          .filter(p => p.methodType === 'bank')
          .reduce((sum, p) => sum + p.amount, 0),
        // Full breakdown by payment method (for detailed reports)
        paymentMethodBreakdown: shift.paymentMethods.map(p => ({
          name: p.methodName,
          type: p.methodType,
          amount: p.amount,
          count: p.count,
          percentage: p.percentage
        })),
        refunds: shift.corrections
          .filter(c => c.type === 'refund')
          .reduce((sum, c) => sum + c.amount, 0),
        voids: shift.corrections
          .filter(c => c.type === 'void')
          .reduce((sum, c) => sum + c.amount, 0),
        netRevenue:
          shift.totalSales -
          shift.corrections.reduce((sum, c) => sum + (c.affectsReporting ? c.amount : 0), 0),
        totalDiscrepancies: shift.corrections.length,
        unexplainedDiscrepancies: shift.corrections.filter(c => !c.reason).length
      },
      corrections: shift.corrections,
      integrationStatus: {
        accountStoreSync: {
          status: shift.syncStatus,
          lastSync: shift.lastSyncAt,
          pendingTransactions: shiftTransactions.filter(t => t.syncStatus === 'pending').length,
          conflicts: 0 // TODO: реализовать подсчет конфликтов
        },
        inventorySync: {
          status: 'synced', // TODO: интеграция с inventory
          pendingUpdates: 0
        },
        overallHealth: shift.syncStatus === 'synced' ? 'healthy' : 'warning'
      }
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Загрузить транзакции смены
   */
  async function loadShiftTransactions(shiftId: string): Promise<void> {
    const result = await shiftsService.loadShiftTransactions(shiftId)
    if (result.success && result.data) {
      transactions.value = result.data
    }
  }

  /**
   * Инициализировать балансы счетов для новой смены
   */
  async function initializeShiftAccountBalances(shift: PosShift): Promise<void> {
    const accounts = accountStore.activeAccounts

    const balances: ShiftAccountBalance[] = accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      startingBalance: account.balance,
      totalIncome: 0,
      totalExpense: 0,
      transactionCount: 0,
      expenseOperations: [], // ✅ Sprint 3: Initialize expense operations array
      discrepancyExplained: true,
      syncStatus: 'synced'
    }))

    shift.accountBalances = balances
  }
  /**
   * Очистить все данные из localStorage
   */
  async function clearAllData(): Promise<ServiceResponse<void>> {
    try {
      const result = await shiftsService.clearAllData()
      if (result.success) {
        // Очистить состояние store
        shifts.value = []
        currentShift.value = null
        transactions.value = []
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear data'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }
  /**
   * Обновить статистику смены
   */
  async function updateShiftStats(): Promise<void> {
    if (!currentShift.value) return

    const shiftTransactions = currentShiftTransactions.value

    // Пересчитать общие суммы
    currentShift.value.totalSales = shiftTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    currentShift.value.totalTransactions = shiftTransactions.length

    // Обновить статус синхронизации
    const allSynced = shiftTransactions.every(t => t.syncStatus === 'synced')
    currentShift.value.syncStatus = allSynced ? 'synced' : 'pending'
    currentShift.value.pendingSync = !allSynced
  }

  // ============ SPRINT 3: EXPENSE OPERATIONS ============

  /**
   * ✅ Sprint 8: Загрузить ожидающие подтверждения платежи
   * Работает даже без активной смены
   */
  async function loadPendingPayments(): Promise<void> {
    try {
      // Получить платежи из Account Store, требующие подтверждения
      // Используем POS cash register account из payment methods
      const posCashAccountId = await getPosCashRegisterAccountId()
      if (!posCashAccountId) {
        console.error('❌ No POS cash register configured')
        return
      }

      // Если есть активная смена - привязываем к ней
      if (currentShift.value) {
        const pendingPayments = await accountStore.getPendingPaymentsForConfirmation(
          currentShift.value.id,
          posCashAccountId
        )

        // Обновить список ожидающих платежей в смене
        currentShift.value.pendingPayments = pendingPayments.map(p => p.id)

        console.log(
          `✅ Loaded ${pendingPayments.length} pending payments for shift ${currentShift.value.shiftNumber} (account: ${posCashAccountId})`
        )
      } else {
        // Если нет смены - просто загружаем pending payments в Account Store
        await accountStore.fetchPayments(true)
        console.log(`✅ Loaded pending payments (no active shift)`)
      }
    } catch (err) {
      console.error('❌ Failed to load pending payments:', err)
    }
  }

  /**
   * Создать прямой расход из кассы
   */
  async function createDirectExpense(
    data: CreateDirectExpenseDto
  ): Promise<ServiceResponse<ShiftExpenseOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.create = true
      error.value = null

      // Создать расходную операцию
      // ✅ Fix: Set linkingStatus for supplier expenses (need to be linked to PO later)
      const isSupplierExpense = data.category === 'supplier'

      const expenseOperation: ShiftExpenseOperation = {
        id: `exp-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'direct_expense',
        amount: data.amount,
        description: data.description,
        category: data.category,
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        invoiceNumber: data.invoiceNumber,
        status: 'completed',
        performedBy: data.performedBy,
        relatedAccountId: data.accountId,
        syncStatus: 'pending',
        notes: data.notes,
        // Only supplier expenses need linking to PO invoices
        linkingStatus: isSupplierExpense ? 'unlinked' : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Добавить в смену
      currentShift.value.expenseOperations.push(expenseOperation)

      // ✅ Supplier expenses: Create transaction IMMEDIATELY (not at shift close)
      // Other expenses: Will be created during shift sync (ShiftSyncAdapter)
      if (isSupplierExpense) {
        try {
          const transaction = await accountStore.createOperation({
            accountId: data.accountId,
            type: 'expense',
            amount: data.amount,
            description: data.description,
            expenseCategory: { type: 'expense', category: 'supplier' },
            performedBy: data.performedBy,
            counteragentId: data.counteragentId,
            counteragentName: data.counteragentName
          })

          // Update expense with transaction reference
          expenseOperation.relatedTransactionId = transaction.id
          expenseOperation.syncStatus = 'synced'
          expenseOperation.lastSyncAt = new Date().toISOString()

          console.log('✅ Supplier expense transaction created:', transaction.id)

          // ❌ REMOVED: PendingPayment creation for direct supplier expenses
          // REASON: Payment is already completed (paid from cash register)
          // Creating a pending payment here causes:
          // 1. Duplicate "unlinked" entries in Payments Management view
          // 2. Confusion: payment is already completed, no need for pending payment
          // The expense and transaction are sufficient records of this payment.
          // If user needs to link this expense to a PO, they can do so via expense linking UI.
        } catch (txError) {
          console.error('❌ Failed to create supplier expense transaction:', txError)
          // Continue - expense is saved, transaction will be created at shift close
        }
      }

      // Обновить баланс в смене
      const accountBalance = currentShift.value.accountBalances.find(
        ab => ab.accountId === data.accountId
      )
      if (accountBalance) {
        accountBalance.totalExpense += data.amount
        accountBalance.expenseOperations.push(expenseOperation)
      }

      // Сохранить смену через service
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log('Direct expense created:', expenseOperation.id)
      return { success: true, data: expenseOperation }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * ✅ Sprint 7: Update payment methods after payment
   * @param paymentMethodType - Payment method type: 'cash' | 'card' | 'qr'
   */
  async function updatePaymentMethods(
    paymentMethodType: string,
    amount: number
  ): Promise<ServiceResponse<void>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      return await shiftsService.updatePaymentMethods(
        currentShift.value.id,
        paymentMethodType,
        amount
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update payment methods'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Подтвердить платеж поставщику
   */
  async function confirmExpense(data: ConfirmSupplierPaymentDto): Promise<ServiceResponse<void>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.sync = true
      error.value = null

      // ⚠️ FIX: Get payment data BEFORE confirmation (status will change to 'completed')
      const payment = accountStore.pendingPayments.find(p => p.id === data.paymentId)
      if (!payment) {
        console.warn(`⚠️ Payment ${data.paymentId} not found in pending payments`)
        return { success: false, error: `Payment ${data.paymentId} not found` }
      }

      // ✅ Sprint 8: Подтвердить платеж в Account Store (создает транзакцию!)
      const transactionId = await accountStore.confirmPayment(
        data.paymentId,
        data.performedBy,
        data.actualAmount
      )

      // Создать запись расходной операции в смене
      if (payment) {
        const expenseOperation: ShiftExpenseOperation = {
          id: `exp-${Date.now()}`,
          shiftId: data.shiftId,
          type: 'supplier_payment',
          amount: data.actualAmount || payment.amount,
          description: payment.description,
          category: payment.category,
          counteragentId: payment.counteragentId,
          counteragentName: payment.counteragentName,
          invoiceNumber: payment.invoiceNumber,
          status: 'confirmed',
          performedBy: data.performedBy,
          confirmedBy: data.performedBy,
          confirmedAt: new Date().toISOString(),
          relatedPaymentId: data.paymentId,
          relatedTransactionId: transactionId, // ✅ Sprint 8: Link to transaction
          relatedAccountId: payment.assignedToAccount!,
          syncStatus: 'synced', // Already synced because transaction created
          lastSyncAt: new Date().toISOString(),
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Добавить в смену
        currentShift.value.expenseOperations.push(expenseOperation)

        // Обновить баланс
        const accountBalance = currentShift.value.accountBalances.find(
          ab => ab.accountId === payment.assignedToAccount
        )
        if (accountBalance) {
          accountBalance.totalExpense += expenseOperation.amount
          accountBalance.expenseOperations.push(expenseOperation)
        }

        // Убрать из списка ожидающих
        currentShift.value.pendingPayments = currentShift.value.pendingPayments.filter(
          id => id !== data.paymentId
        )

        // Сохранить смену
        await shiftsService.updateShift(currentShift.value.id, currentShift.value)

        console.log(
          `✅ Supplier payment confirmed: ${data.paymentId}, transaction: ${transactionId}, expense: ${expenseOperation.id}`
        )
      }

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to confirm expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.sync = false
    }
  }

  /**
   * Отклонить платеж поставщику
   */
  async function rejectExpense(data: RejectSupplierPaymentDto): Promise<ServiceResponse<void>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.sync = true
      error.value = null

      // Отклонить платеж в Account Store
      await accountStore.rejectPayment(data.paymentId, data.performedBy, data.reason)

      // Создать запись об отклонении в смене
      const payment = accountStore.pendingPayments.find(p => p.id === data.paymentId)
      if (payment) {
        const expenseOperation: ShiftExpenseOperation = {
          id: `exp-${Date.now()}`,
          shiftId: data.shiftId,
          type: 'supplier_payment',
          amount: payment.amount,
          description: payment.description,
          category: payment.category,
          counteragentId: payment.counteragentId,
          counteragentName: payment.counteragentName,
          invoiceNumber: payment.invoiceNumber,
          status: 'rejected',
          performedBy: data.performedBy,
          confirmedBy: data.performedBy,
          confirmedAt: new Date().toISOString(),
          rejectionReason: data.reason,
          relatedPaymentId: data.paymentId,
          relatedAccountId: payment.assignedToAccount!,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Добавить в историю операций (для аудита)
        currentShift.value.expenseOperations.push(expenseOperation)

        // Убрать из списка ожидающих
        currentShift.value.pendingPayments = currentShift.value.pendingPayments.filter(
          id => id !== data.paymentId
        )

        // Сохранить смену
        await shiftsService.updateShift(currentShift.value.id, currentShift.value)
      }

      console.log('Expense rejected:', data.paymentId)
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reject expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.sync = false
    }
  }

  // ============ SPRINT 10: INCOMING TRANSFER OPERATIONS ============

  /**
   * Confirm an incoming transfer to cash register
   * Adds the transfer to shift balance
   */
  async function confirmTransfer(
    data: ConfirmTransferDto
  ): Promise<ServiceResponse<ShiftTransferOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.sync = true
      error.value = null

      // Get original transfer from account store
      const originalTransfer = accountStore.getAllTransactions.find(
        t => t.id === data.transactionId
      )
      if (!originalTransfer) {
        return { success: false, error: `Transfer ${data.transactionId} not found` }
      }

      // Get from account name for display
      const fromAccount = accountStore.accounts.find(
        a => a.id === originalTransfer.transferDetails?.fromAccountId
      )
      const fromAccountName = fromAccount?.name || 'Unknown Account'

      // Create transfer operation record
      const transferOperation: ShiftTransferOperation = {
        id: `transfer-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'incoming_transfer',
        transactionId: data.transactionId,
        fromAccountId: originalTransfer.transferDetails?.fromAccountId || '',
        fromAccountName,
        toAccountId: originalTransfer.accountId,
        amount: data.confirmedAmount || originalTransfer.amount,
        description: originalTransfer.description,
        status: 'confirmed',
        confirmedBy: data.performedBy,
        confirmedAt: new Date().toISOString(),
        syncStatus: 'synced',
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Initialize transferOperations array if not exists
      if (!currentShift.value.transferOperations) {
        currentShift.value.transferOperations = []
      }

      // Add to shift
      currentShift.value.transferOperations.push(transferOperation)

      // Save shift
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log(
        `✅ Transfer confirmed: ${data.transactionId}, amount: ${transferOperation.amount}`
      )

      return { success: true, data: transferOperation }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to confirm transfer'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.sync = false
    }
  }

  /**
   * Reject an incoming transfer
   * Creates a reverse transfer to return money to source account
   */
  async function rejectTransfer(
    data: RejectTransferDto
  ): Promise<ServiceResponse<ShiftTransferOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.sync = true
      error.value = null

      // Get original transfer from account store
      const originalTransfer = accountStore.getAllTransactions.find(
        t => t.id === data.transactionId
      )
      if (!originalTransfer) {
        return { success: false, error: `Transfer ${data.transactionId} not found` }
      }

      // Get from account name for display
      const fromAccount = accountStore.accounts.find(
        a => a.id === originalTransfer.transferDetails?.fromAccountId
      )
      const fromAccountName = fromAccount?.name || 'Unknown Account'

      // Create reverse transfer in account store
      // Note: transferBetweenAccounts doesn't return a result, it throws on error
      try {
        await accountStore.transferBetweenAccounts({
          fromAccountId: originalTransfer.accountId, // Cash account (where money is now)
          toAccountId: originalTransfer.transferDetails?.fromAccountId || '', // Return to source
          amount: originalTransfer.amount,
          description: `Reversed: ${originalTransfer.description} (Reason: ${data.reason})`,
          performedBy: data.performedBy
        })
      } catch (transferError) {
        const msg =
          transferError instanceof Error
            ? transferError.message
            : 'Failed to create reverse transfer'
        return { success: false, error: msg }
      }

      // Create rejected transfer operation record
      // Note: We don't have the reverse transaction ID since transferBetweenAccounts doesn't return it
      const transferOperation: ShiftTransferOperation = {
        id: `transfer-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'incoming_transfer',
        transactionId: data.transactionId,
        fromAccountId: originalTransfer.transferDetails?.fromAccountId || '',
        fromAccountName,
        toAccountId: originalTransfer.accountId,
        amount: originalTransfer.amount,
        description: originalTransfer.description,
        status: 'rejected',
        confirmedBy: data.performedBy,
        confirmedAt: new Date().toISOString(),
        rejectionReason: data.reason,
        // reverseTransactionId not available (transferBetweenAccounts doesn't return it)
        syncStatus: 'synced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Initialize transferOperations array if not exists
      if (!currentShift.value.transferOperations) {
        currentShift.value.transferOperations = []
      }

      // Add to shift
      currentShift.value.transferOperations.push(transferOperation)

      // Save shift
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log(
        `❌ Transfer rejected: ${data.transactionId}, reversed to ${originalTransfer.transferDetails?.fromAccountId}`
      )

      return { success: true, data: transferOperation }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reject transfer'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.sync = false
    }
  }

  // ============ SPRINT 6: RECEIPT PAYMENT SCENARIOS ============

  /**
   * Check if there's a pending payment for a specific order
   * Used to determine payment scenario at goods receipt
   */
  function hasPendingPaymentForOrder(orderId: string): boolean {
    if (!currentShift.value) {
      DebugUtils.debug(MODULE_NAME, 'hasPendingPaymentForOrder: No active shift')
      return false
    }

    // Check in pending payments list
    const pendingPayments = accountStore.pendingPayments

    DebugUtils.info(MODULE_NAME, 'Checking pending payments for order', {
      orderId,
      pendingPaymentsCount: pendingPayments.length,
      pendingPaymentIds: pendingPayments.map(p => ({
        id: p.id,
        sourceOrderId: p.sourceOrderId,
        status: p.status
      }))
    })

    const found = pendingPayments.some(p => {
      if (p.status !== 'pending') return false
      // Check sourceOrderId (primary link)
      if (p.sourceOrderId === orderId) return true
      // Check linkedOrders array
      if (p.linkedOrders?.some(lo => lo.orderId === orderId && lo.isActive)) return true
      return false
    })

    DebugUtils.info(MODULE_NAME, 'Pending payment check result', { orderId, found })
    return found
  }

  /**
   * Create linked expense (Scenario A2: Online, no pending payment)
   * Creates expense with direct link to order/invoice
   */
  async function createLinkedExpense(
    data: CreateLinkedExpenseDto
  ): Promise<ServiceResponse<ShiftExpenseOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.create = true
      error.value = null

      // Get POS cash register account
      const posCashAccountId = await getPosCashRegisterAccountId()
      if (!posCashAccountId) {
        return { success: false, error: 'No POS cash register configured' }
      }

      // Use provided accountId or fallback to POS cash register
      const accountId = data.accountId || posCashAccountId

      // Create expense operation with linked order
      const expenseOperation: ShiftExpenseOperation = {
        id: `exp-linked-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'supplier_payment',
        amount: data.amount,
        description: `Payment for order ${data.linkedInvoiceNumber || data.linkedOrderId}`,
        category: 'supplier_payment',
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        invoiceNumber: data.linkedInvoiceNumber,
        status: 'completed',
        performedBy: data.performedBy,
        relatedAccountId: accountId,
        linkedOrderId: data.linkedOrderId,
        linkingStatus: 'linked',
        syncStatus: 'pending',
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to shift
      currentShift.value.expenseOperations.push(expenseOperation)

      // Update account balance in shift
      const accountBalance = currentShift.value.accountBalances.find(
        ab => ab.accountId === accountId
      )
      if (accountBalance) {
        accountBalance.totalExpense += data.amount
        accountBalance.expenseOperations.push(expenseOperation)
      }

      // Save shift
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log(
        `✅ Linked expense created: ${expenseOperation.id} for order ${data.linkedOrderId}`
      )
      return { success: true, data: expenseOperation }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create linked expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Create unlinked expense (Scenario B: Offline mode)
   * Creates expense without order link - to be linked later in backoffice
   */
  async function createUnlinkedExpense(
    data: CreateUnlinkedExpenseDto
  ): Promise<ServiceResponse<ShiftExpenseOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.create = true
      error.value = null

      // Get POS cash register account
      const posCashAccountId = await getPosCashRegisterAccountId()
      if (!posCashAccountId) {
        return { success: false, error: 'No POS cash register configured' }
      }

      // Use provided accountId or fallback to POS cash register
      const accountId = data.accountId || posCashAccountId

      // Create unlinked expense operation
      const expenseOperation: ShiftExpenseOperation = {
        id: `exp-unlinked-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'supplier_payment',
        amount: data.amount,
        description: data.description || `Supplier payment (to be linked)`,
        category: 'supplier_payment',
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        status: 'completed',
        performedBy: data.performedBy,
        relatedAccountId: accountId,
        linkingStatus: 'unlinked', // Key difference - needs to be linked later
        syncStatus: 'pending',
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to shift
      currentShift.value.expenseOperations.push(expenseOperation)

      // Update account balance in shift
      const accountBalance = currentShift.value.accountBalances.find(
        ab => ab.accountId === accountId
      )
      if (accountBalance) {
        accountBalance.totalExpense += data.amount
        accountBalance.expenseOperations.push(expenseOperation)
      }

      // Save shift
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log(
        `✅ Unlinked expense created: ${expenseOperation.id} (to be linked in backoffice)`
      )
      return { success: true, data: expenseOperation }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create unlinked expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Create account payment expense (Scenario: Payment already processed via account store)
   * Records payment in shift for reporting but does NOT create transaction on shift close
   * Used when PO payment is processed directly via PaymentsView/Account Store
   */
  async function createAccountPaymentExpense(
    data: CreateAccountPaymentExpenseDto
  ): Promise<ServiceResponse<ShiftExpenseOperation>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.create = true
      error.value = null

      // Create account payment expense operation
      // This type is NOT synced to account on shift close (already processed)
      const expenseOperation: ShiftExpenseOperation = {
        id: `exp-account-${Date.now()}`,
        shiftId: data.shiftId,
        type: 'account_payment', // Special type: already processed via account
        amount: data.amount,
        description: `Account payment for order ${data.linkedInvoiceNumber || data.linkedOrderId}`,
        category: 'supplier_payment',
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        invoiceNumber: data.linkedInvoiceNumber,
        status: 'completed',
        performedBy: data.performedBy,
        relatedAccountId: data.accountId,
        relatedTransactionId: data.transactionId, // Already created transaction
        relatedPaymentId: data.paymentId,
        linkedOrderId: data.linkedOrderId,
        linkingStatus: 'linked',
        syncStatus: 'synced', // Already synced via account store
        lastSyncAt: new Date().toISOString(),
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to shift
      currentShift.value.expenseOperations.push(expenseOperation)

      // Update account balance in shift (for display only)
      const accountBalance = currentShift.value.accountBalances.find(
        ab => ab.accountId === data.accountId
      )
      if (accountBalance) {
        accountBalance.totalExpense += data.amount
        accountBalance.expenseOperations.push(expenseOperation)
      }

      // Save shift
      await shiftsService.updateShift(currentShift.value.id, currentShift.value)

      console.log(
        `✅ Account payment expense recorded: ${expenseOperation.id} for order ${data.linkedOrderId} (already processed via account)`
      )
      return { success: true, data: expenseOperation }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create account payment expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Get expenses by linking status
   * Used for backoffice payments management view
   */
  function getExpensesByLinkingStatus(
    status: 'linked' | 'unlinked' | 'partially_linked'
  ): ShiftExpenseOperation[] {
    const allExpenses: ShiftExpenseOperation[] = []

    // Collect from all shifts
    for (const shift of shifts.value) {
      const filtered = shift.expenseOperations.filter(exp => exp.linkingStatus === status)
      allExpenses.push(...filtered)
    }

    return allExpenses
  }

  /**
   * Update expense linkingStatus by relatedPaymentId
   * Called when PendingPayment is attached/detached from PO
   */
  async function updateExpenseLinkingStatusByPaymentId(
    paymentId: string,
    status: 'linked' | 'unlinked' | 'partially_linked',
    linkedOrderId?: string
  ): Promise<void> {
    // Find expense with this relatedPaymentId across all shifts
    for (const shift of shifts.value) {
      const expense = shift.expenseOperations.find(exp => exp.relatedPaymentId === paymentId)
      if (expense) {
        expense.linkingStatus = status
        expense.linkedOrderId = linkedOrderId
        expense.updatedAt = new Date().toISOString()

        // Save shift to persist changes
        await shiftsService.updateShift(shift.id, shift)

        DebugUtils.info(MODULE_NAME, 'Updated expense linkingStatus', {
          expenseId: expense.id,
          paymentId,
          newStatus: status,
          linkedOrderId
        })
        return
      }
    }

    // Also check current shift if not in shifts array yet
    if (currentShift.value) {
      const expense = currentShift.value.expenseOperations.find(
        exp => exp.relatedPaymentId === paymentId
      )
      if (expense) {
        expense.linkingStatus = status
        expense.linkedOrderId = linkedOrderId
        expense.updatedAt = new Date().toISOString()

        await shiftsService.updateShift(currentShift.value.id, currentShift.value)

        DebugUtils.info(MODULE_NAME, 'Updated expense linkingStatus in current shift', {
          expenseId: expense.id,
          paymentId,
          newStatus: status
        })
        return
      }
    }

    // This is expected for backoffice payments which don't have a shift expense
    // Only log at debug level to avoid console noise
    DebugUtils.debug(
      MODULE_NAME,
      'Expense not found for paymentId (expected for backoffice payments)',
      {
        paymentId
      }
    )
  }

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
  }

  // ============ SPRINT 4 & 5: SHIFT TO ACCOUNT SYNC ============

  /**
   * Синхронизировать смену с Account Store (acc_1)
   * Создает итоговые транзакции при закрытии смены
   *
   * ✅ Sprint 5: Enhanced with error handling and retry tracking
   */
  async function syncShiftToAccount(shift: PosShift): Promise<ServiceResponse<void>> {
    try {
      if (!shift) {
        return { success: false, error: 'Shift not provided' }
      }

      // Проверить что смена завершена
      if (shift.status !== 'completed') {
        return { success: false, error: 'Shift must be completed before sync' }
      }

      // Проверить что смена еще не синхронизирована
      if (shift.syncedToAccount) {
        console.log(`⚠️ Shift ${shift.shiftNumber} already synced to account`)
        return { success: true }
      }

      // ✅ Sprint 5: Network check (simple)
      if (!navigator.onLine) {
        const error = 'No internet connection'
        updateShiftSyncError(shift, error)
        return { success: false, error }
      }

      // ✅ Get POS cash register account dynamically from payment methods
      const posCashAccountId = await getPosCashRegisterAccountId()
      if (!posCashAccountId) {
        const error = 'No POS cash register configured. Please set up payment methods.'
        updateShiftSyncError(shift, error)
        return { success: false, error }
      }

      const transactionIds: string[] = []

      // ✅ NEW: Get payment methods service to map payment methods to accounts
      const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
      const allPaymentMethods = await paymentMethodService.getAll()

      // 1. Рассчитать возвраты (применяются только к CASH методу)
      const cashRefunds = shift.corrections
        .filter(c => c.type === 'refund')
        .reduce((sum, c) => sum + c.amount, 0)

      // 2. Фильтровать прямые расходы (без supplier payments)
      // ✅ Sprint 4: Skip supplier payment expenses to avoid duplication
      const directExpenses = shift.expenseOperations.filter(
        exp => exp.type === 'direct_expense' && exp.status === 'completed'
      )
      const totalDirectExpenses = directExpenses.reduce((sum, exp) => sum + exp.amount, 0)

      // 3. Рассчитать корректировки (применяются только к CASH методу)
      const totalCorrections = shift.corrections
        .filter(c => c.type === 'cash_adjustment')
        .reduce((sum, c) => sum + c.amount, 0)

      console.log(
        `💰 Shift ${shift.shiftNumber} sync stats:
        - Payment methods: ${shift.paymentMethods.length}
        - Cash refunds: ${cashRefunds}
        - Direct expenses: ${totalDirectExpenses}
        - Corrections: ${totalCorrections}`
      )

      // 4. ✅ NEW: Создать транзакции для ВСЕХ методов оплаты
      for (const pmSummary of shift.paymentMethods) {
        if (pmSummary.amount <= 0) continue // Skip empty payment methods

        // Find payment method configuration
        const paymentMethod = allPaymentMethods.find(pm => pm.id === pmSummary.methodId)
        if (!paymentMethod || !paymentMethod.accountId) {
          console.warn(
            `⚠️ Payment method ${pmSummary.methodName} (${pmSummary.methodId}) has no account mapping, skipping`
          )
          continue
        }

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

      // 5. ✅ Прямые расходы (вычитаются из POS cash register)
      if (totalDirectExpenses > 0) {
        const expenseTransaction = await accountStore.createOperation({
          accountId: posCashAccountId,
          type: 'expense',
          amount: totalDirectExpenses,
          description: `POS Shift ${shift.shiftNumber} - Direct Expenses`,
          expenseCategory: {
            type: 'expense',
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

      // NOTE: Corrections and refunds are already applied to cash income above (line 885)
      // No separate transaction needed

      // 4. Пометить смену как синхронизированную
      shift.syncedToAccount = true
      shift.syncedAt = new Date().toISOString()
      shift.accountTransactionIds = transactionIds
      shift.updatedAt = new Date().toISOString()

      // ✅ Sprint 5: Очистить sync error при успешной синхронизации
      shift.syncError = undefined
      shift.lastSyncAttempt = new Date().toISOString()

      // Сохранить обновленную смену в localStorage
      const storedShifts = localStorage.getItem('pos_shifts')
      const allShifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []
      const shiftIndex = allShifts.findIndex(s => s.id === shift.id)
      if (shiftIndex !== -1) {
        allShifts[shiftIndex] = shift
        localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
      }

      // Обновить в store если это текущая смена
      const storeShiftIndex = shifts.value.findIndex(s => s.id === shift.id)
      if (storeShiftIndex !== -1) {
        shifts.value[storeShiftIndex] = shift
      }

      console.log(
        `✅ Sprint 4+5: Shift ${shift.shiftNumber} synced to account ${posCashAccountId}. Created ${transactionIds.length} transactions.`
      )

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync shift to account'
      console.error(`❌ Failed to sync shift to account:`, errorMsg)

      // ✅ Sprint 5: Track sync error in shift
      updateShiftSyncError(shift, errorMsg)

      return { success: false, error: errorMsg }
    }
  }

  /**
   * ✅ Sprint 5: Update shift with sync error info
   */
  function updateShiftSyncError(shift: PosShift, error: string): void {
    shift.syncError = error
    shift.lastSyncAttempt = new Date().toISOString()
    shift.syncAttempts = (shift.syncAttempts || 0) + 1

    // Сохранить обновленную смену
    const storedShifts = localStorage.getItem('pos_shifts')
    const allShifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []
    const shiftIndex = allShifts.findIndex(s => s.id === shift.id)
    if (shiftIndex !== -1) {
      allShifts[shiftIndex] = shift
      localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
    }
  }

  // ============ SPRINT 5: SYNC QUEUE MANAGEMENT ============

  /**
   * Добавить смену в очередь синхронизации
   */
  async function addToSyncQueue(shiftId: string, errorMsg?: string): Promise<void> {
    try {
      const queue = getSyncQueue()

      // Проверить существует ли уже в очереди
      const existing = queue.find(item => item.shiftId === shiftId)

      if (existing) {
        // Обновить существующую запись
        existing.attempts += 1
        existing.lastAttempt = new Date().toISOString()
        existing.lastError = errorMsg
      } else {
        // Добавить новую запись
        const newItem: SyncQueueItem = {
          shiftId,
          addedAt: new Date().toISOString(),
          attempts: 1,
          lastAttempt: new Date().toISOString(),
          lastError: errorMsg
        }
        queue.push(newItem)
      }

      // Сохранить очередь
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))

      // Обновить shift с информацией об очереди
      const shift = shifts.value.find(s => s.id === shiftId)
      if (shift) {
        shift.syncQueuedAt = new Date().toISOString()
        shift.syncError = errorMsg
      }

      console.log(
        `📤 Shift ${shiftId} added to sync queue (attempt ${existing ? existing.attempts : 1})`
      )
    } catch (err) {
      console.error('❌ Failed to add to sync queue:', err)
    }
  }

  /**
   * Удалить смену из очереди синхронизации
   */
  function removeFromSyncQueue(shiftId: string): void {
    try {
      const queue = getSyncQueue()
      const filtered = queue.filter(item => item.shiftId !== shiftId)

      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))

      // Очистить syncQueuedAt в shift
      const shift = shifts.value.find(s => s.id === shiftId)
      if (shift) {
        shift.syncQueuedAt = undefined
      }

      console.log(`✅ Shift ${shiftId} removed from sync queue`)
    } catch (err) {
      console.error('❌ Failed to remove from sync queue:', err)
    }
  }

  /**
   * Получить текущую очередь синхронизации
   */
  function getSyncQueue(): SyncQueueItem[] {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error('❌ Failed to read sync queue:', err)
      return []
    }
  }

  /**
   * Обработать очередь синхронизации
   * Вызывается при старте приложения или при восстановлении соединения
   */
  async function processSyncQueue(): Promise<ServiceResponse<void>> {
    try {
      const queue = getSyncQueue()

      if (queue.length === 0) {
        console.log('✅ Sync queue is empty')
        return { success: true }
      }

      console.log(`🔄 Processing sync queue: ${queue.length} items`)

      let successCount = 0
      let failedCount = 0
      let skippedCount = 0

      for (const item of queue) {
        // Проверить максимальное количество попыток
        if (item.attempts >= MAX_SYNC_ATTEMPTS) {
          console.warn(
            `⚠️ Shift ${item.shiftId} exceeded max sync attempts (${MAX_SYNC_ATTEMPTS}), skipping`
          )
          skippedCount++
          continue
        }

        // Найти смену
        const shift = shifts.value.find(s => s.id === item.shiftId)
        if (!shift) {
          console.warn(`⚠️ Shift ${item.shiftId} not found, removing from queue`)
          removeFromSyncQueue(item.shiftId)
          skippedCount++
          continue
        }

        // Попытка синхронизации
        const syncResult = await syncShiftToAccount(shift)

        if (syncResult.success) {
          // Успешно - удалить из очереди
          removeFromSyncQueue(item.shiftId)
          successCount++
          console.log(`✅ Shift ${shift.shiftNumber} synced successfully from queue`)
        } else {
          // Неудача - обновить счетчик попыток
          await addToSyncQueue(item.shiftId, syncResult.error)
          failedCount++
          console.warn(`⚠️ Shift ${shift.shiftNumber} sync failed: ${syncResult.error}`)
        }
      }

      console.log(
        `🔄 Sync queue processed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`
      )

      return {
        success: failedCount === 0,
        error: failedCount > 0 ? `${failedCount} shifts failed to sync` : undefined
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process sync queue'
      console.error('❌ Failed to process sync queue:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  // ===== COMPOSABLES =====
  const {
    formatShiftDuration,
    formatShiftNumber,
    canEndShift,
    canStartShift,
    getShiftStatusColor,
    getSyncStatusColor
  } = useShiftsComposables()

  return {
    // State
    shifts,
    currentShift,
    transactions,
    loading,
    error,

    // Computed
    isShiftActive,
    currentShiftTransactions,
    pendingSyncTransactions,
    todayShifts,
    shiftStats,

    // Actions
    loadShifts,
    startShift,
    endShift,
    addShiftTransaction,
    syncWithAccountStore,
    addCorrection,
    getShiftReport,
    clearError,
    clearAllData,

    // Sprint 3: Expense Operations
    loadPendingPayments,
    createDirectExpense,
    confirmExpense,
    rejectExpense,

    // Sprint 10: Transfer Operations
    confirmTransfer,
    rejectTransfer,

    // Sprint 6: Receipt Payment Scenarios
    hasPendingPaymentForOrder,
    createLinkedExpense,
    createUnlinkedExpense,
    createAccountPaymentExpense,
    getExpensesByLinkingStatus,
    updateExpenseLinkingStatusByPaymentId,

    // Sprint 7: Payment Methods Update
    updatePaymentMethods,

    // Sprint 5: Sync Queue
    addToSyncQueue,
    removeFromSyncQueue,
    getSyncQueue,
    processSyncQueue,

    // Composables
    formatShiftDuration,
    formatShiftNumber,
    canEndShift,
    canStartShift,
    getShiftStatusColor,
    getSyncStatusColor
  }
})
