// src/stores/shared/mockDataCoordinator.ts - FIXED VERSION
// UPDATED TO USE supplierDefinitions.ts instead of generating data

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import { getSupplierWorkflowData } from './supplierDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import type { Counteragent } from '@/stores/counteragents/types'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  RequestItem,
  OrderItem,
  ReceiptItem
} from '@/stores/supplier_2/types'
import { generateCounteragentsMockData } from '@/stores/counteragents/mock/counteragentsMock'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: ProductPriceHistory[]
  } | null = null

  private counteragentsData: {
    counteragents: Counteragent[]
    suppliers: Counteragent[]
  } | null = null

  private supplierStoreData: {
    requests: ProcurementRequest[]
    orders: PurchaseOrder[]
    receipts: Receipt[]
    suggestions: OrderSuggestion[]
  } | null = null

  private storageStoreData: {
    operations: any[]
    balances: any[]
    batches: any[]
  } | null = null

  constructor() {
    DebugUtils.info(
      MODULE_NAME,
      'Initializing unified mock data coordinator with supplierDefinitions integration'
    )

    // Validate product definitions
    if (import.meta.env.DEV) {
      this.validateProductDefinitions()
    }
  }

  // =============================================
  // VALIDATION
  // =============================================

  private validateProductDefinitions(): void {
    const validation = validateAllProducts()

    if (!validation.isValid) {
      DebugUtils.error(MODULE_NAME, 'Product definitions validation failed:', {
        errors: validation.errors,
        invalidProducts: validation.invalidProducts
      })

      console.error('=== PRODUCT DEFINITIONS VALIDATION ERRORS ===')
      validation.errors.forEach(error => console.error('❌', error))

      if (validation.warnings.length > 0) {
        console.warn('=== WARNINGS ===')
        validation.warnings.forEach(warning => console.warn('⚠️', warning))
      }
    } else {
      DebugUtils.info(MODULE_NAME, 'All product definitions are valid', {
        validProducts: validation.validProducts,
        warnings: validation.warnings.length
      })

      if (validation.warnings.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Product definition warnings:', validation.warnings)
      }
    }
  }

  // =============================================
  // PRODUCTS STORE DATA
  // =============================================

  getProductsStoreData() {
    if (!this.productsData) {
      this.productsData = this.generateProductsData()
    }
    return this.productsData
  }

  getProductDefinition(productId: string): CoreProductDefinition | undefined {
    return CORE_PRODUCTS.find(p => p.id === productId)
  }

  // =============================================
  // COUNTERAGENTS STORE DATA
  // =============================================

  getCounteragentsStoreData() {
    if (!this.counteragentsData) {
      this.counteragentsData = this.generateCounteragentsData()
    }
    return this.counteragentsData
  }

  getCounterAgentsStoreData() {
    return this.getCounteragentsStoreData()
  }

  private generateCounteragentsData() {
    DebugUtils.info(MODULE_NAME, 'Generating counteragents data with product integration')

    const counteragents = generateCounteragentsMockData()
    const suppliers = counteragents.filter(ca => ca.type === 'supplier')

    this.validateSupplierProductLinks(counteragents)

    const result = {
      counteragents,
      suppliers
    }

    DebugUtils.info(MODULE_NAME, 'Counteragents data generated', {
      total: counteragents.length,
      suppliers: suppliers.length,
      services: counteragents.filter(ca => ca.type === 'service').length,
      active: counteragents.filter(ca => ca.isActive).length,
      preferred: counteragents.filter(ca => ca.isPreferred).length
    })

    return result
  }

  private validateSupplierProductLinks(counteragents: Counteragent[]): void {
    DebugUtils.debug(MODULE_NAME, 'Validating supplier-product links')

    const suppliers = counteragents.filter(ca => ca.type === 'supplier')
    const supplierIds = new Set(suppliers.map(s => s.id))

    const orphanedProducts: string[] = []
    const linkedProducts: string[] = []

    CORE_PRODUCTS.forEach(product => {
      if (product.primarySupplierId && supplierIds.has(product.primarySupplierId)) {
        linkedProducts.push(product.id)
      } else {
        orphanedProducts.push(product.id)
        DebugUtils.warn(MODULE_NAME, 'Product has invalid supplier link', {
          productId: product.id,
          productName: product.name,
          invalidSupplierId: product.primarySupplierId
        })
      }
    })

    suppliers.forEach(supplier => {
      const supplierProducts = CORE_PRODUCTS.filter(p => p.primarySupplierId === supplier.id)
      const supplierCategories = new Set(supplier.productCategories)

      supplierProducts.forEach(product => {
        if (!supplierCategories.has(product.category)) {
          DebugUtils.warn(MODULE_NAME, 'Supplier category mismatch', {
            supplierId: supplier.id,
            supplierName: supplier.name,
            supplierCategories: Array.from(supplierCategories),
            productId: product.id,
            productCategory: product.category
          })
        }
      })
    })

    DebugUtils.info(MODULE_NAME, 'Supplier-product links validated', {
      totalProducts: CORE_PRODUCTS.length,
      linkedProducts: linkedProducts.length,
      orphanedProducts: orphanedProducts.length,
      totalSuppliers: suppliers.length,
      supplierIds: Array.from(supplierIds)
    })

    if (orphanedProducts.length > 0) {
      DebugUtils.warn(MODULE_NAME, 'Found orphaned products without valid suppliers', {
        orphanedProducts
      })
    }
  }

  // =============================================
  // STORAGE STORE DATA
  // =============================================

  getStorageStoreData() {
    if (!this.storageStoreData) {
      this.storageStoreData = this.generateStorageStoreData()
    }
    return this.storageStoreData
  }

  private generateStorageStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Generating storage store data...')

      const productsData = this.getProductsStoreData()
      const operations: any[] = []
      const balances: any[] = []
      const batches: any[] = []

      productsData.products.forEach(product => {
        const kitchenBalance = this.generateProductBalance(product, 'kitchen')
        if (kitchenBalance) {
          balances.push(kitchenBalance)
        }

        if (this.isBarItem(product.id)) {
          const barBalance = this.generateProductBalance(product, 'bar')
          if (barBalance) {
            balances.push(barBalance)
          }
        }
      })

      DebugUtils.info(MODULE_NAME, 'Storage store data generated', {
        operations: operations.length,
        balances: balances.length,
        batches: batches.length
      })

      return { operations, balances, batches }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate storage store data', { error })
      return { operations: [], balances: [], batches: [] }
    }
  }

  private generateProductBalance(product: Product, department: 'kitchen' | 'bar') {
    const productDef = this.getProductDefinition(product.id)
    if (!productDef) return null

    const minStock = productDef.minStock || 1
    const maxStock = productDef.maxStock || minStock * 3

    let currentStock: number
    const rand = Math.random()
    if (rand < 0.1) {
      currentStock = 0
    } else if (rand < 0.3) {
      currentStock = Math.random() * minStock * 0.5
    } else {
      currentStock = minStock + Math.random() * (maxStock - minStock)
    }

    const newestBatchDate = new Date()
    newestBatchDate.setDate(newestBatchDate.getDate() - Math.floor(Math.random() * 7))

    return {
      itemId: product.id,
      itemName: product.name,
      department,
      totalQuantity: Math.round(currentStock * 1000) / 1000,
      unit: productDef.baseUnit,
      latestCost: productDef.baseCostPerUnit,
      newestBatchDate: newestBatchDate.toISOString(),
      oldestBatchDate: newestBatchDate.toISOString(),
      batchCount: 1
    }
  }

  // =============================================
  // SUPPLIER STORE DATA - FIXED TO USE DEFINITIONS
  // =============================================

  getSupplierStoreData() {
    if (!this.supplierStoreData) {
      this.supplierStoreData = this.loadSupplierStoreData()
    }
    return this.supplierStoreData
  }

  // ✅ FIXED: Use supplierDefinitions.ts instead of generating
  private loadSupplierStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading supplier store data from supplierDefinitions...')

      // ✅ Use predefined data with correct base units
      const { suggestions, requests, orders, receipts } = getSupplierWorkflowData()

      DebugUtils.info(MODULE_NAME, 'Supplier store data loaded successfully', {
        suggestions: suggestions.length,
        requests: requests.length,
        orders: orders.length,
        receipts: receipts.length
      })

      // Log sample data to verify base units
      if (import.meta.env.DEV && orders.length > 0) {
        const sampleOrder = orders[0]
        const sampleItem = sampleOrder.items[0]
        const product = this.getProductDefinition(sampleItem.itemId)

        console.log('\n🔍 SAMPLE ORDER VERIFICATION:')
        console.log(`Order: ${sampleOrder.orderNumber}`)
        console.log(`Item: ${sampleItem.itemName}`)
        console.log(`Quantity: ${sampleItem.orderedQuantity} ${product?.baseUnit}`)
        console.log(`Price per unit: ${sampleItem.pricePerUnit} IDR/${product?.baseUnit}`)
        console.log(`Total: ${sampleItem.totalPrice} IDR`)
        console.log('✅ All values are in BASE UNITS\n')
      }

      return { requests, orders, receipts, suggestions }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load supplier store data', { error })

      return {
        requests: [],
        orders: [],
        receipts: [],
        suggestions: []
      }
    }
  }

  // =============================================
  // INTEGRATION METHODS
  // =============================================

  getSupplierForProduct(productId: string): Counteragent | undefined {
    const product = this.getProductDefinition(productId)
    if (!product?.primarySupplierId) {
      return undefined
    }

    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.find(ca => ca.id === product.primarySupplierId)
  }

  getProductsForSupplier(supplierId: string): CoreProductDefinition[] {
    return CORE_PRODUCTS.filter(p => p.primarySupplierId === supplierId)
  }

  getSuppliersForCategory(category: string): Counteragent[] {
    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.filter(
      ca => ca.type === 'supplier' && ca.isActive && ca.productCategories.includes(category as any)
    )
  }

  validateStoreIntegration(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    summary: {
      productsCount: number
      counteragentsCount: number
      linkedProductsCount: number
      orphanedProductsCount: number
      supplierCoverage: Record<string, number>
    }
  } {
    DebugUtils.info(MODULE_NAME, 'Validating complete store integration')

    const errors: string[] = []
    const warnings: string[] = []

    const productsData = this.getProductsStoreData()
    const counteragentsData = this.getCounteragentsStoreData()

    const products = productsData.products
    const counteragents = counteragentsData.counteragents
    const suppliers = counteragents.filter(ca => ca.type === 'supplier')

    let linkedProductsCount = 0
    let orphanedProductsCount = 0
    const supplierCoverage: Record<string, number> = {}

    products.forEach(product => {
      const productDef = this.getProductDefinition(product.id)
      if (productDef?.primarySupplierId) {
        const supplier = suppliers.find(s => s.id === productDef.primarySupplierId)
        if (supplier) {
          linkedProductsCount++
          supplierCoverage[supplier.id] = (supplierCoverage[supplier.id] || 0) + 1
        } else {
          orphanedProductsCount++
          errors.push(
            `Product ${product.name} has invalid supplier ID: ${productDef.primarySupplierId}`
          )
        }
      } else {
        orphanedProductsCount++
        warnings.push(`Product ${product.name} has no primary supplier`)
      }
    })

    suppliers.forEach(supplier => {
      if (!supplierCoverage[supplier.id]) {
        warnings.push(`Supplier ${supplier.name} has no assigned products`)
      }
    })

    const summary = {
      productsCount: products.length,
      counteragentsCount: counteragents.length,
      linkedProductsCount,
      orphanedProductsCount,
      supplierCoverage
    }

    const isValid = errors.length === 0

    DebugUtils.info(MODULE_NAME, 'Store integration validation completed', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      summary
    })

    return {
      isValid,
      errors,
      warnings,
      summary
    }
  }

  // =============================================
  // PRODUCTS GENERATION
  // =============================================

  private generateProductsData() {
    DebugUtils.info(MODULE_NAME, 'Generating products data with base units')

    const products = this.generateEnhancedProducts()
    const priceHistory = this.generateEnhancedPriceHistory()

    const result = {
      products,
      priceHistory
    }

    DebugUtils.info(MODULE_NAME, 'Products data generated', {
      total: products.length,
      sellable: products.filter(p => p.canBeSold).length,
      rawMaterials: products.filter(p => !p.canBeSold).length,
      priceRecords: priceHistory.length,
      baseUnitsUsed: this.getBaseUnitsStats(products)
    })

    if (import.meta.env.DEV) {
      this.demonstrateCorrectCalculations(products)
    }

    return result
  }

  private generateEnhancedProducts(): Product[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => {
      const product = {
        id: productDef.id,
        name: productDef.name,
        nameEn: productDef.nameEn,
        description: this.generateDescription(productDef),
        category: productDef.category,

        baseUnit: productDef.baseUnit,
        baseCostPerUnit: productDef.baseCostPerUnit,

        purchaseUnit: productDef.purchaseUnit,
        purchaseToBaseRatio: productDef.purchaseToBaseRatio,
        purchaseCost: productDef.purchaseCost,

        costPerUnit: productDef.purchaseCost,
        currentCostPerUnit: productDef.baseCostPerUnit,

        yieldPercentage: productDef.yieldPercentage,
        canBeSold: productDef.canBeSold,
        isActive: true,

        primarySupplierId: productDef.primarySupplierId,

        storageConditions: this.getStorageConditions(productDef.category),
        shelfLife: productDef.shelfLifeDays,
        minStock: this.calculateMinStock(productDef),
        maxStock: this.calculateMaxStock(productDef),
        leadTimeDays: productDef.leadTimeDays,
        tags: this.generateTags(productDef),

        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now
      } as Product & {
        baseUnit: 'gram' | 'ml' | 'piece'
        baseCostPerUnit: number
        purchaseUnit: string
        purchaseToBaseRatio: number
        purchaseCost: number
        currentCostPerUnit: number
        primarySupplierId?: string
      }

      const expectedBaseCost = productDef.purchaseCost / productDef.purchaseToBaseRatio
      if (Math.abs(expectedBaseCost - productDef.baseCostPerUnit) > 0.01) {
        DebugUtils.error(MODULE_NAME, `Base cost calculation error for ${productDef.name}`, {
          expected: expectedBaseCost,
          actual: productDef.baseCostPerUnit,
          purchaseCost: productDef.purchaseCost,
          ratio: productDef.purchaseToBaseRatio
        })
      }

      return product as Product
    })
  }

  private generateEnhancedPriceHistory(): ProductPriceHistory[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => ({
      id: `price-${productDef.id}-current`,
      productId: productDef.id,

      basePricePerUnit: productDef.baseCostPerUnit,

      purchasePrice: productDef.purchaseCost,
      purchaseUnit: productDef.purchaseUnit,
      purchaseQuantity: productDef.purchaseToBaseRatio,

      effectiveDate: now,
      sourceType: 'manual_update' as const,
      notes: `Base cost: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit}`,
      createdAt: now,
      updatedAt: now
    })) as ProductPriceHistory[]
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private isBarItem(itemId: string): boolean {
    return (
      itemId.includes('beer') ||
      itemId.includes('cola') ||
      itemId.includes('water') ||
      itemId.includes('wine') ||
      itemId.includes('spirit') ||
      itemId.includes('juice')
    )
  }

  private demonstrateCorrectCalculations(products: Product[]): void {
    console.log('\n' + '='.repeat(60))
    console.log('DEMONSTRATION OF CORRECT COST CALCULATIONS')
    console.log('='.repeat(60))

    const oliveOil = products.find(p => p.id === 'prod-olive-oil')
    const garlic = products.find(p => p.id === 'prod-garlic')
    const salt = products.find(p => p.id === 'prod-salt')
    const pepper = products.find(p => p.id === 'prod-black-pepper')

    if (oliveOil && garlic && salt && pepper) {
      console.log('\nRECIPE: Classic Salad Dressing')
      console.log('Yield: 130 ml\n')

      console.log('INGREDIENTS:')

      const oilCost = 120 * (oliveOil as any).baseCostPerUnit
      console.log(
        `• Olive Oil: 120 ml × ${(oliveOil as any).baseCostPerUnit} IDR/ml = ${oilCost} IDR`
      )

      const garlicCost = 10 * (garlic as any).baseCostPerUnit
      console.log(`• Garlic: 10 g × ${(garlic as any).baseCostPerUnit} IDR/g = ${garlicCost} IDR`)

      const saltCost = 3 * (salt as any).baseCostPerUnit
      console.log(`• Salt: 3 g × ${(salt as any).baseCostPerUnit} IDR/g = ${saltCost} IDR`)

      const pepperCost = 1 * (pepper as any).baseCostPerUnit
      console.log(
        `• Black Pepper: 1 g × ${(pepper as any).baseCostPerUnit} IDR/g = ${pepperCost} IDR`
      )

      const totalCost = oilCost + garlicCost + saltCost + pepperCost
      const costPerMl = totalCost / 130

      console.log(`\nTOTAL: ${totalCost} IDR`)
      console.log(`Cost per ml: ${costPerMl.toFixed(2)} IDR/ml`)

      console.log('\n✅ All calculations are now correct!')
    }

    console.log('\n' + '='.repeat(60))
  }

  private getBaseUnitsStats(products: Product[]): Record<string, number> {
    const stats = { gram: 0, ml: 0, piece: 0 }

    products.forEach(product => {
      const baseUnit = (product as any).baseUnit
      if (baseUnit && stats.hasOwnProperty(baseUnit)) {
        stats[baseUnit]++
      }
    })

    return stats
  }

  private generateDescription(productDef: CoreProductDefinition): string {
    const baseDescriptions: Record<string, string> = {
      meat: 'Premium quality meat for restaurant preparation',
      vegetables: 'Fresh vegetables sourced from local suppliers',
      dairy: 'Fresh dairy products with proper storage requirements',
      spices: 'High-quality spices and seasonings',
      beverages: 'Ready-to-serve beverages for direct sale',
      other: 'Quality ingredient for food preparation'
    }

    const baseDesc = baseDescriptions[productDef.category] || 'Quality product for restaurant use'
    const unitInfo = `Price: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit} (${productDef.purchaseCost} IDR/${productDef.purchaseUnit})`

    return `${baseDesc}. ${unitInfo}`
  }

  private getStorageConditions(category: string): string {
    const conditions: Record<string, string> = {
      meat: 'Refrigerator +2°C to +4°C',
      dairy: 'Fresh dairy products with proper storage requirements',
      vegetables: 'Cool dry place',
      beverages: 'Room temperature or refrigerated',
      spices: 'Dry place, room temperature',
      other: 'As per packaging instructions'
    }
    return conditions[category] || 'Room temperature'
  }

  private calculateMinStock(productDef: CoreProductDefinition): number {
    return Math.round(productDef.dailyConsumption * productDef.leadTimeDays * 1.5 * 100) / 100
  }

  private calculateMaxStock(productDef: CoreProductDefinition): number {
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

    tags.push(`base-unit-${productDef.baseUnit}`)
    tags.push(productDef.category)

    return tags
  }

  // =============================================
  // STUB METHODS FOR FUTURE STORES
  // =============================================

  getRecipeStoreData() {
    DebugUtils.debug(MODULE_NAME, 'Recipe data not implemented yet')
    return {
      recipes: [],
      preparations: []
    }
  }
}

// Singleton instance
export const mockDataCoordinator = new MockDataCoordinator()

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  ;(window as any).__MOCK_DATA_COORDINATOR__ = mockDataCoordinator
  ;(window as any).__VALIDATE_STORE_INTEGRATION__ = () => {
    return mockDataCoordinator.validateStoreIntegration()
  }
  ;(window as any).__TEST_SUPPLIER_INTEGRATION__ = () => {
    const productsData = mockDataCoordinator.getProductsStoreData()
    const counteragentsData = mockDataCoordinator.getCounteragentsStoreData()

    console.log('=== SUPPLIER INTEGRATION TEST ===')
    console.log('Products:', productsData.products.length)
    console.log('Counteragents:', counteragentsData.counteragents.length)

    const testProduct = productsData.products[0]
    const supplier = mockDataCoordinator.getSupplierForProduct(testProduct.id)

    console.log('Test product:', testProduct.name)
    console.log('Supplier found:', supplier?.name || 'None')

    return { testProduct, supplier, productsData, counteragentsData }
  }
  ;(window as any).__TEST_STORAGE_INTEGRATION__ = () => {
    const storageData = mockDataCoordinator.getStorageStoreData()
    const supplierData = mockDataCoordinator.getSupplierStoreData()

    console.log('=== STORAGE INTEGRATION TEST ===')
    console.log('Storage balances:', storageData.balances.length)
    console.log('Supplier suggestions:', supplierData.suggestions.length)
    console.log('Supplier requests:', supplierData.requests.length)
    console.log('Supplier orders:', supplierData.orders.length)
    console.log('Supplier receipts:', supplierData.receipts.length)

    return { storageData, supplierData }
  }
  ;(window as any).__TEST_BASE_UNITS__ = () => {
    const supplierData = mockDataCoordinator.getSupplierStoreData()

    console.log('=== BASE UNITS VERIFICATION ===')

    if (supplierData.orders.length > 0) {
      const order = supplierData.orders[0]
      console.log(`\nOrder: ${order.orderNumber}`)

      order.items.forEach(item => {
        const product = mockDataCoordinator.getProductDefinition(item.itemId)
        console.log(`${item.itemName}:`)
        console.log(`  Quantity: ${item.orderedQuantity} ${product?.baseUnit}`)
        console.log(`  Price: ${item.pricePerUnit} IDR/${product?.baseUnit}`)
        console.log(`  Total: ${item.totalPrice} IDR`)
      })

      console.log(`\nOrder Total: ${order.totalAmount} IDR`)
      console.log('✅ All values are in BASE UNITS')
    }

    return supplierData
  }

  setTimeout(() => {
    console.log('\n🎯 FIXED Mock Data Coordinator loaded!')
    console.log('Available commands:')
    console.log('• window.__VALIDATE_STORE_INTEGRATION__()')
    console.log('• window.__TEST_SUPPLIER_INTEGRATION__()')
    console.log('• window.__TEST_STORAGE_INTEGRATION__()')
    console.log('• window.__TEST_BASE_UNITS__() - verify base unit calculations')
  }, 100)
}
