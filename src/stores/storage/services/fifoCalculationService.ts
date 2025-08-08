// src/stores/storage/services/fifoCalculationService.ts
import { TimeUtils, DebugUtils } from '@/utils'
import type { StorageBatch, BatchAllocation, ExpiryInfo } from '../types'

const MODULE_NAME = 'FifoCalculationService'

/**
 * Сервис для FIFO расчетов и работы со сроком годности
 * Отвечает за: FIFO алгоритм, расчет стоимости, срок годности
 */
export class FifoCalculationService {
  // ==========================================
  // FIFO CALCULATIONS
  // ==========================================

  /**
   * Рассчитывает FIFO распределение для списания
   */
  calculateFifoAllocation(
    batches: StorageBatch[],
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const allocations: BatchAllocation[] = []
      let remainingQuantity = quantity

      // Сортируем батчи по дате поступления (FIFO - старейший первый)
      const sortedBatches = [...batches]
        .filter(batch => batch.currentQuantity > 0 && batch.status === 'active')
        .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

      for (const batch of sortedBatches) {
        if (remainingQuantity <= 0) break

        const allocatedQuantity = Math.min(batch.currentQuantity, remainingQuantity)

        if (allocatedQuantity > 0) {
          allocations.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: allocatedQuantity,
            costPerUnit: batch.costPerUnit,
            batchDate: batch.receiptDate
          })

          remainingQuantity -= allocatedQuantity
        }
      }

      return { allocations, remainingQuantity }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  /**
   * Рассчитывает стоимость списания по FIFO
   */
  calculateConsumptionCost(batches: StorageBatch[], quantity: number): number {
    try {
      const { allocations } = this.calculateFifoAllocation(batches, quantity)
      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate consumption cost', { error })
      throw error
    }
  }

  /**
   * Обновляет батчи после списания
   */
  updateBatchesAfterConsumption(
    batches: StorageBatch[],
    allocations: BatchAllocation[]
  ): StorageBatch[] {
    try {
      const updatedBatches = [...batches]

      for (const allocation of allocations) {
        const batchIndex = updatedBatches.findIndex(b => b.id === allocation.batchId)
        if (batchIndex !== -1) {
          const batch = updatedBatches[batchIndex]

          // Обновляем количество
          batch.currentQuantity -= allocation.quantity
          batch.totalValue = batch.currentQuantity * batch.costPerUnit
          batch.updatedAt = TimeUtils.getCurrentLocalISO()

          // Если батч исчерпан, помечаем как неактивный
          if (batch.currentQuantity <= 0) {
            batch.status = 'consumed'
            batch.isActive = false
            batch.currentQuantity = 0
            batch.totalValue = 0
          }
        }
      }

      return updatedBatches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update batches after consumption', { error })
      throw error
    }
  }

  // ==========================================
  // EXPIRY CALCULATIONS
  // ==========================================

  /**
   * Рассчитывает информацию о сроке годности для товара
   */
  calculateExpiryInfo(batches: StorageBatch[]): ExpiryInfo {
    try {
      if (!batches || batches.length === 0) {
        return {
          nearestExpiry: null,
          expiryStatus: 'fresh',
          expiryDaysRemaining: null,
          hasExpired: false,
          hasNearExpiry: false
        }
      }

      // Фильтруем активные батчи со сроком годности
      const activeBatchesWithExpiry = batches.filter(
        batch => batch.currentQuantity > 0 && batch.expiryDate && batch.status === 'active'
      )

      if (activeBatchesWithExpiry.length === 0) {
        return {
          nearestExpiry: null,
          expiryStatus: 'fresh',
          expiryDaysRemaining: null,
          hasExpired: false,
          hasNearExpiry: false
        }
      }

      // Сортируем по дате истечения (FIFO - ближайший срок первый)
      const sortedBatches = activeBatchesWithExpiry.sort((a, b) => {
        const dateA = new Date(a.expiryDate!).getTime()
        const dateB = new Date(b.expiryDate!).getTime()
        return dateA - dateB
      })

      const nearestBatch = sortedBatches[0]
      const nearestExpiry = nearestBatch.expiryDate!
      const now = new Date()
      const expiryDate = new Date(nearestExpiry)

      // Рассчитываем дни до истечения
      const timeDiff = expiryDate.getTime() - now.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

      // Определяем статус
      let expiryStatus: 'fresh' | 'expiring' | 'expired'
      let hasExpired = false
      let hasNearExpiry = false

      if (daysDiff < 0) {
        expiryStatus = 'expired'
        hasExpired = true
      } else if (daysDiff <= 2) {
        expiryStatus = 'expiring'
        hasNearExpiry = true
      } else {
        expiryStatus = 'fresh'
      }

      return {
        nearestExpiry,
        expiryStatus,
        expiryDaysRemaining: daysDiff >= 0 ? daysDiff : null,
        hasExpired,
        hasNearExpiry
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate expiry info', { error })
      return {
        nearestExpiry: null,
        expiryStatus: 'fresh',
        expiryDaysRemaining: null,
        hasExpired: false,
        hasNearExpiry: false
      }
    }
  }

  /**
   * Форматирует дату истечения для отображения
   */
  formatExpiryDate(expiryInfo: ExpiryInfo): string {
    try {
      if (!expiryInfo.nearestExpiry) return '-'

      const date = new Date(expiryInfo.nearestExpiry)
      const diffDays = expiryInfo.expiryDaysRemaining

      if (expiryInfo.hasExpired) {
        return `Expired ${Math.abs(diffDays || 0)} days ago`
      }

      if (diffDays === 0) {
        return 'Expires today'
      }

      if (diffDays === 1) {
        return 'Expires tomorrow'
      }

      if (diffDays && diffDays <= 7) {
        return `${diffDays} days left`
      }

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to format expiry date', { error })
      return '-'
    }
  }

  // ==========================================
  // COST ANALYTICS
  // ==========================================

  /**
   * Рассчитывает средневзвешенную стоимость
   */
  calculateAverageCost(batches: StorageBatch[]): number {
    try {
      const activeBatches = batches.filter(b => b.currentQuantity > 0 && b.status === 'active')

      if (activeBatches.length === 0) return 0

      const totalValue = activeBatches.reduce((sum, b) => sum + b.totalValue, 0)
      const totalQuantity = activeBatches.reduce((sum, b) => sum + b.currentQuantity, 0)

      return totalQuantity > 0 ? totalValue / totalQuantity : 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate average cost', { error })
      return 0
    }
  }

  /**
   * Определяет тренд цен
   */
  calculateCostTrend(batches: StorageBatch[]): 'up' | 'down' | 'stable' {
    try {
      const activeBatches = batches
        .filter(b => b.currentQuantity > 0 && b.status === 'active')
        .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

      if (activeBatches.length < 2) return 'stable'

      const oldestCost = activeBatches[0].costPerUnit
      const newestCost = activeBatches[activeBatches.length - 1].costPerUnit

      if (newestCost > oldestCost * 1.05) return 'up'
      if (newestCost < oldestCost * 0.95) return 'down'
      return 'stable'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate cost trend', { error })
      return 'stable'
    }
  }

  // ==========================================
  // VALIDATION HELPERS
  // ==========================================

  /**
   * Проверяет достаточность остатков для списания
   */
  validateSufficientStock(
    batches: StorageBatch[],
    requiredQuantity: number
  ): {
    sufficient: boolean
    availableQuantity: number
    shortfall: number
  } {
    try {
      const availableQuantity = batches
        .filter(b => b.currentQuantity > 0 && b.status === 'active')
        .reduce((sum, b) => sum + b.currentQuantity, 0)

      const sufficient = availableQuantity >= requiredQuantity
      const shortfall = sufficient ? 0 : requiredQuantity - availableQuantity

      return {
        sufficient,
        availableQuantity,
        shortfall
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to validate stock', { error })
      return {
        sufficient: false,
        availableQuantity: 0,
        shortfall: requiredQuantity
      }
    }
  }
}

export const fifoCalculationService = new FifoCalculationService()
