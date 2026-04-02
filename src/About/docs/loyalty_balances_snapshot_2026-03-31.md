# Loyalty Balances Snapshot — 2026-03-31

> Snapshot PROD database on 2026-03-31. Total loyalty transactions: 31 (26 cashback + 5 adjustments).
> Total points issued: Rp 455,436 (cashback: 305,274 + adjustments: 150,162).
> No redemption/spend transactions recorded — system has no spend mechanism yet.

## Loyalty Settings

| Parameter        | Value                                               |
| ---------------- | --------------------------------------------------- |
| Tiers            | member (5%), regular (7%, >1.5M), family (10%, >3M) |
| Tier window      | 90 days                                             |
| Points lifetime  | 90 days                                             |
| Stamps per cycle | 15 (thresholds: 5/10/15 for drinks/breakfast/any)   |
| Stamp threshold  | Rp 80,000 per stamp                                 |
| Conversion bonus | 10%                                                 |

## Active Customers with Balance > 0

| #   | Customer          | Program  | Balance (Rp) | Tier   | Total Spent | Visits | Avg Check | Registered |
| --- | ----------------- | -------- | -----------: | ------ | ----------: | -----: | --------: | ---------- |
| 1   | Ivan n alexandrin | cashback |       92,749 | member |   1,854,949 |      9 |   206,105 | 2026-03-18 |
| 2   | Tim kalem         | cashback |       63,653 | member |   1,420,250 |      7 |   202,893 | 2026-03-21 |
| 3   | Ivan n maria      | cashback |       57,861 | member |   1,157,186 |      5 |   231,437 | 2026-03-16 |
| 4   | Alex oleg         | cashback |       52,900 | member |   1,058,000 |      4 |   264,500 | 2026-03-25 |
| 5   | Nikita kuz        | cashback |       38,684 | member |     773,662 |      2 |   386,831 | 2026-03-25 |
| 6   | Lera              | cashback |       31,280 | member |     625,600 |      2 |   312,800 | 2026-03-16 |
| 7   | Raquel            | cashback |       29,211 | member |     584,200 |      2 |   292,100 | 2026-03-28 |
| 8   | Gimbal            | cashback |       17,653 | member |     353,050 |      2 |   176,525 | 2026-03-31 |
| 9   | Igor kira         | cashback |       16,676 | member |     333,500 |      3 |   111,167 | 2026-03-27 |
| 10  | Alex Grishaev     | cashback |       13,656 | member |     273,125 |      1 |   273,125 | 2026-03-16 |
| 11  | Luis              | cashback |        6,613 | member |     132,250 |      1 |   132,250 | 2026-03-28 |

**Subtotal active balances: Rp 420,936**

## Customers with Balance = 0 (notable)

| Customer           | Program  | Tier        | Total Spent | Visits | Discount | Accrual Off | Notes                                                                                    |
| ------------------ | -------- | ----------- | ----------: | -----: | -------: | :---------: | ---------------------------------------------------------------------------------------- |
| Luna parents       | cashback | **family**  |   4,980,420 |     24 |      10% |     YES     | Balance was 34,500 (2 cashback tx) but reset to 0 **without** loyalty_transaction record |
| Alex               | cashback | **regular** |   2,824,400 |     12 |      50% |     YES     | No loyalty_transactions at all. Personal discount instead of cashback                    |
| Kiril              | stamps   | member      |     177,100 |      4 |      50% |     YES     | Stamps program, personal discount                                                        |
| Aleksandr Grishaev | stamps   | member      |     117,875 |      1 |       0% |     no      | Stamps program, no stamps tracking in DB                                                 |

## Inactive / Zero-activity Customers (balance = 0, visits = 0)

| Customer             | Program  | Status      | Telegram         | Registered             |
| -------------------- | -------- | ----------- | ---------------- | ---------------------- |
| Guest (x2)           | stamps   | **blocked** | -                | 2026-03-16, 2026-03-17 |
| Ibuk sasha           | cashback | active      | -                | 2026-03-28             |
| K.Y.A                | stamps   | active      | mang_yudhi97     | 2026-03-30             |
| Komang Yudhi artawan | stamps   | active      | -                | 2026-03-18             |
| Me                   | cashback | active      | -                | 2026-03-28             |
| Mikhail Spodyrev     | stamps   | active      | Spodyrev_mikhail | 2026-03-24             |
| Nik                  | stamps   | active      | -                | 2026-03-31             |
| Sasha Solar          | stamps   | active      | SashaSolar       | 2026-03-28             |
| Solar Piter          | stamps   | active      | -                | 2026-03-26             |
| Test alex            | cashback | active      | Agrishaev        | 2026-03-30             |
| wintercafe22         | stamps   | active      | -                | 2026-03-28             |

> **Note**: Nik has total_spent=376,050 and 1 visit but balance=0 — on stamps program, no cashback accrual.

## Data Integrity Issues Found

1. **Luna parents**: balance_after in last transaction = 34,500 but current loyalty_balance = 0. Balance was modified outside loyalty_transactions (no audit trail).
2. **Alex**: 12 visits, 2.8M spent, regular tier — but zero loyalty_transactions. All cashback was suppressed (disable_loyalty_accrual=true) and replaced with 50% personal discount.
3. **Duplicate cashback**: Gimbal got 2 cashback entries for same order `b4eeb3f9` (2,415 + 15,238 = 17,653). Likely two separate payments on same order (split bill).
4. **Luna parents duplicate**: 2 cashback entries for same order `737c2e03` (17,250 + 17,250). Same pattern — split payment.
5. **No redemption transactions**: System can accrue points but has **no mechanism to spend them**. All 420,936 Rp in balances are unspendable.
6. **spent_90d inconsistency**: Raquel has spent_90d=0 but last_visit=2026-03-29 (2 days ago). Gimbal has spent_90d=0 but visited today. Field may not be recalculated.
7. **Tier mismatch**: Ivan n alexandrin has total_spent=1,854,949 (>1.5M threshold) but tier=member. `recalculate_tiers` should have upgraded to regular. Likely because it uses orders.customer_id (missing bill-only links).
