# 🚀 Production Preparation Strategy

**Created:** 2025-11-16
**Target:** v1.0 Production Release
**Status:** Planning Phase

---

## 📊 1. Current State Analysis

### ✅ What's Working (Supabase)

**POS System:**

- ✅ Orders → Supabase (dual-write + realtime)
- ✅ Payments → Supabase (dual-write)
- ✅ Shifts → Supabase (dual-write + sync)
- ✅ Tables → Supabase (dual-write)

**Kitchen/Bar Monitors:**

- ✅ Real-time sync with POS
- ✅ Department filtering (kitchen/bar)
- ✅ Status transitions
- ✅ Role-based access

**Catalog Data:**

- ✅ Products → Supabase
- ✅ Categories → Supabase

---

### ❌ What's Still on localStorage (Backoffice)

**Stores pending migration:**

- ❌ Menu → localStorage only
- ❌ Recipes → localStorage only
- ❌ Storage/Inventory → localStorage only
- ❌ Suppliers → localStorage only
- ❌ Preparations → localStorage only
- ❌ Counteragents → localStorage only

---

### 🧪 Current Mock Data Structure

**Location:** `src/stores/shared/`

**Mock Definition Files:**

```
src/stores/shared/
├── productDefinitions.ts       # ✅ 28 products (CORE_PRODUCTS)
├── storageDefinitions.ts       # ✅ Balances, batches, operations
├── supplierDefinitions.ts      # ✅ Orders, receipts, requests
└── mockDataCoordinator.ts      # ✅ Coordinator for all mock data
```

**Mock Data Files Found:** (12 files)

```
src/stores/
├── recipes/
│   ├── unitsMock.ts
│   └── recipesMock.ts
├── preparation/
│   └── preparationMock.ts
├── account/
│   ├── paymentMock.ts
│   ├── accountBasedMock.ts
│   └── mock.ts
├── counteragents/
│   └── mock/counteragentsMock.ts
├── pos/
│   ├── mocks/posMockData.ts
│   └── shifts/mock.ts
├── menu/
│   └── menuMock.ts
└── kitchen/
    └── mocks/kitchenMockData.ts
```

**Mock Data Types:**

1. **Catalog Data** (stable, can be imported):

   - Products (28 items in `productDefinitions.ts`)
   - Menu items
   - Recipes
   - Suppliers
   - Counteragents

2. **Transactional Data** (test data, should be seeded):
   - Storage operations
   - Purchase orders
   - Receipts
   - Inventory batches

---

### 📄 Real Data Source

**Google Sheets** contains:

- Real products for your cafe
- Real menu items
- Real recipes
- Real pricing

**Next Step:** Create import script from Google Sheets → Supabase

---

## 🗄️ 2. Database Strategy

### Two-Database Approach

#### 🔵 Development Database (Current)

**Purpose:**

- Testing all migrations
- Developing new features
- Breaking changes allowed

**Data:**

- Test products from mock definitions
- Test orders, receipts, operations
- Can be reset/cleared anytime

**Environment:**

- `.env.development`
- Already configured
- Using now

---

#### 🟢 Production Database (Future)

**Purpose:**

- Real cafe operations
- Real customers, real money
- Never reset/clear

**Data:**

- Real products imported from Google Sheets
- Real menu imported from Google Sheets
- Real recipes imported from Google Sheets
- Real transactions (orders, payments, shifts)

**When to Create:**

- After all Backoffice stores migrated to Supabase
- After TypeScript build succeeds
- After all tests pass
- Before v1.0 deployment

**Environment:**

- `.env.production` (will create)
- New Supabase project (will create)
- Same migrations, different data

---

### Data Flow Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ DEVELOPMENT PHASE (Now)                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Work with Development DB                                  │
│ 2. Use seed scripts for test data                            │
│ 3. Test migrations, features, workflows                      │
│ 4. Iterate quickly, break things safely                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRE-PRODUCTION PHASE (Before v1.0)                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Create Production Supabase project                        │
│ 2. Apply all migrations (schema only)                        │
│ 3. Import real data from Google Sheets                       │
│ 4. Smoke test with real data                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION PHASE (After v1.0 release)                        │
├─────────────────────────────────────────────────────────────┤
│ Development DB: New features, testing                        │
│      ↓                                                        │
│ Test migration → Apply to Production DB                      │
│      ↓                                                        │
│ Deploy new code → Production with new features               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌱 3. Seed Scripts Strategy

### Problem Statement

**Current:** Mock data is hardcoded in TypeScript files (`*mock.ts`)

**Issues:**

- Cannot easily reset test data
- Mock files mixed with production code
- No clear separation of test vs real data
- Hard to maintain and update

**Solution:** Replace mock files with seed scripts

---

### Seed Scripts Architecture

**Location:**

```
scripts/
├── seeds/
│   ├── README.md                    # Documentation
│   ├── catalog/                     # Stable reference data
│   │   ├── 001_seed_products.ts
│   │   ├── 002_seed_categories.ts
│   │   ├── 003_seed_menu.ts
│   │   ├── 004_seed_recipes.ts
│   │   └── 005_seed_suppliers.ts
│   └── transactional/               # Test operational data
│       ├── 101_seed_storage_ops.ts
│       ├── 102_seed_purchase_orders.ts
│       └── 103_seed_inventory.ts
└── import/                          # Real data import
    ├── importFromGoogleSheets.ts    # Google Sheets → Supabase
    └── README.md
```

---

### Seed Script Types

#### 1. Catalog Seeds (Stable Data)

**Purpose:** Reference data that doesn't change often

**Examples:**

- Products (from `productDefinitions.ts`)
- Menu items (from `menuMock.ts`)
- Recipes (from `recipesMock.ts`)
- Suppliers (from `supplierDefinitions.ts`)

**Usage:**

- Development: Use seed scripts
- Production: Import from Google Sheets (real data)

**Template:**

```typescript
// scripts/seeds/catalog/001_seed_products.ts
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
      console.error(`❌ Failed to seed ${product.name}:`, error)
    } else {
      console.log(`✅ Seeded: ${product.name}`)
    }
  }

  console.log('✅ Products seeded successfully')
}
```

---

#### 2. Transactional Seeds (Test Data)

**Purpose:** Test operational data for development/testing

**Examples:**

- Storage operations (receipts, write-offs, corrections)
- Purchase orders (drafts, sent, delivered)
- Inventory batches
- Test shifts, test orders

**Usage:**

- Development only
- Production: Real data from actual operations

**Template:**

```typescript
// scripts/seeds/transactional/101_seed_storage_ops.ts
import { supabase } from '@/supabase/client'
import { getStorageWorkflowData } from '@/stores/shared/storageDefinitions'

export async function seedStorageOperations() {
  console.log('🌱 Seeding storage operations...')

  const { operations } = getStorageWorkflowData()

  for (const operation of operations) {
    await supabase.from('storage_operations').insert(operation)
  }

  console.log(`✅ Seeded ${operations.length} storage operations`)
}
```

---

### Seed Execution Strategy

**Command:** `/seed-db` (will create)

**Workflow:**

```bash
# Clean database
/clean-db

# Run all catalog seeds
pnpm seed:catalog

# Run all transactional seeds (optional)
pnpm seed:transactional

# Or run specific seed
pnpm seed products
pnpm seed menu
```

**Script:**

```typescript
// scripts/seeds/index.ts
import { seedProducts } from './catalog/001_seed_products'
import { seedMenu } from './catalog/003_seed_menu'
import { seedRecipes } from './catalog/004_seed_recipes'
// ... import all seeds

export async function seedAll() {
  console.log('🌱 Starting database seeding...')

  // Catalog data (order matters due to foreign keys)
  await seedProducts()
  await seedCategories()
  await seedMenu()
  await seedRecipes()
  await seedSuppliers()

  // Transactional data (optional for development)
  if (process.env.SEED_TRANSACTIONAL === 'true') {
    await seedStorageOperations()
    await seedPurchaseOrders()
  }

  console.log('✅ Database seeding completed!')
}

// CLI usage
if (require.main === module) {
  seedAll().then(() => process.exit(0))
}
```

---

### Migration Path: Mock → Seed

**Step 1: Identify Mock Files**

```bash
# Already done:
find src -name "*mock*.ts" -o -name "*Mock*.ts"
# Found 12 files
```

**Step 2: Create Seed Scripts**

For each mock file:

1. Extract data structures
2. Create corresponding seed script
3. Map to Supabase schema

**Step 3: Update Stores**

Replace mock imports with Supabase queries:

**Before:**

```typescript
// menuStore.ts
import { MENU_MOCK_DATA } from './menuMock'

async initialize() {
  this.menuItems = MENU_MOCK_DATA  // ❌ Mock data
}
```

**After:**

```typescript
// menuStore.ts
import { menuService } from './services'

async initialize() {
  this.menuItems = await menuService.getAllMenuItems()  // ✅ Supabase
}
```

**Step 4: Remove Mock Files**

After migration complete:

```bash
# Search for remaining mock files
find src -name "*mock*.ts" -o -name "*Mock*.ts"

# Delete them
rm src/stores/menu/menuMock.ts
rm src/stores/recipes/recipesMock.ts
# ... etc
```

---

## 📥 4. Google Sheets Import Strategy

### Import Script Architecture

**Purpose:** Import real cafe data from Google Sheets → Production Supabase

**Location:** `scripts/import/importFromGoogleSheets.ts`

---

### Google Sheets Structure (Expected)

**Sheet 1: Products**

```
| ID              | Name          | Category    | Unit  | Cost   | Min Stock |
|-----------------|---------------|-------------|-------|--------|-----------|
| prod-eggs       | Eggs          | dairy       | piece | 2500   | 50        |
| prod-beef       | Beef Steak    | meat        | gram  | 180    | 5000      |
```

**Sheet 2: Menu Items**

```
| ID              | Name              | Category  | Price  | Department |
|-----------------|-------------------|-----------|--------|------------|
| menu-scrambled  | Scrambled Eggs    | breakfast | 45000  | kitchen    |
| menu-beer       | Bintang Beer      | beverage  | 35000  | bar        |
```

**Sheet 3: Recipes**

```
| Menu ID         | Product ID  | Quantity | Unit  |
|-----------------|-------------|----------|-------|
| menu-scrambled  | prod-eggs   | 3        | piece |
| menu-scrambled  | prod-butter | 10       | gram  |
```

---

### Import Script Template

```typescript
// scripts/import/importFromGoogleSheets.ts
import { google } from 'googleapis'
import { supabase } from '@/supabase/client'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID
const sheets = google.sheets('v4')

/**
 * Import products from Google Sheets
 */
async function importProducts() {
  console.log('📥 Importing products from Google Sheets...')

  // 1. Fetch data from Google Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Products!A2:Z' // Skip header row
  })

  const rows = response.data.values
  if (!rows || rows.length === 0) {
    console.log('No products found')
    return
  }

  // 2. Map to Supabase schema
  const products = rows.map(row => ({
    id: row[0], // Column A: ID
    name: row[1], // Column B: Name
    category: row[2], // Column C: Category
    base_unit: row[3], // Column D: Unit
    base_cost_per_unit: parseFloat(row[4]), // Column E: Cost
    min_stock: parseInt(row[5]) // Column F: Min Stock
    // ... other fields
  }))

  // 3. Insert to Supabase
  const { data, error } = await supabase.from('products').upsert(products, { onConflict: 'id' })

  if (error) {
    console.error('❌ Failed to import products:', error)
  } else {
    console.log(`✅ Imported ${products.length} products`)
  }
}

/**
 * Import menu items from Google Sheets
 */
async function importMenuItems() {
  // Similar structure...
}

/**
 * Import recipes from Google Sheets
 */
async function importRecipes() {
  // Similar structure...
}

/**
 * Main import function
 */
export async function importAllFromGoogleSheets() {
  console.log('🚀 Starting Google Sheets import...')

  await importProducts()
  await importMenuItems()
  await importRecipes()

  console.log('✅ Import completed!')
}

// CLI usage
if (require.main === module) {
  importAllFromGoogleSheets()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Import failed:', err)
      process.exit(1)
    })
}
```

---

### Usage

**Step 1: Set up Google Sheets API**

```bash
# Install dependencies
pnpm add googleapis

# Set up credentials
# Create service account in Google Cloud Console
# Download credentials.json
# Share Google Sheet with service account email
```

**Step 2: Configure environment**

```bash
# .env
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

**Step 3: Run import**

```bash
# Import to Development DB (for testing)
pnpm import:sheets

# Import to Production DB (for real deployment)
VITE_SUPABASE_URL=https://prod.supabase.co pnpm import:sheets
```

---

## 📋 5. Backoffice Stores Migration Roadmap

### Migration Order (by Dependencies)

```
1. Products ✅ (already done)
   ↓
2. Categories ✅ (already done)
   ↓
3. Suppliers (Sprint N)
   ↓
4. Menu Items (Sprint N+1)
   ↓
5. Recipes (Sprint N+1)
   ↓
6. Storage/Inventory (Sprint N+2)
   ↓
7. Preparations (Sprint N+2)
```

---

### Per-Store Migration Pattern

For each store, follow this pattern:

#### Example: Menu Store Migration

**Step 1: Create Migration** (SQL schema)

```sql
-- supabase/migrations/006_create_menu.sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  department TEXT CHECK (department IN ('kitchen', 'bar')),
  available BOOLEAN DEFAULT true,
  recipe JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_department ON menu_items(department);
CREATE INDEX idx_menu_category ON menu_items(category);
```

**Step 2: Apply Migration**

```bash
# Via MCP
mcp__supabase__apply_migration({
  name: 'create_menu',
  query: '...'
})
```

**Step 3: Create Service** (`src/stores/menu/services.ts`)

```typescript
import { supabase } from '@/supabase/client'

export const menuService = {
  async getAllMenuItems() {
    const { data, error } = await supabase.from('menu_items').select('*').order('name')

    if (error) throw error
    return data.map(fromSupabase)
  },

  async createMenuItem(item) {
    /* ... */
  },
  async updateMenuItem(id, item) {
    /* ... */
  },
  async deleteMenuItem(id) {
    /* ... */
  }
}

// Mappers
function fromSupabase(row) {
  /* DB → App */
}
function toSupabase(item) {
  /* App → DB */
}
```

**Step 4: Update Store** (`src/stores/menu/menuStore.ts`)

```typescript
import { menuService } from './services'

async initialize() {
  try {
    this.menuItems = await menuService.getAllMenuItems()
    console.log('✅ Menu loaded from Supabase')
  } catch (error) {
    console.error('❌ Failed to load menu:', error)
    // Fallback to localStorage if needed
  }
}
```

**Step 5: Create Seed Script** (`scripts/seeds/catalog/003_seed_menu.ts`)

```typescript
import { MENU_MOCK_DATA } from '@/stores/menu/menuMock'
import { supabase } from '@/supabase/client'

export async function seedMenu() {
  for (const item of MENU_MOCK_DATA) {
    await supabase.from('menu_items').insert(item)
  }
}
```

**Step 6: Remove Mock File**

```bash
rm src/stores/menu/menuMock.ts
```

---

## 🗓️ 6. Sprint-by-Sprint Roadmap

### Sprint Current: Backoffice Migration Foundation

**Goal:** Complete Products/Categories, prepare infrastructure

**Tasks:**

- [x] Products → Supabase ✅
- [x] Categories → Supabase ✅
- [ ] Create seed script infrastructure
- [ ] Create `/seed-db` command
- [ ] Test seed → clean → seed workflow

**Deliverable:** Seed script system working

---

### Sprint N: Menu & Suppliers

**Goal:** Migrate Menu and Suppliers to Supabase

**Week 1: Suppliers**

- [ ] Migration 006: Create suppliers/counteragents tables
- [ ] Create suppliersService with CRUD
- [ ] Update supplier_2 store to use Supabase
- [ ] Seed script for test suppliers
- [ ] Remove `supplierDefinitions.ts` (keep for reference)

**Week 2: Menu**

- [ ] Migration 007: Create menu_items table
- [ ] Migration 008: Create menu_categories table
- [ ] Create menuService with CRUD
- [ ] Update menuStore to use Supabase
- [ ] Seed script for test menu
- [ ] Remove `menuMock.ts`

**Deliverable:** Suppliers and Menu on Supabase

---

### Sprint N+1: Recipes

**Goal:** Migrate Recipes to Supabase

**Tasks:**

- [ ] Migration 009: Create recipes table
- [ ] Migration 010: Create recipe_ingredients table
- [ ] Create recipesService with CRUD
- [ ] Update recipesStore to use Supabase
- [ ] Handle complex recipe compositions
- [ ] Seed script for test recipes
- [ ] Remove `recipesMock.ts`

**Deliverable:** Recipes on Supabase

---

### Sprint N+2: Storage & Inventory

**Goal:** Migrate Storage/Inventory to Supabase

**Tasks:**

- [ ] Migration 011: Create storage_operations table
- [ ] Migration 012: Create storage_balances table
- [ ] Migration 013: Create storage_batches table
- [ ] Create storageService with CRUD
- [ ] Update storageStore to use Supabase
- [ ] Seed script for test operations
- [ ] Remove `storageDefinitions.ts`

**Deliverable:** Storage on Supabase

---

### Sprint N+3: Preparations

**Goal:** Migrate Preparations to Supabase

**Tasks:**

- [ ] Migration 014: Create preparations table
- [ ] Create preparationsService
- [ ] Update preparationStore to use Supabase
- [ ] Seed script for test preparations
- [ ] Remove `preparationMock.ts`

**Deliverable:** All Backoffice stores on Supabase

---

### Sprint N+4: Production Preparation

**Goal:** Prepare for v1.0 release

**Week 1: Google Sheets Import**

- [ ] Set up Google Sheets API
- [ ] Create import script
- [ ] Map Google Sheets columns to Supabase schema
- [ ] Test import on Development DB
- [ ] Verify data integrity

**Week 2: Production Database Setup**

- [ ] Create Production Supabase project
- [ ] Apply all migrations to Production
- [ ] Import real data from Google Sheets
- [ ] Test with real data
- [ ] Backup production data

**Week 3: Final Testing**

- [ ] TypeScript build succeeds
- [ ] All tests pass
- [ ] End-to-end smoke tests
- [ ] User acceptance testing

**Week 4: Deployment**

- [ ] Deploy v1.0 to production
- [ ] Monitor for critical issues
- [ ] User training
- [ ] Gather feedback

**Deliverable:** v1.0 LIVE! 🚀

---

## ✅ 7. Production Readiness Checklist

### Database

- [ ] All stores migrated to Supabase
- [ ] All migrations tested on Development DB
- [ ] All migrations applied to Production DB
- [ ] Real data imported from Google Sheets
- [ ] Backup strategy in place
- [ ] RLS policies configured
- [ ] Indexes optimized

### Code

- [ ] No `*mock.ts` files in src/
- [ ] All imports point to services (not mocks)
- [ ] TypeScript build succeeds with 0 errors
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Error handling tested
- [ ] Offline mode tested (POS)

### Data

- [ ] Test data available via seed scripts
- [ ] Real data in Production DB
- [ ] Data integrity verified
- [ ] No mock data in Production

### Infrastructure

- [ ] Development DB configured
- [ ] Production DB configured
- [ ] Environment files (.env.development, .env.production)
- [ ] Hosting configured (Vercel/Netlify)
- [ ] SSL certificate configured
- [ ] Domain configured

### Documentation

- [ ] README updated
- [ ] Deployment guide created
- [ ] User guides created
- [ ] API documentation (if needed)

---

## 🎯 8. Next Actions

### Immediate (This Week)

1. **Create Seed Script Infrastructure**

   - [ ] Create `scripts/seeds/` directory structure
   - [ ] Create base seed script template
   - [ ] Create `/seed-db` command
   - [ ] Test with products seed

2. **Audit Mock Files**

   - [ ] List all 12 mock files
   - [ ] Identify dependencies
   - [ ] Plan migration order

3. **Start Menu Migration**
   - [ ] Create Migration 006 (menu tables)
   - [ ] Create menuService
   - [ ] Test CRUD operations

---

### Short-term (Next 2 Weeks)

1. **Complete Menu Migration**
2. **Start Suppliers Migration**
3. **Create first Google Sheets import script (products only)**
4. **Test import workflow**

---

### Mid-term (Next Month)

1. **Complete all Backoffice stores migration**
2. **Remove all mock files**
3. **Complete Google Sheets import script**
4. **Create Production Supabase project**

---

### Long-term (Release)

1. **Import real data to Production**
2. **Fix TypeScript build**
3. **Deploy v1.0**
4. **Train users**

---

## 📌 Key Decisions Made

1. ✅ **Single Database Strategy (for now)**

   - Work with Development DB until all migrations complete
   - Create Production DB only when ready for release

2. ✅ **Seed Scripts > Mock Files**

   - All mock data → seed scripts
   - Clear separation: test data (seeds) vs real data (Google Sheets)

3. ✅ **Google Sheets as Real Data Source**

   - Import script for production data
   - Keep Google Sheets as master for editing

4. ✅ **Migration Order**
   - Products ✅ Categories ✅ → Suppliers → Menu → Recipes → Storage → Preparations

---

## 🔗 Related Documents

- **[todo.md](./todo.md)** - Current sprint tasks (Backoffice migration)
- **[BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md)** - Detailed migration plan
- **[PRIORITIES.md](./PRIORITIES.md)** - Weekly priorities
- **[next_todo.md](./next_todo.md)** - Offline sync (Sprint 9+)
- **[SupabaseGlobalTodo.md](./SupabaseGlobalTodo.md)** - Global Supabase roadmap

---

**Mantra:** "Clean migrations → Seed scripts → Real data → Production ready"

---

**Last Updated:** 2025-11-16
**Next Review:** Weekly (Monday)
**Owner:** Development Team
