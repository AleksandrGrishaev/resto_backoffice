// =============================================
// ПОЛНАЯ ЗАМЕНА src/stores/account/paymentMock.ts
// =============================================

import type { PendingPayment, PaymentStatistics } from './types'

const now = new Date().toISOString()

export const mockPendingPayments: PendingPayment[] = [
  // =============================================
  // ПЛАТЕЖИ ПО ЗАКАЗАМ ПОСТАВЩИКОВ (с новыми полями)
  // =============================================

  // 📦 po-001: ПЕРЕПЛАТА из-за недопоставки (заплатили 900k, получили на 810k)
  {
    id: 'payment_po_001_full',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 900000, // Заплатили за полный заказ
    description: 'Payment for order PO-001 (beef tenderloin)',
    dueDate: '2025-09-01T00:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PO-001',

    // ✅ НОВЫЕ ПОЛЯ для интеграции с supplier store
    purchaseOrderId: 'po-001',
    sourceOrderId: 'po-001',
    autoSyncEnabled: true,
    lastAmountUpdate: now,
    amountHistory: [
      {
        oldAmount: 900000,
        newAmount: 900000,
        reason: 'original_order',
        changedAt: '2025-08-30T09:00:00.000Z',
        changedBy: {
          type: 'user',
          id: 'user_1',
          name: 'Admin'
        },
        notes: 'Initial payment amount set based on order total'
      }
      // После приемки должна добавиться запись о том, что нужно вернуть 90k
    ],

    paidAmount: 900000,
    paidDate: '2025-09-01T10:30:00.000Z',
    assignedToAccount: 'acc_1',
    notes: 'ПЕРЕПЛАТА: заплачено 900k, получено товара на 810k. Требуется возврат 90k.',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-30T09:00:00.000Z',
    updatedAt: '2025-09-01T10:30:00.000Z'
  },

  // 📦 po-002: ТОЧНАЯ ОПЛАТА (без расхождений)
  {
    id: 'payment_po_002_full',
    counteragentId: 'sup-fresh-greens',
    counteragentName: 'Fresh Greens Ltd',
    amount: 130000,
    description: 'Payment for order PO-002 (iceberg lettuce)',
    dueDate: '2025-09-02T00:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PO-002',

    purchaseOrderId: 'po-002',
    sourceOrderId: 'po-002',
    autoSyncEnabled: true,
    lastAmountUpdate: now,
    amountHistory: [
      {
        oldAmount: 130000,
        newAmount: 130000,
        reason: 'original_order',
        changedAt: '2025-08-31T10:00:00.000Z',
        changedBy: {
          type: 'user',
          id: 'user_2',
          name: 'Manager'
        },
        notes: 'Payment amount matches delivered amount perfectly'
      }
    ],

    paidAmount: 130000,
    paidDate: '2025-09-02T09:15:00.000Z',
    assignedToAccount: 'acc_1',
    notes: 'Точная оплата, приемка без расхождений',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-08-31T10:00:00.000Z',
    updatedAt: '2025-09-02T09:15:00.000Z'
  },

  // 📦 po-003: НЕ ОПЛАЧЕН (заказ еще не доставлен)
  {
    id: 'payment_po_003_pending',
    counteragentId: 'sup-global-imports',
    counteragentName: 'Global Food Imports',
    amount: 660000,
    description: 'Payment for order PO-003 (salmon fillet)',
    dueDate: '2025-09-10T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'PO-003',

    purchaseOrderId: 'po-003',
    sourceOrderId: 'po-003',
    autoSyncEnabled: true,
    lastAmountUpdate: now,
    amountHistory: [
      {
        oldAmount: 660000,
        newAmount: 660000,
        reason: 'original_order',
        changedAt: '2025-09-03T15:00:00.000Z',
        changedBy: {
          type: 'user',
          id: 'user_1',
          name: 'Admin'
        },
        notes: 'Initial payment created for order PO-003'
      }
    ],

    notes: 'Ожидается доставка, затем оплата',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-03T15:00:00.000Z',
    updatedAt: '2025-09-03T15:00:00.000Z'
  },

  // 📦 po-0904-006: ПЕРЕПЛАТА, которая превратилась в точную оплату после приемки
  {
    id: 'payment_po_0904_006',
    counteragentId: 'sup-beverage-center',
    counteragentName: 'Beverage Distribution Center',
    amount: 160000, // Обновлено после приемки (было 240000)
    description: 'Payment for order PO-0904-006 (cola 330ml)',
    dueDate: '2025-09-06T00:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PO-0904-006',

    purchaseOrderId: 'po-1757014034857',
    sourceOrderId: 'po-1757014034857',
    autoSyncEnabled: true,
    lastAmountUpdate: now,
    amountHistory: [
      {
        oldAmount: 240000,
        newAmount: 240000,
        reason: 'original_order',
        changedAt: '2025-09-04T12:00:00.000Z',
        changedBy: {
          type: 'user',
          id: 'user_1',
          name: 'Admin'
        },
        notes: 'Initial payment for 24 cans at 10k each'
      },
      {
        oldAmount: 240000,
        newAmount: 160000,
        reason: 'receipt_discrepancy',
        changedAt: now,
        changedBy: {
          type: 'system',
          id: 'receipt-system',
          name: 'Receipt Processing System'
        },
        notes:
          'Amount adjusted after receipt completion: received 20 cans at 8k each instead of 24 at 10k'
      }
    ],

    paidAmount: 160000,
    paidDate: '2025-09-04T19:35:00.000Z',
    assignedToAccount: 'acc_1',
    notes: 'Сумма автоматически скорректирована после приемки с расхождениями',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-04T12:00:00.000Z',
    updatedAt: now
  },

  // =============================================
  // ОПЕРАЦИОННЫЕ ПЛАТЕЖИ (не связанные с заказами)
  // =============================================

  // 🔥 Коммунальные услуги - СРОЧНО И ПРОСРОЧЕНО
  {
    id: 'payment_utilities_september_urgent',
    counteragentId: 'utility-company',
    counteragentName: 'PT. Listrik Negara',
    amount: 2500000,
    description: 'Электричество за сентябрь - СРОЧНО!',
    dueDate: '2025-09-03T00:00:00.000Z', // ПРОСРОЧКА!
    priority: 'urgent',
    status: 'pending',
    category: 'utilities',
    invoiceNumber: 'ELEC-SEP-2025',
    notes: 'ВНИМАНИЕ: Угроза отключения электричества при несвоевременной оплате!',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-28T14:00:00.000Z',
    updatedAt: '2025-08-28T14:00:00.000Z'
  },

  // 🧹 Клининг - СРЕДНИЙ ПРИОРИТЕТ
  {
    id: 'payment_cleaning_september',
    counteragentId: 'cleaning-service',
    counteragentName: 'Служба уборки',
    amount: 750000,
    description: 'Услуги клининга за сентябрь',
    dueDate: '2025-09-10T00:00:00.000Z',
    priority: 'medium',
    status: 'pending',
    category: 'services',
    invoiceNumber: 'CLEAN-SEP-2025',
    notes: 'Ежемесячная глубокая уборка',
    createdBy: {
      type: 'user',
      id: 'user_2',
      name: 'Manager'
    },
    createdAt: '2025-09-01T16:00:00.000Z',
    updatedAt: '2025-09-01T16:00:00.000Z'
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
    assignedToAccount: 'acc_1',
    notes: 'Экстренный ремонт кухонного оборудования - успешно завершен',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-22T13:45:00.000Z',
    updatedAt: '2025-08-24T11:15:00.000Z'
  },

  // 🏢 Аренда помещения - ВЫСОКИЙ ПРИОРИТЕТ
  {
    id: 'payment_rent_october',
    counteragentId: 'landlord-company',
    counteragentName: 'Property Management Co.',
    amount: 15000000,
    description: 'Аренда помещения за октябрь',
    dueDate: '2025-09-25T00:00:00.000Z',
    priority: 'high',
    status: 'pending',
    category: 'rent',
    invoiceNumber: 'RENT-OCT-2025',
    notes: 'Ежемесячная арендная плата',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z'
  }
]

// =============================================
// ОБНОВЛЕННЫЕ UTILITY FUNCTIONS с поддержкой новых полей
// =============================================

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

// ✅ НОВЫЕ ФУНКЦИИ для работы с заказами поставщиков
export function getPaymentsByPurchaseOrder(purchaseOrderId: string): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.purchaseOrderId === purchaseOrderId)
}

export function getSupplierOrderPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.purchaseOrderId)
}

export function getOperationalPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => !payment.purchaseOrderId)
}

export function getPaymentsWithAmountHistory(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment => payment.amountHistory && payment.amountHistory.length > 1
  )
}

export function getAutoSyncEnabledPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.autoSyncEnabled)
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
  const withAmountHistory = getPaymentsWithAmountHistory()

  console.log('=== ОБНОВЛЕННЫЕ PAYMENTS SUMMARY ===')
  console.log(`Total payments: ${mockPendingPayments.length}`)
  console.log(`├── Order-related: ${orderPayments.length}`)
  console.log(`├── Operational: ${operationalPayments.length}`)
  console.log(`├── Pending: ${pending.length}`)
  console.log(`├── Completed: ${completed.length}`)
  console.log(`└── With amount history: ${withAmountHistory.length}`)

  console.log('\n=== ORDERS COVERAGE (UPDATED) ===')
  console.log('po-001: ПЕРЕПЛАЧЕН (900k заплачено, 810k получено) - возврат 90k')
  console.log('po-002: ТОЧНО ОПЛАЧЕН (130k заплачено = 130k получено)')
  console.log('po-003: НЕ ОПЛАЧЕН (660k ожидает доставки)')
  console.log('po-0904-006: АВТОКОРРЕКТИРОВКА (240k → 160k после приемки)')

  console.log('\n=== НОВЫЕ ПОЛЯ ===')
  console.log(`Payments with purchaseOrderId: ${orderPayments.length}`)
  console.log(`Payments with autoSync enabled: ${getAutoSyncEnabledPayments().length}`)
  console.log(`Payments with amount history: ${withAmountHistory.length}`)

  return {
    total: mockPendingPayments.length,
    orderRelated: orderPayments.length,
    operational: operationalPayments.length,
    pending: pending.length,
    completed: completed.length,
    withAmountHistory: withAmountHistory.length,
    autoSyncEnabled: getAutoSyncEnabledPayments().length
  }
}
