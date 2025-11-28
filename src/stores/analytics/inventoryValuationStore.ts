// src/stores/analytics/inventoryValuationStore.ts
// ✅ SPRINT 5: Inventory Valuation Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import type { InventoryValuation } from './types'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'

const MODULE_NAME = 'InventoryValuationStore'

export const useInventoryValuationStore = defineStore('inventoryValuation', () => {
  // State
  const currentValuation = ref<InventoryValuation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Calculate Inventory Valuation (FIFO method)
   * ✅ SPRINT 5: Main entry point for inventory valuation
   */
  async function calculateValuation(): Promise<InventoryValuation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Calculating inventory valuation (FIFO)')

      const storageStore = useStorageStore()
      const preparationStore = usePreparationStore()
      const productsStore = useProductsStore()
      const recipesStore = useRecipesStore()

      // 1. Calculate products value from storage batches
      const storageBatches = storageStore.allBatches || []
      let productsValue = 0
      let productsBatchCount = 0

      const warehouseValuation = new Map<
        string,
        { warehouseName: string; value: number; batchCount: number }
      >()

      DebugUtils.info(MODULE_NAME, 'Processing storage batches', {
        totalBatches: storageBatches.length,
        totalProducts: productsStore.products.length
      })

      const productItemIds = new Set<string>()

      for (const batch of storageBatches) {
        if (batch.currentQuantity > 0) {
          const batchValue = batch.currentQuantity * batch.costPerUnit
          productsValue += batchValue
          productsBatchCount++
          productItemIds.add(batch.itemId)

          // Track by warehouse
          const warehouseId = batch.warehouseId || 'unknown'
          if (!warehouseValuation.has(warehouseId)) {
            warehouseValuation.set(warehouseId, {
              warehouseName: batch.warehouseId || 'Unknown',
              value: 0,
              batchCount: 0
            })
          }
          const warehouse = warehouseValuation.get(warehouseId)!
          warehouse.value += batchValue
          warehouse.batchCount++
        }
      }

      DebugUtils.info(MODULE_NAME, 'Products valuation calculated', {
        value: productsValue,
        batchCount: productsBatchCount,
        uniqueProductCount: productItemIds.size,
        batchesWithQuantity: storageBatches.filter(b => b.currentQuantity > 0).length,
        batchesWithZeroQuantity: storageBatches.filter(b => b.currentQuantity === 0).length
      })

      // 2. Calculate preparations value from preparation batches
      const preparationBatches = preparationStore.state.batches || []
      let preparationsValue = 0
      let preparationsBatchCount = 0

      DebugUtils.info(MODULE_NAME, 'Processing preparation batches', {
        totalBatches: preparationBatches.length,
        totalActivePreparations: recipesStore.activePreparations.length,
        allPreparations: recipesStore.preparations.length
      })

      const preparationItemIds = new Set<string>()

      for (const batch of preparationBatches) {
        if (batch.currentQuantity > 0) {
          const batchValue = batch.currentQuantity * batch.costPerUnit
          preparationsValue += batchValue
          preparationsBatchCount++
          preparationItemIds.add(batch.preparationId)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Preparations valuation calculated', {
        value: preparationsValue,
        batchCount: preparationsBatchCount,
        uniquePreparationCount: preparationItemIds.size,
        batchesWithQuantity: preparationBatches.filter(b => b.currentQuantity > 0).length,
        batchesWithZeroQuantity: preparationBatches.filter(b => b.currentQuantity === 0).length
      })

      // 3. Calculate by department (products + preparations)
      let kitchenValue = 0
      let barValue = 0
      let kitchenAndBarValue = 0

      // Products by department (based on usedInDepartments)
      let kitchenProductsCount = 0
      let barProductsCount = 0
      let bothProductsCount = 0
      let unknownProductsCount = 0

      for (const batch of storageBatches) {
        if (batch.currentQuantity > 0) {
          const batchValue = batch.currentQuantity * batch.costPerUnit
          const product = productsStore.products.find(p => p.id === batch.itemId)

          if (product?.usedInDepartments) {
            const deps = product.usedInDepartments
            const hasKitchen = deps.includes('kitchen')
            const hasBar = deps.includes('bar')

            if (hasKitchen && hasBar) {
              // Used in both departments
              kitchenAndBarValue += batchValue
              bothProductsCount++
            } else if (hasKitchen) {
              // Kitchen only
              kitchenValue += batchValue
              kitchenProductsCount++
            } else if (hasBar) {
              // Bar only
              barValue += batchValue
              barProductsCount++
            } else {
              // Default to kitchen if empty
              kitchenValue += batchValue
              unknownProductsCount++
            }
          } else {
            // Default to kitchen if no usedInDepartments
            kitchenValue += batchValue
            unknownProductsCount++
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Products by department calculated', {
        kitchenValue,
        barValue,
        kitchenAndBarValue,
        kitchenCount: kitchenProductsCount,
        barCount: barProductsCount,
        bothCount: bothProductsCount,
        unknownCount: unknownProductsCount
      })

      // Preparations by department (from preparation entity, not batch)
      let kitchenPrepsCount = 0
      let barPrepsCount = 0
      let bothPrepsCount = 0
      let unknownPrepsCount = 0

      for (const batch of preparationBatches) {
        if (batch.currentQuantity > 0) {
          const batchValue = batch.currentQuantity * batch.costPerUnit
          const preparation = recipesStore.preparations.find(p => p.id === batch.preparationId)

          if (preparation?.department) {
            if (preparation.department === 'kitchen') {
              kitchenValue += batchValue
              kitchenPrepsCount++
            } else if (preparation.department === 'bar') {
              barValue += batchValue
              barPrepsCount++
            } else if (preparation.department === 'all') {
              // 'all' means can be used in both departments
              kitchenAndBarValue += batchValue
              bothPrepsCount++
            } else {
              // Default to kitchen if unknown
              kitchenValue += batchValue
              unknownPrepsCount++
            }
          } else {
            // Default to kitchen if no department specified
            kitchenValue += batchValue
            unknownPrepsCount++
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Preparations by department calculated', {
        kitchenValue,
        barValue,
        kitchenAndBarValue,
        kitchenCount: kitchenPrepsCount,
        barCount: barPrepsCount,
        bothCount: bothPrepsCount,
        unknownCount: unknownPrepsCount
      })

      // 4. Calculate top items by value
      const itemsMap = new Map<
        string,
        {
          itemId: string
          itemName: string
          itemType: 'product' | 'preparation'
          department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown'
          quantity: number
          unit: string
          totalValue: number
          batchCount: number
          totalCost: number
        }
      >()

      // Products
      for (const batch of storageBatches) {
        if (batch.currentQuantity > 0) {
          const key = `product-${batch.itemId}`
          if (!itemsMap.has(key)) {
            const product = productsStore.products.find(p => p.id === batch.itemId)

            // Determine department
            let department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' = 'unknown'
            if (product?.usedInDepartments) {
              const deps = product.usedInDepartments
              const hasKitchen = deps.includes('kitchen')
              const hasBar = deps.includes('bar')

              if (hasKitchen && hasBar) {
                department = 'kitchenAndBar'
              } else if (hasKitchen) {
                department = 'kitchen'
              } else if (hasBar) {
                department = 'bar'
              }
            }

            itemsMap.set(key, {
              itemId: batch.itemId,
              itemName: product?.name || 'Unknown',
              itemType: 'product',
              department,
              quantity: 0,
              unit: product?.baseUnit || 'unit',
              totalValue: 0,
              batchCount: 0,
              totalCost: 0
            })
          }
          const item = itemsMap.get(key)!
          item.quantity += batch.currentQuantity
          item.totalValue += batch.currentQuantity * batch.costPerUnit
          item.totalCost += batch.currentQuantity * batch.costPerUnit
          item.batchCount++
        }
      }

      // Preparations
      for (const batch of preparationBatches) {
        if (batch.currentQuantity > 0) {
          const key = `preparation-${batch.preparationId}`
          if (!itemsMap.has(key)) {
            const preparation = recipesStore.preparations.find(p => p.id === batch.preparationId)

            // Determine department
            let department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' = 'unknown'
            if (preparation?.department) {
              if (preparation.department === 'kitchen') {
                department = 'kitchen'
              } else if (preparation.department === 'bar') {
                department = 'bar'
              } else if (preparation.department === 'all') {
                department = 'kitchenAndBar'
              }
            }

            itemsMap.set(key, {
              itemId: batch.preparationId,
              itemName: preparation?.name || 'Unknown',
              itemType: 'preparation',
              department,
              quantity: 0,
              unit: preparation?.outputUnit || 'unit',
              totalValue: 0,
              batchCount: 0,
              totalCost: 0
            })
          }
          const item = itemsMap.get(key)!
          item.quantity += batch.currentQuantity
          item.totalValue += batch.currentQuantity * batch.costPerUnit
          item.totalCost += batch.currentQuantity * batch.costPerUnit
          item.batchCount++
        }
      }

      const allItems = Array.from(itemsMap.values()).map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemType: item.itemType,
        department: item.department,
        quantity: item.quantity,
        unit: item.unit,
        averageCostPerUnit: item.quantity > 0 ? item.totalCost / item.quantity : 0,
        totalValue: item.totalValue
      }))

      // ✅ FIXED: Show ALL items sorted by value, not just top 20
      const topItems = allItems.sort((a, b) => b.totalValue - a.totalValue)

      DebugUtils.info(MODULE_NAME, 'All inventory items calculated', {
        totalItems: allItems.length,
        productsCount: allItems.filter(i => i.itemType === 'product').length,
        preparationsCount: allItems.filter(i => i.itemType === 'preparation').length
      })

      // 5. Create valuation report
      const valuation: InventoryValuation = {
        calculatedAt: TimeUtils.getCurrentLocalISO(),
        totalValue: productsValue + preparationsValue,
        byType: {
          products: {
            value: productsValue,
            batchCount: productsBatchCount,
            itemCount: productItemIds.size // Unique products with batches
          },
          preparations: {
            value: preparationsValue,
            batchCount: preparationsBatchCount,
            // ✅ FIXED: Count unique preparations with batches (actual inventory items)
            itemCount: preparationItemIds.size // Unique preparations with batches
          }
        },
        byDepartment: {
          kitchen: kitchenValue,
          bar: barValue,
          kitchenAndBar: kitchenAndBarValue
        },
        byWarehouse: Object.fromEntries(warehouseValuation),
        topItems
      }

      currentValuation.value = valuation

      DebugUtils.info(MODULE_NAME, 'Inventory valuation calculated successfully', {
        totalValue: valuation.totalValue,
        productsValue,
        preparationsValue,
        kitchenValue,
        barValue,
        kitchenAndBarValue
      })

      return valuation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate valuation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Export valuation to JSON
   */
  function exportValuationToJSON(valuation: InventoryValuation): string {
    return JSON.stringify(valuation, null, 2)
  }

  /**
   * Clear current valuation
   */
  function clearValuation(): void {
    currentValuation.value = null
    error.value = null
  }

  return {
    // State
    currentValuation,
    loading,
    error,

    // Actions
    calculateValuation,
    exportValuationToJSON,
    clearValuation
  }
})
