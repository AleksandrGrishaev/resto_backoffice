# Sprint: Constructor v2 — Status & last_edited_at Integration

## Контекст

Миграция 162 добавила два новых поля во все 4 таблицы (`menu_items`, `recipes`, `preparations`, `products`):

```sql
status TEXT NOT NULL DEFAULT 'active'  -- 'draft' | 'active' | 'archived'
last_edited_at TIMESTAMPTZ             -- only manual user edits, NOT batch recalculations
```

`is_active` пока сохраняется для обратной совместимости. Цель — перевести весь код на `status` + `last_edited_at`.

---

## Задачи

### 1. Types — добавить `status` и `lastEditedAt`

- [x] `src/stores/menu/types.ts` — `MenuItem`: добавить `status: 'draft' | 'active' | 'archived'`, `lastEditedAt: string`
- [x] `src/stores/recipes/types.ts` — `Recipe`, `Preparation`: аналогично
- [x] `src/stores/productsStore/types.ts` — `Product`: аналогично
- [x] `src/types/common.ts` — добавить `EntityStatus` type

### 2. Supabase mappers — маппинг snake_case → camelCase

- [x] `src/stores/menu/supabaseMappers.ts` — `status`, `last_edited_at` → `lastEditedAt`
- [x] `src/stores/recipes/supabaseMappers.ts` — аналогично для recipes + preparations
- [x] `src/stores/productsStore/supabaseMappers.ts` — аналогично

### 3. Services — обновить `last_edited_at` при ручном редактировании

**Ключевое правило:** `last_edited_at` обновляется ТОЛЬКО при:

- Создание через UI (constructor, dialog)
- Ручное редактирование (edit dialog, inline edit)
- Изменение статуса (activate/deactivate/archive)

**НЕ обновляется при:**

- Пересчёте стоимости (batch cost recalculation)
- Seed-скриптах
- Автоматических обновлениях (sync, triggers)

Файлы:

- [x] `src/stores/menu/menuService.ts` — `addMenuItem`, `updateMenuItem`: добавить `last_edited_at: new Date().toISOString()`
- [x] `src/stores/recipes/recipesService.ts` — `createRecipe`, `updateRecipe`, `createPreparation`, `updatePreparation`
- [x] `src/stores/productsStore/productsService.ts` — `createProduct`, `updateProduct`

### 4. Stores — sync `isActive` ↔ `status`

Временная обратная совместимость (пока POS использует `isActive`):

- [x] При сохранении: `isActive = (status === 'active')` — in menuService.update()
- [x] При чтении: если `status` есть → fallback from `is_active` — in all mappers
- [ ] В store actions: добавить `setStatus(id, status)` method (optional, can use update)

### 5. Constructor Hub — использовать `lastEditedAt` и `status`

- [x] `ConstructorHub.vue` — сортировка по `lastEditedAt` вместо `updatedAt`
- [x] Фильтр статуса: Draft / Active / Archived (вместо All / Active / Inactive)
- [x] Timeline группировка по `lastEditedAt` (Today / This week / This month / Older)
- [x] Badge цвета: draft=warning, active=success, archived=grey

### 6. Catalog — добавить статус в отображение

- [x] `useCatalogData.ts` — маппинг `status` в `CatalogItem`
- [x] `ItemDetailScreen.vue` — показывать `status` вместо `isActive`
- [x] `ItemsList.vue` — badge статуса на карточках
- [x] Фильтр статуса в CatalogScreen (вместо active/inactive)

### 7. POS — обратная совместимость

- [ ] POS фильтрует меню по `isActive` — пока продолжает работать (поле синхронизировано)
- [ ] В будущем: переход на `status === 'active'`

### 8. Constructor wizard — статус при сохранении

- [x] "Save" → `status: 'active'`, `isActive: true`
- [x] "Save Draft" → `status: 'draft'`, `isActive: false`
- [x] `last_edited_at` устанавливается автоматически при обоих

### 9. Admin views — поддержка статуса

- [ ] Menu admin — показать/использовать `status`
- [ ] Products admin — аналогично
- [ ] Recipes admin — аналогично

### 10. PROD migration

- [ ] Протестировать всё на DEV
- [ ] `mcp__supabase_prod__apply_migration` (с подтверждением)

---

## Порядок выполнения

```
1. Types + Mappers (1, 2) — фундамент
2. Services (3) — last_edited_at в записях
3. Stores (4) — sync isActive ↔ status
4. Constructor Hub (5) — timeline на lastEditedAt
5. Catalog (6) — статус в UI
6. Wizard (8) — draft/active при сохранении
7. Admin views (9) — опционально
8. PROD migration (10) — финал
```

---

## Текущее состояние Constructor (что уже сделано)

### Новые файлы:

- `constructor/composables/useConstructorState.ts` — shared state (mode, wizard data, source)
- `constructor/ConstructorHub.vue` — timeline dashboard с type/status/dept фильтрами
- `constructor/steps/StepModifiers.vue` — отдельный шаг модификаторов
- `constructor/steps/StepFinalize.vue` — name + category + preview + save

### Изменённые файлы:

- `constructor/ConstructorScreen.vue` — hub ↔ wizard mode switcher, Save Draft на любом шаге
- `constructor/steps/StepComposition.vue` — только ингредиенты (модификаторы вынесены)
- `catalog/detail/ItemDetailScreen.vue` — кнопка "Clone" → constructor
- `catalog/CatalogScreen.vue` — `createBased` emit
- `KitchenMainView.vue` — wiring catalog→constructor

### Старые файлы (можно удалить):

- `constructor/steps/StepBaseInfo.vue` — заменён на StepFinalize
- `constructor/steps/StepPreview.vue` — заменён на StepFinalize

### DB Migration 162 (applied to DEV):

- `status` (draft/active/archived) + CHECK constraints + indexes
- `last_edited_at` + indexes
- Backfill: `is_active=true` → `active`, `is_active=false` → `draft`
- Backfill: `last_edited_at` = `created_at`
