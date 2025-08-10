# ТЗ: Recipe ↔ Product Store Integration (Phase 1)

## 🎯 Основная цель

Интегрировать Recipe Store с Product Store для автоматического расчета себестоимости и отслеживания использования продуктов.

## 📋 Scope (что делаем)

### 1.1 PreparationStore Integration

**Цель**: Связать полуфабрикаты с продуктами для автоматического расчета себестоимости

#### Что уже есть ✅

- Структура `Preparation` с `recipe: PreparationIngredient[]`
- `PreparationIngredient` содержит `id` продукта и `quantity`
- MockDataCoordinator генерирует 4 полуфабриката
- PreparationService с базовым CRUD

#### Что нужно доделать 🔧

**A) Расчет себестоимости полуфабрикатов**

⚠️ **Важно**: Расчеты делаем на основе **планируемых цен** (`Product.costPerUnit`), не FIFO!

```typescript
// В PreparationService добавить
async calculatePlanCost(preparationId: string): Promise<PreparationPlanCost> {
  const prep = await this.getById(preparationId)
  let totalCost = 0

  for (const ingredient of prep.recipe) {
    const product = await productsStore.getProductById(ingredient.id)
    // ИСПОЛЬЗУЕМ ПЛАНИРУЕМУЮ ЦЕНУ для отображения в UI
    const ingredientCost = (product.costPerUnit * ingredient.quantity) / 1000
    totalCost += ingredientCost
  }

  return {
    preparationId,
    type: 'plan', // планируемая стоимость
    totalCost,
    costPerOutputUnit: totalCost / prep.outputQuantity,
    componentCosts: [...],
    calculatedAt: new Date(),
    note: 'Based on current supplier prices'
  }
}

// Фактическая стоимость - будет в Finance Store (Phase 3)
async calculateActualCost(preparationId: string, storageContext: StorageContext): Promise<PreparationActualCost> {
  // TODO Phase 3: FIFO расчет по складским остаткам
  // Используется только при фактическом производстве полуфабриката
}
```

**B) Автоматическое обновление usage в ProductStore**

```typescript
// При создании/обновлении preparation
updateProductUsage(preparationId: string) {
  // Найти все продукты в рецепте
  // Обновить ProductUsage.usedInPreparations
}
```

**C) Расширить MockDataCoordinator**

- Добавить 4-6 новых полуфабрикатов (соусы, гарниры, маринады)
- Убедиться что используют продукты из CORE_PRODUCTS

### 1.2 RecipesStore Integration

**Цель**: Связать рецепты с продуктами И полуфабрикатами

#### Что уже есть ✅

- Структура `Recipe` с `components: RecipeComponent[]`
- `RecipeComponent` может быть `product` или `preparation`
- RecipeService с базовым расчетом cost
- MockDataCoordinator генерирует 3 рецепта

#### Что нужно доделать 🔧

**A) Улучшить расчет себестоимости рецептов**

⚠️ **Важно**: Расчеты делаем на основе **планируемых цен**, не FIFO!

```typescript
// В RecipeService улучшить calculatePlanCost
async calculatePlanCost(recipeId: string): Promise<RecipePlanCost> {
  const recipe = await this.getById(recipeId)
  let totalCost = 0

  for (const component of recipe.components) {
    if (component.componentType === 'product') {
      const product = await productsStore.getProductById(component.componentId)
      // ПЛАНИРУЕМАЯ ЦЕНА для UI
      const cost = (product.costPerUnit * component.quantity) / 1000
      totalCost += cost
    } else if (component.componentType === 'preparation') {
      const prepPlanCost = await preparationService.calculatePlanCost(component.componentId)
      const proportionalCost = (prepPlanCost.costPerOutputUnit * component.quantity)
      totalCost += proportionalCost
    }
  }

  return {
    recipeId,
    type: 'plan', // планируемая стоимость
    totalCost,
    costPerPortion: totalCost / recipe.portionSize,
    componentCosts: [...],
    calculatedAt: new Date(),
    note: 'Based on current supplier prices + plan preparation costs'
  }
}

// Фактическая стоимость - будет в Cashier Store (Phase 2)
async calculateActualCost(recipeId: string, saleContext: SaleContext): Promise<RecipeActualCost> {
  // TODO Phase 2: FIFO расчет при продаже блюда
  // Списываем ингредиенты по FIFO из Storage
  // Используется только при фактической продаже
}
```

**B) Автоматическое обновление usage в ProductStore**

```typescript
// При создании/обновлении recipe
updateProductUsage(recipeId: string) {
  // Найти все продукты напрямую + через полуфабрикаты
  // Обновить ProductUsage.usedInRecipes
}
```

**C) Расширить MockDataCoordinator**

- Добавить 5-7 новых рецептов
- Использовать комбинации продуктов + полуфабрикатов
- Разные категории: основные блюда, гарниры, десерты

## 💡 **Концепция стоимости**

### 📋 **Планируемая стоимость** (Phase 1)

- **Источник**: `Product.costPerUnit` - текущие цены поставщиков
- **Назначение**: Планирование меню, ценообразование, аналитика
- **Отображение**: Везде в UI Recipe Store
- **Обновление**: При изменении цен поставщиков

### 💰 **Фактическая стоимость** (Phase 2-3)

- **Источник**: FIFO из Storage Store - реальные партии товаров
- **Назначение**: Финансовая отчетность, реальная прибыль
- **Использование**: При фактической продаже/производстве
- **Расчет**: В момент списания со склада

### 🎯 **Примеры использования**

**В Recipe Store UI:**

```
Стейк с картофелем фри
Планируемая себестоимость: $8.50 за порцию
├── Говядина 250г: $6.00 (текущая цена поставщика)
├── Картофель фри (полуфабрикат): $1.20
└── Специи: $0.30
```

**При продаже в Cashier (Phase 2):**

```
Продажа: Стейк с картофелем фри
Фактическая себестоимость: $7.80 за порцию
├── Говядина 250г: $5.40 (FIFO: партия от 15.08.2025)
├── Картофель фри: $1.10 (FIFO: произведен 12.08.2025)
└── Специи: $0.30 (FIFO: партия от 10.08.2025)
Прибыль: $12.20 - $7.80 = $4.40
```

### ProductStore → RecipeStore

```typescript
// В ProductStore добавить методы
getProductsForRecipes(): ProductForRecipe[]
notifyPriceChange(productId: string, newPrice: number): void
```

### RecipeStore → ProductStore

```typescript
// В RecipeStore добавить методы
notifyUsageChange(productId: string, usageData: UsageData): void
getProductUsageData(): ProductUsage[]
```

### Автоматические пересчеты

- При изменении цены продукта → пересчитать все связанные полуфабрикаты и рецепты
- При изменении рецепта полуфабриката → пересчитать все рецепты, использующие этот полуфабрикат
- При изменении состава рецепта → обновить usage tracking

## 📊 Новые типы данных

```typescript
// Добавить в recipes/types.ts
export interface PreparationCost {
  preparationId: string
  totalCost: number
  costPerOutputUnit: number
  componentCosts: ComponentCost[]
  calculatedAt: Date
}

export interface RecipeCost extends CostCalculation {
  // уже есть, но улучшить
}

export interface ComponentCost {
  componentId: string
  componentType: 'product' | 'preparation'
  componentName: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  percentage: number
}

// Добавить в productsStore/types.ts
export interface ProductForRecipe {
  id: string
  name: string
  nameEn: string
  costPerUnit: number
  unit: MeasurementUnit
  category: ProductCategory
  isActive: boolean
}
```

## 🧪 MockDataCoordinator updates

```typescript
// В mockDataCoordinator.ts добавить
generateRecipeStoreData() {
  return {
    preparations: this.generateEnhancedPreparations(), // 8-10 штук
    recipes: this.generateEnhancedRecipes(),           // 8-12 штук
    preparationCosts: this.generateMockCosts(),
    recipeCosts: this.generateMockCosts()
  }
}

generateEnhancedPreparations() {
  // Томатный соус, чесночный соус, пюре, фри (уже есть)
  // + Маринад для мяса, микс специй, карамельный соус,
  //   салатная заправка, панировочная смесь
}

generateEnhancedRecipes() {
  // Стейк, фри, пюре (уже есть)
  // + Стейк с соусом, комбо-блюда, салаты,
  //   десерты, напитки с полуфабрикатами
}
```

## 🎛️ UI обновления (минимальные)

### В UnifiedRecipeDialog.vue

- При выборе компонента показывать текущую цену
- Показывать расчетную стоимость в реальном времени

### В UnifiedViewDialog.vue

- Детальная разбивка себестоимости по компонентам
- Кнопка "Пересчитать стоимость"

### В RecipesView.vue

- Фильтр по стоимости (дешевые/дорогие)
- Сортировка по себестоимости

## 🔍 Критерии готовности

1. **Расчет себестоимости полуфабрикатов** - работает для всех полуфабрикатов из mock
2. **Расчет себестоимости рецептов** - учитывает продукты + полуфабрикаты
3. **Usage tracking** - ProductStore знает где используется каждый продукт
4. **Автопересчет** - изменение цены продукта обновляет все зависимые рецепты
5. **UI отображение** - все калькуляции видны в интерфейсе
6. **Mock данные** - достаточно примеров для тестирования (8+ полуфабрикатов, 8+ рецептов)

## 🚫 Что НЕ делаем сейчас

- Интеграцию с Menu Store (Phase 2)
- Интеграцию с Storage Store (Phase 2)
- Интеграцию с Supplier Store (Phase 2)
- Сложную аналитику потребления (Phase 3)
- Исторические данные цен (Phase 3)
- Сезонные коэффициенты (Phase 3)

## 📅 Оценка времени

- **1.1 PreparationStore Integration**: 2-3 дня
- **1.2 RecipesStore Integration**: 2-3 дня
- **Тестирование и отладка**: 1-2 дня
- **Итого**: 5-8 дней

## 🧪 План тестирования

1. Создать полуфабрикат → проверить расчет стоимости
2. Создать рецепт с продуктами → проверить расчет
3. Создать рецепт с полуфабрикатами → проверить расчет
4. Изменить цену продукта → проверить автопересчет
5. Изменить рецепт полуфабриката → проверить каскадный пересчет
