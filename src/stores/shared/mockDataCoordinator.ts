// src/stores/shared/mockDataCoordinator.ts - Исправлено

import { CORE_PRODUCTS, type CoreProductDefinition } from './productDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: ProductPriceHistory[]
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

  // 🔧 ИСПРАВЛЕНО: добавляем метод для получения определений
  getProductDefinition(productId: string): CoreProductDefinition | undefined {
    return CORE_PRODUCTS.find(p => p.id === productId)
  }

  // 🆕 Generate Products Store data from definitions
  private generateProductsData() {
    DebugUtils.info(MODULE_NAME, '🛍️ Generating products data from definitions')

    const products = this.generateEnhancedProducts()
    const priceHistory = this.generateBasicPriceHistory()

    const result = {
      products,
      priceHistory
    }

    DebugUtils.info(MODULE_NAME, '✅ Products data generated', {
      total: products.length,
      sellable: products.filter(p => p.canBeSold).length,
      rawMaterials: products.filter(p => !p.canBeSold).length,
      priceRecords: priceHistory.length
    })

    return result
  }

  // 🔧 ИСПРАВЛЕНО: Generate enhanced products from definitions
  private generateEnhancedProducts(): Product[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => {
      // 🔧 ИСПРАВЛЕНО: создаем правильную структуру Product с дополнительными полями
      const product: Product & {
        nameEn?: string
        leadTimeDays?: number
        primarySupplierId?: string
        tags?: string[]
        currentCostPerUnit?: number
      } = {
        id: productDef.id,
        name: productDef.name,
        nameEn: productDef.nameEn, // 🆕 English support
        description: this.generateDescription(productDef),
        category: productDef.category,
        unit: productDef.unit,
        costPerUnit: productDef.basePrice, // Основное поле для Product
        currentCostPerUnit: productDef.basePrice, // 🆕 Дополнительное поле
        yieldPercentage: productDef.yieldPercentage,
        canBeSold: productDef.canBeSold, // 🆕 Enhanced flag
        storageConditions: this.getStorageConditions(productDef.category),
        shelfLife: productDef.shelfLifeDays,
        minStock: this.calculateMinStock(productDef), // 🆕 Will be calculated properly later
        maxStock: this.calculateMaxStock(productDef), // 🆕 Will be calculated properly later
        leadTimeDays: productDef.leadTimeDays, // 🔧 ИСПРАВЛЕНО: добавляем leadTimeDays
        primarySupplierId: productDef.primarySupplierId, // 🔧 ИСПРАВЛЕНО: добавляем supplierId
        isActive: true,
        tags: this.generateTags(productDef), // 🆕 Auto-generated tags
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago
        updatedAt: now
      }

      return product as Product
    })
  }

  // Generate basic price history (single record for now)
  private generateBasicPriceHistory(): ProductPriceHistory[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => ({
      id: `price-${productDef.id}-current`,
      productId: productDef.id,
      pricePerUnit: productDef.basePrice,
      effectiveDate: now,
      sourceType: 'manual_update' as const,
      createdAt: now,
      updatedAt: now
    }))
  }

  // Helper methods
  private generateDescription(productDef: CoreProductDefinition): string {
    const baseDescriptions: Record<string, string> = {
      meat: 'Premium quality meat for restaurant preparation',
      vegetables: 'Fresh vegetables sourced from local suppliers',
      dairy: 'Fresh dairy products with proper storage requirements',
      spices: 'High-quality spices and seasonings',
      beverages: 'Ready-to-serve beverages for direct sale',
      other: 'Quality ingredient for food preparation'
    }

    return baseDescriptions[productDef.category] || 'Quality product for restaurant use'
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

  private calculateMinStock(productDef: CoreProductDefinition): number {
    // Простая формула: daily consumption * lead time * safety factor
    return Math.round(productDef.dailyConsumption * productDef.leadTimeDays * 1.5 * 100) / 100
  }

  private calculateMaxStock(productDef: CoreProductDefinition): number {
    // Простая формула: min stock * 3
    return Math.round(this.calculateMinStock(productDef) * 3 * 100) / 100
  }

  private generateTags(productDef: CoreProductDefinition): string[] {
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
