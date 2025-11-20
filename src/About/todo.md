# 🚀 Current Sprint: Preparation Store Implementation

> **Focus:** Fix preparation store operations (production, write-off, inventory)
> **Goal:** Ensure all UI dialogs work correctly with Supabase backend

## 📊 Current Status (2025-11-20)

**Issue:** Preparation store UI dialogs fail because `preparationService.ts` has stub methods that throw "not implemented yet" errors.

**Root Cause:**

- ✅ Store layer complete (preparationStore.ts)
- ✅ Types complete (types.ts)
- ✅ Composables complete (usePreparationWriteOff.ts)
- ✅ UI components complete (dialogs)
- ❌ **Service layer incomplete** - all CRUD methods are stubs

**Critical Missing Methods in preparationService.ts:**

- `createReceipt()` - Production operations (line 648-651)
- `createWriteOff()` - Write-off operations with FIFO (line 653-656)
- `createCorrection()` - Correction/adjustment operations (line 643-646)
- `startInventory()` - Start inventory document (line 694-698)
- `updateInventory()` - Update inventory counts (line 700-706)
- `finalizeInventory()` - Finalize and create corrections (line 708-711)
- `getWriteOffStatistics()` - Calculate write-off stats (line 658-691)

---

## 🎯 Current Tasks

### Task 1: Implement createReceipt() - Production Operations

**File:** `src/stores/preparation/preparationService.ts`

**Requirements:**

- Create PreparationOperation document (operation_type: 'receipt')
- Create PreparationBatch for each item with FIFO tracking
- Update preparation balances
- Return created operation

**Status:** 🔲 Pending

### Task 2: Implement createWriteOff() - Write-Off Operations

**File:** `src/stores/preparation/preparationService.ts`

**Requirements:**

- Create PreparationOperation document (operation_type: 'write_off')
- Use FIFO allocation to assign batches for each item
- Update batch quantities (reduce stock)
- Handle KPI-affecting vs non-KPI write-offs
- Return created operation

**Status:** 🔲 Pending

### Task 3: Implement createCorrection() - Correction Operations

**File:** `src/stores/preparation/preparationService.ts`

**Requirements:**

- Create PreparationOperation document (operation_type: 'correction')
- Use FIFO allocation similar to write-off
- Include correction reason and details
- Return created operation

**Status:** 🔲 Pending

### Task 4: Implement Inventory Operations

**File:** `src/stores/preparation/preparationService.ts`

**Requirements:**

- `startInventory()` - Create inventory document with current balances
- `updateInventory()` - Update item actual quantities
- `finalizeInventory()` - Calculate discrepancies and create correction operations
- Update balances after finalization

**Status:** 🔲 Pending

### Task 5: Implement getWriteOffStatistics()

**File:** `src/stores/preparation/preparationService.ts`

**Requirements:**

- Query operations table for write-offs
- Calculate totals by reason
- Separate KPI-affecting vs non-KPI
- Group by department (kitchen/bar)
- Return statistics object

**Status:** 🔲 Pending

### Task 6: Test UI Dialogs

**Files:**

- `src/views/Preparation/components/PreparationProductionDialog.vue`
- `src/views/Preparation/components/writeoff/PreparationWriteOffDialog.vue`
- `src/views/Preparation/components/PreparationInventoryDialog.vue`

**Test Cases:**

- ✅ Production: Create new batches
- ✅ Write-off: FIFO allocation works
- ✅ Inventory: Discrepancies create corrections

**Status:** 🔲 Pending

---

## ✅ Completed Migrations (Archive)

**Phase 1 Migration:** ✅ **COMPLETED** (2025-11-17)

- All Backoffice stores migrated to Supabase
- All tables created with proper schema
- Test data seeded successfully
- Integration flows verified

**Phase 2 Goal:** Clean up mock files, ensure Backoffice uses Supabase-only (no localStorage fallbacks)

**Current Progress:**

- ✅ All stores migrated to Supabase (Phase 1)
- ✅ POS keeps offline-first (localStorage + Supabase dual-write)
- ✅ **Step 1: Menu Mock Cleanup COMPLETED** (2025-11-18)
  - menuService.ts → Supabase-only
  - UUID generation fixed
  - dish_type constraint fixed
  - TypeScript ↔ Supabase alignment verified
- ✅ **Step 2: Products Store Migration COMPLETED** (2025-11-18)
  - productsService.ts → Supabase-only
  - 28 products loading with UUIDs
  - localStorage cache fallback working
  - Package options loading from Supabase
- ✅ **Step 3: Recipes Migration COMPLETED** (2025-11-18)
  - Recipes tables already existed in Supabase with UUID primary keys
  - 3 recipes found with proper UUIDs (R-001, R-002, R-003)
  - 10 preparations found with proper UUIDs
  - Mock files cleaned up successfully
  - All "Product not found" errors resolved
- ✅ **Step 4: Post-Migration Issues Fixed** (2025-11-18)
  - Fixed recipesService import error when creating recipes
  - Added legacy_id generation for recipes (backward compatibility)
  - Fixed Vue proxy trap error in RecipesView (loading overlay)
  - Made preparation code optional with auto-generation (P-001, P-002...)
  - Improved error handling for duplicate codes (UI error display)
- ✅ **Step 5: Account Mock Cleanup COMPLETED** (2025-11-18)
  - Created Supabase mappers for Account, Transaction, PendingPayment
  - Created accountSupabaseService for all operations
  - Updated service.ts to use Supabase-only implementation
  - Removed mock file exports from index.ts
  - **Note**: Two mock files restored for future integration:
    - `accountBasedMock.ts` - needed for supplier store integration
    - `paymentMock.ts` - needed for counteragent payments integration
  - Application runs successfully on http://localhost:5178/
  - Account data loads from Supabase (3 accounts, 4 transactions, 1 pending payment)
  - **Future task**: Mark acc_1 as "касса" (cash register) for POS system integration
- ✅ **Step 6: Counteragents Mock Cleanup COMPLETED** (2025-11-18)
  - Refactored counteragentsService.ts to Supabase-only implementation
  - Created supabaseMappers.ts for data transformation
  - Deleted all counteragents mock files and directory
  - Updated mockDataCoordinator.ts to remove counteragentsMock imports
  - Store loads 9 real counteragents from database (7 suppliers, 2 service providers)
  - All CRUD operations work with Supabase + localStorage cache fallback
  - Application runs successfully on http://localhost:5178/

---

## 🔄 Future Integration Tasks

### Supplier Store + Account Integration

**Planned for next development phase:**

- **Task**: Integrate supplier store with account module for purchase order processing
- **Files to integrate**: `accountBasedMock.ts` (restored for this purpose)
- **Flow**: Purchase Order → Pending Payment → Account Transaction
- **Status**: 🔲 Planned (mock files preserved)

### Counteragent Payments Integration

**Planned for supplier/customer payment processing:**

- **Task**: Integrate counteragent payments with account module
- **Files to integrate**: `paymentMock.ts` (restored for this purpose)
- **Flow**: Counteragent Payment → Account Transaction
- **Status**: 🔲 Planned (mock files preserved)

### POS System Integration

**Critical for POS operations:**

- **Task**: Mark acc_1 as "касса" (cash register) in POS system
- **Purpose**: Identify main cash register account for POS transactions
- **Impact**: POS payments will reference this account
- **Status**: 🔲 Pending implementation

---

## 🎯 THIS WEEK: Phase 2 - Mock Files Cleanup

**Strategy:**

1. Remove all Backoffice mock files (keep POS mocks for offline-first)
2. Verify all stores use Supabase-only (no localStorage fallbacks)
3. Clean up shared/mockDataCoordinator.ts
4. Update appInitializer.ts verification

---

## 🧹 Phase 2: Mock Files Cleanup & Verification

### 📊 Mock Files Inventory

**Total mock files found:** 15

**Backoffice (to clean):** 8 files

- Menu: menuMock.ts ✅ COMPLETED
- Recipes: recipesMock.ts, unitsMock.ts ✅ COMPLETED
- Preparation: preparationMock.ts ✅ COMPLETED
- Counteragents: counteragentsMock.ts
- Account: mock.ts, accountBasedMock.ts, paymentMock.ts
- Shared: productDefinitions.ts, supplierDefinitions.ts, storageDefinitions.ts, mockDataCoordinator.ts

**POS (keep for offline-first):** 3 files

- pos/mocks/posMockData.ts ✅ Keep
- pos/shifts/mock.ts ✅ Keep
- kitchen/mocks/kitchenMockData.ts ✅ Keep

---

### Step 1: Menu Mock (menuMock.ts) ✅ **COMPLETED** (2025-11-18)

**File:** `src/stores/menu/menuMock.ts`
**Used by:** menuService.ts, index.ts, migrateMenuToSupabase.ts

**Tasks:**

- [x] Check menuService.ts - should use Supabase only ✅
- [x] Check index.ts - should not export MENU_MOCK_DATA ✅
- [x] Remove menuMock.ts if not used ✅
- [x] Fix UUID generation (crypto.randomUUID) ✅
- [x] Fix dish_type constraint mismatch ✅
- [x] Add missing fields to MenuItem interface (nameEn, imageUrl) ✅

**Results:**

- ✅ menuService.ts migrated to Supabase-only (no in-memory fallback)
- ✅ Removed mock exports from index.ts
- ✅ Deleted menuMock.ts
- ✅ Changed from dual-write to Supabase-first with cache fallback
- ✅ Fixed UUID generation: now uses crypto.randomUUID() from @/utils/id
- ✅ Fixed dish_type constraint: 'final' → 'simple' (matches TypeScript)
- ✅ Added nameEn and imageUrl to MenuItem interface
- ✅ Full TypeScript ↔ Supabase schema alignment verified

---

### Step 2: Products Store Migration ✅ **COMPLETED** (2025-11-18)

**Files:** `src/stores/productsStore/productsStore.ts`, `src/stores/productsStore/productsService.ts`

**Tasks:**

- [x] ✅ Products Store migrated to Supabase-only (no mock data)
- [x] ✅ Loading 28 products from Supabase successfully
- [x] ✅ localStorage cache fallback implemented
- [x] ✅ All mock data references removed
- [x] ✅ Package options loading from Supabase

**Results:**

- ✅ Products Store verified working with Supabase
- ✅ 28 products loaded with UUIDs (e.g., `77497b8d-a841-4631-ac73-dae4bfe5a592` for "Olive Oil")
- ✅ No compilation errors
- ✅ App running successfully

**IMPORTANT NOTE:** Recipes Store still uses mock data and references old product IDs (`prod-olive-oil`, etc.). This causes "Product not found" warnings. Recipes migration is **Step 3** below.

---

### Step 3: Recipes Mocks (recipesMock.ts, unitsMock.ts)

**Files:** `src/stores/recipes/recipesMock.ts`, `src/stores/recipes/unitsMock.ts`
**Used by:** recipesStore.ts, index.ts

**Current Issue:**

- ❌ Recipes Store loads from `recipesMock.ts` (line 16, 120-121 in recipesStore.ts)
- ❌ Mock recipes reference old product IDs like `prod-olive-oil`, `prod-garlic`, etc.
- ❌ Products Store uses UUIDs like `77497b8d-a841-4631-ac73-dae4bfe5a592`
- ❌ Console warnings: "Product not found: prod-olive-oil" (50+ warnings)

**Tasks:**

- [ ] Create recipes and preparations tables in Supabase
- [ ] Create recipesService.ts with Supabase integration (like productsService.ts)
- [ ] Migrate recipe data to use real product UUIDs instead of mock IDs
- [ ] Update recipesStore.ts to load from Supabase
- [ ] Check index.ts - should not export RECIPES_MOCK
- [ ] Remove both mock files after migration

---

### Step 3: Preparation Mock (preparationMock.ts) ✅ **COMPLETED** (2025-11-18)

**File:** `src/stores/preparation/preparationMock.ts`
**Used by:** preparationService.ts, index.ts

**Tasks Completed:**

- [x] ✅ Checked preparationService.ts - simplified to stub mode
- [x] ✅ Checked index.ts - removed PREPARATION_MOCK exports
- [x] ✅ Removed mock file completely
- [x] ✅ Updated recipesStore.ts to remove mock imports
- [x] ✅ Created simplified preparationService stub for future Supabase integration

**Results:**

- ✅ preparationMock.ts deleted completely
- ✅ preparationService.ts simplified to stub mode (empty arrays)
- ✅ All mock exports removed from preparation/index.ts
- ✅ recipesStore.ts updated to remove mock imports
- ✅ Application compiles and runs successfully
- ✅ All "preparationMock" references removed from codebase

---

### Step 4: Counteragents Mock (counteragentsMock.ts) ✅ **COMPLETED** (2025-11-18)

**File:** `src/stores/counteragents/mock/counteragentsMock.ts`
**Used by:** counteragentsService.ts, index.ts, mockDataCoordinator.ts

**Tasks Completed:**

- [x] ✅ Refactored counteragentsService.ts to use Supabase-only
- [x] ✅ Removed mock exports from index.ts
- [x] ✅ Created supabaseMappers.ts for data transformation
- [x] ✅ Deleted mock/counteragentsMock.ts file
- [x] ✅ Deleted entire mock/ directory
- [x] ✅ Updated mockDataCoordinator.ts to remove counteragentsMock import
- [x] ✅ Added deprecation notice for counteragents mock data

**Results:**

- ✅ CounteragentsService fully migrated to Supabase with cache fallback
- ✅ Store loads 9 real counteragents from database (UUID primary keys)
- ✅ All CRUD operations work with Supabase (create, read, update, delete)
- ✅ Search, filtering, sorting implemented on database side
- ✅ localStorage cache for offline resilience
- ✅ Application runs successfully on http://localhost:5178/
- ✅ No mock dependencies in counteragents store
- ✅ Following established migration pattern (same as products, menu, accounts)

**Data Flow Verification:**

```
Supabase (counteragents table) → CounteragentsService → CounteragentsStore → UI
                                      ↓
                               localStorage cache (5 min TTL)
```

---

### Step 5: Account Mocks (3 files)

**Files:**

- `src/stores/account/mock.ts`
- `src/stores/account/accountBasedMock.ts`
- `src/stores/account/paymentMock.ts`

**Used by:** service.ts, store.ts

**Tasks:**

- [ ] Check account/service.ts - should use Supabase only
- [ ] Check account/store.ts - should use Supabase only
- [ ] Remove all 3 mock files if not used

---

### Step 6: Shared Definitions (productDefinitions.ts, etc.)

**Files:**

- `src/stores/shared/productDefinitions.ts` - used by supplierService, mockDataCoordinator
- `src/stores/shared/supplierDefinitions.ts` - used by mockDataCoordinator
- `src/stores/shared/storageDefinitions.ts` - used by mockDataCoordinator

**Tasks:**

- [ ] Check supplierService.ts - should NOT use productDefinitions
- [ ] Remove exports from shared/index.ts
- [ ] Add deprecation notice to files
- [ ] Move to /reference directory OR keep as-is with deprecation

---

### Step 7: Clean Up mockDataCoordinator.ts

**File:** `src/stores/shared/mockDataCoordinator.ts`

**Tasks:**

- [ ] Remove imports of deleted mocks
- [ ] Add deprecation notice at top
- [ ] Keep file as reference for data structures

---

### Step 8: Verify appInitializer.ts

**File:** `src/core/appInitializer.ts`

**Tasks:**

- [ ] Verify all stores initialize from Supabase (via services)
- [ ] No imports from mock files
- [ ] No fallback to mock data

---

### Step 9: Final Verification

**Tasks:**

- [ ] Build succeeds: `pnpm build`
- [ ] App runs: `pnpm dev`
- [ ] All stores initialize correctly
- [ ] No console errors about missing mocks
- [ ] No mock file imports in production code

---

### 🔵 Phase 3: Google Sheets Import (Future)

**Goal:** Import real data from Google Sheets to Production DB
**Status:** 🔲 Deferred to v1.1+

**Tasks:**

- [ ] Set up Google Sheets API credentials
- [ ] Create import script (scripts/import/importFromGoogleSheets.ts)
- [ ] Map columns: Google Sheets → Supabase schema
- [ ] Test import on Development DB
- [ ] Create Production Supabase project
- [ ] Import real data to Production DB

## 📝 Phase 1 Completed (2025-11-17)

### ✅ All Backoffice Stores Migrated to Supabase

**Stores:**

- Products ✅
- Menu ✅
- Recipes ✅
- Preparations ✅
- Counteragents/Suppliers ✅
- Storage ✅
- Account ✅
- Sales ✅
- Recipe Write-offs ✅

**Integration flows verified:**

- POS → Sales → Write-off → Storage ✅
- Supplier → Account (Purchase order → Pending payment → Transaction) ✅

**Test data seeded via MCP Supabase tools**

## 🔗 Related Files

- **[PrepProduction.md](./PrepProduction.md)** - Production preparation strategy
- **[BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md)** - Phase 1 migration details
- **[PHASE2_MIGRATION.md](./PHASE2_MIGRATION.md)** - Phase 2 cleanup plan
- **[PRIORITIES.md](./PRIORITIES.md)** - Weekly priorities
- **[SupabaseGlobalTodo.md](./SupabaseGlobalTodo.md)** - Global roadmap

---

## 📅 Schedule

**This Week (2025-11-18):** Phase 2 Mock Cleanup

- ✅ **Day 1 (2025-11-18):** Menu mock cleanup COMPLETED
  - menuService.ts → Supabase-only
  - Fixed UUID generation
  - Fixed dish_type constraint
  - Added missing TypeScript fields
  - Verified full schema alignment
- Day 2: Check and remove recipes/preparation mocks
- Day 3-4: Check and remove counteragents/account mocks
- Day 5: Clean up shared definitions and mockDataCoordinator
- Day 6: Verify appInitializer, final testing

**Next Week:** Production preparation (Google Sheets import)

---

**Mantra:** "Supabase-only → Clean code → Production ready"

---

**Last Updated:** 2025-11-18
**Target:** v1.0 Release (after Phase 2 + Google Sheets import)
**Status:** Phase 2 in progress (mock cleanup)

---

# 🔄 Recipes Architecture Refactoring (NEW)

## Phase 1: Preparations ID Migration - IN PROGRESS

### 🔍 Current Analysis Results:

**Current Issues Found:**

- Preparations use TEXT primary keys ("prep-french-fries") ❌
- Components use global sequence IDs ("comp-1", "comp-2") ❌
- Steps use global sequence IDs ("step-1", "step-2") ❌
- Mixed ID types create mapper complexity ❌

**Current Structure:**

```
Products (UUID) ✅ - Already migrated in previous session
Preparations (TEXT) - NEED MIGRATION → UUID
Recipes (TEXT) - NEED MIGRATION → UUID
Recipe_Components (global: "comp-1") - NEED MIGRATION → composite PK
Recipe_Steps (global: "step-1") - NEED MIGRATION → composite PK
```

**Good News:**

- Recipe steps DO start from 1 correctly per recipe ✅
- Preparation_ingredients vs recipe_components separation is architecturally correct ✅
- Products → Preparations → Recipes → Menu_Items flow is correct ✅

### 📋 Database Migration Tasks for Preparations:

- [x] Preparations table: TEXT → UUID migration ✅
- [x] Update preparation_ingredients foreign keys (UUID) ✅
- [x] Update recipe_components preparation references (UUID) ✅
- [ ] Update menu_items variants JSON (preparation references)
- [ ] Create constraints and indexes

### 📋 Frontend Tasks for Preparations:

- [x] Update SupabaseMappers for UUID generation (remove manual ID) ✅
- [x] Update RecipesService ID handling (let DB generate UUID) ✅
- [x] Update composables for UUID preparation ✅
- [x] Create codeGenerator utility for preparation codes ✅
- [x] Update TypeScript types (if needed) ✅

### ✅ COMPLETED: Preparations UUID Migration (2025-11-18)

**Results:**

- ✅ Preparations table migrated from TEXT to UUID primary keys
- ✅ All foreign keys updated to use UUID references
- ✅ Database auto-generates UUIDs for new preparations
- ✅ Auto-generation of sequential codes (P-001, P-002, etc.)
- ✅ Frontend service updated to work with UUID generation
- ✅ Application running successfully on port 5178

### 🧪 Test Tasks:

- [ ] Verify preparation creation works with UUID
- [ ] Test preparation updates/deletes
- [ ] Verify menu items still reference preparations correctly
- [ ] Test cost calculation still works

## Next Steps After Preparations:

**Phase 2: Recipes UUID migration**

- Similar migration for recipes table
- Update recipe_components and recipe_steps foreign keys
- Update menu_items recipe references

**Phase 3: Components/Steps Optimization**

- Remove global sequence IDs ("comp-1", "step-1")
- Use composite primary keys (recipe_id, sort_order)
- Add constraints for step sequence continuity

**Phase 4: Performance & Constraints**

- Add indexes for frequent queries
- Add database constraints for data integrity
- Optimize JSONB queries for menu_items composition

---

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

````

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
````

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

- [x] recipes/unitsMock.ts → seed script ✅ REMOVED (Phase 2 completed)
- [x] recipes/recipesMock.ts → seed script ✅ REMOVED (Phase 2 completed)
- [x] preparation/preparationMock.ts → seed script ✅ REMOVED (Phase 2 completed)
- [x] account/paymentMock.ts → seed script
- [x] account/accountBasedMock.ts → seed script
- [x] account/mock.ts → seed script
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
- [x] Account Store → Supabase ✅ (Migration 012 - 3 accounts, 4 transactions, 1 pending payment)
- [x] Sales Store → Supabase ✅ (Migration 013 - sales transactions with profit calculation)
- [x] Recipe Write-offs → Supabase ✅ (Migration 014 - automatic inventory write-offs)

**Integration Verified:**

- [x] Supplier → Account ✅ (Purchase order → Pending payment → Transaction flow working)
- [x] POS → Sales → Write-off → Storage ✅ (Payment triggers sales transaction, recipe decomposition, and inventory write-off)

**Reference:** See PrepProduction.md Section 5 for detailed roadmap

---

### 🟣 Phase 3.5: Sales Store Migration ✅ **COMPLETED** (2025-11-17)

**Goal:** Migrate Sales Store and Recipe Write-offs from localStorage to Supabase

**Status:** ✅ **COMPLETED**

**Tasks Completed:**

#### Migration 013: Sales Transactions Table

**Created table:** `sales_transactions`

**Schema:**

- Reference links: `payment_id`, `order_id`, `bill_id`, `item_id`, `shift_id`
- Menu data: `menu_item_id`, `menu_item_name`, `variant_id`, `variant_name`
- Sale data: `quantity`, `unit_price`, `total_price`, `payment_method`
- Timestamps: `sold_at`, `processed_by`
- Recipe link: `recipe_id`, `recipe_write_off_id`
- **JSONB fields:**
  - `profit_calculation`: originalPrice, itemOwnDiscount, allocatedBillDiscount, finalRevenue, ingredientsCost, profit, profitMargin
  - `decomposition_summary`: totalProducts, totalCost, decomposedItems[]
- Department: `kitchen` | `bar`
- Sync status: `synced_to_backoffice`, `synced_at`

**Indexes:** sold_at, menu_item_id, payment_id, shift_id, department, payment_method

**RLS:** Enabled with authenticated user policies

#### Migration 014: Recipe Write-offs Table

**Created table:** `recipe_write_offs`

**Schema:**

- Links: `sales_transaction_id`, `menu_item_id`, `variant_id`, `recipe_id`
- Recipe data: `portion_size`, `sold_quantity`
- **JSONB arrays:**
  - `write_off_items`: type, itemId, itemName, quantityPerPortion, totalQuantity, unit, costPerUnit, totalCost, batchIds[]
  - `decomposed_items`: productId, productName, quantity, unit, costPerUnit, totalCost, path[]
  - `original_composition`: MenuComposition[] (for audit trail)
- Operation: `department`, `operation_type` ('auto_sales_writeoff'), `performed_at`, `performed_by`
- Storage link: `storage_operation_id` (nullable - storage ops not yet in Supabase)

**Indexes:** sales_transaction_id, menu_item_id, performed_at, department, storage_operation_id

**RLS:** Enabled with authenticated user policies

#### Migration 015-016: Foreign Key Constraints

- Made `recipe_write_off_id` nullable in `sales_transactions` (two-phase insert pattern)
- Made `storage_operation_id` nullable with no FK constraint (storage ops still in localStorage)
- Added comments explaining circular dependency workaround

#### Services Updated

**SalesService (`src/stores/sales/services.ts`):**

- ✅ Dual-write pattern (Supabase + localStorage fallback)
- ✅ `getAllTransactions()` - reads from Supabase, caches to localStorage
- ✅ `saveSalesTransaction()` - upsert to Supabase, backup to localStorage
- ✅ Mappers created (`src/stores/sales/supabase/mappers.ts`)

**RecipeWriteOffService (`src/stores/sales/recipeWriteOff/services.ts`):**

- ✅ Dual-write pattern (Supabase + localStorage fallback)
- ✅ `getAllWriteOffs()` - reads from Supabase, caches to localStorage
- ✅ `saveWriteOff()` - upsert to Supabase, backup to localStorage
- ✅ Mappers created (`src/stores/sales/recipeWriteOff/supabase/mappers.ts`)

#### Data Flow Verified

**Complete audit trail:**

```
Payment (Supabase)
  ↓
SalesTransaction (Supabase)
  ↓ profit_calculation = {finalRevenue, ingredientsCost, profit, profitMargin}
  ↓ decomposition_summary = {totalProducts, totalCost, decomposedItems[]}
  ↓
RecipeWriteOff (Supabase)
  ↓ write_off_items = [{type, itemId, quantity, cost, batchIds}]
  ↓ decomposed_items = [{productId, quantity, unit, cost, path}]
  ↓
StorageOperation (localStorage - not yet migrated)
  ↓ FIFO batch allocation
  ↓
StorageBatches (Supabase)
  ↓ currentQuantity updated
```

#### Test Results

**Tested transactions (2025-11-17):**

1. **Bintang Beer (bar)** - Rp 25,000

   - Revenue: Rp 25,000
   - Cost: Rp 12,000
   - Profit: Rp 13,000
   - Margin: 52%
   - Payment method: Cash
   - Department: Bar

2. **Beef Steak (kitchen)** - Rp 95,000
   - Revenue: Rp 95,000
   - Cost: Rp 46,099
   - Profit: Rp 48,901
   - Margin: 51.47%
   - Payment method: Cash
   - Department: Kitchen
   - Write-off: 250g beef, 10ml oil, 3g salt, 2g pepper

**Aggregate Statistics (from Supabase):**

- Total transactions: 2
- Total revenue: Rp 120,000
- Total cost: Rp 58,099
- Total profit: Rp 61,901
- Average margin: 51.73%

**Data Flow Verified:**

```
POS Payment (✅)
  ↓
Sales Transaction (✅ Supabase + localStorage backup)
  ↓ profit_calculation = {finalRevenue: 120000, ingredientsCost: 58099, profit: 61901}
  ↓ decomposition_summary = {totalProducts: 4, totalCost: 58099}
  ↓
Recipe Write-off (✅ Supabase + localStorage backup)
  ↓ write_off_items = [{beef: 250g}, {oil: 10ml}, {salt: 3g}, {pepper: 2g}]
  ↓ decomposed_items with FIFO batch tracking
  ↓
Storage Operation (⏳ localStorage - migration pending)
  ↓ FIFO batch allocation from storage_batches
```

**Key Learnings:**

1. ✅ JSONB fields perfect for complex nested data (profit calculations, decompositions)
2. ✅ Two-phase insert pattern resolves circular FK dependencies (sales_transaction ↔ recipe_write_off)
3. ✅ Nullable FK constraints allow gradual migration (storage_operation_id has no FK until storage ops migrated)
4. ✅ Dual-write pattern provides resilience during migration (Supabase primary, localStorage fallback)
5. ✅ TypeScript interfaces → Supabase schema mapping critical for data integrity
6. ✅ Recipe decomposition engine works correctly (menu → recipes → preparations → products)
7. ✅ Profit calculation accurate (revenue - discounts - ingredient costs = profit)

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
