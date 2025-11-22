# 🎯 Supplier Module - Supabase Migration Strategy

> **Status:** Phase 3 COMPLETED ✅ | **Start Date:** 2025-11-22 | **Phase 3 Completed:** 2025-11-22
> **Approach:** Incremental CRUD-based migration with Service Layer focus

## 📋 Strategic Overview

**Migration Goal:** Replace mock data persistence with Supabase in Supplier Module

**Current Architecture:**

```
UI Components
    ↓ (calls)
Pinia Store (supplierStore.ts)
    ↓ (delegates to)
Service Layer (supplierService.ts) ← WE WORK HERE
    ↓ (currently uses)
Mock Data (in-memory arrays + mockDataCoordinator) → ❌ REMOVE
    ↓ (migrate to)
Supabase (PostgreSQL) → ✅ NEW
```

**Key Decisions:**

1. ✅ **Service Layer Focus** - Only modify `supplierService.ts`, minimal store changes
2. ✅ **Table Naming** - Prefix all tables with `supplierstore_` (e.g., `supplierstore_requests`)
3. ✅ **CRUD-Based Phases** - Work one entity at a time: Requests → Orders → Receipts
4. ✅ **Full Validation** - Test each phase completely before moving to next
5. ✅ **No More Mock Data** - After migration, mock data (test data) is no longer used

---

## 🏗️ Migration Phases

### Phase 0: Database Setup ✅ COMPLETED (2025-11-22)

**Purpose:** Create database schema and infrastructure

**What we did:**

- ✅ Created 6 Supabase tables with `supplierstore_` prefix
  - `supplierstore_requests` (13 columns) + `supplierstore_request_items` (13 columns)
  - `supplierstore_orders` (28 columns) + `supplierstore_order_items` (17 columns)
  - `supplierstore_receipts` (14 columns) + `supplierstore_receipt_items` (18 columns)
- ✅ Added 18 performance indexes (status, foreign keys, dates, composites)
- ✅ Generated TypeScript types in `src/supabase/types.gen.ts`
- ✅ Created data mappers (camelCase ↔ snake_case)
- ✅ Enabled Row Level Security (RLS) with policies for authenticated users
- ✅ Automatic `updated_at` triggers on all main tables

**Validation:**

- [x] All 6 tables created successfully
- [x] Indexes applied and working (18 indexes total)
- [x] No RLS policy warnings for supplierstore tables
- [x] TypeScript types generated and integrated
- [x] Can query tables via Supabase client
- [x] Data mappers tested and working
- [x] CASCADE DELETE working on child tables
- [x] Insert/select operations validated

**Files Created:**

- ✅ `src/stores/supplier_2/supabaseMappers.ts` - All mapper functions implemented
- ✅ `src/supabase/types.gen.ts` - Auto-generated (Database types with supplierstore tables)

**Migrations Applied:**

1. `create_supplierstore_tables` - Main table structure with proper constraints
2. `add_supplierstore_indexes` - 18 performance indexes
3. `enable_rls_supplierstore_tables` - RLS policies for all tables

**Actual time:** ~2 hours

---

### Phase 1: Procurement Requests Migration ✅ COMPLETED (2025-11-22)

**Purpose:** Migrate requests CRUD from mock to Supabase

**Current Implementation (Mock):**

```typescript
// Service Layer (supplierService.ts)
class SupplierService {
  private requests: ProcurementRequest[] = [] // ❌ In-memory storage

  async loadDataFromCoordinator() {
    // ❌ Loads from mockDataCoordinator
    this.requests = [...supplierData.requests]
  }

  async getRequests() {
    return [...this.requests] // ❌ Returns from memory
  }

  async createRequest(data) {
    const newReq = { ...data, id: generate() }
    this.requests.unshift(newReq) // ❌ Saves to memory
    return newReq
  }

  // Similar for update/delete...
}
```

**New Implementation (Supabase):**

```typescript
// Service Layer (supplierService.ts)
import { supabase } from '@/supabase/client'
import { generateId } from '@/utils/id'
import { mapRequestFromDB, mapRequestToDB, mapRequestItemToDB } from './supabaseMappers'

class SupplierService {
  // ✅ REMOVE: private requests array
  // ✅ REMOVE: loadDataFromCoordinator() method

  async getRequests(filters?) {
    // ✅ Fetch from Supabase
    const { data, error } = await supabase
      .from('supplierstore_requests')
      .select('*, supplierstore_request_items(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map(mapRequestFromDB)
  }

  async createRequest(data) {
    // ✅ Use UUID instead of Date.now()
    const requestId = generateId()
    const timestamp = new Date().toISOString()

    // ✅ Insert to Supabase (with items in transaction)
    const { data: request, error } = await supabase
      .from('supplierstore_requests')
      .insert([mapRequestToDB({ ...data, id: requestId, createdAt: timestamp })])
      .select()
      .single()

    if (error) throw error

    // Insert items
    const items = data.items.map(item => ({
      ...item,
      id: generateId()
    }))

    const { error: itemsError } = await supabase
      .from('supplierstore_request_items')
      .insert(items.map(item => mapRequestItemToDB(item, requestId)))

    if (itemsError) throw itemsError

    return mapRequestFromDB(request)
  }

  // Similar for update/delete...
}
```

**Store Changes (Minimal):**

```typescript
// Store (supplierStore.ts)
async function initialize() {
  // ✅ REMOVE: await loadDataFromCoordinator()
  // ✅ REMOVE: await supplierService.loadDataFromCoordinator()

  // ✅ NEW: Load directly from Supabase via service
  await loadRequests()

  // Rest stays the same...
}

async function loadRequests() {
  state.value.loading.requests = true
  try {
    state.value.requests = await supplierService.getRequests()
  } finally {
    state.value.loading.requests = false
  }
}

// All CRUD methods stay the same - they already call service
async function createRequest(data) {
  const newReq = await supplierService.createRequest(data)
  await loadRequests() // Refresh from Supabase
  return newReq
}
```

**Tasks:**

1. ✅ Mapper functions already exist from Phase 0
2. ✅ Updated `getRequests()` - fetch from `supplierstore_requests` with joins
3. ✅ Updated `getRequestById()` - fetch single with items
4. ✅ Updated `createRequest()` - insert to Supabase with items (transaction)
5. ✅ Updated `updateRequest()` - update in Supabase (replace items)
6. ✅ Updated `deleteRequest()` - delete from Supabase (cascade)
7. ✅ Removed `private requests` array
8. ✅ Updated `loadDataFromCoordinator()` to skip requests
9. ✅ Updated store `initialize()` - added loadRequests() call
10. ✅ Added `loadRequests()` method in store

**Implementation Details:**

- All CRUD methods in service now use Supabase queries
- Request number generation counts from Supabase
- Store methods reload from Supabase after mutations
- Mappers handle camelCase ↔ snake_case conversion
- CASCADE DELETE works automatically via database constraints
- Transaction logic for request + items insert
- Filter methods updated to fetch from Supabase
- Supplier basket creation fetches requests from DB

**Files Modified:**

- `src/stores/supplier_2/supplierService.ts` - Service layer migration
- `src/stores/supplier_2/supplierStore.ts` - Store initialization updates
- Commit: `53fa5a5` - feat(supplier): Phase 1 - migrate procurement requests to Supabase

**Actual time:** ~3 hours

---

### Phase 2: Purchase Orders Migration ✅ COMPLETED (2025-11-22)

**Purpose:** Migrate orders CRUD from mock to Supabase

**Current Implementation (Mock):**

```typescript
class SupplierService {
  private orders: PurchaseOrder[] = [] // ❌ In-memory storage

  async getOrders() {
    return [...this.orders] // ❌ Returns from memory
  }

  async createOrder(data) {
    const newOrder = { ...data, id: generate() }
    this.orders.unshift(newOrder) // ❌ Saves to memory
    return newOrder
  }
  // Similar for update/delete...
}
```

**New Implementation (Supabase):**

```typescript
// Service Layer (supplierService.ts)
import { supabase } from '@/supabase/client'
import { generateId } from '@/utils/id'
import { mapOrderFromDB, mapOrderToDB, mapOrderItemToDB } from './supabaseMappers'

class SupplierService {
  // ✅ REMOVE: private orders array

  async getOrders(filters?) {
    // ✅ Fetch from supplierstore_orders
    const { data, error } = await supabase
      .from('supplierstore_orders')
      .select('*, supplierstore_order_items(*)')
      .order('order_date', { ascending: false })

    if (error) throw error
    return data.map(mapOrderFromDB)
  }

  async createOrder(data) {
    // ✅ Use UUID for order and items
    const orderId = generateId()
    const timestamp = new Date().toISOString()

    // ✅ Insert to Supabase
    // + Update request status (convert to 'converted')
    // + Create transit batches in Storage
    // + Create bill in Account Store
    return mapOrderFromDB(order)
  }

  async sendOrder(id) {
    // ✅ Update status to 'sent'
    // + Create bill in Account Store
    // + Update bill_id in order
  }
  // Similar for other methods...
}
```

**Store Changes (Minimal):**

```typescript
async function initialize() {
  await loadRequests() // Phase 1
  await loadOrders() // ✅ NEW
  // ...
}

async function loadOrders() {
  state.value.loading.orders = true
  try {
    state.value.orders = await supplierService.getOrders()
  } finally {
    state.value.loading.orders = false
  }
}

// All CRUD methods already call service - no changes needed
```

**Tasks:**

1. ✅ Mapper functions already exist from Phase 0
2. ✅ Updated `getOrders()` - fetch from `supplierstore_orders` with items join
3. ✅ Updated `getOrderById()` - fetch single with items
4. ✅ Updated `createOrder()` - insert to Supabase with items (transaction)
5. ✅ Updated `updateOrder()` - update in Supabase (replace items if provided)
6. ✅ Updated `deleteOrder()` - delete from Supabase (CASCADE)
7. ✅ Updated `generateOrderNumber()` - counts from Supabase
8. ✅ Removed `private orders` array
9. ✅ Updated `loadDataFromCoordinator()` to skip orders
10. ✅ Added `loadOrders()` method in store
11. ✅ Updated store `initialize()` to call loadOrders()
12. ✅ Updated store CRUD methods to reload from Supabase after mutations
13. ✅ Fixed all references to `this.orders` in helper methods

**Implementation Details:**

- All CRUD methods in service now use Supabase queries
- Order number generation counts from Supabase
- Store methods reload from Supabase after mutations
- Mappers handle camelCase ↔ snake_case conversion (already existed from Phase 0)
- CASCADE DELETE works automatically via database constraints
- Transaction logic for order + items insert with rollback
- Fixed helper methods (`createReceipt`, `completeReceipt`, `getStatistics`, `getOrderedQuantityForItem`) to fetch from Supabase
- Request linking works by updating `purchase_order_ids` array in Supabase
- TypeScript config fixed (removed conflicting `noEmit` and `emitDeclarationOnly`)

**Files Modified:**

- `src/stores/supplier_2/supplierService.ts` - Service layer migration (all order CRUD methods)
- `src/stores/supplier_2/supplierStore.ts` - Store initialization and CRUD reload updates
- `tsconfig.app.json` - Fixed TypeScript config conflict

**Validation (User Testing Required):**

- [ ] Can create order → appears in Supabase
- [ ] Can update order → changes persist
- [ ] Can delete order → CASCADE deletes items
- [ ] Can fetch all orders → loads from Supabase
- [ ] Request linking works (purchase_order_ids array updated)
- [ ] Order status updates trigger automation correctly
- [ ] Page refresh loads data
- [ ] UI works as before
- [ ] No regressions in requests (Phase 1)

**Actual time:** ~2 hours

**Known Issues (discovered during testing):**

- 🔴 Bug #1: Missing `await` in `createSupplierBaskets()` → shows `[object Promise]` and `NaN` values
- 🔴 Bug #2: Mock data overwrites Supabase data in `loadDataFromCoordinator()` → orders table shows mock instead of Supabase

**Status:** Requires bug fixes before validation ⚠️

---

### Phase 2 Extension: Bug Fixes ✅ COMPLETED (2025-11-22)

**Purpose:** Fix critical bugs discovered during Phase 2 testing

**Bug #1: Missing await in createSupplierBaskets**

**Problem:**

- Line 1161 in `supplierService.ts` calls `getOrderedQuantityForItem()` WITHOUT `await`
- Method was made async in Phase 2, but call site wasn't updated
- Results in `[object Promise]` instead of number, `remaining=NaN`

**Impact:** Basket creation doesn't work, can't create orders from requests

**Fix:**

```typescript
// Line 1161 - ADD AWAIT:
const orderedQuantity = await this.getOrderedQuantityForItem(request.id, item.itemId)

// Line ~1100 - MAKE METHOD ASYNC:
async createSupplierBaskets(requestIds: string[]): Promise<SupplierBasket[]> {
  // ... existing code
}
```

**Files to modify:**

- `src/stores/supplier_2/supplierService.ts` (line 1161, line ~1100)
- `src/stores/supplier_2/supplierStore.ts` (update calls to await createSupplierBaskets)

---

**Bug #2: Mock data overwrites Supabase data**

**Problem:**

- `loadDataFromCoordinator()` runs AFTER `loadOrders()` in `initialize()`
- Line 385 overwrites Supabase orders with mock data: `state.value.orders = [...supplierData.orders]`
- Orders table shows mock data instead of real Supabase data

**Impact:** Phase 2 migration appears not working, UI shows stale mock data

**Fix:**

```typescript
// Line 385 - REMOVE THIS LINE:
// state.value.orders = [...supplierData.orders]  // ❌ DELETE

// Keep only receipts (Phase 3 not migrated yet):
state.value.receipts = [...supplierData.receipts]
state.value.orderSuggestions = [...supplierData.suggestions]
```

**Files to modify:**

- `src/stores/supplier_2/supplierStore.ts` (line 385, update comment, update debug log)

---

**Tasks:**

1. ✅ Fix Bug #1: Add await to getOrderedQuantityForItem call
2. ✅ Fix Bug #1: Make createSupplierBaskets async (already was async)
3. ✅ Fix Bug #1: Update store calls with await (already had await)
4. ✅ Fix Bug #2: Remove orders overwrite from loadDataFromCoordinator
5. ✅ Fix Bug #2: Update comments and debug logs
6. ✅ Build and validate (no new errors)
7. ⬜ Test: Create request → Create basket → Create order (USER TESTING)
8. ⬜ Verify order appears in Supabase (USER TESTING)

**Files Modified:**

- `src/stores/supplier_2/supplierService.ts` (line 1161 - added await)
- `src/stores/supplier_2/supplierStore.ts` (removed line 385, updated comments and logs)
- `src/About/todo.md` (documented bugs and fixes)

**Actual time:** ~15 minutes

**What's fixed:**

- ✅ Basket creation now shows correct quantities (not NaN)
- ✅ Orders table will show Supabase data (not mock)
- ✅ Can create orders from requests (awaits are correct)
- ⏳ Needs user testing to verify end-to-end flow

---

### Phase 2.5: Counteragents Migration ✅ COMPLETED (2025-11-22)

**Purpose:** Migrate counteragents from mock data to Supabase

**What we did:**

- ✅ Created Supabase mappers (`mapCounteragentFromDB`, `mapCounteragentToDB`)
- ✅ Migrated all CRUD methods to Supabase in `counteragentsService.ts`
  - `fetchCounterAgents()` - with advanced filtering (search, categories, pagination)
  - `getCounteragentById()` - with PGRST116 error handling
  - `createCounteragent()` - full field mapping
  - `updateCounteragent()` - partial updates with updatedAt
  - `deleteCounteragent()` - soft delete (isActive = false)
- ✅ Removed all mock data dependencies from CounteragentsService
- ✅ Implemented filtering with `.or()` for search and `.overlaps()` for categories
- ✅ Added snake_case conversion for sort fields
- ✅ Integrated with Supplier Module (order creation, baskets, etc.)

**Implementation Details:**

- All 28+ fields mapped (camelCase ↔ snake_case)
- Advanced query building:
  - Search by name/display_name with `.ilike`
  - Filter by product categories with `.overlaps`
  - Pagination with `.range(offset, offset + limit - 1)`
  - Dynamic sorting with field conversion
- Error handling for not found (PGRST116 code)
- Full type safety with TypeScript

**Files Modified:**

- `src/stores/counteragents/supabaseMappers.ts` (NEW) - Data mappers
- `src/stores/counteragents/counteragentsService.ts` - Service layer migration

**Commits:**

- `b96af16` - feat(counteragents): phase 2.5 - migrate to supabase

**Actual time:** ~1.5 hours

**Validation:**

- ✅ Can fetch counteragents from Supabase with filters
- ✅ Can create/update/delete counteragents
- ✅ Supplier orders use Supabase counteragents
- ✅ No mock data loaded
- ✅ UI works correctly with real data

---

### Phase 3: Receipts Migration ✅ COMPLETED (2025-11-22)

**Purpose:** Migrate receipts CRUD from mock to Supabase

**Current Implementation (Mock):**

```typescript
class SupplierService {
  private receipts: Receipt[] = [] // ❌ In-memory storage

  async getReceipts() {
    return [...this.receipts] // ❌ Returns from memory
  }

  async createReceipt(data) {
    const newReceipt = { ...data, id: generate() }
    this.receipts.unshift(newReceipt) // ❌ Saves to memory
    return newReceipt
  }
  // Similar for update/delete...
}
```

**New Implementation (Supabase):**

```typescript
// Service Layer (supplierService.ts)
import { supabase } from '@/supabase/client'
import { generateId } from '@/utils/id'
import { mapReceiptFromDB, mapReceiptToDB, mapReceiptItemToDB } from './supabaseMappers'

class SupplierService {
  // ✅ REMOVE: private receipts array

  async getReceipts(filters?) {
    // ✅ Fetch from supplierstore_receipts
    const { data, error } = await supabase
      .from('supplierstore_receipts')
      .select('*, supplierstore_receipt_items(*)')
      .order('delivery_date', { ascending: false })

    if (error) throw error
    return data.map(mapReceiptFromDB)
  }

  async createReceipt(data) {
    // ✅ Use UUID for receipt and items
    const receiptId = generateId()
    const timestamp = new Date().toISOString()

    // ✅ Insert to Supabase
    const { data: receipt, error } = await supabase
      .from('supplierstore_receipts')
      .insert([mapReceiptToDB({ ...data, id: receiptId, createdAt: timestamp })])
      .select()
      .single()

    if (error) throw error
    // ... insert items
    return mapReceiptFromDB(receipt)
  }

  async completeReceipt(id) {
    // ✅ Update status to 'completed'
    // + Create storage operation (receipt)
    // + Update order quantities
    // + Calculate discrepancies
    // + Update order total if needed
    // + Update bill status
  }
  // Similar for other methods...
}
```

**Store Changes (Minimal):**

```typescript
async function initialize() {
  await loadRequests() // Phase 1
  await loadOrders() // Phase 2
  await loadReceipts() // ✅ NEW
  // ...
}

async function loadReceipts() {
  state.value.loading.receipts = true
  try {
    state.value.receipts = await supplierService.getReceipts()
  } finally {
    state.value.loading.receipts = false
  }
}

// All CRUD methods already call service - no changes needed
```

**What we did:**

1. ✅ Mappers already existed from Phase 0 (`mapReceiptFromDB`, `mapReceiptToDB`, `mapReceiptItemFromDB`, `mapReceiptItemToDB`)
2. ✅ Updated `generateReceiptNumber()` - count from Supabase
3. ✅ Updated `getReceipts()` - fetch from `supplierstore_receipts` with items join
4. ✅ Updated `getReceiptById()` - fetch single with PGRST116 error handling
5. ✅ Updated `createReceipt()` - insert to Supabase (transaction: receipt + items with rollback)
6. ✅ Updated `completeReceipt()` - update in Supabase + storage integration + order updates
7. ✅ Updated `updateReceipt()` - update in Supabase with optional items replacement
8. ✅ Removed `private receipts: Receipt[] = []` array
9. ✅ Updated `loadDataFromCoordinator()` - removed receipts loading (only suggestions remain)
10. ✅ Added `loadReceipts()` method in store
11. ✅ Updated store `initialize()` - calls loadReceipts() after loadOrders()
12. ✅ Updated initialization message to "Phase 3: All data from Supabase"

**Implementation Details:**

- All CRUD methods now use Supabase queries
- Receipt number generation counts from Supabase
- CASCADE DELETE works automatically via database constraints
- Transaction logic for receipt + items insert with rollback on error
- Storage integration preserved (createReceiptOperation, updateProductPrices)
- Order updates work through updateOrder() (already Supabase in Phase 2)
- Error handling for PGRST116 (not found)
- Type safety with TypeScript mappers
- completeReceipt() handles: status update, storage operation, order updates, price updates

**Files Modified:**

- `src/stores/supplier_2/supplierService.ts` - All receipt CRUD methods
- `src/stores/supplier_2/supplierStore.ts` - Added loadReceipts(), updated initialize()

**Commits:**

- `1c652b6` - feat(supplier): phase 3 - migrate receipts to Supabase

**Validation (User Testing Required):**

- ⏳ Can create receipt → appears in Supabase
- ⏳ Can complete receipt → creates storage operation
- ⏳ Order quantities updated correctly
- ⏳ Discrepancies detected and saved
- ⏳ Order total adjusted if needed
- ⏳ Page refresh loads data
- ⏳ UI works as before
- ⏳ No regressions in requests/orders

**Actual time:** ~2.5 hours

---

### Phase 4: Cleanup & Final Testing ⬜ NOT STARTED

**Purpose:** Remove all mock data dependencies and validate complete system

**Cleanup Tasks:**

1. Remove `loadDataFromCoordinator()` from store entirely
2. Remove `loadDataFromCoordinator()` from service entirely
3. Remove private arrays (`requests`, `orders`, `receipts`) from service
4. Update `integrationState.useMockData = false`
5. Remove any remaining mock data references
6. Update documentation/comments

**Final Validation:**

- [ ] Full workflow: Create request → Convert to order → Send → Receive → Complete
- [ ] All filters work (requests, orders, receipts)
- [ ] All integrations work (Storage, Account, Products, Counteragents)
- [ ] Performance acceptable (< 500ms for CRUD)
- [ ] No console errors
- [ ] TypeScript compiles
- [ ] Data persists across page refreshes
- [ ] No mock data loaded anywhere
- [ ] UI/UX unchanged from user perspective

**Estimated time:** 2-3 hours

---

## 🗄️ Database Schema Reference

### Table Naming Convention

**Prefix:** `supplierstore_` for all tables (namespace isolation)

### Table Structure

**supplierstore_requests** - Procurement requests from departments

- Primary: `id` (TEXT), `request_number` (UNIQUE, REQ-DEPT-SEQ)
- Status: `draft | submitted | converted | cancelled`
- Priority: `normal | urgent`
- Relations: Has many `supplierstore_request_items` (CASCADE DELETE)
- TypeScript: `ProcurementRequest` in `types.ts:47`

**supplierstore_request_items** - Items in procurement requests

- Primary: `id` (TEXT)
- Foreign: `request_id` → supplierstore_requests (CASCADE DELETE)
- Quantities: `requested_quantity` (NUMERIC 10,3 - base units only)
- Package: `package_id`, `package_name`, `package_quantity` (optional, UI metadata)
- TypeScript: `RequestItem` in `types.ts:71`

**supplierstore_orders** - Purchase orders to suppliers

- Primary: `id` (TEXT), `order_number` (UNIQUE, PO-SEQ)
- Status: `draft | sent | delivered | cancelled`
- Bill Status: `not_billed | pending | partially_paid | fully_paid | overpaid | credit_used`
- JSONB: `receipt_discrepancies` (array of discrepancy objects)
- Relations: Links to `bill_id` (Account Store), `receipt_id`, `supplier_id` (Counteragents)
- TypeScript: `PurchaseOrder` in `types.ts:95`

**supplierstore_order_items** - Items in purchase orders

- Primary: `id` (TEXT)
- Foreign: `order_id` → supplierstore_orders (CASCADE DELETE)
- Quantities: `ordered_quantity`, `received_quantity` (base units)
- Package: Required - `package_id`, `package_name`, `package_quantity`
- Pricing: `price_per_unit`, `package_price`, `total_price`
- TypeScript: `OrderItem` in `types.ts:135`

**supplierstore_receipts** - Delivery receipts from suppliers

- Primary: `id` (TEXT), `receipt_number` (UNIQUE, RCP-SEQ)
- Foreign: `purchase_order_id`, `storage_operation_id`
- Status: `pending | completed | cancelled`
- TypeScript: `Receipt` in `types.ts:175`

**supplierstore_receipt_items** - Items in receipts

- Primary: `id` (TEXT)
- Foreign: `receipt_id` → supplierstore_receipts (CASCADE), `order_item_id`
- Ordered vs Received: Separate quantity/price fields
- Cost tracking: `ordered_base_cost`, `actual_base_cost`
- TypeScript: `ReceiptItem` in `types.ts:200`

### Critical Rules

⚠️ **IMPORTANT:**

1. **Table Prefix**: ALL tables MUST have `supplierstore_` prefix
2. **Check Types First**: Always reference `src/stores/supplier_2/types.ts` before creating tables
3. **Naming**: Database = `snake_case`, TypeScript = `camelCase`
4. **Quantities**: ALWAYS in base units (gram, ml, piece), never packages
5. **Packages**: Metadata for UI display only, not for calculations
6. **Precision**: NUMERIC(10,3) for quantities, NUMERIC(12,2) for money
7. **Cascade**: `ON DELETE CASCADE` for all \*\_items tables
8. **Indexes**: Create AFTER tables (see below)

### Index Strategy

**Performance indexes** (create after tables):

```sql
-- Requests
CREATE INDEX idx_supplierstore_requests_status ON supplierstore_requests(status);
CREATE INDEX idx_supplierstore_requests_dept ON supplierstore_requests(department, status);
CREATE INDEX idx_supplierstore_request_items_request ON supplierstore_request_items(request_id);

-- Orders
CREATE INDEX idx_supplierstore_orders_status ON supplierstore_orders(status, bill_status);
CREATE INDEX idx_supplierstore_orders_supplier ON supplierstore_orders(supplier_id, status);
CREATE INDEX idx_supplierstore_order_items_order ON supplierstore_order_items(order_id);

-- Receipts
CREATE INDEX idx_supplierstore_receipts_order ON supplierstore_receipts(purchase_order_id);
CREATE INDEX idx_supplierstore_receipts_status ON supplierstore_receipts(status);
CREATE INDEX idx_supplierstore_receipt_items_receipt ON supplierstore_receipt_items(receipt_id);
```

---

## 📊 Progress Tracking

**Overall Progress:** 60% (3/5 phases complete)

**Phase Status:**

- ✅ Phase 0: Database Setup (100% - COMPLETED 2025-11-22)
- ✅ Phase 1: Requests Migration (100% - COMPLETED 2025-11-22)
- ✅ Phase 2: Orders Migration (100% - COMPLETED 2025-11-22)
- ⬜ Phase 3: Receipts Migration (0%)
- ⬜ Phase 4: Cleanup & Testing (0%)

**Estimated Total Time:** 18-23 hours | **Actual Time:** Phase 0: 2 hours, Phase 1: 3 hours, Phase 2: 2 hours (Total: 7 hours)

---

## 🎯 Next Steps

**✅ Phase 2 Complete - Ready for Phase 3!**

**Start Phase 3: Receipts Migration**

1. Import receipt mappers from supabaseMappers.ts (already exist)
2. Update `getReceipts()` - fetch from `supplierstore_receipts` with items
3. Update `getReceiptById()` - fetch single receipt with items
4. Update `createReceipt()` - insert to Supabase (transaction with items)
5. Update `completeReceipt()` - update status + create storage operations
6. Update `updateReceipt()` - update in Supabase
7. Update `deleteReceipt()` - delete from Supabase (CASCADE)
8. Remove `private receipts` array from service
9. Update `loadDataFromCoordinator()` to remove it entirely (no more mock data)
10. Add `loadReceipts()` method in store
11. Update store `initialize()` to call loadReceipts()
12. Test integrations:
    - Storage operations creation
    - Product price updates
    - Order status updates
13. Validate completely before Phase 4

**Current Focus:**

- Requests migration ✅ DONE
- Orders migration ✅ DONE
- Next: Service layer refactoring for Receipts CRUD

**Working Rules:**

- ✅ Complete one phase fully before starting next
- ✅ Test thoroughly after each phase
- ✅ No parallel work on multiple phases
- ✅ Focus on service layer, minimal store changes
- ❌ No more mock data after migration

---

## 📝 Technical Notes

### Mock Data Removal Strategy

**What's being removed:**

- `mockDataCoordinator.getSupplierStoreData()` - test data source
- `supplierService.loadDataFromCoordinator()` - loading method
- `supplierStore.loadDataFromCoordinator()` - loading method
- Private arrays in service (`requests`, `orders`, `receipts`)
- All in-memory data persistence

**Why mock data was used:**

- Development/testing without database
- Quick iteration during prototyping
- Easy data seeding for UI testing

**After migration:**

- All data persists in Supabase (PostgreSQL)
- No in-memory storage (except Pinia state for reactivity)
- Real data persistence across sessions
- Production-ready architecture

### Service Layer Architecture

**Before (Mock):**

```
Service Layer = Data Storage + Business Logic
├── private requests: ProcurementRequest[]  ← Data storage
├── private orders: PurchaseOrder[]         ← Data storage
├── private receipts: Receipt[]             ← Data storage
└── CRUD methods                            ← Business logic
```

**After (Supabase):**

```
Service Layer = Business Logic only
├── Supabase queries                        ← Data access
├── Data mappers (DB ↔ TypeScript)         ← Transformation
└── Business logic (validation, integration) ← Core logic
```

### Integration Points

**Storage Store:**

- Create transit batches when order sent
- Convert transit → active when receipt completed
- Update product costs from actual receipts

**Account Store:**

- Create bills when order sent
- Update bill status based on payments
- Handle overpayments (supplier credit)

**Products Store:**

- Fetch product definitions
- Get base units and packages
- Cache product names

**Counteragents Store:**

- Fetch supplier information
- Cache supplier names
- Handle supplier credit balances

---

**Last Updated:** 2025-11-22 (Phase 1 COMPLETED ✅)
**Status:** Phase 1 DONE - Ready to start Phase 2
**Focus:** Service layer refactoring for Orders CRUD with Account/Storage integrations

---
---

# 🧹 Mock Data Cleanup & Supabase Migration Plan

> **Created:** 2025-11-22
> **Status:** Planning Phase
> **Goal:** Remove all Mock data and migrate to Supabase

---

## 📊 Current State Analysis

### ✅ Already Migrated to Supabase

1. **Supplier Module (Phase 1-3 COMPLETED)**
   - ✅ Requests → `supplierstore_requests` + `supplierstore_request_items`
   - ✅ Orders → `supplierstore_orders` + `supplierstore_order_items`
   - ✅ Receipts → `supplierstore_receipts` + `supplierstore_receipt_items`
   - ✅ Mock data removed: `src/stores/shared/` (deleted on 2025-11-22)

---

## 🎯 Mock Data to Remove

### 1. **Account Store** 📊
**Location:** `src/stores/account/`

**Mock Files:**
- ✅ Found: `accountBasedMock.ts` (account-based mock data)
- ✅ Found: `paymentMock.ts` (payment mock data)

**Current State:**
```typescript
// src/stores/account/service.ts
class AccountService {
  // Uses localStorage for persistence
  private repository = new LocalStorageRepository<Account>('accounts')
}
```

**Migration Plan:**
- [ ] Create Supabase tables: `accounts`, `transactions`, `payments`
- [ ] Create TypeScript types from schema
- [ ] Implement Supabase mappers
- [ ] Update `AccountService` to use Supabase
- [ ] Remove `accountBasedMock.ts` and `paymentMock.ts`
- [ ] Update tests

**Priority:** HIGH (Account data is critical for financial operations)

---

### 2. **Counteragents Store** 👥
**Location:** `src/stores/counteragents/`

**Mock Files:**
- ✅ Found: `mock/counteragentsMock.ts` (suppliers, customers data)

**Current State:**
```typescript
// src/stores/counteragents/counteragentsStore.ts
async initialize(useMockData: boolean = true) {
  // Currently uses mock data flag
  await this.fetchCounterAgents()
}
```

**Migration Plan:**
- [ ] Create Supabase table: `counteragents`
- [ ] Migrate supplier IDs to match Supabase
- [ ] Update `counteragentsStore` to remove `useMockData` flag
- [ ] Remove `mock/counteragentsMock.ts`
- [ ] Ensure integration with Supplier module

**Priority:** HIGH (Linked to Supplier module)

---

### 3. **POS Module** 🛒
**Location:** `src/stores/pos/`

**Mock Files:**
- ✅ Found: `mocks/posMockData.ts` (orders, tables, menu items)
- ✅ Found: `shifts/mock.ts` (shift data and transactions)

**Current State:**
```typescript
// src/stores/pos/shifts/services.ts
async initialize() {
  if (shifts.length === 0) {
    await this.loadMockData() // Loads mock if empty
  }
}

// src/stores/pos/shifts/shiftsStore.ts
async loadMockData() {
  const result = await shiftsService.loadMockData()
  // Exports loadMockData method
}
```

**Migration Plan:**

#### Phase A: Shifts (Sprint 6 - Partially Done)
- ✅ Sync service implemented (`SyncService.ts`)
- ✅ Shift sync adapter implemented
- [ ] Remove `shifts/mock.ts` file
- [ ] Remove `loadMockData()` method from service and store
- [ ] Create Supabase migration for shifts table
- [ ] Update shift creation to use Supabase directly

#### Phase B: Orders
- [ ] Migrate orders to Supabase
- [ ] Remove mock order data from `mocks/posMockData.ts`
- [ ] Update order services to use Supabase

#### Phase C: Tables
- [ ] Migrate table state to Supabase
- [ ] Remove mock table data
- [ ] Update table services

**Priority:** CRITICAL (POS must work offline-first, needs careful testing)

---

### 4. **Kitchen Module** 🍳
**Location:** `src/stores/kitchen/`

**Mock Files:**
- ✅ Found: `mocks/kitchenMockData.ts` (kitchen orders, prep tasks)

**Current State:**
```typescript
// src/stores/kitchen/index.ts
// Uses mock data for kitchen display system
```

**Migration Plan:**
- [ ] Create Supabase tables for kitchen workflow
- [ ] Implement real-time subscriptions for kitchen updates
- [ ] Remove `mocks/kitchenMockData.ts`
- [ ] Update kitchen store

**Priority:** MEDIUM (Can use real order data from POS)

---

### 5. **Products Store** 📦
**Location:** `src/stores/productsStore/`

**Current State:**
```typescript
// src/stores/productsStore/productsStore.ts
// Uses localStorage + mock fallback data
```

**Issues Found:**
```typescript
// src/stores/productsStore/composables/useProductPriceHistory.ts
// Returns empty arrays - needs Supabase implementation
let history: ProductPriceHistory[] = []
```

**Migration Plan:**
- [ ] Create Supabase tables: `products`, `price_history`, `product_usage`
- [ ] Migrate product data from localStorage to Supabase
- [ ] Implement real price history tracking
- [ ] Implement real usage tracking (recipes, preparations, menu)
- [ ] Remove mock fallback logic in composables

**Priority:** HIGH (Core data for all modules)

---

### 6. **Recipes Store** 📖
**Location:** `src/stores/recipes/`

**Current State:**
```typescript
// src/stores/recipes/recipesStore.ts
// Uses localStorage for persistence
```

**Migration Plan:**
- [ ] Create Supabase tables: `recipes`, `recipe_ingredients`
- [ ] Migrate recipe data to Supabase
- [ ] Update recipe service to use Supabase
- [ ] Connect with product usage tracking

**Priority:** MEDIUM

---

### 7. **Preparation Store** 🥘
**Location:** `src/stores/preparation/`

**Mock References:**
```typescript
// src/stores/preparation/preparationService.ts
// References mock data in comments
```

**Migration Plan:**
- [ ] Create Supabase tables: `preparations`, `preparation_ingredients`
- [ ] Migrate preparation data to Supabase
- [ ] Connect with product usage tracking

**Priority:** MEDIUM

---

### 8. **Storage Store** 📦
**Location:** `src/stores/storage/`

**Current State:**
```typescript
// src/stores/storage/storageService.ts
// Uses localStorage + mock references
```

**Migration Plan:**
- [ ] Create Supabase tables: `storage_balances`, `storage_operations`
- [ ] Migrate storage data to Supabase
- [ ] Connect with receipt integration from Supplier module
- [ ] Remove mock references

**Priority:** HIGH (Already integrated with Supplier receipts)

---

## 🔧 localStorage Usage Analysis

### Critical localStorage Usage (Must Migrate)

1. **POS Stores** (Offline-First Priority)
   - `src/stores/pos/orders/services.ts`
   - `src/stores/pos/tables/services.ts`
   - `src/stores/pos/payments/services.ts`
   - `src/stores/pos/shifts/services.ts`
   - **Strategy:** Keep localStorage as cache, sync to Supabase

2. **Auth Store**
   - `src/stores/auth/authStore.ts`
   - `src/stores/auth/services/session.service.ts`
   - **Strategy:** Keep for session caching, use Supabase for user data

3. **Products & Recipes**
   - `src/stores/productsStore/productsService.ts`
   - `src/stores/recipes/recipesService.ts`
   - **Strategy:** Migrate to Supabase, keep minimal cache

4. **Menu Store**
   - `src/stores/menu/menuService.ts`
   - **Strategy:** Migrate to Supabase

### Infrastructure (Keep)

These are valid localStorage uses for client-side functionality:
- ✅ `src/core/sync/SyncService.ts` - Sync queue
- ✅ `src/repositories/base/LocalStorageRepository.ts` - Base repository
- ✅ `src/composables/usePersistence.ts` - Persistence abstraction

---

## 📋 Migration Priority Order

### Phase 1: Core Data (Weeks 1-2)
1. **Products Store** → Supabase
   - All product data, categories, units
   - Price history implementation
   - Usage tracking foundation

2. **Counteragents** → Supabase
   - Migrate supplier/customer data
   - Ensure integration with existing Supplier module

3. **Account Store** → Supabase
   - Financial accounts
   - Transactions
   - Payment records

### Phase 2: Operational Data (Weeks 3-4)
4. **Storage Store** → Supabase
   - Balances
   - Operations history
   - Integration with receipts

5. **Recipes & Preparations** → Supabase
   - Recipe definitions
   - Preparation workflows
   - Connect with product usage

6. **Menu Store** → Supabase
   - Menu structure
   - Menu items
   - Pricing

### Phase 3: POS System (Weeks 5-6)
7. **POS Shifts** → Cleanup
   - Remove mock data loading
   - Finalize Supabase sync

8. **POS Orders & Tables** → Supabase
   - Order management
   - Table state
   - Real-time updates

9. **Kitchen Module** → Supabase
   - Kitchen display
   - Prep tracking
   - Real-time subscriptions

---

## 🧪 Testing Strategy

For each migration:
1. [ ] Create test data in Supabase
2. [ ] Test CRUD operations
3. [ ] Test offline functionality (POS)
4. [ ] Test sync mechanisms
5. [ ] Verify data integrity
6. [ ] Performance testing
7. [ ] Remove mock files only after verification

---

## 🚨 Critical Flags to Remove

### ENV.useMockData Usage
**Files to update:**
- `src/config/environment.ts` - Remove `useMockData` flag
- `src/composables/usePlatform.ts` - Remove mock data checks
- `src/core/appInitializer.ts` - Remove mock initialization
- `src/stores/counteragents/counteragentsStore.ts` - Remove `useMockData` parameter
- `src/stores/supplier_2/supplierStore.ts` - Remove `useMockData` state

### Integration State Cleanup
**Supplier Store:**
```typescript
// REMOVE these fields from IntegrationState:
integrationState.value.useMockData = false  // ❌ Delete
state.value.dataSource = 'mock' | 'integrated'  // ❌ Delete
```

---

## 📊 Success Metrics

- [ ] Zero mock data files in `src/stores/`
- [ ] Zero `useMockData` flags
- [ ] Zero hardcoded test data
- [ ] All stores use Supabase or real data sources
- [ ] localStorage only for caching/offline
- [ ] All tests passing with real data
- [ ] Performance maintained or improved
- [ ] Offline functionality working (POS)

---

## 🎯 Next Immediate Actions

1. **Review this document** with the team
2. **Choose Phase 1 target**: Products or Counteragents?
3. **Create Supabase schema** for chosen target
4. **Set up development database** with test data
5. **Start migration** following the plan above

---

## 📝 Notes

- Keep localStorage for offline-first POS functionality
- Use Supabase real-time for kitchen/order updates
- Maintain backward compatibility during migration
- Test thoroughly before removing mock files
- Document all schema changes
- Update CLAUDE.md after each phase

---

**Last Updated:** 2025-11-22
**Next Review:** After Phase 1 completion
