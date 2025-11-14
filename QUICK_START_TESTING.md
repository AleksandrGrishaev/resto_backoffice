# 🚀 Quick Start: Testing Shift Closing & Supabase Sync

**Sprint 7 - Day 1-2 Deliverable Testing**

## 📦 What We Built

✅ **Shift closing now syncs to Supabase** (online + offline modes)
✅ **ShiftSyncAdapter updates Supabase** after Account Store sync
✅ **Backoffice reads from Supabase** (real-time data)

---

## ⚡ Quick Test (5 minutes)

### 1. Start Dev Server

```bash
cd /Users/peaker/dev/kitchen-app/backoffice
pnpm dev
```

Open: http://localhost:5174

---

### 2. Login & Start Shift

**Login:**

- Email: `admin@example.com`
- PIN: `1234` (or any cashier)

**Navigate to POS:**

- Click "POS" in menu or go to `/pos`

**Start Shift:**

- Click "Start Shift"
- Enter starting cash: `100000`
- Click "Start"

**✅ Verify in Supabase:**

```sql
SELECT shift_number, status, start_time, cashier_name
FROM shifts
ORDER BY created_at DESC
LIMIT 1;
```

Expected: New shift with `status = 'active'`

---

### 3. Create Some Orders (Optional)

- Click on a table
- Add items
- Accept payment (cash or card)

---

### 4. Close Shift (MAIN TEST)

**Close:**

- Click "End Shift"
- Enter ending cash: `150000`
- (Optional) Add corrections if needed
- Click "Close Shift"

**Watch Console:**

```
✅ Смена закрыта и обновлена в Supabase: SHIFT-20251114-XXXX
✅ Смена завершена: SHIFT-20251114-XXXX
```

**✅ Verify in Supabase (immediately):**

```sql
SELECT shift_number, status, end_time, ending_cash,
       synced_to_account, synced_at
FROM shifts
WHERE shift_number = 'SHIFT-20251114-XXXX';
```

**Expected:**

- ✅ `status = 'completed'` (CHANGED from 'active')
- ✅ `end_time IS NOT NULL`
- ✅ `ending_cash = 150000`

---

### 5. Wait for Account Sync (5-10 seconds)

**Watch Console:**

```
🔄 Preparing to sync shift SHIFT-20251114-XXXX (attempt 1)
🔄 Syncing shift SHIFT-20251114-XXXX to account:
  - Cash received: 50000
  - Net income: 50000
✅ Income transaction created: ...
✅ Shift updated in Supabase with sync status
✅ Shift SHIFT-20251114-XXXX synced to account (1 transactions created)
```

**✅ Verify in Supabase (after sync):**

```sql
SELECT shift_number, synced_to_account, synced_at,
       account_transaction_ids
FROM shifts
WHERE shift_number = 'SHIFT-20251114-XXXX';
```

**Expected:**

- ✅ `synced_to_account = true` (CHANGED from false/null)
- ✅ `synced_at IS NOT NULL`
- ✅ `account_transaction_ids` array not empty

---

### 6. Verify in Backoffice

**Navigate to Shift History:**

- Click "Sales" → "Shift History" or go to `/backoffice/sales/shift-history`

**Find your shift:**

- Should be at the top (newest first)

**✅ Expected:**

- ✅ Shows shift number: `SHIFT-20251114-XXXX`
- ✅ Shows cashier name
- ✅ Shows end time (not "—")
- ✅ Shows total expected & actual
- ✅ Sync status chip: **"Synced"** (green, with checkmark icon)

**Click on shift row:**

- Opens shift details dialog
- Shows all shift data

---

## 🔴 Offline Test (Extra 5 minutes)

### 1. Start New Shift (Online)

- Start another shift
- Create 1-2 orders

---

### 2. Disconnect Internet

**Option A: Browser DevTools**

- F12 → Network tab → Throttling: "Offline"

**Option B: System WiFi**

- Turn off WiFi

---

### 3. Close Shift (Offline)

**Close:**

- Click "End Shift"
- Enter ending cash
- Click "Close Shift"

**Watch Console:**

```
⚠️ Supabase update failed when closing shift, saving to localStorage only: [network error]
✅ Смена завершена: SHIFT-20251114-XXXX
📤 Shift added to sync queue (attempt 1)
```

**✅ Verify in Supabase:**

```sql
SELECT status, end_time
FROM shifts
WHERE shift_number = 'SHIFT-20251114-XXXX';
```

**Expected:**

- ❌ `status = 'active'` (NOT updated - we're offline!)
- ❌ `end_time IS NULL`

---

### 4. Reconnect Internet

**Option A: Browser DevTools**

- F12 → Network tab → Throttling: "No throttling"

**Option B: System WiFi**

- Turn WiFi back on

---

### 5. Trigger Sync

**Option A: Reload Page**

- Press F5 or Cmd+R
- This triggers `processSyncQueue()` on init

**Option B: Wait**

- SyncService will retry automatically (exponential backoff)

**Watch Console:**

```
🔄 Processing sync queue: 1 items
🔄 Syncing shift SHIFT-20251114-XXXX to account
✅ Shift updated in Supabase with sync status
✅ Shift SHIFT-20251114-XXXX synced to account
```

---

### 6. Verify Sync Success

**✅ Verify in Supabase:**

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

**✅ Verify in Backoffice:**

- Reload Shift History page
- Find shift
- Sync status: **"Synced"** (green)

---

## 🐛 If Something Goes Wrong

### Console shows error

**Check:**

1. Supabase credentials in `.env.development`
2. Network tab in DevTools (is request failing?)
3. Supabase dashboard (are RLS policies correct?)

### Shift not updating in Supabase

**Check:**

1. `ENV.supabase.enabled` is `true` (in environment.ts)
2. `navigator.onLine` is `true` (online mode)
3. Console for error messages

### Backoffice shows old data

**Solution:**

- Reload page (no real-time subscriptions in MVP)
- Check Supabase has latest data directly

---

## 📊 Quick Supabase Queries

**View all shifts:**

```sql
SELECT shift_number, status, cashier_name,
       start_time, end_time, total_sales,
       synced_to_account, synced_at
FROM shifts
ORDER BY created_at DESC
LIMIT 10;
```

**View pending shifts (not synced):**

```sql
SELECT shift_number, status, synced_to_account,
       sync_error, sync_attempts
FROM shifts
WHERE status = 'completed'
  AND (synced_to_account IS NULL OR synced_to_account = false)
ORDER BY created_at DESC;
```

**View sync errors:**

```sql
SELECT shift_number, sync_error, sync_attempts,
       last_sync_attempt
FROM shifts
WHERE sync_error IS NOT NULL
ORDER BY last_sync_attempt DESC;
```

---

## ✅ Success = All These Work

1. ✅ Shift closes online → Supabase updated immediately
2. ✅ Shift closes offline → localStorage saved, syncs when online
3. ✅ Account sync updates Supabase with `syncedToAccount: true`
4. ✅ Backoffice reads latest data from Supabase
5. ✅ No TypeScript errors
6. ✅ No runtime errors in console

---

## 📝 Full Test Plan

For comprehensive testing scenarios, see: **SHIFT_TESTING_PLAN.md**

---

## 🆘 Need Help?

**Check logs:**

```javascript
// Browser console
console.log('Shifts:', JSON.parse(localStorage.getItem('pos_shifts')))
console.log('Sync queue:', JSON.parse(localStorage.getItem('sync_queue')))
```

**Manual sync:**

```javascript
// Browser console
const { useSyncService } = await import('/src/core/sync/SyncService')
const syncService = useSyncService()
await syncService.processQueue()
```

**Check environment:**

```javascript
// Browser console
import { ENV } from '/src/config/environment'
console.log('Supabase enabled:', ENV.supabase.enabled)
console.log('Online:', navigator.onLine)
```
