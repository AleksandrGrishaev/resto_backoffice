# 🧹 Mock Data Cleanup Plan

> **Created:** 2025-11-22
> **Status:** In Progress
> **Goal:** Remove all Mock data files and ensure Supabase integration

---

## ✅ Completed

### Supplier Module (2025-11-22)
- ✅ Migrated to Supabase (Phase 1-3)
- ✅ Removed `src/stores/shared/` Mock coordinator
- ✅ All supplier data now in Supabase tables

---

## 🎯 Current Sprint: Mock Data Cleanup

### Case 1: Account Store Mock Files ✅ COMPLETED

**Location:** `src/stores/account/`

**Mock Files Found:**
- `accountBasedMock.ts` (489 lines) - Mock accounts and transactions
- `paymentMock.ts` (540 lines) - Mock pending payments

**Analysis Results:**
```bash
✅ Import found in store.ts (line 24):
   import { mockAccountTransactions } from './accountBasedMock'

✅ But NOT USED anywhere in code
   - No references to mockAccountTransactions in store.ts
   - No references to mockPendingPayments in service.ts
   - No references to mockAccounts anywhere
```

**Supabase Status:**
- ✅ Tables already exist in Supabase
- ✅ Account Store already using Supabase
- ✅ No mock data coordinator dependencies

**Action Items:**
- [x] Remove unused import from `store.ts:24`
- [x] Delete `accountBasedMock.ts`
- [x] Delete `paymentMock.ts`
- [x] Verify no runtime errors after deletion
- [x] Test Account Store CRUD operations
- [x] Commit changes

**Priority:** ✅ COMPLETED

---

### Case 2: Counteragents Store Mock Files ✅ COMPLETED

**Location:** `src/stores/counteragents/`

**Mock Files Found:**
- `mock/counteragentsMock.ts` - Supplier/customer mock data (DELETED)

**Analysis Results:**
```bash
✅ Mock exports in index.ts (lines 24-34)
   - Only referenced in index.ts (export) and counteragentsMock.ts (definition)
   - NO external usage found

✅ useMockData parameter in initialize()
   - Logged but NEVER used in method body
   - DevInitializationStrategy calls initialize() WITHOUT parameters
   - Store always calls fetchCounterAgents() which uses Supabase

✅ CounteragentsService already uses Supabase (line 15: import { supabase })
```

**Action Items:**
- [x] Check if `counteragentsMock.ts` is imported/used
- [x] Check Supabase table status (already using Supabase)
- [x] Remove `useMockData` parameter from initialize()
- [x] Delete mock exports from index.ts
- [x] Delete mock directory
- [x] Commit changes

**Priority:** ✅ COMPLETED

---

### Case 3: POS Shifts Mock Files ✅ COMPLETED

**Location:** `src/stores/pos/shifts/`

**Mock Files Found:**
- `mock.ts` (578 lines) - Shift mock data and transactions (DELETED)

**Analysis Results:**
```bash
✅ Supabase table EXISTS
   - Table 'shifts' in src/supabase/migrations/001_initial_schema.sql
   - Sync fields: synced_to_account, synced_at, sync_error, sync_attempts

✅ Service already has Supabase integration
   - loadShifts() tries Supabase first (line 116-130)
   - Falls back to localStorage if offline (line 137-142)
   - Caches Supabase data in localStorage

✅ Mock auto-loading blocked Supabase
   - initialize() checked localStorage and loaded mock if empty (line 53-56)
   - This prevented loadShifts() from querying Supabase properly

✅ No external usage
   - loadMockData() only called internally in services.ts initialize()
   - No views or components use it
```

**Action Items:**
- [x] Check Supabase table for shifts (EXISTS!)
- [x] Remove `loadMockData()` method from service
- [x] Remove `loadMockData()` method from store
- [x] Remove `loadMockData()` from store exports
- [x] Delete `mock.ts` file
- [x] Update initialization logic (simplified to return success)
- [x] Update clearAllData() (only clears localStorage)
- [x] Remove ShiftsMockData export from index.ts
- [x] Commit changes

**Priority:** ✅ COMPLETED

---

### Case 4: POS Module Mock Files

**Location:** `src/stores/pos/`

**Mock Files Found:**
- `mocks/posMockData.ts` - Orders, tables, menu items

**Current State:**
- Used for POS development and testing

**Action Items:**
- [ ] Analyze posMockData.ts usage
- [ ] Check if orders/tables use Supabase
- [ ] Create migration plan for POS data
- [ ] Implement offline-first sync strategy
- [ ] Delete mock file when ready
- [ ] Commit changes

**Priority:** CRITICAL (Requires careful offline-first testing)

---

### Case 5: Kitchen Module Mock Files

**Location:** `src/stores/kitchen/`

**Mock Files Found:**
- `mocks/kitchenMockData.ts` - Kitchen orders and prep tasks

**Current State:**
- Used for kitchen display development

**Action Items:**
- [ ] Analyze kitchenMockData.ts usage
- [ ] Check if kitchen can use real POS orders
- [ ] Plan real-time subscription architecture
- [ ] Delete mock file when ready
- [ ] Commit changes

**Priority:** MEDIUM (Can use real POS data)

---

## 🚨 Critical Flags to Remove

### ENV.useMockData Usage

**Files to update:**
- [ ] `src/config/environment.ts` - Remove `useMockData` flag
- [ ] `src/composables/usePlatform.ts` - Remove mock checks
- [ ] `src/core/appInitializer.ts` - Remove mock initialization
- [ ] `src/stores/counteragents/counteragentsStore.ts` - Remove `useMockData` param
- [ ] `src/stores/supplier_2/supplierStore.ts` - Remove `useMockData` state

**Integration State Cleanup:**
```typescript
// REMOVE from supplierStore.ts:
integrationState.value.useMockData = false  // ❌ Delete
state.value.dataSource = 'mock' | 'integrated'  // ❌ Delete
```

---

## 📊 Progress Tracking

**Total Mock Files:** 6 modules
- ✅ Supplier Module (DONE)
- ✅ Account Store (DONE - Case 1)
- ✅ Counteragents (DONE - Case 2)
- ✅ POS Shifts (DONE - Case 3)
- ⏳ POS Module (Case 4)
- ⏳ Kitchen Module (Case 5)

**Completion:** 66% (4/6 modules)

---

## 🎯 Next Actions

1. **Start Case 3** (POS Shifts)
   - Analyze loadMockData() usage
   - Check Supabase table status
   - Remove mock loading logic

2. **Review Cases 4-5** (POS Module, Kitchen Module)
   - Critical for offline-first functionality
   - Plan real-time sync architecture

3. **Review ENV.useMockData** flag locations

---

**Last Updated:** 2025-11-22
**Next Review:** After each case completion
