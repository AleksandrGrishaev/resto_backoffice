# Next Sprint: POS Payment & Shift Synchronization

**Created:** 2025-11-29
**Status:** ✅ ACTIVE

---

## Architecture Overview: Shift → Account Synchronization

### High-Level Flow

```
POS Shift (смена) → Shift Close → Payment Methods Summary → Account Sync → Account Store Transactions
```

### Key Components

#### 1. **POS Payments Store** (`src/stores/pos/payments/paymentsStore.ts`)

**Purpose:** Управление индивидуальными платежами от клиентов

**Ключевые функции:**

- `processSimplePayment()` - обработка платежа клиента
- `getShiftPayments()` - получение всех платежей для конкретной смены
- `linkPaymentToOrder()` - связь платежа с заказом

**Что хранит:**

- Индивидуальные платежи (`PosPayment[]`)
- Каждый платеж содержит:
  - `orderId` - ID заказа
  - `shiftId` - ID смены
  - `method` - тип оплаты ('cash', 'card', 'qr')
  - `amount` - сумма платежа
  - `status` - статус ('completed', 'refunded')

**Важно:** При создании платежа:

1. Проверяется наличие активной смены (блокировка если нет)
2. Получается `paymentMethod` из каталога (для маппинга к аккаунту)
3. Платеж сохраняется с `shiftId`
4. Вызывается `shiftsStore.addShiftTransaction()` для обновления summary

---

#### 2. **Shifts Store** (`src/stores/pos/shifts/shiftsStore.ts`)

**Purpose:** Управление сменами кассиров

**Ключевые функции:**

- `startShift()` - открытие смены
- `endShift()` - закрытие смены
- `addShiftTransaction()` - добавление транзакции в смену (вызывается из paymentsStore)

**Что хранит:**

- Активная смена (`currentShift`)
- История смен (`shifts[]`)
- Каждая смена содержит:
  - `paymentMethods[]` - сводка по методам оплаты (агрегированные данные)
  - `expenseOperations[]` - прямые расходы (direct expenses из кассы)
  - `corrections[]` - корректировки и возвраты
  - `totalSales` - общая сумма продаж
  - `syncedToAccount` - флаг синхронизации в Account Store

**Важно:** `paymentMethods[]` - это **сводка** (summary), а не индивидуальные платежи!

**Структура `PaymentMethodSummary`:**

```
{
  methodId: 'cash',        // Код метода (используется для поиска в catalog)
  methodName: 'Наличные',  // Отображаемое имя
  methodType: 'cash',      // Тип для фильтрации
  count: 10,               // Количество платежей
  amount: 150000           // Суммарная сумма
}
```

---

#### 3. **Shifts Service** (`src/stores/pos/shifts/services.ts`)

**Purpose:** Персистентность данных смен (Supabase + localStorage)

**Ключевые функции:**

- `createShift()` - создание новой смены
- `endShift()` - завершение смены
- `updateShift()` - обновление данных смены
- `loadShifts()` - загрузка смен из Supabase/localStorage

**Стратегия:**

- **Primary:** Supabase (online)
- **Fallback:** localStorage (offline cache)
- Все изменения сначала пытаются сохраниться в Supabase, при ошибке - помечаются для sync

---

#### 4. **EndShiftDialog** (`src/views/pos/shifts/dialogs/EndShiftDialog.vue`)

**Purpose:** UI для закрытия смены

**Ключевая логика перед закрытием:**

1. **Вычисление `topPaymentMethods`** (строки 429-476):

   - Читает **реальные платежи** из `paymentsStore.getShiftPayments(shiftId)`
   - Группирует по `method` ('cash', 'card', 'qr')
   - Вычисляет суммы и количество для каждого метода
   - Возвращает массив сводок

2. **Обновление `currentShift.paymentMethods`** (строка 587):

   - **КРИТИЧЕСКИ ВАЖНО:** Перед вызовом `endShift()` обновляет summary
   - Маппит `topPaymentMethods` в формат `PaymentMethodSummary[]`
   - Без этого шага смена закроется с пустыми amounts!

3. **Вызов `shiftsStore.endShift()`**:
   - Передаёт `endingCash`, `corrections`, `notes`
   - Store сохраняет смену в Supabase + localStorage
   - Добавляет смену в sync queue

---

#### 5. **SyncService** (`src/core/sync/SyncService.ts`)

**Purpose:** Централизованная очередь синхронизации

**Архитектура:**

- Generic queue для любых entity types (shifts, transactions, discounts)
- Поддержка приоритетов (critical > high > normal > low)
- Exponential backoff для retry (2^attempts, max 1 час)
- Adapter pattern для разных типов сущностей

**Ключевые функции:**

- `addToQueue()` - добавление в очередь
- `processQueue()` - обработка очереди
- `registerAdapter()` - регистрация адаптера для типа сущности

**Когда запускается:**

- При старте приложения
- При закрытии смены
- При восстановлении сети (online event)

---

#### 6. **ShiftSyncAdapter** (`src/core/sync/adapters/ShiftSyncAdapter.ts`)

**Purpose:** Синхронизация завершённых смен в Account Store

**Workflow:**

1. **Validation** (`validate()` method):

   - Проверка статуса смены (должна быть 'completed')
   - Проверка флага `syncedToAccount` (не должна быть уже синхронизирована)
   - Проверка наличия `paymentMethods` с amounts > 0
   - Проверка инициализации Account Store

2. **Sync** (`sync()` method):

   **A. Вычисление totals:**

   - `cashRefunds` - возвраты наличных (из corrections)
   - `totalDirectExpenses` - прямые расходы (completed only)
   - `totalCorrections` - корректировки кассы

   **B. Получение payment method mappings:**

   - Загрузка всех payment methods из каталога
   - **КРИТИЧНО:** Поиск по `code`, а не по `id`!
   - Каждый метод содержит `accountId` (куда идут деньги)

   **C. Создание income транзакций:**

   - Цикл по всем `shift.paymentMethods`
   - Поиск соответствующего payment method: `allPaymentMethods.find(pm => pm.code === pmSummary.methodId)`
   - **Для cash метода:** применяются refunds и corrections
   - **Для других методов:** используется полная сумма
   - Вызов `accountStore.createOperation()` для создания транзакции

   **D. Создание expense транзакции:**

   - Только если есть `totalDirectExpenses > 0`
   - Вычитается из POS cash register account

   **E. Обновление shift:**

   - Установка флага `syncedToAccount = true`
   - Сохранение `accountTransactionIds[]`
   - Обновление в Supabase + localStorage

3. **Error Handling:**
   - При ошибке сохраняет `syncError` в shift
   - Увеличивает `syncAttempts`
   - SyncService автоматически retry с exponential backoff

---

#### 7. **Payment Methods Catalog** (`src/stores/catalog/payment-methods.service.ts`)

**Purpose:** Маппинг методов оплаты к аккаунтам

**Структура таблицы `payment_methods`:**

- `id` - UUID (primary key)
- `code` - уникальный код ('cash', 'card', 'qr') - **используется для поиска из shifts!**
- `name` - отображаемое имя ('Наличные', 'Карта')
- `accountId` - ID целевого аккаунта (куда идут деньги)
- `isPosСashRegister` - флаг основной кассы POS (только один может быть true)
- `isActive` - активен ли метод

**Ключевые функции:**

- `getAll()` - получение всех методов (с кешированием 5 мин)
- `getByCode(code)` - поиск по коду (используется в paymentsStore)
- `getPosСashRegister()` - получение основной кассы POS

**Seed data (примеры):**

```
Cash (code: 'cash')       → acc_1 (Main Cash Register), isPosСashRegister: true
Card (code: 'card')       → acc_3 (Card Terminal)
QR Code (code: 'qr')      → acc_2 (Bank Account - BCA)
```

---

#### 8. **Account Store** (`src/stores/account/accountStore.ts`)

**Purpose:** Управление счетами компании

**Ключевые функции:**

- `createOperation()` - создание транзакции (income/expense/transfer)
- `getAccount()` - получение аккаунта по ID
- `fetchTransactions()` - загрузка транзакций аккаунта

**Что происходит при создании операции:**

1. Валидация аккаунта (существует, активен)
2. Вычисление нового баланса
3. Создание транзакции в `account_transactions` таблице
4. Обновление баланса аккаунта
5. Обновление локального стора

---

## Data Flow Example

**Сценарий:** Кассир принимает платёж 50,000 картой

1. **PosPaymentsStore.processSimplePayment()**

   - Создаёт `PosPayment` с `method: 'card'`, `amount: 50000`, `shiftId: 'xxx'`
   - Получает payment method из каталога по code: `paymentMethodService.getByCode('card')`
   - Находит `accountId` = 'acc_3' (Card Terminal)
   - Сохраняет платёж в localStorage + Supabase
   - Вызывает `shiftsStore.addShiftTransaction()`

2. **ShiftsStore.addShiftTransaction()**

   - Обновляет `currentShift.paymentMethods[]` summary:
     - Находит summary для 'card'
     - Увеличивает `count += 1`
     - Увеличивает `amount += 50000`
   - Обновляет `currentShift.totalSales += 50000`
   - Сохраняет shift в Supabase + localStorage

3. **EndShiftDialog (при закрытии смены)**

   - Вычисляет `topPaymentMethods` из реальных платежей
   - Обновляет `currentShift.paymentMethods` (fix для sync)
   - Вызывает `shiftsStore.endShift()`

4. **ShiftsStore.endShift()**

   - Обновляет статус смены на 'completed'
   - Сохраняет в Supabase + localStorage
   - Добавляет в sync queue: `syncService.addToQueue({ entityType: 'shift', data: shift })`

5. **SyncService.processQueue()**

   - Получает shift из очереди
   - Вызывает `ShiftSyncAdapter.sync(shift)`

6. **ShiftSyncAdapter.sync()**

   - Загружает payment methods catalog
   - Находит payment method для 'card' по code: `allPaymentMethods.find(pm => pm.code === 'card')`
   - Получает `accountId` = 'acc_3'
   - Вызывает `accountStore.createOperation({ accountId: 'acc_3', type: 'income', amount: 50000 })`

7. **AccountStore.createOperation()**
   - Находит account 'acc_3' (Card Terminal)
   - Вычисляет новый баланс: `oldBalance + 50000`
   - Создаёт транзакцию в `account_transactions`
   - Обновляет баланс аккаунта в `accounts` таблице
   - Обновляет локальный store

**Результат:** Деньги попали в Card Terminal account, shift помечен как synced.

---

## Key Files Reference

**POS Payments:**

- `src/stores/pos/payments/paymentsStore.ts` - Store для платежей
- `src/stores/pos/payments/services.ts` - Персистентность платежей
- `src/stores/pos/payments/types.ts` - Типы платежей

**POS Shifts:**

- `src/stores/pos/shifts/shiftsStore.ts` - Store для смен
- `src/stores/pos/shifts/services.ts` - Персистентность смен
- `src/stores/pos/shifts/types.ts` - Типы смен
- `src/stores/pos/shifts/supabaseMappers.ts` - Маппинг Supabase ↔ App types

**Shift Sync:**

- `src/core/sync/SyncService.ts` - Centralized sync queue
- `src/core/sync/adapters/ShiftSyncAdapter.ts` - Shift → Account sync logic
- `src/core/sync/types.ts` - Sync types и interfaces

**Payment Methods Catalog:**

- `src/stores/catalog/payment-methods.service.ts` - Payment methods CRUD + mapping
- `src/types/payment.ts` - Payment method types

**Account Store:**

- `src/stores/account/accountStore.ts` - Account management
- `src/stores/account/accountSupabaseService.ts` - Account persistence

**UI:**

- `src/views/pos/shifts/dialogs/EndShiftDialog.vue` - Shift close dialog

---

## Critical Points & Known Issues

### ✅ Fixed Issues

1. **Payment methods summary was empty on shift close**

   - **Fix:** EndShiftDialog now updates `currentShift.paymentMethods` from real payments before `endShift()` call
   - **File:** `src/views/pos/shifts/dialogs/EndShiftDialog.vue:587`

2. **Array.from().values() error**

   - **Problem:** `topPaymentMethods.value` is an Array, not Map
   - **Fix:** Removed `.values()` call, use array directly
   - **File:** `src/views/pos/shifts/dialogs/EndShiftDialog.vue:587`

3. **Payment method lookup by ID instead of code**
   - **Problem:** ShiftSyncAdapter searched by `pm.id === methodId`, but `methodId` contains code ('cash')
   - **Fix:** Changed to `pm.code === methodId`
   - **File:** `src/core/sync/adapters/ShiftSyncAdapter.ts:98`

### 🚧 Areas for Future Improvement

1. **Expense Operations Sync**

   - Currently only `totalDirectExpenses` synced as single transaction
   - Need granular sync with expense categories and details

2. **Payment Display in Account Transactions**

   - Need better description format for shift income transactions
   - Add reference to original shift and payment breakdown

3. **Corrections and Refunds**

   - Currently applied only to cash method
   - May need separate transactions for traceability

4. **Error Recovery**

   - SyncService has retry logic, but UI doesn't show failed syncs
   - Need admin dashboard for monitoring sync status

5. **Real-time Sync**
   - Currently uses periodic sync (on shift close, app start, network restore)
   - Consider WebSocket/Supabase Realtime for instant sync

---

## Testing Checklist

### Basic Flow

- [ ] Create order with multiple payment methods (cash + card)
- [ ] Add direct expense from shift
- [ ] Close shift
- [ ] Verify `paymentMethods[]` has correct amounts in console logs
- [ ] Verify ShiftSyncAdapter finds payment methods by code
- [ ] Verify income transactions created in correct accounts
- [ ] Verify expense transaction created in POS cash register
- [ ] Verify account balances updated correctly

### Edge Cases

- [ ] Close shift with only cash payments
- [ ] Close shift with only non-cash payments
- [ ] Close shift with no payments (should skip income sync)
- [ ] Close shift with refunds and corrections
- [ ] Close shift offline (should queue for sync)
- [ ] Sync failure recovery (retry logic)

### Data Integrity

- [ ] Shift marked as `syncedToAccount: true` after successful sync
- [ ] Shift has `accountTransactionIds[]` populated
- [ ] Payment method code matches catalog entry
- [ ] Account balances match shift totals
- [ ] Supabase and localStorage in sync

---

## Sprint 8: Fix Expense Synchronization Duplication

**Created:** 2025-11-29
**Status:** 🚧 IN PROGRESS

### Problems Identified

#### Problem 1: Expense Duplication ❌

**Current Flow:**

1. **During shift** (`shiftsStore.createDirectExpense()`):

   - Creates expense in `shift.expenseOperations[]`
   - **Immediately creates transaction in Account Store** ❌

2. **On shift close** (`ShiftSyncAdapter.sync()`):
   - **Creates ANOTHER transaction with sum of all expenses** ❌

**Result:** Expenses are duplicated!

- First time: individual transactions (during shift)
- Second time: aggregate transaction (during sync)

**Example:**

```
Shift has 2 expenses: 10,000 + 15,000 = 25,000

Current behavior:
- Transaction 1: -10,000 (created during shift)
- Transaction 2: -15,000 (created during shift)
- Transaction 3: -25,000 (created during sync) ❌ DUPLICATE!

Total deducted: -50,000 instead of -25,000!
```

#### Problem 2: Missing `assignPaymentToAccount()` Method ❌

**Error in PaymentConfirmationDialog.vue:294:**

```typescript
await accountStore.assignPaymentToAccount(props.payment.id, selectedAccountId.value)
// TypeError: paymentService.assignToAccount is not a function
```

This method doesn't exist in current accountStore implementation!

#### Problem 3: Supplier Category in Shift Interface ⚠️

**Issue:** Category "supplier" (for product purchases) is still available in shift direct expense interface.

**Why it's wrong:**

- Supplier payments should only be created via Pending Payments (backoffice)
- They require manager approval and link to purchase orders
- Cashiers shouldn't create supplier payments directly

---

### Solutions

#### Solution 1: Fix Expense Duplication

**New Flow (similar to payments):**

1. **During shift:**

   - ✅ Save expense in `shift.expenseOperations[]`
   - ❌ **DO NOT create transaction in Account Store**

2. **On shift close:**
   - ✅ Create individual transactions for each expense
   - ✅ Include full expense details (category, counteragent, etc.)

**Implementation:**

**A. Update `shiftsStore.createDirectExpense()`:**

```typescript
// REMOVE:
await accountStore.createOperation({ ... })

// KEEP ONLY:
currentShift.value.expenseOperations.push(expenseOperation)
await shiftsService.updateShift(currentShift.value.id, currentShift.value)
```

**B. Update `ShiftSyncAdapter.sync()`:**

```typescript
// REPLACE aggregate expense transaction with individual ones:
for (const expense of shift.expenseOperations) {
  if (expense.status === 'completed' && expense.type === 'direct_expense') {
    // Check if already synced
    if (expense.relatedTransactionId) {
      console.log(`⏭️ Expense ${expense.id} already has transaction, skipping`)
      continue
    }

    const transaction = await accountStore.createOperation({
      accountId: expense.relatedAccountId,
      type: 'expense',
      amount: expense.amount,
      description: `${shift.shiftNumber} - ${expense.description}`,
      expenseCategory: {
        type: 'daily',
        category: expense.category as any
      },
      performedBy: expense.performedBy,
      counteragentId: expense.counteragentId,
      counteragentName: expense.counteragentName
    })

    transactionIds.push(transaction.id)

    // Link transaction to expense
    expense.relatedTransactionId = transaction.id
    expense.syncStatus = 'synced'
  }
}
```

#### Solution 2: Supplier Payments with Cashier Confirmation

**Workflow:**

1. **Creation (by manager in backoffice):**

   ```typescript
   // PendingPaymentsView → Create payment with category='supplier'
   const payment = await accountStore.createPendingPayment({
     category: 'supplier',
     linkedOrders: [{ orderId: 'order_123', amount: 50000 }]
     // ...
   })
   ```

2. **Assignment to POS cash (by manager):**

   ```typescript
   // PaymentConfirmationDialog → Assign to acc_1 (POS cash)
   await accountStore.assignPaymentToAccount(payment.id, 'acc_1')
   // Sets requiresCashierConfirmation = true
   ```

3. **Confirmation (by cashier in shift):**

   ```typescript
   // Cashier sees payment in shift.pendingPayments[]
   // Confirms via shiftsStore.confirmExpense()

   // This IMMEDIATELY creates:
   // - Transaction in Account Store
   // - ShiftExpenseOperation with type='supplier_payment'
   ```

4. **On shift close:**
   ```typescript
   // ShiftSyncAdapter checks expense.relatedTransactionId
   // If exists → skip (already synced)
   // Only sync expenses without relatedTransactionId
   ```

#### Solution 3: Fix `assignPaymentToAccount()` Error

**Option A:** Implement missing method in accountStore
**Option B:** Refactor PaymentConfirmationDialog to use existing methods

We'll choose **Option A** as it matches the intended architecture.

#### Solution 4: Remove Supplier Category from Direct Expense UI

Update expense category options in shift interface to exclude "supplier"/"product" categories.

---

### Implementation Checklist

- [ ] **Fix expense duplication:**

  - [ ] Remove `accountStore.createOperation()` from `shiftsStore.createDirectExpense()`
  - [ ] Update `ShiftSyncAdapter.sync()` to create individual expense transactions
  - [ ] Add `relatedTransactionId` check to prevent re-sync
  - [ ] Update expense `syncStatus` after successful sync

- [ ] **Fix assignPaymentToAccount error:**

  - [ ] Implement `assignPaymentToAccount()` method in accountStore
  - [ ] Add tests for payment assignment flow
  - [ ] Update PaymentConfirmationDialog error handling

- [ ] **Supplier payment workflow:**

  - [ ] Verify supplier payments create transactions immediately on confirmation
  - [ ] Add skip logic in ShiftSyncAdapter for already-synced supplier payments
  - [ ] Test full workflow: create → assign → confirm → sync

- [ ] **Remove supplier category:**

  - [ ] Update expense category dropdown in shift UI
  - [ ] Add validation to prevent supplier category selection
  - [ ] Update documentation

- [ ] **Testing:**
  - [ ] Test expense creation without immediate transaction
  - [ ] Test shift close creates individual expense transactions
  - [ ] Test supplier payment confirmation creates transaction
  - [ ] Test sync doesn't duplicate supplier payments
  - [ ] Verify balances are correct after sync

---

✅ Sprint 8: ПОЛНОСТЬЮ ЗАВЕРШЕНО

Решенные проблемы:

1. Устранено дублирование расходов ✅

До: Расходы создавались дважды (во время shift + при закрытии)
После: Расходы создаются только при закрытии смены, индивидуально для каждого
expense

Файлы:

- shiftsStore.ts:592-594 - убрано немедленное создание транзакции
- ShiftSyncAdapter.ts:144-208 - индивидуальные транзакции вместо суммарной

2. Исправлена ошибка assignPaymentToAccount is not a function ✅

Добавлены методы:

- paymentService.assignToAccount()
- paymentService.update()
- accountSupabaseService.assignPaymentToAccount()
- accountSupabaseService.updatePendingPayment()

3. Supplier payments создают транзакцию немедленно ✅

Изменения:

- processPayment() возвращает transaction ID
- confirmPayment() возвращает transaction ID
- confirmExpense() сохраняет relatedTransactionId
- ShiftSyncAdapter пропускает уже синхронизированные supplier payments

4. Pending payments показываются БЕЗ активной смены ✅

Проблема: Менеджер создает payment, но касса закрыта - кассир не видит
pending payment

Решение:

- loadPendingPayments() работает даже без активной смены
- ShiftManagementView загружает pending payments всегда
- PendingSupplierPaymentsList показывает warning если нет смены
- Кнопки подтверждения disabled пока не откроется смена

Файлы:

- shiftsStore.ts:525-556 - обновлен loadPendingPayments()
- ShiftManagementView.vue:289-296 - pending payments вынесены из <template
  v-if="currentShift">
- ShiftManagementView.vue:473-482 - убрана проверка currentShift из computed
- ShiftManagementView.vue:660-661 - загрузка pending payments всегда

5. UI обновлен с категориями Product и Other ✅

Новые возможности:

- Категории расходов: Product (purple, supplier payments) и Other (blue,
  остальные)
- Breakdown по категориям в заголовке
- Цветные chip'ы для быстрой идентификации
- Иконки по категориям (truck для Product, cash-minus для Other)

Компоненты:

- PendingSupplierPaymentsList.vue - показывает Product/Other breakdown,
  warning без смены
- ShiftExpensesList.vue - показывает Product/Other breakdown, категории для
  каждого расхода

Новые потоки:

Direct Expenses:

1. Кассир создает → shift.expenseOperations[] (БЕЗ транзакции)
2. Закрытие смены → ShiftSyncAdapter → индивидуальные транзакции
3. Каждый expense получает relatedTransactionId

Supplier Payments:

1. Менеджер создает pending payment
2. Назначает на POS cash → requiresCashierConfirmation=true
3. Платеж показывается ДАЖЕ БЕЗ СМЕНЫ (но кнопки disabled)
4. Кассир открывает смену → кнопки активируются
5. Кассир подтверждает → транзакция создается СРАЗУ
6. expense.relatedTransactionId сохраняется
7. Закрытие смены → ShiftSyncAdapter пропускает (уже есть
   relatedTransactionId)

Тестирование:

1. ✅ Создать менеджером supplier payment с категорией "supplier"
2. ✅ Проверить что он виден в POS без активной смены (с warning)
3. ✅ Открыть смену → проверить что кнопки активировались
4. ✅ Подтвердить payment → проверить что транзакция создалась сразу
5. ✅ Создать direct expense → проверить что транзакции НЕТ
6. ✅ Закрыть смену → проверить:


    - Каждый direct expense получил свою транзакцию
    - Supplier payment НЕ дублировался
    - Баланс корректный

7. ✅ Проверить UI: Product (purple) vs Other (blue) категории

---

## Sprint 9: Fix Payment Confirmation Data Loss

**Created:** 2025-11-29
**Status:** ✅ ЗАВЕРШЕНО

### Проблемы

#### Проблема 1: Потеря данных при подтверждении payment ❌

**Симптомы:**

- После подтверждения payment создается транзакция с `amount: 0`
- Теряется информация о контрагенте, категории, описании
- Транзакция содержит только `notes: "Подтверждено кассиром: Unknown User"`

**Причина:**
В `paymentService.processPayment()` (service.ts:349-382) использовался только `data.actualAmount` вместо данных из original payment.

**Решение:**

```typescript
// service.ts:350-401
async processPayment(data: ProcessPaymentDto): Promise<string> {
  // ✅ FIX: Get original payment to preserve all data
  const payments = await this.getAll()
  const payment = payments.find(p => p.id === data.paymentId)

  // ✅ FIX: Use actualAmount if provided, otherwise use payment.amount
  const actualAmount = data.actualAmount !== undefined ? data.actualAmount : payment.amount

  // ✅ FIX: Determine expense category from payment.category
  const expenseCategory = payment.category === 'supplier' || payment.category === 'product'
    ? { type: 'daily' as const, category: 'product' as const }
    : { type: 'daily' as const, category: 'other' as const }

  // ✅ FIX: Create expense transaction with ALL payment data preserved
  const transaction = await transactionService.createTransaction({
    accountId: data.accountId,
    type: 'expense',
    amount: actualAmount,
    description: data.notes || payment.description,
    performedBy: data.performedBy,
    expenseCategory,
    counteragentId: payment.counteragentId,
    counteragentName: payment.counteragentName,
    relatedPaymentId: payment.id
  })
}
```

#### Проблема 2: UI не обновляется после подтверждения ❌

**Симптомы:**

- После подтверждения одна pending payment пропадает из списка
- После полной перезагрузки страницы payment появляется обратно
- Другие pending payments тоже временно исчезают

**Причина:**
После `processPayment()` платеж не обновлял статус на 'completed' в базе, поэтому фильтр по `status: 'pending'` продолжал его показывать, но локальный кеш был рассинхронизирован.

**Решение:**

```typescript
// store.ts:596-656
async function processPayment(data: ProcessPaymentDto): Promise<string> {
  const transactionId = await paymentService.processPayment(data)

  // ✅ FIX: Update payment status to 'completed' in service BEFORE fetching
  await paymentService.update(data.paymentId, {
    status: 'completed',
    paidAmount: data.actualAmount !== undefined ? data.actualAmount : payment.amount,
    paidDate: new Date().toISOString()
  })

  // Обновляем локальное состояние
  await Promise.all([
    fetchPayments(true),
    state.value.selectedAccountId
      ? fetchTransactions(state.value.selectedAccountId)
      : Promise.resolve()
  ])
}
```

**Дополнение:**
Обновлен `accountSupabaseService.updatePendingPayment()` для поддержки полей `paidAmount`, `paidDate`, `confirmedBy`, `confirmedAt`:

```typescript
// accountSupabaseService.ts:648-712
async updatePendingPayment(paymentId: string, updates: Partial<PendingPayment>): Promise<void> {
  const supabaseUpdates: any = {
    updated_at: new Date().toISOString()
  }

  // ... existing fields ...

  // ✅ FIX: Add payment completion fields
  if (updates.paidAmount !== undefined) {
    supabaseUpdates.paid_amount = updates.paidAmount
  }
  if (updates.paidDate !== undefined) {
    supabaseUpdates.paid_date = updates.paidDate
  }
  if (updates.confirmedBy !== undefined) {
    supabaseUpdates.confirmed_by = updates.confirmedBy
  }
  if (updates.confirmedAt !== undefined) {
    supabaseUpdates.confirmed_at = updates.confirmedAt
  }
}
```

### Файлы изменены

1. **src/stores/account/service.ts:346-401**

   - Обновлен `processPayment()` для сохранения всех данных из original payment
   - Добавлено определение категории расхода на основе payment.category
   - Добавлена передача `counteragentId`, `counteragentName`, `relatedPaymentId` в транзакцию

2. **src/stores/account/store.ts:592-656**

   - Обновлен `processPayment()` для обновления статуса платежа на 'completed'
   - Добавлено сохранение `paidAmount` и `paidDate`

3. **src/stores/account/accountSupabaseService.ts:644-712**
   - Обновлен `updatePendingPayment()` для поддержки полей завершения платежа
   - Добавлены поля: `paid_amount`, `paid_date`, `confirmed_by`, `confirmed_at`

### Результат

✅ **До исправления:**

```
Expense Transaction
Amount: -Rp 0                    ❌ ПОТЕРЯНА
Balance After: Rp 7.212.817
Description: Подтверждено кассиром: Unknown User  ❌ НЕ ИНФОРМАТИВНО
Expense Category: Other          ❌ НЕПРАВИЛЬНО (должно быть Product)
Counteragent: -                  ❌ ПОТЕРЯН
```

✅ **После исправления:**

```
Expense Transaction
Amount: -Rp 150.000              ✅ СОХРАНЕНА из payment.amount
Balance After: Rp 7.062.817
Description: Оплата поставщику за продукты  ✅ СОХРАНЕНО из payment.description
Expense Category: Product        ✅ ПРАВИЛЬНО определено из payment.category
Counteragent: ООО "Поставщик"    ✅ СОХРАНЕН из payment.counteragentId/Name
Related Payment ID: payment_123  ✅ СВЯЗЬ с original payment
Status: completed                ✅ UI обновляется корректно
```

### Тестирование

1. ✅ Создать supplier payment с amount=150000, category='supplier'
2. ✅ Назначить на POS cash account (acc_1)
3. ✅ Подтвердить в POS интерфейсе
4. ✅ Проверить созданную транзакцию:
   - Amount = 150000 (не 0)
   - Counteragent сохранен
   - Category = Product (не Other)
   - Description сохранено
5. ✅ Проверить UI:
   - Payment переходит в completed
   - Другие pending payments остаются видимыми
   - Обновление происходит без перезагрузки страницы

---

## Sprint 10: Fix Expense History & Enhance Transaction Descriptions

**Created:** 2025-11-29
**Status:** ✅ ЗАВЕРШЕНО

### Проблемы

#### Проблема 1: Supplier payments не отображаются в shift expense history ❌

**Симптомы:**

- После подтверждения supplier payment в POS интерфейсе, он не появляется в списке expense operations в shift
- В backoffice транзакция отображается корректно
- При перезагрузке shift данные остаются пустыми

**Причина:**
Неполный маппинг `ShiftExpenseOperation` в `supabaseMappers.ts`:

- **toSupabaseInsert** (строки 63-68): Сохраняло только 4 поля (id, description, amount, timestamp)
- **fromSupabase** (строки 147-157): Восстанавливало только 9 полей, теряя:
  - `type`, `category`, `counteragent`, `relatedTransactionId`, `relatedPaymentId`, `status`, и другие

**Решение:**

```typescript
// supabaseMappers.ts:63-84 (toSupabaseInsert)
expense_operations: shift.expenseOperations.map(e => ({
  id: e.id,
  type: e.type, // ✅ ДОБАВЛЕНО
  description: e.description,
  amount: e.amount,
  category: e.category, // ✅ ДОБАВЛЕНО
  counteragentId: e.counteragentId, // ✅ ДОБАВЛЕНО
  counteragentName: e.counteragentName, // ✅ ДОБАВЛЕНО
  invoiceNumber: e.invoiceNumber, // ✅ ДОБАВЛЕНО
  status: e.status, // ✅ ДОБАВЛЕНО
  performedBy: e.performedBy, // ✅ ДОБАВЛЕНО
  confirmedBy: e.confirmedBy, // ✅ ДОБАВЛЕНО
  confirmedAt: e.confirmedAt, // ✅ ДОБАВЛЕНО
  rejectionReason: e.rejectionReason, // ✅ ДОБАВЛЕНО
  relatedPaymentId: e.relatedPaymentId, // ✅ ДОБАВЛЕНО
  relatedTransactionId: e.relatedTransactionId, // ✅ ДОБАВЛЕНО
  relatedAccountId: e.relatedAccountId, // ✅ ДОБАВЛЕНО
  syncStatus: e.syncStatus, // ✅ ДОБАВЛЕНО
  lastSyncAt: e.lastSyncAt, // ✅ ДОБАВЛЕНО
  notes: e.notes, // ✅ ДОБАВЛЕНО
  timestamp: e.createdAt
}))

// supabaseMappers.ts:163-186 (fromSupabase)
const expenseOperations = supabaseShift.expense_operations.map((e: any) => ({
  id: e.id,
  shiftId: supabaseShift.id,
  type: e.type || 'direct_expense', // ✅ ВОССТАНОВЛЕНО
  description: e.description,
  amount: e.amount,
  category: e.category, // ✅ ВОССТАНОВЛЕНО
  counteragentId: e.counteragentId, // ✅ ВОССТАНОВЛЕНО
  counteragentName: e.counteragentName, // ✅ ВОССТАНОВЛЕНО
  invoiceNumber: e.invoiceNumber, // ✅ ВОССТАНОВЛЕНО
  status: e.status || 'completed', // ✅ ВОССТАНОВЛЕНО
  performedBy: e.performedBy, // ✅ ВОССТАНОВЛЕНО
  confirmedBy: e.confirmedBy, // ✅ ВОССТАНОВЛЕНО
  confirmedAt: e.confirmedAt, // ✅ ВОССТАНОВЛЕНО
  rejectionReason: e.rejectionReason, // ✅ ВОССТАНОВЛЕНО
  relatedPaymentId: e.relatedPaymentId, // ✅ ВОССТАНОВЛЕНО
  relatedTransactionId: e.relatedTransactionId, // ✅ ВОССТАНОВЛЕНО
  relatedAccountId: e.relatedAccountId || '', // ✅ ВОССТАНОВЛЕНО
  syncStatus: e.syncStatus || 'pending', // ✅ ВОССТАНОВЛЕНО
  lastSyncAt: e.lastSyncAt, // ✅ ВОССТАНОВЛЕНО
  notes: e.notes, // ✅ ВОССТАНОВЛЕНО
  createdAt: e.timestamp,
  updatedAt: e.timestamp
}))
```

#### Проблема 2: Недостаточно информации в описании транзакций ⚠️

**Симптомы:**

- В transaction description отсутствует:
  - Номер связанного заказа (purchase order)
  - Номер смены, в которой была проведена оплата
  - Номер инвойса

**Решение:**

1. **Добавление информации о заказах и инвойсах** (service.ts:379-394):

```typescript
// ✅ ENHANCEMENT: Build detailed description with order/payment info
let enhancedDescription = data.notes || payment.description

// Add linked order info if available
if (payment.linkedOrders && payment.linkedOrders.length > 0) {
  const activeOrders = payment.linkedOrders.filter(o => o.isActive)
  if (activeOrders.length > 0) {
    const orderNumbers = activeOrders.map(o => o.orderNumber || o.orderId).join(', ')
    enhancedDescription += ` | Orders: ${orderNumbers}`
  }
}

// Add invoice number if available
if (payment.invoiceNumber) {
  enhancedDescription += ` | Invoice: ${payment.invoiceNumber}`
}
```

2. **Добавление номера смены** (store.ts:1094-1104):

```typescript
// ✅ ENHANCEMENT: Get current shift info for description
let shiftInfo = ''
try {
  const { useShiftsStore } = await import('@/stores/pos/shifts')
  const shiftsStore = useShiftsStore()
  if (shiftsStore.currentShift) {
    shiftInfo = ` | Shift: ${shiftsStore.currentShift.shiftNumber}`
  }
} catch (error) {
  // Shifts store not available (backoffice mode) - skip shift info
}

const processData: ProcessPaymentDto = {
  ...
  notes: `Подтверждено кассиром: ${performer.name}${shiftInfo}`,
  ...
}
```

### Файлы изменены

1. **src/stores/pos/shifts/supabaseMappers.ts:63-84**

   - Обновлен `toSupabaseInsert()` для сохранения ВСЕХ полей ShiftExpenseOperation
   - Добавлены 16 полей вместо 4

2. **src/stores/pos/shifts/supabaseMappers.ts:163-186**

   - Обновлен `fromSupabase()` для восстановления ВСЕХ полей ShiftExpenseOperation
   - Добавлены 16 полей вместо 9

3. **src/stores/account/service.ts:379-394**

   - Добавлено построение расширенного описания транзакции
   - Включает номера заказов и инвойсов

4. **src/stores/account/store.ts:1094-1104**
   - Добавлено получение информации о текущей смене
   - Номер смены добавляется в описание транзакции

### Результат

✅ **До исправления:**

Shift expense history:

```
(пусто - expense operations не сохраняются)
```

Transaction description:

```
Подтверждено кассиром: Unknown User
```

✅ **После исправления:**

Shift expense history:

```
Expense Operations:
- Type: supplier_payment
- Amount: Rp 180.000
- Description: Оплата поставщику продуктов
- Category: supplier
- Counteragent: Beverage Distributor
- Invoice: INV-2025-001
- Related Transaction: 7453762b-27f1-44ce-bc31-115588d9084a
- Related Payment: db35a8a1-53cf-4c57-b400-aca6a7aa520c
- Status: confirmed
- Sync Status: synced
```

Transaction description:

```
Подтверждено кассиром: Unknown User | Shift: SHIFT-20251129-2047 | Orders: PO-2025-001, PO-2025-002 | Invoice: INV-2025-001
```

### Тестирование

1. ✅ Создать supplier payment в backoffice
2. ✅ Назначить на POS cash account (acc_1)
3. ✅ Открыть смену в POS
4. ✅ Подтвердить payment в POS интерфейсе
5. ✅ Проверить shift expense history:
   - Expense operation появляется в списке
   - Все поля сохранены (counteragent, category, amount, etc.)
   - relatedTransactionId присутствует
6. ✅ Проверить transaction в backoffice:
   - Description содержит shift number
   - Description содержит order numbers
   - Description содержит invoice number
   - Все данные корректны

---

## Sprint 10.1: Critical Fix - Payment Not Found After Confirmation

**Created:** 2025-11-29
**Status:** ✅ ЗАВЕРШЕНО

### Проблема

**Симптом:**

```
⚠️ Payment ff53327f-e241-4a96-b5a8-8f700866786a not found in pending payments
```

После подтверждения supplier payment:

- ✅ Транзакция создается корректно в Account Store
- ✅ Payment помечается как 'completed'
- ❌ **Expense operation НЕ добавляется в shift** (payment не найден)
- ❌ Расхождение между фактическими деньгами и учетом в shift

### Причина

**Порядок выполнения в `confirmExpense()` был неправильным:**

```typescript
// ❌ БЫЛО (строки 658-666):
const transactionId = await accountStore.confirmPayment(...)  // 1. Меняет status → 'completed'

const payment = accountStore.pendingPayments.find(...)       // 2. НЕ НАХОДИТ (уже completed)
if (payment) {
  // Код никогда не выполняется!
}
```

Проблема: `confirmPayment()` → `processPayment()` → обновляет `status: 'completed'` → `fetchPayments(true)` может отфильтровать payment из `pendingPayments` (в зависимости от фильтра).

### Решение

**Получать данные payment ДО изменения статуса:**

```typescript
// ✅ ИСПРАВЛЕНО (строки 658-670):
// 1. Получить payment data СНАЧАЛА (пока status = 'pending')
const payment = accountStore.pendingPayments.find(p => p.id === data.paymentId)
if (!payment) {
  console.warn(`⚠️ Payment ${data.paymentId} not found in pending payments`)
  return { success: false, error: `Payment ${data.paymentId} not found` }
}

// 2. Подтвердить платеж (меняет status → 'completed')
const transactionId = await accountStore.confirmPayment(
  data.paymentId,
  data.performedBy,
  data.actualAmount
)

// 3. Использовать сохраненные данные payment
if (payment) {
  const expenseOperation: ShiftExpenseOperation = {
    // ... используем данные из payment
  }
  currentShift.value.expenseOperations.push(expenseOperation)
  await shiftsService.updateShift(currentShift.value.id, currentShift.value)
}
```

### Файлы изменены

**src/stores/pos/shifts/shiftsStore.ts:655-723**

- Перемещена проверка и получение payment данных ПЕРЕД вызовом `confirmPayment()`
- Добавлен ранний return с ошибкой, если payment не найден
- Убран избыточный else блок с warning

### Результат

✅ **До исправления:**

```
[Account Store] Payment confirmed ✅
[Account Store] Transaction created ✅
[Account Store] Status updated to 'completed' ✅
[Shifts Store] ⚠️ Payment not found in pending payments ❌
[Shifts Store] Expense operation NOT created ❌
```

✅ **После исправления:**

```
[Shifts Store] Payment found in pending payments ✅
[Account Store] Payment confirmed ✅
[Account Store] Transaction created ✅
[Account Store] Status updated to 'completed' ✅
[Shifts Store] Expense operation created ✅
[Shifts Store] Shift updated with expense ✅
```

### Тестирование

1. ✅ Создать supplier payment в backoffice
2. ✅ Назначить на POS cash account (acc_1)
3. ✅ Открыть смену в POS
4. ✅ Подтвердить payment
5. ✅ Проверить логи - НЕТ warning "Payment not found"
6. ✅ Проверить shift expense history - expense operation присутствует
7. ✅ Проверить transaction в backoffice - создана корректно
8. ✅ Проверить балансы shift - учтены все расходы

---

## Next Steps (Future Sprints)

1. Добавить UI для просмотра детальной информации о транзакциях в shift
2. Добавить UI для мониторинга failed syncs
3. Реализовать детальный breakdown транзакций shift → account
4. Рефакторинг corrections/refunds для лучшей трассировки
