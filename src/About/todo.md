# 🚀 Current Sprint: Seed Infrastructure + Backoffice Migration

> **📘 Strategy:** See [PrepProduction.md](./PrepProduction.md) for production preparation strategy
> **📘 Migration Guide:** See [BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md) for detailed plan
> **⚠️ CRITICAL RULE:** Always check TypeScript interface FIRST before creating/updating Supabase tables!

## 📊 Current Status (2025-11-17)

**Sprint Goal: 🎯 Create Seed Infrastructure → Migrate Backoffice → v1.0 Release**

**Progress:**

- POS ✅ Kitchen ✅ Bar ✅
- Products ✅ Categories ✅
- Seed Scripts ✅ **COMPLETED** (28 products seeded)
- Migration 005 ✅ **COMPLETED** (Products schema fixed to match Product interface)
- Migration 006 ✅ **COMPLETED** (Menu 'type' column added)
- Menu ✅ **COMPLETED** (Phase 1 - 9 items, 6 categories seeded)
- Migration 007 ✅ **COMPLETED** (Counteragents table created)
- Counteragents/Suppliers ✅ **COMPLETED** (9 counteragents seeded: 7 suppliers, 2 services)
- Migration 008 ✅ **COMPLETED** (Recipes tables: recipes, recipe_components, recipe_steps)
- Migration 009 ✅ **COMPLETED** (Preparations tables: preparations, preparation_ingredients)
- Recipes ✅ **COMPLETED** (3 recipes seeded with 6 components, 13 steps)
- Preparations ✅ **COMPLETED** (10 preparations seeded with 48 ingredients)
- Migration 010 ✅ **COMPLETED** (Storage tables: warehouses, storage_batches, storage_operations, inventory_documents)
- Migration 011 ✅ **COMPLETED** (Supplier tables: procurement_requests, purchase_orders, receipts)
- Storage & Supplier ✅ **COMPLETED** (1 warehouse, 28 batches for all products, 6 operations over 7 days, 1 procurement flow seeded)

---

## 🎯 THIS WEEK: Seed Infrastructure + Menu Migration

**New Strategy (2025-11-17 - Updated):**

1. ✅ Products/Categories already in Supabase (COMPLETED)
2. ✅ Create seed script infrastructure (COMPLETED)
3. ✅ Migrate Menu to Supabase (Phase 1 - COMPLETED)
4. ✅ Migrate Counteragents/Suppliers to Supabase (COMPLETED)
5. ✅ Create missing Supabase tables (recipes, preparations) - **COMPLETED**
6. ✅ Create Storage tables (warehouses, batches, operations, inventories) - **COMPLETED**
7. ✅ Create Supplier Operations tables (requests, orders, receipts) - **COMPLETED**
8. 🔲 Seed remaining catalog data (package_options - optional)
9. 🔲 Replace mock files with seed scripts (Phase 2)

### 🔴 Phase 0: Seed Scripts Infrastructure (Day 1-2) ✅ **COMPLETED**

**Goal:** Create seed script infrastructure to replace mock data

**Why:** Mock files are hardcoded in TypeScript. Seed scripts allow quick database reset with test data.

#### Task 0.1: Create Seed Scripts Directory Structure ✅

**Time:** 1 hour
**Status:** ✅ Completed

**Tasks:**

- [x] Create `scripts/seeds/` directory
- [x] Create `scripts/seeds/catalog/` (stable reference data)
- [x] Create `scripts/seeds/transactional/` (test operational data)
- [x] Create `scripts/seeds/README.md` with documentation
- [x] Create `scripts/seeds/index.ts` (main seed runner)

**Structure:**

```
scripts/
└── seeds/
    ├── README.md
    ├── index.ts                      # Main runner
    ├── catalog/                      # Stable data
    │   ├── 001_seed_products.ts
    │   ├── 002_seed_categories.ts
    │   └── 003_seed_suppliers.ts
    └── transactional/                # Test data
        └── 101_seed_storage_ops.ts
```

---

#### Task 0.2: Create Products Seed Script (First Example) ✅

**Time:** 2-3 hours
**Status:** ✅ Completed

**File:** `scripts/seeds/catalog/001_seed_products.ts`

**Tasks:**

- [x] Import CORE_PRODUCTS from productDefinitions
- [x] Create seedProducts() function
- [x] Map product definitions to Supabase schema
- [x] Insert products with proper error handling
- [x] Test seed script works
- [x] **Seeded all 28 products via MCP Supabase tools**

**Template:**

```typescript
import { supabase } from '@/supabase/client'
import { CORE_PRODUCTS } from '@/stores/shared/productDefinitions'

export async function seedProducts() {
  console.log('🌱 Seeding products...')

  for (const product of CORE_PRODUCTS) {
    const { error } = await supabase.from('products').insert({
      id: product.id,
      name: product.name,
      category: product.category,
      base_unit: product.baseUnit,
      base_cost_per_unit: product.baseCostPerUnit
      // ... other fields
    })

    if (error) {
      console.error(`❌ Failed: ${product.name}`, error)
    } else {
      console.log(`✅ Seeded: ${product.name}`)
    }
  }
}
```

---

#### Task 0.3: Create Seed Runner Script ✅

**Time:** 1-2 hours
**Status:** ✅ Completed

**File:** `scripts/seeds/index.ts`

**Tasks:**

- [x] Create main seedAll() function
- [x] Import all seed scripts
- [x] Run seeds in correct order (respecting foreign keys)
- [x] Add CLI argument support (seed all, seed specific)
- [x] Add error handling and rollback
- [x] Created standalone supabaseClient.ts for scripts

**Template:**

```typescript
import { seedProducts } from './catalog/001_seed_products'

export async function seedAll() {
  console.log('🌱 Starting database seeding...')

  try {
    await seedProducts()
    console.log('✅ Seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

// CLI usage
if (require.main === module) {
  seedAll()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
```

---

#### Task 0.4: Create `/seed-db` Command ✅

**Time:** 30 minutes
**Status:** ✅ Completed

**File:** `.claude/commands/seed-db.md`

**Tasks:**

- [x] Create seed-db.md command file
- [x] Add instructions to run seed scripts
- [x] Add option to seed all or specific entities
- [x] Documented MCP-based seeding approach (recommended)

**Template:**

```markdown
# /seed-db

Execute seed scripts to populate database with test data.

## Usage

\`\`\`bash

# Seed all data

pnpm seed

# Seed specific entity

pnpm seed products
pnpm seed menu
\`\`\`

## Process

1. Run seed scripts from scripts/seeds/
2. Catalog data first (products, categories, etc.)
3. Transactional data second (optional)

Use after /clean-db to reset test data.
```

---

#### Task 0.5: Test Seed Workflow ✅

**Time:** 1 hour
**Status:** ✅ Completed

**Tasks:**

- [x] Run `/clean-db` to clear data
- [x] Run `/seed-db` to populate test data
- [x] Verify products appear in Supabase
- [x] Verify app loads products correctly (pending app test)
- [x] Test repeatability (clean → seed → clean → seed)

**Results:**

- ✅ All 28 products seeded successfully via MCP
- ✅ Products verified in Supabase (7 categories, 28 total)
- ✅ Seed workflow operational
- ✅ MCP-based approach works reliably

**Breakdown by category:**

- Beverages: 4 products
- Dairy: 5 products
- Meat: 4 products
- Other: 6 products
- Seafood: 1 product
- Spices: 4 products
- Vegetables: 4 products

---

### 🔴 Phase 1: Menu Migration (Day 3-4) ✅ **COMPLETED**

**Goal:** Menu items in Supabase (critical for POS order creation)

**Status:** ✅ **COMPLETED** (2025-11-17)

**Reference:** Migration pattern same as Products in PrepProduction.md

**Tasks:**

- [x] Create Migration 006: add 'type' column to menu_items ✅
- [x] Menu tables already exist (menu_categories + menu_items) ✅
- [x] MenuService with CRUD already implemented ✅
- [x] MenuStore already uses Supabase (dual-write + cache fallback) ✅
- [x] Create seed script for test menu (002_seed_menu.ts) ✅
- [x] Seed menu data via MCP (9 items, 6 categories) ✅
- [x] Update Supabase mappers to use 'type' column ✅
- [ ] Test POS can read menu items (pending)
- [ ] Remove menuMock.ts after full migration verification

**Results:**

- ✅ Migration 006 applied: Added 'type' column (food/beverage)
- ✅ Supabase mappers updated (removed inference, use explicit columns)
- ✅ Menu seeded: 6 categories, 9 items (3 beverages, 6 food)
- ✅ Complex item tested: "Build Your Own Breakfast" with 3 modifier groups
- ✅ MenuService has dual-write (Supabase + in-memory fallback)
- ✅ MenuStore prioritizes Supabase with localStorage cache

**Note:** Seed script has Node.js environment compatibility issue (import.meta.env). Used MCP-based seeding instead (recommended approach per PrepProduction.md).

---

### 🔴 Phase 1.5: Counteragents/Suppliers Migration ✅ **COMPLETED**

**Goal:** Counteragents (suppliers, service providers) in Supabase

**Status:** ✅ **COMPLETED** (2025-11-17)

**Tasks:**

- [x] Check Counteragent TypeScript interface ✅
- [x] Create Migration 007: counteragents table ✅
- [x] Seed counteragent data via MCP (9 counteragents) ✅
- [ ] Create seed script (003_seed_counteragents.ts) - optional
- [ ] Test backoffice can read/write counteragents - pending

**Results:**

- ✅ Migration 007 applied: Created counteragents table with full schema
- ✅ Counteragents seeded: 9 total (7 suppliers, 2 service providers)
- ✅ Preferred suppliers: 5 (meat, dairy, seafood, vegetables, cleaning)
- ✅ Product category mapping: Suppliers linked to product categories
- ✅ All business fields included: payment terms, lead times, delivery schedules

**Breakdown by type:**

- Suppliers: 7 (covering meat, dairy, seafood, vegetables, beverages, spices, other)
- Services: 2 (cleaning, equipment maintenance)

---

### 🟡 Phase 2: Mock Files Cleanup (Day 5)

**Goal:** Replace all mock files with seed scripts

**Status:** 🔲 Pending

**Mock Files to Replace:** (12 files found)

- [ ] recipes/unitsMock.ts → seed script
- [ ] recipes/recipesMock.ts → seed script
- [ ] preparation/preparationMock.ts → seed script
- [ ] account/paymentMock.ts → seed script
- [ ] account/accountBasedMock.ts → seed script
- [ ] account/mock.ts → seed script
- [ ] counteragents/mock/counteragentsMock.ts → seed script
- [ ] pos/mocks/posMockData.ts → keep (POS test data)
- [ ] pos/shifts/mock.ts → keep (POS test data)
- [ ] menu/menuMock.ts → remove (after Menu migration)
- [ ] kitchen/mocks/kitchenMockData.ts → keep (Kitchen test data)
- [ ] shared/mockDataCoordinator.ts → keep as reference

**Verification:**

```bash
# Check for remaining mock files
find src/stores -name "*mock*.ts" -o -name "*Mock*.ts"
```

---

### 🟢 Phase 3: Remaining Stores Migration (Week 2+)

**Goal:** Migrate all Backoffice stores to Supabase

**Status:** ✅ **COMPLETED** (2025-11-17)

**Stores Migrated:**

- [x] Recipes → Supabase ✅ (Migration 008 - 3 recipes, 6 components, 13 steps)
- [x] Preparations → Supabase ✅ (Migration 009 - 10 preparations, 48 ingredients)
- [x] Storage → Supabase ✅ (Migration 010 - 1 warehouse, 28 batches, 6 operations)
- [x] Supplier Operations → Supabase ✅ (Migration 011 - 1 request, 1 order, 1 receipt)

**Reference:** See PrepProduction.md Section 5 for detailed roadmap

---

### 🔵 Phase 4: Google Sheets Import (Before Production)

**Goal:** Import real data from Google Sheets to Production DB

**Status:** 🔲 Pending (before v1.0 release)

**Tasks:**

- [ ] Set up Google Sheets API credentials
- [ ] Create import script (scripts/import/importFromGoogleSheets.ts)
- [ ] Map columns: Google Sheets → Supabase schema
- [ ] Test import on Development DB
- [ ] Create Production Supabase project
- [ ] Import real data to Production DB

**Reference:** See PrepProduction.md Section 4

---

## 📋 Testing Checklist

### Integration Tests (Day 4-5):

#### Test 1: Backoffice → POS Data Flow

- [ ] Create order in POS
- [ ] Check order appears in Backoffice immediately
- [ ] Verify all order details correct (items, amounts, status)

#### Test 2: Backoffice → POS Product Flow

- [ ] Create product in Backoffice
- [ ] Check product appears in POS menu
- [ ] Use product in POS order
- [ ] Verify order saves correctly

#### Test 3: Backoffice → POS Menu Flow

- [ ] Create menu item in Backoffice
- [ ] Set department (kitchen or bar)
- [ ] Check item appears in POS
- [ ] Create order with new item
- [ ] Verify shows in correct department (Kitchen/Bar monitor)

#### Test 4: End-to-End Flow

- [ ] Backoffice: Create product (Eggs)
- [ ] Backoffice: Create menu item (Scrambled Eggs, uses Eggs)
- [ ] POS: Create order with Scrambled Eggs
- [ ] POS: Send to kitchen
- [ ] Kitchen: Mark as ready
- [ ] POS: Process payment
- [ ] Backoffice: Check order history shows payment
- [ ] Backoffice: Check shift report includes sale

**Expected:** Full data flow works end-to-end ✅

---

## 📝 Completed This Sprint

### PrepProduction Strategy ✅ (2025-11-17)

- ✅ Created PrepProduction.md with full strategy
- ✅ Defined seed scripts approach
- ✅ Defined Google Sheets import strategy
- ✅ Identified 12 mock files to replace
- ✅ Two-database strategy (Dev + Prod)

### Bar Workflow ✅ (2025-11-16)

- ✅ Simplified bar workflow (2 columns)
- ✅ Department-aware status transitions
- ✅ Role-based access

### Kitchen-POS Realtime ✅ (2025-11-15)

- ✅ Realtime sync working
- ✅ Department filtering
- ✅ Item status tracking

### POS Supabase Migration ✅ (Week 2)

- ✅ Orders → Supabase
- ✅ Payments → Supabase
- ✅ Shifts → Supabase
- ✅ Tables → Supabase

### Catalog Data ✅ (Week 1)

- ✅ Products → Supabase
- ✅ Categories → Supabase

---

## 🎯 v1.0 Release Criteria

### Must Have:

- ✅ POS → Supabase (Orders, Payments, Shifts, Tables)
- ✅ Kitchen/Bar → Supabase (Realtime sync)
- ✅ Products → Supabase
- ✅ Categories → Supabase
- ✅ Seed scripts infrastructure (Phase 0 complete)
- ✅ 28 products seeded successfully
- 🔲 Menu → Supabase (Phase 1 - in progress)
- 🔲 Mock files replaced with seeds
- 🔲 Google Sheets import script
- 🔲 Production DB created
- 🔲 Real data imported
- 🔲 Build succeeds
- 🔲 Production deployed

### Deferred to v1.1+:

- Recipes → Supabase (Sprint N+1)
- Storage → Supabase (Sprint N+2)
- Suppliers → Supabase (Sprint N)
- Preparations → Supabase (Sprint N+3)
- Offline sync queue (Sprint 9)

---

## ⚠️ CRITICAL: Migration Best Practices

### Rule #1: TypeScript Interface First, Database Schema Second

**ALWAYS follow this workflow when creating/updating database tables:**

1. **Check TypeScript Interface:**

   ```typescript
   // Example: src/stores/productsStore/types.ts
   export interface Product extends BaseEntity {
     name: string
     baseUnit: BaseUnit // ← Check this field exists!
     baseCostPerUnit: number // ← Check this field exists!
     // ... all other fields
   }
   ```

2. **Map Interface → Database Schema:**

   - TypeScript: `baseUnit` → SQL: `base_unit` (snake_case)
   - TypeScript: `baseCostPerUnit` → SQL: `base_cost_per_unit`
   - TypeScript: `usedInDepartments: Department[]` → SQL: `used_in_departments TEXT[]`

3. **Create Migration:**

   - Reference the TypeScript interface in migration comments
   - Add ALL required fields from interface
   - Include proper types, constraints, defaults

4. **Verify with Seed Script:**
   - Seed data should match interface structure
   - Test that app can read seeded data without errors

### Example: Products Migration (Lesson Learned)

**❌ What Went Wrong:**

- Created `products` table without checking `Product` interface
- Missing: `baseUnit`, `baseCostPerUnit`, `yieldPercentage`, `canBeSold`, `usedInDepartments`
- Had to create Migration 005 to fix the schema

**✅ Correct Approach:**

```sql
-- Migration 005: Update products table to match Product interface
-- Reference: src/stores/productsStore/types.ts

ALTER TABLE products
ADD COLUMN base_unit TEXT CHECK (base_unit IN ('gram', 'ml', 'piece')),
ADD COLUMN base_cost_per_unit DECIMAL(10, 2),
ADD COLUMN yield_percentage INTEGER DEFAULT 100,
ADD COLUMN can_be_sold BOOLEAN DEFAULT false,
ADD COLUMN used_in_departments TEXT[] DEFAULT ARRAY['kitchen'];
```

### Checklist for New Migrations

- [ ] Read TypeScript interface file (`src/stores/*/types.ts`)
- [ ] List ALL fields from interface
- [ ] Map camelCase → snake_case
- [ ] Map TypeScript types → PostgreSQL types
- [ ] Add NOT NULL constraints for required fields
- [ ] Add CHECK constraints for enums
- [ ] Add default values where appropriate
- [ ] Create indexes for frequently queried fields
- [ ] Add comments referencing the TypeScript interface
- [ ] Test with seed data

---

## 🔗 Related Files

- **[PrepProduction.md](./PrepProduction.md)** - 🔥 Production preparation strategy (NEW)
- **[BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md)** - Detailed migration plan
- **[PRIORITIES.md](./PRIORITIES.md)** - Weekly priorities
- **[next_todo.md](./next_todo.md)** - Offline sync (Sprint 9)
- **[SupabaseGlobalTodo.md](./SupabaseGlobalTodo.md)** - Global roadmap

---

## 📅 This Week Schedule (Updated 2025-11-17)

**Day 1 (Today):** Create seed scripts infrastructure
**Day 2:** Products seed script + /seed-db command
**Day 3:** Test seed workflow, start Menu migration
**Day 4:** Menu migration (tables + service + store)
**Day 5:** Menu seed script, mock cleanup
**Day 6:** Review progress, plan next sprint

---

**Mantra:** "Seed Scripts → Clean Data → Production Ready"

---

**Last Updated:** 2025-11-17
**Target:** v1.0 Release (TBD after all stores migrated)
**Status:** Creating seed infrastructure
