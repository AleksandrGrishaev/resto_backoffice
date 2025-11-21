// src/stores/preparation/preparationService.ts - UPDATED: Supabase Integration
import { DebugUtils, TimeUtils } from '@/utils'
import { useRecipesStore } from '@/stores/recipes'
import { supabase } from '@/supabase/client'
import {
  batchFromSupabase,
  batchToSupabase,
  batchToSupabaseUpdate,
  operationFromSupabase,
  operationToSupabase,
  inventoryDocumentFromSupabase,
  inventoryDocumentToSupabase,
  inventoryDocumentToSupabaseUpdate
} from './supabase/mappers'

// ✅ UPDATED: Import new types
import type {
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationCorrectionData,
  CreatePreparationInventoryData,
  CreatePreparationWriteOffData,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationWriteOffStatistics,
  BatchAllocation
} from './types'

// ✅ UPDATED: Import write-off helper function
import { doesPreparationWriteOffAffectKPI } from './types'

const MODULE_NAME = 'PreparationService'

export class PreparationService {
  private batches: PreparationBatch[] = []
  private operations: PreparationOperation[] = []
  private balances: PreparationBalance[] = []
  private inventories: PreparationInventoryDocument[] = []
  private initialized: boolean = false

  // ===========================
  // HELPER METHODS
  // ===========================

  private generateBatchNumber(preparationName: string, date: string): string {
    const shortName =
      preparationName
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4) || 'PREP'
    const counter = String(Date.now()).slice(-3)
    const dateStr = date.substring(0, 10).replace(/-/g, '')
    return `B-PREP-${shortName}-${counter}-${dateStr}`
  }

  private calculateFifoAllocationHelper(
    batches: PreparationBatch[],
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = quantity

    // Sort batches by production date (FIFO - oldest first)
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
    )

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break

      const allocatedQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocatedQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocatedQuantity,
          costPerUnit: batch.costPerUnit,
          batchDate: batch.productionDate
        })

        remainingQuantity -= allocatedQuantity
      }
    }

    return { allocations, remainingQuantity }
  }

  private getPreparationInfo(preparationId: string) {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found', { preparationId })
        return {
          name: preparationId,
          unit: 'gram',
          outputQuantity: 1000,
          outputUnit: 'gram',
          costPerPortion: 0,
          shelfLife: 2 // days
        }
      }

      return {
        name: preparation.name,
        unit: preparation.outputUnit,
        outputQuantity: preparation.outputQuantity,
        outputUnit: preparation.outputUnit,
        costPerPortion: preparation.costPerPortion || 0,
        shelfLife: preparation.shelfLife || 2 // preparations expire faster
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting preparation info', { error, preparationId })
      return {
        name: preparationId,
        unit: 'gram',
        outputQuantity: 1000,
        outputUnit: 'gram',
        costPerPortion: 0,
        shelfLife: 2
      }
    }
  }

  // ===========================
  // ✅ INITIALIZATION WITH MOCK DATA LOADING
  // ===========================

  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        DebugUtils.info(MODULE_NAME, 'Service already initialized')
        return
      }

      DebugUtils.info(MODULE_NAME, 'Initializing preparation service')

      const recipesStore = useRecipesStore()

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      // Load data from Supabase
      await this.loadBatchesFromSupabase()
      await this.loadOperationsFromSupabase()
      await this.loadInventoriesFromSupabase()
      await this.recalculateAllBalances()

      this.initialized = true
      DebugUtils.info(MODULE_NAME, 'Preparation service initialized from Supabase', {
        batches: this.batches.length,
        operations: this.operations.length,
        inventories: this.inventories.length,
        balances: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize preparation service', { error })
      throw error
    }
  }

  // ===========================
  // SUPABASE DATA LOADING
  // ===========================

  private async loadBatchesFromSupabase(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading batches from Supabase')

      const { data, error } = await supabase
        .from('preparation_batches')
        .select('*')
        .order('production_date', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load batches from Supabase', { error })
        throw error
      }

      this.batches = (data || []).map(batchFromSupabase)

      DebugUtils.info(MODULE_NAME, 'Batches loaded from Supabase', {
        count: this.batches.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading batches', { error })
      // Initialize with empty array on error
      this.batches = []
    }
  }

  private async loadOperationsFromSupabase(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading operations from Supabase')

      const { data, error } = await supabase
        .from('preparation_operations')
        .select('*')
        .order('operation_date', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load operations from Supabase', { error })
        throw error
      }

      this.operations = (data || []).map(operationFromSupabase)

      DebugUtils.info(MODULE_NAME, 'Operations loaded from Supabase', {
        count: this.operations.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading operations', { error })
      // Initialize with empty array on error
      this.operations = []
    }
  }

  private async loadInventoriesFromSupabase(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading inventory documents from Supabase')

      const { data, error } = await supabase
        .from('preparation_inventory_documents')
        .select('*')
        .order('inventory_date', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load inventories from Supabase', { error })
        throw error
      }

      this.inventories = (data || []).map(inventoryDocumentFromSupabase)

      DebugUtils.info(MODULE_NAME, 'Inventory documents loaded from Supabase', {
        count: this.inventories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading inventories', { error })
      // Initialize with empty array on error
      this.inventories = []
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation balances', { error })
      throw error
    }
  }

  async getBalance(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBalance | null> {
    try {
      const balance = this.balances.find(
        b => b.preparationId === preparationId && b.department === department
      )
      return balance || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation balance', { error, preparationId })
      throw error
    }
  }

  async getBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      if (department && department !== 'all') {
        batches = batches.filter(b => b.department === department)
      }

      return batches
        .filter(b => b.status === 'active')
        .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime())
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get batches', { error, department })
      throw error
    }
  }

  async getAllBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      if (department && department !== 'all') {
        batches = batches.filter(b => b.department === department)
      }

      return batches.sort(
        (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all batches', { error, department })
      throw error
    }
  }

  async getPreparationBatches(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBatch[]> {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return batches.sort(
        (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation batches', { error, preparationId })
      throw error
    }
  }

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  calculateFifoAllocation(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return this.calculateFifoAllocationHelper(batches, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  calculateCorrectionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): number {
    try {
      const { allocations } = this.calculateFifoAllocation(preparationId, department, quantity)
      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // ✅ NEW: WRITE-OFF OPERATIONS
  // ===========================

  async createWriteOff(data: CreatePreparationWriteOffData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation write-off operation', { data })

      const operationItems = []
      let totalValue = 0
      let totalBatchesUpdated = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${preparationInfo.name}. Missing: ${remainingQuantity} ${preparationInfo.unit}`
          )
        }

        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: preparationInfo.unit,
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost
        totalBatchesUpdated += allocations.length

        // ✅ Update batches with precision handling AND save to Supabase
        for (const allocation of allocations) {
          const batchIndex = this.batches.findIndex(b => b.id === allocation.batchId)
          if (batchIndex !== -1) {
            const batch = this.batches[batchIndex]

            const newQuantity = batch.currentQuantity - allocation.quantity
            batch.currentQuantity = Math.round(newQuantity * 10000) / 10000
            batch.totalValue = Math.round(batch.currentQuantity * batch.costPerUnit * 100) / 100
            batch.updatedAt = TimeUtils.getCurrentLocalISO()

            if (batch.currentQuantity <= 0.0001) {
              batch.currentQuantity = 0
              batch.totalValue = 0
              batch.status = 'depleted'
              batch.isActive = false

              DebugUtils.info(MODULE_NAME, 'Preparation batch marked as depleted', {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                originalQuantity: batch.initialQuantity,
                finalQuantity: batch.currentQuantity
              })
            }

            // ✅ UPDATE batch in Supabase
            const { error: batchUpdateError } = await supabase
              .from('preparation_batches')
              .update(batchToSupabaseUpdate(batch))
              .eq('id', batch.id)

            if (batchUpdateError) {
              DebugUtils.error(MODULE_NAME, 'Failed to update batch in Supabase', {
                batchUpdateError
              })
              throw batchUpdateError
            }

            this.batches[batchIndex] = batch
          }
        }
      }

      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'write_off',
        documentNumber: `PREP-WR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: doesPreparationWriteOffAffectKPI(data.reason),
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // ✅ INSERT operation into Supabase
      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation write-off operation created', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: doesPreparationWriteOffAffectKPI(data.reason),
        totalValue,
        batchesUpdated: totalBatchesUpdated
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation write-off', { error })
      throw error
    }
  }

  // ===========================
  // ✅ WRITE-OFF STATISTICS
  // ===========================

  getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: string,
    dateTo?: string
  ): PreparationWriteOffStatistics {
    try {
      let writeOffOps = this.operations.filter(op => op.operationType === 'write_off')

      if (department && department !== 'all') {
        writeOffOps = writeOffOps.filter(op => op.department === department)
      }

      if (dateFrom) {
        writeOffOps = writeOffOps.filter(op => op.operationDate >= dateFrom)
      }
      if (dateTo) {
        writeOffOps = writeOffOps.filter(op => op.operationDate <= dateTo)
      }

      const stats: PreparationWriteOffStatistics = {
        total: { count: 0, value: 0 },
        kpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            expired: { count: 0, value: 0 },
            spoiled: { count: 0, value: 0 },
            contaminated: { count: 0, value: 0 },
            overproduced: { count: 0, value: 0 },
            quality_control: { count: 0, value: 0 },
            other: { count: 0, value: 0 }
          }
        },
        nonKpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            education: { count: 0, value: 0 },
            test: { count: 0, value: 0 }
          }
        },
        byDepartment: {
          kitchen: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 },
          bar: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 }
        }
      }

      writeOffOps.forEach(op => {
        const value = op.totalValue || 0
        const reason = op.writeOffDetails?.reason
        const affectsKPI = op.writeOffDetails?.affectsKPI || false

        stats.total.count += 1
        stats.total.value += value

        if (affectsKPI && reason) {
          stats.kpiAffecting.count += 1
          stats.kpiAffecting.value += value

          if (reason in stats.kpiAffecting.reasons) {
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].count += 1
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].value +=
              value
          }
        } else if (!affectsKPI && reason) {
          stats.nonKpiAffecting.count += 1
          stats.nonKpiAffecting.value += value

          if (reason in stats.nonKpiAffecting.reasons) {
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].count += 1
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].value += value
          }
        }

        const dept = op.department
        stats.byDepartment[dept].total += value
        if (affectsKPI) {
          stats.byDepartment[dept].kpiAffecting += value
        } else {
          stats.byDepartment[dept].nonKpiAffecting += value
        }
      })

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off statistics', { error })
      throw error
    }
  }

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation receipt operation', { data })

      const operationItems = []
      let totalValue = 0
      const now = TimeUtils.getCurrentLocalISO()

      // Step 1: Create batches and insert into Supabase
      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        const batch: PreparationBatch = {
          id: crypto.randomUUID(),
          batchNumber: this.generateBatchNumber(preparationInfo.name, now),
          preparationId: item.preparationId,
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: preparationInfo.unit,
          costPerUnit: item.costPerUnit,
          totalValue: Math.round(item.quantity * item.costPerUnit * 100) / 100,
          productionDate: now,
          expiryDate: item.expiryDate,
          sourceType: data.sourceType,
          notes: item.notes,
          status: 'active',
          isActive: true,
          createdAt: now,
          updatedAt: now
        }

        // Insert batch into Supabase
        const { error: batchError } = await supabase
          .from('preparation_batches')
          .insert(batchToSupabase(batch))

        if (batchError) {
          DebugUtils.error(MODULE_NAME, 'Failed to insert batch into Supabase', { batchError })
          throw batchError
        }

        // Add to local array
        this.batches.push(batch)

        operationItems.push({
          id: crypto.randomUUID(),
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: batch.unit,
          totalCost: batch.totalValue,
          averageCostPerUnit: item.costPerUnit,
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += batch.totalValue
      }

      // Step 2: Create operation and insert into Supabase
      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'receipt',
        documentNumber: `PREP-REC-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      }

      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      // Add to local array
      this.operations.push(operation)

      // Step 3: Recalculate balances
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation receipt created in Supabase', {
        operationId: operation.id,
        batchCount: data.items.length,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation receipt', { error })
      throw error
    }
  }

  // ===========================
  // ✅ CORRECTION OPERATIONS WITH PROPER ROUNDING
  // ===========================

  async createCorrection(data: CreatePreparationCorrectionData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation correction operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        if (item.quantity > 0) {
          // Positive correction (surplus) - create new batch
          const batch: PreparationBatch = {
            id: crypto.randomUUID(),
            batchNumber: this.generateBatchNumber(
              preparationInfo.name,
              TimeUtils.getCurrentLocalISO()
            ),
            preparationId: item.preparationId,
            department: data.department,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            unit: preparationInfo.unit,
            costPerUnit: preparationInfo.costPerPortion,
            totalValue: Math.round(item.quantity * preparationInfo.costPerPortion * 100) / 100,
            productionDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'correction',
            notes: `Correction surplus: ${item.notes || ''}`,
            status: 'active',
            isActive: true,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          // ✅ INSERT new batch into Supabase
          const { error: batchError } = await supabase
            .from('preparation_batches')
            .insert(batchToSupabase(batch))

          if (batchError) {
            DebugUtils.error(MODULE_NAME, 'Failed to insert batch into Supabase', { batchError })
            throw batchError
          }

          this.batches.push(batch)
          totalValue += batch.totalValue
        } else {
          // Negative correction (shortage) - write off from existing batches
          const positiveQuantity = Math.abs(item.quantity)
          const { allocations, remainingQuantity } = this.calculateFifoAllocation(
            item.preparationId,
            data.department,
            positiveQuantity
          )

          if (remainingQuantity > 0) {
            throw new Error(
              `Insufficient stock for correction of ${preparationInfo.name}. Missing: ${remainingQuantity} ${preparationInfo.unit}`
            )
          }

          const totalCost = allocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )

          // Update batches with proper precision AND save to Supabase
          for (const allocation of allocations) {
            const batchIndex = this.batches.findIndex(b => b.id === allocation.batchId)
            if (batchIndex !== -1) {
              const batch = this.batches[batchIndex]

              const newQuantity = batch.currentQuantity - allocation.quantity
              batch.currentQuantity = Math.round(newQuantity * 10000) / 10000
              batch.totalValue = Math.round(batch.currentQuantity * batch.costPerUnit * 100) / 100
              batch.updatedAt = TimeUtils.getCurrentLocalISO()

              if (batch.currentQuantity <= 0.0001) {
                batch.currentQuantity = 0
                batch.totalValue = 0
                batch.status = 'depleted'
                batch.isActive = false
              }

              // ✅ UPDATE batch in Supabase
              const { error: batchUpdateError } = await supabase
                .from('preparation_batches')
                .update(batchToSupabaseUpdate(batch))
                .eq('id', batch.id)

              if (batchUpdateError) {
                DebugUtils.error(MODULE_NAME, 'Failed to update batch in Supabase', {
                  batchUpdateError
                })
                throw batchUpdateError
              }

              this.batches[batchIndex] = batch
            }
          }

          totalValue += totalCost
        }

        operationItems.push({
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: Math.abs(item.quantity),
          unit: preparationInfo.unit,
          totalCost: Math.abs(item.quantity) * preparationInfo.costPerPortion,
          notes: item.notes
        })
      }

      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'correction',
        documentNumber: `PREP-COR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        correctionDetails: data.correctionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // ✅ INSERT operation into Supabase
      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation correction operation created', {
        operationId: operation.id,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation correction', { error })
      throw error
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    try {
      const recipesStore = useRecipesStore()

      // ✅ FIXED: Get preparations by their department field (not by batch history)
      const departmentPreparations = recipesStore.preparations.filter(
        p => p.department === data.department && p.isActive
      )

      // Get current balances for quick lookup
      const balanceMap = new Map(
        this.balances.filter(b => b.department === data.department).map(b => [b.preparationId, b])
      )

      // ✅ Create inventory items for all active preparations in this department
      const inventoryItems: PreparationInventoryItem[] = []

      for (const preparation of departmentPreparations) {
        const balance = balanceMap.get(preparation.id)

        inventoryItems.push({
          id: crypto.randomUUID(),
          preparationId: preparation.id,
          preparationName: preparation.name,
          systemQuantity: balance ? balance.totalQuantity : 0, // ✅ 0 if consumed/depleted
          actualQuantity: balance ? balance.totalQuantity : 0,
          difference: 0,
          unit: preparation.outputUnit || 'gram',
          averageCost: balance ? balance.averageCost : preparation.costPerPortion || 0,
          valueDifference: 0,
          notes: '',
          countedBy: ''
        })
      }

      const inventory: PreparationInventoryDocument = {
        id: crypto.randomUUID(),
        documentNumber: `INV-PREP-${data.department.toUpperCase()}-${String(this.inventories.length + 1).padStart(3, '0')}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: inventoryItems,
        totalItems: inventoryItems.length,
        totalDiscrepancies: 0,
        totalValueDifference: 0,
        status: 'draft',
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // ✅ INSERT inventory document into Supabase
      const { error: inventoryError } = await supabase
        .from('preparation_inventory_documents')
        .insert(inventoryDocumentToSupabase(inventory))

      if (inventoryError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert inventory document into Supabase', {
          inventoryError
        })
        throw inventoryError
      }

      DebugUtils.info(MODULE_NAME, 'Inventory document created in Supabase', {
        documentNumber: inventory.documentNumber,
        department: inventory.department,
        itemsCount: inventoryItems.length
      })

      this.inventories.push(inventory)
      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start preparation inventory', { error })
      throw error
    }
  }

  async updateInventory(
    inventoryId: string,
    items: PreparationInventoryItem[]
  ): Promise<PreparationInventoryDocument> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Preparation inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      inventory.items = items.map(item => ({
        ...item,
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()
      this.inventories[inventoryIndex] = inventory

      // ✅ UPDATE inventory document in Supabase
      const { error: updateError } = await supabase
        .from('preparation_inventory_documents')
        .update(inventoryDocumentToSupabaseUpdate(inventory))
        .eq('id', inventoryId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update inventory document in Supabase', {
          updateError,
          inventoryId
        })
        throw updateError
      }

      DebugUtils.info(MODULE_NAME, 'Inventory document updated in Supabase', {
        inventoryId,
        totalItems: inventory.totalItems,
        totalDiscrepancies: inventory.totalDiscrepancies,
        totalValueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  async finalizeInventory(inventoryId: string): Promise<PreparationOperation[]> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      const correctionOperations: PreparationOperation[] = []
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      )

      // ✅ Create correction operations for discrepancies (if any)
      if (itemsWithDiscrepancies.length > 0) {
        const correctionData: CreatePreparationCorrectionData = {
          department: inventory.department,
          responsiblePerson: inventory.responsiblePerson,
          items: itemsWithDiscrepancies.map(item => ({
            preparationId: item.preparationId,
            quantity: item.difference,
            notes: `Inventory adjustment: ${item.notes || 'No specific reason'}`
          })),
          correctionDetails: {
            reason: 'other',
            relatedId: inventory.id,
            relatedName: `Inventory ${inventory.documentNumber}`
          },
          notes: `Inventory corrections from ${inventory.documentNumber}`
        }

        const correctionOperation = await this.createCorrection(correctionData)
        correctionOperations.push(correctionOperation)
      }

      // ✅ UPDATE inventory document status in Supabase (status → 'confirmed')
      const { error: updateError } = await supabase
        .from('preparation_inventory_documents')
        .update({
          status: 'confirmed',
          updated_at: inventory.updatedAt
        })
        .eq('id', inventoryId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update inventory status in Supabase', {
          updateError,
          inventoryId
        })
        throw updateError
      }

      DebugUtils.info(MODULE_NAME, 'Inventory finalized in Supabase', {
        inventoryId,
        documentNumber: inventory.documentNumber,
        discrepancies: itemsWithDiscrepancies.length,
        correctionsCreated: correctionOperations.length
      })

      this.inventories[inventoryIndex] = inventory
      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  // ===========================
  // DATA RETRIEVAL
  // ===========================

  async getOperations(department?: PreparationDepartment): Promise<PreparationOperation[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let operations = [...this.operations]

      if (department && department !== 'all') {
        operations = operations.filter(op => op.department === department)
      }

      return operations.sort(
        (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operations', { error })
      throw error
    }
  }

  async getInventories(
    department?: PreparationDepartment
  ): Promise<PreparationInventoryDocument[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let inventories = [...this.inventories]

      if (department && department !== 'all') {
        inventories = inventories.filter(inv => inv.department === department)
      }

      return inventories.sort(
        (a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get inventories', { error })
      throw error
    }
  }

  // ===========================
  // ALERT HELPERS
  // ===========================

  getExpiringPreparations(): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring preparations', { error })
      throw error
    }
  }

  getLowStockPreparations(): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock preparations', { error })
      throw error
    }
  }

  // ===========================
  // ✅ BALANCE CALCULATION WITH PROPER PRECISION
  // ===========================

  private async recalculateAllBalances(): Promise<void> {
    try {
      this.balances = []
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all balances', { error })
      throw error
    }
  }

  private async recalculateBalances(department: PreparationDepartment): Promise<void> {
    try {
      // Remove old balances for this department
      this.balances = this.balances.filter(b => b.department !== department)

      // Get available preparations for this department
      let departmentPreparations: any[] = []

      try {
        const recipesStore = useRecipesStore()
        departmentPreparations = recipesStore.activePreparations.filter(p => p.isActive)

        DebugUtils.info(
          MODULE_NAME,
          `Found ${departmentPreparations.length} preparations for ${department}`,
          { department, preparationCount: departmentPreparations.length }
        )
      } catch (error) {
        DebugUtils.warn(
          MODULE_NAME,
          'Recipes store not available, will only show preparations with existing batches',
          { error }
        )
        departmentPreparations = []
      }

      // Get active batches for this department
      const activeBatches = this.batches.filter(
        b => b.department === department && b.status === 'active' && b.currentQuantity > 0
      )

      // Group batches by preparationId
      const preparationGroups = new Map<string, PreparationBatch[]>()
      for (const batch of activeBatches) {
        const key = batch.preparationId
        if (!preparationGroups.has(key)) {
          preparationGroups.set(key, [])
        }
        preparationGroups.get(key)!.push(batch)
      }

      // Calculate actual balances from batches
      const actualBalances = new Map<string, number>()
      const allBatches = this.batches.filter(b => b.department === department)

      allBatches.forEach(batch => {
        if (batch.status === 'active') {
          const currentBalance = actualBalances.get(batch.preparationId) || 0
          actualBalances.set(batch.preparationId, currentBalance + batch.currentQuantity)
        }
      })

      // Create balances for preparations with positive stock
      for (const [, batches] of preparationGroups) {
        const firstBatch = batches[0]
        const preparationId = firstBatch.preparationId
        const preparationInfo = this.getPreparationInfo(preparationId)

        const totalQuantity =
          Math.round(batches.reduce((sum, b) => sum + b.currentQuantity, 0) * 10000) / 10000
        const totalValue = Math.round(batches.reduce((sum, b) => sum + b.totalValue, 0) * 100) / 100
        const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

        const sortedBatches = batches.sort(
          (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

        let costTrend: 'up' | 'down' | 'stable' = 'stable'
        if (sortedBatches.length > 1) {
          const oldestCost = sortedBatches[0].costPerUnit
          if (latestCost > oldestCost * 1.05) costTrend = 'up'
          else if (latestCost < oldestCost * 0.95) costTrend = 'down'
        }

        const belowMinStock = totalQuantity < 200 // 200g/ml for preparations

        const now = new Date()
        const hasExpired = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          return new Date(batch.expiryDate) < now
        })

        const hasNearExpiry = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          const expiry = new Date(batch.expiryDate)
          const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 1 && diffDays > 0 // 1 day for preparations
        })

        const balance: PreparationBalance = {
          preparationId,
          preparationName: preparationInfo.name,
          department,
          totalQuantity,
          unit: preparationInfo.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].productionDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].productionDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        }

        this.balances.push(balance)
      }

      // ✅ REMOVED: Don't add preparations without stock
      // Only show preparations that have or had batches in this department
      // This prevents showing all catalog preparations as zero-stock balances

      // Add preparations that have consumed batches but aren't in catalog
      const allBatchPreparations = new Set<string>()
      this.batches
        .filter(b => b.department === department)
        .forEach(batch => {
          allBatchPreparations.add(batch.preparationId)
        })

      for (const preparationId of allBatchPreparations) {
        const alreadyExists = this.balances.some(
          b => b.preparationId === preparationId && b.department === department
        )

        if (!alreadyExists) {
          const actualBalance = Math.round((actualBalances.get(preparationId) || 0) * 10000) / 10000
          const preparationInfo = this.getPreparationInfo(preparationId)

          const balance: PreparationBalance = {
            preparationId,
            preparationName: preparationInfo.name,
            department,
            totalQuantity: actualBalance,
            unit: preparationInfo.unit,
            totalValue: actualBalance > 0 ? actualBalance * preparationInfo.costPerPortion : 0,
            averageCost: preparationInfo.costPerPortion,
            latestCost: preparationInfo.costPerPortion,
            costTrend: 'stable',
            batches: [],
            oldestBatchDate: '',
            newestBatchDate: '',
            hasExpired: false,
            hasNearExpiry: false,
            belowMinStock: true,
            lastCalculated: TimeUtils.getCurrentLocalISO()
          }

          this.balances.push(balance)
        }
      }

      const departmentBalances = this.balances.filter(b => b.department === department)
      const positiveStock = departmentBalances.filter(b => b.totalQuantity > 0).length
      const zeroStock = departmentBalances.filter(b => b.totalQuantity === 0).length
      const negativeStock = departmentBalances.filter(b => b.totalQuantity < 0).length

      DebugUtils.info(
        MODULE_NAME,
        `Balances recalculated for ${department} using batch-based approach`,
        {
          department,
          totalPreparationsInCatalog: departmentPreparations.length,
          preparationsWithPositiveStock: positiveStock,
          preparationsWithZeroStock: zeroStock,
          preparationsWithNegativeStock: negativeStock,
          totalBalances: departmentBalances.length,
          activeBatchesProcessed: activeBatches.length,
          totalBatchesConsidered: allBatches.length
        }
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate preparation balances', { error })
      throw error
    }
  }
}

export const preparationService = new PreparationService()
