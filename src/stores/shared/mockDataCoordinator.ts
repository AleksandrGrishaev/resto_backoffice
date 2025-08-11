// src/stores/shared/mockDataCoordinator.ts - ОБНОВЛЕННЫЙ с базовыми единицами

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: ProductPriceHistory[]
  } | null = null

  constructor() {
    DebugUtils.info(MODULE_NAME, '🏗️ Initializing mock data coordinator with base units support')

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
  // ✅ ГЕНЕРАЦИЯ ПРОДУКТОВ С БАЗОВЫМИ ЕДИНИЦАМИ
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

        // Дополнительные поля
        storageConditions: this.getStorageConditions(productDef.category),
        shelfLife: productDef.shelfLifeDays,
        minStock: this.calculateMinStock(productDef),
        maxStock: this.calculateMaxStock(productDef),
        leadTimeDays: productDef.leadTimeDays,
        primarySupplierId: productDef.primarySupplierId,
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
  // ДЕМОНСТРАЦИЯ ПРАВИЛЬНЫХ РАСЧЕТОВ
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
  // СТАТИСТИКА И УТИЛИТЫ
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

  // =============================================
  // ✅ НОВЫЕ МЕТОДЫ ДЛЯ ТЕСТИРОВАНИЯ
  // =============================================

  /**
   * ✅ НОВЫЙ: Тестирует расчет себестоимости с реальными данными
   */
  testCostCalculation(): void {
    const products = this.getProductsStoreData().products

    console.log('\n🧪 ТЕСТИРОВАНИЕ РАСЧЕТА СЕБЕСТОИМОСТИ')
    console.log('='.repeat(50))

    // Тест 1: Салатная заправка
    this.testSaladDressingCalculation(products)

    // Тест 2: Стейк
    this.testSteakCalculation(products)

    console.log('\n✅ Все тесты пройдены!')
  }

  private testSaladDressingCalculation(products: Product[]): void {
    console.log('\n📝 ТЕСТ 1: Заправка для салата классическая')
    console.log('Рецепт: 120мл масла + 10г чеснока + 3г соли + 1г перца')
    console.log('Выход: 130 мл')

    const oliveOil = products.find(p => p.id === 'prod-olive-oil')!
    const garlic = products.find(p => p.id === 'prod-garlic')!
    const salt = products.find(p => p.id === 'prod-salt')!
    const pepper = products.find(p => p.id === 'prod-black-pepper')!

    const oilCost = 120 * (oliveOil as any).baseCostPerUnit
    const garlicCost = 10 * (garlic as any).baseCostPerUnit
    const saltCost = 3 * (salt as any).baseCostPerUnit
    const pepperCost = 1 * (pepper as any).baseCostPerUnit

    const totalCost = oilCost + garlicCost + saltCost + pepperCost
    const costPerMl = totalCost / 130

    console.log(`Olive Oil: 120мл × ${(oliveOil as any).baseCostPerUnit} = ${oilCost} IDR`)
    console.log(`Garlic: 10г × ${(garlic as any).baseCostPerUnit} = ${garlicCost} IDR`)
    console.log(`Salt: 3г × ${(salt as any).baseCostPerUnit} = ${saltCost} IDR`)
    console.log(`Pepper: 1г × ${(pepper as any).baseCostPerUnit} = ${pepperCost} IDR`)
    console.log(`ИТОГО: ${totalCost} IDR (${costPerMl.toFixed(2)} IDR/мл)`)

    // Проверяем правильность
    const expectedOilCost = 120 * 85 // 120мл × 85 IDR/мл
    const expectedGarlicCost = 10 * 25 // 10г × 25 IDR/г
    const expectedSaltCost = 3 * 3 // 3г × 3 IDR/г
    const expectedPepperCost = 1 * 120 // 1г × 120 IDR/г
    const expectedTotal =
      expectedOilCost + expectedGarlicCost + expectedSaltCost + expectedPepperCost

    if (Math.abs(totalCost - expectedTotal) < 0.01) {
      console.log('✅ Расчет корректен!')
    } else {
      console.log(`❌ Ошибка: ожидали ${expectedTotal}, получили ${totalCost}`)
    }
  }

  private testSteakCalculation(products: Product[]): void {
    console.log('\n📝 ТЕСТ 2: Стейк говяжий')
    console.log('Рецепт: 250г говядины + 10мл масла + 3г соли + 2г перца')
    console.log('Выход: 1 порция')

    const beef = products.find(p => p.id === 'prod-beef-steak')!
    const oliveOil = products.find(p => p.id === 'prod-olive-oil')!
    const salt = products.find(p => p.id === 'prod-salt')!
    const pepper = products.find(p => p.id === 'prod-black-pepper')!

    const beefCost = 250 * (beef as any).baseCostPerUnit
    const oilCost = 10 * (oliveOil as any).baseCostPerUnit
    const saltCost = 3 * (salt as any).baseCostPerUnit
    const pepperCost = 2 * (pepper as any).baseCostPerUnit

    const totalCost = beefCost + oilCost + saltCost + pepperCost

    console.log(`Beef: 250г × ${(beef as any).baseCostPerUnit} = ${beefCost} IDR`)
    console.log(`Olive Oil: 10мл × ${(oliveOil as any).baseCostPerUnit} = ${oilCost} IDR`)
    console.log(`Salt: 3г × ${(salt as any).baseCostPerUnit} = ${saltCost} IDR`)
    console.log(`Pepper: 2г × ${(pepper as any).baseCostPerUnit} = ${pepperCost} IDR`)
    console.log(`ИТОГО: ${totalCost} IDR за порцию`)

    // Проверяем правильность
    const expectedBeefCost = 250 * 180 // 250г × 180 IDR/г
    const expectedOilCost = 10 * 85 // 10мл × 85 IDR/мл
    const expectedSaltCost = 3 * 3 // 3г × 3 IDR/г
    const expectedPepperCost = 2 * 120 // 2г × 120 IDR/г
    const expectedTotal = expectedBeefCost + expectedOilCost + expectedSaltCost + expectedPepperCost

    if (Math.abs(totalCost - expectedTotal) < 0.01) {
      console.log('✅ Расчет корректен!')
    } else {
      console.log(`❌ Ошибка: ожидали ${expectedTotal}, получили ${totalCost}`)
    }
  }

  /**
   * ✅ НОВЫЙ: Показывает сравнение старой и новой системы
   */
  compareOldVsNewCalculation(): void {
    console.log('\n📊 СРАВНЕНИЕ СТАРОЙ И НОВОЙ СИСТЕМЫ РАСЧЕТА')
    console.log('='.repeat(60))

    const products = this.getProductsStoreData().products
    const oliveOil = products.find(p => p.id === 'prod-olive-oil')!

    console.log('\n🔴 СТАРАЯ СИСТЕМА (НЕПРАВИЛЬНАЯ):')
    console.log('Olive Oil: 250 грамм × 85,000 IDR/литр = 21,250,000 IDR ❌')
    console.log('(Ошибка: умножаем граммы на цену за литр)')

    console.log('\n🟢 НОВАЯ СИСТЕМА (ПРАВИЛЬНАЯ):')
    console.log(
      `Olive Oil: 250 мл × ${(oliveOil as any).baseCostPerUnit} IDR/мл = ${250 * (oliveOil as any).baseCostPerUnit} IDR ✅`
    )
    console.log('(Правильно: умножаем мл на цену за мл)')

    console.log('\n💡 ОБЪЯСНЕНИЕ:')
    console.log(`• baseCostPerUnit = ${(oliveOil as any).baseCostPerUnit} IDR/мл`)
    console.log(`• purchaseCost = ${(oliveOil as any).purchaseCost} IDR/литр`)
    console.log(
      `• purchaseToBaseRatio = ${(oliveOil as any).purchaseToBaseRatio} (1 литр = 1000 мл)`
    )
    console.log(
      `• Проверка: ${(oliveOil as any).purchaseCost} ÷ ${(oliveOil as any).purchaseToBaseRatio} = ${(oliveOil as any).baseCostPerUnit} ✅`
    )
  }

  /**
   * ✅ НОВЫЙ: Валидирует все продукты для корректности расчетов
   */
  validateProductsForCalculation(): {
    valid: CoreProductDefinition[]
    invalid: Array<{ product: CoreProductDefinition; errors: string[] }>
    summary: {
      totalProducts: number
      validProducts: number
      invalidProducts: number
      errorCount: number
    }
  } {
    console.log('\n🔍 ВАЛИДАЦИЯ ПРОДУКТОВ ДЛЯ РАСЧЕТОВ')
    console.log('='.repeat(40))

    const valid: CoreProductDefinition[] = []
    const invalid: Array<{ product: CoreProductDefinition; errors: string[] }> = []

    CORE_PRODUCTS.forEach(product => {
      const errors: string[] = []

      // Проверка 1: Правильность расчета базовой стоимости
      const expectedBaseCost = product.purchaseCost / product.purchaseToBaseRatio
      if (Math.abs(expectedBaseCost - product.baseCostPerUnit) > 0.01) {
        errors.push(
          `Base cost mismatch: expected ${expectedBaseCost}, got ${product.baseCostPerUnit}`
        )
      }

      // Проверка 2: Положительные значения
      if (product.baseCostPerUnit <= 0) {
        errors.push('baseCostPerUnit must be positive')
      }

      if (product.purchaseCost <= 0) {
        errors.push('purchaseCost must be positive')
      }

      if (product.purchaseToBaseRatio <= 0) {
        errors.push('purchaseToBaseRatio must be positive')
      }

      // Проверка 3: Валидные единицы
      if (!['gram', 'ml', 'piece'].includes(product.baseUnit)) {
        errors.push(`Invalid baseUnit: ${product.baseUnit}`)
      }

      if (errors.length === 0) {
        valid.push(product)
        console.log(`✅ ${product.name}`)
      } else {
        invalid.push({ product, errors })
        console.log(`❌ ${product.name}:`)
        errors.forEach(error => console.log(`   - ${error}`))
      }
    })

    const summary = {
      totalProducts: CORE_PRODUCTS.length,
      validProducts: valid.length,
      invalidProducts: invalid.length,
      errorCount: invalid.reduce((sum, item) => sum + item.errors.length, 0)
    }

    console.log('\n📊 РЕЗУЛЬТАТ ВАЛИДАЦИИ:')
    console.log(`Всего продуктов: ${summary.totalProducts}`)
    console.log(`Валидных: ${summary.validProducts}`)
    console.log(`Невалидных: ${summary.invalidProducts}`)
    console.log(`Ошибок: ${summary.errorCount}`)

    return { valid, invalid, summary }
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

  window.__TEST_COST_CALCULATIONS__ = () => {
    mockDataCoordinator.testCostCalculation()
    return mockDataCoordinator
  }

  window.__COMPARE_OLD_VS_NEW__ = () => {
    mockDataCoordinator.compareOldVsNewCalculation()
    return mockDataCoordinator
  }

  window.__VALIDATE_PRODUCTS__ = () => {
    return mockDataCoordinator.validateProductsForCalculation()
  }

  // Автоматический тест при загрузке в dev режиме
  setTimeout(() => {
    console.log('\n🎯 Mock Data Coordinator загружен!')
    console.log('Доступные команды:')
    console.log('• window.__TEST_COST_CALCULATIONS__() - тест расчетов')
    console.log('• window.__COMPARE_OLD_VS_NEW__() - сравнение систем')
    console.log('• window.__VALIDATE_PRODUCTS__() - валидация продуктов')
  }, 100)
}
