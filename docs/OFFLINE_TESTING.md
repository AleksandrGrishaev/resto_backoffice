# 🔌 Offline-First Testing Plan

> **Purpose:** Comprehensive testing plan for POS offline-first functionality
> **Priority:** 🔴 **CRITICAL** - POS must work without internet
> **Phase:** Phase 7 (2-3 days)
> **Date Created:** 2024-11-23

---

## 📊 Executive Summary

Kitchen App POS system построена на **offline-first architecture** - критичное требование для непрерывной работы ресторана. Эта система должна работать **полностью автономно** без интернета и автоматически синхронизироваться при восстановлении связи.

**Key Requirements:**
- ✅ POS работает без интернета
- ✅ Заказы сохраняются локально
- ✅ Смены закрываются offline
- ✅ Автоматическая синхронизация при восстановлении связи
- ✅ Conflict resolution при одновременной работе нескольких кассиров

---

## 🏗️ Architecture Overview

### Current Implementation Status

**✅ Implemented:**
1. **Dual-Write Pattern** - Supabase (online) + localStorage (always)
2. **SyncService** - centralized sync queue with priority
3. **Exponential Backoff** - retry with increasing delays
4. **Conflict Resolution** - server-wins strategy для financial data
5. **Storage Abstraction** - easy switch localStorage → API

**Audit Results (Phase 0.2):**
```
✅ localStorage Persistence: PASS
   - Orders service uses dual-write pattern
   - Saves to localStorage always, Supabase when online

✅ SyncService: PASS
   - Generic sync queue with priorities
   - Exponential backoff retry (2^attempts, max 1 hour)
   - Storage abstraction layer ready

✅ Conflict Resolution: PASS
   - Strategies: local-wins, server-wins, merge, manual
   - ShiftSyncAdapter uses server-wins (correct for financial data)
```

---

## 🧪 TEST SCENARIOS

### Scenario 1: Create Order Offline

**Goal:** Verify POS can create and manage orders without internet.

**Pre-conditions:**
- POS application running
- Internet connection available
- Active shift opened

**Test Steps:**
1. **Disconnect internet** (Chrome DevTools → Network → Offline)
2. Navigate to POS interface
3. Create new order:
   - Select table (Dine-in #5)
   - Add menu items (2x Nasi Goreng, 1x Es Teh)
   - Modify quantity, add notes
4. Verify order is saved
5. Check localStorage:
   ```javascript
   // In browser console
   localStorage.getItem('kitchen-app:orders')
   ```
6. **Reconnect internet**
7. Wait for auto-sync (30s interval)
8. Verify order appears in Supabase
9. Check sync status indicator

**Expected Results:**
- [x] Order created successfully offline
- [x] Order visible in POS UI
- [x] Order saved to localStorage
- [x] No error messages
- [x] Order synced to Supabase when online
- [x] Sync status shows "Synced ✅"

**Performance Requirements:**
- Order creation: **< 500ms**
- localStorage save: **< 100ms**
- Sync after reconnect: **< 5s**

---

### Scenario 2: Process Payment Offline

**Goal:** Ensure payments can be processed without internet.

**Pre-conditions:**
- Offline order created (from Scenario 1)
- Internet disconnected

**Test Steps:**
1. Open existing order
2. Click "Checkout"
3. Process payment:
   - Method: Cash
   - Amount: Rp 50,000
   - Change: Rp 5,000
4. Complete payment
5. Verify payment saved locally
6. Check localStorage:
   ```javascript
   localStorage.getItem('kitchen-app:payments')
   ```
7. Reconnect internet
8. Verify payment synced
9. Check shift report includes payment

**Expected Results:**
- [x] Payment processed offline
- [x] Receipt generated (if printer available)
- [x] Payment saved to localStorage
- [x] Order status updated to "paid"
- [x] Payment synced to Supabase
- [x] Shift totals updated correctly

**Performance Requirements:**
- Payment processing: **< 1s**
- Receipt generation: **< 2s** (if printer)
- Sync: **< 5s**

---

### Scenario 3: Close Shift Offline

**Goal:** Verify shifts can be closed and synced later.

**Pre-conditions:**
- Active shift with offline transactions
- Internet disconnected

**Test Steps:**
1. Navigate to Shift Management
2. Click "Close Shift"
3. Review shift report:
   - Total sales
   - Payment breakdown (cash, card, QR)
   - Transaction count
4. Confirm shift closure
5. Verify shift data saved locally:
   ```javascript
   localStorage.getItem('kitchen-app:shifts')
   ```
6. Check SyncService queue:
   ```javascript
   localStorage.getItem('kitchen-app:sync-queue')
   ```
7. Reconnect internet
8. Wait for auto-sync
9. Verify shift synced to Account Store
10. Check account transactions created

**Expected Results:**
- [x] Shift closed offline
- [x] Report generated correctly
- [x] Shift data saved to localStorage
- [x] Added to SyncService queue (priority: critical)
- [x] Synced to Supabase when online
- [x] Account transactions created (income/expense/correction)

**Critical Validations:**
- [ ] Shift totals accurate
- [ ] No missing transactions
- [ ] Sync queue item has correct priority
- [ ] Account Store receives all transactions

**Performance Requirements:**
- Shift close: **< 2s**
- Report generation: **< 3s**
- Sync: **< 10s** (more data than single order)

---

### Scenario 4: Conflict Resolution

**Goal:** Test concurrent edits and conflict handling.

**Test Setup:**
- Two cashiers (Browser A and Browser B)
- Same order edited offline by both

**Test Steps:**

**Cashier A (Browser A):**
1. Disconnect internet
2. Open Order #123
3. Add item: "Extra Sambal"
4. Save changes

**Cashier B (Browser B):**
1. Disconnect internet
2. Open Order #123
3. Add item: "Extra Es Batu"
4. Save changes

**Both cashiers:**
1. Reconnect internet
2. Wait for auto-sync

**Expected Results:**
- [x] Both changes saved locally
- [x] Sync queue processes both updates
- [x] Conflict detected
- [x] Conflict resolution applied (server-wins or merge)
- [x] Final order contains both items OR one version wins (depending on strategy)
- [x] No data loss
- [x] User notified of conflict (if manual strategy)

**Conflict Strategies to Test:**
1. **server-wins:** Last write to server wins
2. **local-wins:** Local changes override server
3. **merge:** Combine both changesets (if possible)
4. **manual:** Prompt user to resolve

**Current Implementation:**
- Shifts: **server-wins** (financial data should not be overwritten)
- Orders: (TODO: verify strategy)
- Payments: (TODO: verify strategy)

---

### Scenario 5: Extended Offline Operation

**Goal:** Test long-term offline operation (full shift).

**Simulation:**
- Disconnect internet at shift start
- Work entire shift offline
- Process 50+ orders
- Close shift offline
- Reconnect and sync

**Test Steps:**
1. Open shift (internet connected)
2. Disconnect internet
3. Create 50 orders:
   - 20 dine-in
   - 15 takeaway
   - 15 delivery
4. Process all payments
5. Close shift
6. Check localStorage size:
   ```javascript
   // Calculate total storage used
   let total = 0
   for (let key in localStorage) {
     if (key.startsWith('kitchen-app')) {
       total += localStorage[key].length
     }
   }
   console.log(`Total storage: ${total / 1024}KB`)
   ```
7. Reconnect internet
8. Monitor sync progress
9. Verify all data synced

**Expected Results:**
- [x] All 50 orders created successfully
- [x] All payments processed
- [x] Shift closed
- [x] localStorage size < 10MB
- [x] All data synced to Supabase
- [x] Sync completed < 60s
- [x] No errors or data loss

**Performance Limits:**
- localStorage max size: **10MB**
- Max orders before sync required: **100**
- Sync time for 50 orders: **< 60s**

---

### Scenario 6: Network Instability

**Goal:** Test behavior with intermittent connectivity.

**Simulation:**
- Network drops periodically
- Slow connection (throttled)
- Request timeouts

**Test Steps:**
1. Create order
2. Disconnect network for 10s
3. Reconnect for 5s
4. Disconnect for 20s
5. Reconnect permanently
6. Verify data integrity

**Expected Results:**
- [x] POS remains functional during drops
- [x] UI shows connection status
- [x] Sync retries automatically
- [x] No duplicate data created
- [x] All transactions eventually synced

---

## 🛠️ Testing Tools

### 1. Chrome DevTools

**Network Tab:**
- Offline mode: Disable network
- Throttling: Simulate slow connection
- Request inspection: Monitor Supabase calls

**Application Tab:**
- localStorage: Inspect stored data
- Service Workers: Monitor sync events (future)
- Cache Storage: Check offline assets (future)

**Console:**
```javascript
// Check localStorage data
Object.keys(localStorage).filter(key => key.startsWith('kitchen-app'))

// Get orders
JSON.parse(localStorage.getItem('kitchen-app:orders'))

// Get sync queue
JSON.parse(localStorage.getItem('kitchen-app:sync-queue'))

// Check storage size
let total = 0
for (let key in localStorage) {
  if (key.startsWith('kitchen-app')) {
    total += localStorage[key].length
  }
}
console.log(`Storage: ${(total / 1024).toFixed(2)}KB`)
```

---

### 2. Offline Debug View

**Location:** `/debug/offline` (to be created in Phase 7)

**Features:**
- Network status indicator
- Last sync timestamp
- Pending sync items count
- Sync queue visualization
- localStorage browser
- Manual sync trigger
- Clear queue button

**Component Template:**
```vue
<template>
  <v-container>
    <h1>Offline Debug</h1>

    <!-- Network Status -->
    <v-card class="mb-4">
      <v-card-title>Network Status</v-card-title>
      <v-card-text>
        <div>Online: {{ isOnline ? '✅ Yes' : '❌ No' }}</div>
        <div>Last sync: {{ lastSync || 'Never' }}</div>
        <div>Pending items: {{ pendingCount }}</div>
      </v-card-text>
    </v-card>

    <!-- Sync Queue -->
    <v-card class="mb-4">
      <v-card-title>Sync Queue ({{ syncQueue.length }} items)</v-card-title>
      <v-list>
        <v-list-item v-for="item in syncQueue" :key="item.id">
          <v-list-item-title>
            {{ item.entityType }} - {{ item.operation }}
          </v-list-item-title>
          <v-list-item-subtitle>
            Status: {{ item.status }} | Priority: {{ item.priority }} |
            Attempts: {{ item.attempts }}/{{ item.maxAttempts }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-actions>
        <v-btn @click="forceSyncNow" color="primary">Force Sync</v-btn>
        <v-btn @click="clearQueue" color="error">Clear Queue</v-btn>
      </v-card-actions>
    </v-card>

    <!-- localStorage Browser -->
    <v-card>
      <v-card-title>localStorage Data</v-card-title>
      <v-card-text>
        <pre>{{ localStorageData }}</pre>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSyncService } from '@/core/sync/SyncService'

const syncService = useSyncService()
const isOnline = ref(navigator.onLine)
const lastSync = ref<string | null>(null)
const syncQueue = ref<any[]>([])

const pendingCount = computed(() =>
  syncQueue.value.filter(item => item.status === 'pending').length
)

const localStorageData = computed(() => {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('kitchen-app')) {
      data[key] = JSON.parse(localStorage.getItem(key) || '{}')
    }
  }
  return data
})

onMounted(() => {
  window.addEventListener('online', () => {
    isOnline.value = true
    syncService.processQueue()
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  loadSyncQueue()
})

async function loadSyncQueue() {
  syncQueue.value = await syncService.getQueueItems()
}

async function forceSyncNow() {
  await syncService.processQueue()
  await loadSyncQueue()
}

async function clearQueue() {
  if (confirm('Clear sync queue? This may cause data loss!')) {
    await syncService.clearQueue()
    await loadSyncQueue()
  }
}
</script>
```

---

### 3. Automated Tests (Playwright)

**Test File:** `tests/offline.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('POS Offline Mode', () => {
  test('should create order offline', async ({ page, context }) => {
    await page.goto('/pos')

    // Go offline
    await context.setOffline(true)

    // Create order
    await page.click('text=New Order')
    await page.fill('[data-test="table-number"]', '5')
    await page.click('text=Confirm')

    // Add items
    await page.click('text=Nasi Goreng')
    await page.click('text=Add to Order')

    // Verify localStorage
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('kitchen-app:orders')
    })
    expect(localStorageData).toBeTruthy()

    // Go online
    await context.setOffline(false)

    // Wait for sync
    await page.waitForTimeout(5000)

    // Verify synced
    const syncStatus = await page.textContent('[data-test="sync-status"]')
    expect(syncStatus).toContain('Synced')
  })

  test('should process payment offline', async ({ page, context }) => {
    await page.goto('/pos')
    await context.setOffline(true)

    // Create order
    await page.click('text=New Order')
    await page.fill('[data-test="table-number"]', '10')
    await page.click('text=Confirm')
    await page.click('text=Nasi Goreng')

    // Process payment
    await page.click('text=Checkout')
    await page.click('[data-test="payment-cash"]')
    await page.fill('[data-test="payment-amount"]', '50000')
    await page.click('text=Complete Payment')

    // Verify payment saved
    const paymentData = await page.evaluate(() => {
      return localStorage.getItem('kitchen-app:payments')
    })
    expect(paymentData).toBeTruthy()

    // Go online and verify sync
    await context.setOffline(false)
    await page.waitForTimeout(5000)

    const syncStatus = await page.textContent('[data-test="sync-status"]')
    expect(syncStatus).toContain('Synced')
  })

  test('should handle 100 offline orders (load test)', async ({ page, context }) => {
    await page.goto('/pos')
    await context.setOffline(true)

    const startTime = Date.now()

    // Create 100 orders
    for (let i = 0; i < 100; i++) {
      await page.click('text=New Order')
      await page.fill('[data-test="table-number"]', String(i + 1))
      await page.click('text=Confirm')
      await page.click('text=Nasi Goreng')
      await page.click('text=Save Order')
    }

    const createTime = Date.now() - startTime
    expect(createTime).toBeLessThan(60000) // < 60s for 100 orders

    // Sync
    await context.setOffline(false)
    const syncStartTime = Date.now()
    await page.waitForSelector('[data-test="sync-complete"]', { timeout: 120000 })
    const syncTime = Date.now() - syncStartTime

    expect(syncTime).toBeLessThan(120000) // < 2 min to sync 100 orders

    console.log(`Create: ${createTime}ms, Sync: ${syncTime}ms`)
  })
})
```

**Run tests:**
```bash
# Install Playwright
pnpm add -D @playwright/test

# Run offline tests
pnpm test:offline
```

---

## 📊 Performance Benchmarks

### Target Performance

| Operation | Target | Acceptable | Critical |
|-----------|--------|------------|----------|
| Create Order Offline | < 500ms | < 1s | < 2s |
| Save to localStorage | < 100ms | < 200ms | < 500ms |
| Load from localStorage | < 200ms | < 500ms | < 1s |
| Sync single order | < 2s | < 5s | < 10s |
| Sync 50 orders | < 30s | < 60s | < 120s |
| Shift close | < 2s | < 3s | < 5s |
| localStorage size | < 5MB | < 10MB | < 15MB |

### Monitoring

**Metrics to track:**
- localStorage read/write time
- Sync queue processing time
- Network request latency
- Conflict resolution count
- Failed sync attempts
- localStorage size growth

**Tools:**
- Performance API
- Chrome Performance tab
- Custom timing logs

---

## ✅ ACCEPTANCE CRITERIA

Before marking Phase 7 complete, ALL following criteria must be met:

### Functional Requirements
- [ ] POS loads and runs fully offline
- [ ] Orders created offline appear in UI
- [ ] Payments processed offline
- [ ] Shifts closed offline
- [ ] Auto-sync triggers on reconnect
- [ ] Manual sync works (force sync button)
- [ ] Sync queue persists across page reload
- [ ] Conflict resolution doesn't lose data

### Performance Requirements
- [ ] Order creation < 1s offline
- [ ] localStorage operations < 200ms
- [ ] Sync 50 orders < 60s
- [ ] localStorage size < 10MB for 100 orders

### UX Requirements
- [ ] Connection status visible in UI
- [ ] Sync status indicator shows state
- [ ] User notified when offline
- [ ] User notified when sync complete
- [ ] Errors handled gracefully
- [ ] No UI freezes during sync

### Data Integrity
- [ ] No duplicate orders after sync
- [ ] No missing transactions
- [ ] Shift totals accurate
- [ ] Account transactions correct
- [ ] Timestamps preserved
- [ ] User attribution maintained

### Edge Cases
- [ ] Network drops during sync
- [ ] Multiple quick disconnects/reconnects
- [ ] localStorage quota exceeded (handled)
- [ ] Concurrent edits resolved
- [ ] Server errors during sync (retry)
- [ ] Invalid data rejected

---

## 🐛 KNOWN ISSUES & LIMITATIONS

### Current Limitations

1. **localStorage Quota**
   - Limit: ~10MB per origin
   - Impact: Can store ~100-200 orders offline
   - Mitigation: Clear old synced data periodically

2. **No Service Worker**
   - App shell not cached
   - First load requires internet
   - Future: Add Service Worker (v1.1)

3. **Conflict Resolution**
   - Basic strategies only (server-wins, local-wins)
   - No smart merge for complex conflicts
   - Future: Improve merge logic

4. **Sync Queue Priority**
   - Priority levels defined but not fully tested
   - May need tuning based on real usage

---

## 📅 TESTING TIMELINE

**Phase 7: Offline-First Testing (2-3 days)**

### Day 1: Manual Testing
- [ ] Test Scenario 1-3 (Create order, Payment, Shift close)
- [ ] Document findings
- [ ] Fix critical issues

### Day 2: Automated Testing + Load Testing
- [ ] Create Playwright tests
- [ ] Run Scenario 4-6 (Conflicts, Extended offline, Network instability)
- [ ] Measure performance
- [ ] Fix issues

### Day 3: Edge Cases + Validation
- [ ] Test all edge cases
- [ ] Validate acceptance criteria
- [ ] Performance optimization
- [ ] Final sign-off

---

## ✅ SIGN-OFF

**Testing Complete:** [ ] Date: _______

**Tested By:** _______________________

**Issues Found:** _______

**Critical Issues:** _______

**All Acceptance Criteria Met:** [ ] Yes [ ] No

**Ready for Production:** [ ] Yes [ ] No

**Notes:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

**Next Phase:** Phase 8 - Production Hardening
