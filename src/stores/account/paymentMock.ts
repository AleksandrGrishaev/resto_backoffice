// src/stores/account/paymentMock.ts - ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ВЕРСИЯ
// ✅ Все платежи теперь связаны с заказами через purchaseOrderId

import type { PendingPayment, PaymentStatistics } from './types'

const now = new Date().toISOString()

export const mockPendingPayments: PendingPayment[] = [
  // =============================================
  // ПЛАТЕЖИ ПО ЗАКАЗАМ ПОСТАВЩИКОВ
  // =============================================

  // 📦 po-001: ЧАСТИЧНАЯ ОПЛАТА (600k из 900k) + ПРОСРОЧКА на остаток
  {
    id: 'payment_po_001_partial',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 600000,
    description: 'Partial payment for order PO-001 (meat)',
    dueDate: '2025-09-01T00:00:00.000Z',
    priority: 'medium',
    status: 'completed', // уже оплачено
    category: 'supplier',
    invoiceNumber: 'PO-001',
    purchaseOrderId: 'po-001', // ✅ СВЯЗЬ С ЗАКАЗОМ
    sourceOrderId: 'po-001',
    paidAmount: 600000,
    paidDate: '2025-09-01T10:30:00.000Z',
    notes: 'Частичная оплата мяса, остаток в следующем платеже',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-30T09:00:00.000Z',
    updatedAt: '2025-09-01T10:30:00.000Z'
  },

  {
    id: 'payment_po_001_remaining',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 300000,
    description: 'Remaining payment for order PO-001 (meat)',
    dueDate: '2025-09-03T00:00:00.000Z', // ПРОСРОЧКА!
    priority: 'urgent',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'PO-001',
    purchaseOrderId: 'po-001', // ✅ ТОТ ЖЕ ЗАКАЗ
    sourceOrderId: 'po-001',
    notes: 'ПРОСРОЧКА! Остаток за мясо, поставщик требует оплату',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-30T09:01:00.000Z',
    updatedAt: '2025-09-04T08:00:00.000Z'
  },

  // 📦 po-002: ПОЛНАЯ ОПЛАТА (130k)
  {
    id: 'payment_po_002_full',
    counteragentId: 'sup-fresh-veg-market',
    counteragentName: 'Fresh Vegetable Market',
    amount: 130000,
    description: 'Full payment for order PO-002 (vegetables)',
    dueDate: '2025-08-29T00:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PO-002',
    purchaseOrderId: 'po-002', // ✅ СВЯЗЬ С ЗАКАЗОМ
    sourceOrderId: 'po-002',
    paidAmount: 130000,
    paidDate: '2025-08-28T14:20:00.000Z',
    notes: 'Полная оплата овощей, без проблем',
    assignedToAccount: 'acc_1',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-27T11:00:00.000Z',
    updatedAt: '2025-08-28T14:20:00.000Z'
  },

  // 📦 po-0830-005: ПЕРЕПЛАТА (250k вместо 220k)
  {
    id: 'payment_po_005_overpaid',
    counteragentId: 'sup-fresh-veg-market',
    counteragentName: 'Fresh Vegetable Market',
    amount: 250000,
    description: 'Payment for order PO-0830-005 (spices) - overpayment',
    dueDate: '2025-09-06T00:00:00.000Z',
    priority: 'low',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PO-0830-005',
    purchaseOrderId: 'po-0830-005', // ✅ СВЯЗЬ С ЗАКАЗОМ
    sourceOrderId: 'po-0830-005',
    paidAmount: 250000,
    paidDate: '2025-09-04T16:45:00.000Z',
    notes: 'ПЕРЕПЛАТА на 29,518 IDR! Можно зачесть в следующий заказ',
    assignedToAccount: 'acc_1',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-09-04T10:00:00.000Z',
    updatedAt: '2025-09-04T16:45:00.000Z'
  },

  // 📦 po-0830-004: БЕЗ ПЛАТЕЖЕЙ (заказ молока остается без счетов)
  // 📦 po-003: БЕЗ ПЛАТЕЖЕЙ (заказ пива остается без счетов)

  // =============================================
  // ОБЫЧНЫЕ ОПЕРАЦИОННЫЕ ПЛАТЕЖИ (НЕ ПО ЗАКАЗАМ)
  // =============================================

  // 💡 Электричество - ПРОСРОЧКА
  {
    id: 'payment_electricity_overdue',
    counteragentId: 'utility-company-pln',
    counteragentName: 'PLN (Электричество)',
    amount: 1200000,
    description: 'Счет за электричество за август',
    dueDate: '2025-09-01T00:00:00.000Z', // ПРОСРОЧКА!
    priority: 'urgent',
    status: 'pending',
    category: 'utilities',
    invoiceNumber: 'PLN-082025-REST',
    notes: 'ПРОСРОЧКА! Грозят отключением света',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-25T10:00:00.000Z',
    updatedAt: '2025-09-04T09:15:00.000Z'
  },

  // 💰 Зарплата персонала - СРОЧНО
  {
    id: 'payment_salary_august',
    counteragentId: 'staff-payroll',
    counteragentName: 'Зарплата персонала',
    amount: 8500000,
    description: 'Зарплата за август 2025',
    dueDate: '2025-09-10T00:00:00.000Z',
    priority: 'urgent',
    status: 'pending',
    category: 'salary',
    notes: 'Зарплата должна быть выплачена в срок!',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z'
  },

  // 🏪 Аренда - СРЕДНИЙ ПРИОРИТЕТ
  {
    id: 'payment_rent_september',
    counteragentId: 'landlord-restaurant',
    counteragentName: 'Арендодатель ресторана',
    amount: 15000000,
    description: 'Аренда ресторана за сентябрь',
    dueDate: '2025-09-15T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'rent',
    invoiceNumber: 'RENT-SEP-2025',
    notes: 'Ежемесячная аренда основного зала',
    assignedToAccount: 'acc_2', // назначено на банковский счет
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-20T12:00:00.000Z',
    updatedAt: '2025-08-20T12:00:00.000Z'
  },

  // 📞 Интернет и связь - НИЗКИЙ ПРИОРИТЕТ
  {
    id: 'payment_internet_september',
    counteragentId: 'telecom-provider',
    counteragentName: 'Telkom Indonesia',
    amount: 850000,
    description: 'Интернет и телефония за сентябрь',
    dueDate: '2025-09-20T00:00:00.000Z',
    priority: 'low',
    status: 'pending',
    category: 'utilities',
    invoiceNumber: 'TELKOM-SEP-2025',
    notes: 'Можно оплатить в течение месяца',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-25T14:30:00.000Z',
    updatedAt: '2025-08-25T14:30:00.000Z'
  },

  // 🛡️ Страхование - НИЗКИЙ ПРИОРИТЕТ
  {
    id: 'payment_insurance_annual',
    counteragentId: 'insurance-company',
    counteragentName: 'Страховая компания',
    amount: 2200000,
    description: 'Страхование ресторана на год',
    dueDate: '2025-09-30T00:00:00.000Z',
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
    createdAt: '2025-08-15T08:00:00.000Z',
    updatedAt: '2025-08-15T08:00:00.000Z'
  },

  // 🧹 Клининг - СРЕДНИЙ ПРИОРИТЕТ
  {
    id: 'payment_cleaning_august',
    counteragentId: 'cleaning-service',
    counteragentName: 'Служба уборки',
    amount: 750000,
    description: 'Услуги клининга за август',
    dueDate: '2025-09-08T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'services',
    invoiceNumber: 'CLEAN-AUG-2025',
    notes: 'Ежемесячная глубокая уборка',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-30T16:00:00.000Z',
    updatedAt: '2025-08-30T16:00:00.000Z'
  },

  // 🔧 Ремонт оборудования - ЗАВЕРШЕН
  {
    id: 'payment_equipment_repair_completed',
    counteragentId: 'equipment-repair-service',
    counteragentName: 'Сервис ремонта оборудования',
    amount: 1250000,
    description: 'Ремонт плиты и холодильника',
    dueDate: '2025-08-25T00:00:00.000Z',
    priority: 'high',
    status: 'completed',
    category: 'maintenance',
    invoiceNumber: 'REPAIR-AUG-024',
    paidAmount: 1250000,
    paidDate: '2025-08-24T11:15:00.000Z',
    notes: 'Экстренный ремонт кухонного оборудования - оплачен',
    assignedToAccount: 'acc_1',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-22T13:45:00.000Z',
    updatedAt: '2025-08-24T11:15:00.000Z'
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

// ✅ НОВАЯ ФУНКЦИЯ: Получить платежи по заказу
export function getPaymentsByPurchaseOrder(purchaseOrderId: string): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.purchaseOrderId === purchaseOrderId)
}

// ✅ НОВАЯ ФУНКЦИЯ: Получить все платежи по заказам поставщиков
export function getSupplierOrderPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.purchaseOrderId)
}

// ✅ НОВАЯ ФУНКЦИЯ: Получить операционные платежи (не по заказам)
export function getOperationalPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => !payment.purchaseOrderId)
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

// ============ SUMMARY FOR DEBUGGING ============

export function getPaymentsSummaryForDebug() {
  const orderPayments = getSupplierOrderPayments()
  const operationalPayments = getOperationalPayments()
  const pending = getPendingPayments()
  const completed = getPaymentsByStatus('completed')

  console.log('=== PAYMENTS SUMMARY ===')
  console.log(`Total payments: ${mockPendingPayments.length}`)
  console.log(`├── Order-related: ${orderPayments.length}`)
  console.log(`├── Operational: ${operationalPayments.length}`)
  console.log(`├── Pending: ${pending.length}`)
  console.log(`└── Completed: ${completed.length}`)

  console.log('\n=== ORDERS COVERAGE ===')
  console.log('po-001: partial + overdue (600k paid + 300k pending)')
  console.log('po-002: fully paid (130k)')
  console.log('po-0830-005: overpaid (250k instead of 220k)')
  console.log('po-0830-004: NO PAYMENTS')
  console.log('po-003: NO PAYMENTS')

  return {
    total: mockPendingPayments.length,
    orderRelated: orderPayments.length,
    operational: operationalPayments.length,
    pending: pending.length,
    completed: completed.length
  }
}
