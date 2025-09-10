// src/stores/pos/shifts/services.ts - SHIFTS SERVICE

import type {
  PosShift,
  CreateShiftDto,
  EndShiftDto,
  UpdateShiftDto,
  ShiftTransaction,
  ServiceResponse
} from './types'
import { ShiftsMockData } from './mock'

/**
 * Сервис для работы с данными смен
 * В будущем заменится на API вызовы
 */
export class ShiftsService {
  private readonly STORAGE_KEYS = {
    shifts: 'pos_shifts',
    transactions: 'pos_shift_transactions',
    currentShift: 'pos_current_shift'
  }

  // =============================================
  // ИНИЦИАЛИЗАЦИЯ И MOCK ДАННЫЕ
  // =============================================

  /**
   * Инициализировать сервис и загрузить mock данные если нужно
   */
  async initialize(): Promise<ServiceResponse<void>> {
    try {
      // Проверить есть ли данные
      const existingShifts = localStorage.getItem(this.STORAGE_KEYS.shifts)

      if (!existingShifts) {
        // Загрузить mock данные если нет существующих
        console.log('No existing shifts found, loading mock data...')
        await this.loadMockData()
      } else {
        console.log('Existing shifts found in storage')
      }

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
   * Загрузить mock данные
   */
  async loadMockData(): Promise<ServiceResponse<void>> {
    try {
      ShiftsMockData.loadMockData()
      console.log('Mock shifts data loaded successfully')
      return { success: true }
    } catch (error) {
      console.error('Failed to load mock data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load mock data'
      }
    }
  }

  /**
   * Очистить все данные
   */
  async clearAllData(): Promise<ServiceResponse<void>> {
    try {
      ShiftsMockData.clearMockData()
      console.log('All shifts data cleared')
      return { success: true }
    } catch (error) {
      console.error('Failed to clear data:', error)
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
   */
  async loadShifts(): Promise<ServiceResponse<PosShift[]>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.shifts)
      const shifts = stored ? JSON.parse(stored) : []

      console.log('Загружено смен:', shifts.length)
      return { success: true, data: shifts }
    } catch (error) {
      console.error('Ошибка загрузки смен:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load shifts'
      }
    }
  }

  /**
   * Создать новую смену
   */
  async createShift(dto: CreateShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      const shiftNumber = this.generateShiftNumber()
      const timestamp = new Date().toISOString()

      const newShift: PosShift = {
        id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shiftNumber,
        status: 'active',
        cashierId: dto.cashierId,
        cashierName: dto.cashierName,
        startTime: timestamp,
        startingCash: dto.startingCash,
        startingCashVerified: true,
        totalSales: 0,
        totalTransactions: 0,
        paymentMethods: this.getDefaultPaymentMethods(),
        corrections: [],
        accountBalances: [],
        syncStatus: 'synced', // Новая смена считается синхронизированной
        pendingSync: false,
        notes: dto.notes,
        deviceId: dto.deviceId,
        location: dto.location,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      // Сохранить в localStorage
      await this.saveShift(newShift)

      // Установить как текущую смену
      localStorage.setItem(this.STORAGE_KEYS.currentShift, newShift.id)

      console.log('Смена создана:', shiftNumber)
      return { success: true, data: newShift }
    } catch (error) {
      console.error('Ошибка создания смены:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create shift'
      }
    }
  }

  /**
   * Завершить смену
   */
  async endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      const shifts = await this.loadShifts()
      if (!shifts.success || !shifts.data) {
        throw new Error('Failed to load shifts')
      }

      const shift = shifts.data.find(s => s.id === dto.shiftId)
      if (!shift) {
        throw new Error('Shift not found')
      }

      if (shift.status !== 'active') {
        throw new Error('Shift is not active')
      }

      const endTime = new Date().toISOString()
      const startTime = new Date(shift.startTime)
      const duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 60000)

      // Обновить смену
      const updatedShift: PosShift = {
        ...shift,
        status: 'completed',
        endTime,
        duration,
        endingCash: dto.endingCash,
        expectedCash: shift.startingCash + this.calculateCashSales(shift),
        cashDiscrepancy: dto.endingCash - (shift.startingCash + this.calculateCashSales(shift)),
        cashDiscrepancyType: this.getCashDiscrepancyType(
          dto.endingCash - (shift.startingCash + this.calculateCashSales(shift))
        ),
        corrections: [...shift.corrections, ...dto.corrections],
        notes: dto.notes || shift.notes,
        updatedAt: endTime
      }

      // Сохранить обновленную смену
      await this.saveShift(updatedShift)

      // Удалить текущую смену
      localStorage.removeItem(this.STORAGE_KEYS.currentShift)

      console.log('Смена завершена:', updatedShift.shiftNumber)
      return { success: true, data: updatedShift }
    } catch (error) {
      console.error('Ошибка завершения смены:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end shift'
      }
    }
  }

  /**
   * Обновить смену
   */
  async updateShift(dto: UpdateShiftDto): Promise<ServiceResponse<PosShift>> {
    try {
      const shifts = await this.loadShifts()
      if (!shifts.success || !shifts.data) {
        throw new Error('Failed to load shifts')
      }

      const shiftIndex = shifts.data.findIndex(s => s.id === dto.shiftId)
      if (shiftIndex === -1) {
        throw new Error('Shift not found')
      }

      const shift = shifts.data[shiftIndex]
      const updatedShift: PosShift = {
        ...shift,
        corrections: dto.corrections
          ? [...shift.corrections, ...dto.corrections]
          : shift.corrections,
        notes: dto.notes || shift.notes,
        deviceId: dto.deviceId || shift.deviceId,
        updatedAt: new Date().toISOString()
      }

      await this.saveShift(updatedShift)

      return { success: true, data: updatedShift }
    } catch (error) {
      console.error('Ошибка обновления смены:', error)
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
   * Получить способы оплаты по умолчанию
   */
  private getDefaultPaymentMethods(): PaymentMethodSummary[] {
    return [
      {
        methodId: 'cash',
        methodName: 'Наличные',
        methodType: 'cash',
        count: 0,
        amount: 0,
        percentage: 0
      },
      {
        methodId: 'card',
        methodName: 'Карта',
        methodType: 'card',
        count: 0,
        amount: 0,
        percentage: 0
      },
      {
        methodId: 'gojek',
        methodName: 'Gojek',
        methodType: 'gojek',
        count: 0,
        amount: 0,
        percentage: 0
      },
      {
        methodId: 'grab',
        methodName: 'Grab',
        methodType: 'grab',
        count: 0,
        amount: 0,
        percentage: 0
      },
      { methodId: 'qr', methodName: 'QR код', methodType: 'qr', count: 0, amount: 0, percentage: 0 }
    ]
  }

  /**
   * Рассчитать продажи наличными
   */
  private calculateCashSales(shift: PosShift): number {
    const cashMethod = shift.paymentMethods.find(p => p.methodType === 'cash')
    return cashMethod ? cashMethod.amount : 0
  }

  /**
   * Определить тип расхождения по кассе
   */
  private getCashDiscrepancyType(discrepancy: number): 'shortage' | 'overage' | 'none' {
    if (discrepancy > 0) return 'overage'
    if (discrepancy < 0) return 'shortage'
    return 'none'
  }
}
