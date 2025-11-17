# 🌱 Seed Scripts

Database seeding scripts for development and testing.

## Purpose

Seed scripts populate the database with test data for development and testing. They replace hardcoded mock data files with executable scripts that can be run repeatedly.

---

## Directory Structure

```
seeds/
├── README.md                 # This file
├── index.ts                  # Main seed runner
├── catalog/                  # Stable reference data
│   ├── 001_seed_products.ts
│   ├── 002_seed_categories.ts
│   └── 003_seed_suppliers.ts
└── transactional/            # Test operational data
    └── 101_seed_storage_ops.ts
```

---

## Seed Types

### 1. Catalog Seeds (`catalog/`)

**Purpose:** Stable reference data that doesn't change often

**Examples:**

- Products (28 items from `productDefinitions.ts`)
- Menu items
- Recipes
- Suppliers
- Counteragents

**Usage:**

- Development: Use these seeds for testing
- Production: Import from Google Sheets (real data)

**Naming:** `00X_seed_<entity>.ts` (e.g., `001_seed_products.ts`)

---

### 2. Transactional Seeds (`transactional/`)

**Purpose:** Test operational data for development

**Examples:**

- Storage operations (receipts, write-offs)
- Purchase orders
- Inventory batches
- Test shifts

**Usage:**

- Development only
- Production: Real data from actual operations

**Naming:** `10X_seed_<entity>.ts` (e.g., `101_seed_storage_ops.ts`)

---

## Usage

### Run All Seeds

```bash
pnpm seed
```

### Run Specific Seed

```bash
pnpm seed products
pnpm seed menu
```

### Clean + Seed Workflow

```bash
# 1. Clean database
/clean-db

# 2. Seed database
/seed-db

# 3. Verify in app
# Open app, check that test data is loaded
```

---

## Creating a New Seed

### 1. Create Seed File

**File:** `scripts/seeds/catalog/004_seed_menu.ts`

```typescript
import { supabase } from '@/supabase/client'
import { MENU_MOCK_DATA } from '@/stores/menu/menuMock'

/**
 * Seed menu items to Supabase
 */
export async function seedMenu() {
  console.log('🌱 Seeding menu items...')

  for (const item of MENU_MOCK_DATA) {
    const { error } = await supabase.from('menu_items').insert({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      department: item.department,
      available: item.available ?? true
    })

    if (error) {
      console.error(`❌ Failed to seed ${item.name}:`, error)
    } else {
      console.log(`✅ Seeded: ${item.name}`)
    }
  }

  console.log('✅ Menu items seeded successfully')
}
```

### 2. Add to Runner

**File:** `scripts/seeds/index.ts`

```typescript
import { seedMenu } from './catalog/004_seed_menu'

export async function seedAll() {
  // ... existing seeds
  await seedMenu() // Add new seed
}
```

### 3. Test

```bash
/clean-db
/seed-db
```

---

## Best Practices

### ✅ DO

- Use idempotent inserts (upsert with `onConflict`)
- Log each item being seeded
- Handle errors gracefully
- Seed in dependency order (products → recipes → menu)
- Use data from mock definitions (single source of truth)

### ❌ DON'T

- Seed production data (use Google Sheets import instead)
- Hardcode IDs (use UUIDs from definitions)
- Skip error handling
- Seed without cleaning first

---

## Relationship to Mock Files

### Migration Path

**Before:**

```typescript
// menuStore.ts
import { MENU_MOCK_DATA } from './menuMock'

this.menuItems = MENU_MOCK_DATA // ❌ Hardcoded
```

**After:**

```typescript
// menuStore.ts
import { menuService } from './services'

this.menuItems = await menuService.getAllMenuItems() // ✅ From Supabase
```

**Seed Script:**

```typescript
// seeds/catalog/004_seed_menu.ts
import { MENU_MOCK_DATA } from '@/stores/menu/menuMock'

export async function seedMenu() {
  // Insert MENU_MOCK_DATA into Supabase
}
```

### Mock Files Status

After migration:

- **Keep:** `productDefinitions.ts`, `storageDefinitions.ts`, `supplierDefinitions.ts` (data source)
- **Keep:** `mockDataCoordinator.ts` (reference)
- **Remove:** `*Mock.ts` files (replaced by seeds + Supabase)

---

## Troubleshooting

### Seed fails with foreign key error

**Solution:** Seed in dependency order

```typescript
await seedProducts() // First
await seedRecipes() // Second (depends on products)
await seedMenu() // Third (depends on recipes)
```

### Duplicate key error

**Solution:** Use upsert

```typescript
await supabase.from('products').upsert(products, { onConflict: 'id' })
```

### Data not appearing in app

**Solution:** Check Supabase directly

```typescript
// In browser console
const { data } = await supabase.from('products').select('*')
console.log(data)
```

---

## Related Documentation

- **[PrepProduction.md](../../src/About/PrepProduction.md)** - Production preparation strategy
- **[todo.md](../../src/About/todo.md)** - Current tasks
- **[/clean-db command](../../.claude/commands/clean-db.md)** - Database cleanup
- **[/seed-db command](../../.claude/commands/seed-db.md)** - Seed execution

---

**Created:** 2025-11-17
**Status:** Active
**Maintained by:** Development Team
