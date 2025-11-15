// src/scripts/migrateMenuToSupabase.ts
// Script to migrate mock menu data to Supabase
// Run with: npx tsx src/scripts/migrateMenuToSupabase.ts

import { supabase } from '../supabase/client'
import { mockCategories, mockMenuItems } from '../stores/menu/menuMock'
import { categoryToSupabaseInsert, menuItemToSupabaseInsert } from '../stores/menu/supabaseMappers'

const MODULE_NAME = 'MenuMigration'

async function migrateCategories() {
  console.log(`\n${MODULE_NAME}: 📦 Migrating ${mockCategories.length} categories...`)

  // Convert categories to Supabase format
  const supabaseCategories = mockCategories.map(categoryToSupabaseInsert)

  // Insert categories (upsert to avoid duplicates)
  const { data, error } = await supabase
    .from('menu_categories')
    .upsert(supabaseCategories, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('❌ Failed to migrate categories:', error)
    throw error
  }

  console.log(`✅ Successfully migrated ${data?.length || 0} categories`)
  return data
}

async function migrateMenuItems() {
  console.log(`\n${MODULE_NAME}: 📦 Migrating ${mockMenuItems.length} menu items...`)

  // Convert menu items to Supabase format
  const supabaseMenuItems = mockMenuItems.map(menuItemToSupabaseInsert)

  // Insert menu items (upsert to avoid duplicates)
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(supabaseMenuItems, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('❌ Failed to migrate menu items:', error)
    throw error
  }

  console.log(`✅ Successfully migrated ${data?.length || 0} menu items`)
  return data
}

async function verifyMigration() {
  console.log(`\n${MODULE_NAME}: 🔍 Verifying migration...`)

  // Count categories
  const { count: categoriesCount, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('*', { count: 'exact', head: true })

  if (categoriesError) {
    console.error('❌ Failed to verify categories:', categoriesError)
    throw categoriesError
  }

  // Count menu items
  const { count: itemsCount, error: itemsError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })

  if (itemsError) {
    console.error('❌ Failed to verify menu items:', itemsError)
    throw itemsError
  }

  console.log(`\n📊 Migration Summary:`)
  console.log(`   Categories in Supabase: ${categoriesCount}`)
  console.log(`   Menu Items in Supabase: ${itemsCount}`)
  console.log(`\n✅ Migration verified successfully!`)
}

async function displaySampleData() {
  console.log(`\n${MODULE_NAME}: 📋 Sample data from Supabase...`)

  // Get first category
  const { data: categories } = await supabase.from('menu_categories').select('*').limit(1)

  if (categories && categories.length > 0) {
    console.log('\n📁 Sample Category:')
    console.log(JSON.stringify(categories[0], null, 2))
  }

  // Get first menu item with complex modifiers
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('dish_type', 'addon-based')
    .limit(1)

  if (items && items.length > 0) {
    console.log('\n🍽️ Sample Menu Item (with modifiers):')
    console.log(JSON.stringify(items[0], null, 2))
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Menu Data Migration to Supabase...\n')
  console.log(`Total Categories: ${mockCategories.length}`)
  console.log(`Total Menu Items: ${mockMenuItems.length}`)

  try {
    // Step 1: Migrate categories first (menu_items have FK to categories)
    await migrateCategories()

    // Step 2: Migrate menu items
    await migrateMenuItems()

    // Step 3: Verify migration
    await verifyMigration()

    // Step 4: Display sample data
    await displaySampleData()

    console.log('\n🎉 Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { migrateCategories, migrateMenuItems, verifyMigration }
