// src/stores/recipes/recipesMock.ts
import type { Ingredient, Recipe, Unit } from './types'

// Units mock data
export const mockUnits: Unit[] = [
  // Weight units
  { id: '1', name: 'Gram', shortName: 'gr', type: 'weight', conversionRate: 1 },
  { id: '2', name: 'Kilogram', shortName: 'kg', type: 'weight', conversionRate: 1000 },

  // Volume units
  { id: '3', name: 'Milliliter', shortName: 'ml', type: 'volume', conversionRate: 1 },
  { id: '4', name: 'Liter', shortName: 'l', type: 'volume', conversionRate: 1000 },
  { id: '5', name: 'Teaspoon', shortName: 'tsp', type: 'volume', conversionRate: 5 },
  { id: '6', name: 'Tablespoon', shortName: 'sp', type: 'volume', conversionRate: 15 },

  // Piece units
  { id: '7', name: 'Piece', shortName: 'pc', type: 'piece', conversionRate: 1 },
  { id: '8', name: 'Slice', shortName: 'sl', type: 'piece', conversionRate: 1 }
]

// Ingredients mock data (based on tech cards)
export const mockIngredients: Ingredient[] = [
  // Herbs & Spices (H)
  {
    id: 'ing-h2',
    name: 'Oregano',
    code: 'H-2',
    category: 'herbs',
    unit: mockUnits[0], // gram
    costPerUnit: 70.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-h4',
    name: 'Garam biasa',
    code: 'H-4',
    category: 'herbs',
    unit: mockUnits[0], // gram
    costPerUnit: 25.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-h5',
    name: 'Black pepper crash',
    code: 'H-5',
    category: 'herbs',
    unit: mockUnits[0], // gram
    costPerUnit: 85.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-h7',
    name: 'Thyme',
    code: 'H-7',
    category: 'herbs',
    unit: mockUnits[0], // gram
    costPerUnit: 0.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Vegetables (V)
  {
    id: 'ing-v22',
    name: 'Paprika merah',
    code: 'V-22',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 40.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v12',
    name: 'Basil leaf',
    code: 'V-12',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 55.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v21',
    name: 'Tomato cherry',
    code: 'V-21',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 40.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v27',
    name: 'Garlic',
    code: 'V-27',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 45.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v29',
    name: 'Onion',
    code: 'V-29',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 25.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v13',
    name: 'Coriander leaf',
    code: 'V-13',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 40.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-v26',
    name: 'Tomato local',
    code: 'V-26',
    category: 'vegetables',
    unit: mockUnits[0], // gram
    costPerUnit: 30.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Meat (M)
  {
    id: 'ing-m1',
    name: 'Beef sliced',
    code: 'M-1',
    category: 'meat',
    unit: mockUnits[0], // gram
    costPerUnit: 185.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Dairy (D)
  {
    id: 'ing-d4',
    name: 'Parmesan',
    code: 'D-4',
    category: 'dairy',
    unit: mockUnits[0], // gram
    costPerUnit: 368.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Grains & Pasta (O)
  {
    id: 'ing-o9',
    name: 'Spaghetti',
    code: 'O-9',
    category: 'grains',
    unit: mockUnits[0], // gram
    costPerUnit: 19.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-o10',
    name: 'Tomato paste',
    code: 'O-10',
    category: 'grains',
    unit: mockUnits[0], // gram
    costPerUnit: 0.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Condiments & Oils (C)
  {
    id: 'ing-c8',
    name: 'Extra virgin olive oil',
    code: 'C-8',
    category: 'condiments',
    unit: mockUnits[2], // ml
    costPerUnit: 166.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'ing-c9',
    name: 'Apple vinegar',
    code: 'C-9',
    category: 'condiments',
    unit: mockUnits[2], // ml
    costPerUnit: 1.0,
    isActive: true,
    isComposite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Prepared ingredients/sauces (P)
  {
    id: 'ing-p3',
    name: 'Concase Sauce',
    code: 'P-3',
    category: 'prepared',
    unit: mockUnits[0], // gram
    costPerUnit: 15.85, // calculated from recipe
    isActive: true,
    isComposite: true,
    description: 'Fresh tomato-based sauce with herbs',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

// Recipes mock data
export const mockRecipes: Recipe[] = [
  // Concase Sauce recipe
  {
    id: 'recipe-concase',
    name: 'Concase Sauce',
    code: 'P-3',
    description: 'Fresh tomato-based sauce with herbs',
    category: 'sauce',
    portionSize: 300,
    portionUnit: 'gr',
    ingredients: [
      {
        id: 'rec-ing-1',
        ingredientId: 'ing-h2', // Oregano
        quantity: 250,
        unit: 'gr',
        preparation: '1/2 tsp'
      },
      {
        id: 'rec-ing-2',
        ingredientId: 'ing-h4', // Garam biasa
        quantity: 1,
        unit: 'gr',
        preparation: '1/2 tsp'
      },
      {
        id: 'rec-ing-3',
        ingredientId: 'ing-h5', // Black pepper crash
        quantity: 30,
        unit: 'gr',
        preparation: '1/2 tsp'
      },
      {
        id: 'rec-ing-4',
        ingredientId: 'ing-h7', // Thyme
        quantity: 0.5,
        unit: 'gr',
        preparation: '1 tsp'
      },
      {
        id: 'rec-ing-5',
        ingredientId: 'ing-c9', // Apple vinegar
        quantity: 0.5,
        unit: 'ml',
        preparation: '1/2 tsp'
      },
      {
        id: 'rec-ing-6',
        ingredientId: 'ing-o10', // Tomato paste
        quantity: 30,
        unit: 'gr'
      },
      {
        id: 'rec-ing-7',
        ingredientId: 'ing-v13', // Coriander leaf
        quantity: 1,
        unit: 'gr',
        preparation: '1 tsp'
      },
      {
        id: 'rec-ing-8',
        ingredientId: 'ing-v26', // Tomato local
        quantity: 800,
        unit: 'gr'
      },
      {
        id: 'rec-ing-9',
        ingredientId: 'ing-v27', // Garlic
        quantity: 50,
        unit: 'gr'
      },
      {
        id: 'rec-ing-10',
        ingredientId: 'ing-v29', // Onion
        quantity: 50,
        unit: 'gr'
      }
    ],
    instructions: [
      {
        id: 'step-1',
        stepNumber: 1,
        instruction: 'Dice onions and garlic finely',
        duration: 5
      },
      {
        id: 'step-2',
        stepNumber: 2,
        instruction: 'Sauté onions and garlic until fragrant',
        duration: 3
      },
      {
        id: 'step-3',
        stepNumber: 3,
        instruction: 'Add tomatoes and cook until soft',
        duration: 10
      },
      {
        id: 'step-4',
        stepNumber: 4,
        instruction: 'Add herbs and seasonings, simmer',
        duration: 15
      }
    ],
    prepTime: 10,
    cookTime: 30,
    difficulty: 'easy',
    tags: ['sauce', 'tomato', 'fresh'],
    isActive: true,
    cost: 4755.1, // calculated total cost
    yield: {
      quantity: 300,
      unit: 'gr'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  // Bolognese Pasta recipe
  {
    id: 'recipe-bolognese',
    name: 'Bolognese Pasta',
    description: 'Classic pasta with meat sauce',
    category: 'main',
    portionSize: 1,
    portionUnit: 'portion',
    ingredients: [
      {
        id: 'rec-ing-11',
        ingredientId: 'ing-o9', // Spaghetti
        quantity: 150,
        unit: 'gr'
      },
      {
        id: 'rec-ing-12',
        ingredientId: 'ing-v22', // Paprika merah
        quantity: 30,
        unit: 'gr'
      },
      {
        id: 'rec-ing-13',
        ingredientId: 'ing-d4', // Parmesan
        quantity: 5,
        unit: 'gr',
        preparation: '1 sp'
      },
      {
        id: 'rec-ing-14',
        ingredientId: 'ing-m1', // Beef sliced
        quantity: 30,
        unit: 'gr',
        preparation: '2 sl'
      },
      {
        id: 'rec-ing-15',
        ingredientId: 'ing-v12', // Basil leaf
        quantity: 1,
        unit: 'gr'
      },
      {
        id: 'rec-ing-16',
        ingredientId: 'ing-v21', // Tomato cherry
        quantity: 94,
        unit: 'gr',
        preparation: '6pc'
      },
      {
        id: 'rec-ing-17',
        ingredientId: 'ing-v27', // Garlic
        quantity: 6,
        unit: 'gr',
        preparation: '1pc'
      },
      {
        id: 'rec-ing-18',
        ingredientId: 'ing-v29', // Onion
        quantity: 10,
        unit: 'gr',
        preparation: '1sl'
      },
      {
        id: 'rec-ing-19',
        ingredientId: 'ing-h2', // Oregano
        quantity: 0.6,
        unit: 'gr',
        preparation: '1/4 tsp'
      },
      {
        id: 'rec-ing-20',
        ingredientId: 'ing-h5', // Black pepper crash
        quantity: 0.6,
        unit: 'gr',
        preparation: '1/4 tsp'
      },
      {
        id: 'rec-ing-21',
        ingredientId: 'ing-h7', // Thyme
        quantity: 0.6,
        unit: 'gr',
        preparation: '1/4 tsp'
      },
      {
        id: 'rec-ing-22',
        ingredientId: 'ing-c8', // Extra virgin olive oil
        quantity: 3.5,
        unit: 'ml',
        preparation: '1 sp'
      },
      {
        id: 'rec-ing-23',
        ingredientId: 'ing-p3', // Concase sauce (as prepared ingredient)
        quantity: 30,
        unit: 'gr',
        preparation: '7 sp'
      }
    ],
    instructions: [
      {
        id: 'step-b1',
        stepNumber: 1,
        instruction: 'Cook spaghetti according to package instructions',
        duration: 10
      },
      {
        id: 'step-b2',
        stepNumber: 2,
        instruction: 'Heat olive oil in a large pan',
        duration: 2
      },
      {
        id: 'step-b3',
        stepNumber: 3,
        instruction: 'Sauté onions and garlic until golden',
        duration: 3
      },
      {
        id: 'step-b4',
        stepNumber: 4,
        instruction: 'Add beef and cook until browned',
        duration: 5
      },
      {
        id: 'step-b5',
        stepNumber: 5,
        instruction: 'Add tomatoes, herbs, and concase sauce',
        duration: 8
      },
      {
        id: 'step-b6',
        stepNumber: 6,
        instruction: 'Toss with cooked pasta and serve with parmesan',
        duration: 2
      }
    ],
    prepTime: 15,
    cookTime: 30,
    difficulty: 'medium',
    tags: ['pasta', 'meat', 'main-course'],
    isActive: true,
    cost: 2850.0, // calculated total cost from tech card
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]
