# Sprint 4: POS Shift Synchronization with Account (acc_1)

## Обзор

Sprint 4 фокусируется на интеграции POS смен с системой бухгалтерских счетов. Основная цель - синхронизировать кассовые операции POS с счетом "Основная касса" (acc_1) при закрытии смены и улучшить отображение расходов в интерфейсе Shift Management.

## Текущая ситуация

### Что работает ✅

- POS смены создаются и завершаются
- Транзакции сохраняются локально в POS
- Расходы (expense operations) создаются через Shift Management
- Supplier payments подтверждаются кассиром и создают транзакции в acc_1

### Что НЕ работает ❌

- **НЕТ синхронизации** POS shift → acc_1 при закрытии смены
- **Expenses НЕ отображаются** в Expense History (список пуст)
- **НЕТ блока Expenses** в Cash Balance Summary
- **Mock данные**: 13+ смен за последние 7 дней (слишком много для примера)
- **Балансы не синхронизированы** между shift mock и account mock

## Архитектурные решения

### 1. Timing синхронизации: **On Shift End** ⏰

**Решение:** Синхронизация происходит **только при закрытии смены**, НЕ в реальном времени.

**Почему:**

- ✅ Чистая история транзакций в acc_1 (одна транзакция на смену)
- ✅ Меньше нагрузка на систему
- ✅ Легче аудит (смена = единица учета)
- ❌ Баланс acc_1 обновляется раз в смену (приемлемо для offline-first модели)

### 2. Supplier Payment Expenses: **Skip in Shift Sync** 🚫

**Решение:** НЕ включать supplier payment expenses в итоговую транзакцию смены.

**Почему:**

- Supplier payments уже создают транзакции в acc_1 при подтверждении (Sprint 3)
- Включение в shift sync приведет к **дублированию** расходов
- Эти расходы управляются backoffice, а не POS кассиром

**Реализация:**

```typescript
// При создании итоговой транзакции смены - фильтруем
const directExpenses = shift.expenseOperations.filter(
  exp => !exp.relatedPaymentId // Только прямые расходы, НЕ supplier payments
)
```

### 3. Expenses Display: **Both Sections** 📊

**Решение:** Показывать expenses в **двух местах**:

1. **Expense History** (детальный список)

   - Все expense operations смены
   - Включая direct expenses + confirmed supplier payments
   - С фильтрацией, поиском, сортировкой

2. **Cash Balance Summary** (итоговый блок)
   - Добавить строку "Total Expenses" после Cash Refunded
   - Показывать общую сумму расходов
   - Влияет на Expected Cash

### 4. Mock Data: **2 Shifts** 📦

**Решение:** Оставить **только 2 смены** в mock данных:

1. **Прошлая смена** (completed) - вчера, вечерняя смена
2. **Текущая смена** (active) - сегодня, утренняя смена

## Детальный план реализации

### Phase 1: Sync Logic (Shift → acc_1)

#### 1.1. Создать метод `syncShiftToAccount()` в shiftsStore.ts

**Файл:** `src/stores/pos/shifts/shiftsStore.ts`

**Где:** После метода `endShift()`

**Что делает:**

1. Собирает итоговую статистику смены:

   - Total cash income (cashReceived)
   - Total cash refunds (cashRefunded)
   - **Direct expenses only** (filtered expenseOperations)
   - Corrections (если есть)

2. Создает транзакции в acc_1:

   ```typescript
   // Транзакция #1: Итоговый приход за смену
   if (netIncome > 0) {
     await accountStore.createOperation({
       accountId: POS_CASH_ACCOUNT_ID,
       type: 'income',
       amount: netIncome,
       description: `POS Shift ${shift.shiftNumber} - Net Income`,
       performedBy: { ... }
     })
   }

   // Транзакция #2: Прямые расходы (если есть)
   if (directExpenses > 0) {
     await accountStore.createOperation({
       accountId: POS_CASH_ACCOUNT_ID,
       type: 'expense',
       amount: directExpenses,
       description: `POS Shift ${shift.shiftNumber} - Direct Expenses`,
       expenseCategory: { type: 'daily', category: 'other' },
       performedBy: { ... }
     })
   }

   // Транзакция #3: Корректировки (если есть)
   if (totalCorrections !== 0) {
     await accountStore.createCorrection({
       accountId: POS_CASH_ACCOUNT_ID,
       amount: totalCorrections,
       description: `POS Shift ${shift.shiftNumber} - Corrections`,
       performedBy: { ... }
     })
   }
   ```

3. Помечает смену как synced:
   ```typescript
   shift.syncedToAccount = true
   shift.syncedAt = new Date().toISOString()
   ```

#### 1.2. Вызвать `syncShiftToAccount()` в `endShift()`

**Файл:** `src/stores/pos/shifts/shiftsStore.ts`

**Где:** В методе `endShift()`, после успешного завершения

```typescript
async function endShift(dto: EndShiftDto): Promise<ServiceResponse<PosShift>> {
  // ... existing code ...

  const result = await shiftsService.endShift(dto)

  if (result.success && result.data) {
    const updatedShift = result.data

    // ✅ Sprint 4: Sync shift to account
    await syncShiftToAccount(updatedShift)

    // Update in list
    const index = shifts.value.findIndex(s => s.id === updatedShift.id)
    // ...
  }

  return result
}
```

#### 1.3. Добавить поля в PosShift type

**Файл:** `src/stores/pos/types.ts`

```typescript
export interface PosShift {
  // ... existing fields ...

  // ✅ Sprint 4: Account sync tracking
  syncedToAccount?: boolean // Синхронизирована ли смена с acc_1
  syncedAt?: string // Когда синхронизирована
  accountTransactionIds?: string[] // IDs созданных транзакций в acc_1
}
```

### Phase 2: UI Improvements (Expense Display)

#### 2.1. Fix Expense History List

**Проблема:** `ShiftExpensesList.vue` не показывает expenses (список пуст)

**Файл:** `src/views/pos/shifts/ShiftManagementView.vue`

**Текущий код (строка 434):**

```typescript
const shiftExpenses = computed(() => {
  // FIXME: Почему это пустой массив?
  return currentShift.value?.expenseOperations || []
})
```

**Исправление:**

```typescript
const shiftExpenses = computed(() => {
  if (!currentShift.value) return []

  // Все expense operations смены (direct + supplier payments)
  const expenses = currentShift.value.expenseOperations || []

  // Сортировка по дате (новые сверху)
  return [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})
```

**Также проверить:** Убедиться, что `expenseOperations` добавляются в смену при создании через `createDirectExpense()` и `confirmPaymentByCashier()`.

#### 2.2. Add Expenses Block to Cash Balance

**Файл:** `src/views/pos/shifts/ShiftManagementView.vue`

**Где:** В секции Cash Balance (строка 64-90)

**Текущая структура:**

```html
<div class="balance-grid">
  <div class="balance-item">Starting Cash</div>
  <div class="balance-item">Cash Received</div>
  <div class="balance-item">Cash Refunded</div>
  <div class="balance-item highlight">Expected Cash</div>
</div>
```

**Добавить после Cash Refunded:**

```html
<div class="balance-item">
  <div class="label">Cash Refunded</div>
  <div class="value negative">- {{ formatPrice(shiftStats.cashRefunded) }}</div>
</div>

<!-- ✅ Sprint 4: Total Expenses -->
<div class="balance-item">
  <div class="label">Total Expenses</div>
  <div class="value negative">- {{ formatPrice(totalShiftExpenses) }}</div>
</div>

<div class="balance-item highlight">
  <div class="label">Expected Cash</div>
  <div class="value">{{ formatPrice(expectedCash) }}</div>
</div>
```

**Добавить computed:**

```typescript
// Sprint 4: Total expenses (все расходы смены)
const totalShiftExpenses = computed(() => {
  return (
    currentShift.value?.expenseOperations
      ?.filter(e => e.status === 'completed' || e.status === 'confirmed')
      .reduce((sum, e) => sum + e.amount, 0) || 0
  )
})
```

**Обновить `expectedCash`:**

```typescript
const expectedCash = computed(() => {
  const baseExpected =
    (currentShift.value?.startingCash || 0) +
    shiftStats.value.cashReceived -
    shiftStats.value.cashRefunded

  // ✅ Sprint 4: Subtract ALL expenses (direct + supplier payments)
  return baseExpected - totalShiftExpenses.value
})
```

#### 2.3. Improve ShiftExpensesList Component

**Файл:** `src/views/pos/shifts/components/ShiftExpensesList.vue`

**Улучшения:**

1. Добавить колонку "Type" (Direct / Supplier Payment)
2. Добавить колонку "Status" (completed / confirmed)
3. Добавить visual indicator для supplier payments (иконка + цвет)
4. Показывать "No expenses yet" если список пуст

**Пример:**

```html
<v-data-table :items="expenses" :headers="headers" density="comfortable">
  <template #[`item.type`]="{ item }">
    <v-chip :color="item.relatedPaymentId ? 'purple' : 'blue'" size="small" variant="tonal">
      <v-icon v-if="item.relatedPaymentId" start size="small">mdi-file-document-check</v-icon>
      {{ item.relatedPaymentId ? 'Supplier Payment' : 'Direct Expense' }}
    </v-chip>
  </template>

  <template #empty>
    <div class="text-center pa-4">
      <v-icon size="64" color="grey">mdi-receipt-text-off-outline</v-icon>
      <p class="text-h6 text-grey mt-2">No expenses yet</p>
      <p class="text-body-2 text-grey">
        Click "Add Expense" to record a cash expense for this shift
      </p>
    </div>
  </template>
</v-data-table>
```

### Phase 3: Mock Data Cleanup

#### 3.1. Reduce Mock Shifts to 2

**Файл:** `src/stores/pos/shifts/mock.ts`

**Текущее:** Генерирует 13+ смен за 7 дней (утренние + вечерние)

**Изменить метод `generateMockShifts()`:**

```typescript
static generateMockShifts(): PosShift[] {
  const shifts: PosShift[] = []
  const today = new Date()

  // ✅ Sprint 4: Only 2 shifts for example

  // 1. Previous completed shift (yesterday evening)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const previousShift = this.createMockShift({
    date: yesterday,
    startHour: 16,
    endHour: 24,
    cashierName: 'Mike Chen',
    shiftType: 'evening'
  })
  shifts.push(previousShift)

  // 2. Current active shift (today morning, if business hours)
  const currentHour = today.getHours()
  if (currentHour >= 8 && currentHour < 24) {
    const activeShift = this.createActiveShift()
    shifts.push(activeShift)
  }

  return shifts
}
```

#### 3.2. Sync Mock Balances (Shift ↔ Account)

**Проблема:** Балансы в shift mock и account mock не совпадают

**Решение:**

1. **Рассчитать итоговые балансы смен:**

   ```typescript
   // Прошлая смена (completed)
   const previousShiftIncome = 2_500_000 // Cash received
   const previousShiftExpenses = 150_000 // Direct expenses
   const previousShiftNet = previousShiftIncome - previousShiftExpenses

   // Текущая смена (active)
   const currentShiftIncome = 800_000 // Cash received so far
   const currentShiftExpenses = 50_000 // Direct expenses so far
   ```

2. **Обновить acc_1 balance в account mock:**

   ```typescript
   // В src/stores/account/mock.ts
   {
     id: 'acc_1',
     name: 'Основная касса',
     type: 'cash',
     balance: 4_000_000 + previousShiftNet, // Базовый баланс + прошлая смена
     // Current shift еще не закрыта, поэтому не учитывается
   }
   ```

3. **Добавить транзакции прошлой смены в account mock:**

   ```typescript
   // Income from previous shift
   {
     id: 'tx_shift_prev_income',
     accountId: 'acc_1',
     type: 'income',
     amount: previousShiftIncome,
     description: 'POS Shift #20251111-EVE - Net Income',
     balanceAfter: 4_000_000 + previousShiftIncome,
     createdAt: yesterday.toISOString()
   },

   // Expenses from previous shift
   {
     id: 'tx_shift_prev_expenses',
     accountId: 'acc_1',
     type: 'expense',
     amount: previousShiftExpenses,
     description: 'POS Shift #20251111-EVE - Direct Expenses',
     balanceAfter: 4_000_000 + previousShiftNet,
     createdAt: yesterday.toISOString()
   }
   ```

### Phase 4: Testing & Validation

#### 4.1. Test Shift End Sync

**Сценарий:**

1. Открыть активную смену
2. Создать несколько orders с cash payments
3. Создать direct expense через "Add Expense"
4. Подтвердить supplier payment (если есть)
5. Закрыть смену через "End Shift"

**Ожидаемый результат:**

- ✅ Смена закрывается успешно
- ✅ В acc_1 создается транзакция income (net income)
- ✅ В acc_1 создается транзакция expense (только direct expenses)
- ✅ Supplier payment expenses НЕ дублируются
- ✅ Баланс acc_1 обновляется корректно

#### 4.2. Test Expenses Display

**Сценарий:**

1. Открыть Shift Management
2. Проверить Cash Balance Summary

**Ожидаемый результат:**

- ✅ Видим блок "Total Expenses"
- ✅ Сумма расходов корректна (direct + supplier payments)
- ✅ Expected Cash учитывает expenses

**Сценарий:**

1. Открыть секцию "Expense Operations"
2. Проверить список Expense History

**Ожидаемый результат:**

- ✅ Видим все expenses (direct + supplier payments)
- ✅ Есть индикация типа (Direct / Supplier Payment)
- ✅ Если нет expenses - показывается empty state

#### 4.3. Validate Mock Data

**Проверки:**

1. `localStorage.getItem('pos_shifts')` → 2 смены (previous + active)
2. acc_1 balance включает результат прошлой смены
3. В транзакциях acc_1 есть записи от прошлой смены
4. Балансы сходятся математически

## Файлы для изменения

### Новые файлы

Нет новых файлов - только изменения существующих.

### Измененные файлы

1. **src/stores/pos/types.ts**

   - Добавить поля `syncedToAccount`, `syncedAt`, `accountTransactionIds` в `PosShift`

2. **src/stores/pos/shifts/shiftsStore.ts**

   - Добавить метод `syncShiftToAccount()`
   - Вызвать sync в `endShift()`
   - Импортировать `useAccountStore` и `POS_CASH_ACCOUNT_ID`

3. **src/views/pos/shifts/ShiftManagementView.vue**

   - Исправить `shiftExpenses` computed
   - Добавить `totalShiftExpenses` computed
   - Обновить `expectedCash` computed
   - Добавить блок "Total Expenses" в Cash Balance UI

4. **src/views/pos/shifts/components/ShiftExpensesList.vue**

   - Добавить колонку Type (Direct / Supplier Payment)
   - Добавить visual indicators
   - Добавить empty state

5. **src/stores/pos/shifts/mock.ts**

   - Упростить `generateMockShifts()` до 2 смен
   - Удалить цикл по 7 дням
   - Оставить только previous + active

6. **src/stores/account/mock.ts**
   - Обновить balance acc_1
   - Добавить транзакции от прошлой смены
   - Синхронизировать с shift mock

## Риски и ограничения

### Риски

1. **Дублирование расходов:** Supplier payments могут случайно попасть в shift sync

   - **Митигация:** Строгая фильтрация по `relatedPaymentId`

2. **Race conditions:** Если смена закрывается во время подтверждения supplier payment

   - **Митигация:** Проверка pending sync перед endShift (уже есть)

3. **Несоответствие балансов:** Mock данные могут рассинхронизироваться
   - **Митигация:** Явные расчеты + комментарии в mock файлах

### Ограничения

1. Синхронизация только при закрытии смены (не real-time)
2. Нельзя редактировать уже синхронизированную смену
3. Mock данные упрощены (только 2 смены)

## Критерии приемки

### Must Have ✅

- [ ] Смена синхронизируется с acc_1 при закрытии
- [ ] Создаются корректные транзакции (income, expense, correction)
- [ ] Supplier payment expenses НЕ дублируются
- [ ] Expenses отображаются в Expense History
- [ ] Блок "Total Expenses" есть в Cash Balance
- [ ] Mock данные: только 2 смены
- [ ] Балансы в mock синхронизированы

### Should Have 🎯

- [ ] Visual indicators для типов expenses
- [ ] Empty state для пустого Expense History
- [ ] Поля sync tracking в PosShift type
- [ ] Комментарии в коде о логике фильтрации

### Nice to Have 💡

- [ ] Детальный breakdown expenses в Cash Balance tooltip
- [ ] История синхронизации смен (audit log)
- [ ] Возможность пересинхронизировать смену (admin only)

## Timeline

- **Phase 1 (Sync Logic):** 2-3 часа
- **Phase 2 (UI Improvements):** 2-3 часа
- **Phase 3 (Mock Cleanup):** 1 час
- **Phase 4 (Testing):** 1-2 часа

**Общее время:** 6-9 часов

## Зависимости

- ✅ Sprint 3 должен быть завершен (supplier payments confirmation)
- ✅ POS_CASH_ACCOUNT_ID константа определена
- ✅ Account store имеет методы createOperation, createCorrection

## Следующие шаги

После Sprint 4:

- **Sprint 5:** Real-time sync (WebSocket/Firebase) вместо polling
- **Sprint 6:** Multi-account support для POS (не только acc_1)
- **Sprint 7:** Advanced reporting (shift analytics, trends)
