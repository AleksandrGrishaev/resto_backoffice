# Payment System Business Logic Specification

## Version: 2.0 (Post-Migration 113)

## Date: 2026-01-29

## Author: Claude Code Analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Entities](#core-entities)
3. [Payment Creation Flows](#payment-creation-flows)
4. [Payment Linking System](#payment-linking-system)
5. [Special Features](#special-features)
6. [Database Schema](#database-schema)
7. [Problems Found](#problems-found)
8. [Open Questions](#open-questions)
9. [Recommended Changes](#recommended-changes)
10. [Implementation Task List (ТЗ)](#implementation-task-list-тз)

---

## Executive Summary

### System Architecture

Kitchen App uses a **two-tier payment management system**:

1. **Transaction** - Records FACT of money movement (accounting ledger)
2. **PendingPayment** - Manages ALLOCATION of payments to Purchase Orders (allocation manager)

### Key Insight

**PendingPayment does NOT mean "awaiting payment"!**

- `status='pending'` - Planned to pay (created BEFORE payment fact)
- `status='completed'` - ALREADY paid, ready for allocation to Purchase Orders

### Two Main Accounts

1. **Regular accounts** - Bank accounts, digital wallets
2. **Special account: "Касса" (Main Cash Register)** - POS cash register account
   - Type: `cash`
   - Used for POS shift operations
   - Requires cashier confirmation for payments

---

## Core Entities

### 1. Transaction (table: `transactions`)

**Role:** Accounting Ledger (immutable record of money movement)

**Purpose:**

- Records FACT of money movement
- Nearly immutable (audit trail)
- Tied to Account (cash register, bank, etc.)
- Created at moment of payment

**Key Fields:**

```typescript
interface Transaction {
  id: string
  account_id: string // Which account (cash, bank, etc.)
  type: 'income' | 'expense' | 'transfer' | 'correction'
  amount: number // Negative for expenses
  balance_after: number // Account balance after this transaction

  description: string
  expense_category?: {
    // For expense operations
    type: 'expense' | 'income'
    category: string // 'supplier' for supplier payments
  }

  // Linking fields
  counteragent_id?: string // Supplier/Customer ID
  counteragent_name?: string // Cached name
  related_payment_id?: string // Link to PendingPayment (CRITICAL for supplier expenses)

  performed_by: {
    type: 'user' | 'api'
    id: string
    name: string
  }
  status: 'completed' | 'pending' | 'cancelled'

  created_at: string
  updated_at: string
}
```

**Code Location:** `src/stores/account/types.ts:87-107`

### 2. PendingPayment (table: `pending_payments`)

**Role:** Payment Allocation Manager

**Purpose:**

- Manages DISTRIBUTION of payments to Purchase Orders
- Allows partial payments (one payment → part of order)
- Allows overpayments (one payment → multiple orders)
- Tracks `used_amount` and `linkedOrders`

**Key Fields:**

```typescript
interface PendingPayment {
  id: string

  // Core payment info
  counteragent_id: string // Supplier ID (REQUIRED)
  counteragent_name: string // Supplier name (REQUIRED)
  amount: number // Total payment amount
  used_amount?: number // How much already allocated to orders

  description: string
  category: string // 'supplier' | 'customer' | 'other'

  // Status tracking
  status: 'pending' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Linking to Purchase Orders
  linked_orders?: Array<{
    orderId: string
    orderNumber?: string
    linkedAmount: number // Amount allocated to this order
    linkedAt: string
    isActive: boolean // Can be unlinked (soft delete)
    unlinkedAt?: string
  }>
  source_order_id?: string // Original PO that created this payment (if any)

  // Payment execution details
  paid_amount?: number // Actual amount paid
  paid_date?: string // When paid
  assigned_to_account?: string // Which account used (if completed)

  // Cashier confirmation (Sprint 3)
  requires_cashier_confirmation?: boolean
  confirmation_status?: 'pending' | 'confirmed' | 'rejected'
  confirmed_by?: TransactionPerformer
  confirmed_at?: string
  rejection_reason?: string

  created_by: TransactionPerformer
  created_at: string
  updated_at: string
}
```

**Code Location:** `src/stores/account/types.ts:151-191`

---

## Payment Creation Flows

### Flow 1: Unlinked Payment - POS (Backoffice Interface)

**Trigger:** User clicks "Supplier Payment" in Account interface (Backoffice)

**Scenario:** Manager creates payment from Backoffice account view

**Steps:**

1. User selects expense category "Supplier"
2. User fills form:
   - Amount
   - Supplier (REQUIRED)
   - Description
   - Account to debit
3. `accountStore.createSupplierExpenseWithPayment()` called

**Result:**

- Transaction created (account balance updated)
- PendingPayment created with `status='completed'`, `used_amount=0`
- Both linked via `transaction.related_payment_id = payment.id`
- Payment appears in "Unlinked" tab

**Code Location:** `src/stores/account/store.ts:1908-2004`

**Function:** `createSupplierExpenseWithPayment()`

**Implementation:**

```typescript
async function createSupplierExpenseWithPayment(data: CreateOperationDto): Promise<{
  transaction: Transaction
  payment: PendingPayment
}> {
  // Validate supplier data
  if (!data.counteragentId || !data.counteragentName) {
    throw new Error('Counteragent ID and name are required')
  }

  // Step 1: Create PendingPayment with status='completed'
  const payment = await paymentService.createPayment({
    counteragentId: data.counteragentId,
    counteragentName: data.counteragentName,
    amount: data.amount,
    description: data.description,
    category: 'supplier',
    priority: 'medium',
    createdBy: data.performedBy,
    usedAmount: 0 // Unlinked
  })

  // Mark as completed immediately
  await paymentService.update(payment.id, {
    status: 'completed',
    paidAmount: data.amount,
    paidDate: new Date().toISOString(),
    assignedToAccount: data.accountId
  })

  // Step 2: Create transaction with link to payment
  const transaction = await transactionService.createTransaction({
    ...data,
    relatedPaymentId: payment.id
  })

  return { transaction, payment }
}
```

**Display:** Shows as "Backoffice" in UI (but NO SOURCE FIELD in DB - see Problem #1)

---

### Flow 2: Unlinked Payment - POS (Cash Register)

**Trigger:** Cashier pays supplier from POS cash register

**Scenario:** Supplier delivers goods, cashier pays immediately from cash

**Steps:**

1. During active shift, cashier opens "Expense" dialog
2. Selects category "Supplier Payment"
3. Fills form:
   - Amount
   - Supplier (REQUIRED)
   - Description
4. `shiftsStore.createDirectExpense()` called

**Result:**

- Transaction created IMMEDIATELY (not at shift close)
- PendingPayment created IMMEDIATELY via `createSupplierExpenseWithPayment()`
- Both synced to database RIGHT AWAY
- Payment appears in "Unlinked" tab
- Expense recorded in shift for reporting

**Code Location:** `src/stores/pos/shifts/shiftsStore.ts:581-708`

**Function:** `createDirectExpense()`

**Implementation Details:**

```typescript
// Line 624: Supplier expenses create transaction IMMEDIATELY
if (isSupplierExpense) {
  try {
    const transaction = await accountStore.createOperation({
      accountId: data.accountId,
      type: 'expense',
      amount: data.amount,
      description: data.description,
      expenseCategory: { type: 'expense', category: 'supplier' },
      performedBy: data.performedBy,
      counteragentId: data.counteragentId,
      counteragentName: data.counteragentName
    })

    // ⚠️ STEP 2: Create PendingPayment (lines 646-673)
    const { payment } = await accountStore.createSupplierExpenseWithPayment({
      accountId: data.accountId,
      type: 'expense',
      amount: data.amount
      // ... creates COMPLETED payment in database
    })

    expenseOperation.relatedPaymentId = payment.id
    expenseOperation.relatedTransactionId = transaction.id
    expenseOperation.syncStatus = 'synced'
  } catch (txError) {
    // Continue - expense saved, transaction will be created at shift close
  }
}
```

**Critical Bug Found:**
Line 649-654: Duplicate payment check uses 5-second window, but race condition possible if multiple tabs/devices

**Display:** Shows as "POS" in UI (but NO SOURCE FIELD in DB - see Problem #1)

---

### Flow 3: Pending Payment - From Purchase Order Interface

**Trigger:** User creates payment plan from Purchase Order view

**Scenario:** Manager plans payment for future delivery

**Steps:**

1. User opens Purchase Order
2. Clicks "Manage Payments" or "Create Payment"
3. Fills payment form:
   - Amount (defaults to order total)
   - Due date
   - Priority
   - Notes
4. Payment created with `source_order_id = order.id`

**Result:**

- PendingPayment created with `status='pending'` (NOT yet paid)
- NO Transaction yet
- Payment automatically linked to source order via `source_order_id`
- Order `bill_status` updated to 'billed'

**When amount changes during receipt (priemka):**

- Payment amount updates automatically
- Maintains link to order

**Code Location:** **NOT IMPLEMENTED** (see Problem #2)

**Expected Implementation:**

```typescript
// This function does NOT exist in current codebase
async function createPaymentForOrder(orderId: string, amount: number) {
  const payment = await accountStore.createPayment({
    counteragentId: order.supplier_id,
    counteragentName: order.supplier_name,
    amount: amount,
    status: 'pending', // Not yet paid
    priority: 'high',
    sourceOrderId: orderId, // Auto-link
    linkedOrders: [
      {
        orderId: orderId,
        linkedAmount: amount,
        linkedAt: new Date().toISOString(),
        isActive: true
      }
    ]
  })

  return payment
}
```

---

### Flow 4: Cashier Confirmation Flow

**Trigger:** Payment created in Backoffice assigned to "Main Cash Register" account

**Scenario:** Manager plans payment from cash register, needs cashier to confirm

**Special Case:** If payment assigned to account with `type='cash'`, requires cashier confirmation

**Steps:**

1. Manager creates payment in Backoffice
2. Assigns to "Main Cash Register" account
3. System sets:
   - `requires_cashier_confirmation = true`
   - `confirmation_status = 'pending'`
4. Cashier sees pending payment in POS Shift Management
5. Cashier confirms or rejects:
   - **Confirm:** Creates transaction, payment becomes 'completed'
   - **Reject:** Payment stays pending, reason recorded

**Code Location:**

- Assignment: `src/stores/account/store.ts:891-932` (`assignPaymentToAccount()`)
- Confirmation: `src/stores/account/store.ts:1772-1848` (`confirmPayment()`)
- Rejection: `src/stores/account/store.ts:1856-1906` (`rejectPayment()`)

**Implementation - Assignment:**

```typescript
// Line 891-932
async function assignPaymentToAccount(paymentId: string, accountId: string) {
  const payment = state.value.pendingPayments.find(p => p.id === paymentId)
  payment.assignedToAccount = accountId

  // Check if account is cash type
  const targetAccount = state.value.accounts.find(a => a.id === accountId)
  const isCashAccount = targetAccount?.type === 'cash'

  if (isCashAccount) {
    payment.requiresCashierConfirmation = true
    payment.confirmationStatus = 'pending'

    await paymentService.update(payment.id, {
      requiresCashierConfirmation: true,
      confirmationStatus: 'pending'
    })
  }
}
```

**Implementation - Confirmation:**

```typescript
// Line 1772-1848
async function confirmPayment(
  paymentId: string,
  performer: TransactionPerformer,
  actualAmount?: number
): Promise<string> {
  const payment = state.value.pendingPayments.find(p => p.id === paymentId)

  // Validate
  if (!payment.requiresCashierConfirmation) {
    throw new Error('Payment does not require cashier confirmation')
  }

  // Update status
  await paymentService.update(payment.id, {
    confirmationStatus: 'confirmed',
    confirmedBy: performer,
    confirmedAt: new Date().toISOString()
  })

  // Process payment (creates transaction)
  const transactionId = await processPayment({
    paymentId,
    accountId: payment.assignedToAccount!,
    actualAmount,
    notes: `Confirmed by cashier: ${performer.name}`,
    performedBy: performer
  })

  return transactionId
}
```

---

## Payment Linking System

### Linking Payment to Order

**Purpose:** Allocate payment amount to specific Purchase Order(s)

**Business Rules:**

1. Can link ONE payment to MULTIPLE orders (overpayment)
2. Can PARTIALLY link payment to order
3. Can only link COMPLETED payments (user says unclear - see Question #1)
4. Updates: `payment.linkedOrders[]`, `payment.used_amount`, `order.bill_status`

**Process:**

1. Find unlinked/partially-linked payment (completed, has available amount)
2. Select Purchase Order to link
3. Specify link amount (can be partial)
4. Update payment and order

**Available Amount Calculation:**

```typescript
const availableAmount = payment.amount - (payment.used_amount || 0)
```

**Code Location:** `src/stores/account/store.ts:1101-1293`

**Function:** `linkPaymentToOrder()`

**Implementation:**

```typescript
async function linkPaymentToOrder(
  data: LinkPaymentToOrderDto,
  options?: { autoAdjustPending?: boolean, tolerance?: number }
): Promise<{ success: boolean; adjustedPayments?: Array<...> }> {

  const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)

  // Calculate available amount
  const linkedAmount = payment.linkedOrders?.filter(o => o.isActive)
    .reduce((sum, o) => sum + o.linkedAmount, 0) || 0

  const availableAmount = payment.status === 'completed'
    ? payment.amount - (payment.usedAmount || 0)
    : payment.amount - linkedAmount

  if (availableAmount < data.linkAmount) {
    throw new Error('Insufficient available amount')
  }

  // Add link to payment
  if (!payment.linkedOrders) payment.linkedOrders = []

  payment.linkedOrders.push({
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    linkedAmount: data.linkAmount,
    linkedAt: new Date().toISOString(),
    isActive: true
  })

  // ⚠️ CRITICAL: Save to database (line 1194-1198)
  await paymentService.update(payment.id, {
    linkedOrders: payment.linkedOrders,
    updatedAt: new Date().toISOString()
  })

  // Update used_amount for completed payments (line 1206-1222)
  if (payment.status === 'completed') {
    const totalLinkedAmount = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    await updatePaymentUsedAmount(payment.id, totalLinkedAmount)
  }

  // Update order bill_status (line 1257-1274)
  await updateOrderBillStatus(data.orderId)

  // Update POS expense linking status (if from POS) (line 1224-1255)
  await shiftsStore.updateExpenseLinkingStatusByPaymentId(
    data.paymentId,
    newLinkingStatus,
    data.orderId
  )

  return { success: true }
}
```

**Bill Status Calculation:**

**Code Location:** `src/stores/supplier_2/composables/usePurchaseOrders.ts:206-286`

**Function:** `calculateBillStatus()`

**Logic:**

```typescript
async function calculateBillStatus(order: PurchaseOrder): Promise<BillStatus> {
  // Get all payments linked to this order
  const bills = await accountStore.getPaymentsByOrder(order.id)

  if (bills.length === 0) return 'not_billed'

  // Calculate total paid (only COMPLETED payments)
  const totalPaid = bills
    .filter(bill => bill.status === 'completed')
    .reduce((sum, bill) => {
      const orderLink = bill.linkedOrders?.find(link => link.orderId === order.id && link.isActive)
      return sum + (orderLink?.linkedAmount || 0)
    }, 0)

  // Calculate total billed (all non-cancelled)
  const totalBilled = bills
    .filter(bill => bill.status !== 'cancelled')
    .reduce((sum, bill) => {
      const orderLink = bill.linkedOrders?.find(link => link.orderId === order.id && link.isActive)
      return sum + (orderLink?.linkedAmount || 0)
    }, 0)

  // Check overdue
  const now = new Date()
  const hasOverdueBills = bills.some(bill => {
    if (bill.status !== 'pending') return false
    if (!bill.dueDate) return false

    const hasActiveLink = bill.linkedOrders?.some(
      link => link.orderId === order.id && link.isActive
    )

    return hasActiveLink && new Date(bill.dueDate) < now
  })

  const orderAmount = order.actualDeliveredAmount || order.totalAmount

  // Determine status
  if (hasOverdueBills) return 'overdue'
  if (totalPaid === 0 && totalBilled > 0) return 'billed'
  if (totalPaid > orderAmount) return 'overpaid'
  if (totalPaid > 0 && totalPaid < orderAmount) return 'partially_paid'
  if (totalPaid >= orderAmount) return 'fully_paid'

  return 'not_billed'
}
```

---

### Unlinking Payment from Order

**Purpose:** Remove allocation (e.g., wrong order, need to reallocate)

**Process:**

1. Find linked payment
2. Set `isActive = false` for this link (soft delete - keep history)
3. Decrease `used_amount`
4. Update order `bill_status`

**Code Location:** `src/stores/account/store.ts:1296-1430`

**Function:** `unlinkPaymentFromOrder()`

**Implementation:**

```typescript
async function unlinkPaymentFromOrder(paymentId: string, orderId: string): Promise<void> {
  const payment = state.value.pendingPayments.find(p => p.id === paymentId)

  const linkIndex = payment.linkedOrders.findIndex(
    o => o.orderId === orderId && o.isActive
  )

  if (linkIndex === -1) {
    // No active link found
    return
  }

  const link = payment.linkedOrders[linkIndex]
  const unlinkedAmount = link.linkedAmount

  // Soft delete (keep history)
  link.isActive = false
  link.unlinkedAt = new Date().toISOString()

  // Save to database
  await paymentService.update(payment.id, {
    linkedOrders: payment.linkedOrders,
    updatedAt: new Date().toISOString()
  })

  // Update used_amount for completed payments
  if (payment.status === 'completed') {
    const remainingLinkedAmount = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    await updatePaymentUsedAmount(payment.id, remainingLinkedAmount)
  }

  // Update order bill_status
  await updateOrderBillStatus(orderId)

  // Update POS expense linking status (if from POS)
  await shiftsStore.updateExpenseLinkingStatusByPaymentId(...)
}
```

**Why Soft Delete?**

- Preserves audit trail (who, when, why unlinked)
- Can restore if mistake
- History of all changes

---

## Special Features

### 1. Cashier Confirmation

**When:** Payment created in Backoffice + assigned to account with `type='cash'`

**Fields:**

- `requires_cashier_confirmation: boolean`
- `confirmation_status: 'pending' | 'confirmed' | 'rejected'`
- `confirmed_by: TransactionPerformer`
- `confirmed_at: string`
- `rejection_reason?: string`

**Workflow:**

1. Backoffice creates payment → assigns to cash account
2. System auto-sets `requires_cashier_confirmation = true`
3. Cashier sees in POS Shift Management
4. Cashier confirms/rejects
5. On confirm: Transaction created, payment becomes 'completed'

**Code Location:** See Flow 4 above

---

### 2. Partial Allocation

**Scenario:** Payment Rp 1,000,000 → Link Rp 600,000 to Order A

**Example:**

```typescript
const payment = {
  id: 'pp_abc',
  amount: 1000000,
  used_amount: 0,
  linked_orders: []
}

const order = {
  id: 'po_123',
  totalAmount: 1000000,
  bill_status: 'not_billed'
}

// Link partial amount
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_123',
  linkAmount: 600000 // Only 60%
})

// Result:
payment.used_amount = 600000
payment.linked_orders = [
  {
    orderId: 'po_123',
    linkedAmount: 600000,
    isActive: true
  }
]

order.bill_status = 'partially_paid'

// Available: 1000000 - 600000 = 400000
```

---

### 3. Overpayment (One Payment → Multiple Orders)

**Scenario:** Payment Rp 1,000,000 → Split to Order A (600K) + Order B (400K)

**Example:**

```typescript
const payment = {
  id: 'pp_abc',
  amount: 1000000,
  used_amount: 0
}

// Link to Order A
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_a',
  linkAmount: 600000
})

// Link to Order B
await linkPaymentToOrder({
  paymentId: 'pp_abc',
  orderId: 'po_b',
  linkAmount: 400000
})

// Result:
payment.used_amount = 1000000 // Fully allocated
payment.linked_orders = [
  { orderId: 'po_a', linkedAmount: 600000, isActive: true },
  { orderId: 'po_b', linkedAmount: 400000, isActive: true }
]

orderA.bill_status = 'fully_paid'
orderB.bill_status = 'fully_paid'
```

---

## Database Schema

### transactions table

**Location:** Schema inferred from code and migration 113

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  account_id TEXT NOT NULL,              -- Which account (cash, bank, etc.)
  type TEXT NOT NULL,                    -- 'income' | 'expense' | 'transfer' | 'correction'
  amount NUMERIC NOT NULL,               -- Negative for expenses
  balance_after NUMERIC NOT NULL,        -- Account balance after this transaction

  description TEXT NOT NULL,
  expense_category JSONB,                -- {type, category} for expenses

  counteragent_id TEXT,                  -- Supplier/Customer ID
  counteragent_name TEXT,                -- Cached name

  related_payment_id TEXT,               -- ⚠️ Link to pending_payments (CRITICAL for supplier expenses)

  performed_by JSONB NOT NULL,           -- {id, name, type}
  status TEXT NOT NULL,                  -- 'completed' | 'pending' | 'cancelled'

  -- Foreign keys
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (related_payment_id) REFERENCES pending_payments(id)
);

-- Index for supplier expenses (from migration 113)
CREATE INDEX idx_transactions_supplier_expenses
ON transactions (counteragent_id, created_at)
WHERE expense_category->>'category' = 'supplier';

-- Index for payments linking (from migration 113)
CREATE INDEX idx_transactions_related_payment
ON transactions (related_payment_id)
WHERE related_payment_id IS NOT NULL;
```

---

### pending_payments table

**Location:** Schema inferred from code types and migration 113

```sql
CREATE TABLE pending_payments (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  counteragent_id TEXT NOT NULL,        -- Supplier ID (REQUIRED)
  counteragent_name TEXT NOT NULL,      -- Supplier name (REQUIRED)

  amount NUMERIC NOT NULL,              -- Total payment amount
  used_amount NUMERIC DEFAULT 0,        -- Amount already allocated to orders

  description TEXT NOT NULL,
  category TEXT NOT NULL,               -- 'supplier' | 'customer' | 'other'

  status TEXT NOT NULL,                 -- 'pending' | 'completed' | 'cancelled'
  priority TEXT NOT NULL,               -- 'low' | 'medium' | 'high' | 'urgent'

  -- Linking to Purchase Orders
  linked_orders JSONB,                  -- [{orderId, orderNumber, linkedAmount, linkedAt, isActive}]
  source_order_id TEXT,                 -- Original PO that created this payment (if any)

  -- Payment execution details
  paid_amount NUMERIC,                  -- Actual amount paid
  paid_date TIMESTAMPTZ,                -- When paid
  assigned_to_account TEXT,             -- Which account used (if completed)

  -- Cashier confirmation fields
  requires_cashier_confirmation BOOLEAN DEFAULT false,
  confirmation_status TEXT,             -- 'pending' | 'confirmed' | 'rejected'
  confirmed_by JSONB,                   -- {id, name, type}
  confirmed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  assigned_shift_id TEXT,

  created_by JSONB NOT NULL,            -- {id, name}
  notes TEXT,

  -- ⚠️ MISSING FIELD: source (see Problem #1)

  -- Foreign keys
  FOREIGN KEY (counteragent_id) REFERENCES counteragents(id),
  FOREIGN KEY (assigned_to_account) REFERENCES accounts(id)
);

-- Index for unlinked payments
CREATE INDEX idx_pending_payments_unlinked
ON pending_payments (category, status, used_amount)
WHERE status = 'completed' AND used_amount < amount;

-- Index for supplier payments
CREATE INDEX idx_pending_payments_supplier
ON pending_payments (counteragent_id, status, created_at)
WHERE category = 'supplier';
```

---

## Problems Found

### Problem 1: Missing 'source' Field

**Problem:** Cannot distinguish POS payments from Backoffice payments in database

**Current Behavior:**

- UI shows all DB payments as "Backoffice" (default)
- POS payments only detected if found in localStorage shift data
- After localStorage clear, all POS payments appear as "Backoffice"

**Impact:**

- User cannot see payment origin after localStorage clear
- Reports/analytics cannot filter by source
- Deduplication logic becomes complex (see useExpenseLinking.ts:159-175)

**Code Evidence:**

- `src/stores/pos/shifts/composables/useExpenseLinking.ts:19-56` - Maps payment to expense with `sourceType: 'backoffice'` hardcoded
- `src/stores/pos/shifts/composables/useExpenseLinking.ts:138-192` - Complex deduplication logic to avoid showing same payment twice

**Solution:** Add `source` field to `pending_payments` table

**Migration:**

```sql
-- Migration 114: Add source field
ALTER TABLE pending_payments
ADD COLUMN source TEXT DEFAULT 'backoffice';

-- Update existing POS payments
UPDATE pending_payments pp
SET source = 'pos'
WHERE EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.related_payment_id = pp.id
    AND t.account_id IN (SELECT id FROM accounts WHERE type = 'cash')
);
```

---

### Problem 2: Pending Payment Creation from Purchase Order NOT IMPLEMENTED

**Problem:** User describes creating pending payments from PO interface, but code does not exist

**User's Description (from business logic):**

> "Created from Purchase Order interface:
>
> - status='pending' (not yet paid)
> - Used for post-payment arrangements
> - When order amount changes (during receipt/priemka) → payment amount updates"

**Current Behavior:**

- No function to create pending payment from PO
- Purchase orders DO have automated payment creation, but ONLY via `AutomatedPayments` integration
- No manual UI to create payment plan

**Code Evidence:**

- `src/stores/supplier_2/composables/usePurchaseOrders.ts` - NO function `createPaymentForOrder()`
- Purchase Order payment management uses `AutomatedPayments` (line 714-723)

**Impact:**

- User cannot manually plan payments from PO interface
- All payment planning must be done from Backoffice Account view
- No auto-update when order amount changes during priemka

**Solution:** Implement pending payment creation from PO interface

---

### Problem 3: Race Condition in POS Payment Creation

**Problem:** Duplicate payment check uses 5-second time window, but race condition possible

**Code Location:** `src/stores/pos/shifts/shiftsStore.ts:649-654`

**Current Check:**

```typescript
const existingPayment = accountStore.payments.find(
  p =>
    p.counteragentId === data.counteragentId &&
    p.amount === data.amount &&
    Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 5000 // 5 sec window
)
```

**Problem:**

- If two cashiers create same payment simultaneously → both pass check
- 5-second window too narrow for slow network
- Check runs BEFORE payment inserted (not atomic)

**Impact:**

- Duplicate payments possible in multi-user scenarios
- More likely on slow connections

**Solution:** Use database constraint or lock

---

### Problem 4: Pending Payments with linkedOrders Created Immediately

**Problem:** Code creates pending payments and immediately links them to orders

**User Clarification Needed:** Can pending payments be linked to orders BEFORE being paid?

**Code Evidence:**

- `src/stores/account/store.ts:1101-1293` (`linkPaymentToOrder()`) - NO validation preventing pending payment linking
- `AutomatedPayments` creates pending payments with `linkedOrders` already set

**Current Behavior:**

- Pending payments CAN be linked to orders before payment
- Used for planned allocation
- When paid (status → 'completed'), links remain active

**Is This Correct?**

- **User says:** YES - this is planned payment allocation
- **Code currently:** Allows it (no validation)
- **Question:** Should we validate? Or is current behavior correct?

**Validation Needed:**

```typescript
// Option A: Allow linking pending payments (current behavior)
// No change needed

// Option B: Prevent linking until paid
if (payment.status !== 'completed') {
  throw new Error('Can only link completed payments')
}
```

---

### Problem 5: Payment "Paid" Workflow Not Clear

**Question:** How is payment status changed from 'pending' → 'completed'?

**Expected Workflow (from user description):**

1. Pending payment created from PO
2. Later, cashier/manager "pays" it
3. Status changes to 'completed'

**Current Implementation:**

- `accountStore.processPayment()` - Changes status to 'completed' (line 778-888)
- Called from cashier confirmation flow
- Creates transaction at this point

**UI Location:** **NOT FOUND** - No "Pay" button in PO interface

**Code Evidence:**

- `processPayment()` exists but no UI trigger from PO view
- Only called from cashier confirmation workflow

**Solution:** Add "Pay Pending Payment" UI in PO interface

---

### Problem 6: Order Amount Change During Priemka Does Not Update Payment

**User's Description:**

> "When order amount changes (during receipt/priemka) → payment amount updates"

**Current Behavior:**

- Order amount can change during goods receipt (priemka)
- Payment amount does NOT auto-update
- User must manually adjust payment

**Code Evidence:**

- `src/stores/account/store.ts:420-453` (`updatePaymentAmount()`) - Manual update function exists
- NO automatic trigger when order amount changes

**Impact:**

- Payment amount can become out of sync with order
- Requires manual reconciliation

**Solution:** Add trigger on order update to sync payment amount

---

## Open Questions

### Question 1: Can pending payments be linked to orders before being paid?

**User says:** YES - this is planned payment allocation

**Current code:** Allows it (no validation)

**Recommendation:**

- **Keep current behavior** (allow linking pending payments)
- Document this clearly in business logic
- Add comment in code explaining this is intentional

**Rationale:**

- Useful for planning payment allocation in advance
- When order amount changes, payment amount can be updated
- When paid, links are already in place

---

### Question 2: How should payment amount update when order changes during priemka?

**Scenarios:**

1. Pending payment linked to order → Order amount changes during receipt

   - **Should:** Payment amount auto-update?
   - **Or:** Manual adjustment required?

2. Completed payment linked to order → Order amount changes
   - **Should:** Cannot change (already paid)?
   - **Or:** Create adjustment payment?

**Current Behavior:**

- Manual adjustment via `updatePaymentAmount()`
- No automatic sync

**Recommendation:**

- **For pending payments:** Auto-sync if `sourceOrderId` set
- **For completed payments:** Manual adjustment only (create note)

---

### Question 3: What happens if payment deleted after linking?

**Current Behavior:**

- No cascade delete logic found
- Payment can be cancelled (status='cancelled')
- Links remain in `linkedOrders` with `isActive=true`

**Impact:**

- Order `bill_status` calculation may be wrong
- Unlinked amount calculation may be wrong

**Recommendation:**

- On payment cancel: Set all `linkedOrders[].isActive = false`
- Update order `bill_status` for all linked orders

---

## Recommended Changes

### Change 1: Add 'source' Field to pending_payments

**Priority:** HIGH

**Migration:**

```sql
-- Migration 114: Add source field
ALTER TABLE pending_payments
ADD COLUMN source TEXT DEFAULT 'backoffice'
CHECK (source IN ('backoffice', 'pos', 'automated'));

-- Backfill existing POS payments
UPDATE pending_payments pp
SET source = 'pos'
WHERE EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.related_payment_id = pp.id
    AND t.account_id IN (SELECT id FROM accounts WHERE type = 'cash')
);

-- Backfill automated payments
UPDATE pending_payments pp
SET source = 'automated'
WHERE created_by->>'type' = 'api'
  OR description LIKE '%AutomatedPayments%';

CREATE INDEX idx_pending_payments_source ON pending_payments(source);
```

**Code Changes:**

```typescript
// Update PendingPayment type
interface PendingPayment {
  // ... existing fields ...
  source: 'backoffice' | 'pos' | 'automated'  // NEW
}

// Update creation functions
async function createSupplierExpenseWithPayment(...) {
  const payment = await paymentService.createPayment({
    // ... existing fields ...
    source: 'backoffice'  // NEW
  })
}

// POS creation
async function createDirectExpense(...) {
  const { payment } = await accountStore.createSupplierExpenseWithPayment({
    // ... existing fields ...
    source: 'pos'  // NEW
  })
}
```

**UI Display:**

```typescript
// useExpenseLinking.ts - Simplify deduplication
const backofficePayments = accountStore.allPayments
  .filter(p => p.source === 'backoffice' && p.status === 'completed')
  .map(p => mapPaymentToExpenseFormat(p))

const posPayments = accountStore.allPayments
  .filter(p => p.source === 'pos' && p.status === 'completed')
  .map(p => ({ ...mapPaymentToExpenseFormat(p), sourceType: 'pos' }))
```

---

### Change 2: Fix Race Condition in Payment Creation

**Priority:** MEDIUM

**Current Code:** `src/stores/pos/shifts/shiftsStore.ts:649-654`

**Solution:** Use database-level deduplication

**Implementation:**

**Option A: Unique constraint (preferred)**

```sql
-- Migration 115: Add unique constraint for deduplication
CREATE UNIQUE INDEX idx_pending_payments_dedup
ON pending_payments (counteragent_id, amount, DATE(created_at))
WHERE status = 'completed' AND category = 'supplier';
```

**Option B: Lock-based approach**

```typescript
// Use transaction with SELECT FOR UPDATE
const existingPayment = await supabase
  .from('pending_payments')
  .select('*')
  .eq('counteragent_id', counteragentId)
  .eq('amount', amount)
  .gte('created_at', new Date(Date.now() - 5000).toISOString())
  .single()

if (existingPayment.data) {
  return existingPayment.data
}

// Create new payment atomically
const { data: newPayment } = await supabase
  .from('pending_payments')
  .insert({ ... })
  .select()
  .single()
```

---

### Change 3: Implement Pending Payment Creation from PO

**Priority:** LOW (feature request)

**New Function:**

```typescript
// src/stores/supplier_2/composables/usePurchaseOrders.ts

async function createPaymentPlanForOrder(
  orderId: string,
  options?: {
    amount?: number // Defaults to order total
    dueDate?: string
    priority?: PaymentPriority
    autoSync?: boolean // Auto-update when order amount changes
  }
): Promise<PendingPayment> {
  const order = getOrderById(orderId)
  if (!order) throw new Error('Order not found')

  const amount = options?.amount || order.totalAmount

  const payment = await accountStore.createPayment({
    counteragentId: order.supplierId,
    counteragentName: order.supplierName,
    amount: amount,
    description: `Payment plan for ${order.orderNumber}`,
    status: 'pending', // Not yet paid
    priority: options?.priority || 'medium',
    category: 'supplier',
    sourceOrderId: orderId, // Auto-link
    linkedOrders: [
      {
        orderId: orderId,
        orderNumber: order.orderNumber,
        linkedAmount: amount,
        linkedAt: new Date().toISOString(),
        isActive: true
      }
    ],
    autoSyncEnabled: options?.autoSync ?? true,
    createdBy: currentUser
  })

  // Update order
  await updateOrder(orderId, {
    billStatus: 'billed'
  })

  return payment
}
```

**UI:**

- Add "Create Payment Plan" button in PO detail view
- Dialog with form: amount, due date, priority, notes
- Show in "Pending Payments" section of PO

---

### Change 4: Add Payment Amount Auto-Sync on Order Update

**Priority:** LOW

**Implementation:**

```typescript
// src/stores/supplier_2/composables/usePurchaseOrders.ts

async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
  const oldOrder = getOrderById(id)
  const oldAmount = oldOrder?.totalAmount || 0

  const updatedOrder = await supplierStore.updateOrder(id, data)

  // NEW: Auto-sync payment amounts if changed
  if (updatedOrder.totalAmount !== oldAmount) {
    await syncPaymentAmountsForOrder(updatedOrder)
  }

  return updatedOrder
}

async function syncPaymentAmountsForOrder(order: PurchaseOrder): Promise<void> {
  const payments = await accountStore.getPaymentsByOrder(order.id)

  for (const payment of payments) {
    // Only sync pending payments with autoSyncEnabled
    if (payment.status !== 'pending') continue
    if (!payment.autoSyncEnabled) continue
    if (payment.sourceOrderId !== order.id) continue

    const newAmount = order.actualDeliveredAmount || order.totalAmount

    if (payment.amount !== newAmount) {
      await accountStore.updatePaymentAmount({
        paymentId: payment.id,
        newAmount: newAmount,
        reason: 'receipt_discrepancy',
        notes: `Auto-synced from order ${order.orderNumber} amount change`
      })

      // Update linked amount in linkedOrders
      const link = payment.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
      if (link) {
        link.linkedAmount = newAmount
        await accountStore.paymentService.update(payment.id, {
          linkedOrders: payment.linkedOrders
        })
      }
    }
  }
}
```

---

### Change 5: Add Cascade Update on Payment Cancel

**Priority:** LOW

**Implementation:**

```typescript
// src/stores/account/store.ts

async function cancelPayment(paymentId: string): Promise<void> {
  const payment = state.value.pendingPayments.find(p => p.id === paymentId)
  if (!payment) return

  // Deactivate all links
  const linkedOrderIds: string[] = []

  if (payment.linkedOrders) {
    for (const link of payment.linkedOrders) {
      if (link.isActive) {
        link.isActive = false
        link.unlinkedAt = new Date().toISOString()
        linkedOrderIds.push(link.orderId)
      }
    }
  }

  // Update payment status
  payment.status = 'cancelled'
  payment.updatedAt = new Date().toISOString()

  // Save to database
  await paymentService.update(paymentId, {
    status: 'cancelled',
    linkedOrders: payment.linkedOrders,
    updatedAt: payment.updatedAt
  })

  // Update all linked orders' bill_status
  for (const orderId of linkedOrderIds) {
    await updateOrderBillStatus(orderId)
  }
}
```

---

### Change 6: Add Validation Comments to Code

**Priority:** LOW

**Add comments explaining business rules:**

```typescript
// src/stores/account/store.ts:1101

async function linkPaymentToOrder(data: LinkPaymentToOrderDto) {
  // ✅ BUSINESS RULE: Pending payments CAN be linked before payment
  // This allows planning payment allocation in advance
  // When paid (status → 'completed'), links remain active

  // NOTE: Do NOT add validation preventing pending payment linking
  // This is intentional behavior for payment planning workflow

  const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)
  // ... rest of function
}
```

---

## Implementation Task List (ТЗ)

### Phase 1: Critical Fixes (High Priority)

#### Task 1.1: Add 'source' Field to pending_payments

**Цель:** Отличать POS платежи от Backoffice платежей в базе данных

**Шаги:**

1. [ ] Создать миграцию 114:

   - Добавить поле `source TEXT` с check constraint
   - Backfill существующих платежей (определить source по account type)
   - Создать индекс `idx_pending_payments_source`

2. [ ] Обновить TypeScript типы:

   - `src/stores/account/types.ts:151` - Добавить `source: 'backoffice' | 'pos' | 'automated'`

3. [ ] Обновить функции создания платежей:

   - `src/stores/account/store.ts:1908-2004` - `createSupplierExpenseWithPayment()` → `source: 'backoffice'`
   - `src/stores/pos/shifts/shiftsStore.ts:646-673` - POS creation → `source: 'pos'`

4. [ ] Упростить UI логику:

   - `src/stores/pos/shifts/composables/useExpenseLinking.ts:117-192` - Убрать сложную дедупликацию, использовать `source`

5. [ ] Протестировать:
   - Создать платеж из Backoffice → проверить source='backoffice'
   - Создать платеж из POS → проверить source='pos'
   - Проверить что старые платежи backfilled правильно

**Критерии приемки:**

- Все новые платежи имеют source
- UI показывает правильную иконку (POS/Backoffice)
- Deduplication работает без localStorage

---

#### Task 1.2: Fix Race Condition in Payment Creation

**Цель:** Предотвратить дублирование платежей при одновременном создании

**Шаги:**

1. [ ] Создать миграцию 115:

   - Добавить unique constraint на (counteragent_id, amount, DATE(created_at))
   - Только для completed supplier payments

2. [ ] Обновить код создания:

   - `src/stores/pos/shifts/shiftsStore.ts:649-673` - Обработать conflict ошибку, вернуть existing payment

3. [ ] Добавить retry logic:

   ```typescript
   try {
     const payment = await paymentService.createPayment(...)
   } catch (error) {
     if (error.code === '23505') { // Unique violation
       // Find and return existing payment
       const existing = await paymentService.findExisting(...)
       return existing
     }
     throw error
   }
   ```

4. [ ] Протестировать:
   - Симулировать одновременное создание двух платежей
   - Проверить что создается только один

**Критерии приемки:**

- Нет дублирующихся платежей при одновременном создании
- Retry logic работает корректно

---

### Phase 2: Feature Enhancements (Medium Priority)

#### Task 2.1: Implement Pending Payment Creation from PO

**Цель:** Добавить возможность создания плановых платежей из интерфейса Purchase Order

**Шаги:**

1. [ ] Создать функцию `createPaymentPlanForOrder()`:

   - Location: `src/stores/supplier_2/composables/usePurchaseOrders.ts`
   - Parameters: orderId, amount (optional), dueDate, priority, autoSync
   - Create pending payment with sourceOrderId and linkedOrders

2. [ ] Добавить UI в PO detail view:

   - Button "Create Payment Plan"
   - Dialog with form: amount (default order total), due date, priority, notes
   - Show created payment in "Pending Payments" section

3. [ ] Добавить auto-sync logic:

   - When order amount changes → update linked pending payment amount
   - Only if `autoSyncEnabled=true` and `status='pending'`

4. [ ] Протестировать:
   - Создать payment plan из PO
   - Изменить сумму заказа → проверить auto-update payment
   - Оплатить payment → проверить order bill_status

**Критерии приемки:**

- Можно создать pending payment из PO UI
- Payment auto-syncs при изменении order amount
- Bill_status updates correctly

---

#### Task 2.2: Add Payment Amount Auto-Sync

**Цель:** Автоматически обновлять сумму pending payment при изменении суммы заказа

**Шаги:**

1. [ ] Создать функцию `syncPaymentAmountsForOrder()`:

   - Location: `src/stores/supplier_2/composables/usePurchaseOrders.ts`
   - Called from `updateOrder()` when totalAmount changes
   - Only sync pending payments with autoSyncEnabled=true

2. [ ] Обновить `updateOrder()`:

   - Detect amount change
   - Call syncPaymentAmountsForOrder()

3. [ ] Добавить amount history tracking:

   - Использовать `amountHistory` field в PendingPayment
   - Record old/new amount, reason, timestamp

4. [ ] Протестировать:
   - Изменить order amount → проверить payment updated
   - Проверить amount history записана
   - Проверить что completed payments НЕ обновляются

**Критерии приемки:**

- Pending payments auto-sync when order changes
- Amount history tracked
- Completed payments not affected

---

### Phase 3: Data Cleanup (Low Priority)

#### Task 3.1: Add Cascade Update on Payment Cancel

**Цель:** При отмене платежа обновлять bill_status всех связанных заказов

**Шаги:**

1. [ ] Обновить `cancelPayment()`:

   - Deactivate all linkedOrders (set isActive=false)
   - Collect linkedOrderIds
   - Update order bill_status for each

2. [ ] Протестировать:
   - Отменить платеж → проверить все links deactivated
   - Проверить order bill_status updated

**Критерии приемки:**

- Cancelled payments don't affect bill_status
- Links properly deactivated

---

#### Task 3.2: Add Validation Comments

**Цель:** Документировать бизнес-правила в коде

**Шаги:**

1. [ ] Добавить комментарии в `linkPaymentToOrder()`:

   - Explain why pending payments can be linked
   - Explain planned allocation workflow

2. [ ] Добавить комментарии в `createSupplierExpenseWithPayment()`:

   - Explain why creates both Transaction and PendingPayment
   - Explain linking via related_payment_id

3. [ ] Добавить комментарии в `calculateBillStatus()`:
   - Explain bill_status logic
   - Explain difference between totalPaid and totalBilled

**Критерии приемки:**

- All major business rules commented
- New developers can understand payment flow

---

### Phase 4: Documentation (Low Priority)

#### Task 4.1: Update payments-system.md

**Цель:** Обновить документацию с правильной бизнес-логикой

**Шаги:**

1. [ ] Обновить `src/About/account/payments-system.md`:

   - Replace with this spec content
   - Add flow diagrams
   - Add code examples

2. [ ] Создать диаграммы:

   - Payment creation flows (3 scenarios)
   - Linking workflow
   - Bill_status calculation logic

3. [ ] Добавить troubleshooting section:
   - Common issues
   - Solutions
   - Migration notes

**Критерии приемки:**

- Documentation matches current implementation
- All flows documented with code references
- Troubleshooting guide complete

---

## Summary Statistics

**Files Analyzed:**

- `src/stores/account/store.ts` (2100 lines) - Core payment logic
- `src/stores/pos/shifts/shiftsStore.ts` (1820 lines) - POS payment creation
- `src/stores/pos/shifts/composables/useExpenseLinking.ts` (625 lines) - UI display logic
- `src/stores/supplier_2/composables/usePurchaseOrders.ts` (1290 lines) - PO payment integration
- `src/stores/account/types.ts` (342 lines) - Type definitions
- `src/About/account/payments-system.md` (1054 lines) - Existing docs (outdated)
- `src/supabase/migrations/113_link_existing_payments.sql` (309 lines) - Recent migration

**Functions Found:**

- `createSupplierExpenseWithPayment()` - Backoffice payment creation
- `createDirectExpense()` - POS payment creation
- `linkPaymentToOrder()` - Link payment to PO
- `unlinkPaymentFromOrder()` - Unlink payment from PO
- `calculateBillStatus()` - Calculate order bill status
- `updateOrderBillStatus()` - Update order after payment change
- `confirmPayment()` - Cashier confirmation
- `rejectPayment()` - Cashier rejection
- `processPayment()` - Execute pending payment

**Status Tracking:**

- Transaction: `completed | pending | cancelled`
- PendingPayment: `pending | completed | cancelled`
- Confirmation: `pending | confirmed | rejected`
- Bill Status: `not_billed | billed | partially_paid | fully_paid | overdue | overpaid`

**Problems Identified:** 6

- Critical: 3 (missing source field, race condition, missing validation)
- Medium: 2 (pending payment creation, amount auto-sync)
- Low: 1 (cascade update on cancel)

**Open Questions:** 3

- Can pending payments be linked? (User says YES)
- How should amount sync work? (Needs clarification)
- What happens on payment delete? (Needs implementation)

**Recommended Changes:** 6

- Phase 1 (Critical): 2 tasks
- Phase 2 (Features): 2 tasks
- Phase 3 (Cleanup): 2 tasks
- Phase 4 (Docs): 1 task

---

**END OF SPECIFICATION**
