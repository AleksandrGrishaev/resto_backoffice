// src/stores/pos/index.ts - ИСПРАВЛЕННЫЙ с упрощенной инициализацией
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ServiceResponse } from '@/repositories/base'
import { usePlatform } from '@/composables/usePlatform'

// Импорт всех POS stores
import { usePosTablesStore } from './tables/tablesStore'
import { usePosOrdersStore } from './orders/ordersStore'
import { usePosPaymentsStore } from './payments/paymentsStore'
import { useShiftsStore } from './shifts/shiftsStore'

// ✅ Sprint 7: Account Store for shift sync
import { useAccountStore } from '@/stores/account'

// ✅ Sprint 9: Only essential stores for POS sync (recipes excluded - cost recalculation too slow)
import { useMenuStore } from '@/stores/menu'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

// ✅ Sprint 6: SyncService integration
import { useSyncService } from '@/core/sync/SyncService'
import { ShiftSyncAdapter } from '@/core/sync/adapters/ShiftSyncAdapter'
import { ShiftUpdateAdapter } from '@/core/sync/adapters/ShiftUpdateAdapter'
import { migrateLegacyShiftQueue } from '@/core/sync/migrations/migrateLegacyShiftQueue'

// ✅ Sprint 7: Realtime integration for Kitchen updates
import { useOrdersRealtime } from './orders/useOrdersRealtime'
import { useTablesRealtime } from './tables/useTablesRealtime'
import { ENV } from '@/config/environment'

// ✅ Storage cleanup system
import { StorageMonitor } from '@/utils'

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

  // ✅ FIX: Store reference to Realtime subscriptions for cleanup
  let ordersRealtime: ReturnType<typeof useOrdersRealtime> | null = null
  let tablesRealtime: ReturnType<typeof useTablesRealtime> | null = null

  // ===== STORES =====
  const tablesStore = usePosTablesStore()
  const ordersStore = usePosOrdersStore()
  const paymentsStore = usePosPaymentsStore()
  const shiftsStore = useShiftsStore()

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

      // ✅ CRITICAL: Check localStorage usage and cleanup if needed
      // This runs for ALL roles (cashier, kitchen, bar) on app load
      // Prevents quota exceeded errors on kitchen/bar monitors that never open shifts
      const { needsCleanup, level } = StorageMonitor.needsCleanup()
      if (needsCleanup) {
        console.log(
          `⚠️  localStorage ${level}: ${(StorageMonitor.estimateUsage().usagePercent * 100).toFixed(1)}% full, triggering cleanup...`
        )
        await StorageMonitor.performCleanup(level)
      } else {
        const usage = StorageMonitor.estimateUsage()
        console.log(
          `✅ localStorage usage: ${(usage.usagePercent * 100).toFixed(1)}% (${(usage.totalSize / 1024).toFixed(0)} KB)`
        )
      }

      // Простая проверка что stores доступны
      const storesAvailable = !!(tablesStore && ordersStore && paymentsStore && shiftsStore)

      if (!storesAvailable) {
        throw new Error('POS stores not available')
      }

      // ✅ PERFORMANCE FIX: Загружаем данные ПАРАЛЛЕЛЬНО для ускорения
      platform.debugLog('POS', '📦 Loading POS data in parallel...')
      const startTime = performance.now()

      // Phase 1: Core POS data (parallel)
      // ✅ Sprint 8: Production performance logging
      console.log('⏱️ [POS] Starting data load...')

      await Promise.all([
        tablesStore.initialize(),
        ordersStore.loadOrders(),
        paymentsStore.initialize(),
        shiftsStore.loadShifts()
      ])

      const phase1Time = performance.now() - startTime

      // ✅ Sprint 8: Always log performance summary (even in production)
      console.log(`⏱️ [POS] Phase 1 complete: ${phase1Time.toFixed(0)}ms`, {
        tables: tablesStore.tables.length,
        orders: ordersStore.orders.length,
        payments: paymentsStore.payments.length,
        shifts: shiftsStore.shifts.length
      })

      platform.debugLog('POS', '✅ Phase 1: Core data loaded', {
        time: `${phase1Time.toFixed(0)}ms`,
        tablesCount: tablesStore.tables.length,
        ordersCount: ordersStore.orders.length,
        paymentsCount: paymentsStore.payments.length,
        shiftsCount: shiftsStore.shifts.length,
        currentShift: shiftsStore.currentShift?.shiftNumber || 'None'
      })

      // Phase 2: Account Store (depends on nothing, can be parallel with phase 1 in future)
      platform.debugLog('POS', '💰 Initializing Account Store...')
      const accountStore = useAccountStore()
      await accountStore.initializeStore()

      // ✅ Lazy load pending payments - defer to when Receipt is opened
      // This saves ~300ms on initial load
      // await accountStore.fetchPayments(true) // DEFERRED - loaded on-demand
      platform.debugLog('POS', '✅ Account Store initialized (payments deferred)', {
        accountsCount: accountStore.accounts.length
      })

      // ✅ Sprint 6: Initialize SyncService
      platform.debugLog('POS', '🔄 Initializing SyncService...')
      const syncService = useSyncService()

      // Register shift sync adapters
      syncService.registerAdapter(new ShiftSyncAdapter()) // For closed shift account sync
      syncService.registerAdapter(new ShiftUpdateAdapter()) // For active shift data sync to Supabase

      // Migrate legacy queue (one-time, auto-skips if no legacy data)
      await migrateLegacyShiftQueue()

      // Process sync queue on startup
      platform.debugLog('POS', '🔄 Processing sync queue...')
      const syncReport = await syncService.processQueue()
      platform.debugLog('POS', '✅ Sync queue processed', {
        succeeded: syncReport.succeeded,
        failed: syncReport.failed,
        skipped: syncReport.skipped
      })

      // Start auto-processing
      syncService.start()

      // ✅ Sprint 7: Initialize Realtime for Kitchen updates
      if (ENV.useSupabase) {
        platform.debugLog('POS', '📡 Initializing Realtime for Kitchen updates...')
        ordersRealtime = useOrdersRealtime()
        ordersRealtime.subscribe()

        // 🆕 Tables Realtime for sync between tabs/devices
        tablesRealtime = useTablesRealtime()
        tablesRealtime.subscribe()

        platform.debugLog('POS', '✅ POS Realtime subscriptions active (orders + tables)')
      }

      // Пока просто помечаем как инициализированную
      isInitialized.value = true
      lastSync.value = new Date().toISOString()

      platform.debugLog('POS', '✅ POS system initialized', {
        platform: platform.platform.value,
        offline: platform.offlineEnabled.value,
        realtimeEnabled: ENV.useSupabase
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
   * ✅ Sprint 9: Оптимизированная синхронизация POS данных
   * Обновляет только stores, используемые в POS (не трогает recipes с cost recalculation)
   */
  async function syncData(): Promise<ServiceResponse<void>> {
    try {
      if (!platform.isOnline.value) {
        throw new Error('Cannot sync while offline')
      }

      const startTime = performance.now()
      platform.debugLog('POS', '🔄 Starting POS data sync...')

      // Phase 1: Перезагрузить POS stores (параллельно)
      platform.debugLog('POS', '📦 Phase 1: Reloading POS stores...')
      await Promise.all([
        tablesStore.initialize(),
        ordersStore.loadOrders(),
        paymentsStore.initialize(),
        shiftsStore.loadShifts()
      ])

      // Phase 2: Перезагрузить каталоги для POS (меню + методы оплаты)
      // ⚠️ НЕ обновляем recipes/products - это занимает 30+ сек из-за cost recalculation
      platform.debugLog('POS', '📦 Phase 2: Refreshing POS catalogs...')
      const menuStore = useMenuStore()
      const paymentSettingsStore = usePaymentSettingsStore()

      await Promise.all([
        menuStore.refresh(), // Меню и цены
        paymentSettingsStore.fetchPaymentMethods() // Методы оплаты (могли добавить новые)
      ])

      // Phase 3: Обработать sync queue
      platform.debugLog('POS', '🔄 Phase 3: Processing sync queue...')
      const syncService = useSyncService()
      const syncReport = await syncService.processQueue()

      const duration = performance.now() - startTime

      lastSync.value = new Date().toISOString()

      platform.debugLog('POS', '✅ POS sync completed', {
        duration: `${duration.toFixed(0)}ms`,
        tables: tablesStore.tables.length,
        orders: ordersStore.orders.length,
        menuItems: menuStore.allMenuItems.length,
        paymentMethods: paymentSettingsStore.paymentMethods.length,
        syncQueue: {
          succeeded: syncReport.succeeded,
          failed: syncReport.failed,
          skipped: syncReport.skipped
        }
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed'
      platform.debugLog('POS', '❌ Sync failed', { error: errorMsg })
      return { success: false, error: errorMsg }
    }
  }

  /**
   * @deprecated Use syncData() instead
   */
  async function syncWithServer(): Promise<ServiceResponse<void>> {
    return syncData()
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

  /**
   * ✅ FIX: Cleanup method to unsubscribe from Realtime channels
   * IMPORTANT: Call this when navigating away from POS view or during HMR cleanup
   */
  function cleanup(): void {
    platform.debugLog('POS', '🧹 Cleaning up POS store...')

    // Unsubscribe from Realtime channels
    if (ordersRealtime) {
      platform.debugLog('POS', '📡 Unsubscribing from POS orders Realtime...')
      ordersRealtime.unsubscribe()
      ordersRealtime = null
    }
    if (tablesRealtime) {
      platform.debugLog('POS', '📡 Unsubscribing from POS tables Realtime...')
      tablesRealtime.unsubscribe()
      tablesRealtime = null
    }
    platform.debugLog('POS', '✅ POS Realtime cleanup complete')

    // Stop SyncService auto-processing
    const syncService = useSyncService()
    syncService.stop()
    platform.debugLog('POS', '✅ SyncService stopped')

    platform.debugLog('POS', '✅ POS cleanup complete')
  }

  // ===== WATCHERS =====

  // Следим за статусом сети
  watch(isOnline, (online, wasOnline) => {
    platform.debugLog('POS', `Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`)

    if (online && !wasOnline && isInitialized.value) {
      // ✅ Sprint 6: Process sync queue when connection restored
      platform.debugLog('POS', '🌐 Network restored, processing sync queue...')
      const syncService = useSyncService()
      syncService.processQueue().catch(err => {
        platform.debugLog('POS', 'Sync queue processing failed', { error: err.message })
      })

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
    syncData,
    syncWithServer, // @deprecated - use syncData
    clearError,
    reset,
    cleanup // ✅ FIX: Add cleanup method to exports
  }
})
