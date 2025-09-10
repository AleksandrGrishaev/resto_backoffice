// src/stores/counteragents/services/balanceCorrectionService.ts

import { DebugUtils } from '@/utils'
import { generateId } from '@/utils/id'
import type {
  Counteragent,
  BalanceHistoryEntry,
  BalanceCorrectionReason,
  CreateBalanceCorrectionDto,
  BalanceCorrectionResult,
  BALANCE_CORRECTION_REASONS,
  REASON_DESCRIPTIONS
} from '../types'

const MODULE_NAME = 'BalanceCorrectionService'

export interface BalanceCorrectionData {
  newBalance: number
  reason: BalanceCorrectionReason
  notes?: string
}

class BalanceCorrectionService {
  /**
   * Применить корректировку баланса контрагента
   */
  async applyBalanceCorrection(
    counteragent: Counteragent,
    correctionData: BalanceCorrectionData,
    userId?: string
  ): Promise<BalanceCorrectionResult> {
    try {
      DebugUtils.info(MODULE_NAME, 'Applying balance correction', {
        counteragentId: counteragent.id,
        oldBalance: counteragent.currentBalance,
        newBalance: correctionData.newBalance,
        reason: correctionData.reason
      })

      const oldBalance = counteragent.currentBalance || 0
      const correctionAmount = correctionData.newBalance - oldBalance

      if (correctionAmount === 0) {
        return {
          success: false,
          oldBalance,
          newBalance: correctionData.newBalance,
          correctionAmount: 0,
          error: 'No correction needed - balance is already at target amount'
        }
      }

      // Создаем запись истории
      const historyEntry: BalanceHistoryEntry = {
        id: generateId('CORR'),
        date: new Date().toISOString(),
        oldBalance,
        newBalance: correctionData.newBalance,
        amount: correctionAmount,
        reason: correctionData.reason,
        notes: correctionData.notes,
        appliedBy: userId || 'system'
      }

      // Обновляем контрагента через store
      await this.updateCounteragentWithHistory(
        counteragent.id,
        correctionData.newBalance,
        historyEntry
      )

      DebugUtils.info(MODULE_NAME, 'Balance correction applied successfully', {
        counteragentId: counteragent.id,
        correctionId: historyEntry.id,
        correctionAmount,
        newBalance: correctionData.newBalance
      })

      return {
        success: true,
        oldBalance,
        newBalance: correctionData.newBalance,
        correctionAmount,
        historyEntry
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply balance correction', {
        error,
        counteragentId: counteragent.id,
        correctionData
      })

      return {
        success: false,
        oldBalance: counteragent.currentBalance || 0,
        newBalance: correctionData.newBalance,
        correctionAmount: correctionData.newBalance - (counteragent.currentBalance || 0),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Обновить контрагента с новым балансом и историей
   */
  private async updateCounteragentWithHistory(
    counteragentId: string,
    newBalance: number,
    historyEntry: BalanceHistoryEntry
  ) {
    const { useCounteragentsStore } = await import('@/stores/counteragents')
    const counteragentsStore = useCounteragentsStore()

    // Получаем текущего контрагента
    const currentCounteragent = await counteragentsStore.getCounteragentById(counteragentId)
    if (!currentCounteragent) {
      throw new Error(`Counteragent with id ${counteragentId} not found`)
    }

    // Обновляем баланс и добавляем в историю
    const existingHistory = currentCounteragent.balanceHistory || []
    const updatedHistory = [...existingHistory, historyEntry]

    await counteragentsStore.updateCounteragent(counteragentId, {
      currentBalance: newBalance,
      balanceHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    })

    DebugUtils.info(MODULE_NAME, 'Counteragent updated with balance history', {
      counteragentId,
      newBalance,
      historyLength: updatedHistory.length
    })
  }

  /**
   * Получить историю корректировок контрагента
   */
  async getBalanceHistory(counteragentId: string): Promise<BalanceHistoryEntry[]> {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const counteragent = await counteragentsStore.getCounteragentById(counteragentId)
      if (!counteragent) {
        return []
      }

      return (counteragent.balanceHistory || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance history', { counteragentId, error })
      return []
    }
  }

  /**
   * Получить статистику корректировок
   */
  async getBalanceStats(counteragentId: string) {
    try {
      const history = await this.getBalanceHistory(counteragentId)

      const totalIncreases = history
        .filter(entry => entry.amount > 0)
        .reduce((sum, entry) => sum + entry.amount, 0)

      const totalDecreases = history
        .filter(entry => entry.amount < 0)
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)

      return {
        totalCorrections: history.length,
        totalIncreases,
        totalDecreases,
        netChange: totalIncreases - totalDecreases,
        lastCorrectionDate: history[0]?.date || null
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get balance stats', { counteragentId, error })
      return {
        totalCorrections: 0,
        totalIncreases: 0,
        totalDecreases: 0,
        netChange: 0,
        lastCorrectionDate: null
      }
    }
  }

  /**
   * Удалить запись из истории (для администрирования)
   */
  async removeHistoryEntry(counteragentId: string, historyEntryId: string): Promise<boolean> {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const counteragent = await counteragentsStore.getCounteragentById(counteragentId)
      if (!counteragent) {
        return false
      }

      const updatedHistory = (counteragent.balanceHistory || []).filter(
        entry => entry.id !== historyEntryId
      )

      await counteragentsStore.updateCounteragent(counteragentId, {
        balanceHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'History entry removed', { counteragentId, historyEntryId })
      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove history entry', {
        counteragentId,
        historyEntryId,
        error
      })
      return false
    }
  }

  /**
   * Валидация данных корректировки
   */
  validateCorrectionData(
    correctionData: BalanceCorrectionData,
    currentBalance: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Проверка суммы
    if (typeof correctionData.newBalance !== 'number' || isNaN(correctionData.newBalance)) {
      errors.push('New balance must be a valid number')
    }

    // Проверка причины
    if (!correctionData.reason) {
      errors.push('Correction reason is required')
    }

    // Проверка что есть изменение
    if (correctionData.newBalance === currentBalance) {
      errors.push('New balance must be different from current balance')
    }

    // Проверка заметок для "other"
    if (correctionData.reason === 'other' && !correctionData.notes?.trim()) {
      errors.push('Notes are required when reason is "Other"')
    }

    // Проверка разумных лимитов
    if (Math.abs(correctionData.newBalance) > 999999999999) {
      errors.push('Balance amount is too large')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Получить информацию о корректировке для предварительного просмотра
   */
  getPreviewInfo(newBalance: number, currentBalance: number) {
    const correctionAmount = newBalance - currentBalance

    return {
      correctionAmount,
      isIncrease: correctionAmount > 0,
      isDecrease: correctionAmount < 0,
      hasChange: correctionAmount !== 0,
      formattedAmount: Math.abs(correctionAmount),
      description:
        correctionAmount > 0
          ? `Increase balance by ${Math.abs(correctionAmount).toLocaleString('id-ID')} IDR`
          : `Decrease balance by ${Math.abs(correctionAmount).toLocaleString('id-ID')} IDR`
    }
  }
}

// Экспортируем синглтон
export const balanceCorrectionService = new BalanceCorrectionService()

// Экспортируем константы
export { BALANCE_CORRECTION_REASONS, REASON_DESCRIPTIONS } from '../types'
