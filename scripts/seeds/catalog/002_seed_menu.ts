// scripts/seeds/catalog/002_seed_menu.ts
import { supabase } from '../supabaseClient.js'

const now = new Date().toISOString()

// =============================================
// MENU CATEGORIES
// =============================================

const categories = [
  {
    id: crypto.randomUUID(),
    name: 'Breakfasts',
    description: 'Build-your-own breakfasts and morning dishes',
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    name: 'Main Dishes',
    description: 'Hot main dishes and steaks',
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    name: 'Sides',
    description: 'Side dishes to complement main courses',
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    name: 'Beverages',
    description: 'Alcoholic and non-alcoholic drinks',
    is_active: true,
    sort_order: 3,
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    name: 'Combo Meals',
    description: 'Complete meals with sides and sauces',
    is_active: true,
    sort_order: 4,
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    name: 'Desserts',
    description: 'Sweet dishes and pastries',
    is_active: true,
    sort_order: 5,
    created_at: now,
    updated_at: now
  }
]

// =============================================
// MENU ITEMS
// =============================================

const menuItems = (catMap: Record<string, string>) => [
  // BEVERAGES
  {
    id: crypto.randomUUID(),
    category_id: catMap['Beverages'],
    name: 'Bintang Beer',
    description: 'Popular Indonesian beer',
    type: 'beverage',
    department: 'bar',
    dish_type: 'final',
    price: 25000,
    is_active: true,
    sort_order: 0,
    variants: [
      {
        id: 'var-beer-330',
        name: '330ml',
        price: 25000,
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
      }
    ],
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    category_id: catMap['Beverages'],
    name: 'Coca-Cola',
    description: 'Refreshing Coca-Cola',
    type: 'beverage',
    department: 'bar',
    dish_type: 'final',
    price: 15000,
    is_active: true,
    sort_order: 1,
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
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    category_id: catMap['Beverages'],
    name: 'Mineral Water',
    description: 'Pure mineral water',
    type: 'beverage',
    department: 'bar',
    dish_type: 'final',
    price: 8000,
    is_active: true,
    sort_order: 2,
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
    created_at: now,
    updated_at: now
  },

  // MAIN DISHES
  {
    id: crypto.randomUUID(),
    category_id: catMap['Main Dishes'],
    name: 'Beef Steak',
    description: 'Juicy grilled beef steak',
    type: 'food',
    department: 'kitchen',
    dish_type: 'final',
    price: 95000,
    is_active: true,
    sort_order: 0,
    variants: [
      {
        id: 'var-steak-250',
        name: '250g (standard)',
        price: 95000,
        isActive: true,
        sortOrder: 0,
        composition: [
          {
            type: 'recipe',
            id: 'recipe-beef-steak',
            quantity: 1,
            unit: 'portion',
            role: 'main'
          }
        ]
      }
    ],
    created_at: now,
    updated_at: now
  },

  // SIDES
  {
    id: crypto.randomUUID(),
    category_id: catMap['Sides'],
    name: 'French Fries',
    description: 'Crispy french fries',
    type: 'food',
    department: 'kitchen',
    dish_type: 'final',
    price: 25000,
    is_active: true,
    sort_order: 0,
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
        ]
      }
    ],
    created_at: now,
    updated_at: now
  },
  {
    id: crypto.randomUUID(),
    category_id: catMap['Sides'],
    name: 'Mashed Potato',
    description: 'Creamy mashed potato with butter',
    type: 'food',
    department: 'kitchen',
    dish_type: 'final',
    price: 22000,
    is_active: true,
    sort_order: 1,
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
        ]
      }
    ],
    created_at: now,
    updated_at: now
  },

  // COMBO MEALS
  {
    id: crypto.randomUUID(),
    category_id: catMap['Combo Meals'],
    name: 'Steak with Side',
    description: 'Juicy steak with choice of side and sauce',
    type: 'food',
    department: 'kitchen',
    dish_type: 'final',
    price: 120000,
    is_active: true,
    sort_order: 0,
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
          }
        ]
      }
    ],
    created_at: now,
    updated_at: now
  },

  // DESSERTS
  {
    id: crypto.randomUUID(),
    category_id: catMap['Desserts'],
    name: 'Chocolate Cake',
    description: 'Homemade chocolate cake',
    type: 'food',
    department: 'kitchen',
    dish_type: 'final',
    price: 35000,
    is_active: true,
    sort_order: 0,
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
            quantity: 0.125,
            unit: 'piece',
            role: 'main'
          }
        ]
      }
    ],
    created_at: now,
    updated_at: now
  },

  // BUILD-YOUR-OWN BREAKFAST
  {
    id: crypto.randomUUID(),
    category_id: catMap['Breakfasts'],
    name: 'Build Your Own Breakfast',
    description: 'Create your perfect breakfast from base and add-ons',
    type: 'food',
    department: 'kitchen',
    dish_type: 'addon-based',
    price: 50000,
    is_active: true,
    sort_order: 0,
    modifier_groups: [
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
        maxSelection: 0,
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
            id: 'mo-bacon',
            name: 'Bacon',
            description: 'Crispy bacon',
            priceAdjustment: 15000,
            isActive: true,
            sortOrder: 1,
            composition: [
              {
                type: 'product',
                id: 'prod-bacon',
                quantity: 50,
                unit: 'gram',
                role: 'addon'
              }
            ]
          }
        ]
      }
    ],
    variants: [
      {
        id: 'var-custom-breakfast',
        name: 'Standard Portion',
        price: 50000,
        isActive: true,
        sortOrder: 0,
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
    created_at: now,
    updated_at: now
  }
]

// =============================================
// SEED FUNCTION
// =============================================

export async function seedMenu() {
  console.log('🌱 Seeding menu categories and items...')

  try {
    // Step 1: Seed categories
    console.log('\n📁 Seeding categories...')
    const { data: insertedCategories, error: catError } = await supabase
      .from('menu_categories')
      .insert(categories)
      .select()

    if (catError) {
      console.error('❌ Failed to seed categories:', catError)
      throw catError
    }

    console.log(`✅ Seeded ${insertedCategories.length} categories`)

    // Create category name → id map
    const catMap: Record<string, string> = {}
    insertedCategories.forEach(cat => {
      catMap[cat.name] = cat.id
    })

    // Step 2: Seed menu items
    console.log('\n🍽️  Seeding menu items...')
    const items = menuItems(catMap)

    const { data: insertedItems, error: itemsError } = await supabase
      .from('menu_items')
      .insert(items)
      .select()

    if (itemsError) {
      console.error('❌ Failed to seed menu items:', itemsError)
      throw itemsError
    }

    console.log(`✅ Seeded ${insertedItems.length} menu items`)

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Categories: ${insertedCategories.length}`)
    console.log(`   Menu Items: ${insertedItems.length}`)
    console.log('   ✅ Menu seeding completed!\n')

    return { categories: insertedCategories, menuItems: insertedItems }
  } catch (error) {
    console.error('❌ Menu seeding failed:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedMenu()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
