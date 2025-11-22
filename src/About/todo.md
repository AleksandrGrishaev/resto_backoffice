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

### Case 1: Account Store Mock Files ⚡ CURRENT

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
- [ ] Remove unused import from `store.ts:24`
- [ ] Delete `accountBasedMock.ts`
- [ ] Delete `paymentMock.ts`
- [ ] Verify no runtime errors after deletion
- [ ] Test Account Store CRUD operations
- [ ] Commit changes

**Priority:** HIGH (Ready to delete - no dependencies)

---

### Case 2: Counteragents Store Mock Files

**Location:** `src/stores/counteragents/`

**Mock Files Found:**
- `mock/counteragentsMock.ts` - Supplier/customer mock data

**Current State:**
```typescript
// src/stores/counteragents/counteragentsStore.ts
async initialize(useMockData: boolean = true) {
  // Currently uses mock data flag
}
```

**Action Items:**
- [ ] Check if `counteragentsMock.ts` is imported/used
- [ ] Check Supabase table status
- [ ] Remove `useMockData` parameter from initialize()
- [ ] Delete mock file if not used
- [ ] Update tests
- [ ] Commit changes

**Priority:** HIGH (Linked to Supplier module)

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
- 🔄 Account Store (IN PROGRESS - Case 1)
- ⏳ Counteragents (Case 2)
- ⏳ POS Shifts (Case 3)
- ⏳ POS Module (Case 4)
- ⏳ Kitchen Module (Case 5)

**Completion:** 16% (1/6 modules)

---

## 🎯 Next Actions

1. **Complete Case 1** (Account Store)
   - Remove unused imports
   - Delete mock files
   - Test and commit

2. **Start Case 2** (Counteragents)
   - Analyze usage
   - Check Supabase status
   - Plan migration

3. **Review ENV.useMockData** flag locations

---

**Last Updated:** 2025-11-22
**Next Review:** After each case completion
