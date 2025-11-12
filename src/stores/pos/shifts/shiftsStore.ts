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
  SyncStatus,
  ServiceResponse,
  ShiftExpenseOperation,
  CreateDirectExpenseDto,
  ConfirmSupplierPaymentDto,
  RejectSupplierPaymentDto,
  SyncQueueItem
} from './types'
import { ShiftsService } from './services'
import { useShiftsComposables } from './composables'
import { useAccountStore } from '@/stores/account'

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
   * Завершить смену (✅ Sprint 5: Offline-capable)
   * ВАЖНО: Смена ВСЕГДА закрывается локально, даже без интернета
   * Sync в account происходит асинхронно и не блокирует закрытие
   */
  async function endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      loading.value.end = true
      error.value = null

      if (!currentShift.value) {
        throw new Error('No active shift to end')
      }

      // ✅ Sprint 5: Удалена проверка pending sync - смена закрывается всегда
      // const hasPendingSync = pendingSyncTransactions.value.length > 0
      // if (hasPendingSync) {
      //   throw new Error('Cannot end shift with pending sync transactions')
      // }

      // 1. ВСЕГДА закрываем смену локально (offline-first)
      const result = await shiftsService.endShift(dto)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to close shift locally')
      }

      const closedShift = result.data

      // 2. ПЫТАЕМСЯ синхронизировать с Account Store (но не блокируем)
      const syncResult = await syncShiftToAccount(closedShift)

      if (!syncResult.success) {
        // ⚠️ Sync failed - добавляем в очередь для retry
        console.warn(
          `⚠️ Failed to sync shift ${closedShift.shiftNumber} to account: ${syncResult.error}`
        )
        await addToSyncQueue(closedShift.id, syncResult.error)
      } else {
        console.log(`✅ Shift ${closedShift.shiftNumber} synced to account immediately`)
      }

      // 3. ВСЕГДА обновляем store и возвращаем success
      const index = shifts.value.findIndex(s => s.id === closedShift.id)
      if (index !== -1) {
        shifts.value[index] = closedShift
      }

      currentShift.value = null
      console.log('✅ Смена закрыта локально:', closedShift.shiftNumber)

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
        cashSales: shift.paymentMethods.find(p => p.methodType === 'cash')?.amount || 0,
        cardSales: shift.paymentMethods.find(p => p.methodType === 'card')?.amount || 0,
        digitalSales: shift.paymentMethods
          .filter(p => ['gojek', 'grab', 'qr'].includes(p.methodType))
          .reduce((sum, p) => sum + p.amount, 0),
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
      discrepancyExplained: true,
      syncStatus: 'synced'
    }))

    shift.accountBalances = balances
  }
  /**
   * Загрузить mock данные (для тестирования)
   */
  async function loadMockData(): Promise<ServiceResponse<void>> {
    try {
      const result = await shiftsService.loadMockData()
      if (result.success) {
        // Перезагрузить смены после загрузки mock данных
        await loadShifts()
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load mock data'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Очистить все данные (для тестирования)
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
   * Загрузить ожидающие подтверждения платежи для текущей смены
   */
  async function loadPendingPayments(): Promise<void> {
    if (!currentShift.value) {
      console.warn('No active shift to load pending payments')
      return
    }

    try {
      // Получить платежи из Account Store, требующие подтверждения
      // Используем POS_CASH_ACCOUNT_ID - ID основной кассы POS системы
      const { POS_CASH_ACCOUNT_ID } = await import('@/stores/account/types')

      const pendingPayments = await accountStore.getPendingPaymentsForConfirmation(
        currentShift.value.id,
        POS_CASH_ACCOUNT_ID
      )

      // Обновить список ожидающих платежей в смене
      currentShift.value.pendingPayments = pendingPayments.map(p => p.id)

      console.log(
        `✅ Loaded ${pendingPayments.length} pending payments for shift ${currentShift.value.shiftNumber} (account: ${POS_CASH_ACCOUNT_ID})`
      )
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Добавить в смену
      currentShift.value.expenseOperations.push(expenseOperation)

      // Создать транзакцию в Account Store
      await accountStore.createOperation({
        accountId: data.accountId,
        type: 'expense',
        amount: data.amount,
        description: data.description,
        expenseCategory: {
          type: 'daily',
          category: data.category as any
        },
        performedBy: data.performedBy,
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName
      })

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
   * Подтвердить платеж поставщику
   */
  async function confirmExpense(data: ConfirmSupplierPaymentDto): Promise<ServiceResponse<void>> {
    try {
      if (!currentShift.value) {
        return { success: false, error: 'No active shift' }
      }

      loading.value.sync = true
      error.value = null

      // Подтвердить платеж в Account Store
      await accountStore.confirmPayment(data.paymentId, data.performedBy, data.actualAmount)

      // Создать запись расходной операции в смене
      const payment = accountStore.pendingPayments.find(p => p.id === data.paymentId)
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
          relatedAccountId: payment.assignedToAccount!,
          syncStatus: 'synced',
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
      }

      console.log('Expense confirmed:', data.paymentId)
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

      const { POS_CASH_ACCOUNT_ID } = await import('@/stores/account/types')
      const transactionIds: string[] = []

      // 1. Рассчитать итоговую статистику смены
      const cashPaymentMethod = shift.paymentMethods.find(pm => pm.methodType === 'cash')
      const cashReceived = cashPaymentMethod?.amount || 0

      // Рассчитать возвраты
      const cashRefunds = shift.corrections
        .filter(c => c.type === 'refund')
        .reduce((sum, c) => sum + c.amount, 0)

      // 2. Фильтровать прямые расходы (без supplier payments)
      // ✅ Sprint 4: Skip supplier payment expenses to avoid duplication
      const directExpenses = shift.expenseOperations.filter(
        exp => exp.type === 'direct_expense' && exp.status === 'completed'
      )
      const totalDirectExpenses = directExpenses.reduce((sum, exp) => sum + exp.amount, 0)

      // Рассчитать корректировки
      const totalCorrections = shift.corrections
        .filter(c => c.type === 'cash_adjustment')
        .reduce((sum, c) => sum + c.amount, 0)

      // Чистый доход (cash received - refunds)
      const netIncome = cashReceived - cashRefunds

      console.log(
        `💰 Shift ${shift.shiftNumber} sync stats:
        - Cash received: ${cashReceived}
        - Cash refunds: ${cashRefunds}
        - Net income: ${netIncome}
        - Direct expenses: ${totalDirectExpenses}
        - Corrections: ${totalCorrections}`
      )

      // 3. Создать транзакции в acc_1

      // Транзакция #1: Итоговый приход за смену
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

      // Транзакция #2: Прямые расходы (если есть)
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

      // Транзакция #3: Корректировки (если есть)
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
        `✅ Sprint 4+5: Shift ${shift.shiftNumber} synced to account ${POS_CASH_ACCOUNT_ID}. Created ${transactionIds.length} transactions.`
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
    loadMockData,
    clearAllData,

    // Sprint 3: Expense Operations
    loadPendingPayments,
    createDirectExpense,
    confirmExpense,
    rejectExpense,

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
