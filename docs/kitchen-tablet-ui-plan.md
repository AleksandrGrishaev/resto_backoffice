# Tablet UI — Technical Plan

## Vision

Two tablet-optimized interfaces:

- **/kitchen** — Recipe & ingredient management (chef/kitchen staff)
- **/admin** — Menu management, pricing by sales channel, collections (manager/admin)

Both extend the existing Kitchen Monitor architecture (KitchenLayout + sidebar screen switching).
Gradually migrate all backoffice functionality into these tablet views.

---

## Architecture: Extend Existing Kitchen Monitor

The Kitchen Monitor already has a proven tablet-friendly pattern:

- `KitchenLayout.vue` — sidebar (64-100px) + full-height content
- `KitchenSidebar.vue` — vertical screen buttons with `currentScreen` switching
- No router — internal state-based screen switching

**We extend this pattern:**

- Add new screens (Catalog, Constructor) to the existing KitchenSidebar
- For `/admin` — reuse the same KitchenLayout with a different sidebar

```
/kitchen (existing)                    /admin (new, same layout)
Sidebar screens:                       Sidebar screens:
├── Orders (existing)                  ├── Menu (collections)
├── Preparation (existing)             ├── Channels (pricing)
├── KPI (existing)                     ├── Dashboard (food cost KPIs)
├── Requests (existing)                └── (future: Storage, Reports...)
├── Inventory (existing)
├── Calculator (existing)
├── Catalog (NEW)          <-- browse products/preps/recipes
└── Constructor (NEW)      <-- wizard to build dishes
```

**No new layout needed.** Both /kitchen and /admin use KitchenLayout.

---

## Roles & Access

| Route    | Roles                        | Purpose                         |
| -------- | ---------------------------- | ------------------------------- |
| /kitchen | admin, manager, kitchen, bar | Recipe/ingredient management    |
| /admin   | admin, manager               | Menu/pricing/channel management |
| /        | admin, manager               | Existing backoffice (desktop)   |
| /pos     | admin, cashier               | POS (unchanged)                 |

---

## Phase 1: Kitchen — Catalog Screen

New screen in KitchenSidebar: browse, view, and export products/preparations/recipes.

### 1.1 Catalog — Unified Browse

Pure UI layer over existing stores. **No DB changes.**

```
+------------------------------------------+
| [Search________________________] [filter]|
|                                          |
| [All] [Products] [Preps] [Recipes]       |
| [Spices] [Vegetables] [Sauces] [...]     |
|                                          |
| +------------------+ +------------------+|
| | PRODUCT          | | PREPARATION      ||
| | Carrot           | | Maddras Curry    ||
| | gram | Rp 20/g   | | P-079 | ml       ||
| |                  | | 13 ingredients   ||
| +------------------+ +------------------+|
| +------------------+ +------------------+|
| | RECIPE           | | PREPARATION      ||
| | Vegetables Curry | | Chicken 100g     ||
| | R-111 | 5 comp.  | | P-068 | portion  ||
| | Rp 5,500/portion | | Rp 3,200/100g   ||
| +------------------+ +------------------+|
|                                          |
| [Export All ▾]                           |
+------------------------------------------+
```

**Data source — reads from existing stores (no DB changes):**

```typescript
const items = computed(() => {
  const products = productsStore.activeProducts.map(p => ({ ...p, _type: 'product' }))
  const preps = recipesStore.preparations.map(p => ({ ...p, _type: 'preparation' }))
  const recipes = recipesStore.recipes.map(r => ({ ...r, _type: 'recipe' }))
  return [...products, ...preps, ...recipes]
})
```

**Cards color-coded:** blue=product, orange=preparation, green=recipe

### 1.2 Catalog Detail — Full-Screen View + Export

Tap a card → full-screen detail replaces catalog content.
This IS the view/export interface — browse and export from one place.

```
+------------------------------------------+
| [< Back] Maddras Curry Homemade    [PDF] |
| P-079 | Preparation | Kitchen            |
+------------------------------------------+
| [Info] [Components] [Cost] [Used In]     |
+------------------------------------------+
|                                          |
| COMPONENTS (13):                         |
| ┌────────────────────────────────────┐  |
| │ Curcuma .................. 12 gram │  |
| │ Cumin Seed ............... 10 gram │  |
| │ Ginger powder ............ 12 gram │  |
| │ Ginger (fresh) ........... 35 gram │  |
| │ Cloves ................... 12 gram │  |
| │ Lemongrass ............... 40 gram │  |
| │ Galangal ................. 15 gram │  |
| │ Star Anise ................ 4 gram │  |
| │ Water ................... 800 ml   │  |
| │ Sugar .................... 15 gram │  |
| │ Coconut milk ............ 200 ml   │  |
| │ Salt ...................... 5 gram │  |
| │ Black pepper .............. 5 gram │  |
| └────────────────────────────────────┘  |
|                                          |
| OUTPUT: 1000 ml                          |
| COST: Rp X,XXX per 1000ml               |
| REC. PRICE (35%): Rp XX,XXX             |
+------------------------------------------+
```

**[PDF]** — exports current item via existing export system
**[< Back]** — returns to catalog card grid
**Tabs:** Info, Components, Cost breakdown, Used In (where this item is referenced)

### 1.3 Batch Export

From catalog list, [Export All] dropdown:

- Export all recipes as PDF
- Export all preparations as PDF
- Export full menu with recipes (reuses `exportMenuDetailed()`)

---

## Phase 2: Kitchen — Constructor Screen

### 2.1 Wizard Overview

New screen in KitchenSidebar. Step-by-step dish builder.

**3 steps** (type auto-detected, not selected):

```
[1. Base Info] ──> [2. Composition] ──> [3. Preview & Save]
      ^                                        |
      └──── can jump to any step ──────────────┘
```

**Auto-detection of dish type:**

- If modifier groups were added in Step 2 → `dishType = 'modifiable'`
- If no modifiers → `dishType = 'simple'`
- System decides automatically, chef doesn't choose

### 2.2 Step 1: Base Info

```
+------------------------------------------+
| CONSTRUCTOR                              |
| Step 1 of 3: Base Info                   |
+------------------------------------------+
|                                          |
| Name:                                    |
| [Vegetables Curry___________________]    |
|                                          |
| Department:                              |
| [ KITCHEN ]  [ BAR ]                    |
|    ^^^active                             |
|                                          |
| Category:                                |
| [Breakfast] [Toast] [Dinner] [Pasta]    |
| [Salad] [Soup] [Poke] [Pizza] [...]    |
|                   ^^^selected            |
|                                          |
| Description: (optional, collapsible)     |
| [________________________________]      |
|                                          |
|                         [Next ->]        |
+------------------------------------------+
```

No type selection. Just name, department, category.

### 2.3 Step 2: Composition

Everything is built here: base ingredients, modifiers, and inline entity creation.

```
+------------------------------------------+
| CONSTRUCTOR                              |
| Step 2 of 3: Composition                 |
+------------------------------------------+
|                                          |
| BASE INGREDIENTS:              [+ Add]  |
| ┌────────────────────────────────────┐  |
| │ Carrot              40 [gram] [x] │  |
| │ Product | Rp 20/g       Rp 800    │  |
| ├────────────────────────────────────┤  |
| │ Kentang (potato)    50 [gram] [x] │  |
| │ Product | Rp 24/g       Rp 1,200  │  |
| ├────────────────────────────────────┤  |
| │ Maddras Curry      100 [ml]  [x] │  |
| │ Prep P-079 | Rp 24/ml   Rp 2,400 │  |
| │ > tap to view 13 ingredients      │  |
| └────────────────────────────────────┘  |
|                                          |
| MODIFIERS: (optional)   [+ Add Group]   |
| ┌────────────────────────────────────┐  |
| │ PROTEIN            Required | 1    │  |
| │ ┌────────────────────────────────┐ │  |
| │ │ Tofu (Vegetarian)  80g  +Rp 0 │ │  |
| │ │ Chicken           100g  +Rp 0 │ │  |
| │ │             [+ Add option]     │ │  |
| │ └────────────────────────────────┘ │  |
| └────────────────────────────────────┘  |
|                                          |
| ─────────────────────────────────────── |
| COST PREVIEW (sticky bottom):           |
| Base cost:           Rp 5,500 / portion |
| + Tofu:              Rp 7,100           |
| + Chicken:           Rp 8,700           |
| Rec. price (35%):    Rp 20,000-25,000   |
|                                          |
| [<- Back]                   [Next ->]    |
+------------------------------------------+
```

**[+ Add] (ingredients)** — opens bottom sheet:

```
+------------------------------------------+
|                 ─────                     |  <- drag handle
| Search: [curry_____________________]     |
|                                          |
| [All] [Products] [Preps] [Recipes]       |
|                                          |
| ┌ Maddras Curry Homemade          PREP ┐|
| │ P-079 | ml | 13 ingredients          │|
| └──────────────────────────────────────┘|
| ┌ Madras curry (spice)          PRODUCT┐|
| │ gram | Spices                        │|
| └──────────────────────────────────────┘|
|                                          |
| ────── Not found? Create: ────────────  |
| [+ New Product] [+ New Preparation]     |
+------------------------------------------+
```

**[+ Add Group] (modifiers)** — adds a modifier group inline.
Modifiers section appears only when first group is added.
If all modifier groups are removed, dish auto-reverts to `simple`.

### 2.4 Inline Entity Creation (never leave the constructor)

When a product or preparation doesn't exist, create it right inside the constructor.

**[+ New Product]** — bottom sheet quick form:

```
+------------------------------------------+
|                 ─────                     |
| NEW PRODUCT                              |
|                                          |
| Name: [Galangal (Lengkuas)__________]   |
| Unit: [gram ▾]                          |
| Category: [Vegetables ▾]                |
|                                          |
|        [Cancel]    [Create & Add ->]     |
+------------------------------------------+
```

Creates product via productsStore, auto-adds to composition.

**[+ New Preparation]** — full-screen sub-wizard:

```
+------------------------------------------+
| [x] NEW PREPARATION                     |
+------------------------------------------+
| Name: [Maddras Curry Homemade________]  |
| Output: [1000] [ml ▾]                  |
| Department: [Kitchen ▾]                 |
|                                          |
| INGREDIENTS:               [+ Add]      |
| ┌────────────────────────────────────┐  |
| │ Curcuma .................. 12 gram │  |
| │ Cumin Seed ............... 10 gram │  |
| │ Ginger powder ............ 12 gram │  |
| │ ... (same component search)       │  |
| └────────────────────────────────────┘  |
|                                          |
| Cost: Rp X,XXX per 1000ml              |
|                                          |
|        [Cancel]   [Save & Use ->]       |
+------------------------------------------+
```

Creates preparation via recipesStore, auto-adds to main composition.
[+ Add] here uses the same bottom sheet search (can even create products from within the sub-wizard).

### 2.5 Step 3: Preview & Save

```
+------------------------------------------+
| CONSTRUCTOR                              |
| Step 3 of 3: Preview                     |
+------------------------------------------+
|                                          |
| VEGETABLES CURRY                         |
| Dinner | Kitchen                         |
| Type: Modifiable (auto-detected)        |
|                                          |
| BASE INGREDIENTS:                        |
| Carrot ................ 40g    Rp 800    |
| Potato ................ 50g    Rp 1,200  |
| Eggplant .............. 50g    Rp 600    |
| Zukini ................ 50g    Rp 500    |
| Maddras Curry ........ 100ml   Rp 2,400  |
|                                          |
| MODIFIERS:                               |
| Protein (required, pick 1):             |
|   Tofu 80g (+Rp 1,600)                  |
|   Chicken 100g (+Rp 3,200)              |
|                                          |
| ─────────────────────────────────────── |
| COST / RECOMMENDED PRICE:               |
|                                          |
|              Cost     Rec. Price   FC%   |
| + Tofu:      Rp 7,100  Rp 20,000  35%   |
| + Chicken:   Rp 8,700  Rp 25,000  35%   |
|                                          |
| [<- Back]                                |
|              [Save Draft]  [Save ->]     |
+------------------------------------------+
```

**[Save Draft]** — creates recipe + menu item (price=0, is_active=false)
**[Save]** — creates recipe + menu item (price=0, is_active=true)

Kitchen creates the structure. Price = 0 until admin sets it in /admin.

### 2.6 Edit Mode

Tap "Edit" on any dish in Catalog → opens Constructor with pre-populated data.
Can jump to any step directly. Same 3-step flow.

---

## Phase 3: Admin Interface

### 3.1 Architecture

Same KitchenLayout pattern, new route `/admin`, own sidebar with screens:

- Menu (collections)
- Channels (pricing matrix)
- Dashboard (food cost KPIs)

### 3.2 DB Migration: Collections

```sql
CREATE TABLE menu_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'draft' | 'seasonal'
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published' | 'archived'
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE menu_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES menu_collections(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, menu_item_id)
);
```

No date fields — activation is manual.
Channel visibility via existing `channel_menu_items` table.

### 3.3 Admin Menu Screen — Collections

```
+------------------------------------------+
| MENU COLLECTIONS            [+ New]      |
+------------------------------------------+
|                                          |
| ┌──────────────────────────────────────┐|
| │ Main Menu                   ACTIVE   │|
| │ 52 dishes | Published               │|
| │ Channels: Dine-in, Takeaway, GoBiz  │|
| └──────────────────────────────────────┘|
|                                          |
| ┌──────────────────────────────────────┐|
| │ Summer 2026                 SEASONAL │|
| │ 10 dishes | Draft                    │|
| └──────────────────────────────────────┘|
|                                          |
| ┌──────────────────────────────────────┐|
| │ Test — Week 10              DRAFT    │|
| │ 3 dishes | Draft                     │|
| └──────────────────────────────────────┘|
+------------------------------------------+
```

### 3.4 Admin Collection Detail — Dishes + Pricing

```
+------------------------------------------+
| [<] Summer 2026        [Publish] [...]   |
| 10 dishes | Draft                        |
+------------------------------------------+
| [Search]  [Kitchen] [Bar] [All]          |
+------------------------------------------+
|                                          |
| ┌──────────────────────────────────────┐|
| │ Vegetables Curry            Kitchen  │|
| │                                      │|
| │ Variant     Cost    Price   FC%      │|
| │ + Tofu      7,100   20,000  35%     │|
| │ + Chicken   8,700   25,000  35%     │|
| │                                      │|
| │ Channels: [Dine-in v] [GoBiz v]     │|
| │           [Takeaway x] [Grab x]     │|
| │                                      │|
| │ [Edit prices]  [Remove]             │|
| └──────────────────────────────────────┘|
|                                          |
| [+ Add dish]  [+ New dish -> Kitchen]   |
+------------------------------------------+
```

**[Edit prices]** — inline price editor per channel:

```
+------------------------------------------+
| VEGETABLES CURRY — Pricing               |
+------------------------------------------+
|                 Dine-in  GoBiz   Grab    |
| + Tofu          [20000] [18000] [22000] |
| + Chicken       [25000] [23000] [27000] |
|                                          |
| Tax:            11%      0%      0%      |
| Gross + Tofu:   22,200   18,000  22,000  |
| Gross + Chicken:27,750   23,000  27,000  |
|                                          |
|              [Cancel]  [Save]            |
+------------------------------------------+
```

### 3.5 Admin Channels Screen — Channel Matrix

Channel-centric view (adapted from existing ChannelPricingView):

- Select channel (tab or dropdown)
- See all menu items with prices for that channel
- Bulk enable/disable items
- Set prices per variant

### 3.6 Price Visibility Rules

| Field              | Kitchen (/kitchen) | Admin (/admin)     |
| ------------------ | ------------------ | ------------------ |
| Food cost          | Read-only          | Read-only          |
| Recommended price  | Read-only (35% FC) | Read-only (35% FC) |
| Selling price      | Read-only          | Editable           |
| Food cost %        | Read-only          | Read-only          |
| Channel pricing    | Not visible        | Editable           |
| Channel visibility | Not visible        | Editable           |

---

## File Structure

```
src/
├── views/
│   ├── kitchen/                              -- existing /kitchen
│   │   ├── KitchenMainView.vue               -- existing (add new screens)
│   │   ├── components/
│   │   │   └── KitchenSidebar.vue            -- existing (add Catalog + Constructor buttons)
│   │   ├── orders/                           -- existing
│   │   ├── preparation/                      -- existing
│   │   ├── kpi/                              -- existing
│   │   ├── request/                          -- existing
│   │   ├── inventory/                        -- existing
│   │   ├── calculator/                       -- existing
│   │   ├── catalog/                          -- NEW
│   │   │   ├── CatalogScreen.vue             -- main catalog screen
│   │   │   ├── CatalogDetailScreen.vue       -- full-screen detail + export
│   │   │   └── components/
│   │   │       ├── CatalogCard.vue           -- touch card (type-coded)
│   │   │       ├── CatalogFilters.vue        -- type + category chips
│   │   │       └── CatalogSearchBar.vue      -- large search input
│   │   └── constructor/                      -- NEW
│   │       ├── ConstructorScreen.vue         -- wizard container
│   │       ├── steps/
│   │       │   ├── StepBaseInfo.vue           -- name, dept, category
│   │       │   ├── StepComposition.vue        -- ingredients + modifiers
│   │       │   └── StepPreview.vue            -- preview + save
│   │       └── components/
│   │           ├── ComponentSearch.vue        -- bottom sheet search
│   │           ├── ComponentRow.vue           -- ingredient row
│   │           ├── CostPreview.vue            -- sticky cost widget
│   │           ├── ModifierGroupEditor.vue    -- modifier group card
│   │           ├── ModifierOptionRow.vue      -- modifier option row
│   │           ├── InlineNewProduct.vue       -- quick product form (bottom sheet)
│   │           └── InlineNewPreparation.vue   -- preparation sub-wizard (full screen)
│   └── admin/                                -- NEW /admin
│       ├── AdminMainView.vue                 -- same pattern as KitchenMainView
│       ├── components/
│       │   └── AdminSidebar.vue              -- sidebar with Menu/Channels/Dashboard
│       ├── menu/
│       │   ├── MenuScreen.vue                -- collections list
│       │   ├── CollectionDetailScreen.vue    -- dishes + pricing
│       │   └── components/
│       │       ├── CollectionCard.vue
│       │       ├── CollectionDishCard.vue
│       │       └── PricingEditor.vue
│       ├── channels/
│       │   ├── ChannelsScreen.vue            -- channel pricing matrix
│       │   └── components/
│       │       ├── ChannelPricingCard.vue
│       │       └── ChannelAvailability.vue
│       └── dashboard/
│           └── DashboardScreen.vue
├── components/
│   └── tablet/                               -- shared tablet components
│       ├── BottomSheet.vue                   -- slide-up panel
│       ├── TouchCard.vue                     -- base touch card
│       └── CostPreview.vue                   -- reusable cost widget
└── stores/
    └── menuCollections/                      -- NEW store (Phase 3 only)
        ├── index.ts
        ├── menuCollectionsStore.ts
        ├── menuCollectionsService.ts
        ├── types.ts
        └── supabaseMappers.ts
```

---

## Implementation Order

### Sprint 1: Kitchen Catalog

1. Add "Catalog" button to `KitchenSidebar.vue`
2. Add `catalog` to `currentScreen` type in `KitchenMainView.vue`
3. `CatalogScreen.vue` — unified card grid (products + preps + recipes)
4. `CatalogCard.vue` — touch-optimized, type-coded cards
5. `CatalogFilters.vue` + `CatalogSearchBar.vue`
6. `CatalogDetailScreen.vue` — full-screen detail with tabs + PDF export
7. Shared: `BottomSheet.vue`, `TouchCard.vue`

### Sprint 2: Kitchen Constructor (composition)

1. Add "Constructor" button to `KitchenSidebar.vue`
2. `ConstructorScreen.vue` — 3-step wizard with state persistence
3. `StepBaseInfo.vue` — name, department, category
4. `StepComposition.vue` — ingredients + modifiers in one screen
5. `ComponentSearch.vue` — bottom sheet with unified search
6. `CostPreview.vue` — live cost + recommended price (sticky bottom)

### Sprint 3: Constructor (inline creation + save)

1. `InlineNewProduct.vue` — quick product form in bottom sheet
2. `InlineNewPreparation.vue` — preparation sub-wizard (full screen)
3. `ModifierGroupEditor.vue` + `ModifierOptionRow.vue`
4. `StepPreview.vue` — preview + save (auto-detect simple/modifiable)
5. Save flow: recipesStore.createRecipe() + menuStore.addMenuItem()
6. Edit mode: load existing dish from Catalog into Constructor

### Sprint 4: Admin Interface + Collections

1. DB migration: `menu_collections` + `menu_collection_items`
2. `menuCollectionsStore` (CRUD)
3. `AdminMainView.vue` + `AdminSidebar.vue` (same pattern as Kitchen)
4. Router setup for `/admin`
5. `MenuScreen.vue` — collections list
6. `CollectionDetailScreen.vue` — dishes + pricing
7. `PricingEditor.vue` — per-channel price editor

### Sprint 5: Admin Channels + Polish

1. `ChannelsScreen.vue` — channel pricing matrix
2. Channel availability toggles
3. `DashboardScreen.vue` — food cost overview
4. Tablet responsive polish
5. Touch refinements

---

## Design Principles

1. **Extend, don't replace** — add screens to existing KitchenLayout, don't create new layouts
2. **Bottom sheets for search/select** — slide up, swipe down to close
3. **Large touch targets** — minimum 48px, primary actions 56px
4. **Catalog = browse + view + export** — one interface, not separate sections
5. **Color-coded types** — blue=product, orange=preparation, green=recipe
6. **Cost always visible** — food cost, recommended price (cost / 0.35), food cost %
7. **Auto-detect dish type** — system decides simple/modifiable based on modifier presence
8. **Never leave the constructor** — create products + preparations inline
9. **Kitchen: read-only prices** — sees costs & recommendations, cannot edit
10. **Admin: full price control** — edits prices per channel, manages availability

---

## Data Flow

### Constructor saves (Kitchen)

```
Step 2 (Composition):
  - Inline created product? -> productsStore.createProduct()
  - Inline created preparation? -> recipesStore.createPreparation()

Step 3 (Save):
  1. recipesStore.createRecipe() — with components
  2. menuStore.addMenuItem() — with variants + modifiers (price=0)
  3. dishType auto-set: modifiers present ? 'modifiable' : 'simple'
  4. type auto-set: department === 'kitchen' ? 'food' : 'beverage'
```

Kitchen creates the structure. Price = 0 until admin sets it.

### Admin pricing

```
Admin opens collection -> sees dishes with cost & recommended price
  -> sets price per variant per channel
  -> channelsStore.setChannelPrice()
  -> toggles availability per channel
  -> channelsStore.setMenuItemAvailability()
```

### Collection publish

```
Admin publishes collection:
  -> all dishes become visible in POS for enabled channels
  -> archive collection: dishes hidden from POS
```

## progress

Build passes. Here's a summary of everything implemented:

---

Implementation Summary

Files Created (27 new files)

Shared types & components:

- src/views/kitchen/types.ts — KitchenScreenName union (Gap #13)
- src/components/tablet/BottomSheet.vue — Vuetify-based bottom sheet (Gap #4)
- src/components/tablet/TouchCard.vue — Touch-optimized card base

Sprint 1 — Catalog (6 files):

- src/views/kitchen/catalog/CatalogScreen.vue — Main catalog with search, filters, grid, export
- src/views/kitchen/catalog/CatalogDetailScreen.vue — Full detail with Info/Components/Cost/Used In tabs (Gap #8)
- src/views/kitchen/catalog/components/CatalogCard.vue — Type-coded cards (blue/orange/green)
- src/views/kitchen/catalog/components/CatalogFilters.vue — Type + category chips
- src/views/kitchen/catalog/components/CatalogSearchBar.vue

Sprint 2-3 — Constructor (8 files):

- src/views/kitchen/constructor/ConstructorScreen.vue — 3-step wizard with save flow (Gap #1, #2)
- src/views/kitchen/constructor/steps/StepBaseInfo.vue — Name, department, category
- src/views/kitchen/constructor/steps/StepComposition.vue — Ingredients + modifiers
- src/views/kitchen/constructor/steps/StepPreview.vue — Preview + cost + save/draft
- src/views/kitchen/constructor/components/ComponentRow.vue
- src/views/kitchen/constructor/components/ComponentSearch.vue — Bottom sheet search + inline create
- src/views/kitchen/constructor/components/InlineNewProduct.vue (Gap #12)
- src/views/kitchen/constructor/components/InlineNewPreparation.vue (Gap #11)
- src/views/kitchen/constructor/components/ModifierGroupEditor.vue (Gap #9 — addon-only MVP)
- src/views/kitchen/constructor/components/CostPreview.vue

Sprint 4 — Admin + Collections (10 files):

- src/supabase/migrations/160_menu_collections.sql — Complete with RLS, triggers, grants, indexes (Gap #6)
- src/stores/menuCollections/ — Full store module (types, mappers, service, store, index) (Gap #7)
- src/views/admin/AdminMainView.vue — KitchenLayout-based admin interface
- src/views/admin/types.ts — AdminScreenName
- src/views/admin/components/AdminSidebar.vue
- src/views/admin/menu/MenuScreen.vue — Collections CRUD
- src/views/admin/menu/CollectionDetailScreen.vue — Dishes + pricing + publish/archive (Gap #3)
- src/views/admin/channels/ChannelsScreen.vue — Channel pricing matrix
- src/views/admin/dashboard/DashboardScreen.vue — Placeholder for Sprint 5

Files Modified (8 files)

- src/views/kitchen/KitchenMainView.vue — Added catalog + constructor screens with async loading (Gap #14)
- src/views/kitchen/components/KitchenSidebar.vue — Added Catalog + Constructor buttons, shared type
- src/core/initialization/types.ts — Added menuCollections to StoreName union
- src/core/initialization/dependencies.ts — Added deps, categories for menuCollections
- src/core/initialization/DevInitializationStrategy.ts — Added loadMenuCollections loader
- src/core/initialization/ProductionInitializationStrategy.ts — Added loadMenuCollectionsFromAPI loader
- src/router/index.ts — Added /admin route with auth guard

# Tablet UI Implementation — Code Review Instructions

## Summary

This PR implements the Tablet UI plan across 5 sprints, adding **Kitchen Catalog**, **Kitchen Constructor**, and **Admin Interface** (collections, channels, dashboard) to the kitchen tablet app. It resolves 18 identified gaps from the gap analysis.

## What Changed

### New Files (26 files)

#### Shared Components

- `src/components/tablet/BottomSheet.vue` — Vuetify v-bottom-sheet wrapper with drag handle, slots
- `src/components/tablet/TouchCard.vue` — Touch-optimized card with color coding

#### Kitchen Catalog (Sprint 1)

- `src/views/kitchen/types.ts` — Shared `KitchenScreenName` type
- `src/views/kitchen/catalog/CatalogScreen.vue` — Main catalog: unified products/preparations/recipes grid
- `src/views/kitchen/catalog/CatalogDetailScreen.vue` — Detail view with Info/Components/Cost/Used In tabs
- `src/views/kitchen/catalog/components/CatalogCard.vue` — Type-coded card (blue=product, orange=prep, green=recipe)
- `src/views/kitchen/catalog/components/CatalogFilters.vue` — Type + category filter chips
- `src/views/kitchen/catalog/components/CatalogSearchBar.vue` — Search input

#### Kitchen Constructor (Sprints 2-3)

- `src/views/kitchen/constructor/ConstructorScreen.vue` — 3-step wizard (Base Info -> Composition -> Preview)
- `src/views/kitchen/constructor/steps/StepBaseInfo.vue` — Name, department, category, description
- `src/views/kitchen/constructor/steps/StepComposition.vue` — Ingredients + modifiers editing
- `src/views/kitchen/constructor/steps/StepPreview.vue` — Preview with cost summary
- `src/views/kitchen/constructor/components/ComponentRow.vue` — Ingredient row with cost
- `src/views/kitchen/constructor/components/ComponentSearch.vue` — Bottom sheet product/prep search
- `src/views/kitchen/constructor/components/InlineNewProduct.vue` — Quick product creation form
- `src/views/kitchen/constructor/components/InlineNewPreparation.vue` — Quick preparation creation sub-wizard
- `src/views/kitchen/constructor/components/ModifierGroupEditor.vue` — Addon modifier editor (MVP)
- `src/views/kitchen/constructor/components/CostPreview.vue` — Sticky cost widget

#### Admin Interface (Sprints 4-5)

- `src/views/admin/AdminMainView.vue` — Admin layout with KitchenLayout reuse
- `src/views/admin/components/AdminSidebar.vue` — Admin navigation sidebar
- `src/views/admin/menu/MenuScreen.vue` — Collections list + create
- `src/views/admin/menu/CollectionDetailScreen.vue` — Collection detail with dishes management
- `src/views/admin/channels/ChannelsScreen.vue` — Channel pricing view
- `src/views/admin/dashboard/DashboardScreen.vue` — Placeholder

#### Store: Menu Collections (Sprint 4)

- `src/stores/menuCollections/types.ts` — MenuCollection, MenuCollectionItem, DTOs
- `src/stores/menuCollections/supabaseMappers.ts` — DB row mappers
- `src/stores/menuCollections/menuCollectionsService.ts` — CRUD + publish/archive
- `src/stores/menuCollections/menuCollectionsStore.ts` — Pinia store
- `src/stores/menuCollections/index.ts` — Re-exports

#### Database Migration

- `src/supabase/migrations/160_menu_collections.sql` — Tables, indexes, RLS, grants

### Modified Files (7 files)

- `src/views/kitchen/KitchenMainView.vue` — Added Catalog + Constructor screens (async loaded)
- `src/views/kitchen/components/KitchenSidebar.vue` — Added Catalog + Constructor buttons
- `src/router/index.ts` — Added `/admin` route for admin/manager roles
- `src/core/initialization/types.ts` — Added `'menuCollections'` to StoreName union
- `src/core/initialization/dependencies.ts` — Added menuCollections deps + category
- `src/core/initialization/DevInitializationStrategy.ts` — Added menuCollections loader
- `src/core/initialization/ProductionInitializationStrategy.ts` — Added menuCollections loader

## Gap Resolutions to Verify

| #     | Gap                          | Resolution                                                                                                                  | What to Check                                                                                                                    |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Recipe-to-MenuItem mapping   | Constructor creates Recipe first, then MenuItem with `composition: [{ type: 'recipe', id, quantity: 1, unit: 'portion' }]`  | `ConstructorScreen.vue:saveConstructorItem()` — verify two-step: createRecipe then updateRecipe for components, then addMenuItem |
| 2     | Dual category system         | Auto-infer recipe_categories from department (kitchen->main_dish, bar->beverage). MenuItem uses menu_categories from Step 1 | `ConstructorScreen.vue:recipeCategoryMap`                                                                                        |
| 3     | Collection publish           | Publish = bulk `is_active=true` on members. Archive = status change only (safe for multi-collection items)                  | `menuCollectionsService.ts:publishCollection()` and `archiveCollection()`                                                        |
| 4     | BottomSheet                  | Vuetify v-bottom-sheet wrapper, NOT custom from scratch                                                                     | `BottomSheet.vue`                                                                                                                |
| 5     | Edit mode                    | NOT IMPLEMENTED (deferred). Constructor is create-only for now                                                              | N/A                                                                                                                              |
| 6     | Migration SQL                | Complete: tables, trigger, indexes, RLS, grants, NOTIFY                                                                     | `160_menu_collections.sql` — Applied to DEV only                                                                                 |
| 7     | Store initialization         | Added to StoreName, STORE_DEPENDENCIES (depends on menu), STORE_CATEGORIES (backoffice)                                     | Check all 4 initialization files                                                                                                 |
| 8     | "Used In" reverse lookup     | CatalogDetailScreen scans preparations, recipes, and menuItems JSONB compositions                                           | `CatalogDetailScreen.vue` — usedIn computed                                                                                      |
| 9     | Modifier targetComponents    | Addon-only MVP. Replacement type deferred                                                                                   | `ModifierGroupEditor.vue` — only addon type                                                                                      |
| 10    | Price=0 in POS               | Constructor saves price=0, admin sets pricing later. Items save as draft (is_active controlled by save/saveDraft)           | `ConstructorScreen.vue` variant price=0                                                                                          |
| 11    | Inline prep missing fields   | Added preparation category dropdown, defaults for prepTime (0) and instructions ('')                                        | `InlineNewPreparation.vue`                                                                                                       |
| 12    | Product category full object | Resolves full ProductCategory from productsStore.categories                                                                 | `InlineNewProduct.vue`                                                                                                           |
| 13    | KitchenScreenName type       | Extracted to `src/views/kitchen/types.ts`, used by KitchenMainView + KitchenSidebar                                         | `types.ts`                                                                                                                       |
| 14    | Async component loading      | CatalogScreen + ConstructorScreen use `defineAsyncComponent`                                                                | `KitchenMainView.vue`                                                                                                            |
| 15    | Sidebar overflow             | Not explicitly handled — 8 buttons at 56px. Monitor on real tablets                                                         | Visual check                                                                                                                     |
| 16-18 | Low priority                 | Deferred                                                                                                                    | N/A                                                                                                                              |

## Critical Review Points

### 1. Constructor Save Flow (MOST IMPORTANT)

File: `src/views/kitchen/constructor/ConstructorScreen.vue`

The save is a multi-step operation:

1. `recipesStore.createRecipe(data)` — creates recipe WITHOUT components
2. `recipesStore.updateRecipe(id, { components })` — adds components after creation
3. `menuStore.addMenuItem(data)` — creates menu item referencing the recipe

**Verify**: If step 2 or 3 fails, we have a dangling/incomplete recipe. There's a TODO comment about rollback strategy. Acceptable for MVP?

### 2. menuCollectionsService.ts — Supabase Import

Must use `import { supabase } from '@/supabase/client'` (NOT `@/config/supabase` which doesn't exist).

### 3. Admin Route Guard

`/admin` route allows `['admin', 'manager']`. Verify it loads correct stores on mount (AdminMainView initializes menuCollections + channels stores).

### 4. Collection Publish Safety

`publishCollection()` bulk-sets `is_active=true` on all member menu items. Does NOT check if items belong to other collections. Acceptable trade-off documented in Gap #3 comments.

### 5. Type Safety

- `WizardState` is exported from ConstructorScreen as interface — used by StepPreview
- `CatalogItemType` from CatalogFilters — verify consistent usage
- `KitchenScreenName` — verify all screen components handle all cases

## Database Changes

**Migration 160** — Applied to DEV only (NOT PROD):

- `menu_collections` table (id, name, type, status, description, created_by, timestamps)
- `menu_collection_items` table (id, collection_id FK, menu_item_id FK, sort_order, notes, timestamp)
- Unique constraint on (collection_id, menu_item_id)
- Indexes on collection_id, menu_item_id, status
- RLS: SELECT for authenticated, full CRUD for authenticated (role check at app level)
- Grants: service_role on both tables
- Trigger: update_updated_at on menu_collections

## Not Implemented (Deferred)
