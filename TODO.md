# POS Receipt Module & Enhanced Expense Linking System

> **Last Updated:** 2024-12-14
> **Status:** Planning Complete - УПРОЩЕНО (Online Receipt, No Sync)

---

## УПРОЩЕННЫЙ POS RECEIPT FLOW (ФИНАЛЬНАЯ АРХИТЕКТУРА)

### Ключевое Решение: ONLINE Receipt + OFFLINE Expense

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POS RECEIPT = ONLINE ONLY                                                   │
│  Используем существующий supplier_2 store напрямую                           │
│  НЕ создаем отдельную сущность PosReceipt                                   │
│  НЕ нужен SyncAdapter - Receipt создается сразу в backoffice                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Приемки Товара (POS) - ONLINE ONLY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. ЗАГРУЗКА ЗАКАЗОВ (при открытии формы приемки)                           │
│     GET purchase_orders WHERE:                                               │
│       • status = 'sent' (отправлены поставщику)                             │
│       • counteragent.payment_terms = 'on_delivery'                           │
│                                                                              │
│  2. КАССИР ВЫБИРАЕТ ЗАКАЗ из списка                                         │
│                                                                              │
│  3. ФОРМА ПРИЕМКИ - PRE-FILLED из заказа:                                   │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ Product        │ Ordered │ Received │ Price  │ Total             │    │
│     │────────────────│─────────│──────────│────────│───────────────────│    │
│     │ Tomatoes       │ 10 kg   │ [10 kg]  │ 5,000  │ Rp 50,000         │    │
│     │ Onions         │ 5 kg    │ [5 kg]   │ 3,000  │ Rp 15,000         │    │
│     │ Chicken        │ 20 kg   │ [20 kg]  │ 45,000 │ Rp 900,000        │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│     • Все поля PRE-FILLED из заказа                                         │
│     • Кассир МОЖЕТ изменить ТОЛЬКО если есть расхождения                    │
│     • По умолчанию - просто нажать "Confirm Receipt"                        │
│                                                                              │
│  4. ЗАВЕРШЕНИЕ → Receipt создается СРАЗУ в backoffice (ONLINE)              │
│     • Вызываем useReceipts().createReceipt() из supplier_2                  │
│     • Transit batches → active batches (через storageStore)                 │
│     • PurchaseOrder.status → 'delivered'                                    │
│     • НЕТ локального хранения, НЕТ отдельной синхронизации                  │
│                                                                              │
│  5. ОПЦИОНАЛЬНО: Оплата → см. Flow Оплаты ниже                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Flow Оплаты Поставщику (POS)

#### Матрица сценариев оплаты:

| Сценарий | Online     | Pending Payment | Результат                                                    |
| -------- | ---------- | --------------- | ------------------------------------------------------------ |
| **A1**   | ✅ ONLINE  | ✅ Есть         | `confirmExpense()` → linked transaction                      |
| **A2**   | ✅ ONLINE  | ❌ Нет          | `createLinkedExpense()` → linked transaction                 |
| **B**    | ❌ OFFLINE | —               | `createUnlinkedExpense()` → unlinked (менеджер свяжет позже) |

#### Сценарий A1: ONLINE + Есть Pending Payment (Mode A)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Менеджер УЖЕ создал pending_payment для этого заказа                       │
│                              ↓                                               │
│  Кассир делает приемку → видит pending_payment в списке                     │
│                              ↓                                               │
│  Кассир нажимает "Pay" → confirmExpense(pendingPaymentId)                   │
│                              ↓                                               │
│  ✅ ShiftExpenseOperation.status → 'confirmed'                              │
│  ✅ Транзакция создается в Account Store                                    │
│  ✅ Invoice.billStatus → 'paid' / 'partially_paid'                          │
│  ✅ Counteragent balance обновлен                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Сценарий A2: ONLINE + Нет Pending Payment (Mode B Online)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pending payment НЕ создан, но кассир хочет оплатить сразу при приемке      │
│                              ↓                                               │
│  Кассир делает приемку → выбирает "Pay Now" → вводит сумму                  │
│                              ↓                                               │
│  Система создает ПРИВЯЗАННУЮ транзакцию сразу:                              │
│  createLinkedExpense({                                                       │
│    amount: paymentAmount,                                                    │
│    counteragentId: supplier.id,                                             │
│    type: 'supplier_payment',        // НЕ unlinked_expense!                 │
│    linkedOrderId: order.id,                                                  │
│    linkedInvoiceId: invoice.id,                                             │
│    linkingStatus: 'fully_linked'                                            │
│  })                                                                          │
│                              ↓                                               │
│  ✅ ShiftExpenseOperation создан с linkingStatus='fully_linked'             │
│  ✅ Транзакция создается в Account Store                                    │
│  ✅ Invoice.billStatus → 'paid' / 'partially_paid'                          │
│  ✅ Counteragent balance обновлен                                           │
│  ✅ НЕ нужно связывать в backoffice - уже привязано!                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Сценарий B: OFFLINE (только expense, без приемки)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Нет интернета, приемка НЕДОСТУПНА                                          │
│  Но поставщик пришел и нужно заплатить (касса должна сойтись!)              │
│                              ↓                                               │
│  Кассир открывает "Supplier Payment" → выбирает контрагента → сумму         │
│                              ↓                                               │
│  createUnlinkedExpense({                                                     │
│    amount: paymentAmount,                                                    │
│    counteragentId: supplier.id,                                             │
│    type: 'unlinked_expense',        // Будет связан позже                   │
│    linkingStatus: 'unlinked',                                               │
│    notes: 'Offline payment'                                                 │
│  })                                                                          │
│                              ↓                                               │
│  ✅ ShiftExpenseOperation создан с linkingStatus='unlinked'                 │
│  ✅ Касса сойдется (деньги учтены как расход)                               │
│  ⏳ Менеджер свяжет с invoice в backoffice позже                            │
│  ⏳ При связывании: разница сумм → корректировка баланса контрагента        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Логика определения сценария в коде:

```typescript
async function handlePaymentAtReceipt(
  order: PendingOrderForReceipt,
  paymentAmount: number
): Promise<void> {
  // 1. Проверяем есть ли pending payment для этого заказа
  const pendingPayment = await findPendingPaymentForOrder(order.id)

  if (pendingPayment) {
    // Сценарий A1: Подтверждаем существующий pending payment
    await shiftsStore.confirmExpense(pendingPayment.id, {
      actualAmount: paymentAmount,
      confirmedBy: currentUser
    })
  } else {
    // Сценарий A2: Создаем ПРИВЯЗАННУЮ транзакцию сразу
    await shiftsStore.createLinkedExpense({
      amount: paymentAmount,
      counteragentId: order.supplierId,
      counteragentName: order.supplierName,
      type: 'supplier_payment',
      linkedOrderId: order.id,
      linkingStatus: 'fully_linked'
    })
  }

  // Обновляем статус invoice
  await updateInvoicePaymentStatus(order.invoiceId, paymentAmount)
}

// Для offline (вызывается отдельно, не при приемке)
async function handleOfflineSupplierPayment(
  counteragentId: string,
  counteragentName: string,
  paymentAmount: number
): Promise<void> {
  // Сценарий B: Создаем unlinked expense
  await shiftsStore.createUnlinkedExpense({
    amount: paymentAmount,
    counteragentId,
    counteragentName,
    type: 'unlinked_expense',
    linkingStatus: 'unlinked',
    notes: 'Offline payment - needs linking'
  })
}
```

---

### Итого: Типы Expense Operations

| Type               | Когда создается                   | linkingStatus  | Нужно связывать? |
| ------------------ | --------------------------------- | -------------- | ---------------- |
| `supplier_payment` | Mode A (pending → confirm)        | `fully_linked` | ❌ Нет           |
| `supplier_payment` | Mode B Online (сразу при приемке) | `fully_linked` | ❌ Нет           |
| `unlinked_expense` | Mode B Offline (без приемки)      | `unlinked`     | ✅ Да            |
| `direct_expense`   | Прямой расход (не поставщик)      | —              | ❌ Нет           |

---

### Offline Behavior (резюме)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ЕСЛИ OFFLINE (нет интернета):                                               │
│                                                                              │
│  ❌ Приемка товара: НЕДОСТУПНА                                              │
│     • Показываем: "Internet connection required for goods receipt"           │
│     • Кнопка "Receipt" disabled                                              │
│                                                                              │
│  ❌ Linked Payment: НЕДОСТУПНА                                              │
│     • Нельзя привязать к заказу без интернета                               │
│                                                                              │
│  ✅ Unlinked Payment: РАБОТАЕТ                                              │
│     • Можно создать unlinked_expense                                        │
│     • Касса сойдется (деньги ушли поставщику)                               │
│     • Менеджер свяжет с invoice в backoffice позже                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Что УБРАНО из плана (избыточно):

| Элемент                              | Причина удаления                                         |
| ------------------------------------ | -------------------------------------------------------- |
| `pos_receipts` table                 | Receipt создается сразу в supplier_2, не храним локально |
| `PosReceipt` type с `syncStatus`     | Не нужен, используем существующий `Receipt` type         |
| `PosReceiptSyncAdapter`              | Синхронизация не нужна, все online                       |
| `posReceiptsStore` (отдельный store) | Заменяем на composable `usePosReceipt()`                 |
| Phase 6 (Sync Adapter)               | Полностью удалена                                        |
| Conflict Resolution                  | Не нужна, нет race condition                             |

### Что ОСТАВЛЕНО:

| Элемент                        | Назначение                                  |
| ------------------------------ | ------------------------------------------- |
| `expense_invoice_links` table  | Связывание expenses с invoices              |
| `expense_linking_audit` table  | Audit trail для linking/unlinking           |
| `app_settings` table           | Хранение настроек                           |
| `useExpenseLinking` composable | Логика связывания unlinked expenses         |
| `usePosReceipt` composable     | Приемка товара через supplier_2 store       |
| Scenarios A1/A2/B              | Три сценария оплаты (см. Flow Оплаты выше)  |
| Payments Management UI         | UI для управления платежами                 |
| `unlinked_expense` type        | Offline expense, нужно связать в backoffice |
| `createLinkedExpense()`        | Online expense, сразу привязан к invoice    |
| CounteragentBalanceService     | Унифицированный расчет баланса              |

---

## 0. CRITICAL ISSUES IDENTIFIED

### ⚠️ Issues that MUST be addressed before implementation:

| #   | Issue                               | Impact       | Solution                                                                        |
| --- | ----------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| 1   | **Balance calculation divergence**  | High         | Two different formulas in `useCounteragentBalance.ts` vs `AutomatedPayments.ts` |
| 2   | ~~**Offline mode not planned**~~    | ~~Critical~~ | **RESOLVED:** Receipt = ONLINE only, Expense = works offline                    |
| 3   | **No unlink mechanism**             | Medium       | Missing rollback for balance adjustments                                        |
| 4   | ~~**No sync conflict resolution**~~ | ~~High~~     | **RESOLVED:** No sync needed, Receipt created directly online                   |
| 5   | **Missing link validation**         | Medium       | Can over-link expense or invoice                                                |
| 6   | **No data migration**               | Medium       | Existing supplier_payments need linkingStatus                                   |
| 7   | **Settings storage undefined**      | Medium       | Where to store expense settings?                                                |

### Decision Summary (from planning session):

- **Split Delivery**: Postponed to future sprints
- **Offline Mode**: Receipt = ONLINE only, Expense = works offline (касса сойдется)
- **Unlink Access**: Manager + Admin only
- **Auto-link**: Suggestions only, no automatic linking
- **Receipt Form**: Pre-filled из заказа, кассир может изменить при расхождениях

---

## 1. TASK DESCRIPTION

### Problem Statement

Current system has only one flow for supplier payments:

1. Manager creates pending payment in backoffice
2. Cashier confirms payment at POS
3. Transaction is created after confirmation

**Current limitations:**

- Cashier cannot pay supplier without pre-created pending payment
- Cannot receive goods and pay "on the spot" without backoffice preparation
- Product receipt is only available to manager in backoffice

### Required Solution

**Two operating modes (Mode A and Mode B):**

| Mode                 | Flow                                                               | Use Case             |
| -------------------- | ------------------------------------------------------------------ | -------------------- |
| **Mode A** (current) | Backoffice creates pending payment -> Cashier confirms             | Pre-planned payments |
| **Mode B** (new)     | Cashier creates expense directly -> Manager links to invoice later | On-delivery payments |

**Mode selection logic:**

- If counteragent has `paymentTerms === 'on_delivery'` (cash) -> both modes available
- If `prepaid` or `after` -> only Mode A
- Global setting determines default mode for `on_delivery` counteragents

---

## 2. RESEARCH

### 2.1 Current Architecture

#### POS Expense Flow

**Location:** `src/stores/pos/shifts/`

```
ShiftExpenseOperation types:
  - 'direct_expense'     -> Direct expense from cash register (cashier)
  - 'supplier_payment'   -> Supplier payment (from backoffice, requires confirmation)
  - 'incoming_transfer'  -> Incoming transfer (for display)

Status flow:
  - pending -> confirmed/rejected (for supplier_payment)
  - completed (for direct_expense - immediate)
```

**Key files:**

- `src/stores/pos/shifts/types.ts` - ShiftExpenseOperation types
- `src/stores/pos/shifts/shiftsStore.ts` - createDirectExpense, confirmExpense
- `src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue` - expense creation UI

#### Supplier Invoice Flow

**Location:** `src/stores/supplier_2/`

```
PurchaseOrder -> Receipt -> Payment

BillStatus: not_billed -> billed -> partially_paid -> fully_paid
```

**Key files:**

- `src/stores/supplier_2/types.ts` - PurchaseOrder, Receipt, ReceiptItem
- `src/stores/supplier_2/composables/useReceipts.ts` - receipt logic
- `src/stores/supplier_2/composables/useOrderPayments.ts` - payment linking

#### Counteragent Balance System

**Location:** `src/stores/counteragents/`

```typescript
interface Counteragent {
  currentBalance?: number // Current balance (credit/debt)
  balanceHistory?: BalanceHistoryEntry[]
  lastBalanceUpdate?: string
}

type BalanceCorrectionReason = 'historical_prepayment' | 'historical_debt' | 'manual_adjustment'
// ... and others
```

**Already supports** balance corrections - will use for handling amount differences.

#### Payment Confirmation

**Location:** `src/stores/account/`

```typescript
interface PendingPayment {
  requiresCashierConfirmation?: boolean
  confirmationStatus?: 'pending' | 'confirmed' | 'rejected'
  assignedToAccount?: string // Account for deduction (cash register)
  linkedOrders?: Array<{ orderId; linkedAmount }>
}
```

---

## 3. SOLUTION DESIGN

### 3.1 Key Design Decisions

| #   | Decision                             | Rationale                                                            |
| --- | ------------------------------------ | -------------------------------------------------------------------- |
| 1   | New expense type: `unlinked_expense` | Expense without invoice link                                         |
| 2   | Partial linking                      | Link only matching amount, difference goes to counteragent balance   |
| 3   | Use existing balance system          | `Counteragent.currentBalance` + `balanceHistory` already implemented |
| 4   | Separate POS Receipt module          | Simplified receipt (quantity + amount) for POS                       |
| 5   | Mode by counteragent                 | If `paymentTerms === 'on_delivery'`, both modes available            |
| 6   | Settings in PaymentSettingsView      | Add expense mode to existing settings page                           |
| 7   | New Payments section in Accounts     | `/accounts/payments` with tabs: Pending/Unlinked/History             |
| 8   | Counteragents for POS                | Load only `on_delivery` counteragents for cashier role               |

### 3.2 Flow Diagrams

#### Mode A (Backoffice First) - Current

```
Backoffice: Create PendingPayment (requiresCashierConfirmation=true)
                          |
                          v
POS: Cashier sees pending payments in list
                          |
                          v
POS: Cashier confirms -> Transaction created
                          |
                          v
Backoffice: Invoice marked as paid
```

#### Mode B (Cashier First) - New

```
POS: Cashier creates unlinked_expense (amount + counteragent)
                          |
                          v
Backoffice: Manager sees unlinked expenses
                          |
                          v
Backoffice: Manager links to invoice
                          |
                          v
If amounts differ -> Counteragent balance adjusted
                          |
                          v
Expense marked as fully_linked
```

#### POS Receipt Flow

```
POS: Select pending order -> Enter received quantities
                          |
                          v
POS: Review discrepancies -> Optionally pay now
                          |
                          v
POS: Complete receipt -> Creates PosReceipt + optional unlinked_expense
                          |
                          v
Sync: PosReceiptSyncAdapter -> Full Receipt in backoffice
```

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Data Model Extensions

**Sprint:** 1
**Goal:** Extend data types for Mode B and POS Receipt support

#### 1.1 Extend ShiftExpenseOperation

**File:** `src/stores/pos/shifts/types.ts`

```typescript
// Add new type
export type ExpenseOperationType =
  | 'direct_expense'
  | 'supplier_payment'
  | 'incoming_transfer'
  | 'unlinked_expense' // NEW

// Add linking status
export type ExpenseLinkingStatus = 'unlinked' | 'partially_linked' | 'fully_linked'

// Extend ShiftExpenseOperation
interface ShiftExpenseOperation {
  // ... existing fields ...
  linkingStatus?: ExpenseLinkingStatus
  linkedInvoices?: ExpenseInvoiceLink[]
  linkedAmount?: number
  unlinkedAmount?: number
}

// NEW: Link structure
interface ExpenseInvoiceLink {
  invoiceId: string
  invoiceNumber: string
  linkedAmount: number
  linkedAt: string
  linkedBy: TransactionPerformer
  isActive: boolean
  balanceAdjustmentId?: string
  balanceAdjustmentAmount?: number
}
```

#### 1.2 Add BalanceCorrectionReason

**File:** `src/stores/counteragents/types.ts`

```typescript
export type BalanceCorrectionReason =
  // ... existing ...
  | 'expense_overpayment' // NEW: Overpayment on expense
  | 'expense_underpayment' // NEW: Underpayment on expense
```

#### 1.3 POS Receipt Composable Types

**File:** `src/stores/pos/receipts/types.ts` (NEW)

> **УПРОЩЕНО:** Не создаем отдельную сущность PosReceipt. Используем существующий Receipt type из supplier_2. Здесь только типы для UI формы.

```typescript
// Заказ, готовый к приемке (из API)
interface PendingOrderForReceipt {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  totalAmount: number
  createdAt: string
  items: PendingOrderItem[]
}

interface PendingOrderItem {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: number // Ordered quantity
  price: number // Ordered price
  total: number
}

// Форма приемки (локальный state для UI)
interface ReceiptFormData {
  orderId: string
  orderNumber: string
  supplierId: string
  supplierName: string
  items: ReceiptFormItem[]
  expectedTotal: number
  actualTotal: number
  hasDiscrepancies: boolean
  paymentAmount?: number // Optional immediate payment
}

interface ReceiptFormItem {
  orderItemId: string
  productId: string
  productName: string
  unit: string
  orderedQuantity: number
  receivedQuantity: number // Editable
  orderedPrice: number
  actualPrice: number // Editable
  orderedTotal: number
  actualTotal: number // Calculated
  hasDiscrepancy: boolean // Calculated
}
```

**Completion Criteria:**

- [ ] Types created for API response (PendingOrderForReceipt)
- [ ] Types created for form state (ReceiptFormData)
- [ ] No syncStatus, no local storage - all online

#### 1.4 Unified Counteragent Balance Service (NEW - fixes Issue #1)

**File:** `src/stores/counteragents/services/CounteragentBalanceService.ts` (NEW)

**Problem:** Two different balance calculations exist:

- `useCounteragentBalance.ts`: `balance = totalPaid - totalReceived` (from completed receipts)
- `AutomatedPayments.ts`: `balance = totalPaid - totalDebt` (from pending payments)

**Solution:** Create unified service:

```typescript
class CounteragentBalanceService {
  // Single source of truth for balance calculation
  async calculateBalance(counteragentId: string): Promise<BalanceInfo> {
    const completedReceipts = await this.getCompletedReceiptsTotal(counteragentId)
    const completedPayments = await this.getCompletedPaymentsTotal(counteragentId)

    return {
      currentBalance: completedPayments - completedReceipts,
      totalReceived: completedReceipts,
      totalPaid: completedPayments,
      calculatedAt: new Date().toISOString()
    }
  }
}
```

**Completion Criteria:**

- [ ] CounteragentBalanceService created
- [ ] useCounteragentBalance.ts refactored to use service
- [ ] AutomatedPayments.ts refactored to use service
- [ ] Balance calculations consistent across system

---

### Phase 1.5: POS Receipt Strategy (ONLINE + Offline Expense)

**Sprint:** 1
**Goal:** Define POS Receipt architecture

#### Decision: ONLINE for Receipt, OFFLINE for Expense only

| Функция                          | Online       | Offline       |
| -------------------------------- | ------------ | ------------- |
| **Приемка товара (POS Receipt)** | ✅ Требуется | ❌ Недоступна |
| **Оплата поставщику (Expense)**  | ✅ Работает  | ✅ Работает   |

**Почему так:**

- Приемка требует актуальные данные заказа (items, prices, quantities)
- Загружать и кэшировать supplier store слишком сложно
- Оффлайн expense достаточно чтобы касса сошлась
- Менеджер свяжет expense с invoice позже в backoffice

#### 1.5.1 POS Receipt Flow (ONLINE ONLY)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ЗАГРУЗКА ЗАКАЗОВ (при открытии POS Receipt)                 │
│     GET purchase_orders WHERE:                                  │
│       - status = 'sent' (отправлены поставщику)                │
│       - supplier.payment_terms = 'on_delivery'                  │
│                                                                 │
│  2. КАССИР ВЫБИРАЕТ ЗАКАЗ из списка                            │
│                                                                 │
│  3. ФОРМА ПРИЕМКИ - PRE-FILLED из заказа:                      │
│     ┌──────────────────────────────────────────────────────┐   │
│     │ Product        │ Ordered │ Received │ Price │ Total  │   │
│     │────────────────│─────────│──────────│───────│────────│   │
│     │ Tomatoes       │ 10 kg   │ [10 kg]  │ 5000  │ 50,000 │   │
│     │ Onions         │ 5 kg    │ [5 kg]   │ 3000  │ 15,000 │   │
│     │ Chicken        │ 20 kg   │ [20 kg]  │ 45000 │ 900,000│   │
│     └──────────────────────────────────────────────────────┘   │
│                         ↑                                       │
│     Все поля PRE-FILLED из заказа!                             │
│     Кассир МОЖЕТ изменить если есть расхождения                │
│     По умолчанию - просто нажать "Подтвердить"                 │
│                                                                 │
│  4. ЗАВЕРШЕНИЕ → Receipt создается СРАЗУ в backoffice          │
│     - Создается полная Receipt в supplier_2 store              │
│     - Transit batches → active batches (Storage)               │
│     - PurchaseOrder.status → 'delivered'                       │
│                                                                 │
│  5. ОПЦИОНАЛЬНО: Оплата → создает unlinked_expense             │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.5.2 Offline Behavior

```
┌─────────────────────────────────────────────────────────────────┐
│  ЕСЛИ OFFLINE:                                                  │
│                                                                 │
│  Приемка товара:                                               │
│  ❌ "Для приемки товара требуется подключение к интернету"     │
│  ❌ Кнопка "Receipt" disabled или показывает сообщение         │
│                                                                 │
│  Оплата поставщику:                                            │
│  ✅ Можно создать unlinked_expense                             │
│  ✅ Касса сойдется (деньги ушли поставщику)                    │
│  ✅ Менеджер свяжет с invoice в backoffice позже               │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.5.3 API для загрузки заказов

**File:** `src/stores/pos/receipts/services.ts`

```typescript
interface PendingOrderForReceipt {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  totalAmount: number
  createdAt: string
  items: Array<{
    id: string
    productId: string
    productName: string
    unit: string
    quantity: number // Ordered quantity
    price: number // Ordered price
    total: number
  }>
}

async function loadPendingOrdersForReceipt(): Promise<PendingOrderForReceipt[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      `
      id, order_number, supplier_id, total_amount, created_at,
      counteragents!supplier_id(id, name, payment_terms),
      order_items(id, product_id, product_name, unit, quantity, price, total)
    `
    )
    .eq('status', 'sent')
    .eq('counteragents.payment_terms', 'on_delivery')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

**Completion Criteria:**

- [ ] POS Receipt требует online (показывает сообщение если offline)
- [ ] Заказы загружаются с `status='sent'` и `payment_terms='on_delivery'`
- [ ] Форма pre-filled из данных заказа
- [ ] Кассир может изменить количества/цены при расхождениях
- [ ] Receipt создается сразу в backoffice при завершении
- [ ] Offline: можно создать только expense (оплату)

---

### Phase 2: Database Migration

**Sprint:** 1
**Goal:** Create tables for expense linking (NOT for POS receipts - they use existing supplier_2 tables)

**File:** `src/supabase/migrations/069_expense_linking.sql`

> **УПРОЩЕНО:** Таблица `pos_receipts` НЕ НУЖНА. Receipt создается напрямую через существующий supplier_2 store.

```sql
-- 1. Create expense_invoice_links table
CREATE TABLE IF NOT EXISTS expense_invoice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  linked_amount DECIMAL(15,2) NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  balance_adjustment_id UUID,
  balance_adjustment_amount DECIMAL(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_expense_links_expense ON expense_invoice_links(expense_id);
CREATE INDEX idx_expense_links_invoice ON expense_invoice_links(invoice_id);

-- 3. RLS
ALTER TABLE expense_invoice_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_links_all" ON expense_invoice_links FOR ALL USING (true);

-- 4. App settings table (fixes Issue #7)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Default expense settings
INSERT INTO app_settings (key, value) VALUES
('expense_settings', '{
  "defaultExpenseMode": "backoffice_first",
  "allowCashierDirectExpense": true,
  "autoSuggestThreshold": 0.05
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Data migration for existing supplier_payments (fixes Issue #6)
-- Mark existing confirmed supplier_payments as fully_linked
UPDATE pos_shifts
SET expense_operations = (
  SELECT jsonb_agg(
    CASE
      WHEN (op->>'type') = 'supplier_payment' AND (op->>'status') = 'confirmed'
      THEN op || jsonb_build_object(
        'linkingStatus', 'fully_linked',
        'linkedAmount', (op->>'amount')::decimal
      )
      ELSE op
    END
  )
  FROM jsonb_array_elements(expense_operations) AS op
)
WHERE expense_operations IS NOT NULL
  AND jsonb_array_length(expense_operations) > 0;

-- 6. Audit table for expense linking (fixes Issue #3)
CREATE TABLE IF NOT EXISTS expense_linking_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- 'link', 'unlink', 'amount_adjust'
  expense_id UUID NOT NULL,
  invoice_id UUID,
  performed_by JSONB NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  balance_adjustment_reverted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_linking_audit_expense ON expense_linking_audit(expense_id);
ALTER TABLE expense_linking_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_linking_audit_all" ON expense_linking_audit FOR ALL USING (true);
```

**Completion Criteria:**

- [ ] Migration applied to DEV database
- [ ] `expense_invoice_links` table created
- [ ] `expense_linking_audit` table created
- [ ] `app_settings` table created with defaults
- [ ] types.gen.ts updated with new tables
- [ ] Existing supplier_payments migrated with linkingStatus
- [ ] NO `pos_receipts` table (not needed)

---

### Phase 3: Store Layer

**Sprint:** 1-2
**Goal:** Create composable for POS receipts (using existing supplier_2 store) and linking

#### 3.1 POS Receipt Composable (УПРОЩЕНО)

**Directory structure:**

```
src/stores/pos/receipts/
    index.ts
    types.ts                    # PendingOrderForReceipt, ReceiptFormData
    services.ts                 # API calls for loading orders
    composables/
        usePosReceipt.ts        # Main composable (NO separate store!)
```

> **УПРОЩЕНО:** Не создаем отдельный store. Composable использует существующий `useReceipts()` из `supplier_2` для создания Receipt.

**usePosReceipt.ts - Key methods:**
| Method | Description |
|--------|-------------|
| `loadPendingOrders()` | Load orders with status='sent' + payment_terms='on_delivery' |
| `selectOrder(orderId)` | Select order and populate form (pre-filled) |
| `updateItem(itemId, data)` | Update receivedQuantity/actualPrice (only if discrepancy) |
| `completeReceipt()` | Create Receipt via `useReceipts().createReceipt()` |
| `completeWithPayment(paymentAmount)` | Create Receipt + unlinked_expense |

**Implementation:**

```typescript
export function usePosReceipt() {
  const { createReceipt } = useReceipts() // From supplier_2
  const shiftsStore = useShiftsStore() // For unlinked_expense

  const pendingOrders = ref<PendingOrderForReceipt[]>([])
  const selectedOrder = ref<PendingOrderForReceipt | null>(null)
  const formData = ref<ReceiptFormData | null>(null)
  const isOnline = ref(navigator.onLine)

  // Load orders from API (ONLINE only)
  async function loadPendingOrders(): Promise<void> {
    if (!isOnline.value) {
      throw new Error('Internet connection required for goods receipt')
    }
    const orders = await posReceiptService.loadPendingOrdersForReceipt()
    pendingOrders.value = orders
  }

  // Select order and pre-fill form
  function selectOrder(orderId: string): void {
    const order = pendingOrders.value.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')

    selectedOrder.value = order
    formData.value = createFormFromOrder(order) // Pre-fill all fields
  }

  // Complete receipt - calls supplier_2 store directly
  async function completeReceipt(): Promise<void> {
    if (!formData.value || !selectedOrder.value) {
      throw new Error('No order selected')
    }

    // Create Receipt via existing supplier_2 composable
    await createReceipt({
      purchaseOrderId: selectedOrder.value.id,
      items: formData.value.items.map(item => ({
        productId: item.productId,
        receivedQuantity: item.receivedQuantity,
        actualPrice: item.actualPrice
      }))
    })

    // Receipt created, clear form
    selectedOrder.value = null
    formData.value = null
  }

  // Complete with payment - creates unlinked_expense
  async function completeWithPayment(paymentAmount: number): Promise<void> {
    await completeReceipt()

    // Create unlinked_expense in current shift
    await shiftsStore.createUnlinkedExpense({
      amount: paymentAmount,
      counteragentId: selectedOrder.value!.supplierId,
      counteragentName: selectedOrder.value!.supplierName,
      notes: `Payment for order #${selectedOrder.value!.orderNumber}`
    })
  }

  return {
    pendingOrders,
    selectedOrder,
    formData,
    isOnline,
    loadPendingOrders,
    selectOrder,
    completeReceipt,
    completeWithPayment
  }
}
```

#### 3.2 Expense Linking Composable

**File:** `src/stores/pos/shifts/composables/useExpenseLinking.ts`

```typescript
export function useExpenseLinking() {
  // Get unlinked expenses
  async function getUnlinkedExpenses(counteragentId?: string): Promise<ShiftExpenseOperation[]>

  // Get invoices available for linking
  async function getAvailableInvoices(counteragentId: string): Promise<PurchaseOrder[]>

  // Link expense to invoice (partial)
  async function linkExpenseToInvoice(
    expenseId: string,
    shiftId: string,
    invoiceId: string,
    linkAmount: number,
    performer: TransactionPerformer
  ): Promise<{
    success: boolean
    balanceAdjustment?: { amount: number; type: 'credit' | 'debit' }
  }>

  // Validate link amount (fixes Issue #5)
  function validateLinkAmount(
    expense: ShiftExpenseOperation,
    invoice: PurchaseOrder,
    linkAmount: number
  ): LinkValidationResult

  // Unlink expense from invoice (Manager + Admin only, fixes Issue #3)
  async function unlinkExpenseFromInvoice(dto: UnlinkExpenseDto): Promise<void>

  // Adjust counteragent balance
  async function adjustCounterAgentBalance(
    counteragentId: string,
    amount: number,
    reason: BalanceCorrectionReason,
    notes: string
  ): Promise<string>

  // Get invoice suggestions for expense (NOT auto-link)
  async function getInvoiceSuggestions(expense: ShiftExpenseOperation): Promise<InvoiceSuggestion[]>
}

// Link validation (fixes Issue #5)
interface LinkValidationResult {
  valid: boolean
  error?: string
  suggestedAmount?: number
}

// Unlink DTO (fixes Issue #3)
interface UnlinkExpenseDto {
  expenseId: string
  invoiceId: string
  performedBy: TransactionPerformer
  reason: string
  revertBalanceAdjustment: boolean
}

// Invoice suggestion (decision: suggestions only, no auto-link)
interface InvoiceSuggestion {
  invoice: PurchaseOrder
  matchType: 'exact' | 'close' | 'different' // exact = same amount, close = <5% diff
  amountDifference: number
  percentDifference: number
}
```

#### 3.3 Update shiftsStore

**Add methods:**

- `createUnlinkedExpense(dto)` - Create expense without link (Scenario B - offline)
- `createLinkedExpense(dto)` - Create expense with immediate link (Scenario A2 - online)
- `findPendingPaymentForOrder(orderId)` - Find existing pending payment for order
- `getExpensesByLinkingStatus(status)` - Get expenses by status

```typescript
// Scenario A2: Online payment without pending payment
interface CreateLinkedExpenseDto {
  amount: number
  counteragentId: string
  counteragentName: string
  linkedOrderId: string
  linkedInvoiceId?: string
  notes?: string
}

async function createLinkedExpense(dto: CreateLinkedExpenseDto): Promise<ShiftExpenseOperation> {
  const expense: ShiftExpenseOperation = {
    id: generateId(),
    type: 'supplier_payment',
    amount: dto.amount,
    counteragentId: dto.counteragentId,
    counteragentName: dto.counteragentName,
    status: 'confirmed', // Сразу confirmed!
    linkingStatus: 'fully_linked',
    linkedOrderId: dto.linkedOrderId,
    linkedInvoiceId: dto.linkedInvoiceId,
    linkedAmount: dto.amount,
    performedBy: currentUser,
    performedAt: new Date().toISOString(),
    notes: dto.notes
  }

  // Добавляем в текущую смену
  await addExpenseToCurrentShift(expense)

  // Создаем транзакцию в Account Store
  await createExpenseTransaction(expense)

  return expense
}

// Scenario B: Offline payment
interface CreateUnlinkedExpenseDto {
  amount: number
  counteragentId: string
  counteragentName: string
  notes?: string
}

async function createUnlinkedExpense(
  dto: CreateUnlinkedExpenseDto
): Promise<ShiftExpenseOperation> {
  const expense: ShiftExpenseOperation = {
    id: generateId(),
    type: 'unlinked_expense',
    amount: dto.amount,
    counteragentId: dto.counteragentId,
    counteragentName: dto.counteragentName,
    status: 'completed', // Сразу completed для кассы
    linkingStatus: 'unlinked',
    linkedAmount: 0,
    unlinkedAmount: dto.amount,
    performedBy: currentUser,
    performedAt: new Date().toISOString(),
    notes: dto.notes || 'Needs linking in backoffice'
  }

  // Добавляем в текущую смену
  await addExpenseToCurrentShift(expense)

  // НЕ создаем транзакцию - создастся при связывании в backoffice

  return expense
}
```

**Completion Criteria:**

- [ ] `usePosReceipt` composable created and works with supplier_2
- [ ] `useExpenseLinking` composable works with counteragent balance
- [ ] shiftsStore extended with `createLinkedExpense`, `createUnlinkedExpense`, `findPendingPaymentForOrder`
- [ ] Unit tests for critical functions

---

### Phase 4: POS Receipt UI

**Sprint:** 2
**Goal:** Create product receipt interface in POS

**Directory structure:**

```
src/views/pos/receipts/
    PosReceiptsView.vue           # Main view
    components/
        PendingOrdersList.vue     # Orders list for receipt
        PosReceiptForm.vue        # Receipt form
        ReceiptItemRow.vue        # Item row
        ReceiptSummary.vue        # Totals and discrepancies
        QuickPaymentWidget.vue    # Payment widget
    dialogs/
        SelectOrderDialog.vue     # Order selection
        ConfirmReceiptDialog.vue  # Confirmation
        DiscrepancyAlertDialog.vue
    index.ts
```

**PosReceiptForm.vue - Key features:**

- Auto-fill from selected PurchaseOrder
- Edit only: `receivedQuantity`, `actualPrice`
- Automatic discrepancy calculation
- Optional payment (creates `unlinked_expense`)
- **Simplified discrepancy UI** (NOT full dialog like backoffice):
  - Visual indicators: green/yellow/red on items
  - Summary badge showing total discrepancy
  - Warning confirmation before completion
  - `discrepancy_acknowledged: boolean` flag

**Navigation:**

- Add "Receipt" button to `PosMainView.vue` (mdi-package-down)
- Route: `/pos/receipts`
- Access: cashier, manager, admin

**Completion Criteria:**

- [ ] PosReceiptsView displays pending orders
- [ ] Receipt form allows editing quantities
- [ ] QuickPaymentWidget creates unlinked_expense
- [ ] Navigation added to POS menu

---

### Phase 5: Payments Management UI (Backoffice)

**Sprint:** 3
**Goal:** Create unified Payments section with Pending/Unlinked/History tabs

**Location:** New section in Accounts navigation → Payments
**Route:** `/accounts/payments`

**Directory structure:**

```
src/views/backoffice/accounts/payments/
    PaymentsView.vue              # Main view with tabs
    components/
        PendingPaymentsList.vue   # Tab 1: Pending payments (Mode A)
        UnlinkedExpensesList.vue  # Tab 2: Unlinked expenses (Mode B)
        PaymentHistoryList.vue    # Tab 3: Payment history
        LinkExpenseWidget.vue     # Widget for linking expense to invoice
        BalanceAdjustmentInfo.vue # Balance adjustment display
        InvoiceSuggestions.vue    # NEW: Show matching invoices (suggestions only)
    dialogs/
        LinkExpenseDialog.vue     # Link expense to invoice dialog
        UnlinkExpenseDialog.vue   # NEW: Unlink with rollback (Manager + Admin only)
        PaymentDetailsDialog.vue  # Payment details
        CreatePaymentDialog.vue   # Create new pending payment
```

**Tabs Structure:**

```typescript
const tabs = [
  { id: 'pending', label: 'Pending Payments', icon: 'mdi-clock-outline' },
  { id: 'unlinked', label: 'Unlinked Expenses', icon: 'mdi-link-off' },
  { id: 'history', label: 'Payment History', icon: 'mdi-history' }
]
```

**Integration:**

- Add "Payments" to Accounts navigation (sidebar)
- Move `PendingPaymentsWidget` logic from AccountDetailView
- Show link status in ShiftExpensesList
- Add quick link to Payments from PurchaseOrderDetailsView

**InvoiceSuggestions.vue features:**

- Load invoices for same counteragent
- Sort by amount "closeness" to expense
- Show badges: "Exact match" / "Close match (<5%)" / amount difference
- Click to select (NOT auto-link)

**UnlinkExpenseDialog.vue features:**

- Manager + Admin access only
- Show original link details
- Option to revert balance adjustment
- Require reason for audit trail

**Completion Criteria:**

- [ ] PaymentsView displays with 3 tabs
- [ ] PendingPaymentsList shows payments awaiting confirmation
- [ ] UnlinkedExpensesList shows expenses with unlinked status
- [ ] LinkExpenseDialog allows selecting invoice and amount
- [ ] InvoiceSuggestions shows matching invoices with badges
- [ ] UnlinkExpenseDialog works for Manager + Admin only
- [ ] Amount difference correctly recorded in counteragent balance
- [ ] Navigation added to Accounts section

---

### Phase 5.5: Expense Mode Settings

**Sprint:** 2
**Goal:** Add expense mode configuration to PaymentSettingsView

**File:** `src/views/catalog/PaymentSettingsView.vue`

Add new section "Expense Settings":

- Default expense mode: 'backoffice_first' | 'cashier_first'
- Allow cashier direct expense: boolean
- Auto-suggest threshold: number (% difference for "Close match" badge)

**Settings Storage (uses app_settings table from Phase 2):**

```typescript
interface ExpenseSettings {
  defaultExpenseMode: 'backoffice_first' | 'cashier_first'
  allowCashierDirectExpense: boolean
  autoSuggestThreshold: number // default 0.05 (5%)
}

// Service to manage settings
class AppSettingsService {
  async getExpenseSettings(): Promise<ExpenseSettings>
  async updateExpenseSettings(settings: Partial<ExpenseSettings>): Promise<void>
}
```

**POS Initialization:**

- Fetch settings from `app_settings` table
- Cache in localStorage for offline access
- Refresh on shift start

**Completion Criteria:**

- [ ] Expense Settings section added to PaymentSettingsView
- [ ] Settings saved to app_settings table
- [ ] Settings loaded during POS initialization
- [ ] Settings cached in localStorage for offline
- [ ] Settings accessible from POS and backoffice

---

### Phase 5.6: POS Counteragents Access

**Sprint:** 1
**Goal:** Enable cashier to access on_delivery counteragents

**Files to modify:**

- `src/core/initialization/dependencies.ts` - Add shouldLoadPosCounterAgents()
- `src/stores/counteragents/counteragentsStore.ts` - Add loadOnDeliveryCounterAgents()

**Implementation:**

```typescript
// In counteragentsStore
async function loadOnDeliveryCounterAgents(): Promise<void> {
  const { data } = await supabase
    .from('counteragents')
    .select('*')
    .eq('payment_terms', 'on_delivery')
    .eq('is_active', true)

  posCounterAgents.value = data || []
}
```

**Completion Criteria:**

- [ ] loadOnDeliveryCounterAgents() method added
- [ ] POS initializes counteragents for cashier role
- [ ] Only on_delivery counteragents loaded for POS

---

~~### Phase 6: Sync Adapter~~ **УДАЛЕНА**

> **Не нужна:** Receipt создается напрямую в backoffice (ONLINE). Нет локального хранения, нет синхронизации, нет конфликтов.

---

## 5. FILES SUMMARY

### Files to Modify

| File                                                             | Changes                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/stores/pos/shifts/types.ts`                                 | Add ExpenseLinkingStatus, ExpenseInvoiceLink, extend ShiftExpenseOperation |
| `src/stores/counteragents/types.ts`                              | Add expense_overpayment, expense_underpayment, expense_link_reversal       |
| `src/stores/counteragents/counteragentsStore.ts`                 | Add loadOnDeliveryCounterAgents(), posCounterAgents                        |
| `src/stores/counteragents/composables/useCounteragentBalance.ts` | Refactor to use CounteragentBalanceService                                 |
| `src/stores/counteragents/integrations/automatedPayments.ts`     | Refactor to use CounteragentBalanceService                                 |
| `src/stores/pos/shifts/shiftsStore.ts`                           | Add createUnlinkedExpense, getExpensesByLinkingStatus                      |
| `src/views/pos/PosMainView.vue`                                  | Add navigation to receipts                                                 |
| `src/views/catalog/PaymentSettingsView.vue`                      | Add Expense Settings section                                               |
| `src/core/initialization/dependencies.ts`                        | Add shouldLoadPosCounterAgents()                                           |
| `src/router/index.ts`                                            | Add /pos/receipts, /accounts/payments routes                               |

### New Files to Create

| File                                                                       | Purpose                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/stores/counteragents/services/CounteragentBalanceService.ts`          | **NEW** Unified balance calculation              |
| `src/stores/pos/receipts/`                                                 | Composable module for POS receipts (NOT a store) |
| `src/stores/pos/receipts/composables/usePosReceipt.ts`                     | Main composable using supplier_2 store           |
| `src/services/AppSettingsService.ts`                                       | **NEW** Manage app_settings table                |
| `src/views/pos/receipts/`                                                  | New UI module for POS receipt                    |
| `src/views/backoffice/accounts/payments/`                                  | Payments management UI                           |
| `src/views/backoffice/accounts/payments/components/InvoiceSuggestions.vue` | **NEW** Invoice suggestions                      |
| `src/views/backoffice/accounts/payments/dialogs/UnlinkExpenseDialog.vue`   | **NEW** Unlink with rollback                     |
| `src/stores/pos/shifts/composables/useExpenseLinking.ts`                   | Linking logic with validation                    |
| `src/supabase/migrations/069_expense_linking.sql`                          | DB migration (NO pos_receipts table)             |
| ~~`src/core/sync/adapters/PosReceiptSyncAdapter.ts`~~                      | **УДАЛЕН** - не нужен (online only)              |

### Existing Components to Reuse (as pattern)

| File                                                                      | Reuse For                            |
| ------------------------------------------------------------------------- | ------------------------------------ |
| `src/views/supplier_2/components/receipts/EditableReceiptItemsWidget.vue` | Pattern for POS receipt item editing |
| `src/views/supplier_2/components/receipts/ReceiptTable.vue`               | Pattern for receipt table layout     |
| `src/views/accounts/components/PendingPaymentsWidget.vue`                 | Move/refactor to PaymentsView        |

---

## 5.5 IMPLEMENTATION ORDER (UPDATED - УПРОЩЕНО)

> **Изменения:** Убрана Phase 6 (Sync Adapter). Receipt создается напрямую online.

### Sprint 1: Foundation

1. [ ] Database migration (Phase 2) - expense_linking tables, app_settings, audit table
2. [ ] Type extensions (Phase 1.1, 1.2, 1.3) - NO PosReceipt with syncStatus
3. [ ] CounteragentBalanceService (Phase 1.4) - unify balance calculation
4. [ ] `usePosReceipt` composable (Phase 3.1) - using existing supplier_2 store
5. [ ] Update types.gen.ts
6. [ ] POS counteragents access (Phase 5.6) - loadOnDeliveryCounterAgents()

### Sprint 2: Settings & Configuration

7. [ ] AppSettingsService for app_settings table
8. [ ] Add Expense Settings section to PaymentSettingsView (Phase 5.5)
9. [ ] Add route `/accounts/payments` to router

### Sprint 3: POS Receipt Module (ONLINE ONLY)

10. [ ] PosReceiptsView.vue + components (ONLINE only, show message if offline)
11. [ ] PosReceiptForm.vue - PRE-FILLED from order, editable for discrepancies
12. [ ] Simplified discrepancy indicators (visual: green/yellow/red)
13. [ ] QuickPaymentWidget.vue (creates unlinked_expense)
14. [ ] Add navigation to POS
15. [ ] Direct integration with `useReceipts()` from supplier_2

### Sprint 4: Payments Management UI (Backoffice)

16. [ ] PaymentsView.vue with tabs (Pending/Unlinked/History)
17. [ ] PendingPaymentsList.vue (move from AccountDetailView)
18. [ ] UnlinkedExpensesList.vue
19. [ ] InvoiceSuggestions.vue (suggestions, not auto-link)
20. [ ] LinkExpenseDialog.vue
21. [ ] UnlinkExpenseDialog.vue (Manager + Admin only)
22. [ ] Add "Payments" to Accounts navigation

### Sprint 5: Expense Linking Logic + Testing

23. [ ] useExpenseLinking composable
24. [ ] Link amount validation
25. [ ] Unlink with balance rollback
26. [ ] Linking audit trail
27. [ ] Integration with counteragent balance
28. [ ] Update shiftsStore with new methods
29. [ ] End-to-end testing Mode A (backoffice first)
30. [ ] End-to-end testing Mode B (cashier first)
31. [ ] Edge cases (partial links, balance adjustments)
32. [ ] Offline expense creation testing

~~### Sprint 6: Sync Adapter~~ **УДАЛЕН** - не нужен

---

## 6. DEFINITION OF DONE

### MVP (Minimum Viable Product)

- [ ] Cashier can create unlinked_expense with counteragent specified
- [ ] Manager sees list of unlinked expenses
- [ ] Manager can link expense to invoice
- [ ] Amount difference recorded in counteragent balance

### Full Implementation

- [ ] POS Receipt module fully working (ONLINE only)
- [ ] Both modes (Mode A and Mode B) working
- [ ] ~~Sync between POS receipt and backoffice Receipt~~ **НЕ НУЖНО** - создается напрямую
- [ ] UI for viewing linking history
- [ ] Reports on unlinked expenses

---

## 7. RISKS AND MITIGATION (UPDATED - УПРОЩЕНО)

| Risk                                        | Probability | Impact       | Mitigation                              |
| ------------------------------------------- | ----------- | ------------ | --------------------------------------- |
| Balance calculation divergence              | High        | High         | CounteragentBalanceService (Phase 1.4)  |
| ~~Offline receipt data loss~~               | ~~Medium~~  | ~~Critical~~ | **RESOLVED:** Receipt = ONLINE only     |
| ~~Double receipt creation (sync conflict)~~ | ~~Medium~~  | ~~High~~     | **RESOLVED:** No sync, created directly |
| Over-linking expense/invoice                | Medium      | Medium       | Link amount validation (Phase 3.2)      |
| No unlink audit trail                       | Low         | Medium       | Audit table + logging (Phase 2)         |
| UI complexity                               | Medium      | Low          | Simplified discrepancy UI for POS       |
| Network loss during receipt                 | Low         | Medium       | Show error, don't save partial state    |

---

## 8. FUTURE ENHANCEMENTS (POSTPONED)

These items were discussed but postponed for future sprints:

| Feature                                | Reason for Postponement                              |
| -------------------------------------- | ---------------------------------------------------- |
| **Split Delivery Support**             | Complex feature, current MVP doesn't require it      |
| **Aging Report for Unlinked Expenses** | Nice-to-have, not critical for MVP                   |
| **Balance Discrepancy Alerts**         | Can be added after core functionality works          |
| **Auto-link (automatic linking)**      | Decision: suggestions only, manual linking preferred |
