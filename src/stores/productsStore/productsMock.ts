// src/stores/productsStore/productsMock.ts
import type { Product } from './types'

const now = new Date().toISOString()

export const mockProducts: Product[] = [
  // =============================================
  // МЯСО И ПТИЦА (сырье - НЕ продается напрямую)
  // =============================================
  {
    id: 'prod-beef-steak',
    name: 'Говядина (стейк)',
    category: 'meat',
    unit: 'kg',
    costPerUnit: 180000, // 180,000 IDR за кг
    yieldPercentage: 95,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Премиальная говяжья вырезка для стейков',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +4°C',
    shelfLife: 5,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ОВОЩИ (сырье - НЕ продается напрямую)
  // =============================================
  {
    id: 'prod-potato',
    name: 'Картофель',
    category: 'vegetables',
    unit: 'kg',
    costPerUnit: 8000, // 8,000 IDR за кг
    yieldPercentage: 85, // учитываем очистку
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Картофель для гарниров и блюд',
    isActive: true,
    storageConditions: 'Прохладное сухое место',
    shelfLife: 14,
    minStock: 5,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-tomato',
    name: 'Помидоры свежие',
    category: 'vegetables',
    unit: 'kg',
    costPerUnit: 12000, // 12,000 IDR за кг
    yieldPercentage: 95,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Свежие помидоры для соуса и салатов',
    isActive: true,
    storageConditions: 'Комнатная температура',
    shelfLife: 5,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-onion',
    name: 'Лук репчатый',
    category: 'vegetables',
    unit: 'kg',
    costPerUnit: 6000, // 6,000 IDR за кг
    yieldPercentage: 90, // учитываем очистку
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Лук для соуса и приготовления',
    isActive: true,
    storageConditions: 'Сухое прохладное место',
    shelfLife: 30,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-garlic',
    name: 'Чеснок',
    category: 'vegetables',
    unit: 'kg',
    costPerUnit: 25000, // 25,000 IDR за кг
    yieldPercentage: 85, // учитываем очистку
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Свежий чеснок для приготовления',
    isActive: true,
    storageConditions: 'Сухое прохладное место',
    shelfLife: 60,
    minStock: 0.5,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // МОЛОЧНЫЕ ПРОДУКТЫ (сырье - НЕ продается напрямую)
  // =============================================
  {
    id: 'prod-butter',
    name: 'Масло сливочное',
    category: 'dairy',
    unit: 'kg',
    costPerUnit: 45000, // 45,000 IDR за кг
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Сливочное масло для приготовления',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 30,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-milk',
    name: 'Молоко 3.2%',
    category: 'dairy',
    unit: 'liter',
    costPerUnit: 15000, // 15,000 IDR за литр
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Цельное молоко для приготовления',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 7,
    minStock: 3,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // СПЕЦИИ И ПРИПРАВЫ (сырье - НЕ продается напрямую)
  // =============================================
  {
    id: 'prod-salt',
    name: 'Соль поваренная',
    category: 'spices',
    unit: 'kg',
    costPerUnit: 3000, // 3,000 IDR за кг
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Соль для приготовления',
    isActive: true,
    storageConditions: 'Сухое место',
    shelfLife: 365,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-black-pepper',
    name: 'Перец черный молотый',
    category: 'spices',
    unit: 'kg',
    costPerUnit: 120000, // 120,000 IDR за кг
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Молотый черный перец',
    isActive: true,
    storageConditions: 'Сухое место',
    shelfLife: 720,
    minStock: 0.1,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-oregano',
    name: 'Орегано сушеный',
    category: 'spices',
    unit: 'kg',
    costPerUnit: 180000, // 180,000 IDR за кг
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Сушеный орегано для соуса',
    isActive: true,
    storageConditions: 'Сухое место',
    shelfLife: 365,
    minStock: 0.1,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-basil',
    name: 'Базилик свежий',
    category: 'spices',
    unit: 'pack',
    costPerUnit: 8000, // 8,000 IDR за упаковку (100г)
    yieldPercentage: 90,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Свежий базилик для соуса (упаковка 100г)',
    isActive: true,
    storageConditions: 'Холодильник +4°C до +8°C',
    shelfLife: 7,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // МАСЛА И ЖИРЫ (сырье - НЕ продается напрямую)
  // =============================================
  {
    id: 'prod-olive-oil',
    name: 'Масло оливковое',
    category: 'other',
    unit: 'liter',
    costPerUnit: 85000, // 85,000 IDR за литр
    yieldPercentage: 100,
    canBeSold: false, // ❌ сырье не продается напрямую
    description: 'Оливковое масло для приготовления',
    isActive: true,
    storageConditions: 'Темное прохладное место',
    shelfLife: 720,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // НАПИТКИ (✅ ПРОДАЮТСЯ НАПРЯМУЮ)
  // =============================================
  {
    id: 'prod-beer-bintang-330',
    name: 'Пиво Bintang 330мл',
    category: 'beverages',
    unit: 'piece',
    costPerUnit: 12000, // 12,000 IDR за бутылку
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Пиво Bintang в бутылке 330мл',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 180,
    minStock: 24,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-beer-bintang-500',
    name: 'Пиво Bintang 500мл',
    category: 'beverages',
    unit: 'piece',
    costPerUnit: 18000, // 18,000 IDR за бутылку
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Пиво Bintang в бутылке 500мл',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 180,
    minStock: 12,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ДОПОЛНИТЕЛЬНЫЕ НАПИТКИ (✅ ПРОДАЮТСЯ НАПРЯМУЮ)
  // =============================================
  {
    id: 'prod-cola-330',
    name: 'Кока-Кола 330мл',
    category: 'beverages',
    unit: 'piece',
    costPerUnit: 8000, // 8,000 IDR за банку
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Кока-Кола в банке 330мл',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 365,
    minStock: 48,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-water-500',
    name: 'Вода минеральная 500мл',
    category: 'beverages',
    unit: 'piece',
    costPerUnit: 3000, // 3,000 IDR за бутылку
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Минеральная вода в бутылке 500мл',
    isActive: true,
    storageConditions: 'Комнатная температура',
    shelfLife: 730,
    minStock: 24,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ГОТОВЫЕ ПРОДУКТЫ (✅ ПРОДАЮТСЯ НАПРЯМУЮ)
  // =============================================
  {
    id: 'prod-cake-chocolate',
    name: 'Торт шоколадный (готовый)',
    category: 'other',
    unit: 'piece',
    costPerUnit: 150000, // 150,000 IDR за торт
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Готовый шоколадный торт от поставщика',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 3,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'prod-bread-baguette',
    name: 'Багет французский',
    category: 'other',
    unit: 'piece',
    costPerUnit: 25000, // 25,000 IDR за багет
    yieldPercentage: 100,
    canBeSold: true, // ✅ можно продавать напрямую
    description: 'Свежий французский багет от пекарни',
    isActive: true,
    storageConditions: 'Комнатная температура',
    shelfLife: 1,
    minStock: 5,
    createdAt: now,
    updatedAt: now
  }
]

// Утилиты для работы с mock данными
export function getRandomProduct(): Product {
  return mockProducts[Math.floor(Math.random() * mockProducts.length)]
}

export function getMockProductsByCategory(category: string): Product[] {
  if (category === 'all') return mockProducts
  return mockProducts.filter(product => product.category === category)
}

export function getMockProductsForSale(): Product[] {
  return mockProducts.filter(product => product.canBeSold && product.isActive)
}

export function getMockRawProducts(): Product[] {
  return mockProducts.filter(product => !product.canBeSold && product.isActive)
}

export function findProductById(id: string): Product | undefined {
  return mockProducts.find(product => product.id === id)
}
