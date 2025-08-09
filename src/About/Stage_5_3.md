# 📋 Phase 3: SupplierStore & Procurement Management - Technical Specification

## 🎯 Цели Phase 3

### Основные требования:

1. **Быстрое создание заказов** - удобный интерфейс для формирования заказов по отделам
2. **Помощник заказов** - автоматические предложения на основе остатков и минимальных запасов
3. **Управление поставщиками** - база поставщиков с привязкой к товарам
4. **Workflow заказов** - от заявки до прихода товара
5. **Интеграция с AccountStore** - учет платежей и задолженностей
6. **Интеграция с StorageStore** - отслеживание заказанных товаров

---

## 🏗️ Архитектура модуля

### **Новые сущности:**

#### **Supplier** - Поставщики

```typescript
interface Supplier extends BaseEntity {
  // Основная информация
  name: string
  type: 'local' | 'wholesale' | 'online' | 'other'

  // Контакты
  contactPerson?: string
  phone?: string
  email?: string
  address?: string

  // Продукты
  products: string[] // Product IDs, которые поставляет
  categories: string[] // Категории продуктов

  // Условия работы
  paymentTerms: 'prepaid' | 'on_delivery' | 'monthly' | 'custom'

  // Статистика и финансы
  totalOrders?: number
  totalOrderValue?: number // общая сумма заказов
  averageOrderValue?: number
  lastOrderDate?: string
  reliability: 'excellent' | 'good' | 'average' | 'poor'

  // Финансовые показатели
  currentBalance: number // дебет/кредит с поставщиком
  totalPaid?: number // всего оплачено
  totalDebt?: number // текущая задолженность

  // Статус
  isActive: boolean
  notes?: string
}
```

#### **ProcurementRequest** - Заявка на заказ от отдела

```typescript
interface ProcurementRequest extends BaseEntity {
  // Заявка
  requestNumber: string // "REQ-KITCHEN-001"
  department: StorageDepartment
  requestedBy: string
  requestDate: string

  // Товары
  items: ProcurementRequestItem[]

  // Помощник заказов
  suggestions?: OrderSuggestion[]

  // Статус
  status: 'draft' | 'submitted' | 'approved' | 'converted' | 'cancelled'
  priority: 'low' | 'normal' | 'urgent'

  // Связи
  purchaseOrderIds: string[] // PO, созданные из этой заявки

  notes?: string
}

interface ProcurementRequestItem {
  id: string
  itemId: string
  itemName: string
  currentStock: number
  requestedQuantity: number
  unit: string
  reason: 'low_stock' | 'out_of_stock' | 'upcoming_menu' | 'bulk_discount' | 'other'
  notes?: string
}

interface OrderSuggestion {
  itemId: string
  itemName: string
  currentStock: number
  minStock: number
  suggestedQuantity: number
  reason: 'below_minimum' | 'out_of_stock' | 'expiring_soon'
  urgency: 'low' | 'medium' | 'high'
}
```

#### **PurchaseOrder** - Заказ поставщику

```typescript
interface PurchaseOrder extends BaseEntity {
  // Заказ
  orderNumber: string // "PO-SUPPLIER-001"
  supplierId: string
  supplierName: string // кешированное название

  // Даты
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string

  // Товары
  items: PurchaseOrderItem[]

  // Финансы
  totalAmount: number
  taxAmount?: number
  discountAmount?: number

  // Платежи и доставка
  paymentTerms: 'prepaid' | 'on_delivery' | 'monthly'
  paymentStatus: 'pending' | 'partial' | 'paid'
  deliveryMethod: 'pickup' | 'delivery'

  // Статус заказа
  status: 'draft' | 'sent' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled'

  // Связи
  requestIds: string[] // Заявки, из которых создан этот PO
  receiptOperationId?: string // StorageOperation при приемке
  accountTransactionId?: string // Transaction при оплате

  // Документы
  hasExportedPdf?: boolean
  exportedAt?: string

  notes?: string
}

interface PurchaseOrderItem {
  id: string
  itemId: string
  itemName: string
  orderedQuantity: number
  receivedQuantity?: number // фактически получено
  unit: string
  pricePerUnit: number
  totalPrice: number

  // Статус по товару
  status: 'ordered' | 'partially_received' | 'received' | 'cancelled'
  notes?: string
}
```

#### **ReceiptAcceptance** - Акцепт прихода товара

```typescript
interface ReceiptAcceptance extends BaseEntity {
  // Основная информация
  acceptanceNumber: string // "ACC-PO-001"
  purchaseOrderId: string
  supplierId: string

  // Даты
  deliveryDate: string
  acceptedBy: string

  // Товары
  items: AcceptanceItem[]

  // Расхождения
  hasDiscrepancies: boolean
  totalDiscrepancies: number
  totalValueDifference: number

  // Статус
  status: 'draft' | 'accepted' | 'rejected'

  // Результат
  storageOperationId?: string // созданная операция Receipt в Storage
  correctionOperationIds: string[] // операции коррекции при расхождениях

  notes?: string
}

interface AcceptanceItem {
  id: string
  purchaseOrderItemId: string
  itemId: string
  itemName: string

  // Количества
  orderedQuantity: number
  deliveredQuantity: number
  acceptedQuantity: number

  // Качество
  quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected'

  // Расхождения
  quantityDiscrepancy: number // acceptedQuantity - orderedQuantity
  qualityIssues?: string

  // Финансы
  orderedPrice: number
  acceptedPrice?: number // если цена изменилась

  notes?: string
}
```

---

## 🔄 Workflow процессов

### **1. Создание заявки на заказ (Procurement Request)**

```
┌─────────────────────────────────────────────┐
│ Kitchen/Bar Manager                         │
│ ├─ Открывает "Order Assistant"             │
│ ├─ Система показывает:                     │
│ │  • Товары с низким остатком              │
│ │  • Товары с истекающим сроком           │
│ │  • Предложения на основе истории        │
│ ├─ Менеджер корректирует количества       │
│ ├─ Добавляет дополнительные товары        │
│ ├─ Сохраняет заявку                       │
│ └─ Отправляет на утверждение              │
└─────────────────────────────────────────────┘
```

### **2. Формирование заказов поставщикам (Purchase Orders)**

```
┌─────────────────────────────────────────────┐
│ Manager/Admin                               │
│ ├─ Просматривает заявки                   │
│ ├─ Группирует товары по поставщикам       │
│ ├─ Создает PO для каждого поставщика      │
│ ├─ Устанавливает цены и условия           │
│ ├─ Экспортирует в PDF                     │
│ ├─ Отправляет поставщику                  │
│ └─ Отслеживает статус заказа              │
└─────────────────────────────────────────────┘
```

### **3. Оплата заказов (Account Integration)**

```
┌─────────────────────────────────────────────┐
│ Finance Manager                             │
│ ├─ Видит заказы со статусом оплаты         │
│ ├─ Создает расходную операцию в Account    │
│ ├─ Связывает Transaction с PurchaseOrder   │
│ ├─ Обновляет статус оплаты заказа         │
│ └─ Отслеживает задолженности               │
└─────────────────────────────────────────────┘
```

### **4. Приемка товара (Receipt Acceptance)**

```
┌─────────────────────────────────────────────┐
│ Warehouse/Kitchen Staff                     │
│ ├─ Открывает заказ по QR коду или поиску   │
│ ├─ Сканирует/вводит фактически полученное  │
│ ├─ Отмечает качество товаров               │
│ ├─ Указывает расхождения                   │
│ ├─ Подтверждает акцепт                     │
│ ├─ Система создает Receipt в Storage        │
│ └─ Создает коррекции при расхождениях      │
└─────────────────────────────────────────────┘
```

---

## 🎨 UI Architecture & Navigation

### **Основной подход: Расширение + Новые модули**

#### **1. Расширяем StorageView:**

```
📦 Storage Management
├─ [Kitchen] [Bar] (департменты)
├─ Quick Actions: [🛒 Order Assistant] [📋 Count Inventory] ⬅️ ЗАМЕНЯЕТ "Add Products"
├─ Tabs: [Products] [Operations] [Inventories] [📦 Orders] ⬅️ НОВОЕ
```

#### **2. Создаем отдельный SupplierView:**

```
🏪 Suppliers & Procurement  ⬅️ НОВАЯ НАВИГАЦИЯ
├─ [Suppliers] [Purchase Orders] [Requests] [Acceptance]
```

### **Детальная схема UI:**

#### **StorageView (расширенный)**

```
┌─────────────────────────────────────────────┐
│ 📦 Storage Management                       │
│ ├─ Department Tabs: [Kitchen] [Bar]         │
│ ├─ Quick Actions:                          │
│ │  [🛒 Order Assistant] [📋 Count Inventory] │
│ │  ⬅️ Order Assistant ЗАМЕНЯЕТ Add Products │
│ │                                          │
│ ├─ Content Tabs:                           │
│ │  [Products] [Operations] [Inventories]    │
│ │  [📦 Orders] ⬅️ НОВАЯ ВКЛАДКА             │
│ │                                          │
│ ├─ Products Table (с новым столбцом):      │
│ │  Product | Stock | Ordered | Cost | Status│
│ │  🥩 Beef  | 2.5kg | 5kg    | 180k | OK   │
│ │  🥔 Potato| 15kg  | 10kg   | 8k   | OK   │
│ │  🧄 Garlic| 0.3kg | 2kg    | 25k  | ⚠️   │
│ │                                          │
│ └─ Новая вкладка "Orders":                 │
│    ├─ Current Orders для департмента        │
│    ├─ Pending Deliveries                   │
│    ├─ Quick Status Overview                │
│    └─ [Go to Full Procurement] button      │
└─────────────────────────────────────────────┘
```

#### **SupplierView (новый модуль)**

```
┌─────────────────────────────────────────────┐
│ 🏪 Suppliers & Procurement                  │
│ ├─ Main Tabs:                              │
│ │  [📋 Requests] [📦 Orders] [🏪 Suppliers] │
│ │  [📥 Acceptance] [📊 Analytics]           │
│ │                                          │
│ ├─ Quick Stats Bar:                        │
│ │  Pending Orders: 5 | Overdue: 2          │
│ │  This Month: 25M IDR | Outstanding: 5M   │
│ │                                          │
│ └─ Tab Content (зависит от выбранной)      │
└─────────────────────────────────────────────┘
```

---

### **Подробные UI компоненты:**

#### **1. StorageView - новая кнопка "Order Assistant"**

```
┌─────────────────────────────────────────────┐
│ Quick Actions:                              │
│ [🛒 Order Assistant] [📋 Count Inventory]   │
│ ⬅️ Order Assistant ЗАМЕНЯЕТ "Add Products"  │
└─────────────────────────────────────────────┘
```

#### **2. StorageView - новая вкладка "Orders"**

```
┌─────────────────────────────────────────────┐
│ 📦 Orders - Kitchen                         │
│ ├─ Current Status:                         │
│ │  ┌─ Quick Overview ─────────────────────┐ │
│ │  │ 🟡 Pending Requests: 2              │ │
│ │  │ 🔵 Confirmed Orders: 3              │ │
│ │  │ 🟢 Expected Today: 1                │ │
│ │  └─────────────────────────────────────┘ │
│ │                                          │
│ ├─ Recent Activity:                        │
│ │  Date     | Type     | Supplier | Status │
│ │  05.02.25 | PO-001  | Meat Co  | Transit│
│ │  04.02.25 | REQ-K-3 | -        | Draft  │
│ │                                          │
│ ├─ Ordered Items (showing ordered qty):    │
│ │  🥩 Beef: 5kg ordered (exp: 06.02)      │
│ │  🥔 Potato: 10kg ordered (exp: 07.02)   │
│ │                                          │
│ └─ [🛒 Create Order] [📋 View All Orders]  │
└─────────────────────────────────────────────┘
```

#### **3. OrderAssistantDialog (modal из StorageView)**

```
┌─────────────────────────────────────────────┐
│ 🛒 Order Assistant - Kitchen                │
│ ├─ Auto Suggestions:                       │
│ │  ┌─────────────────────────────────────┐ │
│ │  │ ⚠️ URGENT: Out of Stock             │ │
│ │  │ 🥩 Beef Steak: 0kg (min: 2kg)       │ │
│ │  │ Suggested: [5] kg                   │ │
│ │  │ Best supplier: Meat Co @180k/kg     │ │
│ │  │ [✓ Add to order]                    │ │
│ │  └─────────────────────────────────────┘ │
│ │                                          │
│ ├─ Manual Add: [+ Add item ▼]             │
│ ├─ Order Summary:                          │
│ │  • 3 items, est. 2.4M IDR               │
│ │  • 2 suppliers involved                 │
│ │                                          │
│ └─ [Cancel] [Create Request]               │
└─────────────────────────────────────────────┘
```

#### **4. SupplierView - Suppliers Tab**

```
┌─────────────────────────────────────────────┐
│ 🏪 Suppliers                                │
│ ├─ Filters: [Active ▼] [Category ▼] [📍]   │
│ ├─ Suppliers List:                         │
│ │  Name        | Products | Total Orders | Balance │
│ │  Meat Co     | 12       | 25 (15M)    | -2.5M   │
│ │  Veg Market  | 8        | 18 (8M)     | +500k   │
│ │  [View Details] [Create Order] [Statement]│
│ │                                          │
│ └─ [+ Add Supplier]                        │
└─────────────────────────────────────────────┘
```

#### **5. Supplier Details Dialog (статистика и дебет/кредит)**

```
┌─────────────────────────────────────────────┐
│ 🏪 Meat Company - Details                   │
│ ├─ Tabs: [Info] [Orders] [Payments] [Products]│
│ │                                          │
│ ├─ Financial Summary:                      │
│ │  ┌─ Balance ─────────────────────────────┐│
│ │  │ Current Balance: -2,500,000 IDR       ││
│ │  │ (We owe them)                         ││
│ │  │                                       ││
│ │  │ Total Ordered: 15,200,000 IDR         ││
│ │  │ Total Paid:    12,700,000 IDR         ││
│ │  │ Outstanding:    2,500,000 IDR         ││
│ │  └───────────────────────────────────────┘│
│ │                                          │
│ ├─ Recent Transactions:                    │
│ │  Date     | Type    | Amount    | Balance│
│ │  05.02.25 | Order   | -900,000  | -2.5M │
│ │  03.02.25 | Payment | +2,000,000| -1.6M │
│ │  01.02.25 | Order   | -1,200,000| -3.6M │
│ │                                          │
│ └─ [Create Payment] [Download Statement]   │
└─────────────────────────────────────────────┘
```

#### **6. SupplierView - Purchase Orders Tab**

```
┌─────────────────────────────────────────────┐
│ 📦 Purchase Orders                          │
│ ├─ Filters: [Status ▼] [Supplier ▼] [Date] │
│ ├─ Orders Table:                           │
│ │  PO#      | Supplier | Amount | Status  | Actions│
│ │  PO-001   | Meat Co  | 2.4M   | Transit | [Accept]│
│ │  PO-002   | Veg Ltd  | 890k   | Sent    | [Track] │
│ │  PO-003   | Meat Co  | 1.2M   | Draft   | [Send]  │
│ │                                          │
│ ├─ Quick Actions:                          │
│ │  [📧 Export to PDF] [💰 Mark Paid]       │
│ │  [📦 Start Acceptance]                   │
│ │                                          │
│ └─ [+ Create Order from Requests]          │
└─────────────────────────────────────────────┘
```

---

### **Navigation Structure:**

```
🏠 Dashboard
📦 Storage          ⬅️ РАСШИРЯЕМ (добавляем Order Assistant + Orders tab)
🏪 Procurement      ⬅️ НОВЫЙ (Suppliers & Orders management)
💰 Accounts         ⬅️ СУЩЕСТВУЮЩИЙ
👥 Staff
📊 Reports
⚙️ Settings
```

---

### **Workflow между модулями:**

```
1. Storage → Order Assistant → Создает Procurement Request
2. Storage → Orders Tab → Показывает статус заказов для департмента
3. Procurement → Requests → Управление всеми заявками
4. Procurement → Orders → Создание PO из заявок
5. Procurement → Suppliers → Управление поставщиками + финансы
6. Procurement → Acceptance → Приемка товара → создает Receipt в Storage
```

---

## 🔄 Интеграция с существующими Store

### **StorageStore Updates**

```typescript
// Обновляем StorageBalance - добавляем столбец "Ordered"
interface StorageBalance {
  // ... существующие поля

  // ✅ НОВОЕ: Заказанные товары для отображения в таблице
  orderedQuantity: number // общее количество заказано (сумма всех активных заказов)
  orderedDetails?: OrderedItem[] // детали заказов для tooltip/подробностей
}

interface OrderedItem {
  purchaseOrderId: string
  purchaseOrderNumber: string // "PO-MEAT-001"
  quantity: number
  expectedDate: string
  supplierName: string
  status: 'ordered' | 'confirmed' | 'in_transit'
}

// Обновляем заголовки таблицы в StorageStockTable
const headers = [
  { title: 'Product', key: 'itemName', sortable: true, width: '250px' },
  { title: 'Stock', key: 'stock', sortable: false, width: '150px' },
  { title: 'Ordered', key: 'ordered', sortable: false, width: '150px' }, // ✅ НОВЫЙ СТОЛБЕЦ
  { title: 'Cost', key: 'cost', sortable: true, width: '180px' },
  { title: 'Total Value', key: 'totalValue', sortable: true, width: '150px' },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '60px' }
]

// Новые методы в StorageStore
function getItemsNeedingReorder(department: StorageDepartment): ReorderSuggestion[]
function updateOrderedQuantity(itemId: string, department: StorageDepartment, quantity: number)
function getOrderedQuantity(itemId: string, department: StorageDepartment): number
function processDeliveryReceipt(acceptanceData: ReceiptAcceptance): StorageOperation
```

### **AccountStore Integration**

```typescript
// Новые методы для работы с поставщиками
function createSupplierPayment(purchaseOrderId: string, amount: number): Transaction
function getSupplierBalance(supplierId: string): number
function getOverduePayments(): PurchaseOrder[]
```

---

## 📊 Store Structure

### **SupplierStore State**

```typescript
interface SupplierState {
  // Core data
  suppliers: Supplier[]
  procurementRequests: ProcurementRequest[]
  purchaseOrders: PurchaseOrder[]
  receiptAcceptances: ReceiptAcceptance[]

  // UI state
  loading: {
    suppliers: boolean
    requests: boolean
    orders: boolean
    acceptance: boolean
  }
  error: string | null

  // Current workflow
  currentRequest?: ProcurementRequest
  currentOrder?: PurchaseOrder
  currentAcceptance?: ReceiptAcceptance

  // Filters
  filters: {
    department: StorageDepartment | 'all'
    supplier: string | 'all'
    status: string | 'all'
    dateFrom?: string
    dateTo?: string
  }
}
```

### **Key Methods**

```typescript
// Suppliers
async function createSupplier(data: CreateSupplierData): Promise<Supplier>
async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void>
function getSupplierProducts(supplierId: string): Product[]

// Procurement Requests
async function createRequest(department: StorageDepartment): Promise<ProcurementRequest>
async function getOrderSuggestions(department: StorageDepartment): Promise<OrderSuggestion[]>
async function submitRequest(requestId: string): Promise<void>

// Purchase Orders
async function createPurchaseOrder(requestIds: string[], supplierId: string): Promise<PurchaseOrder>
async function sendPurchaseOrder(orderId: string): Promise<void>
async function exportPurchaseOrderPdf(orderId: string): Promise<Blob>

// Receipt Acceptance
async function startAcceptance(purchaseOrderId: string): Promise<ReceiptAcceptance>
async function processAcceptance(acceptanceId: string): Promise<StorageOperation[]>
```

---

## 📋 Implementation Plan

### **Week 1: Core Infrastructure**

- [ ] Создание типов и интерфейсов
- [ ] SupplierStore с базовой логикой
- [ ] Mock данные для поставщиков
- [ ] Базовый SupplierService

### **Week 2: Request & Order Management**

- [ ] OrderAssistantDialog с suggestions
- [ ] ProcurementRequestsTable
- [ ] PurchaseOrderDialog
- [ ] Интеграция с StorageStore для остатков

### **Week 3: Receipt & Acceptance**

- [ ] ReceiptAcceptanceDialog (на основе InventoryDialog)
- [ ] Интеграция с StorageStore для создания Receipt операций
- [ ] Workflow статусов заказов

### **Week 4: Financial Integration**

- [ ] Интеграция с AccountStore
- [ ] Отслеживание платежей
- [ ] PDF экспорт заказов
- [ ] Дашборд с аналитикой

### **Week 5: Polish & Testing**

- [ ] Тестирование полного workflow
- [ ] Оптимизация производительности
- [ ] UX улучшения
- [ ] Документация

---

## 🎯 Success Criteria

### **Functional Requirements:**

- ✅ Быстрое создание заявок с помощником заказов
- ✅ Группировка заявок по поставщикам в PO
- ✅ Отслеживание статусов от заявки до прихода товара
- ✅ Акцепт с возможностью коррекций
- ✅ Интеграция с финансовой системой

### **User Experience:**

- ✅ Интуитивный интерфейс как в InventoryDialog
- ✅ Быстрый доступ к часто заказываемым товарам
- ✅ Четкое отображение статусов и алертов
- ✅ Удобный PDF экспорт для отправки поставщикам

### **Business Logic:**

- ✅ FIFO принцип при создании Receipt операций
- ✅ Автоматические предложения на основе минимальных остатков
- ✅ Отслеживание заказанных товаров в балансах
- ✅ Правильная интеграция с Account для платежей

---

Эта спецификация обеспечивает полный цикл управления закупками от заявки до прихода товара, интегрируясь с существующими StorageStore и AccountStore, и предоставляя удобные инструменты для быстрого заказа продуктов.
