// src/stores/pos/index.ts - ИСПРАВЛЕННЫЙ с упрощенной инициализацией
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ServiceResponse } from '@/repositories/base'
import { usePlatform } from '@/composables/usePlatform'

// Импорт всех POS stores
import { usePosTablesStore } from './tables/tablesStore'
import { usePosOrdersStore } from './orders/ordersStore'
import { usePosPaymentsStore } from './payments/paymentsStore'

// Types (упрощенные)
interface DailySalesStats {
  totalAmount: number
  totalOrders: number
  averageOrderValue: number
  paymentMethods: {
    cash: { count: number; amount: number }
    card: { count: number; amount: number }
    qr: { count: number; amount: number }
  }
  orderTypes: {
    dineIn: number
    takeaway: number
    delivery: number
  }
}

interface ShiftReport {
  shiftId: string
  startTime: string
  endTime?: string
  cashierId: string
  cashierName: string
  totalOrders: number
  totalAmount: number
  totalTax: number
  totalDiscounts: number
  paymentBreakdown: {
    cash: { count: number; amount: number }
    card: { count: number; amount: number }
    qr: { count: number; amount: number }
  }
  voidedOrders: number
  voidedAmount: number
}

/**
 * Главный координатор POS системы - УПРОЩЕННАЯ ВЕРСИЯ
 */
export const usePosStore = defineStore('pos', () => {
  const platform = usePlatform()

  // ===== STATE =====
  const isInitialized = ref(false)
  const isOnline = ref(navigator.onLine)
  const lastSync = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Current shift state
  const currentShift = ref<{
    id: string
    startTime: string
    cashierId: string
    cashierName: string
    startingCash: number
  } | null>(null)

  // ===== STORES =====
  const tablesStore = usePosTablesStore()
  const ordersStore = usePosOrdersStore()
  const paymentsStore = usePosPaymentsStore()

  // ===== COMPUTED =====

  const isReady = computed(() => {
    return isInitialized.value && !error.value
  })

  const dailyStats = computed((): DailySalesStats | null => {
    if (!isInitialized.value) return null

    // TODO: Implement when orders/payments are working
    return {
      totalAmount: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      paymentMethods: {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        qr: { count: 0, amount: 0 }
      },
      orderTypes: {
        dineIn: 0,
        takeaway: 0,
        delivery: 0
      }
    }
  })

  const currentShiftReport = computed((): ShiftReport | null => {
    if (!currentShift.value || !isInitialized.value) return null

    const shift = currentShift.value

    // TODO: Calculate real data when stores are working
    return {
      shiftId: shift.id,
      startTime: shift.startTime,
      endTime: undefined,
      cashierId: shift.cashierId,
      cashierName: shift.cashierName,
      totalOrders: 0,
      totalAmount: 0,
      totalTax: 0,
      totalDiscounts: 0,
      paymentBreakdown: {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        qr: { count: 0, amount: 0 }
      },
      voidedOrders: 0,
      voidedAmount: 0
    }
  })

  // ===== ACTIONS =====

  /**
   * ✅ ИСПРАВЛЕННАЯ инициализация POS системы
   */
  async function initializePOS(): Promise<ServiceResponse<void>> {
    if (isInitialized.value) {
      platform.debugLog('POS', 'Already initialized, skipping')
      return { success: true }
    }

    try {
      platform.debugLog('POS', '🔍 Starting POS initialization...')
      error.value = null

      // Простая проверка что stores доступны
      const storesAvailable = !!(tablesStore && ordersStore && paymentsStore)

      if (!storesAvailable) {
        throw new Error('POS stores not available')
      }

      // TODO: В будущем здесь будет более сложная инициализация
      // - Загрузка кэшированного меню
      // - Восстановление незавершенных заказов
      // - Проверка связи с кухней

      // Пока просто помечаем как инициализированную
      isInitialized.value = true
      lastSync.value = new Date().toISOString()

      platform.debugLog('POS', '✅ POS system initialized', {
        platform: platform.platform.value,
        offline: platform.offlineEnabled.value
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize POS'
      error.value = errorMsg

      platform.debugLog('POS', '❌ POS initialization failed', { error: errorMsg })

      return {
        success: false,
        error: errorMsg,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local'
        }
      }
    }
  }

  /**
   * Начать смену
   */
  async function startShift(
    cashierId: string,
    cashierName: string,
    startingCash: number = 0
  ): Promise<ServiceResponse<void>> {
    try {
      if (currentShift.value) {
        throw new Error('Shift already started')
      }

      const shiftId = `shift_${Date.now()}`
      const startTime = new Date().toISOString()

      currentShift.value = {
        id: shiftId,
        startTime,
        cashierId,
        cashierName,
        startingCash
      }

      // Сохраняем информацию о смене
      const storage = platform.getStorageInterface()
      storage.setItem('pos_current_shift', JSON.stringify(currentShift.value))

      platform.debugLog('POS', `✅ Shift started: ${shiftId}`, {
        cashier: cashierName,
        startingCash
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start shift'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Завершить смену
   */
  async function endShift(): Promise<ServiceResponse<ShiftReport>> {
    try {
      if (!currentShift.value) {
        throw new Error('No active shift')
      }

      const report = currentShiftReport.value
      if (!report) {
        throw new Error('Cannot generate shift report')
      }

      // Обновляем время окончания
      const finalReport: ShiftReport = {
        ...report,
        endTime: new Date().toISOString()
      }

      // Очищаем текущую смену
      currentShift.value = null
      const storage = platform.getStorageInterface()
      storage.removeItem('pos_current_shift')

      // Сохраняем отчет
      // TODO: Сохранить отчет в историю смен

      platform.debugLog('POS', '✅ Shift ended', {
        shiftId: finalReport.shiftId,
        duration: finalReport.endTime
      })

      return { success: true, data: finalReport }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end shift'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Синхронизация с сервером (заглушка)
   */
  async function syncWithServer(): Promise<ServiceResponse<void>> {
    try {
      if (!platform.isOnline.value) {
        throw new Error('Cannot sync while offline')
      }

      // TODO: Реализовать синхронизацию
      lastSync.value = new Date().toISOString()

      platform.debugLog('POS', '✅ Sync completed (mock)')
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Очистить ошибку
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Сбросить состояние (для тестирования)
   */
  function reset(): void {
    isInitialized.value = false
    error.value = null
    currentShift.value = null
    lastSync.value = null
  }

  // ===== WATCHERS =====

  // Следим за статусом сети
  watch(isOnline, online => {
    platform.debugLog('POS', `Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`)

    if (online && isInitialized.value) {
      // Автоматическая синхронизация при восстановлении связи
      syncWithServer().catch(err => {
        platform.debugLog('POS', 'Auto-sync failed', { error: err.message })
      })
    }
  })

  // ===== LIFECYCLE =====

  // Восстановление смены при инициализации store
  function restoreShift(): void {
    try {
      const storage = platform.getStorageInterface()
      const savedShift = storage.getItem('pos_current_shift')

      if (savedShift) {
        currentShift.value = JSON.parse(savedShift)
        platform.debugLog('POS', 'Shift restored from storage', {
          shiftId: currentShift.value?.id
        })
      }
    } catch (error) {
      platform.debugLog('POS', 'Failed to restore shift', { error })
    }
  }

  // Восстанавливаем смену при создании store
  restoreShift()

  // ===== RETURN =====

  return {
    // State
    isInitialized,
    isOnline,
    lastSync,
    error,
    currentShift,

    // Getters
    isReady,
    dailyStats,
    currentShiftReport,

    // Store references
    tablesStore,
    ordersStore,
    paymentsStore,

    // Actions
    initializePOS,
    startShift,
    endShift,
    syncWithServer,
    clearError,
    reset
  }
})
