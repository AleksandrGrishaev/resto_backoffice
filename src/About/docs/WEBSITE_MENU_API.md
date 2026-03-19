# Website Menu API — Specification for web-winter

## Overview

The backoffice now manages website menu structure via **two new tables** that replace the old `menu_categories` + `website_settings.menu.excluded_categories` approach.

**Key change:** Website categories are fully independent from POS categories. The backoffice admin creates client-facing groups and categories, assigns menu items to them, and controls display order.

## Database Tables

### `website_menu_categories`

Hierarchical structure: **Groups** (top-level) contain **Categories** (children).

```sql
website_menu_categories (
  id            UUID PRIMARY KEY,
  name          TEXT NOT NULL,       -- Display name
  name_en       TEXT,                -- English name (reserved for translations)
  description   TEXT,
  slug          TEXT UNIQUE,         -- URL-safe identifier (e.g. "breakfast", "hot-coffee")
  image_url     TEXT,                -- Category image
  parent_id     UUID FK(self),       -- NULL = group (top-level), non-NULL = category within group
  sort_order    INTEGER DEFAULT 0,   -- Order within its level (among siblings)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
)
```

**Hierarchy:**

- `parent_id IS NULL` → **Group** (e.g. "Breakfast", "Dinner", "Coffee", "Drinks", "Cakes & Pastry")
- `parent_id IS NOT NULL` → **Category** within that group (e.g. "Sweet breakfast" under "Breakfast")

**RLS:** Public SELECT (anon), authenticated CRUD. No auth needed for reading.

### `website_menu_items`

Links `menu_items` to website categories with display overrides.

```sql
website_menu_items (
  id                    UUID PRIMARY KEY,
  category_id           UUID FK(website_menu_categories) ON DELETE CASCADE,
  menu_item_id          UUID FK(menu_items) ON DELETE CASCADE,
  variant_id            TEXT,                    -- NULL = whole item, non-null = specific variant
  sort_order            INTEGER DEFAULT 0,       -- Order within category
  display_name          TEXT,                    -- Override for item name on website
  display_description   TEXT,                    -- Override for description
  display_image_url     TEXT,                    -- Override for image
  variant_display_mode  TEXT DEFAULT 'options',  -- 'options' | 'separate'
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ,
  UNIQUE (category_id, menu_item_id, variant_id)
)
```

## How to Query

### 1. Get full menu hierarchy (groups → categories → items)

```typescript
// Step 1: Get all active categories
const { data: categories } = await supabase
  .from('website_menu_categories')
  .select('*')
  .eq('is_active', true)
  .order('sort_order')

// Step 2: Build hierarchy
const groups = categories.filter(c => !c.parent_id)
const getChildren = groupId =>
  categories.filter(c => c.parent_id === groupId).sort((a, b) => a.sort_order - b.sort_order)

// Step 3: Get all active items with menu_item data
const { data: items } = await supabase
  .from('website_menu_items')
  .select(
    `
    *,
    menu_item:menu_items(id, name, description, image_url, variants, type)
  `
  )
  .eq('is_active', true)
  .order('sort_order')
```

### 2. Optimized single query (recommended)

```sql
SELECT
  g.id as group_id, g.name as group_name, g.slug as group_slug,
  g.sort_order as group_sort, g.image_url as group_image,
  c.id as cat_id, c.name as cat_name, c.slug as cat_slug,
  c.sort_order as cat_sort, c.image_url as cat_image,
  wi.id as item_id, wi.menu_item_id, wi.variant_id,
  wi.display_name, wi.display_description, wi.display_image_url,
  wi.variant_display_mode, wi.sort_order as item_sort,
  mi.name as original_name, mi.description as original_description,
  mi.image_url as original_image, mi.variants, mi.type
FROM website_menu_categories g
JOIN website_menu_categories c ON c.parent_id = g.id AND c.is_active = true
LEFT JOIN website_menu_items wi ON wi.category_id = c.id AND wi.is_active = true
LEFT JOIN menu_items mi ON mi.id = wi.menu_item_id
WHERE g.parent_id IS NULL AND g.is_active = true
ORDER BY g.sort_order, c.sort_order, wi.sort_order;
```

## Display Logic

### Item Name Resolution

Priority order for displaying item name:

1. `website_menu_items.display_name` (admin override)
2. `menu_items.name` (original POS name)

Same for description and image.

```typescript
const displayName = item.display_name || menuItem.name
const displayImage = item.display_image_url || menuItem.image_url
const displayDescription = item.display_description || menuItem.description
```

### Variant Display Modes

Each `website_menu_items` row has `variant_display_mode`:

#### `'options'` (default)

- Item appears **once** in the category
- When customer clicks, show variant picker (radio buttons / selector)
- Variants come from `menu_items.variants` JSONB array
- `variant_id` is NULL in `website_menu_items`

#### `'separate'`

- Each variant appears as a **separate dish** in the category
- Multiple rows in `website_menu_items` with `variant_id` set
- Each row has its own `display_name` (format: "Item Name — Variant Name")
- Use `display_name` as the dish title, no variant picker needed

### Price Resolution

Prices come from `menu_items.variants` JSONB:

```typescript
const variants = menuItem.variants.filter(v => v.isActive)
const minPrice = Math.min(...variants.map(v => v.price))

// For 'separate' mode, find specific variant:
if (item.variant_id) {
  const variant = variants.find(v => v.id === item.variant_id)
  const price = variant?.price || 0
}
```

## Current Data Structure (Production)

```
Breakfast (group, slug: breakfast)
├── Sweet breakfast (6 items)
├── Breakfast (8 items)
└── Ciabatta (5 items)

Dinner (group, slug: dinner)
├── Starters (3 items)
├── Salad (2 items)
├── Burger (4 items)
├── Main (5 items)
├── Soup & Cury (4 items)
├── Poke & Fusion (6 items)
├── Pasta (2 items)
├── Dumplings (2 items)
└── Sides & sauce (7 items)

Coffee (group, slug: coffee)
├── Hot coffee (12 items)
├── Ice coffee (6 items)
├── Cacao (0 items)
└── Matcha (0 items)

Drinks (group, slug: drinks)
├── Juices & milkshake (6 items)
├── Hot drinks (2 items)
├── Beer (3 items)
├── Mocktails (4 items)
└── Soft Drinks (2 items)

Cakes & Pastry (group, slug: cakes-pastry)
└── Cakes & pastry (6 items)
```

## Migration from Old System

**Old approach (deprecated):**

- Read `menu_categories` table directly
- Use `website_settings.menu.excluded_categories` to hide categories
- All variants always shown as radio buttons

**New approach:**

- Read `website_menu_categories` + `website_menu_items`
- Groups/categories are fully independent from POS
- Admin controls which items appear, in what order, with name/image overrides
- Variant display mode can be `'options'` or `'separate'`

**Action required for web-winter:**

1. Replace `menu_categories` queries with `website_menu_categories`
2. Replace direct `menu_items` listing with `website_menu_items` JOIN `menu_items`
3. Remove `excluded_categories` logic from `website_settings`
4. Implement group → category → items hierarchy in menu UI
5. Handle `variant_display_mode` for each item
6. Use `display_name` / `display_image_url` overrides when present
