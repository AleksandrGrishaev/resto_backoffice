## 🏪 **4. Кардинальное обновление Store**

### ✅ **Полностью переписать src/stores/account/store.ts:**

````typescript
export function useAccountStore() {
  const state = ref<AccountStoreState>({
    accounts: [],
    accountTransactions: {}, // ✅ НОВОЕ: Раздельные массивы
    allTransactionsCache: undefined, // ✅ НОВОЕ: Кеш для глобальных операций
    cacheTimestamp: undefined,
    pendingPayments: [],
    filters: { /* ... */ },
    paymentFilters: {},
    selectedAccountId: null,
    loading: { /* ... */ },
    error: null,
    lastFetch: { /* ... */ }
  })

  // ✅ НОВЫЕ computed для работы с раздельными массивами
  const getAccountById = computed(() => (id: string) =>
    state.value.accounts.find(account => account.id === id)
  )

  const getAccountTransactions = computed(() => (accountId: string) => {
    const transactions = state.value.accountTransactions[accountId] || []

    // Применяем фильтры
    return transactions.filter(t => applyFilters(t, state.value.filters))
  })

  const getAllTransactions = computed(() => {
    // Используем кеш если есть
    if (state.value.allTransactionsCache) {
      return state.value.allTransactionsCache
    }

    // Собираем все транзакции из раздельных массивов
    const all: Transaction[] = []
    Object.values(state.value.accountTransactions).forEach(accTxns => {
      all.push(...accTxns)
    })

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  // ✅ НОВЫЕ методы для работы с раздельными массивами
  async function fetchTransactions(accountId: string) {
    try {
      state.value.loading.transactions = true

      // Загружаем транзакции конкретного аккаунта
      const transactions = await transactionService.getAccountTransactions(accountId)

      // ✅ НОВОЕ: Сохраняем в соответствующий массив
      state.value.accountTransactions[accountId] = transactions
      state.value.selectedAccountId = accountId

      state.value.lastFetch.transactions[accountId] = new Date().toISOString()
    } catch (error) {
      setError(error)
      throw error
    } finally {
      state.value.loading.transactions = false
    }
  }

  async function fetchAllTransactions() {
    try {
      state.value.loading.transactions = true

      // Загружаем все транзакции и кешируем
      const allTransactions = await transactionService.getAllTransactions()
      state.value.allTransactionsCache = allTransactions
      state.value.cacheTimestamp = new Date().toISOString()

      // Также группируем по аккаунтам
      const grouped: Record<string, Transaction[]> = {}
      allTransactions.forEach(tx => {
        if (!grouped[tx.accountId]) grouped[tx.accountId] = []
        grouped[tx.accountId].push(tx)
      })
      state.value.accountTransactions = grouped

    } catch (error) {
      setError(error)
      throw error
    } finally {
      state.value.loading.transactions = false
    }
  }

  // ✅ ОБНОВЛЕННЫЕ методы создания транзакций
  async function createTransaction(data: CreateOperationDto) {
    try {
      state.value.loading.operation = true

      const transaction = await transactionService.createTransaction(data)

      // ✅ НОВОЕ: Добавляем в соответствующий массив
      if (!state.value.accountTransactions[data.accountId]) {
        state.value.accountTransactions[data.accountId] = []
      }
      state.value.accountTransactions[data.accountId].unshift(transaction)

      // Инвалидируем глобальный кеш
      state.value.allTransactionsCache = undefined
      state.value.cacheTimestamp = undefined

      // Обновляем баланс аккаунта
      await fetchAccounts(true)

    } catch (error) {
      setError(error)
      throw error
    } finally {
      state.value.loading.operation = false
    }
  }

  async function createTransfer(data: CreateTransferDto) {
    try {
      state.value.loading.transfer = true

      const [fromTx, toTx] = await transactionService.createTransfer(data)

      // ✅ НОВОЕ: Добавляем в соответствующие массивы
      if (!state.value.accountTransactions[data.fromAccountId]) {
        state.value.accountTransactions[data.fromAccountId] = []
      }
      if (!state.value.accountTransactions[data.toAccountId]) {
        state.value.accountTransactions[data.toAccountId] = []
      }

      state.value.accountTransactions[data.fromAccountId].unshift(fromTx)
      state.value.accountTransactions[data.toAccountId].unshift(toTx)

      // Инвалидируем кеш и обновляем аккаунты
      state.value.allTransactionsCache = undefined
      await fetchAccounts(true)

    } catch (error) {
      setError(error)
      throw error
    } finally {
      state.value.loading.transfer = false
    }
  }

  // ✅ НОВОЕ: Исторические корректировки
  async function createHistoricalTransaction(data: CreateHistoricalTransactionDto) {
    try {
      state.value.loading.operation = true

      await transactionService.createHistoricalTransaction(data)

      // Полная перезагрузка данных аккаунта после исторической корректировки
      await Promise.all([
        fetchAccounts(true),
        fetchTransactions(data.accountId)
      ])

      // Инвалидируем глобальный кеш
      state.value.allTransactionsCache = undefined

    } catch (error) {
      setError(error)
      throw error
    } finally {
      state.value.loading.operation = false
    }
  }

  // Остальные методы остаются похожими, но с учетом новой структуры...

  return {
    // State
    state: readonly(state),

    // Getters
    accounts: computed(() => state.value.accounts),
    getAccountById,
    getAccountTransactions,
    getAllTransactions,
    totalBalance: computed(() => state.value.accounts.# 📋 ТЗ: Рефакторинг на balanceAfter подход

## 🎯 **Цель**
Добавить поле `balanceAfter` в транзакции и синхронизированные mock данные для корректного расчета балансов с поддержкой исторических корректировок.

---

## 📊 **1. Изменения в Types (src/stores/account/types.ts)**

### ✅ **Обновить Transaction interface:**
```typescript
export interface Transaction extends BaseEntity {
  accountId: string
  type: OperationType
  amount: number
  description: string

  // ✅ ДОБАВИТЬ: Баланс после транзакции
  balanceAfter: number

  // Существующие поля остаются без изменений
  expenseCategory?: ExpenseCategory
  counteragentId?: string
  counteragentName?: string
  relatedOrderIds?: string[]
  relatedPaymentId?: string
  performedBy: TransactionPerformer
  status: 'completed' | 'failed'
  transferDetails?: TransferDetails
  isCorrection?: boolean
}
````

### ✅ **Обновить CreateOperationDto:**

```typescript
export interface CreateOperationDto {
  accountId: string
  type: OperationType
  amount: number
  description: string

  // balanceAfter НЕ добавляем - рассчитывается автоматически

  // Остальные поля без изменений
  expenseCategory?: ExpenseCategory
  performedBy: TransactionPerformer
  counteragentId?: string
  counteragentName?: string
  relatedOrderIds?: string[]
  relatedPaymentId?: string
}
```

### ✅ **Добавить новые типы для исторических корректировок:**

```typescript
// Новый DTO для вставки исторической транзакции
export interface CreateHistoricalTransactionDto extends CreateOperationDto {
  createdAt: string // Указываем дату "задним числом"
  isHistoricalCorrection: boolean // Флаг для специальной обработки
}

// Результат валидации балансов
export interface BalanceValidationResult {
  isValid: boolean
  accountId: string
  expectedBalance: number
  actualBalance: number
  discrepancy: number
  affectedTransactionIds: string[]
}

// Контекст для пересчета балансов
export interface BalanceRecalculationContext {
  accountId: string
  fromDate: string
  affectedTransactionIds: string[]
  recalculatedCount: number
  updatedAccountBalance: number
}
```

---

## 🗃️ **2. Создание новых Mock данных (src/stores/account/newMock.ts)**

### ✅ **Создать новый файл с синхронизированными данными:**

```typescript
// src/stores/account/newMock.ts

// Упорядоченные транзакции с правильным balanceAfter
export const mockTransactions: Transaction[] = [
  // tx_1 - Начальная транзакция для acc_1
  {
    id: 'tx_1',
    accountId: 'acc_1',
    type: 'income',
    amount: 3000000,
    balanceAfter: 3000000, // Первая транзакция
    description: 'Начальный капитал кассы',
    performedBy: { type: 'user', id: 'admin', name: 'Admin' },
    status: 'completed',
    createdAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2025-01-01T08:00:00.000Z'
  },

  // tx_2 - Расход
  {
    id: 'tx_2',
    accountId: 'acc_1',
    type: 'expense',
    amount: 250000,
    balanceAfter: 2750000, // 3000000 - 250000
    description: 'Закупка продуктов',
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: { type: 'user', id: 'manager', name: 'Manager' },
    status: 'completed',
    createdAt: '2025-01-02T10:30:00.000Z',
    updatedAt: '2025-01-02T10:30:00.000Z'
  }

  // ... продолжить для всех транзакций
]

// Обновленные аккаунты с балансом = последняя транзакция.balanceAfter
export const mockAccounts: Account[] = [
  {
    id: 'acc_1',
    name: 'Основная касса',
    type: 'cash',
    balance: 4000000, // = последняя транзакция.balanceAfter
    lastTransactionDate: '2025-01-15T10:30:00.000Z'
    // остальные поля...
  }
  // ... остальные аккаунты
]
```

---

## ⚙️ **3. Обновление Service слоя (src/stores/account/service.ts)**

### ✅ **Обновить TransactionService.createTransaction:**

```typescript
async createTransaction(data: CreateOperationDto): Promise<Transaction> {
  // 1. Получаем текущий баланс аккаунта
  const account = await accountService.getById(data.accountId)
  if (!account) throw new Error('Account not found')

  // 2. Рассчитываем новый баланс
  let newBalance = account.balance
  switch (data.type) {
    case 'income': newBalance += data.amount; break
    case 'expense': newBalance -= data.amount; break
    case 'transfer': newBalance += data.amount; break // amount уже содержит знак
    case 'correction': newBalance += data.amount; break // amount уже содержит знак
  }

  // 3. Создаем транзакцию с balanceAfter
  const transaction: Transaction = {
    id: generateId(),
    ...data,
    balanceAfter: newBalance, // ✅ ДОБАВЛЯЕМ
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // 4. Сохраняем транзакцию
  this.data.push(transaction)

  // 5. Обновляем баланс аккаунта
  await accountService.updateBalance(data.accountId, newBalance)

  return transaction
}
```

### ✅ **Добавить методы для исторических корректировок:**

```typescript
// Новый метод для вставки исторической транзакции
async createHistoricalTransaction(data: CreateHistoricalTransactionDto): Promise<Transaction> {
  // Реализация с пересчетом последующих транзакций
}

// Метод пересчета balanceAfter для затронутых транзакций
async recalculateBalancesAfter(accountId: string, fromDate: string): Promise<void> {
  // Реализация пересчета
}

// Метод валидации целостности балансов
async validateAccountBalances(accountId: string): Promise<BalanceValidationResult> {
  // Реализация валидации
}
```

---

## 🏪 **4. Обновление Store (src/stores/account/store.ts)**

### ✅ **Минимальные изменения:**

- ❌ **НЕ ТРОГАТЬ** основную логику store
- ✅ **ОБНОВИТЬ** только методы создания транзакций
- ✅ **ДОБАВИТЬ** методы для исторических корректировок

```typescript
// Новый метод для исторических корректировок
async createHistoricalTransaction(data: CreateHistoricalTransactionDto) {
  try {
    clearError()
    state.value.loading.operation = true

    await transactionService.createHistoricalTransaction(data)

    // Обновляем данные
    await Promise.all([
      fetchAccounts(true),
      fetchTransactions(data.accountId)
    ])
  } catch (error) {
    setError(error)
    throw error
  } finally {
    state.value.loading.operation = false
  }
}
```

---

## 🎨 **5. Обновление UI Composables**

### ✅ **Упростить useAccountTransactions:**

```typescript
// Транзакции с balanceAfter уже есть в данных!
const transactionsWithBalance = computed<TransactionWithBalance[]>(() => {
  const transactions = lazyLoading.items.value as Transaction[]

  // ✅ Просто приводим к нужному типу - balanceAfter уже есть!
  return transactions as TransactionWithBalance[]
})
```

### ✅ **НЕ ТРОГАТЬ:**

- Dashboard компоненты (уже используют account.balance)
- Account detail компоненты
- Payment система

---

## 📋 **6. План миграции Mock данных**

### **Этап 1: Подготовка данных**

1. ✅ Проанализировать текущие mockTransactions
2. ✅ Пересортировать по createdAt (от старых к новым)
3. ✅ Рассчитать правильные balanceAfter для каждой транзакции
4. ✅ Обновить account.balance = последняя транзакция.balanceAfter

### **Этап 2: Генерация новых ID**

```typescript
// Новые ID для четкости
const transactionIds = [
  'tx_001',
  'tx_002',
  'tx_003', // acc_1 transactions
  'tx_101',
  'tx_102',
  'tx_103', // acc_2 transactions
  'tx_201',
  'tx_202',
  'tx_203' // acc_3 transactions
  // и т.д.
]
```

### **Этап 3: Валидация**

```typescript
// Функция проверки корректности данных
function validateMockData(): ValidationResult {
  for (const account of mockAccounts) {
    const transactions = getAccountTransactions(account.id)
    const calculatedBalance = calculateBalanceFromTransactions(transactions)

    if (account.balance !== calculatedBalance) {
      return { isValid: false, error: `Account ${account.id} balance mismatch` }
    }
  }

  return { isValid: true }
}
```

---

## ⚠️ **7. Что НЕ трогаем (Backward Compatibility)**

### ❌ **НЕ ИЗМЕНЯЕМ:**

- Существующие UI компоненты
- Dashboard логика
- Account.balance поле (остается для быстрого доступа)
- Payment система
- Основные методы Store

### ✅ **ТОЛЬКО ДОБАВЛЯЕМ:**

- Поле balanceAfter в Transaction
- Методы для исторических корректировок
- Валидацию данных
- Новые mock данные

---

## 🎯 **8. Критерии готовности**

### **Тестирование:**

1. ✅ Dashboard загружается быстро (использует account.balance)
2. ✅ Account Detail показывает правильные balanceAfter
3. ✅ Исторические корректировки работают
4. ✅ Все существующие UI компоненты работают без изменений
5. ✅ Mock данные валидны и согласованы

### **Производительность:**

- Dashboard: < 100ms (читает account.balance)
- Account Detail: < 300ms (читает transaction.balanceAfter)
- Историческая корректировка: < 2s (для месяца данных)

---

## 📁 **9. Файлы к изменению**

### **Обязательные изменения:**

- ✅ `src/stores/account/types.ts` - добавить balanceAfter
- ✅ `src/stores/account/newMock.ts` - новые синхронизированные данные
- ✅ `src/stores/account/service.ts` - обновить createTransaction
- ✅ `src/stores/account/composables/useAccountTransactions.ts` - упростить

### **Опциональные изменения:**

- `src/stores/account/store.ts` - добавить исторические корректировки
- `src/views/accounts/` - добавить UI для исторических корректировок

---

## 🚀 **10. Порядок выполнения**

1. **Обновить types.ts** (добавить balanceAfter)
2. **Создать newMock.ts** (синхронизированные данные)
3. **Протестировать данные** (валидация)
4. **Обновить service.ts** (createTransaction)
5. **Упростить useAccountTransactions** (убрать расчет)
6. **Тестирование** (все сценарии)
7. **Добавить исторические корректировки** (опционально)

Готов приступить к реализации? С какого этапа начнем?
