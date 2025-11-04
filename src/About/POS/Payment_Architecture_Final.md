# Payment Architecture - Final Specification

**Date**: 2025-11-04
**Status**: Sprint 1 - Ready for Implementation
**Pattern**: Follows existing POS architecture (orders, tables, shifts)

---

## 🎯 Architecture Principles

### 1. **Database-Agnostic**

- NO hardcoded Firebase/Postgres
- Use existing Repository pattern
- Storage type configurable: `localStorage` | `indexedDB` | `api`
- Easy to swap backend later

### 2. **Payment-Centric**

- Payments are PRIMARY financial records
- Orders reference payments (not embed them)
- Support cash reconciliation, refunds, accounting

### 3. **POS vs Backoffice**

- **POS**: Operational (create payments, refunds) - WRITE
- **Backoffice**: Analytical (view, reports) - READ ONLY

### 4. **Offline-First POS**

- localStorage for instant operations
- Optional sync to backend (when configured)
- Queue failed syncs for retry

---

## 📂 File Structure (Following Existing Pattern)

```
src/stores/pos/payments/
├── paymentsStore.ts           # Main Pinia store (like ordersStore.ts)
├── services.ts                # Service layer (like orders/services.ts)
├── types.ts                   # Payment types (local, or use pos/types.ts)
├── composables.ts             # Exported composables
└── composables/
    ├── usePayments.ts         # Payment operations
    └── usePaymentStats.ts     # Analytics helpers

src/views/payments/            # Shared views (NOT backoffice/payments)
├── PaymentsList.vue           # Backoffice: payment list
├── PaymentDetails.vue         # Backoffice: payment details
├── DailyReconciliation.vue    # Backoffice: reconciliation
└── components/
    ├── PaymentHistoryWidget.vue   # POS: payment history
    └── RefundDialog.vue           # POS: refund dialog

src/repositories/              # Optional: future migration
└── payments/
    ├── PaymentRepository.ts   # Implements IRepository<PosPayment>
    └── LocalStoragePaymentRepository.ts
```

---

## 🗄️ Data Model

### PosPayment (Primary Financial Record)

```typescript
// src/stores/pos/types.ts (add to existing types)

export interface PosPayment extends BaseEntity {
  // Identity
  id: string
  paymentNumber: string // PAY-20251104-123456

  // Financial Data
  method: PaymentMethod // 'cash' | 'card' | 'qr'
  status: PaymentStatus // 'pending' | 'completed' | 'failed' | 'refunded'
  amount: number // Positive for payment, negative for refund

  // Cash handling
  receivedAmount?: number // For cash payments
  changeAmount?: number // Change returned

  // Links to operational data
  orderId: string // Which order
  billIds: string[] // Which bills
  itemIds: string[] // Which items (for partial payments)

  // Refund data
  refundedAt?: string
  refundReason?: string
  refundedBy?: string
  originalPaymentId?: string // If this is a refund

  // Reconciliation (for cash counting)
  processedBy: string // Cashier/waiter name
  processedAt: string // ISO datetime
  shiftId?: string // For shift reports
  reconciledAt?: string // When money counted
  reconciledBy?: string // Who verified

  // Receipt
  receiptPrinted: boolean
  receiptNumber?: string

  // Audit
  createdAt: string
  updatedAt: string

  // Sync status (for future backend sync)
  syncedAt?: string
  syncStatus?: 'pending' | 'synced' | 'failed'
}

export type PaymentMethod = 'cash' | 'card' | 'qr'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
```

### PosOrder (Updated with Payment References)

```typescript
export interface PosOrder extends BaseEntity {
  // ... existing fields

  // Payment references (lightweight)
  paymentIds: string[] // Links to PosPayment records
  paidAmount: number // Computed from payments

  // Computed property (not stored):
  // get payments(): PosPayment[] {
  //   return paymentsStore.getOrderPayments(this.id)
  // }
}
```

### PosBillItem (Updated with Payment Link)

```typescript
export interface PosBillItem extends BaseEntity {
  // ... existing fields

  paymentStatus: ItemPaymentStatus // 'unpaid' | 'paid' | 'refunded'
  paidByPaymentIds?: string[] // Links to payments that paid this item
}
```

---

## 🏗️ Store Architecture (Like orders/tables)

### paymentsStore.ts

```typescript
// src/stores/pos/payments/paymentsStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PaymentsService } from './services'
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'

export const usePaymentsStore = defineStore('posPayments', () => {
  // ===== STATE =====
  const payments = ref<PosPayment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ===== SERVICES =====
  const paymentsService = new PaymentsService()

  // ===== COMPUTED =====
  const todayPayments = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return payments.value.filter(p => p.processedAt.startsWith(today))
  })

  const completedPayments = computed(() => {
    return payments.value.filter(p => p.status === 'completed')
  })

  const totalRevenue = computed(() => {
    return completedPayments.value.reduce((sum, p) => sum + p.amount, 0)
  })

  // ===== INITIALIZATION =====

  /**
   * Initialize payments store
   * Loads all payments from storage
   */
  async function initialize(): Promise<ServiceResponse<void>> {
    if (initialized.value) {
      return { success: true }
    }

    loading.value = true
    error.value = null

    try {
      console.log('💳 [paymentsStore] Initializing...')

      // Load all payments from storage
      const result = await paymentsService.getAllPayments()

      if (result.success && result.data) {
        payments.value = result.data
        console.log(`💳 Loaded ${payments.value.length} payments from storage`)
      } else {
        throw new Error(result.error || 'Failed to load payments')
      }

      initialized.value = true
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payments'
      error.value = message
      console.error('❌ [paymentsStore] Initialization failed:', message)
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  // ===== ACTIONS (POS Operations) =====

  /**
   * Process payment (POS only)
   * 1. Save payment to storage
   * 2. Link to order/items
   * 3. Update item payment status
   */
  async function processSimplePayment(
    orderId: string,
    billIds: string[],
    itemIds: string[],
    method: PaymentMethod,
    amount: number,
    receivedAmount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    loading.value = true

    try {
      // 1. Create payment
      const paymentData = {
        orderId,
        billIds,
        itemIds,
        method,
        amount,
        receivedAmount,
        processedBy: 'Current User' // TODO: Get from authStore
      }

      const result = await paymentsService.processPayment(paymentData)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Payment processing failed')
      }

      const payment = result.data

      // 2. Add to in-memory store
      payments.value.push(payment)

      // 3. Link payment to order and items
      await linkPaymentToOrder(orderId, payment.id, itemIds)

      console.log('💳 Payment processed:', payment.paymentNumber)
      return { success: true, data: payment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment processing failed'
      error.value = message
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Process refund (POS only)
   * Customer returns item, cashier issues refund
   */
  async function processRefund(
    originalPaymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    try {
      // Find original payment
      const originalPayment = payments.value.find(p => p.id === originalPaymentId)
      if (!originalPayment) {
        throw new Error('Original payment not found')
      }

      if (originalPayment.status !== 'completed') {
        throw new Error('Can only refund completed payments')
      }

      // Process refund via service
      const result = await paymentsService.refundPayment(originalPaymentId, reason, amount)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Refund processing failed')
      }

      const refundPayment = result.data

      // Add refund to store
      payments.value.push(refundPayment)

      // Update original payment
      const originalIndex = payments.value.findIndex(p => p.id === originalPaymentId)
      if (originalIndex !== -1) {
        payments.value[originalIndex].status = 'refunded'
      }

      // Update items: paid → refunded
      await unlinkPaymentFromOrder(
        originalPayment.orderId,
        originalPaymentId,
        originalPayment.itemIds
      )

      console.log('💳 Refund processed:', refundPayment.paymentNumber)
      return { success: true, data: refundPayment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed'
      error.value = message
      return { success: false, error: message }
    }
  }

  /**
   * Print receipt (POS only)
   */
  async function printReceipt(paymentId: string): Promise<ServiceResponse<void>> {
    try {
      const payment = payments.value.find(p => p.id === paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      const result = await paymentsService.printReceipt(payment)

      if (result.success) {
        // Mark as printed
        payment.receiptPrinted = true
        await paymentsService.updatePayment(payment)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print receipt'
      return { success: false, error: message }
    }
  }

  // ===== QUERIES (Read Operations - Both POS and Backoffice) =====

  /**
   * Get payments for specific order
   */
  function getOrderPayments(orderId: string): PosPayment[] {
    return payments.value.filter(p => p.orderId === orderId)
  }

  /**
   * Get payments by date range
   */
  function getPaymentsByDateRange(startDate: string, endDate: string): PosPayment[] {
    return payments.value.filter(p => p.processedAt >= startDate && p.processedAt <= endDate)
  }

  /**
   * Get payment statistics
   * Used by backoffice analytics
   */
  function getPaymentStats(dateRange?: { start: string; end: string }) {
    let paymentsToAnalyze = completedPayments.value

    if (dateRange) {
      paymentsToAnalyze = paymentsToAnalyze.filter(
        p => p.processedAt >= dateRange.start && p.processedAt <= dateRange.end
      )
    }

    const byMethod = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      qr: { count: 0, amount: 0 }
    }

    paymentsToAnalyze.forEach(p => {
      byMethod[p.method].count++
      byMethod[p.method].amount += p.amount
    })

    const refunds = payments.value.filter(p => p.status === 'refunded')
    const refundedAmount = refunds.reduce((sum, p) => sum + Math.abs(p.amount), 0)

    return {
      totalRevenue: paymentsToAnalyze.reduce((sum, p) => sum + p.amount, 0),
      totalCount: paymentsToAnalyze.length,
      byMethod,
      refundedCount: refunds.length,
      refundedAmount,
      averageTransaction:
        paymentsToAnalyze.length > 0
          ? paymentsToAnalyze.reduce((sum, p) => sum + p.amount, 0) / paymentsToAnalyze.length
          : 0
    }
  }

  /**
   * Get cashier performance (Backoffice analytics)
   */
  function getCashierPerformance(cashierName: string, dateRange: { start: string; end: string }) {
    const cashierPayments = completedPayments.value.filter(
      p =>
        p.processedBy === cashierName &&
        p.processedAt >= dateRange.start &&
        p.processedAt <= dateRange.end
    )

    return {
      totalTransactions: cashierPayments.length,
      totalAmount: cashierPayments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: {
        cash: cashierPayments.filter(p => p.method === 'cash').length,
        card: cashierPayments.filter(p => p.method === 'card').length,
        qr: cashierPayments.filter(p => p.method === 'qr').length
      }
    }
  }

  // ===== HELPERS =====

  /**
   * Link payment to order and items
   */
  async function linkPaymentToOrder(
    orderId: string,
    paymentId: string,
    itemIds: string[]
  ): Promise<void> {
    // Import ordersStore dynamically to avoid circular dependency
    const { usePosOrdersStore } = await import('../orders/ordersStore')
    const ordersStore = usePosOrdersStore()

    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    // Add payment reference to order
    if (!order.paymentIds) order.paymentIds = []
    order.paymentIds.push(paymentId)

    // Update paidAmount
    order.paidAmount =
      (order.paidAmount || 0) + payments.value.find(p => p.id === paymentId)!.amount

    // Link items to payment and mark as paid
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          item.paymentStatus = 'paid'
          if (!item.paidByPaymentIds) item.paidByPaymentIds = []
          item.paidByPaymentIds.push(paymentId)
        }
      }

      // Recalculate bill payment status
      const activeItems = bill.items.filter(i => i.status !== 'cancelled')
      const paidItems = activeItems.filter(i => i.paymentStatus === 'paid')

      if (paidItems.length === 0) {
        bill.paymentStatus = 'unpaid'
      } else if (paidItems.length === activeItems.length) {
        bill.paymentStatus = 'paid'
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    // Save order
    await ordersStore.saveOrder(order)
  }

  /**
   * Unlink payment from order (for refunds)
   */
  async function unlinkPaymentFromOrder(
    orderId: string,
    paymentId: string,
    itemIds: string[]
  ): Promise<void> {
    const { usePosOrdersStore } = await import('../orders/ordersStore')
    const ordersStore = usePosOrdersStore()

    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    // Update items: paid → refunded
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          item.paymentStatus = 'refunded'
          // Remove payment ID from paidByPaymentIds
          if (item.paidByPaymentIds) {
            item.paidByPaymentIds = item.paidByPaymentIds.filter(id => id !== paymentId)
          }
        }
      }

      // Recalculate bill payment status
      const activeItems = bill.items.filter(i => i.status !== 'cancelled')
      const paidItems = activeItems.filter(i => i.paymentStatus === 'paid')

      if (paidItems.length === 0) {
        bill.paymentStatus = 'unpaid'
      } else if (paidItems.length === activeItems.length) {
        bill.paymentStatus = 'paid'
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    await ordersStore.saveOrder(order)
  }

  return {
    // State
    payments,
    loading,
    error,
    initialized,

    // Computed
    todayPayments,
    completedPayments,
    totalRevenue,

    // Initialization
    initialize,

    // POS Operations (Write)
    processSimplePayment,
    processRefund,
    printReceipt,

    // Queries (Read - Both POS and Backoffice)
    getOrderPayments,
    getPaymentsByDateRange,
    getPaymentStats,
    getCashierPerformance
  }
})
```

---

## 🔌 Service Layer (Database-Agnostic)

### services.ts

```typescript
// src/stores/pos/payments/services.ts
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'
import { TimeUtils } from '@/utils'

/**
 * Payment service - handles storage operations
 * Currently uses localStorage, can be swapped with API/Firebase later
 */
export class PaymentsService {
  private readonly STORAGE_KEY = 'pos_payments'

  /**
   * Get all payments from storage
   */
  async getAllPayments(): Promise<ServiceResponse<PosPayment[]>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const payments = stored ? JSON.parse(stored) : []

      return { success: true, data: payments }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payments'
      }
    }
  }

  /**
   * Save payment to storage
   */
  async savePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      payments.push(payment)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))

      return { success: true, data: payment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save payment'
      }
    }
  }

  /**
   * Update existing payment
   */
  async updatePayment(payment: PosPayment): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      const payments = allPayments.success && allPayments.data ? allPayments.data : []

      const index = payments.findIndex(p => p.id === payment.id)
      if (index === -1) {
        return { success: false, error: 'Payment not found' }
      }

      payment.updatedAt = TimeUtils.getCurrentLocalISO()
      payments[index] = payment
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments))

      return { success: true, data: payment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment'
      }
    }
  }

  /**
   * Process new payment
   */
  async processPayment(paymentData: {
    orderId: string
    billIds: string[]
    itemIds: string[]
    method: PaymentMethod
    amount: number
    receivedAmount?: number
    processedBy: string
  }): Promise<ServiceResponse<PosPayment>> {
    try {
      const paymentNumber = this.generatePaymentNumber()

      const newPayment: PosPayment = {
        id: `payment_${Date.now()}`,
        paymentNumber,
        orderId: paymentData.orderId,
        billIds: paymentData.billIds,
        itemIds: paymentData.itemIds,
        method: paymentData.method,
        status: 'pending',
        amount: paymentData.amount,
        receivedAmount: paymentData.receivedAmount,
        changeAmount: paymentData.receivedAmount
          ? Math.max(0, paymentData.receivedAmount - paymentData.amount)
          : undefined,
        receiptPrinted: false,
        processedBy: paymentData.processedBy,
        processedAt: TimeUtils.getCurrentLocalISO(),
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 500))

      // 95% success rate (simulate failures)
      const isPaymentSuccessful = Math.random() > 0.05

      if (isPaymentSuccessful) {
        newPayment.status = 'completed'
      } else {
        newPayment.status = 'failed'
        return { success: false, error: 'Payment processing failed' }
      }

      // Save payment
      return await this.savePayment(newPayment)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      }
    }
  }

  /**
   * Process refund
   */
  async refundPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    try {
      const allPayments = await this.getAllPayments()
      if (!allPayments.success || !allPayments.data) {
        throw new Error('Failed to load payments')
      }

      const originalPayment = allPayments.data.find(p => p.id === paymentId)
      if (!originalPayment) {
        throw new Error('Payment not found')
      }

      if (originalPayment.status !== 'completed') {
        throw new Error('Cannot refund incomplete payment')
      }

      const refundAmount = amount || originalPayment.amount

      // Create refund payment (negative amount)
      const refundPayment: PosPayment = {
        id: `refund_${Date.now()}`,
        paymentNumber: this.generatePaymentNumber(),
        orderId: originalPayment.orderId,
        billIds: originalPayment.billIds,
        itemIds: originalPayment.itemIds,
        method: originalPayment.method,
        status: 'refunded',
        amount: -refundAmount, // Negative!
        processedBy: originalPayment.processedBy,
        processedAt: TimeUtils.getCurrentLocalISO(),
        refundedAt: TimeUtils.getCurrentLocalISO(),
        refundReason: reason,
        originalPaymentId: paymentId,
        receiptPrinted: false,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Save refund
      const result = await this.savePayment(refundPayment)

      if (result.success) {
        // Update original payment status
        originalPayment.status = 'refunded'
        originalPayment.updatedAt = TimeUtils.getCurrentLocalISO()
        await this.updatePayment(originalPayment)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refund payment'
      }
    }
  }

  /**
   * Print receipt
   */
  async printReceipt(payment: PosPayment): Promise<ServiceResponse<void>> {
    try {
      // Simulate printing
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log('🖨️ Printing receipt:', {
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        method: payment.method,
        processedAt: payment.processedAt
      })

      // TODO: Integrate with printer
      // await printerService.printReceipt(payment)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print receipt'
      }
    }
  }

  /**
   * Generate payment number
   */
  private generatePaymentNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.getTime().toString().slice(-6)
    return `PAY-${dateStr}-${timeStr}`
  }
}
```

---

## 💰 Shift Management View (POS)

### Архитектура: POS как основной источник данных

**✅ Правильное понимание:**

```
┌─────────────────────────────────┐
│         POS SYSTEM              │
│  (Primary Data Source)          │
│                                 │
│  paymentsStore ──► localStorage │
│  shiftsStore   ──► localStorage │
│  ordersStore   ──► localStorage │
│                                 │
│  ↓ Sync (optional, когда есть)  │
│  ↓                              │
│  ↓ Backend (Firebase/API)       │
└─────────────────────────────────┘
           │
           │ Read-only access
           ↓
┌─────────────────────────────────┐
│       BACKOFFICE                │
│  (Analytics & Reports)          │
│                                 │
│  - Читает данные из Backend     │
│  - Показывает аналитику         │
│  - НЕ создает платежи/смены     │
│  - НЕ изменяет операции         │
└─────────────────────────────────┘
```

### Shift Management в POS (Новая функция)

**Описание:**
Кассир должен видеть информацию о текущей смене и иметь возможность управлять ей прямо из POS интерфейса.

**Где:** Новая кнопка в `PosNavigationMenu.vue` → открывает полноэкранный view

### UI Structure: Полноэкранный Shift View

#### Option A: Отдельная страница (Рекомендуется)

```
/pos                     ← Основной POS интерфейс (столы/заказы)
/pos/shift-management    ← Новый route для управления сменой
```

**Преимущества:**

- Полный экран для детальной информации
- История всех смен
- Можно вернуться к POS кнопкой "Back"
- Четкое разделение контекстов

#### Option B: Dialog на весь экран

Полноэкранный dialog в рамках `/pos` route

**Преимущества:**

- Не уходим с текущего route
- Быстрый доступ
- Overlay эффект

### Добавление кнопки в PosNavigationMenu

```vue
<!-- src/views/pos/components/PosNavigationMenu.vue -->

const menuSections = computed(() => [ // Shift Management Section { title: 'SHIFT', actions: [ //
Новая кнопка: View Shift Details { id: POS_ACTIONS.VIEW_SHIFT, icon: 'mdi-cash-register', label:
'Shift Details', disabled: !currentShift.value, // Доступна только когда есть смена color: 'primary'
as const }, ...(currentShift.value ? [] : [ { id: POS_ACTIONS.START_SHIFT, icon: 'mdi-play', label:
'Start Shift', disabled: loading.value, color: 'success' as const } ]), ...(currentShift.value ? [ {
id: POS_ACTIONS.END_SHIFT, icon: 'mdi-stop', label: 'End Shift', disabled: loading.value, color:
'warning' as const } ] : []) ] }, // ... rest of sections ]) // Handler for new action const
handleAction = async (actionId: string) => { switch (actionId) { case POS_ACTIONS.VIEW_SHIFT: await
router.push('/pos/shift-management') // Navigate to shift view break case POS_ACTIONS.START_SHIFT:
await handleStartShift() break // ... rest of handlers } }
```

### Shift Management View UI

```vue
<!-- src/views/pos/shift/ShiftManagementView.vue -->
<template>
  <div class="shift-management-view">
    <!-- Header with Back Button -->
    <div class="shift-header">
      <v-btn icon @click="handleBack">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h1>Shift Management</h1>
      <div class="header-actions">
        <v-btn v-if="currentShift" color="error" variant="flat" @click="handleEndShift">
          <v-icon start>mdi-stop</v-icon>
          End Shift
        </v-btn>
      </div>
    </div>

    <!-- Current Shift Summary -->
    <v-card v-if="currentShift" class="shift-summary">
      <v-card-title>Current Shift</v-card-title>
      <v-card-text>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Shift Number</div>
            <div class="value">{{ currentShift.shiftNumber }}</div>
          </div>

          <div class="summary-item">
            <div class="label">Cashier</div>
            <div class="value">{{ currentShift.cashierName }}</div>
          </div>

          <div class="summary-item">
            <div class="label">Start Time</div>
            <div class="value">{{ formatDateTime(currentShift.startTime) }}</div>
          </div>

          <div class="summary-item">
            <div class="label">Duration</div>
            <div class="value">{{ calculateDuration(currentShift.startTime) }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Cash Balance -->
    <v-card class="cash-balance mt-4">
      <v-card-title>Cash Balance</v-card-title>
      <v-card-text>
        <div class="balance-grid">
          <div class="balance-item">
            <div class="label">Starting Cash</div>
            <div class="value">{{ formatPrice(currentShift?.startingCash || 0) }}</div>
          </div>

          <div class="balance-item">
            <div class="label">Cash Received</div>
            <div class="value positive">+ {{ formatPrice(shiftStats.cashReceived) }}</div>
          </div>

          <div class="balance-item">
            <div class="label">Cash Refunded</div>
            <div class="value negative">- {{ formatPrice(shiftStats.cashRefunded) }}</div>
          </div>

          <div class="balance-item highlight">
            <div class="label">Expected Cash</div>
            <div class="value">{{ formatPrice(expectedCash) }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Payment Methods Breakdown -->
    <v-card class="payment-breakdown mt-4">
      <v-card-title>Payment Methods</v-card-title>
      <v-simple-table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Count</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <v-icon size="20" class="mr-2">mdi-cash</v-icon>
              Cash
            </td>
            <td>{{ shiftStats.cash.count }}</td>
            <td>{{ formatPrice(shiftStats.cash.amount) }}</td>
          </tr>
          <tr>
            <td>
              <v-icon size="20" class="mr-2">mdi-credit-card</v-icon>
              Card
            </td>
            <td>{{ shiftStats.card.count }}</td>
            <td>{{ formatPrice(shiftStats.card.amount) }}</td>
          </tr>
          <tr>
            <td>
              <v-icon size="20" class="mr-2">mdi-qrcode</v-icon>
              QR Code
            </td>
            <td>{{ shiftStats.qr.count }}</td>
            <td>{{ formatPrice(shiftStats.qr.amount) }}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td>
              <strong>{{ shiftStats.totalCount }}</strong>
            </td>
            <td>
              <strong>{{ formatPrice(shiftStats.totalAmount) }}</strong>
            </td>
          </tr>
        </tbody>
      </v-simple-table>
    </v-card>

    <!-- Payments List -->
    <v-card class="payments-list mt-4">
      <v-card-title>
        Payments ({{ shiftPayments.length }})
        <v-spacer />
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          density="compact"
        />
      </v-card-title>

      <v-data-table
        :items="shiftPayments"
        :headers="paymentHeaders"
        :search="search"
        density="comfortable"
      >
        <template #item.paymentNumber="{ item }">
          <strong>{{ item.paymentNumber }}</strong>
        </template>

        <template #item.amount="{ item }">
          <span :class="{ 'text-error': item.amount < 0 }">
            {{ formatPrice(item.amount) }}
          </span>
        </template>

        <template #item.method="{ item }">
          <v-chip size="small">{{ item.method }}</v-chip>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getPaymentStatusColor(item.status)" size="small">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.processedAt="{ item }">
          {{ formatTime(item.processedAt) }}
        </template>
      </v-data-table>
    </v-card>

    <!-- Previous Shifts (Collapsible) -->
    <v-expansion-panels class="mt-4">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon class="mr-2">mdi-history</v-icon>
          Previous Shifts
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-for="shift in previousShifts" :key="shift.id" class="previous-shift-item">
            <div class="shift-info">
              <div>Shift {{ shift.shiftNumber }}</div>
              <div class="text-caption">
                {{ formatDateTime(shift.startTime) }} - {{ formatDateTime(shift.endTime) }}
              </div>
            </div>
            <div class="shift-total">
              {{ formatPrice(shift.totalSales || 0) }}
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePaymentsStore } from '@/stores/pos/payments/paymentsStore'

const router = useRouter()
const shiftsStore = useShiftsStore()
const paymentsStore = usePaymentsStore()

// State
const search = ref('')

// Computed
const currentShift = computed(() => shiftsStore.currentShift)
const previousShifts = computed(() => shiftsStore.shifts.filter(s => s.status === 'closed'))

// Get payments for current shift
const shiftPayments = computed(() => {
  if (!currentShift.value) return []
  return paymentsStore.payments.filter(p => p.shiftId === currentShift.value!.id)
})

// Calculate shift statistics
const shiftStats = computed(() => {
  const stats = {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    qr: { count: 0, amount: 0 },
    totalCount: 0,
    totalAmount: 0,
    cashReceived: 0,
    cashRefunded: 0
  }

  shiftPayments.value.forEach(p => {
    if (p.status === 'completed') {
      stats[p.method].count++
      stats[p.method].amount += p.amount
      stats.totalCount++
      stats.totalAmount += p.amount

      // Cash tracking
      if (p.method === 'cash') {
        if (p.amount > 0) {
          stats.cashReceived += p.amount
        } else {
          stats.cashRefunded += Math.abs(p.amount)
        }
      }
    }
  })

  return stats
})

const expectedCash = computed(() => {
  return (
    (currentShift.value?.startingCash || 0) +
    shiftStats.value.cashReceived -
    shiftStats.value.cashRefunded
  )
})

// Table headers
const paymentHeaders = [
  { title: 'Payment #', key: 'paymentNumber', sortable: true },
  { title: 'Time', key: 'processedAt', sortable: true },
  { title: 'Method', key: 'method' },
  { title: 'Amount', key: 'amount', sortable: true },
  { title: 'Status', key: 'status' }
]

// Methods
const handleBack = () => {
  router.push('/pos')
}

const handleEndShift = async () => {
  // TODO: Open EndShiftDialog
  console.log('End shift clicked')
}

const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('id-ID')
}

const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('id-ID')
}

const calculateDuration = (startTime: string): string => {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const getPaymentStatusColor = (status: string): string => {
  const colors = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    refunded: 'grey'
  }
  return colors[status as keyof typeof colors] || 'grey'
}
</script>

<style scoped>
.shift-management-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.shift-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.shift-header h1 {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
}

.summary-grid,
.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item,
.balance-item {
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
}

.balance-item.highlight {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 2px solid rgb(var(--v-theme-primary));
}

.label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 4px;
}

.value {
  font-size: 20px;
  font-weight: 600;
}

.value.positive {
  color: rgb(var(--v-theme-success));
}

.value.negative {
  color: rgb(var(--v-theme-error));
}

.total-row {
  background: rgba(var(--v-theme-primary), 0.05);
  font-weight: 600;
}

.previous-shift-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.shift-total {
  font-size: 16px;
  font-weight: 600;
}
</style>
```

### Router Configuration

```typescript
// src/router/index.ts

{
  path: '/pos',
  component: () => import('@/views/pos/PosMainView.vue'),
  meta: { requiresAuth: true, allowedRoles: ['admin', 'cashier'] },
  children: [
    {
      path: '',
      name: 'pos',
      component: () => import('@/views/pos/PosInterface.vue')
    },
    {
      path: 'shift-management',
      name: 'pos-shift-management',
      component: () => import('@/views/pos/shift/ShiftManagementView.vue'),
      meta: { requiresShift: true }  // Only accessible when shift is active
    }
  ]
}
```

### Связь со Store

```typescript
// paymentsStore.ts - уже готов, но добавим:

/**
 * Get payments for specific shift
 */
function getShiftPayments(shiftId: string): PosPayment[] {
  return payments.value.filter(p => p.shiftId === shiftId)
}

// Добавить в return:
return {
  // ... existing
  getShiftPayments // ✅ Новый метод
}
```

### Резюме архитектуры

```
POS SYSTEM (Primary)
├── paymentsStore ──► localStorage ──┐
├── shiftsStore   ──► localStorage   │
├── ordersStore   ──► localStorage   │
                                     │
                                     ↓ Sync (optional)

                                  Backend
                                  (Firebase/API)

                                     ↓ Read-only

BACKOFFICE (Analytics)
├── Read from Backend
├── Show reports
└── NO write operations
```

**Итого:**

1. ✅ POS - основной store + localStorage
2. ✅ POS взаимодействует с БД (когда настроена синхронизация)
3. ✅ Backoffice читает из БД (read-only)
4. ✅ Новая кнопка в PosNavigationMenu: "Shift Details"
5. ✅ Полноэкранный view для управления сменой в POS
6. ✅ Показывает операции, остатки, может закрыть смену

---

## 🔄 Future: Backend Sync (Optional)

When you decide on a backend (Firebase, Postgres, etc.), add:

```typescript
// src/stores/pos/payments/services/sync.service.ts

export class PaymentSyncService {
  constructor(
    private localService: PaymentsService,
    private remoteService: IRemotePaymentService  // Abstract interface
  ) {}

  async syncToRemote(): Promise<ServiceResponse<{ syncedCount: number }>> {
    // Get unsync payments
    const local = await this.localService.getAllPayments()
    const unsynced = local.data?.filter(p => !p.syncedAt) || []

    // Upload to remote
    for (const payment of unsynced) {
      await this.remoteService.save(payment)
      payment.syncedAt = new Date().toISOString()
      payment.syncStatus = 'synced'
      await this.localService.updatePayment(payment)
    }

    return { success: true, data: { syncedCount: unsynced.length } }
  }
}

// Implementations:
class FirebasePaymentService implements IRemotePaymentService { ... }
class PostgresPaymentService implements IRemotePaymentService { ... }
class RESTApiPaymentService implements IRemotePaymentService { ... }
```

---

## 📋 Sprint 1 Implementation Checklist

### **Phase 1: Data Model** (1 hour)

- [ ] Add `PosPayment` interface to `src/stores/pos/types.ts`
- [ ] Add `paymentIds: string[]` to `PosOrder`
- [ ] Add `paidByPaymentIds?: string[]` to `PosBillItem`
- [ ] Export `PaymentMethod`, `PaymentStatus` types

### **Phase 2: Service Layer** (2-3 hours)

- [ ] Create `src/stores/pos/payments/services.ts`
- [ ] Implement `PaymentsService` class:
  - [ ] `getAllPayments()`
  - [ ] `savePayment()`
  - [ ] `updatePayment()`
  - [ ] `processPayment()`
  - [ ] `refundPayment()`
  - [ ] `printReceipt()`
- [ ] Test service with localStorage

### **Phase 3: Store Implementation** (3-4 hours)

- [ ] Create `src/stores/pos/payments/paymentsStore.ts`
- [ ] Implement state management:
  - [ ] `payments` ref
  - [ ] `loading`, `error`, `initialized` refs
  - [ ] `todayPayments`, `completedPayments`, `totalRevenue` computed
- [ ] Implement actions:
  - [ ] `initialize()`
  - [ ] `processSimplePayment()`
  - [ ] `processRefund()`
  - [ ] `printReceipt()`
  - [ ] `getOrderPayments()`
  - [ ] `getPaymentStats()`
- [ ] Implement helpers:
  - [ ] `linkPaymentToOrder()`
  - [ ] `unlinkPaymentFromOrder()`

### **Phase 4: POS Integration** (2-3 hours)

- [ ] Add `paymentsStore.initialize()` to `posStore.initializePOS()`
- [ ] Update `OrderActions.vue` to use new payment flow
- [ ] Update `OrderSection.vue` payment handling
- [ ] Test payment creation and persistence

### **Phase 5: POS UI - Payment History** (2 hours)

- [ ] Create `src/views/payments/components/PaymentHistoryWidget.vue`
- [ ] Display payment list for order
- [ ] Add print receipt button
- [ ] Add refund button (completed payments only)
- [ ] Add to `OrderSection.vue`

### **Phase 6: POS UI - Refund Dialog** (2 hours)

- [ ] Create `src/views/payments/components/RefundDialog.vue`
- [ ] Full/partial refund options
- [ ] Refund reason input (required)
- [ ] Confirmation flow
- [ ] Test refund processing

### **Phase 7: Backoffice Views** (4-6 hours) - FUTURE

- [ ] Create `src/views/payments/PaymentsList.vue` (read-only)
- [ ] Create `src/views/payments/PaymentDetails.vue`
- [ ] Create `src/views/payments/DailyReconciliation.vue`
- [ ] Add router routes
- [ ] Test data visibility

### **Phase 8: Testing** (2 hours)

- [ ] Test payment creation
- [ ] Test payment persistence (table switching)
- [ ] Test refund flow
- [ ] Test multiple payments per order
- [ ] Test payment history display
- [ ] Test browser refresh (data loading)

**Total Sprint 1: ~14-18 hours** (Phases 1-6 + 8)

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Payment Flow

1. Create order with 3 items (Rp 330,000)
2. Process payment (cash, Rp 350,000)
3. ✅ Payment saved to localStorage
4. ✅ Order.paymentIds includes payment ID
5. ✅ All items marked as paid
6. ✅ Change returned: Rp 20,000
7. Switch to another table
8. Return to original table
9. ✅ Payment visible in history

### Scenario 2: Partial Payment

1. Order with 3 items (A: 100k, B: 110k, C: 120k)
2. Select items A + B
3. Process payment (Rp 210,000)
4. ✅ Only items A and B marked as paid
5. ✅ Item C still unpaid
6. ✅ Bill status: 'partial'
7. Later: pay for item C (Rp 120,000)
8. ✅ 2 payments in history
9. ✅ Bill status: 'paid'

### Scenario 3: Refund Flow

1. Order paid (1 item, Rp 110,000)
2. Customer returns item
3. Click refund button in payment history
4. Enter refund reason
5. Process refund
6. ✅ Refund payment created (amount: -110,000)
7. ✅ Original payment marked as refunded
8. ✅ Item status: refunded
9. ✅ 2 payments in history (original + refund)

### Scenario 4: Data Persistence

1. Process 3 payments
2. Close browser completely
3. Reopen POS
4. Navigate to table
5. ✅ paymentsStore.initialize() loads payments
6. ✅ All 3 payments visible
7. ✅ Payment history displays correctly

### Scenario 5: Backoffice View (Future)

1. POS processes 10 payments
2. Open backoffice
3. Navigate to Payments view
4. ✅ See all 10 payments
5. ✅ Filter by date works
6. ✅ Filter by method works
7. ✅ Statistics displayed correctly
8. ✅ No refund/edit buttons (read-only)

---

## 🎯 Success Criteria

### Must Have (Sprint 1):

- ✅ Payments saved to localStorage
- ✅ Payments persist after table switching
- ✅ Payments persist after browser refresh
- ✅ Multiple payments per order supported
- ✅ Partial payments work (some items paid)
- ✅ Refund flow works from POS
- ✅ Payment history visible in OrderSection
- ✅ Database-agnostic (no Firebase hardcoded)

### Should Have (Sprint 2):

- ✅ Backoffice payment list view
- ✅ Daily reconciliation report
- ✅ Payment analytics (revenue by method)
- ✅ Cashier performance reports

### Could Have (Future):

- ✅ Backend sync (when DB chosen)
- ✅ Receipt printing integration
- ✅ Export to accounting software
- ✅ Payment search/filtering

---

## 🗂️ Summary

### ✅ What We're Building:

1. **Payment Store** - following orders/tables pattern
2. **Service Layer** - localStorage for now, swappable later
3. **POS UI** - payment history + refund dialog
4. **Data Links** - payments reference orders/items
5. **Database-agnostic** - no hardcoded backend

### ✅ What We're NOT Building (Yet):

- ❌ Backend sync (choose DB first)
- ❌ Backoffice views (Sprint 2)
- ❌ Advanced analytics (Sprint 2)

### ✅ Architecture Matches:

- Uses existing store pattern (like ordersStore, tablesStore)
- Uses existing service pattern (like OrdersService)
- Uses existing types (extends pos/types.ts)
- Follows offline-first approach (localStorage)
- Ready for future backend (Repository pattern available)

**This is the final architecture. Ready to start Sprint 1!** 🚀
