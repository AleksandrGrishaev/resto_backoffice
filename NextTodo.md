# NextTodo: Menu System Implementation (PRODUCTION)

## Summary

Implement flexible menu system with 3 types of dishes directly in PRODUCTION:

1. **Simple** - fixed price, fixed composition (Poke, Salad, Soup, Pasta, etc.)
2. **Composition** - customizable dishes with component selection (Breakfasts, Steaks with sides/sauces)
3. **Addons** - dishes with addon groups (Syrniki with extra portions, etc.)

## Context

- **Environment:** PRODUCTION database (`bkntdcvzatawencxghob`)
- **MCP Status:** ✅ Already connected to PRODUCTION
- **Data Status:** All products, preparations, and recipes already exist in PROD
- **Menu Tables:** Empty (ready for data)
- **Code Status:** All functionality already implemented (modifier_groups, variants, templates)

## Implementation Plan

### Phase 1: Data Audit & Verification

#### Task 1.1: Verify PRODUCTION Data Availability

Check that all necessary components exist:

- [ ] **Products audit:**

```sql
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM products
GROUP BY category
ORDER BY category;
```

- [ ] **Preparations audit:**

```sql
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM preparations
GROUP BY type
ORDER BY type;
```

- [ ] **Recipes audit:**

```sql
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM recipes
GROUP BY category
ORDER BY category;
```

- [ ] Document what's available for menu composition
- [ ] Identify any missing components for menu items from TODO.md

#### Task 1.2: Verify Menu Tables Schema

- [ ] Check `menu_items` table structure:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menu_items'
ORDER BY ordinal_position;
```

- [ ] Check `menu_categories` table structure
- [ ] Verify JSONB fields exist: `modifier_groups`, `variants`, `templates`
- [ ] Verify RLS policies are enabled

#### Task 1.3: Run Security & Performance Check

- [ ] Run security advisor: `mcp__supabase__get_advisors({ type: 'security' })`
- [ ] Run performance advisor: `mcp__supabase__get_advisors({ type: 'performance' })`
- [ ] Fix any critical issues before proceeding

### Phase 2: Menu Categories Setup

#### Task 2.1: Create Menu Categories in PROD

Create categories based on TODO.md menu structure:

```sql
INSERT INTO menu_categories (name, description, sort_order, is_active)
VALUES
  ('Breakfast', 'Morning breakfast dishes', 1, true),
  ('Sweet Breakfast', 'Sweet morning options', 2, true),
  ('Toast', 'Toast variations', 3, true),
  ('Custom Breakfast', 'Build your own breakfast', 4, true),
  ('Dinner', 'Main dinner dishes and steaks', 5, true),
  ('Poke', 'Hawaiian-style poke bowls', 6, true),
  ('Salad', 'Fresh salads', 7, true),
  ('Soup', 'Hot soups', 8, true),
  ('Pasta', 'Italian pasta dishes', 9, true),
  ('Dumplings', 'Dumplings varieties', 10, true),
  ('Ciabatta', 'Ciabatta sandwiches', 11, true),
  ('Pizza', 'Pizza and quesadilla', 12, true),
  ('Smoothie', 'Fresh fruit smoothies', 13, true)
RETURNING id, name, sort_order;
```

- [ ] Execute category creation
- [ ] Save category IDs for reference (or query by name later)
- [ ] Verify all categories created successfully

### Phase 3: Menu Items - Batch 1 (Simple Dishes)

Simple dishes with fixed composition, single variant, no customization.

#### Task 3.1: Poke Category

- [ ] **Poke Salmon** - 90000 IDR

  - Identify recipe/preparation ID in PROD
  - Create menu item with single variant
  - Set composition (recipe or preparation)

- [ ] **Poke Tuna** - 80000 IDR
- [ ] **Sushi Wrap** - 95000 IDR

#### Task 3.2: Salad Category

- [ ] **Greek Salad** - 75000 IDR
- [ ] **Garden Salad** - 75000 IDR

#### Task 3.3: Soup Category

- [ ] **Tom Yum** - 80000 IDR
- [ ] **Pumpkin Soup** - 55000 IDR

#### Task 3.4: Pasta Category

- [ ] **Bolognese Pasta** - 80000 IDR
- [ ] **Carbonara Pasta** - 80000 IDR

#### Task 3.5: Ciabatta Category

- [ ] **Moza Ciabatta** - 65000 IDR
- [ ] **Salmon Ciabatta** - 85000 IDR
- [ ] **Guacamole Ciabatta** - 54000 IDR
- [ ] **Tuna Ciabatta** - 65000 IDR

#### Task 3.6: Sweet Breakfast Category

- [ ] **Fruit Salad** - 49000 IDR
- [ ] **Granola Yogurt** - 49000 IDR

#### Task 3.7: Breakfast Category

- [ ] **Croissant Salmon** - 75000 IDR
- [ ] **Hashbrown Burger** - 85000 IDR
- [ ] **Hashbrown Egg** - 75000 IDR
- [ ] **Shakshuka** - 65000 IDR
- [ ] **Porridge** - 49000 IDR

#### Task 3.8: Toast Category

- [ ] **Smash Avo Toast** - 65000 IDR
- [ ] **Aus Beef Toast** - 80000 IDR

#### Task 3.9: Pizza Category

- [ ] **Quesadilla** - 79000 IDR

#### Task 3.10: Smoothie Category

- [ ] **Smoothie Mango** - 65000 IDR
- [ ] **Smoothie Papaya** - 65000 IDR
- [ ] **Smoothie Dragon** - 65000 IDR
- [ ] **Smoothie Choco-Coco** - 60000 IDR

### Phase 4: Menu Items - Batch 2 (Multi-Variant Dishes)

Dishes with multiple portion sizes (same composition, different quantity/price).

#### Task 4.1: Dumplings Category

- [ ] **Dumplings Pork/Beef**

  - Variant 1: "Normal 14pc" - 75000 IDR
  - Variant 2: "Large 25pc" - 95000 IDR
  - Use `portionMultiplier` to scale quantities (1.0 vs ~1.78)

- [ ] **Dumplings Potato** - 75000 IDR
  - Single variant

### Phase 5: Menu Items - Batch 3 (Component-Based Dishes)

Dishes with customizable components (garnish, sauce selection).

#### Task 5.1: Design Component Groups for Steaks

**Garnish Selection Group:**

```typescript
{
  id: "garnish_selection",
  name: "Choose your side",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  minSelection: 1,
  maxSelection: 1,
  options: [
    {
      id: "side_fries",
      name: "French Fries",
      composition: [{ type: "preparation", id: "<fries_prep_id>", quantity: 150, unit: "gram" }],
      priceAdjustment: 0,
      isDefault: true
    },
    {
      id: "side_mash",
      name: "Mashed Potato",
      composition: [{ type: "preparation", id: "<mash_prep_id>", quantity: 150, unit: "gram" }],
      priceAdjustment: 0
    },
    {
      id: "side_veggies",
      name: "Grilled Vegetables",
      composition: [{ type: "preparation", id: "<veggies_prep_id>", quantity: 150, unit: "gram" }],
      priceAdjustment: 0
    },
    {
      id: "side_salad",
      name: "Fresh Salad",
      composition: [{ type: "preparation", id: "<salad_prep_id>", quantity: 100, unit: "gram" }],
      priceAdjustment: 0
    }
  ]
}
```

**Sauce Selection Group:**

```typescript
{
  id: "sauce_selection",
  name: "Choose your sauce",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  minSelection: 1,
  maxSelection: 1,
  options: [
    {
      id: "sauce_mushroom",
      name: "Mushroom Sauce",
      composition: [{ type: "preparation", id: "<mushroom_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 0,
      isDefault: true
    },
    {
      id: "sauce_pepper",
      name: "Pepper Sauce",
      composition: [{ type: "preparation", id: "<pepper_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 0
    },
    {
      id: "sauce_bbq",
      name: "BBQ Sauce",
      composition: [{ type: "preparation", id: "<bbq_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 0
    }
  ]
}
```

**Extra Sauce Addon Group:**

```typescript
{
  id: "extra_sauce",
  name: "Add extra sauce",
  type: "addon",
  groupStyle: "addon",
  isRequired: false,
  minSelection: 0,
  maxSelection: 3,
  options: [
    {
      id: "extra_mushroom",
      name: "Extra Mushroom Sauce",
      composition: [{ type: "preparation", id: "<mushroom_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 10000
    },
    {
      id: "extra_pepper",
      name: "Extra Pepper Sauce",
      composition: [{ type: "preparation", id: "<pepper_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 10000
    },
    {
      id: "extra_bbq",
      name: "Extra BBQ Sauce",
      composition: [{ type: "preparation", id: "<bbq_sauce_id>", quantity: 50, unit: "gram" }],
      priceAdjustment: 10000
    }
  ]
}
```

#### Task 5.2: Identify Component Preparation IDs

- [ ] Find "French Fries" preparation ID in PROD
- [ ] Find "Mashed Potato" preparation ID in PROD
- [ ] Find "Grilled Vegetables" preparation ID in PROD
- [ ] Find "Fresh Salad" preparation ID in PROD
- [ ] Find "Mushroom Sauce" preparation ID in PROD
- [ ] Find "Pepper Sauce" preparation ID in PROD
- [ ] Find "BBQ Sauce" preparation ID in PROD
- [ ] Document all IDs for reference

#### Task 5.3: Create Steak Menu Items

- [ ] **Tuna Steak** - 90000 IDR

  - dishType: 'component-based'
  - Main composition: Tuna steak preparation/recipe
  - Add modifier_groups: garnish_selection, sauce_selection, extra_sauce
  - Single variant with base price 90000

- [ ] **Chicken Steak** - 85000 IDR

  - dishType: 'component-based'
  - Main composition: Chicken steak preparation/recipe
  - Add modifier_groups: garnish_selection, sauce_selection, extra_sauce
  - Single variant with base price 85000

- [ ] **Beef Steak** - Multiple variants by weight
  - dishType: 'component-based'
  - Main composition: Beef steak preparation/recipe (base amount)
  - Add modifier_groups: garnish_selection, sauce_selection, extra_sauce
  - Variant 1: "200gr" - 125000 IDR (portionMultiplier: 1.0)
  - Variant 2: "250gr" - 150000 IDR (portionMultiplier: 1.25)
  - Variant 3: "300gr" - 160000 IDR (portionMultiplier: 1.5)

### Phase 6: Menu Items - Batch 4 (Addon-Based Dishes)

Dishes with optional addons that add to base price.

#### Task 6.1: Sweet Breakfast with Addons

- [ ] **Syrniki** - 70000 IDR base
  - dishType: 'addon-based'
  - Base composition: Syrniki preparation (standard portion)
  - Add modifier_groups:

```typescript
{
  id: "extra_syrniki",
  name: "Add extra syrniki",
  type: "addon",
  groupStyle: "addon",
  isRequired: false,
  minSelection: 0,
  maxSelection: 5,
  options: [
    {
      id: "add_1_syrnik",
      name: "Extra Syrnik (+1 piece)",
      composition: [{ type: "preparation", id: "<syrniki_prep_id>", quantity: 1, unit: "piece" }],
      priceAdjustment: 15000
    }
  ]
}
```

### Phase 7: Menu Items - Batch 5 (Custom Composition Dishes)

Most complex - fully customizable breakfasts with templates.

#### Task 7.1: Design Custom Breakfast Component Groups

**Eggs Component:**

```typescript
{
  id: "eggs_selection",
  name: "Choose your eggs",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  options: [
    { id: "eggs_scrambled", name: "Scrambled Eggs", composition: [...], priceAdjustment: 0, isDefault: true },
    { id: "eggs_fried", name: "Fried Eggs", composition: [...], priceAdjustment: 0 },
    { id: "eggs_poached", name: "Poached Eggs", composition: [...], priceAdjustment: 0 }
  ]
}
```

**Bread Component:**

```typescript
{
  id: "bread_selection",
  name: "Choose your bread",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  options: [
    { id: "bread_toast", name: "Toast", composition: [...], priceAdjustment: 0, isDefault: true },
    { id: "bread_croissant", name: "Croissant", composition: [...], priceAdjustment: 5000 }
  ]
}
```

**Protein Component:**

```typescript
{
  id: "protein_selection",
  name: "Choose your protein",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  options: [
    { id: "protein_bacon", name: "Bacon", composition: [...], priceAdjustment: 0, isDefault: true },
    { id: "protein_sausage", name: "Sausage", composition: [...], priceAdjustment: 0 },
    { id: "protein_salmon", name: "Smoked Salmon", composition: [...], priceAdjustment: 15000 }
  ]
}
```

**Side Component:**

```typescript
{
  id: "side_selection",
  name: "Choose your side",
  type: "replacement",
  groupStyle: "component",
  isRequired: true,
  options: [
    { id: "side_hashbrown", name: "Hashbrown", composition: [...], priceAdjustment: 0, isDefault: true },
    { id: "side_tomato", name: "Grilled Tomato", composition: [...], priceAdjustment: 0 },
    { id: "side_mushroom", name: "Sautéed Mushroom", composition: [...], priceAdjustment: 0 }
  ]
}
```

**Extras Addon Group:**

```typescript
{
  id: "breakfast_extras",
  name: "Add extras",
  type: "addon",
  groupStyle: "addon",
  isRequired: false,
  options: [
    { id: "extra_egg", name: "Extra Egg", composition: [...], priceAdjustment: 10000 },
    { id: "extra_bacon", name: "Extra Bacon", composition: [...], priceAdjustment: 15000 },
    { id: "extra_avocado", name: "Avocado", composition: [...], priceAdjustment: 20000 }
  ]
}
```

#### Task 7.2: Create Templates for Popular Combinations

**Big Breakfast Templates:**

```typescript
templates: [
  {
    id: 'big_breakfast_classic',
    name: 'Classic Big Breakfast',
    description: 'Scrambled eggs, toast, bacon, hashbrown',
    selectedModifiers: [
      { groupId: 'eggs_selection', optionIds: ['eggs_scrambled'] },
      { groupId: 'bread_selection', optionIds: ['bread_toast'] },
      { groupId: 'protein_selection', optionIds: ['protein_bacon'] },
      { groupId: 'side_selection', optionIds: ['side_hashbrown'] }
    ]
  },
  {
    id: 'big_breakfast_deluxe',
    name: 'Deluxe Big Breakfast',
    description: 'Poached eggs, croissant, smoked salmon, mushroom',
    selectedModifiers: [
      { groupId: 'eggs_selection', optionIds: ['eggs_poached'] },
      { groupId: 'bread_selection', optionIds: ['bread_croissant'] },
      { groupId: 'protein_selection', optionIds: ['protein_salmon'] },
      { groupId: 'side_selection', optionIds: ['side_mushroom'] }
    ]
  }
]
```

#### Task 7.3: Identify Breakfast Component IDs

- [ ] Find all egg preparation IDs (scrambled, fried, poached)
- [ ] Find bread product IDs (toast, croissant)
- [ ] Find protein preparation IDs (bacon, sausage, salmon)
- [ ] Find side preparation IDs (hashbrown, tomato, mushroom)
- [ ] Find extra component IDs (avocado, etc.)
- [ ] Document all IDs

#### Task 7.4: Create Custom Breakfast Items

- [ ] **Big Breakfast** - 85000 IDR base

  - dishType: 'component-based'
  - Base composition: empty or minimal (since fully customizable)
  - Add all component groups: eggs, bread, protein, side
  - Add extras addon group
  - Add templates for popular combinations
  - Single variant with base price 85000

- [ ] **Simple Breakfast** - 60000 IDR base
  - dishType: 'component-based'
  - Simplified version with fewer options
  - Component groups: eggs (2 options), bread (2 options), side (3 options)
  - No protein selection (fixed bacon)
  - Single variant with base price 60000

### Phase 8: Testing & Validation

#### Task 8.1: Test Menu in Backoffice UI

- [ ] Navigate to `/menu` in Backoffice
- [ ] Verify all categories visible and sorted correctly
- [ ] Verify all menu items visible in correct categories
- [ ] Test editing a simple menu item
- [ ] Test editing a component-based menu item
- [ ] Test editing modifier groups
- [ ] Test toggling active/inactive status

#### Task 8.2: Test Menu in POS UI

**⚠️ IMPORTANT: Use test table/order for initial testing**

- [ ] Navigate to `/pos`
- [ ] Verify all menu categories load correctly
- [ ] **Test Simple Dish:**

  - Add "Greek Salad" to order
  - Verify price is correct (75000)
  - Verify no customization options shown

- [ ] **Test Multi-Variant Dish:**

  - Add "Dumplings Pork/Beef" to order
  - Verify variant selection appears (14pc vs 25pc)
  - Select "Large 25pc" variant
  - Verify price is correct (95000)

- [ ] **Test Component-Based Dish:**

  - Add "Tuna Steak" to order
  - Verify component selection dialog appears
  - Select garnish: "Mashed Potato"
  - Select sauce: "Pepper Sauce"
  - Add extra: "Extra BBQ Sauce"
  - Verify price = 90000 + 10000 = 100000

- [ ] **Test Addon-Based Dish:**

  - Add "Syrniki" to order
  - Verify addon selection appears
  - Add 2 extra syrniki
  - Verify price = 70000 + (2 × 15000) = 100000

- [ ] **Test Custom Breakfast:**
  - Add "Big Breakfast" to order
  - Try using template "Classic Big Breakfast"
  - Verify all selections applied correctly
  - Modify one component (change bread to croissant)
  - Verify price adjustment (+5000)

#### Task 8.3: Test Order Completion & Write-offs

**⚠️ Only proceed if authorized to complete real transactions**

- [ ] Create test order with various menu item types
- [ ] Complete checkout and payment
- [ ] Verify order saved in `orders` table
- [ ] Verify sales transactions created in `sales_transactions`
- [ ] Verify recipe write-offs created in `recipe_write_offs`
- [ ] Check preparation/product batches decremented correctly
- [ ] Verify cost calculations in sales transactions are accurate

#### Task 8.4: Verify Pricing & Cost Calculations

- [ ] Review cost calculations for each menu item type
- [ ] Verify margins are acceptable:
  - Simple dishes: margin = (price - cost) / price
  - Component dishes: cost includes selected components
  - Addon dishes: cost includes base + addons
- [ ] Document any items with low margins (<30%)
- [ ] Adjust prices or compositions if needed

#### Task 8.5: Final PROD Validation

- [ ] Run security advisor again: `mcp__supabase__get_advisors({ type: 'security' })`
- [ ] Run performance advisor: `mcp__supabase__get_advisors({ type: 'performance' })`
- [ ] Check RLS policies are enabled and working
- [ ] Verify no SQL errors in logs: `mcp__supabase__get_logs({ service: 'api' })`
- [ ] Test menu loading performance (should be <2 seconds)
- [ ] Document any issues found and resolutions

### Phase 9: Documentation & Handoff

#### Task 9.1: Create Menu Documentation

- [ ] Document menu structure in `docs/menu/MENU_STRUCTURE.md`
- [ ] Document all modifier groups and their purposes
- [ ] Document pricing strategy and cost margins
- [ ] Create quick reference guide for staff training

#### Task 9.2: Create Component Reference

- [ ] List all garnish options with preparation IDs
- [ ] List all sauce options with preparation IDs
- [ ] List all breakfast components with IDs
- [ ] Document how to add new components in future

#### Task 9.3: Update System Documentation

- [ ] Update CLAUDE.md with menu implementation notes
- [ ] Document any schema changes made
- [ ] Update TODO.md with completed tasks
- [ ] Archive NextTodo.md to `docs/completed/menu_implementation_YYYY-MM-DD.md`

## Quick Reference Commands

### Check Menu Data

```sql
-- Count menu items by category
SELECT
  mc.name as category,
  COUNT(mi.id) as items_count,
  COUNT(mi.id) FILTER (WHERE mi.is_active = true) as active_items
FROM menu_categories mc
LEFT JOIN menu_items mi ON mi.category_id = mc.id
GROUP BY mc.id, mc.name
ORDER BY mc.sort_order;

-- View menu item details
SELECT
  mi.name,
  mi.dish_type,
  mi.department,
  jsonb_array_length(mi.variants) as variant_count,
  jsonb_array_length(COALESCE(mi.modifier_groups, '[]'::jsonb)) as modifier_groups_count,
  mi.is_active
FROM menu_items mi
ORDER BY mi.name;
```

### Check Component Availability

```sql
-- Find preparations by name pattern
SELECT id, name, type, output_quantity, output_unit, cost_per_portion
FROM preparations
WHERE name ILIKE '%fries%' AND is_active = true;

-- Find recipes by name pattern
SELECT id, name, category, portion_size, portion_unit, cost
FROM recipes
WHERE name ILIKE '%steak%' AND is_active = true;

-- Find products by name pattern
SELECT id, name, category, base_unit, base_cost_per_unit, can_be_sold
FROM products
WHERE name ILIKE '%salmon%' AND is_active = true;
```

## Success Criteria

- [ ] All 40+ menu items from TODO.md created in PROD
- [ ] All 3 dish types working correctly (simple, component-based, addon-based)
- [ ] POS customization dialogs work without errors
- [ ] Cost calculations are accurate (margins 30%+ for most items)
- [ ] Recipe write-offs work correctly for all item types
- [ ] No security or performance issues
- [ ] Menu loads in POS within 2 seconds
- [ ] Staff training materials created
- [ ] Menu is ready for soft launch

## Notes

- **We are working directly in PRODUCTION** - double-check all queries before execution
- All products/preparations/recipes already exist in PROD
- Use Supabase SQL Editor for complex queries (can review before running)
- Test each batch before moving to next
- Keep backup of any manual SQL inserts
