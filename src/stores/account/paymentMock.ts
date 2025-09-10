// =============================================
// ПОЛНАЯ ЗАМЕНА src/stores/account/paymentMock.ts
// =============================================

import type { PendingPayment, PaymentStatistics } from './types'

const now = new Date().toISOString()

export const mockPendingPayments: PendingPayment[] = [
  // =============================================
  // ПЕРЕПЛАЧЕННЫЙ СЧЕТ PO-001 (переплата 90k доступна)
  // =============================================
  {
    id: 'payment_po_001_overpaid',
    counteragentId: 'ca-premium-meat-co', // ✅ Правильный ID
    counteragentName: 'Premium Meat Company',
    amount: 900000,
    description: 'Payment for order PO-001 (beef tenderloin)',
    dueDate: '2025-09-01T12:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PMC-2025-001',

    // ✅ НОВЫЕ ПОЛЯ: показывает переплату через usedAmount
    usedAmount: 810000, // Фактически использовано после приемки
    linkedOrders: [
      {
        orderId: 'po-001',
        orderNumber: 'PO-001',
        linkedAmount: 810000, // Фактически получено товара
        linkedAt: '2025-09-01T10:30:00.000Z',
        isActive: true
      }
    ],
    // availableAmount = 900000 - 810000 = 90000 ✅ ДОСТУПНО

    sourceOrderId: 'po-001',
    autoSyncEnabled: true,
    paidAmount: 900000,
    paidDate: '2025-09-01T10:30:00.000Z',
    assignedToAccount: 'acc_1',

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-30T09:00:00.000Z',
    updatedAt: '2025-09-01T15:30:00.000Z'
  },

  // =============================================
  // ТОЧНО ОПЛАЧЕННЫЙ СЧЕТ PO-002 (без переплаты)
  // =============================================
  {
    id: 'payment_po_002_exact',
    counteragentId: 'sup-fresh-veg-market', // ✅ Правильный ID
    counteragentName: 'Fresh Vegetable Market',
    amount: 130000,
    description: 'Payment for order PO-002 (iceberg lettuce)',
    dueDate: '2025-09-02T10:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'FVG-2025-002',

    // ✅ НОВЫЕ ПОЛЯ: полностью использован, нет переплаты
    usedAmount: 130000, // Использован полностью
    linkedOrders: [
      {
        orderId: 'po-002',
        orderNumber: 'PO-002',
        linkedAmount: 130000,
        linkedAt: '2025-09-02T09:15:00.000Z',
        isActive: true
      }
    ],

    sourceOrderId: 'po-002',
    autoSyncEnabled: true,
    paidAmount: 130000,
    paidDate: '2025-09-02T09:15:00.000Z',
    assignedToAccount: 'acc_1',

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-02T08:30:00.000Z',
    updatedAt: '2025-09-02T14:20:00.000Z'
  },

  // =============================================
  // PENDING СЧЕТ PO-003 (ожидает доставки)
  // =============================================
  {
    id: 'payment_po_003_pending',
    counteragentId: 'sup-specialty-foods', // ✅ Правильный ID
    counteragentName: 'Specialty Foods Supply',
    amount: 660000,
    description: 'Payment for order PO-003 (salmon fillet)',
    dueDate: '2025-09-03T16:00:00.000Z',
    priority: 'high',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'SFS-2025-003',

    // ✅ НОВЫЕ ПОЛЯ: pending, весь зарезервирован под заказ
    usedAmount: 0, // Еще не использован (pending)
    linkedOrders: [
      {
        orderId: 'po-003',
        orderNumber: 'PO-003',
        linkedAmount: 660000, // Полностью зарезервирован
        linkedAt: '2025-09-03T15:00:00.000Z',
        isActive: true
      }
    ],

    sourceOrderId: 'po-003',
    autoSyncEnabled: true,

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-03T14:45:00.000Z',
    updatedAt: '2025-09-03T15:00:00.000Z'
  },

  // =============================================
  // КОРРЕКТИРОВАННЫЙ СЧЕТ PO-0904-006 (240k -> 160k)
  // =============================================
  {
    id: 'payment_po_006_adjusted',
    counteragentId: 'sup-beverage-distribution', // ✅ Правильный ID
    counteragentName: 'Jakarta Beverage Distribution',
    amount: 160000, // Скорректирован после приемки
    description: 'Payment for order PO-0904-006 (cola 330ml)',
    dueDate: '2025-09-04T11:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'JBD-2025-006',

    // ✅ НОВЫЕ ПОЛЯ: изначально был 240k, скорректирован до 160k
    usedAmount: 160000, // Использован полностью после корректировки
    linkedOrders: [
      {
        orderId: 'po-1757014034857', // ✅ Правильный orderId
        orderNumber: 'PO-0904-006',
        linkedAmount: 160000, // Скорректированная сумма
        linkedAt: '2025-09-04T10:30:00.000Z',
        isActive: true
      }
    ],

    sourceOrderId: 'po-1757014034857',
    autoSyncEnabled: true,

    amountHistory: [
      {
        oldAmount: 240000,
        newAmount: 160000,
        reason: 'receipt_discrepancy',
        changedAt: '2025-09-04T14:30:00.000Z',
        changedBy: {
          type: 'system',
          id: 'receipt-system',
          name: 'Receipt Processing System'
        },
        notes: 'Amount adjusted after receipt: received 20 cans at 8k each instead of 24 at 10k'
      }
    ],

    paidAmount: 160000,
    paidDate: '2025-09-04T16:00:00.000Z',
    assignedToAccount: 'acc_1',

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-09-04T10:15:00.000Z',
    updatedAt: '2025-09-04T14:30:00.000Z'
  },

  // =============================================
  // ТЕСТОВЫЕ ЗАКАЗЫ ИЗ ДОКУМЕНТОВ
  // =============================================
  {
    id: 'payment_credit_test',
    counteragentId: 'ca-premium-meat-co', // ✅ Правильный ID
    counteragentName: 'Premium Meat Company',
    amount: 1500000,
    description: 'Payment for order PO-CREDIT-001',
    dueDate: '2025-09-01T12:00:00.000Z',
    priority: 'medium',
    status: 'completed',
    category: 'supplier',
    invoiceNumber: 'PMC-CREDIT-001',

    // ✅ НОВЫЕ ПОЛЯ: переплата по тестовому заказу
    usedAmount: 1200000, // Фактически получено
    linkedOrders: [
      {
        orderId: 'po-credit-test', // ✅ Правильный orderId
        orderNumber: 'PO-CREDIT-001',
        linkedAmount: 1200000, // Фактически использовано
        linkedAt: '2025-08-31T10:30:00.000Z',
        isActive: true
      }
    ],
    // availableAmount = 1500000 - 1200000 = 300000 ✅ БОЛЬШАЯ ПЕРЕПЛАТА

    sourceOrderId: 'po-credit-test',
    autoSyncEnabled: true,
    paidAmount: 1500000,
    paidDate: '2025-08-31T16:00:00.000Z',
    assignedToAccount: 'acc_2',

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: '2025-08-31T10:00:00.000Z',
    updatedAt: '2025-09-05T16:30:00.000Z'
  },

  // =============================================
  // ОПЕРАЦИОННЫЕ ПЛАТЕЖИ (правильные ID)
  // =============================================
  {
    id: 'payment_rent_monthly',
    counteragentId: 'landlord-main', // Можно оставить как есть
    counteragentName: 'Restaurant Space Rental',
    amount: 12000000,
    description: 'Monthly restaurant rent - September 2025',
    dueDate: '2025-09-01T00:00:00.000Z',
    priority: 'urgent',
    status: 'completed',
    category: 'rent',

    // ✅ НОВЫЕ ПОЛЯ: завершенный операционный платеж
    usedAmount: 12000000,
    linkedOrders: [], // Не связан с заказами

    paidAmount: 12000000,
    paidDate: '2025-08-31T16:00:00.000Z',
    autoSyncEnabled: false,
    assignedToAccount: 'acc_1',

    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Admin'
    },
    createdAt: '2025-08-25T10:00:00.000Z',
    updatedAt: '2025-08-31T16:00:00.000Z'
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

export function getPaymentsWithAmountHistory(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment => payment.amountHistory && payment.amountHistory.length > 1
  )
}

export function getAutoSyncEnabledPayments(): PendingPayment[] {
  return mockPendingPayments.filter(payment => payment.autoSyncEnabled)
}

// ✅ НОВЫЕ ФУНКЦИИ для работы с linkedOrders

export function getPaymentsByOrder(orderId: string): PendingPayment[] {
  return mockPendingPayments.filter(payment =>
    payment.linkedOrders?.some(order => order.orderId === orderId && order.isActive)
  )
}

// ✅ БЕЗОПАСНЫЕ ФУНКЦИИ с проверками
export function getSupplierOrderPayments(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment => payment.linkedOrders && payment.linkedOrders.length > 0
  )
}

export function getOperationalPayments(): PendingPayment[] {
  return mockPendingPayments.filter(
    payment => !payment.linkedOrders || payment.linkedOrders.length === 0
  )
}

export function getPaymentsWithAvailableAmount(): PendingPayment[] {
  return mockPendingPayments.filter(payment => {
    // Только для платежей связанных с заказами
    if (!payment.linkedOrders || payment.linkedOrders.length === 0) {
      return false // Операционные платежи не показываем в AttachBill
    }

    if (payment.status === 'completed') {
      return payment.amount > (payment.usedAmount || 0)
    }

    const linkedAmount = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    return payment.amount > linkedAmount
  })
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
  const withAvailableAmount = getPaymentsWithAvailableAmount()

  console.log('=== НОВАЯ СИСТЕМА PAYMENTS SUMMARY ===')
  console.log(`Total payments: ${mockPendingPayments.length}`)
  console.log(`├── Order-related: ${orderPayments.length}`)
  console.log(`├── Operational: ${operationalPayments.length}`)
  console.log(`├── Pending: ${pending.length}`)
  console.log(`├── Completed: ${completed.length}`)
  console.log(`├── With amount history: ${withAmountHistory.length}`)
  console.log(`└── With available amount: ${withAvailableAmount.length}`)

  console.log('\n=== ДОСТУПНЫЕ ПЕРЕПЛАТЫ ===')
  withAvailableAmount.forEach(payment => {
    const available =
      payment.status === 'completed'
        ? payment.amount - (payment.usedAmount || 0)
        : payment.amount -
          (payment.linkedOrders
            ?.filter(o => o.isActive)
            .reduce((sum, o) => sum + o.linkedAmount, 0) || 0)

    console.log(`${payment.counteragentName}: ${available.toLocaleString()} IDR available`)
  })

  return {
    total: mockPendingPayments.length,
    orderRelated: orderPayments.length,
    operational: operationalPayments.length,
    pending: pending.length,
    completed: completed.length,
    withAmountHistory: withAmountHistory.length,
    withAvailableAmount: withAvailableAmount.length
  }
}
