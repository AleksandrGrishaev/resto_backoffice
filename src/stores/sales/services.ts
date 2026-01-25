import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { SalesTransaction, SalesFilters, SalesStatistics, TopSellingItem } from './types'
import type { PaymentMethod } from '@/stores/pos/types'
import { supabase } from '@/supabase/client'
import { toSupabase, fromSupabase } from './supabase/mappers'

const STORAGE_KEY = 'sales_transactions'

/**
 * Sales Service
 * CRUD операции для sales transactions с Supabase (dual-write с localStorage)
 */
export class SalesService {
  /**
   * Get all sales transactions
   * NOTE: Uses pagination to bypass Supabase's default 1000 row limit
   */
  static async getAllTransactions(): Promise<ServiceResponse<SalesTransaction[]>> {
    try {
      // Try Supabase first with pagination to get ALL records
      // Supabase default limit is 1000 rows, so we need to paginate
      const PAGE_SIZE = 1000
      let allData: any[] = []
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*')
          .order('sold_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)

        if (error) {
          console.warn(
            '⚠️ [SalesService] Supabase query failed, falling back to localStorage:',
            error.message
          )

          // Fallback to localStorage
          const localData = localStorage.getItem(STORAGE_KEY)
          const transactions: SalesTransaction[] = localData ? JSON.parse(localData) : []

          return {
            success: true,
            data: transactions,
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'local',
              platform: 'web'
            }
          }
        }

        if (data && data.length > 0) {
          allData = allData.concat(data)
          from += PAGE_SIZE
          // If we got less than PAGE_SIZE, we've reached the end
          hasMore = data.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      const transactions = allData.map(fromSupabase)
      console.log(
        `✅ [SalesService] Loaded ${transactions.length} transactions from Supabase (paginated)`
      )

      // Cache to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))

      return {
        success: true,
        data: transactions,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      console.error('❌ [SalesService] Error:', error)
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
   * Optimized: applies date filters on server-side with pagination
   */
  static async getTransactions(
    filters?: SalesFilters
  ): Promise<ServiceResponse<SalesTransaction[]>> {
    try {
      // If date filters provided, query Supabase directly with server-side filtering
      if (filters?.dateFrom || filters?.dateTo) {
        const PAGE_SIZE = 1000
        let allData: any[] = []
        let from = 0
        let hasMore = true

        while (hasMore) {
          let query = supabase
            .from('sales_transactions')
            .select('*')
            .order('sold_at', { ascending: false })

          // Apply date filters on server side
          if (filters.dateFrom) {
            query = query.gte('sold_at', filters.dateFrom)
          }
          if (filters.dateTo) {
            query = query.lte('sold_at', filters.dateTo)
          }

          // Apply other filters on server side if provided
          if (filters.menuItemId) {
            query = query.eq('menu_item_id', filters.menuItemId)
          }
          if (filters.paymentMethod) {
            query = query.eq('payment_method', filters.paymentMethod)
          }
          if (filters.department) {
            query = query.eq('department', filters.department)
          }
          if (filters.shiftId) {
            query = query.eq('shift_id', filters.shiftId)
          }

          // Apply pagination
          query = query.range(from, from + PAGE_SIZE - 1)

          const { data, error } = await query

          if (error) {
            console.warn('⚠️ [SalesService] Supabase filtered query failed:', error.message)
            // Fallback to client-side filtering
            break
          }

          if (data && data.length > 0) {
            allData = allData.concat(data)
            from += PAGE_SIZE
            hasMore = data.length === PAGE_SIZE
          } else {
            hasMore = false
          }
        }

        // If we got data from server, return it
        if (allData.length > 0) {
          const transactions = allData.map(fromSupabase)
          console.log(
            `✅ [SalesService] Loaded ${transactions.length} filtered transactions from Supabase`
          )

          return {
            success: true,
            data: transactions,
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'api',
              platform: 'web'
            }
          }
        }
      }

      // Fallback: get all and filter client-side
      const allResult = await this.getAllTransactions()
      if (!allResult.success || !allResult.data) {
        return allResult
      }

      let filtered = allResult.data

      // Apply filters client-side
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
      const updatedTransaction = {
        ...transaction,
        updatedAt: new Date().toISOString()
      }

      // Dual-write: Supabase + localStorage
      const supabaseData = toSupabase(updatedTransaction)

      const { data, error } = await supabase
        .from('sales_transactions')
        .upsert(supabaseData)
        .select()
        .single()

      if (error) {
        console.warn(
          '⚠️ [SalesService] Supabase save failed, saving to localStorage only:',
          error.message
        )

        // Fallback to localStorage only
        const allResult = await this.getAllTransactions()
        const transactions = allResult.data || []
        const existingIndex = transactions.findIndex(t => t.id === transaction.id)

        if (existingIndex >= 0) {
          transactions[existingIndex] = updatedTransaction
        } else {
          transactions.push(updatedTransaction)
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))

        return {
          success: true,
          data: updatedTransaction,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local',
            platform: 'web'
          }
        }
      }

      console.log(`✅ [SalesService] Transaction saved to Supabase: ${updatedTransaction.id}`)

      // Cache to localStorage (backup)
      const allResult = await this.getAllTransactions()
      const transactions = allResult.data || []
      const existingIndex = transactions.findIndex(t => t.id === transaction.id)

      if (existingIndex >= 0) {
        transactions[existingIndex] = updatedTransaction
      } else {
        transactions.push(updatedTransaction)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
      console.log(`💾 [SalesService] Transaction cached to localStorage (backup)`)

      return {
        success: true,
        data: fromSupabase(data),
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      console.error('❌ [SalesService] Error:', error)
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
