# Product Variance Report - Sprint Summary (2026-01-28)

## Completed Today

### 1. Added Menu Items Breakdown for Sales via Preparations ✅

**Problem:** The "Sales (Theoretical)" section showed "No sales in this period" for products like Tuna Lion that are only used via preparations.

**Solution:**

- Updated `get_product_variance_details_v2` function (v2.2)
- Added CTEs to track menu items that use preparations containing this product
- Added `viaPreparation` field to `topMenuItems` response

**Result for Tuna Lion (Jan 2-30, 2026):**
| Menu Item | Variant | Sold | Product Used | Via |
|-----------|---------|------|--------------|-----|
| Tuna Steak | Regular | 18 | 3,600g | Tuna portion 200g |
| Smash tuna ciabatta | Ciabatta | 9 | 1,080g | Tuna portion 120g |
| Tuna steak Ciabatta | Regular | 6 | 720g | Tuna portion 120g |
| **Total** | | **33** | **5,400g** | |

**Files changed:**

- `src/supabase/migrations/106_add_sales_breakdown_to_variance_details_v2.sql` (new)
- `src/supabase/functions/get_product_variance_details_v2.sql` (updated docs)
- `src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue` (UI update)

---

### 2. Added Actual Write-offs Section for Variance Analysis ✅

**Problem:** Need to compare actual write-offs with theoretical sales to identify discrepancies.

**Solution:**

- Updated `get_product_variance_details_v2` function (v2.3)
- Added new `actualWriteOffs` section with breakdown:
  - `salesConsumption` - direct sales write-offs from POS
  - `productionConsumption` - write-offs for preparation production (with details)
  - `corrections` - inventory adjustment corrections (with details)
  - `differenceFromTheoretical` - comparison with theoretical sales

**Result for Tuna Lion (Jan 2-30, 2026):**
| Category | Quantity | Notes |
|----------|----------|-------|
| Sales Consumption | 0g | (via POS - none for this product) |
| Production Consumption | 3,720g | Write-offs for prep batches |
| Corrections | +1,135g net | Inventory adjustments |
| **Total Write-offs** | **4,855g** | |
| Theoretical Sales | 5,400g | From menu items sold |
| **Difference** | **-545g** | Under-written-off |

**Interpretation:** Less product was written off than theoretically consumed. This can happen when:

- Old prep batches were used (already had inventory)
- Write-off timing doesn't match sales period

**Files changed:**

- `src/supabase/migrations/107_add_actual_writeoffs_to_variance_details_v2.sql` (new)
- `src/supabase/functions/get_product_variance_details_v2.sql` (updated docs v2.3)
- `src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue` (new section)

---

## Previously Completed (2026-01-27)

### 1. Fixed Variance Sign ✅

- **Was:** `-7,719` (shortage) - incorrect
- **Now:** `+7,719` (surplus) - correct
- **Version:** v3.5

### 2. Fixed portion-type preparations calculation ✅

- **Problem:** Tuna Lion showed In Preps = 108,800g instead of 640g (170x inflation)
- **Cause:** For portion-type need to divide by `portion_size`, not `output_quantity`
- **Migration:** `104_fix_variance_details_v2_portion_type.sql`

### 3. Verified Sales Calculation ✅

- Sales = 5,400g is **correct**
- Formula verified:
  - Tuna Steak: 18 × 200g = 3,600g
  - Smash tuna ciabatta: 9 × 120g = 1,080g
  - Tuna steak Ciabatta: 6 × 120g = 720g
  - Total: 5,400g ✓

---

## Deferred (until February inventory)

### Opening/Closing In Preps - Historical Data

**Problem:** Cannot determine preparation batch state at past dates.

**What doesn't work:**

- Opening does NOT include products in preparations at period start
- Closing In Preps shows CURRENT state, not period end

**Why deferred:**

- Old data (before January 2026) doesn't have correct batch write-offs
- Need preparation inventory count to establish baseline
- After February inventory, can calculate correctly

**Documentation:** `src/About/docs/reports/ProductVarianceReport.md` (TODO at start)

---

## Current Variance Report Status

For **Tuna Lion (Jan 2-30, 2026)**:

| Metric           | Value       | Status                              |
| ---------------- | ----------- | ----------------------------------- |
| Opening          | 3,200g      | ⚠️ Missing preps (known limitation) |
| Received         | 6,600g      | ✅ Correct                          |
| Sales            | 5,400g      | ✅ Correct (now with breakdown!)    |
| Loss             | 0g          | ✅ Correct                          |
| Closing Raw      | 11,479g     | ✅ Correct                          |
| Closing In Preps | 640g        | ⚠️ Current state, not period-end    |
| **Variance**     | **+7,719g** | ✅ Sign is correct                  |

---

## Files Changed This Sprint

| File                                                  | Status            | Description               |
| ----------------------------------------------------- | ----------------- | ------------------------- |
| `106_add_sales_breakdown_to_variance_details_v2.sql`  | Created + Applied | Menu items via preps      |
| `107_add_actual_writeoffs_to_variance_details_v2.sql` | Created + Applied | Actual write-offs section |
| `get_product_variance_details_v2.sql`                 | Updated           | Docs v2.3                 |
| `ProductVarianceDetailDialogV2.vue`                   | Updated           | Via column + write-offs   |
| `104_fix_variance_details_v2_portion_type.sql`        | Created + Applied | Portion-type fix          |

---

## Next Sprint

1. **February:** Conduct preparation inventory count
2. **After inventory:** Add Opening/Closing In Preps to formula
3. **Optional:** Create migration to persist v3.5 changes
