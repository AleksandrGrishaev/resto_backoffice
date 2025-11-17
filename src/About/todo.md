# 🚀 Current Sprint: Seed Infrastructure + Backoffice Migration

> **📘 Strategy:** See [PrepProduction.md](./PrepProduction.md) for production preparation strategy
> **📘 Migration Guide:** See [BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md) for detailed plan

## 📊 Current Status (2025-11-17)

**Sprint Goal: 🎯 Create Seed Infrastructure → Migrate Backoffice → v1.0 Release**

**Progress:**

- POS ✅ Kitchen ✅ Bar ✅
- Products ✅ Categories ✅
- Seed Scripts 🔲 Pending
- Menu 🔲 Pending
- Backoffice Full Migration 🔲 Pending

---

## 🎯 THIS WEEK: Seed Infrastructure + Menu Migration

**New Strategy (2025-11-17):**

1. ✅ Products/Categories already in Supabase
2. 🔲 Create seed script infrastructure (this week)
3. 🔲 Replace mock files with seed scripts
4. 🔲 Migrate Menu to Supabase
5. 🔲 Continue with other stores (Suppliers, Recipes, Storage)

### 🔴 Phase 0: Seed Scripts Infrastructure (Day 1-2) **← START HERE**

**Goal:** Create seed script infrastructure to replace mock data

**Why:** Mock files are hardcoded in TypeScript. Seed scripts allow quick database reset with test data.

#### Task 0.1: Create Seed Scripts Directory Structure

**Time:** 1 hour
**Status:** 🔲 Pending

**Tasks:**

- [ ] Create `scripts/seeds/` directory
- [ ] Create `scripts/seeds/catalog/` (stable reference data)
- [ ] Create `scripts/seeds/transactional/` (test operational data)
- [ ] Create `scripts/seeds/README.md` with documentation
- [ ] Create `scripts/seeds/index.ts` (main seed runner)

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

#### Task 0.2: Create Products Seed Script (First Example)

**Time:** 2-3 hours
**Status:** 🔲 Pending

**File:** `scripts/seeds/catalog/001_seed_products.ts`

**Tasks:**

- [ ] Import CORE_PRODUCTS from productDefinitions
- [ ] Create seedProducts() function
- [ ] Map product definitions to Supabase schema
- [ ] Insert products with proper error handling
- [ ] Test seed script works

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

#### Task 0.3: Create Seed Runner Script

**Time:** 1-2 hours
**Status:** 🔲 Pending

**File:** `scripts/seeds/index.ts`

**Tasks:**

- [ ] Create main seedAll() function
- [ ] Import all seed scripts
- [ ] Run seeds in correct order (respecting foreign keys)
- [ ] Add CLI argument support (seed all, seed specific)
- [ ] Add error handling and rollback

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

#### Task 0.4: Create `/seed-db` Command

**Time:** 30 minutes
**Status:** 🔲 Pending

**File:** `.claude/commands/seed-db.md`

**Tasks:**

- [ ] Create seed-db.md command file
- [ ] Add instructions to run seed scripts
- [ ] Add option to seed all or specific entities

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

#### Task 0.5: Test Seed Workflow

**Time:** 1 hour
**Status:** 🔲 Pending

**Tasks:**

- [ ] Run `/clean-db` to clear data
- [ ] Run `/seed-db` to populate test data
- [ ] Verify products appear in Supabase
- [ ] Verify app loads products correctly
- [ ] Test repeatability (clean → seed → clean → seed)

**Acceptance:**

- ✅ Seed scripts run without errors
- ✅ Test data appears in Supabase
- ✅ App functions with seeded data
- ✅ Can repeat clean → seed workflow

---

### 🔴 Phase 1: Menu Migration (Day 3-4)

**Goal:** Menu items in Supabase (critical for POS order creation)

**Status:** 🔲 Pending (after Phase 0 complete)

**Reference:** Migration pattern same as Products in PrepProduction.md

**Tasks:**

- [ ] Create Migration 006: menu tables (categories + items)
- [ ] Create menuService with CRUD
- [ ] Update menuStore to use Supabase
- [ ] Create seed script for test menu
- [ ] Remove menuMock.ts after migration
- [ ] Test POS can read menu items

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

**Status:** 🔲 Pending (future sprints)

**Stores to Migrate:**

- [ ] Suppliers → Supabase (Sprint N)
- [ ] Recipes → Supabase (Sprint N+1)
- [ ] Storage → Supabase (Sprint N+2)
- [ ] Preparations → Supabase (Sprint N+3)

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
- 🔲 Seed scripts infrastructure
- 🔲 Menu → Supabase
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
