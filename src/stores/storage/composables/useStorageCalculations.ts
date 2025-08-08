// src/stores/storage/composables/useStorageCalculations.ts
import { computed } from 'vue'
import { fifoCalculationService } from '../services/fifoCalculationService'
import type {
  StorageBatch,
  StorageBalance,
  StorageDepartment,
  StorageItemType,
  BatchAllocation
} from '../types'

/**
 * Composable для расчетов FIFO и срока годности
 * Отвечает за: FIFO calculations, expiry info, cost calculations
 */
export function useStorageCalculations() {
  // ==========================================
  // EXPIRY CALCULATIONS
  // ==========================================

  /**
   * Рассчитывает информацию о сроке годности
   */
  function calculateExpiryInfo(batches: StorageBatch[]) {
    return fifoCalculationService.calculateExpiryInfo(batches)
  }

  /**
   * Форматирует дату истечения для UI
   */
  function formatExpiryDate(expiryInfo: any): string {
    return fifoCalculationService.formatExpiryDate(expiryInfo)
  }

  /**
   * Получает цвет статуса срока годности
   */
  function getExpiryStatusColor(expiryInfo: any): string {
    switch (expiryInfo.expiryStatus) {
      case 'expired':
        return 'error'
      case 'expiring':
        return 'warning'
      default:
        return 'success'
    }
  }

  /**
   * Получает иконку статуса срока годности
   */
  function getExpiryStatusIcon(expiryInfo: any): string {
    switch (expiryInfo.expiryStatus) {
      case 'expired':
        return 'mdi-alert-circle'
      case 'expiring':
        return 'mdi-clock-alert'
      default:
        return 'mdi-check-circle'
    }
  }

  // ==========================================
  // FIFO CALCULATIONS
  // ==========================================

  /**
   * Рассчитывает FIFO распределение для списания
   */
  function calculateFifoAllocation(
    batches: StorageBatch[],
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    return fifoCalculationService.calculateFifoAllocation(batches, quantity)
  }

  /**
   * Рассчитывает стоимость списания по FIFO
   */
  function calculateConsumptionCost(batches: StorageBatch[], quantity: number): number {
    return fifoCalculationService.calculateConsumptionCost(batches, quantity)
  }

  /**
   * Обновляет батчи после списания
   */
  function updateBatchesAfterConsumption(
    batches: StorageBatch[],
    allocations: BatchAllocation[]
  ): StorageBatch[] {
    return fifoCalculationService.updateBatchesAfterConsumption(batches, allocations)
  }

  // ==========================================
  // BALANCE CALCULATIONS
  // ==========================================

  /**
   * Обогащает балансы информацией о сроке годности
   */
  function enrichBalancesWithExpiryInfo(balances: StorageBalance[]) {
    return balances.map(balance => {
      const expiryInfo = calculateExpiryInfo(balance.batches)
      return {
        ...balance,
        expiryInfo,
        hasExpired: expiryInfo.hasExpired,
        hasNearExpiry: expiryInfo.hasNearExpiry
      }
    })
  }

  /**
   * Фильтрует балансы по различным критериям
   */
  function filterBalances(
    balances: StorageBalance[],
    filters: {
      department?: StorageDepartment | 'all'
      itemType?: StorageItemType | 'all'
      showExpired?: boolean
      showBelowMinStock?: boolean
      showNearExpiry?: boolean
      search?: string
    }
  ) {
    let filtered = [...balances]

    // Department filter
    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(b => b.department === filters.department)
    }

    // Item type filter
    if (filters.itemType && filters.itemType !== 'all') {
      filtered = filtered.filter(b => b.itemType === filters.itemType)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(b => b.itemName.toLowerCase().includes(searchLower))
    }

    // Status filters
    if (filters.showExpired) {
      filtered = filtered.filter(b => b.hasExpired)
    }
    if (filters.showBelowMinStock) {
      filtered = filtered.filter(b => b.belowMinStock)
    }
    if (filters.showNearExpiry) {
      filtered = filtered.filter(b => b.hasNearExpiry)
    }

    return enrichBalancesWithExpiryInfo(filtered)
  }

  /**
   * Подсчитывает алерты
   */
  function calculateAlertCounts(balances: StorageBalance[]) {
    const enriched = enrichBalancesWithExpiryInfo(balances)
    return {
      expiring: enriched.filter(b => b.hasNearExpiry).length,
      expired: enriched.filter(b => b.hasExpired).length,
      lowStock: enriched.filter(b => b.belowMinStock).length
    }
  }

  /**
   * Получает товары с истекающим сроком годности
   */
  function getExpiringItems(balances: StorageBalance[], days: number = 2) {
    return balances.filter(balance => {
      const expiryInfo = calculateExpiryInfo(balance.batches)
      return (
        expiryInfo.expiryStatus === 'expiring' ||
        (expiryInfo.expiryDaysRemaining !== null && expiryInfo.expiryDaysRemaining <= days)
      )
    })
  }

  /**
   * Получает товары с низким остатком
   */
  function getLowStockItems(balances: StorageBalance[]) {
    return balances.filter(balance => balance.belowMinStock)
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Форматирует валюту
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Форматирует количество с единицей измерения
   */
  function formatQuantity(quantity: number, unit: string): string {
    return `${quantity.toLocaleString()} ${unit}`
  }

  // ==========================================
  // RETURN PUBLIC API
  // ==========================================
  return {
    // Expiry calculations
    calculateExpiryInfo,
    formatExpiryDate,
    getExpiryStatusColor,
    getExpiryStatusIcon,

    // FIFO calculations
    calculateFifoAllocation,
    calculateConsumptionCost,
    updateBatchesAfterConsumption,

    // Balance operations
    enrichBalancesWithExpiryInfo,
    filterBalances,
    calculateAlertCounts,
    getExpiringItems,
    getLowStockItems,

    // Utilities
    formatCurrency,
    formatQuantity
  }
}
