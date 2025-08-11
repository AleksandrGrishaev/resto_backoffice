// src/stores/shared/mockDataCoordinator.ts - UPDATED with Counteragents Integration

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import type { Counteragent } from '@/stores/counteragents/types'
import { generateCounteragentsMockData } from '@/stores/counteragents/mock/counteragentsMock'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: ProductPriceHistory[]
  } | null = null

  private counteragentsData: {
    counteragents: Counteragent[]
  } | null = null

  constructor() {
    DebugUtils.info(MODULE_NAME, '🏗️ Initializing mock data coordinator with full integration')

    // Валидируем определения продуктов при инициализации
    if (import.meta.env.DEV) {
      this.validateProductDefinitions()
    }
  }

  // =============================================
  // ВАЛИДАЦИЯ ОПРЕДЕЛЕНИЙ
  // =============================================

  private validateProductDefinitions(): void {
    const validation = validateAllProducts()

    if (!validation.isValid) {
      DebugUtils.error(MODULE_NAME, '❌ Product definitions validation failed:', {
        errors: validation.errors,
        invalidProducts: validation.invalidProducts
      })

      // В dev режиме показываем подробную информацию
      console.error('=== PRODUCT DEFINITIONS VALIDATION ERRORS ===')
      validation.errors.forEach(error => console.error('❌', error))

      if (validation.warnings.length > 0) {
        console.warn('=== WARNINGS ===')
        validation.warnings.forEach(warning => console.warn('⚠️', warning))
      }
    } else {
      DebugUtils.info(MODULE_NAME, '✅ All product definitions are valid', {
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
  // ✅ COUNTERAGENTS STORE DATA
  // =============================================

  getCounteragentsStoreData() {
    if (!this.counteragentsData) {
      this.counteragentsData = this.generateCounteragentsData()
    }
    return this.counteragentsData
  }

  /**
   * ✅ НОВЫЙ: Генерирует данные контрагентов с проверкой связей
   */
  private generateCounteragentsData() {
    DebugUtils.info(MODULE_NAME, '🏪 Generating counteragents data with product integration')

    const counteragents = generateCounteragentsMockData()

    // Проверяем связи поставщиков с продуктами
    this.validateSupplierProductLinks(counteragents)

    const result = {
      counteragents
    }

    DebugUtils.info(MODULE_NAME, '✅ Counteragents data generated', {
      total: counteragents.length,
      suppliers: counteragents.filter(ca => ca.type === 'supplier').length,
      services: counteragents.filter(ca => ca.type === 'service').length,
      active: counteragents.filter(ca => ca.isActive).length,
      preferred: counteragents.filter(ca => ca.isPreferred).length
    })

    return result
  }

  /**
   * ✅ НОВЫЙ: Проверяет связи между поставщиками и продуктами
   */
  private validateSupplierProductLinks(counteragents: Counteragent[]): void {
    DebugUtils.debug(MODULE_NAME, '🔗 Validating supplier-product links')

    const suppliers = counteragents.filter(ca => ca.type === 'supplier')
    const supplierIds = new Set(suppliers.map(s => s.id))

    // Проверяем, что у всех продуктов есть поставщики
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

    // Проверяем, что у поставщиков есть продукты в соответствующих категориях
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

    DebugUtils.info(MODULE_NAME, '✅ Supplier-product links validated', {
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

  /**
   * ✅ НОВЫЙ: Получить поставщика для продукта
   */
  getSupplierForProduct(productId: string): Counteragent | undefined {
    const product = this.getProductDefinition(productId)
    if (!product?.primarySupplierId) {
      return undefined
    }

    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.find(ca => ca.id === product.primarySupplierId)
  }

  /**
   * ✅ НОВЫЙ: Получить все продукты поставщика
   */
  getProductsForSupplier(supplierId: string): CoreProductDefinition[] {
    return CORE_PRODUCTS.filter(p => p.primarySupplierId === supplierId)
  }

  /**
   * ✅ НОВЫЙ: Получить поставщиков для категории
   */
  getSuppliersForCategory(category: string): Counteragent[] {
    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.filter(
      ca => ca.type === 'supplier' && ca.isActive && ca.productCategories.includes(category as any)
    )
  }

  // =============================================
  // ГЕНЕРАЦИЯ ПРОДУКТОВ (существующий код)
  // =============================================

  private generateProductsData() {
    DebugUtils.info(MODULE_NAME, '🛍️ Generating products data with base units')

    const products = this.generateEnhancedProducts()
    const priceHistory = this.generateEnhancedPriceHistory()

    const result = {
      products,
      priceHistory
    }

    DebugUtils.info(MODULE_NAME, '✅ Products data generated', {
      total: products.length,
      sellable: products.filter(p => p.canBeSold).length,
      rawMaterials: products.filter(p => !p.canBeSold).length,
      priceRecords: priceHistory.length,
      baseUnitsUsed: this.getBaseUnitsStats(products)
    })

    // В dev режиме показываем примеры расчетов
    if (import.meta.env.DEV) {
      this.demonstrateCorrectCalculations(products)
    }

    return result
  }

  /**
   * ✅ ИСПРАВЛЕНО: Генерирует продукты с правильной структурой базовых единиц
   */
  private generateEnhancedProducts(): Product[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => {
      // ✅ НОВАЯ СТРУКТУРА: Product с базовыми единицами
      const product = {
        // Основная информация
        id: productDef.id,
        name: productDef.name,
        nameEn: productDef.nameEn,
        description: this.generateDescription(productDef),
        category: productDef.category,

        // ✅ БАЗОВЫЕ ЕДИНИЦЫ для расчетов себестоимости
        baseUnit: productDef.baseUnit, // gram, ml, или piece
        baseCostPerUnit: productDef.baseCostPerUnit, // IDR за грамм/мл/штуку

        // ✅ ЕДИНИЦЫ ЗАКУПКИ (для удобства ввода)
        purchaseUnit: productDef.purchaseUnit, // кг, литр, упаковка
        purchaseToBaseRatio: productDef.purchaseToBaseRatio, // коэффициент перевода
        purchaseCost: productDef.purchaseCost, // IDR за единицу закупки

        // ✅ ТЕКУЩАЯ ЦЕНА (дублируем для совместимости)
        costPerUnit: productDef.purchaseCost, // Цена за purchaseUnit (для совместимости)
        currentCostPerUnit: productDef.baseCostPerUnit, // Цена за baseUnit

        // Существующие поля
        yieldPercentage: productDef.yieldPercentage,
        canBeSold: productDef.canBeSold,
        isActive: true,

        // ✅ ИНТЕГРАЦИЯ: Поставщик
        primarySupplierId: productDef.primarySupplierId,

        // Дополнительные поля
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

      // ✅ ВАЛИДАЦИЯ: Проверяем правильность расчета базовой стоимости
      const expectedBaseCost = productDef.purchaseCost / productDef.purchaseToBaseRatio
      if (Math.abs(expectedBaseCost - productDef.baseCostPerUnit) > 0.01) {
        DebugUtils.error(MODULE_NAME, `❌ Base cost calculation error for ${productDef.name}`, {
          expected: expectedBaseCost,
          actual: productDef.baseCostPerUnit,
          purchaseCost: productDef.purchaseCost,
          ratio: productDef.purchaseToBaseRatio
        })
      }

      return product as Product
    })
  }

  /**
   * ✅ ИСПРАВЛЕНО: Генерирует историю цен в базовых единицах
   */
  private generateEnhancedPriceHistory(): ProductPriceHistory[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => ({
      id: `price-${productDef.id}-current`,
      productId: productDef.id,

      // ✅ НОВЫЕ ПОЛЯ: Цена в базовых единицах
      basePricePerUnit: productDef.baseCostPerUnit, // IDR за грамм/мл/штуку

      // Информация о закупке
      purchasePrice: productDef.purchaseCost, // IDR за единицу закупки
      purchaseUnit: productDef.purchaseUnit, // кг, литр, упаковка
      purchaseQuantity: productDef.purchaseToBaseRatio, // количество базовых единиц в упаковке

      effectiveDate: now,
      sourceType: 'manual_update' as const,
      notes: `Base cost: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit}`,
      createdAt: now,
      updatedAt: now
    })) as ProductPriceHistory[]
  }

  // =============================================
  // ✅ ИНТЕГРАЦИОННЫЕ МЕТОДЫ
  // =============================================

  /**
   * ✅ НОВЫЙ: Валидирует всю интеграцию между stores
   */
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
    DebugUtils.info(MODULE_NAME, '🔍 Validating complete store integration')

    const errors: string[] = []
    const warnings: string[] = []

    const productsData = this.getProductsStoreData()
    const counteragentsData = this.getCounteragentsStoreData()

    const products = productsData.products
    const counteragents = counteragentsData.counteragents
    const suppliers = counteragents.filter(ca => ca.type === 'supplier')

    // Проверяем связи продуктов с поставщиками
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

    // Проверяем неиспользуемых поставщиков
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

    DebugUtils.info(MODULE_NAME, '✅ Store integration validation completed', {
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
  // ДЕМОНСТРАЦИЯ ПРАВИЛЬНЫХ РАСЧЕТОВ (существующий код)
  // =============================================

  private demonstrateCorrectCalculations(products: Product[]): void {
    console.log('\n' + '='.repeat(60))
    console.log('🧮 ДЕМОНСТРАЦИЯ ПРАВИЛЬНОГО РАСЧЕТА СЕБЕСТОИМОСТИ')
    console.log('='.repeat(60))

    // Находим нужные продукты
    const oliveOil = products.find(p => p.id === 'prod-olive-oil')
    const garlic = products.find(p => p.id === 'prod-garlic')
    const salt = products.find(p => p.id === 'prod-salt')
    const pepper = products.find(p => p.id === 'prod-black-pepper')

    if (oliveOil && garlic && salt && pepper) {
      console.log('\n📝 РЕЦЕПТ: Заправка для салата классическая')
      console.log('Выход: 130 мл\n')

      console.log('ИНГРЕДИЕНТЫ:')

      // Оливковое масло: 120 мл
      const oilCost = 120 * (oliveOil as any).baseCostPerUnit
      console.log(
        `• Olive Oil: 120 мл × ${(oliveOil as any).baseCostPerUnit} IDR/мл = ${oilCost} IDR`
      )

      // Чеснок: 10 г
      const garlicCost = 10 * (garlic as any).baseCostPerUnit
      console.log(`• Garlic: 10 г × ${(garlic as any).baseCostPerUnit} IDR/г = ${garlicCost} IDR`)

      // Соль: 3 г
      const saltCost = 3 * (salt as any).baseCostPerUnit
      console.log(`• Salt: 3 г × ${(salt as any).baseCostPerUnit} IDR/г = ${saltCost} IDR`)

      // Перец: 1 г
      const pepperCost = 1 * (pepper as any).baseCostPerUnit
      console.log(
        `• Black Pepper: 1 г × ${(pepper as any).baseCostPerUnit} IDR/г = ${pepperCost} IDR`
      )

      const totalCost = oilCost + garlicCost + saltCost + pepperCost
      const costPerMl = totalCost / 130

      console.log(`\n📊 ИТОГО: ${totalCost} IDR`)
      console.log(`💰 Себестоимость за мл: ${costPerMl.toFixed(2)} IDR/мл`)

      console.log('\n✅ Теперь расчеты корректны!')
    }

    console.log('\n' + '='.repeat(60))
  }

  // =============================================
  // СТАТИСТИКА И УТИЛИТЫ (существующий код)
  // =============================================

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

    // Добавляем информацию о единицах
    const unitInfo = `Price: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit} (${productDef.purchaseCost} IDR/${productDef.purchaseUnit})`

    return `${baseDesc}. ${unitInfo}`
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

    // Добавляем тег базовой единицы
    tags.push(`base-unit-${productDef.baseUnit}`)

    tags.push(productDef.category)

    return tags
  }

  // =============================================
  // БУДУЩИЕ МЕТОДЫ ДЛЯ ДРУГИХ STORES
  // =============================================

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

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  // Глобальные функции для отладки
  window.__MOCK_DATA_COORDINATOR__ = mockDataCoordinator

  window.__VALIDATE_STORE_INTEGRATION__ = () => {
    return mockDataCoordinator.validateStoreIntegration()
  }

  window.__TEST_SUPPLIER_INTEGRATION__ = () => {
    const productsData = mockDataCoordinator.getProductsStoreData()
    const counteragentsData = mockDataCoordinator.getCounteragentsStoreData()

    console.log('=== SUPPLIER INTEGRATION TEST ===')
    console.log('Products:', productsData.products.length)
    console.log('Counteragents:', counteragentsData.counteragents.length)

    // Тестируем поиск поставщика для продукта
    const testProduct = productsData.products[0]
    const supplier = mockDataCoordinator.getSupplierForProduct(testProduct.id)

    console.log('Test product:', testProduct.name)
    console.log('Supplier found:', supplier?.name || 'None')

    return { testProduct, supplier, productsData, counteragentsData }
  }

  // Автоматический тест при загрузке в dev режиме
  setTimeout(() => {
    console.log('\n🎯 Mock Data Coordinator с интеграцией Counteragents загружен!')
    console.log('Доступные команды:')
    console.log('• window.__VALIDATE_STORE_INTEGRATION__() - проверка интеграции')
    console.log('• window.__TEST_SUPPLIER_INTEGRATION__() - тест поставщиков')
  }, 100)
}
