# 🎯 Supplier Module - Supabase Migration Strategy

> **Status:** Planning Phase | **Start Date:** 2025-11-22
> **Approach:** Incremental modular migration with validation at each step

## 📋 Strategic Overview

**Migration Goal:** Move supplier module from mock data (localStorage) to Supabase (PostgreSQL)

**Architecture Pattern:**
```
TypeScript Interfaces → Database Schema → Mappers → Services → Stores → UI
```

**Work Strategy:**
- ✅ Complete one module fully before starting next
- ✅ Validate each module works before proceeding
- ✅ Maintain backward compatibility during migration
- ✅ No detailed code in planning - work iteratively

**Current Focus:** Procurement Requests only (Sprint 1)
- Orders and Receipts will come in later sprints
- One feature at a time with full validation

---

## 🏗️ Migration Modules

### Module 1: Database Foundation ⬜ NOT STARTED
**Purpose:** Create database schema and infrastructure

**Scope:**
- Create 6 Supabase tables (procurement_requests, procurement_request_items, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items)
- Add performance indexes
- Generate TypeScript types from schema
- Create bidirectional mappers (DB ↔ TypeScript)
- Run security advisors (RLS policies)

**Validation criteria:**
- [ ] All 6 tables created with correct types
- [ ] All indexes applied successfully
- [ ] Generated TypeScript types match `types.ts`
- [ ] No RLS policy security warnings
- [ ] Can successfully query all tables
- [ ] Foreign keys work (cascade deletes tested)

**Files:**
- Reference: `src/stores/supplier_2/types.ts`
- New: `src/stores/supplier_2/supabaseMappers.ts`
- Generated: `src/supabase/types.gen.ts`

**Estimated time:** 2-3 hours

---

### Module 2: Service Layer Migration ⬜ NOT STARTED
**Purpose:** Replace mock data with Supabase CRUD operations

**Scope:**
- Update `getRequests()` - fetch from Supabase with filters
- Update `getRequestById()` - fetch single with items
- Update `createRequest()` - insert to Supabase
- Update `updateRequest()` - update in Supabase (replace items)
- Update `deleteRequest()` - delete from Supabase (cascade)
- Remove mock data arrays
- Remove `loadDataFromCoordinator()` method
- Add comprehensive error handling

**Validation criteria:**
- [ ] Create request in Supabase works
- [ ] Fetch requests with filters works (status, department, priority)
- [ ] Fetch single request by ID works
- [ ] Update request works (status, items changes)
- [ ] Delete request works (cascade deletes items)
- [ ] All methods throw errors gracefully
- [ ] Request number generation works

**Files:**
- `src/stores/supplier_2/supplierService.ts`

**Estimated time:** 3-4 hours

---

### Module 3: Store Layer Updates ⬜ NOT STARTED
**Purpose:** Update Pinia store with async operations and state management

**Scope:**
- Add `loading` state object (requests, orders, receipts, suggestions)
- Add `error` state (string | null)
- Add `initializing` / `initialized` flags
- Update `initialize()` - load from Supabase instead of mock
- Create `loadRequests()` method with filters
- Update `createRequest()` with loading states
- Update `updateRequest()` with loading states
- Update `deleteRequest()` with loading states
- Add `clearError()` helper

**Validation criteria:**
- [ ] Store initializes from Supabase successfully
- [ ] Loading states update correctly during operations
- [ ] Errors set state and display properly
- [ ] All CRUD operations update reactive state
- [ ] No memory leaks or stale state
- [ ] Computed properties react correctly

**Files:**
- `src/stores/supplier_2/supplierStore.ts`

**Estimated time:** 2-3 hours

---

### Module 4: Composables Layer ⬜ NOT STARTED
**Purpose:** Update composables for async operations

**Scope:**
- Update `useProcurementRequests()` for async methods
- Ensure all computed properties work reactively
- Maintain existing API (no breaking changes)
- Add proper TypeScript types
- Export loading/error states

**Validation criteria:**
- [ ] All methods async and awaitable
- [ ] Computed properties (draftRequests, submittedRequests) react to changes
- [ ] No breaking changes for consumers
- [ ] Type safety maintained throughout
- [ ] Loading/error states accessible

**Files:**
- `src/stores/supplier_2/composables/useProcurementRequests.ts`

**Estimated time:** 1-2 hours

---

### Module 5: UI Components ⬜ NOT STARTED
**Purpose:** Update UI with loading/error states and async handling

**Scope:**
- Add loading spinner during initialization (SupplierView)
- Add error alert with retry button
- Update RequestList with loading overlay
- Update RequestDialog with loading states
- Disable buttons during operations
- Add "Retry" functionality for errors
- Ensure data persists after page refresh

**Validation criteria:**
- [ ] Loading spinner shows during store initialization
- [ ] Error alert displays with user-friendly message
- [ ] Retry button works and clears errors
- [ ] Table shows loading overlay during fetch
- [ ] Dialog buttons show loading state during save
- [ ] No UI regressions (existing features work)
- [ ] Data persists correctly after refresh

**Files:**
- `src/views/supplier_2/SupplierView.vue`
- `src/views/supplier_2/components/procurement/RequestList.vue`
- `src/views/supplier_2/components/procurement/RequestDialog.vue`

**Estimated time:** 2-3 hours

---

### Module 6: Mock Data Migration ⬜ NOT STARTED
**Purpose:** Transfer existing mock data to Supabase

**Scope:**
- Create migration script `migrateMockDataToSupabase.ts`
- Migrate all mock requests with items
- Verify data integrity (relationships, totals)
- Log migration results
- Document any data issues

**Validation criteria:**
- [ ] All mock requests migrated successfully
- [ ] All request items migrated with correct foreign keys
- [ ] Data relationships intact (request → items)
- [ ] No data loss or corruption
- [ ] Can query migrated data successfully
- [ ] Migration can be re-run safely (idempotent)

**Files:**
- New: `src/stores/supplier_2/migrations/migrateMockDataToSupabase.ts`

**Estimated time:** 1-2 hours

---

### Module 7: End-to-End Testing ⬜ NOT STARTED
**Purpose:** Comprehensive validation of all modules working together

**Test areas:**
- Database operations (all CRUD methods)
- UI workflows (create → edit → delete)
- Error scenarios (network failures, validation)
- Performance (query speed, rendering)
- TypeScript compilation

**Test scenarios:**
1. Create new request with multiple items → verify in Supabase
2. Edit request (change status, add/remove items) → verify persistence
3. Delete request → verify cascade delete
4. Filter requests (status, department, priority) → verify correct results
5. Network error simulation → verify error handling + retry
6. Page refresh → verify data loads correctly
7. Multiple concurrent operations → verify no race conditions

**Validation criteria:**
- [ ] Full CRUD workflow works end-to-end
- [ ] All filters work correctly
- [ ] Error handling catches all scenarios
- [ ] No console errors (TS or runtime)
- [ ] TypeScript compiles without errors
- [ ] Performance acceptable (< 500ms for CRUD)
- [ ] No regressions in other modules

**Estimated time:** 2-3 hours

---

## 🗄️ Database Schema Quick Reference

**Use this when implementing Module 1 - full SQL available in types.ts comments**

### Table Relationships

```
procurement_requests (заявки на закупку)
  ↓ has_many
procurement_request_items (позиции заявки)
  ↓ converts_to
purchase_orders (заказы поставщикам) [Sprint 3]
  ↓ has_many
purchase_order_items (позиции заказа) [Sprint 3]
  ↓ receives_as
goods_receipts (приёмка товара) [Sprint 4]
  ↓ has_many
goods_receipt_items (позиции приёмки) [Sprint 4]
```

### Key Tables (Sprint 1 Focus)

**procurement_requests**
- Primary: `id` (TEXT), `request_number` (UNIQUE, format: REQ-DEPT-SEQ)
- Status: `draft | submitted | converted | cancelled`
- Priority: `normal | urgent`
- Fields: `department`, `requested_by`, `notes`, timestamps
- TypeScript: `ProcurementRequest` in `types.ts:47`

**procurement_request_items**
- Primary: `id` (TEXT)
- Foreign: `request_id` → procurement_requests (CASCADE DELETE)
- Quantities: `requested_quantity` (NUMERIC 10,3 - ALWAYS base units)
- Package: `package_id`, `package_name`, `package_quantity` (optional, UI only)
- Fields: `item_id`, `item_name`, `unit`, `estimated_price`, `priority`
- TypeScript: `RequestItem` in `types.ts:71`

### Critical Rules

⚠️ **IMPORTANT:**
1. **Always check `types.ts` FIRST** before creating tables
2. **Naming:** Database = `snake_case`, TypeScript = `camelCase`
3. **Quantities:** ALWAYS in base units (gram, ml, piece), never packages
4. **Packages:** Metadata for UI display only, not storage
5. **Precision:** NUMERIC(10,3) for quantities, NUMERIC(12,2) for money
6. **Indexes:** Create AFTER tables (see types.ts comments for index SQL)
7. **Cascade:** `ON DELETE CASCADE` for all item tables

### Data Flow Pattern

```typescript
// CREATE
TypeScript (camelCase) → Mapper → DB (snake_case)
{ requestNumber: "REQ-001" } → { request_number: "REQ-001" }

// READ
DB (snake_case) → Mapper → TypeScript (camelCase)
{ request_number: "REQ-001" } → { requestNumber: "REQ-001" }
```

---

## 📊 Progress Tracking

**Overall Sprint 1 Progress:** 0% (0/7 modules complete)

**Module Status:**
- ⬜ Module 1: Database Foundation (0%)
- ⬜ Module 2: Service Layer (0%)
- ⬜ Module 3: Store Layer (0%)
- ⬜ Module 4: Composables (0%)
- ⬜ Module 5: UI Components (0%)
- ⬜ Module 6: Mock Migration (0%)
- ⬜ Module 7: E2E Testing (0%)

**Estimated Total Time:** 14-20 hours (Sprint 1 only)

---

## 🎯 Next Steps

**Start here:**
1. Read `src/stores/supplier_2/types.ts` - understand existing interfaces
2. Begin Module 1: Database Foundation
3. Validate Module 1 fully before proceeding
4. Move to Module 2 only after Module 1 ✅

**Working approach:**
- Pick one module
- Implement fully
- Test thoroughly
- Mark complete ✅
- Move to next module
- **NO parallel work on multiple modules**

---

## 📝 Notes

**Future Sprints (not in scope now):**
- Sprint 2: Order Assistant + Suggestions (5-7 days)
- Sprint 3: Purchase Orders + Storage Integration (7-10 days)
- Sprint 4: Receipts + Payment Integration (7-10 days)

**Integration Points (Sprint 1):**
- Products Store: Fetch product definitions, units, packages
- Counteragents Store: Fetch supplier info (future)
- Storage Store: Integration in Sprint 3
- Account Store: Integration in Sprint 4

**Key Patterns:**
- Error handling: try/catch with DebugUtils logging
- State management: loading/error/data pattern
- Async operations: await in stores, not in composables
- TypeScript: Strict mode, explicit types, no any

---

**Last Updated:** 2025-11-22
**Status:** Ready to start Module 1
