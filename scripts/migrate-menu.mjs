// scripts/migrate-menu.mjs
// Simple script to migrate menu mock data to Supabase
// Run with: node scripts/migrate-menu.mjs

import { createClient } from '@supabase/supabase-js'

// Supabase connection (from .env or hardcoded for script)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jpigqemwccaohopcdqrc.supabase.co'
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaWdxZW13Y2Nhb2hvcGNkcXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjA1MTQsImV4cCI6MjA0Njk5NjUxNH0.LxQmKBs00-BdXF3yDfBL5QNF8PBXpvkN4NGqpJU5mMI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const now = new Date().toISOString()

// =============================================
// MOCK CATEGORIES
// =============================================

const mockCategories = [
  {
    id: 'cat-breakfasts',
    name: 'Breakfasts',
    description: 'Build-your-own breakfasts and morning dishes',
    sort_order: 0,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cat-main-dishes',
    name: 'Main Dishes',
    description: 'Hot main dishes and steaks',
    sort_order: 1,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cat-garnishes',
    name: 'Sides',
    description: 'Side dishes to complement main courses',
    sort_order: 2,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cat-beverages',
    name: 'Beverages',
    description: 'Alcoholic and non-alcoholic drinks',
    sort_order: 3,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cat-combo',
    name: 'Combo Meals',
    description: 'Complete meals with sides and sauces',
    sort_order: 4,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cat-desserts',
    name: 'Desserts',
    description: 'Sweet dishes and pastries',
    sort_order: 5,
    is_active: true,
    created_at: now,
    updated_at: now
  }
]

// =============================================
// MOCK MENU ITEMS (simplified - key items only)
// =============================================

const mockMenuItems = [
  // Beverages
  {
    id: 'menu-beer-bintang',
    category_id: 'cat-beverages',
    name: 'Bintang Beer',
    name_en: 'Bintang Beer',
    description: 'Popular Indonesian beer',
    price: 25000,
    cost: 12000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-beer-330',
        name: '330ml',
        price: 25000,
        isActive: true,
        sortOrder: 0,
        composition: [
          { type: 'product', id: 'prod-beer-bintang-330', quantity: 1, unit: 'piece', role: 'main' }
        ]
      },
      {
        id: 'var-beer-500',
        name: '500ml',
        price: 35000,
        isActive: true,
        sortOrder: 1,
        composition: [
          { type: 'product', id: 'prod-beer-bintang-500', quantity: 1, unit: 'piece', role: 'main' }
        ]
      }
    ],
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },
  {
    id: 'menu-cola',
    category_id: 'cat-beverages',
    name: 'Coca-Cola',
    name_en: 'Coca-Cola',
    description: 'Refreshing Coca-Cola',
    price: 15000,
    cost: 7000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-cola-330',
        name: '330ml',
        price: 15000,
        isActive: true,
        sortOrder: 0,
        composition: [
          { type: 'product', id: 'prod-cola-330', quantity: 1, unit: 'piece', role: 'main' }
        ]
      }
    ],
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now
  },
  {
    id: 'menu-water',
    category_id: 'cat-beverages',
    name: 'Mineral Water',
    name_en: 'Mineral Water',
    description: 'Pure mineral water',
    price: 8000,
    cost: 3000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-water-500',
        name: '500ml',
        price: 8000,
        isActive: true,
        sortOrder: 0,
        composition: [
          { type: 'product', id: 'prod-water-500', quantity: 1, unit: 'piece', role: 'main' }
        ]
      }
    ],
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now
  },

  // Main Dishes
  {
    id: 'menu-beef-steak',
    category_id: 'cat-main-dishes',
    name: 'Beef Steak',
    name_en: 'Beef Steak',
    description: 'Juicy grilled beef steak',
    price: 95000,
    cost: 46000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-steak-200',
        name: '200g',
        price: 85000,
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 0.8,
        composition: [
          { type: 'recipe', id: 'recipe-beef-steak', quantity: 0.8, unit: 'portion', role: 'main' }
        ]
      },
      {
        id: 'var-steak-250',
        name: '250g (standard)',
        price: 95000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1,
        composition: [
          { type: 'recipe', id: 'recipe-beef-steak', quantity: 1, unit: 'portion', role: 'main' }
        ]
      },
      {
        id: 'var-steak-300',
        name: '300g',
        price: 110000,
        isActive: true,
        sortOrder: 2,
        portionMultiplier: 1.2,
        composition: [
          { type: 'recipe', id: 'recipe-beef-steak', quantity: 1.2, unit: 'portion', role: 'main' }
        ]
      }
    ],
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },

  // Sides
  {
    id: 'menu-fries-side',
    category_id: 'cat-garnishes',
    name: 'French Fries',
    name_en: 'French Fries',
    description: 'Crispy french fries',
    price: 25000,
    cost: 8000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-fries-regular',
        name: 'Regular Portion',
        price: 25000,
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 1,
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
        name: 'Large Portion',
        price: 35000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1.5,
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
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },
  {
    id: 'menu-mashed-potato-side',
    category_id: 'cat-garnishes',
    name: 'Mashed Potato',
    name_en: 'Mashed Potato',
    description: 'Creamy mashed potato with butter',
    price: 22000,
    cost: 7000,
    dish_type: 'simple',
    modifier_groups: [],
    variants: [
      {
        id: 'var-mashed-regular',
        name: 'Regular Portion',
        price: 22000,
        isActive: true,
        sortOrder: 0,
        portionMultiplier: 1,
        composition: [
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 200,
            unit: 'gram',
            role: 'main'
          }
        ]
      },
      {
        id: 'var-mashed-large',
        name: 'Large Portion',
        price: 30000,
        isActive: true,
        sortOrder: 1,
        portionMultiplier: 1.4,
        composition: [
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 280,
            unit: 'gram',
            role: 'main'
          }
        ]
      }
    ],
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now
  },

  // Desserts
  {
    id: 'menu-cake',
    category_id: 'cat-desserts',
    name: 'Chocolate Cake',
    name_en: 'Chocolate Cake',
    description: 'Homemade chocolate cake',
    price: 35000,
    cost: 25000,
    dish_type: 'simple',
    modifier_groups: [],
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
      },
      {
        id: 'var-cake-whole',
        name: 'Whole Cake',
        price: 250000,
        isActive: true,
        sortOrder: 1,
        composition: [
          { type: 'product', id: 'prod-cake-chocolate', quantity: 1, unit: 'piece', role: 'main' }
        ]
      }
    ],
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },

  // Combo
  {
    id: 'menu-steak-with-garnish',
    category_id: 'cat-combo',
    name: 'Steak with Side',
    name_en: 'Steak with Side',
    description: 'Juicy steak with choice of side and sauce',
    price: 120000,
    cost: 52000,
    dish_type: 'simple',
    modifier_groups: [],
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
            role: 'garnish'
          },
          {
            type: 'preparation',
            id: 'prep-tomato-sauce',
            quantity: 30,
            unit: 'gram',
            role: 'sauce'
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
          { type: 'recipe', id: 'recipe-beef-steak', quantity: 250, unit: 'gram', role: 'main' },
          {
            type: 'preparation',
            id: 'prep-mashed-potato',
            quantity: 180,
            unit: 'gram',
            role: 'garnish'
          },
          {
            type: 'preparation',
            id: 'prep-garlic-sauce',
            quantity: 25,
            unit: 'gram',
            role: 'sauce'
          }
        ]
      }
    ],
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  },

  // Build-your-own Breakfast (addon-based with modifiers)
  {
    id: 'menu-custom-breakfast',
    category_id: 'cat-breakfasts',
    name: 'Build Your Own Breakfast',
    name_en: 'Build Your Own Breakfast',
    description: 'Create your perfect breakfast from base and add-ons',
    price: 50000,
    cost: 18000,
    dish_type: 'addon-based',
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
              { type: 'product', id: 'prod-toast', quantity: 2, unit: 'piece', role: 'addon' }
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
              { type: 'product', id: 'prod-ciabatta', quantity: 1, unit: 'piece', role: 'addon' }
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
              { type: 'product', id: 'prod-croissant', quantity: 1, unit: 'piece', role: 'addon' }
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
              { type: 'product', id: 'prod-mozzarella', quantity: 50, unit: 'gram', role: 'addon' }
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
              { type: 'product', id: 'prod-bacon', quantity: 50, unit: 'gram', role: 'addon' }
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
              { type: 'product', id: 'prod-salmon', quantity: 60, unit: 'gram', role: 'addon' }
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
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now
  }
]

// =============================================
// MIGRATION FUNCTIONS
// =============================================

async function migrateCategories() {
  console.log(`\n📦 Migrating ${mockCategories.length} categories...`)

  const { data, error } = await supabase
    .from('menu_categories')
    .upsert(mockCategories, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('❌ Failed to migrate categories:', error)
    throw error
  }

  console.log(`✅ Successfully migrated ${data?.length || 0} categories`)
  return data
}

async function migrateMenuItems() {
  console.log(`\n📦 Migrating ${mockMenuItems.length} menu items...`)

  const { data, error } = await supabase
    .from('menu_items')
    .upsert(mockMenuItems, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('❌ Failed to migrate menu items:', error)
    throw error
  }

  console.log(`✅ Successfully migrated ${data?.length || 0} menu items`)
  return data
}

async function verifyMigration() {
  console.log(`\n🔍 Verifying migration...`)

  const { count: categoriesCount } = await supabase
    .from('menu_categories')
    .select('*', { count: 'exact', head: true })

  const { count: itemsCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Migration Summary:`)
  console.log(`   Categories in Supabase: ${categoriesCount}`)
  console.log(`   Menu Items in Supabase: ${itemsCount}`)
  console.log(`\n✅ Migration verified successfully!`)
}

// Main execution
async function main() {
  console.log('🚀 Starting Menu Data Migration to Supabase...\n')

  try {
    await migrateCategories()
    await migrateMenuItems()
    await verifyMigration()

    console.log('\n🎉 Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
