# 📦 Current Sprint: Storage Store - Supabase Migration

> **📋 Strategy:** Direct migration - Replace all mock data with Supabase in one go
> **🔴 CRITICAL RULE:** Always check TypeScript interface FIRST before creating/updating Supabase tables!

## 📊 Current Status (2025-11-21)

**Sprint Goal: ✅ Complete Storage Store Supabase Migration**

**What's Working:**

- ✅ Products, Menu, Recipes, Preparations - fully migrated to Supabase
- ✅ Storage architecture well-designed (Store + Service pattern)
- ✅ FIFO allocation logic implemented in service layer
- ✅ Transit batch system working (in-memory)
- ✅ Balance calculation logic working (in-memory)

**What Needs Migration:**

- 🔴 Storage batches - Currently using mock data
- 🔴 Storage operations - Currently using mock data
- 🔴 Transit batches - Currently in-memory only (lost on refresh)
- 🔴 Warehouses - Currently using mock data
- 🔴 Service layer - Needs Supabase integration
- 🔴 UI components - Need loading/error states

---

## 🗄️ Storage Tables Schema Reference

**Use this schema for implementation - avoid large `list_tables` queries**

### 1. `warehouses` (1 row) - Storage Locations

**Purpose:** Physical storage locations for inventory

**Structure:**

```sql
id                TEXT PRIMARY KEY      -- 'warehouse-winter'
name              TEXT NOT NULL         -- 'Winter Warehouse'
location          TEXT
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

**Current Data:** 1 warehouse (`warehouse-winter`)

**TypeScript Interface Location:** `src/stores/storage/types.ts`

---

### 2. `storage_batches` (28 rows) - Inventory Batches

**Purpose:** Tracks inventory batches with FIFO logic and transit batches

**Structure:**

```sql
id                   TEXT PRIMARY KEY
batch_number         TEXT UNIQUE NOT NULL     -- Format: B-{PRODUCT}-{SEQ}-{DATE}
item_id              TEXT NOT NULL            -- Product ID
warehouse_id         TEXT REFERENCES warehouses(id)
initial_quantity     NUMERIC(10,3)
current_quantity     NUMERIC(10,3)            -- Decreases with consumption
unit                 TEXT NOT NULL            -- 'gram', 'ml', 'piece'
cost_per_unit        NUMERIC(10,2)
total_value          NUMERIC(10,2)            -- current_quantity * cost_per_unit
receipt_date         TIMESTAMPTZ NOT NULL
expiry_date          TIMESTAMPTZ
supplier_id          TEXT
purchase_order_id    TEXT
status               TEXT NOT NULL            -- 'active', 'expired', 'consumed', 'in_transit'
is_active            BOOLEAN DEFAULT true
created_at           TIMESTAMPTZ
updated_at           TIMESTAMPTZ
```

**Status Values:**

- `'active'` - In warehouse, available for use
- `'in_transit'` - Ordered but not received yet (from purchase orders)
- `'expired'` - Past expiry date
- `'consumed'` - Quantity reached 0

**FIFO Query:**

```sql
-- Get batches in FIFO order for consumption
SELECT * FROM storage_batches
WHERE item_id = $1
  AND warehouse_id = $2
  AND status = 'active'
  AND current_quantity > 0
ORDER BY receipt_date ASC, created_at ASC;
```

**TypeScript Interface:** `StorageBatch` in `src/stores/storage/types.ts`

---

### 3. `storage_operations` (6 rows) - Audit Trail

**Purpose:** Complete audit trail of all storage operations

**Structure:**

```sql
id                      TEXT PRIMARY KEY
operation_type          TEXT NOT NULL         -- 'receipt', 'correction', 'inventory', 'write_off'
document_number         TEXT UNIQUE           -- Format: SO-{TYPE}-{SEQ}
operation_date          TIMESTAMPTZ NOT NULL
warehouse_id            TEXT REFERENCES warehouses(id)
department              TEXT                  -- 'kitchen' | 'bar'
responsible_person      TEXT
items                   JSONB NOT NULL        -- Array of operation items
total_value             NUMERIC(10,2)
notes                   TEXT
correction_details      JSONB                 -- For corrections
write_off_details       JSONB                 -- For write-offs
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

**Items JSONB Structure:**

```typescript
{
  itemId: string,
  itemName: string,
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

**Write-off Details JSONB:**

```typescript
{
  reason: 'expired' | 'spoiled' | 'damaged' | 'other',
  category: 'kpi' | 'non-kpi',  // For statistics
  notes?: string
}
```

**TypeScript Interface:** `StorageOperation` in `src/stores/storage/types.ts`

---

### 4. `inventory_documents` (0 rows) - Inventory Sessions

**Purpose:** Track physical inventory counting sessions

**Structure:**

```sql
id                     TEXT PRIMARY KEY
document_number        TEXT UNIQUE
inventory_date         TIMESTAMPTZ NOT NULL
warehouse_id           TEXT REFERENCES warehouses(id)
department             TEXT
status                 TEXT                   -- 'draft', 'confirmed', 'cancelled'
responsible_person     TEXT
total_items            INTEGER
discrepancies_count    INTEGER
notes                  TEXT
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
```

**TypeScript Interface:** `InventoryDocument` in `src/stores/storage/types.ts`

---

## 🎯 Migration Tasks

### Phase 1: Database Schema Verification & Cleanup (~30 min)

#### 1.1 Verify Current Database State

- [ ] List storage tables: `mcp__supabase__list_tables({ schemas: ['public'] })`
- [ ] Check existing data in `storage_batches` (should have 28 rows)
- [ ] Check existing data in `storage_operations` (should have 6 rows)
- [ ] Check existing data in `warehouses` (should have 1 row)

#### 1.2 Verify Schema Matches TypeScript

- [ ] Compare database schema with `src/stores/storage/types.ts`
- [ ] Ensure all fields match (snake_case in DB, camelCase in TS)
- [ ] Check if any migrations needed for missing fields

#### 1.3 Add Indexes for Performance

- [ ] Create migration: `add_storage_indexes`

```sql
-- FIFO queries optimization
CREATE INDEX IF NOT EXISTS idx_storage_batches_fifo
  ON storage_batches(item_id, warehouse_id, status, receipt_date, created_at)
  WHERE status = 'active' AND current_quantity > 0;

-- Transit batches queries
CREATE INDEX IF NOT EXISTS idx_storage_batches_transit
  ON storage_batches(item_id, status)
  WHERE status = 'in_transit';

-- Operations by date range
CREATE INDEX IF NOT EXISTS idx_storage_operations_date
  ON storage_operations(operation_date DESC, warehouse_id);

-- Operations by type
CREATE INDEX IF NOT EXISTS idx_storage_operations_type
  ON storage_operations(operation_type, warehouse_id);
```

#### 1.4 Generate TypeScript Types

- [ ] Run `mcp__supabase__generate_typescript_types`
- [ ] Save to `src/supabase/types.gen.ts`
- [ ] Compare with existing types in `src/stores/storage/types.ts`

---

### Phase 2: Service Layer Supabase Integration (~90 min)

**File:** `src/stores/storage/storageService.ts` (1254 lines)

#### 2.1 Setup Supabase Client

- [ ] Import Supabase client at top of file

```typescript
import { supabase } from '@/config/supabase'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'StorageService'
```

#### 2.2 Remove Mock Data Dependencies

- [ ] Remove `mockDataCoordinator` import
- [ ] Remove in-memory arrays: `batches`, `operations`, `balances`
- [ ] Keep `warehouses` for now (single warehouse, rarely changes)
- [ ] Remove `loadMockData()` method

#### 2.3 Implement Data Fetching Methods

##### Fetch Batches

- [ ] Replace `getBatches()` with Supabase query

```typescript
async getBatches(
  warehouseId: string = 'warehouse-winter',
  status?: StorageBatchStatus
): Promise<ServiceResponse<StorageBatch[]>> {
  try {
    let query = supabase
      .from('storage_batches')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('receipt_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    DebugUtils.info(MODULE_NAME, `Fetched ${data.length} batches`, {
      warehouseId,
      status
    })

    return {
      success: true,
      data: data.map(this.mapBatchFromDB),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'api'
      }
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch batches', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

##### Fetch Operations

- [ ] Replace `getOperations()` with Supabase query

```typescript
async getOperations(
  warehouseId: string,
  dateFrom?: string,
  dateTo?: string,
  operationType?: StorageOperationType
): Promise<ServiceResponse<StorageOperation[]>> {
  try {
    let query = supabase
      .from('storage_operations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('operation_date', { ascending: false })

    if (dateFrom) {
      query = query.gte('operation_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('operation_date', dateTo)
    }
    if (operationType) {
      query = query.eq('operation_type', operationType)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data.map(this.mapOperationFromDB)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

##### Calculate Balances (In-Memory)

- [ ] Keep balance calculation in-memory, but fetch batches from Supabase first

```typescript
async calculateBalances(
  warehouseId: string = 'warehouse-winter'
): Promise<ServiceResponse<StorageBalance[]>> {
  try {
    // 1. Fetch all active batches from Supabase
    const batchesResponse = await this.getBatches(warehouseId, 'active')
    if (!batchesResponse.success || !batchesResponse.data) {
      throw new Error('Failed to fetch batches')
    }

    const batches = batchesResponse.data

    // 2. Calculate balances in-memory (keep current logic)
    const balanceMap = new Map<string, StorageBalance>()

    for (const batch of batches) {
      if (batch.currentQuantity <= 0) continue

      const key = batch.itemId
      if (!balanceMap.has(key)) {
        balanceMap.set(key, {
          itemId: batch.itemId,
          itemName: '', // Will be populated from products store
          warehouseId: batch.warehouseId,
          totalQuantity: 0,
          unit: batch.unit,
          totalValue: 0,
          averageCost: 0,
          batches: [],
          lastReceiptDate: batch.receiptDate,
          alerts: []
        })
      }

      const balance = balanceMap.get(key)!
      balance.totalQuantity += batch.currentQuantity
      balance.totalValue += batch.totalValue
      balance.batches.push(batch)

      // Update last receipt date
      if (new Date(batch.receiptDate) > new Date(balance.lastReceiptDate)) {
        balance.lastReceiptDate = batch.receiptDate
      }
    }

    // 3. Calculate average costs and populate item names
    const balances = Array.from(balanceMap.values()).map(balance => ({
      ...balance,
      averageCost: balance.totalQuantity > 0
        ? balance.totalValue / balance.totalQuantity
        : 0
    }))

    DebugUtils.store(MODULE_NAME, 'Calculated balances', {
      count: balances.length,
      totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0)
    })

    return {
      success: true,
      data: balances
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 2.4 Implement Create Operations

##### Create Receipt

- [ ] Replace `createReceipt()` with Supabase transaction

```typescript
async createReceipt(
  receiptData: CreateReceiptData
): Promise<ServiceResponse<StorageOperation>> {
  try {
    const documentNumber = this.generateDocumentNumber('RECEIPT')
    const operationDate = new Date().toISOString()

    // 1. Create operation record
    const operation: Partial<StorageOperation> = {
      id: generateId(),
      operationType: 'receipt',
      documentNumber,
      operationDate,
      warehouseId: receiptData.warehouseId,
      department: receiptData.department,
      responsiblePerson: receiptData.responsiblePerson,
      items: receiptData.items,
      totalValue: receiptData.items.reduce((sum, item) => sum + item.totalCost, 0),
      notes: receiptData.notes
    }

    const { data: opData, error: opError } = await supabase
      .from('storage_operations')
      .insert([this.mapOperationToDB(operation)])
      .select()
      .single()

    if (opError) throw opError

    // 2. Create batches for each item
    const batchPromises = receiptData.items.map(item => {
      const batch: Partial<StorageBatch> = {
        id: generateId(),
        batchNumber: this.generateBatchNumber(item.itemName),
        itemId: item.itemId,
        warehouseId: receiptData.warehouseId,
        initialQuantity: item.quantity,
        currentQuantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.totalCost / item.quantity,
        totalValue: item.totalCost,
        receiptDate: operationDate,
        expiryDate: item.expiryDate,
        supplierId: receiptData.supplierId,
        purchaseOrderId: receiptData.purchaseOrderId,
        status: 'active',
        isActive: true
      }

      return supabase
        .from('storage_batches')
        .insert([this.mapBatchToDB(batch)])
        .select()
        .single()
    })

    const batchResults = await Promise.all(batchPromises)
    const batchErrors = batchResults.filter(r => r.error)
    if (batchErrors.length > 0) {
      throw new Error(`Failed to create ${batchErrors.length} batches`)
    }

    DebugUtils.info(MODULE_NAME, '✅ Receipt created', {
      documentNumber,
      itemsCount: receiptData.items.length,
      totalValue: operation.totalValue
    })

    return {
      success: true,
      data: this.mapOperationFromDB(opData)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to create receipt', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

##### Create Write-off (with FIFO)

- [ ] Replace `createWriteOff()` with Supabase transaction + FIFO logic

```typescript
async createWriteOff(
  writeOffData: CreateWriteOffData
): Promise<ServiceResponse<StorageOperation>> {
  try {
    const documentNumber = this.generateDocumentNumber('WRITEOFF')
    const operationDate = new Date().toISOString()

    // 1. Allocate quantities from batches using FIFO
    const allocations = await this.allocateFIFO(
      writeOffData.itemId,
      writeOffData.warehouseId,
      writeOffData.quantity
    )

    if (!allocations.success || !allocations.data) {
      throw new Error(allocations.error || 'FIFO allocation failed')
    }

    // 2. Update batch quantities
    const updatePromises = allocations.data.map(allocation => {
      const newQuantity = allocation.remainingQuantity
      const newStatus = newQuantity === 0 ? 'consumed' : 'active'
      const newTotalValue = newQuantity * allocation.costPerUnit

      return supabase
        .from('storage_batches')
        .update({
          current_quantity: newQuantity,
          total_value: newTotalValue,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', allocation.batchId)
    })

    await Promise.all(updatePromises)

    // 3. Create operation record
    const operation: Partial<StorageOperation> = {
      id: generateId(),
      operationType: 'write_off',
      documentNumber,
      operationDate,
      warehouseId: writeOffData.warehouseId,
      department: writeOffData.department,
      responsiblePerson: writeOffData.responsiblePerson,
      items: [{
        itemId: writeOffData.itemId,
        itemName: writeOffData.itemName,
        quantity: writeOffData.quantity,
        unit: writeOffData.unit,
        totalCost: allocations.data.reduce((sum, a) => sum + (a.allocatedQuantity * a.costPerUnit), 0),
        batchAllocations: allocations.data.map(a => ({
          batchId: a.batchId,
          batchNumber: a.batchNumber,
          quantity: a.allocatedQuantity,
          costPerUnit: a.costPerUnit,
          batchDate: a.batchDate
        }))
      }],
      totalValue: allocations.data.reduce((sum, a) => sum + (a.allocatedQuantity * a.costPerUnit), 0),
      writeOffDetails: {
        reason: writeOffData.reason,
        category: writeOffData.category,
        notes: writeOffData.notes
      },
      notes: writeOffData.notes
    }

    const { data: opData, error: opError } = await supabase
      .from('storage_operations')
      .insert([this.mapOperationToDB(operation)])
      .select()
      .single()

    if (opError) throw opError

    DebugUtils.info(MODULE_NAME, '✅ Write-off created', {
      documentNumber,
      quantity: writeOffData.quantity,
      batchesUsed: allocations.data.length
    })

    return {
      success: true,
      data: this.mapOperationFromDB(opData)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to create write-off', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

##### FIFO Allocation Helper

- [ ] Create FIFO allocation helper method

```typescript
private async allocateFIFO(
  itemId: string,
  warehouseId: string,
  neededQuantity: number
): Promise<ServiceResponse<BatchAllocation[]>> {
  try {
    // 1. Fetch batches in FIFO order
    const { data: batches, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .order('receipt_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!batches || batches.length === 0) {
      throw new Error('No active batches available for this item')
    }

    // 2. Allocate quantities
    let remaining = neededQuantity
    const allocations: BatchAllocation[] = []

    for (const batch of batches) {
      if (remaining <= 0) break

      const allocatedQty = Math.min(remaining, batch.current_quantity)

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        allocatedQuantity: allocatedQty,
        remainingQuantity: batch.current_quantity - allocatedQty,
        costPerUnit: batch.cost_per_unit,
        batchDate: batch.receipt_date
      })

      remaining -= allocatedQty
    }

    // 3. Check if we have enough quantity
    if (remaining > 0) {
      throw new Error(`Insufficient quantity. Need ${neededQuantity}, available ${neededQuantity - remaining}`)
    }

    DebugUtils.info(MODULE_NAME, 'FIFO allocation complete', {
      needed: neededQuantity,
      batchesUsed: allocations.length
    })

    return {
      success: true,
      data: allocations
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

##### Create Correction

- [ ] Replace `createCorrection()` with Supabase transaction

```typescript
async createCorrection(
  correctionData: CreateCorrectionData
): Promise<ServiceResponse<StorageOperation>> {
  try {
    const documentNumber = this.generateDocumentNumber('CORRECTION')
    const operationDate = new Date().toISOString()

    // 1. Get the batch to correct
    const { data: batch, error: batchError } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('id', correctionData.batchId)
      .single()

    if (batchError) throw batchError

    // 2. Calculate new quantities
    const newQuantity = batch.current_quantity + correctionData.quantityChange
    if (newQuantity < 0) {
      throw new Error('Correction would result in negative quantity')
    }

    const newTotalValue = newQuantity * batch.cost_per_unit
    const newStatus = newQuantity === 0 ? 'consumed' : 'active'

    // 3. Update batch
    const { error: updateError } = await supabase
      .from('storage_batches')
      .update({
        current_quantity: newQuantity,
        total_value: newTotalValue,
        status: newStatus,
        updated_at: operationDate
      })
      .eq('id', correctionData.batchId)

    if (updateError) throw updateError

    // 4. Create operation record
    const operation: Partial<StorageOperation> = {
      id: generateId(),
      operationType: 'correction',
      documentNumber,
      operationDate,
      warehouseId: correctionData.warehouseId,
      department: correctionData.department,
      responsiblePerson: correctionData.responsiblePerson,
      items: [{
        itemId: batch.item_id,
        itemName: correctionData.itemName,
        quantity: Math.abs(correctionData.quantityChange),
        unit: batch.unit,
        totalCost: Math.abs(correctionData.quantityChange) * batch.cost_per_unit
      }],
      totalValue: Math.abs(correctionData.quantityChange) * batch.cost_per_unit,
      correctionDetails: {
        type: correctionData.quantityChange > 0 ? 'increase' : 'decrease',
        reason: correctionData.reason,
        oldQuantity: batch.current_quantity,
        newQuantity,
        quantityChange: correctionData.quantityChange
      },
      notes: correctionData.notes
    }

    const { data: opData, error: opError } = await supabase
      .from('storage_operations')
      .insert([this.mapOperationToDB(operation)])
      .select()
      .single()

    if (opError) throw opError

    DebugUtils.info(MODULE_NAME, '✅ Correction created', {
      documentNumber,
      change: correctionData.quantityChange,
      newQuantity
    })

    return {
      success: true,
      data: this.mapOperationFromDB(opData)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to create correction', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 2.5 Create Database Mappers

- [ ] Create mapper methods for DB ↔ App conversion

```typescript
// Database → App
private mapBatchFromDB(dbBatch: any): StorageBatch {
  return {
    id: dbBatch.id,
    batchNumber: dbBatch.batch_number,
    itemId: dbBatch.item_id,
    warehouseId: dbBatch.warehouse_id,
    initialQuantity: parseFloat(dbBatch.initial_quantity),
    currentQuantity: parseFloat(dbBatch.current_quantity),
    unit: dbBatch.unit,
    costPerUnit: parseFloat(dbBatch.cost_per_unit),
    totalValue: parseFloat(dbBatch.total_value),
    receiptDate: dbBatch.receipt_date,
    expiryDate: dbBatch.expiry_date,
    supplierId: dbBatch.supplier_id,
    purchaseOrderId: dbBatch.purchase_order_id,
    status: dbBatch.status,
    isActive: dbBatch.is_active,
    createdAt: dbBatch.created_at,
    updatedAt: dbBatch.updated_at
  }
}

// App → Database
private mapBatchToDB(batch: Partial<StorageBatch>): any {
  return {
    id: batch.id,
    batch_number: batch.batchNumber,
    item_id: batch.itemId,
    warehouse_id: batch.warehouseId,
    initial_quantity: batch.initialQuantity,
    current_quantity: batch.currentQuantity,
    unit: batch.unit,
    cost_per_unit: batch.costPerUnit,
    total_value: batch.totalValue,
    receipt_date: batch.receiptDate,
    expiry_date: batch.expiryDate,
    supplier_id: batch.supplierId,
    purchase_order_id: batch.purchaseOrderId,
    status: batch.status,
    is_active: batch.isActive,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt
  }
}

// Similar mappers for StorageOperation
private mapOperationFromDB(dbOp: any): StorageOperation {
  return {
    id: dbOp.id,
    operationType: dbOp.operation_type,
    documentNumber: dbOp.document_number,
    operationDate: dbOp.operation_date,
    warehouseId: dbOp.warehouse_id,
    department: dbOp.department,
    responsiblePerson: dbOp.responsible_person,
    items: dbOp.items,
    totalValue: parseFloat(dbOp.total_value || 0),
    notes: dbOp.notes,
    correctionDetails: dbOp.correction_details,
    writeOffDetails: dbOp.write_off_details,
    createdAt: dbOp.created_at,
    updatedAt: dbOp.updated_at
  }
}

private mapOperationToDB(op: Partial<StorageOperation>): any {
  return {
    id: op.id,
    operation_type: op.operationType,
    document_number: op.documentNumber,
    operation_date: op.operationDate,
    warehouse_id: op.warehouseId,
    department: op.department,
    responsible_person: op.responsiblePerson,
    items: op.items,
    total_value: op.totalValue,
    notes: op.notes,
    correction_details: op.correctionDetails,
    write_off_details: op.writeOffDetails,
    created_at: op.createdAt,
    updated_at: op.updatedAt
  }
}
```

---

### Phase 3: Transit Batch Persistence (~45 min)

**File:** `src/stores/storage/transitBatchService.ts` (482 lines)

#### 3.1 Update Transit Batch Creation

- [ ] Modify `createTransitBatches()` to persist to database with `status='in_transit'`

```typescript
async createTransitBatches(
  purchaseOrderId: string,
  items: PurchaseOrderItem[]
): Promise<ServiceResponse<StorageBatch[]>> {
  try {
    const transitBatches: Partial<StorageBatch>[] = items.map(item => ({
      id: generateId(),
      batchNumber: `TB-${item.productName}-${generateShortId()}`,
      itemId: item.productId,
      warehouseId: 'warehouse-winter',
      initialQuantity: item.quantity,
      currentQuantity: item.quantity,
      unit: item.unit,
      costPerUnit: item.price,
      totalValue: item.quantity * item.price,
      receiptDate: new Date().toISOString(), // Expected delivery date
      supplierId: item.supplierId,
      purchaseOrderId,
      status: 'in_transit', // ← KEY: Mark as in-transit
      isActive: true
    }))

    // Insert into database
    const { data, error } = await supabase
      .from('storage_batches')
      .insert(transitBatches.map(this.mapBatchToDB))
      .select()

    if (error) throw error

    DebugUtils.info(MODULE_NAME, '✅ Transit batches created', {
      count: data.length,
      purchaseOrderId
    })

    return {
      success: true,
      data: data.map(this.mapBatchFromDB)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 3.2 Update Convert to Active

- [ ] Modify `convertTransitBatchesToActive()` to update database status

```typescript
async convertTransitBatchesToActive(
  purchaseOrderId: string
): Promise<ServiceResponse<StorageBatch[]>> {
  try {
    // Update all transit batches for this PO to 'active'
    const { data, error } = await supabase
      .from('storage_batches')
      .update({
        status: 'active',
        receipt_date: new Date().toISOString(), // Actual receipt date
        updated_at: new Date().toISOString()
      })
      .eq('purchase_order_id', purchaseOrderId)
      .eq('status', 'in_transit')
      .select()

    if (error) throw error

    DebugUtils.info(MODULE_NAME, '✅ Transit batches converted to active', {
      count: data.length,
      purchaseOrderId
    })

    return {
      success: true,
      data: data.map(this.mapBatchFromDB)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 3.3 Update Remove Transit Batches

- [ ] Modify `removeTransitBatchesOnOrderCancel()` to delete from database

```typescript
async removeTransitBatchesOnOrderCancel(
  purchaseOrderId: string
): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('storage_batches')
      .delete()
      .eq('purchase_order_id', purchaseOrderId)
      .eq('status', 'in_transit')

    if (error) throw error

    DebugUtils.info(MODULE_NAME, '✅ Transit batches removed', {
      purchaseOrderId
    })

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 3.4 Update Get Transit Batches

- [ ] Modify `getTransitBatches()` to query from database

```typescript
async getTransitBatches(
  purchaseOrderId?: string
): Promise<ServiceResponse<StorageBatch[]>> {
  try {
    let query = supabase
      .from('storage_batches')
      .select('*')
      .eq('status', 'in_transit')
      .order('created_at', { ascending: false })

    if (purchaseOrderId) {
      query = query.eq('purchase_order_id', purchaseOrderId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data.map(this.mapBatchFromDB)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

---

### Phase 4: Store Layer Updates (~30 min)

**File:** `src/stores/storage/storageStore.ts` (887 lines)

#### 4.1 Add Loading & Error States

- [ ] Add state properties

```typescript
state: () => ({
  // Existing state...
  balances: [] as StorageBalance[],
  operations: [] as StorageOperation[],

  // NEW: Loading & error states
  loading: false,
  initializing: false,
  error: null as string | null,

  // NEW: Operation-specific loading states
  loadingBalances: false,
  loadingOperations: false,
  creatingOperation: false
})
```

#### 4.2 Update Initialize Method

- [ ] Wrap initialization with loading states

```typescript
async initialize() {
  if (this.initialized) {
    return
  }

  this.initializing = true
  this.error = null

  try {
    DebugUtils.info(MODULE_NAME, 'Initializing storage store...')

    // Initialize service (no more mock data)
    await storageService.initialize()

    // Load initial data
    await Promise.all([
      this.loadBalances(),
      this.loadRecentOperations()
    ])

    this.initialized = true
    DebugUtils.info(MODULE_NAME, '✅ Storage store initialized', {
      balancesCount: this.balances.length,
      operationsCount: this.operations.length
    })
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Initialization failed'
    DebugUtils.error(MODULE_NAME, '❌ Storage store initialization failed', { error })
  } finally {
    this.initializing = false
  }
}
```

#### 4.3 Update Load Methods

- [ ] Add error handling to load methods

```typescript
async loadBalances() {
  this.loadingBalances = true
  this.error = null

  try {
    const response = await storageService.calculateBalances()

    if (!response.success) {
      throw new Error(response.error || 'Failed to load balances')
    }

    this.balances = response.data || []

    DebugUtils.store(MODULE_NAME, 'Balances loaded', {
      count: this.balances.length
    })
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Failed to load balances'
    DebugUtils.error(MODULE_NAME, 'Failed to load balances', { error })
  } finally {
    this.loadingBalances = false
  }
}

async loadRecentOperations() {
  this.loadingOperations = true
  this.error = null

  try {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 30) // Last 30 days

    const response = await storageService.getOperations(
      'warehouse-winter',
      dateFrom.toISOString()
    )

    if (!response.success) {
      throw new Error(response.error || 'Failed to load operations')
    }

    this.operations = response.data || []
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Failed to load operations'
    DebugUtils.error(MODULE_NAME, 'Failed to load operations', { error })
  } finally {
    this.loadingOperations = false
  }
}
```

#### 4.4 Update Create Operation Methods

- [ ] Wrap create methods with loading states

```typescript
async createReceipt(receiptData: CreateReceiptData) {
  this.creatingOperation = true
  this.error = null

  try {
    const response = await storageService.createReceipt(receiptData)

    if (!response.success) {
      throw new Error(response.error || 'Failed to create receipt')
    }

    // Reload data
    await Promise.all([
      this.loadBalances(),
      this.loadRecentOperations()
    ])

    DebugUtils.info(MODULE_NAME, '✅ Receipt created successfully')
    return response
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Failed to create receipt'
    DebugUtils.error(MODULE_NAME, '❌ Failed to create receipt', { error })
    return {
      success: false,
      error: this.error
    }
  } finally {
    this.creatingOperation = false
  }
}

// Similar for createWriteOff, createCorrection, etc.
```

---

### Phase 5: Composables Updates (~20 min)

#### 5.1 Update useInventory.ts

- [ ] Handle async operations properly

```typescript
// src/stores/storage/composables/useInventory.ts

export function useInventory() {
  const storageStore = useStorageStore()

  const finalizing = ref(false)
  const error = ref<string | null>(null)

  const finalizeInventory = async (inventoryId: string) => {
    finalizing.value = true
    error.value = null

    try {
      const response = await storageService.finalizeInventory(inventoryId)

      if (!response.success) {
        throw new Error(response.error || 'Failed to finalize inventory')
      }

      // Reload balances after inventory
      await storageStore.loadBalances()

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      finalizing.value = false
    }
  }

  return {
    finalizing,
    error,
    finalizeInventory
    // ... other methods
  }
}
```

#### 5.2 Update useWriteOff.ts

- [ ] Handle async write-off operations

```typescript
// src/stores/storage/composables/useWriteOff.ts

export function useWriteOff() {
  const storageStore = useStorageStore()

  const creating = ref(false)
  const error = ref<string | null>(null)

  const createWriteOff = async (writeOffData: CreateWriteOffData) => {
    creating.value = true
    error.value = null

    try {
      const response = await storageStore.createWriteOff(writeOffData)

      if (!response.success) {
        throw new Error(response.error || 'Failed to create write-off')
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      creating.value = false
    }
  }

  return {
    creating,
    error,
    createWriteOff
    // ... other methods
  }
}
```

---

### Phase 6: UI Component Updates (~60 min)

#### 6.1 Update Main View (StorageView.vue)

- [ ] Add loading skeleton during initialization

```vue
<template>
  <div class="storage-view">
    <!-- Loading state -->
    <div v-if="storageStore.initializing" class="loading-container">
      <v-skeleton-loader type="table" />
      <v-skeleton-loader type="table" class="mt-4" />
    </div>

    <!-- Error state -->
    <v-alert v-else-if="storageStore.error" type="error" class="mb-4">
      {{ storageStore.error }}
      <v-btn @click="retry" variant="text" size="small">Retry</v-btn>
    </v-alert>

    <!-- Content -->
    <div v-else>
      <!-- Your existing content -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useStorageStore } from '@/stores/storage'

const storageStore = useStorageStore()

onMounted(async () => {
  if (!storageStore.initialized) {
    await storageStore.initialize()
  }
})

const retry = async () => {
  storageStore.error = null
  await storageStore.initialize()
}
</script>
```

#### 6.2 Update Dialogs with Loading States

##### ReceiptDialog.vue

- [ ] Disable save button during creation

```vue
<template>
  <v-dialog v-model="dialog" max-width="800px">
    <v-card>
      <v-card-title>Create Receipt</v-card-title>

      <v-card-text>
        <!-- Form fields -->
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close" :disabled="storageStore.creatingOperation">Cancel</v-btn>
        <v-btn
          @click="save"
          color="primary"
          :loading="storageStore.creatingOperation"
          :disabled="!isValid"
        >
          Save Receipt
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useStorageStore } from '@/stores/storage'

const storageStore = useStorageStore()

const save = async () => {
  try {
    const response = await storageStore.createReceipt(receiptData)

    if (response.success) {
      // Show success notification
      close()
    }
  } catch (error) {
    // Error already set in store
  }
}
</script>
```

##### WriteOffDialog.vue

- [ ] Add loading state during write-off creation

```vue
<v-btn
  @click="saveWriteOff"
  color="error"
  :loading="useWriteOff().creating.value"
  :disabled="!canSave"
>
  Confirm Write-off
</v-btn>
```

##### InventoryDialog.vue

- [ ] Add loading state during finalization

```vue
<v-btn @click="finalizeInventory" color="primary" :loading="useInventory().finalizing.value">
  Finalize Inventory
</v-btn>
```

#### 6.3 Update Tables with Loading Spinners

##### StorageStockTable.vue

- [ ] Show loading overlay while fetching balances

```vue
<v-data-table
  :items="storageStore.balances"
  :loading="storageStore.loadingBalances"
  loading-text="Loading stock..."
>
  <!-- Table content -->
</v-data-table>
```

##### StorageOperationsTable.vue

- [ ] Show loading overlay while fetching operations

```vue
<v-data-table
  :items="storageStore.operations"
  :loading="storageStore.loadingOperations"
  loading-text="Loading operations..."
>
  <!-- Table content -->
</v-data-table>
```

---

### Phase 7: Remove Mock Data (~15 min)

#### 7.1 Clean Up Mock Dependencies

- [ ] Remove mock import from `storageService.ts`

```typescript
// REMOVE THIS:
// import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
```

- [ ] Remove `loadMockData()` method from service
- [ ] Remove in-memory data arrays (batches, operations)

#### 7.2 Keep Mock Definitions for Seeding

- [ ] Keep `src/stores/shared/storageDefinitions.ts` for testing
- [ ] Add comment: "Used for database seeding and testing only"

#### 7.3 Update Environment Configuration

- [ ] Add feature flag (optional)

```typescript
// src/config/environment.ts

export const ENV = {
  // ... other config
  storage: {
    useMockData: false // Always use Supabase now
  }
}
```

---

### Phase 8: Testing & Validation (~45 min)

#### 8.1 Database Testing

**Test Data Fetching:**

- [ ] Query batches: `mcp__supabase__execute_sql({ query: 'SELECT * FROM storage_batches LIMIT 10' })`
- [ ] Query operations: `mcp__supabase__execute_sql({ query: 'SELECT * FROM storage_operations LIMIT 10' })`
- [ ] Verify FIFO query works: Check batches ordered by receipt_date

**Test Create Receipt:**

- [ ] Create test receipt via UI
- [ ] Verify operation inserted: `SELECT * FROM storage_operations WHERE operation_type = 'receipt' ORDER BY created_at DESC LIMIT 1`
- [ ] Verify batch created: `SELECT * FROM storage_batches WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`
- [ ] Check balance updated correctly

**Test Create Write-off:**

- [ ] Create test write-off via UI
- [ ] Verify FIFO allocation worked (oldest batch quantity decreased)
- [ ] Verify operation saved with batch allocations
- [ ] Check batch status changed to 'consumed' if quantity = 0

**Test Transit Batches:**

- [ ] Create purchase order (triggers transit batch creation)
- [ ] Verify transit batches in database: `SELECT * FROM storage_batches WHERE status = 'in_transit'`
- [ ] Receive purchase order (convert to active)
- [ ] Verify status changed to 'active'
- [ ] Cancel purchase order
- [ ] Verify transit batches deleted

**Test Correction:**

- [ ] Create positive correction
- [ ] Verify batch quantity increased
- [ ] Create negative correction
- [ ] Verify batch quantity decreased

**Test Inventory:**

- [ ] Start inventory session
- [ ] Count items
- [ ] Finalize inventory
- [ ] Verify corrections created for discrepancies
- [ ] Check balances updated

#### 8.2 TypeScript Compilation

- [ ] Run `pnpm build` - verify no errors
- [ ] Check no implicit any errors
- [ ] Check no type mismatch errors
- [ ] Verify all imports resolve correctly

#### 8.3 UI Testing

**Test Loading States:**

- [ ] Open `/storage` view
- [ ] Verify skeleton loader shows during initialization
- [ ] Verify tables show loading spinners
- [ ] Verify dialog buttons show loading state

**Test Error Handling:**

- [ ] Simulate network error (disconnect internet)
- [ ] Verify error alert shows
- [ ] Verify retry button works
- [ ] Reconnect and verify data loads

**Test Operations:**

- [ ] Test all CRUD operations end-to-end
- [ ] Verify success notifications
- [ ] Verify error notifications
- [ ] Check console for errors

#### 8.4 Console Verification

- [ ] No TypeScript errors in browser console
- [ ] No network errors (failed Supabase queries)
- [ ] No data loading errors
- [ ] Verify debug logs show Supabase operations
- [ ] Check DebugUtils logs for operation tracking

#### 8.5 Performance Check

- [ ] Monitor Supabase query performance
- [ ] Check if indexes are being used (EXPLAIN ANALYZE)
- [ ] Verify balance calculation time is acceptable
- [ ] Check FIFO allocation performance with multiple batches

---

## ✅ Success Criteria

### Phase 1 Complete:

- ✅ Database schema verified and matches TypeScript types
- ✅ Indexes created for FIFO and transit batch queries
- ✅ TypeScript types generated from Supabase

### Phase 2 Complete:

- ✅ `storageService.ts` uses Supabase for all operations
- ✅ Mock data dependencies removed
- ✅ FIFO allocation implemented with Supabase queries
- ✅ All CRUD operations work (receipts, write-offs, corrections, inventory)
- ✅ Database mappers created and working

### Phase 3 Complete:

- ✅ Transit batches persist to database with `status='in_transit'`
- ✅ Convert to active updates database status
- ✅ Remove transit batches deletes from database
- ✅ Transit batches survive page refresh

### Phase 4 Complete:

- ✅ Store has loading and error states
- ✅ Initialize method handles errors gracefully
- ✅ All store methods have error handling
- ✅ Loading states update correctly

### Phase 5 Complete:

- ✅ Composables handle async operations
- ✅ Composables have loading and error states
- ✅ Composables integrate with store

### Phase 6 Complete:

- ✅ Main view shows loading skeleton
- ✅ All dialogs have loading states
- ✅ All tables have loading spinners
- ✅ Error alerts show with retry button

### Phase 7 Complete:

- ✅ All mock data imports removed
- ✅ In-memory arrays removed from service
- ✅ Mock definitions kept for seeding only

### Phase 8 Complete:

- ✅ All functional tests pass
- ✅ TypeScript compiles without errors
- ✅ No console errors
- ✅ App runs successfully at http://localhost:5174/
- ✅ Storage view works end-to-end
- ✅ All operations create correct database records
- ✅ FIFO logic works correctly
- ✅ Transit batches workflow complete

---

## 📝 Implementation Notes

### Field Naming Convention:

- Database: `snake_case` (item_id, cost_per_unit, receipt_date)
- TypeScript: `camelCase` (itemId, costPerUnit, receiptDate)

### FIFO Logic:

- Always order by `receipt_date ASC, created_at ASC`
- Allocate from oldest batches first
- Update batch status to 'consumed' when quantity reaches 0
- Keep allocation logic in TypeScript service layer (not database)

### Cost Calculation:

- Batch total_value = current_quantity \* cost_per_unit
- Balance average_cost = SUM(total_value) / SUM(quantity)
- Update total_value when quantity changes

### Balance Calculation Strategy:

- Fetch all active batches from Supabase
- Calculate balances in-memory (existing logic)
- Cache in store state
- Recalculate after each operation

### Transit Batch Workflow:

1. **Create PO** → Transit batches created with `status='in_transit'`
2. **Receive PO** → Transit batches updated to `status='active'`, receipt_date updated
3. **Cancel PO** → Transit batches deleted from database

### Error Handling Pattern:

```typescript
try {
  const response = await supabaseOperation()
  if (!response.success) throw new Error(response.error)
  // Success logic
} catch (error) {
  this.error = error.message
  DebugUtils.error(MODULE_NAME, 'Operation failed', { error })
  return { success: false, error: this.error }
} finally {
  this.loading = false
}
```

### ServiceResponse Pattern:

All service methods return:

```typescript
interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    source: 'api' | 'cache'
  }
}
```

---

## 🔗 Related Files

**Service Layer:**

- `src/stores/storage/storageService.ts` - Main service (1254 lines)
- `src/stores/storage/transitBatchService.ts` - Transit batches (482 lines)

**Store Layer:**

- `src/stores/storage/storageStore.ts` - Pinia store (887 lines)
- `src/stores/storage/types.ts` - Type definitions (384 lines)

**Composables:**

- `src/stores/storage/composables/useInventory.ts`
- `src/stores/storage/composables/useWriteOff.ts`

**UI Components:**

- `src/views/storage/StorageView.vue` - Main view
- `src/views/storage/components/ReceiptDialog.vue`
- `src/views/storage/components/WriteOffDialog.vue`
- `src/views/storage/components/InventoryDialog.vue`
- `src/views/storage/components/StorageStockTable.vue`
- `src/views/storage/components/StorageOperationsTable.vue`

**Mock Data (to keep for seeding):**

- `src/stores/shared/storageDefinitions.ts` - Mock data generator (840 lines)

**Database:**

- Tables: `warehouses`, `storage_batches`, `storage_operations`, `inventory_documents`
- Migrations: Create indexes for FIFO and transit queries

---

**Last Updated:** 2025-11-21
**Estimated Total Time:** ~5 hours
**Status:** Ready to start - Phase 1

---

## 🚀 Next Steps

1. Verify database schema and create indexes (Phase 1)
2. Update `storageService.ts` to use Supabase (Phase 2)
3. Update `transitBatchService.ts` to persist batches (Phase 3)
4. Add loading/error states to `storageStore.ts` (Phase 4)
5. Update composables for async operations (Phase 5)
6. Add loading states to UI components (Phase 6)
7. Remove mock data dependencies (Phase 7)
8. Test thoroughly (Phase 8)
