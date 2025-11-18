// src/stores/preparation/preparationService.ts - Simplified stub for Phase 2 mock cleanup

import { DebugUtils } from '@/utils'
import { useRecipesStore } from '@/stores/recipes'
import type {
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationCorrectionData,
  CreatePreparationInventoryData,
  CreatePreparationWriteOffData,
  BatchAllocation
} from './types'

const MODULE_NAME = 'PreparationService'

/**
 * PreparationService - Simplified stub implementation
 * Full Supabase integration will be implemented in future sprint
 * For Phase 2 cleanup, providing minimal functionality to avoid compilation errors
 */

export class PreparationService {
  private batches: PreparationBatch[] = []
  private operations: PreparationOperation[] = []
  private balances: PreparationBalance[] = []
  private initialized: boolean = false

  // ===========================
  // INITIALIZATION
  // ===========================

  async initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing Preparation Service (stub mode)')

      // Initialize empty arrays - real data will come from Supabase in future sprint
      this.batches = []
      this.operations = []
      this.balances = []

      this.initialized = true
      DebugUtils.info(MODULE_NAME, 'Preparation Service initialized successfully (stub mode)')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize Preparation Service', { error })
      throw error
    }
  }

  // ===========================
  // BATCH OPERATIONS (STUB)
  // ===========================

  async getAllBatches(): Promise<PreparationBatch[]> {
    return [...this.batches]
  }

  async getBatchesByDepartment(department: PreparationDepartment): Promise<PreparationBatch[]> {
    return this.batches.filter(batch => batch.department === department)
  }

  async getBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    if (department) {
      return this.getBatchesByDepartment(department)
    }
    return this.getAllBatches()
  }

  async getBatchById(id: string): Promise<PreparationBatch | null> {
    return this.batches.find(batch => batch.id === id) || null
  }

  async createBatch(data: CreatePreparationReceiptData): Promise<PreparationBatch> {
    DebugUtils.warn(MODULE_NAME, 'createBatch called but not implemented in stub mode', { data })
    throw new Error(
      'Batch creation not implemented in stub mode - will be available in Supabase integration'
    )
  }

  // ===========================
  // OPERATION OPERATIONS (STUB)
  // ===========================

  async getAllOperations(): Promise<PreparationOperation[]> {
    return [...this.operations]
  }

  async getOperationsByDepartment(
    department: PreparationDepartment
  ): Promise<PreparationOperation[]> {
    return this.operations.filter(op => op.department === department)
  }

  async getOperations(department?: PreparationDepartment): Promise<PreparationOperation[]> {
    if (department) {
      return this.getOperationsByDepartment(department)
    }
    return this.getAllOperations()
  }

  async createOperation(
    data:
      | CreatePreparationCorrectionData
      | CreatePreparationInventoryData
      | CreatePreparationWriteOffData
  ): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'createOperation called but not implemented in stub mode', {
      data
    })
    throw new Error(
      'Operation creation not implemented in stub mode - will be available in Supabase integration'
    )
  }

  // ===========================
  // BALANCE OPERATIONS (STUB)
  // ===========================

  async getAllBalances(): Promise<PreparationBalance[]> {
    return [...this.balances]
  }

  async getBalanceByPreparation(preparationId: string): Promise<PreparationBalance | null> {
    return this.balances.find(balance => balance.preparationId === preparationId) || null
  }

  async getBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    // For now, return all balances since they don't have department field
    // In future Supabase implementation, this will be filtered by department
    return [...this.balances]
  }

  async getInventories(department?: PreparationDepartment): Promise<PreparationOperation[]> {
    // Return operations of type inventory
    const inventories = this.operations.filter(op => op.type === 'inventory')
    if (department) {
      return inventories.filter(op => op.department === department)
    }
    return inventories
  }

  // ===========================
  // FIFO CALCULATION (STUB)
  // ===========================

  async calculateFifoAllocation(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): Promise<BatchAllocation[]> {
    DebugUtils.warn(
      MODULE_NAME,
      'calculateFifoAllocation called but not implemented in stub mode',
      { preparationId, department, quantity }
    )
    return [] // Return empty allocation for now
  }

  async calculateCorrectionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): Promise<number> {
    DebugUtils.warn(
      MODULE_NAME,
      'calculateCorrectionCost called but not implemented in stub mode',
      { preparationId, department, quantity }
    )
    return 0 // Return zero cost for now
  }

  // ===========================
  // CREATION OPERATIONS (STUB)
  // ===========================

  async createCorrection(data: CreatePreparationCorrectionData): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'createCorrection called but not implemented in stub mode', {
      data
    })
    throw new Error(
      'Correction creation not implemented in stub mode - will be available in Supabase integration'
    )
  }

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'createReceipt called but not implemented in stub mode', { data })
    throw new Error(
      'Receipt creation not implemented in stub mode - will be available in Supabase integration'
    )
  }

  async createWriteOff(data: CreatePreparationWriteOffData): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'createWriteOff called but not implemented in stub mode', { data })
    throw new Error(
      'Write-off creation not implemented in stub mode - will be available in Supabase integration'
    )
  }

  // ===========================
  // INVENTORY OPERATIONS (STUB)
  // ===========================

  async startInventory(data: CreatePreparationInventoryData): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'startInventory called but not implemented in stub mode', { data })
    throw new Error(
      'Inventory start not implemented in stub mode - will be available in Supabase integration'
    )
  }

  async updateInventory(inventoryId: string, items: any[]): Promise<PreparationOperation> {
    DebugUtils.warn(MODULE_NAME, 'updateInventory called but not implemented in stub mode', {
      inventoryId,
      items
    })
    throw new Error(
      'Inventory update not implemented in stub mode - will be available in Supabase integration'
    )
  }

  async finalizeInventory(inventoryId: string): Promise<PreparationOperation[]> {
    DebugUtils.warn(MODULE_NAME, 'finalizeInventory called but not implemented in stub mode', {
      inventoryId
    })
    return [] // Return empty array for now
  }

  // ===========================
  // STATISTICS (STUB)
  // ===========================

  async getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalWriteOffs: number
    writeOffsCount: number
    averageWriteOff: number
  }> {
    DebugUtils.warn(MODULE_NAME, 'getWriteOffStatistics called but not implemented in stub mode', {
      department,
      dateFrom,
      dateTo
    })

    return {
      totalWriteOffs: 0,
      writeOffsCount: 0,
      averageWriteOff: 0
    }
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  isInitialized(): boolean {
    return this.initialized
  }

  async clearCache(): Promise<void> {
    this.batches = []
    this.operations = []
    this.balances = []
    DebugUtils.info(MODULE_NAME, 'Cache cleared')
  }

  // Stub helper functions that were imported from mock
  private generateBatchNumber(preparationName: string, date: string): string {
    return `BATCH-${preparationName.substring(0, 8).toUpperCase()}-${Date.now()}`
  }

  private getPreparationInfo(preparationId: string) {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find((p: any) => p.id === preparationId)

      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found', { preparationId })
        return {
          name: 'Unknown Preparation',
          code: 'UNKNOWN',
          type: 'semifinished'
        }
      }

      return preparation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation info', { preparationId, error })
      return {
        name: 'Unknown Preparation',
        code: 'UNKNOWN',
        type: 'semifinished'
      }
    }
  }
}

// Export singleton instance
export const preparationService = new PreparationService()
