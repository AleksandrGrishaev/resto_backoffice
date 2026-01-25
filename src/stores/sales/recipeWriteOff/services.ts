import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { RecipeWriteOff, WriteOffFilters, WriteOffSummary } from './types'
import { supabase } from '@/supabase/client'
import { toSupabase, fromSupabase } from './supabase/mappers'

const STORAGE_KEY = 'recipe_writeoffs'

// ✅ BUG FIX: Safe map helper to handle individual item errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeMapFromSupabase(data: any[]): RecipeWriteOff[] {
  const result: RecipeWriteOff[] = []
  for (let i = 0; i < data.length; i++) {
    try {
      result.push(fromSupabase(data[i]))
    } catch (err) {
      console.error(`⚠️ [RecipeWriteOffService] Failed to parse write-off at index ${i}:`, err, {
        rawData: data[i]
      })
      // Skip malformed record but continue processing
    }
  }
  return result
}

// ✅ EGRESS OPTIMIZATION: Lightweight columns (no heavy JSONB)
const LIGHTWEIGHT_COLUMNS = `
  id,
  menu_item_id,
  menu_item_name,
  department,
  operation_type,
  quantity,
  total_cost,
  performed_at,
  performed_by,
  sales_transaction_id,
  created_at,
  updated_at
`

// Full columns including heavy JSONB fields
const FULL_COLUMNS = '*'

export interface GetWriteOffsOptions {
  /** Load all records (default: false - loads last 30 days) */
  loadAll?: boolean
  /** Days to look back (default: 30) */
  daysBack?: number
  /** Use lightweight columns without JSONB (default: true) */
  lightweight?: boolean
  /** Custom limit (default: none for date-filtered, 500 for loadAll) */
  limit?: number
}

/**
 * Recipe Write-off Service
 * CRUD операции для recipe write-offs с Supabase (dual-write с localStorage)
 *
 * ✅ EGRESS OPTIMIZATION (Sprint 6):
 * - Default: loads last 30 days only
 * - Lightweight mode: excludes heavy JSONB fields (write_off_items)
 * - Use loadAll: true for reports that need full history
 */
export class RecipeWriteOffService {
  /**
   * Get all write-offs with optimized loading
   *
   * @param options - Loading options
   * @param options.loadAll - Load all records (default: false)
   * @param options.daysBack - Days to look back (default: 30)
   * @param options.lightweight - Use lightweight columns (default: true)
   */
  static async getAllWriteOffs(
    options: GetWriteOffsOptions = {}
  ): Promise<ServiceResponse<RecipeWriteOff[]>> {
    const { loadAll = false, daysBack = 30, lightweight = true, limit } = options

    try {
      // ✅ OPTIMIZATION: Select only needed columns
      const columns = lightweight ? LIGHTWEIGHT_COLUMNS : FULL_COLUMNS

      let query = supabase
        .from('recipe_write_offs')
        .select(columns)
        .order('performed_at', { ascending: false })

      // ✅ OPTIMIZATION: Apply date filter unless loadAll is true
      // ✅ BUG FIX: Use Date.now() arithmetic for UTC-correct calculation
      if (!loadAll) {
        const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('performed_at', dateFrom)
      }

      // ✅ OPTIMIZATION: Apply limit
      if (limit) {
        query = query.limit(limit)
      } else if (loadAll) {
        query = query.limit(500) // Safety limit for full loads
      }

      const { data, error } = await query

      if (error) {
        console.warn(
          '⚠️ [RecipeWriteOffService] Supabase query failed, falling back to localStorage:',
          error.message
        )

        // Fallback to localStorage
        const localData = localStorage.getItem(STORAGE_KEY)
        const writeOffs: RecipeWriteOff[] = localData ? JSON.parse(localData) : []

        return {
          success: true,
          data: writeOffs,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local',
            platform: 'web'
          }
        }
      }

      // ✅ BUG FIX: Use safe map to handle malformed data
      const writeOffs = data ? safeMapFromSupabase(data) : []
      console.log(
        `✅ [RecipeWriteOffService] Loaded ${writeOffs.length} write-offs from Supabase`,
        { loadAll, daysBack, lightweight }
      )

      // Cache to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(writeOffs))

      return {
        success: true,
        data: writeOffs,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      console.error('❌ [RecipeWriteOffService] Error:', error)
      return {
        success: false,
        error: `Failed to get write-offs: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get write-offs with filters
   * ✅ OPTIMIZED: Uses SQL filtering instead of loading all + filtering in memory
   */
  static async getWriteOffs(filters?: WriteOffFilters): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      // ✅ OPTIMIZATION: Apply filters at SQL level
      let query = supabase
        .from('recipe_write_offs')
        .select(LIGHTWEIGHT_COLUMNS)
        .order('performed_at', { ascending: false })

      // Apply SQL filters
      if (filters) {
        if (filters.dateFrom) {
          query = query.gte('performed_at', filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte('performed_at', filters.dateTo)
        }
        if (filters.menuItemId) {
          query = query.eq('menu_item_id', filters.menuItemId)
        }
        if (filters.department) {
          query = query.eq('department', filters.department)
        }
        if (filters.operationType && filters.operationType !== 'all') {
          query = query.eq('operation_type', filters.operationType)
        }
      } else {
        // Default: last 30 days
        // ✅ BUG FIX: Use Date.now() arithmetic for UTC-correct calculation
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('performed_at', dateFrom)
      }

      // Safety limit
      query = query.limit(500)

      const { data, error } = await query

      if (error) {
        console.warn('⚠️ [RecipeWriteOffService] getWriteOffs failed:', error.message)
        return { success: false, error: error.message }
      }

      const writeOffs = data ? safeMapFromSupabase(data) : []
      console.log(`✅ [RecipeWriteOffService] getWriteOffs loaded ${writeOffs.length} records`)

      return {
        success: true,
        data: writeOffs,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to filter write-offs: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get write-off by ID
   * ✅ OPTIMIZED: Direct query by ID instead of loading all
   */
  static async getWriteOffById(id: string): Promise<ServiceResponse<RecipeWriteOff>> {
    try {
      const { data, error } = await supabase
        .from('recipe_write_offs')
        .select(FULL_COLUMNS) // Full data for single record
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: `Write-off not found: ${id}`,
            metadata: { timestamp: new Date().toISOString(), source: 'api', platform: 'web' }
          }
        }
        throw error
      }

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
      return {
        success: false,
        error: `Failed to get write-off: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get write-offs by sales transaction ID
   * ✅ OPTIMIZED: Direct query by sales_transaction_id
   */
  static async getWriteOffsBySalesTransaction(
    salesTransactionId: string
  ): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      const { data, error } = await supabase
        .from('recipe_write_offs')
        .select(FULL_COLUMNS) // Full data for transaction details
        .eq('sales_transaction_id', salesTransactionId)
        .order('performed_at', { ascending: false })

      if (error) throw error

      const writeOffs = data ? safeMapFromSupabase(data) : []

      return {
        success: true,
        data: writeOffs,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get write-offs by sales transaction: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get write-offs by menu item
   * ✅ OPTIMIZED: Direct query by menu_item_id with date limit
   */
  static async getWriteOffsByMenuItem(
    menuItemId: string
  ): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      // Default: last 30 days
      // ✅ BUG FIX: Use Date.now() arithmetic for UTC-correct calculation
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('recipe_write_offs')
        .select(LIGHTWEIGHT_COLUMNS)
        .eq('menu_item_id', menuItemId)
        .gte('performed_at', dateFrom)
        .order('performed_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const writeOffs = data ? safeMapFromSupabase(data) : []

      return {
        success: true,
        data: writeOffs,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get write-offs by menu item: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Save write-off
   */
  static async saveWriteOff(writeOff: RecipeWriteOff): Promise<ServiceResponse<RecipeWriteOff>> {
    try {
      const updatedWriteOff = {
        ...writeOff,
        updatedAt: new Date().toISOString()
      }

      // Dual-write: Supabase + localStorage
      const supabaseData = toSupabase(updatedWriteOff)

      const { data, error } = await supabase
        .from('recipe_write_offs')
        .upsert(supabaseData)
        .select()
        .single()

      if (error) {
        console.warn(
          '⚠️ [RecipeWriteOffService] Supabase save failed, saving to localStorage only:',
          error.message
        )

        // Fallback to localStorage only
        const allResult = await this.getAllWriteOffs()
        const writeOffs = allResult.data || []
        const existingIndex = writeOffs.findIndex(w => w.id === writeOff.id)

        if (existingIndex >= 0) {
          writeOffs[existingIndex] = updatedWriteOff
        } else {
          writeOffs.push(updatedWriteOff)
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(writeOffs))

        return {
          success: true,
          data: updatedWriteOff,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local',
            platform: 'web'
          }
        }
      }

      console.log(`✅ [RecipeWriteOffService] Write-off saved to Supabase: ${updatedWriteOff.id}`)

      // Cache to localStorage (backup)
      const allResult = await this.getAllWriteOffs()
      const writeOffs = allResult.data || []
      const existingIndex = writeOffs.findIndex(w => w.id === writeOff.id)

      if (existingIndex >= 0) {
        writeOffs[existingIndex] = updatedWriteOff
      } else {
        writeOffs.push(updatedWriteOff)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(writeOffs))
      console.log(`💾 [RecipeWriteOffService] Write-off cached to localStorage (backup)`)

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
      console.error('❌ [RecipeWriteOffService] Error:', error)
      return {
        success: false,
        error: `Failed to save write-off: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Get write-off summary statistics
   * ✅ OPTIMIZED: Uses SQL filtering, loads full data only for filtered period
   */
  static async getSummary(filters?: WriteOffFilters): Promise<ServiceResponse<WriteOffSummary>> {
    try {
      // ✅ OPTIMIZATION: Build optimized SQL query for summary
      // ✅ BUG FIX: Don't load write_off_items JSONB, use total_cost instead
      let query = supabase
        .from('recipe_write_offs')
        .select('id, department, operation_type, sales_transaction_id, total_cost')
        .order('performed_at', { ascending: false })

      // Apply SQL filters
      if (filters) {
        if (filters.dateFrom) {
          query = query.gte('performed_at', filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte('performed_at', filters.dateTo)
        }
        if (filters.menuItemId) {
          query = query.eq('menu_item_id', filters.menuItemId)
        }
        if (filters.department) {
          query = query.eq('department', filters.department)
        }
        if (filters.operationType && filters.operationType !== 'all') {
          query = query.eq('operation_type', filters.operationType)
        }
      } else {
        // Default: last 30 days
        // ✅ BUG FIX: Use Date.now() arithmetic for UTC-correct calculation
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('performed_at', dateFrom)
      }

      query = query.limit(1000) // Higher limit for summary

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: `Failed to get write-offs for summary: ${error.message}`,
          metadata: { timestamp: new Date().toISOString(), source: 'api', platform: 'web' }
        }
      }

      const writeOffs = data ? safeMapFromSupabase(data) : []
      console.log(`✅ [RecipeWriteOffService] getSummary loaded ${writeOffs.length} records`)

      // ✅ FIXED: Load actual costs from sales_transactions for accurate summary
      const actualCostMap = new Map<string, number>()

      // Get all sales transaction IDs
      const transactionIds = writeOffs
        .filter(w => w.salesTransactionId)
        .map(w => w.salesTransactionId!)

      if (transactionIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('sales_transactions')
            .select('id, actual_cost')
            .in('id', transactionIds)

          if (!error && data) {
            // Build map: writeOffId -> actualTotalCost
            for (const writeOff of writeOffs) {
              if (!writeOff.salesTransactionId) continue

              const transaction = data.find(t => t.id === writeOff.salesTransactionId)
              if (transaction?.actual_cost?.totalCost) {
                actualCostMap.set(writeOff.id, transaction.actual_cost.totalCost)
              }
            }

            console.log(
              `✅ [RecipeWriteOffService] Loaded actual costs for ${actualCostMap.size} write-offs in summary`
            )
          }
        } catch (err) {
          console.warn(
            '⚠️ [RecipeWriteOffService] Failed to load actual costs for summary, using estimated costs:',
            err
          )
        }
      }

      // Helper function to get cost (actual or estimated)
      // ✅ BUG FIX: Safe access to writeOffItems with null check
      const getCost = (writeOff: RecipeWriteOff): number => {
        // Use actual cost if available
        if (actualCostMap.has(writeOff.id)) {
          return actualCostMap.get(writeOff.id)!
        }
        // Fallback to estimated cost from writeOffItems (with null check)
        if (!writeOff.writeOffItems || !Array.isArray(writeOff.writeOffItems)) {
          return writeOff.totalCost || 0
        }
        return writeOff.writeOffItems.reduce((s, i) => s + i.totalCost, 0)
      }

      // ✅ BUG FIX: For summary, count each write-off as 1 item
      // We don't load writeOffItems JSONB for performance, so we estimate
      const getItemsCount = (_writeOff: RecipeWriteOff): number => {
        // Each write-off represents at least 1 menu item
        return 1
      }

      // Calculate totals
      const totalWriteOffs = writeOffs.length
      const totalCost = writeOffs.reduce((sum, w) => sum + getCost(w), 0)
      const totalItems = writeOffs.reduce((sum, w) => sum + getItemsCount(w), 0)

      // By department
      const kitchen = writeOffs.filter(w => w.department === 'kitchen')
      const bar = writeOffs.filter(w => w.department === 'bar')

      const byDepartment = {
        kitchen: {
          count: kitchen.length,
          cost: kitchen.reduce((sum, w) => sum + getCost(w), 0)
        },
        bar: {
          count: bar.length,
          cost: bar.reduce((sum, w) => sum + getCost(w), 0)
        }
      }

      // By type
      const autoSales = writeOffs.filter(w => w.operationType === 'auto_sales_writeoff')

      const byType = {
        manual: {
          count: 0, // Manual write-offs tracked separately in storage
          cost: 0
        },
        auto_sales_writeoff: {
          count: autoSales.length,
          cost: autoSales.reduce((sum, w) => sum + getCost(w), 0)
        }
      }

      const summary: WriteOffSummary = {
        totalWriteOffs,
        totalCost,
        totalItems,
        byDepartment,
        byType
      }

      return {
        success: true,
        data: summary,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to calculate summary: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Delete write-off
   */
  static async deleteWriteOff(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success || !allResult.data) {
        return {
          success: false,
          error: 'Failed to get write-offs',
          metadata: allResult.metadata
        }
      }

      const writeOffs = allResult.data.filter(w => w.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(writeOffs))

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
        error: `Failed to delete write-off: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }

  /**
   * Clear all write-offs (для тестирования)
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
        error: `Failed to clear write-offs: ${error}`,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    }
  }
}
