// src/stores/menu/mockData.ts
import type { Category, MenuItem } from './types'

const now = new Date().toISOString()

// =============================================
// КАТЕГОРИИ МЕНЮ
// =============================================

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-main-dishes',
    name: 'Основные блюда',
    description: 'Горячие основные блюда и стейки',
    sortOrder: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-garnishes',
    name: 'Гарниры',
    description: 'Гарниры к основным блюдам',
    sortOrder: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-beverages',
    name: 'Напитки',
    description: 'Алкогольные и безалкогольные напитки',
    sortOrder: 2,
    isActive: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-combo',
    name: 'Комбо блюда',
    description: 'Комплексные блюда с гарниром и соусом',
    sortOrder: 3,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// ПОЗИЦИИ МЕНЮ
// =============================================

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // =============================================
  // 1. ПРОСТАЯ ПЕРЕПРОДАЖА (пиво)
  // =============================================
  {
    id: 'menu-beer-bintang',
    categoryId: 'cat-beverages',
    name: 'Пиво Bintang',
    description: 'Популярное индонезийское пиво',
    isActive: true,
    type: 'beverage',
    source: null, // композитная позиция (разные варианты = разные продукты)
    variants: [
      {
        id: 'var-beer-330',
        name: '330мл',
        price: 25000, // цена продажи 25,000 IDR (себестоимость 12,000)
        isActive: true,
        sortOrder: 0,
        source: {
          type: 'product',
          id: 'prod-beer-bintang-330'
        }
      },
      {
        id: 'var-beer-500',
        name: '500мл',
        price: 35000, // цена продажи 35,000 IDR (себестоимость 18,000)
        isActive: true,
        sortOrder: 1,
        source: {
          type: 'product',
          id: 'prod-beer-bintang-500'
        }
      }
    ],
    sortOrder: 0,
    preparationTime: 1, // просто открыть бутылку
    allergens: [],
    tags: ['пиво', 'алкоголь', 'bintang'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 2. ПРОСТОЕ ГОТОВОЕ БЛЮДО (стейк)
  // =============================================
  {
    id: 'menu-beef-steak',
    categoryId: 'cat-main-dishes',
    name: 'Стейк говяжий',
    description: 'Сочный говяжий стейк на гриле',
    isActive: true,
    type: 'food',
    source: {
      type: 'recipe',
      id: 'recipe-beef-steak'
    },
    variants: [
      {
        id: 'var-steak-200',
        name: '200г',
        price: 85000, // цена продажи
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 0.8 // 200г вместо 250г
      },
      {
        id: 'var-steak-250',
        name: '250г (стандарт)',
        price: 95000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1 // стандартная порция
      },
      {
        id: 'var-steak-300',
        name: '300г',
        price: 110000,
        isActive: true,
        sortOrder: 2,
        portionMultiplier: 1.2 // увеличенная порция
      }
    ],
    sortOrder: 0,
    preparationTime: 20,
    allergens: [],
    tags: ['стейк', 'говядина', 'гриль', 'премиум'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 3. КОМПОЗИТНОЕ БЛЮДО (стейк с гарниром)
  // =============================================
  {
    id: 'menu-steak-with-garnish',
    categoryId: 'cat-combo',
    name: 'Стейк с гарниром',
    description: 'Сочный стейк с выбором гарнира и соуса',
    isActive: true,
    type: 'food',
    source: null, // композитное блюдо
    variants: [
      {
        id: 'var-steak-fries',
        name: 'с картофелем фри',
        price: 120000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 250,
            unit: 'gram',
            role: 'main',
            notes: 'стейк 250г'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 150,
            unit: 'gram',
            role: 'garnish',
            notes: 'порция картофеля фри'
          },
          {
            type: 'preparation',
            id: 'prep-tomato-sauce',
            quantity: 30,
            unit: 'gram',
            role: 'sauce',
            notes: 'томатный соус'
          }
        ]
      },
      {
        id: 'var-steak-mashed',
        name: 'с картофельным пюре',
        price: 115000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 250,
            unit: 'gram',
            role: 'main',
            notes: 'стейк 250г'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 180,
            unit: 'gram',
            role: 'garnish',
            notes: 'порция пюре'
          },
          {
            type: 'preparation',
            id: 'prep-garlic-sauce',
            quantity: 25,
            unit: 'gram',
            role: 'sauce',
            notes: 'чесночный соус'
          }
        ]
      },
      {
        id: 'var-steak-double-garnish',
        name: 'с двойным гарниром',
        price: 135000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 250,
            unit: 'gram',
            role: 'main',
            notes: 'стейк 250г'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 100,
            unit: 'gram',
            role: 'garnish',
            notes: 'картофель фри'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 120,
            unit: 'gram',
            role: 'garnish',
            notes: 'картофельное пюре'
          },
          {
            type: 'preparation',
            id: 'prep-tomato-sauce',
            quantity: 20,
            unit: 'gram',
            role: 'sauce',
            notes: 'томатный соус'
          },
          {
            type: 'preparation',
            id: 'prep-garlic-sauce',
            quantity: 15,
            unit: 'gram',
            role: 'sauce',
            notes: 'чесночный соус'
          }
        ]
      }
    ],
    sortOrder: 0,
    preparationTime: 25,
    allergens: [],
    tags: ['комбо', 'стейк', 'гарнир', 'комплексное блюдо'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 4. ОТДЕЛЬНЫЕ ГАРНИРЫ
  // =============================================
  {
    id: 'menu-fries-side',
    categoryId: 'cat-garnishes',
    name: 'Картофель фри',
    description: 'Хрустящий картофель фри',
    isActive: true,
    type: 'food',
    source: {
      type: 'recipe',
      id: 'recipe-fries-side'
    },
    variants: [
      {
        id: 'var-fries-regular',
        name: 'Стандартная порция',
        price: 25000,
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 1
      },
      {
        id: 'var-fries-large',
        name: 'Большая порция',
        price: 35000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1.5
      }
    ],
    sortOrder: 0,
    preparationTime: 15,
    allergens: [],
    tags: ['гарнир', 'картофель', 'фри'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-mashed-potato-side',
    categoryId: 'cat-garnishes',
    name: 'Картофельное пюре',
    description: 'Нежное картофельное пюре с маслом',
    isActive: true,
    type: 'food',
    source: {
      type: 'recipe',
      id: 'recipe-mashed-potato-side'
    },
    variants: [
      {
        id: 'var-mashed-regular',
        name: 'Стандартная порция',
        price: 22000,
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 1
      },
      {
        id: 'var-mashed-large',
        name: 'Большая порция',
        price: 30000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1.4
      }
    ],
    sortOrder: 1,
    preparationTime: 20,
    allergens: ['лактоза'],
    tags: ['гарнир', 'картофель', 'пюре'],
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// УТИЛИТЫ
// =============================================

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createTimestamp(): string {
  return new Date().toISOString()
}

export function findMenuItemById(id: string): MenuItem | undefined {
  return MOCK_MENU_ITEMS.find(item => item.id === id)
}

export function getMenuItemsByCategory(categoryId: string): MenuItem[] {
  if (categoryId === 'all') return MOCK_MENU_ITEMS
  return MOCK_MENU_ITEMS.filter(item => item.categoryId === categoryId)
}

export function findCategoryById(id: string): Category | undefined {
  return MOCK_CATEGORIES.find(category => category.id === id)
}

// =============================================
// ПРИМЕРЫ РАСЧЕТА СЕБЕСТОИМОСТИ (для демонстрации)
// =============================================

/**
 * Пример расчета себестоимости для разных типов позиций:
 *
 * 1. Пиво 330мл:
 *    - Себестоимость: 12,000 IDR (costPerUnit продукта)
 *    - Цена продажи: 25,000 IDR
 *    - Прибыль: 13,000 IDR (108%)
 *
 * 2. Стейк 250г:
 *    - Говядина 250г: (180,000 / 1000) * 250 = 45,000 IDR
 *    - Масло 10мл: (85,000 / 1000) * 10 = 850 IDR
 *    - Соль 3г: (3,000 / 1000) * 3 = 9 IDR
 *    - Перец 2г: (120,000 / 1000) * 2 = 240 IDR
 *    - Себестоимость: 46,099 IDR
 *    - Цена продажи: 95,000 IDR
 *    - Прибыль: 48,901 IDR (106%)
 *
 * 3. Стейк с картофелем фри:
 *    - Стейк (рецепт): 46,099 IDR
 *    - Картофель фри 150г из полуфабриката:
 *      - Картофель: (8,000 / 1000) * (1000 * 150/850) = 1,412 IDR
 *      - Масло: (85,000 / 1000) * (200 * 150/850) = 3,000 IDR
 *      - Соль: (3,000 / 1000) * (10 * 150/850) = 5 IDR
 *    - Томатный соус 30г из полуфабриката: ~800 IDR
 *    - Себестоимость: ~51,316 IDR
 *    - Цена продажи: 120,000 IDR
 *    - Прибыль: 68,684 IDR (134%)
 */
