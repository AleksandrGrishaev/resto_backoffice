# TODO - Kitchen/Bar Preparation Management System

**Feature**: Kitchen Preparation POS Interface with Offline-First Support
**Date**: 2025-12-11
**Status**: COMPLETED - All 7 Sprints Done
**Research**: COMPLETED - Codebase validated
**Production**: READY - Migration script prepared

---

## Research Summary (2025-12-11)

### Validated Architecture Claims

- ✅ `isKitchenMonitorOnly` optimization confirmed at `DevInitializationStrategy.ts:66-86`
- ✅ Same optimization at `ProductionInitializationStrategy.ts:75-96`
- ✅ `CRITICAL_STORES.kitchen = ['menu']` confirmed in `dependencies.ts`
- ✅ `preparationService.createReceipt()` and `createWriteOff()` confirmed
- ✅ `PreparationScreen.vue` is placeholder "Coming Soon" - ready to replace
- ✅ SyncService + ISyncAdapter pattern confirmed (`ShiftSyncAdapter.ts` as reference)

### Key Clarifications

1. **Preparation editing**: Via `UnifiedRecipeDialog.vue` (NOT PreparationFormDialog)
2. **Portion types**: Both weight AND portion required
3. **Schedule completions**: Sync to Supabase (NOT localStorage only)
4. **KPI tracking**: Create dedicated `kitchenKpi` store for dashboards/reports
5. **AI recommendations**: Rule-based (consumption statistics)

---

## Business Problem

### Current Situation

Kitchen and bar staff lack a convenient interface for managing preparations in their work environment:

- Preparation management is only available in backoffice
- No ability to see stock and expiry dates in real-time
- No production recommendations - unclear what and when to cook
- Product and preparation write-off requires backoffice access
- No offline mode - work stops when internet has problems

### Role-Based Access

Uses existing role system: `kitchen` and `bar` roles.
Each role sees only their department's preparations automatically (no toggle needed).

---

## Use Cases

**UC1: View preparation stock**

- Staff opens Kitchen/Bar Preparation Screen (based on role)
- Sees list of preparations for their department
- For each: name, current quantity, expiry date
- Color indication: green (OK), yellow (expiring soon), red (expired)
- Can filter by storage location (shelf/fridge/freezer)

**UC2: View production schedule**

- Staff sees tab with production recommendations
- Recommendations grouped by time: Urgent, Morning, Afternoon, Evening
- Each shows: name, recommended quantity, current stock
- AI explanation: "Based on 3-day avg consumption: 500g/day"

**UC3: Create preparation batch (Simple Production)**

- Staff clicks "New Production" button
- Dialog opens (clone of DirectPreparationProductionDialog)
- Selects preparation, enters quantity
- System auto-writes-off ingredients by recipe
- Batch created immediately locally, syncs when online

**UC4: Preparation write-off**

- Staff clicks "Write-off Preparation" button
- Dialog opens (clone of PreparationWriteOffDialog)
- Selects preparation, enters quantity and reason
- Write-off happens immediately locally
- Syncs with server when internet available
- All write-offs affect staff KPI

**UC5: Product write-off (without stock display)**

- Staff clicks "Write-off Product" button on same screen
- Dialog opens (adapted from storage WriteOffDialog)
- Searches product by name (doesn't see stock)
- Enters quantity, unit, reason
- Write-off created locally, syncs later

**UC6: Offline mode operation**

- All above operations work without internet
- Data saved to localStorage
- Auto-sync when connection restored
- Conflicts resolved by "server-wins" strategy for financial data

---

## Solution Overview

Enable kitchen/bar staff to manage semi-finished product (preparation) inventory with:

- Stock visibility with shelf life tracking
- Simple production workflow (quantity input only)
- Quick write-off operations (preparations AND products)
- AI-assisted production recommendations based on consumption
- Production schedule by shift (morning/afternoon/evening)
- Offline-first with sync when online
- Role-based department filtering (kitchen/bar)

---

## UI Design

### Main Screen Layout: Full Tabs + Action Buttons

**Main screen: PreparationScreen.vue**

```
+-------------------------------------------------------------------------+
|                    Preparation Management                                |
+-------------------------------------------------------------------------+
|  [Production Schedule]              [Stock List]                        |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-------------------------------------------------------------------+  |
|  |  [+ New Production]  [Write-off Prep]  [Write-off Product]        |  |
|  +-------------------------------------------------------------------+  |
|                                                                          |
|                         TAB CONTENT HERE                                 |
|                                                                          |
+-------------------------------------------------------------------------+
```

No Kitchen/Bar toggle - department determined by user role automatically.

---

### Tab 1: Production Schedule (Actionable TODO List)

**Core Concept**: Schedule is a TODO list with completion tracking.
Each item can be marked as "Done" → opens dialog to confirm quantity produced → creates batch.

```
+-------------------------------------------------------------------------+
|                       PRODUCTION SCHEDULE                               |
|                        (Today's Production Tasks)                       |
+-------------------------------------------------------------------------+
|                                                                         |
|  URGENT (items out of stock or expiring today)                         |
|  +-------------------------------------------------------------------+  |
|  | [ ] Fish Fillet    | Need: 500g  | Stock: 0g   | OUT!   | [Done]  |  |
|  | [ ] Sauce Base     | Need: 2000g | Stock: 300g | Low!   | [Done]  |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  MORNING (6:00 - 12:00)                                                |
|  +-------------------------------------------------------------------+  |
|  | [✓] Prep A         | Need: 1000g | Stock: 1500g| Done!  | 14:30   |  |
|  |     └── Produced: 1000g at 14:30 by Ivan                          |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  AFTERNOON (12:00 - 18:00)                                             |
|  +-------------------------------------------------------------------+  |
|  | [ ] Prep B         | Need: 500g  | Stock: 200g | Reason | [Done]  |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  EVENING (18:00 - 22:00)                                               |
|  +-------------------------------------------------------------------+  |
|  | (No items scheduled)                                               |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Workflow when clicking [Done]:**

```
1. Staff clicks [Done] on a schedule item
           |
           v
2. +----------------------------------+
   |     CONFIRM PRODUCTION           |
   +----------------------------------+
   | Preparation: Fish Fillet         |
   | Recommended: 500g                |
   |                                  |
   | Actual quantity produced:        |
   | [________500________] g          |
   |                                  |
   | [Cancel]           [Confirm]     |
   +----------------------------------+
           |
           v
3. Creates production batch (via preparationService.createReceipt())
           |
           v
4. Schedule item marked as completed with:
   - Timestamp
   - Who produced
   - Actual quantity
           |
           v
5. Stock List auto-updates (same data source)
```

**Each schedule item shows:**

- [ ] Checkbox (unchecked = pending, checked = done)
- Preparation name
- Recommended quantity (AI-calculated from 3-4 day consumption)
- Current stock (real-time from balances)
- Status: "OUT!" / "Low!" / AI reason
- [Done] button → opens confirmation dialog

**Completed items show:**

- [✓] Checked checkbox
- "Done!" status
- Completion time
- Expandable: who produced, actual quantity

**Data sync:**

- Schedule and Stock List share same data source (preparationStore.balances)
- When batch created via Schedule, Stock List updates immediately
- No manual sync needed - it's the same store

**Completion tracking storage:**

- Completions synced to Supabase `production_schedule` table for KPI/audit
- Also cached in localStorage for offline support
- Each completion links to created batch ID for audit trail
- Offline: completion saved locally, queued for sync via SyncService
- KPI entries updated automatically via `kitchenKpiStore`

> **DECISION**: Sync to Supabase for dashboards, monitors, and staff KPI reports (not localStorage-only)

---

### Tab 2: Stock List (Full Tab)

```
+-------------------------------------------------------------------------+
|                           STOCK LIST                                    |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Search...]                    [Filter: All | Shelf | Fridge | Freezer]|
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | NAME           | STOCK    | EXPIRY      | LOCATION | ACTIONS      |  |
|  +-------------------------------------------------------------------+  |
|  | Fish Fillet    | 0g       | -           | Fridge   | [P] [W]      |  |
|  |                | OUT OF STOCK (RED)                               |  |
|  +-------------------------------------------------------------------+  |
|  | Sauce Base     | 300g     | 2 days      | Fridge   | [P] [W]      |  |
|  |                | LOW STOCK (YELLOW)                               |  |
|  +-------------------------------------------------------------------+  |
|  | Pasta Dough    | 2500g    | 5 days      | Fridge   | [P] [W]      |  |
|  |                | OK (GREEN)                                       |  |
|  +-------------------------------------------------------------------+  |
|  | Frozen Mix     | 5000g    | 30 days     | Freezer  | [P] [W]      |  |
|  |                | OK (GREEN)                                       |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  [P] = Quick Produce button (opens production dialog)                   |
|  [W] = Quick Write-off button (opens write-off dialog)                  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

### Action Buttons (Open Dialogs)

All actions open dialogs - no inline forms:

| Button              | Opens Dialog               | Clone From                            |
| ------------------- | -------------------------- | ------------------------------------- |
| [+ New Production]  | SimpleProductionDialog.vue | DirectPreparationProductionDialog.vue |
| [Write-off Prep]    | PrepWriteOffDialog.vue     | PreparationWriteOffDialog.vue         |
| [Write-off Product] | ProductWriteOffDialog.vue  | storage/WriteOffDialog.vue            |

---

## Dialog Components to Clone

### For Production Dialog

**Source**: `src/views/Preparation/components/DirectPreparationProductionDialog.vue`

Features to keep:

- Preparation selector
- Quantity input (mini mode - just quantity, no recipe editing)
- Recipe output info display
- Cost calculation display
- Confirmation

---

### For Preparation Write-off Dialog

**Source files to clone**:

| Source File                                                               | Purpose                             |
| ------------------------------------------------------------------------- | ----------------------------------- |
| `src/views/Preparation/components/writeoff/PreparationWriteOffWidget.vue` | Button/trigger widget               |
| `src/views/Preparation/components/writeoff/PreparationWriteOffDialog.vue` | Main dialog with two-panel selector |
| `src/views/Preparation/components/writeoff/PreparationSelectorWidget.vue` | Preparation list with filtering     |
| `src/views/Preparation/components/writeoff/PreparationQuantityDialog.vue` | Quantity + reason input             |

These components already work well - create clones for kitchen use.

---

### For Product Write-off Dialog

**Source**: `src/views/storage/components/writeoff/WriteOffDialog.vue`

Features to keep:

- Two-panel product selector
- Reason dropdown
- Responsible person field
- Notes field
- NO stock display (kitchen doesn't see product inventory)

---

## Architecture: Store Loading & Data Flow

### Current Store Loading by System

**Three main systems with different initialization paths:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORE LOADING MATRIX                                │
├─────────────────────┬───────────────┬────────────────┬─────────────────────┤
│       SYSTEM        │    ROLES      │  STORES LOADED │      ENTRY POINT    │
├─────────────────────┼───────────────┼────────────────┼─────────────────────┤
│ 1. BACKOFFICE       │ admin,manager │ ALL stores     │ MainLayout + views  │
│    (Online-first)   │               │ products,      │                     │
│                     │               │ recipes,menu,  │                     │
│                     │               │ storage,       │                     │
│                     │               │ preparations,  │                     │
│                     │               │ counteragents, │                     │
│                     │               │ suppliers,     │                     │
│                     │               │ accounts       │                     │
├─────────────────────┼───────────────┼────────────────┼─────────────────────┤
│ 2. POS              │ admin,cashier,│ Critical +     │ PosMainView.vue     │
│    (Offline-first)  │ waiter        │ POS stores:    │                     │
│                     │               │ products,      │                     │
│                     │               │ recipes,menu,  │                     │
│                     │               │ storage,       │                     │
│                     │               │ pos,sales,     │                     │
│                     │               │ writeOff       │                     │
├─────────────────────┼───────────────┼────────────────┼─────────────────────┤
│ 3. KITCHEN MONITOR  │ kitchen,bar   │ MINIMAL:       │ KitchenMainView.vue │
│    (Currently)      │ (ONLY these)  │ menu only!     │                     │
│                     │               │ + kitchen      │                     │
├─────────────────────┴───────────────┴────────────────┴─────────────────────┤
│                                                                             │
│  KEY INSIGHT: Kitchen/Bar with ONLY their role get minimal stores!         │
│  This is an OPTIMIZATION in DevInitializationStrategy.ts:62-86             │
│                                                                             │
│  const isKitchenMonitorOnly =                                               │
│    userRoles?.length === 1 && (userRoles[0] === 'kitchen' || 'bar')        │
│  if (isKitchenMonitorOnly) → load ONLY menu                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Store Categories (CRITICAL_STORES in dependencies.ts)

```typescript
CRITICAL_STORES = {
  // Base stores - loaded for ALL non-kitchen-only roles
  all: ['products', 'recipes', 'menu', 'storage'],

  // Kitchen monitor optimization - ONLY menu
  kitchen: ['menu'],

  // POS-specific stores (cashier, waiter, admin)
  pos: ['pos', 'sales', 'writeOff'],

  // Backoffice-specific stores (admin, manager)
  backoffice: ['counteragents', 'suppliers', 'storage', 'preparations', 'accounts']
}
```

### Problem for Kitchen Preparation Feature

**Current state for pure kitchen/bar user:**

```
User role: ['kitchen'] or ['bar']
→ isKitchenMonitorOnly = true
→ Critical stores: menu ONLY
→ Role-based stores: kitchen store
→ NO ACCESS TO: products, recipes, storage, preparations
```

**Kitchen Preparation NEEDS:**

- `preparations` - for balances, batches, write-offs
- `storage` - for product write-offs
- `products` - for product selector in write-off
- `recipes` - for preparation recipes (production)

---

### Required Changes to Store Loading (CONFIRMED)

**Solution: Remove Kitchen-Only Optimization**

Remove the `isKitchenMonitorOnly` optimization that skips critical stores.
Kitchen Preparation needs the same stores as POS for full functionality.

**File 1**: `src/core/initialization/DevInitializationStrategy.ts` (lines 62-86)

```diff
async initializeCriticalStores(userRoles?: UserRole[]): Promise<StoreInitResult[]> {
-  // 🆕 ОПТИМИЗАЦИЯ: Kitchen monitor нуждается только в menu
-  const isKitchenMonitorOnly =
-    userRoles?.length === 1 && (userRoles[0] === 'kitchen' || userRoles[0] === 'bar')
-
-  if (isKitchenMonitorOnly) {
-    // Kitchen нуждается только в menu для отображения dish names
-    results.push(await this.loadMenu())
-    return results
-  }

+  // Kitchen Preparation feature requires full critical stores
   // Стандартная загрузка для всех ролей
   results.push(await this.loadProducts())
   ...
}
```

**File 2**: `src/core/initialization/ProductionInitializationStrategy.ts` (lines 74-96)

Same change - remove `isKitchenMonitorOnly` block.

**File 3**: `src/core/initialization/dependencies.ts`

```diff
CRITICAL_STORES = {
  all: ['products', 'recipes', 'menu', 'storage'],
-  kitchen: ['menu'],  // REMOVE: No longer needed
  pos: ['pos', 'sales', 'writeOff'],
  backoffice: ['counteragents', 'suppliers', 'storage', 'preparations', 'accounts'],
+  // NEW: Kitchen Preparation stores
+  kitchenPreparation: ['preparations'] as StoreName[]
}
```

**File 4**: `src/core/initialization/DevInitializationStrategy.ts` (in initializeRoleBasedStores)

```typescript
// Add after Kitchen stores loading
if (shouldLoadKitchenStores(userRoles)) {
  results.push(await this.loadKitchen())
  results.push(await this.loadPreparations()) // NEW: Load preparations for kitchen
}
```

---

### Data Flow: Delegation vs Direct

**Decision**: Kitchen uses SAME services as backoffice (delegation pattern)

| Operation         | Kitchen Action    | Service Used                        | Backoffice Impact               |
| ----------------- | ----------------- | ----------------------------------- | ------------------------------- |
| View stock        | Read balances     | preparationStore.balances           | Read-only, no impact            |
| Production        | Create batch      | preparationService.createReceipt()  | Same function, adds batch       |
| Prep Write-off    | Write-off prep    | preparationService.createWriteOff() | Same function, updates balances |
| Product Write-off | Write-off product | storageService.createWriteOff()     | Same function, updates balances |

**Why delegation (not separate implementation)?**

1. Single source of truth for business logic
2. Same FIFO calculation, same cost tracking
3. Automatic balance updates work the same way
4. No code duplication

---

### Stock Balance Updates

**How balances are updated:**

1. **Production (createReceipt)**:

   - Creates new PreparationBatch
   - Writes off raw ingredients via storageService.createWriteOff()
   - Recalculates preparation balances
   - Balance update is AUTOMATIC

2. **Preparation Write-off (createWriteOff)**:

   - Allocates from batches via FIFO
   - Updates batch quantities
   - Recalculates preparation balances
   - Balance update is AUTOMATIC

3. **Product Write-off (storageService.createWriteOff)**:
   - Allocates from storage batches via FIFO
   - Updates batch quantities
   - Recalculates storage balances
   - Balance update is AUTOMATIC

**No special handling needed** - existing services handle all balance updates.

---

### Offline Mode: Queue & Sync

**Offline operations flow:**

```
Kitchen Action
    |
    v
+------------------+
| Local Execution  |  <-- Optimistic update (immediate UI feedback)
| (localStorage)   |
+------------------+
    |
    v
+------------------+
| Add to SyncQueue |  <-- Queue for later sync
| (SyncService)    |
+------------------+
    |
    v (when online)
+------------------+
| Sync Adapter     |  <-- Calls actual service
| processes queue  |
+------------------+
    |
    v
+------------------+
| Supabase Update  |  <-- Server-side persistence
+------------------+
    |
    v
+------------------+
| Balance Refresh  |  <-- Refresh local cache from server
+------------------+
```

**Conflict Resolution:**

- Production: Server-wins (batch IDs may conflict)
- Write-offs: Append (write-offs are additive, no conflict)

---

### Files to Modify for Store Loading

| File                                                          | Changes                                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/core/initialization/dependencies.ts`                     | Add `kitchenPreparation: ['preparations']` to CRITICAL_STORES                                            |
| `src/core/initialization/DevInitializationStrategy.ts`        | Remove `isKitchenMonitorOnly` optimization (lines 62-86), add `loadPreparations()` for kitchen/bar roles |
| `src/core/initialization/ProductionInitializationStrategy.ts` | Remove `isKitchenMonitorOnly` optimization (lines 74-96), add preparations loading for kitchen/bar       |

**After changes, Kitchen/Bar will load:**

```
Critical: products, recipes, menu, storage (same as everyone)
Role-based: kitchen store + preparations store
```

---

### Summary: What Kitchen Uses from Backoffice

| Backoffice Module  | Kitchen Uses                         | How              |
| ------------------ | ------------------------------------ | ---------------- |
| PreparationStore   | balances, batches                    | Direct read      |
| PreparationService | createReceipt(), createWriteOff()    | Via sync adapter |
| StorageStore       | (products list only)                 | Direct read      |
| StorageService     | createWriteOff()                     | Via sync adapter |
| ProductsStore      | products list for write-off selector | Direct read      |

**Kitchen does NOT use:**

- Backoffice UI components (creates own clones)
- Direct Supabase calls (all via services)
- Counteragents, Suppliers, Accounts stores

---

## Implementation Phases

### Phase 1: Database Schema Updates

**File**: `src/supabase/migrations/047_add_preparation_storage_fields.sql`

- Add field `store` (boolean, default true) - recipe-only if false
- Add field `storage_location` (enum: shelf/fridge/freezer)
- Add field `production_slot` (enum: morning/afternoon/evening/any)
- Create index on store = true

**File**: `src/supabase/migrations/048_create_preparation_consumption_stats.sql`

- RPC function `get_preparation_consumption_stats(days_back INTEGER)`
- Returns: total_consumption, avg_daily_consumption, last_consumption_date

---

### Phase 1.5: Backoffice Preparation Dialog Update

**IMPORTANT**: New fields must be configurable in backoffice!

**File**: `src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue`

> **CONFIRMED**: Preparations are edited via UnifiedRecipeDialog which uses RecipeBasicInfoWidget for basic info fields.

Add fields to preparation edit widget:

- `store` select: Kitchen / Bar / Both (default: kitchen)
- `storage_location` text: Free-form storage location (e.g., "Fridge 1", "Shelf A")
- `production_slot` select: Morning / Afternoon / Evening / Any (default: any)
- `min_stock_threshold` number: Minimum stock level before schedule alert
- `daily_target_quantity` number: Target daily production quantity

This allows backoffice to configure each preparation's storage and production settings.

---

### Phase 2: Type System Updates

**File**: `src/stores/preparation/types.ts`

- Add: StorageLocation, ProductionSlot
- Add: ProductionRecommendation, PreparationConsumptionStats

**File**: `src/core/sync/types.ts`

- Add to SyncEntityType: `preparation_batch`, `preparation_writeoff`, `product_writeoff`, `schedule_completion`, `kpi_entry`

**NEW Directory**: `src/stores/kitchenKpi/`

```
kitchenKpi/
├── index.ts
├── types.ts              # KitchenKpiEntry, ProductionScheduleItem
├── kitchenKpiStore.ts    # State management
├── kitchenKpiService.ts  # Supabase operations
└── composables/
    ├── useKitchenKpi.ts
    └── useProductionSchedule.ts
```

> **PURPOSE**: Dedicated store for staff KPI tracking, future dashboard integration, and monitor displays showing results to staff.

---

### Phase 3: Sync Adapters (Offline-First)

**Pattern**: Follow `ShiftSyncAdapter.ts` structure

**File**: `src/core/sync/adapters/PreparationBatchSyncAdapter.ts`

- Sync offline preparation batches
- Uses preparationService.createReceipt()
- After sync: updates KPI via kitchenKpiStore

**File**: `src/core/sync/adapters/PreparationWriteOffSyncAdapter.ts`

- Sync offline preparation write-offs
- Uses preparationService.createWriteOff()
- After sync: updates KPI (affects staff metrics)

**File**: `src/core/sync/adapters/ProductWriteOffSyncAdapter.ts`

- Sync offline product write-offs
- Uses storageService.createWriteOff()
- After sync: updates KPI

**File**: `src/core/sync/adapters/ScheduleCompletionSyncAdapter.ts`

- Sync schedule task completions to production_schedule table
- Links completion to batch and KPI entry

---

### Phase 4: Kitchen Preparation Service

**File**: `src/stores/kitchen/preparation/kitchenPreparationService.ts`

- Main service: getStock, createBatch, writeOff, getRecommendations

**File**: `src/stores/kitchen/preparation/offlineStorage.ts`

- LocalStorage: balance caching, operation queue

---

### Phase 5: AI Recommendation Service

**File**: `src/stores/kitchen/preparation/recommendationService.ts`

- AI recommendations based on 3-4 day consumption
- Calculate days until stockout
- Classify urgency: urgent/morning/afternoon/evening

---

### Phase 6: UI Components

**Main Screen**

- `src/views/kitchen/preparation/PreparationScreen.vue` - REWRITE (tabs + action buttons)

**Tab Components**

- `src/views/kitchen/preparation/components/ProductionScheduleTab.vue` - Full tab
- `src/views/kitchen/preparation/components/StockListTab.vue` - Full tab
- `src/views/kitchen/preparation/components/StockItemCard.vue` - Stock item row

**Dialogs (Cloned from existing)**

- `src/views/kitchen/preparation/dialogs/SimpleProductionDialog.vue` - Clone from DirectPreparationProductionDialog
- `src/views/kitchen/preparation/dialogs/PrepWriteOffDialog.vue` - Clone from PreparationWriteOffDialog
- `src/views/kitchen/preparation/dialogs/ProductWriteOffDialog.vue` - Adapt from storage WriteOffDialog
- `src/views/kitchen/preparation/dialogs/ScheduleConfirmDialog.vue` - NEW: Confirm production from schedule (quantity input)

---

### Phase 7: Integration

**File**: `src/stores/pos/index.ts`

- Register sync adapters in initializePOS()

**File**: `src/views/kitchen/KitchenMainView.vue`

- Add navigation item for Preparation

**File**: `src/stores/preparation/supabase/mappers.ts`

- Map new fields: store, storage_location, production_slot

---

## Affected Files Summary

### NEW FILES (~22)

**Database Migrations**
| File | Description |
|------|-------------|
| `src/supabase/migrations/047_add_preparation_schedule_fields.sql` | store, storage_location, production_slot, min_stock_threshold, daily_target_quantity |
| `src/supabase/migrations/048_create_kitchen_kpi_table.sql` | kitchen_bar_kpi table for staff metrics |
| `src/supabase/migrations/049_create_production_schedule_table.sql` | production_schedule table for TODO tracking |

**Sync Adapters**
| File | Description |
|------|-------------|
| `src/core/sync/adapters/PreparationBatchSyncAdapter.ts` | Production sync + KPI update |
| `src/core/sync/adapters/PreparationWriteOffSyncAdapter.ts` | Prep write-off sync + KPI update |
| `src/core/sync/adapters/ProductWriteOffSyncAdapter.ts` | Product write-off sync + KPI update |
| `src/core/sync/adapters/ScheduleCompletionSyncAdapter.ts` | Schedule completion sync |

**KPI Store (NEW)**
| File | Description |
|------|-------------|
| `src/stores/kitchenKpi/index.ts` | Store exports |
| `src/stores/kitchenKpi/types.ts` | KitchenKpiEntry, ProductionScheduleItem types |
| `src/stores/kitchenKpi/kitchenKpiStore.ts` | State management |
| `src/stores/kitchenKpi/kitchenKpiService.ts` | Supabase operations |
| `src/stores/kitchenKpi/composables/useKitchenKpi.ts` | KPI composable |
| `src/stores/kitchenKpi/composables/useProductionSchedule.ts` | Schedule composable |

**Kitchen Services**
| File | Description |
|------|-------------|
| `src/services/preparationRecommendations.ts` | Rule-based AI recommendations |

**UI Components**
| File | Description |
|------|-------------|
| `src/views/kitchen/preparation/components/ProductionScheduleTab.vue` | Schedule tab (TODO list) |
| `src/views/kitchen/preparation/components/ScheduleTaskCard.vue` | Schedule task with checkbox + [Done] button |
| `src/views/kitchen/preparation/components/StockListTab.vue` | Stock list tab |
| `src/views/kitchen/preparation/components/StockItemCard.vue` | Stock item row |

**Dialogs (Cloned/New)**
| File | Clone From | Description |
|------|------------|-------------|
| `src/views/kitchen/preparation/dialogs/SimpleProductionDialog.vue` | DirectPreparationProductionDialog.vue | Production dialog |
| `src/views/kitchen/preparation/dialogs/PrepWriteOffDialog.vue` | PreparationWriteOffDialog.vue | Prep write-off |
| `src/views/kitchen/preparation/dialogs/ProductWriteOffDialog.vue` | storage/WriteOffDialog.vue | Product write-off |
| `src/views/kitchen/preparation/dialogs/ScheduleConfirmDialog.vue` | NEW | Confirm task completion (quantity input) |

### FILES TO MODIFY (~9)

| File                                                             | Changes                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/core/initialization/DevInitializationStrategy.ts`           | Remove `isKitchenMonitorOnly` (lines 66-86), add `loadPreparations()` for kitchen               |
| `src/core/initialization/ProductionInitializationStrategy.ts`    | Same change (lines 75-96)                                                                       |
| `src/core/initialization/dependencies.ts`                        | Remove `kitchen: ['menu']`                                                                      |
| `src/views/kitchen/preparation/PreparationScreen.vue`            | Full rewrite with tabs                                                                          |
| `src/views/kitchen/KitchenMainView.vue`                          | Add navigation item                                                                             |
| `src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue` | Add store, storage_location, production_slot, min_stock_threshold, daily_target_quantity fields |
| `src/stores/preparation/types.ts`                                | Add StorageLocation, ProductionSlot, and related types                                          |
| `src/core/sync/types.ts`                                         | Add 5 new SyncEntityType values                                                                 |
| `src/stores/preparation/supabase/mappers.ts`                     | Map new fields                                                                                  |

### REFERENCE FILES (Clone Sources)

**For Production Dialog:**
| File | Purpose |
|------|---------|
| `src/views/Preparation/components/DirectPreparationProductionDialog.vue` | Clone for SimpleProductionDialog |

**For Preparation Write-off:**
| File | Purpose |
|------|---------|
| `src/views/Preparation/components/writeoff/PreparationWriteOffWidget.vue` | Reference for button |
| `src/views/Preparation/components/writeoff/PreparationWriteOffDialog.vue` | Clone for PrepWriteOffDialog |
| `src/views/Preparation/components/writeoff/PreparationSelectorWidget.vue` | Reference for selector |
| `src/views/Preparation/components/writeoff/PreparationQuantityDialog.vue` | Reference for quantity input |

**For Product Write-off:**
| File | Purpose |
|------|---------|
| `src/views/storage/components/writeoff/WriteOffDialog.vue` | Clone for ProductWriteOffDialog |

**For Sync Adapters:**
| File | Purpose |
|------|---------|
| `src/core/sync/adapters/ShiftSyncAdapter.ts` | Pattern for new adapters |

---

## Sprint Plan - ALL COMPLETED

### Sprint 1: Foundation [COMPLETED]

- [x] Fix store initialization (remove `isKitchenMonitorOnly` optimization)
- [x] Create database migrations (047, 048, 049)
- [x] Apply migrations to DEV
- [x] Add new fields to RecipeBasicInfoWidget.vue
- [x] Update preparation types.ts
- [x] Test kitchen user can load preparations store

### Sprint 2: Types & KPI Store [COMPLETED]

- [x] Extend SyncEntityType in sync/types.ts
- [x] Create kitchenKpi store structure (5+ files)
- [x] Implement kitchenKpiStore.ts
- [x] Implement kitchenKpiService.ts
- [x] Create useKitchenKpi and useProductionSchedule composables

### Sprint 3: Sync Adapters [COMPLETED]

- [x] Create PreparationBatchSyncAdapter.ts
- [x] Create PreparationWriteOffSyncAdapter.ts
- [x] Create ProductWriteOffSyncAdapter.ts
- [x] Create ScheduleCompletionSyncAdapter.ts
- [x] Register adapters in initialization

### Sprint 4: UI - Main Screen [COMPLETED]

- [x] Rewrite PreparationScreen.vue (tabs + action buttons)
- [x] Create ProductionScheduleTab.vue
- [x] Create StockListTab.vue
- [x] Create ScheduleTaskCard.vue and StockItemCard.vue

### Sprint 5: Dialogs [COMPLETED]

- [x] Create SimpleProductionDialog.vue (support weight + portion types)
- [x] Create PrepWriteOffDialog.vue
- [x] Create ProductWriteOffDialog.vue (hide stock info)
- [x] Create ScheduleConfirmDialog.vue
- [x] Connect all dialogs to KPI tracking

### Sprint 6: AI Recommendations [COMPLETED]

- [x] Create recommendationsService.ts
- [x] Implement rule-based schedule generation
- [x] Create useRecommendations composable
- [x] Integrate with Schedule tab

### Sprint 7: Offline & Polish [COMPLETED]

- [x] Implement localStorage caching for offline (offlineCache.ts)
- [x] Add sync status indicators (SyncStatusIndicator.vue)
- [x] Handle offline/online transitions with auto-sync
- [x] Final testing - build passes
- [x] Create PRODUCTION migration script

**Next Step**: Apply `PRODUCTION_kitchen_prep_sprint7.sql` to production database

---

## Design Decisions (Confirmed)

1. **UI Layout**: Two full tabs (Production Schedule + Stock List) with action buttons
2. **No Department Toggle**: Role-based filtering (kitchen/bar role determines department)
3. **Actions via Dialogs**: All actions (production, write-off) open dialog windows
4. **Clone Existing Dialogs**: Reuse working components from backoffice
5. **Backoffice Config**: New fields editable via `RecipeBasicInfoWidget.vue` (NOT PreparationFormDialog)
6. **KPI Tracking**: ALL write-offs tracked (affects staff metrics) + dedicated `kitchenKpi` store
7. **Offline Strategy**: LocalStorage + SyncService with adapters + Supabase sync
8. **Store Loading**: Remove `isKitchenMonitorOnly` optimization - kitchen/bar loads full critical stores + preparations
9. **Production Schedule as TODO**: Tasks with completion tracking, [Done] button opens confirmation dialog
10. **Schedule Completions**: Sync to Supabase `production_schedule` table (NOT localStorage-only)
11. **Portion Types**: Support BOTH weight (grams) AND portion types in production dialogs
12. **AI Recommendations**: Rule-based using consumption statistics (NOT external AI service)
13. **KPI Store Purpose**: Future dashboard integration, monitor displays for staff results

### Types (Finalized)

**StorageLocation**: `'shelf' | 'fridge' | 'freezer'`

**ProductionSlot**: `'morning' | 'afternoon' | 'evening' | 'any'`

- Morning: 6:00 - 12:00
- Afternoon: 12:00 - 18:00
- Evening: 18:00 - 22:00

**KitchenKpiEntry** (NEW - for staff KPI tracking):

```typescript
interface KitchenKpiEntry {
  id: string
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
  periodDate: string // ISO date
  productionsCompleted: number
  productionQuantityTotal: number
  productionValueTotal: number
  writeoffsKpiAffecting: number
  writeoffValueKpiAffecting: number
  writeoffsNonKpi: number
  writeoffValueNonKpi: number
  onTimeCompletions: number
  lateCompletions: number
  productionDetails: ProductionDetail[]
  writeoffDetails: WriteoffDetail[]
}
```

**ProductionScheduleItem** (NEW - for TODO list):

```typescript
interface ProductionScheduleItem {
  id: string
  preparationId: string
  preparationName: string
  department: 'kitchen' | 'bar'
  scheduleDate: string
  productionSlot: 'urgent' | 'morning' | 'afternoon' | 'evening'
  priority: number
  targetQuantity: number
  targetUnit: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completedAt?: string
  completedBy?: string
  completedQuantity?: number
  preparationBatchId?: string
  syncStatus: 'pending' | 'synced' | 'failed'

  // Computed from preparation
  currentStock?: number
  expiryStatus?: 'ok' | 'warning' | 'expired'
  portionType?: 'weight' | 'portion'
  portionSize?: number
}
```

**ProductionRecommendation** (updated):

```typescript
interface ProductionRecommendation {
  id: string // Unique ID for tracking
  preparationId: string
  preparationName: string
  currentStock: number
  avgDailyConsumption: number
  daysUntilStockout: number
  recommendedQuantity: number
  urgency: 'urgent' | 'morning' | 'afternoon' | 'evening'
  reason: string
  storageLocation: StorageLocation
  expiryDate?: string
  portionType?: 'weight' | 'portion'

  // Completion tracking
  isCompleted: boolean
  completion?: ScheduleTaskCompletion
}
```

---

## Risks & Mitigations

| Risk                                     | Impact | Mitigation                                       |
| ---------------------------------------- | ------ | ------------------------------------------------ |
| Store init change breaks kitchen monitor | High   | Test kitchen-only users thoroughly before deploy |
| Sync conflicts (multiple devices)        | Medium | Server-wins strategy, optimistic locking         |
| Large preparation lists slow UI          | Medium | Virtual scrolling, pagination                    |
| Portion type complexity                  | Low    | Reuse existing DirectProductionDialog logic      |

---

**Last Updated**: 2025-12-11
**Status**: Ready for Sprint 1 implementation
**Total Estimated Duration**: ~33 days (7 sprints)
