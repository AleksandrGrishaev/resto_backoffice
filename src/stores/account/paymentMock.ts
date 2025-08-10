// src/stores/account/paymentMock.ts
import type { PendingPayment, PaymentStatistics } from './types'

const now = new Date().toISOString()

export const mockPendingPayments: PendingPayment[] = [
  // =============================================
  // СРОЧНЫЕ ПЛАТЕЖИ (ПРОСРОЧКА)
  // =============================================
  {
    id: 'payment_1',
    counteragentId: 'ca-fresh-veg-market',
    counteragentName: 'Fresh Vegetable Market',
    amount: 450000,
    description: 'Овощи и зелень за 3 дня',
    dueDate: '2025-08-07T00:00:00.000Z', // просрочка!
    priority: 'urgent',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'FVM-080725',
    notes: 'ПРОСРОЧКА! Требуют оплату немедленно',
    assignedToAccount: 'acc_1', // назначен на основную кассу
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-07T12:00:00.000Z',
    updatedAt: '2025-08-08T14:30:00.000Z'
  },

  {
    id: 'payment_2',
    counteragentId: 'utility-company',
    counteragentName: 'PLN (Электричество)',
    amount: 1200000,
    description: 'Счет за электричество за июль',
    dueDate: '2025-08-05T00:00:00.000Z', // просрочка!
    priority: 'urgent',
    status: 'pending',
    category: 'utilities',
    invoiceNumber: 'PLN-072025-REST',
    notes: 'ПРОСРОЧКА! Грозят отключением',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-07-25T10:00:00.000Z',
    updatedAt: '2025-08-08T09:15:00.000Z'
  },

  // =============================================
  // ЗАРПЛАТА (СРОЧНО)
  // =============================================
  {
    id: 'payment_3',
    counteragentId: 'staff-salaries',
    counteragentName: 'Зарплата персонала',
    amount: 8500000,
    description: 'Зарплата за июль 2025',
    dueDate: '2025-08-10T00:00:00.000Z',
    priority: 'urgent',
    status: 'pending',
    category: 'salary',
    notes: 'Зарплата должна быть выплачена в срок!',
    assignedToAccount: 'acc_2', // назначен на банковский счет
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-07-31T18:00:00.000Z',
    updatedAt: '2025-08-07T10:00:00.000Z'
  },

  // =============================================
  // ВЫСОКИЙ ПРИОРИТЕТ
  // =============================================
  {
    id: 'payment_4',
    counteragentId: 'ca-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 2500000,
    description: 'Поставка мяса за неделю 32-33',
    dueDate: '2025-08-12T00:00:00.000Z',
    priority: 'high',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'PMC-2025-0156',
    notes: 'Срочная оплата, иначе приостановят поставки',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-07T15:30:00.000Z',
    updatedAt: '2025-08-07T15:30:00.000Z'
  },

  {
    id: 'payment_5',
    counteragentId: 'ca-tech-repair',
    counteragentName: 'Restaurant Tech Repair',
    amount: 750000,
    description: 'Ремонт холодильного оборудования',
    dueDate: '2025-08-14T00:00:00.000Z',
    priority: 'high',
    status: 'pending',
    category: 'service',
    invoiceNumber: 'RTR-REP-089',
    notes: 'Экстренный ремонт главного холодильника',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-01T13:45:00.000Z',
    updatedAt: '2025-08-01T13:45:00.000Z'
  },

  // =============================================
  // СРЕДНИЙ ПРИОРИТЕТ
  // =============================================
  {
    id: 'payment_6',
    counteragentId: 'ca-cleaning-pro',
    counteragentName: 'Cleaning Service Pro',
    amount: 1800000,
    description: 'Генеральная уборка за июль 2025',
    dueDate: '2025-08-15T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'service',
    invoiceNumber: 'CSP-JUL-2025',
    notes: 'Ежемесячная оплата услуг клининга',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-01T09:00:00.000Z',
    updatedAt: '2025-08-01T09:00:00.000Z'
  },

  {
    id: 'payment_7',
    counteragentId: 'ca-dairy-plus',
    counteragentName: 'Dairy Products Plus',
    amount: 850000,
    description: 'Молочные продукты за август',
    dueDate: '2025-08-20T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'DPP-AUG-001',
    notes: 'Обычная поставка молочки',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-05T16:20:00.000Z',
    updatedAt: '2025-08-05T16:20:00.000Z'
  },

  {
    id: 'payment_8',
    counteragentId: 'ca-beverage-distribution',
    counteragentName: 'Jakarta Beverage Distribution',
    amount: 950000,
    description: 'Напитки для ресторана',
    dueDate: '2025-08-18T00:00:00.000Z',
    priority: 'medium',
    status: 'processing',
    category: 'supplier',
    invoiceNumber: 'JBD-080425',
    notes: 'В процессе согласования с бухгалтерией',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-04T14:00:00.000Z',
    updatedAt: '2025-08-08T16:20:00.000Z'
  },

  // =============================================
  // НИЗКИЙ ПРИОРИТЕТ
  // =============================================
  {
    id: 'payment_9',
    counteragentId: 'ca-spice-world',
    counteragentName: 'Spice World Indonesia',
    amount: 320000,
    description: 'Специи и приправы',
    dueDate: '2025-08-25T00:00:00.000Z',
    priority: 'low',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'SWI-2025-078',
    notes: 'Можно отложить на пару дней',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-06T11:45:00.000Z',
    updatedAt: '2025-08-06T11:45:00.000Z'
  },

  {
    id: 'payment_10',
    counteragentId: 'insurance-company',
    counteragentName: 'Страховая компания',
    amount: 2200000,
    description: 'Страхование ресторана на год',
    dueDate: '2025-08-30T00:00:00.000Z',
    priority: 'low',
    status: 'pending',
    category: 'other',
    invoiceNumber: 'INS-REST-2025',
    notes: 'Годовая страховка, можно оплатить до конца месяца',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-01T08:00:00.000Z',
    updatedAt: '2025-08-01T08:00:00.000Z'
  }
]

// ============ UTILITY FUNCTIONS ============

export function getPaymentsByStatus(status: string): PendingPayment[] {
  if (status === 'all') return mockPendingPayments
  return mockPendingPayments.filter(payment => payment.status === status)
}

export function getPaymentsByPriority(priority: string): PendingPayment[] {
  if (priority === 'all') return mockPendingPayments
  return mockPendingPayments.filter(payment => payment.priority === priority)
}

export function getOverduePayments(): PendingPayment[] {
  const now = new Date()
  return mockPendingPayments.filter(payment => {
    if (!payment.dueDate || payment.status !== 'pending') return false
    return new Date(payment.dueDate) < now
  })
}

export function getUrgentPayments(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment => payment.priority === 'urgent' && payment.status === 'pending'
  )
}

export function getPendingPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.status === 'pending')
}

export function getAssignedPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.assignedToAccount)
}

export function getPaymentsByAccount(accountId: string): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.assignedToAccount === accountId)
}

export function getPaymentsByCounteragent(counteragentId: string): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.counteragentId === counteragentId)
}

// ============ STATISTICS ============

export function calculatePaymentStatistics(): PaymentStatistics {
  const pending = getPendingPayments()
  const totalAmount = pending.reduce((sum, p) => sum + p.amount, 0)

  const urgent = getUrgentPayments()
  const overdue = getOverduePayments()

  return {
    totalPending: pending.length,
    totalAmount,
    urgentCount: urgent.length,
    overdueCount: overdue.length
  }
}

// ============ QUICK ACCESS ============

export function getTotalPendingAmount(): number {
  return getPendingPayments().reduce((sum, payment) => sum + payment.amount, 0)
}

export function getNextUrgentPayment(): PendingPayment | null {
  const urgent = getUrgentPayments()
  if (urgent.length === 0) return null

  return urgent.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })[0]
}

export function getPaymentsRequiringAttention(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment =>
      payment.status === 'pending' &&
      (payment.priority === 'urgent' || getOverduePayments().includes(payment))
  )
}
