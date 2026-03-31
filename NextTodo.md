# Sprint: Loyalty Source of Truth — Payment-based Accrual

## Problem Statement

Loyalty system has architectural inconsistencies in how customer is resolved and how stats/tiers are calculated. Multiple sources of truth (order.customer_id, bill.customerId, payment has nothing) lead to data integrity issues.

### Evidence (Ivan n alexandrin case, PROD)

- 9 orders linked to Ivan via bill.customerId, but only 4 have order.customer_id set
- Cashback correctly applied for all 9 (reads from bill) = Rp 92,749
- `recalculate_tiers` only sees 4 orders (reads from order.customer_id) → tier stays "member"
- `total_spent` = Rp 1,854,949 (correct, because `update_customer_stats` was called at payment time)
- But tier recalculation can't verify this because it queries `orders.customer_id`

### Root Cause

Three different "sources of truth" for customer-order relationship:

| System                                              | Source                                     | Problem                                                                                                         |
| --------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Cashback accrual** (`processLoyaltyAfterPayment`) | `bill.customerId` with order fallback      | Works correctly at payment time                                                                                 |
| **Stats update** (`update_customer_stats` RPC)      | Receives customer_id as parameter from POS | Works at payment time, but RPC internally queries `orders.customer_id` for tier window — misses bill-only links |
| **Tier recalculation** (`recalculate_tiers` RPC)    | `orders.customer_id`                       | Misses orders where customer is only on bill level                                                              |
| **Payments table**                                  | No customer_id at all                      | Can't trace who paid, can't reverse on refund                                                                   |

### Additional Issues Found

1. **No cashback reversal on refund** — refunded payments keep their cashback, stats, and stamps
2. **One order can have multiple bills with different customers** — order.customer_id can't represent this
3. **`processLoyaltyAfterPayment` is fire-and-forget** — if it fails, payment succeeds but loyalty is lost silently
4. **Partial bill payment** — customer can pay for selected items from a bill, but cashback is calculated on full paidAmount which is correct, though the bill→customer link doesn't capture this granularity

---

## Solution: Payment as Source of Truth

### Phase 1: Add customer_id to payments (DB migration)

**Goal:** Every payment records which customer paid, creating an immutable audit trail.

```sql
ALTER TABLE payments ADD COLUMN customer_id UUID REFERENCES customers(id);
ALTER TABLE payments ADD COLUMN customer_name TEXT;
```

**POS change:** In `processLoyaltyAfterPayment()` (OrderSection.vue:1912), after resolving `billCustomerId`, update the payment record:

```ts
// After payment is created, stamp customer on payment
if (billCustomerId) {
  await paymentsService.updateCustomerId(paymentId, billCustomerId, customerName)
}
```

### Phase 2: Fix tier/stats to use payments (not orders)

**Goal:** `recalculate_tiers` and tier window calculation use payments.customer_id instead of orders.customer_id.

```sql
-- recalculate_tiers: use payments as source
SELECT COALESCE(SUM(p.amount), 0) INTO v_spent_window
FROM payments p
WHERE p.customer_id = v_customer.id
  AND p.status = 'completed'
  AND p.created_at >= now() - (v_settings.tier_window_days || ' days')::interval;
```

Same for `update_customer_stats` inline tier check.

**Benefits:**

- Payments are immutable (not re-linked like bills/orders)
- Handles multiple customers per order (each payment has its own customer_id)
- Refund payments have negative amounts → naturally subtract from tier window
- Partial payments correctly attributed

### Phase 3: Cashback reversal on refund

**Goal:** When a payment is refunded, reverse the cashback that was earned.

```sql
CREATE FUNCTION reverse_loyalty_on_refund(p_original_payment_id UUID)
-- 1. Find loyalty_transactions linked to the original payment's order
-- 2. Create negative adjustment transaction
-- 3. Update customer.loyalty_balance
-- 4. Update customer stats (decrement total_spent, total_visits)
```

**POS change:** In `paymentsStore.processRefund()`, after creating the refund payment, call the reversal RPC.

### Phase 4: Backfill existing payments

**Goal:** Populate customer_id on historical payments from bill data.

```sql
-- Backfill: for each payment, find customer from bill JSONB
UPDATE payments p SET
  customer_id = (
    SELECT (bill->>'customerId')::uuid
    FROM orders o, jsonb_array_elements(o.bills) AS bill
    WHERE o.id = p.order_id
      AND bill->>'id' = ANY(p.bill_ids::text[])
      AND bill->>'customerId' IS NOT NULL
    LIMIT 1
  )
WHERE p.customer_id IS NULL AND p.status = 'completed';
```

Then recalculate all customer stats from payments.

---

## Implementation Order

- [x] **1. Migration:** Add `customer_id`, `customer_name` to payments table (278, DEV applied)
- [x] **2. POS:** Record customer_id on payment at checkout time (OrderSection.vue + paymentsStore)
- [x] **3. RPC:** Update `recalculate_tiers` to use payments.customer_id (280, DEV applied)
- [x] **4. RPC:** Update `update_customer_stats` tier window to use payments (280, DEV applied)
- [x] **5. RPC:** Create `reverse_loyalty_on_refund` (281, DEV applied)
- [x] **6. POS:** Call reversal on refund in `processRefund()` (paymentsStore.ts)
- [x] **7. Backfill:** Populate customer_id on existing payments from bills (279, DEV applied)
- [ ] **8. Apply all to PROD** (278→279→280→281) + recalculate_tiers()

---

## Current State (what was fixed today, 2026-03-31)

### Completed

- [x] **Tier status filter bug** — `recalculate_tiers` and `update_customer_stats` now use `status NOT IN ('cancelled')` instead of `IN ('completed', 'collected')` — was missing 2100+ `served` orders
- [x] **recalculate_tiers scope** — now processes all cashback customers, not just `telegram_id IS NOT NULL`
- [x] **Hardcoded tier constraint** — removed `customers_tier_check` CHECK constraint, tiers are dynamic from `loyalty_settings`
- [x] **Ran recalculate on PROD** — 2 customers upgraded (Luna→family, Alex→regular)
- [x] **claim_invite telegram data** — copies telegram_id/username on invite claim
- [x] **Show QR button** — test invite QR without printer
- [x] **Merge customers with conflict resolution** — two-step dialog, field override JSONB
- [x] **Loyalty UI improvements** — unified Level column, Program edit, History tab, balance/stamps edit
- [x] **Atomic balance adjustment** — `adjust_loyalty_balance` RPC eliminates race condition

### Known Data Issues (PROD)

- Ivan n alexandrin: total_spent/visits inflated? Or correct if we count bill-level links. Needs verification after Phase 4 backfill.
- 5 orders have customer only at bill level but not order level — this is by design (bill = source of truth), but tier calculation doesn't see them yet.
