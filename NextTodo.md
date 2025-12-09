# Current Sprint: Nested Menu Categories

## Task: Nested categories (max 1 level)

### Requirements

- Max 1 level nesting (category -> subcategory)
- Items can be in both parent categories and subcategories
- If parent category is inactive -> subcategories are hidden
- Search only by dish names (not categories)
- POS: Categories -> (Subcategories + Items) -> Items -> Variants

### Implementation Phases

- [x] **Phase 1**: Database Migration (add parent_id)
- [x] **Phase 2**: TypeScript Types (Category, DTOs, defaults)
- [x] **Phase 3**: Mappers (supabaseMappers.ts)
- [x] **Phase 4**: Store Layer (menuStore.ts - getters, validation)
- [x] **Phase 5**: MenuCategoryDialog.vue (parent selector)
- [x] **Phase 6**: MenuView.vue (nested panels, search only dishes)
- [x] **Phase 7**: POS CategoryCard.vue (subcategory indicator)
- [x] **Phase 8**: POS MenuSection.vue (4-level navigation)
- [ ] **Phase 9**: Testing all flows
- [ ] **Phase 10**: Production migration file

### Files Modified

| File                                                    | Status |
| ------------------------------------------------------- | ------ |
| `src/supabase/migrations/042_add_nested_categories.sql` | Done   |
| `src/stores/menu/types.ts`                              | Done   |
| `src/stores/menu/supabaseMappers.ts`                    | Done   |
| `src/stores/menu/menuStore.ts`                          | Done   |
| `src/views/menu/components/MenuCategoryDialog.vue`      | Done   |
| `src/views/menu/MenuView.vue`                           | Done   |
| `src/views/pos/menu/components/CategoryCard.vue`        | Done   |
| `src/views/pos/menu/MenuSection.vue`                    | Done   |
