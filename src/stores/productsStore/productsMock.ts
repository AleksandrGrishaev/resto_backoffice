// src/stores/productsStore/productsMock.ts
import type { Product } from './types'
import { TimeUtils } from '@/utils'

const now = TimeUtils.getCurrentLocalISO()

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Говядина (вырезка)',
    category: 'meat',
    unit: 'kg',
    yieldPercentage: 95, // 95% выход после обработки
    description: 'Премиальная говяжья вырезка для стейков',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +4°C',
    shelfLife: 5,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-2',
    name: 'Картофель молодой',
    category: 'vegetables',
    unit: 'kg',
    yieldPercentage: 85, // 85% после очистки
    description: 'Молодой картофель для гарниров',
    isActive: true,
    storageConditions: 'Прохладное сухое место',
    shelfLife: 14,
    minStock: 5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-3',
    name: 'Молоко 3.2%',
    category: 'dairy',
    unit: 'l',
    yieldPercentage: 100, // без отходов
    description: 'Цельное молоко для соусов и напитков',
    isActive: true,
    storageConditions: 'Холодильник +2°C до +6°C',
    shelfLife: 7,
    minStock: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-4',
    name: 'Помидоры черри',
    category: 'vegetables',
    unit: 'kg',
    yieldPercentage: 95, // минимальная обработка
    description: 'Свежие помидоры черри для салатов',
    isActive: true,
    storageConditions: 'Комнатная температура',
    shelfLife: 5,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-5',
    name: 'Лосось атлантический',
    category: 'seafood',
    unit: 'kg',
    yieldPercentage: 80, // филе без костей и кожи
    description: 'Свежий атлантический лосось',
    isActive: true,
    storageConditions: 'Холодильник 0°C до +2°C',
    shelfLife: 3,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-6',
    name: 'Рис жасмин',
    category: 'cereals',
    unit: 'kg',
    yieldPercentage: 100, // без отходов
    description: 'Ароматный тайский рис жасмин',
    isActive: true,
    storageConditions: 'Сухое место при комнатной температуре',
    shelfLife: 365,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-7',
    name: 'Базилик свежий',
    category: 'spices',
    unit: 'pack',
    yieldPercentage: 90, // минимальная очистка
    description: 'Свежий базилик для соусов и гарниров',
    isActive: true,
    storageConditions: 'Холодильник +4°C до +8°C',
    shelfLife: 7,
    minStock: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-8',
    name: 'Масло оливковое Extra Virgin',
    category: 'other',
    unit: 'l',
    yieldPercentage: 100, // без отходов
    description: 'Оливковое масло холодного отжима',
    isActive: true,
    storageConditions: 'Темное прохладное место',
    shelfLife: 720,
    minStock: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-9',
    name: 'Креветки королевские',
    category: 'seafood',
    unit: 'kg',
    yieldPercentage: 70, // очищенные от панциря
    description: 'Свежие королевские креветки',
    isActive: true,
    storageConditions: 'Холодильник 0°C до +2°C',
    shelfLife: 2,
    minStock: 0.5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'prod-10',
    name: 'Сыр пармезан',
    category: 'dairy',
    unit: 'kg',
    yieldPercentage: 95, // небольшие отходы при нарезке
    description: 'Выдержанный пармезан 24 месяца',
    isActive: true,
    storageConditions: 'Холодильник +4°C до +8°C',
    shelfLife: 180,
    minStock: 0.3,
    createdAt: now,
    updatedAt: now
  }
]

// Функция для получения случайного продукта (для тестирования)
export function getRandomProduct(): Product {
  return mockProducts[Math.floor(Math.random() * mockProducts.length)]
}

// Функция для получения продуктов по категории
export function getMockProductsByCategory(category: string): Product[] {
  if (category === 'all') return mockProducts
  return mockProducts.filter(product => product.category === category)
}
