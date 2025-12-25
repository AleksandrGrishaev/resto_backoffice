// src/stores/pos/shifts/services.ts - SHIFTS SERVICE (Sprint 7: Supabase Integration)

import type {
  PosShift,
  CreateShiftDto,
  EndShiftDto,
  UpdateShiftDto,
  ShiftTransaction,
  ServiceResponse,
  PaymentMethodSummary,
  ShiftCorrection
} from './types'
import { supabase } from '@/supabase'
import { getSupabaseErrorMessage } from '@/supabase/config'
import { toSupabaseInsert, toSupabaseUpdate, fromSupabase } from './supabaseMappers'
import { ENV } from '@/config/environment'
import { extractErrorDetails } from '@/utils'
import { executeSupabaseMutation } from '@/utils/supabase'

/**
 * Сервис для работы с данными смен
 * Sprint 7: Integrated with Supabase + localStorage fallback
 */
export class ShiftsService {
  private readonly STORAGE_KEYS = {
    shifts: 'pos_shifts',
    transactions: 'pos_shift_transactions',
    currentShift: 'pos_current_shift'
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  /**
   * Check if Supabase is available and enabled
   */
  private isSupabaseAvailable(): boolean {
    return ENV.supabase.enabled && navigator.onLine
  }

  // =============================================
  // ИНИЦИАЛИЗАЦИЯ
  // =============================================

  /**
   * Инициализировать сервис
   * Supabase integration handles data loading via loadShifts()
   */
  async initialize(): Promise<ServiceResponse<void>> {
    try {
      console.log('✅ Shifts service initialized (Supabase integration active)')
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize shifts service:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      }
    }
  }

  /**
   * Очистить все данные из localStorage
   */
  async clearAllData(): Promise<ServiceResponse<void>> {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.shifts)
      localStorage.removeItem(this.STORAGE_KEYS.transactions)
      localStorage.removeItem(this.STORAGE_KEYS.currentShift)
      console.log('✅ All shifts data cleared from localStorage')
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to clear data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear data'
      }
    }
  }

  // =============================================
  // ОСНОВНЫЕ ОПЕРАЦИИ СО СМЕНАМИ
  // =============================================

  /**
   * Загрузить все смены
   * Sprint 7: Reads from Supabase, fallback to localStorage
   */
  async loadShifts(): Promise<ServiceResponse<PosShift[]>> {
    try {
      // Try Supabase first if available
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          // Convert Supabase format to app format
          const shifts = data.map(fromSupabase)
          console.log('✅ Загружено смен из Supabase:', shifts.length)

          // Cache in localStorage for offline access
          localStorage.setItem(this.STORAGE_KEYS.shifts, JSON.stringify(shifts))

          return { success: true, data: shifts }
        }

        // If Supabase fails, fallback to localStorage
        console.warn('⚠️ Supabase load failed, using localStorage:', getSupabaseErrorMessage(error))
      }

      // Fallback: Read from localStorage
      const stored = localStorage.getItem(this.STORAGE_KEYS.shifts)
      const shifts = stored ? JSON.parse(stored) : []

      console.log('📦 Загружено смен из localStorage:', shifts.length)
      return { success: true, data: shifts }
    } catch (error) {
      console.error('❌ Ошибка загрузки смен:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load shifts'
      }
    }
  }

  /**
   * Создать новую смену
   * Sprint 7: Saves to Supabase + localStorage
   */
  async createShift(dto: CreateShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      const shiftNumber = this.generateShiftNumber()
      const timestamp = new Date().toISOString()

      const newShift: PosShift = {
        id: crypto.randomUUID(), // UUID format for Supabase compatibility
        shiftNumber,
        status: 'active',
        cashierId: dto.cashierId,
        cashierName: dto.cashierName,
        startTime: timestamp,
        startingCash: dto.startingCash,
        startingCashVerified: true,
        totalSales: 0,
        totalTransactions: 0,
        paymentMethods: await this.getDefaultPaymentMethods(),
        corrections: [],
        accountBalances: [],
        expenseOperations: [], // ✅ Sprint 3: Initialize expense operations
        pendingPayments: [], // ✅ Sprint 3: Initialize pending payments
        syncStatus: 'synced', // Новая смена считается синхронизированной
        pendingSync: false,
        notes: dto.notes,
        deviceId: dto.deviceId,
        location: dto.location,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      // Try to save to Supabase first
      if (this.isSupabaseAvailable()) {
        const supabaseShift = toSupabaseInsert(newShift)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase.from('shifts').insert(supabaseShift)
            if (error) throw error
          }, 'ShiftsService.createShift')
          console.log('✅ Смена создана в Supabase:', shiftNumber)
        } catch (error) {
          console.warn(
            '⚠️ Supabase insert failed, saving to localStorage only:',
            extractErrorDetails(error)
          )
          newShift.syncStatus = 'pending'
          newShift.pendingSync = true
        }
      } else {
        // Offline mode - mark for sync
        newShift.syncStatus = 'pending'
        newShift.pendingSync = true
      }

      // Always save to localStorage (for offline access + cache)
      await this.saveShift(newShift)

      // Установить как текущую смену
      localStorage.setItem(this.STORAGE_KEYS.currentShift, newShift.id)

      console.log('📦 Смена создана:', shiftNumber)
      return { success: true, data: newShift }
    } catch (error) {
      console.error('❌ Ошибка создания смены:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create shift'
      }
    }
  }

  /**
   * Завершить смену
   * Sprint 7: Updates in Supabase + localStorage
   * ИСПРАВЛЕНО: Ищет смену в localStorage (для текущей смены), затем fallback на Supabase
   */
  async endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      // Try to find shift in localStorage first (for current shift)
      const storedShifts = localStorage.getItem(this.STORAGE_KEYS.shifts)
      const shifts = storedShifts ? JSON.parse(storedShifts) : []
      let shift = shifts.find((s: PosShift) => s.id === dto.shiftId)

      // Fallback: try to load from Supabase
      if (!shift) {
        console.log('⚠️ Shift not found in localStorage, loading from Supabase...')
        const supabaseShifts = await this.loadShifts()
        if (!supabaseShifts.success || !supabaseShifts.data) {
          throw new Error('Failed to load shifts')
        }
        shift = supabaseShifts.data.find(s => s.id === dto.shiftId)
      }

      if (!shift) {
        throw new Error('Shift not found')
      }

      if (shift.status !== 'active') {
        throw new Error('Shift is not active')
      }

      const endTime = new Date().toISOString()
      const startTime = new Date(shift.startTime)
      const duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 60000)

      // Преобразовать corrections из DTO в полные ShiftCorrection объекты
      const newCorrections: ShiftCorrection[] = dto.corrections.map(c => ({
        ...c,
        id: `correction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        shiftId: shift.id,
        createdAt: endTime,
        updatedAt: endTime
      }))

      // ✅ FIX: Use paymentMethods from DTO (calculated from real payments in EndShiftDialog)
      // The shift.paymentMethods may not be updated yet, so we need to use dto.paymentMethods
      const paymentMethodsForCalc = dto.paymentMethods || shift.paymentMethods
      const cashSales = this.calculateCashSalesFromMethods(paymentMethodsForCalc)
      const totalExpenses = this.calculateTotalExpenses(shift)
      const expectedCash = shift.startingCash + cashSales - totalExpenses

      // Обновить смену
      const updatedShift: PosShift = {
        ...shift,
        status: 'completed',
        endTime,
        duration,
        endingCash: dto.endingCash,
        expectedCash,
        cashDiscrepancy: dto.endingCash - expectedCash,
        cashDiscrepancyType: this.getCashDiscrepancyType(dto.endingCash - expectedCash),
        corrections: [...shift.corrections, ...newCorrections],
        notes: dto.notes || shift.notes,
        updatedAt: endTime,
        // Use payment methods from DTO if provided (calculated from real payments)
        paymentMethods: dto.paymentMethods || shift.paymentMethods
      }

      // Try to update in Supabase first
      if (this.isSupabaseAvailable()) {
        const supabaseUpdate = toSupabaseUpdate(updatedShift)

        try {
          await executeSupabaseMutation(async () => {
            const { error } = await supabase
              .from('shifts')
              .update(supabaseUpdate)
              .eq('id', shift.id)
            if (error) throw error
          }, 'ShiftsService.endShift')
          console.log('✅ Смена закрыта и обновлена в Supabase:', updatedShift.shiftNumber)
        } catch (error) {
          console.warn(
            '⚠️ Supabase update failed when closing shift, saving to localStorage only:',
            extractErrorDetails(error)
          )
          updatedShift.syncStatus = 'pending'
          updatedShift.pendingSync = true
        }
      } else {
        // Offline mode - mark for sync
        updatedShift.syncStatus = 'pending'
        updatedShift.pendingSync = true
      }

      // Always save to localStorage
      await this.saveShift(updatedShift)

      // Удалить текущую смену
      localStorage.removeItem(this.STORAGE_KEYS.currentShift)

      console.log('✅ Смена завершена:', updatedShift.shiftNumber)
      return { success: true, data: updatedShift }
    } catch (error) {
      console.error('❌ Ошибка завершения смены:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end shift'
      }
    }
  }

  /**
   * Обновить смену
   * Sprint 7: Updates in Supabase + localStorage
   * ИСПРАВЛЕНО: Не перезагружает смены, просто обновляет переданную смену
   */
  async updateShift(
    shiftId: string,
    shift: PosShift,
    retryCount: number = 0
  ): Promise<ServiceResponse<PosShift>> {
    const MAX_RETRIES = 3

    try {
      const updatedShift: PosShift = {
        ...shift,
        updatedAt: new Date().toISOString()
      }

      // Try to update in Supabase first
      if (this.isSupabaseAvailable()) {
        const supabaseUpdate = toSupabaseUpdate(updatedShift)

        try {
          // ✅ SIMPLIFIED: Remove optimistic locking to avoid infinite loops
          // Just update the shift - conflicts are rare and localStorage is source of truth
          const { error } = await supabase.from('shifts').update(supabaseUpdate).eq('id', shiftId)

          if (error) throw error

          console.log('✅ Смена обновлена в Supabase:', shiftId)
        } catch (error) {
          console.warn(
            '⚠️ Supabase update failed, saving to localStorage only:',
            extractErrorDetails(error)
          )
          updatedShift.syncStatus = 'pending'
          updatedShift.pendingSync = true
        }
      } else {
        // Offline mode - mark for sync
        updatedShift.syncStatus = 'pending'
        updatedShift.pendingSync = true
      }

      // Always save to localStorage
      await this.saveShift(updatedShift)

      return { success: true, data: updatedShift }
    } catch (error) {
      console.error('❌ Ошибка обновления смены:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update shift'
      }
    }
  }

  // =============================================
  // ОПЕРАЦИИ С ТРАНЗАКЦИЯМИ
  // =============================================

  /**
   * Загрузить транзакции смены
   */
  async loadShiftTransactions(shiftId: string): Promise<ServiceResponse<ShiftTransaction[]>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.transactions)
      const allTransactions: ShiftTransaction[] = stored ? JSON.parse(stored) : []

      const shiftTransactions = allTransactions.filter(t => t.shiftId === shiftId)

      return { success: true, data: shiftTransactions }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load transactions'
      }
    }
  }

  /**
   * Сохранить транзакцию
   */
  async saveTransaction(transaction: ShiftTransaction): Promise<ServiceResponse<void>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.transactions)
      const transactions: ShiftTransaction[] = stored ? JSON.parse(stored) : []

      const existingIndex = transactions.findIndex(t => t.id === transaction.id)

      if (existingIndex !== -1) {
        transactions[existingIndex] = transaction
      } else {
        transactions.push(transaction)
      }

      localStorage.setItem(this.STORAGE_KEYS.transactions, JSON.stringify(transactions))

      return { success: true }
    } catch (error) {
      console.error('Ошибка сохранения транзакции:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save transaction'
      }
    }
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // =============================================

  /**
   * Сохранить смену
   */
  private async saveShift(shift: PosShift): Promise<void> {
    const shifts = await this.loadShifts()
    const shiftsData = shifts.success && shifts.data ? shifts.data : []

    const existingIndex = shiftsData.findIndex(s => s.id === shift.id)

    if (existingIndex !== -1) {
      shiftsData[existingIndex] = shift
    } else {
      shiftsData.push(shift)
    }

    localStorage.setItem(this.STORAGE_KEYS.shifts, JSON.stringify(shiftsData))
  }

  /**
   * Генерировать номер смены
   */
  private generateShiftNumber(): string {
    const now = new Date()
    const date = now.toISOString().split('T')[0].replace(/-/g, '')
    const time = now.toTimeString().substring(0, 5).replace(':', '')

    return `SHIFT-${date}-${time}`
  }

  /**
   * Получить способы оплаты по умолчанию (динамически из настроек)
   */
  private async getDefaultPaymentMethods(): Promise<PaymentMethodSummary[]> {
    try {
      const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
      const activeMethods = await paymentMethodService.getActive()

      return activeMethods.map(method => ({
        methodId: method.id,
        methodCode: method.code, // Used for matching with payment.method
        methodName: method.name,
        methodType: method.type,
        count: 0,
        amount: 0,
        percentage: 0
      }))
    } catch (error) {
      console.error('Failed to load payment methods, using fallback:', error)
      // Fallback to basic cash/card if service fails
      return [
        {
          methodId: 'cash',
          methodCode: 'cash',
          methodName: 'Cash',
          methodType: 'cash',
          count: 0,
          amount: 0,
          percentage: 0
        },
        {
          methodId: 'card',
          methodCode: 'card',
          methodName: 'Card',
          methodType: 'card',
          count: 0,
          amount: 0,
          percentage: 0
        }
      ]
    }
  }

  /**
   * Рассчитать продажи наличными из массива paymentMethods
   * ✅ FIX: Accept paymentMethods array directly (can be from DTO or shift)
   */
  private calculateCashSalesFromMethods(paymentMethods: PaymentMethodSummary[]): number {
    const cashMethod = paymentMethods.find(p => p.methodType === 'cash')
    return cashMethod ? cashMethod.amount : 0
  }

  /**
   * @deprecated Use calculateCashSalesFromMethods instead
   */
  private calculateCashSales(shift: PosShift): number {
    return this.calculateCashSalesFromMethods(shift.paymentMethods)
  }

  /**
   * Рассчитать общую сумму расходов (completed only)
   */
  private calculateTotalExpenses(shift: PosShift): number {
    return shift.expenseOperations
      .filter(exp => exp.status === 'completed')
      .reduce((sum, exp) => sum + exp.amount, 0)
  }

  /**
   * Определить тип расхождения по кассе
   */
  private getCashDiscrepancyType(discrepancy: number): 'shortage' | 'overage' | 'none' {
    if (discrepancy > 0) return 'overage'
    if (discrepancy < 0) return 'shortage'
    return 'none'
  }

  /**
   * ✅ Sprint 7: Update payment methods in active shift after payment
   * @param paymentMethodType - Payment method type: 'cash' | 'card' | 'qr'
   */
  async updatePaymentMethods(
    shiftId: string,
    paymentMethodType: string,
    amount: number
  ): Promise<ServiceResponse<void>> {
    try {
      console.log(`🔄 Updating payment methods in shift ${shiftId}:`, {
        paymentMethodType,
        amount
      })

      // Load current shifts
      const storedShifts = localStorage.getItem(this.STORAGE_KEYS.shifts)
      const shifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []

      const shift = shifts.find(s => s.id === shiftId)
      if (!shift) {
        throw new Error('Shift not found')
      }

      // ✅ NEW: Log current state BEFORE update
      console.log(`📊 Payment methods BEFORE update:`, {
        methods: shift.paymentMethods.map(pm => ({
          type: pm.methodType,
          amount: pm.amount,
          count: pm.count
        }))
      })

      const oldTotalSales = shift.totalSales

      // Find matching payment method summary by methodCode (e.g., 'alex', 'cash', 'gojek')
      // Fallback to methodType for backward compatibility with old shifts
      let methodSummary = shift.paymentMethods.find(pm => pm.methodCode === paymentMethodType)

      if (!methodSummary) {
        // Fallback: try finding by methodType (for old data without methodCode)
        methodSummary = shift.paymentMethods.find(pm => pm.methodType === paymentMethodType)
      }

      if (!methodSummary) {
        // ✅ NEW: Better error with available methods (show codes)
        const availableCodes = shift.paymentMethods
          .map(pm => pm.methodCode || pm.methodType)
          .join(', ')
        const error = `Payment method '${paymentMethodType}' not found. Available: ${availableCodes}`
        console.error(`❌ ${error}`)
        return { success: false, error }
      }

      // ✅ NEW: Log the specific method being updated
      console.log(`💰 Updating method '${paymentMethodType}':`, {
        currentAmount: methodSummary.amount,
        addingAmount: amount,
        newAmount: methodSummary.amount + amount
      })

      // Update amount
      methodSummary.amount += amount

      // Update count
      if (!methodSummary.count) {
        methodSummary.count = 0
      }
      methodSummary.count += 1

      // Recalculate total sales and percentages
      shift.totalSales = shift.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0)
      shift.totalTransactions = shift.paymentMethods.reduce((sum, pm) => sum + pm.count, 0)

      // ✅ NEW: Recalculate percentages
      const totalAmount = shift.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0)
      shift.paymentMethods.forEach(pm => {
        pm.percentage = totalAmount > 0 ? (pm.amount / totalAmount) * 100 : 0
      })

      // ✅ NEW: Log state AFTER update (before save)
      console.log(`📊 Payment methods AFTER update (before save):`, {
        methods: shift.paymentMethods.map(pm => ({
          type: pm.methodType,
          amount: pm.amount,
          count: pm.count,
          percentage: pm.percentage?.toFixed(2)
        })),
        totalSales: shift.totalSales
      })

      console.log(`📈 Total sales: ${oldTotalSales} → ${shift.totalSales}`)

      // ✅ CRITICAL: Update shift with updated_at timestamp
      shift.updatedAt = new Date().toISOString()

      // Update shift (saves to Supabase + localStorage)
      const updateResult = await this.updateShift(shiftId, shift)

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update shift')
      }

      // ✅ NEW: Verify the update was saved
      const verifyResult = await this.loadShifts()
      if (verifyResult.success && verifyResult.data) {
        const verifiedShift = verifyResult.data.find(s => s.id === shiftId)
        if (verifiedShift) {
          const verifiedMethod = verifiedShift.paymentMethods.find(
            pm => pm.methodType === paymentMethodType
          )
          console.log(`✅ VERIFIED payment method after save:`, {
            type: paymentMethodType,
            amount: verifiedMethod?.amount,
            expectedAmount: methodSummary.amount,
            matches: verifiedMethod?.amount === methodSummary.amount
          })

          if (verifiedMethod?.amount !== methodSummary.amount) {
            console.error(`❌ VERIFICATION FAILED: Amounts don't match!`, {
              saved: verifiedMethod?.amount,
              expected: methodSummary.amount
            })
          }
        }
      }

      console.log(
        `✅ Updated payment methods in shift ${shift.shiftNumber}: ${paymentMethodType} +${amount}`
      )

      return { success: true }
    } catch (error) {
      console.error('❌ Failed to update payment methods:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment methods'
      }
    }
  }

  // =============================================
  // SPRINT 3: EXPENSE OPERATIONS SYNC
  // =============================================

  private syncIntervalId: number | null = null
  private readonly SYNC_INTERVAL = 30000 // 30 секунд

  /**
   * Начать периодическую синхронизацию расходных операций
   * TODO: Заменить polling на WebSocket/Firebase Realtime/SSE для более эффективной синхронизации
   */
  startExpenseOperationsSync(onSyncCallback: () => Promise<void>): void {
    console.log('⏰ Starting expense operations polling (every 30 sec)')
    console.warn(
      'TODO: Replace polling with WebSocket/Firebase Realtime/SSE for better performance'
    )

    // Очистить существующий интервал если есть
    if (this.syncIntervalId !== null) {
      this.stopExpenseOperationsSync()
    }

    // Запустить периодическую синхронизацию
    this.syncIntervalId = window.setInterval(async () => {
      try {
        await onSyncCallback()
      } catch (error) {
        console.error('❌ Expense sync error:', error)
      }
    }, this.SYNC_INTERVAL)

    console.log('✅ Expense operations sync started')
  }

  /**
   * Остановить синхронизацию
   */
  stopExpenseOperationsSync(): void {
    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
      console.log('🛑 Expense operations sync stopped')
    }
  }

  /**
   * Синхронизировать текущую смену с Account Store
   * Проверяет новые платежи, требующие подтверждения
   */
  async syncShiftWithAccountStore(
    shiftId: string,
    accountStorePayments: any[]
  ): Promise<ServiceResponse<void>> {
    try {
      const shifts = await this.loadShifts()
      if (!shifts.success || !shifts.data) {
        return { success: false, error: 'Failed to load shifts' }
      }

      const shift = shifts.data.find(s => s.id === shiftId)
      if (!shift) {
        return { success: false, error: `Shift not found: ${shiftId}` }
      }

      // Обновить список ожидающих платежей
      const pendingPaymentIds = accountStorePayments
        .filter(p => p.requiresCashierConfirmation && p.confirmationStatus === 'pending')
        .map(p => p.id)

      shift.pendingPayments = pendingPaymentIds

      // Сохранить обновленную смену
      await this.updateShift(shiftId, shift)

      return { success: true }
    } catch (error) {
      console.error('Failed to sync shift with account store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }
}
