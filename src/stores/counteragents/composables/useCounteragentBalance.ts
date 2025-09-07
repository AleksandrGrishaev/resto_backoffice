// src/stores/counteragents/composables/useCounteragentBalance.ts

/**
 * Простой composable для работы с балансами контрагентов
 * Без переусложнения - только то, что нужно для ТЗ
 */
export function useCounteragentBalance() {
  /**
   * Рассчитать баланс контрагента из платежей
   */
  const calculateBalance = async (counteragentId: string): Promise<number> => {
    try {
      const { useAccountStore } = await import('@/stores/account')
      const accountStore = useAccountStore()

      const payments = accountStore.state.pendingPayments.filter(
        payment => payment.counteragentId === counteragentId && payment.status === 'completed'
      )

      // Доступный баланс = сумма всех availableAmount (переплат)
      return payments.reduce((sum, payment) => sum + (payment.availableAmount || 0), 0)
    } catch (error) {
      console.error('Failed to calculate balance:', error)
      return 0
    }
  }

  /**
   * Обновить баланс контрагента
   */
  const updateCounteragentBalance = async (counteragentId: string): Promise<void> => {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const counteragent = counteragentsStore.counteragents.find(ca => ca.id === counteragentId)
      if (counteragent) {
        counteragent.currentBalance = await calculateBalance(counteragentId)
        counteragent.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update balance:', error)
    }
  }

  /**
   * Обновить балансы всех поставщиков
   */
  const syncAllSupplierBalances = async (): Promise<void> => {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents')
      const counteragentsStore = useCounteragentsStore()

      const suppliers = counteragentsStore.counteragents.filter(ca => ca.type === 'supplier')

      // Обновляем балансы последовательно (простое решение)
      for (const supplier of suppliers) {
        await updateCounteragentBalance(supplier.id)
      }

      console.log(`Updated balances for ${suppliers.length} suppliers`)
    } catch (error) {
      console.error('Failed to sync supplier balances:', error)
    }
  }

  /**
   * Форматировать баланс для отображения
   */
  const formatBalance = (balance: number): string => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(balance))

    if (balance > 0) return `+${formatted}`
    if (balance < 0) return `-${formatted}`
    return formatted
  }

  /**
   * Получить цвет для баланса
   */
  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return 'success' // кредит (переплата)
    if (balance < 0) return 'warning' // долг
    return 'default' // ноль
  }

  /**
   * Получить иконку для баланса
   */
  const getBalanceIcon = (balance: number): string => {
    if (balance > 0) return 'mdi-arrow-up-circle'
    if (balance < 0) return 'mdi-arrow-down-circle'
    return 'mdi-check-circle'
  }

  /**
   * Получить текст статуса баланса
   */
  const getBalanceText = (balance: number): string => {
    if (balance > 0) return 'Credit'
    if (balance < 0) return 'Debt'
    return 'Balanced'
  }

  return {
    // Расчеты
    calculateBalance,
    updateCounteragentBalance,
    syncAllSupplierBalances,

    // Форматирование для UI
    formatBalance,
    getBalanceColor,
    getBalanceIcon,
    getBalanceText
  }
}
