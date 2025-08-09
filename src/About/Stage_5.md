📋 Анализ технического задания
Изучил ваше ТЗ и существующую кодовую базу. Все основные требования учтены и понятны. Вот ключевые моменты, которые я учел:
✅ Учтенные требования:

Минимально простая реализация - упростил архитектуру, убрал сложные интеграции на первом этапе
Два склада (Kitchen/Bar) - отдельные департаменты с независимым учетом
Быстрые списания - единый диалог для множественного добавления продуктов/полуфабрикатов/блюд
Удобная инвентаризация - отдельные вкладки для Products и Preparations с полными списками
Учет полуфабрикатов - полная поддержка preparations наравне с products
FIFO принцип - строгая реализация "первый пришел - первый ушел"
Динамика цен - средняя цена остатков + тренды, FIFO для себестоимости
Приходы с коррекциями - базовый функционал до создания SupplierStore
Использование существующих mock данных - интеграция с Product и Recipe stores

🏗️ Этапы создания:
Phase 1: StorageStore (Week 1)

Создание типов и интерфейсов для склада
Реализация FIFO логики с batch tracking
Mock данные на основе существующих products/preparations
Базовый StorageService и StorageStore

Phase 2: StorageStore and PreparationStore UI (Week 2)

StorageView с табами Kitchen/Bar
Базовый функционал поступлений/коррекций
Интеграция с Product/Recipe stores

Phase 3: SupplierStore (Week 3)

Создание типов для поставщиков и закупок
Workflow управления заказами
Интеграция с StorageStore для поступлений
UI для управления поставщиками

Phase 4: Интеграция с AccountStore (Week 4)

Связь с финансовой системой
Автоматическое создание расходных операций
Отслеживание платежей поставщикам
Полная интеграция всех модулей

Phase 5: Расширение и полировка (Week 5)

Продвинутая аналитика и отчеты
Интеграция с Menu Store для автосписания
Оптимизация производительности
Тестирование и доработка UX

🎯 Ключевые особенности обновленной спецификации:

MultiConsumptionDialog - можно за раз добавить много позиций
Раздельная инвентаризация - отдельные табы для продуктов и полуфабрикатов
Аналитика цен - тренды, средние цены, FIFO расчеты
Быстрый доступ - популярные товары в быстром доступе
Department-based - полное разделение Kitchen и Bar
Интеграция с mock данными - использование существующих products и recipes

# 📦 Storage & Supplies Management System - Updated Technical Specification

## 🎯 Key Changes Based on Requirements

### Simplified Initial Implementation:

1. **Two departments**: Kitchen and Bar (separate stock management)
2. **Quick consumption workflow**: Multi-item consumption in single dialog
3. **Inventory management**: Separate tabs for Products and Preparations with full stock lists
4. **FIFO cost calculation**: First In, First Out principle
5. **Price analytics**: Average costs and cost trends tracking
6. **Corrections via Storage**: Basic receiving with correction flag
7. **Test with existing mock data**: Use products and preparations from existing stores

---

## 🔄 Updated Module Relationships

### **Storage Store ↔ Existing Modules:**

#### **→ Product Store (Read Only)**

```typescript
// Use existing products from mock data
interface Product {
  id: string
  name: string
  category: string
  unit: string // 'kg', 'liter', 'piece', etc.
  minStock?: number
  shelfLife?: number
}
```

#### **→ Recipe Store (Read Only)**

```typescript
// Use existing preparations from mock data
interface Preparation {
  id: string
  name: string
  type: 'preparation'
  outputQuantity: number
  outputUnit: string
}
```

---

## 📊 Storage Store Specification

### **Core Entities:**

#### **StorageBatch** - Individual stock lots with FIFO tracking

```typescript
interface StorageBatch extends BaseEntity {
  // Identification
  batchNumber: string // "B-BEEF-001-20250205"
  itemId: string // Product or Preparation ID
  itemType: 'product' | 'preparation'
  department: 'kitchen' | 'bar'

  // Quantity tracking
  initialQuantity: number // Original received quantity
  currentQuantity: number // Remaining quantity
  unit: string // kg, liter, piece, etc.

  // Cost tracking (FIFO)
  costPerUnit: number // Cost per unit for THIS batch
  totalValue: number // currentQuantity × costPerUnit

  // Dates and expiry
  receiptDate: string // When batch was received
  expiryDate?: string // When batch expires

  // Source tracking
  sourceType: 'purchase' | 'production' | 'correction' | 'opening_balance'
  notes?: string

  // Status
  status: 'active' | 'expired' | 'consumed'
  isActive: boolean
}
```

#### **StorageOperation** - All inventory movements

```typescript
interface StorageOperation extends BaseEntity {
  // Operation details
  operationType: 'receipt' | 'consumption' | 'inventory' | 'correction'
  documentNumber: string // "REC-001", "CON-001", "INV-001"
  operationDate: string
  department: 'kitchen' | 'bar'

  // Responsible person
  responsiblePerson: string // Who performed the operation

  // Items involved
  items: StorageOperationItem[]

  // Financial impact
  totalValue?: number // Total cost impact of operation

  // Consumption tracking with quick selection
  consumptionDetails?: {
    reason: 'recipe' | 'menu_item' | 'waste' | 'expired' | 'other'
    relatedId?: string // Recipe ID, Menu Item ID, etc.
    relatedName?: string // Human readable name
    portionCount?: number // How many portions made
  }

  // Status and workflow
  status: 'draft' | 'confirmed'
  notes?: string
}

interface StorageOperationItem {
  id: string
  itemId: string // Product or Preparation ID
  itemType: 'product' | 'preparation'
  itemName: string // Cached name for display

  // Quantity
  quantity: number
  unit: string

  // FIFO allocation (for consumption)
  batchAllocations?: BatchAllocation[]

  // Cost tracking
  totalCost?: number // Calculated total cost
  averageCostPerUnit?: number // Weighted average cost

  // Additional details
  notes?: string
  expiryDate?: string // For receipts
}

interface BatchAllocation {
  batchId: string // Which batch to consume from
  batchNumber: string // Human readable batch number
  quantity: number // How much from this batch
  costPerUnit: number // Cost per unit from this batch
  batchDate: string // Receipt date of batch (for FIFO verification)
}
```

#### **StorageBalance** - Current stock summary with analytics

```typescript
interface StorageBalance {
  // Item identification
  itemId: string
  itemType: 'product' | 'preparation'
  itemName: string // Cached name
  department: 'kitchen' | 'bar'

  // Current stock
  totalQuantity: number // Sum of all active batches
  unit: string

  // Financial summary with price analytics
  totalValue: number // Total value of all batches
  averageCost: number // Weighted average cost per unit
  latestCost: number // Cost of most recent batch
  costTrend: 'up' | 'down' | 'stable' // Price trend indicator

  // FIFO batch details
  batches: StorageBatch[] // All active batches (sorted FIFO - oldest first)
  oldestBatchDate: string // Date of oldest batch
  newestBatchDate: string // Date of newest batch

  // Alerts and warnings
  hasExpired: boolean // Has any expired batches
  hasNearExpiry: boolean // Has batches expiring within 3 days
  belowMinStock: boolean // Below minimum stock level

  // Usage analytics
  lastConsumptionDate?: string // When last consumed
  averageDailyConsumption?: number // Moving average consumption
  daysOfStockRemaining?: number // Estimated days until stockout

  // Cache timestamps
  lastCalculated: string // When this balance was calculated
}
```

#### **InventoryDocument** - Periodic stock takes (Products & Preparations separate)

```typescript
interface InventoryDocument extends BaseEntity {
  // Document details
  documentNumber: string // "INV-KITCHEN-PROD-001"
  inventoryDate: string
  department: 'kitchen' | 'bar'
  itemType: 'product' | 'preparation' // Separate inventories

  // Responsible person
  responsiblePerson: string

  // Inventory results
  items: InventoryItem[]

  // Summary
  totalItems: number // Number of items counted
  totalDiscrepancies: number // Number of items with differences
  totalValueDifference: number // Total financial impact

  // Status
  status: 'draft' | 'confirmed'
  notes?: string
}

interface InventoryItem {
  id: string
  itemId: string
  itemType: 'product' | 'preparation'
  itemName: string // Cached name

  // Quantities
  systemQuantity: number // Quantity per system
  actualQuantity: number // Actual counted quantity
  difference: number // actualQuantity - systemQuantity

  // Financial impact
  unit: string
  averageCost: number // Current average cost per unit
  valueDifference: number // difference × averageCost

  // Details
  notes?: string // Reasons for discrepancy
  countedBy?: string // Who counted this item
}
```

### **Store State:**

```typescript
interface StorageState {
  // Core data
  batches: StorageBatch[]
  operations: StorageOperation[]
  balances: StorageBalance[]
  inventories: InventoryDocument[]

  // UI state
  loading: {
    balances: boolean
    operations: boolean
    inventory: boolean
    consumption: boolean
  }
  error: string | null

  // Quick access data for consumption dialog
  quickItems: {
    products: Product[] // Popular products
    preparations: Preparation[] // Popular preparations
    menuItems: MenuItem[] // For consumption tracking
  }

  // Filters and search
  filters: {
    department: 'kitchen' | 'bar' | 'all'
    itemType: 'product' | 'preparation' | 'all'
    showExpired: boolean
    showBelowMinStock: boolean
    showNearExpiry: boolean
    search: string
    dateFrom?: string
    dateTo?: string
  }

  // Settings
  settings: {
    expiryWarningDays: number // Days before expiry to show warning (default: 3)
    lowStockMultiplier: number // Multiplier of minStock for low stock warning (default: 1.2)
    autoCalculateBalance: boolean // Auto-recalculate balances on operations (default: true)
  }
}
```

### **Key Methods:**

#### **FIFO Operations:**

```typescript
// FIFO consumption with automatic batch allocation
async createConsumption(data: CreateConsumptionData): Promise<StorageOperation>

// FIFO cost calculation
calculateFifoAllocation(
  itemId: string,
  itemType: 'product' | 'preparation',
  department: 'kitchen' | 'bar',
  quantity: number
): BatchAllocation[]

// Get consumption cost based on FIFO
calculateConsumptionCost(
  itemId: string,
  itemType: 'product' | 'preparation',
  department: 'kitchen' | 'bar',
  quantity: number
): number
```

#### **Quick Operations:**

```typescript
// Get popular items for quick selection
getQuickProducts(department: 'kitchen' | 'bar'): Product[]
getQuickPreparations(department: 'kitchen' | 'bar'): Preparation[]
getQuickMenuItems(): MenuItem[]

// Multi-item consumption
async createMultiItemConsumption(
  items: ConsumptionItem[],
  department: 'kitchen' | 'bar',
  responsiblePerson: string,
  consumptionDetails?: ConsumptionDetails
): Promise<StorageOperation>
```

#### **Inventory Management:**

```typescript
// Full inventory with all items
async startInventory(
  department: 'kitchen' | 'bar',
  itemType: 'product' | 'preparation'
): Promise<InventoryDocument>

// Update inventory counts
async updateInventoryItem(
  inventoryId: string,
  itemId: string,
  actualQuantity: number,
  notes?: string
): Promise<void>

// Finalize inventory and create corrections
async finalizeInventory(inventoryId: string): Promise<StorageOperation[]>
```

#### **Analytics and Price Tracking:**

```typescript
// Price trend analysis
getPriceTrends(itemId: string, months: number): PriceTrend[]
getAverageCosts(department: 'kitchen' | 'bar'): ItemCostSummary[]

// Consumption analytics
getConsumptionHistory(itemId: string, days: number): ConsumptionHistory[]
getTopConsumedItems(department: 'kitchen' | 'bar', limit: number): ItemUsageSummary[]

// Alerts
getExpiringItems(days: number): StorageBalance[]
getLowStockItems(): StorageBalance[]
```

---

## 🎨 UI Components Architecture

### **StorageView.vue** - Main dashboard with department tabs

```
┌─────────────────────────────────────────────┐
│ 📦 Storage Management                       │
│ ├─ [Kitchen] [Bar] (department tabs)        │
│ ├─ Quick Actions: [➖ Multi Consumption]    │
│ │                  [📋 Inventory Products]  │
│ │                  [📋 Inventory Prep.]     │
│ │                  [➕ Receipt/Correction]  │
│ ├─ Alerts: [⚠️ Expiring (3)] [📉 Low (5)]  │
│ ├─ Stock Overview:                          │
│ │  ┌─ [Products] [Preparations] tabs ─────┐│
│ │  │ Item | Stock | Avg Cost | Trend | Actions││
│ │  │ 🥩 Beef | 2.5kg | 180k | 📈+5% | [➖][📦]││
│ │  │ 🥔 Potato | 15kg | 8k | 📉-2% | [➖][📦]││
│ │  └───────────────────────────────────────┘│
│ └─ Recent Operations: [View All]            │
└─────────────────────────────────────────────┘
```

### **MultiConsumptionDialog.vue** - Quick multi-item consumption

```
┌─────────────────────────────────────────────┐
│ Multi-Item Consumption - Kitchen            │
│ ├─ Responsible: [Chef Maria ▼]             │
│ ├─ Usage Type: [Recipe ▼] → Beef Rendang   │
│ ├─ Quick Add Popular Items:                │
│ │  [🥩 Beef] [🥔 Potato] [🧄 Garlic] [More▼]│
│ ├─ Items to Consume:                       │
│ │  ┌─────────────────────────────────────┐ │
│ │  │ 🥩 Beef Steak                       │ │
│ │  │ Available: 2.5kg                    │ │
│ │  │ Consume: [1.5] kg                   │ │
│ │  │ FIFO: 1.5kg from B-BEEF-001 @180k  │ │
│ │  │ Cost: 270,000 IDR          [Remove] │ │
│ │  └─────────────────────────────────────┘ │
│ │  ┌─────────────────────────────────────┐ │
│ │  │ 🥔 Potato                           │ │
│ │  │ Available: 15kg                     │ │
│ │  │ Consume: [2] kg                     │ │
│ │  │ Cost: 16,000 IDR           [Remove] │ │
│ │  └─────────────────────────────────────┘ │
│ │  [+ Add Item] [📋 Add from Recipe]      │
│ ├─ Total Cost: 286,000 IDR                 │
│ └─ [Cancel] [Confirm Consumption]          │
└─────────────────────────────────────────────┘
```

### **InventoryDialog.vue** - Full inventory management

```
┌─────────────────────────────────────────────┐
│ Inventory - Kitchen Products                │
│ ├─ Date: [05.02.25] Person: [Manager ▼]    │
│ ├─ Filter: [🔍 Search] [⚠️ Discrepancies]   │
│ ├─ Progress: 25/30 items counted            │
│ ├─ Items List:                             │
│ │  ┌─────────────────────────────────────┐ │
│ │  │ 🥩 Beef Steak                       │ │
│ │  │ System: 2.5kg                       │ │
│ │  │ Actual: [2.3] kg  ⚠️ -0.2kg        │ │
│ │  │ Notes: [Normal shrinkage...]        │ │
│ │  └─────────────────────────────────────┘ │
│ │  ┌─────────────────────────────────────┐ │
│ │  │ 🥔 Potato                           │ │
│ │  │ System: 15kg                        │ │
│ │  │ Actual: [15] kg  ✅ Match           │ │
│ │  └─────────────────────────────────────┘ │
│ ├─ Summary: Discrepancies: 3 Value: -45k   │
│ └─ [Save Draft] [Finalize Inventory]       │
└─────────────────────────────────────────────┘
```

---

## 🔄 Implementation Phases

### **Phase 1: Storage Store Foundation (Week 1)**

- [ ] Create storage types based on existing product/preparation interfaces
- [ ] Implement FIFO calculation logic with batch tracking
- [ ] Create mock storage data using existing products/preparations
- [ ] Build StorageService with CRUD operations
- [ ] Set up StorageStore with state management

**Mock Data Integration:**

```typescript
// Use existing mock products and preparations
const mockProducts = [
  { id: 'beef-steak', name: 'Beef Steak', category: 'meat', unit: 'kg' },
  { id: 'potato', name: 'Potato', category: 'vegetable', unit: 'kg' }
  // ... existing products
]

const mockPreparations = [
  { id: 'beef-rendang', name: 'Beef Rendang', outputQuantity: 10, outputUnit: 'portion' }
  // ... existing preparations
]

// Create initial batches for testing
const mockBatches = [
  {
    itemId: 'beef-steak',
    itemType: 'product',
    department: 'kitchen',
    currentQuantity: 2.5,
    costPerUnit: 180000,
    receiptDate: '2025-02-01',
    sourceType: 'opening_balance'
  }
]
```

### **Phase 2: Storage UI (Week 2)**

- [ ] StorageView with Kitchen/Bar tabs and stock overview
- [ ] MultiConsumptionDialog with quick item selection
- [ ] Basic receiving/correction functionality
- [ ] Integration with existing Product/Recipe stores
- [ ] FIFO cost display and price trend indicators

### **Phase 3: Inventory Management (Week 3)**

- [ ] InventoryDialog with full item lists (Products & Preparations separate)
- [ ] Inventory workflow: count → discrepancies → finalize
- [ ] Automatic correction generation from inventory
- [ ] Inventory history and reporting

### **Phase 4: Analytics & Polish (Week 4)**

- [ ] Price trend analysis and cost tracking
- [ ] Consumption analytics and reporting
- [ ] Advanced alerts and notifications
- [ ] Performance optimization and caching
- [ ] User testing and bug fixes

### **Phase 5: Future Expansion (Week 5+)**

- [ ] Integration with Menu Store for automatic consumption
- [ ] Advanced recipe-based consumption tracking
- [ ] Supplier management integration (SupplierStore)
- [ ] Account Store integration for financial tracking

---

## 🎯 Success Criteria

### **Technical Requirements:**

- ✅ FIFO cost calculation with 100% accuracy
- ✅ Real-time stock balance updates across departments
- ✅ Quick multi-item consumption workflow
- ✅ Separate inventory management for Products and Preparations
- ✅ Price trend tracking and average cost calculation

### **Business Requirements:**

- ✅ Support for Kitchen and Bar departments
- ✅ Easy consumption tracking with recipe/menu integration
- ✅ Comprehensive inventory management
- ✅ Price analytics for menu cost calculation
- ✅ FIFO principle for accurate cost tracking

### **User Experience Requirements:**

- ✅ Quick access to popular items in consumption
- ✅ Single dialog for multi-item operations
- ✅ Clear price trends and cost information
- ✅ Intuitive inventory counting interface
- ✅ Department-based stock management

---

This specification provides a simplified yet comprehensive approach that addresses all your requirements while maintaining integration with existing systems and preparing for future expansion to supplier management and financial integration.
