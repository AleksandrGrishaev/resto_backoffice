# Preparation Cost Architecture

This document describes how costs are calculated, stored, and propagated through the preparation system.

## Overview

Preparation costs flow from raw ingredients through production batches to menu items. Accurate cost tracking is critical for:

- COGS (Cost of Goods Sold) calculations
- Profitability analysis
- Inventory valuation
- Pricing decisions

## Key Principles

### 1. Base Unit Storage

**All costs are stored per base unit (gram or ml)**, regardless of how the preparation is displayed or sold.

```
preparation.last_known_cost = cost per gram (or ml)
batch.cost_per_unit = cost per gram (or ml)
```

For portion-type preparations:

- Internal storage: cost per gram
- Display: cost per portion (calculated as `cost_per_gram * portion_size`)

### 2. Cost Update Flow

Cost updates happen in a specific sequence during production:

```
1. User initiates createReceipt()
   |
2. Auto write-off raw materials (storageService.createWriteOff)
   |-- Returns actualWriteOffCost (FIFO-based total cost)
   |
3. Calculate cost per unit: actualWriteOffCost / quantity
   |
4. Create preparation batch with actualCostPerUnit
   |
5. Update preparation.last_known_cost with new cost
```

### 3. Cost Fallback Chain

When determining cost for corrections/negative batches, the system uses this fallback chain:

```
1. Active batches (newest first by production_date)
   - Most accurate current cost
   |
2. Depleted batches (newest first)
   - Historical cost when no active stock
   |
3. preparation.last_known_cost from database
   - Cached cost from last production
   |
4. Zero (with error logging)
   - Makes missing cost visible in reports
```

## Files and Responsibilities

### preparationService.ts

- `createReceipt()` - Main cost calculation entry point

  - Triggers auto write-off
  - Captures actual FIFO cost from write-off
  - Creates batch with actual cost
  - Updates preparation.last_known_cost

- `getLastKnownCostFromDB()` - Async DB-based cost lookup

  - Used when store may not be initialized
  - Queries batches and preparations directly

- `getLastKnownCost()` - Sync in-memory cost lookup

  - Uses cached batches array
  - Faster but requires initialized store

- `createCorrection()` - Inventory adjustment costs
  - Surplus: Uses getLastKnownCostFromDB() for new batch
  - Shortage: Allocates from FIFO, creates negative batch if needed

### negativeBatchService.ts

- `calculateNegativeBatchCost()` - Cost for negative stock situations

  - Uses same fallback chain as getLastKnownCostFromDB()
  - Returns 0 with error log if all fallbacks fail

- `createNegativeBatch()` - Creates negative quantity batch
  - Requires cost parameter (caller must determine cost)
  - Tracks shortage until reconciled by new production

### transitBatchService.ts

- `createSingleBatch()` - Creates batches from purchase orders
  - Converts cost to base units for weight/volume products
  - **Does NOT convert** cost for piece-based products

## Common Pitfalls

### 1. Zero Cost Batches

**Cause**: getPreparationInfo() returns `lastKnownCost: 0` when recipesStore not initialized.

**Solution**: Use `getLastKnownCostFromDB()` for correction operations.

### 2. Inflated Base Cost

**Cause**: Unit conversion multiplies price by package quantity instead of keeping per-piece.

**Example** (Ham Aroma):

- Purchase: 152 Rp per piece, package of 17.3 pieces
- Wrong: 152 × 17.3 = 2,634.62 Rp/piece
- Correct: 152 Rp/piece (unchanged)

**Solution**: Skip price conversion for piece-based products.

### 3. Stale Cost Data

**Cause**: Using in-memory cache when DB has newer data.

**Solution**: Call `refreshBatches()` after operations that create new batches.

## Database Schema

### preparations table

```sql
last_known_cost DECIMAL  -- Cost per base unit (gram/ml)
```

### preparation_batches table

```sql
cost_per_unit DECIMAL    -- Cost per base unit
total_value DECIMAL      -- current_quantity * cost_per_unit
is_negative BOOLEAN      -- True for shortage tracking batches
reconciled_at TIMESTAMP  -- When negative batch was covered
```

## Validation Checklist

When debugging cost issues:

1. Check `preparation.last_known_cost` in DB
2. Check recent batch `cost_per_unit` values
3. Verify ingredient costs in `products.base_cost_per_unit`
4. Look for zero-cost batches: `SELECT * FROM preparation_batches WHERE cost_per_unit = 0`
5. Check for inflated product costs: `SELECT * FROM products WHERE base_cost_per_unit > cost * 2`

## Related Documents

- `/src/stores/preparation/types.ts` - Type definitions
- `/src/stores/storage/types.ts` - Storage batch types
- `/CLAUDE.md` - Database migration policy
