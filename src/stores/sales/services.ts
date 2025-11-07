import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { SalesTransaction, SalesFilters, SalesStatistics, TopSellingItem } from './types'
import type { PaymentMethod } from '@/stores/pos/types'

const STORAGE_KEY = 'sales_transactions'

/**
 * Sales Service
 * CRUD операции для sales transactions с localStorage
 */
export class SalesService {
  /**
   * Get all sales transactions
   */
  static async getAllTransactions(): Promise<ServiceResponse<SalesTransaction[]>> {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      const transactions: SalesTransaction[] = data ? JSON.parse(data) : []

      return {
        success: true,
        data: transactions,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get sales transactions: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get sales transactions with filters
   */
  static async getTransactions(
    filters?: SalesFilters
  ): Promise<ServiceResponse<SalesTransaction[]>> {
    try {
      const allResult = await this.getAllTransactions()
      if (!allResult.success || !allResult.data) {
        return allResult
      }

      let filtered = allResult.data

      // Apply filters
      if (filters) {
        if (filters.dateFrom) {
          filtered = filtered.filter(t => t.soldAt >= filters.dateFrom!)
        }
        if (filters.dateTo) {
          filtered = filtered.filter(t => t.soldAt <= filters.dateTo!)
        }
        if (filters.menuItemId) {
          filtered = filtered.filter(t => t.menuItemId === filters.menuItemId)
        }
        if (filters.paymentMethod) {
          filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod)
        }
        if (filters.department) {
          filtered = filtered.filter(t => t.department === filters.department)
        }
        if (filters.shiftId) {
          filtered = filtered.filter(t => t.shiftId === filters.shiftId)
        }
      }

      return {
        success: true,
        data: filtered,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to filter sales transactions: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get single sales transaction by ID
   */
  static async getTransactionById(id: string): Promise<ServiceResponse<SalesTransaction>> {
    try {
      const allResult = await this.getAllTransactions()
      if (!allResult.success || !allResult.data) {
        return {
          success: false,
          error: 'Failed to get transactions',
          metadata: allResult.metadata
        }
      }

      const transaction = allResult.data.find(t => t.id === id)
      if (!transaction) {
        return {
          success: false,
          error: `Transaction not found: ${id}`,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local',
            platform: 'web'
          }
        }
      }

      return {
        success: true,
        data: transaction,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get transaction: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Save sales transaction
   */
  static async saveSalesTransaction(
    transaction: SalesTransaction
  ): Promise<ServiceResponse<SalesTransaction>> {
    try {
      const allResult = await this.getAllTransactions()
      if (!allResult.success) {
        return {
          success: false,
          error: 'Failed to get existing transactions',
          metadata: allResult.metadata
        }
      }

      const transactions = allResult.data || []
      const existingIndex = transactions.findIndex(t => t.id === transaction.id)

      if (existingIndex >= 0) {
        // Update existing
        transactions[existingIndex] = {
          ...transaction,
          updatedAt: new Date().toISOString()
        }
      } else {
        // Add new
        transactions.push(transaction)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))

      return {
        success: true,
        data: transaction,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save sales transaction: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get sales statistics
   */
  static async getStatistics(filters?: SalesFilters): Promise<ServiceResponse<SalesStatistics>> {
    try {
      const result = await this.getTransactions(filters)
      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get transactions for statistics',
          metadata: result.metadata
        }
      }

      const transactions = result.data

      // Calculate statistics
      const totalRevenue = transactions.reduce(
        (sum, t) => sum + t.profitCalculation.finalRevenue,
        0
      )
      const totalCost = transactions.reduce(
        (sum, t) => sum + t.profitCalculation.ingredientsCost,
        0
      )
      const totalProfit = totalRevenue - totalCost
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      const totalTransactions = transactions.length
      const totalItemsSold = transactions.reduce((sum, t) => sum + t.quantity, 0)

      // Revenue by payment method
      const revenueByPaymentMethod: Record<string, number> = {}
      transactions.forEach(t => {
        if (!revenueByPaymentMethod[t.paymentMethod]) {
          revenueByPaymentMethod[t.paymentMethod] = 0
        }
        revenueByPaymentMethod[t.paymentMethod] += t.profitCalculation.finalRevenue
      })

      // Revenue by department
      const revenueByDepartment = {
        kitchen: transactions
          .filter(t => t.department === 'kitchen')
          .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0),
        bar: transactions
          .filter(t => t.department === 'bar')
          .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0)
      }

      // Top selling items
      const itemsMap = new Map<string, TopSellingItem>()
      transactions.forEach(t => {
        const key = t.menuItemId
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            menuItemId: t.menuItemId,
            menuItemName: t.menuItemName,
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averageMargin: 0
          })
        }

        const item = itemsMap.get(key)!
        item.quantitySold += t.quantity
        item.totalRevenue += t.profitCalculation.finalRevenue
        item.totalCost += t.profitCalculation.ingredientsCost
        item.totalProfit += t.profitCalculation.profit
      })

      const topSellingItems = Array.from(itemsMap.values())
        .map(item => ({
          ...item,
          averageMargin: item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10) // Top 10

      const statistics: SalesStatistics = {
        totalRevenue,
        totalCost,
        totalProfit,
        averageMargin,
        totalTransactions,
        totalItemsSold,
        revenueByPaymentMethod: revenueByPaymentMethod as Record<PaymentMethod, number>,
        revenueByDepartment,
        topSellingItems
      }

      return {
        success: true,
        data: statistics,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to calculate statistics: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Delete sales transaction
   */
  static async deleteTransaction(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const allResult = await this.getAllTransactions()
      if (!allResult.success || !allResult.data) {
        return {
          success: false,
          error: 'Failed to get transactions',
          metadata: allResult.metadata
        }
      }

      const transactions = allResult.data.filter(t => t.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete transaction: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Clear all transactions (для тестирования)
   */
  static async clearAll(): Promise<ServiceResponse<boolean>> {
    try {
      localStorage.removeItem(STORAGE_KEY)
      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear transactions: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }
}
