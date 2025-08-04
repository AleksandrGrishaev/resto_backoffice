// src/stores/productsStore/productsMock.ts
import type { Product } from './types'

const now = new Date().toISOString()

export const mockProducts: Product[] = [
  // =============================================
  // МЯСО И ПТИЦА
  // =============================================
  {
    id: 'prod-beef-steak',
    name: 'Говядина (стейк)',
    category: 'meat',
    unit: 'kg',
    costPerUnit: 180000, // 180,000 IDR за кг
    yieldPercentage: 95,
    description: 'Премиальная говяжья вырезка для стейков',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +4°C',
    shelfLife: 5,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ОВОЩИ
  // =============================================
  {
    id: 'prod-potato',
    name: 'Картофель',
    category: 'vegetables',
    unit: 'kg',
    costPerUnit: 8000, // 8,000 IDR за кг
    yieldPercentage: 85, // учитываем очистку
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
    description: 'Свежий чеснок для приготовления',
    isActive: true,
    storageConditions: 'Сухое прохладное место',
    shelfLife: 60,
    minStock: 0.5,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // МОЛОЧНЫЕ ПРОДУКТЫ
  // =============================================
  {
    id: 'prod-butter',
    name: 'Масло сливочное',
    category: 'dairy',
    unit: 'kg',
    costPerUnit: 45000, // 45,000 IDR за кг
    yieldPercentage: 100,
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
    description: 'Цельное молоко для приготовления',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 7,
    minStock: 3,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // СПЕЦИИ И ПРИПРАВЫ
  // =============================================
  {
    id: 'prod-salt',
    name: 'Соль поваренная',
    category: 'spices',
    unit: 'kg',
    costPerUnit: 3000, // 3,000 IDR за кг
    yieldPercentage: 100,
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
    description: 'Свежий базилик для соуса (упаковка 100г)',
    isActive: true,
    storageConditions: 'Холодильник +4°C до +8°C',
    shelfLife: 7,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // МАСЛА И ЖИРЫ
  // =============================================
  {
    id: 'prod-olive-oil',
    name: 'Масло оливковое',
    category: 'other',
    unit: 'liter',
    costPerUnit: 85000, // 85,000 IDR за литр
    yieldPercentage: 100,
    description: 'Оливковое масло для приготовления',
    isActive: true,
    storageConditions: 'Темное прохладное место',
    shelfLife: 720,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // НАПИТКИ (для перепродажи)
  // =============================================
  {
    id: 'prod-beer-bintang-330',
    name: 'Пиво Bintang 330мл',
    category: 'beverages',
    unit: 'piece',
    costPerUnit: 12000, // 12,000 IDR за бутылку
    yieldPercentage: 100,
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
    description: 'Пиво Bintang в бутылке 500мл',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 180,
    minStock: 12,
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

export function findProductById(id: string): Product | undefined {
  return mockProducts.find(product => product.id === id)
}
