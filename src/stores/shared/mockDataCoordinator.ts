// src/stores/shared/mockDataCoordinator.ts - ОБНОВЛЕННАЯ ВЕРСИЯ
// ИНТЕГРАЦИЯ С storageDefinitions.ts и использование базовых единиц

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import { getSupplierWorkflowData } from './supplierDefinitions'
import { getStorageWorkflowData } from './storageDefinitions'
import type { Product, ProductPriceHistory, PackageOption } from '@/stores/productsStore/types'
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
import type { MeasurementUnit } from '@/types/measurementUnits'

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
      DebugUtils.error(MODULE_NAME, 'Product definitions validation failed', {
        errors: validation.errors,
        warnings: validation.warnings
      })
      throw new Error('Invalid product definitions found')
    }

    DebugUtils.info(MODULE_NAME, 'Product definitions validated', {
      validProducts: validation.validProducts,
      warnings: validation.warnings.length
    })
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Валидация интеграции с системой упаковок
   */
  private validatePackageIntegration(
    products: Product[],
    errors: string[],
    warnings: string[]
  ): void {
    let totalPackages = 0
    let productsWithMultiplePackages = 0

    products.forEach(product => {
      totalPackages += product.packageOptions.length

      if (product.packageOptions.length > 1) {
        productsWithMultiplePackages++
      }

      // Проверяем что у каждого продукта есть хотя бы одна упаковка
      if (product.packageOptions.length === 0) {
        errors.push(`Product ${product.name} has no package options`)
        return
      }

      // Проверяем что recommendedPackageId существует
      if (product.recommendedPackageId) {
        const exists = product.packageOptions.some(pkg => pkg.id === product.recommendedPackageId)
        if (!exists) {
          errors.push(`Product ${product.name} has invalid recommendedPackageId`)
        }
      } else {
        warnings.push(`Product ${product.name} has no recommended package`)
      }

      // Проверяем качество данных упаковок
      product.packageOptions.forEach(pkg => {
        if (!pkg.packageName || pkg.packageName.trim().length === 0) {
          errors.push(`Product ${product.name}: package ${pkg.id} has empty name`)
        }

        if (!pkg.packageUnit) {
          errors.push(`Product ${product.name}: package ${pkg.id} has no packageUnit`)
        }
      })
    })

    DebugUtils.info(MODULE_NAME, 'Package integration validated', {
      totalProducts: products.length,
      totalPackages,
      productsWithMultiplePackages,
      averagePackagesPerProduct: (totalPackages / products.length).toFixed(1)
    })
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
      DebugUtils.info(
        MODULE_NAME,
        'Converting product definitions to store format with PackageOptions...'
      )

      const products: Product[] = []
      const priceHistory: ProductPriceHistory[] = []
      const now = TimeUtils.getCurrentLocalISO()

      CORE_PRODUCTS.forEach(productDef => {
        const packages: PackageOption[] = []

        // ✅ 1. ВСЕГДА создаем БАЗОВУЮ упаковку (1г/1мл/1шт)
        const basePackage: PackageOption = {
          id: `pkg-${productDef.id}-base`,
          productId: productDef.id,
          packageName: this.getBasePackageName(productDef.baseUnit),
          packageSize: 1, // ВСЕГДА 1!
          packageUnit: productDef.baseUnit as MeasurementUnit,
          packagePrice: productDef.baseCostPerUnit,
          baseCostPerUnit: productDef.baseCostPerUnit,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
        packages.push(basePackage)

        // ✅ 2. Создаем упаковку из purchaseUnit (если она отличается от базовой)
        if (productDef.purchaseToBaseRatio !== 1) {
          const purchasePackage: PackageOption = {
            id: `pkg-${productDef.id}-purchase`,
            productId: productDef.id,
            packageName: this.getPackageNameFromDefinition(productDef),
            packageSize: productDef.purchaseToBaseRatio,
            packageUnit: productDef.purchaseUnit as MeasurementUnit,
            packagePrice: productDef.purchaseCost,
            baseCostPerUnit: productDef.baseCostPerUnit,
            isActive: true,
            createdAt: now,
            updatedAt: now
          }
          packages.push(purchasePackage)
        }

        // ✅ СОЗДАЕМ ПРОДУКТ с новой структурой (БЕЗ legacy полей)
        const product: Product = {
          id: productDef.id,
          name: productDef.name,
          nameEn: productDef.nameEn,
          description: this.generateProductDescription(productDef),
          category: productDef.category,

          // ✅ ТОЛЬКО базовые единицы (без legacy)
          baseUnit: productDef.baseUnit,
          baseCostPerUnit: productDef.baseCostPerUnit,

          // ✅ УПАКОВКИ
          packageOptions: [basePackage],
          recommendedPackageId: basePackage.id,

          // Остальные поля
          yieldPercentage: productDef.yieldPercentage,
          canBeSold: productDef.canBeSold,
          isActive: true,
          shelfLife: productDef.shelfLifeDays,
          leadTimeDays: productDef.leadTimeDays,
          primarySupplierId: productDef.primarySupplierId,
          usedInDepartments: productDef.usedInDepartments,

          // Storage
          minStock: this.calculateMinStock(productDef),
          maxStock: this.calculateMaxStock(productDef),
          storageConditions: this.getStorageConditions(productDef.category),
          tags: this.generateTags(productDef),

          createdAt: now,
          updatedAt: now
        }

        // ✅ ДОБАВЛЯЕМ ДОПОЛНИТЕЛЬНЫЕ УПАКОВКИ для разнообразия
        const additionalPackages = this.generateAdditionalPackages(productDef, now)
        product.packageOptions.push(...additionalPackages)

        products.push(product)

        // История цен
        const priceHistoryItem: ProductPriceHistory = {
          id: `ph-${productDef.id}-1`,
          productId: productDef.id,
          pricePerUnit: productDef.baseCostPerUnit, // legacy поле
          basePricePerUnit: productDef.baseCostPerUnit,
          purchasePrice: productDef.purchaseCost,
          purchaseUnit: productDef.purchaseUnit as MeasurementUnit,
          purchaseQuantity: productDef.purchaseToBaseRatio,
          effectiveDate: TimeUtils.getDateDaysAgo(30),

          sourceType: 'manual_update',
          createdAt: now,
          updatedAt: now
        }

        priceHistory.push(priceHistoryItem)
      })

      DebugUtils.info(MODULE_NAME, 'Products store data generated with PackageOptions', {
        products: products.length,
        totalPackages: products.reduce((sum, p) => sum + p.packageOptions.length, 0),
        priceHistory: priceHistory.length,
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })

      // ✅ ИСПРАВЛЕНО: добавляем return!
      return { products, priceHistory }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate products store data', { error })
      return { products: [], priceHistory: [] }
    }
  }

  // ✅ НОВЫЙ метод для названий базовых упаковок
  private getBasePackageName(baseUnit: 'gram' | 'ml' | 'piece'): string {
    switch (baseUnit) {
      case 'gram':
        return 'Грамм (базовая)'
      case 'ml':
        return 'Миллилитр (базовая)'
      case 'piece':
        return 'Штука (базовая)'
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Генерирует название упаковки из определения
   */
  private getPackageNameFromDefinition(definition: CoreProductDefinition): string {
    const { purchaseUnit, purchaseToBaseRatio } = definition

    switch (purchaseUnit) {
      case 'kg':
        return purchaseToBaseRatio === 1000 ? 'Килограмм' : `${purchaseToBaseRatio / 1000} кг`
      case 'liter':
        return purchaseToBaseRatio === 1000 ? 'Литр' : `${purchaseToBaseRatio / 1000} л`
      case 'piece':
        return 'Штука'
      case 'pack':
        return `Пачка ${purchaseToBaseRatio}${definition.baseUnit === 'gram' ? 'г' : 'мл'}`
      default:
        return `${purchaseUnit} (${purchaseToBaseRatio} ${definition.baseUnit})`
    }
  }

  /**
   * ✅ НОВЫЙ МЕТОД: Создает дополнительные упаковки для разнообразия
   */
  private generateAdditionalPackages(
    definition: CoreProductDefinition,
    now: string
  ): PackageOption[] {
    const additional: PackageOption[] = []

    // Для мяса добавляем упаковки разных размеров
    if (definition.category === 'meat' && definition.id === 'prod-beef-steak') {
      additional.push({
        id: `pkg-${definition.id}-500g`,
        productId: definition.id,
        packageName: 'Пачка 500г Local',
        packageSize: 500,
        packageUnit: 'pack',
        brandName: 'Local',
        packagePrice: 90000, // немного дешевле за грамм
        baseCostPerUnit: 180, // 90000 / 500
        isActive: true,
        notes: 'Местный поставщик',
        createdAt: now,
        updatedAt: now
      })
    }

    // Для овощей добавляем оптовые упаковки
    if (definition.category === 'vegetables' && definition.id === 'prod-potato') {
      additional.push({
        id: `pkg-${definition.id}-5kg`,
        productId: definition.id,
        packageName: 'Мешок 5кг',
        packageSize: 5000,
        packageUnit: 'pack',
        packagePrice: 35000, // 7 IDR/г вместо 8 IDR/г
        baseCostPerUnit: 7,
        isActive: true,
        notes: 'Оптовая цена',
        createdAt: now,
        updatedAt: now
      })
    }

    // Для напитков добавляем упаковки по 24 штуки
    if (definition.category === 'beverages' && definition.id === 'prod-beer-bintang-330') {
      additional.push({
        id: `pkg-${definition.id}-24pack`,
        productId: definition.id,
        packageName: 'Упаковка 24шт',
        packageSize: 24,
        packageUnit: 'pack',
        packagePrice: 280000, // 11,667 IDR/шт вместо 12,000 IDR/шт
        baseCostPerUnit: 11667,
        isActive: true,
        notes: 'Оптовая упаковка',
        createdAt: now,
        updatedAt: now
      })
    }

    return additional
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
      DebugUtils.info(MODULE_NAME, 'Loading supplier store data from supplierDefinitions...')

      const supplierData = getSupplierWorkflowData()

      DebugUtils.info(MODULE_NAME, 'Supplier store data loaded successfully', {
        requests: supplierData.requests.length,
        orders: supplierData.orders.length,
        receipts: supplierData.receipts.length,
        suggestions: 0, // suggestions генерируются динамически
        unitSystem: 'BASE_UNITS (gram/ml/piece)'
      })

      // ✅ НЕ загружаем статичные suggestions - они генерируются динамически
      return {
        requests: supplierData.requests,
        orders: supplierData.orders,
        receipts: supplierData.receipts,
        suggestions: [] // ← ПУСТОЙ МАССИВ! Генерируются динамически из Storage данных
      }
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

      DebugUtils.info(MODULE_NAME, 'Storage store data loaded successfully', {
        operations: storageData.operations.length,
        balances: storageData.balances.length,
        batches: storageData.batches.length,
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

      // Существующие валидации
      this.validateProductSupplierLinks(
        products.products,
        counteragents.suppliers,
        errors,
        warnings
      )
      this.validateStorageData(storage, products.products, errors, warnings)
      this.validateUnitsConsistency(products.products, storage, errors, warnings)

      // ✅ НОВАЯ ВАЛИДАЦИЯ: Проверяем интеграцию упаковок
      this.validatePackageIntegration(products.products, errors, warnings)

      const summary = {
        products: products.products.length,
        totalPackages: products.products.reduce((sum, p) => sum + p.packageOptions.length, 0),
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
    products.forEach(product => {
      // Проверяем базовые поля
      if (!product.baseUnit) {
        errors.push(`Product ${product.name} missing baseUnit`)
        return
      }

      if (!product.baseCostPerUnit) {
        errors.push(`Product ${product.name} missing baseCostPerUnit`)
        return
      }

      // ✅ НОВАЯ ПРОВЕРКА: Проверяем упаковки
      if (!product.packageOptions || product.packageOptions.length === 0) {
        errors.push(`Product ${product.name} has no package options`)
        return
      }

      // Проверяем что рекомендуемая упаковка существует
      if (product.recommendedPackageId) {
        const exists = product.packageOptions.some(pkg => pkg.id === product.recommendedPackageId)
        if (!exists) {
          errors.push(`Product ${product.name} has invalid recommendedPackageId`)
        }
      }

      // Проверяем цены в упаковках
      product.packageOptions.forEach(pkg => {
        if (pkg.packageSize <= 0) {
          errors.push(`Product ${product.name}, package ${pkg.packageName}: invalid packageSize`)
        }

        if (pkg.baseCostPerUnit <= 0) {
          errors.push(
            `Product ${product.name}, package ${pkg.packageName}: invalid baseCostPerUnit`
          )
        }

        // Проверяем соответствие цен
        if (pkg.packagePrice && pkg.packageSize > 0) {
          const calculatedBaseCost = pkg.packagePrice / pkg.packageSize
          if (Math.abs(calculatedBaseCost - pkg.baseCostPerUnit) > 1) {
            warnings.push(
              `Product ${product.name}, package ${pkg.packageName}: ` +
                `price mismatch - expected ${calculatedBaseCost.toFixed(2)}, ` +
                `got ${pkg.baseCostPerUnit} IDR/${product.baseUnit}`
            )
          }
        }
      })
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
}
