# План: Унификация расчёта COGS в отчётах Kitchen App

## Краткое описание проблемы

P&L и Food Cost KPI показывают разные значения COGS:

- P&L: Spoilage Rp 176,675 (не включает preparation write-offs)
- KPI: Spoilage Rp 198,906 (корректное значение)
- Разница: Rp 22,231 = preparation_operations write-offs

**Корневая причина:** P&L использует in-memory store методы которые не
загружают данные из БД, а KPI использует SQL.

---

## Выбранное решение: Единая SQL-функция

Создать `get_cogs_by_date_range(start, end, department, excluded_reasons)` —
единый источник COGS для всех отчётов.

**Преимущества:**

- Single source of truth
- Поддержка произвольных дат (не только месяцы)
- Эффективный единый SQL-запрос
- Детализация по причинам списания (expired/spoiled/other)
- Настраиваемые исключения для KPI vs P&L

---

## Ключевые решения

| Вопрос                       | Решение                                           |
| ---------------------------- | ------------------------------------------------- |
| P&L включать education/test? | **Да, включать ВСЁ**                              |
| Surplus в COGS?              | **Вычитать из COGS**                              |
| Food Cost Dashboard?         | **Переключить на новый сервис, UI без изменений** |
| Feature flag?                | **Не нужен** (система в разработке)               |

---

## План реализации

### Фаза 1: SQL миграции (последовательно)

#### Шаг 1.1: Создать индексы для производительности

Файл: `src/supabase/migrations/060_5_add_cogs_indexes.sql`

```sql
-- Индексы для производительности get_cogs_by_date_range
CREATE INDEX IF NOT EXISTS idx_storage_ops_date_type
ON storage_operations(operation_date, operation_type);

CREATE INDEX IF NOT EXISTS idx_prep_ops_date_type
ON preparation_operations(operation_date, operation_type);

CREATE INDEX IF NOT EXISTS idx_inventory_docs_date_status
ON inventory_documents(inventory_date, status);

CREATE INDEX IF NOT EXISTS idx_sales_trans_sold_at
ON sales_transactions(sold_at);
```

#### Шаг 1.2: Создать SQL-функцию

Файл: `src/supabase/migrations/061_create_cogs_date_range_function.sql`

```sql
CREATE OR REPLACE FUNCTION get_cogs_by_date_range(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_department TEXT DEFAULT NULL,
  p_excluded_reasons JSONB DEFAULT NULL
  -- Для P&L: передать NULL (включает всё кроме production/sales_consumption)
  -- Для KPI: передать {"storage": ["education", "test"], "preparation": ["education", "test"]}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue NUMERIC := 0;
  v_sales_cogs NUMERIC := 0;
  v_spoilage_total NUMERIC := 0;
  v_spoilage_expired NUMERIC := 0;
  v_spoilage_spoiled NUMERIC := 0;
  v_spoilage_other NUMERIC := 0;
  v_shortage NUMERIC := 0;
  v_surplus NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_storage_excluded TEXT[];
  v_prep_excluded TEXT[];
BEGIN
  -- Валидация department
  IF p_department IS NOT NULL AND p_department NOT IN ('kitchen', 'bar') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be kitchen, bar, or NULL', p_department;
  END IF;

  -- Парсинг исключаемых причин
  -- Всегда исключаем production_consumption и sales_consumption (уже в Sales COGS)
  v_storage_excluded := ARRAY['production_consumption', 'sales_consumption'];
  v_prep_excluded := ARRAY['production_consumption', 'sales_consumption'];

  -- Добавляем пользовательские исключения (для KPI)
  IF p_excluded_reasons IS NOT NULL THEN
    IF p_excluded_reasons->'storage' IS NOT NULL THEN
      SELECT v_storage_excluded || ARRAY(
        SELECT jsonb_array_elements_text(p_excluded_reasons->'storage')
      ) INTO v_storage_excluded;
    END IF;
    IF p_excluded_reasons->'preparation' IS NOT NULL THEN
      SELECT v_prep_excluded || ARRAY(
        SELECT jsonb_array_elements_text(p_excluded_reasons->'preparation')
      ) INTO v_prep_excluded;
    END IF;
  END IF;

  -- 1. Revenue and Sales COGS from sales_transactions
  SELECT
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM((actual_cost->>'totalCost')::NUMERIC), 0)
  INTO v_revenue, v_sales_cogs
  FROM sales_transactions
  WHERE sold_at >= p_start_date AND sold_at < p_end_date
    AND (p_department IS NULL OR department = p_department);

  -- 2. Product Spoilage from storage_operations (with reason breakdown)
  SELECT
    COALESCE(SUM(total_value), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'expired' THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'spoiled' THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'other' THEN total_value ELSE 0 END), 0)
  INTO v_spoilage_total, v_spoilage_expired, v_spoilage_spoiled, v_spoilage_other
  FROM storage_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= p_start_date AND operation_date < p_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (
      write_off_details->>'reason' IS NULL
      OR NOT (write_off_details->>'reason' = ANY(v_storage_excluded))
    );

  -- 3. Preparation Spoilage from preparation_operations (add to totals)
  SELECT
    v_spoilage_total + COALESCE(SUM(total_value), 0),
    v_spoilage_expired + COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'expired' THEN total_value ELSE 0 END), 0),
    v_spoilage_spoiled + COALESCE(SUM(CASE WHEN write_off_details->>'reason' = 'spoiled' THEN total_value ELSE 0 END), 0),
    v_spoilage_other + COALESCE(SUM(CASE WHEN write_off_details->>'reason' IN ('other', 'contaminated', 'overproduced', 'quality_control') THEN total_value ELSE 0 END), 0)
  INTO v_spoilage_total, v_spoilage_expired, v_spoilage_spoiled, v_spoilage_other
  FROM preparation_operations
  WHERE operation_type = 'write_off'
    AND operation_date >= p_start_date AND operation_date < p_end_date
    AND (p_department IS NULL OR department = p_department)
    AND (
      write_off_details->>'reason' IS NULL
      OR NOT (write_off_details->>'reason' = ANY(v_prep_excluded))
    );

  -- 4. Shortage and Surplus from inventory_documents (single optimized query)
  WITH inventory_data AS (
    SELECT
      (item->>'itemId')::uuid as item_id,
      (item->>'valueDifference')::NUMERIC as value_diff
    FROM inventory_documents,
    LATERAL jsonb_array_elements(items) AS item
    WHERE inventory_date >= p_start_date::DATE
      AND inventory_date < p_end_date::DATE
      AND status = 'completed'
  ),
  items_with_dept AS (
    SELECT
      id.value_diff,
      COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department
    FROM inventory_data id
    LEFT JOIN products p ON id.item_id = p.id
  )
  SELECT
    COALESCE(SUM(CASE WHEN value_diff < 0 THEN ABS(value_diff) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value_diff > 0 THEN value_diff ELSE 0 END), 0)
  INTO v_shortage, v_surplus
  FROM items_with_dept
  WHERE p_department IS NULL OR kpi_department = p_department;

  -- 5. Calculate Total COGS
  -- Formula: Total COGS = Sales COGS + Spoilage + Shortage - Surplus
  v_total_cogs := v_sales_cogs + v_spoilage_total + v_shortage - v_surplus;

  -- Return comprehensive breakdown
  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'startDate', p_start_date::DATE,
      'endDate', p_end_date::DATE
    ),
    'revenue', ROUND(v_revenue, 2),
    'salesCOGS', ROUND(v_sales_cogs, 2),
    'spoilage', jsonb_build_object(
      'total', ROUND(v_spoilage_total, 2),
      'expired', ROUND(v_spoilage_expired, 2),
      'spoiled', ROUND(v_spoilage_spoiled, 2),
      'other', ROUND(v_spoilage_other, 2)
    ),
    'shortage', ROUND(v_shortage, 2),
    'surplus', ROUND(v_surplus, 2),
    'totalCOGS', ROUND(v_total_cogs, 2),
    'totalCOGSPercent', CASE WHEN v_revenue > 0
      THEN ROUND((v_total_cogs / v_revenue) * 100, 2)
      ELSE 0 END,
    'metadata', jsonb_build_object(
      'generatedAt', NOW(),
      'excludedReasons', p_excluded_reasons
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_cogs_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cogs_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB) TO anon;
```

#### Шаг 1.3: Создать таблицу KPI Settings

Файл: `src/supabase/migrations/062_create_kpi_settings_table.sql`

```sql
-- Таблица настроек KPI
CREATE TABLE IF NOT EXISTS kpi_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  excluded_reasons JSONB NOT NULL DEFAULT '{
    "storage": ["education", "test"],
    "preparation": ["education", "test"]
  }',
  targets JSONB NOT NULL DEFAULT '{"kitchen": 30, "bar": 25}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO kpi_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE kpi_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON kpi_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update for authenticated" ON kpi_settings FOR UPDATE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kpi_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kpi_settings_updated_at
  BEFORE UPDATE ON kpi_settings
  FOR EACH ROW EXECUTE FUNCTION update_kpi_settings_timestamp();
```

---

### Фаза 2: TypeScript сервисы (можно параллельно)

#### Шаг 2.1: Создать COGSService

Файл: `src/stores/analytics/services/cogsService.ts`

```typescript
import { supabase } from '@/lib/supabase'

export interface SpoilageBreakdown {
  total: number
  expired: number
  spoiled: number
  other: number
}

export interface COGSBreakdown {
  period: { startDate: string; endDate: string }
  revenue: number
  salesCOGS: number
  spoilage: SpoilageBreakdown
  shortage: number
  surplus: number
  totalCOGS: number
  totalCOGSPercent: number
  metadata: {
    generatedAt: string
    excludedReasons: ExcludedReasons | null
  }
}

export interface ExcludedReasons {
  storage?: string[]
  preparation?: string[]
}

/**
 * Get COGS breakdown for a date range
 * @param startDate - Start of period (ISO string)
 * @param endDate - End of period (ISO string)
 * @param department - Filter by department (null for all)
 * @param excludedReasons - Reasons to exclude (null for P&L, settings for KPI)
 */
export async function getCOGSByDateRange(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null,
  excludedReasons: ExcludedReasons | null = null
): Promise<COGSBreakdown> {
  const { data, error } = await supabase.rpc('get_cogs_by_date_range', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_department: department,
    p_excluded_reasons: excludedReasons
  })

  if (error) {
    throw new Error(`Failed to get COGS: ${error.message}`)
  }

  return data as COGSBreakdown
}

/**
 * Get COGS for P&L Report (includes ALL write-offs except production/sales consumption)
 */
export async function getCOGSForPL(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null
): Promise<COGSBreakdown> {
  return getCOGSByDateRange(startDate, endDate, department, null)
}

/**
 * Get COGS for KPI (with configured exclusions from settings)
 */
export async function getCOGSForKPI(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null,
  excludedReasons: ExcludedReasons
): Promise<COGSBreakdown> {
  return getCOGSByDateRange(startDate, endDate, department, excludedReasons)
}
```

#### Шаг 2.2: Создать KPI Settings Service

Файл: `src/stores/kitchenKpi/services/kpiSettingsService.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { ExcludedReasons } from '@/stores/analytics/services/cogsService'

export interface KPISettings {
  id: string
  excludedReasons: ExcludedReasons
  targets: {
    kitchen: number
    bar: number
  }
  updatedAt: string
}

/**
 * Get KPI settings from database
 */
export async function getKPISettings(): Promise<KPISettings> {
  const { data, error } = await supabase
    .from('kpi_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  if (error) {
    throw new Error(`Failed to get KPI settings: ${error.message}`)
  }

  return {
    id: data.id,
    excludedReasons: data.excluded_reasons,
    targets: data.targets,
    updatedAt: data.updated_at
  }
}

/**
 * Update KPI settings
 */
export async function updateKPISettings(
  settings: Partial<Pick<KPISettings, 'excludedReasons' | 'targets'>>
): Promise<KPISettings> {
  const updateData: Record<string, unknown> = {}

  if (settings.excludedReasons) {
    updateData.excluded_reasons = settings.excludedReasons
  }
  if (settings.targets) {
    updateData.targets = settings.targets
  }

  const { data, error } = await supabase
    .from('kpi_settings')
    .update(updateData)
    .eq('id', 'default')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update KPI settings: ${error.message}`)
  }

  return {
    id: data.id,
    excludedReasons: data.excluded_reasons,
    targets: data.targets,
    updatedAt: data.updated_at
  }
}
```

#### Шаг 2.3: Обновить типы

Файл: `src/stores/analytics/types.ts` - добавить:

```typescript
export interface SpoilageBreakdown {
  total: number
  expired: number
  spoiled: number
  other: number
}

export interface COGSBreakdown {
  period: { startDate: string; endDate: string }
  revenue: number
  salesCOGS: number
  spoilage: SpoilageBreakdown
  shortage: number
  surplus: number
  totalCOGS: number
  totalCOGSPercent: number
}
```

---

### Фаза 3: Обновление отчетов (можно параллельно)

#### Шаг 3.1: Обновить P&L Report Store

Файл: `src/stores/analytics/plReportStore.ts`

Заменить in-memory расчёт на вызов SQL-функции:

```typescript
// БЫЛО (не работает):
const productSpoilageOps = await storageStore.getOperationsByFilter({...})
const prepSpoilageOps = await preparationStore.getOperationsByFilter({...})

// СТАНЕТ:
import { getCOGSForPL } from './services/cogsService'

const cogsData = await getCOGSForPL(dateFrom, dateTo, null)
const accrualCOGS = {
  salesCOGS: cogsData.salesCOGS,
  spoilage: cogsData.spoilage.total,
  spoilageBreakdown: cogsData.spoilage, // детализация
  shortage: cogsData.shortage,
  surplus: cogsData.surplus,
  total: cogsData.totalCOGS
}
```

#### Шаг 3.2: Обновить Food Cost Dashboard Store

Файл: `src/stores/analytics/foodCostStore.ts`

Переключить на новый сервис (UI без изменений, использовать только salesCOGS):

```typescript
// БЫЛО:
const transactions = await salesStore.getTransactionsByDateRange(...)
const foodCost = transactions.reduce((sum, t) => sum + t.actualCost.totalCost, 0)

// СТАНЕТ:
import { getCOGSForPL } from './services/cogsService'

const cogsData = await getCOGSForPL(dateFrom, dateTo, department)
const foodCost = cogsData.salesCOGS  // Только Sales COGS для Dashboard
const revenue = cogsData.revenue
```

#### Шаг 3.3: Обновить P&L View (опционально)

Файл: `src/views/backoffice/analytics/PLReportView.vue`

Добавить детализацию spoilage в UI:

```
Spoilage & Losses              Rp 198.906    147.3%
  ├─ Expired products          Rp 45.000     33.3%
  ├─ Spoiled/Damaged           Rp 30.000     22.2%
  └─ Other losses              Rp 123.906    91.8%
```

#### Шаг 3.4: Добавить вкладку Write-off Reasons в KPI Settings

Файл: `src/views/backoffice/settings/KpiSettingsView.vue`

```
Tabs: [Targets] [Product Departments] [Write-off Reasons]

┌─────────────────────────────────────────────────────────────────┐
│  KPI Write-off Reasons                                          │
│                                                                 │
│  ⓘ These settings apply ONLY to KPI reports.                   │
│    P&L Report always includes ALL write-off reasons.           │
│                                                                 │
│  Storage Write-offs (Exclude from KPI COGS):                   │
│  ☑ Education        Training usage                             │
│  ☑ Test             Recipe development                         │
│                                                                 │
│  Preparation Write-offs (Exclude from KPI COGS):               │
│  ☑ Education        Training usage                             │
│  ☑ Test             Recipe development                         │
│                                                                 │
│  [Save Settings]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Фаза 4: KPI интеграция

#### Шаг 4.1: Обновить Food Cost KPI Service

Файл: `src/stores/kitchenKpi/services/foodCostKpiService.ts`

```typescript
// БЫЛО:
const { data } = await supabase.rpc('get_food_cost_kpi_month', {...})

// СТАНЕТ:
import { getCOGSForKPI } from '@/stores/analytics/services/cogsService'
import { getKPISettings } from './kpiSettingsService'

const settings = await getKPISettings()
const cogsData = await getCOGSForKPI(startDate, endDate, department, settings.excludedReasons)
```

---

### Фаза 5: Проверка и деплой

#### Шаг 5.1: Тестирование SQL функции

```sql
-- Тест без исключений (P&L)
SELECT get_cogs_by_date_range(
  '2024-01-01'::timestamptz,
  '2024-02-01'::timestamptz,
  NULL,
  NULL
);

-- Тест с исключениями (KPI)
SELECT get_cogs_by_date_range(
  '2024-01-01'::timestamptz,
  '2024-02-01'::timestamptz,
  'kitchen',
  '{"storage": ["education", "test"], "preparation": ["education", "test"]}'::jsonb
);

-- Сравнить с текущим KPI
SELECT get_food_cost_kpi_month('2024-01', 'kitchen');
```

#### Шаг 5.2: Проверка консистентности

- [ ] P&L и KPI показывают одинаковые значения (с учетом исключений)
- [ ] Food Cost Dashboard работает корректно
- [ ] KPI Settings сохраняются и применяются
- [ ] Все значения совпадают с ручным расчетом

#### Шаг 5.3: Production Deploy

1. Применить миграции на PROD
2. Deploy приложения
3. Опционально: удалить старую функцию `get_food_cost_kpi_month`

---

## Файлы для изменения

| Действие | Файл                                                              | Описание                              |
| -------- | ----------------------------------------------------------------- | ------------------------------------- |
| CREATE   | `src/supabase/migrations/060_5_add_cogs_indexes.sql`              | Индексы для производительности        |
| CREATE   | `src/supabase/migrations/061_create_cogs_date_range_function.sql` | SQL-функция                           |
| CREATE   | `src/supabase/migrations/062_create_kpi_settings_table.sql`       | Таблица настроек                      |
| CREATE   | `src/stores/analytics/services/cogsService.ts`                    | TypeScript сервис                     |
| CREATE   | `src/stores/kitchenKpi/services/kpiSettingsService.ts`            | Сервис настроек KPI                   |
| MODIFY   | `src/stores/analytics/plReportStore.ts`                           | P&L Report                            |
| MODIFY   | `src/stores/analytics/foodCostStore.ts`                           | Food Cost Dashboard (источник данных) |
| MODIFY   | `src/stores/kitchenKpi/services/foodCostKpiService.ts`            | Food Cost KPI Service                 |
| MODIFY   | `src/stores/analytics/types.ts`                                   | Типы                                  |
| MODIFY   | `src/views/backoffice/settings/KpiSettingsView.vue`               | UI: вкладка Write-off Reasons         |
| MODIFY   | `src/views/backoffice/analytics/PLReportView.vue`                 | UI: детализация spoilage              |
| DELETE   | Старую функцию `get_food_cost_kpi_month`                          | Опционально в конце                   |

---

## Полная карта причин списания → COGS категории

### Storage Write-offs (storage_operations)

| Причина                | P&L         | KPI (по умолч.) | Описание                       |
| ---------------------- | ----------- | --------------- | ------------------------------ |
| expired                | ✅ Включен  | ✅ Включен      | Истёк срок годности            |
| spoiled                | ✅ Включен  | ✅ Включен      | Испорчен (повреждён, прокис)   |
| other                  | ✅ Включен  | ✅ Включен      | Прочие потери (разлив, ошибка) |
| education              | ✅ Включен  | ❌ Исключен     | Обучение персонала             |
| test                   | ✅ Включен  | ❌ Исключен     | Разработка рецептов            |
| production_consumption | ❌ Исключен | ❌ Исключен     | Уже в Sales COGS (FIFO)        |
| sales_consumption      | ❌ Исключен | ❌ Исключен     | Уже в Sales COGS (FIFO)        |

### Preparation Write-offs (preparation_operations)

| Причина         | P&L        | KPI (по умолч.) | Описание                       |
| --------------- | ---------- | --------------- | ------------------------------ |
| expired         | ✅ Включен | ✅ Включен      | Истёк срок годности            |
| spoiled         | ✅ Включен | ✅ Включен      | Испорчен                       |
| contaminated    | ✅ Включен | ✅ Включен      | Загрязнение (падение, контакт) |
| overproduced    | ✅ Включен | ✅ Включен      | Перепроизводство (не продано)  |
| quality_control | ✅ Включен | ✅ Включен      | Не прошёл контроль качества    |
| other           | ✅ Включен | ✅ Включен      | Прочие потери                  |
| education       | ✅ Включен | ❌ Исключен     | Обучение персонала             |
| test            | ✅ Включен | ❌ Исключен     | Тестирование рецептов          |

### Inventory Documents (inventory_documents)

| Тип                 | Категория COGS | Описание                                    |
| ------------------- | -------------- | ------------------------------------------- |
| valueDifference < 0 | Shortage       | Недостача (фактически меньше, чем по учёту) |
| valueDifference > 0 | Surplus        | Излишки (фактически больше, чем по учёту)   |

---

## Формула Total COGS

```
Total COGS = Sales COGS + Spoilage + Shortage - Surplus
```

Где:

- **Sales COGS** = FIFO cost из `sales_transactions.actual_cost.totalCost`
- **Spoilage** = Сумма всех write-offs (с учетом исключений для KPI)
- **Shortage** = Недостача по результатам инвентаризации
- **Surplus** = Излишки (вычитаются из COGS)

---

## Все отчёты после изменений

| Отчёт               | Источник данных                    | Что показывает                       |
| ------------------- | ---------------------------------- | ------------------------------------ |
| P&L Report          | `get_cogs_by_date_range(null)`     | Полный COGS + детализация spoilage   |
| Food Cost Dashboard | `get_cogs_by_date_range(null)`     | Только Sales COGS (UI без изменений) |
| Food Cost KPI       | `get_cogs_by_date_range(settings)` | COGS с настраиваемыми исключениями   |

**Результат:** Все три отчёта используют единую функцию = консистентность данных.
