# Bug: Preparation Batch Cost Mismatch (FIFO vs Catalog Price)

## Problem Description

When producing a preparation (e.g., Fish), there is a **mismatch between the actual FIFO write-off cost and the cost recorded in the created preparation batch**.

## Example Scenario

### Setup:

- **Product Bacon** has 2 batches:

  - Batch #1 (older, FIFO first): 3000g @ **Rp 90/gram**
  - Batch #2 (newer): 100g @ **Rp 250/gram**
  - Catalog `baseCostPerUnit`: **Rp 250/gram**

- **Preparation Fish** recipe:
  - Uses 100g Bacon with 95% yield adjustment
  - Actual needed: 105.26g Bacon

### What Happens:

| Step              | Expected                         | Actual                  |
| ----------------- | -------------------------------- | ----------------------- |
| FIFO Write-off    | 105.26g � Rp 90 = **Rp 9,474**   | **Rp 9,474** (correct!) |
| Batch costPerUnit | Rp 9,474 / 100g = **Rp 94.74/g** | **Rp 263/g** (wrong!)   |
| Batch totalValue  | **Rp 9,474**                     | **Rp 26,316** (wrong!)  |

### Root Cause:

In `DirectPreparationProductionDialog.vue`, the `calculatedCostPerUnit` uses **catalog price** (`product.baseCostPerUnit = 250`), not the actual FIFO batch price (90):

```typescript
// Current code uses catalog price:
const ingredientCost = calculateDirectCost(
  ingredient.quantity,
  product, // Uses product.baseCostPerUnit (250)
  ingredient.useYieldPercentage || false
)
```

This calculated cost is then passed to `preparationService.createReceipt()` and stored in the batch.

### Impact:

- Preparation batches have **inflated costs** (based on catalog price)
- Inventory valuation is **incorrect**
- FIFO works correctly for write-off, but batch cost doesn't reflect actual cost
- Financial reports show wrong preparation costs

## Solution: Option B (Recommended)

Calculate batch cost **after** write-off completes, using actual FIFO values:

```typescript
// In preparationService.createReceipt()
// AFTER write-off:
const writeOffResult = await storageService.createWriteOff(...)
const actualCost = writeOffResult.data.totalValue  // Real FIFO cost
const costPerUnit = actualCost / item.quantity     // Real cost per gram
```

## Files to Modify

1. `src/stores/preparation/preparationService.ts`
   - `createReceipt()` method
   - Use actual write-off `totalValue` for batch cost calculation

## Database Evidence

```sql
-- Write-off shows correct FIFO price (90):
SELECT items FROM storage_operations WHERE document_number = 'WO-553088';
-- Result: costPerUnit: 90, totalCost: 9473.68

-- But preparation batch has wrong price (263):
SELECT cost_per_unit, total_value FROM preparation_batches
WHERE batch_number = 'B-PREP-FISH-941-20251205';
-- Result: cost_per_unit: 263, total_value: 26316
```

## Priority: HIGH

This affects inventory valuation accuracy and financial reporting.

Проблема в РАСЧЁТЕ, не в отображении!

Данные из базы:

| Batch           | Quantity | cost_per_unit | total_value |
| --------------- | -------- | ------------- | ----------- |
| B-PREP-FISH-846 | 100g     | 263.16        | 26,315      |
| B-PREP-FISH-941 | 100g     | 263.16        | 26,315      |
| B-PREP-FISH-098 | 300g     | 263.16        | 15,789      |

Проблема:

- В базу записывается cost_per_unit: 263.16 (из каталога: 250 × yield)
- Должно быть cost_per_unit: ~94.74 (FIFO: 90 × yield)

Баг в preparationService.createReceipt() - использует item.costPerUnit из
диалога (каталожная цена), а не фактическую стоимость из write-off.

Описание записано в NextTodoError.md. Это задача для следующей сессии.
