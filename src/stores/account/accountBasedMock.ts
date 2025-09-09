// src/stores/account/accountBasedMock.ts
import type { Account, Transaction } from './types'

// ============ MOCK ACCOUNTS (обновленные с корректными балансами) ============

export const mockAccounts: Account[] = [
  {
    id: 'acc_1',
    name: 'Основная касса',
    type: 'cash',
    isActive: true,
    balance: 4000000, // = последняя транзакция.balanceAfter
    description: 'Наличные средства ресторана',
    lastTransactionDate: '2025-01-15T10:30:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z'
  },
  {
    id: 'acc_2',
    name: 'BCA Main',
    type: 'bank',
    isActive: true,
    balance: 23800000, // = последняя транзакция.balanceAfter
    description: 'Основной банковский счет',
    lastTransactionDate: '2025-01-14T15:45:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-14T15:45:00.000Z'
  },
  {
    id: 'acc_3',
    name: 'Mandiri Card',
    type: 'card',
    isActive: true,
    balance: 850000, // = последняя транзакция.balanceAfter
    description: 'Дебетовая карта для расходов',
    lastTransactionDate: '2025-01-13T12:20:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-13T12:20:00.000Z'
  },
  {
    id: 'acc_4',
    name: 'Gojek Balance',
    type: 'gojeck',
    isActive: true,
    balance: 120000, // = последняя транзакция.balanceAfter
    description: 'Баланс в приложении Gojek',
    lastTransactionDate: '2025-01-12T09:15:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-12T09:15:00.000Z'
  },
  {
    id: 'acc_5',
    name: 'Grab Wallet',
    type: 'grab',
    isActive: true,
    balance: 95000, // = последняя транзакция.balanceAfter
    description: 'Электронный кошелек Grab',
    lastTransactionDate: '2025-01-11T16:30:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-11T16:30:00.000Z'
  },
  {
    id: 'acc_6',
    name: 'BNI Savings',
    type: 'bank',
    isActive: false,
    balance: 0,
    description: 'Закрытый сберегательный счет',
    lastTransactionDate: '2024-12-31T23:59:00.000Z',
    createdAt: '2024-11-01T00:00:00.000Z',
    updatedAt: '2024-12-31T23:59:00.000Z'
  },
  {
    id: 'acc_7',
    name: 'Резервная касса',
    type: 'cash',
    isActive: true,
    balance: 500000, // = последняя транзакция.balanceAfter
    description: 'Резервные наличные средства',
    lastTransactionDate: '2025-01-08T14:20:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-08T14:20:00.000Z'
  },
  {
    id: 'acc_8',
    name: 'BRI Business',
    type: 'bank',
    isActive: true,
    balance: 3200000, // = последняя транзакция.balanceAfter
    description: 'Корпоративный счет для операций',
    lastTransactionDate: '2025-01-07T11:45:00.000Z',
    createdAt: '2024-12-15T00:00:00.000Z',
    updatedAt: '2025-01-07T11:45:00.000Z'
  }
]

// ============ MOCK TRANSACTIONS - РАЗДЕЛЬНЫЕ МАССИВЫ ============

export const mockAccountTransactions: Record<string, Transaction[]> = {
  // =======================================
  // ACC_1 (Основная касса) - баланс 4,000,000
  // =======================================
  acc_1: [
    // Транзакции отсортированы по дате (новые ПЕРВЫЕ для UI)
    {
      id: 'tx_005',
      accountId: 'acc_1',
      type: 'income',
      amount: 500000,
      balanceAfter: 4000000, // ФИНАЛЬНЫЙ баланс
      description: 'Выручка за день - финальная операция',
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2025-01-15T10:30:00.000Z',
      updatedAt: '2025-01-15T10:30:00.000Z'
    },
    {
      id: 'tx_004',
      accountId: 'acc_1',
      type: 'expense',
      amount: 12000000,
      balanceAfter: 3500000, // 15500000 - 12000000
      description: 'Крупная оплата годовой аренды',
      expenseCategory: { type: 'daily', category: 'rent' },
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-14T16:00:00.000Z',
      updatedAt: '2025-01-14T16:00:00.000Z'
    },
    {
      id: 'tx_003',
      accountId: 'acc_1',
      type: 'expense',
      amount: 810000,
      balanceAfter: 15500000, // 16310000 - 810000
      description: 'Payment: Supplier order (demo связь)',
      expenseCategory: { type: 'daily', category: 'product' },
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      counteragentId: 'sup-demo-supplier',
      counteragentName: 'Demo Supplier Company',
      relatedOrderIds: ['demo-order-001'],
      relatedPaymentId: 'demo-payment-001',
      createdAt: '2025-01-13T14:15:00.000Z',
      updatedAt: '2025-01-13T14:15:00.000Z'
    },
    {
      id: 'tx_002',
      accountId: 'acc_1',
      type: 'expense',
      amount: 250000,
      balanceAfter: 16310000, // 16560000 - 250000
      description: 'Закупка продуктов на неделю',
      expenseCategory: { type: 'daily', category: 'product' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2025-01-12T10:30:00.000Z',
      updatedAt: '2025-01-12T10:30:00.000Z'
    },
    {
      id: 'tx_001',
      accountId: 'acc_1',
      type: 'income',
      amount: 16560000,
      balanceAfter: 16560000, // Начальная транзакция
      description: 'Начальный капитал ресторана',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-01T08:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_2 (BCA Main) - баланс 23,800,000
  // =======================================
  acc_2: [
    {
      id: 'tx_104',
      accountId: 'acc_2',
      type: 'expense',
      amount: 1400000,
      balanceAfter: 23800000, // ФИНАЛЬНЫЙ баланс
      description: 'Зарплата сотрудников за январь',
      expenseCategory: { type: 'daily', category: 'salary' },
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-14T15:45:00.000Z',
      updatedAt: '2025-01-14T15:45:00.000Z'
    },
    {
      id: 'tx_103',
      accountId: 'acc_2',
      type: 'income',
      amount: 5000000,
      balanceAfter: 25200000, // 20200000 + 5000000
      description: 'Поступление от инвестора',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-10T15:45:00.000Z',
      updatedAt: '2025-01-10T15:45:00.000Z'
    },
    {
      id: 'tx_102',
      accountId: 'acc_2',
      type: 'transfer',
      amount: 200000,
      balanceAfter: 20200000, // 20000000 + 200000
      description: 'Transfer from Основная касса: Пополнение банковского счета',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      transferDetails: { fromAccountId: 'acc_1', toAccountId: 'acc_2' },
      createdAt: '2025-01-05T12:00:00.000Z',
      updatedAt: '2025-01-05T12:00:00.000Z'
    },
    {
      id: 'tx_101',
      accountId: 'acc_2',
      type: 'income',
      amount: 20000000,
      balanceAfter: 20000000, // Начальная транзакция
      description: 'Первоначальный депозит в банк',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-01T09:00:00.000Z',
      updatedAt: '2025-01-01T09:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_3 (Mandiri Card) - баланс 850,000
  // =======================================
  acc_3: [
    {
      id: 'tx_203',
      accountId: 'acc_3',
      type: 'expense',
      amount: 75000,
      balanceAfter: 850000, // ФИНАЛЬНЫЙ баланс
      description: 'Покупка канцелярии для офиса',
      expenseCategory: { type: 'daily', category: 'other' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2025-01-13T12:20:00.000Z',
      updatedAt: '2025-01-13T12:20:00.000Z'
    },
    {
      id: 'tx_202',
      accountId: 'acc_3',
      type: 'expense',
      amount: 75000,
      balanceAfter: 925000, // 1000000 - 75000
      description: 'Оплата коммунальных услуг',
      expenseCategory: { type: 'daily', category: 'utilities' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2024-12-15T12:20:00.000Z',
      updatedAt: '2024-12-15T12:20:00.000Z'
    },
    {
      id: 'tx_201',
      accountId: 'acc_3',
      type: 'income',
      amount: 1000000,
      balanceAfter: 1000000, // Начальная транзакция
      description: 'Пополнение карты',
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2024-12-01T10:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_4 (Gojek Balance) - баланс 120,000
  // =======================================
  acc_4: [
    {
      id: 'tx_303',
      accountId: 'acc_4',
      type: 'expense',
      amount: 45000,
      balanceAfter: 120000, // ФИНАЛЬНЫЙ баланс
      description: 'Транспорт для сотрудников',
      expenseCategory: { type: 'daily', category: 'transport' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2025-01-12T09:15:00.000Z',
      updatedAt: '2025-01-12T09:15:00.000Z'
    },
    {
      id: 'tx_302',
      accountId: 'acc_4',
      type: 'expense',
      amount: 35000,
      balanceAfter: 165000, // 200000 - 35000
      description: 'Доставка еды через Gojek',
      expenseCategory: { type: 'daily', category: 'takeaway' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2024-12-20T09:15:00.000Z',
      updatedAt: '2024-12-20T09:15:00.000Z'
    },
    {
      id: 'tx_301',
      accountId: 'acc_4',
      type: 'income',
      amount: 200000,
      balanceAfter: 200000, // Начальная транзакция
      description: 'Пополнение Gojek баланса',
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2024-12-01T11:00:00.000Z',
      updatedAt: '2024-12-01T11:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_5 (Grab Wallet) - баланс 95,000
  // =======================================
  acc_5: [
    {
      id: 'tx_402',
      accountId: 'acc_5',
      type: 'expense',
      amount: 55000,
      balanceAfter: 95000, // ФИНАЛЬНЫЙ баланс
      description: 'Транспортные расходы через Grab',
      expenseCategory: { type: 'daily', category: 'transport' },
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2025-01-11T16:30:00.000Z',
      updatedAt: '2025-01-11T16:30:00.000Z'
    },
    {
      id: 'tx_401',
      accountId: 'acc_5',
      type: 'income',
      amount: 150000,
      balanceAfter: 150000, // Начальная транзакция
      description: 'Пополнение Grab кошелька',
      performedBy: { type: 'user', id: 'manager', name: 'Manager' },
      status: 'completed',
      createdAt: '2024-12-01T12:00:00.000Z',
      updatedAt: '2024-12-01T12:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_7 (Резервная касса) - баланс 500,000
  // =======================================
  acc_7: [
    {
      id: 'tx_502',
      accountId: 'acc_7',
      type: 'expense',
      amount: 500000,
      balanceAfter: 500000, // ФИНАЛЬНЫЙ баланс
      description: 'Экстренные расходы на ремонт',
      expenseCategory: { type: 'daily', category: 'renovation' },
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-08T14:20:00.000Z',
      updatedAt: '2025-01-08T14:20:00.000Z'
    },
    {
      id: 'tx_501',
      accountId: 'acc_7',
      type: 'income',
      amount: 1000000,
      balanceAfter: 1000000, // Начальная транзакция
      description: 'Формирование резервного фонда',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2024-12-01T14:00:00.000Z',
      updatedAt: '2024-12-01T14:00:00.000Z'
    }
  ],

  // =======================================
  // ACC_8 (BRI Business) - баланс 3,200,000
  // =======================================
  acc_8: [
    {
      id: 'tx_602',
      accountId: 'acc_8',
      type: 'expense',
      amount: 800000,
      balanceAfter: 3200000, // ФИНАЛЬНЫЙ баланс
      description: 'Корпоративные расходы и налоги',
      expenseCategory: { type: 'daily', category: 'other' },
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2025-01-07T11:45:00.000Z',
      updatedAt: '2025-01-07T11:45:00.000Z'
    },
    {
      id: 'tx_601',
      accountId: 'acc_8',
      type: 'income',
      amount: 4000000,
      balanceAfter: 4000000, // Начальная транзакция
      description: 'Корпоративное пополнение счета',
      performedBy: { type: 'user', id: 'admin', name: 'Admin' },
      status: 'completed',
      createdAt: '2024-12-15T08:00:00.000Z',
      updatedAt: '2024-12-15T08:00:00.000Z'
    }
  ]
}

// ============ УТИЛИТЫ ДЛЛ РАБОТЫ С НОВОЙ СТРУКТУРОЙ ============

export class AccountBasedMockService {
  static getAccountTransactions(accountId: string): Transaction[] {
    return mockAccountTransactions[accountId] || []
  }

  static getAllTransactions(): Transaction[] {
    const all: Transaction[] = []
    Object.values(mockAccountTransactions).forEach(accTxns => {
      all.push(...accTxns)
    })
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static addTransaction(accountId: string, transaction: Transaction): void {
    if (!mockAccountTransactions[accountId]) {
      mockAccountTransactions[accountId] = []
    }
    mockAccountTransactions[accountId].unshift(transaction) // В начало (новые первые)
  }

  static validateAccountBalance(accountId: string): boolean {
    const transactions = this.getAccountTransactions(accountId)
    if (transactions.length === 0) return true

    const latestTransaction = transactions[0] // Первая = самая новая
    const account = mockAccounts.find(acc => acc.id === accountId)

    return account?.balance === latestTransaction.balanceAfter
  }

  static validateAllAccountBalances(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    mockAccounts.forEach(account => {
      if (!account.isActive && account.balance === 0) return // Пропускаем закрытые

      const isValid = this.validateAccountBalance(account.id)
      if (!isValid) {
        const transactions = this.getAccountTransactions(account.id)
        const latestTx = transactions[0]
        errors.push(
          `Account ${account.name} (${account.id}): balance=${account.balance}, ` +
            `latest transaction balanceAfter=${latestTx?.balanceAfter || 'N/A'}`
        )
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// ============ АВТОМАТИЧЕСКАЯ ВАЛИДАЦИЯ ПРИ ИМПОРТЕ ============

if (import.meta.env.DEV) {
  const validation = AccountBasedMockService.validateAllAccountBalances()
  if (!validation.isValid) {
    console.error('❌ Mock data validation failed:')
    validation.errors.forEach(error => console.error('  -', error))
  } else {
    console.log('✅ Mock data validation passed: all balances are consistent')
  }
}
