# Product Variance Report

## Цель отчёта

Product Variance Report анализирует расхождения между **ожидаемым** и **фактическим** количеством продуктов на складе. Помогает выявить:

- Незафиксированные потери (кража, порча без записи)
- Ошибки в рецептах (неправильные количества ингредиентов)
- Ошибки в приёмках (неправильные количества)
- Ошибки при инвентаризации

---

## Основная формула (v4)

```
Expected = Opening + Received - Sales - WriteOffs - Loss + Gain
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

## Компоненты формулы

### 1. Opening (Остаток на начало)

**Источник:** `inventory_snapshots` на дату `(start_date - 1 день)`

Snapshot создаётся при закрытии смены предыдущего дня. Содержит:

- Количество продукта на складе
- Общую стоимость

**Если snapshot отсутствует:** Opening = 0

```sql
SELECT quantity, total_cost
FROM inventory_snapshots
WHERE item_id = '{product_id}'
  AND snapshot_date = '{start_date - 1 day}'
```

### 2. Received (Поступления)

**Источник:** `supplierstore_receipt_items` + `supplierstore_receipts`

Все поступления от поставщиков за период:

- Только завершённые накладные (`status = 'completed'`)
- В пределах `delivery_date` периода

```sql
SELECT SUM(received_quantity) as qty,
       SUM(received_quantity * actual_base_cost) as amount
FROM supplierstore_receipt_items sri
JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
WHERE sri.item_id = '{product_id}'
  AND sr.delivery_date >= '{start_date}'
  AND sr.delivery_date < '{end_date}'
  AND sr.status = 'completed'
```

### 3. Sales (Теоретические продажи)

**Источник:** Расчёт на основе `orders` + `order_items` + `payments`

Теоретический расход продукта на основе проданных блюд. Три пути:

#### 3.1 Direct Product Sales

```
Menu Item → Composition (type='product') → Product
```

#### 3.2 Sales via Recipes

```
Menu Item → Composition (type='recipe') → Recipe Components → Product
```

#### 3.3 Sales via Preparations

```
Menu Item → Composition (type='preparation') → Preparation Ingredients → Product
```

**Total Sales = Direct + Via Recipes + Via Preparations**

**Важно:** Считаются только заказы с завершёнными платежами (`payments.status = 'completed'`).

### 4. WriteOffs (Фактические списания)

**Источник:** `storage_operations` с типами:

- `write_off` + `reason = 'sales_consumption'` — списания на продажи
- `write_off` + `reason = 'production_consumption'` — списания на производство полуфабрикатов

Это **фактические** списания, которые были созданы системой или вручную.

```sql
SELECT SUM(qty), SUM(amount)
FROM storage_operations so
WHERE operation_type = 'write_off'
  AND (write_off_details->>'reason') IN ('sales_consumption', 'production_consumption')
  AND operation_date BETWEEN start_date AND end_date
```

### 5. Loss (Потери)

**Источник:** `storage_operations` с типами:

- `write_off` + `reason = 'expired'` — истёк срок годности
- `write_off` + `reason = 'spoiled'` — испортился
- `write_off` + `reason = 'other'` — другие причины
- `correction` с **отрицательным** количеством — нашли меньше при инвентаризации

```sql
-- Прямые потери
SELECT SUM(qty) FROM storage_operations
WHERE reason IN ('expired', 'spoiled', 'other')

-- Отрицательные коррекции (недостача при инвентаризации)
SELECT SUM(ABS(qty)) FROM storage_operations
WHERE operation_type = 'correction' AND qty < 0
```

**Total Loss = Direct Loss + Negative Corrections**

### 6. Gain (Прибавки)

**Источник:** `storage_operations` с типом `correction` и **положительным** количеством

Когда при инвентаризации нашли **больше** чем в системе:

```sql
SELECT SUM(qty), SUM(amount)
FROM storage_operations
WHERE operation_type = 'correction' AND qty > 0
```

### 7. Closing (Остаток на складе)

**Источник:** `storage_batches`

Сумма всех активных батчей продукта:

```sql
SELECT SUM(current_quantity) as qty,
       SUM(current_quantity * cost_per_unit) as amount
FROM storage_batches
WHERE item_id = '{product_id}'
  AND item_type = 'product'
  AND status = 'active'
  AND current_quantity > 0
```

### 8. InPreps (Остаток в полуфабрикатах)

**Источник:** `preparation_batches` + `preparation_ingredients`

Продукт "заморожен" в активных батчах полуфабрикатов:

```
InPreps = Σ (prep_batch.current_quantity × product_qty_per_batch / prep.portion_size)
```

**Важно:**

- Для `portion_type = 'portion'`: делим на `portion_size`
- Для `portion_type = 'weight'`: делим на `output_quantity`

---

## Диалог детализации (V2)

При клике на строку продукта открывается диалог с полной разбивкой.

### Formula Bar (визуальная формула)

Пример для Fresh milk (D-1), период 28 Jan - 1 Feb 2026:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬───────────┐
│ OPENING  │ RECEIVED │  SALES   │   LOSS   │ CLOSING  │ VARIANCE  │
│ 18,818ml │ +36,000  │ -1,270   │ -3,861   │ -29,399  │ +28,010   │
│ Rp 371K  │ Rp 711K  │ Rp 25K   │ Rp 83K   │ Rp 580K  │ Rp 394K   │
└──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘
```

**Примечание:**

- Closing включает Raw Stock + InPreps
- Loss включает коррекции + traced losses из preparations

### Секции диалога

#### 1. Opening Stock

- Количество и сумма из snapshot
- Дата snapshot и источник (inventory, shift_close, manual)
- Номер документа инвентаризации

#### 2. Received

- Общее количество и сумма
- Таблица накладных (топ 5):
  - Номер накладной, дата
  - Поставщик
  - Количество, цена за единицу, сумма

#### 3. Sales (Theoretical)

- Разбивка: Direct / Via Preparations
- Таблица меню-айтемов:
  - Название блюда, вариант
  - Количество продано
  - Расход продукта, стоимость
- Таблица полуфабрикатов (если используется)

#### 4. Loss

- Разбивка по причинам (expired, spoiled, other)
- Детали списаний (дата, причина, количество, батч)
- Traced losses из полуфабрикатов

#### 5. Closing Stock

- **Raw Stock**: активные батчи продукта
  - Номер батча, дата поступления
  - Количество, цена, стоимость
- **In Preparations**: продукт в полуфабрикатах
  - Название полуфабриката
  - Дата производства
  - Количество продукта

#### 6. Variance

- Итоговое расхождение (количество, сумма)
- Интерпретация (Shortage / Surplus / Balanced)
- Возможные причины

#### 7. Actual Write-offs (Analysis)

Сравнение теоретических продаж с фактическими списаниями:

- **Sales Consumption**: списания на продажи
- **Production Consumption**: списания на производство
- **Corrections**: инвентаризационные коррекции
- **Difference**: расхождение между теоретическим и фактическим

---

## Пример расчёта: Fresh milk (D-1)

**Период:** 28 января - 1 февраля 2026
**Продукт:** Fresh milk (D-1), Bar, ml

### Данные из UI (диалог детализации):

| Компонент    | Quantity          | Amount         | Источник                                     |
| ------------ | ----------------- | -------------- | -------------------------------------------- |
| Opening      | 18,817.56 ml      | Rp 371,440     | Snapshot 27.01                               |
| Received     | +36,000 ml        | Rp 710,640     | 4 накладные                                  |
| Sales        | -1,270.02 ml      | Rp 24,786      | Теоретический (via 5 menu items через preps) |
| Loss         | -3,860.61 ml      | Rp 82,727      | Коррекция + traced from MushPotato           |
| Closing      | 29,398.60 ml      | Rp 580,230     | Raw stock + InPreps                          |
| **Variance** | **+28,009.55 ml** | **Rp 394,337** | **Surplus**                                  |

### Разбивка Closing:

| Компонент           | Quantity         | Amount         |
| ------------------- | ---------------- | -------------- |
| Raw Stock (2 батча) | 29,088.20 ml     | Rp 574,172     |
| In Preparations     | 310.40 ml        | Rp 6,058       |
| **Total**           | **29,398.60 ml** | **Rp 580,230** |

### Разбивка Loss:

| Компонент                        | Quantity         | Amount        |
| -------------------------------- | ---------------- | ------------- |
| Коррекция (inventory_adjustment) | -3,982.51 ml     | Rp 78,611     |
| Traced from MushPotato           | 121.90 ml        | Rp 4,116      |
| **Total**                        | **-3,860.61 ml** | **Rp 82,727** |

### Actual Write-offs (Analysis):

| Компонент              | Ops    | Quantity      | Amount         |
| ---------------------- | ------ | ------------- | -------------- |
| Sales Consumption      | 83     | 17,780 ml     | Rp 350,959     |
| Production Consumption | 4      | 506 ml        | Rp 9,989       |
| Corrections            | 1      | -3,982.51 ml  | Rp 78,611      |
| **Total**              | **88** | **18,286 ml** | **Rp 360,948** |

**Difference from Theoretical:** -17,016 ml (**Over written-off**)

- Теоретические продажи: 1,270 ml
- Фактические списания: 18,286 ml
- Разница: -17,016 ml — списано БОЛЬШЕ чем продано по теории

### Интерпретация:

**Surplus (+28,009 ml)** — на складе значительно больше чем ожидалось по формуле.

**Анализ ситуации:**

1. Теоретические продажи (1,270 ml) намного меньше фактических списаний (18,286 ml)
2. Большинство списаний — `sales_consumption` (17,780 ml), но они НЕ попали в теоретический расход
3. Причина: Fresh milk используется в preparations, но не напрямую в menu items
4. Коррекция (-3,982 ml) была при инвентаризации 31.01

**Вывод:** Формула ожидает мало расхода (только 1,270 ml через preps), но фактически списано много (18,286 ml). Поэтому Actual >> Expected = большой Surplus.

---

## Типы операций в storage_operations

| operation_type | reason                   | Описание                     | В формуле |
| -------------- | ------------------------ | ---------------------------- | --------- |
| `receipt`      | -                        | Поступление                  | Received  |
| `write_off`    | `sales_consumption`      | Списание на продажу          | WriteOffs |
| `write_off`    | `production_consumption` | Списание на производство     | WriteOffs |
| `write_off`    | `expired`                | Истёк срок                   | Loss      |
| `write_off`    | `spoiled`                | Испортился                   | Loss      |
| `write_off`    | `other`                  | Другое                       | Loss      |
| `correction`   | - (qty < 0)              | Недостача при инвентаризации | Loss      |
| `correction`   | - (qty > 0)              | Излишек при инвентаризации   | Gain      |

---

## Известные ограничения

1. **Opening In Preps** — Opening НЕ включает продукты в полуфабрикатах на начало периода

   - Причина: нет исторических данных о состоянии prep batches

2. **Closing In Preps** — показывает ТЕКУЩЕЕ состояние, а не на конец периода

   - Причина: `preparation_batches.current_quantity` это live данные

3. **Исторические снапшоты** — требуется snapshot на день до начала периода
   - Если нет snapshot, Opening = 0

---

## Технические детали

### RPC Functions

| Function                          | Version | Purpose                             |
| --------------------------------- | ------- | ----------------------------------- |
| `get_product_variance_report_v3`  | v4      | Основной отчёт со списком продуктов |
| `get_product_variance_details_v2` | v2.3    | Детализация по одному продукту      |

### Ключевые таблицы

| Таблица                                    | Назначение                             |
| ------------------------------------------ | -------------------------------------- |
| `products`                                 | Справочник продуктов                   |
| `inventory_snapshots`                      | Снапшоты для Opening                   |
| `supplierstore_receipt_items`              | Поступления (Received)                 |
| `orders` + `order_items` + `payments`      | Заказы для Sales                       |
| `menu_items` (variants JSONB)              | Композиции блюд                        |
| `recipes` + `recipe_components`            | Рецепты                                |
| `preparations` + `preparation_ingredients` | Полуфабрикаты                          |
| `storage_operations`                       | Все операции (write-offs, corrections) |
| `storage_batches`                          | Текущие батчи (Closing)                |
| `preparation_batches`                      | Батчи полуфабрикатов (InPreps)         |

### Schema Notes

- `supplierstore_orders.supplier_id` — TEXT (требует cast в UUID)
- `storage_batches.receipt_date` — дата поступления батча
- `preparation_batches.production_date` — дата производства
- `recipe_components.component_id` — TEXT
- `menu_items.variants[].composition[].id` — TEXT в JSONB

---

## История изменений

### Сессия 2026-02-01 (вечер)

#### Исправленные баги:

| #   | Баг                                                              | Причина                                                                                  | Решение                                   | Файл/Миграция                                        |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| 1   | **Двойной минус в Loss** (`--3,860.61 ml`)                       | `detail.loss.quantity` возвращается как отрицательное число, а шаблон добавляет ещё `-`  | Использовать `Math.abs()`                 | `ProductVarianceDetailDialogV2.vue` (строки 99, 379) |
| 2   | **Sales расхождение** (report_v3: 22K vs details_v2: 1.2K)       | В details_v2 отсутствовал путь `Menu → Recipe → Product`                                 | Добавлен CTE `recipe_product_sales`       | Миграция 111                                         |
| 3   | **products_from_preparations = 0**                               | Для `portion_type='weight'` использовался `portion_size` (NULL) вместо `output_quantity` | Исправлен расчёт с проверкой portion_type | Миграция 112                                         |
| 4   | **Знак Variance перевёрнут** (показывал Surplus вместо Shortage) | Формула была `Expected - Actual` вместо `Actual - Expected`                              | Исправлена формула в variance calculation | Миграция 113                                         |
| 5   | **Via Recipes не показывается**                                  | Чип отсутствовал в UI                                                                    | Добавлен чип `Via Recipes`                | `ProductVarianceDetailDialogV2.vue`                  |
| 6   | **CLOSING с минусом** (`-29,206.6 ml`)                           | Хардкод `-` перед значением                                                              | Убран минус, изменена метка на "Actual"   | `ProductVarianceDetailDialogV2.vue`                  |

#### Изменения в UI (ProductVarianceDetailDialogV2.vue):

1. **Formula Bar**:

   - Изменено: `OPENING + RECEIVED - SALES - LOSS vs ACTUAL = VARIANCE`
   - Метка CLOSING → ACTUAL
   - Убран минус перед Actual

2. **Sales Section**:

   - Добавлен чип "Via Recipes" (показывает путь Menu → Recipe → Product)
   - Порядок: Direct | Via Recipes | Via Preps

3. **Loss Section**:
   - Разделена на подсекции: Write-offs и Inventory Corrections
   - Write-offs (expired, spoiled, other) — красная иконка
   - Inventory Corrections — жёлтая иконка, показывает Shortage/Surplus

#### Версии RPC после обновления:

| Function                          | Версия   | Изменения                                                    |
| --------------------------------- | -------- | ------------------------------------------------------------ |
| `get_product_variance_report_v3`  | **v4.1** | Исправлен `products_from_preparations` для weight-type preps |
| `get_product_variance_details_v2` | **v2.6** | Добавлен `recipe_product_sales`, исправлена формула variance |

#### Миграции (применены к DEV):

| #   | Файл                                                  | Описание                                       |
| --- | ----------------------------------------------------- | ---------------------------------------------- |
| 111 | `111_fix_details_v2_missing_recipe_product_sales.sql` | Добавлен путь recipe_product_sales             |
| 112 | `112_fix_report_v3_prep_portion_size_bug.sql`         | Исправлен расчёт для weight-type preps         |
| 113 | (inline) `fix_details_v2_variance_formula_sign`       | Исправлена формула variance: Actual - Expected |

---

## Актуальный пример: Fresh milk (D-1)

**Период:** 28 января - 1 февраля 2026
**Продукт:** Fresh milk (D-1), Bar, ml

### Данные после исправлений:

| Компонент        | Quantity          | Amount     | Примечание                    |
| ---------------- | ----------------- | ---------- | ----------------------------- |
| Opening          | 18,817.56 ml      | Rp 371,440 | Snapshot 27.01                |
| Received         | +36,000 ml        | Rp 710,640 | 4 накладные (2 с qty=0)       |
| Sales            | **-23,330.02 ml** | Rp 455,319 | **Исправлено!** (было 1,270)  |
| Loss             | -3,860.61 ml      | Rp 82,727  | inventory_adjustment + traced |
| Actual (Closing) | 29,026.60 ml      | Rp 576,443 | Raw stock + InPreps           |
| **Variance**     | **-6,321.55 ml**  |            | **SHORTAGE** (исправлено!)    |

### Разбивка Sales (исправленная):

| Путь        | Quantity         | Примечание                              |
| ----------- | ---------------- | --------------------------------------- |
| Direct      | 0 ml             | Продукт не используется напрямую        |
| Via Recipes | **22,060 ml**    | Menu → Recipe → Product (было упущено!) |
| Via Preps   | 1,270.02 ml      | Menu → Prep → Product                   |
| **Total**   | **23,330.02 ml** |                                         |

### Расчёт Variance:

```
Expected = Opening + Received - Sales - Loss
         = 18,817.56 + 36,000 - 23,330.02 - (-3,860.61)
         = 18,817.56 + 36,000 - 23,330.02 + 3,860.61
         = 35,348.15 ml

Actual = Closing = 29,026.60 ml

Variance = Actual - Expected
         = 29,026.60 - 35,348.15
         = -6,321.55 ml (SHORTAGE)
```

**Интерпретация:** На складе **меньше** чем ожидалось. Возможные причины:

- Незафиксированные потери
- Ошибки при инвентаризации
- Реальный расход превысил теоретический

---

## Статус миграций (2026-02-01)

**✅ Все миграции применены к PRODUCTION:**

- `fix_details_v2_missing_recipe_product_sales` — добавлен путь Menu → Recipe → Product
- `fix_report_v3_prep_portion_size_bug` — исправлен расчёт для weight-type preps
- `fix_details_v2_variance_formula_sign` — формула Variance = Actual - Expected

---

## Известные проблемы

### 1. UI изменения не отображаются после restart

**Статус:** ⚠️ Изменения в файле есть, но не видны в браузере

**Проверено (git status):**

```
M src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue
```

**Изменения в файле (git diff показывает):**

- ✅ `Math.abs()` для Loss (строки 99, 383)
- ✅ Via Recipes чип добавлен
- ✅ Formula bar: CLOSING → ACTUAL, убран минус

**Что попробовать:**

1. Убить все процессы node и перезапустить:
   ```bash
   pkill -f node
   pnpm dev
   ```
2. Очистить кэш Vite:
   ```bash
   rm -rf node_modules/.vite
   pnpm dev
   ```
3. Incognito окно в браузере
4. Проверить консоль браузера на ошибки

---

## TODO (актуальный)

### Требует доработки:

1. **Opening In Preps** — добавить продукты в полуфабрикатах на начало периода

   - Сейчас Opening не учитывает продукты "замороженные" в prep batches
   - Нужны исторические данные о состоянии prep batches

2. **Closing In Preps** — использовать снапшот на конец периода

   - Сейчас показывает ТЕКУЩЕЕ состояние (`preparation_batches.current_quantity`)
   - Для исторических периодов нужен снапшот

3. **UI правки не отображаются** — изменения в файле есть, требуется диагностика Vite/кэша

### Возможные улучшения:

1. **Formula Bar визуализация** — текущее отображение может быть неинтуитивным
2. **Чипы Via Recipes/Via Preps** — добавить тултипы с объяснением путей
3. **Loss section** — добавить общую сумму для каждой подсекции

---

## Файлы проекта

### UI компоненты:

- `src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue` — диалог детализации
- `src/views/backoffice/analytics/VarianceReportView.vue` — основной отчёт

### Store:

- `src/stores/analytics/varianceReportStore.ts` — Pinia store для отчёта
- `src/stores/analytics/types.ts` — TypeScript типы

### Миграции:

- `src/supabase/migrations/110_fix_variance_formula_v4.sql` — основная функция v4
- `src/supabase/migrations/111_fix_details_v2_missing_recipe_product_sales.sql` (untracked)
- `src/supabase/migrations/112_fix_report_v3_prep_portion_size_bug.sql` (untracked)

**Примечание:** Миграции применены к DB, но файлы не закоммичены в git.
