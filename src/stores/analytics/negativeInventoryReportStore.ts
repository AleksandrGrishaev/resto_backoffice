// src/stores/analytics/negativeInventoryReportStore.ts
// ✅ SPRINT 3: Negative Inventory Report Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import type { NegativeInventoryReport } from './types'
import { usePreparationStore } from '@/stores/preparation'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'

const MODULE_NAME = 'NegativeInventoryReportStore'

export const useNegativeInventoryReportStore = defineStore('negativeInventoryReport', () => {
  // State
  const currentReport = ref<NegativeInventoryReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate Negative Inventory Report for a specific period
   * ✅ SPRINT 3: Main entry point for negative inventory analysis
   */
  async function generateReport(
    dateFrom: string,
    dateTo: string
  ): Promise<NegativeInventoryReport> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating negative inventory report', { dateFrom, dateTo })

      const preparationStore = usePreparationStore()
      const productsStore = useProductsStore()
      const recipesStore = useRecipesStore()

      // 1. Get all storage batches (products)
      // ✅ FIX: Query ALL negative batches directly from service (including reconciled)
      // storageStore.allBatches only includes active batches, missing reconciled ones
      const { storageService } = await import('@/stores/storage/storageService')
      const negativeBatches = await storageService.getAllNegativeBatches()

      DebugUtils.info(MODULE_NAME, 'Storage negative batches loaded', {
        negative: negativeBatches.length
      })

      // 2. Get all preparation batches
      const preparationBatches = preparationStore.state.batches || []
      // ✅ FIX: Filter by isNegative flag, not quantity. Include both reconciled and unreconciled.
      const negativePreparationBatches = preparationBatches.filter(b => b.isNegative === true)

      DebugUtils.info(MODULE_NAME, 'Preparation batches loaded', {
        total: preparationBatches.length,
        negative: negativePreparationBatches.length
      })

      // 3. Build report items from negative batches
      const items: NegativeInventoryReport['items'] = []

      // Process storage (product) batches
      for (const batch of negativeBatches) {
        const product = productsStore.products.find(p => p.id === batch.itemId)
        if (!product) continue

        // Determine department
        let department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' = 'unknown'
        if (product.usedInDepartments) {
          const deps = product.usedInDepartments
          const hasKitchen = deps.includes('kitchen')
          const hasBar = deps.includes('bar')
          if (hasKitchen && hasBar) department = 'kitchenAndBar'
          else if (hasKitchen) department = 'kitchen'
          else if (hasBar) department = 'bar'
        }

        // ✅ FIX: Check reconciledAt field to determine status
        // A negative batch is reconciled if reconciledAt is set, regardless of currentQuantity
        const status: 'unreconciled' | 'reconciled' | 'written_off' = batch.reconciledAt
          ? 'reconciled'
          : 'unreconciled'

        items.push({
          itemId: batch.itemId,
          itemName: product.name,
          itemType: 'product',
          category: product.category || 'uncategorized',
          department,

          batchId: batch.id,
          batchNumber: batch.batchNumber,
          batchDate: batch.createdAt,

          eventDate: batch.updatedAt || batch.createdAt,
          negativeQuantity: Math.abs(batch.currentQuantity),
          unit: batch.unit,
          costPerUnit: batch.costPerUnit,
          totalCost: Math.abs(batch.currentQuantity) * batch.costPerUnit,

          status,
          reconciledAt: batch.reconciledAt, // ✅ Use actual reconciledAt from batch

          reason: 'Sales or production consumption',
          notes: batch.notes
        })
      }

      // Process preparation batches
      for (const batch of negativePreparationBatches) {
        const preparation = recipesStore.preparations.find(p => p.id === batch.preparationId)
        if (!preparation) continue

        // Determine department
        let department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' = 'unknown'
        if (preparation.department) {
          if (preparation.department === 'kitchen') department = 'kitchen'
          else if (preparation.department === 'bar') department = 'bar'
          else if (preparation.department === 'all') department = 'kitchenAndBar'
        }

        // ✅ FIX: Check reconciledAt field to determine status
        // A negative batch is reconciled if reconciledAt is set, regardless of currentQuantity
        const status: 'unreconciled' | 'reconciled' | 'written_off' = batch.reconciledAt
          ? 'reconciled'
          : 'unreconciled'

        items.push({
          itemId: batch.preparationId,
          itemName: preparation.name,
          itemType: 'preparation',
          category: preparation.preparationType || 'uncategorized',
          department,

          batchId: batch.id,
          batchNumber: batch.batchNumber,
          batchDate: batch.createdAt,

          eventDate: batch.updatedAt || batch.createdAt,
          negativeQuantity: Math.abs(batch.currentQuantity),
          unit: batch.unit,
          costPerUnit: batch.costPerUnit,
          totalCost: Math.abs(batch.currentQuantity) * batch.costPerUnit,

          status,
          reconciledAt: batch.reconciledAt, // ✅ Use actual reconciledAt from batch

          reason: 'Sales or production consumption',
          notes: batch.notes
        })
      }

      // 4. Filter by date range
      const filteredItems = items.filter(item => {
        const eventDate = item.eventDate.split('T')[0]
        return eventDate >= dateFrom && eventDate <= dateTo
      })

      DebugUtils.info(MODULE_NAME, 'Items filtered by date range', {
        total: items.length,
        filtered: filteredItems.length
      })

      // 5. Calculate summary metrics
      const uniqueItems = new Set(filteredItems.map(i => i.itemId))
      const totalEvents = filteredItems.length
      const totalCostImpact = filteredItems.reduce((sum, i) => sum + i.totalCost, 0)
      const unreconciledBatches = filteredItems.filter(i => i.status === 'unreconciled').length

      const summary = {
        totalItems: uniqueItems.size,
        totalEvents,
        totalCostImpact,
        unreconciledBatches
      }

      DebugUtils.info(MODULE_NAME, 'Summary calculated', summary)

      // 6. Calculate aggregations
      const byDepartment = {
        kitchen: {
          count: filteredItems.filter(i => i.department === 'kitchen').length,
          cost: filteredItems
            .filter(i => i.department === 'kitchen')
            .reduce((sum, i) => sum + i.totalCost, 0)
        },
        bar: {
          count: filteredItems.filter(i => i.department === 'bar').length,
          cost: filteredItems
            .filter(i => i.department === 'bar')
            .reduce((sum, i) => sum + i.totalCost, 0)
        },
        kitchenAndBar: {
          count: filteredItems.filter(i => i.department === 'kitchenAndBar').length,
          cost: filteredItems
            .filter(i => i.department === 'kitchenAndBar')
            .reduce((sum, i) => sum + i.totalCost, 0)
        }
      }

      const byStatus = {
        unreconciled: {
          count: filteredItems.filter(i => i.status === 'unreconciled').length,
          cost: filteredItems
            .filter(i => i.status === 'unreconciled')
            .reduce((sum, i) => sum + i.totalCost, 0)
        },
        reconciled: {
          count: filteredItems.filter(i => i.status === 'reconciled').length,
          cost: filteredItems
            .filter(i => i.status === 'reconciled')
            .reduce((sum, i) => sum + i.totalCost, 0)
        },
        written_off: {
          count: filteredItems.filter(i => i.status === 'written_off').length,
          cost: filteredItems
            .filter(i => i.status === 'written_off')
            .reduce((sum, i) => sum + i.totalCost, 0)
        }
      }

      const byItemType = {
        products: {
          count: filteredItems.filter(i => i.itemType === 'product').length,
          cost: filteredItems
            .filter(i => i.itemType === 'product')
            .reduce((sum, i) => sum + i.totalCost, 0)
        },
        preparations: {
          count: filteredItems.filter(i => i.itemType === 'preparation').length,
          cost: filteredItems
            .filter(i => i.itemType === 'preparation')
            .reduce((sum, i) => sum + i.totalCost, 0)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Aggregations calculated', {
        byDepartment,
        byStatus,
        byItemType
      })

      // 7. Create report
      const report: NegativeInventoryReport = {
        period: { dateFrom, dateTo },
        summary,
        items: filteredItems,
        byDepartment,
        byStatus,
        byItemType,
        generatedAt: TimeUtils.getCurrentLocalISO()
      }

      currentReport.value = report

      DebugUtils.info(MODULE_NAME, 'Negative inventory report generated successfully', {
        totalItems: summary.totalItems,
        totalEvents: summary.totalEvents,
        totalCostImpact: summary.totalCostImpact
      })

      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Export report to CSV
   */
  function exportReportToCSV(report: NegativeInventoryReport): string {
    const headers = [
      'Item Name',
      'Item Type',
      'Category',
      'Department',
      'Batch Number',
      'Event Date',
      'Negative Quantity',
      'Unit',
      'Cost Per Unit',
      'Total Cost',
      'Status',
      'Reason'
    ]

    const rows = report.items.map(item => [
      item.itemName,
      item.itemType,
      item.category,
      item.department,
      item.batchNumber,
      TimeUtils.formatDateForDisplay(item.eventDate),
      item.negativeQuantity.toString(),
      item.unit,
      item.costPerUnit.toString(),
      item.totalCost.toString(),
      item.status,
      item.reason
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    return csv
  }

  /**
   * Clear current report
   */
  function clearReport(): void {
    currentReport.value = null
    error.value = null
  }

  return {
    // State
    currentReport,
    loading,
    error,

    // Actions
    generateReport,
    exportReportToCSV,
    clearReport
  }
})
