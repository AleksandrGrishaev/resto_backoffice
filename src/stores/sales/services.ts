import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { SalesTransaction, SalesFilters, SalesStatistics, TopSellingItem } from './types'
import type { PaymentMethod } from '@/stores/pos/types'
import { supabase } from '@/supabase/client'
import { toSupabase, fromSupabase } from './supabase/mappers'

const STORAGE_KEY = 'sales_transactions'

/**
 * Sales Service
 * CRUD операции для sales transactions с Supabase (dual-write с localStorage)
 *
 * ✅ OPTIMIZATION (Jan 2026): Added date limits to prevent loading entire history
 * - Default: last 30 days (~300 records instead of 2783)
 * - Reduces egress from ~9MB to ~1MB per call
 * - Explicit loadAll: true required to load full history
 */

// Lightweight columns for list views (no heavy JSONB fields)
const LIST_COLUMNS = `
  id, payment_id, order_id, bill_id, item_id, shift_id,
  menu_item_id, menu_item_name, variant_id, variant_name,
  quantity, unit_price, total_price, payment_method,
  sold_at, processed_by, department,
  service_tax_amount, government_tax_amount, total_tax_amount,
  created_at, updated_at
`

// Full columns including heavy JSONB (for detail views)
const FULL_COLUMNS = '*'

export class SalesService {
  /**
   * Get all sales transactions
   * ✅ OPTIMIZED: By default loads only last 30 days
   *
   * @param options.loadAll - Load entire history (WARNING: ~9MB, use sparingly)
   * @param options.daysBack - Number of days to load (default: 30)
   * @param options.lightweight - Use lightweight columns without JSONB (default: true for lists)
   */
  static async getAllTransactions(options?: {
    loadAll?: boolean
    daysBack?: number
    lightweight?: boolean
  }): Promise<ServiceResponse<SalesTransaction[]>> {
    const loadAll = options?.loadAll ?? false
    const daysBack = options?.daysBack ?? 30
    const lightweight = options?.lightweight ?? true

    try {
      const PAGE_SIZE = 1000
      let allData: any[] = []
      let from = 0
      let hasMore = true

      // Calculate date filter (default: last 30 days)
      const dateFilter = loadAll
        ? null
        : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

      const columns = lightweight ? LIST_COLUMNS : FULL_COLUMNS

      console.log(`🔄 [SalesService] Loading transactions:`, {
        loadAll,
        daysBack: loadAll ? 'ALL' : daysBack,
        dateFilter: dateFilter ? dateFilter.split('T')[0] : 'none',
        columns: lightweight ? 'lightweight' : 'full'
      })

      while (hasMore) {
        let query = supabase
          .from('sales_transactions')
          .select(columns)
          .order('sold_at', { ascending: false })

        // Apply date filter unless loadAll is true
        if (dateFilter) {
          query = query.gte('sold_at', dateFilter)
        }

        query = query.range(from, from + PAGE_SIZE - 1)

        const { data, error } = await query

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
        `✅ [SalesService] Loaded ${transactions.length} transactions (${loadAll ? 'ALL' : `last ${daysBack} days`})`
      )

      // Cache to localStorage (only if not too large)
      if (transactions.length < 1000) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
      }

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

      // ✅ BUG FIX: Fallback path - log warning and add isFallback flag
      // This happens when Supabase query returned empty OR failed
      console.warn('⚠️ [SalesService] Fallback: Using client-side filtering on all transactions')

      // Fallback: get all and filter client-side
      // ✅ EGRESS FIX: Use loadAll for fallback to ensure complete data for reports
      const allResult = await this.getAllTransactions({ loadAll: true })
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

      console.log(
        `✅ [SalesService] Fallback complete: ${filtered.length} transactions after client-side filter`
      )

      return {
        success: true,
        data: filtered,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api', // ✅ FIX: Data still comes from Supabase, just loaded differently
          platform: 'web',
          isFallback: true // ✅ BUG FIX: Indicate this used fallback path
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
   * ✅ EGRESS FIX: Use loadAll to find old transactions
   */
  static async getTransactionById(id: string): Promise<ServiceResponse<SalesTransaction>> {
    try {
      // ✅ First try direct query (most efficient)
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return {
          success: true,
          data: fromSupabase(data),
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'api',
            platform: 'web'
          }
        }
      }

      // Fallback: search in all transactions
      const allResult = await this.getAllTransactions({ loadAll: true })
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
        // ✅ BUG FIX: Use loadAll to find old transactions in fallback
        const allResult = await this.getAllTransactions({ loadAll: true })
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
      // ✅ BUG FIX: Use loadAll to ensure transaction is found for caching
      const allResult = await this.getAllTransactions({ loadAll: true })
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
      // ✅ BUG FIX: Use loadAll to find old transactions for deletion
      const allResult = await this.getAllTransactions({ loadAll: true })
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
