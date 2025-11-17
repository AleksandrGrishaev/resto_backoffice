// scripts/seeds/index.ts
// Import supabaseClient FIRST to set up environment mocks
import './supabaseClient.js'
import { seedProducts } from './catalog/001_seed_products.js'
import { seedMenu } from './catalog/002_seed_menu.js'

/**
 * Main seed runner - executes all seed scripts in order
 *
 * Order is important to respect foreign key constraints:
 * 1. Products (no dependencies)
 * 2. Categories (no dependencies)
 * 3. Suppliers (no dependencies)
 * 4. Menu (depends on products)
 * 5. Transactional data (depends on catalog data)
 */
export async function seedAll() {
  console.log('🌱 Starting database seeding...\n')

  const startTime = Date.now()

  try {
    // Catalog seeds (stable reference data)
    await seedProducts()
    await seedMenu()

    // Add more seeds here as they are created:
    // await seedCategories()
    // await seedSuppliers()

    // Transactional seeds (test operational data)
    // await seedStorageOps()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Database seeding completed successfully in ${duration}s`)

    return { success: true }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`\n❌ Database seeding failed after ${duration}s:`, error)

    throw error
  }
}

/**
 * Seed specific entity
 */
export async function seedEntity(entityName: string) {
  console.log(`🌱 Seeding ${entityName}...\n`)

  const startTime = Date.now()

  try {
    switch (entityName.toLowerCase()) {
      case 'products':
        await seedProducts()
        break

      case 'menu':
        await seedMenu()
        break

      // Add more entity seeds here:
      // case 'categories':
      //   await seedCategories()
      //   break
      // case 'suppliers':
      //   await seedSuppliers()
      //   break

      default:
        throw new Error(`Unknown entity: ${entityName}. Available: products, menu`)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ ${entityName} seeded successfully in ${duration}s`)

    return { success: true }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`\n❌ ${entityName} seeding failed after ${duration}s:`, error)

    throw error
  }
}

// CLI usage support
if (require.main === module) {
  const entityArg = process.argv[2]

  const seedPromise = entityArg ? seedEntity(entityArg) : seedAll()

  seedPromise
    .then(() => {
      console.log('\n🎉 Done!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Seed failed:', error)
      process.exit(1)
    })
}
