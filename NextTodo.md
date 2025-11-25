# Next Sprint - Preparation & Recipe Categories Refactoring

**Created:** 2025-11-24
**Priority:** High
**Status:** ✅ Phase 1 Complete | ✅ Phase 2 Complete | 🎉 Ready for Production

---

## 🎯 Sprint Goal

> **Refactor preparation types and recipe categories to use database tables (following product_categories pattern)**
>
> Two-phase approach:
>
> 1. **Phase 1:** Integrate existing `preparation_categories` table (already exists!)
> 2. **Phase 2:** Create `recipe_categories` table and migrate
>
> **Key principles:**
>
> - ✅ All UI text in English (no Cyrillic)
> - ✅ Use UUID foreign keys (data integrity)
> - ✅ Follow product categories pattern exactly
> - ✅ Load categories from database (not hardcoded constants)

---

## 📊 Current State Analysis

### Preparation Categories

- ✅ **Database table exists:** `preparation_categories` (7 categories)
- ❌ **Code still uses hardcoded constants** with Cyrillic text
- ❌ **Mismatch:** DB has (sauce, base, garnish, marinade, dough, filling, other)
  Code has (sauce, garnish, marinade, semifinished, seasoning)
- 🎯 **Decision:** Keep DB categories (7 categories) and update code

### Recipe Categories

- ❌ **No database table** - need to create
- ❌ **Hardcoded constants** with Cyrillic text
- 🎯 **Action:** Create table, seed data, migrate column

---

## 📋 PHASE 1: Preparation Categories Integration

### Task 1.1: Update TypeScript Types

**File:** `src/stores/recipes/types.ts`

**Actions:**

1. **Add PreparationCategory interface** (line ~310, before PREPARATION_TYPES):

```typescript
// Preparation Category (from database)
export interface PreparationCategory {
  id: string
  key: string
  name: string
  description?: string
  icon?: string
  emoji?: string
  color?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

2. **Update PreparationType** (replace existing type):

```typescript
// Updated to match database keys
export type PreparationType =
  | 'sauce'
  | 'base'
  | 'garnish'
  | 'marinade'
  | 'dough'
  | 'filling'
  | 'other'
```

3. **Delete PREPARATION_TYPES constant** (lines 310-317):

```typescript
// ❌ DELETE THIS:
export const PREPARATION_TYPES = [
  { value: 'sauce', text: 'Соусы', prefix: 'P' },
  { value: 'garnish', text: 'Гарниры', prefix: 'P' }
  // ... rest
] as const
```

4. **Update Preparation interface** (around line 302):

```typescript
export interface Preparation {
  id: string
  name: string
  nameEn?: string
  type: string // UUID (FK to preparation_categories), will migrate from TEXT
  servings?: number
  cookingTime?: number
  instructions?: string
  ingredients: RecipeIngredient[]
  outputProduct?: string
  outputQuantity?: number
  outputUnit?: MeasurementUnit
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

---

### Task 1.2: Add Categories to RecipesStore

**File:** `src/stores/recipes/recipesStore.ts`

**Actions:**

1. **Update RecipesState interface** (line ~40):

```typescript
interface RecipesState {
  recipes: Recipe[]
  preparations: Preparation[]
  preparationCategories: PreparationCategory[] // ✅ ADD THIS
  recipeCategories: RecipeCategory[] // ✅ ADD THIS (Phase 2)
  loading: boolean
  error: string | null
  initialized: boolean
}
```

2. **Update state initialization** (line ~50):

```typescript
state: (): RecipesState => ({
  recipes: [],
  preparations: [],
  preparationCategories: [], // ✅ ADD THIS
  recipeCategories: [],      // ✅ ADD THIS (Phase 2)
  loading: false,
  error: null,
  initialized: false
}),
```

3. **Add getters for preparation categories** (after existing getters, around line ~100):

```typescript
getters: {
  // ... existing getters

  // ✅ ADD: Preparation category getters
  activePreparationCategories: state =>
    state.preparationCategories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder),

  getPreparationCategoryById: state => (id: string) =>
    state.preparationCategories.find(c => c.id === id),

  getPreparationCategoryName: state => (id: string) =>
    state.preparationCategories.find(c => c.id === id)?.name || id,

  getPreparationCategoryColor: state => (id: string) =>
    state.preparationCategories.find(c => c.id === id)?.color || 'grey',

  getPreparationCategoryEmoji: state => (id: string) =>
    state.preparationCategories.find(c => c.id === id)?.emoji || '👨‍🍳',

  // Group preparations by category
  preparationsByCategory: state => {
    const grouped: Record<string, Preparation[]> = {}
    state.preparations.forEach(prep => {
      if (!grouped[prep.type]) {
        grouped[prep.type] = []
      }
      grouped[prep.type].push(prep)
    })
    return grouped
  },
},
```

4. **Update initialize() method** (around line ~150):

```typescript
async initialize() {
  if (this.initialized) {
    DebugUtils.info(MODULE_NAME, 'Already initialized')
    return
  }

  try {
    this.loading = true

    // ✅ ADD: Load categories first
    await this.loadPreparationCategories()
    await this.loadRecipeCategories() // Phase 2

    // Then load recipes and preparations
    await Promise.all([
      this.loadRecipes(),
      this.loadPreparations()
    ])

    this.initialized = true
    DebugUtils.info(MODULE_NAME, 'Initialized successfully', {
      recipes: this.recipes.length,
      preparations: this.preparations.length,
      preparationCategories: this.preparationCategories.length
    })
  } catch (error) {
    this.error = (error as Error).message
    DebugUtils.error(MODULE_NAME, 'Initialization failed', error)
  } finally {
    this.loading = false
  }
},
```

5. **Add loadPreparationCategories() action** (after loadPreparations, around line ~200):

```typescript
async loadPreparationCategories(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Loading preparation categories...')
    const categories = await recipesService.getPreparationCategories()
    this.preparationCategories = categories
    DebugUtils.store(MODULE_NAME, 'Loaded preparation categories', {
      count: categories.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load preparation categories', error)
    throw error
  }
},
```

---

### Task 1.3: Add Service Methods

**File:** `src/stores/recipes/recipesService.ts`

**Actions:**

1. **Add getPreparationCategories() method** (after getPreparations, around line ~100):

```typescript
async getPreparationCategories(): Promise<PreparationCategory[]> {
  if (!isSupabaseAvailable()) {
    DebugUtils.info(MODULE_NAME, 'Supabase not available, returning empty categories')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('preparation_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load preparation categories', error)
      throw error
    }

    const categories = (data || []).map(row => ({
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      icon: row.icon,
      emoji: row.emoji,
      color: row.color,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    DebugUtils.info(MODULE_NAME, 'Loaded preparation categories', {
      count: categories.length
    })

    return categories
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error loading preparation categories', error)
    throw error
  }
}
```

---

### Task 1.4: Migrate preparations.type to UUID

**File:** `src/supabase/migrations/009_migrate_preparations_type_to_uuid.sql`

**Migration SQL:**

```sql
-- Migration: Migrate preparations.type from TEXT to UUID foreign key
-- Created: 2025-11-24
-- Description: Convert preparations.type column to reference preparation_categories table

-- Step 1: Add new column with UUID type
ALTER TABLE preparations ADD COLUMN type_new UUID;

-- Step 2: Populate new column by matching keys
-- Map old TEXT keys to new UUID from preparation_categories
UPDATE preparations
SET type_new = pc.id
FROM preparation_categories pc
WHERE preparations.type = pc.key;

-- Step 3: Handle unmapped values (if any)
-- Check for preparations with NULL type_new (no match found)
DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM preparations
  WHERE type_new IS NULL;

  IF unmapped_count > 0 THEN
    -- Map unmapped preparations to 'other' category
    UPDATE preparations
    SET type_new = (SELECT id FROM preparation_categories WHERE key = 'other')
    WHERE type_new IS NULL;

    RAISE NOTICE 'Mapped % unmapped preparations to "other" category', unmapped_count;
  END IF;
END $$;

-- Step 4: Drop old column and rename new column
ALTER TABLE preparations DROP COLUMN type;
ALTER TABLE preparations RENAME COLUMN type_new TO type;

-- Step 5: Add NOT NULL constraint
ALTER TABLE preparations ALTER COLUMN type SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE preparations
  ADD CONSTRAINT fk_preparations_type
  FOREIGN KEY (type) REFERENCES preparation_categories(id)
  ON DELETE RESTRICT;

-- Step 7: Add index for performance
CREATE INDEX idx_preparations_type ON preparations(type);

-- Add comment
COMMENT ON COLUMN preparations.type IS 'Reference to preparation_categories.id (formerly TEXT key)';
```

**Apply migration:**

```bash
# Use MCP tool to apply migration
mcp__supabase__apply_migration({
  name: "migrate_preparations_type_to_uuid",
  query: "... SQL above ..."
})
```

---

### Task 1.5: Update Components

#### File: `src/views/recipes/RecipesView.vue`

**Current code (lines ~50-60):**

```typescript
// ❌ DELETE: Hardcoded preparation types
const preparationTypes = [
  { value: 'all', text: 'All Types' },
  { value: 'sauce', text: 'Соусы' },
  { value: 'garnish', text: 'Гарниры' }
  // ...
]
```

**Replace with:**

```typescript
import { useRecipesStore } from '@/stores/recipes'

const recipesStore = useRecipesStore()

// ✅ NEW: Load from store
const preparationTypes = computed(() => [
  { value: 'all', text: 'All Types' },
  ...recipesStore.activePreparationCategories.map(cat => ({
    value: cat.id,
    text: cat.name
  }))
])

// ✅ Helper functions
const getPreparationCategoryName = (categoryId: string) =>
  recipesStore.getPreparationCategoryName(categoryId)

const getPreparationCategoryColor = (categoryId: string) =>
  recipesStore.getPreparationCategoryColor(categoryId)

const getPreparationCategoryEmoji = (categoryId: string) =>
  recipesStore.getPreparationCategoryEmoji(categoryId)
```

**Update template** (replace Cyrillic with English labels):

```vue
<template>
  <!-- Filter section -->
  <v-select
    v-model="selectedPrepType"
    :items="preparationTypes"
    label="Preparation Type"
    density="compact"
  />

  <!-- Preparation display -->
  <v-chip :color="getPreparationCategoryColor(prep.type)" size="small">
    {{ getPreparationCategoryEmoji(prep.type) }}
    {{ getPreparationCategoryName(prep.type) }}
  </v-chip>
</template>
```

#### File: `src/views/Preparation/components/PreparationStockTable.vue`

**Update category display** (around line ~80):

```typescript
// ✅ Import store
import { useRecipesStore } from '@/stores/recipes'

const recipesStore = useRecipesStore()

// ✅ Replace hardcoded type labels
const getTypeLabel = (typeId: string) => recipesStore.getPreparationCategoryName(typeId)
const getTypeColor = (typeId: string) => recipesStore.getPreparationCategoryColor(typeId)
```

```vue
<template>
  <!-- Replace hardcoded text with store getters -->
  <v-chip :color="getTypeColor(item.type)" size="small">
    {{ getTypeLabel(item.type) }}
  </v-chip>
</template>
```

#### Files to update similarly:

- `src/stores/recipes/composables/usePreparations.ts`
- `src/stores/recipes/supabaseMappers.ts` (if it has type mapping logic)
- Any other components that display preparation types

---

## 📋 PHASE 2: Recipe Categories Migration

### Task 2.1: Create recipe_categories Table

**File:** `src/supabase/migrations/010_create_recipe_categories.sql`

**Migration SQL:**

```sql
-- Migration: Create recipe_categories table
-- Created: 2025-11-24
-- Description: Create normalized recipe categories table (following product_categories pattern)

-- Create recipe_categories table
CREATE TABLE recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_recipe_categories_key ON recipe_categories(key);
CREATE INDEX idx_recipe_categories_sort ON recipe_categories(sort_order);
CREATE INDEX idx_recipe_categories_active ON recipe_categories(is_active);

-- Enable Row Level Security
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all authenticated users
CREATE POLICY "Allow read for authenticated users"
  ON recipe_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow all operations for admins
CREATE POLICY "Allow all for admins"
  ON recipe_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- Seed initial categories (migrated from RECIPE_CATEGORIES constant)
INSERT INTO recipe_categories (key, name, description, color, icon, sort_order) VALUES
  ('main_dish', 'Main Dishes', 'Primary courses and entrees', 'red-darken-2', 'mdi-food-steak', 1),
  ('side_dish', 'Side Dishes', 'Accompaniments and sides', 'green-darken-2', 'mdi-food-variant', 2),
  ('dessert', 'Desserts', 'Sweet dishes and treats', 'pink-darken-2', 'mdi-cake', 3),
  ('appetizer', 'Appetizers', 'Starters and small plates', 'orange-darken-2', 'mdi-food-apple', 4),
  ('beverage', 'Beverages', 'Drinks and cocktails', 'blue-darken-2', 'mdi-glass-cocktail', 5),
  ('sauce', 'Sauces', 'Sauces and condiments', 'purple-darken-2', 'mdi-bottle-tonic', 6);

-- Add comments to table
COMMENT ON TABLE recipe_categories IS 'Recipe categories with localization and UI properties';
COMMENT ON COLUMN recipe_categories.key IS 'Unique English key for programmatic access';
COMMENT ON COLUMN recipe_categories.name IS 'Display name for UI';
COMMENT ON COLUMN recipe_categories.color IS 'Vuetify color name for UI chips';
COMMENT ON COLUMN recipe_categories.icon IS 'Material Design icon name';
COMMENT ON COLUMN recipe_categories.sort_order IS 'Display order in UI';
```

**Apply migration:**

```bash
mcp__supabase__apply_migration({
  name: "create_recipe_categories",
  query: "... SQL above ..."
})
```

---

### Task 2.2: Migrate recipes.category to UUID

**File:** `src/supabase/migrations/011_migrate_recipes_category_to_uuid.sql`

**Migration SQL:**

```sql
-- Migration: Migrate recipes.category from TEXT to UUID foreign key
-- Created: 2025-11-24
-- Description: Convert recipes.category column to reference recipe_categories table

-- Step 1: Add new column with UUID type
ALTER TABLE recipes ADD COLUMN category_new UUID;

-- Step 2: Populate new column by matching keys
-- Map old TEXT keys to new UUID from recipe_categories
UPDATE recipes
SET category_new = rc.id
FROM recipe_categories rc
WHERE recipes.category = rc.key;

-- Step 3: Handle unmapped values (if any)
DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM recipes
  WHERE category_new IS NULL;

  IF unmapped_count > 0 THEN
    -- Map unmapped recipes to 'main_dish' category (default)
    UPDATE recipes
    SET category_new = (SELECT id FROM recipe_categories WHERE key = 'main_dish')
    WHERE category_new IS NULL;

    RAISE NOTICE 'Mapped % unmapped recipes to "main_dish" category', unmapped_count;
  END IF;
END $$;

-- Step 4: Drop old column and rename new column
ALTER TABLE recipes DROP COLUMN category;
ALTER TABLE recipes RENAME COLUMN category_new TO category;

-- Step 5: Add NOT NULL constraint
ALTER TABLE recipes ALTER COLUMN category SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE recipes
  ADD CONSTRAINT fk_recipes_category
  FOREIGN KEY (category) REFERENCES recipe_categories(id)
  ON DELETE RESTRICT;

-- Step 7: Add index for performance
CREATE INDEX idx_recipes_category ON recipes(category);

-- Add comment
COMMENT ON COLUMN recipes.category IS 'Reference to recipe_categories.id (formerly TEXT key)';
```

**Apply migration:**

```bash
mcp__supabase__apply_migration({
  name: "migrate_recipes_category_to_uuid",
  query: "... SQL above ..."
})
```

---

### Task 2.3: Update TypeScript Types for Recipe Categories

**File:** `src/stores/recipes/types.ts`

**Actions:**

1. **Add RecipeCategory interface** (around line ~328):

```typescript
// Recipe Category (from database)
export interface RecipeCategory {
  id: string
  key: string
  name: string
  description?: string
  color?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

2. **Update RecipeCategoryType** (replace existing type):

```typescript
// Updated to match database keys
export type RecipeCategoryType =
  | 'main_dish'
  | 'side_dish'
  | 'dessert'
  | 'appetizer'
  | 'beverage'
  | 'sauce'
```

3. **Delete RECIPE_CATEGORIES constant** (lines ~319-326):

```typescript
// ❌ DELETE THIS:
export const RECIPE_CATEGORIES = [
  { value: 'main_dish', text: 'Основные блюда' },
  { value: 'side_dish', text: 'Гарниры' }
  // ... rest
] as const
```

4. **Update Recipe interface** (around line ~280):

```typescript
export interface Recipe {
  id: string
  name: string
  nameEn?: string
  category: string // UUID (FK to recipe_categories)
  servings?: number
  cookingTime?: number
  cookingSteps?: string[]
  ingredients: RecipeIngredient[]
  preparationIds: string[]
  isActive: boolean
  canBeSold: boolean
  price?: number
  createdAt: string
  updatedAt: string
}
```

---

### Task 2.4: Add Recipe Categories to Store

**File:** `src/stores/recipes/recipesStore.ts`

**Actions:**

1. **Add recipe category getters** (after preparation category getters):

```typescript
getters: {
  // ... existing getters
  // ... preparation category getters

  // ✅ ADD: Recipe category getters
  activeRecipeCategories: state =>
    state.recipeCategories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder),

  getRecipeCategoryById: state => (id: string) =>
    state.recipeCategories.find(c => c.id === id),

  getRecipeCategoryName: state => (id: string) =>
    state.recipeCategories.find(c => c.id === id)?.name || id,

  getRecipeCategoryColor: state => (id: string) =>
    state.recipeCategories.find(c => c.id === id)?.color || 'grey',

  getRecipeCategoryIcon: state => (id: string) =>
    state.recipeCategories.find(c => c.id === id)?.icon || 'mdi-food',

  // Group recipes by category
  recipesByCategory: state => {
    const grouped: Record<string, Recipe[]> = {}
    state.recipes.forEach(recipe => {
      if (!grouped[recipe.category]) {
        grouped[recipe.category] = []
      }
      grouped[recipe.category].push(recipe)
    })
    return grouped
  },
},
```

2. **Add loadRecipeCategories() action**:

```typescript
async loadRecipeCategories(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Loading recipe categories...')
    const categories = await recipesService.getRecipeCategories()
    this.recipeCategories = categories
    DebugUtils.store(MODULE_NAME, 'Loaded recipe categories', {
      count: categories.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load recipe categories', error)
    throw error
  }
},
```

---

### Task 2.5: Add Recipe Categories Service Methods

**File:** `src/stores/recipes/recipesService.ts`

**Actions:**

1. **Add getRecipeCategories() method**:

```typescript
async getRecipeCategories(): Promise<RecipeCategory[]> {
  if (!isSupabaseAvailable()) {
    DebugUtils.info(MODULE_NAME, 'Supabase not available, returning empty categories')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('recipe_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load recipe categories', error)
      throw error
    }

    const categories = (data || []).map(row => ({
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    DebugUtils.info(MODULE_NAME, 'Loaded recipe categories', {
      count: categories.length
    })

    return categories
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error loading recipe categories', error)
    throw error
  }
}
```

---

### Task 2.6: Update Components for Recipe Categories

#### File: `src/views/recipes/RecipesView.vue`

**Replace hardcoded categories** (around line ~40):

```typescript
// ❌ DELETE: Hardcoded recipe categories
const recipeCategories = [
  { value: 'all', text: 'All Categories' },
  { value: 'main_dish', text: 'Основные блюда' }
  // ...
]
```

**Replace with:**

```typescript
const recipesStore = useRecipesStore()

// ✅ NEW: Load from store
const recipeCategories = computed(() => [
  { value: 'all', text: 'All Categories' },
  ...recipesStore.activeRecipeCategories.map(cat => ({
    value: cat.id,
    text: cat.name
  }))
])

// ✅ Helper functions
const getRecipeCategoryName = (categoryId: string) => recipesStore.getRecipeCategoryName(categoryId)

const getRecipeCategoryColor = (categoryId: string) =>
  recipesStore.getRecipeCategoryColor(categoryId)

const getRecipeCategoryIcon = (categoryId: string) => recipesStore.getRecipeCategoryIcon(categoryId)
```

**Update template:**

```vue
<template>
  <!-- Filter section -->
  <v-select
    v-model="selectedCategory"
    :items="recipeCategories"
    label="Recipe Category"
    density="compact"
  />

  <!-- Recipe display -->
  <v-chip
    :color="getRecipeCategoryColor(recipe.category)"
    size="small"
    :prepend-icon="getRecipeCategoryIcon(recipe.category)"
  >
    {{ getRecipeCategoryName(recipe.category) }}
  </v-chip>
</template>
```

#### Update these components similarly:

- `src/views/recipes/components/UnifiedRecipeItem.vue` (category display)
- `src/views/recipes/components/UnifiedViewDialog.vue` (detail view)
- `src/views/recipes/components/UnifiedRecipeDialog.vue` (edit dialog)
- `src/stores/recipes/composables/useRecipes.ts`
- `src/stores/recipes/supabaseMappers.ts`

---

## 🧪 Testing Checklist

### Phase 1: Preparation Categories

- [ ] Run migration 009 on DEV database
- [ ] Verify preparations.type is UUID column
- [ ] Test preparation categories load in store
- [ ] Test RecipesView shows preparation categories
- [ ] Test PreparationStockTable shows correct categories
- [ ] Verify no TypeScript errors
- [ ] Test filtering by preparation type works
- [ ] Run migration 009 on PROD database

### Phase 2: Recipe Categories

- [ ] Run migrations 010 & 011 on DEV database
- [ ] Verify recipe_categories table created with 6 categories
- [ ] Verify recipes.category is UUID column
- [ ] Test recipe categories load in store
- [ ] Test RecipesView shows recipe categories
- [ ] Test recipe filtering by category works
- [ ] Test recipe dialogs show correct categories
- [ ] Verify no TypeScript errors
- [ ] Run migrations 010 & 011 on PROD database

---

## 🎯 Success Criteria

### Phase 1 Complete When:

- [ ] preparation_categories integrated into recipesStore
- [ ] All preparation type displays use store getters
- [ ] preparations.type column is UUID foreign key
- [ ] No Cyrillic text in UI
- [ ] No TypeScript errors
- [ ] Works in both DEV and PROD

### Phase 2 Complete When:

- [ ] recipe_categories table created with 6 categories
- [ ] All recipe category displays use store getters
- [ ] recipes.category column is UUID foreign key
- [ ] No Cyrillic text in UI
- [ ] No TypeScript errors
- [ ] Works in both DEV and PROD

---

## 📝 Files to Modify

### Phase 1: Preparation Categories

- `src/supabase/migrations/009_migrate_preparations_type_to_uuid.sql` (NEW)
- `src/stores/recipes/types.ts` (ADD PreparationCategory interface, UPDATE PreparationType)
- `src/stores/recipes/recipesStore.ts` (ADD preparationCategories state + getters + actions)
- `src/stores/recipes/recipesService.ts` (ADD getPreparationCategories())
- `src/views/recipes/RecipesView.vue` (REMOVE hardcoded types, USE store getters)
- `src/views/Preparation/components/PreparationStockTable.vue` (USE store getters)
- `src/stores/recipes/composables/usePreparations.ts` (USE store getters)
- `src/stores/recipes/supabaseMappers.ts` (UPDATE if needed)

### Phase 2: Recipe Categories

- `src/supabase/migrations/010_create_recipe_categories.sql` (NEW)
- `src/supabase/migrations/011_migrate_recipes_category_to_uuid.sql` (NEW)
- `src/stores/recipes/types.ts` (ADD RecipeCategory interface, UPDATE RecipeCategoryType)
- `src/stores/recipes/recipesStore.ts` (ADD recipeCategories state + getters + actions)
- `src/stores/recipes/recipesService.ts` (ADD getRecipeCategories())
- `src/views/recipes/RecipesView.vue` (REMOVE hardcoded categories, USE store getters)
- `src/views/recipes/components/UnifiedRecipeItem.vue` (USE store getters)
- `src/views/recipes/components/UnifiedViewDialog.vue` (USE store getters)
- `src/views/recipes/components/UnifiedRecipeDialog.vue` (USE store getters)
- `src/stores/recipes/composables/useRecipes.ts` (USE store getters)
- `src/stores/recipes/supabaseMappers.ts` (UPDATE if needed)

---

## 🚀 Implementation Order

**Recommended sequence:**

1. **Phase 1 - Steps 1.1 to 1.3** (TypeScript + Store, 30 min)
2. **Phase 1 - Step 1.4** (Migration, 15 min)
3. **Phase 1 - Step 1.5** (Components, 45 min)
4. **Test Phase 1** (30 min)
5. **Phase 2 - Steps 2.1 to 2.2** (Migrations, 30 min)
6. **Phase 2 - Steps 2.3 to 2.5** (TypeScript + Store, 45 min)
7. **Phase 2 - Step 2.6** (Components, 60 min)
8. **Test Phase 2** (30 min)
9. **Deploy to PROD** (30 min)

**Total estimated time:** 5-6 hours

---

## ✅ PHASE 1 COMPLETED (2025-11-24)

### Summary of Changes:

**1. TypeScript Types Updated:**

- ✅ Removed `PREPARATION_TYPES` constant from `types.ts`
- ✅ Added `PreparationCategory` interface
- ✅ Updated `PreparationType` to use new keys

**2. Store Integration:**

- ✅ Added `preparationCategories` state to recipesStore
- ✅ Added getters: `activePreparationCategories`, `getPreparationCategoryName`, etc.
- ✅ Added `loadPreparationCategories()` action
- ✅ Fixed `preparationsByType` to use UUID instead of text keys

**3. Service Methods:**

- ✅ Added `getPreparationCategories()` in recipesService
- ✅ Fixed `updatePreparation()` to save to Supabase

**4. Components Updated:**

- ✅ `UnifiedRecipeItem.vue` - replaced PREPARATION_TYPES with store getters
- ✅ `UnifiedViewDialog.vue` - replaced PREPARATION_TYPES with store getters
- ✅ `RecipeBasicInfoWidget.vue` - replaced PREPARATION_TYPES with store getters
- ✅ `RecipeFilters.vue` - added safe navigation for statistics
- ✅ `UnifiedRecipeDialog.vue` - fixed department field handling

**5. Bug Fixes:**

- ✅ Fixed `RecipesService` import in recipesStore
- ✅ Fixed `preparationIngredientToSupabaseInsert` to generate id
- ✅ Fixed department field not saving/loading

**6. Database Cleanup:**

- ✅ Removed duplicate `category_id` column (migration 010)

### Migration Files Created/Restored:

- ✅ Migration 009: `009_migrate_preparations_type_to_uuid.sql` (RESTORED from DB)
- ✅ Migration 010: `010_cleanup_preparations_category_id.sql` (NEW)

### Migrations Applied (DEV):

- ✅ Migration 009: `migrate_preparations_type_to_uuid` (version 20251124122314)
- ✅ Migration 010: `cleanup_preparations_category_id` (version 20251124222905)

---

## 🚀 PRODUCTION DEPLOYMENT

### ⚠️ IMPORTANT: Apply migrations to PROD before deploying code!

**Migrations to apply on PROD (in order):**

1. **Migration 009 - Migrate preparations.type to UUID**:

   - **File:** `src/supabase/migrations/009_migrate_preparations_type_to_uuid.sql`
   - **Status:** Check if already applied on PROD
   - **What it does:** Converts `preparations.type` from TEXT to UUID foreign key
   - **Verification:** Check if `preparations.type` is already UUID type

2. **Migration 010 - Cleanup category_id column**:
   - **File:** `src/supabase/migrations/010_cleanup_preparations_category_id.sql`
   - **Status:** ⚠️ PENDING - must be applied after migration 009
   - **What it does:** Removes duplicate `category_id` column
   - **Verification:** Check if `category_id` column exists

**Steps to apply:**

```bash
# Method 1: Using MCP Supabase tool (if connected to PROD)
# Switch MCP connection to PROD database first!
# Then use mcp__supabase__apply_migration with SQL from files

# Method 2: Using Supabase CLI
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@[PROD-HOST]:6543/postgres"

# Method 3: Manual via Supabase Dashboard
# Copy SQL from migration files → SQL Editor → Run
```

**Pre-migration verification (check what's already applied):**

```sql
-- Check if migration 009 is needed (is type still TEXT?)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name = 'type';
-- If data_type = 'text' → Migration 009 needed
-- If data_type = 'uuid' → Migration 009 already applied

-- Check if migration 010 is needed (does category_id still exist?)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name = 'category_id';
-- If returns row → Migration 010 needed
-- If no rows → Migration 010 already applied
```

**Post-migration verification:**

```sql
-- Verify preparations.type is UUID
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name = 'type';
-- Expected: data_type = 'uuid', is_nullable = 'NO'

-- Verify category_id is removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'preparations'
  AND column_name IN ('type', 'category_id');
-- Expected: only 'type' should exist

-- Check data integrity
SELECT COUNT(*) FROM preparations WHERE type IS NULL;
-- Expected: 0

-- Check foreign key constraint exists
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'preparations' AND column_name = 'type';
-- Expected: fk_preparations_type

-- Check data distribution by category
SELECT pc.name, COUNT(p.id) as prep_count
FROM preparation_categories pc
LEFT JOIN preparations p ON p.type = pc.id
GROUP BY pc.id, pc.name
ORDER BY prep_count DESC;
```

---

## ✅ PHASE 2 COMPLETED (2025-11-25)

### Summary of Changes:

**1. Database Migrations:**

- ✅ Migration 011: Created `recipe_categories` table with 6 categories
- ✅ Migration 012: Migrated `recipes.category` from TEXT to UUID foreign key
- ✅ All migrations applied successfully to DEV database

**2. TypeScript Types Updated:**

- ✅ Added `RecipeCategory` interface
- ✅ Renamed `RecipeCategory` type to `RecipeCategoryType`
- ✅ Removed `RECIPE_CATEGORIES` constant
- ✅ Updated `Recipe.category` to `string` (UUID)
- ✅ Updated `CreateRecipeData.category` to `string` (UUID)

**3. Store Integration:**

- ✅ Added `recipeCategories` state to recipesStore
- ✅ Added getters: `activeRecipeCategories`, `getRecipeCategoryById`, `getRecipeCategoryName`, `getRecipeCategoryColor`, `getRecipeCategoryIcon`
- ✅ Updated `loadRecipeCategories()` to load from database
- ✅ Removed duplicate `recipesByCategory` (already exists in composable)

**4. Service Methods:**

- ✅ Added `getRecipeCategories()` in RecipesService
- ✅ Maps database columns to TypeScript interfaces

**5. Components Updated:**

- ✅ `RecipesView.vue` - replaced hardcoded categories with store getters
- ✅ `UnifiedRecipeItem.vue` - replaced RECIPE_CATEGORIES with store getters
- ✅ `UnifiedViewDialog.vue` - replaced RECIPE_CATEGORIES with store getters
- ✅ `RecipeBasicInfoWidget.vue` - replaced RECIPE_CATEGORIES with store getters

### Database Verification:

```sql
-- ✅ recipe_categories table created with 6 categories
SELECT * FROM recipe_categories ORDER BY sort_order;
-- Results: main_dish, side_dish, dessert, appetizer, beverage, sauce

-- ✅ recipes.category is UUID foreign key
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'recipes' AND column_name = 'category';
-- Result: category | uuid

-- ✅ Foreign key constraint exists
SELECT constraint_name FROM information_schema.key_column_usage
WHERE table_name = 'recipes' AND column_name = 'category';
-- Result: fk_recipes_category

-- ✅ Data distribution correct
SELECT rc.name, COUNT(r.id) as recipe_count
FROM recipe_categories rc
LEFT JOIN recipes r ON r.category = rc.id
GROUP BY rc.id, rc.name;
-- Results: Side Dishes (2), Main Dishes (2), others (0)
```

### Migration Files Created:

- ✅ Migration 011: `011_create_recipe_categories.sql`
- ✅ Migration 012: `012_migrate_recipes_category_to_uuid.sql`

### Migrations Applied (DEV):

- ✅ Migration 011: `create_recipe_categories` (version: auto-generated)
- ✅ Migration 012: `migrate_recipes_category_to_uuid` (version: auto-generated)

---

## 🎉 SPRINT COMPLETE!

### Both Phases Completed Successfully:

✅ **Phase 1:** Preparation Categories Integration
✅ **Phase 2:** Recipe Categories Migration

### Key Achievements:

1. **Database normalization:** Both preparation and recipe categories now use proper database tables
2. **Type safety:** All category references use UUID foreign keys
3. **No hardcoded data:** Categories loaded from database (not constants)
4. **English UI:** All category names in English
5. **Consistent pattern:** Both systems follow product_categories pattern

### Next Steps - Production Deployment:

⚠️ **IMPORTANT:** Apply migrations to PROD database before deploying code!

**Migrations to apply on PROD (in order):**

1. Migration 009 (if not already applied) - `migrate_preparations_type_to_uuid`
2. Migration 010 (if not already applied) - `cleanup_preparations_category_id`
3. **Migration 011 (NEW)** - `create_recipe_categories`
4. **Migration 012 (NEW)** - `migrate_recipes_category_to_uuid`

**Pre-migration checks on PROD:**

```sql
-- Check if migration 009 needed (is preparations.type still TEXT?)
SELECT data_type FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name = 'type';

-- Check if migration 010 needed (does category_id still exist?)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'preparations' AND column_name = 'category_id';

-- Check current recipes.category type (should be TEXT before migration)
SELECT data_type FROM information_schema.columns
WHERE table_name = 'recipes' AND column_name = 'category';
```

**Apply migrations:**

```bash
# Method 1: Using Supabase SQL Editor (recommended for PROD)
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy SQL from migration files → Run
# 3. Verify with post-migration checks

# Method 2: Using Supabase CLI
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@[PROD-HOST]:6543/postgres"
```

**Post-migration verification:**

```sql
-- Verify recipe_categories table exists with 6 categories
SELECT COUNT(*) FROM recipe_categories;
-- Expected: 6

-- Verify recipes.category is UUID
SELECT data_type FROM information_schema.columns
WHERE table_name = 'recipes' AND column_name = 'category';
-- Expected: uuid

-- Verify no NULL categories
SELECT COUNT(*) FROM recipes WHERE category IS NULL;
-- Expected: 0

-- Check data integrity
SELECT rc.name, COUNT(r.id) as recipe_count
FROM recipe_categories rc
LEFT JOIN recipes r ON r.category = rc.id
GROUP BY rc.id, rc.name
ORDER BY recipe_count DESC;
```

---

## 📝 Success Criteria Met:

### Phase 1:

- [x] preparation_categories integrated into recipesStore
- [x] All preparation type displays use store getters
- [x] preparations.type column is UUID foreign key
- [x] No Cyrillic text in UI
- [x] No TypeScript errors
- [x] Works in DEV database

### Phase 2:

- [x] recipe_categories table created with 6 categories
- [x] All recipe category displays use store getters
- [x] recipes.category column is UUID foreign key
- [x] No Cyrillic text in UI
- [x] No TypeScript errors
- [x] Works in DEV database

### Ready for Production:

- [x] All migrations tested on DEV
- [x] All components updated
- [x] Application runs without errors
- [x] Migration files documented
- [ ] **TODO:** Apply migrations to PROD
- [ ] **TODO:** Deploy code to Vercel
- [ ] **TODO:** Verify in production

---

## 🚀 DEPLOYMENT READY

The sprint is complete and ready for production deployment! Apply the migrations to PROD database, then deploy the code to Vercel.
