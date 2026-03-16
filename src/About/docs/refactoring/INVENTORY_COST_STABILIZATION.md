# Стабилизация системы учёта: Инвентарь, Себестоимость, Списания

> Дата анализа: 2026-03-10
> Статус: Планирование

---

## 1. Обзор проблемы

Система работает, но имеет **хрупкую архитектуру** в области учёта:

- Нет единого источника правды для декомпозиции (TS vs SQL)
- Нет единого конвертера единиц измерения (6+ мест с разной логикой)
- Два параллельных пайплайна batch deduction (продукты vs полуфабрикаты)
- Разная точность округления (2 vs 4 decimal places)
- Починка одного места ломает другое

---

## 2. Текущая архитектура (AS-IS)

### 2.1 Поток данных

```
POS Order (menu items, modifiers)
    |
    v
DecompositionEngine.traverse()           <-- TypeScript, рекурсивный обход
    |  - Resolves menu item -> composition
    |  - Applies modifiers
    |  - Converts portions -> grams (portionUtils.ts)
    |  - Applies yield adjustment (yieldUtils.ts)
    |  - Merges duplicate nodes
    |  - Output: DecomposedNode[] (products + preparations, base units)
    |
    +---> CostAdapter.transform()        <-- Read-only, при оплате
    |      - FIFO allocation (RPC default, client fallback)
    |      - Записывает actual_cost в транзакцию
    |      - НЕ меняет batch quantities
    |
    +---> WriteOffAdapter.transform()    <-- При списании
           - Converts nodes -> WriteOffItem[]
           - costPerUnit = null для preparations (FIFO позже)
                |
                v
           storageService.createReceipt()         <-- Продукты
           preparationService.createWriteOff()     <-- Полуфабрикаты
                - Actual FIFO batch deduction
                - Updates batch quantities
                - Creates storage_operations / preparation_write_offs
```

### 2.2 Variance Report (параллельная ветка)

```
varianceReportStore.ts
    |
    v
SQL RPCs:
    calc_prep_decomposition_factors()    <-- СВОЯ рекурсия в PL/pgSQL
    calc_product_theoretical_sales()     <-- СВОЯ декомпозиция
    |
    v
Expected = Opening + Received - Sales - Loss + Gain
Actual   = Closing + InPreps
Variance = Actual - Expected
```

**Критично**: SQL RPCs реализуют декомпозицию НЕЗАВИСИМО от TypeScript DecompositionEngine.

### 2.3 Где происходит конвертация единиц (6 мест)

| Место               | Файл                      | Что конвертирует               | Точность               |
| ------------------- | ------------------------- | ------------------------------ | ---------------------- |
| DecompositionEngine | `portionUtils.ts`         | portion -> gram                | 2 decimal              |
| Composable          | `useMeasurementUnits.ts`  | general convertUnits()         | varies                 |
| Cost calculation    | `useCostCalculation.ts`   | portion -> gram (planned mode) | varies                 |
| SQL RPCs            | variance report           | portion -> gram в PL/pgSQL     | varies                 |
| Preparation service | `preparationService.ts`   | batch updates                  | 4 decimal              |
| Batch allocation    | `batchAllocationUtils.ts` | FIFO quantities                | 2 decimal (toFixed(2)) |

### 2.4 Два FIFO пайплайна

**Client-side** (`batchAllocationUtils.ts`):

- `allocateFromStorageBatches()` — продукты
- `allocateFromPreparationBatches()` — полуфабрикаты
- Fallback когда RPC недоступен

**Server-side** (Supabase RPCs):

- `allocate_product_fifo` — продукты
- `allocate_preparation_fifo` — полуфабрикаты (нормализует portion costs)
- `allocate_batch_fifo` — batch операция
- Default path (`USE_RPC_ALLOCATION = true`)

**Проблема**: Баг-фикс в RPC не отражается в client-side fallback и наоборот.

---

## 3. Найденные несоответствия

### 3.1 CRITICAL: Две реализации декомпозиции

- **TypeScript** `DecompositionEngine` — обрабатывает `portionMultiplier` на menu variants
- **SQL** `calc_prep_decomposition_factors` — своя PL/pgSQL рекурсия
- Изменение в одном НЕ отражается в другом
- **Риск**: Variance report показывает одни цифры, а списания делают другие

### 3.2 Разная точность округления

- `batchAllocationUtils.ts`: `toFixed(2)` — 2 знака
- `preparationService.ts`: 4 знака
- `DecompositionEngine.ts`: 2 знака после portion conversion
- **Риск**: Накопление ошибок округления при множественных аллокациях

### 3.3 last_known_cost — неоднозначность

- `UNIT_CONVERSION_SPEC.md` говорит: **IDR per base unit (gram)**
- `useCostCalculation.ts` planned mode fallback chain использует его как unitCost
- Исправлено в migration 172 (dual writer bug), но потребители могут путать per-gram vs per-portion
- **Риск**: Себестоимость может быть в N раз неправильной (N = portionSize)

### 3.4 WriteOffAdapter ставит costPerUnit = null для preparations

- By design — cost считается позже при FIFO deduction
- Но если write-off прервётся, CostAdapter уже записал actual_cost, а batch не списан
- **Риск**: Расхождение между recorded cost и actual inventory

### 3.5 total_value в batches — динамическое поле

- Пересчитывается как `current_quantity * cost_per_unit` после consumption
- `total_value / initial_quantity != cost_per_unit` после частичного потребления
- Код, который derive cost из `total_value / quantity`, даст неправильный результат

### 3.6 Нет автоматической рекосиляции negative batches

- Система разрешает negative batches (продажа без остатка)
- Cost для negative — через fallback chain
- Нет автоматического reconciliation при поступлении нового товара
- Ручные inventory counts — единственный способ коррекции

---

## 4. План рефакторинга

### Методология: Strangler Fig Pattern

**Принцип**: Не заменять — оборачивать. На каждом шаге система работает.

```
1. Создать новый код рядом со старым
2. Shadow mode: запускать оба, сравнивать, использовать старый
3. Feature flag: переключить на новый
4. Удалить старый код
```

### Фаза 1: Единый конвертер единиц (1-2 дня)

**Цель**: Одна функция конвертации, одна точность.

**Создать** `src/utils/units.ts`:

```typescript
export const PRECISION = 4

export function roundQty(value: number): number {
  return Math.round(value * 10 ** PRECISION) / 10 ** PRECISION
}

export function toBaseUnit(
  quantity: number,
  unit: string,
  portionSize?: number
): { quantity: number; unit: 'gram' | 'ml' | 'piece' } {
  const CONVERSION: Record<string, { factor: number; base: string }> = {
    gram: { factor: 1, base: 'gram' },
    g: { factor: 1, base: 'gram' },
    kg: { factor: 1000, base: 'gram' },
    ml: { factor: 1, base: 'ml' },
    liter: { factor: 1000, base: 'ml' },
    l: { factor: 1000, base: 'ml' },
    piece: { factor: 1, base: 'piece' },
    pcs: { factor: 1, base: 'piece' },
    portion: { factor: portionSize ?? 1, base: 'gram' }
  }
  const conv = CONVERSION[unit] ?? { factor: 1, base: unit }
  return {
    quantity: roundQty(quantity * conv.factor),
    unit: conv.base as 'gram' | 'ml' | 'piece'
  }
}
```

**Shadow-проверки**: Добавить в DecompositionEngine, useCostCalculation — запускать новую функцию параллельно, логировать расхождения.

**SQL-сторона**: Создать `to_base_unit(quantity, unit, portion_size)` PL/pgSQL функцию с идентичной таблицей.

**Файлы для рефакторинга**:

- `src/core/decomposition/utils/portionUtils.ts` — использовать `toBaseUnit`
- `src/composables/useMeasurementUnits.ts` — делегировать в `units.ts`
- `src/stores/recipes/composables/useCostCalculation.ts` — использовать `toBaseUnit`
- `src/core/decomposition/utils/batchAllocationUtils.ts` — заменить `toFixed(2)` на `roundQty`
- `src/stores/preparation/preparationService.ts` — использовать `roundQty`

### Фаза 2: Единый BatchService (2-3 дня)

**Цель**: Одна точка входа для всех FIFO-списаний.

**Создать** `src/services/BatchService.ts`:

```typescript
class BatchService {
  async deduct(params: {
    itemType: 'product' | 'preparation'
    itemId: string
    quantity: number // base units
    unit: 'gram' | 'ml' | 'piece'
    reason: 'order' | 'production' | 'manual_writeoff' | 'loss'
    sourceId: string
  }): Promise<BatchDeductionResult> {
    // 1. RPC-first (allocate_product_fifo / allocate_preparation_fifo)
    // 2. Client fallback с ИДЕНТИЧНОЙ логикой
    // 3. roundQty() для всех количеств
    // 4. Логирование в batch_operations
  }
}
```

**Strangler шаги**:

1. `BatchService.deduct()` внутри вызывает `storageService` / `preparationService` (обёртка)
2. Переключить все вызовы на `BatchService.deduct()`
3. Перенести FIFO логику внутрь `BatchService`
4. Удалить дублирование из `storageService` и `preparationService`

### Фаза 3: Decomposition Snapshots (2-3 дня)

**Цель**: Variance report читает факт, а не пересчитывает.

**Миграция**:

```sql
CREATE TABLE decomposition_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,        -- 'order_writeoff' | 'prep_production'
  source_id TEXT NOT NULL,          -- order_id or production_id
  menu_item_id TEXT,
  quantity NUMERIC(12,4),           -- сколько порций/штук
  items JSONB NOT NULL,             -- [{product_id, preparation_id, quantity, unit}]
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_decomp_snap_source ON decomposition_snapshots(source_type, source_id);
CREATE INDEX idx_decomp_snap_date ON decomposition_snapshots(created_at);
```

**Интеграция**:

- `WriteOffAdapter.transform()` — после декомпозиции сохраняет snapshot
- Variance report RPCs — читают из snapshots вместо собственной рекурсии

### Фаза 4: Variance Report на Snapshots (1-2 дня)

**Цель**: Переписать SQL RPCs variance report на чтение из `decomposition_snapshots`.

- `calc_product_theoretical_sales` -> читает snapshots
- `calc_prep_decomposition_factors` -> не нужна (данные уже декомпозированы)
- **Результат**: Один источник правды для "сколько должно было списаться"

---

## 5. Shadow Mode: Как валидировать

### Пример shadow-проверки для единиц

```typescript
// В DecompositionEngine, ВРЕМЕННО:
import { toBaseUnit } from '@/utils/units'

const oldResult = this.convertPortionToGrams(comp, prep)
const newResult = toBaseUnit(comp.quantity, comp.unit, prep.portionSize)

if (Math.abs(oldResult.quantity - newResult.quantity) > 0.0001) {
  DebugUtils.error('SHADOW_UNIT_MISMATCH', {
    component: comp.id,
    preparation: prep.id,
    old: oldResult,
    new: newResult
  })
}
// Возвращаем oldResult — поведение не меняется
```

### Пример shadow-проверки для BatchService

```typescript
// В WriteOffAdapter, ВРЕМЕННО:
const oldResult = await storageService.deductBatch(item)
const newResult = await batchService.deduct({ ...item, dryRun: true })

if (!deepEqual(oldResult, newResult)) {
  DebugUtils.error('SHADOW_BATCH_MISMATCH', { oldResult, newResult })
}
return oldResult // старый путь
```

### Feature flag для переключения

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_UNIFIED_UNITS: false, // Фаза 1
  USE_BATCH_SERVICE: false, // Фаза 2
  SAVE_DECOMP_SNAPSHOTS: false, // Фаза 3
  VARIANCE_FROM_SNAPSHOTS: false // Фаза 4
}
```

---

## 6. Ключевые файлы системы

### Декомпозиция

- `src/core/decomposition/DecompositionEngine.ts` — главный движок
- `src/core/decomposition/utils/portionUtils.ts` — portion -> gram
- `src/core/decomposition/utils/yieldUtils.ts` — yield adjustment
- `src/core/decomposition/adapters/CostAdapter.ts` — FIFO cost (read-only)
- `src/core/decomposition/adapters/WriteOffAdapter.ts` — write-off items

### FIFO

- `src/core/decomposition/utils/batchAllocationUtils.ts` — client-side FIFO
- `src/core/decomposition/services/FifoAllocationService.ts` — RPC wrapper
- `src/supabase/functions/allocate_product_fifo.sql` — server-side product FIFO
- `src/supabase/functions/allocate_preparation_fifo.sql` — server-side prep FIFO
- `src/supabase/functions/allocate_batch_fifo.sql` — batch FIFO

### Единицы измерения

- `src/composables/useMeasurementUnits.ts` — composable конвертации
- `src/core/decomposition/utils/portionUtils.ts` — portion conversion
- `src/stores/recipes/composables/useCostCalculation.ts` — cost with unit handling

### Списания

- `src/stores/storage/storageStore.ts` — storage batch deduction
- `src/stores/preparation/preparationService.ts` — preparation batch deduction

### Отчётность

- `src/stores/varianceReport/varianceReportStore.ts` — variance report store
- SQL RPCs: `calc_prep_decomposition_factors`, `calc_product_theoretical_sales`

### Инвентарь

- `src/stores/storage/composables/useInventory.ts` — inventory counts
- `src/stores/storage/composables/useWriteOff.ts` — manual write-offs

---

## 7. Контракты (зафиксировать)

### last_known_cost

- **Единица**: IDR per BASE UNIT (gram/ml/piece)
- **НЕ per portion**
- Записывается в: `recipesStore.ts:388-395`, `recipesStore.ts:737`, `preparationService.ts:1511`
- Migration 172 нормализовала все writer'ы

### Batch quantities

- **Единица**: Всегда base unit (gram/ml/piece)
- **Точность**: 4 decimal places (NUMERIC(12,4) в БД)
- `cost_per_unit`: IDR per base unit
- `total_value`: Динамическое = `current_quantity * cost_per_unit`

### DecomposedNode output

- **quantity**: В base units (gram/ml/piece) ПОСЛЕ portion conversion
- **unit**: 'gram' | 'ml' | 'piece'
- Conversion happens ONCE in DecompositionEngine, never downstream

---

## 8. Инструменты визуализации

```bash
# Граф зависимостей (SVG)
npx depcruise --include-only "^src/stores|^src/core|^src/services" \
  --output-type dot src/core/decomposition | dot -T svg > arch.svg

# Circular dependencies
npx madge --circular --extensions ts src/

# Mermaid диаграммы — рендерятся в GitHub/VSCode нативно
```

---

## 9. Чеклист перед началом каждой фазы

- [ ] Прочитать этот документ
- [ ] Убедиться что DEV database работает
- [ ] Запустить текущие тесты (если есть)
- [ ] Создать git branch `refactor/phase-N-description`
- [ ] Добавить shadow-проверки ПЕРЕД изменением логики
- [ ] Проверить shadow logs за 2-3 дня работы
- [ ] Переключить feature flag
- [ ] Проверить variance report с реальными данными
- [ ] Удалить shadow-проверки и старый код
