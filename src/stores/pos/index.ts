// src/stores/pos/index.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ServiceResponse, DailySalesStats, ShiftReport } from './types'

// Импорт всех POS stores
import { usePosTablesStore } from './tables/tablesStore'
import { usePosOrdersStore } from './orders/ordersStore'
import { usePosPaymentsStore } from './payments/paymentsStore'

// Импорт интеграций
// TODO: Создать интеграции
// import { MenuAdapter } from './integration/MenuAdapter'
// import { InventorySync } from './integration/InventorySync'
// import { FinanceSync } from './integration/FinanceSync'

/**
 * Главный координатор POS системы
 * Управляет инициализацией, синхронизацией и общими операциями
 */
export const usePosStore = defineStore('pos', () => {
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
  const isReady = computed(
    () =>
      isInitialized.value &&
      !tablesStore.loading.list &&
      !ordersStore.loading.list &&
      !paymentsStore.loading.list
  )

  const dailyStats = computed((): DailySalesStats | null => {
    if (!isInitialized.value) return null

    const today = new Date().toISOString().split('T')[0]
    const todayOrders = ordersStore.todayOrders
    const todayPayments = paymentsStore.todayPayments.filter(p => p.status === 'completed')

    const totalAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalOrders = todayOrders.length

    // Группировка по способам оплаты
    const paymentMethods = {
      cash: todayPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: todayPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      qr: todayPayments.filter(p => p.method === 'qr').reduce((sum, p) => sum + p.amount, 0),
      mixed: todayPayments.filter(p => p.method === 'mixed').reduce((sum, p) => sum + p.amount, 0)
    }

    // Группировка по типам заказов
    const orderTypes = {
      dine_in: todayOrders.filter(o => o.type === 'dine_in').length,
      takeaway: todayOrders.filter(o => o.type === 'takeaway').length,
      delivery: todayOrders.filter(o => o.type === 'delivery').length
    }

    // Топ товары (заглушка, потом будет из реальных данных)
    const topItems = [
      { itemName: 'Кофе эспрессо', quantity: 15, revenue: 1350 },
      { itemName: 'Круассан', quantity: 12, revenue: 960 },
      { itemName: 'Капучино', quantity: 10, revenue: 1200 }
    ]

    return {
      date: today,
      totalOrders,
      totalAmount,
      averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
      paymentMethods,
      orderTypes,
      topItems
    }
  })

  const currentShiftReport = computed((): ShiftReport | null => {
    if (!currentShift.value || !isInitialized.value) return null

    const shift = currentShift.value
    const shiftPayments = paymentsStore.payments.filter(
      p => p.status === 'completed' && p.processedAt >= shift.startTime
    )

    const totalAmount = shiftPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalTax = ordersStore.orders
      .filter(o => o.createdAt >= shift.startTime)
      .reduce((sum, o) => sum + o.taxAmount, 0)
    const totalDiscounts = ordersStore.orders
      .filter(o => o.createdAt >= shift.startTime)
      .reduce((sum, o) => sum + o.discountAmount, 0)

    // Группировка платежей по методам
    const paymentBreakdown = {
      cash: {
        count: shiftPayments.filter(p => p.method === 'cash').length,
        amount: shiftPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0)
      },
      card: {
        count: shiftPayments.filter(p => p.method === 'card').length,
        amount: shiftPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0)
      },
      qr: {
        count: shiftPayments.filter(p => p.method === 'qr').length,
        amount: shiftPayments.filter(p => p.method === 'qr').reduce((sum, p) => sum + p.amount, 0)
      }
    }

    return {
      shiftId: shift.id,
      startTime: shift.startTime,
      endTime: undefined,
      cashierId: shift.cashierId,
      cashierName: shift.cashierName,
      totalOrders: ordersStore.orders.filter(o => o.createdAt >= shift.startTime).length,
      totalAmount,
      totalTax,
      totalDiscounts,
      paymentBreakdown,
      voidedOrders: 0, // TODO: Добавить отмененные заказы
      voidedAmount: 0
    }
  })

  // ===== ACTIONS =====

  /**
   * Инициализация POS системы
   */
  async function initializePOS(): Promise<ServiceResponse<void>> {
    if (isInitialized.value) {
      return { success: true }
    }

    try {
      error.value = null

      // Загружаем все данные параллельно
      const [tablesResult, ordersResult, paymentsResult] = await Promise.all([
        tablesStore.loadTables(),
        ordersStore.loadOrders(),
        paymentsStore.loadPayments()
      ])

      // Проверяем результаты
      if (!tablesResult.success) {
        throw new Error(`Failed to load tables: ${tablesResult.error}`)
      }

      if (!ordersResult.success) {
        throw new Error(`Failed to load orders: ${ordersResult.error}`)
      }

      if (!paymentsResult.success) {
        throw new Error(`Failed to load payments: ${paymentsResult.error}`)
      }

      // TODO: Инициализация интеграций
      // await initializeIntegrations()

      isInitialized.value = true
      lastSync.value = new Date().toISOString()

      console.log('✅ POS система инициализирована успешно')

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize POS'
      error.value = errorMsg
      console.error('❌ Ошибка инициализации POS:', errorMsg)

      return { success: false, error: errorMsg }
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
      localStorage.setItem('pos_current_shift', JSON.stringify(currentShift.value))

      console.log(`✅ Смена начата: ${shiftId}`)

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

      const finalReport: ShiftReport = {
        ...report,
        endTime: new Date().toISOString()
      }

      // Сохраняем отчет смены
      const shiftReports = JSON.parse(localStorage.getItem('pos_shift_reports') || '[]')
      shiftReports.push(finalReport)
      localStorage.setItem('pos_shift_reports', JSON.stringify(shiftReports))

      // Очищаем текущую смену
      currentShift.value = null
      localStorage.removeItem('pos_current_shift')

      console.log('✅ Смена завершена:', finalReport.shiftId)

      return { success: true, data: finalReport }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end shift'
      error.value = errorMsg

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Быстрое создание заказа с автоматическим выбором стола
   */
  async function createQuickOrder(
    type: 'dine_in' | 'takeaway' | 'delivery',
    customerName?: string
  ): Promise<ServiceResponse<string>> {
    try {
      let tableId: string | undefined

      // Если заказ в зале, найти свободный стол
      if (type === 'dine_in') {
        const freeTable = tablesStore.freeTables[0]
        if (!freeTable) {
          throw new Error('No free tables available')
        }
        tableId = freeTable.id
      }

      // Создать заказ
      const orderResult = await ordersStore.createOrder(type, tableId, customerName)

      if (!orderResult.success || !orderResult.data) {
        throw new Error(orderResult.error || 'Failed to create order')
      }

      return { success: true, data: orderResult.data.id }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create quick order'
      error.value = errorMsg

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Синхронизация с внешними системами
   */
  async function syncData(): Promise<ServiceResponse<void>> {
    try {
      // TODO: Синхронизация с inventory, menu, accounts
      // await InventorySync.sync()
      // await MenuAdapter.refresh()
      // await FinanceSync.sync()

      lastSync.value = new Date().toISOString()

      console.log('✅ Данные синхронизированы')

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync data'
      error.value = errorMsg

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Получить общую статистику POS
   */
  function getPOSOverview() {
    return {
      tables: {
        total: tablesStore.tablesStats.total,
        occupied: tablesStore.tablesStats.occupied,
        free: tablesStore.tablesStats.free,
        occupancyRate: tablesStore.tablesStats.occupancyRate
      },
      orders: {
        active: ordersStore.ordersStats.active,
        today: ordersStore.ordersStats.today,
        todayRevenue: ordersStore.ordersStats.todayRevenue
      },
      payments: {
        todayTotal: paymentsStore.paymentsStats.todayTotal,
        todayCount: paymentsStore.paymentsStats.todayCount,
        averageTransaction: paymentsStore.paymentsStats.averageTransaction
      }
    }
  }

  /**
   * Проверить доступность системы
   */
  function checkSystemHealth(): {
    status: 'healthy' | 'warning' | 'error'
    issues: string[]
  } {
    const issues: string[] = []

    if (!isInitialized.value) {
      issues.push('System not initialized')
    }

    if (!isOnline.value) {
      issues.push('System offline')
    }

    if (tablesStore.error) {
      issues.push(`Tables error: ${tablesStore.error}`)
    }

    if (ordersStore.error) {
      issues.push(`Orders error: ${ordersStore.error}`)
    }

    if (paymentsStore.error) {
      issues.push(`Payments error: ${paymentsStore.error}`)
    }

    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('error')) ? 'error' : 'warning'
    }

    return { status, issues }
  }

  /**
   * Очистить все ошибки
   */
  function clearAllErrors(): void {
    error.value = null
    tablesStore.clearError()
    ordersStore.clearError()
    paymentsStore.clearError()
  }

  /**
   * Восстановить смену из localStorage
   */
  function restoreShift(): void {
    const stored = localStorage.getItem('pos_current_shift')
    if (stored) {
      try {
        currentShift.value = JSON.parse(stored)
        console.log('✅ Смена восстановлена:', currentShift.value?.id)
      } catch (err) {
        console.error('❌ Ошибка восстановления смены:', err)
        localStorage.removeItem('pos_current_shift')
      }
    }
  }

  // ===== WATCHERS =====

  // Отслеживание статуса сети
  watch(isOnline, online => {
    if (online) {
      console.log('🌐 Соединение восстановлено')
      // TODO: Синхронизация данных при восстановлении соединения
      // syncData()
    } else {
      console.log('📡 Соединение потеряно')
    }
  })

  // ===== INITIALIZATION =====

  // Восстанавливаем смену при загрузке
  restoreShift()

  // Слушаем события сети
  window.addEventListener('online', () => {
    isOnline.value = true
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  return {
    // State
    isInitialized,
    isOnline,
    lastSync,
    error,
    currentShift,

    // Computed
    isReady,
    dailyStats,
    currentShiftReport,

    // Stores
    tablesStore,
    ordersStore,
    paymentsStore,

    // Actions
    initializePOS,
    startShift,
    endShift,
    createQuickOrder,
    syncData,
    getPOSOverview,
    checkSystemHealth,
    clearAllErrors,
    restoreShift
  }
})
