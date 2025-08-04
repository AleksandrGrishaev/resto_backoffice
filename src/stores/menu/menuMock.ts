// src/stores/menu/menuMock.ts
import type { Category, MenuItem } from './types'

const now = new Date().toISOString()

// =============================================
// КАТЕГОРИИ МЕНЮ
// =============================================

export const mockCategories: Category[] = [
  {
    id: 'cat-steaks',
    name: 'Стейки',
    description: 'Премиальные мясные стейки',
    isActive: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-garnish',
    name: 'Гарниры',
    description: 'Отдельные гарниры',
    isActive: true,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-beverages',
    name: 'Напитки',
    description: 'Алкогольные и безалкогольные напитки',
    isActive: true,
    sortOrder: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-desserts',
    name: 'Десерты',
    description: 'Сладкие блюда и выпечка',
    isActive: true,
    sortOrder: 4,
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// ПОЗИЦИИ МЕНЮ
// =============================================

export const mockMenuItems: MenuItem[] = [
  // =============================================
  // СТЕЙКИ С ГАРНИРОМ (композитные блюда)
  // =============================================
  {
    id: 'menu-steak-200g',
    categoryId: 'cat-steaks',
    name: 'Стейк 200г с гарниром',
    description: 'Говяжий стейк 200г с выбором гарнира',
    type: 'food',
    isActive: true,
    sortOrder: 1,
    variants: [
      {
        id: 'var-steak-200-fries',
        name: 'с картошкой фри',
        price: 95000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak', // ссылка на рецепт стейка
            quantity: 200,
            unit: 'gram',
            role: 'main'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries', // ссылка на полуфабрикат картошки фри
            quantity: 150,
            unit: 'gram',
            role: 'garnish'
          }
        ]
      },
      {
        id: 'var-steak-200-mash',
        name: 'с картофельным пюре',
        price: 90000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 180,
            unit: 'gram',
            role: 'garnish'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-steak-300g',
    categoryId: 'cat-steaks',
    name: 'Стейк 300г с гарниром',
    description: 'Говяжий стейк 300г с выбором гарнира',
    type: 'food',
    isActive: true,
    sortOrder: 2,
    variants: [
      {
        id: 'var-steak-300-fries',
        name: 'с картошкой фри',
        price: 125000, // НЕ пропорционально!
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 300, // больше мяса
            unit: 'gram',
            role: 'main'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 200, // больше гарнира
            unit: 'gram',
            role: 'garnish'
          }
        ]
      },
      {
        id: 'var-steak-300-mash',
        name: 'с картофельным пюре',
        price: 120000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 300,
            unit: 'gram',
            role: 'main'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 220, // больше пюре
            unit: 'gram',
            role: 'garnish'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ОТДЕЛЬНЫЕ ГАРНИРЫ (простые полуфабрикаты)
  // =============================================
  {
    id: 'menu-fries-solo',
    categoryId: 'cat-garnish',
    name: 'Картошка фри',
    description: 'Хрустящая картошка фри',
    type: 'food',
    isActive: true,
    sortOrder: 1,
    variants: [
      {
        id: 'var-fries-regular',
        name: 'Стандартная порция',
        price: 25000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-fries-large',
        name: 'Большая порция',
        price: 35000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 300,
            unit: 'gram',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-mash-solo',
    categoryId: 'cat-garnish',
    name: 'Картофельное пюре',
    description: 'Нежное картофельное пюре',
    type: 'food',
    isActive: true,
    sortOrder: 2,
    variants: [
      {
        id: 'var-mash-regular',
        name: 'Стандартная порция',
        price: 20000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // НАПИТКИ (простые продукты)
  // =============================================
  {
    id: 'menu-beer-bintang',
    categoryId: 'cat-beverages',
    name: 'Пиво Bintang',
    description: 'Индонезийское пиво Bintang',
    type: 'beverage',
    isActive: true,
    sortOrder: 1,
    variants: [
      {
        id: 'var-beer-330',
        name: '330мл',
        price: 25000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-beer-bintang-330',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-beer-500',
        name: '500мл',
        price: 35000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'product',
            id: 'prod-beer-bintang-500',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-cola',
    categoryId: 'cat-beverages',
    name: 'Кока-Кола',
    description: 'Освежающая кока-кола',
    type: 'beverage',
    isActive: true,
    sortOrder: 2,
    variants: [
      {
        id: 'var-cola-330',
        name: '330мл',
        price: 15000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-cola-330',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-water',
    categoryId: 'cat-beverages',
    name: 'Вода минеральная',
    description: 'Чистая минеральная вода',
    type: 'beverage',
    isActive: true,
    sortOrder: 3,
    variants: [
      {
        id: 'var-water-500',
        name: '500мл',
        price: 8000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-water-500',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ДЕСЕРТЫ (готовые продукты)
  // =============================================
  {
    id: 'menu-cake',
    categoryId: 'cat-desserts',
    name: 'Торт шоколадный',
    description: 'Домашний шоколадный торт',
    type: 'food',
    isActive: true,
    sortOrder: 1,
    variants: [
      {
        id: 'var-cake-slice',
        name: 'Кусочек',
        price: 35000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-cake-chocolate',
            quantity: 0.125, // 1/8 торта
            unit: 'piece',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-cake-whole',
        name: 'Целый торт',
        price: 250000, // скидка за целый торт
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'product',
            id: 'prod-cake-chocolate',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-bread',
    categoryId: 'cat-desserts',
    name: 'Багет французский',
    description: 'Свежий французский багет',
    type: 'food',
    isActive: true,
    sortOrder: 2,
    variants: [
      {
        id: 'var-bread-whole',
        name: 'Целый багет',
        price: 40000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-bread-baguette',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// УТИЛИТЫ
// =============================================

export function getMockCategoriesWithItems() {
  return mockCategories.map(category => ({
    ...category,
    items: mockMenuItems.filter(item => item.categoryId === category.id)
  }))
}

export function getMockItemsByCategory(categoryId: string) {
  return mockMenuItems.filter(item => item.categoryId === categoryId)
}

export function getMockActiveCategories() {
  return mockCategories.filter(cat => cat.isActive)
}

export function getMockActiveItems() {
  return mockMenuItems.filter(item => item.isActive)
}
