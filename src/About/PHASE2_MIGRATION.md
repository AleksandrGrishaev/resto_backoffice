# 🚀 Phase 2: Supabase-Only Migration (Remove localStorage Fallbacks)

**Created:** 2025-11-18
**Status:** Planning
**Goal:** Remove dual-write pattern, migrate to Supabase-only for all stores

---

## 📊 Current State (End of Phase 1)

### ✅ Phase 1 Completed (Dual-Write Pattern)

All stores migrated to Supabase with **localStorage fallback**:

**Pattern used:**

```typescript
// Dual-write: Supabase primary, localStorage backup
async function save(entity) {
  try {
    await supabase.from('table').upsert(entity)
    localStorage.setItem(key, JSON.stringify(entity)) // Backup
  } catch (error) {
    console.error('Supabase failed, using localStorage')
    localStorage.setItem(key, JSON.stringify(entity))
  }
}

async function load() {
  try {
    const { data } = await supabase.from('table').select('*')
    localStorage.setItem(key, JSON.stringify(data)) // Cache
    return data
  } catch (error) {
    console.error('Supabase failed, using localStorage cache')
    return JSON.parse(localStorage.getItem(key) || '[]')
  }
}
```

**Stores with dual-write:**

- ✅ Products (productsStore)
- ✅ Menu (menuStore)
- ✅ Recipes (recipesStore)
- ✅ Preparations (preparationStore)
- ✅ Counteragents/Suppliers (counteragentsStore, supplier_2)
- ✅ Storage (storageStore)
- ✅ Account (accountStore)
- ✅ Sales (salesStore)
- ✅ Recipe Write-offs (recipeWriteOffService)
- ✅ POS (ordersStore, paymentsStore, shiftsStore, tablesStore)

---

## 🎯 Phase 2 Goal

**Remove localStorage fallbacks** and migrate to **Supabase-only**:

**New pattern:**

```typescript
// Supabase-only: No fallback, proper error handling
async function save(entity) {
  const { error } = await supabase.from('table').upsert(entity)
  if (error) throw new DatabaseError(error.message)
}

async function load() {
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw new DatabaseError(error.message)
  return data
}
```

**Benefits:**

- Single source of truth (Supabase)
- Real-time sync across devices
- Better error handling and user feedback
- Smaller bundle size (no localStorage logic)
- Easier to debug (no dual-state issues)

**Risks:**

- Requires stable internet connection
- Need proper offline handling (POS only)
- Need proper error UI (loading states, retry buttons)

---

## 📋 Migration Strategy

### Step-by-Step Approach

**Order:** Catalog → Operations → Testing

1. **Catalog stores first** (less critical, easier to test)

   - Products
   - Categories
   - Menu
   - Recipes
   - Preparations
   - Counteragents/Suppliers

2. **Operational stores second** (more critical, need careful testing)

   - Storage (warehouses, batches, operations)
   - Account (accounts, transactions, pending payments)
   - Sales (transactions)
   - Recipe Write-offs

3. **POS stores last** (most critical, need offline-first strategy)
   - Tables
   - Orders
   - Payments
   - Shifts

**Testing after each step:**

- ✅ Data loads correctly from Supabase
- ✅ CRUD operations work (create, read, update, delete)
- ✅ Error states handled gracefully
- ✅ Loading states shown in UI
- ✅ No localStorage remnants

---

## 🔴 Phase 2.1: Catalog Stores (Week 1-2)

### Store: Products

**Location:** `src/stores/productsStore/`

**Current dual-write locations:**

- `services.ts` - productService methods
- `index.ts` - productsStore.initialize()

**Migration tasks:**

- [ ] Remove localStorage fallback from `getAllProducts()`
- [ ] Remove localStorage cache writes
- [ ] Add proper error handling
- [ ] Add loading states to ProductsList.vue
- [ ] Test: Load products in Backoffice
- [ ] Test: Create/edit product
- [ ] Test: Network failure shows error UI

**Testing checklist:**

- [ ] Products load on app start
- [ ] Creating new product saves to Supabase only
- [ ] Editing product updates Supabase only
- [ ] Deleting product removes from Supabase only
- [ ] Error state shows when Supabase unavailable
- [ ] No localStorage writes occur

---

### Store: Menu

**Location:** `src/stores/menu/`

**Current dual-write locations:**

- `services.ts` - menuService methods
- `menuStore.ts` - initialize()

**Migration tasks:**

- [ ] Remove localStorage fallback from `getAllMenuItems()`
- [ ] Remove localStorage cache writes
- [ ] Add proper error handling
- [ ] Add loading states to MenuView.vue
- [ ] Test: Load menu in Backoffice
- [ ] Test: POS can read menu items
- [ ] Test: Create/edit menu item

**Testing checklist:**

- [ ] Menu items load in Backoffice
- [ ] Menu items load in POS
- [ ] CRUD operations work
- [ ] Error state shows on failure
- [ ] No localStorage writes

---

### Store: Recipes

**Location:** `src/stores/recipes/`

**Current dual-write locations:**

- `services.ts` - recipesService methods
- `recipesStore.ts` - initialize()

**Migration tasks:**

- [ ] Remove localStorage fallback from `getAllRecipes()`
- [ ] Remove localStorage cache writes
- [ ] Add proper error handling
- [ ] Add loading states to RecipesView.vue
- [ ] Test: Recipe decomposition still works
- [ ] Test: Menu → Recipe → Preparation → Product chain

**Testing checklist:**

- [ ] Recipes load correctly
- [ ] Recipe components load
- [ ] Recipe steps load
- [ ] Decomposition engine works (menu sales → write-offs)
- [ ] CRUD operations work
- [ ] No localStorage writes

---

### Store: Preparations

**Location:** `src/stores/preparation/`

**Current dual-write locations:**

- `services.ts` - preparationService methods
- `preparationStore.ts` - initialize()

**Migration tasks:**

- [ ] Remove localStorage fallback
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Test: Preparations load
- [ ] Test: Used in recipe decomposition

**Testing checklist:**

- [ ] Preparations load correctly
- [ ] Ingredients load correctly
- [ ] Used in recipe decomposition (menu → recipe → preparation → product)
- [ ] CRUD operations work
- [ ] No localStorage writes

---

### Store: Counteragents/Suppliers

**Location:** `src/stores/counteragents/`, `src/stores/supplier_2/`

**Current dual-write locations:**

- `counteragents/services.ts`
- `supplier_2/services.ts`

**Migration tasks:**

- [ ] Remove localStorage fallback
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Test: Supplier list loads
- [ ] Test: Purchase order flow

**Testing checklist:**

- [ ] Counteragents load correctly
- [ ] Suppliers load correctly
- [ ] Procurement flow works (request → order → receipt)
- [ ] Purchase order → Pending payment → Transaction flow
- [ ] CRUD operations work
- [ ] No localStorage writes

---

## 🟡 Phase 2.2: Operational Stores (Week 3-4)

### Store: Storage

**Location:** `src/stores/storage/`

**Current dual-write locations:**

- `services.ts` - storageService methods
- `storageStore.ts` - composables (useWriteOff, useInventory)

**Migration tasks:**

- [ ] Remove localStorage fallback from all operations
- [ ] Add proper error handling
- [ ] Add loading states to StorageView.vue
- [ ] Test: Warehouse management
- [ ] Test: Batch tracking (FIFO)
- [ ] Test: Storage operations (receipt, write-off, correction)
- [ ] Test: Integration with sales write-offs

**Testing checklist:**

- [ ] Warehouses load correctly
- [ ] Batches load with FIFO ordering
- [ ] Storage operations CRUD works
- [ ] Receipt operation creates batches
- [ ] Write-off operation updates batches (FIFO)
- [ ] Sales → Write-off → Storage flow works
- [ ] Inventory documents load
- [ ] No localStorage writes

**Critical:** This store is used by Sales Write-offs - ensure integration works!

---

### Store: Account

**Location:** `src/stores/account/`

**Current dual-write locations:**

- `services.ts` - accountService methods
- `accountStore.ts` - initialize()

**Migration tasks:**

- [ ] Remove localStorage fallback
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Test: Accounts load
- [ ] Test: Transactions load
- [ ] Test: Pending payments load
- [ ] Test: Supplier → Account integration

**Testing checklist:**

- [ ] Accounts load (acc_1, acc_2, acc_3)
- [ ] Transactions load with correct balances
- [ ] Pending payments load
- [ ] Purchase order creates pending payment
- [ ] Receipt creates transaction
- [ ] Shift end creates income transaction
- [ ] Balance calculations correct
- [ ] No localStorage writes

**Critical:** This store is used by Suppliers and POS Shifts - ensure integration works!

---

### Store: Sales

**Location:** `src/stores/sales/`

**Current dual-write locations:**

- `services.ts` - salesService methods
- `salesStore.ts` - processSale()

**Migration tasks:**

- [ ] Remove localStorage fallback from `getAllTransactions()`
- [ ] Remove localStorage fallback from `saveSalesTransaction()`
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Test: POS payment → Sales transaction flow
- [ ] Test: Profit calculation
- [ ] Test: Sales → Write-off flow

**Testing checklist:**

- [ ] Sales transactions load
- [ ] POS payment creates sales transaction
- [ ] Profit calculation correct (revenue - cost)
- [ ] Decomposition summary correct
- [ ] Department filter works (kitchen/bar)
- [ ] Sales → Write-off flow works
- [ ] No localStorage writes

**Critical:** This store is triggered by POS payments - ensure real-time flow works!

---

### Store: Recipe Write-offs

**Location:** `src/stores/sales/recipeWriteOff/`

**Current dual-write locations:**

- `services.ts` - recipeWriteOffService methods

**Migration tasks:**

- [ ] Remove localStorage fallback from `getAllWriteOffs()`
- [ ] Remove localStorage fallback from `saveWriteOff()`
- [ ] Add proper error handling
- [ ] Test: Sales → Write-off flow
- [ ] Test: Recipe decomposition
- [ ] Test: Storage batch updates

**Testing checklist:**

- [ ] Write-offs load correctly
- [ ] Sales transaction creates write-off
- [ ] Recipe decomposition works (menu → recipe → preparation → product)
- [ ] Write-off items correct (quantities, costs, batches)
- [ ] Storage batches updated (FIFO)
- [ ] No localStorage writes

**Critical:** This store links Sales → Storage - ensure chain works!

---

## 🟢 Phase 2.3: POS Stores (Week 5-6) ⚠️ SPECIAL HANDLING

### Strategy: Keep Offline-First for POS

**Important:** POS stores should **NOT** remove localStorage completely!

**Why:**

- POS must work without internet (critical business requirement)
- Offline-first architecture already implemented (Sprint 6 SyncService)
- Dual-write is intentional for POS operations

**Phase 2 changes for POS:**

- ✅ Keep dual-write pattern (Supabase + localStorage)
- ✅ Keep SyncService for background sync
- ✅ Improve error handling (better retry logic)
- ✅ Add loading states to POS UI
- ⚠️ DO NOT remove localStorage fallbacks

**POS stores to review (but not change architecture):**

- Tables (tablesStore)
- Orders (ordersStore)
- Payments (paymentsStore)
- Shifts (shiftsStore)

**Testing checklist:**

- [ ] POS works online (Supabase primary)
- [ ] POS works offline (localStorage fallback)
- [ ] SyncService processes queue when online
- [ ] Network transitions handled gracefully
- [ ] No data loss during offline → online transition

---

## 🧪 Testing Strategy

### Per-Store Testing (After Each Migration)

**1. Unit Tests:**

- Service methods work with Supabase-only
- Error cases handled properly
- No localStorage calls

**2. Integration Tests:**

- Store initialization works
- CRUD operations work
- Cross-store integrations work (e.g., Sales → Write-off → Storage)

**3. UI Tests:**

- Loading states shown
- Error states shown
- Data displays correctly
- User actions work (create, edit, delete)

**4. Network Tests:**

- Works with stable internet
- Shows error when internet fails
- Retry mechanism works (if implemented)

**5. Manual Testing:**

- Open app in browser
- Verify store loads data
- Test CRUD operations
- Disconnect internet → verify error UI
- Reconnect internet → verify works again

---

### End-to-End Testing (After All Stores Migrated)

**Test Flow 1: Catalog → POS → Sales**

1. Create product in Backoffice
2. Create menu item using product
3. Create recipe linking menu item → product
4. Create order in POS with menu item
5. Process payment
6. Verify: Sales transaction created
7. Verify: Recipe write-off created
8. Verify: Storage batches updated

**Test Flow 2: Supplier → Account**

1. Create procurement request
2. Create purchase order
3. Create receipt
4. Verify: Pending payment created
5. Verify: Account transaction created
6. Verify: Account balance updated

**Test Flow 3: POS → Account**

1. Start shift
2. Create order and payment
3. End shift
4. Verify: Shift data saved
5. Verify: Income transaction created
6. Verify: Account balance updated

---

## 📝 Code Changes Template

### Service Layer Changes

**Before (Dual-write):**

```typescript
// src/stores/menu/services.ts
async getAllMenuItems(): Promise<MenuItem[]> {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name')

    if (error) throw error

    // ❌ Remove this: localStorage cache write
    localStorage.setItem('menu_items_cache', JSON.stringify(data))

    return data.map(fromSupabase)
  } catch (error) {
    // ❌ Remove this: localStorage fallback
    console.error('Supabase failed, using localStorage cache')
    const cached = localStorage.getItem('menu_items_cache')
    return cached ? JSON.parse(cached).map(fromSupabase) : []
  }
}
```

**After (Supabase-only):**

```typescript
// src/stores/menu/services.ts
async getAllMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('name')

  if (error) {
    // ✅ Proper error handling
    throw new DatabaseError('Failed to load menu items', error)
  }

  return data.map(fromSupabase)
}
```

---

### Store Layer Changes

**Before (Dual-write):**

```typescript
// src/stores/menu/menuStore.ts
async initialize() {
  try {
    this.menuItems = await menuService.getAllMenuItems()
    console.log('✅ Menu loaded from Supabase')
  } catch (error) {
    // ❌ Remove this: silent failure with localStorage fallback
    console.error('Failed to load menu:', error)
  }
}
```

**After (Supabase-only):**

```typescript
// src/stores/menu/menuStore.ts
async initialize() {
  this.loading = true
  this.error = null

  try {
    this.menuItems = await menuService.getAllMenuItems()
    DebugUtils.info('MenuStore', 'Menu loaded from Supabase', {
      count: this.menuItems.length
    })
  } catch (error) {
    // ✅ Proper error handling
    this.error = error instanceof Error ? error.message : 'Failed to load menu'
    DebugUtils.error('MenuStore', 'Failed to load menu', { error })
    throw error // Re-throw so UI can handle it
  } finally {
    this.loading = false
  }
}
```

---

### UI Layer Changes

**Add loading/error states to views:**

```vue
<!-- src/views/menu/MenuView.vue -->
<template>
  <div>
    <!-- ✅ Loading state -->
    <v-progress-linear v-if="menuStore.loading" indeterminate />

    <!-- ✅ Error state -->
    <v-alert v-if="menuStore.error" type="error" class="mb-4">
      {{ menuStore.error }}
      <v-btn @click="retry" color="primary" class="ml-4">Retry</v-btn>
    </v-alert>

    <!-- ✅ Content state -->
    <div v-if="!menuStore.loading && !menuStore.error">
      <!-- Menu items list -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()

async function retry() {
  await menuStore.initialize()
}
</script>
```

---

## ⚠️ Migration Checklist (Per Store)

### Code Changes

- [ ] Remove localStorage fallback from service methods
- [ ] Remove localStorage cache writes
- [ ] Add proper error throwing (DatabaseError)
- [ ] Add loading state to store (this.loading = true/false)
- [ ] Add error state to store (this.error = null/message)
- [ ] Update initialize() to handle errors properly

### UI Changes

- [ ] Add loading indicator (v-progress-linear, v-skeleton-loader)
- [ ] Add error alert with retry button
- [ ] Add empty state (when data.length === 0)
- [ ] Test loading → success flow
- [ ] Test loading → error flow

### Testing

- [ ] Service methods work with Supabase
- [ ] Service methods throw proper errors
- [ ] Store initialize() works
- [ ] Store shows loading state
- [ ] Store shows error state
- [ ] UI shows loading indicator
- [ ] UI shows error alert
- [ ] Retry button works
- [ ] No localStorage calls remain

### Verification

- [ ] Check browser DevTools → localStorage (should be empty for this store)
- [ ] Check Network tab → Supabase requests succeed
- [ ] Check Console → no localStorage warnings
- [ ] Disconnect internet → error UI shows
- [ ] Reconnect internet → retry works

---

## 📊 Progress Tracking

### Phase 2.1: Catalog Stores

- [ ] Products (Day 1-2)
- [ ] Menu (Day 3-4)
- [ ] Recipes (Day 5-6)
- [ ] Preparations (Day 7-8)
- [ ] Counteragents/Suppliers (Day 9-10)

### Phase 2.2: Operational Stores

- [ ] Storage (Day 11-13)
- [ ] Account (Day 14-15)
- [ ] Sales (Day 16-17)
- [ ] Recipe Write-offs (Day 18-19)

### Phase 2.3: POS Stores

- [ ] Review POS architecture (Day 20)
- [ ] Improve error handling (Day 21)
- [ ] Add loading states to POS UI (Day 22)
- [ ] Test offline → online transitions (Day 23)

### Phase 2.4: End-to-End Testing

- [ ] Test Flow 1: Catalog → POS → Sales (Day 24)
- [ ] Test Flow 2: Supplier → Account (Day 25)
- [ ] Test Flow 3: POS → Account (Day 26)
- [ ] Fix any issues found (Day 27-28)

### Phase 2.5: Cleanup

- [ ] Remove all localStorage fallback code
- [ ] Remove mock files (if any remain)
- [ ] Update documentation
- [ ] Update CLAUDE.md
- [ ] Create Phase 2 completion report

---

## 🎯 Success Criteria

### Technical

- ✅ All catalog stores use Supabase-only (no localStorage)
- ✅ All operational stores use Supabase-only (no localStorage)
- ✅ POS stores keep offline-first (dual-write)
- ✅ All stores have proper error handling
- ✅ All views have loading/error states
- ✅ No localStorage calls for non-POS stores
- ✅ All integration tests pass
- ✅ All end-to-end flows work

### User Experience

- ✅ App loads quickly
- ✅ Loading states shown during data fetch
- ✅ Error states shown when Supabase fails
- ✅ Retry buttons work
- ✅ POS works offline
- ✅ No silent failures
- ✅ No stale data issues

### Code Quality

- ✅ No localStorage remnants in non-POS code
- ✅ Consistent error handling pattern
- ✅ Consistent loading state pattern
- ✅ Proper TypeScript types
- ✅ No console warnings
- ✅ Build succeeds

---

## 🔗 Related Documents

- **[todo.md](./todo.md)** - Current sprint (Phase 1 complete)
- **[PrepProduction.md](./PrepProduction.md)** - Production preparation strategy
- **[BACKOFFICE_MIGRATION.md](./BACKOFFICE_MIGRATION.md)** - Phase 1 migration plan
- **[next_todo.md](./next_todo.md)** - Offline sync (Sprint 9+)

---

**Mantra:** "Single source of truth → Better UX → Production ready"

---

**Last Updated:** 2025-11-18
**Status:** Planning Phase 2.1 (Catalog Stores)
**Next Step:** Start with Products store migration
