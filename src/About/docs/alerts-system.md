# Operations Alerts System

Централизованная система уведомлений для событий, требующих внимания менеджера/администратора.

## Обзор

Система Alerts предназначена для:

- Отслеживания подозрительной активности (fraud detection)
- Уведомления о критических операционных событиях
- Мониторинга расхождений в учёте

## Архитектура

```
src/stores/alerts/
├── index.ts                    # Экспорты
├── types.ts                    # Типы, интерфейсы, константы
├── alertsStore.ts              # Pinia store
└── services/
    └── alertsService.ts        # Supabase операции

src/views/backoffice/alerts/
├── AlertsView.vue              # Главный dashboard
└── components/
    ├── AlertCard.vue           # Карточка алерта
    └── AlertFilters.vue        # Фильтры

src/components/navigation/
└── OperationsAlertsBadge.vue   # Badge в навигации
```

## Категории алертов

| Категория    | Цвет             | Иконка                             | Назначение                         |
| ------------ | ---------------- | ---------------------------------- | ---------------------------------- |
| **shift**    | Purple `#9C27B0` | `mdi-clock-alert`                  | События смены (fraud, расхождения) |
| **account**  | Orange `#FF9800` | `mdi-bank-alert`                   | Финансовые операции                |
| **product**  | Teal `#009688`   | `mdi-package-variant-closed-alert` | Отмены, списания                   |
| **supplier** | Blue `#2196F3`   | `mdi-truck-alert`                  | Поставки, платежи                  |

## Типы алертов

### SHIFT (Смена)

| Тип                   | Severity | Описание                               | Статус         |
| --------------------- | -------- | -------------------------------------- | -------------- |
| `pre_bill_modified`   | critical | Изменение заказа после печати pre-bill | ✅ Реализовано |
| `cash_discrepancy`    | warning  | Расхождение кассы при закрытии смены   | ⏳ Планируется |
| `large_refund`        | warning  | Любой возврат платежа                  | ✅ Реализовано |
| `suspicious_activity` | critical | Другая подозрительная активность       | ⏳ Планируется |

### ACCOUNT (Счета)

| Тип                   | Severity | Описание                              | Статус         |
| --------------------- | -------- | ------------------------------------- | -------------- |
| `manual_correction`   | warning  | Ручная корректировка баланса          | ✅ Реализовано |
| `balance_discrepancy` | critical | Расхождение расчётного и фактического | ⏳ Планируется |
| `unusual_transfer`    | info     | Нетипичный перевод (>5M IDR)          | ⏳ Планируется |

### PRODUCT (Продукты)

| Тип                   | Severity | Описание                   | Статус         |
| --------------------- | -------- | -------------------------- | -------------- |
| `high_cancellation`   | warning  | Много отмен за смену (>5)  | ⏳ Планируется |
| `write_off_threshold` | warning  | Списание выше нормы (>10%) | ⏳ Планируется |
| `negative_inventory`  | critical | Отрицательный остаток      | ⏳ Планируется |

### SUPPLIER (Поставщики)

| Тип                   | Severity | Описание                      | Статус         |
| --------------------- | -------- | ----------------------------- | -------------- |
| `payment_discrepancy` | warning  | Платёж не соответствует счёту | ⏳ Планируется |
| `overdue_delivery`    | info     | Просроченная поставка         | ⏳ Планируется |

## Реализованные проверки

### 1. Pre-Bill Modified (Fraud Detection)

**Файл:** `src/views/pos/order/OrderSection.vue`

**Логика:**

1. При печати Pre-Bill сохраняется snapshot (hash, сумма, количество позиций)
2. При оплате сравнивается текущее состояние со snapshot
3. Если обнаружены изменения - создаётся alert

**Отслеживаемые изменения:**

- Удаление позиций (critical)
- Уменьшение количества (critical)
- Добавление скидки после печати (critical)
- Уменьшение суммы заказа (critical)

---

### 2. Manual Correction (Account Balance)

**Файл:** `src/stores/account/store.ts` → `correctBalance()`

**Логика:**

- При ручной корректировке баланса счёта создаётся alert
- Фиксируется: предыдущий баланс, новый баланс, разница, причина

**Metadata:**

- `accountId`, `accountName` - какой счёт
- `previousBalance`, `newBalance`, `correctionAmount` - суммы
- `reason` - причина корректировки

---

### 3. Payment Refund

**Файл:** `src/stores/pos/payments/paymentsStore.ts` → `processRefund()`

**Логика:**

- При любом возврате платежа создаётся alert
- Не зависит от суммы - все refund'ы логируются

**Metadata:**

- `paymentNumber` - номер платежа
- `originalPaymentId` - ID оригинального платежа
- `refundAmount` - сумма возврата
- `method` - способ оплаты (cash, card, qr)
- `reason` - причина возврата
- `refundedBy` - кто выполнил возврат

## Как добавить новый алерт

### 1. Добавить тип (если нужен новый)

В `src/stores/alerts/types.ts`:

```typescript
// Добавить в соответствующий union type
export type ShiftAlertType = 'pre_bill_modified' | 'cash_discrepancy' | 'your_new_type' // <-- добавить

// Добавить label
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  // ...
  your_new_type: 'Your New Alert Type'
}
```

### 2. Создать алерт в коде

```typescript
import { useAlertsStore } from '@/stores/alerts'

const alertsStore = useAlertsStore()

// Создание алерта
await alertsStore.createAlert({
  // Обязательные поля
  category: 'shift', // 'shift' | 'account' | 'product' | 'supplier'
  type: 'your_new_type', // Тип из AlertType
  severity: 'warning', // 'critical' | 'warning' | 'info'
  title: 'Краткое описание', // Показывается в списке

  // Опциональные поля
  description: 'Детальное описание события',
  metadata: {
    // Любые дополнительные данные
    amount: 150000,
    orderId: 'ORD-123'
    // ...
  },

  // Контекст (для связи с другими сущностями)
  shiftId: shiftsStore.currentShift?.id,
  orderId: order.id,
  billId: bill.id,
  userId: authStore.currentUser?.id
})
```

### 3. Примеры типичных алертов

**Cash Discrepancy (при закрытии смены):**

```typescript
await alertsStore.createAlert({
  category: 'shift',
  type: 'cash_discrepancy',
  severity: 'warning',
  title: 'Cash count mismatch',
  description: `Expected: ${formatIDR(expected)}, Actual: ${formatIDR(actual)}`,
  metadata: {
    expectedAmount: expected,
    actualAmount: actual,
    difference: actual - expected
  },
  shiftId: shift.id,
  userId: authStore.currentUser?.id
})
```

**Large Refund:**

```typescript
if (refundAmount > ALERT_THRESHOLDS.largeRefundAmount) {
  await alertsStore.createAlert({
    category: 'shift',
    type: 'large_refund',
    severity: 'warning',
    title: 'Large refund processed',
    description: `Refund of ${formatIDR(refundAmount)} on order ${orderNumber}`,
    metadata: {
      amount: refundAmount,
      reason: refundReason
    },
    shiftId: currentShift.id,
    orderId: order.id,
    userId: authStore.currentUser?.id
  })
}
```

**Negative Inventory:**

```typescript
await alertsStore.createAlert({
  category: 'product',
  type: 'negative_inventory',
  severity: 'critical',
  title: 'Negative stock detected',
  description: `${product.name}: ${quantity} ${product.unit}`,
  metadata: {
    productId: product.id,
    productName: product.name,
    quantity: quantity
  }
})
```

## Workflow статусов

```
NEW → VIEWED → ACKNOWLEDGED → RESOLVED
```

- **new** - Только создан, никто не видел
- **viewed** - Просмотрен (автоматически при открытии)
- **acknowledged** - Менеджер подтвердил, что видел
- **resolved** - Проблема решена (с комментарием)

## API Store

```typescript
const alertsStore = useAlertsStore()

// Получить все алерты
await alertsStore.fetchAlerts({ category: 'shift', status: 'new' })

// Создать алерт
await alertsStore.createAlert({ ... })

// Подтвердить
await alertsStore.acknowledgeAlert(alertId, userId)

// Решить с комментарием
await alertsStore.resolveAlert(alertId, userId, 'Проверено, всё ок')

// Пометить как просмотренные
await alertsStore.markAsViewed([alertId1, alertId2])

// Computed
alertsStore.newAlerts        // Алерты со статусом 'new'
alertsStore.alertCounts      // Счётчики по категориям
alertsStore.hasNewAlerts     // Есть ли новые алерты
```

## База данных

Таблица: `operations_alerts`

```sql
CREATE TABLE operations_alerts (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,        -- 'shift', 'account', 'product', 'supplier'
  type TEXT NOT NULL,            -- Тип алерта
  severity TEXT NOT NULL,        -- 'critical', 'warning', 'info'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,                -- Дополнительные данные

  shift_id UUID,                 -- Связь со сменой
  order_id UUID,                 -- Связь с заказом
  bill_id UUID,                  -- Связь со счётом
  user_id UUID,                  -- Кто вызвал алерт

  status TEXT DEFAULT 'new',     -- Статус workflow
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Пороговые значения

Настраиваются в `types.ts`:

```typescript
export const ALERT_THRESHOLDS = {
  largeRefundAmount: 500000, // IDR
  highCancellationCount: 5, // штук за смену
  writeOffPercentage: 10, // % от запасов
  unusualTransferAmount: 5000000 // IDR
}
```

## UI

- **NavigationMenu** - Badge с количеством новых алертов (первый пункт меню)
- **AlertsView** (`/alerts`) - Dashboard со списком и фильтрами
- **AlertCard** - Карточка с действиями (Acknowledge, Resolve, View Order)
