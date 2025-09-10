// src/stores/pos/shifts/mock.ts - SHIFTS MOCK DATA (English interface)

import type {
  PosShift,
  ShiftTransaction,
  PaymentMethodSummary,
  ShiftCorrection,
  ShiftAccountBalance
} from './types'

/**
 * Mock data generator for shifts system
 */
export class ShiftsMockData {
  /**
   * Generate realistic shifts for the last 7 days
   */
  static generateMockShifts(): PosShift[] {
    const shifts: PosShift[] = []
    const today = new Date()

    // Generate shifts for last 7 days
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const shiftDate = new Date(today)
      shiftDate.setDate(today.getDate() - dayOffset)

      // Morning shift (08:00 - 16:00)
      const morningShift = this.createMockShift({
        date: shiftDate,
        startHour: 8,
        endHour: 16,
        cashierName: 'Sarah Johnson',
        shiftType: 'morning'
      })
      shifts.push(morningShift)

      // Evening shift (16:00 - 00:00) - only if not today
      if (dayOffset > 0) {
        const eveningShift = this.createMockShift({
          date: shiftDate,
          startHour: 16,
          endHour: 24,
          cashierName: 'Mike Chen',
          shiftType: 'evening'
        })
        shifts.push(eveningShift)
      }
    }

    // Add current active shift if it's business hours
    const currentHour = today.getHours()
    if (currentHour >= 8 && currentHour < 24) {
      const activeShift = this.createActiveShift()
      shifts.push(activeShift)
    }

    return shifts
  }

  /**
   * Create a mock shift with realistic data
   */
  private static createMockShift(config: {
    date: Date
    startHour: number
    endHour: number
    cashierName: string
    shiftType: 'morning' | 'evening'
  }): PosShift {
    const { date, startHour, endHour, cashierName, shiftType } = config

    // Create timestamps
    const startTime = new Date(date)
    startTime.setHours(startHour, 0, 0, 0)

    const endTime = new Date(date)
    if (endHour === 24) {
      endTime.setDate(date.getDate() + 1)
      endTime.setHours(0, 0, 0, 0)
    } else {
      endTime.setHours(endHour, 0, 0, 0)
    }

    const duration = (endTime.getTime() - startTime.getTime()) / 60000 // minutes

    // Generate realistic sales data
    const salesData = this.generateSalesData(shiftType, duration)

    const shiftId = `shift_${startTime.getTime()}_${Math.random().toString(36).substr(2, 6)}`

    return {
      id: shiftId,
      shiftNumber: this.generateShiftNumber(startTime),
      status: 'completed',
      cashierId: `cashier_${cashierName.replace(' ', '_').toLowerCase()}`,
      cashierName: cashierName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      startingCash: 50000, // 50k IDR starting cash
      startingCashVerified: true,
      endingCash: 50000 + salesData.cashSales + this.randomBetween(-5000, 5000), // Small discrepancy
      expectedCash: 50000 + salesData.cashSales,
      cashDiscrepancy: this.randomBetween(-5000, 5000),
      cashDiscrepancyType:
        Math.random() > 0.7 ? (Math.random() > 0.5 ? 'overage' : 'shortage') : 'none',
      totalSales: salesData.totalSales,
      totalTransactions: salesData.totalTransactions,
      paymentMethods: this.generatePaymentBreakdown(salesData),
      corrections: this.generateCorrections(shiftId),
      accountBalances: this.generateAccountBalances(),
      syncStatus: 'synced',
      lastSyncAt: endTime.toISOString(),
      pendingSync: false,
      notes: this.generateShiftNotes(shiftType),
      deviceId: 'pos_terminal_main',
      location: 'Main Counter',
      createdAt: startTime.toISOString(),
      updatedAt: endTime.toISOString()
    }
  }

  /**
   * Create active shift for current day
   */
  private static createActiveShift(): PosShift {
    const now = new Date()
    const startTime = new Date(now)
    startTime.setHours(8, 0, 0, 0) // Started at 8 AM

    const duration = (now.getTime() - startTime.getTime()) / 60000 // minutes elapsed
    const salesData = this.generateSalesData('active', duration)

    const shiftId = `active_shift_${startTime.getTime()}`

    return {
      id: shiftId,
      shiftNumber: this.generateShiftNumber(startTime),
      status: 'active',
      cashierId: 'cashier_current_user',
      cashierName: 'Alex Thompson',
      startTime: startTime.toISOString(),
      startingCash: 50000,
      startingCashVerified: true,
      totalSales: salesData.totalSales,
      totalTransactions: salesData.totalTransactions,
      paymentMethods: this.generatePaymentBreakdown(salesData),
      corrections: [],
      accountBalances: this.generateAccountBalances(),
      syncStatus: 'pending',
      pendingSync: true,
      notes: 'Current active shift',
      deviceId: 'pos_terminal_main',
      location: 'Main Counter',
      createdAt: startTime.toISOString(),
      updatedAt: now.toISOString()
    }
  }

  /**
   * Generate realistic sales data for 12-hour daily shift
   */
  private static generateSalesData(shiftType: 'daily' | 'active', duration: number) {
    const hoursWorked = duration / 60

    // Single pattern for 12-hour daily shifts
    const salesPerHour = 55000 // 55k IDR per hour
    const transactionsPerHour = 10 // 10 transactions per hour
    const variance = 0.2 // 20% variance

    const totalSales = Math.round(
      salesPerHour * hoursWorked * (1 + (Math.random() - 0.5) * variance)
    )

    const totalTransactions = Math.round(
      transactionsPerHour * hoursWorked * (1 + (Math.random() - 0.5) * variance)
    )

    // Cash typically 30-40% of sales
    const cashPercentage = 0.3 + Math.random() * 0.1
    const cashSales = Math.round(totalSales * cashPercentage)

    return { totalSales, totalTransactions, cashSales }
  }

  /**
   * Generate payment method breakdown
   */
  private static generatePaymentBreakdown(salesData: {
    totalSales: number
    totalTransactions: number
    cashSales: number
  }): PaymentMethodSummary[] {
    const { totalSales, totalTransactions, cashSales } = salesData
    const remainingSales = totalSales - cashSales

    // Distribute remaining sales among other methods
    const cardSales = Math.round(remainingSales * 0.45) // 45% of non-cash
    const gojekSales = Math.round(remainingSales * 0.25) // 25% of non-cash
    const grabSales = Math.round(remainingSales * 0.2) // 20% of non-cash
    const qrSales = remainingSales - cardSales - gojekSales - grabSales // Remainder

    // Distribute transactions proportionally
    const cashTransactions = Math.round(totalTransactions * 0.35)
    const cardTransactions = Math.round(totalTransactions * 0.3)
    const gojekTransactions = Math.round(totalTransactions * 0.15)
    const grabTransactions = Math.round(totalTransactions * 0.12)
    const qrTransactions =
      totalTransactions - cashTransactions - cardTransactions - gojekTransactions - grabTransactions

    return [
      {
        methodId: 'cash',
        methodName: 'Cash',
        methodType: 'cash',
        count: cashTransactions,
        amount: cashSales,
        percentage: (cashSales / totalSales) * 100
      },
      {
        methodId: 'card',
        methodName: 'Credit Card',
        methodType: 'card',
        count: cardTransactions,
        amount: cardSales,
        percentage: (cardSales / totalSales) * 100
      },
      {
        methodId: 'gojek',
        methodName: 'Gojek Pay',
        methodType: 'gojek',
        count: gojekTransactions,
        amount: gojekSales,
        percentage: (gojekSales / totalSales) * 100
      },
      {
        methodId: 'grab',
        methodName: 'Grab Pay',
        methodType: 'grab',
        count: grabTransactions,
        amount: grabSales,
        percentage: (grabSales / totalSales) * 100
      },
      {
        methodId: 'qr',
        methodName: 'QR Code',
        methodType: 'qr',
        count: qrTransactions,
        amount: qrSales,
        percentage: (qrSales / totalSales) * 100
      }
    ]
  }

  /**
   * Generate sample corrections
   */
  private static generateCorrections(shiftId: string): ShiftCorrection[] {
    const corrections: ShiftCorrection[] = []

    // 30% chance of having corrections
    if (Math.random() < 0.3) {
      const correctionCount = Math.floor(Math.random() * 3) + 1 // 1-3 corrections

      for (let i = 0; i < correctionCount; i++) {
        const types: ShiftCorrection['type'][] = [
          'refund',
          'void',
          'cash_adjustment',
          'payment_correction'
        ]
        const type = types[Math.floor(Math.random() * types.length)]

        corrections.push({
          id: `correction_${Date.now()}_${i}`,
          shiftId,
          type,
          amount: this.randomBetween(5000, 50000),
          reason: this.getCorrectionReason(type),
          description: this.getCorrectionDescription(type),
          performedBy: {
            type: 'user',
            id: 'manager_01',
            name: 'Restaurant Manager'
          },
          affectsReporting: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    return corrections
  }

  /**
   * Generate account balances
   */
  private static generateAccountBalances(): ShiftAccountBalance[] {
    const accounts = [
      { id: 'acc_cash', name: 'Cash Register', type: 'cash' as const },
      { id: 'acc_card', name: 'Bank Account', type: 'bank' as const },
      { id: 'acc_gojek', name: 'Gojek Account', type: 'gojek' as const },
      { id: 'acc_grab', name: 'Grab Account', type: 'grab' as const }
    ]

    return accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      startingBalance: this.randomBetween(100000, 500000),
      endingBalance: this.randomBetween(150000, 600000),
      totalIncome: this.randomBetween(50000, 200000),
      totalExpense: this.randomBetween(0, 20000),
      transactionCount: this.randomBetween(5, 25),
      discrepancyExplained: Math.random() > 0.2, // 80% explained
      syncStatus: 'synced' as const,
      lastSyncAt: new Date().toISOString()
    }))
  }

  /**
   * Generate mock shift transactions
   */
  static generateMockTransactions(shiftId: string, count: number = 10): ShiftTransaction[] {
    const transactions: ShiftTransaction[] = []

    for (let i = 0; i < count; i++) {
      const transaction: ShiftTransaction = {
        id: `tx_${shiftId}_${i}`,
        accountId: this.getRandomAccountId(),
        type: Math.random() > 0.9 ? 'expense' : 'income', // 90% income, 10% expense
        amount: this.randomBetween(15000, 150000),
        description: this.getTransactionDescription(),
        performedBy: {
          type: 'user',
          id: 'cashier_current',
          name: 'Current Cashier'
        },
        shiftId,
        orderId: `order_${Date.now()}_${i}`,
        paymentId: `payment_${Date.now()}_${i}`,
        syncStatus: Math.random() > 0.1 ? 'synced' : 'pending', // 90% synced
        syncAttempts: Math.random() > 0.9 ? this.randomBetween(1, 3) : 0,
        lastSyncAttempt: Math.random() > 0.5 ? new Date().toISOString() : undefined,
        syncError: Math.random() > 0.95 ? 'Network timeout' : undefined,
        createdAt: new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000).toISOString(), // Last 8 hours
        updatedAt: new Date().toISOString()
      }

      transactions.push(transaction)
    }

    return transactions
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private static generateShiftNumber(date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.toTimeString().slice(0, 5).replace(':', '')
    return `SHIFT-${dateStr}-${timeStr}`
  }

  private static generateShiftNotes(shiftType: string): string {
    const notes = {
      morning: 'Busy morning shift with breakfast rush',
      evening: 'Active evening with dinner crowd',
      active: 'Current shift in progress'
    }
    return notes[shiftType] || 'Regular shift'
  }

  private static getCorrectionReason(type: ShiftCorrection['type']): string {
    const reasons = {
      refund: 'Customer complaint',
      void: 'Order cancellation',
      cash_adjustment: 'Cash count discrepancy',
      payment_correction: 'Payment processing error',
      other: 'Miscellaneous adjustment'
    }
    return reasons[type] || 'General correction'
  }

  private static getCorrectionDescription(type: ShiftCorrection['type']): string {
    const descriptions = {
      refund: 'Full refund processed for unsatisfied customer',
      void: 'Order voided due to kitchen issue',
      cash_adjustment: 'Adjusted cash register after count',
      payment_correction: 'Corrected duplicate payment entry',
      other: 'Manager adjustment'
    }
    return descriptions[type] || 'Standard correction'
  }

  private static getRandomAccountId(): string {
    const accounts = ['acc_cash', 'acc_card', 'acc_gojek', 'acc_grab']
    return accounts[Math.floor(Math.random() * accounts.length)]
  }

  private static getTransactionDescription(): string {
    const descriptions = [
      'Order payment - Nasi Goreng + Drinks',
      'Takeaway order - Coffee and pastry',
      'Dine-in payment - Family dinner',
      'Quick lunch order',
      'Evening meal with dessert',
      'Business lunch meeting',
      'Weekend brunch order'
    ]
    return descriptions[Math.floor(Math.random() * descriptions.length)]
  }

  private static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Clear all mock data
   */
  static clearMockData(): void {
    localStorage.removeItem('pos_shifts')
    localStorage.removeItem('pos_shift_transactions')
    localStorage.removeItem('pos_current_shift')
    console.log('All shifts mock data cleared')
  }

  /**
   * Load mock data into localStorage
   */
  static loadMockData(): void {
    const shifts = this.generateMockShifts()
    const allTransactions: ShiftTransaction[] = []

    // Generate transactions for each completed shift
    shifts.forEach(shift => {
      if (shift.status === 'completed') {
        const transactions = this.generateMockTransactions(shift.id, this.randomBetween(8, 20))
        allTransactions.push(...transactions)
      } else if (shift.status === 'active') {
        // Fewer transactions for active shift
        const transactions = this.generateMockTransactions(shift.id, this.randomBetween(3, 8))
        allTransactions.push(...transactions)
      }
    })

    localStorage.setItem('pos_shifts', JSON.stringify(shifts))
    localStorage.setItem('pos_shift_transactions', JSON.stringify(allTransactions))

    // Set active shift if exists
    const activeShift = shifts.find(s => s.status === 'active')
    if (activeShift) {
      localStorage.setItem('pos_current_shift', activeShift.id)
    }

    console.log(`Mock data loaded: ${shifts.length} shifts, ${allTransactions.length} transactions`)
  }
}
