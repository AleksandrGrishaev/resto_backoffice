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

### Case 2: Counteragents Store Mock Files ⚡ CURRENT

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

### Case 3: POS Shifts Mock Files

**Location:** `src/stores/pos/shifts/`

**Mock Files Found:**
- `mock.ts` - Shift mock data and transactions

**Current State:**
```typescript
// src/stores/pos/shifts/services.ts
async initialize() {
  if (shifts.length === 0) {
    await this.loadMockData() // ❌ Loads mock if empty
  }
}

// src/stores/pos/shifts/shiftsStore.ts
exports: loadMockData() // ❌ Exported method
```

**Action Items:**
- [ ] Check Supabase table for shifts
- [ ] Remove `loadMockData()` method from service
- [ ] Remove `loadMockData()` method from store
- [ ] Remove `loadMockData()` from store exports
- [ ] Delete `mock.ts` file
- [ ] Update initialization logic
- [ ] Test shift creation with real data
- [ ] Commit changes

**Priority:** CRITICAL (POS offline-first functionality)

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
- ⏳ POS Shifts (Case 3)
- ⏳ POS Module (Case 4)
- ⏳ Kitchen Module (Case 5)

**Completion:** 50% (3/6 modules)

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
