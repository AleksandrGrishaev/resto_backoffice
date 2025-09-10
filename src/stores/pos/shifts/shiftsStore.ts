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
  ServiceResponse
} from './types'
import { ShiftsService } from './services'
import { useShiftsComposables } from './composables'
import { useAccountStore } from '@/stores/account'

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
   * Завершить смену
   */
  async function endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      loading.value.end = true
      error.value = null

      if (!currentShift.value) {
        throw new Error('No active shift to end')
      }

      // Проверить синхронизацию
      const hasPendingSync = pendingSyncTransactions.value.length > 0
      if (hasPendingSync) {
        throw new Error('Cannot end shift with pending sync transactions')
      }

      const result = await shiftsService.endShift(dto)

      if (result.success && result.data) {
        const updatedShift = result.data

        // Обновить в списке
        const index = shifts.value.findIndex(s => s.id === updatedShift.id)
        if (index !== -1) {
          shifts.value[index] = updatedShift
        }

        currentShift.value = null
        console.log('✅ Смена завершена:', updatedShift.shiftNumber)
      }

      return result
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

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
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

    // Composables
    formatShiftDuration,
    formatShiftNumber,
    canEndShift,
    canStartShift,
    getShiftStatusColor,
    getSyncStatusColor
  }
})
