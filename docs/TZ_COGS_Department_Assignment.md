# ТЗ: Распределение COGS по департаментам

## Проблема

Продукты с `usedInDepartments: ['kitchen', 'bar']` (например, молоко, сахар, бананы) используются в обоих департаментах. При расчете Food Cost KPI нужно определить, к какому департаменту относить их COGS.

**Пример проблемы:**

- Продукт "Молоко" используется в кухне (для соусов) и в баре (для кофе)
- При списании 1 литра молока - куда отнести этот COGS?
- При расчете KPI по департаментам - как разделить?

---

## Текущая архитектура COGS

### 1. Формула Total COGS

```
Total COGS = Sales COGS + Spoilage + Shortage - Surplus
```

Где:

- **Sales COGS** - себестоимость проданных товаров (из `sales_transactions.actual_cost`)
- **Spoilage** - списания (из `storage_operations` + `preparation_operations` где `operation_type = 'write_off'`)
- **Shortage** - недостача по инвентаризации (из `inventory_documents` где `total_value_difference < 0`)
- **Surplus** - излишки по инвентаризации (из `inventory_documents` где `total_value_difference > 0`)

### 2. Как определяется department для Sales COGS

```
MenuItem.department → OrderItem.department → SalesTransaction.department
```

**Текущий flow:**

1. `MenuItem` имеет поле `department: 'kitchen' | 'bar'`
2. При создании заказа: `orderItem.department = menuItem.department`
3. При продаже: `sales_transactions.department` берется из `orderItem.department`
4. SQL функция `get_food_cost_kpi_month` фильтрует по `sales_transactions.department`

**Вывод:** Sales COGS правильно распределяется по департаментам через MenuItem.

### 3. Как определяется department для Spoilage (списания)

```sql
-- storage_operations
WHERE operation_type = 'write_off'
  AND (p_department IS NULL OR department = p_department)

-- preparation_operations
WHERE operation_type = 'write_off'
  AND (p_department IS NULL OR department = p_department)
```

**Проблема:** Поле `department` в `storage_operations` и `preparation_operations` заполняется при создании операции. Но для продуктов с двумя департаментами - какой выбирается?

### 4. Shortage/Surplus (инвентаризация)

```sql
-- inventory_documents
WHERE status = 'completed'
```

**Проблема:** В текущей реализации inventory_documents **не имеет фильтра по department** в SQL функции. Shortage/Surplus считаются общими.

---

## Таблицы и поля

### products

```sql
used_in_departments TEXT[] -- ['kitchen'] | ['bar'] | ['kitchen', 'bar']
```

- Определяет в каких департаментах ИСПОЛЬЗУЕТСЯ продукт
- **19 продуктов** имеют оба департамента

### menu_items

```sql
department TEXT -- 'kitchen' | 'bar'
```

- Определяет департамент БЛЮДА (не продукта!)
- Влияет на `sales_transactions.department`

### order_items

```sql
department TEXT -- 'kitchen' | 'bar'
```

- Копируется из `menu_items.department` при создании заказа

### sales_transactions

```sql
department TEXT -- 'kitchen' | 'bar'
actual_cost JSONB -- {totalCost: number, items: [...]}
```

- Хранит FIFO себестоимость продажи
- department берется из order_item

### storage_operations

```sql
department TEXT -- 'kitchen' | 'bar'
operation_type TEXT -- 'receipt' | 'write_off' | 'transfer' | ...
total_value NUMERIC
```

- При списании (write_off) - откуда берется department?

### preparation_operations

```sql
department TEXT -- 'kitchen' | 'bar'
operation_type TEXT -- 'production' | 'write_off'
total_value NUMERIC
```

### inventory_documents

```sql
department TEXT -- 'kitchen' | 'bar'
total_value_difference NUMERIC
status TEXT -- 'draft' | 'completed'
```

---

## Что нужно решить

### Вопрос 1: Списания (Spoilage)

Когда списываем продукт с `usedInDepartments: ['kitchen', 'bar']`:

- **Вариант A:** Спрашивать оператора при списании "К какому департаменту отнести?"
- **Вариант B:** Использовать `usedInDepartments[0]` как primary department
- **Вариант C:** Распределять пропорционально продажам (сложно)

### Вопрос 2: Инвентаризация (Shortage/Surplus)

Инвентаризация проводится по департаментам. Нужно:

- Добавить фильтр по `department` в SQL функцию
- Или оставить Shortage/Surplus общими (не разбивать по департаментам)

### Вопрос 3: Страница настроек KPI

Текущая страница `/kpi-settings` с "Product Departments" - **не влияет на KPI**.

- Нужно либо убрать её
- Либо изменить логику (использовать для определения department при списании)

---

## Предлагаемое решение

### Шаг 1: Определить primary department для продуктов

В `products` уже есть `used_in_departments` как массив. Первый элемент = primary.

```typescript
// Product
usedInDepartments: ['kitchen', 'bar'] // kitchen = primary
usedInDepartments: ['bar', 'kitchen'] // bar = primary
```

Страница KPI Settings позволяет переставить порядок (сделать bar primary).

### Шаг 2: Использовать primary department при списании

При создании `storage_operations.write_off`:

```typescript
department = product.usedInDepartments[0] // primary department
```

### Шаг 3: Обновить SQL функцию для инвентаризации

Добавить фильтр по department для Shortage/Surplus:

```sql
-- Filter inventory by department
AND (p_department IS NULL OR department = p_department)
```

---

## Текущее состояние кода

### Созданные файлы:

- `src/views/backoffice/settings/KpiSettingsView.vue` - страница настроек KPI
- `src/supabase/migrations/059_create_food_cost_kpi_function.sql` - SQL функция

### Роуты:

- `/salary/time-kpi` - Time KPI аналитика
- `/salary/food-cost-kpi` - Food Cost KPI аналитика
- `/kpi-settings` - Настройки KPI (Catalogs)

### Меню:

- Salary → Time KPI, Food Cost KPI
- Catalogs → KPI Settings

---

## Acceptance Criteria

1. [ ] При списании продукта с двумя департаментами - используется primary department
2. [ ] Страница KPI Settings позволяет изменить primary department для продукта
3. [ ] Изменение primary department сохраняется в БД (`usedInDepartments` порядок)
4. [ ] Food Cost KPI корректно считает COGS по департаментам
5. [ ] Shortage/Surplus учитывают department (или явно показано что они общие)

---

## Открытые вопросы

1. **Нужно ли разбивать Shortage/Surplus по департаментам?**

   - Инвентаризация уже проводится по департаментам
   - Но SQL функция не фильтрует inventory_documents по department

2. **Где показывать "общий" COGS vs "по департаментам"?**

   - Kitchen Monitor: по департаментам (текущий department)
   - Reports: общий + breakdown по департаментам

3. **Что делать со старыми списаниями без department?**
   - Миграция данных?
   - Игнорировать (отнести к общему)?
