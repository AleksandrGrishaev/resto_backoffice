# ТЗ: Создание расходных платежей из кассы

## 📌 **Общее описание**

Кассиру необходимо фиксировать расходы наличных из кассы (оплата поставщикам, мелкие покупки, возвраты клиентам и т.д.). Эти операции должны:

1. Уменьшать баланс кассы в текущей смене
2. Создавать транзакции в Account Store (expense)
3. Отображаться в отчете по смене
4. Иметь обоснование (назначение платежа)

---

## 🎯 **Цели**

1. ✅ Кассир может создать расходный платеж без привязки к заказу
2. ✅ Расход автоматически вычитается из cash balance смены
3. ✅ Интеграция с Account Store (создание expense transaction)
4. ✅ Категоризация расходов (supplier_payment, refund, petty_cash, other)
5. ✅ Возможность просмотра всех расходов в Shift Management

---

## 🔧 **Технические требования**

### **1. Новый тип платежа: ExpensePayment**

```typescript
// src/stores/pos/types.ts

export interface PosExpensePayment extends BaseEntity {
  id: string
  expenseNumber: string // "EXP-001-20250110"
  shiftId: string // Обязательная связь со сменой

  // Expense details
  type: 'supplier_payment' | 'refund' | 'petty_cash' | 'other'
  category: string // Например: "Food supplies", "Office supplies"
  amount: number // Всегда положительное число
  method: 'cash' | 'card' | 'bank_transfer' // Способ оплаты

  // Description
  description: string // Обязательное описание
  recipient?: string // Получатель (имя поставщика/контрагента)
  invoiceNumber?: string // Номер счета/накладной

  // Approval
  approvedBy?: string // Кто одобрил расход (manager)
  requiresApproval: boolean // Нужно ли подтверждение

  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'completed' | 'rejected'

  // Links
  supplierId?: string // Связь с поставщиком (если есть)
  accountId: string // Счет из которого списывается

  // Metadata
  processedBy: string // Кто создал
  processedAt: string
  notes?: string
}
```

---

### **2. UI: ExpensePaymentDialog.vue**

**Расположение:** `src/views/pos/shifts/dialogs/ExpensePaymentDialog.vue`

**Функционал:**

- Форма создания расходного платежа
- Выбор типа расхода (dropdown)
- Ввод суммы
- Обязательное описание
- Опциональные поля: recipient, invoiceNumber
- Кнопка "Create Expense"

**Где вызывается:**

1. В `ShiftManagementView` - кнопка "Record Expense"
2. В `PosNavigationMenu` - action "Record Expense" (если есть активная смена)

---

### **3. Store: Расширение paymentsStore**

```typescript
// src/stores/pos/payments/paymentsStore.ts

/**
 * Create expense payment (cashier pays from register)
 */
async function createExpensePayment(
  type: ExpensePayment['type'],
  category: string,
  amount: number,
  method: PaymentMethod,
  description: string,
  recipient?: string,
  invoiceNumber?: string
): Promise<ServiceResponse<PosExpensePayment>> {
  try {
    // Get current shift
    const { useShiftsStore } = await import('../shifts/shiftsStore')
    const shiftsStore = useShiftsStore()
    const currentShift = shiftsStore.currentShift

    if (!currentShift) {
      throw new Error('No active shift - cannot create expense')
    }

    // Validate cash availability (if cash payment)
    if (method === 'cash') {
      const currentCashBalance = calculateCurrentCashBalance(currentShift)
      if (amount > currentCashBalance) {
        throw new Error('Insufficient cash in register')
      }
    }

    // Create expense payment
    const expense: PosExpensePayment = {
      id: `expense_${Date.now()}`,
      expenseNumber: generateExpenseNumber(),
      shiftId: currentShift.id,
      type,
      category,
      amount,
      method,
      description,
      recipient,
      invoiceNumber,
      requiresApproval: amount > 1000000, // > 1M IDR needs approval
      status: amount > 1000000 ? 'pending_approval' : 'completed',
      accountId: getAccountIdForMethod(method),
      processedBy: authStore.currentUser?.name || 'Unknown',
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save to storage
    await expensePaymentsService.save(expense)

    // Create transaction in shift
    await shiftsStore.addShiftTransaction(
      null, // no orderId
      expense.id,
      expense.accountId,
      -expense.amount, // negative amount for expense
      `Expense: ${expense.description}`
    )

    // Create transaction in Account Store
    await accountStore.createOperation({
      accountId: expense.accountId,
      type: 'expense',
      amount: expense.amount,
      description: expense.description,
      performedBy: {
        type: 'user',
        id: currentShift.cashierId,
        name: currentShift.cashierName
      }
    })

    return { success: true, data: expense }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create expense'
    return { success: false, error: message }
  }
}
```

---

### **4. Интеграция со Shift Management View**

**Новая секция в UI:**

```vue
<!-- Expense Payments (if any) -->
<v-card v-if="expensePayments.length > 0" class="expense-payments mt-4">
  <v-card-title>
    <v-icon class="mr-2">mdi-cash-minus</v-icon>
    Expenses
  </v-card-title>
  <v-card-text>
    <v-list>
      <v-list-item
        v-for="expense in expensePayments"
        :key="expense.id"
        @click="viewExpenseDetails(expense)"
      >
        <template #prepend>
          <v-icon>{{ getExpenseIcon(expense.type) }}</v-icon>
        </template>
        <v-list-item-title>{{ expense.description }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ expense.category }} • {{ expense.recipient || 'N/A' }}
        </v-list-item-subtitle>
        <template #append>
          <span class="text-error">-{{ formatPrice(expense.amount) }}</span>
        </template>
      </v-list-item>
    </v-list>

    <!-- Total Expenses Summary -->
    <v-divider class="my-2" />
    <div class="d-flex justify-space-between font-weight-bold">
      <span>Total Expenses:</span>
      <span class="text-error">-{{ formatPrice(totalExpenses) }}</span>
    </div>
  </v-card-text>
</v-card>

<!-- Button to create expense -->
<v-btn
  color="error"
  variant="outlined"
  prepend-icon="mdi-cash-minus"
  class="mt-4"
  @click="showExpenseDialog = true"
>
  Record Expense
</v-btn>
```

---

### **5. Обновление Cash Balance расчета**

В ShiftManagementView учитывать expenses:

```typescript
const expectedCash = computed(() => {
  const starting = currentShift.value?.startingCash || 0
  const received = shiftStats.value.cashReceived
  const refunded = shiftStats.value.cashRefunded
  const expenses = expensePayments.value
    .filter(e => e.method === 'cash' && e.status === 'completed')
    .reduce((sum, e) => sum + e.amount, 0)

  return starting + received - refunded - expenses
})
```

---

## 📋 **План реализации**

### **Phase 1: Data Layer (1-2 дня)**

1. ✅ Создать типы `PosExpensePayment` в `types.ts`
2. ✅ Создать `ExpensePaymentsService` для CRUD операций
3. ✅ Расширить `paymentsStore` методом `createExpensePayment()`
4. ✅ Обновить `shiftsStore` для учета expenses в балансе

### **Phase 2: UI Components (2-3 дня)**

1. ✅ Создать `ExpensePaymentDialog.vue`
2. ✅ Добавить секцию Expenses в `ShiftManagementView`
3. ✅ Добавить кнопку "Record Expense" в `PosNavigationMenu`
4. ✅ Создать `ExpenseDetailsDialog.vue` (просмотр деталей)

### **Phase 3: Validation & Testing (1 день)**

1. ✅ Проверить cash balance calculations
2. ✅ Протестировать создание expense без смены (должно упасть)
3. ✅ Протестировать approval workflow (если amount > threshold)
4. ✅ Интеграция тесты с Account Store

---

## ⚠️ **Важные бизнес-правила**

1. **Расходы только при активной смене** - нельзя создать expense без shift
2. **Проверка cash balance** - нельзя потратить больше чем есть в кассе
3. **Approval для крупных сумм** - > 1M IDR требует подтверждения менеджера
4. **Обязательное описание** - нельзя создать расход без описания
5. **Refunds vs Expenses** - возврат по заказу = refund payment, не expense

---

## 🔗 **Связанные документы**

- `Payment_Architecture_Final.md` - общая архитектура платежей
- `Account Store Documentation` - интеграция с финансовыми счетами
- `Shift Management Spec` - управление сменами

---

## 🎯 **Критерии приемки**

- [ ] Кассир может создать expense из Shift Management View
- [ ] Cash balance учитывает expenses
- [ ] Expenses отображаются в списке транзакций смены
- [ ] Integration с Account Store работает (создается expense transaction)
- [ ] Нельзя создать expense > cash balance
- [ ] Крупные expenses требуют approval
- [ ] End Shift Report показывает total expenses
