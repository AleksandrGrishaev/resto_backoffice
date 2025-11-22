# 🎯 Supplier Module - Supabase Migration Strategy

> **Status:** Planning Phase | **Start Date:** 2025-11-22
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

### Phase 0: Database Setup ⬜ NOT STARTED
**Purpose:** Create database schema and infrastructure

**What we're doing:**
- Create 6 Supabase tables with `supplierstore_` prefix
  - `supplierstore_requests` + `supplierstore_request_items`
  - `supplierstore_orders` + `supplierstore_order_items`
  - `supplierstore_receipts` + `supplierstore_receipt_items`
- Add performance indexes
- Generate TypeScript types
- Create data mappers (camelCase ↔ snake_case)
- Run security advisors

**Validation:**
- [ ] All 6 tables created successfully
- [ ] Indexes applied and working
- [ ] No RLS policy warnings
- [ ] TypeScript types generated
- [ ] Can query tables via Supabase client

**Files:**
- New: `src/stores/supplier_2/supabaseMappers.ts`
- Generated: `src/supabase/types.gen.ts`
- Reference: `src/stores/supplier_2/types.ts`

**Estimated time:** 2-3 hours

---

### Phase 1: Procurement Requests Migration ⬜ NOT STARTED
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
import { supabase } from '@/config/supabase'
import { mapRequestFromDB, mapRequestToDB } from './supabaseMappers'

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
    // ✅ Insert to Supabase (with items in transaction)
    const { data: request, error } = await supabase
      .from('supplierstore_requests')
      .insert([mapRequestToDB(data)])
      .select()
      .single()

    if (error) throw error
    // ... insert items
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
1. Create mapper functions (`mapRequestFromDB`, `mapRequestToDB`, `mapRequestItemFromDB`, `mapRequestItemToDB`)
2. Update `getRequests()` - fetch from `supplierstore_requests` with filters
3. Update `getRequestById()` - fetch single with items
4. Update `createRequest()` - insert to Supabase with items (transaction)
5. Update `updateRequest()` - update in Supabase (replace items)
6. Update `deleteRequest()` - delete from Supabase (cascade)
7. Remove `private requests` array
8. Remove `loadDataFromCoordinator()` method
9. Update store `initialize()` - remove coordinator loading
10. Add `loadRequests()` method in store

**Validation:**
- [ ] Can create request → appears in Supabase
- [ ] Can fetch all requests → loads from Supabase
- [ ] Can fetch single request → loads with items
- [ ] Can update request → persists to Supabase
- [ ] Can delete request → removes from Supabase (items cascade)
- [ ] Filters work (status, department, priority)
- [ ] Request number generation works
- [ ] Page refresh loads data from Supabase
- [ ] No console errors
- [ ] UI works as before

**Files:**
- `src/stores/supplier_2/supplierService.ts` (main changes)
- `src/stores/supplier_2/supplierStore.ts` (minimal changes)
- `src/stores/supplier_2/supabaseMappers.ts` (new)

**Estimated time:** 4-5 hours

---

### Phase 2: Purchase Orders Migration ⬜ NOT STARTED
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
1. Create mapper functions (`mapOrderFromDB`, `mapOrderToDB`, `mapOrderItemFromDB`, `mapOrderItemToDB`)
2. Update `getOrders()` - fetch from `supplierstore_orders` with filters
3. Update `getOrderById()` - fetch single with items
4. Update `createOrder()` - insert to Supabase with items
5. Update `sendOrder()` - update status + create bill
6. Update `updateOrder()` - update in Supabase
7. Update `deleteOrder()` - delete from Supabase
8. Remove `private orders` array
9. Add `loadOrders()` method in store
10. Test integrations (Storage transit batches, Account bills)

**Validation:**
- [ ] Can create order → appears in Supabase
- [ ] Can send order → creates bill in Account Store
- [ ] Can fetch all orders → loads from Supabase
- [ ] Request status updates to 'converted' when order created
- [ ] Transit batches created in Storage (if applicable)
- [ ] Bill status calculated correctly
- [ ] Page refresh loads data
- [ ] UI works as before
- [ ] No regressions in requests

**Files:**
- `src/stores/supplier_2/supplierService.ts`
- `src/stores/supplier_2/supplierStore.ts` (add loadOrders)
- `src/stores/supplier_2/supabaseMappers.ts` (add order mappers)

**Estimated time:** 5-6 hours

---

### Phase 3: Receipts Migration ⬜ NOT STARTED
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

**Tasks:**
1. Create mapper functions (`mapReceiptFromDB`, `mapReceiptToDB`, `mapReceiptItemFromDB`, `mapReceiptItemToDB`)
2. Update `getReceipts()` - fetch from `supplierstore_receipts`
3. Update `getReceiptById()` - fetch single with items
4. Update `createReceipt()` - insert to Supabase
5. Update `completeReceipt()` - create storage operation + update order
6. Update `deleteReceipt()` - delete from Supabase
7. Remove `private receipts` array
8. Add `loadReceipts()` method in store
9. Test integrations (Storage operations, Order updates, Bill status)

**Validation:**
- [ ] Can create receipt → appears in Supabase
- [ ] Can complete receipt → creates storage operation
- [ ] Order quantities updated correctly
- [ ] Discrepancies detected and saved
- [ ] Order total adjusted if needed
- [ ] Bill status recalculated
- [ ] Page refresh loads data
- [ ] UI works as before
- [ ] No regressions in requests/orders

**Files:**
- `src/stores/supplier_2/supplierService.ts`
- `src/stores/supplier_2/supplierStore.ts` (add loadReceipts)
- `src/stores/supplier_2/supabaseMappers.ts` (add receipt mappers)

**Estimated time:** 5-6 hours

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
7. **Cascade**: `ON DELETE CASCADE` for all *_items tables
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

**Overall Progress:** 0% (0/4 phases complete)

**Phase Status:**
- ⬜ Phase 0: Database Setup (0%)
- ⬜ Phase 1: Requests Migration (0%)
- ⬜ Phase 2: Orders Migration (0%)
- ⬜ Phase 3: Receipts Migration (0%)
- ⬜ Phase 4: Cleanup & Testing (0%)

**Estimated Total Time:** 18-23 hours

---

## 🎯 Next Steps

**Start with Phase 0:**
1. Read `src/stores/supplier_2/types.ts` - understand all interfaces
2. Create 6 Supabase tables with `supplierstore_` prefix
3. Apply indexes
4. Generate TypeScript types
5. Create mapper functions
6. Validate database setup

**Then Phase 1:**
1. Work only in `supplierService.ts`
2. Replace mock methods with Supabase queries
3. Test each CRUD operation
4. Minimal changes to store
5. Validate completely before Phase 2

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

**Last Updated:** 2025-11-22
**Status:** Ready to start Phase 0
**Focus:** Service layer refactoring, no store rewrites
