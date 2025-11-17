# =� Next Sprint: Offline Sync & Queue Management

## <� Goal: Complete Offline-First Architecture

**Priority:** HIGH (Production Critical)
**Estimated Time:** Sprint 9, Week 1-2

---

## =� Current Status

###  What Works Now:

1. **Dual-Write Pattern:**

   - Orders: Supabase + localStorage 
   - Payments: Supabase + localStorage 
   - Tables: Supabase + localStorage 
   - Shifts: Supabase + localStorage 

2. **Offline Fallback:**

   - All entities save to localStorage when offline 
   - App continues working without internet 

3. **Realtime Sync:**
   - Kitchen � POS sync works online 
   - Order status updates propagate in real-time 

### L What's Missing:

1. **Sync Queue:**

   - Offline operations not queued for later sync L
   - No automatic retry when connection restored L

2. **Auto-Sync on Reconnect:**

   - Manual sync required after going online L
   - No background sync process L

3. **Conflict Resolution:**

   - No handling for concurrent edits L
   - Last-write-wins can cause data loss L

4. **Sync Status Tracking:**
   - No UI indicator for pending syncs L
   - No visibility into sync failures L

---

## =� Sprint 9 Plan

### Week 1: Sync Queue Integration

#### Task 1: Integrate SyncService with Payments

**File:** `src/stores/pos/payments/services.ts`
**Status:** =2 Pending

**Changes Needed:**

1. Import SyncService:

   ```typescript
   import { useSyncService } from '@/core/sync/SyncService'
   ```

2. Update `savePayment()`:

   ```typescript
   async savePayment(payment: PosPayment) {
     // Try Supabase first
     try {
       await supabase.from('payments').insert(...)
       console.log(' Payment synced to Supabase')
     } catch (error) {
       console.log('L Supabase failed, adding to sync queue')

       // Add to sync queue for later
       const syncService = useSyncService()
       await syncService.addToQueue({
         entityType: 'payment',
         entityId: payment.id,
         operation: 'create',
         priority: 'critical',
         data: payment,
         maxAttempts: 10
       })
     }

     // Always save to localStorage
     await this.saveToLocalStorage(payment)
   }
   ```

3. Create PaymentSyncAdapter:
   - File: `src/core/sync/adapters/PaymentSyncAdapter.ts`
   - Implements `ISyncAdapter` interface
   - Handles payment-specific sync logic

**Testing:**

- [ ] Create payment offline � verify in queue
- [ ] Restore connection � verify auto-sync
- [ ] Check payment in Supabase after sync

---

#### Task 2: Integrate SyncService with Orders

**File:** `src/stores/pos/orders/services.ts`
**Status:** =2 Pending

**Changes Needed:**

1. Update `createOrder()` and `updateOrder()`:

   - Add to sync queue on Supabase failure
   - Track sync status in localStorage

2. Create OrderSyncAdapter:
   - File: `src/core/sync/adapters/OrderSyncAdapter.ts`
   - Handle bills flattening/reconstruction
   - Manage item-level updates

**Complexity:** HIGH (nested structure, realtime conflicts)

**Testing:**

- [ ] Create order offline � verify in queue
- [ ] Update items offline � verify queued
- [ ] Sync on reconnect � verify bills reconstructed

---

#### Task 3: Integrate SyncService with Tables

**File:** `src/stores/pos/tables/services.ts`
**Status:** =2 Pending

**Changes Needed:**

1. Update `updateTableStatus()`:

   - Queue status changes when offline
   - Handle concurrent table reservations

2. Create TableSyncAdapter:
   - File: `src/core/sync/adapters/TableSyncAdapter.ts`
   - Simple entity (no nested data)

**Testing:**

- [ ] Occupy table offline � verify queued
- [ ] Free table offline � verify queued
- [ ] Sync on reconnect � verify status updated

---

### Week 2: Auto-Sync & Network Monitoring

#### Task 4: Network Status Monitoring

**File:** `src/composables/usePlatform.ts`
**Status:** =2 Pending (already has basic detection)

**Enhancements Needed:**

1. Add event listeners:

   ```typescript
   window.addEventListener('online', handleOnline)
   window.addEventListener('offline', handleOffline)
   ```

2. Trigger sync on reconnect:
   ```typescript
   async function handleOnline() {
     console.log('< Network restored, starting sync...')
     const syncService = useSyncService()
     await syncService.processQueue()
   }
   ```

**Testing:**

- [ ] Disconnect internet � verify offline detection
- [ ] Reconnect � verify auto-sync triggered
- [ ] Check console logs for sync progress

---

#### Task 5: Sync Status UI

**Components to Create:**

1. **SyncStatusIndicator.vue**

   - Location: `src/components/sync/`
   - Shows: Online/Offline status
   - Shows: Pending sync count
   - Shows: Last sync time

2. **SyncQueueDialog.vue**
   - Shows pending sync items
   - Allows manual retry
   - Shows sync errors

**Integration Points:**

- Add to POS header
- Add to Kitchen header
- Add to main navigation (backoffice)

**Testing:**

- [ ] Create items offline � see pending count increase
- [ ] Sync items � see count decrease
- [ ] View queue � see pending items
- [ ] Retry failed sync � verify works

---

### Week 3: Conflict Resolution

#### Task 6: Implement Conflict Resolution Strategies

**File:** `src/core/sync/SyncService.ts`
**Status:** =2 Pending (basic structure exists)

**Strategies to Implement:**

1. **Server Wins (Default):**

   - Discard local changes
   - Use server version
   - Log conflict for review

2. **Local Wins (Payments):**

   - Keep local payment data
   - Overwrite server
   - Critical for cash operations

3. **Merge (Orders):**

   - Merge item-level changes
   - Preserve both additions
   - Resolve duplicates by timestamp

4. **Manual (Tables):**
   - Show conflict dialog
   - Let user choose
   - Log decision

**Testing:**

- [ ] Concurrent order edits � verify merge works
- [ ] Concurrent payment � verify local wins
- [ ] Concurrent table status � verify manual resolution

---

## =� Testing Checklist

### Offline Mode Tests:

- [ ] Create order offline � saved to localStorage
- [ ] Process payment offline � saved to localStorage
- [ ] Update table status offline � saved to localStorage
- [ ] Add items to order offline � saved correctly
- [ ] Check sync queue � verify items queued

### Online Reconnect Tests:

- [ ] Restore connection � auto-sync triggered
- [ ] All queued items synced � verify in Supabase
- [ ] Sync status UI updated � shows success
- [ ] No data loss � verify all offline ops persisted

### Conflict Resolution Tests:

- [ ] Edit same order on 2 devices � verify merge
- [ ] Same payment on 2 devices � verify local wins
- [ ] Same table status on 2 devices � verify resolution

### Realtime Sync Tests:

- [ ] Kitchen � POS sync works online
- [ ] Order status updates propagate
- [ ] Item status updates propagate
- [ ] Table status updates propagate

---

## <� Success Criteria

1.  All offline operations auto-sync when connection restored
2.  Zero data loss in offline mode
3.  Conflict resolution handles concurrent edits
4.  UI shows sync status clearly
5.  Manual retry works for failed syncs
6.  System handles network interruptions gracefully

---

## = Related Files

- **SyncService:** `src/core/sync/SyncService.ts`
- **Sync Types:** `src/core/sync/types.ts`
- **Storage:** `src/core/sync/storage/`
- **Existing Adapter:** `src/core/sync/adapters/ShiftSyncAdapter.ts` (reference)

---

## =� Architecture Notes

### Current Sync Architecture:

```
Offline Operation � localStorage (immediate)
                  �
               Sync Queue (pending)
                  �
         Network Restored � Auto-Sync
                  �
              Supabase (synced)
```

### Sync Queue Structure:

```typescript
interface SyncQueueItem {
  entityType: 'payment' | 'order' | 'table' | 'shift'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  priority: 'critical' | 'high' | 'normal' | 'low'
  data: any
  attempts: number
  maxAttempts: number
  lastAttemptAt?: string
  createdAt: string
}
```

### Conflict Resolution Strategy:

| Entity   | Strategy    | Reason                            |
| -------- | ----------- | --------------------------------- |
| Payments | Local Wins  | Cash operations are authoritative |
| Orders   | Merge Items | Preserve all additions            |
| Tables   | Manual      | Critical for service flow         |
| Shifts   | Server Wins | Single source of truth            |

---

## = Known Issues (Current Implementation)

### Issue 1: Payment Status Resets After Reconnect

**Problem:**

- User pays bill offline � payment saved to localStorage with status 'completed'
- User reconnects to internet � app fetches from Supabase (empty)
- Payment status shows as 'unpaid' in UI

**Root Cause:**

```typescript
// services.ts - getAllPayments()
const { data } = await supabase.from('payments').select('*')
// If Supabase returns [], local data is overwritten!
```

**Solution (Sprint 9):**

```typescript
// Don't overwrite local data if Supabase is empty
const localPayments = await getFromLocalStorage()
const supabasePayments = await getFromSupabase()

// Merge: Keep local payments not in Supabase
const merged = mergeBySyncStatus(localPayments, supabasePayments)
return merged
```

---

### Issue 2: No Sync Queue for Failed Operations

**Problem:**

- Offline payment fails to sync � error logged, but operation lost
- No retry mechanism
- No user notification

**Solution (Sprint 9):**

- Add to SyncService queue
- Auto-retry with exponential backoff
- Show pending sync count in UI

---

### Issue 3: GET Overwrites Local Changes

**Problem:**

```typescript
// Current flow:
1. Offline: Create payment � localStorage
2. Online: getAllPayments() � Supabase GET (empty) � overwrites local
3. Result: Payment lost
```

**Solution (Sprint 9):**

```typescript
// Smart merge strategy:
1. Check sync_status field in localStorage
2. If sync_status = 'pending', don't overwrite with server data
3. Keep local version until successfully synced
```

---

**Created:** 2025-11-16
**Last Updated:** 2025-11-16
**Status:** Planning Phase
**Next Review:** Start of Sprint 9
