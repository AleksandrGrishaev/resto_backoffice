# 📋 SPRINT 1: Preparation Production with Auto Write-off

**Sprint Goal:** Implement automatic raw product write-off when producing preparations + UI for batch creation.

**Status:** 🎯 FINAL SPECIFICATION | Ready for Implementation

**Scope:** Production flow only (Products → Preparations). Sales consumption in Sprint 2.

---

## 🔍 EXECUTIVE SUMMARY

### Critical Findings from Deep Analysis

✅ **Database Infrastructure:** Fully ready

- `preparation_ingredients` table EXISTS with recipe data
- `preparation_batches` with FIFO tracking EXISTS
- `preparation_operations` with write-off support EXISTS
- FIFO allocation logic IMPLEMENTED in `preparationService.ts`

❌ **Missing Auto Write-off on Production**

- Raw products NOT automatically written off when producing preparations
- Manual process creates data inconsistency
- **This is THE priority fix**

❌ **No Preparation Consumption in POS**

- Orders decompose preparations → raw products (again)
- Would cause double write-off if production auto-write-off enabled
- Need hybrid approach: consume prep stock OR fallback to raw products

✅ **WriteOffHistoryView Integration Point**

- Existing view at `/inventory/write-offs` shows sales decomposition
- Can integrate preparation consumption records
- Detail dialog shows decomposition items

---

## 📊 CURRENT SYSTEM ARCHITECTURE

### Three-Tier Inventory System

```
┌──────────────────────────────────────────────────────────┐
│ TIER 1: RAW PRODUCTS (storage_operations)               │
│ ✅ Incoming receipts from suppliers                      │
│ ✅ Manual write-offs (expired, damaged)                  │
│ ❌ Auto write-offs for prep production (MISSING!)        │
│ ✅ FIFO batch tracking (storage_batches)                 │
└──────────────────────────────────────────────────────────┘
                     ↓ Consumed by production
┌──────────────────────────────────────────────────────────┐
│ TIER 2: PREPARATIONS (preparation_operations)           │
│ ✅ Production receipts (batch creation)                  │
│ ✅ Manual write-offs (expired, spoiled)                  │
│ ❌ Consumption from orders (MISSING!)                    │
│ ✅ FIFO batch tracking (preparation_batches)             │
└──────────────────────────────────────────────────────────┘
                     ↓ Consumed by orders (future)
┌──────────────────────────────────────────────────────────┐
│ TIER 3: SALES (recipe_writeoffs)                        │
│ ✅ Auto write-offs on order fulfillment                  │
│ ✅ Decomposition from menu → preparations/products       │
│ ✅ Tracked in WriteOffHistoryView                        │
└──────────────────────────────────────────────────────────┘
```

### Database Schema (Verified via MCP)

**preparation_ingredients** (recipe storage):

```sql
✅ id: text (PK)
✅ preparation_id: uuid → FK to preparations
✅ type: text (always 'product')
✅ product_id: uuid → FK to products
✅ quantity: numeric
✅ unit: text
✅ sort_order: integer
```

**preparations** table:

```sql
✅ id, name, code, description
✅ output_quantity, output_unit
✅ cost_per_portion (calculated from recipe)
✅ department (kitchen/bar)
❌ shelf_life (MISSING - only in TypeScript)
```

**preparation_batches** table:

```sql
✅ production_date, expiry_date
✅ initial_quantity, current_quantity
✅ cost_per_unit
✅ status (active, expired, depleted, written_off)
✅ department (kitchen/bar)
```

**preparation_operations** table:

```sql
✅ operation_type (receipt, correction, inventory, write_off)
✅ items: jsonb (FIFO allocations)
✅ write_off_details: jsonb
✅ total_value, document_number
```

---

## 🏗️ SYSTEM CONTEXT

See `todo.md` for complete system architecture (4 levels: Products → Preparations → Dishes → Menu Items).

**This Sprint:** Focus on Level 1 → Level 2 (Products → Preparations)

**Production Flow:**

```
Raw Products (storage) → Make Preparation → Preparation Batch (FIFO)
                ↓
        Auto write-off products (FIFO)
```

**Next Sprint:** Level 4 → Level 1/2 (Menu Items → Products/Preparations via reverse decomposition)

---

## 🎯 SPRINT 1 SCOPE

### User Requirements (From Discussion)

1. ✅ **Dynamic expiry calculation:** `production_date + base_shelf_life` (not stored separately)
2. ✅ **Auto write-off raw products:** When producing preparation
3. ✅ **UI for batch creation:** Button to add new preparation batch with preview
4. ✅ **Keep logic under the hood:** Centralize in services/composables

### Out of Scope (Sprint 2)

- ❌ Menu Item decomposition
- ❌ Sales consumption tracking
- ❌ WriteOffHistoryView integration (will add in Sprint 2)
- ❌ POS integration

---

## Phase 0: Database Schema Updates ⏳

**Goal:** Add `shelf_life` column, prepare for auto write-off integration

### Migration: `012_add_preparation_shelf_life.sql`

```sql
-- Migration: 012_add_preparation_shelf_life
-- Description: Add shelf_life column and prepare for auto write-off integration
-- Date: 2025-01-25
-- Author: Kitchen App Team

-- 1. Add shelf_life column to preparations
ALTER TABLE preparations
ADD COLUMN shelf_life INTEGER NOT NULL DEFAULT 2;

COMMENT ON COLUMN preparations.shelf_life IS
'Base shelf life in days after production. Used to calculate expiry_date dynamically: production_date + shelf_life days.';

-- 2. Backfill with sensible defaults
UPDATE preparations SET shelf_life = 2 WHERE department = 'kitchen';
UPDATE preparations SET shelf_life = 7 WHERE department = 'bar';

-- 3. Add related_operation_id to storage_operations (link prep production to raw product write-off)
ALTER TABLE storage_operations
ADD COLUMN related_preparation_operation_id uuid REFERENCES preparation_operations(id);

COMMENT ON COLUMN storage_operations.related_preparation_operation_id IS
'Link to preparation_operations when storage write-off is triggered by preparation production.';

-- 4. Add index for performance
CREATE INDEX idx_storage_operations_related_prep
ON storage_operations(related_preparation_operation_id)
WHERE related_preparation_operation_id IS NOT NULL;

-- 5. Update write_off_details to support new reasons (application logic only, no schema change)
-- New reasons: 'production_consumption', 'sales_consumption'
```

### TypeScript Type Updates

**File:** `src/stores/storage/types.ts`

```typescript
export type WriteOffReason =
  | 'expired'
  | 'spoiled'
  | 'damaged'
  | 'theft'
  | 'production_consumption' // ✨ NEW - raw products consumed for prep production
  | 'sales_consumption' // ✨ NEW - preparations/products consumed for sales
  | 'other'
  | 'education'
  | 'test'

export const WRITE_OFF_CLASSIFICATION = {
  KPI_AFFECTING: ['expired', 'spoiled', 'damaged', 'theft', 'other'],
  NON_KPI_AFFECTING: ['production_consumption', 'sales_consumption', 'education', 'test']
}

export interface StorageOperation {
  // Existing fields...
  related_preparation_operation_id?: string // ✨ NEW - link to prep operation
}
```

**File:** `src/stores/preparation/types.ts`

```typescript
export interface Preparation {
  // Existing fields...
  shelfLife: number // ✨ Now backed by database column
}

export interface PreparationBatch {
  // Existing fields...
  // Note: expiry_date calculated dynamically, not separate field
  expiryDate: string // Computed: production_date + preparation.shelf_life days
}
```

### Tasks:

- [ ] Create migration file
- [ ] Apply to DEV database via MCP `mcp__supabase__apply_migration`
- [ ] Test on production (manual via Supabase SQL Editor)
- [ ] Update TypeScript types
- [ ] Verify existing data integrity

### Deliverables:

- ✅ Migration file created and documented
- ✅ Applied to DEV database
- ✅ Applied to production database
- ✅ TypeScript types synchronized
- ✅ No data corruption

---

## Phase 1: Auto Write-off on Preparation Production 🔥 PRIORITY

**Goal:** When preparation is produced, automatically write off raw products from storage using recipe decomposition.

### 1.1 Update preparationService.ts

**File:** `src/stores/preparation/preparationService.ts`

**Current flow:**

```typescript
createReceipt(data) {
  // 1. Create preparation_batches entries
  // 2. Create preparation_operations (type: receipt)
  // ❌ Does NOT write off raw products
}
```

**New flow:**

```typescript
async function createReceipt(data: CreatePreparationReceiptData) {
  const operations: PreparationOperation[] = []
  const storageWriteOffIds: string[] = []

  for (const item of data.items) {
    // 1. Get preparation with recipe
    const preparation = await recipesStore.getPreparation(item.preparationId)
    if (!preparation || !preparation.recipe || preparation.recipe.length === 0) {
      throw new Error(`No recipe found for preparation ${item.preparationId}`)
    }

    // 2. Calculate raw product quantities needed
    const multiplier = item.quantity / preparation.outputQuantity
    const rawProductItems = preparation.recipe.map(ingredient => ({
      itemId: ingredient.id, // product_id from preparation_ingredients
      itemType: 'product' as const,
      quantity: ingredient.quantity * multiplier,
      unit: ingredient.unit,
      notes: `Production: ${preparation.name} (${item.quantity}${preparation.outputUnit})`
    }))

    // 3. ✨ NEW: Auto write-off raw products from storage
    const storageWriteOff = await storageService.createWriteOff({
      department: data.department,
      responsiblePerson: data.responsiblePerson,
      operationDate: data.operationDate,
      reason: 'production_consumption', // ✨ NEW reason type
      items: rawProductItems,
      notes: `Auto write-off for preparation production: ${preparation.name}`,
      affectsKPI: false // Production consumption is not waste
    })

    storageWriteOffIds.push(storageWriteOff.id)

    // 4. Create preparation batch (existing logic)
    const batch = await createBatch({
      preparationId: item.preparationId,
      quantity: item.quantity,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      productionDate: data.operationDate,
      // ✨ Calculate expiry dynamically (not stored)
      expiryDate: calculateExpiryDate(data.operationDate, preparation.shelfLife),
      department: data.department,
      producedBy: data.responsiblePerson,
      sourceType: 'production'
    })

    // 5. Create preparation operation (existing logic)
    const operation = await createOperation({
      ...item,
      operationType: 'receipt',
      department: data.department,
      relatedStorageOperationId: storageWriteOff.id // ✨ Link to storage write-off
    })

    operations.push(operation)
  }

  DebugUtils.info('preparationService', 'Created receipt with auto write-offs', {
    operations: operations.length,
    storageWriteOffs: storageWriteOffIds.length
  })

  return operations
}

// ✨ NEW: Helper function
function calculateExpiryDate(productionDate: string, shelfLifeDays: number): string {
  const expiry = new Date(productionDate)
  expiry.setDate(expiry.getDate() + shelfLifeDays)
  return expiry.toISOString()
}
```

### 1.2 Update storageService to Support Auto Write-off

**File:** `src/stores/storage/storageService.ts`

Add support for `production_consumption` reason:

```typescript
async function createWriteOff(data: CreateStorageWriteOffData) {
  // Validate new reason types
  const validReasons: WriteOffReason[] = [
    'expired',
    'spoiled',
    'damaged',
    'theft',
    'production_consumption', // ✨ NEW
    'sales_consumption', // ✨ NEW
    'other',
    'education',
    'test'
  ]

  if (!validReasons.includes(data.reason)) {
    throw new Error(`Invalid write-off reason: ${data.reason}`)
  }

  // Existing FIFO allocation logic...
  // Existing batch update logic...

  return operation
}
```

### 1.3 Update AddPreparationProductionItemDialog

**File:** `src/views/Preparation/components/AddPreparationProductionItemDialog.vue`

**Changes:**

1. Auto-calculate expiry based on `preparation.shelfLife`
2. Show warning if preparation has no recipe
3. Preview raw product write-offs before confirmation

```vue
<template>
  <v-dialog v-model="dialog" max-width="600">
    <v-card>
      <v-card-title>Add Preparation Production</v-card-title>

      <v-card-text>
        <!-- Preparation selector -->
        <v-autocomplete
          v-model="selectedPreparationId"
          :items="availablePreparations"
          label="Select Preparation"
          @update:model-value="onPreparationSelected"
        />

        <!-- Quantity input -->
        <v-text-field
          v-model.number="quantity"
          label="Quantity"
          type="number"
          :suffix="selectedPreparation?.outputUnit"
        />

        <!-- ✨ NEW: Expiry date (auto-calculated, editable) -->
        <v-text-field
          v-model="expiryDate"
          label="Expiry Date"
          type="datetime-local"
          :hint="expiryHint"
          persistent-hint
        />

        <!-- ✨ NEW: Raw products preview -->
        <v-expansion-panels v-if="rawProductsPreview.length > 0" class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              Raw Products to Write Off ({{ rawProductsPreview.length }} items)
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact">
                <v-list-item v-for="item in rawProductsPreview" :key="item.productId">
                  <v-list-item-title>{{ item.productName }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.quantity }} {{ item.unit }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- ✨ NEW: Warning if no recipe -->
        <v-alert
          v-if="selectedPreparation && !selectedPreparation.recipe?.length"
          type="warning"
          class="mt-4"
        >
          This preparation has no recipe defined. Raw products will NOT be written off
          automatically.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="addProduction" :disabled="!isValid">Add Production</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useProductsStore } from '@/stores/productsStore'

const preparationStore = usePreparationStore()
const productsStore = useProductsStore()

const selectedPreparationId = ref<string>('')
const quantity = ref<number>(500)
const expiryDate = ref<string>('')

const selectedPreparation = computed(() => preparationStore.getById(selectedPreparationId.value))

// ✨ Auto-calculate expiry when preparation selected
function onPreparationSelected(prepId: string) {
  const prep = preparationStore.getById(prepId)
  if (prep?.shelfLife) {
    const now = new Date()
    now.setDate(now.getDate() + prep.shelfLife)
    expiryDate.value = now.toISOString().slice(0, 16) // Format for datetime-local
  }
}

// ✨ Expiry hint
const expiryHint = computed(() => {
  if (!selectedPreparation.value) return ''
  return `Auto-calculated: ${selectedPreparation.value.shelfLife} days shelf life`
})

// ✨ Preview raw products that will be written off
const rawProductsPreview = computed(() => {
  if (!selectedPreparation.value?.recipe || !quantity.value) return []

  const multiplier = quantity.value / selectedPreparation.value.outputQuantity

  return selectedPreparation.value.recipe.map(ingredient => {
    const product = productsStore.getById(ingredient.id)
    return {
      productId: ingredient.id,
      productName: product?.name || 'Unknown',
      quantity: (ingredient.quantity * multiplier).toFixed(2),
      unit: ingredient.unit
    }
  })
})

const isValid = computed(() => {
  return selectedPreparationId.value && quantity.value > 0 && expiryDate.value
})

function addProduction() {
  emit('add-item', {
    preparationId: selectedPreparationId.value,
    quantity: quantity.value,
    expiryDate: expiryDate.value,
    costPerUnit:
      selectedPreparation.value?.costPerPortion / selectedPreparation.value?.outputQuantity
  })
  dialog.value = false
}
</script>
```

### Tasks:

- [ ] Update `preparationService.createReceipt()` with auto write-off logic
- [ ] Add `calculateExpiryDate()` helper function
- [ ] Update `storageService.createWriteOff()` to support new reasons
- [ ] Update `AddPreparationProductionItemDialog.vue` with preview
- [ ] Add error handling for missing recipes
- [ ] Add transaction rollback if write-off fails
- [ ] Update TypeScript types

### Deliverables:

- ✅ Auto write-off functional
- ✅ Raw products deducted from storage on production
- ✅ Preparation batches created correctly
- ✅ Operations linked via `related_preparation_operation_id`
- ✅ Error handling for edge cases

---

## Phase 2: Dynamic Expiry Calculation ⏳

**Goal:** Calculate expiry dates dynamically from `production_date + shelf_life`, not store separately.

### 2.1 Update preparationStore Getters

**File:** `src/stores/preparation/preparationStore.ts`

```typescript
export const usePreparationStore = defineStore('preparation', () => {
  // ... existing state

  // ✨ Update getters to calculate expiry dynamically
  const allBatches = computed(() => {
    return state.batches.map(batch => {
      const preparation = getById(batch.preparationId)

      return {
        ...batch,
        // ✨ Calculate expiry dynamically
        expiryDate: calculateExpiryDate(batch.productionDate, preparation?.shelfLife || 2),
        // ✨ Calculate remaining shelf life
        remainingShelfLifeHours: calculateRemainingShelfLife(
          batch.productionDate,
          preparation?.shelfLife || 2
        )
      }
    })
  })

  function calculateExpiryDate(productionDate: string, shelfLifeDays: number): string {
    const expiry = new Date(productionDate)
    expiry.setDate(expiry.getDate() + shelfLifeDays)
    return expiry.toISOString()
  }

  function calculateRemainingShelfLife(productionDate: string, shelfLifeDays: number): number {
    const now = new Date()
    const production = new Date(productionDate)
    const expiry = new Date(production)
    expiry.setDate(expiry.getDate() + shelfLifeDays)

    const remainingMs = expiry.getTime() - now.getTime()
    return Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60))) // hours
  }

  // ✨ Helper to check if batch is expired
  function isBatchExpired(batch: PreparationBatch): boolean {
    const preparation = getById(batch.preparationId)
    const expiryDate = calculateExpiryDate(batch.productionDate, preparation?.shelfLife || 2)
    return new Date(expiryDate) <= new Date()
  }

  // ✨ Helper to get batches expiring soon (within 24h)
  function getBatchesExpiringSoon(): PreparationBatch[] {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    return allBatches.value.filter(batch => {
      const expiry = new Date(batch.expiryDate)
      const now = new Date()
      return expiry <= tomorrow && expiry > now && batch.status === 'active'
    })
  }

  return {
    // ... existing exports
    allBatches,
    isBatchExpired,
    getBatchesExpiringSoon
  }
})
```

### 2.2 Update UI Components

**Update all components displaying expiry:**

- `PreparationBatchesView.vue` - show calculated expiry
- `AddPreparationProductionItemDialog.vue` - use dynamic calculation
- Dashboard widgets - use calculated expiry

### Tasks:

- [ ] Update `allBatches` computed to calculate expiry dynamically
- [ ] Add `calculateExpiryDate()` helper
- [ ] Add `calculateRemainingShelfLife()` helper
- [ ] Add `isBatchExpired()` helper
- [ ] Add `getBatchesExpiringSoon()` helper
- [ ] Update all UI components to use computed expiry
- [ ] Remove any hardcoded expiry calculations

### Deliverables:

- ✅ Expiry calculated dynamically everywhere
- ✅ Consistent shelf life logic
- ✅ Performance optimized (computed)

---

## 📊 SUCCESS CRITERIA

1. ✅ **Auto write-off on production:** Raw products automatically written off when producing preparations
2. ✅ **No double write-off:** Raw products only written off once (during production, not again during sales)
3. ✅ **Recipe decomposition:** Preparation recipes properly decomposed to raw products
4. ✅ **Linked operations:** Storage write-offs linked to preparation operations via `related_preparation_operation_id`
5. ✅ **Dynamic expiry:** Expiry dates calculated from `production_date + shelf_life`, not stored
6. ✅ **Unified history:** WriteOffHistoryView shows all write-off types (sales, production, storage, preparations)
7. ✅ **Type safety:** All TypeScript types updated and synchronized

---

## 📁 FILES TO CREATE/MODIFY

### NEW FILES:

- `src/supabase/migrations/012_add_preparation_shelf_life.sql`

### MODIFIED FILES:

- `src/stores/preparation/preparationService.ts` (auto write-off logic)
- `src/stores/preparation/preparationStore.ts` (dynamic expiry calculation)
- `src/stores/preparation/types.ts` (updated types)
- `src/stores/storage/storageService.ts` (new write-off reasons)
- `src/stores/storage/types.ts` (updated write-off reasons)
- `src/views/Preparation/components/AddPreparationProductionItemDialog.vue` (preview, auto-expiry)
- `src/views/backoffice/inventory/WriteOffHistoryView.vue` (unified view)
- `src/views/backoffice/inventory/components/WriteOffDetailDialog.vue` (production links)

### NO CHANGES NEEDED:

- `src/stores/pos/orders/composables/useKitchenDecomposition.ts` (keep current decomposition)
- POS order flow (Phase 2 - use Approach A)

---

## 🎯 SPRINT 1 IMPLEMENTATION SEQUENCE

**Focus:** Production flow only (Products → Preparations)

1. **Phase 0 (Day 1):** Database migration - add shelf_life column ⚡
2. **Phase 1 (Day 1-2):** Auto write-off on production + UI for batch creation 🔥 PRIORITY
3. **Phase 2 (Day 2):** Dynamic expiry calculation

**Total Estimated Time:** 2 days
**Priority:** 🔥 HIGH - Blocks accurate inventory tracking

**Sprint 2 (Future):**

- Menu Item decomposition
- Reverse decomposition for sales (Menu → Dish → Prep/Products)
- WriteOffHistoryView integration
- POS consumption tracking

---

## 🔄 SPRINT 2 SCOPE (Future)

### Sales Consumption via Reverse Decomposition

**Goal:** Implement Menu → Dish → Prep/Products decomposition for POS sales

**Flow:**

```
Menu Item ordered → Decompose to Dish + Products →
  Dish → Decompose to Preparations + Products →
    Preparations → Check stock:
      • If available: Consume from prep batches (FIFO)
      • If not: Decompose to raw products → Use raw products
    Products → Write off from storage (FIFO)
```

**Tasks:**

1. Update `useKitchenDecomposition` to handle Menu Items
2. Add preparation stock checking
3. Implement hybrid consumption (prep batches OR raw products)
4. Integrate with WriteOffHistoryView
5. Add "sales_consumption" write-off reason
6. Test with real POS orders

---

## 🔄 FUTURE ENHANCEMENTS (Long-term)

- **Kitchen Monitor:** Real-time preparation status display
- **Expiry Alerts UI:** Badge/banner in Storage View for expiring preparations
- **Automatic Cost Recalculation:** Update prep costs when raw product prices change
- **Advanced Analytics:** Turnover rate, waste tracking, slow-moving alerts
- **Preparation Consumption Sync:** Queued consumption via SyncService (offline-first)

---

## ✅ CHECKLIST FOR IMPLEMENTATION

### Pre-Implementation

- [ ] Review specification with team
- [ ] Confirm database migration safety
- [ ] Backup production database
- [ ] Verify recipe data completeness

### Phase 0: Database

- [ ] Create migration file
- [ ] Test on DEV database
- [ ] Apply to production
- [ ] Verify data integrity

### Phase 1: Auto Write-off

- [ ] Update preparationService.createReceipt()
- [ ] Update storageService.createWriteOff()
- [ ] Update AddPreparationProductionItemDialog
- [ ] Add error handling
- [ ] Test with various recipes
- [ ] Test transaction rollback

### Phase 2: Dynamic Expiry

- [ ] Update preparationStore getters
- [ ] Add calculation helpers
- [ ] Update UI components
- [ ] Test expiry calculations

### Post-Implementation

- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Documentation updates
- [ ] Training materials

---

**SPECIFICATION COMPLETE ✅**
**Ready for Implementation 🚀**
