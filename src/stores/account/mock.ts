// src/stores/account/mock.ts
import type { Account, Transaction } from './types'

// ============ MOCK ACCOUNTS ============

export const mockAccounts: Account[] = [
  {
    id: 'acc_1',
    name: 'Основная касса',
    type: 'cash',
    isActive: true,
    // ✅ Sprint 4: Base balance (4M) + previous shift net income (2.5M - 0.15M = 2.35M)
    balance: 6350000,
    description: 'Наличные средства ресторана',
    lastTransactionDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
  },
  {
    id: 'acc_2',
    name: 'BCA Main',
    type: 'bank',
    isActive: true,
    balance: 23800000,
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
    balance: 850000,
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
    balance: 120000,
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
    balance: 95000,
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
    balance: 500000,
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
    balance: 3200000,
    description: 'Корпоративный счет для операций',
    lastTransactionDate: '2025-01-07T11:45:00.000Z',
    createdAt: '2024-12-15T00:00:00.000Z',
    updatedAt: '2025-01-07T11:45:00.000Z'
  }
]

// ============ MOCK TRANSACTIONS ============

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_revenue_september',
    accountId: 'acc_1',
    type: 'income',
    amount: 15000000,
    description: 'Выручка от продаж за август-сентябрь (накопленная)',
    performedBy: { type: 'user', id: 'user_1', name: 'Admin' },
    status: 'completed',
    balanceAfter: 19000000,
    createdAt: '2025-08-31T23:59:00.000Z',
    updatedAt: '2025-08-31T23:59:00.000Z'
  },

  // ✅ Sprint 4: Transactions from previous completed shift (yesterday evening)
  {
    id: 'tx_shift_prev_income',
    accountId: 'acc_1',
    type: 'income',
    amount: 2500000,
    description: 'POS Shift (Yesterday Evening) - Net Income',
    performedBy: { type: 'user', id: 'cashier_mike_chen', name: 'Mike Chen' },
    status: 'completed',
    balanceAfter: 6500000,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },

  {
    id: 'tx_shift_prev_expenses',
    accountId: 'acc_1',
    type: 'expense',
    amount: 150000,
    description: 'POS Shift (Yesterday Evening) - Direct Expenses',
    expenseCategory: { type: 'daily', category: 'other' },
    performedBy: { type: 'user', id: 'cashier_mike_chen', name: 'Mike Chen' },
    status: 'completed',
    balanceAfter: 6350000,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },

  // ✅ Транзакции для completed платежей
  {
    id: 'txn_payment_po_001',
    accountId: 'acc_1',
    type: 'expense',
    amount: 810000,
    description: 'Payment: Beef tenderloin for PO-001',
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: { type: 'user', id: 'user_1', name: 'Admin' },
    status: 'completed',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    relatedOrderIds: ['po-001'],
    relatedPaymentId: 'payment_po_001_overpaid',
    createdAt: '2025-09-01T10:30:00.000Z',
    updatedAt: '2025-09-01T10:30:00.000Z'
  },

  {
    id: 'txn_payment_po_002',
    accountId: 'acc_1',
    type: 'expense',
    amount: 130000,
    description: 'Payment: Fresh vegetables for PO-002',
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: { type: 'user', id: 'user_1', name: 'Admin' },
    status: 'completed',
    counteragentId: 'sup-fresh-veg-market',
    counteragentName: 'Fresh Vegetable Market',
    relatedOrderIds: ['po-002'],
    relatedPaymentId: 'payment_po_002_exact',
    createdAt: '2025-09-02T09:15:00.000Z',
    updatedAt: '2025-09-02T09:15:00.000Z'
  },

  {
    id: 'txn_payment_po_006',
    accountId: 'acc_1',
    type: 'expense',
    amount: 160000,
    description: 'Payment: Beverages for PO-0904-006 (adjusted after receipt)',
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: { type: 'user', id: 'user_1', name: 'Admin' },
    status: 'completed',
    counteragentId: 'sup-beverage-distribution',
    counteragentName: 'Jakarta Beverage Distribution',
    relatedOrderIds: ['po-1757014034857'],
    relatedPaymentId: 'payment_po_006_adjusted',
    createdAt: '2025-09-04T16:00:00.000Z',
    updatedAt: '2025-09-04T16:00:00.000Z'
  },

  {
    id: 'txn_payment_credit_test',
    accountId: 'acc_2', // BCA Main
    type: 'expense',
    amount: 1200000,
    description: 'Payment: Test order PO-CREDIT-001 (partial delivery)',
    expenseCategory: { type: 'daily', category: 'product' },
    performedBy: { type: 'user', id: 'user_1', name: 'Test Manager' },
    status: 'completed',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    relatedOrderIds: ['po-credit-test'],
    relatedPaymentId: 'payment_credit_test',
    createdAt: '2025-08-31T16:00:00.000Z',
    updatedAt: '2025-08-31T16:00:00.000Z'
  },

  {
    id: 'txn_payment_rent',
    accountId: 'acc_1',
    type: 'expense',
    amount: 12000000,
    description: 'Payment: Monthly restaurant rent - September 2025',
    expenseCategory: { type: 'daily', category: 'rent' },
    performedBy: { type: 'user', id: 'user_1', name: 'Admin' },
    status: 'completed',
    counteragentId: 'landlord-main',
    counteragentName: 'Restaurant Space Rental',
    relatedOrderIds: [],
    relatedPaymentId: 'payment_rent_monthly',
    createdAt: '2025-08-31T16:00:00.000Z',
    updatedAt: '2025-08-31T16:00:00.000Z'
  },
  {
    id: 'txn_1',
    accountId: 'acc_1',
    type: 'income',
    amount: 500000,
    description: 'Выручка от продаж за день',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z'
  },
  {
    id: 'txn_2',
    accountId: 'acc_1',
    type: 'expense',
    amount: 150000,
    description: 'Закупка продуктов',
    expenseCategory: {
      type: 'daily',
      category: 'product'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-15T08:15:00.000Z',
    updatedAt: '2025-01-15T08:15:00.000Z'
  },
  {
    id: 'txn_3',
    accountId: 'acc_2',
    type: 'income',
    amount: 5000000,
    description: 'Поступление от инвестора',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-14T15:45:00.000Z',
    updatedAt: '2025-01-14T15:45:00.000Z'
  },
  {
    id: 'txn_4',
    accountId: 'acc_1',
    type: 'transfer',
    amount: -200000,
    description: 'Transfer to BCA Main: Пополнение банковского счета',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    transferDetails: {
      fromAccountId: 'acc_1',
      toAccountId: 'acc_2'
    },
    createdAt: '2025-01-14T12:00:00.000Z',
    updatedAt: '2025-01-14T12:00:00.000Z'
  },
  {
    id: 'txn_5',
    accountId: 'acc_2',
    type: 'transfer',
    amount: 200000,
    description: 'Transfer from Основная касса: Пополнение банковского счета',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    transferDetails: {
      fromAccountId: 'acc_1',
      toAccountId: 'acc_2'
    },
    createdAt: '2025-01-14T12:00:00.000Z',
    updatedAt: '2025-01-14T12:00:00.000Z'
  },
  {
    id: 'txn_6',
    accountId: 'acc_3',
    type: 'expense',
    amount: 75000,
    description: 'Оплата коммунальных услуг',
    expenseCategory: {
      type: 'daily',
      category: 'utilities'
    },
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-13T12:20:00.000Z',
    updatedAt: '2025-01-13T12:20:00.000Z'
  },
  {
    id: 'txn_7',
    accountId: 'acc_4',
    type: 'expense',
    amount: 35000,
    description: 'Доставка еды через Gojek',
    expenseCategory: {
      type: 'daily',
      category: 'takeaway'
    },
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-12T09:15:00.000Z',
    updatedAt: '2025-01-12T09:15:00.000Z'
  },
  {
    id: 'txn_8',
    accountId: 'acc_5',
    type: 'expense',
    amount: 50000,
    description: 'Транспортные расходы',
    expenseCategory: {
      type: 'daily',
      category: 'transport'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-11T16:30:00.000Z',
    updatedAt: '2025-01-11T16:30:00.000Z'
  },
  {
    id: 'txn_9',
    accountId: 'acc_1',
    type: 'correction',
    amount: 50000,
    description: 'Корректировка баланса после инвентаризации',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    isCorrection: true,
    createdAt: '2025-01-10T18:00:00.000Z',
    updatedAt: '2025-01-10T18:00:00.000Z'
  },
  {
    id: 'txn_10',
    accountId: 'acc_2',
    type: 'expense',
    amount: 2500000,
    description: 'Зарплата сотрудников',
    expenseCategory: {
      type: 'daily',
      category: 'salary'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-09T14:30:00.000Z',
    updatedAt: '2025-01-09T14:30:00.000Z'
  },
  {
    id: 'txn_11',
    accountId: 'acc_3',
    type: 'income',
    amount: 200000,
    description: 'Возврат депозита поставщика',
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-08T16:45:00.000Z',
    updatedAt: '2025-01-08T16:45:00.000Z'
  },
  {
    id: 'txn_12',
    accountId: 'acc_7',
    type: 'expense',
    amount: 100000,
    description: 'Мелкие хозяйственные расходы',
    expenseCategory: {
      type: 'daily',
      category: 'other'
    },
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-08T14:20:00.000Z',
    updatedAt: '2025-01-08T14:20:00.000Z'
  },
  {
    id: 'txn_13',
    accountId: 'acc_8',
    type: 'expense',
    amount: 300000,
    description: 'Оплата услуг клининга',
    expenseCategory: {
      type: 'daily',
      category: 'cleaning'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-07T11:45:00.000Z',
    updatedAt: '2025-01-07T11:45:00.000Z'
  },
  {
    id: 'txn_14',
    accountId: 'acc_2',
    type: 'expense',
    amount: 1800000,
    description: 'Арендная плата за помещение',
    expenseCategory: {
      type: 'daily',
      category: 'rent'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-06T10:00:00.000Z',
    updatedAt: '2025-01-06T10:00:00.000Z'
  },
  {
    id: 'txn_15',
    accountId: 'acc_1',
    type: 'income',
    amount: 650000,
    description: 'Выручка от продаж',
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-05T19:30:00.000Z',
    updatedAt: '2025-01-05T19:30:00.000Z'
  },
  {
    id: 'txn_16',
    accountId: 'acc_4',
    type: 'income',
    amount: 80000,
    description: 'Пополнение Gojek баланса',
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-05T12:15:00.000Z',
    updatedAt: '2025-01-05T12:15:00.000Z'
  },
  {
    id: 'txn_17',
    accountId: 'acc_5',
    type: 'income',
    amount: 60000,
    description: 'Пополнение Grab баланса',
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2025-01-04T14:25:00.000Z',
    updatedAt: '2025-01-04T14:25:00.000Z'
  },
  {
    id: 'txn_18',
    accountId: 'acc_8',
    type: 'income',
    amount: 1200000,
    description: 'Поступление от корпоративного клиента',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-03T13:00:00.000Z',
    updatedAt: '2025-01-03T13:00:00.000Z'
  },
  {
    id: 'txn_19',
    accountId: 'acc_3',
    type: 'expense',
    amount: 250000,
    description: 'Покупка оборудования для кухни',
    expenseCategory: {
      type: 'daily',
      category: 'renovation'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2025-01-02T15:20:00.000Z',
    updatedAt: '2025-01-02T15:20:00.000Z'
  },
  {
    id: 'txn_20',
    accountId: 'acc_7',
    type: 'transfer',
    amount: -400000,
    description: 'Transfer to Основная касса: Пополнение основной кассы',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    transferDetails: {
      fromAccountId: 'acc_7',
      toAccountId: 'acc_1',
      fromBalanceAfter: 600000,
      toBalanceAfter: 450000
    },
    createdAt: '2025-01-01T20:00:00.000Z',
    updatedAt: '2025-01-01T20:00:00.000Z'
  },
  {
    id: 'txn_21',
    accountId: 'acc_1',
    type: 'transfer',
    amount: 400000,
    description: 'Transfer from Резервная касса: Пополнение основной кассы',
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    transferDetails: {
      fromAccountId: 'acc_7',
      toAccountId: 'acc_1',
      fromBalanceAfter: 600000,
      toBalanceAfter: 450000
    },
    createdAt: '2025-01-01T20:00:00.000Z',
    updatedAt: '2025-01-01T20:00:00.000Z'
  },
  {
    id: 'txn_22',
    accountId: 'acc_2',
    type: 'expense',
    amount: 500000,
    description: 'Оплата охранных услуг',
    expenseCategory: {
      type: 'daily',
      category: 'security'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2024-12-31T16:30:00.000Z',
    updatedAt: '2024-12-31T16:30:00.000Z'
  },
  {
    id: 'txn_23',
    accountId: 'acc_8',
    type: 'expense',
    amount: 180000,
    description: 'Взнос в управляющую компанию поселка',
    expenseCategory: {
      type: 'daily',
      category: 'village'
    },
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2024-12-30T14:15:00.000Z',
    updatedAt: '2024-12-30T14:15:00.000Z'
  },
  {
    id: 'txn_24',
    accountId: 'acc_1',
    type: 'expense',
    amount: 85000,
    description: 'Торт Ayu на заказ',
    expenseCategory: {
      type: 'daily',
      category: 'ayu_cake'
    },
    performedBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    status: 'completed',
    createdAt: '2024-12-29T11:00:00.000Z',
    updatedAt: '2024-12-29T11:00:00.000Z'
  },
  {
    id: 'txn_25',
    accountId: 'acc_2',
    type: 'expense',
    amount: 750000,
    description: 'Инвестиции в акции',
    expenseCategory: {
      type: 'investment',
      category: 'shares'
    },
    performedBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    status: 'completed',
    createdAt: '2024-12-28T09:30:00.000Z',
    updatedAt: '2024-12-28T09:30:00.000Z'
  }
]

// ============ MOCK DATA UTILITIES ============

export class MockAccountService {
  static getAccountById(id: string): Account | undefined {
    return mockAccounts.find(account => account.id === id)
  }

  static getActiveAccounts(): Account[] {
    return mockAccounts.filter(account => account.isActive)
  }

  static getAccountTransactions(accountId: string): Transaction[] {
    return mockTransactions
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static getTotalBalance(): number {
    return mockAccounts.reduce((sum, account) => sum + account.balance, 0)
  }

  static getTransactionsByType(type: string): Transaction[] {
    return mockTransactions.filter(transaction => transaction.type === type)
  }

  static getTransactionsByDateRange(from: string, to: string): Transaction[] {
    return mockTransactions.filter(
      transaction => transaction.createdAt >= from && transaction.createdAt <= to
    )
  }

  static getExpensesByCategory(categoryType: 'daily' | 'investment'): Transaction[] {
    return mockTransactions.filter(
      transaction =>
        transaction.type === 'expense' && transaction.expenseCategory?.type === categoryType
    )
  }

  static getAccountBalance(accountId: string): number {
    const account = this.getAccountById(accountId)
    return account?.balance || 0
  }

  static getTransactionStats(accountId?: string) {
    const transactions = accountId ? this.getAccountTransactions(accountId) : mockTransactions

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const transfers = transactions.filter(t => t.type === 'transfer').length

    const corrections = transactions.filter(t => t.type === 'correction').length

    return {
      totalTransactions: transactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      transfersCount: transfers,
      correctionsCount: corrections,
      netChange: income - expenses
    }
  }

  static getTopExpenseCategories(limit = 5) {
    const categoryTotals = new Map<string, number>()

    mockTransactions
      .filter(t => t.type === 'expense' && t.expenseCategory)
      .forEach(transaction => {
        const category = transaction.expenseCategory!.category
        const current = categoryTotals.get(category) || 0
        categoryTotals.set(category, current + transaction.amount)
      })

    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, amount]) => ({ category, amount }))
  }

  static getRecentTransactions(limit = 10): Transaction[] {
    return [...mockTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  static searchTransactions(query: string): Transaction[] {
    const searchQuery = query.toLowerCase()
    return mockTransactions.filter(
      transaction =>
        transaction.description.toLowerCase().includes(searchQuery) ||
        transaction.performedBy.name.toLowerCase().includes(searchQuery)
    )
  }
}

// ============ MOCK GENERATORS ============

export function generateMockAccount(overrides: Partial<Account> = {}): Account {
  const accountTypes: Account['type'][] = ['cash', 'bank', 'card', 'gojeck', 'grab']
  const randomType = accountTypes[Math.floor(Math.random() * accountTypes.length)]

  const defaultAccount: Account = {
    id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Mock Account',
    type: randomType,
    isActive: true,
    balance: Math.floor(Math.random() * 5000000),
    description: 'Generated mock account',
    lastTransactionDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return { ...defaultAccount, ...overrides }
}

export function generateMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const transactionTypes: Transaction['type'][] = ['income', 'expense', 'transfer', 'correction']
  const randomType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]

  const defaultTransaction: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId: 'acc_1',
    type: randomType,
    amount: Math.floor(Math.random() * 1000000) + 10000,
    description: 'Mock transaction',
    performedBy: {
      type: 'user',
      id: 'mock_user',
      name: 'Mock User'
    },
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Добавляем категорию расходов для expense транзакций
  if (randomType === 'expense') {
    const dailyCategories = ['product', 'takeaway', 'utilities', 'salary', 'transport', 'other']
    const randomCategory = dailyCategories[Math.floor(Math.random() * dailyCategories.length)]

    defaultTransaction.expenseCategory = {
      type: 'daily',
      category: randomCategory as any
    }
  }

  return { ...defaultTransaction, ...overrides }
}

export function generateMockAccountsSet(count: number): Account[] {
  const accounts: Account[] = []
  const accountNames = [
    'Основная касса',
    'BCA Business',
    'Mandiri Card',
    'Резервный фонд',
    'Gojek Balance',
    'Grab Wallet',
    'BNI Savings',
    'CIMB Savings',
    'Dana Wallet',
    'OVO Balance',
    'LinkAja',
    'Permata Bank'
  ]

  for (let i = 0; i < count; i++) {
    const name = accountNames[i] || `Account ${i + 1}`
    accounts.push(generateMockAccount({ name }))
  }

  return accounts
}

export function generateMockTransactionsSet(
  accounts: Account[],
  transactionsPerAccount: number = 5
): Transaction[] {
  const transactions: Transaction[] = []

  accounts.forEach(account => {
    for (let i = 0; i < transactionsPerAccount; i++) {
      transactions.push(
        generateMockTransaction({
          accountId: account.id
        })
      )
    }
  })

  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
