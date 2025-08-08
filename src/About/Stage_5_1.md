# ТЗ: Улучшение системы управления складом

## Цель

Упростить процессы управления складом, улучшить работу с полуфабрикатами и сделать систему более понятной для ежедневного использования.

## Проблемы текущей системы

1. **Слишком много способов корректировки остатков** (Multi Consumption, Receipt/Correction, Inventory)
2. **Отсутствует удобное создание полуфабрикатов**
3. **Нет отображения сроков годности в таблице**
4. **Нет управления минимальными остатками полуфабрикатов**
5. **Перегруженный Storage Store**

## Предлагаемые изменения

### 1. Упрощение операций в Storage

#### Убираем

- Multi Consumption (переносим в Menu для списания готовых блюд)
- Receipt/Correction (заменяем на существующий Inventory)

#### Оставляем

- **Inventory** - единственный способ корректировки остатков
- **Production** - новый процесс создания полуфабрикатов

### 2. Новая архитектура операций

```
Storage Operations:
├── Inventory (существующий модуль)
│   ├── Inventory Count (подсчет остатков)
│   └── Inventory Corrections (автоматические корректировки)
│
└── Production
    ├── Create preparations (производство полуфабрикатов)
    └── Track ingredient consumption
```

### 3. Модуль управления полуфабрикатами

#### В RecipesView добавляем

- **Preparation Planning** - планирование минимальных остатков
- **Production Schedule** - расписание производства

#### В StorageView добавляем

- **Production Dialog** - создание полуфабрикатов из рецептов
- **Expiry tracking** - отслеживание сроков годности

## Детальное ТЗ

### 1. Обновление StorageView

#### 1.1 Новая таблица с колонкой срока годности

```vue
// StorageStockTable.vue - добавить колонку { title: 'Stock', key: 'stock' }, { title: 'Expires', //
НОВАЯ КОЛОНКА key: 'expiry', sortable: true }, { title: 'Avg Cost', key: 'cost' }
```

**Логика отображения срока годности:**

- Для продуктов: ближайший срок по FIFO
- Для полуфабрикатов: срок самой старой партии
- Цветовая индикация:
  - 🔴 Просрочено
  - 🟡 Истекает в течение 2 дней
  - 🟢 Более 2 дней

#### 1.2 Упрощенные действия

```vue
// Убираем кнопки: - "Multi Consumption" - "Receipt/Correction" // Добавляем кнопки: + "Production"
(создание полуфабрикатов) // Оставляем существующую кнопку: = "Start Inventory" (существующий модуль
инвентаризации)
```

### 2. Новый Production Dialog

#### 2.1 Функциональность

- Выбор рецепта полуфабриката
- Автоматический расчет ингредиентов
- Указание количества порций
- FIFO списание ингредиентов
- Создание новой партии полуфабриката

#### 2.2 Интерфейс

```vue
<ProductionDialog>
  <RecipeSelector /> <!-- Выбор рецепта -->
  <BatchCalculator /> <!-- Расчет порций -->
  <IngredientPreview /> <!-- Предпросмотр списания -->
  <ExpiryDatePicker /> <!-- Срок годности готового продукта -->
</ProductionDialog>
```

### 3. Composable для разгрузки Store

#### 3.1 useStorageOperations

```typescript
// composables/useStorageOperations.ts
export function useStorageOperations() {
  return {
    // FIFO calculations
    calculateFifoAllocation,
    calculateConsumptionCost,

    // Inventory operations (existing module)
    processInventoryCount,
    processInventoryCorrections,

    // Production operations
    createProduction,
    calculateIngredientConsumption,

    // Expiry tracking
    getExpiringItems,
    checkExpiryStatus,

    // Batch management
    updateBatchQuantities,
    createNewBatch
  }
}
```

#### 3.2 usePreparationProduction

```typescript
// composables/usePreparationProduction.ts
export function usePreparationProduction() {
  return {
    // Recipe-based production
    getAvailableRecipes,
    calculateRequiredIngredients,
    validateIngredientAvailability,

    // Batch production
    createProductionBatch,
    updateIngredientStock,
    createPreparationBatch,

    // Planning
    getProductionSuggestions,
    checkMinimumStock,
    calculateOptimalBatchSize
  }
}
```

### 4. Обновление RecipesView

#### 4.1 Добавить вкладку "Production Planning"

```vue
<v-tabs>
  <v-tab>Recipes</v-tab>
  <v-tab>Preparations</v-tab>
  <v-tab>Production Planning</v-tab> <!-- НОВАЯ -->
</v-tabs>
```

#### 4.2 Production Planning функции

- Настройка минимальных остатков для полуфабрикатов
- Планирование производства на день/неделю
- Отчеты по потребности в ингредиентах
- Быстрые действия для производства

### 5. Обновление типов данных

#### 5.1 Новые типы операций

```typescript
export type OperationType =
  | 'inventory' // Существующий тип инвентаризации
  | 'production' // Новый тип
  | 'correction' // Остается для инвентаризации

export interface ProductionOperation {
  recipeId: string
  preparationId: string
  batchCount: number
  ingredientConsumption: IngredientConsumption[]
  outputBatch: StorageBatch
}
```

#### 5.2 Срок годности в балансах

```typescript
export interface StorageBalance {
  // ... существующие поля

  // Добавляем срок годности
  nearestExpiry?: string // Ближайший срок годности
  expiryStatus: 'fresh' | 'expiring' | 'expired'
  expiryDaysRemaining?: number

  // Для полуфабрикатов
  isPreparation?: boolean
  defaultShelfLife?: number // Стандартный срок хранения
}
```

### 6. Миграционный план

#### Фаза 1: Подготовка (1-2 дня)

1. Создать composables
2. Обновить типы данных
3. Добавить колонку срока годности

#### Фаза 2: Production система (2-3 дня)

1. Создать ProductionDialog
2. Интегрировать с рецептами
3. Реализовать логику FIFO для производства

#### Фаза 3: Упрощение операций (1 день)

1. Убрать Multi Consumption из Storage
2. Убрать Receipt/Correction из Storage
3. Обновить UI (сохранить существующий модуль Inventory)

#### Фаза 4: Planning в Recipes (2-3 дня)

1. Добавить Production Planning вкладку
2. Реализовать настройки минимальных остатков
3. Создать отчеты и планирование

### 7. Примеры использования

#### 7.1 Ежедневное производство

```
Утром повар:
1. Открывает Storage → видит полуфабрикаты с низким остатком
2. Нажимает "Production"
3. Выбирает нужные рецепты
4. Система показывает требуемые ингредиенты
5. Подтверждает производство
6. Система автоматически списывает ингредиенты и создает новые партии
```

#### 7.2 Инвентаризация (существующий модуль)

```
При необходимости корректировки остатков:
1. Выбирает "Start Inventory"
2. Указывает фактические остатки
3. Система автоматически создает корректировки (+/-)
4. Все изменения отражаются в операциях инвентаризации
```

#### 7.3 Планирование производства

```
В Recipes → Production Planning:
1. Видит план на неделю
2. Настраивает минимальные остатки
3. Видит рекомендации по производству
4. Может быстро создать production задачи
```

## Технические детали

### Структура файлов

```
src/
├── composables/
│   ├── useStorageOperations.ts
│   ├── usePreparationProduction.ts
│   └── useExpiryTracking.ts
│
├── views/storage/
│   ├── components/
│   │   ├── ProductionDialog.vue (новый)
│   │   └── ExpiryStatusColumn.vue (новый)
│   └── StorageView.vue (обновленный)
│
└── views/recipes/
    ├── components/
    │   ├── ProductionPlanningTab.vue (новый)
    │   └── MinStockSettings.vue (новый)
    └── RecipesView.vue (обновленный)
```

### API изменения

```typescript
// Новые методы в storageService
- createProduction(data: ProductionData): Promise<ProductionOperation>

// Удаляемые методы
- createConsumption() // Переносится в menu
- createReceipt() // Убираем, заменяется на inventory

// Существующие методы остаются без изменений
+ startInventory() // Существующий
+ updateInventory() // Существующий
+ finalizeInventory() // Существующий
```

## Ожидаемые результаты

1. **Максимальное упрощение**: Только 2 процесса - Inventory (корректировка остатков) + Production (производство полуфабрикатов)
2. **Удобство**: Легкое создание полуфабрикатов из рецептов
3. **Контроль**: Видимость сроков годности в таблице
4. **Производительность**: Разгруженный store через composables
5. **Понятность**: Четкое разделение ответственности модулей
6. **Сохранение работающего**: Существующий модуль инвентаризации остается без изменений
