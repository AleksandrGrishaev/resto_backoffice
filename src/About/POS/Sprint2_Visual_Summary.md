# Sprint 2: Visual Summary

**Quick Reference Guide**

---

## 🎯 Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                         SPRINT 2                            │
│                                                             │
│  POS Sales → Decomposition → Write-off → Profit Analysis   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Flow

```
┌──────────────┐
│  POS: Sale   │  User sells "Nasi Goreng with Chicken" × 1
│  50,000 IDR  │  Payment: Cash
└──────┬───────┘
       │
       │ 1. Payment Success
       ▼
┌──────────────────────────┐
│  Record Sales            │
│  - Create SalesTransaction
│  - Link to payment       │
└──────┬───────────────────┘
       │
       │ 2. Trigger Write-off
       ▼
┌──────────────────────────┐
│  Decompose Menu Item     │ ⭐ NEW: Recursive decomposition
│                          │
│  "Nasi Goreng + Chicken" │
│         ↓                │
│  Recipe (6 items)        │
│  + Product (1 item)      │
│         ↓                │
│  7 final products        │
└──────┬───────────────────┘
       │
       │ 3. Calculate Quantities
       ▼
┌──────────────────────────┐
│  Decomposed Items:       │
│                          │
│  Rice:      250g → 2,500 │
│  Garlic:     10g →   200 │
│  Onion:      20g →   300 │
│  Soy Sauce:  15ml→   150 │
│  Oil:        20ml→   100 │
│  Egg:        1pc → 2,000 │
│  Chicken:   150g → 6,000 │
│                          │
│  Total Cost: 11,250      │
└──────┬───────────────────┘
       │
       │ 4. Write-off (FIFO)
       ▼
┌──────────────────────────┐
│  Update Storage          │
│                          │
│  Rice:    50kg → 49.75kg │
│  Chicken: 20kg → 19.85kg │
│  ...                     │
│                          │
│  (Allows negative stock) │
└──────┬───────────────────┘
       │
       │ 5. Calculate Profit
       ▼
┌──────────────────────────┐
│  Profit Calculation      │ ⭐ NEW: With discounts
│                          │
│  Revenue:   50,000       │
│  Cost:      11,250       │
│  Profit:    38,750       │
│  Margin:    77.5%        │
└──────┬───────────────────┘
       │
       │ 6. Store Data
       ▼
┌──────────────────────────┐
│  Records Created:        │
│                          │
│  ✅ SalesTransaction     │
│  ✅ RecipeWriteOff       │
│  ✅ StorageOperation     │
└──────┬───────────────────┘
       │
       │ 7. View in Backoffice
       ▼
┌──────────────────────────┐
│  Backoffice Analytics    │
│                          │
│  📊 Revenue: 50,000      │
│  📉 Cost: 11,250         │
│  💰 Profit: 38,750       │
│  📈 Margin: 77.5%        │
└──────────────────────────┘
```

---

## 🔍 Decomposition in Detail

```
MenuItem: "Nasi Goreng with Chicken"
├── Variant: "Standard"
    ├── Composition[0]: Recipe "Nasi Goreng"
    │   └── Components:
    │       ├── Product "Rice" (250g)         ──→ FINAL
    │       ├── Product "Garlic" (10g)        ──→ FINAL
    │       ├── Product "Onion" (20g)         ──→ FINAL
    │       ├── Product "Soy Sauce" (15ml)    ──→ FINAL
    │       ├── Product "Oil" (20ml)          ──→ FINAL
    │       └── Product "Egg" (1pc)           ──→ FINAL
    │
    └── Composition[1]: Product "Chicken" (150g) ──→ FINAL

Result: 7 products to write off
```

---

## 💰 Profit Calculation Scenarios

### Scenario 1: No Discounts

```
┌─────────────────────────┐
│ Item: Nasi Goreng       │
│ Price: 50,000           │
│ No discounts            │
├─────────────────────────┤
│ Revenue:    50,000      │
│ Cost:       11,250      │
│ Profit:     38,750      │
│ Margin:     77.5%       │
└─────────────────────────┘
```

### Scenario 2: Item Discount

```
┌─────────────────────────┐
│ Item: Nasi Goreng       │
│ Price: 50,000           │
│ Discount: 10% = -5,000  │
├─────────────────────────┤
│ Revenue:    45,000      │
│ Cost:       11,250      │
│ Profit:     33,750      │
│ Margin:     75%         │
└─────────────────────────┘
```

### Scenario 3: Bill Discount (Proportional)

```
┌─────────────────────────────────────────┐
│ Bill Total: 100,000                     │
│ Bill Discount: 10,000 (10%)             │
└─────────────────────────────────────────┘
       │
       │ Split proportionally:
       ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Item 1: Nasi Goreng     │  │ Item 2: Teh Manis       │
│ Original:   50,000      │  │ Original:   10,000      │
│ Proportion: 50% (50k)   │  │ Proportion: 10% (10k)   │
│ Allocated:  -5,000      │  │ Allocated:  -1,000      │
├─────────────────────────┤  ├─────────────────────────┤
│ Revenue:    45,000      │  │ Revenue:    9,000       │
│ Cost:       11,250      │  │ Cost:       2,000       │
│ Profit:     33,750      │  │ Profit:     7,000       │
└─────────────────────────┘  └─────────────────────────┘
```

### Scenario 4: Bundle (Free Item)

```
┌─────────────────────────────────────────┐
│ Deal: "Breakfast + Free Coffee"        │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Item 1: Pancakes        │  │ Item 2: Coffee          │
│ Price:      45,000      │  │ Price:      15,000      │
│ Discount:   0           │  │ Discount:   100% (free) │
├─────────────────────────┤  ├─────────────────────────┤
│ Revenue:    45,000      │  │ Revenue:    0           │
│ Cost:       15,000      │  │ Cost:       3,000       │
│ Profit:     30,000      │  │ Profit:     -3,000 ❌   │
└─────────────────────────┘  └─────────────────────────┘
                │                        │
                └────────┬───────────────┘
                         ▼
                ┌─────────────────────────┐
                │ Total Bundle:           │
                │ Revenue:    45,000      │
                │ Cost:       18,000      │
                │ Profit:     27,000 ✅   │
                │ Margin:     60%         │
                └─────────────────────────┘
```

---

## 🏗️ Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SALES & PROFIT SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐          ┌──────────────────┐       │
│  │  SalesStore      │          │ RecipeWriteOff   │       │
│  │                  │          │ Store            │       │
│  │ - Record sales   │◄────────►│ - Decompose      │       │
│  │ - Calculate      │          │ - Write-off      │       │
│  │   profit         │          │ - Audit trail    │       │
│  └────────┬─────────┘          └────────┬─────────┘       │
│           │                             │                  │
│           │  Uses composables:          │                  │
│           │                             │                  │
│  ┌────────▼─────────┐          ┌───────▼──────────┐       │
│  │ useProfitCalc    │          │ useDecomposition │       │
│  │                  │          │                  │       │
│  │ - Discount alloc │          │ - Recursive      │       │
│  │ - Profit formula │          │   resolver       │       │
│  │ - Bundle logic   │          │ - Product merger │       │
│  └──────────────────┘          └──────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models

```typescript
// Sales Transaction (Main record)
SalesTransaction {
  paymentId       ────┐
  orderId             │
  billId              ├─ Links to POS data
  itemId              │
  menuItemId     ─────┘

  quantity            ─── Sold portions
  unitPrice           ─┬─ Revenue data
  totalPrice          ─┘

  profitCalculation {
    originalPrice           ─┐
    itemOwnDiscount          ├─ Revenue breakdown
    allocatedBillDiscount    │
    finalRevenue            ─┘

    ingredientsCost         ─── Cost from decomposition

    profit                  ─┬─ Profit metrics
    profitMargin            ─┘
  }

  decompositionSummary {
    totalProducts           ─── Count of products
    totalCost               ─── Total ingredients cost
    decomposedItems[]       ─── List of products used
  }
}

// Recipe Write-off (Audit record)
RecipeWriteOff {
  salesTransactionId  ────── Link to sale
  menuItemId
  variantId
  recipeId

  decomposedItems[] {
    productId               ─┬─ Final product
    quantity                 ├─ Amount used
    unit                     │
    costPerUnit              │
    totalCost               ─┘
    path[]                  ─── Trace (for debug)
  }

  storageOperationId  ────── Link to storage operation
}

// Decomposed Item (Intermediate)
DecomposedItem {
  productId               ─── Final product ID
  productName
  quantity                ─── Total quantity
  unit                    ─── gram, ml, piece
  costPerUnit             ─┬─ Cost data
  totalCost               ─┘
  path[]                  ─── Decomposition trace
}
```

---

## 🧪 Test Checklist

```
✅ Decomposition:
   □ Simple product (direct)
   □ Recipe (1 level)
   □ Preparation (1 level)
   □ Nested recipe (2+ levels)
   □ Mixed composition
   □ Duplicate products merged

✅ Profit Calculation:
   □ No discount
   □ Item discount (%)
   □ Item discount (fixed)
   □ Bill discount (proportional)
   □ Bundle deal (100% discount)
   □ Complex combo (item + bill)

✅ Write-off:
   □ FIFO batch selection
   □ Storage balance updated
   □ Negative stock allowed
   □ Audit trail created

✅ Integration:
   □ POS → Sales recording
   □ Sales → Write-off trigger
   □ Write-off → Storage update
   □ Data persisted correctly

✅ UI:
   □ Sales analytics view
   □ Transactions list
   □ Write-off history
   □ Filters work
   □ Navigation works
```

---

## 🎯 Quick Start

```
Day 1: Foundation
├── Morning:   Create types (2h)
└── Afternoon: Create services (2h)

Day 2: Core Logic ⭐
├── Morning:   Decomposition engine (3h)
└── Afternoon: Profit calculation (3h)

Day 3: Integration
├── Morning:   Sales store (2h)
└── Afternoon: POS integration (2h)

Day 4: UI
├── Morning:   Sales views (2h)
└── Afternoon: Write-off view + testing (2h)
```

---

## 🔑 Key Files

```
New:
  src/stores/sales/
    ├── composables/useProfitCalculation.ts  ⭐
    └── recipeWriteOff/
        └── composables/useDecomposition.ts  ⭐

Update:
  src/stores/pos/payments/paymentsStore.ts
    → Add: await salesStore.recordSalesTransaction()
```

---

## 💡 Key Insights

```
1. Decomposition = Recursive flattening
   MenuItem → Recipe → Preparation → Product

2. Discounts = Proportional allocation
   Bill discount split by item price proportion

3. Bundles = 100% discount item
   Individual loss, overall profit

4. FIFO = Already implemented
   Use existing storageStore logic

5. Negative stock = Allowed
   Warning system = Future feature
```

---

## 📈 Success Metrics

```
Performance:
  Decomposition:  < 50ms  per item
  Write-off:      < 100ms per item
  Profit calc:    < 50ms  per item
  Total:          < 500ms per sale

Accuracy:
  100% of sales recorded
  100% of ingredients written off
  Profit calculations ±0.01% accurate
  Discount allocations sum correctly
```

---

## 🎉 End Result

```
┌───────────────────────────────────────────────────┐
│          BACKOFFICE SALES ANALYTICS               │
├───────────────────────────────────────────────────┤
│                                                   │
│  Today's Summary:                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ Revenue     │ │ Cost        │ │ Profit     │ │
│  │ 500,000     │ │ 125,000     │ │ 375,000    │ │
│  │ +15% ↑      │ │ +5% ↑       │ │ +20% ↑     │ │
│  └─────────────┘ └─────────────┘ └────────────┘ │
│                                                   │
│  Top Items (by profit):                           │
│  1. Nasi Goreng    ✅ Sold: 50  Profit: 150,000  │
│  2. Mie Goreng     ✅ Sold: 40  Profit: 120,000  │
│  3. Ayam Bakar     ✅ Sold: 30  Profit: 105,000  │
│                                                   │
│  Payment Methods:                                 │
│  💵 Cash: 60%    💳 Card: 30%    📱 QR: 10%      │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

**Ready to implement! 🚀**

All architecture finalized, all edge cases handled, clear implementation path.

---

**Created**: 2025-11-07
