# Task: Storage View Data Loading & Performance Analysis

## 📋 Overview

Analyze and optimize data loading strategy in Storage View to ensure fresh data is loaded when switching tabs and handle large datasets efficiently (1000+ operations).

## 🎯 Goals

1. **Auto-refresh on tab switch**: Automatically load fresh data when user switches to Inventories/Operations tabs
2. **Performance optimization**: Handle 1000+ operations without blocking UI
3. **Smart caching**: Balance between fresh data and performance
4. **Prevent duplicate requests**: Don't reload if data is already fresh

## 🔍 Current Issues

### Issue 1: Stale Data on Tab Switch

**Problem:** When user switches to Inventories tab, it shows cached data from initial page load.

**Example:**

```
1. User opens Storage View → loads inventories (09:00 AM)
2. Kitchen finalizes inventory INV-677269 (09:07 AM)
3. User switches to Operations tab → switches back to Inventories tab
4. Still sees old data from 09:00 AM ❌
```

**Expected:** Fresh data from database when switching tabs.

### Issue 2: Large Dataset Performance

**Problem:** Loading 1000+ operations may block UI rendering.

**Questions:**

- How many operations are loaded at once?
- Is there pagination or infinite scroll?
- Does it load all 1000 operations in one request?
- Is there a loading state while fetching?

### Issue 3: Multiple Data Sources

Storage View manages multiple data types:

- **Balances** (storage_batches aggregated)
- **Operations** (receipts, corrections, write-offs, inventories)
- **Inventories** (inventory_documents)
- **Transit batches** (in_transit status)
- **Alerts** (expiring, expired, low stock)

**Questions:**

- Which data is loaded on initial view mount?
- Which data is loaded on tab switch?
- Which data is loaded on department change (Kitchen/Bar/All)?
- Is there redundant loading?

## 🔬 Analysis Tasks

### Task 1: Map Current Data Loading Flow

**File to analyze:** `src/views/storage/StorageView.vue`

**Questions:**

1. What happens on component mount?

   ```typescript
   onMounted(() => {
     // What loads here?
   })
   ```

2. What happens on tab switch?

   ```typescript
   watch(selectedTab, newTab => {
     // Does it trigger data reload?
   })
   ```

3. What happens on department change?

   ```typescript
   watch(selectedDepartment, newDept => {
     // What reloads?
   })
   ```

4. What loads in `storageStore.initialize()`?

### Task 2: Analyze Storage Store Loading Logic

**File to analyze:** `src/stores/storage/storageStore.ts`

**Map out:**

1. `initialize()` - What does it load and in what order?
2. `fetchBalances()` - When is it called?
3. `fetchOperations()` - When is it called? How many items?
4. `fetchInventories()` - When is it called?
5. `loadTransitBatches()` - When is it called?

**Questions:**

- Is there a `lastFetchedAt` timestamp to prevent duplicate requests?
- Is there a cache TTL (time-to-live)?
- Are requests parallelized or sequential?
- Is there error handling for partial failures?

### Task 3: Measure Current Performance

**Metrics to collect:**

1. Time to load all data on initial mount
2. Time to load operations (1000+ records)
3. Time to switch tabs
4. Number of Supabase queries per view load
5. Size of data transferred (KB/MB)

**Tools:**

- Browser DevTools → Network tab
- Vue DevTools → Performance
- Supabase Dashboard → API logs

### Task 4: Analyze Storage Service Queries

**File to analyze:** `src/stores/storage/storageService.ts`

**Review queries:**

1. `getBalances()` - Does it fetch all batches or aggregated?
2. `getOperations()` - Is there a LIMIT? ORDER BY?
3. `getInventories()` - Is there a date range filter?
4. Are there indexes on frequently queried columns?

**Example current query:**

```typescript
// src/stores/storage/storageService.ts
async getOperations(department?: Department): Promise<StorageOperation[]> {
  let query = supabase
    .from('storage_operations')
    .select('*')
    .order('operation_date', { ascending: false })
    // ❌ No LIMIT? Loads ALL operations?

  const { data, error } = await query
  return (data || []).map(mapOperationFromDB)
}
```

## 💡 Proposed Solutions (for implementation)

### Solution 1: Auto-refresh on Tab Switch

**Approach A: Watcher-based reload**

```typescript
// src/views/storage/StorageView.vue
watch(selectedTab, async newTab => {
  if (newTab === 'inventories') {
    await refreshInventories() // Load fresh data
  } else if (newTab === 'operations') {
    await refreshOperations() // Load fresh data
  }
})
```

**Approach B: Smart caching with TTL**

```typescript
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

function isCacheValid(entry?: CacheEntry<any>): boolean {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < CACHE_TTL
}

watch(selectedTab, async newTab => {
  if (newTab === 'inventories' && !isCacheValid(inventoriesCache)) {
    await refreshInventories()
  }
})
```

**Approach C: Visibility API + auto-refresh**

```typescript
// Reload when tab becomes visible after being hidden
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && selectedTab.value === 'inventories') {
    refreshInventories()
  }
})
```

### Solution 2: Pagination for Large Datasets

**Option A: Server-side pagination**

```typescript
async getOperations(
  department?: Department,
  page: number = 1,
  pageSize: number = 50
): Promise<{ operations: StorageOperation[], total: number }> {
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('storage_operations')
    .select('*', { count: 'exact' })
    .order('operation_date', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  return {
    operations: (data || []).map(mapOperationFromDB),
    total: count || 0
  }
}
```

**Option B: Infinite scroll**

```vue
<v-data-table
  :items="operations"
  :loading="loading"
  :items-per-page="50"
  @update:page="loadMoreOperations"
></v-data-table>
```

**Option C: Virtual scrolling**

```vue
<!-- Use vue-virtual-scroller for 1000+ items -->
<RecycleScroller :items="operations" :item-size="60" key-field="id"></RecycleScroller>
```

### Solution 3: Optimistic Loading Strategy

**Priority-based loading:**

```typescript
async initialize() {
  // Phase 1: Critical data (blocks UI)
  await loadBalances() // User needs to see this immediately

  // Phase 2: Background loading (non-blocking)
  Promise.all([
    loadOperations(),     // Load in background
    loadInventories(),    // Load in background
    loadTransitBatches()  // Load in background
  ]).catch(error => {
    // Handle gracefully, don't block UI
  })
}
```

## 📊 Deliverables

After analysis, create:

1. **Performance Report**

   - Current loading times
   - Bottlenecks identified
   - Recommendations

2. **Data Flow Diagram**

   - Visual map of when/what data loads
   - Component → Store → Service → Database flow

3. **Implementation Plan**

   - Prioritized fixes (P0, P1, P2)
   - Estimated effort
   - Breaking changes (if any)

4. **Migration Strategy**
   - Backward compatibility
   - Gradual rollout
   - Rollback plan

## 🧪 Testing Checklist

After implementation:

- [ ] Fresh data loads when switching to Inventories tab
- [ ] No duplicate requests (check Network tab)
- [ ] Operations table handles 1000+ records smoothly
- [ ] Loading states shown during data fetch
- [ ] Error handling works (network failure, timeout)
- [ ] Department filter triggers correct reload
- [ ] Cache invalidation works correctly
- [ ] No memory leaks (check with DevTools Memory profiler)

## 📁 Files to Review

### Core Files:

- `src/views/storage/StorageView.vue` - Main view component
- `src/stores/storage/storageStore.ts` - State management
- `src/stores/storage/storageService.ts` - Data fetching
- `src/views/storage/components/StorageInventoriesTable.vue` - Inventories display
- `src/views/storage/components/StorageOperationsTable.vue` - Operations display

### Supporting Files:

- `src/stores/storage/types.ts` - Type definitions
- `src/stores/storage/supabaseMappers.ts` - DB mappers
- `src/stores/storage/composables/useInventory.ts` - Inventory logic

## 🔗 Related Issues

- Performance degradation with 1000+ operations
- Stale inventory data in Backoffice (FIXED in current session)
- Missing auto-refresh on Kitchen → Backoffice updates

## 📝 Notes

- **Database tables involved:**

  - `storage_batches` (inventory levels)
  - `storage_operations` (history of all operations)
  - `inventory_documents` (inventory records)

- **User workflow:**

  1. User opens Storage View (Kitchen/Bar/All)
  2. Switches between tabs (Products/Operations/Inventories/Analytics)
  3. Expects fresh data on each switch

- **Performance target:**
  - Tab switch: < 500ms
  - Initial load: < 2s
  - Handle 5000+ operations without blocking UI

## ⚡ Quick Wins (Low effort, high impact)

1. **Add watcher to reload inventories on tab switch** (15 min)
2. **Add LIMIT 100 to operations query + pagination UI** (30 min)
3. **Show loading skeleton while fetching** (20 min)
4. **Add cache timestamp to prevent duplicate requests** (25 min)

Total: ~90 minutes for significant improvement

## 🚀 Next Steps

1. **Session 1**: Complete analysis (map all data flows)
2. **Session 2**: Implement quick wins
3. **Session 3**: Implement pagination/virtual scrolling
4. **Session 4**: Test with production data volume
5. **Session 5**: Performance tuning and optimization

---

**Created:** 2026-01-03
**Priority:** HIGH (affects daily operations)
**Complexity:** MEDIUM (requires careful analysis + incremental changes)
**Impact:** HIGH (improves UX for all storage operations)
