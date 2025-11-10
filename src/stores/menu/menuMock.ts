// src/stores/menu/menuMock.ts
import type { Category, MenuItem } from './types'

const now = new Date().toISOString()

// =============================================
// КАТЕГОРИИ МЕНЮ
// =============================================

export const mockCategories: Category[] = [
  {
    id: 'cat-main-dishes',
    name: 'Основные блюда',
    description: 'Горячие основные блюда и стейки',
    isActive: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-garnishes',
    name: 'Гарниры',
    description: 'Отдельные гарниры к основным блюдам',
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
    id: 'cat-combo',
    name: 'Комбо блюда',
    description: 'Комплексные блюда с гарниром и соусами',
    isActive: true,
    sortOrder: 4,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-desserts',
    name: 'Десерты',
    description: 'Сладкие блюда и выпечка',
    isActive: true,
    sortOrder: 5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cat-breakfasts',
    name: 'Завтраки',
    description: 'Составные завтраки и утренние блюда',
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
  // 1. ПРОСТАЯ ПЕРЕПРОДАЖА (пиво)
  // =============================================
  {
    id: 'menu-beer-bintang',
    categoryId: 'cat-beverages',
    name: 'Пиво Bintang',
    description: 'Популярное индонезийское пиво',
    type: 'beverage',
    isActive: true,
    variants: [
      {
        id: 'var-beer-330',
        name: '330мл',
        price: 25000, // цена продажи 25,000 IDR
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
        name: '500мл',
        price: 35000, // цена продажи 35,000 IDR
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
    preparationTime: 1, // просто открыть бутылку
    allergens: [],
    tags: ['пиво', 'алкоголь', 'bintang'],
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
    variants: [
      {
        id: 'var-cola-330',
        name: '330мл',
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
    tags: ['газировка', 'безалкогольное'],
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
    variants: [
      {
        id: 'var-water-500',
        name: '500мл',
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
    tags: ['вода', 'безалкогольное'],
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
    type: 'food',
    isActive: true,
    variants: [
      {
        id: 'var-steak-200',
        name: '200г',
        price: 85000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 0.8, // 200г / 250г = 0.8 порции рецепта
            unit: 'portion',
            role: 'main'
          }
        ],
        portionMultiplier: 0.8 // 200г вместо стандартных 250г
      },
      {
        id: 'var-steak-250',
        name: '250г (стандарт)',
        price: 95000,
        isActive: true,
        sortOrder: 1,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 1, // Стандартная порция
            unit: 'portion',
            role: 'main'
          }
        ],
        portionMultiplier: 1 // стандартная порция
      },
      {
        id: 'var-steak-300',
        name: '300г',
        price: 110000,
        isActive: true,
        sortOrder: 2,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 1.2, // 300г / 250г = 1.2 порции рецепта
            unit: 'portion',
            role: 'main'
          }
        ],
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
    type: 'food',
    isActive: true,
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
    type: 'food',
    isActive: true,
    variants: [
      {
        id: 'var-fries-regular',
        name: 'Стандартная порция',
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
        name: 'Большая порция',
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
    tags: ['гарнир', 'картофель', 'фри'],
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'menu-mashed-potato-side',
    categoryId: 'cat-garnishes',
    name: 'Картофельное пюре',
    description: 'Нежное картофельное пюре с маслом',
    type: 'food',
    isActive: true,
    variants: [
      {
        id: 'var-mashed-regular',
        name: 'Стандартная порция',
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
        name: 'Большая порция',
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
    allergens: ['лактоза'],
    tags: ['гарнир', 'картофель', 'пюре'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // 5. ДЕСЕРТЫ (готовые продукты)
  // =============================================
  {
    id: 'menu-cake',
    categoryId: 'cat-desserts',
    name: 'Торт шоколадный',
    description: 'Домашний шоколадный торт',
    type: 'food',
    isActive: true,
    variants: [
      {
        id: 'var-cake-slice',
        name: 'Кусочек',
        price: 35000,
        isActive: true,
        sortOrder: 0,
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
        price: 250000, // скидка за целый торт (вместо 35000 * 8 = 280000)
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
    allergens: ['глютен', 'лактоза', 'яйца'],
    tags: ['десерт', 'торт', 'шоколад'],
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
    variants: [
      {
        id: 'var-bread-whole',
        name: 'Целый багет',
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
        name: 'Половина багета',
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
    allergens: ['глютен'],
    tags: ['хлеб', 'выпечка', 'французский'],
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // СОСТАВНОЙ ЗАВТРАК С МОДИФИКАТОРАМИ
  // =============================================
  {
    id: 'menu-custom-breakfast',
    categoryId: 'cat-breakfasts',
    name: 'Составной завтрак',
    description: 'Создайте свой идеальный завтрак из базы и дополнений',
    type: 'food',
    department: 'kitchen',
    isActive: true,
    variants: [
      {
        id: 'var-custom-breakfast',
        name: 'Составной завтрак',
        price: 50000, // базовая цена
        isActive: true,
        sortOrder: 0,

        // Базовая композиция (входит в цену)
        composition: [
          {
            type: 'product',
            id: 'prod-eggs',
            quantity: 2,
            unit: 'piece',
            role: 'main',
            notes: 'Яйца на выбор (жареные/вареные/омлет)'
          },
          {
            type: 'preparation',
            id: 'prep-potato-hashbrown',
            quantity: 2,
            unit: 'piece',
            role: 'garnish'
          }
        ],

        // Модификаторы
        modifierGroups: [
          {
            id: 'mg-bread',
            name: 'Choose your bread',
            description: 'Выберите хлеб (обязательно)',
            type: 'addon',
            isRequired: true,
            minSelection: 1,
            maxSelection: 1,
            sortOrder: 0,
            options: [
              {
                id: 'mo-toast',
                name: 'Toast',
                description: '2 ломтика тоста',
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
                description: 'Итальянский хлеб',
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
                description: 'Французский круассан',
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
            description: 'Добавьте белки и сыр',
            type: 'addon',
            isRequired: false,
            minSelection: 0,
            maxSelection: 0, // без ограничений
            sortOrder: 1,
            options: [
              {
                id: 'mo-mozzarella',
                name: 'Mozzarella',
                description: 'Итальянская моцарелла',
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
                description: 'Сливочный сыр',
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
                description: 'Хрустящий бекон',
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
                description: 'Соленый лосось',
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
                description: 'Свиная ветчина',
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
                description: 'Куриная колбаска',
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
            description: 'Добавьте соусы',
            type: 'addon',
            isRequired: false,
            minSelection: 0,
            maxSelection: 0, // без ограничений
            sortOrder: 2,
            options: [
              {
                id: 'mo-ketchup',
                name: 'Ketchup',
                description: 'Томатный кетчуп (бесплатно)',
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
                description: 'Майонез (бесплатно)',
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
                description: 'Сливочное масло',
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

        // Шаблоны (готовые комбинации)
        templates: [
          {
            id: 'tmpl-simple',
            name: 'Simple breakfast',
            description: 'Базовый завтрак с тостом',
            sortOrder: 0,
            selectedModifiers: [
              { groupId: 'mg-bread', optionIds: ['mo-toast'] },
              { groupId: 'mg-sauces', optionIds: ['mo-ketchup'] }
            ]
          },
          {
            id: 'tmpl-premium',
            name: 'Premium breakfast',
            description: 'Премиум завтрак с лососем и круассаном',
            sortOrder: 1,
            selectedModifiers: [
              { groupId: 'mg-bread', optionIds: ['mo-croissant'] },
              { groupId: 'mg-proteins', optionIds: ['mo-salmon', 'mo-cream-cheese'] },
              { groupId: 'mg-sauces', optionIds: ['mo-butter'] }
            ]
          }
        ]
      }
    ],
    sortOrder: 1,
    preparationTime: 15,
    allergens: ['яйца', 'глютен', 'молочные продукты'],
    tags: ['завтрак', 'составной', 'кастомизируемый'],
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
