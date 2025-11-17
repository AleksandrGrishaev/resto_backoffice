// scripts/seeds/catalog/001_seed_products.ts
import { supabase } from '../supabaseClient.js'
import { CORE_PRODUCTS } from '../../../src/stores/shared/productDefinitions.js'
import type { CoreProductDefinition } from '../../../src/stores/shared/productDefinitions.js'

/**
 * Seed products from productDefinitions to Supabase
 *
 * Maps CoreProductDefinition to products table schema
 */
export async function seedProducts() {
  console.log('🌱 Seeding products...')

  let successCount = 0
  let failCount = 0

  for (const product of CORE_PRODUCTS) {
    // Map CoreProductDefinition to products table schema
    const productData = {
      // Use product ID as-is (assuming it's a valid UUID format)
      // If not, we'll need to generate UUIDs
      name: product.nameEn || product.name,
      name_ru: product.name,
      category: product.category,

      // Map purchase cost as price (since products table doesn't have baseCostPerUnit)
      price: product.purchaseCost,
      cost: product.baseCostPerUnit * product.purchaseToBaseRatio, // Total cost per purchase unit

      // Map purchase unit
      unit: product.purchaseUnit,

      // Active by default
      is_active: true,
      is_available: true,

      // Stock tracking disabled by default (not in productDefinitions)
      track_stock: false,
      current_stock: 0,
      min_stock: 0,

      // Additional metadata
      tags: [product.category, ...product.usedInDepartments],

      // Description from metadata
      description: `Base unit: ${product.baseUnit}, Yield: ${product.yieldPercentage}%, Shelf life: ${product.shelfLifeDays} days`
    }

    const { error } = await supabase.from('products').insert(productData)

    if (error) {
      console.error(`❌ Failed to seed ${product.name}:`, error.message)
      failCount++
    } else {
      console.log(`✅ Seeded: ${product.name}`)
      successCount++
    }
  }

  console.log(`\n📊 Products seeding summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📦 Total: ${CORE_PRODUCTS.length}`)
}
