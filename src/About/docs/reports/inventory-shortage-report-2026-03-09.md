# Inventory Shortage Report — INV-670080 (March 9, 2026)

## Executive Summary

- **Period**: February 27 – March 9, 2026 (10 days)
- **Total shortage**: Rp 5,433,286 across 93 items
- **Top 10 items**: Rp 3,580,983 (66% of total)
- **Root causes identified**: Missing recipe linkages (system), real operational loss, and data reconciliation bugs

---

## Findings by Category

### A. Missing Recipes — System Fix Required (4 products, ~Rp 1,719,155)

These products are consumed in preparation processes but have **no recipe linking raw product to the preparation**. The system cannot auto-deduct stock when preps are produced.

| Product             | Issue                                                                         | Impact      |
| ------------------- | ----------------------------------------------------------------------------- | ----------- |
| **Udang (Shrimp)**  | Prep "Shrimp thawed 30pc" exists but has NO recipe → **zero write-offs ever** | -Rp 250,830 |
| **Cumi (Squid)**    | Used in "Tom yam seafood pack" prep, no `recipe_components` entry             | -Rp 361,570 |
| **Salmon filet**    | Used in "Salmon portion 30g" prep, no `recipe_components` entry               | -Rp 322,025 |
| **SourDough bread** | Used in "Slice SourDough bread" prep, no `recipe_components` entry            | -Rp 668,800 |

**Action required**: Head chef must create or fix recipes for these preparations so raw materials are deducted automatically.

### B. Operational Loss — Management Action Required (5 products, ~Rp 1,561,055)

The system is tracking these products correctly. Write-offs exist, but the physical count is still less than expected. This is **real shortage** — either waste, over-portioning, or unrecorded usage.

| Product                       | Shortage   | Value       | Notes                                                                                   |
| ----------------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------- |
| **Ayam Filet dada (Chicken)** | -4,953g    | -Rp 336,804 | Fully verified ✅ — all operations match. Real loss in prep production                  |
| **Yogurt plain sour**         | -6,283g    | -Rp 341,773 | Used in 10 recipes (smoothies, granola, lassie). Write-offs exist but shortage is large |
| **Telur (Eggs)**              | -161 pcs   | -Rp 322,000 | Used in 22 recipes. 311 written off but 161 more missing                                |
| **Fresh milk**                | -14,108 ml | -Rp 278,478 | Used in 16 recipes. 388 write-offs in period. Also affected by reconciliation bug       |
| **Croissant**                 | -13 pcs    | -Rp 260,000 | Used in 2 recipes. 29 written off but 13 more missing                                   |

### C. Data Integrity Issue — Developer Fix Required (2 products)

A reconciliation bug caused **negative batches** — the system consumed more stock than physically existed, creating phantom inventory movements.

| Product          | Negative Batches              | Notes                                                             |
| ---------------- | ----------------------------- | ----------------------------------------------------------------- |
| **Fresh milk**   | 11 negative batches in period | Reconciliation consumed stock without recording proper operations |
| **Salmon filet** | 1 negative batch              | Same issue                                                        |

---

## Detailed Product Analysis (Top 10)

| #   | Product                   | Unit | Prev Actual (Feb 27) | Receipts | Write-offs | Corrections | System Expected | Actual Count | Shortage    | Value (Rp) |
| --- | ------------------------- | ---- | -------------------- | -------- | ---------- | ----------- | --------------- | ------------ | ----------- | ---------- |
| 1   | SourDough bread           | pcs  | 24                   | +29      | -24        | -8          | 23              | 4            | **-19**     | -668,800   |
| 2   | Zukini                    | g    | 1,581                | +22,520  | -9,080     | -24,823     | 13,721          | 1,541        | **-12,180** | -438,703   |
| 3   | Cumi (Squid)              | g    | 1,340                | +4,000   | -1,330     | -3,806      | 4,010           | 204          | **-3,806**  | -361,570   |
| 4   | Yogurt plain sour         | g    | 8,365                | +5,000   | -4,532     | -6,283      | 9,283           | 3,000        | **-6,283**  | -341,773   |
| 5   | Ayam Filet dada (Chicken) | g    | 2,200                | +16,200  | -8,479     | -6,404      | 6,776           | 1,823        | **-4,953**  | -336,804   |
| 6   | Salmon filet              | g    | 746                  | +6,350   | -3,435     | -4,254      | 2,011           | 840          | **-1,171**  | -322,025   |
| 7   | Telur (Eggs)              | pcs  | 68                   | +480     | -311       | -303        | 243             | 82           | **-161**    | -322,000   |
| 8   | Fresh milk                | ml   | 17,000               | +84,000  | -80,518    | -13,219     | 14,946          | 838          | **-14,108** | -278,478   |
| 9   | Croissant                 | pcs  | 7                    | +60      | -29        | -57         | 23              | 10           | **-13**     | -260,000   |
| 10  | Udang (Shrimp)            | g    | 240                  | +2,000   | **0**      | -1,858      | 2,160           | 302          | **-1,858**  | -250,830   |

**Total top 10 shortage: -Rp 3,580,983**

### Individual Product Notes

#### 1. SourDough bread (-Rp 668,800) — Category A

Consumed via "Slice SourDough bread" preparation. 24 whole loaves written off in prep production, but 19 additional loaves are missing. The prep recipe likely doesn't link back to the raw product, so slicing operations don't deduct sourdough inventory.

#### 2. Zukini (-Rp 438,703) — Mixed

Two large inventory corrections (-12,643 and -12,180) suggest accumulating losses over time. Write-offs (9,080g) seem low relative to actual usage. May need recipe review.

#### 3. Cumi / Squid (-Rp 361,570) — Category A

Used in "Tom yam seafood pack" preparation, but no `recipe_components` entry links squid to this prep. Only 1,330g was written off via manual prep production, while 3,806g is missing.

#### 4. Yogurt plain sour (-Rp 341,773) — Category B

Used across 10 recipes (smoothies, granola, lassie). Write-offs exist but actual count is 6,283g less than expected. Likely a combination of over-portioning and unrecorded usage.

#### 5. Ayam Filet dada / Chicken breast (-Rp 336,804) — Category B ✅ VERIFIED

**Most thoroughly investigated product.** Day-by-day verification confirmed:

- All 6 direct sales have corresponding write-offs (6 × ~104g = 625g)
- All 18 preparation production write-offs recorded (7,854g)
- Daily snapshots match operations math for all 11 days
- No negative batches in period
- DecompositionEngine works correctly
- **Conclusion**: Real operational loss — prep production uses more chicken than recipes specify

#### 6. Salmon filet (-Rp 322,025) — Categories A + C

Consumed via "Salmon portion 30g" preparation with no recipe linking to raw product. Additionally had 1 negative batch from the reconciliation bug.

#### 7. Telur / Eggs (-Rp 322,000) — Category B

Used in 22 recipes. 311 eggs written off but 161 additional eggs missing. High usage frequency makes small per-recipe variances add up.

#### 8. Fresh milk (-Rp 278,478) — Categories B + C

Highest volume product — 388 write-offs in 10 days across 16 recipes. Also affected by reconciliation bug (11 negative batches). Shortage is a mix of real operational loss and data integrity issues.

#### 9. Croissant (-Rp 260,000) — Category B

Used in 2 recipes. 29 croissants written off but 13 more missing. At Rp 20,000 per piece, even small variance is expensive.

#### 10. Udang / Shrimp (-Rp 250,830) — Category A

**Most clear-cut system issue.** Preparation "Shrimp thawed 30pc" exists but has absolutely NO recipe. Raw shrimp is **never** auto-deducted from stock. All 1,858g of shortage is directly caused by the missing recipe.

---

## System Verification Summary

A full audit was performed on **Ayam Filet dada** (chicken breast) as a representative product:

| Check                               | Result                                  |
| ----------------------------------- | --------------------------------------- |
| Direct sales → write-offs           | ✅ All 6 sales have matching write-offs |
| Preparation production → write-offs | ✅ All 18 prep write-offs recorded      |
| Daily snapshot math                 | ✅ All 11 days match                    |
| Negative batches                    | ✅ None in period                       |
| DecompositionEngine                 | ✅ Working correctly                    |
| Physical vs system                  | ❌ 4,953g real operational loss         |

**Conclusion**: The inventory system works correctly for products with proper recipe linkage. Shortages in Category B are real operational losses that require management intervention.

---

## Recommended Actions

### Immediate — This Week

| #   | Action                                                                         | Owner               | Priority |
| --- | ------------------------------------------------------------------------------ | ------------------- | -------- |
| 1   | **Create recipe for "Shrimp thawed 30pc"** linking to raw Udang product        | Head Chef           | Critical |
| 2   | **Create recipe for "Tom yam seafood pack"** linking to raw Cumi product       | Head Chef           | Critical |
| 3   | **Create recipe for "Salmon portion 30g"** linking to raw Salmon product       | Head Chef           | Critical |
| 4   | **Create recipe for "Slice SourDough bread"** linking to raw SourDough product | Head Chef           | Critical |
| 5   | **Review chicken breast prep process** — actual usage vs recipe quantity       | Head Chef + Manager | High     |
| 6   | **Introduce prep waste tracking** — weigh trimmings/waste separately           | Manager             | High     |

### Short-term — This Month

| #   | Action                                                                                    | Owner     | Priority |
| --- | ----------------------------------------------------------------------------------------- | --------- | -------- |
| 7   | **Fix reconciliation bug** causing negative batches (affects Fresh milk, Salmon)          | Developer | High     |
| 8   | **Set up weekly inventory** for top-shortage items (top 10 from this report)              | Manager   | Medium   |
| 9   | **Audit all preparations** — check every prep has a linked recipe with correct quantities | Head Chef | Medium   |
| 10  | **Review egg usage** across 22 recipes — verify portion sizes match actual practice       | Head Chef | Medium   |

### Monitoring — Ongoing

| #   | Action                                                           | Frequency     |
| --- | ---------------------------------------------------------------- | ------------- |
| 11  | Run shortage analysis after each inventory count                 | Per inventory |
| 12  | Track shortage trend per product (week over week)                | Weekly        |
| 13  | Compare prep production amounts vs recipe theoretical yields     | Monthly       |
| 14  | Review and update recipe quantities based on actual measurements | Quarterly     |

---

## Financial Impact Summary

| Category                        | Products | Shortage Value    | % of Total |
| ------------------------------- | -------- | ----------------- | ---------- |
| A. Missing recipes (system fix) | 4        | Rp 1,603,225      | 29%        |
| B. Operational loss (real)      | 5        | Rp 1,539,055      | 28%        |
| C. Data integrity bug           | 2        | (included in A/B) | —          |
| Other (remaining 83 items)      | 83       | Rp 1,852,303      | 34%        |
| **Total**                       | **93**   | **Rp 5,433,286**  | **100%**   |

> Note: Some products (Fresh milk, Salmon) appear in multiple categories. Values shown are total shortage per product, not split by cause.

---

_Report generated: March 9, 2026_
_Data source: PROD database, inventory INV-670080_
_Investigation method: SQL analysis of storage_batches, recipe_write_offs, inventory_snapshots, and daily_snapshots_
