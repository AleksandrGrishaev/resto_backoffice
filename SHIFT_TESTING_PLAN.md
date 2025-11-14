# 🧪 Shift Closing & Sync Testing Plan

**Sprint 7 - Supabase Integration**
**Date:** 2025-11-14

## 📋 Changes Summary

### 1. **shiftsService.endShift()** (services.ts:228)

**What changed:**

- ✅ Added Supabase UPDATE when closing shift
- ✅ Updates: `status='completed'`, `endTime`, `duration`, `endingCash`, `corrections`, etc.
- ✅ Fallback to localStorage if offline

**Code pattern:**

```typescript
// Try to update in Supabase first
if (this.isSupabaseAvailable()) {
  const supabaseUpdate = toSupabaseUpdate(updatedShift)
  const { error } = await supabase.from('shifts').update(supabaseUpdate).eq('id', shift.id)

  if (error) {
    console.warn('⚠️ Supabase update failed when closing shift')
    updatedShift.syncStatus = 'pending'
    updatedShift.pendingSync = true
  } else {
    console.log('✅ Смена закрыта и обновлена в Supabase')
  }
} else {
  // Offline mode - mark for sync
  updatedShift.syncStatus = 'pending'
  updatedShift.pendingSync = true
}

// Always save to localStorage
await this.saveShift(updatedShift)
```

### 2. **ShiftSyncAdapter.sync()** (ShiftSyncAdapter.ts:16)

**What changed:**

- ✅ After creating transactions in Account Store, updates shift in Supabase
- ✅ Sets `syncedToAccount: true`, `syncedAt`, `accountTransactionIds`
- ✅ Clears `syncError` on success

**Code pattern:**

```typescript
// After creating account transactions...

shift.syncedToAccount = true
shift.syncedAt = new Date().toISOString()
shift.accountTransactionIds = transactionIds

// SPRINT 7: UPDATE IN SUPABASE
if (this.isSupabaseAvailable()) {
  const supabaseUpdate = toSupabaseUpdate(shift)
  const { error } = await supabase.from('shifts').update(supabaseUpdate).eq('id', shift.id)

  if (error) {
    console.warn('⚠️ Failed to update shift in Supabase after account sync')
  } else {
    console.log('✅ Shift updated in Supabase with sync status')
  }
}

// Always save to localStorage (for offline cache)
this.saveShiftToLocalStorage(shift)
```

---

## 🧪 Test Scenarios

### **Scenario 1: Online Mode - Full Happy Path** ✅

**Goal:** Verify shift closes and syncs to Supabase immediately

**Steps:**

1. **Start shift** (POS)

   - Login as cashier
   - Start new shift
   - ✅ Verify: Shift appears in Supabase with `status='active'`

2. **Create some orders** (POS)

   - Create 2-3 orders
   - Accept payments (cash, card)

3. **Close shift** (POS)

   - Click "End Shift"
   - Enter ending cash amount
   - Submit

4. **Verify in Supabase** (Check database directly)

   ```sql
   SELECT id, shift_number, status, end_time, ending_cash, synced_to_account
   FROM shifts
   WHERE shift_number = 'SHIFT-20251114-XXXX'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected:**

   - ✅ `status = 'completed'`
   - ✅ `end_time IS NOT NULL`
   - ✅ `ending_cash` matches entered value
   - ✅ `duration` calculated correctly

5. **Wait for SyncService to process** (~5-10 seconds)

   - Check console for sync logs:
     ```
     🔄 Syncing shift SHIFT-20251114-XXXX to account
     ✅ Income transaction created: ...
     ✅ Shift updated in Supabase with sync status
     ```

6. **Verify in Supabase again**

   ```sql
   SELECT id, shift_number, synced_to_account, synced_at, account_transaction_ids
   FROM shifts
   WHERE shift_number = 'SHIFT-20251114-XXXX';
   ```

   **Expected:**

   - ✅ `synced_to_account = true`
   - ✅ `synced_at IS NOT NULL`
   - ✅ `account_transaction_ids` contains transaction IDs array

7. **Verify in Backoffice** (ShiftHistoryView)

   - Navigate to Shift History
   - Find the shift

   **Expected:**

   - ✅ Shows `status = 'completed'`
   - ✅ Shows correct `end_time`, `ending_cash`
   - ✅ Sync chip shows "Synced" (green)

---

### **Scenario 2: Offline Mode - Shift Closing** 🔴

**Goal:** Verify shift closes locally when offline, syncs when back online

**Steps:**

1. **Start shift** (POS, online)

   - Start new shift
   - ✅ Verify: Shift in Supabase

2. **Create orders** (POS, online)

   - Create 2-3 orders

3. **Disconnect internet** 🔌

   - Turn off WiFi or use browser DevTools (Network → Offline)

4. **Close shift** (POS, offline)

   - Click "End Shift"
   - Enter ending cash
   - Submit

   **Expected console logs:**

   ```
   ⚠️ Supabase update failed when closing shift, saving to localStorage only
   ✅ Смена завершена: SHIFT-20251114-XXXX
   🔄 Preparing to sync shift ... (attempt 1)
   ❌ Error syncing shift ...: [network error]
   ```

5. **Verify localStorage**

   ```javascript
   // In browser console
   const shifts = JSON.parse(localStorage.getItem('pos_shifts'))
   const shift = shifts.find(s => s.shiftNumber === 'SHIFT-20251114-XXXX')
   console.log(shift)
   ```

   **Expected:**

   - ✅ `status = 'completed'`
   - ✅ `syncStatus = 'pending'`
   - ✅ `pendingSync = true`

6. **Verify in Supabase** (Check database)

   ```sql
   SELECT status, end_time
   FROM shifts
   WHERE shift_number = 'SHIFT-20251114-XXXX';
   ```

   **Expected:**

   - ❌ `status = 'active'` (NOT updated - we were offline!)
   - ❌ `end_time IS NULL`

7. **Reconnect internet** 🌐

   - Turn WiFi back on

8. **Trigger sync manually or wait**

   - Option A: Reload page (triggers `processSyncQueue()` on init)
   - Option B: Wait for next sync attempt (exponential backoff)

9. **Verify sync success**

   ```
   🔄 Processing sync queue: 1 items
   🔄 Syncing shift SHIFT-20251114-XXXX to account
   ✅ Shift updated in Supabase with sync status
   ✅ Shift SHIFT-20251114-XXXX synced to account (X transactions created)
   ```

10. **Verify in Supabase** (Check database)

    ```sql
    SELECT status, end_time, synced_to_account, synced_at
    FROM shifts
    WHERE shift_number = 'SHIFT-20251114-XXXX';
    ```

    **Expected:**

    - ✅ `status = 'completed'` (NOW updated!)
    - ✅ `end_time IS NOT NULL`
    - ✅ `synced_to_account = true`
    - ✅ `synced_at IS NOT NULL`

---

### **Scenario 3: Backoffice View Consistency** 📊

**Goal:** Verify Backoffice always shows latest data from Supabase

**Steps:**

1. **POS: Create and close shift** (online)

   - Follow Scenario 1

2. **Backoffice: Open ShiftHistoryView**

   - Navigate to Shift History
   - DO NOT reload page

   **Expected:**

   - ❌ Shift MAY NOT appear yet (no real-time subscriptions in MVP)

3. **Backoffice: Reload page**

   - Press F5 or Cmd+R

   **Expected:**

   - ✅ Shift appears in table
   - ✅ Shows `status = 'completed'`
   - ✅ Shows correct totals, sync status

4. **POS: Close another shift** (in different tab/device)

5. **Backoffice: Click table header to re-sort** (triggers re-fetch)

   - Or manually reload

   **Expected:**

   - ✅ New shift appears

---

### **Scenario 4: Shift with Corrections** 💰

**Goal:** Verify corrections are saved to Supabase

**Steps:**

1. **Start and close shift with corrections**

   - Start shift with 100,000 starting cash
   - Create orders totaling 50,000
   - Expected cash: 150,000
   - Actual cash: 145,000 (shortage!)
   - Add correction: "Cash shortage - 5,000"
   - Close shift

2. **Verify in Supabase**

   ```sql
   SELECT corrections, cash_discrepancy, cash_discrepancy_type
   FROM shifts
   WHERE shift_number = 'SHIFT-20251114-XXXX';
   ```

   **Expected:**

   - ✅ `corrections` JSONB contains correction object
   - ✅ `cash_discrepancy = -5000`
   - ✅ `cash_discrepancy_type = 'shortage'`

---

### **Scenario 5: Multiple Shifts Sync Queue** 📦

**Goal:** Test SyncService queue with multiple shifts

**Steps:**

1. **Offline: Close 3 shifts**

   - Disconnect internet
   - Close shift #1
   - Close shift #2
   - Close shift #3

2. **Verify sync queue**

   ```javascript
   // In browser console
   const queue = JSON.parse(localStorage.getItem('sync_queue'))
   console.log(queue.length) // Should be 3
   ```

3. **Reconnect internet**

   - Turn WiFi back on
   - Reload page or wait

4. **Verify all sync**

   ```
   🔄 Processing sync queue: 3 items
   ✅ Shift #1 synced
   ✅ Shift #2 synced
   ✅ Shift #3 synced
   ```

5. **Verify in Supabase**

   ```sql
   SELECT shift_number, status, synced_to_account
   FROM shifts
   WHERE shift_number IN ('SHIFT-...', 'SHIFT-...', 'SHIFT-...')
   ORDER BY created_at DESC;
   ```

   **Expected:**

   - ✅ All 3 shifts have `status = 'completed'`
   - ✅ All 3 shifts have `synced_to_account = true`

---

## 🐛 Common Issues & Debugging

### Issue 1: Shift not updating in Supabase after closing

**Symptoms:**

- POS shows "Shift closed"
- Supabase still shows `status = 'active'`

**Debug:**

1. Check console for errors:
   ```
   ⚠️ Supabase update failed when closing shift: [error message]
   ```
2. Check network tab in DevTools
3. Verify Supabase credentials in `.env.development`
4. Check RLS policies (should allow authenticated users)

**Fix:**

- If offline → expected behavior, sync will happen when online
- If online → check Supabase error message

---

### Issue 2: SyncService not processing queue

**Symptoms:**

- Shift closed offline
- Internet reconnected
- Shift still not synced

**Debug:**

1. Check sync queue:
   ```javascript
   const queue = JSON.parse(localStorage.getItem('sync_queue'))
   console.log(queue)
   ```
2. Check if `ShiftSyncAdapter` is registered:
   ```javascript
   // Should be called in posStore.initializePOS()
   syncService.registerAdapter(new ShiftSyncAdapter())
   ```
3. Manually trigger sync:
   ```javascript
   const { useSyncService } = await import('@/core/sync/SyncService')
   const syncService = useSyncService()
   await syncService.processQueue()
   ```

**Fix:**

- Reload page (triggers `processQueue()` on init)
- Wait for exponential backoff retry
- Check max attempts not exceeded (default: 10)

---

### Issue 3: Backoffice shows stale data

**Symptoms:**

- Shift closed in POS
- Backoffice still shows old data

**Debug:**

1. Check `loadShifts()` in ShiftHistoryView:
   ```javascript
   // Should call shiftsStore.loadShifts()
   // Which calls shiftsService.loadShifts()
   // Which reads from Supabase
   ```
2. Check Supabase has latest data:
   ```sql
   SELECT * FROM shifts ORDER BY updated_at DESC LIMIT 5;
   ```

**Fix:**

- Reload page (re-fetches from Supabase)
- In future: implement real-time subscriptions (Sprint 8+)

---

## ✅ Success Criteria

### Must Pass:

- ✅ **Scenario 1** - Online shift closing updates Supabase immediately
- ✅ **Scenario 2** - Offline shift closing syncs when back online
- ✅ **Scenario 3** - Backoffice reads latest data from Supabase

### Should Pass:

- ✅ **Scenario 4** - Corrections saved correctly
- ✅ **Scenario 5** - Multiple shifts sync in queue

### Nice to Have:

- Real-time updates in Backoffice (Sprint 8+)
- Conflict resolution UI (Sprint 10+)

---

## 📝 Test Execution Log

**Tester:** ********\_********
**Date:** ********\_********

| Scenario             | Status            | Notes |
| -------------------- | ----------------- | ----- |
| 1. Online Happy Path | ⬜ Pass / ⬜ Fail |       |
| 2. Offline Closing   | ⬜ Pass / ⬜ Fail |       |
| 3. Backoffice View   | ⬜ Pass / ⬜ Fail |       |
| 4. Corrections       | ⬜ Pass / ⬜ Fail |       |
| 5. Multiple Shifts   | ⬜ Pass / ⬜ Fail |       |

**Issues found:**

---

---

---

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## 🚀 Next Steps After Testing

1. ✅ If all tests pass → Update todo.md, mark Sprint 7 Day 1-2 as complete
2. ❌ If tests fail → Debug issues, fix bugs, re-test
3. 📄 Document any edge cases found
4. ➡️ Move to next Sprint 7 task: Orders & Payments Store → Supabase
