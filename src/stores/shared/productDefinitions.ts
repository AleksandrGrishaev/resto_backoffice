// src/stores/shared/productDefinitions.ts - Шаг 3: Базовые определения продуктов

import type { ProductCategory, MeasurementUnit } from '@/stores/productsStore/types'

export interface CoreProductDefinition {
  // Basic info (берем из существующих mock данных)
  id: string
  name: string
  nameEn: string
  category: ProductCategory
  unit: MeasurementUnit

  // Price characteristics (добавляем для генерации)
  basePrice: number // Current price from existing mock
  priceVolatility: number // Price change volatility (0.05 = ±5%)

  // Consumption characteristics (добавляем для расчетов)
  dailyConsumption: number // Estimated daily usage
  consumptionVolatility: number // Usage variation (0.3 = ±30%)

  // Business logic (берем из существующих данных)
  canBeSold: boolean // Уже есть в текущих Product
  yieldPercentage: number // Уже есть в текущих Product
  shelfLifeDays: number // Уже есть в текущих Product

  // Supply chain (добавляем для Supplier integration)
  leadTimeDays: number // Delivery lead time
  primarySupplierId: string // Main supplier
}

// 🆕 Создаем определения на основе СУЩЕСТВУЮЩИХ продуктов
export const CORE_PRODUCTS: CoreProductDefinition[] = [
  // Raw materials (не продаются напрямую)
  {
    id: 'prod-beef-steak',
    name: 'Beef Steak',
    nameEn: 'Beef Steak',
    category: 'meat',
    unit: 'kg',
    basePrice: 180000, // Из существующего mock
    priceVolatility: 0.1, // ±10% (meat prices volatile)
    dailyConsumption: 2.5, // Оцениваем на основе рецептов
    consumptionVolatility: 0.3, // ±30% daily variation
    canBeSold: false, // Из существующего mock
    yieldPercentage: 95, // Из существующего mock
    shelfLifeDays: 5, // Из существующего mock
    leadTimeDays: 3,
    primarySupplierId: 'sup-premium-meat-co'
  },
  {
    id: 'prod-potato',
    name: 'Potato',
    nameEn: 'Potato',
    category: 'vegetables',
    unit: 'kg',
    basePrice: 8000, // Из существующего mock
    priceVolatility: 0.03, // ±3% (stable vegetable)
    dailyConsumption: 4.0, // Оцениваем: fries + mashed potato
    consumptionVolatility: 0.2, // ±20% (more predictable)
    canBeSold: false, // Из существующего mock
    yieldPercentage: 85, // Из существующего mock
    shelfLifeDays: 14, // Из существующего mock
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market'
  },
  {
    id: 'prod-tomato',
    name: 'Fresh Tomato',
    nameEn: 'Fresh Tomato',
    category: 'vegetables',
    unit: 'kg',
    basePrice: 12000,
    priceVolatility: 0.05, // ±5% (seasonal variation)
    dailyConsumption: 1.5, // For sauces
    consumptionVolatility: 0.25,
    canBeSold: false,
    yieldPercentage: 95,
    shelfLifeDays: 5,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market'
  },
  {
    id: 'prod-onion',
    name: 'Onion',
    nameEn: 'Onion',
    category: 'vegetables',
    unit: 'kg',
    basePrice: 6000,
    priceVolatility: 0.02, // ±2% (very stable)
    dailyConsumption: 1.0,
    consumptionVolatility: 0.15,
    canBeSold: false,
    yieldPercentage: 90,
    shelfLifeDays: 30,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market'
  },
  {
    id: 'prod-garlic',
    name: 'Garlic',
    nameEn: 'Garlic',
    category: 'vegetables',
    unit: 'kg',
    basePrice: 25000,
    priceVolatility: 0.08, // ±8% (premium spice)
    dailyConsumption: 0.2, // Small amounts
    consumptionVolatility: 0.4, // High variation
    canBeSold: false,
    yieldPercentage: 85,
    shelfLifeDays: 60,
    leadTimeDays: 3,
    primarySupplierId: 'sup-fresh-veg-market'
  },
  {
    id: 'prod-olive-oil',
    name: 'Olive Oil',
    nameEn: 'Olive Oil',
    category: 'other',
    unit: 'liter',
    basePrice: 85000,
    priceVolatility: 0.06, // ±6% (imported product)
    dailyConsumption: 0.3, // For cooking
    consumptionVolatility: 0.25,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720, // 2 years
    leadTimeDays: 7,
    primarySupplierId: 'sup-specialty-foods'
  },
  {
    id: 'prod-butter',
    name: 'Butter',
    nameEn: 'Butter',
    category: 'dairy',
    unit: 'kg',
    basePrice: 45000,
    priceVolatility: 0.04, // ±4% (stable dairy)
    dailyConsumption: 0.5,
    consumptionVolatility: 0.2,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 30,
    leadTimeDays: 3,
    primarySupplierId: 'sup-dairy-fresh'
  },
  {
    id: 'prod-milk',
    name: 'Milk 3.2%',
    nameEn: 'Milk 3.2%',
    category: 'dairy',
    unit: 'liter',
    basePrice: 15000,
    priceVolatility: 0.03, // ±3% (stable dairy)
    dailyConsumption: 1.0,
    consumptionVolatility: 0.15,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 7,
    leadTimeDays: 2,
    primarySupplierId: 'sup-dairy-fresh'
  },
  {
    id: 'prod-salt',
    name: 'Salt',
    nameEn: 'Salt',
    category: 'spices',
    unit: 'kg',
    basePrice: 3000,
    priceVolatility: 0.01, // ±1% (very stable)
    dailyConsumption: 0.1,
    consumptionVolatility: 0.1,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 365,
    leadTimeDays: 5,
    primarySupplierId: 'sup-basic-supplies'
  },
  {
    id: 'prod-black-pepper',
    name: 'Black Pepper',
    nameEn: 'Black Pepper',
    category: 'spices',
    unit: 'kg',
    basePrice: 120000,
    priceVolatility: 0.12, // ±12% (imported spice)
    dailyConsumption: 0.05,
    consumptionVolatility: 0.3,
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720,
    leadTimeDays: 7,
    primarySupplierId: 'sup-spice-world'
  },

  // Direct sale items (продаются напрямую)
  {
    id: 'prod-beer-bintang-330',
    name: 'Bintang Beer 330ml',
    nameEn: 'Bintang Beer 330ml',
    category: 'beverages',
    unit: 'piece',
    basePrice: 12000,
    priceVolatility: 0.05, // ±5% (supplier price changes)
    dailyConsumption: 20, // 20 pieces/day average
    consumptionVolatility: 0.4, // ±40% (weekend spikes)
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 180,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution'
  },
  {
    id: 'prod-beer-bintang-500',
    name: 'Bintang Beer 500ml',
    nameEn: 'Bintang Beer 500ml',
    category: 'beverages',
    unit: 'piece',
    basePrice: 18000,
    priceVolatility: 0.05,
    dailyConsumption: 12, // Less popular size
    consumptionVolatility: 0.4,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 180,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution'
  },
  {
    id: 'prod-cola-330',
    name: 'Coca-Cola 330ml',
    nameEn: 'Coca-Cola 330ml',
    category: 'beverages',
    unit: 'piece',
    basePrice: 8000,
    priceVolatility: 0.03, // ±3% (stable brand)
    dailyConsumption: 15,
    consumptionVolatility: 0.35,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 365,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution'
  },
  {
    id: 'prod-water-500',
    name: 'Mineral Water 500ml',
    nameEn: 'Mineral Water 500ml',
    category: 'beverages',
    unit: 'piece',
    basePrice: 3000,
    priceVolatility: 0.02, // ±2% (very stable)
    dailyConsumption: 25,
    consumptionVolatility: 0.3,
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 730, // 2 years
    leadTimeDays: 3,
    primarySupplierId: 'sup-beverage-distribution'
  },
  // Специи - Орегано
  {
    id: 'prod-oregano',
    name: 'Oregano',
    nameEn: 'Oregano',
    category: 'spices',
    unit: 'gram',
    basePrice: 150000, // 150 руб за кг сушеного орегано
    priceVolatility: 0.08, // ±8% (импортная специя)
    dailyConsumption: 0.02, // Очень мало используется
    consumptionVolatility: 0.4, // Высокая вариация
    canBeSold: false,
    yieldPercentage: 100,
    shelfLifeDays: 720, // 2 года
    leadTimeDays: 7,
    primarySupplierId: 'sup-spice-world'
  },

  // Специи - Базилик
  {
    id: 'prod-basil',
    name: 'Fresh Basil',
    nameEn: 'Fresh Basil',
    category: 'spices',
    unit: 'pack',
    basePrice: 5000, // 50 руб за пачку свежего базилика
    priceVolatility: 0.12, // ±12% (свежая зелень)
    dailyConsumption: 0.5, // Пол пачки в день
    consumptionVolatility: 0.5, // Высокая вариация
    canBeSold: false,
    yieldPercentage: 90, // Немного обрезки
    shelfLifeDays: 7, // Неделя
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market'
  }
]

// Helper functions
export function getProductDefinition(productId: string): CoreProductDefinition | undefined {
  return CORE_PRODUCTS.find(p => p.id === productId)
}

export function getRawMaterials(): CoreProductDefinition[] {
  return CORE_PRODUCTS.filter(p => !p.canBeSold)
}

export function getSellableProducts(): CoreProductDefinition[] {
  return CORE_PRODUCTS.filter(p => p.canBeSold)
}
