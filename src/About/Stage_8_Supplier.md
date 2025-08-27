# Supplier Store Integration Plan

## Цель

Создать полную интеграцию Supplier Store с остальными модулями системы для реального управления поставками и учета.

## Текущее состояние

- ✅ Базовая структура Supplier Store готова (запросы → заказы → поступления)
- ❌ Используются mock данные для цен продуктов
- ❌ Нет интеграции с Account Store для счетов
- ❌ Нет интеграции с Storage Store для остатков
- ❌ Нет интеграции с Products Store для обновления цен

## Этапы интеграции

### Этап 1: Интеграция с Storage Store (ПРИОРИТЕТ)

**Цель:** Реальное управление остатками и цены из истории поступлений

#### 1.1 Обновление OrderSuggestions

- [ ] Получать текущие остатки из Storage Store
- [ ] Рассчитывать предложения на основе реальных минимальных остатков
- [ ] Использовать последние цены поступлений

#### 1.2 Создание операций поступления

- [ ] При завершении Receipt создавать операцию в Storage Store
- [ ] Передавать правильные данные о количестве и цене
- [ ] Обновлять базовые цены продуктов

#### 1.3 FIFO списание при использовании

- [ ] Интегрировать с партиями (batches) из Storage Store
- [ ] Правильное списание по FIFO при отгрузке

### Этап 2: Интеграция с Products Store

**Цель:** Синхронизация цен и данных продуктов

#### 2.1 Получение актуальных цен

- [ ] Заменить mock цены на реальные из Products Store
- [ ] Использовать baseCostPerUnit для расчетов
- [ ] Интегрировать с базовыми единицами измерения

#### 2.2 Обновление цен при поступлении

- [ ] При завершении Receipt обновлять цены в Products Store
- [ ] Уведомлять Recipe Store о изменении цен
- [ ] Ведение истории цен

### Этап 3: Интеграция с Account Store

**Цель:** Автоматическое создание счетов и оплат

#### 3.1 Создание счетов при заказе

- [ ] При создании Purchase Order автоматически создавать PendingPayment
- [ ] Передавать правильные данные поставщика
- [ ] Связывать заказ со счетом

#### 3.2 Обработка оплат

- [ ] Обновлять статус заказа при оплате счета
- [ ] Разрешать поступление только оплаченных заказов
- [ ] Ведение истории платежей

### Этап 4: Интеграция с Counteragents Store

**Цель:** Управление поставщиками

#### 4.1 Получение данных поставщиков

- [ ] Заменить mock данных поставщиков на реальные
- [ ] Использовать правильные условия оплаты
- [ ] Фильтрация поставщиков по категориям товаров

#### 4.2 Статистика по поставщикам

- [ ] Ведение истории заказов по поставщикам
- [ ] Анализ качества поставок
- [ ] Рейтинг поставщиков

---

## Детальный план Этапа 1: Storage Store Integration

### 1.0 Дополнение MockDataCoordinator

```typescript
// В mockDataCoordinator.ts
class MockDataCoordinator {
  private supplierStoreData: {
    requests: ProcurementRequest[]
    orders: PurchaseOrder[]
    receipts: Receipt[]
    suggestions: OrderSuggestion[]
  } | null = null

  getSupplierStoreData() {
    if (!this.supplierStoreData) {
      this.supplierStoreData = this.generateSupplierStoreData()
    }
    return this.supplierStoreData
  }

  private generateSupplierStoreData() {
    const suggestions = this.generateSuggestionsFromStorage()
    const requests = this.generateRealisticRequests(suggestions)
    const orders = this.generateOrdersFromRequests(requests)
    const receipts = this.generateReceiptsFromOrders(orders)

    return { requests, orders, receipts, suggestions }
  }

  private generateSuggestionsFromStorage(): OrderSuggestion[] {
    const storageData = this.getStorageStoreData() // Используем существующие Storage mock данные
    const products = this.getProductsStoreData().products

    return products
      .filter(product => this.shouldSuggestReorder(product, storageData))
      .map(product => this.createSuggestionFromProduct(product, storageData))
  }
}
```

### 1.1 Файлы для изменения:

#### A. `useOrderAssistant.ts`

```typescript
// БЫЛО
function getEstimatedPrice(itemId: string): number {
  const suggestion = suggestions.value.find(s => s.itemId === itemId)
  return suggestion?.estimatedPrice || 0
}

// БУДЕТ
import { useStorageStore } from '@/stores/storage'
const storageStore = useStorageStore()

function getEstimatedPrice(itemId: string): number {
  const balance = storageStore.getBalance(itemId, selectedDepartment.value)
  return balance?.latestCost || 0
}
```

#### B. `supplierService.ts`

```typescript
// Добавить метод генерации предложений на основе Storage
async getOrderSuggestions(department?: 'kitchen' | 'bar'): Promise<OrderSuggestion[]> {
  const storageStore = useStorageStore()
  const balances = storageStore.departmentBalances(department)

  return balances
    .filter(balance => balance.belowMinStock || balance.totalQuantity === 0)
    .map(balance => ({
      itemId: balance.itemId,
      itemName: balance.itemName,
      currentStock: balance.totalQuantity,
      minStock: getMinStock(balance.itemId), // из Products Store
      suggestedQuantity: calculateSuggestedQuantity(balance),
      urgency: balance.totalQuantity === 0 ? 'high' : 'medium',
      reason: balance.totalQuantity === 0 ? 'out_of_stock' : 'below_minimum',
      estimatedPrice: balance.latestCost,
      lastPriceDate: balance.newestBatchDate
    }))
}
```

#### C. `useReceipts.ts`

```typescript
// Добавить создание операции поступления
import { useStorageStore } from '@/stores/storage'

async function createStorageOperation(receipt: Receipt) {
  const storageStore = useStorageStore()
  const order = supplierStore.getOrderById(receipt.purchaseOrderId)

  const createData: CreateReceiptData = {
    department: getDepartmentFromOrder(order),
    responsiblePerson: receipt.receivedBy,
    items: receipt.items.map(item => ({
      itemId: item.itemId,
      quantity: item.receivedQuantity,
      costPerUnit: item.actualPrice || item.orderedPrice,
      notes: `Receipt ${receipt.receiptNumber}`
    }))
  }

  const operation = await storageStore.createReceipt(createData)
  return operation.id
}
```

### 1.2 Новые типы интеграции:

#### `supplierStorageTypes.ts`

```typescript
// Типы для интеграции с Storage Store
export interface SupplierStorageIntegration {
  createReceiptOperation(receipt: Receipt): Promise<string>
  updateProductCosts(items: ReceiptItem[]): Promise<void>
  getLatestPrices(itemIds: string[]): Promise<Record<string, number>>
  getSuggestionsFromStock(department: Department): Promise<OrderSuggestion[]>
}
```

### 1.3 Тесты интеграции:

- [ ] Тест создания операции поступления
- [ ] Тест обновления цен после поступления
- [ ] Тест генерации предложений на основе остатков
- [ ] Тест FIFO списания при использовании

---

## Ожидаемые результаты после Этапа 1:

1. **Реальные остатки:** Order Assistant показывает актуальные остатки со склада
2. **Актуальные цены:** Используются последние цены поступлений
3. **Автоматические операции:** Поступления создают операции в Storage Store
4. **Обновление цен:** Новые цены автоматически обновляются в Products Store

---

## Следующие этапы:

После завершения Этапа 1 переходим к:

- **Этап 2:** Products Store Integration
- **Этап 3:** Account Store Integration
- **Этап 4:** Counteragents Store Integration

---

## Критерии готовности:

### Этап 1 готов когда:

- [ ] Order Assistant получает данные из Storage Store
- [ ] Receipt создает операцию поступления в Storage Store
- [ ] Цены продуктов обновляются при поступлении
- [ ] Все тесты интеграции проходят
- [ ] Mock данные заменены на реальные

### Общая готовность когда:

- [ ] Полный workflow: заказ → оплата → поступление → склад
- [ ] Все цены синхронизированы между модулями
- [ ] История операций ведется корректно
- [ ] Интеграционные тесты покрывают все сценарии
