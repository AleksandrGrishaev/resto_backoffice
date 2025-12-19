# Recipe System Architecture

**Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Kitchen App Team

---

## Table of Contents

1. [Overview](#overview)
2. [Level 1: Products](#level-1-products)
3. [Level 2: Preparations](#level-2-preparations)
4. [Level 3: Recipes](#level-3-recipes)
5. [Level 4: Menu Items](#level-4-menu-items)
6. [Modifier System](#modifier-system)
7. [Cost Calculation](#cost-calculation)
8. [Real-World Use Cases](#real-world-use-cases)
9. [Best Practices](#best-practices)
10. [Export & Reporting](#export--reporting)

---

## Overview

The Kitchen App uses a **4-level hierarchical system** for managing food products, recipes, and menu items:

```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: PRODUCTS (Raw ingredients)                         │
│ - Purchased from suppliers                                  │
│ - Base units: gram, ml, piece                               │
│ - Cost per unit tracking                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓ used in
┌─────────────────────────────────────────────────────────────┐
│ Level 2: PREPARATIONS (Semi-finished products)              │
│ - Made in batches, stored, then used                        │
│ - Recipe = products + other preparations                    │
│ - FIFO batch tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓ used in
┌─────────────────────────────────────────────────────────────┐
│ Level 3: RECIPES (Finished dishes)                          │
│ - Made to order (fresh)                                     │
│ - Components = products + preparations                      │
│ - Cost calculated from components                           │
└─────────────────────────────────────────────────────────────┘
                              ↓ used in
┌─────────────────────────────────────────────────────────────┐
│ Level 4: MENU ITEMS (Customer-facing menu)                  │
│ - Source of truth for pricing                               │
│ - Composition = products + preparations + recipes           │
│ - Modifier system for customization                         │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **Hierarchical Composition**: Each level can reference lower levels
2. **Cost Inheritance**: Cost flows upward (products → preparations → recipes → menu items)
3. **Single Source of Truth**: Menu Items define final pricing and available options
4. **Reusability**: Define once, use everywhere (DRY principle)

---

## Level 1: Products

**Location:** `src/stores/productsStore/types.ts`

### Data Structure

```typescript
interface Product {
  id: string // UUID
  name: string // Display name
  code: string // Required, auto-generated unique code

  // Units & Measurement
  baseUnit: 'gram' | 'ml' | 'piece' // Base measurement unit
  baseCostPerUnit: number // Cost per base unit (Rp/gram, Rp/ml, Rp/piece)
  yieldPercentage: number // % after cleaning/processing (0-100)

  // Package Options
  packageOptions: PackageOption[] // Different purchase/sale packages

  // Organization
  category: string // UUID (FK to product_categories)
  usedInDepartments: Department[] // 'kitchen' | 'bar'

  // Sales
  canBeSold: boolean // Can be sold directly to customers
}

interface PackageOption {
  id: string
  name: string // e.g., "1kg bag", "500ml bottle"
  quantityInBaseUnit: number // e.g., 1000 (for 1kg), 500 (for 500ml)
  purchasePrice?: number // Supplier price for this package
  sellingPrice?: number // Retail price (if canBeSold = true)
  barcode?: string
  isDefault: boolean
}
```

### Key Features

**Base Units Only**

- All internal calculations use base units (gram/ml/piece)
- Package options are for purchase/display only
- Conversion: `1kg bag = 1000 grams`

**Yield Percentage**

- Accounts for cleaning/processing losses
- Example: Potato with 85% yield
  - Buy 1000g → usable 850g
  - Adjusted cost = `baseCostPerUnit / (yieldPercentage / 100)`

**Cost Calculation**

```typescript
// Without yield adjustment
cost = quantity * baseCostPerUnit

// With yield adjustment (useYieldPercentage = true)
adjustedQuantity = quantity / (yieldPercentage / 100)
cost = adjustedQuantity * baseCostPerUnit
```

### When to Use Products

✅ **Use Products for:**

- Raw ingredients from suppliers (vegetables, meat, spices, etc.)
- Simple items sold directly (bottled water, canned drinks)

❌ **Don't Use Products for:**

- Prepared items (use Preparations or Recipes)
- Composite dishes (use Menu Items)

---

## Level 2: Preparations

**Location:** `src/stores/preparation/types.ts`

### Data Structure

```typescript
interface Preparation {
  id: string
  name: string
  code: string // Required, auto-generated

  // Classification
  type: string // UUID (FK to preparation_categories)
  department: 'kitchen' | 'bar'

  // Recipe Composition (⭐ KEY FEATURE)
  recipe: PreparationIngredient[] // Can include products OR other preparations!

  // Output
  outputQuantity: number // How much is produced
  outputUnit: 'gram' | 'ml' // Base units only

  // Costing
  costPerPortion?: number // Cost per gram/ml (calculated)
  lastKnownCost?: number // Last actual production cost (FIFO)

  // Future: Portion type support (Phase 2)
  portionType?: 'weight' | 'portion'
  portionSize?: number
}

interface PreparationIngredient {
  type: 'product' | 'preparation' // ⭐ SUPPORTS NESTED PREPARATIONS!
  id: string // Product ID or Preparation ID
  quantity: number
  unit: MeasurementUnit // Any unit (converted to base units)
  useYieldPercentage?: boolean // Apply yield % adjustment
}
```

### Key Features

**⭐ Nested Preparations (Multi-level)**

- Preparations can use other preparations as ingredients
- Example: "Pizza Dough" preparation can use "Yeast Mix" preparation
- Recursive cost calculation supported

**Batch Production**

- Preparations are typically made in batches
- FIFO cost tracking via batches
- `lastKnownCost` updated after each production batch

**Cost Calculation (Recursive)**

```typescript
// For each ingredient in preparation.recipe:
for (ingredient of preparation.recipe) {
  if (ingredient.type === 'product') {
    // Direct product cost
    cost += calculateProductCost(quantity, product, useYield)
  } else if (ingredient.type === 'preparation') {
    // Use cached cost or lastKnownCost or costPerPortion
    unitCost = getCachedCost() || prep.lastKnownCost || prep.costPerPortion
    cost += unitCost * ingredient.quantity
  }
}

// Cost per output unit
costPerOutputUnit = totalCost / preparation.outputQuantity
```

### When to Use Preparations

✅ **Use Preparations for:**

- Semi-finished products made in batches (dough, sauces, marinades)
- Reusable components in multiple recipes (hash-brown, toast)
- Items that can be produced ahead and stored

❌ **Don't Use Preparations for:**

- Final dishes sold to customers (use Menu Items)
- Simple raw ingredients (use Products)

**Note:** While conceptually preparations are "pre-made items," they can also represent sub-recipes that are made fresh to order. The system is flexible.

---

## Level 3: Recipes

**Location:** `src/stores/recipes/types.ts`

### Data Structure

```typescript
interface Recipe {
  id: string
  name: string
  code: string // Required, auto-generated

  // Classification
  category: string // UUID (FK to recipe_categories)
  department: 'kitchen' | 'bar'

  // Serving Size
  portionSize: number
  portionUnit: string

  // Components
  components: RecipeComponent[]

  // Costing
  cost?: number // Calculated from components
}

interface RecipeComponent {
  id: string
  componentId: string
  componentType: 'product' | 'preparation' // ⚠️ NO 'recipe' type (no nesting)
  quantity: number
  unit: MeasurementUnit
  useYieldPercentage?: boolean
}
```

### Key Features

**No Recipe Nesting**

- Recipes cannot include other recipes as components
- Only products and preparations allowed
- This is intentional: use Menu Items for composite dishes

**Cost Calculation**

```typescript
for (component of recipe.components) {
  if (component.componentType === 'product') {
    cost += calculateProductCost(quantity, product, useYield)
  } else if (component.componentType === 'preparation') {
    // Use cached preparation cost
    cost += preparationCost.costPerOutputUnit * quantity
  }
}
```

### When to Use Recipes

✅ **Use Recipes for:**

- Finished dishes made to order (hash-brown, omelet, pasta)
- Reusable dish components in composite menu items
- Base recipes for menu variants

❌ **Don't Use Recipes for:**

- Batch-produced items (use Preparations)
- Complex composite dishes with choices (use Menu Items with modifiers)

**Important:** Recipes are primarily used as building blocks for Menu Items. They define "how to make it" but not "how to sell it."

---

## Level 4: Menu Items

**Location:** `src/stores/menu/types.ts`

### Data Structure

```typescript
interface MenuItem {
  id: string
  name: string // Customer-facing name

  // Type
  dishType: 'simple' | 'modifiable' // With or without modifiers
  department: 'kitchen' | 'bar'

  // Variants
  variants: MenuItemVariant[] // Different size/style options

  // Modifiers (for dishType = 'modifiable')
  modifierGroups?: ModifierGroup[]
}

interface MenuItemVariant {
  id: string
  name: string // e.g., "Small", "Regular", "Large"
  price: number // ⭐ SOURCE OF TRUTH for pricing

  // Composition
  composition: MenuComposition[] // What's in this variant
}

interface MenuComposition {
  type: 'product' | 'recipe' | 'preparation' // ⭐ Can use all types!
  id: string
  quantity: number
  unit: MeasurementUnit
  role?: 'main' | 'garnish' | 'sauce' | 'addon'
  useYieldPercentage?: boolean
}
```

### Key Features

**Source of Truth**

- Menu Items define final customer-facing prices
- Same recipe can have different prices in different menu items
- Example: Hash-brown costs 5k to make
  - Standalone menu item: 25k (500% markup)
  - Part of Big Breakfast: included in 75k bundle

**Composition Flexibility**

- Can directly use products (e.g., bottled water)
- Can use preparations (e.g., sauce, dough)
- Can use recipes (e.g., hash-brown, omelet)

**Variants vs Modifiers**

- **Variants**: Pre-defined options (Small/Regular/Large)
  - Each variant has its own composition and price
- **Modifiers**: Customer choices during ordering
  - Addon, replacement, removal
  - Price adjustments

### When to Use Menu Items

✅ **Always use Menu Items for:**

- Everything sold to customers
- Items in POS system
- Order management

❌ **Never sell directly:**

- Products, Preparations, or Recipes (always wrap in Menu Item)

---

## Modifier System

**Location:** `src/stores/menu/types.ts`

### Data Structure

```typescript
interface ModifierGroup {
  id: string
  type: 'replacement' | 'addon' | 'removal'
  name: string // Display name
  isRequired: boolean // Must customer choose?

  options: ModifierOption[]

  // For type = 'replacement'
  targetComponents?: TargetComponent[] // What gets replaced
}

interface ModifierOption {
  id: string
  name: string // Display name
  priceAdjustment: number // +/- from base price

  // What to add (for addon/replacement)
  composition?: MenuComposition[]
}

interface TargetComponent {
  sourceType: 'variant' | 'recipe'
  recipeId?: string // If sourceType = 'recipe'
  componentId: string // What component to replace/remove
  componentType: 'product' | 'recipe' | 'preparation'
  componentName: string // For display
}
```

### Modifier Types

**1. Addon (type = 'addon')**

- Adds items to the order
- Price adjustment typically positive
- Example: "Add extra cheese (+3k)"

**2. Replacement (type = 'replacement')**

- Swaps one component for another
- Uses `targetComponents` to specify what gets replaced
- Example: "Replace potato hash-brown with zucchini hash-brown (+2k)"

**3. Removal (type = 'removal')**

- Removes items from the order
- Price adjustment typically negative
- Example: "No onions (-0)"

### Required Modifiers

**Use Case: Mandatory Choice**

```typescript
{
  type: 'addon',
  name: 'Choose hash-brown',
  isRequired: true,  // ⭐ Customer MUST choose
  options: [
    { name: 'Potato', composition: [...], priceAdjustment: 0 },
    { name: 'Zucchini', composition: [...], priceAdjustment: 2000 }
  ]
}
```

**Why use addon instead of replacement?**

- Base composition doesn't include any hash-brown
- Customer adds one via required modifier
- Simpler cost calculation (base + addon)

---

## Cost Calculation

### Cost Calculation Hierarchy

```
Product Cost (base case)
    ↓
Preparation Cost (recursive)
    ↓
Recipe Cost
    ↓
Menu Item Cost (base + modifiers)
```

### 1. Product Cost

**Without Yield Adjustment:**

```typescript
cost = quantity * product.baseCostPerUnit
```

**With Yield Adjustment:**

```typescript
adjustedQuantity = quantity / (product.yieldPercentage / 100)
cost = adjustedQuantity * product.baseCostPerUnit
```

**Example:**

```
Product: Potato
- baseCostPerUnit: 10 Rp/gram
- yieldPercentage: 85%

Need 200g in recipe:
- Adjusted quantity: 200 / 0.85 = 235.3g
- Cost: 235.3 × 10 = 2,353 Rp
```

### 2. Preparation Cost (Recursive)

**Location:** `src/stores/recipes/composables/useCostCalculation.ts`

```typescript
function calculatePreparationCost(preparation: Preparation): number {
  let totalCost = 0

  for (const ingredient of preparation.recipe) {
    if (ingredient.type === 'product') {
      // Base case: product cost
      const product = getProduct(ingredient.id)
      totalCost += calculateProductCost(ingredient.quantity, product, ingredient.useYieldPercentage)
    } else if (ingredient.type === 'preparation') {
      // Recursive: nested preparation
      const nestedPrep = getPreparation(ingredient.id)

      // Try to get cost (in priority order):
      // 1. Cached calculation
      // 2. Last known cost (from actual batch)
      // 3. Cost per portion (theoretical)
      const unitCost =
        getCachedCost(nestedPrep.id) || nestedPrep.lastKnownCost || nestedPrep.costPerPortion || 0

      totalCost += unitCost * ingredient.quantity
    }
  }

  return totalCost / preparation.outputQuantity // Cost per output unit
}
```

### 3. Recipe Cost

```typescript
function calculateRecipeCost(recipe: Recipe): number {
  let totalCost = 0

  for (const component of recipe.components) {
    if (component.componentType === 'product') {
      totalCost += calculateProductCost(
        component.quantity,
        getProduct(component.componentId),
        component.useYieldPercentage
      )
    } else if (component.componentType === 'preparation') {
      const prep = getPreparation(component.componentId)
      const unitCost = prep.costPerPortion || prep.lastKnownCost || 0
      totalCost += unitCost * component.quantity
    }
  }

  return totalCost
}
```

### 4. Menu Item Cost (with Modifiers)

```typescript
function calculateMenuItemCost(
  menuItem: MenuItem,
  variantId: string,
  selectedModifiers: SelectedModifier[]
): CostBreakdown {

  // 1. Base composition cost
  const variant = menuItem.variants.find(v => v.id === variantId)
  let totalCost = 0

  for (const comp of variant.composition) {
    if (comp.type === 'product') {
      totalCost += calculateProductCost(...)
    }
    else if (comp.type === 'preparation') {
      totalCost += calculatePreparationCost(...)
    }
    else if (comp.type === 'recipe') {
      totalCost += calculateRecipeCost(...)
    }
  }

  // 2. Apply modifiers
  for (const modifier of selectedModifiers) {
    if (modifier.type === 'addon') {
      // Add composition cost
      for (const comp of modifier.composition) {
        totalCost += calculateComponentCost(comp)
      }
    }
    else if (modifier.type === 'replacement') {
      // Subtract target, add replacement
      totalCost -= calculateTargetCost(modifier.targetComponents)
      totalCost += calculateComponentCost(modifier.composition)
    }
    else if (modifier.type === 'removal') {
      // Subtract target cost
      totalCost -= calculateTargetCost(modifier.targetComponents)
    }
  }

  return {
    totalCost,
    sellingPrice: variant.price + sum(modifier.priceAdjustments),
    margin: sellingPrice - totalCost
  }
}
```

### Planned vs Actual Cost

**Two Cost Modes (Sprint 4):**

**Planned Cost**

- Uses theoretical `baseCostPerUnit` from products
- Based on current supplier prices
- Used for menu planning and pricing decisions

**Actual Cost (FIFO)**

- Uses real batch costs from inventory
- Accounts for price fluctuations
- Used for profit/loss reporting

**Implementation:**

```typescript
type CostMode = 'planned' | 'actual'

function calculateCost(component, mode: CostMode) {
  if (mode === 'planned') {
    return component.quantity * product.baseCostPerUnit
  } else {
    // FIFO: use oldest batch cost
    const batches = getInventoryBatches(product.id)
    return calculateFIFOCost(component.quantity, batches)
  }
}
```

---

## Real-World Use Cases

### Use Case 1: Hash-brown (Standalone)

**Step 1: Create Recipe**

```typescript
Recipe: "Hash-brown Potato"
  components: [
    { type: 'product', id: 'potato', quantity: 200, unit: 'gram', useYield: true },
    { type: 'product', id: 'onion', quantity: 20, unit: 'gram', useYield: true },
    { type: 'product', id: 'salt', quantity: 2, unit: 'gram' },
    { type: 'product', id: 'oil', quantity: 10, unit: 'ml' }
  ]

Cost calculation:
  Potato: 200g @ 10 Rp/g (with 85% yield) = 2,353 Rp
  Onion: 20g @ 15 Rp/g (with 90% yield) = 333 Rp
  Salt: 2g @ 5 Rp/g = 10 Rp
  Oil: 10ml @ 20 Rp/ml = 200 Rp
  ─────────────────────────────────────
  Total Recipe Cost: 2,896 Rp ≈ 3,000 Rp
```

**Step 2: Create Menu Item**

```typescript
MenuItem: "Hash-brown"
  dishType: 'simple'
  variants: [
    {
      name: 'Standard',
      price: 25000,  // ⭐ SOURCE OF TRUTH
      composition: [
        { type: 'recipe', id: 'hash-brown-potato' }
      ]
    }
  ]

Financial Analysis:
  Cost: 3,000 Rp
  Price: 25,000 Rp
  Margin: 22,000 Rp (733% markup)
```

### Use Case 2: Big Breakfast (Composite with Choice)

**Step 1: Create Recipes**

```typescript
Recipe: "Hash-brown Potato"
  // (same as above)
  cost: 3,000 Rp

Recipe: "Hash-brown Zucchini"
  components: [
    { type: 'product', id: 'zucchini', quantity: 200, unit: 'gram', useYield: true },
    { type: 'product', id: 'onion', quantity: 20, unit: 'gram', useYield: true },
    { type: 'product', id: 'salt', quantity: 2, unit: 'gram' },
    { type: 'product', id: 'oil', quantity: 10, unit: 'ml' }
  ]
  cost: 5,000 Rp (zucchini more expensive)

Recipe: "Big Breakfast Base"
  components: [
    { type: 'product', id: 'eggs', quantity: 2, unit: 'piece' },      // 6,000 Rp
    { type: 'product', id: 'bacon', quantity: 50, unit: 'gram' },     // 15,000 Rp
    { type: 'preparation', id: 'toast', quantity: 2, unit: 'piece' }  // 2,000 Rp
  ]
  cost: 23,000 Rp
```

**Step 2: Create Menu Item with Required Modifier**

```typescript
MenuItem: 'Big Breakfast'
dishType: 'modifiable'
variants: [
  {
    name: 'Standard',
    price: 75000, // ⭐ BASE PRICE
    composition: [
      { type: 'recipe', id: 'big-breakfast-base' } // Only the base!
    ]
  }
]

modifierGroups: [
  {
    type: 'addon',
    name: 'Choose hash-brown',
    isRequired: true, // ⭐ MUST CHOOSE
    options: [
      {
        name: 'Potato hash-brown',
        priceAdjustment: 0,
        composition: [{ type: 'recipe', id: 'hash-brown-potato' }]
      },
      {
        name: 'Zucchini hash-brown (+2,000 Rp)',
        priceAdjustment: 2000,
        composition: [{ type: 'recipe', id: 'hash-brown-zucchini' }]
      }
    ]
  }
]
```

**Step 3: Order Scenarios**

**Scenario A: Big Breakfast + Potato**

```
Base Composition:
  Big Breakfast Base → 23,000 Rp

Selected Modifier:
  + Potato hash-brown → 3,000 Rp

─────────────────────────────────────
Total Cost: 26,000 Rp
Selling Price: 75,000 + 0 = 75,000 Rp
Margin: 49,000 Rp (188% markup)
```

**Scenario B: Big Breakfast + Zucchini**

```
Base Composition:
  Big Breakfast Base → 23,000 Rp

Selected Modifier:
  + Zucchini hash-brown → 5,000 Rp

─────────────────────────────────────
Total Cost: 28,000 Rp
Selling Price: 75,000 + 2,000 = 77,000 Rp
Margin: 49,000 Rp (175% markup)
```

**Key Insight:** By using required addon instead of base composition, you:

- Keep base cost clear (just the eggs, bacon, toast)
- Make the choice explicit to customer
- Allow different hash-brown costs without affecting base price
- Maintain consistent margin

---

## Best Practices

### 1. When to Use Each Level

```
┌─────────────────────────────────────────────────────────────┐
│ PRODUCT                                                     │
├─────────────────────────────────────────────────────────────┤
│ ✅ Raw ingredients from suppliers                           │
│ ✅ Simple items sold as-is (bottled water)                 │
│ ❌ Anything prepared/cooked                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PREPARATION                                                 │
├─────────────────────────────────────────────────────────────┤
│ ✅ Batch-produced items (dough, sauce base, marinades)     │
│ ✅ Reusable components (toast, hash-brown as component)    │
│ ✅ Items with FIFO batch tracking needed                   │
│ ❌ Final dishes sold to customers                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RECIPE                                                      │
├─────────────────────────────────────────────────────────────┤
│ ✅ Finished dishes made to order                           │
│ ✅ Reusable dish components in menu items                  │
│ ✅ Base recipes for menu variants                          │
│ ❌ Batch-produced items                                    │
│ ❌ Never sold directly (always wrap in Menu Item)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MENU ITEM                                                   │
├─────────────────────────────────────────────────────────────┤
│ ✅ EVERYTHING sold to customers                            │
│ ✅ Source of truth for pricing                             │
│ ✅ Customer-facing names and options                        │
│ ✅ POS system integration                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Avoid Recipe Duplication

**❌ Bad: Duplicate Recipe for Each Menu Item**

```typescript
// DON'T DO THIS!
Recipe: 'Hash-brown for Big Breakfast'
Recipe: 'Hash-brown for Benedict'
Recipe: 'Hash-brown standalone'
// Same recipe, three times!
```

**✅ Good: One Recipe, Multiple Menu Items**

```typescript
// DO THIS!
Recipe: 'Hash-brown Potato' // Define once

MenuItem: 'Hash-brown' // Use it
MenuItem: 'Big Breakfast' // Use it again
MenuItem: 'Eggs Benedict' // Use it again
```

### 3. Required Addon Pattern for Composite Dishes

**Problem:** Dish has mandatory component with multiple options

**❌ Bad Solution: Multiple Variants**

```typescript
// DON'T DO THIS!
MenuItem: "Big Breakfast"
  variants: [
    { name: 'With Potato Hash-brown', composition: [...] },
    { name: 'With Zucchini Hash-brown', composition: [...] }
  ]
// Variants are for size/portion, not choices!
```

**✅ Good Solution: Required Addon Modifier**

```typescript
// DO THIS!
MenuItem: "Big Breakfast"
  variants: [{ name: 'Standard', composition: [base only] }]
  modifiers: [
    {
      type: 'addon',
      isRequired: true,  // ⭐ KEY
      name: 'Choose hash-brown',
      options: [potato, zucchini]
    }
  ]
```

**Why?**

- Cleaner cost calculation (base + addon)
- Better UX (single item with choice)
- Easier to add new hash-brown types
- Kitchen sees it as one dish with variation

### 4. Source of Truth Hierarchy

**Price Source of Truth:**

```
Menu Item Variant Price (final)
  ↑
Modifier Price Adjustment
  ↑
Recipe Cost (intermediate, not sold)
  ↑
Preparation Cost (intermediate, not sold)
  ↑
Product Base Cost Per Unit (foundation)
```

**Rule:** Only Menu Items define customer-facing prices. Recipes/Preparations only calculate costs.

### 5. Naming Conventions

**Products:** Ingredient names

- ✅ "Potato", "Chicken Breast", "Olive Oil"
- ❌ "Fried Potato", "Cooked Chicken"

**Preparations:** Process/Result names

- ✅ "Pizza Dough", "Tomato Sauce Base", "Marinated Chicken"
- ❌ "For Pizza", "Red Sauce" (too vague)

**Recipes:** Dish names (can be same as menu)

- ✅ "Hash-brown Potato", "Caesar Salad", "Margherita Pizza Base"
- ❌ "Hash-brown Recipe" (redundant)

**Menu Items:** Customer-facing names

- ✅ "Big Breakfast", "Classic Caesar Salad", "Margherita Pizza"
- ❌ "Big Breakfast Recipe" (confusing)

### 6. Cost Calculation Best Practices

**Always Use Yield Percentage for:**

- Vegetables (cleaning, peeling)
- Fruits (seeds, skin removal)
- Meat (trimming, bones)
- Fish (filleting)

**Don't Use Yield Percentage for:**

- Liquids (oil, milk, water)
- Dry goods (flour, sugar, salt)
- Pre-portioned items (eggs, canned goods)

**Cost Caching Strategy:**

```typescript
// Cache preparation costs during calculation
const prepCostCache = new Map<string, number>()

function getCachedPreparationCost(prepId: string): number {
  if (!prepCostCache.has(prepId)) {
    prepCostCache.set(prepId, calculatePreparationCost(prepId))
  }
  return prepCostCache.get(prepId)
}

// Prevents recalculating same preparation multiple times
// Important for deeply nested preparations!
```

---

## Export & Reporting

### Min/Max Cost Calculation

**Location:** `src/core/export/utils/menuItemExportBuilder.ts`

For menu items with modifiers, the system calculates all possible combinations to find min/max cost:

```typescript
function calculateFoodCostRange(menuItem: MenuItem): CostRange {
  const combinations = generateAllCombinations(menuItem.variants, menuItem.modifierGroups)

  const costs = combinations.map(combo =>
    calculateMenuItemCost(menuItem, combo.variantId, combo.modifiers)
  )

  return {
    min: Math.min(...costs),
    max: Math.max(...costs),
    average: costs.reduce((a, b) => a + b) / costs.length
  }
}
```

**Example: Big Breakfast**

```
Variant: Standard
Modifiers: Choose hash-brown (required)
  - Option A: Potato → cost 26,000 Rp
  - Option B: Zucchini → cost 28,000 Rp

Result:
  Min Cost: 26,000 Rp
  Max Cost: 28,000 Rp
  Avg Cost: 27,000 Rp
```

### DecompositionEngine

**Location:** `src/core/decomposition/DecompositionEngine.ts`

**Purpose:** Break down menu items to atomic components for inventory write-off

**Two Strategies:**

```typescript
interface TraversalOptions {
  preparationStrategy: 'keep' | 'decompose'
}

// 'keep': Stop at preparations (write off prep batches)
// Returns: DecomposedPreparationNode[]

// 'decompose': Go down to raw products
// Returns: DecomposedProductNode[]
```

**Example: Big Breakfast + Potato Hash-brown**

With `preparationStrategy = 'keep'`:

```
Menu Item: Big Breakfast
  ↓ decompose
[
  { type: 'product', id: 'eggs', qty: 2 },
  { type: 'product', id: 'bacon', qty: 50 },
  { type: 'preparation', id: 'toast', qty: 2 },      // STOP HERE
  { type: 'preparation', id: 'hash-brown', qty: 1 }  // STOP HERE
]
```

With `preparationStrategy = 'decompose'`:

```
Menu Item: Big Breakfast
  ↓ decompose fully
[
  { type: 'product', id: 'eggs', qty: 2 },
  { type: 'product', id: 'bacon', qty: 50 },
  { type: 'product', id: 'bread', qty: 2 },          // From toast prep
  { type: 'product', id: 'butter', qty: 10 },        // From toast prep
  { type: 'product', id: 'potato', qty: 200 },       // From hash-brown prep
  { type: 'product', id: 'onion', qty: 20 },         // From hash-brown prep
  { type: 'product', id: 'oil', qty: 10 },           // From hash-brown prep
  { type: 'product', id: 'salt', qty: 2 }            // From hash-brown prep
]
```

**Modifier Handling:**

The engine builds a replacement map and applies it during traversal:

```typescript
const replacementMap = buildReplacementMap(selectedModifiers)

function traverseComponent(component) {
  // Check if this component should be replaced
  if (replacementMap.has(component.id)) {
    const replacement = replacementMap.get(component.id)
    return traverseComponent(replacement) // Use replacement instead
  }

  // Normal traversal
  if (component.type === 'preparation' && strategy === 'decompose') {
    return traversePreparation(component) // Go deeper
  }

  return component // Stop here
}
```

### Inventory Write-off Flow

```
1. Order placed in POS
   ↓
2. DecompositionEngine.decompose(menuItem, modifiers)
   ↓
3. Get atomic components (products or preparations)
   ↓
4. For each component:
   - Find available batches (FIFO order)
   - Deduct quantity from oldest batch
   - Record actual cost used
   ↓
5. Update inventory levels
   ↓
6. Store write-off transaction for reporting
```

---

## Related Files

**Type Definitions:**

- `src/stores/productsStore/types.ts` - Product interfaces
- `src/stores/preparation/types.ts` - Preparation interfaces
- `src/stores/recipes/types.ts` - Recipe interfaces
- `src/stores/menu/types.ts` - Menu Item and Modifier interfaces

**Business Logic:**

- `src/stores/recipes/composables/useCostCalculation.ts` - Cost calculation
- `src/core/decomposition/DecompositionEngine.ts` - Menu decomposition
- `src/core/export/utils/menuItemExportBuilder.ts` - Export and reporting

**Database:**

- `src/supabase/migrations/` - Database schema migrations
- `src/supabase/types.gen.ts` - Generated database types

**UI Components:**

- `src/views/menu/` - Menu management views
- `src/views/recipes/` - Recipe management views
- `src/views/products/` - Product management views
- `src/views/preparation/` - Preparation management views

---

## Version History

**v1.0 (2025-12-18)**

- Initial documentation
- Covers 4-level system architecture
- Includes hash-brown use case
- Documents modifier system
- Explains cost calculation flow

---

**For questions or suggestions, please update this document or contact the development team.**
