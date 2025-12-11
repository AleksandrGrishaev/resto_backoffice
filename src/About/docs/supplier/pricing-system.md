# Pricing System Architecture

> **Module:** Supplier / Products
> **Last Updated:** December 11, 2025

This document describes how product prices work in the Kitchen App, including price fields, update flows, and usage guidelines.

---

## Price Fields Overview

### Product Price Fields

| Field             | Type                  | Purpose                                                  | Auto-Updated | When Updated              |
| ----------------- | --------------------- | -------------------------------------------------------- | ------------ | ------------------------- |
| `baseCostPerUnit` | `number`              | Base/etalon price per unit (IDR/gram, IDR/ml, IDR/piece) | Yes\*        | On receipt (if different) |
| `lastKnownCost`   | `number \| undefined` | Last actual price from receipt                           | Yes          | On receipt completion     |

\* `baseCostPerUnit` is updated on receipt only if the actual price differs from the current value.

### Package Option Price Fields

| Field             | Type                  | Purpose                              | Auto-Updated     |
| ----------------- | --------------------- | ------------------------------------ | ---------------- |
| `baseCostPerUnit` | `number`              | Price per base unit for this package | Yes (on receipt) |
| `packagePrice`    | `number \| undefined` | Total price per package (calculated) | Yes (on receipt) |
| `packageSize`     | `number`              | Quantity of base units in package    | No               |

---

## Price Priority Rules

### When Creating a Request

```
1. User-entered price (if provided)     → HIGHEST PRIORITY
2. product.lastKnownCost (if exists)    → From last receipt
3. product.baseCostPerUnit              → Fallback/default
```

**Code location:** `supplierStore.ts:enhanceRequestWithLatestPrices()`

### When Creating an Order

```
1. item.pricePerUnit (from basket)      → Comes from request
2. product.lastKnownCost                → If no basket price
3. package.baseCostPerUnit              → Fallback
```

**Code location:** `supplierService.ts:createOrder()`

### When Displaying Package Price

```
1. overrideBaseCost × packageSize       → From request/basket
2. package.packagePrice                 → Fixed package price
3. package.baseCostPerUnit × packageSize → Calculated
```

**Code location:** `PackageSelector.vue:getPackagePrice()`

---

## Price Update Flows

### Flow 1: Receipt Completion (Automatic)

When a receipt is completed with actual prices:

```
Receipt completed with actualPrice (already per base unit)
         ↓
storageIntegration.updateSingleProductPrice()
         ↓
pricePerUnit = actualPrice (no conversion needed)
         ↓
┌───────────────────────────────────────────────────┐
│ 1. UPDATE products                                │
│    SET last_known_cost = pricePerUnit             │
│    SET base_cost_per_unit = pricePerUnit          │ ← if different
│    WHERE id = item.itemId                         │
│                                                   │
│ 2. UPDATE package_options                         │
│    SET base_cost_per_unit = pricePerUnit          │
│    SET package_price = pricePerUnit × packageSize │
│    WHERE id = item.packageId                      │
└───────────────────────────────────────────────────┘
         ↓
Update in-memory state
```

**What gets updated:**

- `products.last_known_cost` — always updated
- `products.base_cost_per_unit` — updated if different from actualPrice
- `package_options.base_cost_per_unit` — always updated
- `package_options.package_price` — always updated (calculated)

**Files involved:**

- `src/stores/supplier_2/integrations/storageIntegration.ts`
- `src/stores/storage/storageService.ts` (also updates `last_known_cost`)

### Flow 2: Manual Price Edit

When user manually updates product base cost:

```
User edits baseCostPerUnit in product settings
         ↓
productsStore.updateProductCost(productId, newBaseCost)
         ↓
┌─────────────────────────────────────────┐
│ 1. UPDATE products                      │
│    SET base_cost_per_unit = newBaseCost │
│    WHERE id = productId                 │
│                                         │
│ 2. UPDATE package_options               │
│    SET base_cost_per_unit = newBaseCost │
│    WHERE id = recommendedPackageId      │
└─────────────────────────────────────────┘
         ↓
Update in-memory state
```

**Files involved:**

- `src/stores/productsStore/productsStore.ts`
- `src/stores/productsStore/productsService.ts`

---

## Usage Guidelines

### Getting Product Price

```typescript
import { useProductsStore } from '@/stores/productsStore'

const productsStore = useProductsStore()
const product = productsStore.getProductById(productId)

// Get the most recent known price
const price = product.lastKnownCost ?? product.baseCostPerUnit
```

### Getting Package Price

```typescript
const pkg = productsStore.getPackageById(packageId)

// Package price (total for package)
const packagePrice = pkg.packagePrice ?? pkg.baseCostPerUnit * pkg.packageSize

// Price per base unit
const pricePerUnit = pkg.baseCostPerUnit
```

### Creating Request with Custom Price

```typescript
const requestItem = {
  itemId: product.id,
  requestedQuantity: 5000, // 5kg in grams
  estimatedPrice: 15000, // Custom price per base unit (IDR/gram)
  unit: 'gram'
}
```

If `estimatedPrice` is provided and > 0, it will be preserved through the entire flow.

### Updating Product Price After Receipt

This happens automatically when receipt is completed:

1. `useReceipts.completeReceipt()` calls `updateProductPrices()`
2. For each item with `actualPrice > 0`:
   - Updates `products.last_known_cost`
   - Updates `products.base_cost_per_unit` (if different)
   - Updates `package_options.base_cost_per_unit`
   - Updates `package_options.package_price`

**Important:** `actualPrice` is stored as price per BASE UNIT (e.g., IDR/gram), not per package.

No manual action needed.

---

## Database Schema

### products table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  base_cost_per_unit DECIMAL(10, 2) NOT NULL,  -- Etalon price
  last_known_cost NUMERIC(10, 2),               -- From last receipt
  base_unit TEXT CHECK (base_unit IN ('gram', 'ml', 'piece')),
  ...
);
```

### package_options table

```sql
CREATE TABLE package_options (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  package_name TEXT NOT NULL,
  package_size DECIMAL(10, 3) NOT NULL,         -- Qty of base units
  package_unit TEXT NOT NULL,                   -- 'pack', 'bottle', etc.
  base_cost_per_unit DECIMAL(10, 2) NOT NULL,   -- Price per base unit
  package_price DECIMAL(10, 2),                 -- Optional fixed price
  ...
);
```

---

## Common Scenarios

### Scenario 1: New Product (No Receipt History)

```
lastKnownCost = undefined
baseCostPerUnit = 30 IDR/gram (set during product creation)

→ System uses baseCostPerUnit (30 IDR/gram) for all calculations
→ After first receipt, lastKnownCost and baseCostPerUnit will be updated
```

### Scenario 2: Product with Receipt History

```
After receipt completion:
lastKnownCost = 25 IDR/gram (from last receipt)
baseCostPerUnit = 25 IDR/gram (auto-updated to match)

→ All prices stay in sync after each receipt
→ System uses lastKnownCost for requests/orders
```

### Scenario 3: User Enters Custom Price

```
User creates request with estimatedPrice = 20000

→ This price is preserved through:
  - Request creation
  - Basket grouping
  - Order creation
→ baseCostPerUnit and lastKnownCost are ignored
```

### Scenario 4: Receipt with Different Price

```
Order created with pricePerUnit = 25 IDR/gram
Receipt completed with actualPrice = 27 IDR/gram
Package: 1kg (1000g)

→ actualPrice is already per base unit (no conversion)
→ Updates:
  - products.last_known_cost = 27
  - products.base_cost_per_unit = 27 (was 25, now updated)
  - package_options.base_cost_per_unit = 27
  - package_options.package_price = 27000 (27 × 1000)
→ Next request will show 27 IDR/gram (27,000 IDR/kg)
```

---

## Troubleshooting

### Price Not Updating After Receipt

1. Check if `actualPrice > 0` in receipt item
2. Check browser console for log: `Product price updated from receipt`
3. Check for errors from `SupplierStorageIntegration`
4. Verify package exists: `productsStore.getPackageById(packageId)`
5. Ensure `useReceipts.completeReceipt()` is being called (not direct status update)

### User Price Being Overwritten

1. Ensure `estimatedPrice > 0` in request item
2. Check `enhanceRequestWithLatestPrices()` is respecting user price
3. Verify `createOrder()` is using `item.pricePerUnit`

### Package Price Showing Wrong Value

1. Check `overrideBaseCost` prop in `PackageSelector`
2. Verify `pkg.baseCostPerUnit` is correct in database
3. Check if `pkg.packagePrice` is set (takes priority)

---

## Version History

| Version | Date         | Changes                                                           |
| ------- | ------------ | ----------------------------------------------------------------- |
| 1.2     | Dec 11, 2025 | Updated scenarios and troubleshooting with accurate info          |
| 1.1     | Dec 11, 2025 | Added auto-update for baseCostPerUnit and packagePrice on receipt |
| 1.0     | Dec 11, 2025 | Initial documentation after pricing flow refactor                 |
