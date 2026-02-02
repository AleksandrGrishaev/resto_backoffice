# Product Variance Report

## Цель отчёта

Product Variance Report анализирует расхождения между **ожидаемым** и **фактическим** количеством продуктов на складе. Помогает выявить:

- Незафиксированные потери (кража, порча без записи)
- Ошибки в рецептах (неправильные количества ингредиентов)
- Ошибки в приёмках (неправильные количества)
- Ошибки при инвентаризации

---

## Архитектура v4/v3 (2026-02-02)

### Модульный подход: Single Source of Truth

```
                    ┌─────────────────────────────────────┐
                    │      Helper Functions (shared)      │
                    │  ─────────────────────────────────  │
                    │  calc_prep_decomposition_factors()  │
                    │  calc_product_theoretical_sales()   │
                    │  calc_product_writeoffs_decomposed()│
                    │  calc_product_loss_decomposed()     │
                    │  calc_product_inpreps()             │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  report_v4()    │  │  details_v3()   │  │  Future APIs    │
    │  (все продукты) │  │  (один продукт) │  │  (batch export) │
    │  inline CTEs    │  │  uses helpers   │  │                 │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Гарантия синхронизации

| Функция                           | Версия | Как вычисляет                              |
| --------------------------------- | ------ | ------------------------------------------ |
| `get_product_variance_report_v4`  | v4.0   | Inline CTEs (batch для производительности) |
| `get_product_variance_details_v3` | v3.0   | Использует helper functions                |

**Ключевой момент:** Обе функции используют **идентичные формулы**:

- Одинаковая рекурсивная декомпозиция preparations
- Одинаковый учёт `output_quantity * portion_size`
- Одинаковое разделение writeoffs/loss на direct + from_preps

---

## Основная формула

```
Expected = Opening + Received - Sales - Loss + Gain
Actual = Closing + InPreps

Variance = Actual - Expected
```

### Интерпретация Variance

| Значение       | Статус       | Описание                                    |
| -------------- | ------------ | ------------------------------------------- |
| `Variance = 0` | **Balanced** | Всё сходится, расхождений нет               |
| `Variance > 0` | **Surplus**  | Фактически больше чем ожидалось (излишек)   |
| `Variance < 0` | **Shortage** | Фактически меньше чем ожидалось (недостача) |

---

## Helper Functions

### 1. `calc_prep_decomposition_factors(product_id)`

Возвращает все preparations, которые используют данный продукт (прямо или через вложенные preps):

```sql
SELECT * FROM calc_prep_decomposition_factors('product-uuid');
-- Returns: preparation_id, preparation_name, total_output_qty, product_qty_per_batch, factor
```

**Назначение:** Базовая функция для расчёта decomposition factors.

### 2. `calc_product_theoretical_sales(product_id, start_date, end_date)`

Вычисляет теоретические продажи продукта:

```sql
SELECT * FROM calc_product_theoretical_sales('product-uuid', '2026-01-01', '2026-01-31');
-- Returns: direct_qty, via_recipes_qty, via_preps_qty, total_qty
```

**Три пути потребления:**

- **direct** — Menu → Product
- **via_recipes** — Menu → Recipe → Product
- **via_preps** — Menu → Preparation → Product (рекурсивно)

### 3. `calc_product_writeoffs_decomposed(product_id, start_date, end_date)`

Вычисляет фактические списания (sales_consumption):

```sql
SELECT * FROM calc_product_writeoffs_decomposed('product-uuid', '2026-01-01', '2026-01-31');
-- Returns: direct_qty, from_preps_qty, total_qty
```

**Важно:** Теперь включает decomposition из preparations:

- Если списали 1kg теста → покажет муку, воду, дрожжи

### 4. `calc_product_loss_decomposed(product_id, start_date, end_date)`

Вычисляет потери (expired/spoiled/other + corrections):

```sql
SELECT * FROM calc_product_loss_decomposed('product-uuid', '2026-01-01', '2026-01-31');
-- Returns: direct_loss_qty, from_preps_loss_qty, corrections_loss_qty, total_loss_qty, corrections_gain_qty
```

**Важно:** Теперь включает decomposition из preparations:

- Если испортился prep → покажет потери по продуктам

### 5. `calc_product_inpreps(product_id)`

Вычисляет продукт в активных prep batches:

```sql
SELECT * FROM calc_product_inpreps('product-uuid');
-- Returns: qty, amount
```

---

## Схема списаний (Write-offs)

### Категории операций в `storage_operations`

```
storage_operations.operation_type = 'write_off'
├── reason = 'sales_consumption'      → WriteOffs (для сравнения с Sales)
├── reason = 'production_consumption' → НЕ используется (учтено в InPreps)
├── reason = 'expired'                → Loss
├── reason = 'spoiled'                → Loss
├── reason = 'other'                  → Loss
├── reason = 'expiration'             → Loss
├── reason = 'education'              → OPEX (не в формуле)
└── reason = 'test'                   → OPEX (не в формуле)

storage_operations.operation_type = 'correction'
├── quantity < 0 (negative)           → Loss (нашли меньше при инвентаризации)
└── quantity > 0 (positive)           → Gain (нашли больше при инвентаризации)
```

### Декомпозиция Write-offs и Loss

Когда списывается preparation, он декомпозируется до продуктов:

```
storage_operations (itemType = 'preparation')
    │
    ▼
┌───────────────────────────────────────────┐
│ Recursive Decomposition                   │
│                                           │
│ Prep A (1000g)                            │
│   ├── Ingredient: Product X (500g)        │
│   ├── Ingredient: Product Y (300g)        │
│   └── Ingredient: Prep B (200g)           │
│         ├── Product Z (100g)              │
│         └── Product W (100g)              │
│                                           │
│ Result for 1000g Prep A:                  │
│   Product X: 500g                         │
│   Product Y: 300g                         │
│   Product Z: 100g (via Prep B)            │
│   Product W: 100g (via Prep B)            │
└───────────────────────────────────────────┘
```

---

## Компоненты формулы

### 1. Opening (Остаток на начало)

**Источник:** `calc_product_opening()` helper function

#### Почему не просто snapshot?

Snapshot создаётся в момент закрытия смены (например, в 22:00). Но между закрытием смены и полуночью могут быть операции:

- Поступления (receipts)
- Списания (write-offs)
- Корректировки (corrections)

Эти операции должны быть учтены в Opening.

#### Timezone: Bali (UTC+8)

Система работает по времени Bali. При расчёте Opening нужно учитывать:

```
Feb 1 00:00 Bali = Jan 31 16:00 UTC
```

#### Формула расчёта Opening

```
Opening = Snapshot.quantity
        + Receipts (после snapshot, до Bali midnight)
        - Write-offs (после snapshot, до Bali midnight)
        + Corrections (после snapshot, до Bali midnight)
```

#### Алгоритм

1. **Определить "полночь Bali" для start_date**

   ```sql
   v_bali_midnight := (p_start_date::TIMESTAMP AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'UTC';
   -- Feb 1 00:00 Bali = Jan 31 16:00 UTC
   ```

2. **Найти последний snapshot ПЕРЕД полночью Bali**

   ```sql
   SELECT * FROM inventory_snapshots
   WHERE item_id = p_product_id
     AND created_at < v_bali_midnight
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Посчитать adjustments между snapshot и полночью**

   ```sql
   -- Временной диапазон: [snapshot.created_at, v_bali_midnight)

   -- Receipts
   + SUM(received_quantity) WHERE delivery_date IN range

   -- Write-offs
   - SUM(quantity) WHERE operation_date IN range AND type = 'write_off'

   -- Corrections
   + SUM(quantity) WHERE operation_date IN range AND type = 'correction'
   ```

4. **Финальный Opening**
   ```
   Opening = Snapshot + Receipts - WriteOffs + Corrections
   ```

#### Пример

```
Период: Feb 1-3, 2026
Product: Papaya (V-42)

Timeline (UTC):
├─ Jan 31 14:17 → Snapshot: -222.67 gram (shift_close)
├─ Jan 31 15:00 → (hypothetical receipt: +100 gram)
├─ Jan 31 15:30 → (hypothetical write-off: -50 gram)
└─ Jan 31 16:00 → Bali midnight (Feb 1 00:00 Bali)

Расчёт:
- Snapshot: -222.67 gram
- Adjustments: +100 - 50 = +50 gram
- Opening: -222.67 + 50 = -172.67 gram
```

#### Helper Function

```sql
SELECT * FROM calc_product_opening('product-uuid', '2026-02-01');
-- Returns:
--   opening_qty: -222.67
--   opening_amount: -3027.61
--   snapshot_date: 2026-01-31
--   snapshot_created_at: 2026-01-31 14:17:37 UTC
--   snapshot_source: shift_close
--   adjustments_qty: 0.00
--   adjustments_amount: 0.00
```

### 2. Received (Поступления)

**Источник:** `supplierstore_receipt_items` + `supplierstore_receipts`

### 3. Sales (Теоретические продажи)

**Источник:** Расчёт через `calc_product_theoretical_sales()` или inline CTEs

Три пути:

- Direct Product Sales: `Menu → Product`
- Sales via Recipes: `Menu → Recipe → Product`
- Sales via Preparations: `Menu → Preparation → Product` (recursive)

### 4. WriteOffs (Фактические списания на продажи)

**Источник:** Расчёт через `calc_product_writeoffs_decomposed()` или inline CTEs

Включает:

- Direct product writeoffs (sales_consumption)
- Decomposed from preparation writeoffs

### 5. Loss (Потери)

**Источник:** Расчёт через `calc_product_loss_decomposed()` или inline CTEs

Включает:

- Direct product losses (expired/spoiled/other)
- Decomposed from preparation losses
- Negative corrections

### 6. Gain (Прибавки)

**Источник:** Positive corrections

### 7. Closing (Остаток на складе)

**Источник:** `storage_batches`

### 8. InPreps (Остаток в полуфабрикатах)

**Источник:** Расчёт через `calc_product_inpreps()` или inline CTEs

Формула decomposition:

```
total_output = output_quantity × COALESCE(portion_size, 1)
product_qty = batch_qty × ingredient_qty / total_output
```

---

## Сводная таблица категорий

| Категория        | Что включает                                                   | В формуле           |
| ---------------- | -------------------------------------------------------------- | ------------------- |
| **Sales**        | Теоретические продажи (direct + via recipes + via preps)       | YES, вычитается     |
| **WriteOffs**    | `sales_consumption` (products + decomposed preps)              | Показ, НЕ в формуле |
| **Loss**         | `expired/spoiled/other` + neg corrections (+ decomposed preps) | YES, вычитается     |
| **Gain**         | Positive corrections                                           | YES, добавляется    |
| **NOT included** | `production_consumption` (уже в InPreps), `education`, `test`  | НЕ в формуле        |

---

## RPC Functions

### Актуальные версии

| Function                          | Version | Purpose                                         |
| --------------------------------- | ------- | ----------------------------------------------- |
| `get_product_variance_report_v4`  | v4.0    | Основной отчёт со списком продуктов             |
| `get_product_variance_details_v3` | v3.2    | Детализация по одному продукту (timezone-aware) |

### Helper Functions

| Function                            | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `calc_product_opening`              | Opening с timezone (Bali UTC+8) и adjustments |
| `calc_prep_decomposition_factors`   | Decomposition factors для product → prep      |
| `calc_product_theoretical_sales`    | Теоретические продажи                         |
| `calc_product_writeoffs_decomposed` | WriteOffs с decomposition                     |
| `calc_product_loss_decomposed`      | Loss с decomposition                          |
| `calc_product_inpreps`              | Продукт в prep batches                        |

---

## Миграции

### Архитектура v4/v3 (2026-02-02)

| #   | Файл                                       | Описание                                      |
| --- | ------------------------------------------ | --------------------------------------------- |
| 126 | `126_helper_prep_decomposition.sql`        | Helper: calc_prep_decomposition_factors       |
| 127 | `127_helper_theoretical_sales.sql`         | Helper: calc_product_theoretical_sales        |
| 128 | `128_helper_writeoffs_decomposed.sql`      | Helper: calc_product_writeoffs_decomposed     |
| 129 | `129_helper_loss_decomposed.sql`           | Helper: calc_product_loss_decomposed          |
| 130 | `130_helper_inpreps.sql`                   | Helper: calc_product_inpreps                  |
| 131 | `131_variance_report_v4.sql`               | Main report v4 (same calcs as v3, cleaner)    |
| 132 | `132_variance_details_v3.sql`              | Details v3 (uses helpers, guaranteed sync)    |
| 133 | `133_fix_variance_details_formula.sql`     | Fix variance sign (Actual - Expected)         |
| 134 | `134_fix_opening_calculation_timezone.sql` | Helper: calc_product_opening (timezone-aware) |

### Предыдущие миграции (v3.x/v4.x)

| #   | Файл                                          | Описание                                   |
| --- | --------------------------------------------- | ------------------------------------------ |
| 119 | `119_add_sales_breakdown_to_report_v3.sql`    | Add sales breakdown (D/R/P) to report_v3   |
| 120 | `120_add_writeoffs_to_report_v3.sql`          | Add production_consumption to report_v3    |
| 121 | `121_fix_details_v2_loss_corrections.sql`     | Split corrections into Loss/Gain           |
| 122 | `122_fix_writeoffs_to_sales_consumption.sql`  | Use sales_consumption for WriteOffs        |
| 123 | `123_decompose_writeoffs_and_loss.sql`        | Decompose prep writeoffs/loss to products  |
| 124 | `124_fix_inpreps_portion_size.sql`            | Fix InPreps formula for portion-type preps |
| 125 | `125_fix_details_v2_writeoffs_comparison.sql` | Fix differenceFromTheoretical              |

---

## Response Structure

### Report v4

```jsonc
{
  "version": "v4.0",
  "period": { "dateFrom", "dateTo", "openingSnapshotDate", "closingSnapshotDate" },
  "summary": {
    "totalProducts": 167,
    "productsWithActivity": 149,
    "totalSalesAmount": 5550456.59,
    "totalWriteoffsAmount": 6020803.82,
    "totalLossAmount": 42815310.02,
    "totalInPrepsAmount": 5586451.69,
    "totalVarianceAmount": 11530195.58
  },
  "products": [
    {
      "productId", "productName", "productCode", "unit", "department", "avgCost",
      "opening": { "quantity", "amount" },
      "received": { "quantity", "amount" },
      "sales": {
        "quantity", "amount",
        "direct": { "quantity" },
        "viaRecipes": { "quantity" },
        "viaPreparations": { "quantity" }
      },
      "writeoffs": { "quantity", "amount" },
      "salesWriteoffDiff": { "quantity", "amount" },
      "loss": { "quantity", "amount" },
      "closing": { "quantity", "amount" },
      "inPreps": { "quantity", "amount" },
      "variance": { "quantity", "amount" },
      "hasPreparations": true
    }
  ]
}
```

### Details v3

```jsonc
{
  "version": "v3.0",
  "product": { "id", "name", "code", "unit", "department" },
  "period": { "dateFrom", "dateTo" },
  "opening": { "quantity", "amount", "snapshot": {...} },
  "received": { "quantity", "amount", "receipts": [...], "totalReceiptsCount" },
  "sales": {
    "quantity", "amount",
    "direct": { "quantity", "amount" },
    "viaRecipes": { "quantity" },
    "viaPreparations": { "quantity", "amount" },
    "topMenuItems": [...],
    "totalMenuItemsCount"
  },
  "writeoffs": {
    "quantity", "amount",
    "direct": { "quantity" },           // NEW in v3
    "fromPreparations": { "quantity" }  // NEW in v3
  },
  "actualWriteOffs": {
    "salesConsumption": { "quantity", "amount", "operationsCount" },
    "productionConsumption": { "quantity", "amount", "operationsCount", "details" },
    "corrections": { "quantity", "amount", "operationsCount", "details" },
    "total": { "quantity", "amount" },
    "differenceFromTheoretical": { "quantity", "amount", "interpretation" }
  },
  "loss": {
    "quantity", "amount",
    "direct": { "quantity" },           // NEW in v3
    "fromPreparations": { "quantity" }, // NEW in v3
    "corrections": { "quantity" },      // NEW in v3
    "byReason": [...],
    "details": [...]
  },
  "gain": { "quantity", "amount" },     // NEW in v3
  "closing": {
    "rawStock": { "quantity", "amount", "batches" },
    "inPreparations": { "quantity", "amount", "preparations" },
    "total": { "quantity", "amount" }
  },
  "variance": { "quantity", "amount", "interpretation", "possibleReasons" }
}
```

---

## Файлы проекта

### UI компоненты

- `src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue` — диалог детализации
- `src/views/backoffice/analytics/VarianceReportView.vue` — основной отчёт

### Store

- `src/stores/analytics/varianceReportStore.ts` — Pinia store для отчёта
- `src/stores/analytics/types.ts` — TypeScript типы

### SQL функции (документация)

- `src/supabase/functions/get_product_variance_report.sql` — документация v4
- `src/supabase/functions/get_product_variance_details_v2.sql` — документация v3

### Миграции (исходный код)

- `src/supabase/migrations/126_helper_prep_decomposition.sql`
- `src/supabase/migrations/127_helper_theoretical_sales.sql`
- `src/supabase/migrations/128_helper_writeoffs_decomposed.sql`
- `src/supabase/migrations/129_helper_loss_decomposed.sql`
- `src/supabase/migrations/130_helper_inpreps.sql`
- `src/supabase/migrations/131_variance_report_v4.sql`
- `src/supabase/migrations/132_variance_details_v3.sql`

---

## Известные ограничения

1. **Opening In Preps** — Opening НЕ включает продукты в полуфабрикатах на начало периода

   - Причина: нет исторических данных о состоянии prep batches

2. **Closing In Preps** — показывает ТЕКУЩЕЕ состояние, а не на конец периода

   - Причина: `preparation_batches.current_quantity` это live данные

3. **Исторические снапшоты** — требуется snapshot на день до начала периода

   - Если нет snapshot, Opening = 0

4. **Глубина рекурсии** — ограничена 5 уровнями (достаточно для любых реальных случаев)

---

## Статус миграций (2026-02-02)

### ✅ Применены к DEV

- Migrations 126-132 (новая архитектура v4/v3)

### ⏳ Ожидают применения к PRODUCTION

- Migrations 126-132 (после тестирования на DEV)

---

## Верификация результатов

После рефакторинга проверено:

```sql
-- v3 и v4 report дают идентичные результаты
SELECT 'v3' as version, summary FROM get_product_variance_report_v3(...)
UNION ALL
SELECT 'v4' as version, summary FROM get_product_variance_report_v4(...)
-- Результат: IDENTICAL ✓

-- Details v3 совпадает с Report v4 для всех продуктов
-- Sales, Writeoffs, Loss, InPreps - все числа MATCH ✓
```
