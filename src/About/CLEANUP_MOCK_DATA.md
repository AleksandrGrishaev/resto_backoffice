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
