// src/stores/storage/transitBatchService.ts
// ✅ NEW: Centralized service for transit batch management

import { DebugUtils } from '@/utils/debugger'
import { convertToBaseUnits } from '@/composables/useMeasurementUnits'
import type { StorageBatch, CreateTransitBatchData, StorageDepartment } from './types'

const MODULE_NAME = 'TransitBatchService'

export class TransitBatchService {
  private transitBatches: StorageBatch[] = []

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

      // Add to internal storage
      this.transitBatches.push(...batches)

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

    // Generate IDs using new format
    const batchId = this.generateBatchId(orderId, item.itemId, index)
    const batchNumber = this.generateBatchNumber(orderId, index)

    // Create batch
    const batch: StorageBatch = {
      id: batchId,
      batchNumber,
      itemId: item.itemId,
      itemType: 'product',
      department: item.department,
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

    DebugUtils.debug(MODULE_NAME, 'Single batch created', {
      batchId: batch.id,
      itemId: batch.itemId,
      quantity: batch.currentQuantity,
      unit: batch.unit
    })

    return batch
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

      // Find transit batches for this order
      const transitBatches = this.findByOrder(orderId)

      if (transitBatches.length === 0) {
        throw new Error(`No transit batches found for order ${orderId}`)
      }

      const activeBatches: StorageBatch[] = []

      for (const batch of transitBatches) {
        const receivedItem = receivedItems.find(item => item.itemId === batch.itemId)

        if (!receivedItem) {
          DebugUtils.warn(MODULE_NAME, 'No received data for transit batch', {
            batchId: batch.id,
            itemId: batch.itemId
          })
          continue
        }

        const activeBatch = this.convertBatch(batch, receivedItem)
        activeBatches.push(activeBatch)
      }

      // Remove converted batches from transit array
      this.transitBatches = this.transitBatches.filter(b => !transitBatches.includes(b))

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
  removeByOrder(orderId: string): number {
    const countBefore = this.transitBatches.length
    this.transitBatches = this.transitBatches.filter(b => b.purchaseOrderId !== orderId)
    const removedCount = countBefore - this.transitBatches.length

    DebugUtils.info(MODULE_NAME, 'Transit batches removed', {
      orderId,
      removedCount
    })

    return removedCount
  }

  // ===========================
  // FIND METHODS
  // ===========================

  /**
   * Find transit batches by order ID
   */
  findByOrder(orderId: string): StorageBatch[] {
    return this.transitBatches.filter(b => b.purchaseOrderId === orderId)
  }

  /**
   * Find transit batches by item and department
   */
  findByItem(itemId: string, department: StorageDepartment): StorageBatch[] {
    return this.transitBatches.filter(b => b.itemId === itemId && b.department === department)
  }

  /**
   * Get all transit batches
   */
  getAll(): StorageBatch[] {
    return [...this.transitBatches]
  }

  // ===========================
  // VALIDATION METHODS
  // ===========================

  /**
   * Check if transit batches already exist for order
   */
  hasExistingBatches(orderId: string): boolean {
    return this.transitBatches.some(b => b.purchaseOrderId === orderId)
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
