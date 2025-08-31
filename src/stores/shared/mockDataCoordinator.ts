// src/stores/shared/mockDataCoordinator.ts - ОБНОВЛЕННАЯ ВЕРСИЯ
// ИНТЕГРАЦИЯ С storageDefinitions.ts и использование базовых единиц

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import { getSupplierWorkflowData } from './supplierDefinitions'
import { getStorageWorkflowData } from './storageDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import type { Counteragent } from '@/stores/counteragents/types'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion
} from '@/stores/supplier_2/types'
import type { StorageOperation, StorageBalance, StorageBatch } from '@/stores/storage/types'
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
    operations: StorageOperation[]
    balances: StorageBalance[]
    batches: StorageBatch[]
  } | null = null

  constructor() {
    DebugUtils.info(
      MODULE_NAME,
      'Initializing unified mock data coordinator with BASE UNITS support'
    )

    // Validate product definitions
    if (import.meta.env.DEV) {
      this.validateProductDefinitions()
      this.validateStorageIntegration()
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
    }
  }

  private validateStorageIntegration(): void {
    try {
      const storageData = this.getStorageStoreData()

      DebugUtils.info(MODULE_NAME, 'Storage integration validated', {
        balances: storageData.balances.length,
        batches: storageData.batches.length,
        operations: storageData.operations.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Storage integration validation failed', { error })
    }
  }

  // =============================================
  // PRODUCTS STORE DATA
  // =============================================

  getProductsStoreData() {
    if (!this.productsData) {
      this.productsData = this.generateProductsStoreData()
    }
    return this.productsData
  }

  private generateProductsStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting product definitions to store format...')

      const products: Product[] = CORE_PRODUCTS.map(productDef => ({
        id: productDef.id,
        name: productDef.name,
        nameEn: productDef.nameEn,
        description: this.generateProductDescription(productDef),
        category: productDef.category,

        // ✅ СОВМЕСТИМОСТЬ: Старые поля для обратной совместимости
        unit: this.mapBaseUnitToLegacy(productDef.baseUnit),
        costPerUnit: productDef.purchaseCost, // Цена за единицу закупки

        // ✅ НОВЫЕ ПОЛЯ: Базовые единицы для расчетов
        baseUnit: productDef.baseUnit,
        baseCostPerUnit: productDef.baseCostPerUnit,

        // ✅ ЗАКУПОЧНЫЕ ЕДИНИЦЫ
        purchaseUnit: productDef.purchaseUnit,
        purchaseToBaseRatio: productDef.purchaseToBaseRatio,
        purchaseCost: productDef.purchaseCost,

        // Business logic
        canBeSold: productDef.canBeSold,
        isActive: true,
        tags: this.generateTags(productDef),

        // Supply chain info
        minStock: this.calculateMinStock(productDef),
        maxStock: this.calculateMaxStock(productDef),
        leadTimeDays: productDef.leadTimeDays,
        primarySupplierId: productDef.primarySupplierId,

        // Shelf life and yield
        shelfLifeDays: productDef.shelfLifeDays,
        yieldPercentage: productDef.yieldPercentage,

        // Storage
        storageConditions: this.getStorageConditions(productDef.category),

        // Metadata
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }))

      const priceHistory: ProductPriceHistory[] = this.generatePriceHistory(products)

      DebugUtils.info(MODULE_NAME, 'Products store data generated', {
        products: products.length,
        priceHistory: priceHistory.length,
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })

      return { products, priceHistory }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate products store data', { error })
      return { products: [], priceHistory: [] }
    }
  }

  private mapBaseUnitToLegacy(baseUnit: string): string {
    // Маппинг базовых единиц в старые единицы для совместимости
    const mapping: Record<string, string> = {
      gram: 'kg', // Показываем кг, но считаем в граммах
      ml: 'liter', // Показываем литры, но считаем в мл
      piece: 'piece' // Штуки остаются штуками
    }
    return mapping[baseUnit] || baseUnit
  }

  // =============================================
  // COUNTERAGENTS STORE DATA
  // =============================================

  getCounteragentsStoreData() {
    if (!this.counteragentsData) {
      this.counteragentsData = this.loadCounteragentsData()
    }
    return this.counteragentsData
  }

  private loadCounteragentsData() {
    const mockData = generateCounteragentsMockData()

    DebugUtils.info(MODULE_NAME, 'Counteragents data loaded', {
      counteragents: mockData.counteragents.length,
      suppliers: mockData.suppliers.length
    })

    return {
      counteragents: mockData.counteragents,
      suppliers: mockData.suppliers
    }
  }

  // =============================================
  // SUPPLIER STORE DATA - ИСПОЛЬЗУЕМ supplierDefinitions.ts
  // =============================================

  getSupplierStoreData() {
    if (!this.supplierStoreData) {
      this.supplierStoreData = this.loadSupplierStoreData()
    }
    return this.supplierStoreData
  }

  private loadSupplierStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading supplier store data...')

      const supplierData = getSupplierWorkflowData()

      // ✅ ИСПРАВЛЕНИЕ: НЕ загружаем статичные suggestions
      // Они будут генерироваться динамически из Storage данных
      return {
        requests: supplierData.requests,
        orders: supplierData.orders,
        receipts: supplierData.receipts,
        suggestions: [] // ← ПУСТОЙ МАССИВ! Генерируются динамически
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load supplier store data', { error })
      return {
        requests: [],
        orders: [],
        receipts: [],
        suggestions: [] // ← ПУСТОЙ даже при ошибке
      }
    }
  }

  // =============================================
  // STORAGE STORE DATA - ИСПОЛЬЗУЕМ storageDefinitions.ts
  // =============================================

  getStorageStoreData() {
    if (!this.storageStoreData) {
      this.storageStoreData = this.loadStorageStoreData()
    }
    return this.storageStoreData
  }

  private loadStorageStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading storage store data from storageDefinitions...')

      // ✅ НОВАЯ ИНТЕГРАЦИЯ: Используем storageDefinitions.ts
      const storageData = getStorageWorkflowData()
      const transitBatches = storageData.batches.filter(b => b.status === 'in_transit')
      const activeBatches = storageData.batches.filter(b => b.status === 'active')
      const balancesWithTransit = storageData.balances.filter(
        b => b.transitQuantity && b.transitQuantity > 0
      )

      DebugUtils.info(MODULE_NAME, 'Storage store data loaded successfully', {
        operations: storageData.operations.length,
        balances: storageData.balances.length,
        batches: storageData.batches.length,
        activeBatches: activeBatches.length,
        transitBatches: transitBatches.length,
        balancesWithTransit: balancesWithTransit.length,
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })

      return {
        operations: storageData.operations,
        balances: storageData.balances,
        batches: storageData.batches
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load storage store data', { error })
      return {
        operations: [],
        balances: [],
        batches: []
      }
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  getProductDefinition(productId: string): CoreProductDefinition | null {
    return CORE_PRODUCTS.find(p => p.id === productId) || null
  }

  getSupplierForProduct(productId: string): any {
    const product = this.getProductDefinition(productId)
    if (!product?.primarySupplierId) return null

    const counteragents = this.getCounteragentsStoreData()
    return counteragents.suppliers.find(s => s.id === product.primarySupplierId) || null
  }

  // =============================================
  // HELPER METHODS (используют Utils)
  // =============================================

  private generateProductDescription(productDef: CoreProductDefinition): string {
    const unitInfo = this.getDisplayUnitInfo(productDef.baseUnit, productDef.purchaseUnit)
    return `${productDef.nameEn} - ${unitInfo}`
  }

  private getDisplayUnitInfo(baseUnit: string, purchaseUnit: string): string {
    return `Stored in ${baseUnit}, purchased in ${purchaseUnit}`
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
    // ✅ Расчет в базовых единицах
    return Math.round(productDef.dailyConsumption * productDef.leadTimeDays * 1.5 * 1000) / 1000
  }

  private calculateMaxStock(productDef: CoreProductDefinition): number {
    return Math.round(this.calculateMinStock(productDef) * 3 * 1000) / 1000
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

  private generatePriceHistory(products: Product[]): ProductPriceHistory[] {
    const priceHistory: ProductPriceHistory[] = []

    products.forEach(product => {
      // Генерируем 3-5 записей истории цен за последние 6 месяцев
      const historyCount = 3 + Math.floor(Math.random() * 3)

      for (let i = 0; i < historyCount; i++) {
        const daysAgo = i * 30 + Math.floor(Math.random() * 20) // Примерно каждый месяц

        priceHistory.push({
          id: `price-${product.id}-${i}`,
          productId: product.id,

          // ✅ СТАРЫЕ ПОЛЯ (совместимость)
          pricePerUnit: product.costPerUnit,

          // ✅ НОВЫЕ ПОЛЯ (базовые единицы)
          basePricePerUnit: product.baseCostPerUnit,
          purchasePrice: product.purchaseCost,
          purchaseUnit: product.purchaseUnit,
          purchaseQuantity: product.purchaseToBaseRatio,

          effectiveDate: TimeUtils.getDateDaysAgo(daysAgo),
          sourceType: 'purchase_order',
          supplierId: product.primarySupplierId,
          notes: `Historical price data (${i + 1}/${historyCount})`,
          createdAt: TimeUtils.getDateDaysAgo(daysAgo),
          updatedAt: TimeUtils.getDateDaysAgo(daysAgo)
        })
      }
    })

    return priceHistory.sort(
      (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    )
  }

  // =============================================
  // CROSS-STORE INTEGRATION VALIDATION
  // =============================================

  validateStoreIntegration(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    summary: any
  } {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Проверяем данные всех сторов
      const products = this.getProductsStoreData()
      const counteragents = this.getCounteragentsStoreData()
      const suppliers = this.getSupplierStoreData()
      const storage = this.getStorageStoreData()

      // Валидация связей продуктов-поставщиков
      this.validateProductSupplierLinks(
        products.products,
        counteragents.suppliers,
        errors,
        warnings
      )

      // Валидация данных склада
      this.validateStorageData(storage, products.products, errors, warnings)

      // Валидация единиц измерения
      this.validateUnitsConsistency(products.products, storage, errors, warnings)

      const summary = {
        products: products.products.length,
        suppliers: counteragents.suppliers.length,
        storageBalances: storage.balances.length,
        storageBatches: storage.batches.length,
        storageOperations: storage.operations.length,
        supplierRequests: suppliers.requests.length,
        supplierOrders: suppliers.orders.length,
        supplierReceipts: suppliers.receipts.length
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      }
    } catch (error) {
      errors.push(`Integration validation failed: ${error}`)
      return {
        isValid: false,
        errors,
        warnings,
        summary: {}
      }
    }
  }

  private validateProductSupplierLinks(
    products: Product[],
    suppliers: Counteragent[],
    errors: string[],
    warnings: string[]
  ): void {
    const supplierIds = new Set(suppliers.map(s => s.id))

    products.forEach(product => {
      if (product.primarySupplierId && !supplierIds.has(product.primarySupplierId)) {
        errors.push(`Product ${product.name} has invalid supplier ID: ${product.primarySupplierId}`)
      }
    })
  }

  private validateStorageData(
    storage: {
      balances: StorageBalance[]
      batches: StorageBatch[]
      operations: StorageOperation[]
    },
    products: Product[],
    errors: string[],
    warnings: string[]
  ): void {
    const productIds = new Set(products.map(p => p.id))

    // Проверяем балансы
    storage.balances.forEach(balance => {
      if (!productIds.has(balance.itemId)) {
        errors.push(`Storage balance references unknown product: ${balance.itemId}`)
      }

      const product = products.find(p => p.id === balance.itemId)
      if (product && balance.unit !== product.baseUnit) {
        errors.push(
          `Unit mismatch for ${balance.itemName}: ` +
            `balance uses ${balance.unit}, product uses ${product.baseUnit}`
        )
      }
    })

    // Проверяем батчи
    storage.batches.forEach(batch => {
      if (!productIds.has(batch.itemId)) {
        errors.push(`Storage batch references unknown product: ${batch.itemId}`)
      }
    })
  }

  private validateUnitsConsistency(
    products: Product[],
    storage: { balances: StorageBalance[]; batches: StorageBatch[] },
    errors: string[],
    warnings: string[]
  ): void {
    // ✅ КРИТИЧНО: Проверяем что все данные в базовых единицах

    products.forEach(product => {
      if (!product.baseUnit) {
        errors.push(`Product ${product.name} missing baseUnit`)
        return
      }

      if (!product.baseCostPerUnit) {
        errors.push(`Product ${product.name} missing baseCostPerUnit`)
        return
      }

      // Проверяем корректность расчета базовой цены
      if (product.purchaseCost && product.purchaseToBaseRatio) {
        const expectedBaseCost = product.purchaseCost / product.purchaseToBaseRatio
        const actualBaseCost = product.baseCostPerUnit

        if (Math.abs(expectedBaseCost - actualBaseCost) > 1) {
          warnings.push(
            `Price calculation mismatch for ${product.name}: ` +
              `expected ${expectedBaseCost} IDR/${product.baseUnit}, ` +
              `got ${actualBaseCost} IDR/${product.baseUnit}`
          )
        }
      }
    })

    // Проверяем что все балансы в базовых единицах
    storage.balances.forEach(balance => {
      const product = products.find(p => p.id === balance.itemId)
      if (product && balance.unit !== product.baseUnit) {
        errors.push(
          `Storage balance unit error for ${balance.itemName}: ` +
            `should be ${product.baseUnit}, got ${balance.unit}`
        )
      }
    })
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

// =============================================
// SINGLETON INSTANCE
// =============================================

export const mockDataCoordinator = new MockDataCoordinator()

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  ;(window as any).__MOCK_DATA_COORDINATOR__ = mockDataCoordinator
  ;(window as any).__VALIDATE_STORE_INTEGRATION__ = () => {
    return mockDataCoordinator.validateStoreIntegration()
  }
  ;(window as any).__TEST_STORAGE_INTEGRATION__ = () => {
    const storageData = mockDataCoordinator.getStorageStoreData()
    const productsData = mockDataCoordinator.getProductsStoreData()

    console.log('=== STORAGE INTEGRATION TEST ===')
    console.log('Storage balances:', storageData.balances.length)
    console.log('Storage batches:', storageData.batches.length)
    console.log('Storage operations:', storageData.operations.length)
    console.log('Products:', productsData.products.length)

    // Тестируем несколько продуктов
    const testProducts = productsData.products.slice(0, 3)
    testProducts.forEach(product => {
      const balances = storageData.balances.filter(b => b.itemId === product.id)
      const batches = storageData.batches.filter(b => b.itemId === product.id)

      console.log(`\n📦 ${product.name}:`)
      console.log(`  Base Unit: ${product.baseUnit}`)
      console.log(`  Base Cost: ${product.baseCostPerUnit} IDR/${product.baseUnit}`)
      console.log(`  Balances: ${balances.length}`)
      console.log(`  Batches: ${batches.length}`)

      balances.forEach(balance => {
        console.log(`    ${balance.department}: ${balance.totalQuantity} ${balance.unit}`)
      })
    })

    return { storageData, productsData }
  }
  ;(window as any).__TEST_TRANSIT_BATCHES__ = () => {
    const storageData = mockDataCoordinator.getStorageStoreData()

    console.log('\n🚛 === TRANSIT BATCHES TEST ===')

    const transitBatches = storageData.batches.filter(b => b.status === 'in_transit')
    console.log(`Transit batches found: ${transitBatches.length}`)

    transitBatches.forEach(batch => {
      const isOverdue =
        batch.plannedDeliveryDate && new Date(batch.plannedDeliveryDate) < new Date()
      const isToday = batch.plannedDeliveryDate && TimeUtils.isToday(batch.plannedDeliveryDate)

      console.log(`\n📦 ${batch.itemId} (${batch.batchNumber})`)
      console.log(`  Quantity: ${batch.currentQuantity} ${batch.unit}`)
      console.log(`  Supplier: ${batch.supplierName}`)
      console.log(`  Order ID: ${batch.purchaseOrderId}`)
      console.log(`  Planned delivery: ${batch.plannedDeliveryDate}`)
      console.log(`  Status: ${isOverdue ? '🔴 OVERDUE' : isToday ? '🟡 DUE TODAY' : '🟢 ON TIME'}`)
    })

    // Тестируем балансы с транзитом
    console.log('\n📊 === BALANCES WITH TRANSIT ===')
    const balancesWithTransit = storageData.balances.filter(
      b => b.transitQuantity && b.transitQuantity > 0
    )
    console.log(`Balances with transit stock: ${balancesWithTransit.length}`)

    balancesWithTransit.forEach(balance => {
      console.log(`\n📦 ${balance.itemName} (${balance.department})`)
      console.log(`  On hand: ${balance.totalQuantity} ${balance.unit}`)
      console.log(`  In transit: ${balance.transitQuantity} ${balance.unit}`)
      console.log(`  Total available: ${balance.totalWithTransit} ${balance.unit}`)
      console.log(
        `  Next delivery: ${balance.nearestDelivery ? TimeUtils.formatDateForDisplay(balance.nearestDelivery) : 'N/A'}`
      )
    })

    return { transitBatches, balancesWithTransit }
  }
  ;(window as any).__TEST_BASE_UNITS_STORAGE__ = () => {
    const storageData = mockDataCoordinator.getStorageStoreData()

    console.log('=== STORAGE BASE UNITS VERIFICATION ===')

    // Проверяем первые несколько балансов
    storageData.balances.slice(0, 5).forEach(balance => {
      const product = mockDataCoordinator.getProductDefinition(balance.itemId)
      if (!product) return

      console.log(`\n📦 ${balance.itemName} (${balance.department})`)
      console.log(`  Stock: ${balance.totalQuantity} ${balance.unit}`)
      console.log(`  Expected unit: ${product.baseUnit}`)
      console.log(`  Cost: ${balance.latestCost} IDR/${balance.unit}`)
      console.log(`  Expected cost: ${product.baseCostPerUnit} IDR/${product.baseUnit}`)
      console.log(`  ✅ Units match: ${balance.unit === product.baseUnit}`)
      console.log(`  ✅ Cost match: ${Math.abs(balance.latestCost - product.baseCostPerUnit) < 1}`)
    })

    // Проверяем батчи
    console.log('\n=== BATCH VERIFICATION ===')
    storageData.batches.slice(0, 3).forEach(batch => {
      const product = mockDataCoordinator.getProductDefinition(batch.itemId)
      if (!product) return

      console.log(`\nBatch: ${batch.batchNumber}`)
      console.log(`  Quantity: ${batch.currentQuantity} ${batch.unit}`)
      console.log(`  Expected unit: ${product.baseUnit}`)
      console.log(`  Cost per unit: ${batch.costPerUnit} IDR/${batch.unit}`)
      console.log(`  ✅ Unit correct: ${batch.unit === product.baseUnit}`)
    })

    return storageData
  }

  setTimeout(() => {
    console.log('\n🎯 UPDATED Mock Data Coordinator loaded!')
    console.log('🔧 Now using storageDefinitions.ts for storage data')
    console.log('📏 All data in BASE UNITS (gram/ml/piece)')
    console.log('\nAvailable commands:')
    console.log('• window.__VALIDATE_STORE_INTEGRATION__()')
    console.log('• window.__TEST_STORAGE_INTEGRATION__()')
    console.log('• window.__TEST_BASE_UNITS_STORAGE__() - verify base units')
    console.log('• window.__TEST_TRANSIT_BATCHES__() - test transit functionality')
  }, 100)
}
