// src/stores/pos/shifts/types.ts - SHIFTS TYPES

import type { BaseEntity, TransactionPerformer } from '@/types/common'
import type { Account, Transaction } from '@/stores/account/types'

// =============================================
// BASIC SHIFT TYPES
// =============================================

export type ShiftStatus = 'active' | 'completed' | 'cancelled' | 'suspended'
export type CashDiscrepancyType = 'shortage' | 'overage' | 'none'
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'offline'

// =============================================
// PAYMENT METHODS (from PaymentSettingsView)
// =============================================

export interface PaymentMethod {
id: string
name: string
type: 'cash' | 'card' | 'bank' | 'gojek' | 'grab' | 'qr'
isActive: boolean
accountId?: string // Link to Account Store
icon?: string
sortOrder?: number
}

// =============================================
// MAIN SHIFT ENTITY
// =============================================

export interface PosShift extends BaseEntity {
// Basic information
shiftNumber: string // Shift number (e.g.: "SHIFT-001-2025-09-10")
status: ShiftStatus

// Cashier and time
cashierId: string
cashierName: string
startTime: string
endTime?: string
duration?: number // In minutes

// Starting cash
startingCash: number
startingCashVerified: boolean // Is starting amount verified

// Ending cash (filled when closing)
endingCash?: number
expectedCash?: number // Expected cash amount
cashDiscrepancy?: number // Difference (+ overage, - shortage)
cashDiscrepancyType?: CashDiscrepancyType

// Sales and payments
totalSales: number
totalTransactions: number
paymentMethods: PaymentMethodSummary[] // Array of payment methods

// Corrections and explanations
corrections: ShiftCorrection[]
notes?: string

// Account Store integration
accountBalances: ShiftAccountBalance[]

// Sync information for the entire shift
syncStatus: SyncStatus
lastSyncAt?: string
pendingSync: boolean

// Metadata
deviceId?: string
location?: string
}

// =============================================
// SIMPLIFIED PAYMENT BREAKDOWN
// =============================================

export interface PaymentMethodSummary {
methodId: string // Payment method ID
methodName: string // Name (Cash, Card, etc.)
methodType: PaymentMethod['type']
count: number // Number of operations
amount: number // Total amount
percentage: number // Percentage of total sales
}

// =============================================
// SIMPLIFIED CORRECTIONS
// =============================================

export interface ShiftCorrection extends BaseEntity {
shiftId: string
type: 'cash_adjustment' | 'payment_correction' | 'refund' | 'void' | 'other'
amount: number
reason: string
description: string
performedBy: TransactionPerformer

// Related data
relatedOrderId?: string
relatedPaymentId?: string

// Impact on reporting
affectsReporting: boolean
}

// =============================================
// ACCOUNT BALANCES AT SHIFT START/END
// =============================================

export interface ShiftAccountBalance {
accountId: string
accountName: string
accountType: Account['type']

// Balances
startingBalance: number
endingBalance?: number
expectedBalance?: number
actualBalance?: number

// Movements during shift
totalIncome: number
totalExpense: number
transactionCount: number

// Discrepancies
discrepancy?: number
discrepancyExplained: boolean
discrepancyNotes?: string

// Sync status
lastSyncAt?: string
syncStatus: SyncStatus
}

// =============================================
// ACCOUNT STORE INTEGRATION
// =============================================

export interface ShiftAccountIntegration {
// Records to create in Account Store
pendingTransactions: ShiftTransaction[]

// Account Store sync verification
accountStoreSyncStatus: Record<string, SyncStatus>
lastAccountStoreSync?: string

// Sync conflicts
syncConflicts: ShiftSyncConflict[]
}

export interface ShiftTransaction {
id: string
accountId: string
type: Transaction['type']
amount: number
description: string
performedBy: TransactionPerformer

// POS specific fields
shiftId: string
orderId?: string
paymentId?: string

// Sync information
syncStatus: SyncStatus
syncAttempts: number
lastSyncAttempt?: string
syncError?: string
}

export interface ShiftSyncConflict {
id: string
type: 'balance_mismatch' | 'transaction_duplicate' | 'account_not_found'
description: string
shiftTransactionId?: string
accountStoreTransactionId?: string
suggestedResolution: string
isResolved: boolean
resolvedAt?: string
resolvedBy?: TransactionPerformer
}

// =============================================
// OFFLINE MODE
// =============================================

export interface OfflineShiftData {
shiftId: string

// Data for synchronization
unsyncedTransactions: ShiftTransaction[]
unsyncedCorrections: ShiftCorrection[]
unsyncedOrders: string[] // Order IDs for synchronization

// Offline session metadata
offlineStartTime: string
offlineEndTime?: string
offlineDuration?: number

// Conflicts during recovery
conflicts: OfflineConflict[]

// Data size
dataSize: number // In bytes
estimatedSyncTime?: number // Sync time estimation
}

export interface OfflineConflict {
id: string
type: 'timestamp_conflict' | 'data_changed' | 'account_modified'
localData: any
serverData: any
suggestedResolution: 'use_local' | 'use_server' | 'merge' | 'manual'
isResolved: boolean
}

// =============================================
// SIMPLE SHIFT REPORT
// =============================================

export interface ShiftReport {
shift: PosShift

// Basic totals
summary: ShiftBasicSummary

// Corrections
corrections: ShiftCorrection[]

// Integration status
integrationStatus: ShiftIntegrationStatus
}

export interface ShiftBasicSummary {
// Shift start and end
startTime: string
endTime?: string
duration?: number // In minutes

// Basic statistics
totalSales: number
totalTransactions: number
averageTransactionValue: number

// By payment method
cashSales: number
cardSales: number
digitalSales: number

// Refunds and voids
refunds: number
voids: number

// Net revenue
netRevenue: number

// Discrepancies
totalDiscrepancies: number
unexplainedDiscrepancies: number
}

export interface ShiftIntegrationStatus {
accountStoreSync: {
status: SyncStatus
lastSync?: string
pendingTransactions: number
conflicts: number
}

inventorySync: {
status: SyncStatus
lastSync?: string
pendingUpdates: number
}

overallHealth: 'healthy' | 'warning' | 'error'
}

// =============================================
// DTOs FOR CREATE AND UPDATE
// =============================================

export interface CreateShiftDto {
cashierId: string
cashierName: string
startingCash: number
notes?: string
deviceId?: string
location?: string
}

export interface EndShiftDto {
shiftId: string
endingCash: number
actualAccountBalances: Record<string, number> // accountId -> balance
corrections: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
notes?: string
performedBy: TransactionPerformer
}

export interface UpdateShiftDto {
shiftId: string
corrections?: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
notes?: string
deviceId?: string
}

// =============================================
// SERVICE RESPONSE TYPE
// =============================================

export interface ServiceResponse<T = void> {
success: boolean
data?: T
error?: string
}

// =============================================
// INTEGRATION ARCHITECTURE CLARIFICATION
// =============================================

/\*
INTEGRATION ARCHITECTURE:

1. **SALES WORKFLOW**:
   Sale → POS Payment → Shift Transaction → Account Store
   (prices taken from local Menu Store cache, not from network)

2. **ORDERS WORKFLOW** (TODO for future):
   Order → Kitchen (direct, bypassing shift)
   Order → Statistics (possibly through shift, decide later)

3. **OFFLINE SUPPORT**:

   - All FINANCIAL operations saved in shift
   - Kitchen orders go direct (if connection available)
   - When connection restored - sync ONLY finances

4. **INTEGRATION**:

   - Shift Store → Account Store (create Transaction)
   - Shift Store → Inventory Store (deduct items on sale)
   - Menu Store → local cache (prices loaded in advance)

5. **SYNC STATUS**:

   - Shift has overall syncStatus
   - Each ShiftTransaction has its own syncStatus
   - DON'T accumulate, sync and mark as synced
   - Conflicts resolved through UI

6. **PAYMENT METHODS**:
   - PaymentMethod array from PaymentSettingsView
   - Each method linked to Account via accountId
   - Dynamic add/remove payment methods

TODO:

- Decide order fate (statistics vs direct dispatch)
- Implement menu caching for offline
- UI for sync conflict resolution
- Integration with PaymentSettingsView for payment methods
  \*/
