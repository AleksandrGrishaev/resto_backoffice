# Sprint 7: Centralized Discount System

## 📈 Sprint Progress

### Phase 1: Core Discount System (Sprint 7.1) ✅ COMPLETED

- [x] Task 1: Setup Discount Store Structure ✅
- [x] Task 2: Database Migrations ✅
- [x] Task 3: Discount Service Layer ✅
- [x] Task 4: Integrate with Orders Store ✅

### Phase 2: UI Components (Sprint 7.2)

- [ ] Task 5: Item Discount Dialog
- [ ] Task 6: Bill Discount Dialog
- [ ] Task 7: Update Order Display Components

### Phase 3: Analytics & Reporting (Sprint 7.3)

- [ ] Task 8: Discount Analytics Composables
- [ ] Task 9: Revenue Dashboard View
- [ ] Task 10: Discount Analytics Dashboard
- [ ] Task 11: Update Food Cost Analytics

### Phase 4: Testing & Documentation (Sprint 7.4)

- [ ] Task 11: Integration Testing
- [ ] Task 12: Data Migration
- [ ] Task 13: Documentation

**Current Phase:** Phase 1 Completed ✅ → Ready for Phase 2 (UI Components)
**Overall Progress:** 31% (4/13 tasks completed)

---

## 🎯 Sprint Goal

Build a centralized discount tracking and management system with transparent revenue calculations supporting multiple reporting views (revenue before/after tax, planned vs actual revenue, tax collection tracking).

---

## 📊 Current State Analysis

### Executive Summary

The Kitchen App POS has a **fragmented discount and tax implementation**:

- ✅ Item-level discounts have good data structure (`PosItemDiscount[]`)
- ❌ Bill-level discounts stored as flat number (no metadata)
- ❌ Taxes calculated but **not persisted** in orders
- ❌ Revenue calculations **exclude taxes** → wrong profit metrics
- ❌ No centralized discount service → logic scattered
- ❌ Food cost % **inflated** due to missing tax revenue in denominator

### Current Implementation Locations

**Discount Logic:**

- `src/stores/pos/types.ts:180-187` - `PosItemDiscount` interface ✅ Well-structured
- `src/stores/pos/types.ts:141` - `PosBill.discountAmount: number` ❌ Flat storage
- `src/stores/pos/orders/composables/useOrderCalculations.ts:243-253` - Item discount calculation
- `src/stores/pos/orders/composables/useOrderCalculations.ts:98-131` - **Bill discount proportional allocation** ✅

**Tax Logic:**

- `useOrderCalculations.ts:28-31` - Tax rates (5% service, 10% government)
- `useOrderCalculations.ts:154-172` - Tax calculation (applied to discounted subtotal)
- `useOrderCalculations.ts:459` - `order.taxAmount = 0` ⚠️ **Taxes not persisted!**

**Profit Logic:**

- `src/stores/sales/composables/useProfitCalculation.ts` - Revenue & profit calculation
- `src/stores/sales/composables/useActualCostCalculation.ts` - FIFO cost system ✅ Sophisticated
- `src/stores/analytics/foodCostStore.ts` - Food cost analytics ❌ Uses incomplete revenue

### Data Flow

```
Order Creation
  → Items added (unitPrice, totalPrice)
  → Discounts applied (item: structured, bill: flat number)
  → recalculateOrderTotals()
      ├─ Subtotal calculated
      ├─ Discounts summed
      ├─ Taxes = 0 (not stored!) ⚠️
      └─ finalAmount = subtotal - discounts (no taxes!)
  → Payment processed
  → recordSalesTransaction()
      ├─ FIFO cost calculation ✅
      ├─ Profit = finalRevenue - cost
      └─ finalRevenue excludes taxes ❌
  → Analytics (food cost %, P&L)
      └─ Uses incomplete revenue ❌
```

---

## 🔴 Critical Issues Identified

### 1. Tax Handling Issues

| Issue                              | Impact                              | Files Affected                                  |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Taxes calculated but not persisted | Financial data incomplete           | `useOrderCalculations.ts:459`, `ordersStore.ts` |
| Revenue excludes taxes             | Profit metrics wrong                | `useProfitCalculation.ts`, `salesStore.ts`      |
| Food cost % inflated               | Analytics misleading                | `foodCostStore.ts`                              |
| No tax breakdown stored            | Cannot separate service vs govt tax | All stores                                      |

**Example:**

```typescript
// Current (WRONG):
finalRevenue = 100,000 IDR (after discounts, before tax)
tax = 15,000 IDR (5% + 10%)
// finalRevenue saved: 100,000 ❌ (missing 15,000 tax revenue)

// Should be:
revenueBeforeTax = 100,000 IDR
taxes = 15,000 IDR
totalCollected = 115,000 IDR ✅ (all views available)
```

### 2. Discount Tracking Issues

| Issue                        | Impact                                | Files Affected |
| ---------------------------- | ------------------------------------- | -------------- |
| Bill discounts = flat number | No audit trail, no analysis           | `types.ts:141` |
| No discount reason tracking  | Cannot analyze discount effectiveness | All POS views  |
| No approval workflow         | Risk of unauthorized discounts        | Missing        |
| No discount limits           | Risk of excessive discounts           | Missing        |

**Example:**

```typescript
// Current (LIMITED):
bill.discountAmount = 50000 // Who? When? Why? Unknown! ❌

// Should be:
{
  id: "disc_123",
  type: "bill",
  value: 50000,
  reason: "Customer complaint resolution",
  appliedBy: "user_456",
  appliedAt: "2024-01-15T14:30:00Z",
  orderId: "order_789"
} ✅
```

### 3. Missing Implementation

- ❌ No `applyBillDiscount()` method in ordersStore (unclear how currently applied)
- ❌ No UI for applying item-level discounts
- ❌ No discount analytics dashboard
- ❌ No discount effectiveness reports

---

## 🏗️ Architecture Design

### Design Decisions (Based on Requirements)

✅ **Tax Model**: Dual view tracking

- Store both "revenue before tax" and "total collected"
- Allow switching between views in reports
- Most flexible for different reporting needs

✅ **Approval Flow**: Deferred to Phase 2

- Phase 1: Basic discount tracking with required reason
- Phase 2: Add approval workflow for large discounts

✅ **Architecture**: New `discountsStore`

- Clean separation from orders
- Centralized discount logic
- Easy to add analytics later

✅ **Priority**: Build discount system first

- Phase 1: Discount system core
- Phase 2: Integrate tax handling
- Phase 3: Analytics & reporting

### New Store Structure

```
src/stores/discounts/
├── index.ts                 # Main exports
├── discountsStore.ts        # Pinia store
├── types.ts                 # Type definitions
├── services/
│   ├── discountService.ts   # Core discount logic
│   └── supabaseService.ts   # Persistence layer
├── composables/
│   ├── useDiscounts.ts      # Discount operations
│   └── useDiscountAnalytics.ts  # Analytics helpers
└── constants.ts             # Discount reasons, limits
```

---

## 💰 Bill Discount Proportional Allocation

### How It Works

**Bill-level discounts are distributed proportionally across all items based on their subtotal contribution.**

This ensures:

- ✅ Fair allocation of discount across items
- ✅ Accurate profit calculation per item
- ✅ Correct cost tracking in sales transactions
- ✅ Transparent revenue breakdown

### Formula

```typescript
// For each item in the bill:
itemProportion = item.totalPrice / billSubtotal
allocatedDiscount = billDiscountAmount × itemProportion
```

### Example Calculation

**Bill Setup:**

```
Item 1: Nasi Goreng     → 50,000 IDR
Item 2: Rendang Plate   → 100,000 IDR
Item 3: Iced Tea        → 15,000 IDR
─────────────────────────────────────
Bill Subtotal:            165,000 IDR
Bill Discount Applied:     15,000 IDR  (10% off)
```

**Proportional Allocation:**

```typescript
// Item 1 (Nasi Goreng):
proportion = 50,000 / 165,000 = 0.3030 (30.30%)
allocatedDiscount = 15,000 × 0.3030 = 4,545 IDR
finalPrice = 50,000 - 4,545 = 45,455 IDR

// Item 2 (Rendang Plate):
proportion = 100,000 / 165,000 = 0.6061 (60.61%)
allocatedDiscount = 15,000 × 0.6061 = 9,091 IDR
finalPrice = 100,000 - 9,091 = 90,909 IDR

// Item 3 (Iced Tea):
proportion = 15,000 / 165,000 = 0.0909 (9.09%)
allocatedDiscount = 15,000 × 0.0909 = 1,364 IDR
finalPrice = 15,000 - 1,364 = 13,636 IDR

// Verification:
Total allocated: 4,545 + 9,091 + 1,364 = 15,000 ✅
```

### Current Implementation

**Location:** `src/stores/pos/orders/composables/useOrderCalculations.ts` (lines 98-131)

```typescript
const billDiscounts = computed((): number => {
  let totalBillDiscounts = 0

  // If items are selected, calculate proportional bill discounts
  for (const bill of allBills) {
    const billItems = /* get bill items */
    const selectedBillItems = /* filter selected items */

    // Calculate bill subtotal
    const billSubtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0)

    // Calculate selected items subtotal
    const selectedSubtotal = selectedBillItems.reduce((sum, item) => sum + item.totalPrice, 0)

    if (billSubtotal > 0) {
      // Proportional allocation
      const proportion = selectedSubtotal / billSubtotal
      totalBillDiscounts += bill.discountAmount * proportion
    }
  }

  return totalBillDiscounts
})
```

**Key Features:**

- ✅ Handles partial selection (only selected items get proportion)
- ✅ Works with multiple bills in one order
- ✅ Maintains mathematical accuracy (no rounding errors accumulate)
- ✅ Updates automatically when items added/removed

### Why Proportional Allocation?

**Alternative approaches considered:**

1. **Equal distribution** (rejected)

   ```
   15,000 / 3 items = 5,000 IDR per item
   Problem: Unfair! Cheap item gets same discount as expensive item
   ```

2. **Percentage-based** (rejected)

   ```
   10% off → each item gets 10% off
   Problem: Doesn't work with fixed amount discounts
   ```

3. **Proportional by price** (✅ CHOSEN)
   ```
   Expensive items get more discount
   Cheap items get less discount
   Works with both percentage and fixed discounts
   ```

### Integration with Sales Tracking

When recording sales transactions, the proportional discount is stored per item:

```typescript
// src/stores/sales/composables/useProfitCalculation.ts
export function calculateItemProfit(
  billItem: PosBillItem,
  ingredientsCost: number,
  allocatedBillDiscount: number = 0 // ← Proportional discount passed here
): ProfitCalculation {
  const originalPrice = billItem.totalPrice

  // Item's own discounts
  const itemOwnDiscount = calculateItemOwnDiscounts(billItem)

  // Final revenue after ALL discounts
  const finalRevenue = originalPrice - itemOwnDiscount - allocatedBillDiscount

  // Profit calculation
  const profit = finalRevenue - ingredientsCost

  return {
    originalPrice, // 100,000 IDR
    itemOwnDiscount, // 5,000 IDR (item discount)
    allocatedBillDiscount, // 9,091 IDR (proportional bill discount)
    finalRevenue, // 85,909 IDR
    ingredientsCost, // 45,000 IDR
    profit, // 40,909 IDR
    profitMargin // 47.6%
  }
}
```

This ensures:

- ✅ Every item knows its exact discount allocation
- ✅ Profit calculations are accurate per item
- ✅ Analytics can track discount impact per product
- ✅ No discount amount is "lost" or untracked

---

## 📐 Data Structures

### 1. DiscountEvent (Core Type)

```typescript
/**
 * Centralized discount tracking
 * Stores ALL discount applications with full metadata
 */
export interface DiscountEvent extends BaseEntity {
  // Discount details
  type: 'item' | 'bill' | 'order'
  discountType: 'percentage' | 'fixed' | 'promotion'
  value: number
  reason: DiscountReason

  // Metadata
  appliedBy: string // User ID
  appliedAt: string // ISO timestamp
  approvedBy?: string // Manager ID (Phase 2)
  approvedAt?: string // ISO timestamp (Phase 2)
  approvalStatus?: 'pending' | 'approved' | 'rejected' // Phase 2

  // Links to entities
  orderId: string
  billId?: string // For bill-level discounts
  itemId?: string // For item-level discounts
  shiftId?: string // Current shift

  // Calculated amounts
  originalAmount: number // Price before discount
  discountAmount: number // Actual discount applied
  finalAmount: number // Price after discount

  // For bill discounts: track how it was allocated
  allocationDetails?: {
    totalBillAmount: number // Bill subtotal
    itemAllocations: Array<{
      // Per-item breakdown
      itemId: string
      itemAmount: number // Item's totalPrice
      proportion: number // Item's share (0-1)
      allocatedDiscount: number // Discount allocated to this item
    }>
  }

  // Business context
  notes?: string
  tags?: string[]
}

/**
 * Discount reason catalog
 */
export type DiscountReason =
  | 'customer_complaint'
  | 'food_quality_issue'
  | 'service_delay'
  | 'birthday_promo'
  | 'loyalty_reward'
  | 'manager_discretion'
  | 'staff_meal'
  | 'compensation'
  | 'promotion'
  | 'other'

export const DISCOUNT_REASON_LABELS: Record<DiscountReason, string> = {
  customer_complaint: 'Customer Complaint',
  food_quality_issue: 'Food Quality Issue',
  service_delay: 'Service Delay',
  birthday_promo: 'Birthday Promotion',
  loyalty_reward: 'Loyalty Reward',
  manager_discretion: 'Manager Discretion',
  staff_meal: 'Staff Meal',
  compensation: 'Compensation',
  promotion: 'Promotion',
  other: 'Other'
}
```

### 2. Enhanced Revenue Tracking

```typescript
/**
 * Multi-view revenue breakdown
 * Supports "before tax", "after tax", "planned vs actual"
 */
export interface RevenueBreakdown extends BaseEntity {
  // Order reference
  orderId: string
  billId?: string
  calculatedAt: string

  // Planned revenue (before discounts)
  plannedRevenue: number // Original prices sum

  // Discount breakdown
  itemDiscounts: number // Sum of all item-level discounts
  billDiscounts: number // Bill-level discount (total, not per-item)
  totalDiscounts: number // itemDiscounts + billDiscounts

  // Actual revenue (after discounts, before tax)
  actualRevenue: number // plannedRevenue - totalDiscounts

  // Tax breakdown
  serviceTaxRate: number // Default: 5%
  governmentTaxRate: number // Default: 10%
  serviceTax: number // actualRevenue × serviceTaxRate
  governmentTax: number // actualRevenue × governmentTaxRate
  totalTaxes: number // serviceTax + governmentTax

  // Total collected (after discounts, with tax)
  totalCollected: number // actualRevenue + totalTaxes

  // Discount events references
  discountEventIds: string[]
}

/**
 * Enhanced Order type (updated)
 */
export interface PosOrder extends BaseEntity {
  // ... existing fields ...

  // OLD (to be deprecated):
  // totalAmount: number
  // discountAmount: number
  // taxAmount: number
  // finalAmount: number

  // NEW (structured):
  revenueBreakdown?: RevenueBreakdown // Complete breakdown

  // Quick access (denormalized for queries)
  plannedRevenue: number // For fast filtering
  actualRevenue: number // For fast filtering
  totalCollected: number // For fast filtering
}
```

### 3. Daily Revenue Report Structure

```typescript
/**
 * Simple daily revenue report
 * Shows: planned revenue, actual revenue, taxes collected
 */
export interface DailyRevenueReport {
  date: string // YYYY-MM-DD
  shiftId?: string // Optional: per-shift breakdown

  // Revenue metrics
  plannedRevenue: number // Sum of original prices
  actualRevenue: number // After discounts, before tax
  totalCollected: number // With taxes

  // Discount analysis
  totalDiscounts: number // All discounts applied
  discountPercentage: number // (totalDiscounts / plannedRevenue) × 100
  discountCount: number // Number of discount events

  // Tax collection
  serviceTaxCollected: number // 5% tax total
  governmentTaxCollected: number // 10% tax total
  totalTaxesCollected: number // Total tax liability

  // Top discount reasons
  topDiscountReasons: Array<{
    reason: DiscountReason
    count: number
    totalAmount: number
  }>

  // Order stats
  orderCount: number
  avgOrderValue: number // totalCollected / orderCount
}
```

### 4. Discount Analytics Structures (Simplified)

```typescript
/**
 * Simple discount summary
 * Basic statistics for a period
 */
export interface DiscountSummary {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD

  totalDiscounts: number // Total discount amount
  discountCount: number // Total number of discounts

  // Breakdown by reason
  byReason: Array<{
    reason: DiscountReason
    reasonLabel: string
    count: number
    totalAmount: number
    percentage: number // % of total discounts
  }>
}

/**
 * Discount transaction view
 * For viewing individual discount events with order context
 */
export interface DiscountTransactionView {
  // Discount event
  id: string
  type: 'item' | 'bill'
  reason: DiscountReason
  reasonLabel: string
  discountAmount: number
  notes?: string

  // When & Who
  appliedAt: string // ISO timestamp
  appliedBy: string // User name

  // Order context
  orderId: string
  orderNumber: string

  // For bill discounts: simple allocation summary
  allocationSummary?: string // e.g., "3 items: Rendang (30K), Rice (20K), ..."
}

/**
 * Discount filter options
 */
export interface DiscountFilterOptions {
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  reason?: DiscountReason[] // Filter by reasons
  type?: ('item' | 'bill')[] // Filter by type
  searchQuery?: string // Search by order # or notes
}
```

---

## 🗄️ Database Schema

### New Table: discount_events

```sql
-- Migration: 007_create_discount_events_table.sql
-- Description: Centralized discount event tracking
-- Date: 2024-01-15

CREATE TABLE discount_events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Discount details
  type TEXT NOT NULL CHECK (type IN ('item', 'bill', 'order')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'promotion')),
  value NUMERIC NOT NULL CHECK (value >= 0),
  reason TEXT NOT NULL,

  -- Metadata
  applied_by UUID NOT NULL REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),

  -- Links
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  item_id UUID,  -- Not FK (bill items are JSON)
  shift_id UUID REFERENCES shifts(id),

  -- Calculated amounts
  original_amount NUMERIC NOT NULL CHECK (original_amount >= 0),
  discount_amount NUMERIC NOT NULL CHECK (discount_amount >= 0),
  final_amount NUMERIC NOT NULL CHECK (final_amount >= 0),

  -- Bill discount allocation details (JSONB for flexibility)
  allocation_details JSONB,

  -- Business context
  notes TEXT,
  tags TEXT[],

  -- Validation
  CONSTRAINT valid_amounts CHECK (discount_amount <= original_amount),
  CONSTRAINT valid_final CHECK (final_amount = original_amount - discount_amount)
);

-- Indexes for performance
CREATE INDEX idx_discount_events_order_id ON discount_events(order_id);
CREATE INDEX idx_discount_events_applied_at ON discount_events(applied_at);
CREATE INDEX idx_discount_events_reason ON discount_events(reason);
CREATE INDEX idx_discount_events_shift_id ON discount_events(shift_id);
CREATE INDEX idx_discount_events_applied_by ON discount_events(applied_by);
CREATE INDEX idx_discount_events_type ON discount_events(type);

-- RLS policies
ALTER TABLE discount_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discount events they applied"
  ON discount_events FOR SELECT
  USING (auth.uid() = applied_by);

CREATE POLICY "Users can create discount events"
  ON discount_events FOR INSERT
  WITH CHECK (auth.uid() = applied_by);

-- Managers can view all discount events
CREATE POLICY "Managers can view all discount events"
  ON discount_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_discount_events_updated_at
  BEFORE UPDATE ON discount_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE discount_events IS 'Centralized tracking of all discount applications';
COMMENT ON COLUMN discount_events.reason IS 'Business reason for discount (see DiscountReason type)';
COMMENT ON COLUMN discount_events.approval_status IS 'Phase 2: Approval workflow status';
COMMENT ON COLUMN discount_events.allocation_details IS 'For bill discounts: JSON with per-item allocation breakdown';
```

### Update Table: orders

```sql
-- Migration: 008_add_revenue_breakdown_to_orders.sql
-- Description: Add structured revenue tracking to orders
-- Date: 2024-01-15

-- Add new columns for quick access
ALTER TABLE orders
  ADD COLUMN planned_revenue NUMERIC,
  ADD COLUMN actual_revenue NUMERIC,
  ADD COLUMN total_collected NUMERIC,
  ADD COLUMN revenue_breakdown JSONB;

-- Indexes
CREATE INDEX idx_orders_planned_revenue ON orders(planned_revenue);
CREATE INDEX idx_orders_actual_revenue ON orders(actual_revenue);
CREATE INDEX idx_orders_total_collected ON orders(total_collected);

-- Comments
COMMENT ON COLUMN orders.planned_revenue IS 'Revenue before discounts (for fast queries)';
COMMENT ON COLUMN orders.actual_revenue IS 'Revenue after discounts, before tax';
COMMENT ON COLUMN orders.total_collected IS 'Total with taxes (actual payment amount)';
COMMENT ON COLUMN orders.revenue_breakdown IS 'Full RevenueBreakdown object (JSON)';

-- Backfill existing orders (optional, can run later)
-- UPDATE orders SET
--   planned_revenue = total_amount,
--   actual_revenue = final_amount,
--   total_collected = final_amount
-- WHERE planned_revenue IS NULL;
```

---

## 📋 Implementation Tasks - Sprint 7

### Phase 1: Core Discount System (Sprint 7.1) ✅ COMPLETED

#### Task 1: Setup Discount Store Structure ✅

- [x] Create `src/stores/discounts/` directory
- [x] Create `types.ts` with:
  - [x] `DiscountEvent` interface (with `allocationDetails`)
  - [x] `DiscountReason` type
  - [x] `DISCOUNT_REASON_LABELS` constant
  - [x] `RevenueBreakdown` interface
  - [x] `DailyRevenueReport` interface
  - [x] `DiscountSummary` interface (simple analytics)
  - [x] `DiscountTransactionView` interface (transaction with order context)
  - [x] `DiscountFilterOptions` interface (for filtering)
- [x] Create `constants.ts` with:
  - [x] Discount reason options
  - [x] Tax rate defaults (5%, 10%)
  - [x] Default date ranges (last 7 days, 30 days, custom)
- [x] Create `discountsStore.ts` with:
  - [x] State: `discountEvents`, `initialized`, `loading`
  - [x] Actions: `initialize()`, `addDiscountEvent()`, `getDiscountsByOrder()`
  - [x] Getters: `getDiscountStats()`, `getTodayDiscounts()`

**Example Code:**

```typescript
// src/stores/discounts/discountsStore.ts
import { defineStore } from 'pinia'
import type { DiscountEvent } from './types'

export const useDiscountsStore = defineStore('discounts', () => {
  const discountEvents = ref<DiscountEvent[]>([])
  const initialized = ref(false)
  const loading = ref(false)

  async function initialize() {
    if (initialized.value) return
    loading.value = true
    try {
      // Load from Supabase
      discountEvents.value = await loadDiscountEvents()
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function addDiscountEvent(event: Omit<DiscountEvent, 'id' | 'createdAt'>) {
    // Validate
    // Save to Supabase
    // Add to local state
    discountEvents.value.push(newEvent)
    return newEvent
  }

  return {
    discountEvents,
    initialized,
    loading,
    initialize,
    addDiscountEvent
  }
})
```

#### Task 2: Database Migrations ✅

- [x] Create migration `034_create_discount_events_table.sql`
- [x] Test migration on DEV database using MCP: `mcp__supabase__apply_migration()`
- [x] Verify table structure: `mcp__supabase__list_tables()`
- [x] Create migration `035_add_revenue_breakdown_to_orders.sql`
- [x] Test migration on DEV database
- [x] Run security advisor: `mcp__supabase__get_advisors({ type: 'security' })`

#### Task 3: Discount Service Layer ✅

- [x] Create `src/stores/discounts/services/discountService.ts`
- [x] Implement `applyItemDiscount()`:
  - [x] Validate discount value
  - [x] Create DiscountEvent
  - [x] Update item in ordersStore
  - [x] Return updated item
- [x] Implement `applyBillDiscount()`:
  - [x] Validate discount value
  - [x] Calculate proportional allocation for all items
  - [x] Create DiscountEvent with `allocationDetails`
  - [x] Update bill in ordersStore
  - [x] Recalculate order totals
  - [x] Return updated bill
- [x] Implement `removeDiscount()`:
  - [x] Soft delete DiscountEvent
  - [x] Recalculate affected order/bill
- [x] Implement `validateDiscount()`:
  - [x] Check discount limits
  - [x] Check user permissions
  - [x] Return validation result

**Example: Bill Discount with Allocation**

```typescript
// src/stores/discounts/services/discountService.ts
export async function applyBillDiscount(params: {
  billId: string
  discountType: 'percentage' | 'fixed'
  value: number
  reason: DiscountReason
  appliedBy: string
  notes?: string
}): Promise<DiscountEvent> {
  const bill = /* get bill from ordersStore */
  const billItems = /* get all items in bill */

  // Calculate bill subtotal
  const billSubtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0)

  // Calculate discount amount
  const discountAmount = params.discountType === 'percentage'
    ? billSubtotal * (params.value / 100)
    : params.value

  // Calculate proportional allocation for each item
  const itemAllocations = billItems.map(item => {
    const proportion = item.totalPrice / billSubtotal
    const allocatedDiscount = discountAmount * proportion

    return {
      itemId: item.id,
      itemAmount: item.totalPrice,
      proportion,
      allocatedDiscount
    }
  })

  // Create discount event with allocation details
  const discountEvent: DiscountEvent = {
    id: generateId(),
    type: 'bill',
    discountType: params.discountType,
    value: params.value,
    reason: params.reason,
    appliedBy: params.appliedBy,
    appliedAt: TimeUtils.getCurrentLocalISO(),
    orderId: bill.orderId,
    billId: bill.id,
    originalAmount: billSubtotal,
    discountAmount,
    finalAmount: billSubtotal - discountAmount,
    allocationDetails: {
      totalBillAmount: billSubtotal,
      itemAllocations
    },
    notes: params.notes,
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }

  // Save to discountsStore and database
  await discountsStore.addDiscountEvent(discountEvent)

  // Update bill in ordersStore
  await ordersStore.updateBillDiscount(bill.id, discountAmount)

  return discountEvent
}
```

#### Task 4: Integrate with Orders Store ✅

- [x] Update `useOrderCalculations.ts`:
  - [x] Add `calculateRevenueBreakdown()` function
  - [x] Return `RevenueBreakdown` object
  - [x] Include tax calculations
  - [x] Document proportional allocation logic
- [x] Update `ordersStore.ts`:
  - [x] Add `applyItemDiscount()` method
  - [x] Add `applyBillDiscount()` method
  - [x] Update `recalculateOrderTotals()` to populate `revenueBreakdown`
  - [x] Update `finalAmount` to be `totalCollected` (with taxes)
- [x] Update `services.ts`:
  - [x] Save `revenueBreakdown` when persisting orders
  - [x] Save discount events to Supabase

### Phase 2: UI Components (Sprint 7.2)

#### Task 5: Item Discount Dialog

- [ ] Create `src/views/pos/order/dialogs/ItemDiscountDialog.vue`
- [ ] Form fields:
  - [ ] Discount type selector (percentage / fixed)
  - [ ] Value input (with validation)
  - [ ] Reason dropdown (from `DISCOUNT_REASON_LABELS`)
  - [ ] Notes textarea (optional)
- [ ] Validation:
  - [ ] Max 100% for percentage
  - [ ] Max item price for fixed
  - [ ] Required reason selection
- [ ] Actions:
  - [ ] Apply discount → calls `discountService.applyItemDiscount()`
  - [ ] Cancel

**Example UI:**

```vue
<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>Apply Item Discount</v-card-title>
      <v-card-text>
        <div class="flex flex-col gap-md">
          <!-- Item info -->
          <div class="p-sm bg-surface-variant rounded">
            <div class="text-sm text-medium">{{ item.name }}</div>
            <div class="text-lg font-bold">{{ formatIDR(item.totalPrice) }}</div>
          </div>

          <!-- Discount type -->
          <v-btn-toggle v-model="discountType" mandatory>
            <v-btn value="percentage">Percentage (%)</v-btn>
            <v-btn value="fixed">Fixed Amount</v-btn>
          </v-btn-toggle>

          <!-- Value input -->
          <v-text-field
            v-model.number="discountValue"
            :label="discountType === 'percentage' ? 'Discount %' : 'Discount Amount'"
            :suffix="discountType === 'percentage' ? '%' : 'IDR'"
            type="number"
            :rules="valueRules"
          />

          <!-- Preview -->
          <div class="p-sm bg-success-container rounded">
            <div class="text-sm">Discount Amount</div>
            <div class="text-lg font-bold text-success">-{{ formatIDR(calculatedDiscount) }}</div>
            <div class="text-sm">Final Price</div>
            <div class="text-lg font-bold">
              {{ formatIDR(finalPrice) }}
            </div>
          </div>

          <!-- Reason -->
          <v-select
            v-model="reason"
            :items="discountReasons"
            label="Reason"
            :rules="[v => !!v || 'Reason is required']"
          />

          <!-- Notes -->
          <v-textarea v-model="notes" label="Notes (optional)" rows="2" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="applyDiscount" :disabled="!isValid">Apply Discount</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

#### Task 6: Bill Discount Dialog

- [ ] Update `src/views/pos/order/dialogs/BillDiscountDialog.vue`
- [ ] Add reason selection (currently missing)
- [ ] Add notes field
- [ ] Update to use new `discountService.applyBillDiscount()`
- [ ] Show discount preview with:
  - [ ] Total discount amount
  - [ ] Per-item allocation preview (expandable)
  - [ ] Tax impact calculation
- [ ] Validate discount amount

**Example: Show Allocation Preview**

```vue
<!-- In BillDiscountDialog.vue -->
<div class="allocation-preview">
  <div class="text-sm font-medium mb-2">Discount Allocation Preview:</div>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title>
        View per-item breakdown
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div v-for="allocation in allocationPreview" :key="allocation.itemId" class="flex justify-between py-1">
          <span class="text-sm">{{ allocation.itemName }}</span>
          <span class="text-sm font-medium">-{{ formatIDR(allocation.discount) }}</span>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</div>
```

#### Task 7: Update Order Display Components

- [ ] Update `OrderTotals.vue`:
  - [ ] Show "Planned Revenue" (subtotal before discounts)
  - [ ] Show "Item Discounts" breakdown
  - [ ] Show "Bill Discounts" breakdown
  - [ ] Show "Subtotal After Discounts" (actualRevenue)
  - [ ] Show "Service Tax (5%)"
  - [ ] Show "Government Tax (10%)"
  - [ ] Show "Total to Collect" (totalCollected)
- [ ] Update `BillItem.vue`:
  - [ ] Show discount indicator icon if item has discount
  - [ ] Show allocated bill discount (if any)
  - [ ] Show discount reason on hover/click
  - [ ] Add "Apply Discount" button → opens ItemDiscountDialog
- [ ] Update `OrderInfo.vue`:
  - [ ] Show discount summary (count, total amount)
  - [ ] Link to view all discount events for order

### Phase 3: Analytics & Reporting (Sprint 7.3)

#### Task 8: Discount Analytics Composables

- [ ] Create `src/stores/discounts/composables/useDiscountAnalytics.ts`
- [ ] Implement `getDailyRevenueReport()`:
  - [ ] Query orders for date range
  - [ ] Aggregate revenue metrics
  - [ ] Calculate discount statistics
  - [ ] Aggregate tax collection
  - [ ] Return `DailyRevenueReport`
- [ ] Implement `getDiscountSummary()`:
  - [ ] Query discount events for period with filters
  - [ ] Calculate total discounts and count
  - [ ] Group by reason with percentages
  - [ ] Sort by amount descending
  - [ ] Return `DiscountSummary`
- [ ] Implement `getDiscountTransactions()`:
  - [ ] Query discount events with order context
  - [ ] Join with orders and users tables
  - [ ] For bill discounts: format allocation as simple string
  - [ ] Support filtering by `DiscountFilterOptions`
  - [ ] Support pagination
  - [ ] Return `DiscountTransactionView[]`

#### Task 9: Revenue Dashboard View

- [ ] Create `src/views/analytics/RevenueDashboard.vue`
- [ ] Display daily revenue metrics:
  - [ ] Planned Revenue (before discounts)
  - [ ] Actual Revenue (after discounts, before tax)
  - [ ] Total Collected (with taxes)
  - [ ] Total Discounts (amount and %)
  - [ ] Total Taxes Collected
- [ ] Display discount breakdown:
  - [ ] By reason (chart)
  - [ ] By type (item vs bill)
  - [ ] Top discount reasons table
- [ ] Display tax collection:
  - [ ] Service Tax collected
  - [ ] Government Tax collected
  - [ ] Total tax liability
- [ ] Add date range selector
- [ ] Add export to CSV functionality

**Example Dashboard Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  Daily Revenue Report - January 15, 2024                   │
├────────────────────────────────────────────────────────────┤
│  📊 Revenue Metrics                                        │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │ Planned      │ Actual       │ Total        │          │
│  │ Revenue      │ Revenue      │ Collected    │          │
│  ├──────────────┼──────────────┼──────────────┤          │
│  │ Rp 10.5M     │ Rp 9.8M      │ Rp 11.3M     │          │
│  │              │ -6.7%        │ +7.6%        │          │
│  └──────────────┴──────────────┴──────────────┘          │
│                                                             │
│  💸 Discounts Applied: Rp 700K (6.7% of planned)          │
│     • Item Discounts: Rp 200K (28.6%)                     │
│     • Bill Discounts: Rp 500K (71.4%)                     │
│                                                             │
│  📈 Taxes Collected: Rp 1.5M                               │
│     • Service Tax (5%): Rp 490K                           │
│     • Government Tax (10%): Rp 980K                       │
│                                                             │
├────────────────────────────────────────────────────────────┤
│  🎯 Top Discount Reasons                                   │
│  ┌────────────────────────────┬──────┬─────────────┐     │
│  │ Reason                     │ Count│ Total       │     │
│  ├────────────────────────────┼──────┼─────────────┤     │
│  │ Customer Complaint         │  12  │ Rp 350K     │     │
│  │ Service Delay              │   8  │ Rp 200K     │     │
│  │ Birthday Promotion         │   5  │ Rp 150K     │     │
│  └────────────────────────────┴──────┴─────────────┘     │
└────────────────────────────────────────────────────────────┘
```

#### Task 10: Discount Analytics Dashboard (Simplified)

- [ ] Create `src/views/analytics/DiscountAnalytics.vue`
- [ ] **Summary Cards**:
  - [ ] Total discounts for period (amount + count)
  - [ ] Display using simple stat cards
- [ ] **Breakdown by Reason Table**:
  - [ ] Simple table with columns: Reason, Count, Total Amount, %
  - [ ] Sort by amount descending
  - [ ] Show all reasons with totals
- [ ] **Filter Panel**:
  - [ ] Date range picker (default: last 30 days)
  - [ ] Reason multi-select dropdown
  - [ ] Type filter chips (All / Item / Bill)
  - [ ] Search input (order # or notes)
  - [ ] "Clear filters" button
- [ ] **Discount Transactions Table**:
  - [ ] Columns: Date/Time, Order #, Type, Reason, Amount, Applied By, Notes
  - [ ] Click order # to navigate to order details
  - [ ] For bill discounts: show allocation in tooltip or expandable row
  - [ ] Pagination (50 per page)
- [ ] **Export Button**:
  - [ ] Export to CSV (transactions with current filters)

**Example Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Discount Analytics                                         │
│  [Jan 1 - Jan 30, 2024 ▼]  [All Reasons ▼]  [All Types ▼] │
│  [Search order or notes...]              [Clear] [Export]  │
├─────────────────────────────────────────────────────────────┤
│  📊 Summary                                                 │
│  ┌──────────────────────┬──────────────────────┐          │
│  │ Total Discounts      │ Discount Count       │          │
│  │ Rp 15.2M             │ 530 discounts        │          │
│  └──────────────────────┴──────────────────────┘          │
│                                                             │
│  💰 Breakdown by Reason                                    │
│  ┌────────────────────┬───────┬──────────┬──────┐         │
│  │ Reason             │ Count │ Total    │ %    │         │
│  ├────────────────────┼───────┼──────────┼──────┤         │
│  │ Customer Complaint │  180  │ Rp 5.3M  │ 35%  │         │
│  │ Service Delay      │  106  │ Rp 3.0M  │ 20%  │         │
│  │ Birthday Promotion │   80  │ Rp 2.3M  │ 15%  │         │
│  │ Food Quality       │   75  │ Rp 2.1M  │ 14%  │         │
│  │ Other...           │   89  │ Rp 2.5M  │ 16%  │         │
│  └────────────────────┴───────┴──────────┴──────┘         │
│                                                             │
│  📋 Discount Transactions (530 records, page 1/11)         │
│  ┌──────┬─────┬──────┬───────────┬────────┬──────┬──────┐ │
│  │ Date │ Ord │ Type │ Reason    │ Amount │ By   │Notes │ │
│  ├──────┼─────┼──────┼───────────┼────────┼──────┼──────┤ │
│  │ 14:30│#1234│ Bill │Customer...│ 50K    │ John │ ...  │ │
│  │ 14:15│#1233│ Item │Food Qual..│ 25K    │ Jane │      │ │
│  │ 13:45│#1232│ Bill │Service... │ 30K    │ John │      │ │
│  │ ...  │ ... │ ...  │ ...       │ ...    │ ...  │ ...  │ │
│  └──────┴─────┴──────┴───────────┴────────┴──────┴──────┘ │
│  [< Previous]  [1] [2] [3] ... [11]  [Next >]             │
└─────────────────────────────────────────────────────────────┘
```

#### Task 11: Update Food Cost Analytics

- [ ] Update `src/stores/analytics/foodCostStore.ts`:
  - [ ] Use `actualRevenue` instead of `finalAmount` for food cost %
  - [ ] Add toggle: "Include Taxes in Revenue" (show both calculations)
  - [ ] Update calculations to use `RevenueBreakdown`
- [ ] Update food cost % formula:

  ```typescript
  // OLD (WRONG):
  foodCostPercentage = (totalCost / finalAmount) × 100
  // finalAmount excludes taxes → inflated %

  // NEW (CORRECT):
  foodCostPercentage = (totalCost / actualRevenue) × 100
  // OR with taxes:
  foodCostPercentage = (totalCost / totalCollected) × 100
  ```

### Phase 4: Testing & Documentation (Sprint 7.4)

#### Task 11: Integration Testing

- [ ] Test item discount flow:
  - [ ] Apply percentage discount
  - [ ] Apply fixed discount
  - [ ] Multiple discounts on same item
  - [ ] Verify revenue breakdown calculation
- [ ] Test bill discount flow:
  - [ ] Apply bill discount with items selected
  - [ ] Apply bill discount to full bill
  - [ ] **Verify proportional allocation accuracy**
  - [ ] Test with different item price combinations
  - [ ] Verify allocation sum equals total discount
- [ ] Test tax calculations:
  - [ ] Verify 5% service tax
  - [ ] Verify 10% government tax
  - [ ] Verify taxes applied after discounts
- [ ] Test revenue tracking:
  - [ ] Verify planned revenue = original prices
  - [ ] Verify actual revenue = after discounts
  - [ ] Verify total collected = with taxes
- [ ] Test discount analytics:
  - [ ] Daily revenue report accuracy
  - [ ] Discount breakdown by reason
  - [ ] Tax collection totals
  - [ ] Bill discount allocation reports

#### Task 12: Data Migration

- [ ] Create script to backfill existing orders:
  - [ ] Calculate `plannedRevenue` from bills
  - [ ] Set `actualRevenue` = current `finalAmount`
  - [ ] Calculate taxes (15% of actualRevenue)
  - [ ] Set `totalCollected` = actualRevenue + taxes
  - [ ] Create synthetic `DiscountEvent` records for existing discounts
  - [ ] **For bill discounts: calculate proportional allocation retroactively**
- [ ] Run migration on DEV database
- [ ] Verify data integrity
- [ ] Document migration process for PROD

#### Task 13: Documentation

- [ ] Update `CLAUDE.md`:
  - [ ] Document discount system architecture
  - [ ] Explain revenue breakdown structure
  - [ ] **Add section on proportional bill discount allocation**
  - [ ] Add examples of using discountService
- [ ] Create developer guide: `docs/discount-system.md`:
  - [ ] How to apply discounts
  - [ ] Revenue calculation logic
  - [ ] **Bill discount allocation algorithm**
  - [ ] Tax handling
  - [ ] Analytics usage
- [ ] Add JSDoc comments to all new types and functions
- [ ] Update API documentation (if applicable)

---

## 🔄 Next Sprints Preview

### Sprint 8: Approval Workflow & Limits

- Manager approval workflow for large discounts (>20%)
- Discount limit enforcement by role (configurable)
- Real-time notifications for pending approvals
- Approval history and audit trail
- Override capability for admins with logging

### Sprint 9: Advanced Analytics & Compliance

- Discount effectiveness analysis (impact on sales, profit margin)
- Promotion system integration
- Tax collection reports (for government filing)
- Discount policy compliance checking
- Customer-facing receipt with discount details
- Export to accounting software (e.g., Xero, QuickBooks)

---

## 📝 Notes & Considerations

### Revenue Terminology Clarification

In Russian (business context):

- **Плановая выручка** = Planned Revenue = Original prices before discounts
- **Реальная выручка** = Actual Revenue = After discounts, before tax
- **Общая выручка с налогами** = Total Collected = With taxes

In code:

```typescript
revenueBreakdown.plannedRevenue // Плановая выручка
revenueBreakdown.actualRevenue // Реальная выручка
revenueBreakdown.totalCollected // Общая выручка
```

### Tax Treatment Philosophy

**Current Decision**: Track both views

- `actualRevenue` = Revenue before tax (business income for profit calc)
- `totalCollected` = Total with tax (cash register amount)
- `totalTaxes` = Tax liability (pass-through to government)

This allows:

- Profit calculation without tax distortion
- Accurate food cost % (cost / actualRevenue)
- Tax liability tracking for compliance
- Flexible reporting (with/without tax)

### Performance Considerations

- **Denormalization**: Store `plannedRevenue`, `actualRevenue`, `totalCollected` directly in orders table for fast querying
- **Indexing**: Index discount_events by `order_id`, `applied_at`, `reason`, `type` for analytics queries
- **Caching**: Cache daily revenue reports (invalidate on new order)
- **Batch Updates**: When recalculating many orders, use batch update
- **Allocation Storage**: Store allocation details in JSONB for flexibility and performance

### Migration Strategy for Production

1. **Deploy code** with backward compatibility (support old and new fields)
2. **Run migration** to add new columns (non-breaking)
3. **Backfill data** for existing orders (background job, can run over days)
4. **Switch UI** to use new fields
5. **Deprecate old fields** (after 1 month)
6. **Remove old code** (after 2 months)

---

## ✅ Success Criteria

Sprint 7 is complete when:

- [ ] All discounts tracked with full metadata (who, when, why)
- [ ] **Bill discounts include proportional allocation details**
- [ ] Taxes persisted in orders and included in revenue tracking
- [ ] Revenue breakdown available in three views (planned, actual, total)
- [ ] UI allows applying item and bill discounts with reason selection
- [ ] **Bill discount dialog shows per-item allocation preview**
- [ ] Daily revenue report shows all key metrics
- [ ] **Discount Analytics Dashboard functional:**
  - [ ] Shows summary statistics (total discounts, count)
  - [ ] Shows breakdown by reason with percentages
  - [ ] Allows filtering by reason, type, date, search
  - [ ] Displays transaction list with pagination
  - [ ] Shows allocation for bill discounts (tooltip/expandable)
  - [ ] Supports export to CSV
- [ ] Food cost % calculation uses correct revenue denominator
- [ ] All migrations applied to DEV database
- [ ] Integration tests passing (including allocation accuracy tests)
- [ ] Documentation updated with allocation algorithm explanation

---

## 🚀 Getting Started

1. **Review this document** thoroughly
2. **Understand proportional allocation** - read examples in section above
3. **Run database migrations** on DEV using MCP tools
4. **Create discount store structure** (types, store, services)
5. **Implement core discount logic** (applyItemDiscount, applyBillDiscount with allocation)
6. **Build UI components** (dialogs for applying discounts)
7. **Integrate analytics** (daily revenue report + simple discount analytics)
8. **Test allocation accuracy** (verify proportional distribution)
9. **Test discount analytics** (filters, transactions, export)
10. **Deploy to DEV** for user testing

**Estimated effort**: 3-4 days (with simplified analytics, testing and documentation)

---

_Last updated: 2024-12-03_
_Sprint: 7 - Centralized Discount System_
_Status: Ready to implement_
