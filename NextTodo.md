# Current Sprint: KPI → Payroll + Guest Count KPI

## What Was Done (2026-03-29)

### KPI Bonus Pool System — IMPLEMENTED

Connected KPI metrics to payroll via department bonus pools.

**Migrations applied to DEV:**

- `262_kpi_bonus_pools.sql` — tables `kpi_bonus_schemes`, `kpi_bonus_snapshots`, columns `payroll_items.kpi_bonus`, `payroll_periods.total_kpi_bonuses`
- `263_kpi_rank_multiplier_and_loss_rate.sql` — `staff_ranks.kpi_multiplier`, `kpi_bonus_schemes.loss_rate_target`
- `264_kpi_per_metric_thresholds.sql` — per-metric thresholds on `kpi_bonus_schemes`
- **NOT yet applied to PROD**

**Files created:**

- `src/stores/staff/kpiBonusService.ts` — core KPI bonus calculation service
- `src/supabase/migrations/262_kpi_bonus_pools.sql`
- `src/supabase/migrations/263_kpi_rank_multiplier_and_loss_rate.sql`
- `src/supabase/migrations/264_kpi_per_metric_thresholds.sql`
- `src/views/kitchen/kpi/components/KpiBonusWidget.vue` — tablet KPI bonus dashboard widget

**Files modified:**

- `src/stores/staff/types.ts` — KpiBonusScheme, KpiBonusSnapshot, KpiScoreBreakdown, DepartmentKpiResult, KpiBonusStaffItem, KpiPoolType, KpiDepartment
- `src/stores/staff/payrollService.ts` — PayrollStaffRow (kpiBonus, kpiMultiplier, kpiDetails), enrichWithKpiBonuses(), savePayrollToDb()
- `src/stores/staff/staffStore.ts` — runPayrollCalculation + lastKpiResults
- `src/stores/staff/supabaseMappers.ts` — kpiBonus, totalKpiBonuses, kpiMultiplier
- `src/stores/staff/index.ts` — re-exports
- `src/views/backoffice/settings/KpiSettingsView.vue` — Bonus Pools tab (pool type, weights, thresholds, loss rate target)
- `src/views/admin/payroll/PayrollScreen.vue` — KPI column, summary card, KPI Calculation block, per-person breakdown
- `src/views/admin/staff/components/RanksDialog.vue` — KPI bonus % display and edit
- `src/views/admin/staff/components/StaffMemberDialog.vue` — trainee label updated

### Architecture

```
Settings > KPI > Bonus Pools → configure per department
  - Pool type: Fixed Amount | % of Revenue
  - Pool amount (Rp) or Pool percent (%)
  - 4 metric weights (must sum to 100%)
  - Per-metric thresholds (Min score to pass, 0 = graduated)
  - Loss rate target (%)
  - Min overall threshold

Staff > Ranks → KPI bonus % per rank
  - Displayed as "+50%" in UI, stored as kpi_multiplier=1.5 in DB
  - Distribution: hours × multiplier → proportional share

Payroll > Calculate → auto-calculates KPI bonus
  1. calculatePayrollForMonth() — base salary, service tax, bonuses
  2. enrichWithKpiBonuses() — scores 4 KPI metrics, resolves pool, distributes
  3. savePayrollToDb() — persists payroll_items.kpi_bonus + kpi_bonus_snapshots

Kitchen Tablet > KPI Screen → KpiBonusWidget at top
  - Shows department score, 4 metric progress bars, pool/unlocked amounts
  - Always visible above Time/FoodCost/Ritual tabs
```

### 4 KPI Metrics

| Metric             | What it measures                | Scoring                            | Data source                          |
| ------------------ | ------------------------------- | ---------------------------------- | ------------------------------------ |
| **Food Cost**      | Overall COGS% vs target         | 100 at target, linear to 0 at +10% | `get_cogs_by_date_range()` RPC       |
| **Real Food Cost** | (spoilage + shortage) / revenue | 100 at target, linear to 0 at +5%  | Same RPC (no extra call)             |
| **Time KPI**       | On-time order completion rate   | `100 - exceededRate`               | `get_kitchen_time_kpi_summary()` RPC |
| **Rituals**        | Daily ritual completion rate    | completedDays / totalDays × 100    | `ritual_completions` table           |

Per-metric thresholds: Food Cost min=100 (y/n), Real Food Cost min=100 (y/n), Time min=80, Rituals min=80.
Below threshold → metric contributes 0 to weighted average.
Score -1 = no data → metric excluded from weight entirely.

### Rank-based Distribution

```
Senior: hours × 1.5 multiplier → gets 50% more per hour than Junior
Junior: hours × 1.0 multiplier → base
Trainee: excluded from KPI bonus (and service tax)

UI shows "+50%" for Senior, "standard" for Junior
DB stores kpi_multiplier: 1.5, 1.0
```

---

## Next: Guest Count + Avg Check Per Guest KPI

### Goal

Add guest count tracking to POS for "average check per guest" KPI — primarily for Bar department.

### DB Changes Needed

```sql
-- Add guest_count to bills (not orders — bills can split)
ALTER TABLE bills ADD COLUMN guest_count INTEGER;

-- KPI view/function for avg check per guest
-- Only count dine-in orders (exclude takeaway/delivery)
```

### POS Flow

#### 1. Table tap → Guest Count popup

**Where:** `src/views/pos/tables/` — when user taps a table to create new order
**Component:** New `GuestCountDialog.vue` — simple grid with numbers 1-9, quick tap
**Flow:** Tap table → GuestCountDialog → select count → order + bill created with guest_count

#### 2. Split bill → Ask guest count

**Where:** `src/views/pos/order/components/BillsManager.vue` or `MoveItemsDialog.vue`
**Flow:** When creating new bill (split) → GuestCountDialog → new bill gets its own guest_count

#### 3. Checkout → Show/edit guest count

**Where:** `src/views/pos/order/dialogs/CheckoutDialog.vue`
**Flow:** Guest count displayed in checkout, editable field to correct

#### 4. Partial checkout → Ask per-payment guest count

**Where:** `CheckoutDialog.vue` — when not all items in bill are selected
**Flow:** "Payment for how many guests?" → records guest count for this partial payment

#### 5. Takeaway/Delivery → No guest count

**Flow:** `guest_count = null` for non-dine-in orders → excluded from avg check KPI

### GuestCountDialog.vue Design

```
┌─────────────────────────┐
│   How many guests?      │
│                         │
│   [1]  [2]  [3]        │
│   [4]  [5]  [6]        │
│   [7]  [8]  [9]        │
│                         │
└─────────────────────────┘
```

- Large touch targets (tablet)
- Single tap → closes dialog, returns number
- No confirm button needed

### KPI Integration

New metric: `avgCheckPerGuest` — add as 5th option in bonus scheme weights.
Or replace one of the existing 4 for bar (e.g. Real Food Cost less relevant for bar).

```
avg_check_per_guest = SUM(bill_total) / SUM(guest_count)
WHERE channel = 'dine_in' AND guest_count > 0
GROUP BY department, month
```

Target: configurable in scheme settings (e.g., Rp 85,000 per guest).
Score: graduated — at target = 100, proportional below.

### Key Files to Modify

**POS:**

- `src/stores/pos/orders/ordersStore.ts` — add guest_count to bill creation
- `src/views/pos/tables/TableItem.vue` or `TablesSidebar.vue` — trigger GuestCountDialog on table tap
- `src/views/pos/order/components/BillsManager.vue` — guest count on bill split
- `src/views/pos/order/dialogs/CheckoutDialog.vue` — display/edit guest count
- `src/views/pos/order/dialogs/MoveItemsDialog.vue` — guest count on new bill

**New:**

- `src/views/pos/order/dialogs/GuestCountDialog.vue`

**KPI:**

- `src/stores/staff/kpiBonusService.ts` — add scoreAvgCheck() function
- `src/stores/staff/types.ts` — add to KpiScoreBreakdown
- `src/views/backoffice/settings/KpiSettingsView.vue` — add weight/threshold for avg check

**DB:**

- Migration 265: `ALTER TABLE bills ADD COLUMN guest_count INTEGER`
- Maybe RPC for avg check calculation

### Order of Implementation

1. Migration: `bills.guest_count`
2. `GuestCountDialog.vue` component
3. POS integration: table tap → guest count → order
4. POS: split bill → guest count
5. POS: checkout → display/edit guest count
6. POS: partial checkout → payment guest count
7. KPI: `scoreAvgCheck()` function
8. KPI: add to bonus scheme weights
9. Settings UI: avg check target + weight

---

## Pending: Apply to PROD

Before deploying KPI bonus to production:

1. Test full payroll calculation on DEV with real data
2. Configure schemes via Settings UI
3. Verify scores match expectations
4. Apply migrations 262-264 to PROD (with confirmation)
5. Seed default schemes for kitchen/bar on PROD
