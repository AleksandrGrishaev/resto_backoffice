# Refactoring Plan: Decomposition & Cost Calculation

## Executive Summary

Текущая архитектура имеет **4 системы расчета себестоимости** с ~70% дублированием кода.
Этот документ описывает проблемы, причины их возникновения и план рефакторинга.

---

## 1. Текущие проблемы

### 1.1 Обнаруженный баг (2025-12-09)

**Проблема:** `updateNegativeBatch()` для products использовал старый cost из batch вместо нового из параметра.

**Причина:** При копировании логики из preparations в products, забыли добавить обновление cost.

**Исправление:** Теперь если `batch.cost_per_unit === 0`, используется новый cost из fallback.

### 1.2 Code Duplication

| Функциональность      | Количество реализаций |
| --------------------- | --------------------- |
| Recipe traversal      | 3                     |
| Replacement modifiers | 3                     |
| Portion conversion    | 3                     |
| Yield adjustment      | 2                     |
| Merge duplicates      | 3                     |

**Риск:** При исправлении бага нужно править 3-4 места.

---

## 2. Почему у нас 3 (на самом деле 4) сервиса?

### 2.1 Исторические причины

```
Sprint 1: useDecomposition (Write-Off)
         └── Нужно списывать ингредиенты с inventory
         └── Возвращает products + preparations как конечные item'ы

Sprint 2: useActualCostCalculation (FIFO Cost)
         └── Нужно рассчитать ACTUAL cost из batches (не recipe cost)
         └── Работает с FIFO allocation
         └── Не полностью использует useDecomposition (своя логика)

Kitchen: useKitchenDecomposition (KDS)
         └── Нужно показать ВСЕ ингредиенты на кухне
         └── Раскрывает preparations до products
         └── Нужны специфичные поля: source, role, path

Recipes: useCostCalculation (Planned vs Actual)
         └── Режим 'planned' использует supplier prices
         └── Режим 'actual' использует FIFO (дублирует useActualCostCalculation)
```

### 2.2 Ключевые различия между сервисами

| Аспект           | Kitchen                | WriteOff           | ActualCost          | RecipeCost    |
| ---------------- | ---------------------- | ------------------ | ------------------- | ------------- |
| **Entry point**  | PosBillItem            | menuItemId         | menuItemId          | Recipe/Prep   |
| **Preparations** | Раскрывает до products | Оставляет как есть | Оставляет как есть  | Раскрывает    |
| **Cost source**  | baseCostPerUnit        | baseCostPerUnit    | FIFO batches        | Planned/FIFO  |
| **Modifiers**    | Yes                    | Yes                | Yes                 | No            |
| **Output**       | KitchenDecomposedItem  | DecomposedItem     | ActualCostBreakdown | CostBreakdown |
| **Extra fields** | source, role, path     | type, path         | batchAllocations    | -             |

### 2.3 Почему нельзя просто объединить?

1. **Разные output types** - каждый потребитель ожидает специфичную структуру
2. **Разное поведение с preparations** - Kitchen раскрывает, остальные нет
3. **Разные источники cost** - FIFO vs Recipe vs Supplier prices
4. **Разные entry points** - PosBillItem vs menuItemId vs Recipe

---

## 3. Предлагаемая архитектура

### 3.1 Unified Core Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    DecompositionEngine                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               TraversalEngine                        │   │
│  │  - Recursive recipe/preparation traversal            │   │
│  │  - Replacement modifier handling                     │   │
│  │  - Yield percentage adjustment                       │   │
│  │  - Portion to grams conversion                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────┐       │
│  │                        │                        │       │
│  ▼                        ▼                        ▼       │
│ ProductNode         PreparationNode          RecipeNode    │
│ (leaf)              (can expand)             (always expand)│
└─────────────────────────────────────────────────────────────┘
                            │
                            │ produces
                            ▼
              UnifiedDecompositionResult {
                items: DecomposedNode[]
                metadata: TraversalMetadata
              }
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ KitchenAdapter  │ │ WriteOffAdapter │ │   CostAdapter   │
│ - expand preps  │ │ - keep preps    │ │ - FIFO alloc    │
│ - add source    │ │ - add type      │ │ - batch costs   │
│ - add role      │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
KitchenDecomposed   DecomposedItem[]   ActualCostBreakdown
     Item[]
```

### 3.2 Ключевые компоненты

#### TraversalEngine (Core)

```typescript
interface TraversalOptions {
  // Что делать с preparations?
  preparationHandling: 'expand' | 'keep' | 'both'

  // Применять yield?
  applyYield: boolean

  // Конвертировать порции в граммы?
  convertPortions: boolean

  // Replacement modifiers
  replacements?: Map<string, SelectedModifier>
}

interface DecomposedNode {
  type: 'product' | 'preparation'
  id: string
  name: string
  quantity: number
  unit: string
  path: string[]

  // Optional fields (filled by adapters)
  costPerUnit?: number
  totalCost?: number
  source?: 'base' | 'modifier'
  role?: string
  batchAllocations?: BatchAllocation[]
}
```

#### Adapters (Specific Logic)

```typescript
interface IDecompositionAdapter<T> {
  // Transform core result to specific output
  transform(nodes: DecomposedNode[]): T

  // Get traversal options for this use case
  getTraversalOptions(): TraversalOptions

  // Post-process (e.g., FIFO allocation)
  postProcess?(nodes: DecomposedNode[]): Promise<DecomposedNode[]>
}
```

---

## 4. План миграции

### Phase 1: Подготовка (1-2 дня)

1. **Создать core types**

   - `src/core/decomposition/types.ts`
   - UnifiedDecompositionResult, DecomposedNode, TraversalOptions

2. **Создать TraversalEngine**
   - `src/core/decomposition/TraversalEngine.ts`
   - Копируем ОДНУ версию логики (useDecomposition как основа)
   - Добавляем options для разного поведения

### Phase 2: Адаптеры (2-3 дня)

1. **WriteOffAdapter**

   - Оставляем preparations как есть
   - Возвращает DecomposedItem[]
   - Самый простой адаптер

2. **KitchenAdapter**

   - Раскрывает preparations до products
   - Добавляет source, role, path
   - Возвращает KitchenDecomposedItem[]

3. **CostAdapter**
   - Оставляет preparations как есть
   - Добавляет FIFO allocation
   - Возвращает ActualCostBreakdown

### Phase 3: Миграция существующих сервисов (2-3 дня)

1. **useDecomposition** → использует WriteOffAdapter
2. **useKitchenDecomposition** → использует KitchenAdapter
3. **useActualCostCalculation** → использует CostAdapter
4. **useCostCalculation** → использует CostAdapter + PlannedCostAdapter

### Phase 4: Cleanup (1 день)

1. Удалить дублированный код
2. Обновить документацию
3. Добавить тесты для TraversalEngine

---

## 5. Риски и mitigation

### 5.1 Регрессии

**Риск:** При рефакторинге можно сломать существующую логику.

**Mitigation:**

- Создать snapshot тесты до рефакторинга
- Сравнивать output старых и новых сервисов
- Постепенная миграция (один сервис за раз)

### 5.2 Сложность TraversalEngine

**Риск:** Слишком много options делает код сложным.

**Mitigation:**

- Начать с минимального набора options
- Добавлять по мере необходимости
- Четкая документация каждой опции

### 5.3 Performance

**Риск:** Дополнительный слой абстракции может замедлить.

**Mitigation:**

- Benchmarks до и после
- Кэширование traversal результатов
- Lazy evaluation где возможно

---

## 6. Альтернативные подходы

### 6.1 Оставить как есть

**Pros:**

- Нет риска регрессий
- Нет затрат времени

**Cons:**

- Продолжает накапливаться technical debt
- Баги нужно править в 3-4 местах
- Сложно добавлять новые features

### 6.2 Частичное объединение

Объединить только useDecomposition и useActualCostCalculation:

**Pros:**

- Меньший scope
- Быстрее реализовать

**Cons:**

- Kitchen остается отдельным
- Половинчатое решение

### 6.3 Полное переписывание

**Pros:**

- Чистая архитектура с нуля

**Cons:**

- Высокий риск
- Много времени
- Нужно переписать все потребители

---

## 7. Рекомендация

**Выбор:** Plan 4 - Unified Core Layer с адаптерами

**Причины:**

1. Минимизирует дублирование (70% → 0%)
2. Сохраняет существующие API (обратная совместимость)
3. Позволяет постепенную миграцию
4. Легко тестировать core логику

**Приоритет:** После стабилизации текущих багов

---

## 8. Appendix: Дублированный код

### Replacement Modifiers (3 места)

```typescript
// useDecomposition.ts:87-106
// useKitchenDecomposition.ts:93-112
// useActualCostCalculation.ts:89-106

function getReplacementKey(target: TargetComponent): string {
  if (target.sourceType === 'recipe' && target.recipeId) {
    return `${target.recipeId}_${target.componentId}`
  }
  return `variant_${target.componentId}`
}

const replacements = new Map<string, SelectedModifier>()
for (const modifier of selectedModifiers) {
  if (modifier.groupType === 'replacement' && !modifier.isDefault) {
    const key = getReplacementKey(modifier.targetComponent)
    replacements.set(key, modifier)
  }
}
```

### Recipe Decomposition (3 места)

```typescript
// useDecomposition.ts:220-280
// useKitchenDecomposition.ts:195-260
// useActualCostCalculation.ts:250-343

for (const recipeComp of recipe.components) {
  const replacementKey = `${recipe.id}_${recipeComp.id}`
  const replacement = replacements?.get(replacementKey)

  if (replacement && replacement.composition) {
    // Use replacement composition
  } else {
    // Use original component
  }
}
```

---

## Version History

| Date       | Change                   |
| ---------- | ------------------------ |
| 2025-12-09 | Initial refactoring plan |
