# 🏢 Backoffice → Supabase Migration Plan

**Goal:** Migrate all Backoffice stores from localStorage to Supabase for v1.0 release

**Status:** Planning
**Priority:** 🔴 CRITICAL (blocks v1.0 release)
**Timeline:** 1 week

---

## 📊 Current State

### ✅ Already Migrated (POS):

- **Shifts** → Supabase (dual-write) ✅
- **Orders** → Supabase (dual-write) ✅
- **Payments** → Supabase (dual-write) ✅
- **Tables** → Supabase (dual-write) ✅

### ❌ Still on localStorage (Backoffice):

- **Products** → localStorage only
- **Menu** → localStorage only
- **Recipes** → localStorage only
- **Storage** → localStorage only
- **Suppliers** → localStorage only
- **Counteragents** → localStorage only
- **Preparations** → localStorage only
- **Sales** → localStorage only

---

## 🎯 Migration Strategy

### Phase 1: Read-Only Migration (Day 1-2)

**Goal:** Backoffice reads POS data from Supabase

**Entities:** Orders, Payments, Shifts, Tables
**Approach:** Change READ operations to Supabase, keep WRITE in POS only

#### Tasks:

**1.1 Orders - Backoffice Views** (4-6 hours)

- [ ] Check which Backoffice views read orders
- [ ] Update to use `ordersService.getAllOrders()` (already uses Supabase)
- [ ] Test order history display
- [ ] Test order details view

**Files to check:**

```bash
grep -r "orders" src/views/ --include="*.vue" | grep -v pos | grep -v kitchen
```

**1.2 Payments - Backoffice Views** (2-4 hours)

- [ ] Check which Backoffice views read payments
- [ ] Update to use `paymentsService.getAllPayments()` (already uses Supabase)
- [ ] Test payment history
- [ ] Test reports

**1.3 Shifts - Backoffice Views** (2-4 hours)

- [ ] Check shift history views
- [ ] Update to use `shiftsService.getAllShifts()` (already uses Supabase)
- [ ] Test shift reports
- [ ] Test cash reconciliation

**Expected Result:** Backoffice shows POS data from Supabase ✅

---

### Phase 2: Products & Menu Migration (Day 3-4)

**Goal:** Products and Menu in Supabase (used by both POS and Backoffice)

**Critical:** POS needs to READ products/menu for order creation

#### Tasks:

**2.1 Create Supabase Migrations** (2-3 hours)

Create migration files:

**Migration 004: Products Table**

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);
```

**Migration 005: Menu Tables**

```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  department TEXT CHECK (department IN ('kitchen', 'bar')) DEFAULT 'kitchen',
  available BOOLEAN DEFAULT true,

  -- Recipe composition (JSONB array)
  recipe JSONB, -- [{type: 'product', id: '...', quantity: 100}]

  -- Variants (JSONB array)
  variants JSONB, -- [{id: '...', name: 'Large', price: 75000, composition: [...]}]

  -- Modifiers (JSONB array)
  modifiers JSONB, -- [{id: '...', name: 'Extra Cheese', price: 5000}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_department ON menu_items(department);
CREATE INDEX idx_menu_items_available ON menu_items(available);
```

**2.2 Data Migration Script** (3-4 hours)

Create script to move existing data:

```typescript
// scripts/migrateProductsToSupabase.ts

import { productsStore } from '@/stores/productsStore'
import { menuStore } from '@/stores/menu'
import { supabase } from '@/supabase/client'

async function migrateProducts() {
  const products = productsStore.products

  for (const product of products) {
    await supabase.from('products').insert({
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      cost_per_unit: product.costPerUnit,
      stock_quantity: product.stockQuantity,
      min_stock_level: product.minStockLevel
    })
  }

  console.log(`✅ Migrated ${products.length} products`)
}

async function migrateMenu() {
  // Similar for menu items...
}
```

**2.3 Create Supabase Services** (4-6 hours)

**File:** `src/stores/productsStore/services.ts`

```typescript
import { supabase } from '@/supabase/client'

export const productsService = {
  async getAllProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name')

    if (error) throw error
    return data.map(fromSupabase)
  },

  async createProduct(product) {
    const { data, error } = await supabase
      .from('products')
      .insert(toSupabaseInsert(product))
      .select()
      .single()

    if (error) throw error
    return fromSupabase(data)
  }

  // ... update, delete methods
}
```

**File:** `src/stores/menu/services.ts`

```typescript
// Similar structure for menu
```

**2.4 Update Stores** (2-3 hours)

Update `productsStore` to use Supabase service:

```typescript
// src/stores/productsStore/productsStore.ts

async initialize() {
  try {
    this.products = await productsService.getAllProducts()
    console.log('✅ Products loaded from Supabase')
  } catch (error) {
    console.error('❌ Failed to load products:', error)
    // Fallback to localStorage if needed
  }
}
```

**2.5 Test Integration** (2-3 hours)

- [ ] POS can read products for menu
- [ ] POS can read menu items
- [ ] Backoffice can CRUD products
- [ ] Backoffice can CRUD menu items
- [ ] Changes visible in both POS and Backoffice

---

### Phase 3: Remaining Stores (Day 5-6)

**Goal:** Migrate Storage, Suppliers, Recipes, etc.

**Priority:** MEDIUM (not critical for v1.0)

#### Optional Migrations:

**Recipes** → Can stay in localStorage for v1.0 (used only in Backoffice)
**Storage** → Can stay in localStorage for v1.0 (inventory management)
**Suppliers** → Can stay in localStorage for v1.0 (procurement)
**Counteragents** → Can stay in localStorage for v1.0
**Preparations** → Can stay in localStorage for v1.0
**Sales** → Already tracks to Supabase via POS payments

**Decision:** Migrate these in Sprint 8-9 (after v1.0 release)

---

### Phase 4: TypeScript Build Fix (Day 6-7)

**Goal:** Fix build errors for production deployment

- [ ] Run `pnpm build`
- [ ] Fix critical type errors
- [ ] Suppress non-critical warnings
- [ ] Verify build succeeds

---

## 📋 Week Schedule

### Monday (Day 1): Read-Only Migration

- ⏰ Morning: Orders views → Supabase
- ⏰ Afternoon: Payments & Shifts views → Supabase
- 🎯 Goal: Backoffice shows POS data

### Tuesday (Day 2): Products Migration Prep

- ⏰ Morning: Create Migration 004 (Products table)
- ⏰ Afternoon: Create Migration 005 (Menu tables)
- 🎯 Goal: Database schema ready

### Wednesday (Day 3): Products Migration

- ⏰ Morning: Data migration script
- ⏰ Afternoon: Products service + store update
- 🎯 Goal: Products in Supabase

### Thursday (Day 4): Menu Migration

- ⏰ Morning: Menu service + store update
- ⏰ Afternoon: Testing (POS + Backoffice)
- 🎯 Goal: Menu in Supabase

### Friday (Day 5): TypeScript & Build

- ⏰ Morning: Fix build errors
- ⏰ Afternoon: Production testing
- 🎯 Goal: Build succeeds ✅

### Saturday (Day 6): Deploy v1.0

- ⏰ Deploy to production
- ⏰ Verify all features work
- 🎯 Goal: v1.0 LIVE! 🚀

---

## 🎯 v1.0 Release Criteria

### Must Have:

- ✅ POS → Supabase (Orders, Payments, Shifts, Tables)
- ✅ Kitchen/Bar → Supabase (Realtime sync)
- ✅ Products → Supabase (READ for POS, CRUD for Backoffice)
- ✅ Menu → Supabase (READ for POS, CRUD for Backoffice)
- ✅ Backoffice reads POS data from Supabase
- ✅ Build succeeds (no TypeScript errors)
- ✅ All core flows tested

### Nice to Have (v1.1):

- 🔵 Recipes → Supabase
- 🔵 Storage → Supabase
- 🔵 Suppliers → Supabase
- 🔵 Offline sync queue
- 🔵 Conflict resolution

---

## 🚨 Critical Path

```
Day 1-2: Backoffice reads POS data ✅
   ↓
Day 3-4: Products & Menu → Supabase ✅
   ↓
Day 5: TypeScript build fix ✅
   ↓
Day 6: Deploy v1.0 🚀
```

**Blocker:** If Products/Menu migration fails, POS can't create orders with menu items

**Mitigation:** Keep localStorage fallback for Products/Menu (read from both)

---

## 📝 Testing Checklist

### Pre-Migration Tests:

- [ ] Export all localStorage data (backup)
- [ ] Document current Backoffice workflows
- [ ] Create test dataset

### Post-Migration Tests:

**POS:**

- [ ] Can load products for menu
- [ ] Can create orders with menu items
- [ ] Orders save to Supabase
- [ ] Payments save to Supabase

**Backoffice:**

- [ ] Can view order history (from Supabase)
- [ ] Can view payment history (from Supabase)
- [ ] Can view shift reports (from Supabase)
- [ ] Can CRUD products
- [ ] Can CRUD menu items
- [ ] Changes visible in POS immediately

**Cross-System:**

- [ ] Create product in Backoffice → visible in POS
- [ ] Create menu item in Backoffice → visible in POS
- [ ] Create order in POS → visible in Backoffice
- [ ] Process payment in POS → visible in Backoffice

---

## 🔗 Related Files

- **SupabaseGlobalTodo.md** - Global migration roadmap
- **PRIORITIES.md** - Weekly priorities
- **todo.md** - Current tasks
- **next_todo.md** - Offline sync plan

---

**Created:** 2025-11-16
**Target:** v1.0 Release (2025-11-23)
**Status:** Ready to start
