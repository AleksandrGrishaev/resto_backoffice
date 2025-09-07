// =============================================
// ПОЛНАЯ ЗАМЕНА src/stores/account/paymentMock.ts
// =============================================

import type { PendingPayment, PaymentStatistics } from './types'

const now = new Date().toISOString()

export const mockPendingPayments: PendingPayment[] = [
  // =============================================
  // ПЛАТЕЖИ ПО ЗАКАЗАМ ПОСТАВЩИКОВ (с новыми полями)
  // =============================================
  {
    id: 'payment-credit-main',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 1200000, // синхронизировано с фактической суммой заказа
    description: 'Purchase order PO-CREDIT-001',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',
    invoiceNumber: 'PO-CREDIT-001',

    // Связь с заказом
    purchaseOrderId: 'po-credit-test',
    sourceOrderId: 'po-credit-test',
    autoSyncEnabled: true, // основной платеж с автосинхронизацией

    // История изменений суммы (АВТОСИНХРОНИЗАЦИЯ СРАБОТАЛА)
    amountHistory: [
      {
        oldAmount: 1500000, // была изначальная сумма
        newAmount: 1200000, // стала фактическая после приемки
        reason: 'receipt_discrepancy',
        changedAt: createMockDateWithTime(2, '16:35:00.000Z'),
        changedBy: {
          type: 'system',
          id: 'receipt-system',
          name: 'Receipt Processing System'
        },
        notes:
          'Amount adjusted after receipt completion for order PO-CREDIT-001 (discrepancies: quantity)'
      }
    ],

    notes: 'Main payment automatically adjusted after receipt processing',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: createMockDateWithTime(7, '10:15:00.000Z'),
    updatedAt: createMockDateWithTime(2, '16:35:00.000Z')
  },

  // ✅ КРЕДИТ ПОСТАВЩИКА от переплаты (СОЗДАН АВТОМАТИЧЕСКИ)
  {
    id: 'payment-supplier-credit',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 300000, // размер переплаты (1500k - 1200k)
    description: 'Supplier credit from overpayment PO-CREDIT-001',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',

    // НЕ привязан к заказу - доступен для использования
    sourceOrderId: 'po-credit-test', // откуда взялся кредит
    autoSyncEnabled: false, // кредит не синхронизируется автоматически

    amountHistory: [
      {
        oldAmount: 0,
        newAmount: 300000,
        reason: 'supplier_credit',
        changedAt: createMockDateWithTime(2, '16:36:00.000Z'),
        changedBy: {
          type: 'system',
          id: 'receipt-system',
          name: 'Receipt Processing System'
        },
        notes: 'Supplier credit created from order overpayment after receipt completion'
      }
    ],

    notes: 'Available credit from previous order overpayment. Can be used for new orders.',
    createdBy: {
      type: 'system',
      id: 'receipt-system',
      name: 'Receipt Processing System'
    },
    createdAt: createMockDateWithTime(2, '16:36:00.000Z'),
    updatedAt: createMockDateWithTime(2, '16:36:00.000Z')
  },

  // ✅ ИСПОЛЬЗОВАНИЕ ЧАСТИ КРЕДИТА для нового заказа (ПРИВЯЗАН ВРУЧНУЮ)
  {
    id: 'payment-use-credit-partial',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 250000, // используем 250k из 300k кредита
    description: 'Partial use of supplier credit for PO-USE-CREDIT-001',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',

    // Привязан к новому заказу
    purchaseOrderId: 'po-using-credit',
    sourceOrderId: 'po-credit-test', // источник кредита
    autoSyncEnabled: false, // кредит не автосинхронизируется

    amountHistory: [
      {
        oldAmount: 300000, // был полный кредит
        newAmount: 250000, // используем частично
        reason: 'payment_split',
        changedAt: createMockDateWithTime(1, '11:15:00.000Z'),
        changedBy: {
          type: 'user',
          id: 'user_1',
          name: 'Test Manager'
        },
        notes: 'Used 250k from 300k supplier credit for new order PO-USE-CREDIT-001'
      }
    ],

    notes: 'Partial use of supplier credit. Remaining 50k still available.',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: createMockDateWithTime(1, '11:15:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:15:00.000Z')
  },

  // ✅ ОСТАВШАЯСЯ ЧАСТЬ КРЕДИТА (ДОСТУПНА ДЛЯ ПРИВЯЗКИ)
  {
    id: 'payment-credit-remaining',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 50000, // оставшаяся часть кредита
    description: 'Remaining supplier credit from PO-CREDIT-001',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',

    // НЕ привязан к заказу - доступен для использования
    sourceOrderId: 'po-credit-test',
    autoSyncEnabled: false,

    amountHistory: [
      {
        oldAmount: 300000, // был полный кредит
        newAmount: 50000, // осталось после использования 250k
        reason: 'payment_split',
        changedAt: createMockDateWithTime(1, '11:15:00.000Z'),
        changedBy: {
          type: 'user',
          id: 'user_1',
          name: 'Test Manager'
        },
        notes: 'Remaining credit after 250k was used for order PO-USE-CREDIT-001'
      }
    ],

    notes: 'Remaining supplier credit available for future orders.',
    createdBy: {
      type: 'system',
      id: 'credit-split-system',
      name: 'Credit Split System'
    },
    createdAt: createMockDateWithTime(1, '11:15:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:15:00.000Z')
  },

  // ✅ ДОПОЛНИТЕЛЬНЫЙ СЧЕТ к новому заказу (МОЖНО СОЗДАТЬ ЧЕРЕЗ ИНТЕРФЕЙС)
  {
    id: 'payment-additional-new',
    counteragentId: 'sup-premium-meat-co',
    counteragentName: 'Premium Meat Company',
    amount: 550000, // недостающая сумма для заказа (800k - 250k кредита)
    description: 'Additional payment for PO-USE-CREDIT-001',
    priority: 'medium',
    status: 'pending',
    category: 'supplier',

    // Привязан к новому заказу
    purchaseOrderId: 'po-using-credit',
    sourceOrderId: 'po-using-credit',
    autoSyncEnabled: true, // может синхронизироваться с заказом

    notes: 'Additional payment to cover remaining amount after using supplier credit',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: createMockDateWithTime(1, '11:20:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:20:00.000Z')
  },
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
    counteragentId: 'sup-fresh-veg-market',
    counteragentName: 'Fresh Vegetable Market',
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
    counteragentId: 'sup-specialty-foods', // ✅ ИСПРАВЛЕНО
    counteragentName: 'Specialty Foods Supply', // ✅ ИСПРАВЛЕНО
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
    counteragentId: 'sup-beverage-distribution', // ✅ ИСПРАВЛЕНО
    counteragentName: 'Jakarta Beverage Distribution', // ✅ ИСПРАВЛЕНО
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

function createMockDateWithTime(daysAgo: number, time: string): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const dateStr = date.toISOString().split('T')[0]
  return `${dateStr}T${time}`
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
