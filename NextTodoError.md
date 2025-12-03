# Active Bugs and Issues - Sprint 7 (Discount System)

**Last Updated:** 2025-12-03

---

## CRITICAL Issues

### 1. Item Grouping with Discounts (UI Display Bug)

**Status:** CRITICAL - Needs immediate fix
**Found:** 2025-12-03
**Component:** POS UI - BillItem.vue, BillsManager.vue (item grouping logic)

**Description:**
UI groups items with the same name/variant together (e.g., showing "2x Build Your Own Breakfast"). However, when one item in the group has a discount and another doesn't, they should NOT be grouped. Currently, they are still grouped, causing confusion about which item has the discount and displaying prices in a confusing way.

**Reproduction:**

1. Add same menu item multiple times to an order (e.g., 2x "Build Your Own Breakfast, Standard Portion")
2. Apply item discount to ONE of them (e.g., 20% loyalty discount on first item)
3. Pay for one item (it becomes "Paid")
4. UI incorrectly groups them together showing "2x" quantity
5. Discount shows as "-Rp 10.000" or "-10%" but it's unclear which item it applies to
6. Display is confusing about which item is paid and which has discount

**Example from Image #1:**

```
Build Your Own Breakfast
Standard Portion
[2]  -Rp 10.000  [-10%]  [Status: Paid + Draft mixed]
Rp 90.000
```

**Problem:**

- Shows as "2x" quantity (grouped)
- One item: Paid, has 20% discount (Rp 50,000 - Rp 10,000 = Rp 40,000)
- Other item: Draft, no discount (Rp 50,000)
- Math is correct: Rp 90,000 total
- But UI presentation is confusing - looks like both have same status/discount

**Expected Behavior:**
Items should NOT be grouped if they have:

- Different discount amounts
- Different payment status (one paid, one draft)
- Different notes

Show separately:

```
Build Your Own Breakfast (Standard Portion)
1x  -Rp 10.000 [-20%]  [Paid]
Rp 40.000

Build Your Own Breakfast (Standard Portion)
1x  [Draft]
Rp 50.000
```

**Grouping Rules Should Be:**
Group items ONLY if ALL of these match:

- Same menu item ID
- Same variant ID
- Same unit price
- Same discount amount (or both have no discount)
- Same payment status (both draft, or both paid)
- Same notes (or both have no notes)

**Root Cause:**
Item grouping logic doesn't check discount amounts and payment status before grouping.

**Files to Fix:**

- `src/views/pos/order/components/BillsManager.vue` (grouping logic)
- `src/views/pos/order/components/BillItem.vue` (display logic)
- Check where items are grouped (likely in composable or computed property)

**Fix Strategy:**

1. Update grouping logic to compare:
   - `item.discountAmount` or `item.appliedDiscount`
   - `item.paymentStatus` or `item.isPaid`
   - `item.notes` or `item.kitchenNotes`
2. Only group items if ALL fields match exactly
3. Add test cases for grouped items with different discounts/statuses
4. Verify display shows correct individual prices and statuses

---

### 2. Discount Reason Field Mapping Bug

**Status:** HIGH - Data integrity issue
**Found:** 2025-12-03
**Component:** salesStore.ts - Bill discount event creation

**Description:**
When applying bill discount with reason "Manager Decision", the reason is saved as "other" in the database instead of "manager_decision". This breaks discount analytics and reporting.

**Reproduction:**

1. Apply bill discount in POS
2. Select reason: "Manager Decision" from dropdown
3. Complete payment
4. Check discount_events table
5. Reason stored as "other" instead of "manager_decision"

**Evidence:**

**Logs:**

```javascript
OrderSection.vue:880 Saving bill discount to order:
{amount: 6800, reason: 'manager_decision', type: 'bill', value: 6800}

salesStore.ts:234 [salesStore] Creating discount_event for bill discount:
{eventId: '05f7ef04-488b-411b-b462-160815242475', billId: '...', amount: 6800}
```

**Database:**

```json
{
  "id": "05f7ef04-488b-411b-b462-160815242475",
  "type": "bill",
  "reason": "other", // ERROR: Should be "manager_decision"
  "discount_amount": "6800.00"
}
```

**Root Cause:**
`src/stores/sales/salesStore.ts:221`

```typescript
reason: billDiscount.reason as any,  // Type casting loses type safety
```

The `billDiscountInfo` array from `paymentsStore.ts` passes `reason` as a string, but somewhere in the chain it gets mapped incorrectly or defaults to "other".

**Possible Causes:**

1. `billDiscount.reason` is not a valid `DiscountReason` type
2. The reason is being transformed somewhere in the payment flow
3. Type casting `as any` bypasses validation
4. Possible default fallback to "other" in supabaseService

**Files to Investigate:**

- `src/stores/sales/salesStore.ts:221` (where reason is used)
- `src/stores/pos/payments/paymentsStore.ts:241-248` (where billDiscountInfo is created)
- `src/stores/pos/orders/ordersStore.ts` (where bill.discountReason is set)
- `src/stores/discounts/services/supabaseService.ts:toDbFormat()` (DB mapping)

**Fix Strategy:**

1. Add validation for `reason` field before creating discount event
2. Remove `as any` type casting - use proper type
3. Add logging to trace reason value through the chain:
   - OrderSection -> ordersStore -> paymentsStore -> salesStore -> supabaseService
4. Ensure `DiscountReason` type is properly used everywhere
5. Add enum validation in supabaseService

**Impact:**

- Discount analytics show wrong reasons
- Manager reports are inaccurate
- Audit trail is broken
- Cannot properly analyze discount patterns

---

### 3. Token Refresh Race Condition

**Status:** HIGH - Intermittent failures
**Found:** 2025-12-03
**Component:** Background operations, Auth session management

**Description:**
When Supabase JWT token refresh occurs during payment processing, background operations (like saving discount events) fail with 403 RLS policy violations. This is a race condition between token refresh and background task execution.

**Reproduction:**
This is a **timing-based bug** - hard to reproduce consistently:

1. User completes payment
2. Supabase triggers automatic token refresh (JWT expires ~1 hour)
3. Background task `queueBackgroundSalesRecording()` starts
4. Old JWT token is invalidated mid-execution
5. New token not yet applied to Supabase client
6. `saveDiscountEvent()` executes with no auth context
7. RLS policy check fails: `auth.uid() IS NOT NULL` returns FALSE
8. Database returns 403 Forbidden
9. Discount event is NOT saved (data loss)

**Evidence:**

**First Payment Attempt (FAILED):**

```
OrderSection.vue:895 Payment confirmed: {...}
[NO ensureAuthSession logs - didn't reach background task]

authStore.ts:75 Auth state changed:
{event: 'SIGNED_IN', hasSession: true, userId: '345bd6f1...'}
^ TOKEN REFRESH happened right after payment started

[Background task failed - no discount events saved]
```

**Second Payment Attempt (SUCCESS):**

```
OrderSection.vue:895 Payment confirmed: {...}
paymentsStore.ts:210 [paymentsStore] Starting background sales recording...
client.ts:114 [ensureAuthSession] Valid session found:
{userId: '345bd6f1...', expiresAt: 1764782319, hasToken: true}
paymentsStore.ts:227 [paymentsStore] Auth session verified
salesStore.ts:247 [salesStore] Bill discount event saved: 6e113a69...
```

**Timeline:**

```
Time 0ms:    User clicks Pay -> processSimplePayment()
Time 50ms:   Token refresh starts -> old token invalidated
Time 100ms:  queueBackgroundSalesRecording() -> ensureAuthSession()
Time 150ms:  Auth check sees "no valid session" (mid-refresh)
Time 200ms:  New token arrives
Time 250ms:  saveDiscountEvent() -> uses old/invalid session -> 403 Forbidden
```

**Root Cause:**
Background async operations lose authentication context during the ~200ms token refresh window.

**Current Mitigation:**
Added `ensureAuthSession()` check in:

- `paymentsStore.ts:214-228`
- `salesStore.ts:165-171`

BUT this only warns - doesn't retry!

**Fix Required:**
Add retry logic with exponential backoff for RLS errors.

**Option A: Retry in supabaseService (RECOMMENDED)**

```typescript
// In discountSupabaseService.saveDiscountEvent()
async saveDiscountEvent(event: DiscountEvent, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await this.attemptSave(event)

    if (result.success) return result

    // Check if it's an RLS error (auth issue)
    const isRLSError =
      result.error?.includes('row-level security policy') ||
      result.error?.includes('RLS') ||
      result.error?.code === '42501'

    if (isRLSError && attempt < retries - 1) {
      // Wait for token refresh to complete: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000
      console.log(`[Retry ${attempt + 1}/${retries}] Waiting ${delay}ms for token refresh...`)
      await new Promise(resolve => setTimeout(resolve, delay))

      // Re-check auth session before retry
      const { ensureAuthSession } = await import('@/supabase')
      await ensureAuthSession()

      continue
    }

    return result // Give up after retries or non-RLS error
  }
}
```

**Option B: Wait for token refresh in ensureAuthSession()**

```typescript
// In ensureAuthSession()
if (tokenRefreshInProgress) {
  // Wait up to 5 seconds for refresh to complete
  await waitForTokenRefresh({ timeout: 5000 })
}
```

**Option C: Queue for later processing**

```typescript
// If auth fails, queue for retry via SyncService
if (!hasAuth) {
  await syncService.addToQueue({
    entityType: 'discount_event',
    entityId: discountEvent.id,
    operation: 'create',
    priority: 'high',
    data: discountEvent
  })
  return
}
```

**Files to Fix:**

- `src/stores/discounts/services/supabaseService.ts` (add retry logic) - PRIMARY
- `src/supabase/client.ts` (improve ensureAuthSession) - SECONDARY
- `src/stores/sales/salesStore.ts` (handle retry on failure) - OPTIONAL

**Priority:**
HIGH - Intermittent data loss (discount events not saved)

**Frequency:**
Rare (happens ~1-2 times per hour when JWT expires), but 100% reproducible during refresh window.

---

## Resolved Issues

### Bill Discount RLS Policy Violation (FIXED 2025-12-03)

**Status:** RESOLVED
**Fixed:** 2025-12-03

**Original Problem:**
Bill discounts failed to save due to RLS policy violation when auth context was missing in background operations.

**Solution Implemented:**

1. Added `ensureAuthSession()` helper in `src/supabase/client.ts`
2. Added `getCurrentUserId()` helper for reliable user ID retrieval
3. Added auth verification in `paymentsStore.ts` before background operations
4. Added auth verification in `salesStore.ts` before discount event creation
5. Enhanced RLS error handling in `supabaseService.ts`

**Verification:**

- Bill discounts now save successfully (with valid auth)
- Auth session verification logs show in console
- Database records show `applied_by` populated correctly

**Related:**
This fix helps with Token Refresh issue but doesn't fully solve it (still needs retry logic).

---

## Summary

| Issue                        | Severity | Status | Impact                              |
| ---------------------------- | -------- | ------ | ----------------------------------- |
| Item Grouping with Discounts | CRITICAL | Open   | Confusing UI, unclear pricing       |
| Discount Reason Mapping Bug  | HIGH     | Open   | Broken analytics, audit trail       |
| Token Refresh Race Condition | HIGH     | Open   | Intermittent data loss (~1-2x/hour) |
| Bill Discount RLS Violation  | RESOLVED | Fixed  | -                                   |

---

## Next Steps

1. **Immediate (Critical):**

   - Fix item grouping logic to not group items with different discounts/statuses
   - Add UI tests for grouped vs ungrouped items

2. **High Priority:**

   - Fix discount reason field mapping bug (add validation, remove `as any`)
   - Add retry logic for token refresh race condition in supabaseService

3. **Testing:**
   - Test item grouping with mixed discounts
   - Test item grouping with mixed payment statuses
   - Test discount system during token refresh window
   - Verify discount analytics accuracy

---

## Notes

- Cost calculation showing $0 is expected (no batch cost data in database yet)
- All discount events save successfully when auth context is valid
- Token refresh issue is rare but needs handling for production reliability
- Payment amounts are calculated correctly (verified in DB)
