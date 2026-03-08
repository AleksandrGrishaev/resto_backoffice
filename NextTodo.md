# Sprint: Entity Change History (Recipes & Preparations)

> Аудит-лог изменений рецептов и полуфабрикатов с отображением в Kitchen Constructor
> Следующий номер миграции: **170**
> Все на DEV (`mcp__supabase_dev__*`), PROD — позже отдельным шагом

---

## Цель

Отслеживать **кто**, **когда** и **что** изменил в рецептах и полуфабрикатах.
Отображать историю изменений по дням во вкладке History в диалогах конструктора.

### Отслеживаемые поля

**Recipe:**
| Поле | Описание |
|------|----------|
| `name` | Название |
| `code` | Код |
| `category` | Категория (UUID → name для отображения) |
| `department` | Отдел (kitchen/bar) |
| `portion_size` | Размер порции |
| `portion_unit` | Единица порции |
| `components[]` | Состав рецепта (детальный diff) |

**Preparation:**
| Поле | Описание |
|------|----------|
| `name` | Название |
| `code` | Код |
| `type` | Тип/категория (UUID → name) |
| `department` | Отдел (kitchen/bar) |
| `output_quantity` | Выход |
| `output_unit` | Единица выхода |
| `portion_type` | Тип порционирования |
| `portion_size` | Размер порции |
| `preparation_time` | Время приготовления |
| `shelf_life` | Срок хранения |
| `recipe[]` (components) | Состав (детальный diff) |

**Исключаем**: `cost`, `last_known_cost`, `cost_per_portion`, `avg_daily_usage`, `min_stock_threshold`, `updated_at`, `last_edited_at`, `is_active` — все автоматические/динамические поля.

### Diff для компонентов (components/recipe[])

Сравнение по `id`/`componentId`:

```
+ Added: Chicken breast 200g
- Removed: Beef 150g
~ Changed: Rice 100g → 150g
~ Changed: Shrimp unit: g → portion
```

---

## Фаза 1: Миграция БД

### 1.1 Migration 170: entity_change_log

**Файл:** `src/supabase/migrations/170_entity_change_log.sql`

```sql
-- Migration: 170_entity_change_log
-- Description: Audit log for recipe and preparation changes
-- Date: 2026-03-08

CREATE TABLE entity_change_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('recipe', 'preparation')),
  entity_id       UUID NOT NULL,
  entity_name     TEXT NOT NULL,
  changed_by      UUID,
  changed_by_name TEXT NOT NULL DEFAULT 'Unknown',
  change_type     TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'archived', 'restored', 'cloned')),
  changes         JSONB NOT NULL DEFAULT '{}',
  -- changes format: { "fieldName": { "old": ..., "new": ... } }
  -- components format: { "components": { "added": [...], "removed": [...], "modified": [...] } }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_ecl_entity ON entity_change_log(entity_type, entity_id);
CREATE INDEX idx_ecl_created_at ON entity_change_log(created_at DESC);
CREATE INDEX idx_ecl_changed_by ON entity_change_log(changed_by);

GRANT ALL ON entity_change_log TO service_role;
```

**Проверка:**

```sql
SELECT count(*) FROM entity_change_log; -- 0
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'entity_change_log' ORDER BY ordinal_position;
```

---

## Фаза 2: Core — Diff Engine + Changelog Service

### 2.1 Entity Diff Utility

**Файл:** `src/core/changelog/entityDiff.ts`

Утилита для вычисления разницы между двумя состояниями сущности.

```typescript
// Типы
interface FieldChange {
  field: string
  old: any
  new: any
}

interface ComponentChange {
  action: 'added' | 'removed' | 'modified'
  componentId: string
  componentName: string // resolved name for display
  details?: {
    field: string
    old: any
    new: any
  }[]
}

interface EntityDiff {
  fields: FieldChange[]
  components: ComponentChange[]
  hasChanges: boolean
}

// Конфигурация отслеживаемых полей
const RECIPE_TRACKED_FIELDS = [
  'name',
  'code',
  'category',
  'department',
  'portionSize',
  'portionUnit'
]
const PREPARATION_TRACKED_FIELDS = [
  'name',
  'code',
  'type',
  'department',
  'outputQuantity',
  'outputUnit',
  'portionType',
  'portionSize',
  'preparationTime',
  'shelfLife'
]

// Функции
function diffFields(oldEntity, newEntity, trackedFields): FieldChange[]
function diffComponents(oldComponents, newComponents, resolveNameFn): ComponentChange[]
function computeEntityDiff(entityType, oldEntity, newEntity, resolveNameFn): EntityDiff
```

**Логика diffComponents:**

1. Построить Map по ID (для recipe: `componentId`, для preparation: `id`)
2. Найти **добавленные** (есть в new, нет в old)
3. Найти **удалённые** (есть в old, нет в new)
4. Найти **изменённые** (есть в обоих, но отличается `quantity` или `unit`)
5. Для каждого изменения — зарезолвить имя компонента (product/preparation/recipe name)

### 2.2 Changelog Service

**Файл:** `src/core/changelog/changelogService.ts`

```typescript
// Singleton service
class ChangelogService {
  // Записать изменение в БД
  async logChange(params: {
    entityType: 'recipe' | 'preparation'
    entityId: string
    entityName: string
    changeType: 'created' | 'updated' | 'archived' | 'restored' | 'cloned'
    changes: EntityDiff | {}
  }): Promise<void>

  // Загрузить историю для сущности
  async getHistory(
    entityType: 'recipe' | 'preparation',
    entityId: string,
    limit?: number
  ): Promise<ChangeLogEntry[]>

  // Загрузить историю за период (для ConstructorHub)
  async getRecentChanges(days?: number, limit?: number): Promise<ChangeLogEntry[]>
}

interface ChangeLogEntry {
  id: string
  entityType: 'recipe' | 'preparation'
  entityId: string
  entityName: string
  changedBy: string | null
  changedByName: string
  changeType: 'created' | 'updated' | 'archived' | 'restored' | 'cloned'
  changes: {
    fields?: FieldChange[]
    components?: ComponentChange[]
  }
  createdAt: string
}
```

**Получение автора:** Из `authStore.user` — `id` и `name` (displayName).

### 2.3 Index файл

**Файл:** `src/core/changelog/index.ts`

Re-export всех типов и сервиса.

---

## Фаза 3: Интеграция в recipesService

### 3.1 Хуки в updateRecipe / updatePreparation

**Файл:** `src/stores/recipes/recipesService.ts`

В методах `updateRecipe()` и `updatePreparation()`:

```typescript
async updateRecipe(data) {
  // 1. Прочитать текущее состояние из Supabase (1 SELECT)
  const currentRecipe = await this.getRecipeById(data.id)

  // 2. Вычислить diff (только tracked fields + components)
  const diff = computeEntityDiff('recipe', currentRecipe, data, resolveComponentName)

  // 3. Сохранить изменения (существующий UPDATE)
  await supabase.from('recipes').update(...)

  // 4. Если есть изменения — записать лог (non-blocking)
  if (diff.hasChanges) {
    changelogService.logChange({
      entityType: 'recipe',
      entityId: data.id,
      entityName: data.name || currentRecipe.name,
      changeType: 'updated',
      changes: diff
    }).catch(err => console.warn('Changelog write failed:', err))
  }
}
```

**Аналогично для:**

- `updatePreparation()` — diff с `PREPARATION_TRACKED_FIELDS`
- `createRecipe()` — `changeType: 'created'`, без diff (просто факт создания)
- `createPreparation()` — `changeType: 'created'`
- Archive операции — `changeType: 'archived'`

### 3.2 Resolve Component Names

Для human-readable diff нужны имена компонентов:

```typescript
async function resolveComponentName(componentId: string, componentType: string): Promise<string> {
  // Из productsStore или recipesStore (preparations) — по ID → name
  // Fallback: componentId если не нашли
}
```

Имена продуктов/полуфабрикатов уже загружены в stores, поэтому resolve — синхронный lookup.

---

## Фаза 4: UI — History Tab

### 4.1 Универсальный компонент EntityHistoryTab

**Файл:** `src/views/kitchen/constructor/components/EntityHistoryTab.vue`

Props:

```typescript
props: {
  entityType: 'recipe' | 'preparation'
  entityId: string
}
```

**Макет:**

```
+------------------------------------------+
| HISTORY                                  |
|                                          |
| ── Today, 8 Mar 2026 ──────────────────|
|                                          |
| 14:30  Admin                             |
| Updated                                  |
|   • portion_size: 200 → 250             |
|   + Added: Chicken breast 200g          |
|   ~ Changed: Rice 100g → 150g           |
|                                          |
| ── Yesterday, 7 Mar 2026 ──────────────|
|                                          |
| 10:15  Manager                           |
| Updated                                  |
|   - Removed: Beef 150g                  |
|   • department: kitchen → bar            |
|                                          |
| ── 5 Mar 2026 ────────────────────────  |
|                                          |
| 09:00  Admin                             |
| Created                                  |
|                                          |
+------------------------------------------+
```

**Компоненты:**

- `v-timeline` (Vuetify) для хронологии
- Группировка по дням (Today / Yesterday / дата)
- Цветовая индикация: зелёный (+added), красный (-removed), оранжевый (~modified)
- Иконки по changeType: create (mdi-plus), update (mdi-pencil), archive (mdi-archive)

### 4.2 Интеграция в UnifiedRecipeDialog

**Файл:** `src/views/recipes/components/UnifiedRecipeDialog.vue`

Добавить третью вкладку `history`:

```vue
<v-tabs v-model="activeTab">
  <v-tab value="general">General</v-tab>
  <v-tab value="components">Components</v-tab>
  <v-tab value="history" :disabled="!isEditing">History</v-tab>
</v-tabs>

<v-tabs-window-item value="history">
  <EntityHistoryTab
    :entity-type="type === 'preparation' ? 'preparation' : 'recipe'"
    :entity-id="editingItemId"
  />
</v-tabs-window-item>
```

**Lazy loading:** История загружается только при переключении на вкладку History (не при открытии диалога).

---

## Фаза 5: Human-Readable Formatting

### 5.1 Field Labels

**Файл:** `src/core/changelog/fieldLabels.ts`

```typescript
const FIELD_LABELS: Record<string, string> = {
  // Recipe
  name: 'Name',
  code: 'Code',
  category: 'Category',
  department: 'Department',
  portionSize: 'Portion Size',
  portionUnit: 'Portion Unit',

  // Preparation
  type: 'Type',
  outputQuantity: 'Output Quantity',
  outputUnit: 'Output Unit',
  portionType: 'Portion Type',
  preparationTime: 'Preparation Time',
  shelfLife: 'Shelf Life'
}

// Форматирование значений
function formatFieldValue(field: string, value: any): string {
  // department: 'kitchen' → 'Kitchen'
  // preparationTime: 30 → '30 min'
  // shelfLife: 3 → '3 days'
  // category UUID → name (from store lookup)
  // type UUID → name (from store lookup)
}
```

---

## Порядок реализации (чек-лист)

### Фаза 1: DB

- [x] 170: entity_change_log — создать таблицу
- [x] Создать файл миграции в `src/supabase/migrations/`
- [x] Применить на DEV через `mcp__supabase_dev__apply_migration`
- [ ] Проверить: таблица создана, индексы на месте

### Фаза 2: Core

- [x] `src/core/changelog/entityDiff.ts` — diff engine
- [x] `src/core/changelog/changelogService.ts` — CRUD для логов
- [x] `src/core/changelog/fieldLabels.ts` — human-readable labels
- [x] `src/core/changelog/index.ts` — re-exports

### Фаза 3: Integration

- [x] `recipesService.ts` → `updateRecipe()` — добавить changelog hook
- [x] `recipesService.ts` → `updatePreparation()` — добавить changelog hook
- [x] `recipesService.ts` → `createRecipe()` — лог создания
- [x] `recipesService.ts` → `createPreparation()` — лог создания
- [ ] Archive operations — лог архивации
- [x] Resolve component names — lookup из Supabase (lightweight cache)

### Фаза 4: UI

- [x] `EntityHistoryTab.vue` — универсальный компонент истории
- [x] `UnifiedRecipeDialog.vue` — добавить вкладку History (tablet + desktop)
- [x] Lazy loading — загрузка истории только при открытии вкладки
- [x] Группировка по дням + v-timeline

### Фаза 5: Polish

- [x] Human-readable field labels и value formatting
- [ ] Category/Type UUID → name resolution
- [ ] Тестирование: создать рецепт, изменить компоненты, проверить лог
- [ ] Edge cases: пустой лог, первое создание, клонирование

---

## Нагрузка на сохранение

**+2 запроса на каждый save:**

1. `SELECT * FROM recipes WHERE id = $1` — прочитать текущее состояние (~1ms)
2. `INSERT INTO entity_change_log` — записать лог (~1ms)

**Non-blocking:** INSERT в лог выполняется через `.catch()` — не блокирует основной save flow.
**Объём данных:** ~500 байт на запись лога. При 50 правках/день = ~25KB/день = ~9MB/год.

---

## Файловая структура

```
src/core/changelog/
├── index.ts              # Re-exports
├── entityDiff.ts         # Diff engine (diffFields, diffComponents)
├── changelogService.ts   # DB operations (logChange, getHistory)
└── fieldLabels.ts        # Human-readable labels & formatters

src/views/kitchen/constructor/components/
└── EntityHistoryTab.vue  # Universal history tab component

src/supabase/migrations/
└── 170_entity_change_log.sql
```
