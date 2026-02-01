# Product Variance Report

## Цель отчёта

Product Variance Report анализирует расхождения между **ожидаемым** и **фактическим** количеством продуктов на складе. Помогает выявить:

- Незафиксированные потери (кража, порча без записи)
- Ошибки в рецептах (неправильные количества ингредиентов)
- Ошибки в приёмках (неправильные количества)
- Ошибки при инвентаризации

---

## Основная формула (v4.4)

```
Expected = Opening + Received - Sales - Loss + Gain
Actual = Closing + InPreps

Variance = Actual - Expected
```

**ВАЖНО (v4.4):** WriteOffs (production_consumption) **НЕ вычитаются** отдельно, т.к. уже учтены в Sales через products_from_preparations.

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
- В пределах `delivery_date` периода (inclusive end date)

```sql
SELECT SUM(received_quantity) as qty,
       SUM(received_quantity * actual_base_cost) as amount
FROM supplierstore_receipt_items sri
JOIN supplierstore_receipts sr ON sri.receipt_id = sr.id
WHERE sri.item_id = '{product_id}'
  AND sr.delivery_date >= '{start_date}'
  AND sr.delivery_date < '{end_date + 1 day}'  -- inclusive
  AND sr.status = 'completed'
```

### 3. Sales (Теоретические продажи)

**Источник:** Расчёт на основе `orders` + `order_items` + `payments`

Теоретический расход продукта на основе проданных блюд. **Пять путей:**

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

#### 3.4 Sales via Recipe → Preparation

```
Menu Item → Recipe → Preparation → Product
```

#### 3.5 Sales via Nested Preparations (NEW in v4.3)

```
Menu Item → Preparation A → Preparation B → Product
```

**Примеры nested preparations:**

- `Tom Yam Seafood Pack` → `Shrimp thawed 30pc` → `Udang`
- `Ciabatta small` → `Dough ciabatta` → `Flour, Water, Oil...`
- `Dorado unfrozen` → `Tempung goreng` → `Flour, Pepper...`

**Total Sales = Direct + Via Recipes + Via Preparations (all levels)**

**Важно:** Считаются только заказы с завершёнными платежами (`payments.status = 'completed'`).

### 4. WriteOffs (Фактические списания)

**Источник:** `storage_operations` с типами:

- `write_off` + `reason = 'sales_consumption'` — списания на продажи
- `write_off` + `reason = 'production_consumption'` — списания на производство полуфабрикатов

Это **фактические** списания, которые были созданы системой или вручную.

### 5. Loss (Потери)

**Источник:** `storage_operations` с типами:

- `write_off` + `reason = 'expired'` — истёк срок годности
- `write_off` + `reason = 'spoiled'` — испортился
- `write_off` + `reason = 'other'` — другие причины
- `correction` с **отрицательным** количеством — нашли меньше при инвентаризации

**Total Loss = Direct Loss + Negative Corrections**

### 6. Gain (Прибавки)

**Источник:** `storage_operations` с типом `correction` и **положительным** количеством

Когда при инвентаризации нашли **больше** чем в системе.

### 7. Closing (Остаток на складе)

**Источник:** `storage_batches`

Сумма всех активных батчей продукта.

### 8. InPreps (Остаток в полуфабрикатах)

**Источник:** `preparation_batches` + `preparation_ingredients`

Продукт "заморожен" в активных батчах полуфабрикатов. **Включает recursive decomposition:**

```
InPreps = Σ (prep_batch.qty × product_per_batch / output_quantity)
```

**Важно (v4.3):** Используется `output_quantity` для ОБОИХ типов (`portion` и `weight`).

---

## Технические детали

### RPC Functions (актуальные версии)

| Function                          | Version   | Purpose                             |
| --------------------------------- | --------- | ----------------------------------- |
| `get_product_variance_report_v3`  | **v4.4**  | Основной отчёт со списком продуктов |
| `get_product_variance_details_v2` | **v2.10** | Детализация по одному продукту      |

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

---

## История изменений

### Сессия 2026-02-01 (день) - v4.4

#### Критические исправления:

| #   | Баг                            | Причина                                       | Решение                                |
| --- | ------------------------------ | --------------------------------------------- | -------------------------------------- |
| 1   | Разные данные в report/details | report_v3 вычитал production_writeoffs дважды | Убрали production_writeoffs из формулы |
| 2   | RPC error в details_v2         | Type mismatch в recursive CTE                 | Добавлены `::NUMERIC` casts            |
| 3   | "No sales" при наличии продаж  | Отсутствовал breakdown (direct/viaRecipes)    | Добавлены все поля в details_v2        |

#### Новые возможности:

| #   | Функционал            | Описание                                              | Миграция |
| --- | --------------------- | ----------------------------------------------------- | -------- |
| 1   | **Sales breakdown**   | Direct, Via Recipes, Via Preps в details_v2           | 117      |
| 2   | **Top menu items**    | Массив topMenuItems для таблицы в UI                  | 117      |
| 3   | **Unified formula**   | Одинаковая формула в report_v3 и details_v2           | 116      |
| 4   | **Actual Write-offs** | Секция actualWriteOffs с sales/production/corrections | 118      |

#### Миграции:

| #   | Файл                                             | Описание                                    |
| --- | ------------------------------------------------ | ------------------------------------------- |
| 115 | `115_fix_details_v2_recursive_type_mismatch.sql` | Fix recursive CTE type mismatch             |
| 116 | `116_fix_report_v3_remove_double_counting.sql`   | Remove double-counting production_writeoffs |
| 117 | `117_add_sales_breakdown_to_details_v2.sql`      | Add sales breakdown + topMenuItems          |
| 118 | `118_add_actual_writeoffs_to_details_v2.sql`     | Add actualWriteOffs section                 |

---

### Сессия 2026-02-01 (ночь) - v4.3

#### Новые возможности:

| #   | Функционал                         | Описание                                               | Миграция |
| --- | ---------------------------------- | ------------------------------------------------------ | -------- |
| 1   | **Recursive preparations**         | Поддержка вложенных preps: `Prep A → Prep B → Product` | 114      |
| 2   | **Single-day filter**              | Можно запрашивать отчёт за один день (Feb 1 - Feb 1)   | 114      |
| 3   | **Unified portion/weight formula** | Одна формула `/ output_quantity` для обоих типов       | 113      |

#### Результаты recursive preparations:

| Продукт | До (v4.2) | После (v4.3) | Изменение |
| ------- | --------- | ------------ | --------- |
| Udang   | 400g      | 6,400g       | **16x**   |

**Причина:** Раньше не учитывались вложенные preparations:

- `Tom Yam Seafood Pack` → `Shrimp thawed 30pc` → `Udang`

#### Исправленные баги в 114:

| #   | Баг                             | Причина                               | Решение                                  |
| --- | ------------------------------- | ------------------------------------- | ---------------------------------------- |
| 1   | Single-day возвращает 0 записей | Фильтр `>= Feb 1 AND < Feb 1` = пусто | Inclusive end: `< end_date + 1 day`      |
| 2   | Nested preps не учитываются     | Код не обходил вложенные preparations | Добавлен recursive CTE `prep_tree`       |
| 3   | InPreps не учитывает nested     | `products_in_preps` был плоским       | Добавлен recursive CTE `prep_batch_tree` |

### Сессия 2026-02-01 (вечер) - v4.2

#### Миграции (все применены к DEV и PRODUCTION):

| #   | Файл                                                        | Описание                                      |
| --- | ----------------------------------------------------------- | --------------------------------------------- |
| 111 | `111_fix_details_v2_missing_recipe_product_sales.sql`       | Добавлен путь `Menu → Recipe → Product`       |
| 112 | `112_fix_report_v3_prep_portion_size_bug.sql`               | Исправлен расчёт для weight-type preps        |
| 113 | `113_fix_portion_type_use_output_quantity.sql`              | Unified formula: `/ output_quantity` для всех |
| 114 | `114_add_recursive_preparations_and_single_day_support.sql` | Recursive preps + single-day filter           |

---

## Статус миграций (2026-02-01)

### ✅ Применены к PRODUCTION:

- Migration 111: `fix_details_v2_missing_recipe_product_sales`
- Migration 112: `fix_report_v3_prep_portion_size_bug`
- Migration 113: `fix_portion_type_use_output_quantity`
- Migration 114: `add_recursive_preparations_and_single_day_support`
- Migration 115: `fix_details_v2_recursive_type_mismatch`
- Migration 116: `fix_report_v3_remove_double_counting_writeoffs`
- Migration 117: `add_sales_breakdown_to_details_v2`
- Migration 118: `add_actual_writeoffs_to_details_v2`

Все миграции применены через MCP (подключён к PRODUCTION).

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

## TODO (актуальный)

### ✅ Выполнено:

1. **Recursive preparations** — вложенные preparations теперь учитываются
2. **Single-day filter** — можно смотреть отчёт за один день
3. **Unified formula** — report_v3 и details_v2 используют одинаковую формулу
4. **Sales breakdown** — Direct, Via Recipes, Via Preps в details_v2
5. **Top menu items** — таблица блюд в диалоге детализации
6. **Actual Write-offs** — секция с фактическими списаниями (sales/production/corrections)
7. **Миграции применены к PRODUCTION** — все 111-118

### Возможные улучшения:

1. **Single Source of Truth** — унифицировать `report_v3` и `details_v2` в одну функцию

   - Сейчас есть риск рассинхронизации между двумя функциями
   - Вариант: Store как orchestrator, одна RPC возвращает всё

2. **Opening In Preps** — добавить продукты в полуфабрикатах на начало периода

   - Нужны исторические данные о состоянии prep batches

3. **Closing In Preps** — использовать снапшот на конец периода
   - Для исторических периодов нужен снапшот

---

## Файлы проекта

### UI компоненты:

- `src/views/backoffice/analytics/ProductVarianceDetailDialogV2.vue` — диалог детализации
- `src/views/backoffice/analytics/VarianceReportView.vue` — основной отчёт

### Store:

- `src/stores/analytics/varianceReportStore.ts` — Pinia store для отчёта
- `src/stores/analytics/types.ts` — TypeScript типы

### Миграции (все закоммичены):

- `src/supabase/migrations/110_fix_variance_formula_v4.sql` — основная функция v4
- `src/supabase/migrations/111_fix_details_v2_missing_recipe_product_sales.sql`
- `src/supabase/migrations/112_fix_report_v3_prep_portion_size_bug.sql`
- `src/supabase/migrations/113_fix_portion_type_use_output_quantity.sql`
- `src/supabase/migrations/114_add_recursive_preparations_and_single_day_support.sql`
