// stores/menu/mockData.ts
import type { Category, MenuItem } from './types'

// Mock категории
export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Салаты',
    description: 'Свежие салаты из сезонных овощей',
    sortOrder: 0,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'cat-2',
    name: 'Горячие блюда',
    description: 'Основные блюда кухни',
    sortOrder: 1,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'cat-3',
    name: 'Супы',
    description: 'Первые блюда',
    sortOrder: 2,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'cat-4',
    name: 'Напитки',
    description: 'Горячие и холодные напитки',
    sortOrder: 3,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'cat-5',
    name: 'Десерты',
    description: 'Сладкие блюда',
    sortOrder: 4,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'cat-6',
    name: 'Архивные блюда',
    description: 'Временно не доступные позиции',
    sortOrder: 5,
    isActive: false,
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-20T15:30:00.000Z'
  }
]

// Mock позиции меню
export const MOCK_MENU_ITEMS: MenuItem[] = [
  // Салаты
  {
    id: 'item-1',
    categoryId: 'cat-1',
    name: 'Цезарь',
    description: 'Классический салат с курицей и сыром пармезан',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-1-1',
        name: 'Стандартный',
        price: 350,
        isActive: true,
        sortOrder: 0
      },
      {
        id: 'var-1-2',
        name: 'Большая порция',
        price: 450,
        isActive: true,
        sortOrder: 1
      }
    ],
    notes: 'Можно без сухариков',
    sortOrder: 0,
    preparationTime: 15,
    allergens: ['глютен', 'яйца'],
    tags: ['популярное', 'с курицей'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'item-2',
    categoryId: 'cat-1',
    name: 'Греческий салат',
    description: 'Свежие овощи с сыром фета и оливками',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-2-1',
        name: '',
        price: 320,
        isActive: true,
        sortOrder: 0
      }
    ],
    sortOrder: 1,
    preparationTime: 10,
    allergens: ['лактоза'],
    tags: ['вегетарианское'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },

  // Горячие блюда
  {
    id: 'item-3',
    categoryId: 'cat-2',
    name: 'Стейк из говядины',
    description: 'Сочный стейк с гарниром',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-3-1',
        name: 'Слабой прожарки',
        price: 850,
        isActive: true,
        sortOrder: 0
      },
      {
        id: 'var-3-2',
        name: 'Средней прожарки',
        price: 850,
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'var-3-3',
        name: 'Полной прожарки',
        price: 850,
        isActive: true,
        sortOrder: 2
      }
    ],
    sortOrder: 0,
    preparationTime: 25,
    allergens: [],
    tags: ['мясное', 'премиум'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'item-4',
    categoryId: 'cat-2',
    name: 'Паста Карбонара',
    description: 'Классическая итальянская паста',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-4-1',
        name: '',
        price: 450,
        isActive: true,
        sortOrder: 0
      }
    ],
    sortOrder: 1,
    preparationTime: 20,
    allergens: ['глютен', 'яйца', 'лактоза'],
    tags: ['итальянская кухня'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },

  // Супы
  {
    id: 'item-5',
    categoryId: 'cat-3',
    name: 'Борщ украинский',
    description: 'Традиционный борщ со сметаной',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-5-1',
        name: 'С мясом',
        price: 280,
        isActive: true,
        sortOrder: 0
      },
      {
        id: 'var-5-2',
        name: 'Постный',
        price: 230,
        isActive: true,
        sortOrder: 1
      }
    ],
    sortOrder: 0,
    preparationTime: 5,
    allergens: ['лактоза'],
    tags: ['традиционное'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },

  // Напитки
  {
    id: 'item-6',
    categoryId: 'cat-4',
    name: 'Кофе',
    description: 'Свежезаваренный кофе',
    isActive: true,
    type: 'beverage',
    variants: [
      {
        id: 'var-6-1',
        name: 'Эспрессо',
        price: 120,
        isActive: true,
        sortOrder: 0
      },
      {
        id: 'var-6-2',
        name: 'Американо',
        price: 140,
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'var-6-3',
        name: 'Капучино',
        price: 180,
        isActive: true,
        sortOrder: 2
      },
      {
        id: 'var-6-4',
        name: 'Латте',
        price: 200,
        isActive: true,
        sortOrder: 3
      }
    ],
    sortOrder: 0,
    preparationTime: 5,
    allergens: ['лактоза'],
    tags: ['кофе', 'популярное'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'item-7',
    categoryId: 'cat-4',
    name: 'Свежевыжатые соки',
    description: 'Натуральные соки из свежих фруктов',
    isActive: true,
    type: 'beverage',
    variants: [
      {
        id: 'var-7-1',
        name: 'Апельсиновый',
        price: 150,
        isActive: true,
        sortOrder: 0
      },
      {
        id: 'var-7-2',
        name: 'Яблочный',
        price: 140,
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'var-7-3',
        name: 'Морковный',
        price: 160,
        isActive: true,
        sortOrder: 2
      }
    ],
    sortOrder: 1,
    preparationTime: 3,
    allergens: [],
    tags: ['свежее', 'витамины'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },

  // Десерты
  {
    id: 'item-8',
    categoryId: 'cat-5',
    name: 'Тирамису',
    description: 'Классический итальянский десерт',
    isActive: true,
    type: 'food',
    variants: [
      {
        id: 'var-8-1',
        name: '',
        price: 280,
        isActive: true,
        sortOrder: 0
      }
    ],
    sortOrder: 0,
    preparationTime: 5,
    allergens: ['глютен', 'яйца', 'лактоза'],
    tags: ['десерт', 'итальянская кухня'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },

  // Архивное блюдо
  {
    id: 'item-9',
    categoryId: 'cat-6',
    name: 'Старое блюдо',
    description: 'Блюдо которое временно убрали из меню',
    isActive: false,
    type: 'food',
    variants: [
      {
        id: 'var-9-1',
        name: '',
        price: 300,
        isActive: false,
        sortOrder: 0
      }
    ],
    sortOrder: 0,
    preparationTime: 15,
    allergens: [],
    tags: ['архив'],
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-20T15:30:00.000Z'
  }
]

// Утилита для генерации ID
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Утилита для создания timestamp
export function createTimestamp(): string {
  return new Date().toISOString()
}
