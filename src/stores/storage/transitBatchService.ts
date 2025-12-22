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
      if (await this.hasExistingBatches(orderId)) {
        DebugUtils.warn(MODULE_NAME, 'Transit batches already exist for order', { orderId })
        return await this.findByOrder(orderId)
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
    // ✅ Get product from ProductsStore (Supabase)
    const { useProductsStore } = await import('@/stores/productsStore')
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === item.itemId)

    if (!product) {
      DebugUtils.error(MODULE_NAME, 'Product not found in ProductsStore', {
        itemId: item.itemId,
        availableProducts: productsStore.products.length
      })
      throw new Error(`Product not found: ${item.itemId}`)
    }

    DebugUtils.debug(MODULE_NAME, 'Product found for transit batch', {
      itemId: item.itemId,
      productName: product.name,
      baseUnit: product.baseUnit
    })

    // Convert to base units
    let unitType: 'weight' | 'volume' | 'piece' = 'piece'
    if (product.baseUnit === 'gram') unitType = 'weight'
    else if (product.baseUnit === 'ml') unitType = 'volume'

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
   * ✅ FIXED: Now properly uses receivedItems to update quantity and price
   */
  async convertToActive(
    orderId: string,
    receivedItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>,
    actualDeliveryDate?: string
  ): Promise<StorageBatch[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        orderId,
        itemsCount: receivedItems.length,
        actualDeliveryDate,
        receivedItems: receivedItems.map(i => ({
          itemId: i.itemId,
          qty: i.receivedQuantity,
          price: i.actualPrice
        }))
      })

      // 1. Get all transit batches for this order
      const transitBatches = await this.findByOrder(orderId)

      if (transitBatches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { orderId })
        return []
      }

      const activeBatches: StorageBatch[] = []

      // ✅ FIX: Use actual delivery date from receipt or current date
      const deliveryDate = actualDeliveryDate || new Date().toISOString()

      // 2. For each batch, find the corresponding receivedItem and update
      for (const batch of transitBatches) {
        const receivedItem = receivedItems.find(r => r.itemId === batch.itemId)

        // Prepare update data
        const updateData: Record<string, unknown> = {
          status: 'active',
          is_active: true,
          actual_delivery_date: deliveryDate,
          receipt_date: deliveryDate, // ✅ FIX: Update receipt date to actual delivery date
          updated_at: new Date().toISOString()
        }

        if (receivedItem) {
          // ✅ Update quantity if different
          if (receivedItem.receivedQuantity !== batch.currentQuantity) {
            DebugUtils.debug(MODULE_NAME, 'Updating batch quantity', {
              batchId: batch.id,
              itemId: batch.itemId,
              planned: batch.currentQuantity,
              received: receivedItem.receivedQuantity
            })
            updateData.current_quantity = receivedItem.receivedQuantity
            updateData.initial_quantity = receivedItem.receivedQuantity
          }

          // ✅ Update price if provided (actualPrice = cost per unit / BaseCost)
          if (receivedItem.actualPrice && receivedItem.actualPrice > 0) {
            DebugUtils.debug(MODULE_NAME, 'Updating batch price', {
              batchId: batch.id,
              itemId: batch.itemId,
              estimated: batch.costPerUnit,
              actual: receivedItem.actualPrice
            })
            updateData.cost_per_unit = receivedItem.actualPrice
          }

          // Recalculate total value
          const finalQty = (updateData.current_quantity as number) || batch.currentQuantity
          const finalPrice = (updateData.cost_per_unit as number) || batch.costPerUnit
          updateData.total_value = finalQty * finalPrice

          DebugUtils.debug(MODULE_NAME, 'Batch update calculated', {
            batchId: batch.id,
            finalQty,
            finalPrice,
            totalValue: updateData.total_value
          })
        }

        // 3. Update batch in database
        const { data, error } = await supabase
          .from('storage_batches')
          .update(updateData)
          .eq('id', batch.id)
          .select()
          .single()

        if (error) {
          DebugUtils.error(MODULE_NAME, 'Failed to update batch', {
            batchId: batch.id,
            error
          })
          throw error
        }

        activeBatches.push(mapBatchFromDB(data))
      }

      DebugUtils.info(MODULE_NAME, 'Batches converted successfully', {
        orderId,
        convertedCount: activeBatches.length,
        activeBatches: activeBatches.map(b => ({
          id: b.id,
          itemId: b.itemId,
          qty: b.currentQuantity,
          costPerUnit: b.costPerUnit,
          totalValue: b.totalValue
        }))
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
  async validateConversion(orderId: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    const batches = await this.findByOrder(orderId)

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
  async getStatistics() {
    const now = new Date()
    const transitBatches = await this.getAll()

    return {
      total: transitBatches.length,
      totalValue: transitBatches.reduce((sum, b) => sum + b.totalValue, 0),
      overdue: transitBatches.filter(b => this.isOverdue(b)).length,
      today: transitBatches.filter(b => this.isDeliveryToday(b)).length,
      future: transitBatches.filter(b => {
        if (!b.plannedDeliveryDate) return false
        const date = new Date(b.plannedDeliveryDate)
        return date > now && !this.isDeliveryToday(b)
      }).length,
      bySupplier: this.groupBySupplier(transitBatches),
      byDepartment: this.groupByDepartment(transitBatches)
    }
  }

  /**
   * Group batches by supplier
   */
  private groupBySupplier(
    transitBatches: StorageBatch[]
  ): Record<string, { count: number; value: number }> {
    const result: Record<string, { count: number; value: number }> = {}

    for (const batch of transitBatches) {
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
  private groupByDepartment(
    transitBatches: StorageBatch[]
  ): Record<string, { count: number; value: number }> {
    const result: Record<string, { count: number; value: number }> = {}

    for (const batch of transitBatches) {
      const dept = batch.department || 'kitchen'
      if (!result[dept]) {
        result[dept] = { count: 0, value: 0 }
      }
      result[dept].count++
      result[dept].value += batch.totalValue
    }

    return result
  }

  // ===========================
  // LOAD/INIT METHODS - REMOVED
  // All data now loaded from Supabase via getAll()
  // ===========================

  // ===========================
  // ID GENERATION (PRIVATE) - REMOVED DUPLICATES
  // Methods moved to lines 319-325
  // ===========================
}

// ===========================
// SINGLETON EXPORT
// ===========================

export const transitBatchService = new TransitBatchService()
