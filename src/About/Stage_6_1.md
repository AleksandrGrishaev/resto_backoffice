# ТЗ 2: Расширение Product Store

## Цель

Расширить Product Store для поддержки умных рекомендаций по заказам, аналитики цен, отслеживания использования продуктов и интеграции с другими store.

## Основные задачи

### 1. Умные рекомендации по заказам (Stock Recommendations)

Product Store должен стать центром принятия решений по закупкам, рассчитывая и предоставляя готовые рекомендации для Supplier Store.

### 2. История и аналитика цен (Price History & Analytics)

Отслеживание изменений цен, тренды, волатильность для принятия решений о закупках.

### 3. Отслеживание использования (Usage Tracking)

Понимание где и как используется каждый продукт (рецепты, полуфабрикаты, прямые продажи).

### 4. Аналитика потребления (Consumption Analytics)

Расчет средних показателей потребления, тренды, прогнозы для планирования закупок.

## Техническое задание

### 1. Расширение Product Entity

**Файл:** `src/stores/productsStore/types.ts`

#### 1.1 Enhanced Product Interface

```typescript
export interface Product extends BaseEntity {
  // Basic info (English support)
  name: string
  nameEn: string // 🆕 English name
  description?: string
  descriptionEn?: string // 🆕 English description
  category: ProductCategory

  // Measurement and cost
  unit: MeasurementUnit
  currentCostPerUnit: number // Latest price from supplier receipts
  yieldPercentage: number

  // 🆕 ENHANCED: Direct sales capability
  canBeSold: boolean // Can be sold directly in menu

  // Storage & handling
  storageConditions?: string
  shelfLifeDays?: number

  // 🆕 MAIN FEATURE: Smart stock management
  minStock?: number // Calculated minimum stock level
  maxStock?: number // Calculated maximum stock level
  recommendedOrderQuantity?: number // 🆕 Calculated optimal order amount

  // Supplier basics
  primarySupplierId?: string
  leadTimeDays?: number

  // Status
  isActive: boolean

  // Metadata
  tags?: string[]
}
```

#### 1.2 New Entities for Analytics

```typescript
// Price history tracking
export interface ProductPriceHistory extends BaseEntity {
  productId: string
  pricePerUnit: number
  effectiveDate: string
  sourceType: 'purchase_order' | 'receipt' | 'manual_update'
  sourceId?: string
  supplierId?: string
  notes?: string
}

// Usage tracking - where product is used
export interface ProductUsage extends BaseEntity {
  productId: string
  usedInRecipes: Array<{
    recipeId: string
    recipeName: string
    quantityPerPortion: number
    isActive: boolean
  }>
  usedInPreparations: Array<{
    preparationId: string
    preparationName: string
    quantityPerOutput: number
    isActive: boolean
  }>
  directMenuItems?: Array<{
    menuItemId: string
    menuItemName: string
    variantId: string
    variantName: string
    quantityPerItem: number
    isActive: boolean
  }>
  lastUpdated: string
}

// Consumption analytics
export interface ProductConsumption {
  productId: string
  dailyAverageUsage: number
  weeklyAverageUsage: number
  monthlyAverageUsage: number
  calculatedAt: string
  basedOnDays: number
}

// 🆕 MAIN FEATURE: Stock recommendations
export interface StockRecommendation {
  productId: string
  currentStock: number // From Storage Store
  recommendedMinStock: number // Calculated minimum
  recommendedMaxStock: number // Calculated maximum
  recommendedOrderQuantity: number // Optimal order amount
  daysUntilReorder: number // When to reorder
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: {
    averageDailyUsage: number
    leadTimeDays: number
    safetyDays: number
  }
  calculatedAt: string
}
```

### 2. Enhanced Store State

```typescript
export interface ProductsState {
  // Core data
  products: Product[]
  priceHistory: ProductPriceHistory[]
  usageData: ProductUsage[]
  consumptionData: ProductConsumption[]
  stockRecommendations: StockRecommendation[] // 🆕 Key feature

  // UI state
  loading: {
    products: boolean
    priceHistory: boolean
    usage: boolean
    consumption: boolean
    recommendations: boolean
  }
  error: string | null
  selectedProduct: Product | null

  // 🆕 Enhanced filters
  filters: {
    category: ProductCategory | 'all'
    isActive: boolean | 'all'
    canBeSold: boolean | 'all' // 🆕 Filter by direct sale capability
    search: string
    needsReorder: boolean // 🆕 Show products needing reorder
  }
}
```

### 3. Key Composables Implementation

#### 3.1 Stock Recommendations Composable (Main Feature)

**Файл:** `src/stores/productsStore/composables/useStockRecommendations.ts`

```typescript
export function useStockRecommendations() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 🆕 MAIN FUNCTION: Calculate stock recommendation
  const calculateRecommendation = async (productId: string): Promise<StockRecommendation> => {
    loading.value = true
    try {
      // Get data from other stores
      const product = await productStore.getProduct(productId)
      const consumption = await calculateConsumption(productId)
      const currentStock = await storageStore.getCurrentStock(productId)

      // Calculate recommendations
      const safetyDays = 3
      const leadTimeDays = product.leadTimeDays || 7

      const recommendedMinStock = consumption.dailyAverageUsage * (leadTimeDays + safetyDays)
      const recommendedMaxStock = consumption.dailyAverageUsage * (leadTimeDays + safetyDays + 14)
      const recommendedOrderQuantity = consumption.weeklyAverageUsage * 2

      const recommendation: StockRecommendation = {
        productId,
        currentStock,
        recommendedMinStock,
        recommendedMaxStock,
        recommendedOrderQuantity,
        daysUntilReorder: currentStock / consumption.dailyAverageUsage - leadTimeDays,
        urgencyLevel: getUrgencyLevel(currentStock, consumption.dailyAverageUsage, leadTimeDays),
        factors: {
          averageDailyUsage: consumption.dailyAverageUsage,
          leadTimeDays,
          safetyDays
        },
        calculatedAt: new Date().toISOString()
      }

      // 🆕 Update product with recommendations
      await productStore.updateProduct({
        id: productId,
        minStock: recommendedMinStock,
        maxStock: recommendedMaxStock,
        recommendedOrderQuantity: recommendedOrderQuantity
      })

      return recommendation
    } finally {
      loading.value = false
    }
  }

  // Get products needing reorder - for Supplier Store
  const getProductsNeedingReorder = async (): Promise<Product[]> => {
    const allProducts = await productStore.getActiveProducts()
    const needReorder: Product[] = []

    for (const product of allProducts) {
      const recommendation = await calculateRecommendation(product.id)
      if (recommendation.urgencyLevel === 'high' || recommendation.urgencyLevel === 'critical') {
        needReorder.push(product)
      }
    }

    return needReorder
  }

  return {
    loading,
    error,
    calculateRecommendation,
    getProductsNeedingReorder
  }
}
```

#### 3.2 Price History Composable

**Файл:** `src/stores/productsStore/composables/useProductPriceHistory.ts`

```typescript
export function useProductPriceHistory() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get price history for widget
  const getPriceHistory = async (productId: string): Promise<ProductPriceHistory[]> => {
    // Implementation
  }

  // Add price record from supplier receipt
  const addPriceRecord = async (data: {
    productId: string
    pricePerUnit: number
    sourceType: 'receipt'
    sourceId: string
    supplierId?: string
  }): Promise<void> => {
    // Add to price history
    // Update product's currentCostPerUnit
  }

  // Calculate price trend for analytics
  const getPriceTrend = (history: ProductPriceHistory[], days: number = 30) => {
    // Real calculation from data
  }

  // Get chart data for price widget
  const getChartData = (history: ProductPriceHistory[]) => {
    // Format for visualization
  }

  return {
    loading,
    error,
    getPriceHistory,
    addPriceRecord,
    getPriceTrend,
    getChartData
  }
}
```

#### 3.3 Product Usage Composable

**Файл:** `src/stores/productsStore/composables/useProductUsage.ts`

```typescript
export function useProductUsage() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get complete usage info
  const getProductUsage = async (productId: string): Promise<ProductUsage> => {
    // Query recipes store
    const recipes = await recipesStore.getRecipesUsingProduct(productId)

    // Query preparations store
    const preparations = await preparationsStore.getPreparationsUsingProduct(productId)

    // Query menu store (if canBeSold)
    const product = await productStore.getProduct(productId)
    let menuItems: ProductUsage['directMenuItems'] = []

    if (product.canBeSold) {
      menuItems = await menuStore.getMenuItemsUsingProduct(productId)
    }

    // Build usage object
  }

  // Check if product can be deactivated
  const checkCanDeactivate = async (
    productId: string
  ): Promise<{
    canDeactivate: boolean
    blockers: string[]
  }> => {
    // Check dependencies in recipes, preparations, menu
  }

  return {
    loading,
    error,
    getProductUsage,
    checkCanDeactivate
  }
}
```

#### 3.4 Consumption Analytics Composable

**Файл:** `src/stores/productsStore/composables/useProductConsumption.ts`

```typescript
export function useProductConsumption() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Calculate consumption from Storage Store operations
  const calculateConsumption = async (
    productId: string,
    days: number = 30
  ): Promise<ProductConsumption> => {
    // Get correction operations from Storage Store
    const operations = await storageStore.getOperationsByProduct(productId, cutoffDate)

    // Calculate averages
    const totalConsumed = operations.reduce(/* calculation */)

    return {
      productId,
      dailyAverageUsage: totalConsumed / days,
      weeklyAverageUsage: (totalConsumed / days) * 7,
      monthlyAverageUsage: (totalConsumed / days) * 30,
      calculatedAt: new Date().toISOString(),
      basedOnDays: days
    }
  }

  // Get consumption trend
  const getConsumptionTrend = async (
    productId: string
  ): Promise<'increasing' | 'decreasing' | 'stable'> => {
    const recent = await calculateConsumption(productId, 30)
    const older = await calculateConsumption(productId, 60)

    const change =
      ((recent.dailyAverageUsage - older.dailyAverageUsage) / older.dailyAverageUsage) * 100

    if (change > 20) return 'increasing'
    if (change < -20) return 'decreasing'
    return 'stable'
  }

  return {
    loading,
    error,
    calculateConsumption,
    getConsumptionTrend
  }
}
```

### 4. Enhanced Product Store Actions

**Файл:** `src/stores/productsStore/productsStore.ts`

```typescript
export const useProductsStore = defineStore('products', {
  state: (): ProductsState => ({
    // Enhanced state
  }),

  getters: {
    // 🆕 Enhanced getters
    sellableProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && product.canBeSold)
    },

    productsNeedingReorder: (state): Product[] => {
      return state.stockRecommendations
        .filter(rec => rec.urgencyLevel === 'high' || rec.urgencyLevel === 'critical')
        .map(rec => state.products.find(p => p.id === rec.productId))
        .filter(Boolean)
    },

    productsByUrgency: (state) => (urgency: string): Product[] => {
      return state.stockRecommendations
        .filter(rec => rec.urgencyLevel === urgency)
        .map(rec => state.products.find(p => p.id === rec.productId))
        .filter(Boolean)
    }
  },

  actions: {
    // 🆕 MAIN ACTION: Calculate all recommendations
    async calculateAllRecommendations(): Promise<void> {
      const { calculateRecommendation } = useStockRecommendations()

      this.loading.recommendations = true
      try {
        const recommendations: StockRecommendation[] = []

        for (const product of this.products) {
          if (product.isActive) {
            const recommendation = await calculateRecommendation(product.id)
            recommendations.push(recommendation)
          }
        }

        this.stockRecommendations = recommendations
      } catch (error) {
        this.error = 'Failed to calculate recommendations'
        throw error
      } finally {
        this.loading.recommendations = false
      }
    },

    // 🆕 Add price history from supplier receipt
    async addPriceHistory(data: Omit<ProductPriceHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
      const { addPriceRecord } = useProductPriceHistory()
      await addPriceRecord(data)

      // Reload price history
      await this.loadPriceHistory(data.productId)
    },

    // 🆕 Update product usage when recipes change
    async updateProductUsage(productId: string): Promise<void> {
      const { getProductUsage } = useProductUsage()

      this.loading.usage = true
      try {
        const usage = await getProductUsage(productId)

        // Update or add usage data
        const existingIndex = this.usageData.findIndex(u => u.productId === productId)
        if (existingIndex >= 0) {
          this.usageData[existingIndex] = usage
        } else {
          this.usageData.push(usage)
        }
      } finally {
        this.loading.usage = false
      }
    },

    // 🆕 Enhanced filters
    updateFilters(filters: Partial<ProductsState['filters']>): void {
      this.filters = { ...this.filters, ...filters }
    },

    // 🆕 Get products for supplier store
    getProductsForSupplier(): ProductForSupplier[] {
      return this.products
        .filter(p => p.isActive && !p.canBeSold) // Raw materials only
        .map(product => {
          const recommendation = this.stockRecommendations.find(r => r.productId === product.id)
          return {
            id: product.id,
            name: product.name,
            nameEn: product.nameEn,
            currentCostPerUnit: product.currentCostPerUnit,
            recommendedOrderQuantity: product.recommendedOrderQuantity || 0,
            urgencyLevel: recommendation?.urgencyLevel || 'low',
            primarySupplierId: product.primarySupplierId
          }
        })
    },

    // 🆕 Get products for menu store
    getProductsForMenu(): ProductForMenu[] => {
      return this.products
        .filter(p => p.isActive && p.canBeSold) // Direct sale items only
        .map(product => ({
          id: product.id,
          name: product.name,
          nameEn: product.nameEn,
          canBeSold: product.canBeSold,
          currentCostPerUnit: product.currentCostPerUnit,
          unit: product.unit
        }))
    }
  }
})
```

### 5. UI Enhancements

#### 5.1 Enhanced Product Card Component

**Файл:** `src/views/products/components/ProductCard.vue`

```vue
<template>
  <v-card class="product-card" :class="{ 'product-card--needs-reorder': needsReorder }">
    <!-- Existing content -->

    <!-- 🆕 Stock status badge -->
    <div class="stock-status-badge" v-if="stockRecommendation">
      <v-chip
        :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
        size="small"
        variant="tonal"
      >
        {{ getUrgencyText(stockRecommendation.urgencyLevel) }}
      </v-chip>
    </div>

    <!-- 🆕 Can be sold indicator -->
    <div v-if="product.canBeSold" class="direct-sale-badge">
      <v-chip color="success" size="x-small" variant="outlined">Direct Sale</v-chip>
    </div>

    <!-- 🆕 Mini price trend -->
    <div class="price-trend-mini" v-if="priceTrend">
      <v-icon :color="getPriceTrendColor(priceTrend)" size="small">
        {{ getPriceTrendIcon(priceTrend) }}
      </v-icon>
      <span class="text-caption">{{ priceTrend }}</span>
    </div>

    <!-- 🆕 Quick metrics -->
    <v-card-text class="pa-2">
      <div class="quick-metrics" v-if="consumption">
        <div class="metric">
          <span class="text-caption">Daily Usage:</span>
          <span class="font-weight-medium">
            {{ consumption.dailyAverageUsage.toFixed(1) }} {{ product.unit }}
          </span>
        </div>
        <div class="metric" v-if="stockRecommendation">
          <span class="text-caption">Days Left:</span>
          <span class="font-weight-medium">
            {{ Math.max(0, Math.floor(stockRecommendation.daysUntilReorder)) }}
          </span>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// Enhanced with stock recommendations, price trends, usage metrics
</script>
```

#### 5.2 New Price History Widget

**Файл:** `src/views/products/components/PriceHistoryWidget.vue`

```vue
<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start color="info">mdi-chart-line</v-icon>
      Price History
      <v-spacer />
      <v-chip :color="getTrendColor(trend)" size="small" variant="tonal">
        {{ trend }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- 🆕 Price chart -->
      <div class="price-chart-container">
        <canvas ref="chartCanvas" height="200"></canvas>
      </div>

      <!-- 🆕 Price metrics -->
      <v-row class="mt-3">
        <v-col cols="4">
          <div class="text-center">
            <div class="text-h6">{{ formatCurrency(currentPrice) }}</div>
            <div class="text-caption">Current</div>
          </div>
        </v-col>
        <v-col cols="4">
          <div class="text-center">
            <div class="text-h6">{{ formatCurrency(averagePrice) }}</div>
            <div class="text-caption">30-day Avg</div>
          </div>
        </v-col>
        <v-col cols="4">
          <div class="text-center">
            <div class="text-h6 :class="changeColor">{{ changePercent }}%</div>
            <div class="text-caption">Change</div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// Price history visualization and analytics
</script>
```

#### 5.3 New Usage Tracking Widget

**Файл:** `src/views/products/components/UsageTrackingWidget.vue`

```vue
<template>
  <v-card>
    <v-card-title>
      <v-icon start color="primary">mdi-sitemap</v-icon>
      Where Used
    </v-card-title>

    <v-card-text>
      <!-- 🆕 Recipes section -->
      <div v-if="usage?.usedInRecipes.length > 0" class="mb-4">
        <h4 class="text-subtitle-2 mb-2">Recipes ({{ usage.usedInRecipes.length }})</h4>
        <v-chip-group>
          <v-chip
            v-for="recipe in usage.usedInRecipes"
            :key="recipe.recipeId"
            :color="recipe.isActive ? 'primary' : 'default'"
            size="small"
            variant="outlined"
          >
            {{ recipe.recipeName }}
            <template #append>
              <span class="text-caption ml-1">
                {{ recipe.quantityPerPortion }}{{ product.unit }}
              </span>
            </template>
          </v-chip>
        </v-chip-group>
      </div>

      <!-- 🆕 Preparations section -->
      <div v-if="usage?.usedInPreparations.length > 0" class="mb-4">
        <h4 class="text-subtitle-2 mb-2">Preparations ({{ usage.usedInPreparations.length }})</h4>
        <v-chip-group>
          <v-chip
            v-for="prep in usage.usedInPreparations"
            :key="prep.preparationId"
            :color="prep.isActive ? 'secondary' : 'default'"
            size="small"
            variant="outlined"
          >
            {{ prep.preparationName }}
            <template #append>
              <span class="text-caption ml-1">{{ prep.quantityPerOutput }}{{ product.unit }}</span>
            </template>
          </v-chip>
        </v-chip-group>
      </div>

      <!-- 🆕 Direct menu sales -->
      <div v-if="usage?.directMenuItems?.length > 0">
        <h4 class="text-subtitle-2 mb-2">Direct Sales ({{ usage.directMenuItems.length }})</h4>
        <v-chip-group>
          <v-chip
            v-for="item in usage.directMenuItems"
            :key="`${item.menuItemId}-${item.variantId}`"
            color="success"
            size="small"
            variant="outlined"
          >
            {{ item.menuItemName }} - {{ item.variantName }}
          </v-chip>
        </v-chip-group>
      </div>

      <!-- 🆕 No usage -->
      <div v-if="!hasAnyUsage" class="text-center py-4">
        <v-icon size="48" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
        <div class="text-body-2 text-medium-emphasis mt-2">
          Product not used in any recipes or menu items
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// Usage tracking display
</script>
```

### 6. Integration Points

#### 6.1 Supplier Store Integration

```typescript
// Supplier Store получает данные от Product Store
export const useSupplierStore = defineStore('supplier', {
  actions: {
    // 🆕 Get products needing reorder
    async getReorderSuggestions(): Promise<ProductForSupplier[]> {
      const productStore = useProductsStore()
      return productStore
        .getProductsForSupplier()
        .filter(p => p.urgencyLevel === 'high' || p.urgencyLevel === 'critical')
    },

    // 🆕 When receipt is completed, update product prices
    async completeReceipt(receiptId: string): Promise<void> {
      const receipt = this.receipts.find(r => r.id === receiptId)
      const productStore = useProductsStore()

      // Update price history for products with price changes
      for (const item of receipt.items) {
        if (item.actualPrice && item.actualPrice !== item.orderedPrice) {
          await productStore.addPriceHistory({
            productId: item.itemId,
            pricePerUnit: item.actualPrice,
            sourceType: 'receipt',
            sourceId: receiptId,
            supplierId: receipt.supplierId
          })
        }
      }
    }
  }
})
```

#### 6.2 Storage Store Integration

```typescript
// Storage Store уведомляет Product Store о потреблении
export const useStorageStore = defineStore('storage', {
  actions: {
    // 🆕 When correction is completed, update consumption
    async confirmOperation(operationId: string): Promise<void> {
      const operation = this.operations.find(o => o.id === operationId)
      const productStore = useProductsStore()

      if (operation.operationType === 'correction') {
        // Update consumption data for affected products
        for (const item of operation.items) {
          await productStore.updateConsumption(item.itemId)
        }
      }
    }
  }
})
```

#### 6.3 Recipe Store Integration

```typescript
// Recipe Store уведомляет Product Store об изменениях
export const useRecipesStore = defineStore('recipes', {
  actions: {
    // 🆕 When recipe is updated, update product usage
    async updateRecipe(recipeData: UpdateRecipeData): Promise<void> {
      // Update recipe
      await this.updateRecipeInternal(recipeData)

      // Notify Product Store about usage changes
      const productStore = useProductsStore()
      const recipe = this.recipes.find(r => r.id === recipeData.id)

      for (const component of recipe.components) {
        if (component.componentType === 'product') {
          await productStore.updateProductUsage(component.componentId)
        }
      }
    }
  }
})
```

## План реализации

### Week 1: Foundation & Mock Data Integration

- [ ] Обновить Product types с новыми полями
- [ ] Интегрировать с координированными mock данными
- [ ] Добавить English поддержку во все компоненты
- [ ] Обновить фильтры для `canBeSold` и `needsReorder`

### Week 2: Stock Recommendations (Main Feature)

- [ ] Реализовать `useStockRecommendations` composable
- [ ] Интеграция с Storage Store для получения текущих остатков
- [ ] Расчет оптимальных уровней stock и количеств заказа
- [ ] Система urgency levels и alerting

### Week 3: Price History & Analytics

- [ ] Реализовать `useProductPriceHistory` composable
- [ ] Создать Price History Widget с графиками
- [ ] Интеграция с Supplier Store для автоматического добавления цен
- [ ] Price trend calculation и volatility metrics

### Week 4: Usage Tracking & Consumption

- [ ] Реализовать `useProductUsage` composable
- [ ] Реализовать `useProductConsumption` composable
- [ ] Создать Usage Tracking Widget
- [ ] Интеграция с Recipe, Preparation, Menu stores

### Week 5: UI Enhancements & Integration

- [ ] Обновить Product Card с новыми метриками
- [ ] Добавить новые виджеты в Product Details
- [ ] Настроить cross-store интеграцию и event handling
- [ ] Тестирование и оптимизация производительности

## Критерии готовности

### Функциональные требования

- [ ] Product Store рассчитывает stock recommendations для всех активных продуктов
- [ ] Supplier Store получает готовые рекомендации по заказу
- [ ] Price history автоматически обновляется из supplier receipts
- [ ] Usage tracking показывает все места использования продукта
- [ ] Consumption analytics работает с реальными данными из Storage operations

### Технические требования

- [ ] Все composables покрыты unit тестами
- [ ] TypeScript строгая типизация
- [ ] Error handling для всех async операций
- [ ] Performance optimization для heavy calculations
- [ ] JSDoc документация для всех public методов

### UI/UX требования

- [ ] English/Local language toggle работает везде
- [ ] Responsive design для всех новых компонентов
- [ ] Loading states для всех async операций
- [ ] Error states с user-friendly сообщениями
- [ ] Accessibility compliance (WCAG 2.1)

### Integration требования

- [ ] Seamless integration с существующими stores
- [ ] Event-driven updates между stores
- [ ] No breaking changes в existing API
- [ ] Firebase migration path готов
- [ ] Mock data координация работает правильно

## Результат

После реализации Product Store станет:

1. **Центром принятия решений** по закупкам с автоматическими рекомендациями
2. **Источником аналитики** цен и потребления для всей системы
3. **Координатором usage tracking** для понимания зависимостей
4. **Готовой основой** для ML forecasting и advanced analytics
5. **Полностью интегрированной** частью restaurant management ecosystem

Этот enhanced Product Store обеспечит intelligent inventory management и станет foundation для data-driven решений в ресторанном бизнесе.
