# Menu System Architecture v2 (Simplified)

## 📋 Summary

**Date:** 2025-12-03
**Migration:** `032_simplify_menu_dish_types.sql`
**Changes:** Simplified from 3 dish types to 2, removed `groupStyle` field

---

## 🎯 Key Changes

### 1. Simplified Dish Types

**Before (3 types):**

```typescript
type DishType = 'simple' | 'component-based' | 'addon-based'
```

**After (2 types):**

```typescript
type DishType = 'simple' | 'modifiable'
// simple: Fixed composition, no modifiers
// modifiable: With required/optional modifiers
```

### 2. Removed `groupStyle` Field

**Before:**

```typescript
interface ModifierGroup {
  groupStyle: 'component' | 'addon' // ❌ Removed
  isRequired: boolean
}
```

**After:**

```typescript
interface ModifierGroup {
  // groupStyle removed
  isRequired: boolean // ✅ Determines behavior
}
```

**Logic:**

- `isRequired = true` → Customer MUST choose (replaces old "component" style)
- `isRequired = false` → Customer CAN add (replaces old "addon" style)

---

## 🏗️ Architecture Principles

### Unified Composition Calculation

**ALL dish types now use the same logic:**

```typescript
finalComposition = variant.composition + selectedModifiers.composition
```

**No more:**

- ❌ Component replacement logic
- ❌ Role-based searching and swapping
- ❌ Complex groupStyle conditions

### Composition Storage

**variant.composition:**

- Contains ONLY the **unchangeable parts** of the dish
- For simple dishes: complete composition
- For modifiable dishes: base composition (without replaceable parts)

**modifierOption.composition:**

- Contains what to ADD when this modifier is selected
- Always ADDITIVE (never replaces)
- For required modifiers: one option will always be selected

---

## 📝 Examples

### Example 1: Simple Dish (Fixed Composition)

```typescript
{
  dishType: 'simple',
  name: 'Pasta Carbonara',
  variants: [{
    name: 'Regular',
    price: 65000,
    composition: [
      { type: 'recipe', id: 'pasta_carbonara_recipe', quantity: 1, unit: 'portion' }
    ]
  }],
  modifierGroups: []  // No modifiers
}
```

**At POS:**

- Customer orders → gets exactly `variant.composition`
- No choices, no customization

---

### Example 2: Modifiable Dish (Required Modifiers)

**Steak with Side Dish**

```typescript
{
  dishType: 'modifiable',
  name: 'Grilled Steak',
  variants: [{
    name: 'Regular',
    price: 120000,
    // ✅ Only unchangeable parts
    composition: [
      { type: 'recipe', id: 'grilled_steak', quantity: 200, unit: 'gram', role: 'main' }
      // NO side dish here - it's added via required modifier!
    ]
  }],
  modifierGroups: [
    {
      name: 'Choose your side',
      isRequired: true,  // ✅ MUST choose
      minSelection: 1,
      maxSelection: 1,
      options: [
        {
          name: 'Fries',
          isDefault: true,  // ✅ Selected by default
          priceAdjustment: 0,
          composition: [
            { type: 'recipe', id: 'fries', quantity: 150, unit: 'gram', role: 'garnish' }
          ]
        },
        {
          name: 'Mashed Potato',
          priceAdjustment: 5000,
          composition: [
            { type: 'recipe', id: 'mashed_potato', quantity: 150, unit: 'gram', role: 'garnish' }
          ]
        }
      ]
    },
    {
      name: 'Choose your sauce',
      isRequired: true,  // ✅ MUST choose
      minSelection: 1,
      maxSelection: 1,
      options: [
        {
          name: 'Mushroom Sauce',
          isDefault: true,
          priceAdjustment: 0,
          composition: [
            { type: 'preparation', id: 'mushroom_sauce', quantity: 50, unit: 'ml', role: 'sauce' }
          ]
        },
        {
          name: 'Pepper Sauce',
          priceAdjustment: 5000,
          composition: [
            { type: 'preparation', id: 'pepper_sauce', quantity: 50, unit: 'ml', role: 'sauce' }
          ]
        }
      ]
    }
  ]
}
```

**At POS:**

**Scenario A: Customer doesn't customize (uses defaults)**

```typescript
finalComposition = variant.composition + defaultModifiers
= [
  { type: 'recipe', id: 'grilled_steak', quantity: 200, role: 'main' },
  { type: 'recipe', id: 'fries', quantity: 150, role: 'garnish' },  // From default modifier
  { type: 'preparation', id: 'mushroom_sauce', quantity: 50, role: 'sauce' }  // From default modifier
]

finalPrice = variant.price + 0 = 120000
```

**Scenario B: Customer chooses Mashed Potato + Pepper Sauce**

```typescript
finalComposition = variant.composition + selectedModifiers
= [
  { type: 'recipe', id: 'grilled_steak', quantity: 200, role: 'main' },
  { type: 'recipe', id: 'mashed_potato', quantity: 150, role: 'garnish' },  // Selected
  { type: 'preparation', id: 'pepper_sauce', quantity: 50, role: 'sauce' }  // Selected
]

finalPrice = variant.price + 5000 + 5000 = 130000
```

---

### Example 3: Modifiable Dish (Optional Modifiers)

**Coffee with Add-ons**

```typescript
{
  dishType: 'modifiable',
  name: 'Espresso',
  variants: [{
    name: 'Single',
    price: 25000,
    // ✅ Complete base composition
    composition: [
      { type: 'recipe', id: 'espresso_shot', quantity: 30, unit: 'ml', role: 'main' }
    ]
  }],
  modifierGroups: [
    {
      name: 'Add syrup',
      isRequired: false,  // ✅ Optional
      minSelection: 0,
      maxSelection: 2,  // Can choose multiple
      options: [
        {
          name: 'Vanilla',
          priceAdjustment: 5000,
          composition: [
            { type: 'product', id: 'vanilla_syrup', quantity: 10, unit: 'ml', role: 'addon' }
          ]
        },
        {
          name: 'Caramel',
          priceAdjustment: 5000,
          composition: [
            { type: 'product', id: 'caramel_syrup', quantity: 10, unit: 'ml', role: 'addon' }
          ]
        }
      ]
    }
  ]
}
```

**At POS:**

**Scenario A: No add-ons**

```typescript
finalComposition = variant.composition = [
  { type: 'recipe', id: 'espresso_shot', quantity: 30, role: 'main' }
]

finalPrice = 25000
```

**Scenario B: Add Vanilla syrup**

```typescript
finalComposition = variant.composition + selectedModifiers
= [
  { type: 'recipe', id: 'espresso_shot', quantity: 30, role: 'main' },
  { type: 'product', id: 'vanilla_syrup', quantity: 10, role: 'addon' }  // Added
]

finalPrice = 25000 + 5000 = 30000
```

**Scenario C: Add both Vanilla and Caramel**

```typescript
finalComposition = variant.composition + selectedModifiers
= [
  { type: 'recipe', id: 'espresso_shot', quantity: 30, role: 'main' },
  { type: 'product', id: 'vanilla_syrup', quantity: 10, role: 'addon' },
  { type: 'product', id: 'caramel_syrup', quantity: 10, role: 'addon' }
]

finalPrice = 25000 + 5000 + 5000 = 35000
```

---

## 💡 Benefits of Simplified Architecture

### 1. **Unified Logic**

- Single algorithm for ALL dish types
- No special cases or conditional logic
- Easy to understand and maintain

### 2. **No Duplication**

- Default components stored only in `modifierOption.isDefault = true`
- `variant.composition` contains only unchangeable parts

### 3. **Clearer Semantics**

```typescript
variant.composition    = "Always in the dish"
required modifiers     = "Must choose (but replaceable)"
optional modifiers     = "Can add"
```

### 4. **Simplified Types**

- Removed `ModifierGroupStyle` enum
- Removed complex replacement logic
- Fewer edge cases to handle

---

## 🔄 Inventory Calculation

### Transaction Flow

When an order is placed:

1. **Collect final composition:**

   ```typescript
   const finalComposition = [
     ...variant.composition,
     ...selectedModifiers.flatMap(m => m.composition || [])
   ]
   ```

2. **Write off inventory:**

   ```typescript
   for (const comp of finalComposition) {
     if (comp.type === 'product') {
       writeOffProduct(comp.id, comp.quantity, comp.unit)
     } else if (comp.type === 'recipe') {
       writeOffRecipe(comp.id, comp.quantity) // Recursively write off recipe ingredients
     } else if (comp.type === 'preparation') {
       writeOffPreparation(comp.id, comp.quantity) // Recursively write off preparation ingredients
     }
   }
   ```

3. **Record transaction:**
   ```typescript
   {
     orderId,
     menuItemId,
     variantId,
     selectedModifiers: [
       { groupId, optionId, priceAdjustment }
     ],
     finalComposition,
     totalPrice: variant.price + sum(selectedModifiers.priceAdjustment)
   }
   ```

---

## 🎨 UI Components

### ModifiersEditorWidget

**New features:**

- ✅ Composition editor for each modifier option
- ✅ Add Dish (recipe/preparation) to modifier composition
- ✅ Add Product to modifier composition
- ✅ Visual display of composition items
- ✅ Quantity and unit editing
- ✅ Remove composition items

**Props:**

```typescript
{
  modifierGroups: ModifierGroup[]
  templates: VariantTemplate[]
  dishType: DishType
  dishOptions: DishOption[]      // ✅ NEW
  productOptions: ProductOption[] // ✅ NEW
}
```

---

## 📊 Migration Notes

**Migration:** `032_simplify_menu_dish_types.sql`

**Changes applied:**

1. Updated `dish_type` values:

   - `'component-based'` → `'modifiable'`
   - `'addon-based'` → `'modifiable'`
   - `'simple'` → `'simple'`
   - `'final'` → `'simple'`

2. Updated CHECK constraint:

   ```sql
   CHECK (dish_type IN ('simple', 'modifiable'))
   ```

3. Updated column comments for documentation

**No data loss:**

- All existing modifier groups preserved
- `groupStyle` field remains in JSONB but is no longer used by application
- Can be cleaned up in future migration if needed

---

## 🚀 Next Steps

### Recommended Improvements

1. **Add Composition Validation:**

   - Warn if required modifier has no composition
   - Validate that composition references exist

2. **Cost Calculation:**

   - Auto-calculate modifier price based on composition cost
   - Show suggested price adjustments

3. **Bulk Composition Editor:**

   - Clone composition between modifier options
   - Apply composition templates

4. **Analytics:**
   - Track most popular modifier combinations
   - Optimize inventory based on modifier usage

---

## 📚 References

- Type definitions: `src/stores/menu/types.ts`
- UI components: `src/views/menu/components/`
- Migration: `src/supabase/migrations/032_simplify_menu_dish_types.sql`
