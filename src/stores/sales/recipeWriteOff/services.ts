import type { ServiceResponse } from '@/repositories/base/ServiceResponse'
import type { RecipeWriteOff, WriteOffFilters, WriteOffSummary } from './types'

const STORAGE_KEY = 'recipe_writeoffs'

/**
 * Recipe Write-off Service
 * CRUD операции для recipe write-offs с localStorage
 */
export class RecipeWriteOffService {
  /**
   * Get all write-offs
   */
  static async getAllWriteOffs(): Promise<ServiceResponse<RecipeWriteOff[]>> {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      const writeOffs: RecipeWriteOff[] = data ? JSON.parse(data) : []

      return {
        success: true,
        data: writeOffs,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'local',
          platform: 'web'
        }
      }
    } catch (error) {
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
      const allResult = await this.getAllWriteOffs()
      if (!allResult.success) {
        return {
          success: false,
          error: 'Failed to get existing write-offs',
          metadata: allResult.metadata
        }
      }

      const writeOffs = allResult.data || []
      const existingIndex = writeOffs.findIndex(w => w.id === writeOff.id)

      if (existingIndex >= 0) {
        // Update existing
        writeOffs[existingIndex] = {
          ...writeOff,
          updatedAt: new Date().toISOString()
        }
      } else {
        // Add new
        writeOffs.push(writeOff)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(writeOffs))

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

      // Calculate totals
      const totalWriteOffs = writeOffs.length
      const totalCost = writeOffs.reduce(
        (sum, w) => sum + w.writeOffItems.reduce((s, i) => s + i.totalCost, 0),
        0
      )
      const totalItems = writeOffs.reduce((sum, w) => sum + w.writeOffItems.length, 0)

      // By department
      const kitchen = writeOffs.filter(w => w.department === 'kitchen')
      const bar = writeOffs.filter(w => w.department === 'bar')

      const byDepartment = {
        kitchen: {
          count: kitchen.length,
          cost: kitchen.reduce(
            (sum, w) => sum + w.writeOffItems.reduce((s, i) => s + i.totalCost, 0),
            0
          )
        },
        bar: {
          count: bar.length,
          cost: bar.reduce(
            (sum, w) => sum + w.writeOffItems.reduce((s, i) => s + i.totalCost, 0),
            0
          )
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
          cost: autoSales.reduce(
            (sum, w) => sum + w.writeOffItems.reduce((s, i) => s + i.totalCost, 0),
            0
          )
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
