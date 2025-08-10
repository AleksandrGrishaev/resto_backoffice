# ТЗ 1: Координация Mock Data для всех Store

## Цель

Создать единую систему генерации связанных mock данных для всех store, обеспечивающую консистентность данных и возможность реальных расчетов без hardcode.

## Проблемы текущего подхода

### Несвязанные данные

- Каждый store имеет свои mock данные
- Одинаковые продукты имеют разные цены в разных store
- Нет истории изменения цен
- Потребление продуктов не связано с рецептами
- Невозможно рассчитать реальные тренды и метрики

### Сложность поддержки

- Для добавления нового продукта нужно обновить 4+ файла
- Легко нарушить консистентность данных
- Сложно тестировать различные сценарии

## Решение: Shared Mock Data Coordinator

### Архитектура

```
src/stores/shared/
├── mockDataCoordinator.ts     # Центральный координатор
├── productDefinitions.ts      # Определения существующих 18 продуктов
├── types.ts                   # Общие типы для координации
├── index.ts                   # Экспорты
└── mock/                      # 🆕 Генераторы по Store
    ├── generateProductsData.ts     # Products Store data
    ├── generateSupplierData.ts     # Supplier Store data
    ├── generateStorageData.ts      # Storage Store data
    ├── generateRecipeData.ts       # Recipe Store data
    └── utils.ts                    # Общие утилиты генерации
```

### Принципы координации

1. **Использование существующих продуктов** - работаем с уже определенными 18 продуктами
2. **Реалистичная генерация** - цены и потребление основаны на алгоритмах
3. **Временная консистентность** - данные за последние 3 месяца
4. **Связность данных** - все store используют одни и те же продукты
5. **Модульность генераторов** - отдельный файл для каждого Store

## Техническое задание

### 1. Создать Product Definitions

**Файл:** `src/stores/shared/productDefinitions.ts`

```typescript
export interface CoreProductDefinition {
  // Basic info
  id: string
  name: string
  nameEn: string
  category: ProductCategory
  unit: MeasurementUnit

  // Price characteristics
  basePrice: number // Starting price 3 months ago
  priceVolatility: number // Price change volatility (0.05 = ±5%)
  seasonalityFactor: number // Seasonal price multiplier

  // Consumption characteristics
  dailyConsumption: number // Average daily usage
  consumptionVolatility: number // Usage variation (0.3 = ±30%)

  // Business logic
  canBeSold: boolean // Can be sold directly
  yieldPercentage: number // Processing yield
  shelfLifeDays: number // Shelf life

  // Supply chain
  leadTimeDays: number // Delivery lead time
  primarySupplierId: string // Main supplier
}

export const CORE_PRODUCTS: CoreProductDefinition[] = [
  // Raw materials (canBeSold: false)
  {
    id: 'prod-beef-steak',
    name: 'Beef Steak',
    nameEn: 'Beef Steak',
    category: 'meat',
    unit: 'kg',
    basePrice: 180000,
    priceVolatility: 0.1, // ±10% (meat prices volatile)
    seasonalityFactor: 1.0,
    dailyConsumption: 2.5, // 2.5kg/day average
    consumptionVolatility: 0.3, // ±30% daily variation
    canBeSold: false,
    yieldPercentage: 95,
    shelfLifeDays: 5,
    leadTimeDays: 3,
    primarySupplierId: 'sup-premium-meat-co'
  },
  {
    id: 'prod-potato',
    name: 'Potato',
    nameEn: 'Potato',
    category: 'vegetables',
    unit: 'kg',
    basePrice: 8000,
    priceVolatility: 0.03, // ±3% (stable vegetable)
    seasonalityFactor: 1.0,
    dailyConsumption: 4.0, // 4kg/day for fries + mashed
    consumptionVolatility: 0.2, // ±20% (more predictable)
    canBeSold: false,
    yieldPercentage: 85, // 15% waste from peeling
    shelfLifeDays: 14,
    leadTimeDays: 2,
    primarySupplierId: 'sup-fresh-veg-market'
  },
  // ... (13 more products)

  // Direct sale items (canBeSold: true)
  {
    id: 'prod-beer-bintang-330',
    name: 'Bintang Beer 330ml',
    nameEn: 'Bintang Beer 330ml',
    category: 'beverages',
    unit: 'piece',
    basePrice: 12000,
    priceVolatility: 0.05, // ±5% (supplier price changes)
    seasonalityFactor: 1.0,
    dailyConsumption: 20, // 20 pieces/day average
    consumptionVolatility: 0.4, // ±40% (weekend spikes)
    canBeSold: true,
    yieldPercentage: 100,
    shelfLifeDays: 180,
    leadTimeDays: 5,
    primarySupplierId: 'sup-beverage-distribution'
  }
]
```

### 2. Создать модульные генераторы данных

#### 2.1 Products Store Data Generator

**Файл:** `src/stores/shared/mock/generateProductsData.ts`

```typescript
import { CORE_PRODUCTS } from '../productDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'

export function generateProductsStoreData() {
  return {
    products: generateEnhancedProducts(),
    priceHistory: generatePriceHistory()
  }
}

export function generatePriceHistory(months: number = 3): ProductPriceHistory[] {
  const history: ProductPriceHistory[] = []
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  CORE_PRODUCTS.forEach(product => {
    let currentPrice = product.basePrice

    // Generate weekly price points over 3 months
    for (let i = 0; i < months * 4; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * 7)

      // Apply price volatility and seasonality
      const volatilityChange = (Math.random() - 0.5) * 2 * product.priceVolatility
      const seasonalChange = product.seasonalityFactor - 1.0

      currentPrice *= 1 + volatilityChange + seasonalChange
      currentPrice = Math.round(currentPrice)

      history.push({
        id: `price-${product.id}-${i}`,
        productId: product.id,
        pricePerUnit: currentPrice,
        effectiveDate: date.toISOString(),
        sourceType: i === 0 ? 'manual_update' : 'receipt',
        sourceId: `receipt-${product.id}-${i}`,
        supplierId: product.primarySupplierId,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      })
    }
  })

  return history.sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )
}

function generateEnhancedProducts(): Product[] {
  const priceHistory = generatePriceHistory()
  const currentPrices = getCurrentPricesFromHistory(priceHistory)

  return CORE_PRODUCTS.map(productDef => ({
    id: productDef.id,
    name: productDef.name,
    nameEn: productDef.nameEn, // 🆕 English support
    category: productDef.category,
    unit: productDef.unit,
    currentCostPerUnit: currentPrices[productDef.id], // 🆕 Real current price
    yieldPercentage: productDef.yieldPercentage,
    canBeSold: productDef.canBeSold, // 🆕 Enhanced flag
    storageConditions: getStorageConditions(productDef.category),
    shelfLifeDays: productDef.shelfLifeDays,
    minStock: calculateMinStock(productDef), // 🆕 Will be calculated
    maxStock: calculateMaxStock(productDef), // 🆕 Will be calculated
    primarySupplierId: productDef.primarySupplierId,
    leadTimeDays: productDef.leadTimeDays,
    isActive: true,
    tags: generateTags(productDef),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }))
}
```

#### 2.2 Supplier Store Data Generator

**Файл:** `src/stores/shared/mock/generateSupplierData.ts`

```typescript
import { CORE_PRODUCTS } from '../productDefinitions'
import { generatePriceHistory } from './generateProductsData'
import type { PurchaseOrder, Receipt } from '@/stores/supplier_2/types'

export function generateSupplierStoreData() {
  return {
    orders: generateSupplierOrders(),
    receipts: generateSupplierReceipts()
  }
}

export function generateSupplierOrders(months: number = 3): PurchaseOrder[] {
  const orders: PurchaseOrder[] = []
  const priceHistory = generatePriceHistory(months)

  // Group price history by month to create realistic orders
  const monthlyPrices = groupPriceHistoryByMonth(priceHistory)

  monthlyPrices.forEach((monthData, index) => {
    const orderDate = new Date()
    orderDate.setMonth(orderDate.getMonth() - (months - index - 1))

    const order: PurchaseOrder = {
      id: `po-${String(index + 1).padStart(3, '0')}`,
      orderNumber: `PO-${String(index + 1).padStart(3, '0')}`,
      supplierId: determineSupplier(monthData), // Smart supplier selection
      supplierName: getSupplierName(monthData),
      orderDate: orderDate.toISOString(),
      expectedDeliveryDate: new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      items: monthData.map(priceRecord => ({
        id: `po-item-${priceRecord.productId}-${index}`,
        itemId: priceRecord.productId,
        itemName: getProductName(priceRecord.productId),
        orderedQuantity: calculateRealisticOrderQuantity(priceRecord.productId),
        unit: getProductUnit(priceRecord.productId),
        pricePerUnit: priceRecord.pricePerUnit,
        totalPrice:
          priceRecord.pricePerUnit * calculateRealisticOrderQuantity(priceRecord.productId),
        isEstimatedPrice: false,
        status: 'ordered'
      })),
      totalAmount: 0, // Will be calculated
      isEstimatedTotal: false,
      status: index === months - 1 ? 'sent' : 'delivered',
      paymentStatus: index === months - 1 ? 'pending' : 'paid',
      requestIds: [],
      createdAt: orderDate.toISOString(),
      updatedAt: orderDate.toISOString()
    }

    order.totalAmount = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
    orders.push(order)
  })

  return orders
}

function calculateRealisticOrderQuantity(productId: string): number {
  const product = CORE_PRODUCTS.find(p => p.id === productId)
  if (!product) return 10

  // Order 7-14 days worth based on daily consumption
  const daysToOrder = 7 + Math.random() * 7
  return Math.round(product.dailyConsumption * daysToOrder * 100) / 100
}
```

#### 2.3 Storage Store Data Generator

**Файл:** `src/stores/shared/mock/generateStorageData.ts`

```typescript
import { CORE_PRODUCTS } from '../productDefinitions'
import type { StorageOperation, StorageBatch } from '@/stores/storage/types'

export function generateStorageStoreData() {
  return {
    operations: generateConsumptionOperations(),
    batches: generateCurrentBatches()
  }
}

export function generateConsumptionOperations(days: number = 30): StorageOperation[] {
  const operations: StorageOperation[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  CORE_PRODUCTS.forEach(product => {
    // Generate realistic daily consumption for each product
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      // Apply consumption volatility (weekend vs weekday patterns)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const weekendMultiplier = product.canBeSold ? 1.3 : 0.8 // More beverages on weekend, less cooking

      const variation = (Math.random() - 0.5) * 2 * product.consumptionVolatility
      let dailyAmount = product.dailyConsumption * (1 + variation)

      if (isWeekend) {
        dailyAmount *= weekendMultiplier
      }

      if (dailyAmount > 0) {
        operations.push({
          id: `op-${product.id}-${i}`,
          operationType: 'correction',
          documentNumber: `COR-${product.id.split('-')[1].toUpperCase()}-${i}`,
          operationDate: date.toISOString(),
          department: product.canBeSold ? 'bar' : 'kitchen',
          responsiblePerson: product.canBeSold ? 'Bartender John' : 'Chef Maria',
          items: [
            {
              id: `item-${product.id}-${i}`,
              itemId: product.id,
              itemType: 'product',
              itemName: product.name,
              quantity: Math.round(dailyAmount * 100) / 100,
              unit: product.unit,
              totalCost: Math.round(dailyAmount * getCurrentPrice(product.id))
            }
          ],
          totalValue: Math.round(dailyAmount * getCurrentPrice(product.id)),
          correctionDetails: {
            reason: product.canBeSold ? 'other' : 'recipe_usage',
            relatedId: getRelatedRecipe(product.id),
            relatedName: `${product.canBeSold ? 'Direct sale' : 'Recipe usage'}: ${product.name}`
          },
          status: 'confirmed',
          createdAt: date.toISOString(),
          updatedAt: date.toISOString()
        })
      }
    }
  })

  return operations.sort(
    (a, b) => new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
  )
}

export function generateCurrentBatches(): StorageBatch[] {
  // Generate realistic current stock levels based on recent orders and consumption
  const batches: StorageBatch[] = []

  CORE_PRODUCTS.forEach(product => {
    const currentStock = generateRealisticStockLevel(product)
    const batch: StorageBatch = {
      id: `batch-${product.id}-current`,
      batchNumber: `B-${product.id.split('-')[1].toUpperCase()}-001-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      itemId: product.id,
      itemType: 'product',
      department: product.canBeSold ? 'bar' : 'kitchen',
      initialQuantity: currentStock * 1.2, // Was higher initially
      currentQuantity: currentStock,
      unit: product.unit,
      costPerUnit: getCurrentPrice(product.id),
      totalValue: currentStock * getCurrentPrice(product.id),
      receiptDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiryDate: calculateExpiryDate(product),
      sourceType: 'purchase',
      status: 'active',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    batches.push(batch)
  })

  return batches
}

function generateRealisticStockLevel(product: CoreProductDefinition): number {
  // Generate stock between 3-15 days worth of consumption
  const minDays = 3
  const maxDays = 15
  const daysOfStock = minDays + Math.random() * (maxDays - minDays)
  return Math.round(product.dailyConsumption * daysOfStock * 100) / 100
}
```

#### 2.4 Recipe Store Data Generator

**Файл:** `src/stores/shared/mock/generateRecipeData.ts`

````typescript
import { CORE_PRODUCTS } from '../productDefinitions'
import type { Recipe, Preparation } from '@/stores/recipes/types'

export function generateRecipeStoreData() {
  return {
    recipes: generateRecipesUsingProducts(),
    preparations: generatePreparationsUsingProducts()
  }
}

// 🆕 НЕ ИЗМЕНЯЕМ существующие рецепты и полуфабрикаты
// Только добавляем English names и связи с продуктами

export function generateRecipesUsingProducts(): Recipe[] {
  // Берем существующие mockRecipes и дополняем English names
  // Проверяем что все componentId соответствуют CORE_PRODUCTS
  return enhanceExistingRecipes()
}

export function generatePreparationsUsingProducts(): Preparation[] {
  // Берем существующие mockPreparations и дополняем English names
  // Проверяем что все ингредиенты соответствуют CORE_PRODUCTS
  return enhanceExistingPreparations()
}

function enhanceExistingRecipes(): Recipe[] {
  // Логика дополнения существующих рецептов
  // Добавляем nameEn поля
  // Валидируем что все componentId есть в CORE_PRODUCTS
}

function enhanceExistingPreparations(): Preparation[] {
  // Логика дополнения существующих полуфабрикатов
  // Добавляем nameEn поля
  // Валидируем что все ингредиенты есть в CORE_PRODUCTS
}
```priceRecord.productId),
        pricePerUnit: priceRecord.pricePerUnit,
        totalPrice: priceRecord.pricePerUnit * calculateOrderQuantity(priceRecord.productId),
        isEstimatedPrice: false,
        status: 'ordered'
      })),
      totalAmount: 0, // Will be calculated
      isEstimatedTotal: false,
      status: index === months - 1 ? 'sent' : 'delivered',
      paymentStatus: index === months - 1 ? 'pending' : 'paid',
      requestIds: [],
      createdAt: orderDate.toISOString(),
      updatedAt: orderDate.toISOString()
    }

    order.totalAmount = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
    orders.push(order)
  })

  return orders
}
````

### 3. Создать Mock Data Coordinator

**Файл:** `src/stores/shared/mockDataCoordinator.ts`

```typescript
import { generateProductsStoreData } from './mock/generateProductsData'
import { generateSupplierStoreData } from './mock/generateSupplierData'
import { generateStorageStoreData } from './mock/generateStorageData'
import { generateRecipeStoreData } from './mock/generateRecipeData'

export class MockDataCoordinator {
  private productsData: ReturnType<typeof generateProductsStoreData>
  private supplierData: ReturnType<typeof generateSupplierStoreData>
  private storageData: ReturnType<typeof generateStorageStoreData>
  private recipeData: ReturnType<typeof generateRecipeStoreData>

  constructor() {
    this.initializeData()
  }

  private initializeData(): void {
    // 🆕 Phase-by-phase generation as needed
    this.productsData = generateProductsStoreData()
    // Other data will be generated when Phase 2 is ready
  }

  // Products Store data
  getProductsStoreData() {
    return this.productsData
  }

  // 🆕 Will be implemented in Phase 2
  getSupplierStoreData() {
    if (!this.supplierData) {
      this.supplierData = generateSupplierStoreData()
    }
    return this.supplierData
  }

  getStorageStoreData() {
    if (!this.storageData) {
      this.storageData = generateStorageStoreData()
    }
    return this.storageData
  }

  getRecipeStoreData() {
    if (!this.recipeData) {
      this.recipeData = generateRecipeStoreData()
    }
    return this.recipeData
  }

  // 🆕 Utility methods for cross-store consistency
  getCurrentPrices(): Record<string, number> {
    return this.productsData.priceHistory.reduce(
      (acc, record) => {
        acc[record.productId] = record.pricePerUnit
        return acc
      },
      {} as Record<string, number>
    )
  }

  getProductConsumptionRates(): Record<string, number> {
    // Will be calculated from storage operations when Phase 2 is ready
    return {}
  }
}

// Singleton instance
export const mockDataCoordinator = new MockDataCoordinator()
```

### 4. Создать экспорт интерфейс

**Файл:** `src/stores/shared/index.ts`

```typescript
export { mockDataCoordinator } from './mockDataCoordinator'
export { CORE_PRODUCTS } from './productDefinitions'
export type { CoreProductDefinition } from './productDefinitions'
export {
  generatePriceHistory,
  generateConsumptionOperations,
  generateSupplierOrders
} from './dataGenerators'
```

## План реализации

### Phase 1: Foundation (Week 1)

- [ ] Создать структуру `src/stores/shared/` с новой папкой `mock/`
- [ ] Создать `productDefinitions.ts` на основе **существующих 18 продуктов**
- [ ] Дополнить существующие продукты новыми полями (priceVolatility, dailyConsumption, etc.)
- [ ] Создать базовый `MockDataCoordinator` класс
- [ ] Создать `generateProductsData.ts` с English names

### Phase 2: Data Generation (Week 1-2) - **Пошагово по мере актуализации**

- [ ] **Шаг 1:** Реализовать `generatePriceHistory()` с реалистичными флуктуациями
- [ ] **Шаг 2:** Реализовать `generateConsumptionOperations()` с вариативностью
- [ ] **Шаг 3:** Реализовать `generateSupplierOrders()` связанные с ценами
- [ ] **Шаг 4:** Реализовать `generateCurrentBatches()` для текущих остатков

### Phase 3: Integration & Testing (Week 2)

- [ ] Обновить каждый Store mock для использования координированных данных
- [ ] Протестировать генерацию данных по шагам
- [ ] Проверить консистентность между продуктами, ценами и операциями
- [ ] Валидация English названий и связей

## Критерии готовности

### Функциональные требования

- [ ] Все **18 существующих продуктов** имеют полные определения с новыми полями
- [ ] Генерируется 3 месяца истории цен с реалистичными изменениями (**Phase 2, Шаг 1**)
- [ ] Генерируется 30 дней операций потребления (**Phase 2, Шаг 2**)
- [ ] Цены консистентны между Supplier и Product stores (**Phase 2, Шаг 3**)
- [ ] Потребление связано с **существующими** рецептами и полуфабрикатами (**Phase 2, Шаг 4**)
- [ ] **НЕ изменяем** существующие рецепты и полуфабрикаты - только дополняем English names

### Технические требования

- [ ] TypeScript типизация для всех интерфейсов
- [ ] JSDoc документация для всех публичных методов
- [ ] Unit тесты для генераторов данных
- [ ] Singleton pattern для координатора

### Качественные требования

- [ ] Данные выглядят реалистично (не случайно)
- [ ] Цены имеют логичные тренды
- [ ] Потребление имеет разумную вариативность
- [ ] English names корректны и последовательны

## Результат

После реализации:

1. **Единый источник** mock данных для всех store с модульной архитектурой
2. **Использование существующих данных** - работаем с уже определенными 18 продуктами и рецептами
3. **Реалистичные расчеты** без hardcode - по мере реализации Phase 2
4. **Простота поддержки** - отдельный файл для каждого Store
5. **Пошаговая реализация** - можно добавлять функционал поэтапно
6. **Готовность к Firebase** - та же структура данных
7. **Масштабируемость** - легко добавлять новые генераторы

Этот модульный фундамент позволит реализовать все запланированные функции Product Store с реальными данными, добавляя функционал по мере необходимости.
