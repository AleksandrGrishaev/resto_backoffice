// src/stores/shared/productDefinitions.ts - ИСПРАВЛЕННЫЕ определения
import { DebugUtils } from '@/utils'
import type { ProductCategory, Department } from '@/stores/productsStore/types'

const MODULE_NAME = 'productDefinition'
// ✅ ИСПРАВЛЕННАЯ структура с базовыми единицами
export interface CoreProductDefinition {
  // Basic info
  id: string
  name: string
  nameEn: string
  category: ProductCategory

  // ✅ НОВАЯ СТРУКТУРА: Базовые единицы для расчетов
  baseUnit: 'gram' | 'ml' | 'piece' // Единица для расчета себестоимости
  baseCostPerUnit: number // Цена за грамм/мл/штуку в IDR

  // ✅ NEW: Department Attribution
  usedInDepartments: Department[]

  // ✅ НОВАЯ СТРУКТУРА: Единицы закупки
  purchaseUnit: string // Как покупаем (кг, литр, упаковка)
  purchaseToBaseRatio: number // 1 purchase unit = X base units
  purchaseCost: number // Цена за единицу закупки в IDR

  // Consumption characteristics
  dailyConsumption: number // В базовых единицах (грамм/мл/штук)
  consumptionVolatility: number // Вариация потребления

  // Business logic
  canBeSold: boolean
  yieldPercentage: number
  shelfLifeDays: number

  // Supply chain
  leadTimeDays: number
  primarySupplierId: string
  priceVolatility: number // Волатильность цены
}

// ✅ ИСПРАВЛЕННЫЕ определения продуктов
export const CORE_PRODUCTS: CoreProductDefinition[] = [
  // =============================================
  // МЯСО И ПТИЦА (базовая единица: граммы)
  // =============================================
  {
    id: 'prod-beef-steak',
    name: 'Beef Steak',
    nameEn: 'Beef Steak',
    category: 'meat',

    // ✅ Базовые единицы для расчетов
    baseUnit: 'gram',
    baseCostPerUnit: 180, // 180 IDR за грамм

    // ✅ NEW: Department Attribution
    usedInDepartments: ['kitchen'],

    // ✅ Единицы закупки
    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000, // 1 кг = 1000 грамм
    purchaseCost: 180000, // 180,000 IDR за кг

    dailyConsumption: 2500, // 2.5 кг в день = 2500 грамм
    consumptionVolatility: 0.3,
    canBeSold: false,
    yieldPercentage: 95,
    shelfLifeDays: 5,
    leadTimeDays: 3,
    primarySupplierId: 'sup-premium-meat-co',
    priceVolatility: 0.1
  },

  // =============================================
  // ОВОЩИ (базовая единица: граммы)
  // =============================================
  {
    id: 'prod-potato',
    name: 'Potato',
    nameEn: 'Potato',
    category: 'vegetables',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 8, // 8 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000, // 1 кг = 1000 грамм
    purchaseCost: 8000, // 8,000 IDR за кг

    dailyConsumption: 4000, // 4 кг в день = 4000 грамм
    consumptionVolatility: 0.2,
    canBeSold: false,
    yieldPercentage: 85,
    shelfLifeDays: 14,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market',
    priceVolatility: 0.03
  },

  {
    id: 'prod-tomato',
    name: 'Fresh Tomato',
    nameEn: 'Fresh Tomato',
    category: 'vegetables',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 12, // 12 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 12000, // 12,000 IDR за кг

    dailyConsumption: 1500, // 1.5 кг в день = 1500 грамм
    consumptionVolatility: 0.25,
    canBeSold: false,
    yieldPercentage: 95,
    shelfLifeDays: 5,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market',
    priceVolatility: 0.05
  },

  {
    id: 'prod-onion',
    name: 'Onion',
    nameEn: 'Onion',
    category: 'vegetables',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 6, // 6 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 6000, // 6,000 IDR за кг

    dailyConsumption: 1000, // 1 кг в день = 1000 грамм
    consumptionVolatility: 0.15,
    canBeSold: false,
    yieldPercentage: 90,
    shelfLifeDays: 30,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market',
    priceVolatility: 0.02
  },

  {
    id: 'prod-garlic',
    name: 'Garlic',
    nameEn: 'Garlic',
    category: 'vegetables',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 25, // 25 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 25000, // 25,000 IDR за кг

    dailyConsumption: 200, // 200 грамм в день
    consumptionVolatility: 0.4,
    canBeSold: false,
    yieldPercentage: 85,
    shelfLifeDays: 60,
    leadTimeDays: 3,
    primarySupplierId: 'sup-fresh-veg-market',
    priceVolatility: 0.08
  },

  // =============================================
  // ЖИДКОСТИ (базовая единица: миллилитры)
  // =============================================
  {
    id: 'prod-olive-oil',
    name: 'Olive Oil',
    nameEn: 'Olive Oil',
    category: 'other',
    usedInDepartments: ['kitchen'],

    baseUnit: 'ml',
    baseCostPerUnit: 85, // 85 IDR за мл

    purchaseUnit: 'liter',
    purchaseToBaseRatio: 1000, // 1 литр = 1000 мл
    purchaseCost: 85000, // 85,000 IDR за литр

    dailyConsumption: 300, // 300 мл в день
    consumptionVolatility: 0.25,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720,
    leadTimeDays: 7,
    primarySupplierId: 'sup-specialty-foods',
    priceVolatility: 0.06
  },

  {
    id: 'prod-milk',
    name: 'Milk 3.2%',
    nameEn: 'Milk 3.2%',
    category: 'dairy',
    usedInDepartments: ['kitchen', 'bar'],

    baseUnit: 'ml',
    baseCostPerUnit: 15, // 15 IDR за мл

    purchaseUnit: 'liter',
    purchaseToBaseRatio: 1000, // 1 литр = 1000 мл
    purchaseCost: 15000, // 15,000 IDR за литр

    dailyConsumption: 1000, // 1 литр в день = 1000 мл
    consumptionVolatility: 0.15,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 7,
    leadTimeDays: 2,
    primarySupplierId: 'sup-dairy-fresh',
    priceVolatility: 0.03
  },

  // =============================================
  // МОЛОЧНЫЕ ПРОДУКТЫ (базовая единица: граммы)
  // =============================================
  {
    id: 'prod-butter',
    name: 'Butter',
    nameEn: 'Butter',
    category: 'dairy',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 45, // 45 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000, // 1 кг = 1000 грамм
    purchaseCost: 45000, // 45,000 IDR за кг

    dailyConsumption: 500, // 500 грамм в день
    consumptionVolatility: 0.2,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 30,
    leadTimeDays: 3,
    primarySupplierId: 'sup-dairy-fresh',
    priceVolatility: 0.04
  },

  // =============================================
  // СПЕЦИИ (базовая единица: граммы)
  // =============================================
  {
    id: 'prod-salt',
    name: 'Salt',
    nameEn: 'Salt',
    category: 'spices',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 3, // 3 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 3000, // 3,000 IDR за кг

    dailyConsumption: 100, // 100 грамм в день
    consumptionVolatility: 0.1,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 365,
    leadTimeDays: 5,
    primarySupplierId: 'sup-basic-supplies',
    priceVolatility: 0.01
  },

  {
    id: 'prod-black-pepper',
    name: 'Black Pepper',
    nameEn: 'Black Pepper',
    category: 'spices',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 120, // 120 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 120000, // 120,000 IDR за кг

    dailyConsumption: 50, // 50 грамм в день
    consumptionVolatility: 0.3,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720,
    leadTimeDays: 7,
    primarySupplierId: 'sup-spice-world',
    priceVolatility: 0.12
  },

  {
    id: 'prod-oregano',
    name: 'Oregano',
    nameEn: 'Oregano',
    category: 'spices',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 150, // 150 IDR за грамм

    purchaseUnit: 'kg',
    purchaseToBaseRatio: 1000,
    purchaseCost: 150000, // 150,000 IDR за кг

    dailyConsumption: 20, // 20 грамм в день
    consumptionVolatility: 0.4,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720,
    leadTimeDays: 7,
    primarySupplierId: 'sup-spice-world',
    priceVolatility: 0.08
  },

  {
    id: 'prod-basil',
    name: 'Fresh Basil',
    nameEn: 'Fresh Basil',
    category: 'spices',
    usedInDepartments: ['kitchen'],

    baseUnit: 'gram',
    baseCostPerUnit: 100, // 100 IDR за грамм (приблизительно)

    purchaseUnit: 'pack', // Покупаем пачками ~50г
    purchaseToBaseRatio: 50, // 1 пачка = 50 грамм
    purchaseCost: 5000, // 5,000 IDR за пачку

    dailyConsumption: 25, // 25 грамм в день (половина пачки)
    consumptionVolatility: 0.5,
    canBeSold: false,
    yieldPercentage: 90,
    shelfLifeDays: 7,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market',
    priceVolatility: 0.12
  },

  // =============================================
  // НАПИТКИ ДЛЯ ПРОДАЖИ (базовая единица: штуки)
  // =============================================
  {
    id: 'prod-beer-bintang-330',
    name: 'Bintang Beer 330ml',
    nameEn: 'Bintang Beer 330ml',
    category: 'beverages',
    usedInDepartments: ['bar'],

    baseUnit: 'piece',
    baseCostPerUnit: 12000, // 12,000 IDR за штуку

    purchaseUnit: 'piece',
    purchaseToBaseRatio: 1, // 1 штука = 1 штука
    purchaseCost: 12000, // 12,000 IDR за штуку

    dailyConsumption: 20, // 20 штук в день
    consumptionVolatility: 0.4,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 180,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution',
    priceVolatility: 0.05
  },

  {
    id: 'prod-beer-bintang-500',
    name: 'Bintang Beer 500ml',
    nameEn: 'Bintang Beer 500ml',
    category: 'beverages',
    usedInDepartments: ['bar'],

    baseUnit: 'piece',
    baseCostPerUnit: 18000, // 18,000 IDR за штуку

    purchaseUnit: 'piece',
    purchaseToBaseRatio: 1,
    purchaseCost: 18000, // 18,000 IDR за штуку

    dailyConsumption: 12, // 12 штук в день
    consumptionVolatility: 0.4,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 180,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution',
    priceVolatility: 0.05
  },

  {
    id: 'prod-cola-330',
    name: 'Coca-Cola 330ml',
    nameEn: 'Coca-Cola 330ml',
    category: 'beverages',
    usedInDepartments: ['bar'],

    baseUnit: 'piece',
    baseCostPerUnit: 8000, // 8,000 IDR за штуку

    purchaseUnit: 'piece',
    purchaseToBaseRatio: 1,
    purchaseCost: 8000, // 8,000 IDR за штуку

    dailyConsumption: 15, // 15 штук в день
    consumptionVolatility: 0.35,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 365,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution',
    priceVolatility: 0.03
  },

  {
    id: 'prod-water-500',
    name: 'Mineral Water 500ml',
    nameEn: 'Mineral Water 500ml',
    category: 'beverages',
    usedInDepartments: ['bar'],

    baseUnit: 'piece',
    baseCostPerUnit: 3000, // 3,000 IDR за штуку

    purchaseUnit: 'piece',
    purchaseToBaseRatio: 1,
    purchaseCost: 3000, // 3,000 IDR за штуку

    dailyConsumption: 25, // 25 штук в день
    consumptionVolatility: 0.3,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 730,
    leadTimeDays: 3,
    primarySupplierId: 'sup-beverage-distribution',
    priceVolatility: 0.02
  }
]

// =============================================
// УТИЛИТЫ
// =============================================

export function getProductDefinition(productId: string): CoreProductDefinition | undefined {
  return CORE_PRODUCTS.find(p => p.id === productId)
}

export function getRawMaterials(): CoreProductDefinition[] {
  return CORE_PRODUCTS.filter(p => !p.canBeSold)
}

export function getSellableProducts(): CoreProductDefinition[] {
  return CORE_PRODUCTS.filter(p => p.canBeSold)
}

// ✅ НОВЫЕ УТИЛИТЫ для работы с базовыми единицами

/**
 * Конвертирует цену из закупочной единицы в базовую единицу
 */
export function calculateBaseCostPerUnit(
  purchaseCost: number,
  purchaseToBaseRatio: number
): number {
  return purchaseCost / purchaseToBaseRatio
}

/**
 * Проверяет правильность расчета базовой стоимости
 */
export function validateProductCosts(product: CoreProductDefinition): {
  isValid: boolean
  calculatedBaseCost: number
  actualBaseCost: number
  error?: string
} {
  const calculatedBaseCost = calculateBaseCostPerUnit(
    product.purchaseCost,
    product.purchaseToBaseRatio
  )

  const isValid = Math.abs(calculatedBaseCost - product.baseCostPerUnit) < 0.01

  return {
    isValid,
    calculatedBaseCost,
    actualBaseCost: product.baseCostPerUnit,
    error: !isValid
      ? `Base cost mismatch: expected ${calculatedBaseCost}, got ${product.baseCostPerUnit}`
      : undefined
  }
}

/**
 * Получает все продукты с определенной базовой единицей
 */
export function getProductsByBaseUnit(baseUnit: 'gram' | 'ml' | 'piece'): CoreProductDefinition[] {
  return CORE_PRODUCTS.filter(p => p.baseUnit === baseUnit)
}

/**
 * Форматирует цену для отображения
 */
export function formatProductCost(product: CoreProductDefinition): {
  baseCostFormatted: string
  purchaseCostFormatted: string
  description: string
} {
  const baseUnitNames = {
    gram: 'грамм',
    ml: 'мл',
    piece: 'шт'
  }

  const purchaseUnitNames: Record<string, string> = {
    kg: 'кг',
    liter: 'л',
    piece: 'шт',
    pack: 'уп'
  }

  return {
    baseCostFormatted: `${product.baseCostPerUnit} IDR/${baseUnitNames[product.baseUnit]}`,
    purchaseCostFormatted: `${product.purchaseCost} IDR/${purchaseUnitNames[product.purchaseUnit] || product.purchaseUnit}`,
    description: `1 ${purchaseUnitNames[product.purchaseUnit] || product.purchaseUnit} = ${product.purchaseToBaseRatio} ${baseUnitNames[product.baseUnit]}`
  }
}

// =============================================
// ВАЛИДАЦИЯ ВСЕХ ПРОДУКТОВ
// =============================================

/**
 * Проверяет корректность всех определений продуктов
 */
export function validateAllProducts(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validProducts: number
  invalidProducts: number
} {
  const errors: string[] = []
  const warnings: string[] = []
  let validProducts = 0
  let invalidProducts = 0

  CORE_PRODUCTS.forEach(product => {
    try {
      // Проверка базовой стоимости
      const costValidation = validateProductCosts(product)
      if (!costValidation.isValid) {
        errors.push(`${product.name}: ${costValidation.error}`)
        invalidProducts++
      } else {
        validProducts++
      }

      // Проверка обязательных полей
      if (!product.baseUnit || !['gram', 'ml', 'piece'].includes(product.baseUnit)) {
        errors.push(`${product.name}: Invalid baseUnit "${product.baseUnit}"`)
      }

      if (product.baseCostPerUnit <= 0) {
        errors.push(`${product.name}: baseCostPerUnit must be positive`)
      }

      if (product.purchaseToBaseRatio <= 0) {
        errors.push(`${product.name}: purchaseToBaseRatio must be positive`)
      }

      if (product.purchaseCost <= 0) {
        errors.push(`${product.name}: purchaseCost must be positive`)
      }

      // Предупреждения
      if (product.yieldPercentage < 50) {
        warnings.push(`${product.name}: Very low yield percentage (${product.yieldPercentage}%)`)
      }

      if (product.shelfLifeDays < 3) {
        warnings.push(`${product.name}: Very short shelf life (${product.shelfLifeDays} days)`)
      }
    } catch (error) {
      errors.push(`${product.name}: Validation error - ${error}`)
      invalidProducts++
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validProducts,
    invalidProducts
  }
}

// =============================================
// ПРИМЕРЫ РАСЧЕТОВ
// =============================================

/**
 * Демонстрирует правильный расчет себестоимости
 */
export function demonstrateCostCalculation(): void {
  console.log('=== ДЕМОНСТРАЦИЯ ПРАВИЛЬНОГО РАСЧЕТА СЕБЕСТОИМОСТИ ===\n')

  // Пример 1: Салатная заправка
  console.log('📝 РЕЦЕПТ: Заправка для салата классическая')
  console.log('Выход: 130 мл\n')

  const oliveOil = getProductDefinition('prod-olive-oil')!
  const garlic = getProductDefinition('prod-garlic')!
  const salt = getProductDefinition('prod-salt')!
  const pepper = getProductDefinition('prod-black-pepper')!

  console.log('ИНГРЕДИЕНТЫ:')

  // Оливковое масло: 120 мл
  const oilCost = 120 * oliveOil.baseCostPerUnit
  console.log(`• Olive Oil: 120 мл × ${oliveOil.baseCostPerUnit} IDR/мл = ${oilCost} IDR`)

  // Чеснок: 10 г
  const garlicCost = 10 * garlic.baseCostPerUnit
  console.log(`• Garlic: 10 г × ${garlic.baseCostPerUnit} IDR/г = ${garlicCost} IDR`)

  // Соль: 3 г
  const saltCost = 3 * salt.baseCostPerUnit
  console.log(`• Salt: 3 г × ${salt.baseCostPerUnit} IDR/г = ${saltCost} IDR`)

  // Перец: 1 г
  const pepperCost = 1 * pepper.baseCostPerUnit
  console.log(`• Black Pepper: 1 г × ${pepper.baseCostPerUnit} IDR/г = ${pepperCost} IDR`)

  const totalCost = oilCost + garlicCost + saltCost + pepperCost
  const costPerMl = totalCost / 130

  console.log(`\n📊 ИТОГО: ${totalCost} IDR`)
  console.log(`💰 Себестоимость за мл: ${costPerMl.toFixed(2)} IDR/мл`)

  console.log('\n' + '='.repeat(60) + '\n')

  // Пример 2: Стейк
  console.log('📝 РЕЦЕПТ: Стейк говяжий')
  console.log('Порций: 1\n')

  const beef = getProductDefinition('prod-beef-steak')!

  console.log('ИНГРЕДИЕНТЫ:')

  // Говядина: 250 г
  const beefCost = 250 * beef.baseCostPerUnit
  console.log(`• Beef Steak: 250 г × ${beef.baseCostPerUnit} IDR/г = ${beefCost} IDR`)

  // Оливковое масло: 10 мл
  const oilCostSteak = 10 * oliveOil.baseCostPerUnit
  console.log(`• Olive Oil: 10 мл × ${oliveOil.baseCostPerUnit} IDR/мл = ${oilCostSteak} IDR`)

  // Соль: 3 г
  const saltCostSteak = 3 * salt.baseCostPerUnit
  console.log(`• Salt: 3 г × ${salt.baseCostPerUnit} IDR/г = ${saltCostSteak} IDR`)

  // Перец: 2 г
  const pepperCostSteak = 2 * pepper.baseCostPerUnit
  console.log(`• Black Pepper: 2 г × ${pepper.baseCostPerUnit} IDR/г = ${pepperCostSteak} IDR`)

  const totalCostSteak = beefCost + oilCostSteak + saltCostSteak + pepperCostSteak

  console.log(`\n📊 ИТОГО: ${totalCostSteak} IDR`)
  console.log(`💰 Себестоимость за порцию: ${totalCostSteak} IDR/порция`)

  console.log('\n✅ ВСЕ РАСЧЕТЫ ТЕПЕРЬ КОРРЕКТНЫ!')
}

// Автоматическая валидация при импорте в dev режиме
if (import.meta.env.DEV) {
  const validation = validateAllProducts()
  if (!validation.isValid) {
    DebugUtils.debug(MODULE_NAME, '❌ Product definitions validation failed:')
  } else {
    DebugUtils.debug(MODULE_NAME, '✅ All product definitions are valid')
  }
}
