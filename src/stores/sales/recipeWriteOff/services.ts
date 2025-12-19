import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { RecipeWriteOff, WriteOffFilters, WriteOffSummary } from './types'
import { supabase } from '@/supabase/client'
import { toSupabase, fromSupabase } from './supabase/mappers'

const STORAGE_KEY = 'recipe_writeoffs'

/**
 * Recipe Write-off Service
 * CRUD операции для recipe write-offs с Supabase (dual-write с localStorage)
 */
export class RecipeWriteOffService {
  /**
   * Get all write-offs
   */
  static async getAllWriteOffs(): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('recipe_write_offs')
        .select('*')
        .order('performed_at', { ascending: false })

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

      const writeOffs = data ? data.map(fromSupabase) : []
      console.log(`✅ [RecipeWriteOffService] Loaded ${writeOffs.length} write-offs from Supabase`)

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
   */
  static async getWriteOffs(filters?: WriteOffFilters): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success || !allResult.data) {
        return allResult
      }

      let filtered = allResult.data

      // Apply filters
      if (filters) {
        if (filters.dateFrom) {
          filtered = filtered.filter(w => w.performedAt >= filters.dateFrom!)
        }
        if (filters.dateTo) {
          filtered = filtered.filter(w => w.performedAt <= filters.dateTo!)
        }
        if (filters.menuItemId) {
          filtered = filtered.filter(w => w.menuItemId === filters.menuItemId)
        }
        if (filters.department) {
          filtered = filtered.filter(w => w.department === filters.department)
        }
        if (filters.operationType && filters.operationType !== 'all') {
          filtered = filtered.filter(w => w.operationType === filters.operationType)
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
   */
  static async getWriteOffById(id: string): Promise<ServiceResponse<RecipeWriteOff>> {
    try {
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success || !allResult.data) {
        return {
          success: false,
          error: 'Failed to get write-offs',
          metadata: allResult.metadata
        }
      }

      const writeOff = allResult.data.find(w => w.id === id)
      if (!writeOff) {
        return {
          success: false,
          error: `Write-off not found: ${id}`,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local',
            platform: 'web'
          }
        }
      }

      return {
        success: true,
        data: writeOff,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
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
   */
  static async getWriteOffsBySalesTransaction(
    salesTransactionId: string
  ): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success || !allResult.data) {
        return allResult
      }

      const filtered = allResult.data.filter(w => w.salesTransactionId === salesTransactionId)

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
   */
  static async getWriteOffsByMenuItem(
    menuItemId: string
  ): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success || !allResult.data) {
        return allResult
      }

      const filtered = allResult.data.filter(w => w.menuItemId === menuItemId)

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
   */
  static async getSummary(filters?: WriteOffFilters): Promise<ServiceResponse<WriteOffSummary>> {
    try {
      const result = await this.getWriteOffs(filters)
      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get write-offs for summary',
          metadata: result.metadata
        }
      }

      const writeOffs = result.data

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
      const getCost = (writeOff: RecipeWriteOff): number => {
        // Use actual cost if available
        if (actualCostMap.has(writeOff.id)) {
          return actualCostMap.get(writeOff.id)!
        }
        // Fallback to estimated cost from writeOffItems
        return writeOff.writeOffItems.reduce((s, i) => s + i.totalCost, 0)
      }

      // Calculate totals
      const totalWriteOffs = writeOffs.length
      const totalCost = writeOffs.reduce((sum, w) => sum + getCost(w), 0)
      const totalItems = writeOffs.reduce((sum, w) => sum + w.writeOffItems.length, 0)

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
