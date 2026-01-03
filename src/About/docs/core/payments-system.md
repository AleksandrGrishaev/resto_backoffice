# Payments Management System

## Overview

The Payments Management system handles supplier payments across POS (Point of Sale) and Backoffice interfaces. It provides a unified workflow for tracking, linking, and processing payments to suppliers.

## Key Concepts

### Payment Sources

1. **POS Cashier Payments** - Created from cash register during shifts
2. **Backoffice Payments** - Created by managers from account operations
3. **Quick Receipt Payments** - Auto-created when receiving goods from suppliers

### Payment States

| State       | Description                                    |
| ----------- | ---------------------------------------------- |
| `pending`   | Payment awaits processing (from Quick Receipt) |
| `completed` | Payment has been made                          |
| `cancelled` | Payment was cancelled                          |

### Linking Status

| Status             | Description                              |
| ------------------ | ---------------------------------------- |
| `unlinked`         | Payment not linked to any Purchase Order |
| `partially_linked` | Some amount linked, some available       |
| `linked`           | Fully linked to Purchase Order(s)        |

## Data Flow Diagram

```
                          PAYMENT CREATION
                          ================

+-------------------+     +-------------------+     +-------------------+
|   POS Cashier     |     |   Backoffice      |     |   Quick Receipt   |
|   Expense Dialog  |     |   OperationDialog |     |   (Supplier)      |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         v                         v                         v
+--------+----------+     +--------+----------+     +--------+----------+
| ShiftExpense      |     | Transaction       |     | PendingPayment    |
| Operation         |     | + PendingPayment  |     | (status=pending)  |
| + PendingPayment  |     | (status=completed)|     |                   |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         +------------+------------+                         |
                      |                                      |
                      v                                      v
              +-------+-------+                      +-------+-------+
              | PaymentsView  |                      | PaymentsView  |
              | Unlinked Tab  |                      | Pending Tab   |
              +-------+-------+                      +-------+-------+
                      |                                      |
                      v                                      v
              +-------+-------+                      +-------+-------+
              | Link to       |                      | Confirm/Batch |
              | Purchase Order|                      | Payment       |
              +---------------+                      +---------------+
```

## Key Entities

### PendingPayment

Located in: `src/stores/account/types.ts`

```typescript
interface PendingPayment {
  id: string
  counteragentId: string // Supplier ID
  counteragentName: string // Supplier name (cached)
  amount: number
  description: string
  category: string // 'supplier' for supplier payments
  status: PaymentStatus // 'pending' | 'completed' | 'cancelled'
  priority: PaymentPriority // 'low' | 'medium' | 'high' | 'urgent'

  // Linking
  usedAmount?: number // How much already linked
  linkedOrders?: Array<{
    // Links to Purchase Orders
    orderId: string
    orderNumber?: string
    linkedAmount: number
    linkedAt: string
    isActive: boolean
  }>

  // Account assignment
  assignedToAccount?: string // Source account ID

  // Cashier confirmation (for cash accounts)
  requiresCashierConfirmation?: boolean
  confirmationStatus?: 'pending' | 'confirmed' | 'rejected'
}
```

### ShiftExpenseOperation

Located in: `src/stores/pos/shifts/types.ts`

```typescript
interface ShiftExpenseOperation {
  id: string
  shiftId: string
  type: ExpenseOperationType // 'direct_expense' | 'supplier_payment' | etc.
  amount: number
  description: string
  category?: string
  counteragentId?: string
  counteragentName?: string

  // Linking
  relatedPaymentId?: string // Link to PendingPayment
  relatedAccountId: string // Source account
  linkingStatus?: ExpenseLinkingStatus
  linkedOrderId?: string // Link to Purchase Order
  linkedAmount?: number
  unlinkedAmount?: number
}
```

## Workflows

### 1. POS Supplier Payment

**Flow:**

1. Cashier opens Expense Dialog during active shift
2. Selects "Supplier" category and picks supplier
3. Enters amount and description
4. System creates:
   - `ShiftExpenseOperation` (for shift tracking)
   - `PendingPayment` (status='completed', for linking)
5. Payment appears in PaymentsView > Unlinked tab
6. Manager links to Purchase Order(s)

**Files involved:**

- `src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue`
- `src/stores/pos/shifts/shiftsStore.ts` - `createDirectExpense()`

### 2. Backoffice Supplier Payment

**Flow:**

1. Manager opens OperationDialog from Accounts view
2. Selects "Expense" type and "Supplier" category
3. Picks supplier and enters amount
4. System creates:
   - `Transaction` (account debit)
   - `PendingPayment` (status='completed', for linking)
5. Payment appears in PaymentsView > Unlinked tab
6. Manager links to Purchase Order(s)

**Files involved:**

- `src/views/accounts/components/dialogs/OperationDialog.vue`
- `src/stores/account/store.ts` - `createSupplierExpenseWithPayment()`

### 3. Quick Receipt Payment

**Flow:**

1. Manager receives goods via Quick Receipt
2. System creates `PendingPayment` (status='pending')
3. Payment appears in PaymentsView > Pending tab
4. Manager confirms payment:
   - Selects source account
   - For cash accounts: creates cashier confirmation request
   - For other accounts: processes immediately
5. For linked orders, payment is automatically linked

**Files involved:**

- `src/stores/pos/receipts/composables/usePosReceipt.ts`
- `src/supabase/migrations/085_complete_receipt_rpc.sql`

### 4. Batch Payment

**Flow:**

1. Manager selects multiple pending payments
2. Clicks "Pay Selected" button
3. BatchPaymentDialog opens:
   - Enter total payment amount
   - Select source account
   - Click payments to allocate funds (sequential)
   - Or use "Auto (FIFO)" for automatic allocation
4. System processes all allocated payments

**Files involved:**

- `src/views/backoffice/accounts/payments/components/PendingPaymentsList.vue`
- `src/views/backoffice/accounts/payments/dialogs/BatchPaymentDialog.vue`

## Payment Linking

### Link Payment to Order

```typescript
// Located in src/stores/account/store.ts
async function linkPaymentToOrder(data: LinkPaymentToOrderDto): Promise<void> {
  // Updates payment.linkedOrders array
  // Updates payment.usedAmount
  // Updates expense linkingStatus (if from shift)
}
```

### Link Payment to Multiple Orders

```typescript
// Located in src/stores/pos/shifts/composables/useExpenseLinking.ts
async function linkExpenseToMultipleInvoices(
  expense: ShiftExpenseOperation,
  links: Array<{ invoice: InvoiceSuggestion; allocatedAmount: number }>,
  performedBy: { id: string; name: string }
): Promise<{ success: boolean; linkedCount: number }>
```

**UI Flow (Sequential Allocation):**

1. User clicks "Link" button on an unlinked expense
2. LinkExpenseDialog shows available amount and list of matching invoices
3. User clicks invoices one by one to allocate funds:
   - Each click allocates min(remaining, invoice_unpaid) amount
   - Click again to deallocate (toggle)
4. "Auto (Best Match)" button allocates by match score + FIFO
5. Confirm processes all allocations

### Unlink Payment from Order

```typescript
async function unlinkPaymentFromOrder(paymentId: string, orderId: string): Promise<void> {
  // Sets linkedOrders[].isActive = false
  // Recalculates usedAmount
  // Updates expense linkingStatus
}
```

## UI Components

### PaymentsView

Location: `src/views/backoffice/accounts/payments/PaymentsView.vue`

**Tabs:**

1. **Pending** - Payments awaiting confirmation
2. **Unlinked** - Completed payments needing PO linking
3. **History** - Fully linked payments

### Key Components

| Component              | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `PendingPaymentsList`  | List with multi-select for batch operations |
| `UnlinkedExpensesList` | List with account filter and source badge   |
| `PaymentHistoryList`   | Read-only list of linked payments           |
| `ConfirmPaymentDialog` | Single payment confirmation                 |
| `BatchPaymentDialog`   | Multi-payment allocation                    |
| `LinkExpenseDialog`    | Link payment to Purchase Order(s)           |

## Database Schema

### pending_payments Table

```sql
CREATE TABLE pending_payments (
  id TEXT PRIMARY KEY,
  counteragent_id TEXT REFERENCES counteragents(id),
  counteragent_name TEXT,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',      -- pending, completed, cancelled
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'supplier',

  -- Linking
  linked_orders JSONB,                -- Array of order links
  used_amount NUMERIC DEFAULT 0,
  source_order_id TEXT,               -- For auto-sync

  -- Account assignment
  assigned_to_account TEXT REFERENCES accounts(id),

  -- Cashier confirmation
  requires_cashier_confirmation BOOLEAN DEFAULT false,
  confirmation_status TEXT,           -- pending, confirmed, rejected
  confirmed_by JSONB,
  confirmed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by JSONB
);
```

## API Reference

### Account Store Methods

```typescript
// Create supplier expense with payment tracking
createSupplierExpenseWithPayment(data: CreateOperationDto): Promise<{
  transaction: Transaction
  payment: PendingPayment
}>

// Process payment (debit account)
processPayment(data: ProcessPaymentDto): Promise<string>

// Link payment to order
linkPaymentToOrder(data: LinkPaymentToOrderDto): Promise<void>

// Unlink payment from order
unlinkPaymentFromOrder(paymentId: string, orderId: string): Promise<void>

// Assign payment to account (for confirmation)
assignPaymentToAccount(paymentId: string, accountId: string): Promise<void>
```

### useExpenseLinking Composable

Location: `src/stores/pos/shifts/composables/useExpenseLinking.ts`

```typescript
function useExpenseLinking() {
  // Computed
  unlinkedExpenses: ExpenseWithSource[]   // All unlinked (POS + Backoffice)
  linkedExpenses: ExpenseWithSource[]      // All fully linked
  totalUnlinkedAmount: number

  // Methods
  getInvoiceSuggestions(expense): InvoiceSuggestion[]
  linkExpenseToInvoice(expense, invoice, amount, performer): Promise<Result>
  unlinkExpenseFromInvoice(expense, reason, performer): Promise<Result>
}
```

## Best Practices

1. **Always create PendingPayment for supplier expenses** - Ensures tracking and linking capability
2. **Use account type check, not ID** - Cash account detection should use `type === 'cash'`
3. **Refresh data after batch operations** - Call `fetchPayments(true)` to bypass cache
4. **Check linking status before allowing payment** - Prevent double payments
5. **Use FIFO for auto-allocation** - Pays oldest invoices first

## Troubleshooting

### Payment not appearing in Unlinked tab

1. Check if `category === 'supplier'`
2. Check if `status === 'completed'`
3. Verify `linkedOrders` has unlinked amount

### Cashier confirmation not triggered

1. Verify account type is 'cash'
2. Check `requiresCashierConfirmation` flag
3. Confirm `confirmationStatus === 'pending'`

### Linking not updating order status

1. Check `usePurchaseOrders().updateOrderBillStatus()`
2. Verify `linkedOrders[].isActive === true`
3. Confirm `linkedAmount` is correct
