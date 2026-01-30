# Payment System Architecture

**Last Updated:** 2026-01-29 (Post-Migration 114 & 115)
**Author:** Development Team
**Status:** Active
**Version:** 2.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Transaction vs PendingPayment](#transaction-vs-pendingpayment)
4. [Payment Sources (POS vs Backoffice)](#payment-sources-pos-vs-backoffice)
5. [Payment Lifecycle](#payment-lifecycle)
6. [Pre-Allocation Feature](#pre-allocation-feature)
7. [Linking & Unlinking](#linking--unlinking)
8. [Cashier Account (Special Account)](#cashier-account-special-account)
9. [Partial Payments & Overpayments](#partial-payments--overpayments)
10. [Code Examples](#code-examples)
11. [Database Schema](#database-schema)
12. [Common Scenarios](#common-scenarios)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)
15. [Recent Improvements](#recent-improvements)

---

## Overview

Kitchen App использует **двухуровневую систему управления платежами**:

1. **Transaction** - ФАКТ движения денег (accounting ledger)
2. **PendingPayment** - РАСПРЕДЕЛЕНИЕ платежей по заказам (allocation manager)

### Key Insight

**PendingPayment НЕ означает "ожидающий платеж"!**

- `status='pending'` - Планируется оплатить (создан до факта платежа)
- `status='completed'` - УЖЕ оплачен, готов к распределению по Purchase Orders

### Three Payment Creation Flows

1. **POS → Supplier Payment** - Cashier pays supplier from cash register
2. **Backoffice → Supplier Payment** - Manager creates and processes payment
3. **Purchase Order → Pending Payment** - Manager creates payment plan from PO

---

## Core Concepts

### 1. Two Entities - Two Roles

#### Transaction (таблица `transactions`)

**Роль:** Бухгалтерская книга (ledger)

- Фиксирует ФАКТ движения денег
- Иммутабельная (почти) - история операций
- Привязана к Account (кассе, банку, etc.)
- Создается в момент оплаты

**Ключевые поля:**

- `id` - Уникальный ID транзакции
- `account_id` - Счет (касса, банк)
- `amount` - Сумма (отрицательная для расходов)
- `type` - 'income' | 'expense' | 'transfer'
- `expense_category` - `{type: 'expense', category: 'supplier'}` для supplier expenses
- `related_payment_id` - Линк к PendingPayment (для supplier expenses)
- `status` - 'completed' | 'pending' | 'cancelled'
- `balance_after` - Баланс счета после операции

#### PendingPayment (таблица `pending_payments`)

**Роль:** Payment Allocation Manager

- Управляет РАСПРЕДЕЛЕНИЕМ платежей по Purchase Orders
- Позволяет частичные оплаты (partial payments)
- Позволяет переплаты (overpayments - один платеж на несколько заказов)
- Отслеживает `usedAmount` и `linkedOrders`
- **✨ NEW:** Отслеживает источник создания (`source`: 'pos' | 'backoffice')

**Ключевые поля:**

- `id` - Уникальный ID платежа
- `amount` - Полная сумма платежа
- `used_amount` - Сколько уже распределено по заказам
- `linked_orders` - JSONB массив связанных заказов
- `status` - 'pending' | 'completed' | 'cancelled'
- `category` - 'supplier' | 'customer' | 'other'
- `source` - **✨ NEW:** 'pos' | 'backoffice' (откуда создан платеж)
- `assigned_to_account` - Счет, с которого оплачен (если completed)
- `paid_amount` - Реально оплаченная сумма
- `paid_date` - Дата оплаты
- `source_order_id` - Заказ, из которого создан платеж (для auto-sync)
- `auto_sync_enabled` - Разрешена ли автосинхронизация суммы

---

## Transaction vs PendingPayment

### When Transaction is Created

**1. POS Supplier Expense (Direct Cash Payment)**

```typescript
// User pays supplier directly from cash register
// Creates Transaction immediately
const transaction = await accountStore.createOperation({
  accountId: 'acc_cash_register',
  type: 'expense',
  amount: -100000, // Negative for expense
  description: "Bu'Dewa vegetables",
  expenseCategory: { type: 'expense', category: 'supplier' },
  counteragentId: 'ca_budewa',
  counteragentName: "Bu'Dewa",
  source: 'pos' // ✨ NEW: Mark as POS payment
})

// Also creates PendingPayment with status='completed'
const payment = await accountStore.createSupplierExpenseWithPayment({
  amount: 100000,
  counteragentId: 'ca_budewa',
  source: 'pos' // ✨ NEW: Tracks payment origin
  // ... payment is COMPLETED (already paid from cash)
})

// Link them
transaction.related_payment_id = payment.id
```

**2. Backoffice Payment Creation (Planning to Pay)**

```typescript
// Manager creates payment plan for supplier
const payment = await paymentService.createPayment({
  amount: 1000000,
  counteragentId: 'ca_budewa',
  category: 'supplier',
  status: 'pending', // Not yet paid
  priority: 'high',
  source: 'backoffice' // ✨ NEW: Created from Backoffice
})

// NO Transaction yet - will be created when actually paid
```

**3. Payment Execution (Pending → Completed)**

```typescript
// Cashier processes pending payment
const payment = await paymentService.processPayment({
  paymentId: 'pp_xyz',
  accountId: 'acc_cash_register',
  amount: 1000000
})

// NOW creates Transaction
const transaction = await accountStore.createOperation({
  accountId: 'acc_cash_register',
  type: 'expense',
  amount: -1000000,
  related_payment_id: payment.id,
  source: payment.source // Preserve original source
})

payment.status = 'completed'
payment.assigned_to_account = 'acc_cash_register'
payment.paid_amount = 1000000
payment.paid_date = new Date()
```

---

## Payment Sources (POS vs Backoffice)

### ✨ NEW: Source Field (Migration 114)

Starting 2026-01-29, all payments track WHERE they were created:

- `source='pos'` - Created from POS cash register (shiftsStore)
- `source='backoffice'` - Created from Backoffice interface (accountStore)

**Why This Matters:**

- **UI Display:** Shows "Unlinked (POS)" vs "Unlinked (Backoffice)" badges
- **Reporting:** Separate POS payments from Backoffice payments
- **Audit Trail:** Know which interface created the payment
- **Persistence:** Survives localStorage clear and app restarts

### Implementation Details

**Database Schema:**

```sql
-- Migration 114: Add source field
ALTER TABLE pending_payments
ADD COLUMN source TEXT DEFAULT 'backoffice'
CHECK (source IN ('pos', 'backoffice'));

-- Index for performance
CREATE INDEX idx_pending_payments_source
ON pending_payments (source)
WHERE status = 'completed';
```

**Code Examples:**

```typescript
// POS payment creation
// src/stores/pos/shifts/shiftsStore.ts:691
const { payment } = await accountStore.createSupplierExpenseWithPayment({
  // ... other fields
  source: 'pos' // ✅ Mark as POS payment
})

// Backoffice payment creation
// src/stores/account/store.ts:1950
const payment = await paymentService.createPayment({
  // ... other fields
  source: data.source || 'backoffice' // ✅ Default to backoffice
})

// UI display
// src/stores/pos/shifts/composables/useExpenseLinking.ts:54
sourceType: payment.source || 'backoffice' // ✅ Use database field
```

**Historical Data:**

Migration 114 backfilled existing payments using heuristic:

- Payments assigned to cash accounts (`type='cash'`) → `source='pos'`
- All other payments → `source='backoffice'`

Result: 19 POS payments, 61 Backoffice payments identified

---

## Payment Lifecycle

### Scenario 1: POS Direct Payment (Completed Immediately)

```
1. Cashier pays supplier from register
   └─> Transaction created (balance updated)
   └─> PendingPayment created (status='completed', source='pos')
   └─> Transaction.related_payment_id = Payment.id

2. Manager links payment to Purchase Orders (later)
   └─> Payment.linked_orders updated
   └─> Payment.used_amount increased
   └─> Order.bill_status updated ('not_billed' → 'partially_paid')
```

### Scenario 2: Backoffice Planned Payment

```
1. Manager creates payment plan
   └─> PendingPayment created (status='pending', source='backoffice')
   └─> NO Transaction yet

2. Cashier executes payment
   └─> Transaction created (balance updated)
   └─> Payment.status = 'completed'
   └─> Transaction.related_payment_id = Payment.id

3. Manager links to Purchase Orders (or auto-link if source_order_id set)
   └─> Payment.linked_orders updated
   └─> Order.bill_status updated
```

### Scenario 3: Purchase Order Payment Creation

```
1. Manager opens PO details, clicks "Create New Bill"
   └─> PendingPayment created (status='pending', source='backoffice')
   └─> sourceOrderId = PO.id (for auto-sync)
   └─> autoSyncEnabled = true
   └─> linkedOrders = [{ orderId: PO.id, linkedAmount: PO.totalAmount }]
   └─> This is PRE-ALLOCATION (payment planned but not yet paid)

2. During priemka, if order amount changes
   └─> Auto-sync updates payment.amount to match order
   └─> linkedOrders[0].linkedAmount updated
   └─> User notified of auto-sync

3. Later: Click "Process Payment" button
   └─> Transaction created
   └─> Payment.status = 'completed'
   └─> Order.bill_status = 'fully_paid'
```

---

## Pre-Allocation Feature

### ✅ Pending Payments CAN Have linkedOrders

**This is NOT a bug - it's a feature!**

**Use Case:** Manager creates payment plan for specific Purchase Order BEFORE paying:

```typescript
// Step 1: Create pending payment with pre-allocation
const payment = await accountStore.createBillFromOrder(order)

// Result:
{
  status: 'pending', // Not yet paid
  amount: 1000000,
  linkedOrders: [{ // PRE-ALLOCATED to order
    orderId: 'po_123',
    linkedAmount: 1000000,
    isActive: true
  }],
  sourceOrderId: 'po_123', // Source for auto-sync
  autoSyncEnabled: true
}

// Step 2: If order amount changes during priemka
order.totalAmount = 1200000 // Price increase
// Auto-sync triggered:
payment.amount = 1200000 // ✅ Updated automatically
payment.linkedOrders[0].linkedAmount = 1200000

// Step 3: Process payment
await processPayment({ paymentId: payment.id, ... })
payment.status = 'completed' // ✅ Now it's paid
```

**Benefits:**

- ✅ Plan payments before execution
- ✅ Auto-sync with order amount changes
- ✅ Clear connection: "This payment is FOR this order"
- ✅ Prevents linking wrong payment to wrong order

**Implementation:**

- UI: `src/views/supplier_2/components/orders/order/PurchaseOrderPayment.vue`
- Backend: `src/stores/supplier_2/integrations/accountIntegration.ts:38-87`
- Auto-sync: `accountIntegration.ts:93`

---

## Linking & Unlinking

### Linking Payment to Order

**Purpose:** Allocate payment amount to specific Purchase Order(s)

**Process:**

1. Find unlinked payment (completed, has available amount)
2. Select Purchase Order to link
3. Specify link amount (can be partial)
4. Update payment and order

**Code:**

```typescript
await accountStore.linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_123',
  orderNumber: 'PO-2024-001',
  linkAmount: 600000
})

// What happens:
// 1. Payment.linked_orders += {orderId, linkedAmount, isActive: true}
// 2. Payment.used_amount += linkAmount
// 3. Order.bill_status updated (calculateOrderBillStatus)
// 4. If payment from POS expense: update expense.linkingStatus
```

**Bill Status Calculation:**

```typescript
const totalPaid = payment.linkedOrders
  .filter(o => o.isActive)
  .reduce((sum, o) => sum + o.linkedAmount, 0)

const billStatus =
  totalPaid === 0 ? 'not_billed' : totalPaid < order.totalAmount ? 'partially_paid' : 'fully_paid'
```

### Unlinking Payment from Order

**Purpose:** Remove allocation (e.g., wrong order, need to reallocate)

**Process:**

1. Find linked payment
2. Set `isActive = false` for this link (keep history)
3. Decrease `used_amount`
4. Update order bill_status

**Code:**

```typescript
await accountStore.unlinkPaymentFromOrder('pp_abc', 'po_123')

// What happens:
// 1. Find link in Payment.linked_orders
// 2. Set link.isActive = false (soft delete)
// 3. Payment.used_amount -= link.linkedAmount
// 4. Order.bill_status updated (recalculated)
// 5. If payment from POS expense: update expense.linkingStatus
```

**Why Soft Delete?**

- Сохраняем audit trail (кто, когда, почему отвязал)
- Можем восстановить если ошиблись
- История всех изменений

---

## Cashier Account (Special Account)

### Account Types

Kitchen App использует несколько типов счетов:

1. **Cash Register (Касса)** - `acc_cash_register` или `acc_1`

   - Основной счет для POS операций
   - Наличные расходы и доходы
   - Смены кассира работают с этим счетом
   - Type: `'cash'`

2. **Bank Accounts** - `acc_bank_*`

   - Безналичные платежи
   - Переводы поставщикам

3. **Petty Cash** - `acc_petty_cash`
   - Мелкие расходы

### Cashier Account in POS

**Shift Opening:**

```typescript
const shift = await shiftsStore.startShift({
  accountId: 'acc_cash_register',
  openingBalance: 1000000,
  performedBy: currentUser
})

// Account balance tracked in shift
shift.accountBalances = [
  {
    accountId: 'acc_cash_register',
    startBalance: 1000000,
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 1000000
  }
]
```

**Creating Expense from Shift:**

```typescript
const expense = await shiftsStore.createDirectExpense({
  accountId: 'acc_cash_register',
  amount: 100000,
  counteragentId: 'ca_budewa',
  counteragentName: "Bu'Dewa",
  description: 'Vegetables'
})

// Creates:
// 1. Transaction (updates account balance)
transaction.account_id = 'acc_cash_register'
transaction.amount = -100000

// 2. PendingPayment (for linking to POs)
payment.assigned_to_account = 'acc_cash_register'
payment.status = 'completed'
payment.paid_amount = 100000
payment.source = 'pos' // ✨ NEW: Marked as POS payment

// 3. Updates shift balance
shift.accountBalances[0].totalExpense += 100000
shift.accountBalances[0].currentBalance -= 100000
```

**Shift Closing:**

```typescript
const closedShift = await shiftsStore.endShift({
  closingBalance: 900000,
  actualCash: 895000, // Counted cash
  discrepancy: -5000 // Shortage
})

// All transactions synced to account
// Account final balance = closing balance
```

---

## Partial Payments & Overpayments

### Scenario 1: Partial Payment (Один платеж → Часть заказа)

**Example:** Заказ на Rp 1,000,000, оплачено Rp 600,000

```typescript
// Payment: Rp 1,000,000
const payment = {
  id: 'pp_abc',
  amount: 1000000,
  used_amount: 0,
  linked_orders: []
}

// Order: Rp 1,000,000
const order = {
  id: 'po_123',
  totalAmount: 1000000,
  bill_status: 'not_billed'
}

// Link partial amount
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_123',
  linkAmount: 600000 // Only 60%
})

// Result:
payment.used_amount = 600000
payment.linked_orders = [
  {
    orderId: 'po_123',
    linkedAmount: 600000,
    isActive: true
  }
]

order.bill_status = 'partially_paid' // 600K of 1M paid
```

**Available Amount:**

```typescript
const availableAmount = payment.amount - payment.used_amount
// = 1000000 - 600000 = 400000 Rp available

// Can link remaining 400K to another order or same order later
```

### Scenario 2: Overpayment (Один платеж → Несколько заказов)

**Example:** Платеж Rp 1,000,000 распределить на 2 заказа

```typescript
// Payment: Rp 1,000,000
const payment = {
  id: 'pp_abc',
  amount: 1000000,
  used_amount: 0,
  linked_orders: []
}

// Order A: Rp 600,000
// Order B: Rp 400,000

// Link to Order A
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_a',
  linkAmount: 600000
})

// Link to Order B
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_b',
  linkAmount: 400000
})

// Result:
payment.used_amount = 1000000 // Fully allocated
payment.linked_orders = [
  { orderId: 'po_a', linkedAmount: 600000, isActive: true },
  { orderId: 'po_b', linkedAmount: 400000, isActive: true }
]

// Both orders fully paid
orderA.bill_status = 'fully_paid'
orderB.bill_status = 'fully_paid'
```

### Scenario 3: Multiple Payments → One Order

**Example:** Заказ Rp 1,000,000, оплачен двумя платежами

```typescript
// Order: Rp 1,000,000
const order = { id: 'po_123', totalAmount: 1000000 }

// Payment 1: Rp 600,000 (from POS expense)
await linkPaymentToOrder({
  paymentId: 'pp_1',
  orderId: 'po_123',
  linkAmount: 600000
})

order.bill_status = 'partially_paid' // 60%

// Payment 2: Rp 400,000 (from bank transfer)
await linkPaymentToOrder({
  paymentId: 'pp_2',
  orderId: 'po_123',
  linkAmount: 400000
})

order.bill_status = 'fully_paid' // 100%

// Calculate total paid for order:
const totalPaid = await accountStore.getPaymentsByOrder('po_123').reduce((sum, p) => {
  const link = p.linkedOrders.find(o => o.orderId === 'po_123' && o.isActive)
  return sum + (link?.linkedAmount || 0)
}, 0)
// = 600000 + 400000 = 1000000
```

---

## Code Examples

### Creating POS Expense with Payment (✨ Updated)

```typescript
// src/stores/pos/shifts/shiftsStore.ts:641-696

// Step 1: Create Transaction
const transaction = await accountStore.createOperation({
  accountId: data.accountId,
  type: 'expense',
  amount: data.amount, // Negative
  description: data.description,
  expenseCategory: { type: 'expense', category: 'supplier' },
  performedBy: data.performedBy,
  counteragentId: data.counteragentId,
  counteragentName: data.counteragentName
})

// Step 2: Check for duplicate payment (✨ NEW: Database check)
const { data: duplicateCheck } = await supabase.rpc('check_duplicate_payment', {
  p_counteragent_id: data.counteragentId,
  p_amount: data.amount,
  p_date: new Date().toISOString().split('T')[0]
})

if (duplicateCheck?.[0]?.is_duplicate) {
  // Link to existing payment
  expenseOperation.relatedPaymentId = duplicateCheck[0].payment_id
} else {
  // Step 3: Create PendingPayment (completed)
  const { payment } = await accountStore.createSupplierExpenseWithPayment({
    accountId: data.accountId,
    type: 'expense',
    amount: data.amount,
    description: data.description,
    expenseCategory: { type: 'expense', category: 'supplier' },
    performedBy: data.performedBy,
    counteragentId: data.counteragentId,
    counteragentName: data.counteragentName,
    source: 'pos' // ✨ NEW: Mark as POS payment
  })

  expenseOperation.relatedPaymentId = payment.id
}

// Result:
// - Transaction created (account balance updated)
// - Payment created OR linked to existing (no duplicates)
// - Both linked via IDs
```

### Creating Payment from Purchase Order

```typescript
// src/stores/supplier_2/integrations/accountIntegration.ts:38-87

async function createBillFromOrder(order: PurchaseOrder): Promise<PendingPayment> {
  const createDto: CreatePaymentDto = {
    counteragentId: order.supplierId,
    counteragentName: order.supplierName,
    amount: order.totalAmount,
    description: `Purchase order ${order.orderNumber}`,
    category: 'supplier',
    priority: 'medium',
    createdBy: currentUser,
    source: 'backoffice', // ✨ Created from Backoffice

    // Pre-allocate to order (pending + linkedOrders is VALID)
    usedAmount: 0,
    linkedOrders: [
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        linkedAmount: order.totalAmount,
        linkedAt: new Date().toISOString(),
        isActive: true
      }
    ],

    sourceOrderId: order.id, // For auto-sync
    autoSyncEnabled: true
  }

  return await accountStore.createPayment(createDto)
}

// Auto-sync when order amount changes
async function syncBillAmount(order: PurchaseOrder): Promise<void> {
  const payment = accountStore.payments.find(p => p.sourceOrderId === order.id)

  if (payment && payment.autoSyncEnabled) {
    await accountStore.updatePaymentAmount({
      paymentId: payment.id,
      newAmount: order.totalAmount,
      reason: 'receipt_discrepancy',
      notes: 'Auto-synced from priemka'
    })
  }
}
```

### Linking Payment to Purchase Order

```typescript
// src/stores/account/store.ts:1101-1283

async function linkPaymentToOrder(
  data: LinkPaymentToOrderDto
): Promise<{ success: boolean; adjustedPayments?: Array<...> }> {

  // 1. Find payment
  const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)

  // 2. Check available amount
  const availableAmount = payment.amount - (payment.usedAmount || 0)
  if (data.linkAmount > availableAmount) {
    throw new Error('Insufficient available amount')
  }

  // 3. Add link to payment
  if (!payment.linkedOrders) payment.linkedOrders = []

  payment.linkedOrders.push({
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    linkedAmount: data.linkAmount,
    linkedAt: new Date().toISOString(),
    isActive: true
  })

  // 4. Update database
  await paymentService.update(payment.id, {
    linkedOrders: payment.linkedOrders,
    updatedAt: new Date().toISOString()
  })

  // 5. Update used_amount (for completed payments)
  if (payment.status === 'completed') {
    const totalLinked = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    await updatePaymentUsedAmount(payment.id, totalLinked)
  }

  // 6. Update order bill_status
  await updateOrderBillStatus(data.orderId)

  // 7. Update POS expense linking status (if from POS)
  await shiftsStore.updateExpenseLinkingStatusByPaymentId(
    data.paymentId,
    newLinkingStatus,
    data.orderId
  )

  return { success: true }
}
```

---

## Database Schema

### transactions table

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  account_id TEXT NOT NULL, -- Which account (cash, bank, etc.)
  type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
  amount NUMERIC NOT NULL, -- Negative for expenses
  balance_after NUMERIC NOT NULL, -- Account balance after this transaction

  description TEXT NOT NULL,
  expense_category JSONB, -- {type, category} for expenses

  counteragent_id TEXT, -- Supplier/Customer ID
  counteragent_name TEXT,

  related_payment_id TEXT, -- Link to pending_payments (for supplier expenses)

  performed_by JSONB NOT NULL, -- {id, name, type}
  status TEXT NOT NULL, -- 'completed' | 'pending' | 'cancelled'

  -- Foreign keys
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (related_payment_id) REFERENCES pending_payments(id)
);

-- Index for supplier expenses
CREATE INDEX idx_transactions_supplier_expenses
ON transactions (counteragent_id, created_at)
WHERE expense_category->>'category' = 'supplier';

-- Index for payments linking
CREATE INDEX idx_transactions_related_payment
ON transactions (related_payment_id)
WHERE related_payment_id IS NOT NULL;
```

### pending_payments table (✨ Updated)

```sql
CREATE TABLE pending_payments (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  counteragent_id TEXT NOT NULL, -- Supplier ID
  counteragent_name TEXT NOT NULL,

  amount NUMERIC NOT NULL, -- Total payment amount
  used_amount NUMERIC DEFAULT 0, -- Amount already allocated to orders

  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'supplier' | 'customer' | 'other'

  status TEXT NOT NULL, -- 'pending' | 'completed' | 'cancelled'
  priority TEXT NOT NULL, -- 'low' | 'medium' | 'high' | 'urgent'

  -- ✨ NEW: Payment source tracking (Migration 114)
  source TEXT DEFAULT 'backoffice' CHECK (source IN ('pos', 'backoffice')),

  -- Linking to Purchase Orders
  linked_orders JSONB, -- [{orderId, orderNumber, linkedAmount, linkedAt, isActive}]
  source_order_id TEXT, -- Original PO that created this payment (if any)
  auto_sync_enabled BOOLEAN DEFAULT FALSE, -- Auto-sync amount with source order

  -- Payment execution details
  paid_amount NUMERIC, -- Actual amount paid
  paid_date TIMESTAMPTZ, -- When paid
  assigned_to_account TEXT, -- Which account used (if completed)

  created_by JSONB NOT NULL, -- {id, name}

  notes TEXT,

  -- Foreign keys
  FOREIGN KEY (counteragent_id) REFERENCES counteragents(id),
  FOREIGN KEY (assigned_to_account) REFERENCES accounts(id)
);

-- Index for unlinked payments
CREATE INDEX idx_pending_payments_unlinked
ON pending_payments (category, status, used_amount)
WHERE status = 'completed' AND used_amount < amount;

-- Index for supplier payments
CREATE INDEX idx_pending_payments_supplier
ON pending_payments (counteragent_id, status, created_at)
WHERE category = 'supplier';

-- ✨ NEW: Index for payment source (Migration 114)
CREATE INDEX idx_pending_payments_source
ON pending_payments (source)
WHERE status = 'completed';

-- ✨ NEW: Index for duplicate detection (Migration 115)
CREATE INDEX idx_pending_payments_lookup
ON pending_payments (counteragent_id, amount, status, category)
WHERE status = 'completed' AND category = 'supplier';
```

### ✨ NEW: RPC Function for Duplicate Detection (Migration 115)

```sql
-- Function: check_duplicate_payment
-- Purpose: Check for duplicate payments before creation (prevents race conditions)

CREATE OR REPLACE FUNCTION check_duplicate_payment(
  p_counteragent_id TEXT,
  p_amount NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  payment_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_duplicate,
    id as payment_id,
    created_at
  FROM pending_payments
  WHERE counteragent_id = p_counteragent_id
    AND amount = p_amount
    AND DATE(created_at) = p_date
    AND status = 'completed'
    AND category = 'supplier'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Usage:
-- const { data } = await supabase.rpc('check_duplicate_payment', {
--   p_counteragent_id: 'ca_123',
--   p_amount: 100000,
--   p_date: '2026-01-29'
-- })
-- if (data[0]?.is_duplicate) { /* link to existing */ }
```

### Example Data (✨ Updated)

**Transaction:**

```json
{
  "id": "tx_20260129_001",
  "account_id": "acc_cash_register",
  "type": "expense",
  "amount": -100000,
  "balance_after": 900000,
  "description": "Bu'Dewa vegetables",
  "expense_category": { "type": "expense", "category": "supplier" },
  "counteragent_id": "ca_budewa",
  "counteragent_name": "Bu'Dewa",
  "related_payment_id": "pp_20260129_001",
  "performed_by": { "id": "user_123", "name": "Cashier Anna", "type": "user" },
  "status": "completed",
  "created_at": "2026-01-29T10:30:00Z"
}
```

**PendingPayment (Completed, Unlinked, from POS):**

```json
{
  "id": "pp_20260129_001",
  "counteragent_id": "ca_budewa",
  "counteragent_name": "Bu'Dewa",
  "amount": 100000,
  "used_amount": 0,
  "description": "Bu'Dewa vegetables",
  "category": "supplier",
  "status": "completed",
  "priority": "medium",
  "source": "pos",
  "linked_orders": [],
  "paid_amount": 100000,
  "paid_date": "2026-01-29T10:30:00Z",
  "assigned_to_account": "acc_cash_register",
  "created_by": { "id": "user_123", "name": "Cashier Anna" },
  "created_at": "2026-01-29T10:30:00Z"
}
```

**PendingPayment (Pending, Pre-Allocated to Order):**

```json
{
  "id": "pp_20260129_003",
  "counteragent_id": "ca_supplier",
  "amount": 1000000,
  "used_amount": 0,
  "status": "pending",
  "source": "backoffice",
  "linked_orders": [
    {
      "orderId": "po_20260120_001",
      "orderNumber": "PO-2026-001",
      "linkedAmount": 1000000,
      "linkedAt": "2026-01-29T09:00:00Z",
      "isActive": true
    }
  ],
  "source_order_id": "po_20260120_001",
  "auto_sync_enabled": true
}
```

---

## Common Scenarios

### Scenario 1: Daily POS Supplier Expense Flow

**Morning:**

1. Supplier delivers vegetables, cashier pays Rp 500,000 from register
2. POS creates:
   - Transaction (balance -= 500K)
   - PendingPayment (status='completed', source='pos')
   - Duplicate check prevents race conditions
   - Both linked

**Afternoon:**

3. Manager reviews unlinked payments in Backoffice
4. Finds this Rp 500K payment (shows "Unlinked (POS)" badge)
5. Links to Purchase Order PO-2026-015
6. Order bill_status updated to 'fully_paid'

### Scenario 2: Planned Supplier Payment with Pre-Allocation

**Step 1: Order Creation**

```typescript
// Manager creates purchase order
const order = await createPurchaseOrder({
  supplier: 'Bu\'Dewa',
  items: [...],
  totalAmount: 2000000
})

order.bill_status = 'not_billed'
```

**Step 2: Payment Planning with Pre-Allocation**

```typescript
// Manager opens PO details, clicks "Create New Bill"
const payment = await accountStore.createBillFromOrder(order)

// Result:
{
  status: 'pending', // Not yet paid
  source: 'backoffice',
  linkedOrders: [{ // ✅ PRE-ALLOCATED (this is CORRECT)
    orderId: order.id,
    linkedAmount: 2000000,
    isActive: true
  }],
  sourceOrderId: order.id,
  autoSyncEnabled: true
}
```

**Step 3: Amount Changes During Priemka**

```typescript
// During receiving, actual amount is 2,200,000
order.totalAmount = 2200000

// Auto-sync triggered
payment.amount = 2200000 // ✅ Updated automatically
payment.linkedOrders[0].linkedAmount = 2200000
```

**Step 4: Payment Execution**

```typescript
// Cashier clicks "Process Payment"
await processPayment({
  paymentId: payment.id,
  accountId: 'acc_cash_register',
  amount: 2200000
})

// Creates Transaction, updates Payment status
payment.status = 'completed'
payment.assigned_to_account = 'acc_cash_register'

order.bill_status = 'fully_paid'
```

### Scenario 3: Complex Multi-Order Payment

**Situation:** One payment of Rp 3,000,000 for multiple deliveries

```typescript
// Payment created from large cash withdrawal
const payment = {
  id: 'pp_large',
  amount: 3000000,
  used_amount: 0,
  source: 'backoffice',
  linked_orders: []
}

// Link to Order A (vegetables)
await linkPaymentToOrder({
  paymentId: 'pp_large',
  orderId: 'po_a',
  linkAmount: 1200000
})

// Link to Order B (fruits)
await linkPaymentToOrder({
  paymentId: 'pp_large',
  orderId: 'po_b',
  linkAmount: 800000
})

// Link to Order C (meat)
await linkPaymentToOrder({
  paymentId: 'pp_large',
  orderId: 'po_c',
  linkAmount: 1000000
})

// Result:
payment.used_amount = 3000000 // Fully allocated
payment.linked_orders = [
  { orderId: 'po_a', linkedAmount: 1200000, isActive: true },
  { orderId: 'po_b', linkedAmount: 800000, isActive: true },
  { orderId: 'po_c', linkedAmount: 1000000, isActive: true }
]

// All orders paid
orderA.bill_status = 'fully_paid'
orderB.bill_status = 'fully_paid'
orderC.bill_status = 'fully_paid'
```

---

## Best Practices

### ✅ DO:

1. **Always create PendingPayment for supplier expenses**

   - Even if payment is completed immediately
   - Needed for linking to Purchase Orders
   - Set correct `source` field ('pos' or 'backoffice')

2. **Use database as source of truth**

   - PendingPayment in database, not localStorage
   - Survives app restarts and device changes

3. **Check for duplicates before creating payment**

   ```typescript
   const { data } = await supabase.rpc('check_duplicate_payment', {
     p_counteragent_id: counteragentId,
     p_amount: amount,
     p_date: new Date().toISOString().split('T')[0]
   })
   if (data[0]?.is_duplicate) {
     // Link to existing payment
   }
   ```

4. **Update order.bill_status after link/unlink**

   - Always call `updateOrderBillStatus()` after changes
   - Keeps UI in sync with payment state

5. **Use soft delete for unlink**

   - Set `isActive = false`, don't delete
   - Preserves audit trail

6. **Check available amount before linking**

   ```typescript
   const available = payment.amount - payment.used_amount
   if (linkAmount > available) throw new Error('Insufficient amount')
   ```

7. **Use pre-allocation for planned payments**
   - Create pending payment with linkedOrders
   - Enable auto-sync for order amount changes
   - Shows clear connection between payment and order

### ❌ DON'T:

1. **Don't update only localStorage**

   - Legacy mode removed
   - Always update database

2. **Don't skip relatedPaymentId**

   - Transaction MUST link to Payment for supplier expenses
   - Required for linking workflow

3. **Don't forget source field**

   - Always set `source: 'pos'` or `source: 'backoffice'`
   - Required for correct UI display and reporting

4. **Don't hard-delete links**

   - Use `isActive = false` for unlink
   - Keep history for auditing

5. **Don't assume status='pending' means unpaid**

   - Check both `status` and `paid_date`
   - 'pending' can have linkedOrders (pre-allocation)
   - 'completed' = already paid, ready for linking

6. **Don't think pending + linkedOrders is a bug**
   - This is pre-allocation feature (CORRECT behavior)
   - Allows planning payments before execution
   - Enables auto-sync with order amount changes

---

## Troubleshooting

### Issue: Payment not visible in Backoffice after localStorage clear

**Cause:** Payment not created in database, only in localStorage

**Fix:** Ensure `createSupplierExpenseWithPayment()` is called

```typescript
// src/stores/pos/shifts/shiftsStore.ts:682-692
const { payment } = await accountStore.createSupplierExpenseWithPayment({
  // ...
  source: 'pos' // ✅ NEW: Don't forget source field
})
expenseOperation.relatedPaymentId = payment.id
```

### Issue: All payments show as "Backoffice" in UI

**Cause:** Missing `source` field or not reading it from database

**Status:** ✅ FIXED in Migration 114

**Verification:**

```sql
-- Check if source field exists
SELECT source, COUNT(*) FROM pending_payments
WHERE status = 'completed' AND category = 'supplier'
GROUP BY source;

-- Expected: pos: 19+, backoffice: 61+
```

### Issue: Duplicate payments created by multiple cashiers

**Cause:** No database-level duplicate check

**Status:** ✅ FIXED in Migration 115

**How it works:**

1. Before creating payment, call `check_duplicate_payment()` RPC
2. If duplicate exists, link to existing payment
3. If no duplicate, create new payment
4. Performance index ensures fast lookups

### Issue: Order bill_status not updating after link

**Cause:** Missing `updateOrderBillStatus()` call

**Fix:** Add bill_status update after linking

```typescript
// src/stores/account/store.ts:1257-1274
await updateOrderBillStatus(data.orderId)
```

### Issue: "Paradox" - pending payment with linkedOrders

**Answer:** This is NOT a bug! ✅

**Explanation:**

- This is **pre-allocation** feature
- Manager creates payment plan FOR specific order BEFORE paying
- When payment is executed, allocation is already done
- Benefits: Auto-sync, clear connection, prevents wrong linking

See [Pre-Allocation Feature](#pre-allocation-feature) section for details.

---

## Recent Improvements

### ✨ Migration 114: Payment Source Tracking (2026-01-29)

**Added:**

- `source` field to `pending_payments` table ('pos' | 'backoffice')
- Backfilled historical data (19 POS, 61 Backoffice)
- Updated UI to show correct source badges
- Improved reporting accuracy

**Files:**

- `src/supabase/migrations/114_add_payment_source.sql`
- `src/stores/account/types.ts`
- `src/stores/pos/shifts/shiftsStore.ts`
- `src/stores/account/store.ts`
- `src/stores/pos/shifts/composables/useExpenseLinking.ts`

**Impact:**

- ✅ Payments now correctly identified as POS or Backoffice
- ✅ UI shows accurate badges ("Unlinked (POS)" vs "Unlinked (Backoffice)")
- ✅ Data persists across sessions and localStorage clears

### ✨ Migration 115: Race Condition Prevention (2026-01-29)

**Added:**

- `check_duplicate_payment()` RPC function
- Performance index for fast duplicate detection
- Database-level duplicate prevention

**Files:**

- `src/supabase/migrations/115_prevent_duplicate_payments.sql`
- `src/supabase/functions/check_duplicate_payment.sql`
- `src/stores/pos/shifts/shiftsStore.ts` (updated duplicate check)

**How it works:**

```typescript
// Before creating payment
const { data } = await supabase.rpc('check_duplicate_payment', {
  p_counteragent_id: 'ca_123',
  p_amount: 100000,
  p_date: '2026-01-29'
})

if (data[0]?.is_duplicate) {
  // Link to existing payment (avoid duplicate)
  expenseOperation.relatedPaymentId = data[0].payment_id
} else {
  // Create new payment
  const { payment } = await createPayment({...})
}
```

**Impact:**

- ✅ Prevents duplicate payments from concurrent operations
- ✅ Replaces in-memory 5-second window check with database check
- ✅ Works even when multiple cashiers create payments simultaneously
- ✅ Fallback to in-memory check if database unavailable

---

## Related Documentation

- [Account System Overview](./account-system.md) (TODO)
- [Shift Management](../pos/shifts.md) (TODO)
- [Purchase Orders](../supplier/purchase-orders.md) (TODO)
- [Migration 113: Backfill Payments](../../supabase/migrations/113_link_existing_payments.sql)
- [Migration 114: Source Field](../../supabase/migrations/114_add_payment_source.sql)
- [Migration 115: Duplicate Prevention](../../supabase/migrations/115_prevent_duplicate_payments.sql)

---

## Changelog

**2026-01-29 v2.0** - Major update after Migrations 114 & 115

- ✅ Added Payment Source Tracking (POS vs Backoffice)
- ✅ Added Race Condition Prevention (duplicate payment check)
- ✅ Clarified Pre-Allocation Feature (pending + linkedOrders is CORRECT)
- ✅ Added RPC function documentation
- ✅ Updated database schema with new fields
- ✅ Updated code examples with source field
- ✅ Reorganized troubleshooting section
- ✅ Added "Recent Improvements" section

**2026-01-29 v1.0** - Initial documentation created after expense linking system fix

- Documented Transaction vs PendingPayment architecture
- Added linking/unlinking workflows
- Explained partial payments and overpayments
- Added code examples and common scenarios
