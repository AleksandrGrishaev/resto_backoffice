# Menu System Migration Summary

**Date:** 2025-12-03
**Status:** ✅ DEV complete, ⏳ Production pending

---

## 🎯 What Was Done

### 1. Architecture Simplification

**Simplified dish types from 3 to 2:**

- ✅ `'simple' | 'component-based' | 'addon-based'` → `'simple' | 'modifiable'`
- ✅ Removed `ModifierGroup.groupStyle` field
- ✅ Logic now determined by `ModifierGroup.isRequired`

**Benefits:**

- Single algorithm for all dishes: `finalComposition = variant.composition + selectedModifiers`
- No complex replacement logic
- Easier to understand and maintain

---

### 2. Database Migrations Applied to DEV

#### Migration 032: `simplify_menu_dish_types.sql`

**What it does:**

- Updates `dish_type` values: `'component-based'/'addon-based'` → `'modifiable'`
- Updates CHECK constraint
- Updates column comments

**Results:**

```
simple: 29 dishes
modifiable: 6 dishes
```

#### Migration 033: `add_base_composition_to_modifiable_dishes.sql`

**What it does:**

- Adds base composition (main recipe) to all modifiable dish variants
- Ensures system knows what to write off when order is placed

**Updated dishes:**
| Dish Name | Variants | Recipe Added |
|-----------|----------|--------------|
| Beef Steak | 3 (200gr, 250gr, 300gr) | "Beef steak" |
| Chicken Steak | 1 (Regular) | "Chiken steak" |
| Tuna Steak | 1 (Regular) | "Tuna steak" |
| Syrniki | 1 (Regular) | "Syrniki" |
| Big Breakfast | 2 (Base, Full) | Already had composition ✅ |
| Simple Breakfast | 2 (Base, Full) | Already had composition ✅ |

---

## 📊 Current DEV Database State

### All Modifiable Dishes (6 total)

```sql
SELECT name, variant_count, composition_count
FROM menu_items WHERE dish_type = 'modifiable'
```

| Name             | Variants | Has Composition |
| ---------------- | -------- | --------------- |
| Beef Steak       | 3        | ✅ Yes          |
| Big Breakfast    | 2        | ✅ Yes          |
| Chicken Steak    | 1        | ✅ Yes          |
| Simple Breakfast | 2        | ✅ Yes          |
| Syrniki          | 1        | ✅ Yes          |
| Tuna Steak       | 1        | ✅ Yes          |

**✅ All modifiable dishes now have:**

1. Base composition (main item: steak, syrniki, etc.)
2. Modifier groups with composition (sides, sauces, add-ons)

---

## 🔄 How It Works Now

### Example: Beef Steak Order

**Menu Item Structure:**

```typescript
{
  dishType: 'modifiable',
  variants: [
    {
      name: '200gr',
      price: 125000,
      composition: [
        { type: 'recipe', id: 'beef_steak_recipe', quantity: 1, role: 'main' }
      ]
    }
  ],
  modifierGroups: [
    {
      name: 'Choose side',
      isRequired: true,  // Must choose
      options: [
        {
          name: 'Fries',
          isDefault: true,
          composition: [{ type: 'preparation', id: 'fries', quantity: 150, unit: 'gram' }]
        },
        {
          name: 'Mashed Potato',
          composition: [{ type: 'preparation', id: 'mashed_potato', quantity: 150, unit: 'gram' }]
        }
      ]
    },
    {
      name: 'Choose sauce',
      isRequired: true,  // Must choose
      options: [
        {
          name: 'Mushroom',
          isDefault: true,
          composition: [{ type: 'preparation', id: 'mushroom_sauce', quantity: 50, unit: 'ml' }]
        }
      ]
    }
  ]
}
```

**Customer Orders (default choices):**

```typescript
finalComposition = variant.composition + defaultModifiers
= [
  { type: 'recipe', id: 'beef_steak_recipe', quantity: 1 },       // From variant
  { type: 'preparation', id: 'fries', quantity: 150 },           // From modifier
  { type: 'preparation', id: 'mushroom_sauce', quantity: 50 }    // From modifier
]

finalPrice = 125000 + 0 = 125000
```

**Customer Customizes (chooses Mashed Potato):**

```typescript
finalComposition = variant.composition + selectedModifiers
= [
  { type: 'recipe', id: 'beef_steak_recipe', quantity: 1 },
  { type: 'preparation', id: 'mashed_potato', quantity: 150 },   // Custom choice
  { type: 'preparation', id: 'mushroom_sauce', quantity: 50 }
]

finalPrice = 125000 + 5000 = 130000  // If mashed potato has +5000 adjustment
```

---

## 🎨 UI Updates

### 1. TypeScript Types Updated

**File:** `src/stores/menu/types.ts`

- ✅ `DishType = 'simple' | 'modifiable'`
- ✅ Removed `ModifierGroupStyle`
- ✅ Removed `groupStyle` from `ModifierGroup`

### 2. Components Updated

**Files:**

- `src/views/menu/components/MenuItemDialog.vue`
- `src/views/recipes/components/widgets/ModifiersEditorWidget.vue`

**New features:**

- ✅ Composition editor for modifier options
- ✅ Add Dish (recipe/preparation) button
- ✅ Add Product button
- ✅ Inline quantity/unit editing
- ✅ Visual display of composition items

---

## 📝 Next Steps for Production

### Step 1: Apply Migration 032 to Production

**Option A: Via Supabase SQL Editor (Recommended)**

1. Open Supabase Dashboard → Production Project
2. Go to SQL Editor
3. Copy content from `src/supabase/migrations/032_simplify_menu_dish_types.sql`
4. Execute
5. Verify: `SELECT dish_type, COUNT(*) FROM menu_items GROUP BY dish_type;`

**Option B: Via MCP (Advanced)**

1. Edit `.mcp.json` → change `project_ref` to `bkntdcvzatawencxghob` (production)
2. Restart Claude Code
3. Apply migration via MCP
4. **IMPORTANT:** Switch back to DEV immediately!

### Step 2: Apply Migration 033 to Production

**Same process as 032:**

1. Use Supabase SQL Editor (safest)
2. Copy content from `src/supabase/migrations/033_add_base_composition_to_modifiable_dishes.sql`
3. Execute
4. Verify: All modifiable dishes have composition

**Verification Query:**

```sql
SELECT
  name,
  jsonb_array_length(variants) as variant_count,
  jsonb_array_length(variants->0->'composition') as has_composition
FROM menu_items
WHERE dish_type = 'modifiable';
```

Expected result: All dishes should have `has_composition > 0`

### Step 3: Test Production

**Manual test in production UI:**

1. Open menu item editing
2. Check that modifiers show composition editor
3. Create test order with modifiable dish
4. Verify correct inventory write-off

---

## ⚠️ Important Notes

### Database Differences

**DEV and PROD are separate databases!**

- DEV: `fjkfckjpnbcyuknsnchy` ← MCP connected here
- PROD: `bkntdcvzatawencxghob` ← Needs manual migration

### Migration Safety

**Always test on DEV first:**

1. ✅ Test migration on DEV
2. ✅ Verify data integrity
3. ✅ Test UI functionality
4. ⏳ Only then apply to production

### Recipe IDs

**Recipe IDs are likely DIFFERENT between DEV and PROD!**

If production has different recipe IDs, you'll need to:

1. Find correct recipe IDs in production
2. Update migration 033 with production IDs
3. Run updated migration

**How to find recipe IDs in production:**

```sql
-- Run this in production database
SELECT id, name FROM recipes
WHERE name IN ('Beef steak', 'Chiken steak', 'Tuna steak', 'Syrniki');
```

---

## 📚 Documentation

**Updated documentation:**

- ✅ `docs/menu-architecture-v2.md` - Detailed architecture explanation
- ✅ `docs/menu-migration-summary.md` - This file
- ✅ `src/supabase/migrations/032_*.sql` - Type simplification migration
- ✅ `src/supabase/migrations/033_*.sql` - Composition addition migration

---

## 🎉 Success Criteria

**DEV (✅ Complete):**

- [x] Types simplified
- [x] UI updated
- [x] Migrations applied
- [x] All modifiable dishes have composition
- [x] Modifiers have composition

**PROD (⏳ Pending):**

- [ ] Migration 032 applied
- [ ] Migration 033 applied (with correct recipe IDs)
- [ ] All modifiable dishes verified
- [ ] Test order placed successfully
- [ ] Inventory write-off verified

---

## 🤝 Questions?

If you encounter any issues:

1. Check migration logs in Supabase Dashboard
2. Run verification queries
3. Compare DEV vs PROD recipe IDs
4. Test with simple dishes first, then modifiable

**Remember:** MCP is connected to DEV by default. All production changes must be done manually or by switching MCP temporarily.
