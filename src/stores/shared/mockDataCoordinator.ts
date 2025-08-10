// src/stores/shared/mockDataCoordinator.ts - Шаг 3: Базовый координатор

import { CORE_PRODUCTS } from './productDefinitions'
import type { Product } from '@/stores/productsStore/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: any[] // Пока пустой массив
  } | null = null

  constructor() {
    DebugUtils.info(MODULE_NAME, '🏗️ Initializing mock data coordinator')
  }

  // Products Store data
  getProductsStoreData() {
    if (!this.productsData) {
      this.productsData = this.generateProductsData()
    }
    return this.productsData
  }

  private generateProductsData() {
    DebugUtils.debug(MODULE_NAME, '🛍️ Generating products data from definitions')

    const now = new Date().toISOString()
    const products: Product[] = CORE_PRODUCTS.map(productDef => ({
      id: productDef.id,
      name: productDef.name,
      nameEn: productDef.nameEn, // 🆕 English support
      category: productDef.category,
      unit: productDef.unit,
      currentCostPerUnit: productDef.basePrice, // 🆕 Real current price
      yieldPercentage: productDef.yieldPercentage,
      canBeSold: productDef.canBeSold, // 🆕 Enhanced flag
      storageConditions: this.getStorageConditions(productDef.category),
      shelfLifeDays: productDef.shelfLifeDays,
      minStock: this.calculateMinStock(productDef), // 🆕 Will be calculated properly later
      maxStock: this.calculateMaxStock(productDef), // 🆕 Will be calculated properly later
      primarySupplierId: productDef.primarySupplierId,
      leadTimeDays: productDef.leadTimeDays,
      isActive: true,
      tags: this.generateTags(productDef),
      createdAt: now,
      updatedAt: now
    }))

    const priceHistory: any[] = [] // Пока пустой, заполним в следующих шагах

    DebugUtils.info(MODULE_NAME, '✅ Products data generated', {
      total: products.length,
      sellable: products.filter(p => p.canBeSold).length,
      rawMaterials: products.filter(p => !p.canBeSold).length,
      priceHistoryRecords: priceHistory.length
    })

    return { products, priceHistory }
  }

  private getStorageConditions(category: string): string {
    const conditions: Record<string, string> = {
      meat: 'Refrigerator +2°C to +4°C',
      dairy: 'Refrigerator +2°C to +6°C',
      vegetables: 'Cool dry place',
      beverages: 'Room temperature or refrigerated',
      spices: 'Dry place, room temperature',
      other: 'As per packaging instructions'
    }
    return conditions[category] || 'Room temperature'
  }

  private calculateMinStock(productDef: any): number {
    // Простая формула: daily consumption * lead time * safety factor
    return Math.round(productDef.dailyConsumption * productDef.leadTimeDays * 1.5 * 100) / 100
  }

  private calculateMaxStock(productDef: any): number {
    // Простая формула: min stock * 3
    return Math.round(this.calculateMinStock(productDef) * 3 * 100) / 100
  }

  private generateTags(productDef: any): string[] {
    const tags: string[] = []

    if (productDef.canBeSold) {
      tags.push('direct-sale')
    } else {
      tags.push('raw-material')
    }

    if (productDef.shelfLifeDays <= 7) {
      tags.push('perishable')
    }

    if (productDef.priceVolatility > 0.08) {
      tags.push('volatile-price')
    }

    tags.push(productDef.category)

    return tags
  }

  // 🆕 Future methods for other stores (пока заглушки)
  getSupplierStoreData() {
    DebugUtils.debug(MODULE_NAME, '📦 Supplier data not implemented yet')
    return {
      orders: [],
      receipts: []
    }
  }

  getStorageStoreData() {
    DebugUtils.debug(MODULE_NAME, '🏪 Storage data not implemented yet')
    return {
      operations: [],
      batches: []
    }
  }

  getRecipeStoreData() {
    DebugUtils.debug(MODULE_NAME, '👨‍🍳 Recipe data not implemented yet')
    return {
      recipes: [],
      preparations: []
    }
  }
}

// Singleton instance
export const mockDataCoordinator = new MockDataCoordinator()
