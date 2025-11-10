// src/stores/recipes/recipesMock.ts
import type { Recipe, Preparation } from './types'

const now = new Date().toISOString()

// =============================================
// ПОЛУФАБРИКАТЫ (PREPARATIONS)
// =============================================

export const mockPreparations: Preparation[] = [
  // Соус 3 - Маринад для мяса
  {
    id: 'prep-meat-marinade',
    name: 'Маринад для мяса универсальный',
    code: 'P-005',
    type: 'marinade',
    description: 'Универсальный маринад для говядины и свинины',
    recipe: [
      {
        type: 'product',
        id: 'prod-olive-oil',
        quantity: 100,
        unit: 'ml',
        notes: 'основа маринада'
      },
      { type: 'product', id: 'prod-garlic', quantity: 30, unit: 'gram', notes: 'измельченный' },
      { type: 'product', id: 'prod-onion', quantity: 100, unit: 'gram', notes: 'мелко нарезанный' },
      { type: 'product', id: 'prod-black-pepper', quantity: 3, unit: 'gram', notes: 'молотый' },
      { type: 'product', id: 'prod-salt', quantity: 5, unit: 'gram', notes: 'крупная соль' }
    ],
    outputQuantity: 200, // получается 200мл маринада
    outputUnit: 'ml',
    preparationTime: 10,
    instructions:
      '1. Измельчить чеснок и лук\n' +
      '2. Смешать с оливковым маслом\n' +
      '3. Добавить соль и перец\n' +
      '4. Перемешать до однородности\n' +
      '5. Дать настояться 30 минут',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Соус 4 - Салатная заправка
  {
    id: 'prep-salad-dressing',
    name: 'Заправка для салата классическая',
    code: 'P-006',
    type: 'sauce',
    description: 'Классическая заправка на основе оливкового масла',
    recipe: [
      { type: 'product', id: 'prod-olive-oil', quantity: 120, unit: 'ml', notes: 'extra virgin' },
      { type: 'product', id: 'prod-garlic', quantity: 10, unit: 'gram', notes: 'мелко рубленный' },
      { type: 'product', id: 'prod-salt', quantity: 3, unit: 'gram', notes: 'морская соль' },
      { type: 'product', id: 'prod-black-pepper', quantity: 1, unit: 'gram', notes: 'свежемолотый' }
    ],
    outputQuantity: 130, // получается 130мл заправки
    outputUnit: 'ml',
    preparationTime: 5,
    instructions:
      '1. Смешать оливковое масло с измельченным чесноком\n' +
      '2. Добавить соль и перец\n' +
      '3. Взбить до эмульсии\n' +
      '4. Дать настояться 15 минут',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Гарнир 2 - Овощное рагу
  {
    id: 'prep-vegetable-stew',
    name: 'Овощное рагу',
    code: 'P-007',
    type: 'garnish',
    description: 'Тушеные овощи как гарнир к мясным блюдам',
    recipe: [
      {
        type: 'product',
        id: 'prod-tomato',
        quantity: 300,
        unit: 'gram',
        notes: 'нарезанные кубиками'
      },
      { type: 'product', id: 'prod-onion', quantity: 150, unit: 'gram', notes: 'полукольцами' },
      { type: 'product', id: 'prod-garlic', quantity: 20, unit: 'gram', notes: 'измельченный' },
      { type: 'product', id: 'prod-olive-oil', quantity: 30, unit: 'ml', notes: 'для тушения' },
      { type: 'product', id: 'prod-salt', quantity: 5, unit: 'gram', notes: 'по вкусу' },
      { type: 'product', id: 'prod-black-pepper', quantity: 2, unit: 'gram', notes: 'молотый' }
    ],
    outputQuantity: 400, // получается 400г готового рагу
    outputUnit: 'gram',
    preparationTime: 25,
    instructions:
      '1. Нарезать все овощи\n' +
      '2. Обжарить лук на оливковом масле\n' +
      '3. Добавить чеснок, жарить 1 минуту\n' +
      '4. Добавить томаты\n' +
      '5. Тушить 15 минут под крышкой\n' +
      '6. Приправить солью и перцем',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Приправа - Смесь специй для мяса
  {
    id: 'prep-meat-spice-mix',
    name: 'Смесь специй для мяса',
    code: 'P-008',
    type: 'seasoning',
    description: 'Универсальная смесь специй для стейков и жареного мяса',
    recipe: [
      {
        type: 'product',
        id: 'prod-black-pepper',
        quantity: 15,
        unit: 'gram',
        notes: 'крупного помола'
      },
      { type: 'product', id: 'prod-salt', quantity: 20, unit: 'gram', notes: 'морская крупная' },
      {
        type: 'product',
        id: 'prod-garlic',
        quantity: 10,
        unit: 'gram',
        notes: 'сушеный гранулированный'
      }
    ],
    outputQuantity: 40, // получается 40г смеси специй
    outputUnit: 'gram',
    preparationTime: 5,
    instructions:
      '1. Смешать все сухие ингредиенты\n' +
      '2. Перемешать до однородности\n' +
      '3. Пересыпать в герметичную емкость\n' +
      '4. Хранить в сухом месте',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Соус 5 - Сливочно-чесночный соус
  {
    id: 'prep-creamy-garlic-sauce',
    name: 'Сливочно-чесночный соус',
    code: 'P-009',
    type: 'sauce',
    description: 'Нежный сливочный соус с чесноком для пасты и мяса',
    recipe: [
      { type: 'product', id: 'prod-butter', quantity: 80, unit: 'gram', notes: 'сливочное' },
      { type: 'product', id: 'prod-milk', quantity: 150, unit: 'ml', notes: 'молоко как сливки' },
      { type: 'product', id: 'prod-garlic', quantity: 25, unit: 'gram', notes: 'измельченный' },
      { type: 'product', id: 'prod-salt', quantity: 3, unit: 'gram', notes: 'по вкусу' },
      { type: 'product', id: 'prod-black-pepper', quantity: 1, unit: 'gram', notes: 'белый перец' }
    ],
    outputQuantity: 200, // получается 200мл соуса
    outputUnit: 'ml',
    preparationTime: 15,
    instructions:
      '1. Растопить сливочное масло на слабом огне\n' +
      '2. Добавить измельченный чеснок\n' +
      '3. Обжарить чеснок 2 минуты\n' +
      '4. Влить молоко постепенно\n' +
      '5. Варить на слабом огне 5 минут\n' +
      '6. Приправить солью и перцем\n' +
      '7. Процедить если нужна гладкая текстура',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Картофельные оладьи (хэшбраун)
  {
    id: 'prep-potato-hashbrown',
    name: 'Картофельные оладьи (хэшбраун)',
    code: 'P-010',
    type: 'garnish',
    description: 'Хрустящие картофельные оладьи для завтрака',
    recipe: [
      {
        type: 'product',
        id: 'prod-potato',
        quantity: 800,
        unit: 'gram',
        notes: 'натертый на терке'
      },
      { type: 'product', id: 'prod-onion', quantity: 100, unit: 'gram', notes: 'мелко нарезанный' },
      { type: 'product', id: 'prod-olive-oil', quantity: 80, unit: 'ml', notes: 'для жарки' },
      { type: 'product', id: 'prod-salt', quantity: 8, unit: 'gram', notes: 'по вкусу' },
      { type: 'product', id: 'prod-black-pepper', quantity: 2, unit: 'gram', notes: 'молотый' }
    ],
    outputQuantity: 700, // получается 700г готовых оладий (4-5 штук)
    outputUnit: 'gram',
    preparationTime: 20,
    instructions:
      '1. Натереть очищенный картофель на крупной терке\n' +
      '2. Отжать лишнюю жидкость из картофеля\n' +
      '3. Добавить мелко нарезанный лук\n' +
      '4. Приправить солью и перцем\n' +
      '5. Разогреть масло на сковороде до средней температуры\n' +
      '6. Формировать оладьи и жарить 4-5 минут с каждой стороны\n' +
      '7. Жарить до золотистой корочки\n' +
      '8. Выложить на салфетки для удаления лишнего масла',
    isActive: true,
    costPerPortion: 0,
    createdAt: now,
    updatedAt: now
  },

  // Соус 1 - Томатный соус
  {
    id: 'prep-tomato-sauce',
    name: 'Томатный соус классический',
    code: 'P-001',
    type: 'sauce',
    description: 'Классический томатный соус с травами для стейка',
    recipe: [
      { type: 'product', id: 'prod-tomato', quantity: 1, unit: 'kg', notes: 'свежие, нарезанные' },
      { type: 'product', id: 'prod-onion', quantity: 200, unit: 'gram', notes: 'мелко нарезанный' },
      { type: 'product', id: 'prod-garlic', quantity: 50, unit: 'gram', notes: 'измельченный' },
      { type: 'product', id: 'prod-olive-oil', quantity: 50, unit: 'ml', notes: 'для обжарки' },
      { type: 'product', id: 'prod-oregano', quantity: 2, unit: 'gram', notes: 'сушеный' },
      { type: 'product', id: 'prod-basil', quantity: 1, unit: 'pack', notes: 'свежие листья' },
      { type: 'product', id: 'prod-salt', quantity: 8, unit: 'gram', notes: 'по вкусу' },
      { type: 'product', id: 'prod-black-pepper', quantity: 1, unit: 'gram', notes: 'молотый' }
    ],
    outputQuantity: 800, // получается 800г готового соуса
    outputUnit: 'gram',
    preparationTime: 45,
    instructions:
      '1. Нарезать лук и чеснок мелко\n' +
      '2. Обжарить лук на оливковом масле до золотистого цвета\n' +
      '3. Добавить чеснок, обжарить 1 минуту\n' +
      '4. Добавить нарезанные томаты\n' +
      '5. Тушить на медленном огне 30 минут\n' +
      '6. Добавить орегано и базилик\n' +
      '7. Приправить солью и перцем\n' +
      '8. Готовить еще 5 минут',
    isActive: true,
    costPerPortion: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  },

  // Соус 2 - Чесночный соус
  {
    id: 'prep-garlic-sauce',
    name: 'Чесночный соус',
    code: 'P-002',
    type: 'sauce',
    description: 'Ароматный чесночный соус для мяса',
    recipe: [
      { type: 'product', id: 'prod-garlic', quantity: 100, unit: 'gram', notes: 'измельченный' },
      { type: 'product', id: 'prod-olive-oil', quantity: 150, unit: 'ml', notes: 'основа соуса' },
      { type: 'product', id: 'prod-butter', quantity: 50, unit: 'gram', notes: 'для кремовости' },
      { type: 'product', id: 'prod-salt', quantity: 5, unit: 'gram', notes: 'по вкусу' },
      { type: 'product', id: 'prod-black-pepper', quantity: 2, unit: 'gram', notes: 'молотый' }
    ],
    outputQuantity: 250, // получается 250г соуса
    outputUnit: 'gram',
    preparationTime: 15,
    instructions:
      '1. Измельчить чеснок в пасту\n' +
      '2. Разогреть оливковое масло на слабом огне\n' +
      '3. Добавить чеснок, томить 5 минут\n' +
      '4. Добавить сливочное масло\n' +
      '5. Приправить солью и перцем\n' +
      '6. Перемешать до однородности',
    isActive: true,
    costPerPortion: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  },

  // Пюре картофельное
  {
    id: 'prep-mashed-potato',
    name: 'Картофельное пюре',
    code: 'P-003',
    type: 'garnish',
    description: 'Нежное картофельное пюре с маслом и молоком',
    recipe: [
      {
        type: 'product',
        id: 'prod-potato',
        quantity: 1,
        unit: 'kg',
        notes: 'очищенный, нарезанный'
      },
      { type: 'product', id: 'prod-butter', quantity: 100, unit: 'gram', notes: 'сливочное' },
      { type: 'product', id: 'prod-milk', quantity: 200, unit: 'ml', notes: 'теплое' },
      { type: 'product', id: 'prod-salt', quantity: 8, unit: 'gram', notes: 'по вкусу' }
    ],
    outputQuantity: 1200, // получается 1200г готового пюре
    outputUnit: 'gram',
    preparationTime: 30,
    instructions:
      '1. Отварить картофель до готовности (20-25 минут)\n' +
      '2. Слить воду полностью\n' +
      '3. Размять картофель в пюре\n' +
      '4. Добавить размягченное сливочное масло\n' +
      '5. Постепенно влить теплое молоко\n' +
      '6. Взбить до однородной консистенции\n' +
      '7. Приправить солью по вкусу',
    isActive: true,
    costPerPortion: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  },

  // Картофель фри
  {
    id: 'prep-french-fries',
    name: 'Картофель фри',
    code: 'P-004',
    type: 'garnish',
    description: 'Хрустящий картофель фри',
    recipe: [
      { type: 'product', id: 'prod-potato', quantity: 1, unit: 'kg', notes: 'нарезанный соломкой' },
      { type: 'product', id: 'prod-olive-oil', quantity: 200, unit: 'ml', notes: 'для фритюра' },
      { type: 'product', id: 'prod-salt', quantity: 10, unit: 'gram', notes: 'для посыпки' }
    ],
    outputQuantity: 850, // получается 850г готового картофеля фри
    outputUnit: 'gram',
    preparationTime: 25,
    instructions:
      '1. Нарезать картофель соломкой толщиной 1см\n' +
      '2. Промыть в холодной воде\n' +
      '3. Обсушить полотенцем\n' +
      '4. Разогреть масло до 180°C\n' +
      '5. Жарить порциями 8-10 минут\n' +
      '6. Жарить до золотистого цвета\n' +
      '7. Выложить на салфетки\n' +
      '8. Посолить сразу после жарки',
    isActive: true,
    costPerPortion: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  }
]

// =============================================
// РЕЦЕПТЫ ГОТОВЫХ БЛЮД
// =============================================

export const mockRecipes: Recipe[] = [
  // Стейк (простое блюдо)
  {
    id: 'recipe-beef-steak',
    name: 'Стейк говяжий',
    code: 'R-001',
    description: 'Сочный говяжий стейк средней прожарки',
    category: 'main_dish',
    portionSize: 1,
    portionUnit: 'порция',
    components: [
      {
        id: 'comp-1',
        componentId: 'prod-beef-steak',
        componentType: 'product',
        quantity: 250,
        unit: 'gram',
        notes: 'толщина 2-3см'
      },
      {
        id: 'comp-2',
        componentId: 'prod-olive-oil',
        componentType: 'product',
        quantity: 10,
        unit: 'ml',
        notes: 'для жарки'
      },
      {
        id: 'comp-3',
        componentId: 'prod-salt',
        componentType: 'product',
        quantity: 3,
        unit: 'gram',
        notes: 'крупная морская'
      },
      {
        id: 'comp-4',
        componentId: 'prod-black-pepper',
        componentType: 'product',
        quantity: 2,
        unit: 'gram',
        notes: 'свежемолотый'
      }
    ],
    instructions: [
      {
        id: 'step-1',
        stepNumber: 1,
        instruction: 'Достать стейк из холодильника за 30 минут до готовки',
        duration: 30
      },
      {
        id: 'step-2',
        stepNumber: 2,
        instruction: 'Разогреть сковороду до высокой температуры',
        duration: 5
      },
      {
        id: 'step-3',
        stepNumber: 3,
        instruction: 'Посолить и поперчить стейк с обеих сторон',
        duration: 1
      },
      {
        id: 'step-4',
        stepNumber: 4,
        instruction: 'Смазать сковороду маслом и выложить стейк',
        duration: 1
      },
      {
        id: 'step-5',
        stepNumber: 5,
        instruction: 'Жарить 3-4 минуты с каждой стороны для medium',
        duration: 8
      },
      {
        id: 'step-6',
        stepNumber: 6,
        instruction: 'Дать отдохнуть 5 минут перед подачей',
        duration: 5
      }
    ],
    prepTime: 5,
    cookTime: 15,
    difficulty: 'medium',
    tags: ['стейк', 'говядина', 'основное блюдо'],
    isActive: true,
    cost: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  },

  // Картофель фри (как отдельное блюдо)
  {
    id: 'recipe-fries-side',
    name: 'Картофель фри гарнир',
    code: 'R-002',
    description: 'Хрустящий картофель фри как гарнир',
    category: 'side_dish',
    portionSize: 1,
    portionUnit: 'порция',
    components: [
      {
        id: 'comp-5',
        componentId: 'prep-french-fries',
        componentType: 'preparation',
        quantity: 150,
        unit: 'gram',
        notes: 'горячий и хрустящий'
      }
    ],
    instructions: [
      {
        id: 'step-7',
        stepNumber: 1,
        instruction: 'Взять готовый картофель фри из полуфабриката',
        duration: 1
      },
      {
        id: 'step-8',
        stepNumber: 2,
        instruction: 'При необходимости подогреть в духовке 2 минуты',
        duration: 2
      },
      {
        id: 'step-9',
        stepNumber: 3,
        instruction: 'Подать горячим',
        duration: 1
      }
    ],
    prepTime: 1,
    cookTime: 3,
    difficulty: 'easy',
    tags: ['картофель', 'гарнир', 'фри'],
    isActive: true,
    cost: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  },

  // Картофельное пюре (как отдельное блюдо)
  {
    id: 'recipe-mashed-potato-side',
    name: 'Картофельное пюре гарнир',
    code: 'R-003',
    description: 'Нежное картофельное пюре как гарнир',
    category: 'side_dish',
    portionSize: 1,
    portionUnit: 'порция',
    components: [
      {
        id: 'comp-6',
        componentId: 'prep-mashed-potato',
        componentType: 'preparation',
        quantity: 180,
        unit: 'gram',
        notes: 'кремовое и теплое'
      }
    ],
    instructions: [
      {
        id: 'step-10',
        stepNumber: 1,
        instruction: 'Взять готовое пюре из полуфабриката',
        duration: 1
      },
      {
        id: 'step-11',
        stepNumber: 2,
        instruction: 'Подогреть на слабом огне, помешивая',
        duration: 3
      },
      {
        id: 'step-12',
        stepNumber: 3,
        instruction: 'При необходимости добавить немного молока',
        duration: 1
      },
      {
        id: 'step-13',
        stepNumber: 4,
        instruction: 'Подать горячим',
        duration: 1
      }
    ],
    prepTime: 1,
    cookTime: 5,
    difficulty: 'easy',
    tags: ['картофель', 'гарнир', 'пюре'],
    isActive: true,
    cost: 0, // будет рассчитано
    createdAt: now,
    updatedAt: now
  }
]

// Утилиты для работы с mock данными
export function findPreparationById(id: string): Preparation | undefined {
  return mockPreparations.find(prep => prep.id === id)
}

export function findRecipeById(id: string): Recipe | undefined {
  return mockRecipes.find(recipe => recipe.id === id)
}

export function getPreparationsByType(type: string): Preparation[] {
  if (type === 'all') return mockPreparations
  return mockPreparations.filter(prep => prep.type === type)
}

export function getRecipesByCategory(category: string): Recipe[] {
  if (category === 'all') return mockRecipes
  return mockRecipes.filter(recipe => recipe.category === category)
}

// Для обратной совместимости (удалить после миграции)
export const mockIngredients: any[] = []
export const mockUnits: any[] = []

// Новые утилиты для тестирования
export function getPreparationsUsingProduct(productId: string): Preparation[] {
  return mockPreparations.filter(prep =>
    prep.recipe.some(ingredient => ingredient.id === productId)
  )
}

export function getPreparationCostEstimate(preparationId: string): number {
  // Простая оценка стоимости для тестирования
  const prep = findPreparationById(preparationId)
  if (!prep) return 0

  // Примерная стоимость на основе количества ингредиентов
  return prep.recipe.length * 1000 + Math.random() * 500
}

export function validateMockPreparations(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  mockPreparations.forEach((prep, index) => {
    if (!prep.code) {
      errors.push(`Preparation ${index + 1}: Missing code`)
    }

    if (!prep.recipe || prep.recipe.length === 0) {
      errors.push(`Preparation ${prep.name}: No recipe ingredients`)
    }

    if (prep.outputQuantity <= 0) {
      errors.push(`Preparation ${prep.name}: Invalid output quantity`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}
