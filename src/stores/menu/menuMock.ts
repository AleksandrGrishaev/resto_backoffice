// src/stores/menu/menuMock.ts
import type { Category, MenuItem } from './types'

const now = new Date().toISOString()

// =============================================
// КАТЕГОРИИ МЕНЮ
// =============================================

export const mockCategories: Category[] = [
  {
    id: 'cat-main-dishes',
    name: 'Main Dishes',
    description: 'Hot main dishes and steaks',
    isActive: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-garnishes',
    name: 'Sides',
    description: 'Side dishes to complement main courses',
    isActive: true,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-beverages',
    name: 'Beverages',
    description: 'Alcoholic and non-alcoholic drinks',
    isActive: true,
    sortOrder: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-combo',
    name: 'Combo Meals',
    description: 'Complete meals with sides and sauces',
    isActive: true,
    sortOrder: 4,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-desserts',
    name: 'Desserts',
    description: 'Sweet dishes and pastries',
    isActive: true,
    sortOrder: 5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-breakfasts',
    name: 'Breakfasts',
    description: 'Build-your-own breakfasts and morning dishes',
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// ПОЗИЦИИ МЕНЮ
// =============================================

export const mockMenuItems: MenuItem[] = [
  // =============================================
  // 1. SIMPLE RESALE (beer)
  // =============================================
  {
    id: 'menu-beer-bintang',
    categoryId: 'cat-beverages',
    name: 'Bintang Beer',
    description: 'Popular Indonesian beer',
    type: 'beverage',
    department: 'bar',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-beer-330',
        name: '330ml',
        price: 25000, // selling price 25,000 IDR
        isActive: true,
        sortOrder: 0,
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
        name: '500ml',
        price: 35000, // selling price 35,000 IDR
        isActive: true,
        sortOrder: 1,
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
    sortOrder: 0,
    preparationTime: 1, // just open the bottle
    allergens: [],
    tags: ['beer', 'alcohol', 'bintang'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-cola',
    categoryId: 'cat-beverages',
    name: 'Coca-Cola',
    description: 'Refreshing Coca-Cola',
    type: 'beverage',
    department: 'bar',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-cola-330',
        name: '330ml',
        price: 15000,
        isActive: true,
        sortOrder: 0,
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
    sortOrder: 1,
    preparationTime: 1,
    allergens: [],
    tags: ['soda', 'non-alcoholic'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-water',
    categoryId: 'cat-beverages',
    name: 'Mineral Water',
    description: 'Pure mineral water',
    type: 'beverage',
    department: 'bar',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-water-500',
        name: '500ml',
        price: 8000,
        isActive: true,
        sortOrder: 0,
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
    sortOrder: 2,
    preparationTime: 1,
    allergens: [],
    tags: ['water', 'non-alcoholic'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 2. SIMPLE PREPARED DISH (steak)
  // =============================================
  {
    id: 'menu-beef-steak',
    categoryId: 'cat-main-dishes',
    name: 'Beef Steak',
    description: 'Juicy grilled beef steak',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-steak-200',
        name: '200g',
        price: 85000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 0.8, // 200g / 250g = 0.8 recipe portions
            unit: 'portion',
            role: 'main'
          }
        ],
        portionMultiplier: 0.8 // 200g instead of standard 250g
      },
      {
        id: 'var-steak-250',
        name: '250g (standard)',
        price: 95000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 1, // Standard portion
            unit: 'portion',
            role: 'main'
          }
        ],
        portionMultiplier: 1 // standard portion
      },
      {
        id: 'var-steak-300',
        name: '300g',
        price: 110000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 1.2, // 300g / 250g = 1.2 recipe portions
            unit: 'portion',
            role: 'main'
          }
        ],
        portionMultiplier: 1.2 // increased portion
      }
    ],
    sortOrder: 0,
    preparationTime: 20,
    allergens: [],
    tags: ['steak', 'beef', 'grill', 'premium'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 3. COMPOSITE DISH (steak with side)
  // =============================================
  {
    id: 'menu-steak-with-garnish',
    categoryId: 'cat-combo',
    name: 'Steak with Side',
    description: 'Juicy steak with choice of side and sauce',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-steak-fries',
        name: 'with French Fries',
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
            notes: '250g steak'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 150,
            unit: 'gram',
            role: 'garnish',
            notes: 'french fries portion'
          },
          {
            type: 'preparation',
            id: 'prep-tomato-sauce',
            quantity: 30,
            unit: 'gram',
            role: 'sauce',
            notes: 'tomato sauce'
          }
        ]
      },
      {
        id: 'var-steak-mashed',
        name: 'with Mashed Potato',
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
            notes: '250g steak'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 180,
            unit: 'gram',
            role: 'garnish',
            notes: 'mashed potato portion'
          },
          {
            type: 'preparation',
            id: 'prep-garlic-sauce',
            quantity: 25,
            unit: 'gram',
            role: 'sauce',
            notes: 'garlic sauce'
          }
        ]
      },
      {
        id: 'var-steak-double-garnish',
        name: 'with Double Side',
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
            notes: '250g steak'
          },
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 100,
            unit: 'gram',
            role: 'garnish',
            notes: 'french fries'
          },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 120,
            unit: 'gram',
            role: 'garnish',
            notes: 'mashed potato'
          },
          {
            type: 'preparation',
            id: 'prep-tomato-sauce',
            quantity: 20,
            unit: 'gram',
            role: 'sauce',
            notes: 'tomato sauce'
          },
          {
            type: 'preparation',
            id: 'prep-garlic-sauce',
            quantity: 15,
            unit: 'gram',
            role: 'sauce',
            notes: 'garlic sauce'
          }
        ]
      }
    ],
    sortOrder: 0,
    preparationTime: 25,
    allergens: [],
    tags: ['combo', 'steak', 'side', 'complete meal'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 4. SIDE DISHES
  // =============================================
  {
    id: 'menu-fries-side',
    categoryId: 'cat-garnishes',
    name: 'French Fries',
    description: 'Crispy french fries',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-fries-regular',
        name: 'Regular Portion',
        price: 25000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          }
        ],
        portionMultiplier: 1
      },
      {
        id: 'var-fries-large',
        name: 'Large Portion',
        price: 35000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'preparation',
            id: 'prep-french-fries',
            quantity: 300,
            unit: 'gram',
            role: 'main'
          }
        ],
        portionMultiplier: 1.5
      }
    ],
    sortOrder: 0,
    preparationTime: 15,
    allergens: [],
    tags: ['side', 'potato', 'fries'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-mashed-potato-side',
    categoryId: 'cat-garnishes',
    name: 'Mashed Potato',
    description: 'Creamy mashed potato with butter',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-mashed-regular',
        name: 'Regular Portion',
        price: 22000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          }
        ],
        portionMultiplier: 1
      },
      {
        id: 'var-mashed-large',
        name: 'Large Portion',
        price: 30000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 280,
            unit: 'gram',
            role: 'main'
          }
        ],
        portionMultiplier: 1.4
      }
    ],
    sortOrder: 1,
    preparationTime: 20,
    allergens: ['lactose'],
    tags: ['side', 'potato', 'mashed'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 5. DESSERTS (prepared products)
  // =============================================
  {
    id: 'menu-cake',
    categoryId: 'cat-desserts',
    name: 'Chocolate Cake',
    description: 'Homemade chocolate cake',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-cake-slice',
        name: 'Slice',
        price: 35000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'product',
            id: 'prod-cake-chocolate',
            quantity: 0.125, // 1/8 of cake
            unit: 'piece',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-cake-whole',
        name: 'Whole Cake',
        price: 250000, // discount for whole cake (instead of 35000 * 8 = 280000)
        isActive: true,
        sortOrder: 1,
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
    sortOrder: 0,
    preparationTime: 2,
    allergens: ['gluten', 'lactose', 'eggs'],
    tags: ['dessert', 'cake', 'chocolate'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-bread',
    categoryId: 'cat-desserts',
    name: 'French Baguette',
    description: 'Fresh French baguette',
    type: 'food',
    department: 'kitchen',
    dishType: 'simple',
    isActive: true,
    variants: [
      {
        id: 'var-bread-whole',
        name: 'Whole Baguette',
        price: 40000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'product',
            id: 'prod-bread-baguette',
            quantity: 1,
            unit: 'piece',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-bread-half',
        name: 'Half Baguette',
        price: 22000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'product',
            id: 'prod-bread-baguette',
            quantity: 0.5,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    sortOrder: 1,
    preparationTime: 1,
    allergens: ['gluten'],
    tags: ['bread', 'bakery', 'french'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // BUILD-YOUR-OWN BREAKFAST WITH MODIFIERS
  // =============================================
  {
    id: 'menu-custom-breakfast',
    categoryId: 'cat-breakfasts',
    name: 'Build Your Own Breakfast',
    description: 'Create your perfect breakfast from base and add-ons',
    type: 'food',
    department: 'kitchen',
    dishType: 'addon-based',
    isActive: true,

    // Modifier groups at MenuItem level
    modifierGroups: [
      {
        id: 'mg-bread',
        name: 'Choose your bread',
        description: 'Select your bread (required)',
        type: 'addon',
        groupStyle: 'addon',
        isRequired: true,
        minSelection: 1,
        maxSelection: 1,
        sortOrder: 0,
        options: [
          {
            id: 'mo-toast',
            name: 'Toast',
            description: '2 slices of toast',
            priceAdjustment: 0,
            isDefault: true,
            isActive: true,
            sortOrder: 0,
            composition: [
              {
                type: 'product',
                id: 'prod-toast',
                quantity: 2,
                unit: 'piece',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-ciabatta',
            name: 'Ciabatta',
            description: 'Italian bread',
            priceAdjustment: 5000,
            isActive: true,
            sortOrder: 1,
            composition: [
              {
                type: 'product',
                id: 'prod-ciabatta',
                quantity: 1,
                unit: 'piece',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-croissant',
            name: 'Croissant',
            description: 'French croissant',
            priceAdjustment: 8000,
            isActive: true,
            sortOrder: 2,
            composition: [
              {
                type: 'product',
                id: 'prod-croissant',
                quantity: 1,
                unit: 'piece',
                role: 'addon'
              }
            ]
          }
        ]
      },

      {
        id: 'mg-proteins',
        name: 'Extra proteins & cheese',
        description: 'Add proteins and cheese',
        type: 'addon',
        groupStyle: 'addon',
        isRequired: false,
        minSelection: 0,
        maxSelection: 0, // no limit
        sortOrder: 1,
        options: [
          {
            id: 'mo-mozzarella',
            name: 'Mozzarella',
            description: 'Italian mozzarella',
            priceAdjustment: 10000,
            isActive: true,
            sortOrder: 0,
            composition: [
              {
                type: 'product',
                id: 'prod-mozzarella',
                quantity: 50,
                unit: 'gram',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-cream-cheese',
            name: 'Cream cheese',
            description: 'Creamy cheese',
            priceAdjustment: 8000,
            isActive: true,
            sortOrder: 1,
            composition: [
              {
                type: 'product',
                id: 'prod-cream-cheese',
                quantity: 40,
                unit: 'gram',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-bacon',
            name: 'Bacon',
            description: 'Crispy bacon',
            priceAdjustment: 15000,
            isActive: true,
            sortOrder: 2,
            composition: [
              {
                type: 'product',
                id: 'prod-bacon',
                quantity: 50,
                unit: 'gram',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-salmon',
            name: 'Salted Salmon',
            description: 'Salted salmon',
            priceAdjustment: 25000,
            isActive: true,
            sortOrder: 3,
            composition: [
              {
                type: 'product',
                id: 'prod-salmon',
                quantity: 60,
                unit: 'gram',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-pork-ham',
            name: 'Pork ham',
            description: 'Pork ham',
            priceAdjustment: 12000,
            isActive: true,
            sortOrder: 4,
            composition: [
              {
                type: 'product',
                id: 'prod-pork-ham',
                quantity: 50,
                unit: 'gram',
                role: 'addon'
              }
            ]
          },
          {
            id: 'mo-chicken-sausage',
            name: 'Chicken sausage',
            description: 'Chicken sausage',
            priceAdjustment: 10000,
            isActive: true,
            sortOrder: 5,
            composition: [
              {
                type: 'product',
                id: 'prod-chicken-sausage',
                quantity: 2,
                unit: 'piece',
                role: 'addon'
              }
            ]
          }
        ]
      },

      {
        id: 'mg-sauces',
        name: 'Sauces',
        description: 'Add sauces',
        type: 'addon',
        groupStyle: 'addon',
        isRequired: false,
        minSelection: 0,
        maxSelection: 0, // no limit
        sortOrder: 2,
        options: [
          {
            id: 'mo-ketchup',
            name: 'Ketchup',
            description: 'Tomato ketchup (free)',
            priceAdjustment: 0,
            isActive: true,
            sortOrder: 0,
            composition: [
              {
                type: 'product',
                id: 'prod-ketchup',
                quantity: 20,
                unit: 'gram',
                role: 'sauce'
              }
            ]
          },
          {
            id: 'mo-mayo',
            name: 'Mayo',
            description: 'Mayonnaise (free)',
            priceAdjustment: 0,
            isActive: true,
            sortOrder: 1,
            composition: [
              {
                type: 'product',
                id: 'prod-mayo',
                quantity: 20,
                unit: 'gram',
                role: 'sauce'
              }
            ]
          },
          {
            id: 'mo-butter',
            name: 'Butter',
            description: 'Butter',
            priceAdjustment: 2000,
            isActive: true,
            sortOrder: 2,
            composition: [
              {
                type: 'product',
                id: 'prod-butter',
                quantity: 15,
                unit: 'gram',
                role: 'sauce'
              }
            ]
          }
        ]
      }
    ],

    // Templates at MenuItem level
    templates: [
      {
        id: 'tmpl-simple',
        name: 'Simple breakfast',
        description: 'Basic breakfast with toast',
        sortOrder: 0,
        selectedModifiers: [
          { groupId: 'mg-bread', optionIds: ['mo-toast'] },
          { groupId: 'mg-sauces', optionIds: ['mo-ketchup'] }
        ]
      },
      {
        id: 'tmpl-premium',
        name: 'Premium breakfast',
        description: 'Premium breakfast with salmon and croissant',
        sortOrder: 1,
        selectedModifiers: [
          { groupId: 'mg-bread', optionIds: ['mo-croissant'] },
          { groupId: 'mg-proteins', optionIds: ['mo-salmon', 'mo-cream-cheese'] },
          { groupId: 'mg-sauces', optionIds: ['mo-butter'] }
        ]
      }
    ],

    // Variants at MenuItem level
    variants: [
      {
        id: 'var-custom-breakfast',
        name: 'Standard Portion',
        price: 50000, // base price
        isActive: true,
        sortOrder: 0,

        // Base composition (included in price)
        composition: [
          {
            type: 'product',
            id: 'prod-eggs',
            quantity: 2,
            unit: 'piece',
            role: 'main',
            notes: 'Eggs (fried/boiled/omelet)'
          },
          {
            type: 'preparation',
            id: 'prep-potato-hashbrown',
            quantity: 2,
            unit: 'piece',
            role: 'garnish'
          }
        ]
      }
    ],
    sortOrder: 1,
    preparationTime: 15,
    allergens: ['eggs', 'gluten', 'dairy'],
    tags: ['breakfast', 'build-your-own', 'customizable'],
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

export function findMenuItemById(id: string): MenuItem | undefined {
  return mockMenuItems.find(item => item.id === id)
}

export function findCategoryById(id: string): Category | undefined {
  return mockCategories.find(category => category.id === id)
}

// =============================================
// ПРИМЕРЫ РАСЧЕТА СЕБЕСТОИМОСТИ (для демонстрации)
// =============================================

/**
 * Пример расчета себестоимости для разных типов позиций:
 *
 * 1. Пиво 330мл (простая перепродажа):
 *    - Себестоимость: 12,000 IDR (costPerUnit продукта)
 *    - Цена продажи: 25,000 IDR
 *    - Прибыль: 13,000 IDR (108%)
 *
 * 2. Стейк 250г (рецепт):
 *    - Расчет через рецепт recipe-beef-steak
 *    - Говядина 250г: (180,000 / 1000) * 250 = 45,000 IDR
 *    - Масло 10мл: (85,000 / 1000) * 10 = 850 IDR
 *    - Приправы: ~400 IDR
 *    - Себестоимость: ~46,250 IDR
 *    - Цена продажи: 95,000 IDR
 *    - Прибыль: 48,750 IDR (105%)
 *
 * 3. Стейк с картофелем фри (композитное):
 *    - Стейк (рецепт): 46,250 IDR
 *    - Картофель фри 150г (полуфабрикат): ~4,500 IDR
 *    - Томатный соус 30г (полуфабрикат): ~800 IDR
 *    - Себестоимость: ~51,550 IDR
 *    - Цена продажи: 120,000 IDR
 *    - Прибыль: 68,450 IDR (133%)
 *
 * 4. Торт кусочек (дробление продукта):
 *    - Целый торт: 200,000 IDR себестоимость
 *    - Кусочек (1/8): 200,000 / 8 = 25,000 IDR
 *    - Цена продажи: 35,000 IDR
 *    - Прибыль: 10,000 IDR (40%)
 */
