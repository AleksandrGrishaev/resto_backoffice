# Unit Conversion Specification

## Single Source of Truth

**Last Updated:** 2026-01-31
**Status:** CRITICAL - All code MUST follow this spec
**Version:** 1.0

---

## Core Principle

> **"Store in base units, display in user units"**

- **Base unit for weight:** `gram`
- **Base unit for volume:** `ml` (milliliter)
- **Base unit for pieces:** `piece`

ALL database storage, ALL calculations, ALL FIFO allocations use **base units**.

---

## Field Definitions (Preparations)

| Field             | Type   | Unit              | Description                                         |
| ----------------- | ------ | ----------------- | --------------------------------------------------- |
| `portion_size`    | number | **base units**    | Size of ONE portion in base units (grams or pieces) |
| `output_quantity` | number | **portions**      | Number of portions produced per batch               |
| `output_unit`     | string | -                 | Base unit type: 'gram', 'ml', 'pc' (piece)          |
| `last_known_cost` | number | **IDR/base unit** | Cost per BASE UNIT (gram, ml, or piece)             |

### Two Types of Preparations

#### 1. Weight-based (`output_unit = 'gram'` or `'ml'`)

| Field             | Meaning           |
| ----------------- | ----------------- |
| `portion_size`    | Grams per portion |
| `last_known_cost` | IDR per gram      |

#### 2. Piece-based (`output_unit = 'pc'`)

| Field             | Meaning                        |
| ----------------- | ------------------------------ |
| `portion_size`    | Pieces per portion (usually 1) |
| `last_known_cost` | IDR per piece                  |

---

### Example: Beef Steak 200g (weight-based)

```
portion_type: 'portion'
portion_size: 200        // 1 portion = 200 grams
output_quantity: 1       // 1 batch produces 1 portion
output_unit: 'gram'
last_known_cost: 306.25  // 306.25 IDR per GRAM
```

**Cost of 1 portion = 200g × 306.25 IDR/g = 61,250 IDR**

### Example: Shrimp 30pc (weight-based, despite name)

```
portion_type: 'portion'
portion_size: 16.67      // 1 portion ≈ 16.67 grams (1 shrimp)
output_quantity: 30      // 1 batch produces 30 portions (30 shrimp)
output_unit: 'gram'
last_known_cost: 844.08  // 844.08 IDR per GRAM
```

**Cost of 1 portion = 16.67g × 844.08 IDR/g ≈ 14,071 IDR**

### Example: Slice SourDough bread (piece-based)

```
portion_type: 'portion'
portion_size: 1          // 1 portion = 1 piece (1 slice)
output_quantity: 10      // 1 batch produces 10 slices (from 1 loaf)
output_unit: 'pc'        // PIECE-BASED!
last_known_cost: 2700    // 2,700 IDR per PIECE (not per gram!)
```

**Purchase: 1 loaf = 27,000 IDR → Cut into 10 slices → 2,700 IDR/slice**
**Cost of 1 portion = 1 piece × 2,700 IDR/piece = 2,700 IDR**

---

## Conversion Formulas

### Quantity Conversion (Portions → Grams)

```typescript
// CORRECT FORMULA
function portionToGrams(portions: number, portionSize: number): number {
  return portions * portionSize
}

// Example: 2 portions of Beef Steak
// 2 × 200g = 400 grams
```

### Cost Calculation

```typescript
// CORRECT FORMULA - NO CONVERSION NEEDED
function calculateCost(quantityInGrams: number, costPerGram: number): number {
  return quantityInGrams * costPerGram
}

// Example: 400g of Beef Steak
// 400g × 306.25 IDR/g = 122,500 IDR
```

### Display Conversion (Grams → Portions)

```typescript
// For UI display only
function gramsToPortions(grams: number, portionSize: number): number {
  return grams / portionSize
}

// Example: 400g of Beef Steak (for display)
// 400g / 200g = 2 portions
```

---

## Module Contracts

### 1. DecompositionEngine

**INPUT:**

- `quantity`: number (portions or grams, per composition.unit)
- `unit`: string ('portion' or 'gram')

**OUTPUT:**

- `quantity`: number (ALWAYS in grams/base units)
- `unit`: string (ALWAYS 'gram' or output_unit)

**CONVERSION:** If input unit is 'portion', multiply by `portionSize`

### 2. BatchAllocationUtils

**INPUT:**

- `requiredQuantity`: number (MUST be in grams/base units)
- `preparationId`: string

**OUTPUT:**

- `totalCost`: number (in IDR)
- `avgCostPerUnit`: number (IDR per gram)

**CONVERSION:** NONE - expects grams, returns cost per gram

### 3. CostAdapter

**INPUT:**

- Decomposed nodes (all quantities in grams)

**OUTPUT:**

- Total cost breakdown

**CONVERSION:** NONE - all nodes already in base units

### 4. WriteOffAdapter

**INPUT:**

- Decomposed nodes (all quantities in grams)

**OUTPUT:**

- Write-off items with quantities in grams

**CONVERSION:** NONE - all nodes already in base units

### 5. RPC Functions (allocate_preparation_fifo)

**INPUT:**

- `p_quantity`: NUMERIC (MUST be in grams)
- `p_fallback_cost`: NUMERIC (MUST be cost per gram)

**OUTPUT:**

- Cost allocations (all per-gram)

**CONVERSION:** NONE - expects grams, returns cost per gram

---

## Database Storage Rules

### preparation_batches Table

| Column             | Unit     | Description                      |
| ------------------ | -------- | -------------------------------- |
| `initial_quantity` | grams    | Total grams produced             |
| `current_quantity` | grams    | Remaining grams                  |
| `cost_per_unit`    | IDR/gram | Cost per gram                    |
| `total_value`      | IDR      | current_quantity × cost_per_unit |
| `unit`             | string   | Always 'gram' or 'ml'            |

### preparations Table

| Column            | Unit     | Description                       |
| ----------------- | -------- | --------------------------------- |
| `portion_size`    | grams    | Grams per portion                 |
| `output_quantity` | portions | Portions per batch                |
| `last_known_cost` | IDR/gram | Cost per gram (from latest batch) |

---

## Common Mistakes to Avoid

### ❌ WRONG: Using outputQuantity for quantity conversion

```typescript
// WRONG - outputQuantity is NUMBER OF PORTIONS, not grams
const convertedQuantity = baseQuantity * preparation.outputQuantity
```

### ✅ CORRECT: Using portionSize for quantity conversion

```typescript
// CORRECT - portionSize is GRAMS PER PORTION
const convertedQuantity = baseQuantity * preparation.portionSize
```

---

### ❌ WRONG: Dividing cost by portionSize

```typescript
// WRONG - last_known_cost is already per-gram!
const normalizedCost = fallbackCost / preparation.portionSize
```

### ✅ CORRECT: Using cost directly

```typescript
// CORRECT - no conversion needed
const costPerGram = preparation.lastKnownCost
```

---

### ❌ WRONG: Storing cost per portion

```typescript
// WRONG - costs must be per base unit
batch.costPerUnit = totalCost / numberOfPortions // per-portion
```

### ✅ CORRECT: Storing cost per gram

```typescript
// CORRECT - divide by grams, not portions
batch.costPerUnit = totalCost / totalGramsProduced // per-gram
```

---

## Debugging Checklist

When investigating unit/cost errors:

1. **Check preparation fields:**

   ```sql
   SELECT id, name, portion_type, portion_size, output_quantity,
          output_unit, last_known_cost
   FROM preparations WHERE id = 'xxx';
   ```

2. **Verify batch storage:**

   ```sql
   SELECT unit, current_quantity, cost_per_unit, total_value
   FROM preparation_batches WHERE preparation_id = 'xxx';
   ```

3. **Validate cost consistency:**

   - `batch.cost_per_unit` should match `preparation.last_known_cost`
   - `batch.total_value` = `batch.current_quantity × batch.cost_per_unit`

4. **Check portion_size is reasonable:**
   - If name says "100g", portion_size should be ~100
   - If name says "30pc", portion_size should be weight of 1 piece

---

## Code Files That Must Follow This Spec

| File                                                   | Responsibility          |
| ------------------------------------------------------ | ----------------------- |
| `src/core/decomposition/utils/portionUtils.ts`         | Quantity conversion     |
| `src/core/decomposition/utils/batchAllocationUtils.ts` | FIFO cost allocation    |
| `src/core/decomposition/DecompositionEngine.ts`        | Orchestrates conversion |
| `src/core/decomposition/adapters/CostAdapter.ts`       | Cost calculation        |
| `src/core/decomposition/adapters/WriteOffAdapter.ts`   | Write-off items         |
| `src/stores/preparation/preparationService.ts`         | Batch creation          |
| `src/core/cost/menuCostCalculator.ts`                  | Menu cost calculation   |
| RPC: `allocate_preparation_fifo`                       | Database FIFO           |
| RPC: `allocate_product_fifo`                           | Database FIFO           |

---

## Known Data Issues (To Fix)

Some preparations have incorrect `portion_size`:

| Name                      | Current portion_size | Should Be |
| ------------------------- | -------------------- | --------- |
| French fries portion 100g | 1                    | 100       |
| (Check others...)         |                      |           |

Run validation query:

```sql
SELECT name, portion_size, output_quantity
FROM preparations
WHERE portion_type = 'portion'
  AND (portion_size <= 1 OR portion_size IS NULL)
  AND name LIKE '%g%';
```

---

## Migration Plan

### Phase 1: Fix Code (Priority: HIGH)

1. **Fix `portionUtils.ts`:**

   - Change `outputQuantity` to `portionSize` in conversion

2. **Fix `batchAllocationUtils.ts`:**
   - Remove the division by `portionSize` (cost already per-gram)

### Phase 2: Validate Data (Priority: MEDIUM)

1. Run validation queries to find inconsistent data
2. Fix `portion_size` values that don't match naming
3. Verify `last_known_cost` is actually per-gram

### Phase 3: Add Runtime Validation (Priority: LOW)

1. Add assertions in key functions
2. Add debug logging for unit mismatches
3. Consider adding database constraints

---

## Version History

| Date       | Version | Changes               |
| ---------- | ------- | --------------------- |
| 2026-01-31 | 1.0     | Initial specification |
