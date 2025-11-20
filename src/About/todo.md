# =� Current Sprint: Preparation Store - Supabase Migration

> **=� Strategy:** See [PrepProduction.md](./PrepProduction.md) for production preparation strategy
> **� CRITICAL RULE:** Always check TypeScript interface FIRST before creating/updating Supabase tables!

## =� Current Status (2025-11-20)

**Sprint Goal: <� Complete Preparation Store Supabase Migration**

**What's Working:**

-  Products, Menu, Recipes - fully migrated to Supabase
-  Supabase tables for preparations exist and are populated (12 preparations, 14 batches, 17 operations)
-  Recipe creation and preparation creation working correctly

**What's Broken:**

- L Preparation storage operations (receipts, corrections, write-offs, inventory)
- L preparationService.ts has compilation errors (missing mock file, type errors)
- L Supabase service exists but not integrated
- L RLS policies disabled on preparation tables
- L Database contains mixed data (old TEXT IDs + new UUIDs)

---

## =� Preparation Tables Schema Reference

**Use this schema for implementation - avoid large `list_tables` queries**

### 1. `preparations` (12 rows) - Catalog

**Purpose:** Primary catalog of semi-finished products

**Structure:**

```sql
id                    UUID PRIMARY KEY
code                  TEXT UNIQUE          -- Auto: P-001, P-002...
name                  TEXT NOT NULL
type                  preparation_type     -- 'sauce', 'garnish', 'marinade', 'semifinished', 'seasoning', 'other'
output_quantity       DECIMAL(10,3)
output_unit           TEXT                 -- 'gram', 'ml', 'piece'
preparation_time      INTEGER              -- minutes
cost_per_portion      DECIMAL(10,2)
used_in_departments   TEXT[]               -- ['kitchen', 'bar']
shelf_life            INTEGER              -- days (� MISSING in TypeScript interface)
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

**RLS:** � DISABLED (needs enabling)

**TypeScript Interface Location:** `src/stores/recipes/types.ts`

---

### 2. `preparation_batches` (14 rows + old data) - Inventory

**Purpose:** Tracks inventory batches with FIFO logic

**Structure:**

```sql
id                 UUID PRIMARY KEY
batch_number       TEXT NOT NULL         -- Format: B-PREP-{NAME}-{SEQ}-{DATE}
preparation_id     UUID REFERENCES preparations(id)
department         TEXT NOT NULL         -- 'kitchen' | 'bar'
initial_quantity   DECIMAL(10,3)
current_quantity   DECIMAL(10,3)         -- Decreases with consumption
unit               TEXT NOT NULL
cost_per_unit      DECIMAL(10,2)
total_value        DECIMAL(10,2)         -- current_quantity * cost_per_unit
production_date    TIMESTAMPTZ NOT NULL
expiry_date        TIMESTAMPTZ
source_type        TEXT                  -- 'production', 'transfer', 'correction'
status             TEXT                  -- 'active', 'consumed', 'expired', 'written_off'
is_active          BOOLEAN DEFAULT true
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

**RLS:** � DISABLED (needs enabling)

**FIFO Query:**

```sql
-- Get batches in FIFO order for consumption
SELECT * FROM preparation_batches
WHERE preparation_id = $1
  AND department = $2
  AND status = 'active'
  AND current_quantity > 0
ORDER BY production_date ASC, created_at ASC;
```

**� DATA ISSUE:** Contains old TEXT IDs that need cleanup:

- `prep-batch-015`, `prep-batch-016`, etc.

---

### 3. `preparation_operations` (17 rows + old data) - Audit Trail

**Purpose:** Complete audit trail of all storage operations

**Structure:**

```sql
id                   UUID PRIMARY KEY
operation_type       TEXT NOT NULL      -- 'receipt', 'correction', 'write_off', 'inventory'
document_number      TEXT UNIQUE        -- Format: PREP-{TYPE}-{SEQ}
operation_date       TIMESTAMPTZ NOT NULL
department           TEXT NOT NULL
responsible_person   TEXT
items                JSONB NOT NULL     -- Array of operation items
total_value          DECIMAL(10,2)
status               TEXT               -- 'draft', 'confirmed', 'cancelled'
notes                TEXT
consumption_details  JSONB              -- For consumption operations
created_at           TIMESTAMPTZ
updated_at           TIMESTAMPTZ
```

**RLS:** � DISABLED (needs enabling)

**Items JSONB Structure:**

```typescript
{
  preparationId: string,
  preparationName: string,
  quantity: number,
  unit: string,
  totalCost: number,
  batchAllocations?: [{
    batchId: string,
    batchNumber: string,
    quantity: number,
    costPerUnit: number,
    batchDate: string
  }]
}[]
```

**� DATA ISSUE:** Contains invalid operation type `'consumption'` (should be `'write_off'`)

---

### 4. `preparation_inventory_documents` (0 rows) - Inventory Sessions

**Purpose:** Track inventory counting sessions

**Structure:**

```sql
id                     UUID PRIMARY KEY
document_number        TEXT UNIQUE
inventory_date         TIMESTAMPTZ NOT NULL
department             TEXT NOT NULL
status                 TEXT              -- 'in_progress', 'completed', 'cancelled'
responsible_person     TEXT
total_items            INTEGER
discrepancies_count    INTEGER
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
```

**RLS:**  ENABLED

---

### 5. `preparation_inventory_items` (0 rows) - Inventory Items

**Purpose:** Individual items counted during inventory

**Structure:**

```sql
id                 UUID PRIMARY KEY
inventory_id       UUID REFERENCES preparation_inventory_documents(id)
preparation_id     UUID REFERENCES preparations(id)
system_quantity    DECIMAL(10,3)        -- From batches
counted_quantity   DECIMAL(10,3)        -- Physical count
difference         DECIMAL(10,3)        -- counted - system
notes              TEXT
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

**RLS:**  ENABLED

---

### 6. `preparation_ingredients` (57 rows) - Recipe Composition

**Purpose:** Links preparations to products (what products are used to make preparations)

**Structure:**

```sql
id                 TEXT (� Should be UUID)
preparation_id     UUID REFERENCES preparations(id)
product_id         UUID REFERENCES products(id)
quantity           DECIMAL(10,3)
unit               TEXT
notes              TEXT
```

**RLS:** � DISABLED (needs enabling)

**� MIGRATION NEEDED:** ID column should be UUID, currently TEXT

---

## <� Migration Tasks

### Phase 1: Cleanup & Type Fixes (~45 min)

#### 1.1 Fix Type System

- [ ] Add `shelfLife?: number` to Preparation interface

  - File: `src/stores/recipes/types.ts`
  - Location: Preparation interface
  - Fixes errors in: preparationService.ts:66, usePreparationWriteOff.ts:469

- [ ] Fix PreparationDepartment type to include 'all'
  - File: `src/stores/preparation/types.ts`
  - Change: `type PreparationDepartment = 'kitchen' | 'bar' | 'all'`
  - Fixes 6 type errors in preparationService.ts (lines 153, 187, 208, 411, 855, 878)

#### 1.2 Remove Mock Files

- [ ] Delete `src/stores/preparation/preparationMock.ts`
- [ ] Remove mock import from `src/stores/preparation/index.ts` (line 59)
- [ ] Remove mock exports from index.ts (lines 51-59)
- [ ] Remove mock imports from `src/stores/preparation/preparationService.ts` (lines 4-8)
- [ ] Remove unused variable `days` from preparationService.ts:895

#### 1.3 Clean Up Database - Remove Old Data

**� CRITICAL:** Database contains two sets of data:

- **Old data** (TEXT IDs): 4 batches + 2 operations with IDs like `prep-batch-015`, `prep-tomato-sauce`
- **New data** (UUIDs): 12 preparations without batches

**Example of problematic data:**

```json
// OLD - TEXT IDs (should be deleted)
{
  "id": "prep-batch-015",
  "preparationId": "prep-mashed-potato"
}

// NEW - UUIDs (correct)
{
  "id": "f57a4016-2c2c-4c1b-bd22-5275eaf5ff3b",
  "preparationId": "b05daffe-3e98-4106-977a-522d91b30dd9"
}
```

**Tasks:**

- [ ] Delete old batches with TEXT IDs:

  ```sql
  -- First verify what will be deleted
  SELECT id, batch_number, preparation_id
  FROM preparation_batches
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- Then delete
  DELETE FROM preparation_batches
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  ```

- [ ] Delete old operations with TEXT IDs:

  ```sql
  -- First verify
  SELECT id, operation_type, document_number
  FROM preparation_operations
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- Then delete
  DELETE FROM preparation_operations
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  ```

- [ ] Fix invalid operation type 'consumption' � 'write_off':

  ```sql
  -- First check
  SELECT id, operation_type FROM preparation_operations
  WHERE operation_type = 'consumption';

  -- Then fix
  UPDATE preparation_operations
  SET operation_type = 'write_off'
  WHERE operation_type = 'consumption';
  ```

- [ ] Verify cleanup completed:

  ```sql
  -- Should return 0 rows
  SELECT id FROM preparation_batches
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT id FROM preparation_operations
  WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  ```

---

### Phase 2: Supabase Service Integration (~60 min)

#### 2.1 Fix Existing Supabase Service

- [ ] Fix `src/stores/recipes/supabase/preparationsSupabaseService.ts` imports
  - [ ] Fix `@/config/supabase` import path
  - [ ] Fix `@/utils` import path
  - [ ] Fix `./mappers` import (create if missing)
  - [ ] Fix all implicit `any` type errors

#### 2.2 Create Database Mappers

- [ ] Create `src/stores/recipes/supabase/preparationMappers.ts`
  - [ ] `mapPreparationFromDB()` - Database � App
  - [ ] `mapPreparationToDB()` - App � Database
  - [ ] `mapBatchFromDB()` - Database � App
  - [ ] `mapBatchToDB()` - App � Database
  - [ ] `mapOperationFromDB()` - Database � App
  - [ ] `mapOperationToDB()` - App � Database

**Mapper Example:**

```typescript
export function mapBatchFromDB(dbBatch: any): PreparationBatch {
  return {
    id: dbBatch.id,
    batchNumber: dbBatch.batch_number,
    preparationId: dbBatch.preparation_id,
    department: dbBatch.department,
    initialQuantity: dbBatch.initial_quantity,
    currentQuantity: dbBatch.current_quantity,
    unit: dbBatch.unit,
    costPerUnit: dbBatch.cost_per_unit,
    totalValue: dbBatch.total_value,
    productionDate: dbBatch.production_date,
    expiryDate: dbBatch.expiry_date,
    sourceType: dbBatch.source_type,
    status: dbBatch.status,
    isActive: dbBatch.is_active,
    createdAt: dbBatch.created_at,
    updatedAt: dbBatch.updated_at
  }
}
```

#### 2.3 Migrate preparationService to Supabase

**File:** `src/stores/preparation/preparationService.ts`

- [ ] Import preparationsSupabaseService
- [ ] Remove in-memory storage (batches, operations, balances arrays)
- [ ] Remove `loadMockData()` method

**Implement Supabase Operations:**

- [ ] `fetchBalances()` � Query batches and calculate balances

  ```typescript
  // Get all active batches
  const { data: batches } = await supabase
    .from('preparation_batches')
    .select('*')
    .eq('status', 'active')
    .gt('current_quantity', 0)

  // Calculate balances by preparation + department
  ```

- [ ] `fetchBatches(department, status)` � Query with filters

  ```typescript
  let query = supabase
    .from('preparation_batches')
    .select('*')
    .order('production_date', { ascending: true })

  if (department && department !== 'all') {
    query = query.eq('department', department)
  }
  if (status) {
    query = query.eq('status', status)
  }
  ```

- [ ] `fetchOperations(dateFrom, dateTo, department)` � Query with date range

  ```typescript
  const { data } = await supabase
    .from('preparation_operations')
    .select('*')
    .gte('operation_date', dateFrom)
    .lte('operation_date', dateTo)
    .eq('department', department)
    .order('operation_date', { ascending: false })
  ```

- [ ] `createReceipt()` � Transaction: insert operation + create batch

  ```typescript
  // 1. Insert operation
  const { data: operation } = await supabase
    .from('preparation_operations')
    .insert({
      operation_type: 'receipt',
      document_number: generateDocNumber('PREP-REC'),
      operation_date: new Date(),
      department,
      items,
      total_value
    })
    .select()
    .single()

  // 2. Create batch
  const { data: batch } = await supabase
    .from('preparation_batches')
    .insert({
      preparation_id: preparationId,
      batch_number: generateBatchNumber(),
      department,
      initial_quantity: quantity,
      current_quantity: quantity,
      cost_per_unit: costPerUnit,
      production_date: new Date(),
      expiry_date: calculateExpiryDate(shelfLife)
    })
    .select()
    .single()
  ```

- [ ] `createCorrection()` � Transaction: insert operation + update batch
- [ ] `createWriteOff()` � Transaction: insert operation + FIFO batch allocation

  ```typescript
  // 1. Find batches to allocate from (FIFO)
  const batches = await getBatchesFIFO(preparationId, department, quantity)

  // 2. Update batch quantities
  for (const allocation of batches) {
    await supabase
      .from('preparation_batches')
      .update({
        current_quantity: allocation.newQuantity,
        status: allocation.newQuantity === 0 ? 'consumed' : 'active'
      })
      .eq('id', allocation.batchId)
  }

  // 3. Insert operation with batch allocations
  await supabase.from('preparation_operations').insert(operation)
  ```

- [ ] `startInventory()` � Insert inventory document
- [ ] `updateInventory()` � Upsert inventory items
- [ ] `finalizeInventory()` � Transaction: update document + create corrections

**Workflow Reference:**

<details>
<summary>=� Complete Supabase Integration Examples</summary>

```typescript
// FIFO Batch Allocation Helper
async function getBatchesFIFO(
  preparationId: string,
  department: string,
  neededQuantity: number
): Promise<BatchAllocation[]> {
  const { data: batches } = await supabase
    .from('preparation_batches')
    .select('*')
    .eq('preparation_id', preparationId)
    .eq('department', department)
    .eq('status', 'active')
    .gt('current_quantity', 0)
    .order('production_date', { ascending: true })
    .order('created_at', { ascending: true })

  let remaining = neededQuantity
  const allocations: BatchAllocation[] = []

  for (const batch of batches) {
    if (remaining <= 0) break

    const allocatedQty = Math.min(remaining, batch.current_quantity)
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batch_number,
      quantity: allocatedQty,
      costPerUnit: batch.cost_per_unit,
      newQuantity: batch.current_quantity - allocatedQty
    })

    remaining -= allocatedQty
  }

  return allocations
}

// Calculate Balances
async function calculateBalances(department?: string): Promise<PreparationBalance[]> {
  let query = supabase
    .from('preparation_batches')
    .select('*, preparation:preparations(*)')
    .eq('status', 'active')
    .gt('current_quantity', 0)

  if (department && department !== 'all') {
    query = query.eq('department', department)
  }

  const { data: batches } = await query

  // Group by preparation + department
  const grouped = batches.reduce((acc, batch) => {
    const key = `${batch.preparation_id}_${batch.department}`
    if (!acc[key]) {
      acc[key] = {
        preparationId: batch.preparation_id,
        preparationName: batch.preparation.name,
        department: batch.department,
        batches: [],
        totalQuantity: 0,
        totalValue: 0
      }
    }
    acc[key].batches.push(batch)
    acc[key].totalQuantity += batch.current_quantity
    acc[key].totalValue += batch.total_value
    return acc
  }, {})

  return Object.values(grouped)
}
```

</details>

---

### Phase 3: RLS Policies & Security (~45 min)

#### 3.1 Enable RLS

- [ ] Create migration: `enable_rls_on_preparations`
  ```sql
  -- Enable RLS on all preparation tables
  ALTER TABLE preparations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE preparation_batches ENABLE ROW LEVEL SECURITY;
  ALTER TABLE preparation_operations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE preparation_ingredients ENABLE ROW LEVEL SECURITY;
  ```

#### 3.2 Create RLS Policies

- [ ] `preparations` table policies:

  ```sql
  -- SELECT: All authenticated users
  CREATE POLICY "preparations_select" ON preparations
    FOR SELECT TO authenticated
    USING (true);

  -- INSERT: All authenticated users
  CREATE POLICY "preparations_insert" ON preparations
    FOR INSERT TO authenticated
    WITH CHECK (true);

  -- UPDATE: All authenticated users
  CREATE POLICY "preparations_update" ON preparations
    FOR UPDATE TO authenticated
    USING (true);

  -- DELETE: Admin/Manager only
  CREATE POLICY "preparations_delete" ON preparations
    FOR DELETE TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));
  ```

- [ ] `preparation_batches` table policies:

  ```sql
  CREATE POLICY "preparation_batches_select" ON preparation_batches
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "preparation_batches_insert" ON preparation_batches
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "preparation_batches_update" ON preparation_batches
    FOR UPDATE TO authenticated USING (true);

  CREATE POLICY "preparation_batches_delete" ON preparation_batches
    FOR DELETE TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));
  ```

- [ ] `preparation_operations` table policies:

  ```sql
  CREATE POLICY "preparation_operations_select" ON preparation_operations
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "preparation_operations_insert" ON preparation_operations
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "preparation_operations_update" ON preparation_operations
    FOR UPDATE TO authenticated
    USING (auth.jwt() ->> 'email' = responsible_person);

  CREATE POLICY "preparation_operations_delete" ON preparation_operations
    FOR DELETE TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));
  ```

- [ ] `preparation_ingredients` table policies:

  ```sql
  CREATE POLICY "preparation_ingredients_select" ON preparation_ingredients
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "preparation_ingredients_insert" ON preparation_ingredients
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "preparation_ingredients_update" ON preparation_ingredients
    FOR UPDATE TO authenticated USING (true);

  CREATE POLICY "preparation_ingredients_delete" ON preparation_ingredients
    FOR DELETE TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));
  ```

#### 3.3 Verify Security

- [ ] Run security advisor: `mcp__supabase__get_advisors({ type: 'security' })`
- [ ] Verify no missing RLS policies
- [ ] Fix any security warnings

---

### Phase 4: Testing & Validation (~30 min)

#### 4.1 TypeScript Compilation

- [ ] Run `pnpm build` - verify no errors
- [ ] Verify all 16+ diagnostics from preparationService.ts are fixed
- [ ] Check no implicit any errors
- [ ] Check no type mismatch errors

#### 4.2 Functional Testing

**Test Balances View:**

- [ ] Open `/preparation` view in browser
- [ ] Verify preparations load from Supabase
- [ ] Check balances display correctly
- [ ] Verify department filter works ('all', 'kitchen', 'bar')
- [ ] Verify batch tracking (FIFO order)

**Test Production Receipt:**

- [ ] Create new receipt
- [ ] Select preparation
- [ ] Enter quantity and cost
- [ ] Save receipt
- [ ] Verify batch created in Supabase
- [ ] Verify operation saved in Supabase
- [ ] Check balance updated

**Test Correction:**

- [ ] Create correction (add/subtract)
- [ ] Select preparation and batch
- [ ] Enter correction quantity
- [ ] Save correction
- [ ] Verify batch quantity updated
- [ ] Verify correction operation saved

**Test Write-off:**

- [ ] Create write-off
- [ ] Select preparation
- [ ] Select reason (spoilage, waste, sample, other)
- [ ] Enter quantity
- [ ] Save write-off
- [ ] Verify FIFO batch allocation
- [ ] Verify batch quantities decreased
- [ ] Verify write-off operation saved

**Test Inventory:**

- [ ] Start new inventory
- [ ] Select department
- [ ] Count preparations (enter counted quantities)
- [ ] Verify discrepancies calculated
- [ ] Finalize inventory
- [ ] Verify corrections created for discrepancies
- [ ] Check balances updated

**Test Operations History:**

- [ ] Open operations tab
- [ ] Verify all operations displayed
- [ ] Verify date range filter works
- [ ] Verify department filter works
- [ ] Verify operation details show correctly

#### 4.3 Console Verification

- [ ] No TypeScript errors in browser console
- [ ] No network errors (failed Supabase queries)
- [ ] No data loading errors
- [ ] No RLS policy errors
- [ ] Verify debug logs show Supabase operations

---

## <� Success Criteria

**Phase 1 Complete:**

-  TypeScript compiles without errors
-  Mock files deleted
-  Database cleaned (only UUID data)
-  All type system issues fixed

**Phase 2 Complete:**

-  preparationService uses Supabase
-  All CRUD operations work
-  FIFO logic implemented
-  Balances calculated correctly
-  Operations audit trail complete

**Phase 3 Complete:**

-  RLS enabled on all tables
-  All policies created
-  Security advisor shows no warnings

**Phase 4 Complete:**

-  All functional tests pass
-  No errors in console
-  App runs successfully at http://localhost:5174/
-  Preparation view works end-to-end

---

## =� Notes & Reminders

**Field Naming Convention:**

- Database: `snake_case` (preparation_id, cost_per_unit)
- TypeScript: `camelCase` (preparationId, costPerUnit)

**FIFO Logic:**

- Always order by `production_date ASC, created_at ASC`
- Allocate from oldest batches first
- Update batch status to 'consumed' when quantity reaches 0

**Cost Calculation:**

- Batch total_value = current_quantity \* cost_per_unit
- Balance average_cost = SUM(total_value) / SUM(quantity)

**TypeScript Issues to Remember:**

- Add `shelfLife?: number` to Preparation interface
- Add `'all'` to PreparationDepartment type
- Remove all mock file references

---

**Last Updated:** 2025-11-20
**Estimated Total Time:** ~3 hours
**Status:** Phase 1 - Ready to start
