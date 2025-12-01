# Current Sprint: Sprint 1 - Foundation (Database & Services)

**Duration:** 5 days
**Status:** 🟢 In Progress
**Goal:** Set up database schema and core services for negative inventory management

---

## Sprint Overview

This sprint establishes the foundation for negative inventory management:

- ✅ Add new expense categories for financial tracking
- ✅ Create database schema for negative batches
- ✅ Implement negativeBatchService (core logic)
- ✅ Implement writeOffExpenseService (financial integration)
- ✅ Update storageStore with negative inventory methods

---

## Phase 0: Pre-Sprint Verification ✅ COMPLETED

### Task 0.1: Database Schema Check ✅ DONE

**Command:**

```typescript
mcp__supabase__list_tables({ schemas: ['public'] })
```

**Verify:**

- ✅ `batches` table exists
- ✅ `products` table exists
- ✅ `preparations` table exists
- ✅ `account_transactions` table exists

**Check columns:**

- `batches.cost_per_unit` (or similar cost field)
- `batches.product_id` / `batches.preparation_id`
- `batches.quantity`
- `batches.unit`

### Task 0.2: TypeScript Types Check ✅

**Files to verify:**

```
src/types/storage.ts          → Batch interface
src/types/preparation.ts      → Preparation types
src/stores/account/types.ts   → CreateOperationDto, ExpenseCategory
```

**Verify:**

- Batch interface has cost field (cost_per_unit or similar)
- Product/Preparation interfaces
- CreateOperationDto accepts our parameters

### Task 0.3: Account Store Methods Check ✅

**Verify methods exist:**

- `createOperation(data: CreateOperationDto)` → exists
- `getExpensesByDateRange(from, to)` → for P&L integration

**Verify expenseCategory handling:**

- Can we use it for income type? ✅ YES (validation allows)

---

## Phase 1: Add Expense Categories ✅ COMPLETED

### Task 1.1: Update account/types.ts ✅ DONE

**File:** `src/stores/account/types.ts`

**Add three new categories:**

```typescript
export type DailyExpenseCategory =
  | 'product'
  | 'food_cost' // ← NEW: Negative batch write-offs
  | 'inventory_variance' // ← NEW: Reconciliation corrections (income/expense)
  | 'inventory_adjustment' // ← NEW: Monthly physical count, spoilage
  | 'takeaway'
  | 'ayu_cake'
  | 'utilities'
  | 'salary'
  | 'renovation'
  | 'transport'
  | 'cleaning'
  | 'security'
  | 'village'
  | 'rent'
  | 'other'
```

**Usage:**

- `food_cost` → Expense when negative batch created
- `inventory_variance` → Income when reconciliation happens
- `inventory_adjustment` → Manual corrections, spoilage

**Note:** No database migration needed (category is just enum value)

---

## Phase 2: Database Migration ✅ COMPLETED

### Task 2.1: Create Migration 023 - Negative Inventory Support ✅ DONE

**File:** `src/supabase/migrations/023_negative_inventory_support.sql`

**SQL:**

```sql
-- Migration: 023_negative_inventory_support
-- Description: Add negative inventory tracking to batches, products, and preparations
-- Date: 2025-11-30

-- ========================================
-- BATCHES TABLE: Add negative batch fields
-- ========================================

ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS source_batch_id UUID REFERENCES batches(id);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS negative_created_at TIMESTAMPTZ;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS negative_reason TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS source_operation_type TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS affected_recipe_ids UUID[];
ALTER TABLE batches ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Add check constraint for source_operation_type
ALTER TABLE batches ADD CONSTRAINT batches_source_operation_type_check
  CHECK (source_operation_type IN ('pos_order', 'preparation_production', 'manual_writeoff', NULL));

COMMENT ON COLUMN batches.is_negative IS 'True if this batch represents negative inventory (shortage)';
COMMENT ON COLUMN batches.source_batch_id IS 'Reference to the batch that was used to calculate negative cost';
COMMENT ON COLUMN batches.negative_created_at IS 'Timestamp when negative batch was created';
COMMENT ON COLUMN batches.negative_reason IS 'Reason for negative inventory (e.g., POS order, production)';
COMMENT ON COLUMN batches.source_operation_type IS 'Type of operation that caused negative inventory';
COMMENT ON COLUMN batches.affected_recipe_ids IS 'Array of recipe IDs affected by this negative batch';
COMMENT ON COLUMN batches.reconciled_at IS 'Timestamp when negative batch was reconciled with new stock';

-- ========================================
-- PRODUCTS TABLE: Add negative inventory config
-- ========================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_known_cost DECIMAL(10,2);

COMMENT ON COLUMN products.allow_negative_inventory IS 'Whether this product can have negative inventory';
COMMENT ON COLUMN products.last_known_cost IS 'Cached cost from most recent batch (for performance)';

-- ========================================
-- PREPARATIONS TABLE: Add negative inventory config
-- ========================================

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS allow_negative_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS last_known_cost DECIMAL(10,2);

COMMENT ON COLUMN preparations.allow_negative_inventory IS 'Whether this preparation can have negative inventory';
COMMENT ON COLUMN preparations.last_known_cost IS 'Cached cost from most recent batch (for performance)';
```

**Apply to DEV:**

```typescript
mcp__supabase__apply_migration({
  name: '023_negative_inventory_support',
  query: '-- SQL from above --'
})
```

**Verify:**

```typescript
mcp__supabase__execute_sql({
  query: `
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'batches'
      AND column_name IN ('is_negative', 'source_batch_id', 'negative_created_at', 'negative_reason', 'source_operation_type', 'affected_recipe_ids', 'reconciled_at')
    ORDER BY column_name;
  `
})
```

### Task 2.2: Create Migration 024 - Backfill Last Known Costs ✅ DONE

**File:** `src/supabase/migrations/024_backfill_last_known_costs.sql`

**SQL:**

```sql
-- Migration: 024_backfill_last_known_costs
-- Description: Backfill last_known_cost for existing products and preparations
-- Date: 2025-11-30

-- Backfill last_known_cost for products from most recent batch
UPDATE products p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM batches b
  WHERE b.product_id = p.id
    AND (b.is_negative = FALSE OR b.is_negative IS NULL)
    AND b.quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- Backfill last_known_cost for preparations from most recent batch
UPDATE preparations p
SET last_known_cost = (
  SELECT b.cost_per_unit
  FROM batches b
  WHERE b.preparation_id = p.id
    AND (b.is_negative = FALSE OR b.is_negative IS NULL)
    AND b.quantity > 0
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- Set to 0 if no batch history exists (prevent NULL)
UPDATE products SET last_known_cost = 0 WHERE last_known_cost IS NULL;
UPDATE preparations SET last_known_cost = 0 WHERE last_known_cost IS NULL;
```

**Apply to DEV:**

```typescript
mcp__supabase__apply_migration({
  name: '024_backfill_last_known_costs',
  query: '-- SQL from above --'
})
```

**Verify:**

```typescript
mcp__supabase__execute_sql({
  query: `
    SELECT
      (SELECT COUNT(*) FROM products WHERE last_known_cost IS NOT NULL) as products_with_cost,
      (SELECT COUNT(*) FROM products WHERE last_known_cost > 0) as products_with_nonzero_cost,
      (SELECT COUNT(*) FROM preparations WHERE last_known_cost IS NOT NULL) as preps_with_cost,
      (SELECT COUNT(*) FROM preparations WHERE last_known_cost > 0) as preps_with_nonzero_cost;
  `
})
```

### Task 2.3: Create Migration 025 - Indexes ✅ DONE

**File:** `src/supabase/migrations/025_negative_inventory_indexes.sql`

**SQL:**

```sql
-- Migration: 025_negative_inventory_indexes
-- Description: Add performance indexes for negative inventory queries
-- Date: 2025-11-30

-- Index for fast negative batch lookups
CREATE INDEX IF NOT EXISTS idx_batches_is_negative
  ON batches(is_negative)
  WHERE is_negative = TRUE;

-- Index for source batch lookups
CREATE INDEX IF NOT EXISTS idx_batches_source_batch_id
  ON batches(source_batch_id)
  WHERE source_batch_id IS NOT NULL;

-- Index for reconciliation status
CREATE INDEX IF NOT EXISTS idx_batches_reconciled_at
  ON batches(reconciled_at)
  WHERE is_negative = TRUE;

-- Index for products allowing negative inventory
CREATE INDEX IF NOT EXISTS idx_products_allow_negative
  ON products(allow_negative_inventory)
  WHERE allow_negative_inventory = TRUE;

-- Index for preparations allowing negative inventory
CREATE INDEX IF NOT EXISTS idx_preparations_allow_negative
  ON preparations(allow_negative_inventory)
  WHERE allow_negative_inventory = TRUE;

-- Index for source operation type filtering
CREATE INDEX IF NOT EXISTS idx_batches_source_operation_type
  ON batches(source_operation_type)
  WHERE source_operation_type IS NOT NULL;

-- Composite index for product batch queries (FIFO + last known cost)
CREATE INDEX IF NOT EXISTS idx_batches_product_fifo
  ON batches(product_id, created_at DESC)
  WHERE product_id IS NOT NULL AND (is_negative = FALSE OR is_negative IS NULL);

-- Composite index for preparation batch queries
CREATE INDEX IF NOT EXISTS idx_batches_preparation_fifo
  ON batches(preparation_id, created_at DESC)
  WHERE preparation_id IS NOT NULL AND (is_negative = FALSE OR is_negative IS NULL);
```

**Apply to DEV:**

```typescript
mcp__supabase__apply_migration({
  name: '025_negative_inventory_indexes',
  query: '-- SQL from above --'
})
```

**Verify:**

```typescript
mcp__supabase__execute_sql({
  query: `
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('batches', 'products', 'preparations')
      AND indexname LIKE 'idx_%negative%'
    ORDER BY tablename, indexname;
  `
})
```

---

## Phase 3: TypeScript Types ✅ COMPLETED

### Task 3.1: Update storage types ✅ DONE

**File:** `src/types/storage.ts`

**Add to Batch interface:**

```typescript
export interface Batch {
  id: string
  product_id?: string
  preparation_id?: string
  quantity: number
  unit: string
  cost_per_unit: number
  total_cost: number
  supplier_id?: string
  supplier_name?: string
  arrival_date: Date
  expiry_date?: Date
  created_at: Date
  updated_at: Date

  // NEW: Negative inventory fields
  is_negative?: boolean
  source_batch_id?: string
  negative_created_at?: Date
  negative_reason?: string
  source_operation_type?: 'pos_order' | 'preparation_production' | 'manual_writeoff'
  affected_recipe_ids?: string[]
  reconciled_at?: Date
}
```

**Add to Product interface:**

```typescript
export interface Product {
  id: string
  name: string
  category: string
  unit: string
  // ... existing fields ...

  // NEW: Negative inventory config
  allow_negative_inventory?: boolean
  last_known_cost?: number
}
```

### Task 3.2: Update preparation types ✅ DONE

**File:** `src/types/preparation.ts`

**Add to Preparation interface:**

```typescript
export interface Preparation {
  id: string
  name: string
  category: string
  unit: string
  // ... existing fields ...

  // NEW: Negative inventory config
  allow_negative_inventory?: boolean
  last_known_cost?: number
}
```

---

## Phase 4: Negative Batch Service (2 days)

### Task 4.1: Create negativeBatchService for products

**File:** `src/stores/storage/services/negativeBatchService.ts`

**Implementation:**

```typescript
import { supabase } from '@/config/supabase'
import type { Batch } from '@/types/storage'

/**
 * Service for managing negative inventory batches
 * Handles creation, tracking, and reconciliation of negative batches
 */
class NegativeBatchService {
  /**
   * Get the most recent active (non-negative) batch for a product
   * Used to determine cost for negative batches
   */
  async getLastActiveBatch(productId: string): Promise<Batch | null> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('product_id', productId)
      .or('is_negative.eq.false,is_negative.is.null')
      .gt('quantity', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching last active batch:', error)
      return null
    }

    return data
  }

  /**
   * Calculate cost for negative batch
   * Uses last known cost from most recent batch, or cached cost from product
   */
  async calculateNegativeBatchCost(productId: string, requestedQty: number): Promise<number> {
    // Try to get cost from most recent batch
    const lastBatch = await this.getLastActiveBatch(productId)
    if (lastBatch?.cost_per_unit) {
      return lastBatch.cost_per_unit
    }

    // Fallback to cached last_known_cost from product
    const { data: product } = await supabase
      .from('products')
      .select('last_known_cost')
      .eq('id', productId)
      .single()

    if (product?.last_known_cost) {
      return product.last_known_cost
    }

    // Default to 0 if no cost history exists (should log warning)
    console.warn(
      `⚠️ No cost history found for product ${productId}. Using cost = 0 for negative batch.`
    )
    return 0
  }

  /**
   * Create a negative batch to track inventory shortage
   */
  async createNegativeBatch(params: {
    productId: string
    quantity: number // negative value (e.g., -100)
    cost: number // cost per unit from last batch
    reason: string
    sourceOperationType: 'pos_order' | 'preparation_production' | 'manual_writeoff'
    affectedRecipeIds?: string[]
    userId?: string
    shiftId?: string
  }): Promise<Batch> {
    const { data: lastBatch } = await supabase
      .from('batches')
      .select('id')
      .eq('product_id', params.productId)
      .or('is_negative.eq.false,is_negative.is.null')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const negativeBatch: Partial<Batch> = {
      product_id: params.productId,
      quantity: params.quantity, // negative value
      cost_per_unit: params.cost,
      total_cost: params.quantity * params.cost, // negative total
      unit: '', // Will be set from product
      is_negative: true,
      source_batch_id: lastBatch?.id || null,
      negative_created_at: new Date().toISOString(),
      negative_reason: params.reason,
      source_operation_type: params.sourceOperationType,
      affected_recipe_ids: params.affectedRecipeIds || [],
      reconciled_at: null
    }

    const { data, error } = await supabase.from('batches').insert(negativeBatch).select().single()

    if (error) {
      throw new Error(`Failed to create negative batch: ${error.message}`)
    }

    return data
  }

  /**
   * Check if product has unreconciled negative batches
   */
  async hasNegativeBatches(productId: string): Promise<boolean> {
    const { count } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_negative', true)
      .is('reconciled_at', null)

    return (count ?? 0) > 0
  }

  /**
   * Get all unreconciled negative batches for a product
   */
  async getNegativeBatches(productId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('product_id', productId)
      .eq('is_negative', true)
      .is('reconciled_at', null)
      .order('negative_created_at', { ascending: true })

    if (error) {
      console.error('Error fetching negative batches:', error)
      return []
    }

    return data || []
  }

  /**
   * Mark negative batch as reconciled
   */
  async markAsReconciled(batchId: string): Promise<void> {
    const { error } = await supabase
      .from('batches')
      .update({ reconciled_at: new Date().toISOString() })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to mark batch as reconciled: ${error.message}`)
    }
  }
}

export const negativeBatchService = new NegativeBatchService()
```

### Task 4.2: Create negativeBatchService for preparations

**File:** `src/stores/preparation/services/negativeBatchService.ts`

**Implementation:** (Same as products, but using `preparation_id` instead of `product_id`)

---

## Phase 5: Write-Off Expense Service (1 day)

### Task 5.1: Create writeOffExpenseService

**File:** `src/stores/storage/services/writeOffExpenseService.ts`

**Implementation:**

```typescript
import { useAccountStore } from '@/stores/account'
import type { Batch } from '@/types/storage'

/**
 * Service for recording financial transactions when negative batches are created/reconciled
 * Integrates with Account Store for P&L tracking
 */
class WriteOffExpenseService {
  /**
   * Record expense transaction when negative batch is created
   * This tracks the cost of products consumed beyond available inventory
   */
  async recordNegativeBatchExpense(batch: Batch): Promise<void> {
    const accountStore = useAccountStore()

    // Get default expense account (acc_1 or first available)
    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for expense recording')
      return
    }

    // Calculate total cost (will be negative)
    const totalCost = Math.abs(batch.quantity) * batch.cost_per_unit

    // Create expense transaction
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'expense',
      amount: -totalCost, // negative amount for expense
      description: `Negative inventory write-off: ${batch.product_name || 'Unknown product'} (${Math.abs(batch.quantity)} ${batch.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'food_cost' // NEW category
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(
      `✅ Recorded negative batch expense: ${totalCost} (${batch.product_name || 'Unknown'})`
    )
  }

  /**
   * Record income transaction when negative batch is reconciled
   * This offsets the original expense when new stock arrives
   */
  async recordCorrectionIncome(params: {
    productName: string
    quantity: number
    costPerUnit: number
    unit: string
  }): Promise<void> {
    const accountStore = useAccountStore()

    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for correction recording')
      return
    }

    const totalCost = params.quantity * params.costPerUnit

    // Create INCOME transaction (offsets negative batch expense)
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'income', // ← INCOME, not expense
      amount: totalCost, // positive amount
      description: `Inventory correction (surplus from reconciliation): ${params.productName} (${params.quantity} ${params.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'inventory_variance' // NEW category
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(`✅ Recorded correction income: ${totalCost} (${params.productName})`)
  }
}

export const writeOffExpenseService = new WriteOffExpenseService()
```

---

## Phase 6: Storage Store Integration (1 day)

### Task 6.1: Update storageStore with negative inventory methods

**File:** `src/stores/storage/storageStore.ts`

**Add methods:**

```typescript
import { negativeBatchService } from './services/negativeBatchService'

// ... existing store code ...

/**
 * Update cached last_known_cost for a product
 * Called after batch creation/update to maintain cost cache
 */
async updateProductLastKnownCost(productId: string): Promise<void> {
  const lastBatch = await negativeBatchService.getLastActiveBatch(productId)
  if (lastBatch) {
    const { error } = await supabase
      .from('products')
      .update({ last_known_cost: lastBatch.cost_per_unit })
      .eq('id', productId)

    if (error) {
      console.error('Failed to update last_known_cost:', error)
    }
  }
}

/**
 * Check if product allows negative inventory
 * Configurable per product (default: true)
 */
canGoNegative(productId: string): boolean {
  const product = this.products.find((p) => p.id === productId)
  return product?.allow_negative_inventory ?? true
}
```

---

## Sprint 1 Completion Checklist

### Phase 0: Verification ✅

- [x] Database schema verified
- [x] TypeScript types verified
- [x] Account Store methods verified

### Phase 1: Expense Categories ✅

- [x] Added 3 new categories to DailyExpenseCategory

### Phase 2: Database Migrations ✅

- [x] Created migration 023 (negative inventory support)
- [x] Created migration 024 (backfill last_known_costs)
- [x] Created migration 025 (indexes)
- [x] Applied migrations to DEV database
- [x] Verified schema changes

### Phase 3: TypeScript Types ✅

- [x] Updated Batch interface
- [x] Updated Product interface
- [x] Updated Preparation interface

### Phase 4: Services ✅

- [x] Implemented negativeBatchService (products)
- [x] Implemented negativeBatchService (preparations)

### Phase 5: Expense Service ✅

- [x] Implemented writeOffExpenseService

### Phase 6: Store Integration ✅

- [x] Updated storageStore with negative inventory methods
- [x] Updated preparationStore with negative inventory methods

---

## Testing Before Sprint 2

### Test 1: Negative Batch Creation

```typescript
// Simulate creating negative batch when product runs out
const productId = 'test-product-id'
const shortage = 100 // 100g shortage

const cost = await negativeBatchService.calculateNegativeBatchCost(productId, shortage)
const negativeBatch = await negativeBatchService.createNegativeBatch({
  productId,
  quantity: -shortage,
  cost,
  reason: 'Test: POS order exceeded available stock',
  sourceOperationType: 'pos_order'
})

// Verify batch created
console.log('Negative batch:', negativeBatch)
```

### Test 2: Expense Transaction

```typescript
// Verify expense transaction created
await writeOffExpenseService.recordNegativeBatchExpense(negativeBatch)

// Check in accountStore that transaction exists
const accountStore = useAccountStore()
const transactions = accountStore.transactions.filter(t =>
  t.description.includes('Negative inventory write-off')
)
console.log('Expense transactions:', transactions)
```

### Test 3: Last Known Cost Cache

```typescript
// Verify last_known_cost updated when new batch added
await storageStore.updateProductLastKnownCost(productId)

// Check product has last_known_cost
const product = storageStore.products.find(p => p.id === productId)
console.log('Last known cost:', product?.last_known_cost)
```

---

## Next Sprint Preview: Sprint 2 (Write-Off Logic + Auto-Reconciliation)

**Not implemented in this sprint, but prepared:**

- ✅ negativeBatchService ready to use
- ✅ writeOffExpenseService ready to use
- ✅ Database schema supports reconciliation (reconciled_at field)

**Will implement in Sprint 2:**

- Enhanced useWriteOff composable (detect shortage → create negative batch)
- reconciliationService (auto-reconcile on new batch arrival)
- POS order integration (pass context to write-offs)
- Preparation production integration

---

## Success Criteria

**Sprint 1 is complete when:**

- ✅ All migrations applied to DEV database
- ✅ All new TypeScript types defined
- ✅ negativeBatchService can create/query negative batches
- ✅ writeOffExpenseService can record expenses
- ✅ storageStore has negative inventory methods
- ✅ Manual testing passes (3 tests above)

**Ready for Sprint 2:** ✅ YES
