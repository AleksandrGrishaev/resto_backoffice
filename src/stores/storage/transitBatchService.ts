// src/stores/storage/transitBatchService.ts
// ✅ UPDATED: Uses Supabase for persistence

import { DebugUtils, generateId } from '@/utils'
import { supabase } from '@/supabase'
import { convertToBaseUnits } from '@/composables/useMeasurementUnits'
import type { StorageBatch, CreateTransitBatchData } from './types'
import { mapBatchFromDB, mapBatchToDB } from './supabaseMappers'
import { DEFAULT_WAREHOUSE } from './types'

const MODULE_NAME = 'TransitBatchService'

export class TransitBatchService {
  // No more in-memory storage - all data in Supabase

  // ===========================
  // CREATE METHODS
  // ===========================

  /**
   * Create transit batches from purchase order
   */
  async createFromOrder(orderId: string, items: CreateTransitBatchData[]): Promise<StorageBatch[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transit batches from order', {
        orderId,
        itemsCount: items.length
      })

      // Validate order ID
      if (!orderId || orderId.trim() === '') {
        throw new Error('Order ID is required')
      }

      // Check for existing batches
      if (this.hasExistingBatches(orderId)) {
        DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', { orderId })
        return this.findByOrder(orderId)
      }

      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Order must have at least one item')
      }

      const batches: StorageBatch[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Validate item
        if (!item.itemId || !item.quantity || item.quantity <= 0) {
          DebugUtils.warn(MODULE_NAME, 'Skipping invalid item', { item })
          continue
        }

        const batch = await this.createSingleBatch(orderId, item, i)
        batches.push(batch)
      }

      // Batches are now persisted in Supabase during createSingleBatch

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        orderId,
        batchCount: batches.length,
        batchIds: batches.map(b => b.id)
      })

      return batches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transit batches', {
        orderId,
        error
      })
      throw error
    }
  }

  /**
   * Create single transit batch (internal helper)
   */
  private async createSingleBatch(
    orderId: string,
    item: CreateTransitBatchData,
    index: number
  ): Promise<StorageBatch> {
    // Get product definition
    const { mockDataCoordinator } = await import('@/stores/shared/mockDataCoordinator')
    const productDef = mockDataCoordinator.getProductDefinition(item.itemId)

    if (!productDef) {
      throw new Error(`Product not found: ${item.itemId}`)
    }

    // Convert to base units
    let unitType: 'weight' | 'volume' | 'piece' = 'piece'
    if (productDef.baseUnit === 'gram') unitType = 'weight'
    else if (productDef.baseUnit === 'ml') unitType = 'volume'

    const conversionResult = convertToBaseUnits(item.quantity, item.unit, unitType)
    const quantityInBaseUnits = conversionResult.success ? conversionResult.value! : item.quantity
    const baseUnit = conversionResult.success ? conversionResult.baseUnit! : item.unit

    // Calculate cost in base units
    let costPerUnitInBase = item.estimatedCostPerUnit
    if (conversionResult.success && item.unit !== baseUnit) {
      const conversionFactor = item.quantity / quantityInBaseUnits
      costPerUnitInBase = item.estimatedCostPerUnit * conversionFactor
    }

    const batchId = generateId()
    const batchNumber = `TB-${orderId.slice(-6)}-${index + 1}`

    // Create batch object
    const batch: Partial<StorageBatch> = {
      id: batchId,
      batchNumber,
      itemId: item.itemId,
      itemType: 'product',
      warehouseId: DEFAULT_WAREHOUSE.id,
      initialQuantity: quantityInBaseUnits,
      currentQuantity: quantityInBaseUnits,
      unit: baseUnit,
      costPerUnit: costPerUnitInBase,
      totalValue: quantityInBaseUnits * costPerUnitInBase,
      receiptDate: item.plannedDeliveryDate,
      sourceType: 'purchase',
      status: 'in_transit',
      isActive: false,
      purchaseOrderId: orderId,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      plannedDeliveryDate: item.plannedDeliveryDate,
      notes: item.notes || `Transit batch from order ${orderId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Insert to Supabase
    const { data, error } = await supabase
      .from('storage_batches')
      .insert([mapBatchToDB(batch)])
      .select()
      .single()

    if (error) throw error

    const savedBatch = mapBatchFromDB(data)

    DebugUtils.debug(MODULE_NAME, 'Transit batch saved to DB', {
      batchId: savedBatch.id,
      itemId: savedBatch.itemId
    })

    return savedBatch
  }

  // ===========================
  // CONVERT METHODS
  // ===========================

  /**
   * Convert transit batches to active on receipt
   */
  async convertToActive(
    orderId: string,
    receivedItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<StorageBatch[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        orderId,
        itemsCount: receivedItems.length
      })

      // Update batches in database
      const { data, error } = await supabase
        .from('storage_batches')
        .update({
          status: 'active',
          is_active: true,
          actual_delivery_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('purchase_order_id', orderId)
        .eq('status', 'in_transit')
        .select()

      if (error) throw error

      const activeBatches = (data || []).map(mapBatchFromDB)

      DebugUtils.info(MODULE_NAME, 'Batches converted successfully', {
        orderId,
        convertedCount: activeBatches.length,
        activeBatchIds: activeBatches.map(b => b.id)
      })

      return activeBatches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert batches', {
        orderId,
        error
      })
      throw error
    }
  }

  /**
   * Convert single batch (internal helper)
   */
  private convertBatch(
    transitBatch: StorageBatch,
    receivedData: { itemId: string; receivedQuantity: number; actualPrice?: number }
  ): StorageBatch {
    const activeBatch: StorageBatch = {
      ...transitBatch,
      status: 'active',
      isActive: true,
      actualDeliveryDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Update quantity if different
    if (receivedData.receivedQuantity !== transitBatch.currentQuantity) {
      DebugUtils.debug(MODULE_NAME, 'Updating quantity on conversion', {
        batchId: transitBatch.id,
        planned: transitBatch.currentQuantity,
        received: receivedData.receivedQuantity
      })
      activeBatch.currentQuantity = receivedData.receivedQuantity
      activeBatch.totalValue = receivedData.receivedQuantity * activeBatch.costPerUnit
    }

    // Update price if provided
    if (receivedData.actualPrice) {
      DebugUtils.debug(MODULE_NAME, 'Updating price on conversion', {
        batchId: transitBatch.id,
        estimated: transitBatch.costPerUnit,
        actual: receivedData.actualPrice
      })
      activeBatch.costPerUnit = receivedData.actualPrice
      activeBatch.totalValue = activeBatch.currentQuantity * receivedData.actualPrice
    }

    return activeBatch
  }

  // ===========================
  // REMOVE METHODS
  // ===========================

  /**
   * Remove transit batches by order ID (e.g., on order cancellation)
   */
  async removeByOrder(orderId: string): Promise<number> {
    const { error, count } = await supabase
      .from('storage_batches')
      .delete({ count: 'exact' })
      .eq('purchase_order_id', orderId)
      .eq('status', 'in_transit')

    if (error) throw error

    DebugUtils.info(MODULE_NAME, 'Transit batches removed', {
      orderId,
      removedCount: count || 0
    })

    return count || 0
  }

  // ===========================
  // FIND METHODS
  // ===========================

  /**
   * Find transit batches by order ID
   */
  async findByOrder(orderId: string): Promise<StorageBatch[]> {
    const { data, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('purchase_order_id', orderId)
      .eq('status', 'in_transit')

    if (error) throw error
    return (data || []).map(mapBatchFromDB)
  }

  /**
   * Get all transit batches
   */
  async getAll(): Promise<StorageBatch[]> {
    const { data, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('status', 'in_transit')
      .order('planned_delivery_date', { ascending: true })

    if (error) throw error
    return (data || []).map(mapBatchFromDB)
  }

  // ===========================
  // VALIDATION METHODS
  // ===========================

  /**
   * Check if transit batches already exist for order
   */
  async hasExistingBatches(orderId: string): Promise<boolean> {
    const batches = await this.findByOrder(orderId)
    return batches.length > 0
  }

  /**
   * Legacy helper for ID generation (no longer needed with generateId)
   */
  private generateBatchId(orderId: string, itemId: string, index: number): string {
    return generateId()
  }

  private generateBatchNumber(orderId: string, index: number): string {
    return `TB-${orderId.slice(-6)}-${index + 1}`
  }

  /**
   * Validate conversion readiness
   */
  validateConversion(orderId: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    const batches = this.findByOrder(orderId)

    if (batches.length === 0) {
      errors.push(`No transit batches found for order ${orderId}`)
    }

    for (const batch of batches) {
      if (this.isOverdue(batch)) {
        warnings.push(`Batch ${batch.batchNumber} is overdue`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // ===========================
  // STATUS METHODS
  // ===========================

  /**
   * Check if batch delivery is overdue
   */
  isOverdue(batch: StorageBatch): boolean {
    if (!batch.plannedDeliveryDate) return false
    return new Date(batch.plannedDeliveryDate) < new Date()
  }

  /**
   * Check if batch delivery is today
   */
  isDeliveryToday(batch: StorageBatch): boolean {
    if (!batch.plannedDeliveryDate) return false
    const deliveryDate = new Date(batch.plannedDeliveryDate)
    const today = new Date()
    return deliveryDate.toDateString() === today.toDateString()
  }

  /**
   * Get delivery status for batch
   */
  getDeliveryStatus(batch: StorageBatch): 'overdue' | 'today' | 'future' {
    if (this.isOverdue(batch)) return 'overdue'
    if (this.isDeliveryToday(batch)) return 'today'
    return 'future'
  }

  // ===========================
  // STATISTICS METHODS
  // ===========================

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    const now = new Date()

    return {
      total: this.transitBatches.length,
      totalValue: this.transitBatches.reduce((sum, b) => sum + b.totalValue, 0),
      overdue: this.transitBatches.filter(b => this.isOverdue(b)).length,
      today: this.transitBatches.filter(b => this.isDeliveryToday(b)).length,
      future: this.transitBatches.filter(b => {
        if (!b.plannedDeliveryDate) return false
        const date = new Date(b.plannedDeliveryDate)
        return date > now && !this.isDeliveryToday(b)
      }).length,
      bySupplier: this.groupBySupplier(),
      byDepartment: this.groupByDepartment()
    }
  }

  /**
   * Group batches by supplier
   */
  private groupBySupplier(): Record<string, { count: number; value: number }> {
    const result: Record<string, { count: number; value: number }> = {}

    for (const batch of this.transitBatches) {
      const supplier = batch.supplierName || 'Unknown'
      if (!result[supplier]) {
        result[supplier] = { count: 0, value: 0 }
      }
      result[supplier].count++
      result[supplier].value += batch.totalValue
    }

    return result
  }

  /**
   * Group batches by department
   */
  private groupByDepartment(): Record<StorageDepartment, { count: number; value: number }> {
    const result: Record<StorageDepartment, { count: number; value: number }> = {
      kitchen: { count: 0, value: 0 },
      bar: { count: 0, value: 0 }
    }

    for (const batch of this.transitBatches) {
      result[batch.department].count++
      result[batch.department].value += batch.totalValue
    }

    return result
  }

  // ===========================
  // LOAD/INIT METHODS
  // ===========================

  /**
   * Load initial transit batches (from mock or storage)
   */
  load(batches: StorageBatch[]): void {
    this.transitBatches = batches.filter(b => b.status === 'in_transit')
    DebugUtils.info(MODULE_NAME, 'Transit batches loaded', {
      count: this.transitBatches.length
    })
  }

  /**
   * Clear all transit batches (for testing)
   */
  clear(): void {
    this.transitBatches = []
    DebugUtils.debug(MODULE_NAME, 'Transit batches cleared')
  }

  // ===========================
  // ID GENERATION (PRIVATE)
  // ===========================

  /**
   * Generate batch ID with new format: transit-{orderId}-{itemId}-{index}
   */
  private generateBatchId(orderId: string, itemId: string, index: number): string {
    return `transit-${orderId}-${itemId}-${index}`
  }

  /**
   * Generate batch number with new format: TRN-{date}-{orderPrefix}-{index}
   */
  private generateBatchNumber(orderId: string, index: number): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

    // Extract order prefix (e.g., "order-123" -> "123", "PO-001" -> "PO001")
    const orderPrefix = orderId
      .replace('order-', '')
      .replace('PO-', 'PO')
      .replace(/-/g, '')
      .substring(0, 6)
      .toUpperCase()

    return `TRN-${dateStr}-${orderPrefix}-${index.toString().padStart(2, '0')}`
  }
}

// ===========================
// SINGLETON EXPORT
// ===========================

export const transitBatchService = new TransitBatchService()
