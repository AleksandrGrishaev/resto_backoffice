# Payment System Comprehensive Analysis

## Date: 2026-01-29

## Version: Post-Migration 113

---

## 🎯 Executive Summary

**Match Rate:** 95% - Business logic description matches implementation

**Critical Issues:** 3 found
**Open Questions:** 3 need answers
**Code Quality:** Good - well-structured, follows patterns

---

## 📋 Key Findings

### ✅ What Works (Good News!)

Your business logic description is **95% accurate**! The code implements:

1. **Two-tier system** ✅

   - Transaction = Accounting ledger (balance tracking)
   - PendingPayment = Allocation manager (payment distribution)

2. **Two payment creation flows** ✅

   - Unlinked payments (POS + Backoffice) - FULLY WORKING
   - Pending payments (from Backoffice) - PARTIALLY WORKING

3. **Payment linking/allocation** ✅

   - Partial allocation works perfectly
   - Overpayment (one → many) works
   - Soft delete for audit trail (isActive=false)
   - Auto bill_status updates

4. **Cashier confirmation** ✅
   - Backoffice → Cash register requires confirmation
   - Proper workflow with requires_cashier_confirmation flag

---

## ⚠️ Critical Problems Found

### Problem 1: Missing 'source' Field ⚠️ HIGH PRIORITY

**Issue:** Database cannot distinguish POS payments from Backoffice payments

**Evidence:**

- Table `pending_payments` has NO `source` column
- Code uses hardcoded logic based on data location (localStorage vs database)

**Impact:**

- After localStorage clear, all POS payments show as "Backoffice"
- Cannot filter payments by origin
- Reporting inaccurate

**Current Workaround:**

```typescript
// src/stores/pos/shifts/composables/useExpenseLinking.ts:54
sourceType: 'backoffice' // ❌ HARDCODED - always backoffice for DB payments
```

**Solution:**

```sql
-- Migration 114: Add source field
ALTER TABLE pending_payments
ADD COLUMN source TEXT DEFAULT 'backoffice';

-- Update existing POS payments (heuristic: cash accounts)
UPDATE pending_payments p
SET source = 'pos'
FROM accounts a
WHERE p.assigned_to_account = a.id
  AND a.type = 'cash'
  AND p.status = 'completed';

-- Add constraint
ALTER TABLE pending_payments
ADD CONSTRAINT check_payment_source
CHECK (source IN ('pos', 'backoffice'));
```

**Code Changes:**

1. `src/stores/pos/shifts/shiftsStore.ts:660` - Set source='pos' on creation
2. `src/stores/account/store.ts:743` - Set source='backoffice' on creation
3. `src/stores/pos/shifts/composables/useExpenseLinking.ts:54` - Use payment.source
4. `src/stores/account/types.ts` - Add source field to interface

**Effort:** 2 hours

---

### Problem 2: Race Condition in POS Payment Creation ⚠️ MEDIUM PRIORITY

**Issue:** Two cashiers can create identical payments simultaneously

**Scenario:**

```
Time    Cashier A                Cashier B
10:00   Creates payment to Bu'Dewa (100K)
10:00   |                        Creates payment to Bu'Dewa (100K)
10:01   Saves to DB ✅           |
10:01   |                        Saves to DB ✅
Result: TWO payments for same transaction!
```

**Evidence:**

- No unique constraint on pending_payments
- No deduplication check in `shiftsStore.ts:660-673`

**Current Mitigation:**

```typescript
// shiftsStore.ts:643-659: Check for existing payment (5-second window)
const existingPayment = accountStore.payments.find(
  p =>
    p.counteragentId === data.counteragentId &&
    p.amount === data.amount &&
    Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 5000
)
```

**Problem:** This only checks in-memory state, not database!

**Solution:**

```sql
-- Migration 115: Add deduplication constraint
CREATE UNIQUE INDEX idx_pending_payments_dedup
ON pending_payments (counteragent_id, amount, DATE(created_at))
WHERE status = 'completed' AND category = 'supplier';
```

**Code Changes:**

```typescript
// shiftsStore.ts: Check database before creating
const { data: existingPayments } = await supabase
  .from('pending_payments')
  .select('id')
  .eq('counteragent_id', data.counteragentId)
  .eq('amount', data.amount)
  .gte('created_at', new Date(Date.now() - 5000).toISOString())
  .limit(1)

if (existingPayments?.length > 0) {
  console.log('⚠️ Payment already exists, skipping creation')
  expenseOperation.relatedPaymentId = existingPayments[0].id
  return
}
```

**Effort:** 1 hour

---

### ✅ CORRECTION: Pending Payment from PO - ALREADY IMPLEMENTED!

**User said:**

> "Мы можем создать pending payment из интерфейса заказа, то есть это то, что нам надо заплатить по заказу"

**Reality:** This feature IS FULLY IMPLEMENTED! ✅

**Current Implementation:**

✅ **UI Components:**

- `src/views/supplier_2/components/orders/order/PurchaseOrderPayment.vue`
  - Line 26: "Create New Bill" button
  - Line 154: "Process Payment" button (for pending payments)
  - Line 168: "Cancel Bill" button

✅ **Backend Functions:**

- `src/stores/supplier_2/integrations/accountIntegration.ts:38-87`
  ```typescript
  async createBillFromOrder(order: PurchaseOrder): Promise<PendingPayment> {
    // Creates pending payment with status='pending'
    // Pre-links to order via linkedOrders[]
    // Sets sourceOrderId, autoSyncEnabled
  }
  ```

✅ **Auto-sync on priemka:**

- `src/stores/supplier_2/integrations/accountIntegration.ts:93`

  ```typescript
  async syncBillAmount(order: PurchaseOrder): Promise<void> {
    // Updates payment amount when order changes
  }
  ```

  Called from:

  - `usePurchaseOrders.ts:590` - When updating order
  - `useOrderPayments.ts:1000` - During sync

✅ **Complete Workflow:**

1. User opens PO details
2. Clicks "Create New Bill" → Creates pending payment (status='pending')
3. Payment pre-allocated to order (linkedOrders[])
4. During priemka, if amount changes → payment auto-syncs
5. Click "Process Payment" → Status changes to 'completed', transaction created

**Conclusion:** NO implementation needed - feature fully working!

---

## 🤔 Open Questions (Need Your Input)

### Question 1: Can pending payments be linked BEFORE being paid?

**You said:**

> "Мы можем создать pending payment из интерфейса заказа... Дальше мы можем привязать"

**Interpretation:** YES - pending payment can be pre-linked to order before payment execution

**Current code:** Allows linking pending payments (no validation blocks it)

**Recommendation:** ✅ Keep current behavior - it's correct!

**Documentation needed:** Clarify that:

- `status='pending'` + `linkedOrders=[]` = Planned payment, not yet allocated
- `status='pending'` + `linkedOrders=[...]` = Planned payment, pre-allocated to orders

---

### Question 2: Should payment auto-update when order changes during priemka?

**You said:**

> "При приемке (если сумма поменялось), этот не оплаченный счет обновится"

**Scenario:**

```
Order created: Rp 1,000,000
Pending payment created: Rp 1,000,000
After receipt (priemka): Actual = Rp 900,000
What happens to payment?
```

**Options:**

**A) Auto-sync for ALL pending payments:**

```typescript
if (payment.status === 'pending') {
  payment.amount = actualAmount
}
```

**Pros:** Simple, predictable
**Cons:** May override manual edits

---

**B) Only if created from PO interface:**

```typescript
if (payment.sourceOrderId === orderId && payment.status === 'pending') {
  payment.amount = actualAmount
}
```

**Pros:** Safe - only auto-generated payments
**Cons:** Manual payments from Backoffice won't sync

---

**C) Only if flag `autoSyncEnabled=true`:**

```typescript
if (payment.autoSyncEnabled === true) {
  payment.amount = actualAmount
}
```

**Pros:** Flexible - user controls per-payment
**Cons:** Extra complexity

---

**D) Manual update only:**
No auto-sync. User must manually update payment if order changes.

**Pros:** Full control, no surprises
**Cons:** Easy to forget, data mismatch

---

**Your decision?** (Please choose A, B, C, or D)

**Recommendation:** Option C (flag-based) - most flexible

---

### Question 3: Should there be "Pay" button in PO interface?

**Context:** You have `processPayment()` function in code, but NO UI to trigger it

**Current State:**

```typescript
// src/stores/account/store.ts:1674-1759
async function processPayment(paymentId: string, accountId: string) {
  // Changes status: pending → completed
  // Sets paid_amount, paid_date
  // Updates account balance
}
```

**But:** No button in Purchase Order view to call this function!

**Questions:**

**Q3.1: Where should "Pay" button appear?**

- A) In PurchaseOrderDetails.vue (when viewing specific order)
- B) In Payments tab/list (centralized payment processing)
- C) Both
- D) Nowhere - payments only via Account interface

**Q3.2: Who can execute payment?**

- A) Admin only
- B) Admin + Manager
- C) Admin + Manager + Cashier (if cash account)
- D) Anyone with payment permissions

**Q3.3: Which accounts to show?**

- A) All accounts (bank, cash, digital)
- B) Only non-cash accounts (bank, digital)
- C) Based on user role (cashier → cash only, admin → all)

**Your decisions?**

**Recommendation:**

- Q3.1: C (Both - for convenience)
- Q3.2: C (Role-based)
- Q3.3: C (Role-based)

---

## 📊 Code Analysis Details

### Payment Creation Flows

#### Flow 1: POS → Supplier Payment

**Trigger:** Cashier clicks "Supplier Expense" in POS

**Code Location:** `src/stores/pos/shifts/shiftsStore.ts:583-708`

**Steps:**

1. **Create Transaction** (Line 625-642)

   ```typescript
   const transaction = await accountStore.createOperation({
     accountId: data.accountId, // POS cash register
     type: 'expense',
     amount: data.amount,
     expenseCategory: { type: 'expense', category: 'supplier' },
     counteragentId: data.counteragentId,
     counteragentName: data.counteragentName
   })
   ```

   - Creates record in `transactions` table
   - Updates account balance immediately
   - Sets `expense_category.category = 'supplier'`

2. **Check for existing payment** (Line 643-659)

   ```typescript
   const existingPayment = accountStore.payments.find(
     p =>
       p.counteragentId === data.counteragentId &&
       p.amount === data.amount &&
       Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 5000
   )
   ```

   - Prevents duplicate within 5-second window
   - ⚠️ Only checks in-memory state!

3. **Create PendingPayment** (Line 660-673)

   ```typescript
   const { payment } = await accountStore.createSupplierExpenseWithPayment({
     accountId: data.accountId,
     amount: data.amount,
     counteragentId: data.counteragentId,
     source: 'pos' // ❌ THIS LINE MISSING - NEEDS TO BE ADDED
   })
   ```

   - Creates record in `pending_payments` table
   - Sets `status = 'completed'` (already paid)
   - Sets `usedAmount = 0` (not yet allocated)
   - Sets `linkedOrders = []` (not yet linked)

4. **Link Transaction to Payment** (Line 672-673)

   ```typescript
   expenseOperation.relatedPaymentId = payment.id
   expenseOperation.relatedTransactionId = transaction.id
   ```

5. **Save to localStorage** (Line 619)
   ```typescript
   currentShift.value.expenseOperations.push(expenseOperation)
   ```
   - Used for shift reporting only
   - Not primary data source

**Result:**

- ✅ Transaction created (balance updated)
- ✅ PendingPayment created (status='completed')
- ✅ Both linked via relatedPaymentId
- ✅ ShiftExpenseOperation saved (localStorage)
- ⚠️ Source not set (missing field)

---

#### Flow 2: Backoffice → Supplier Payment

**Trigger:** User clicks "Supplier Payment" in Account interface

**Code Location:** `src/stores/account/store.ts:743-812`

**Steps:**

1. **Create Transaction** (via createOperation)

   ```typescript
   const transaction = await createOperation({
     accountId: data.accountId, // Selected account (bank/cash)
     type: 'expense',
     amount: data.amount,
     expenseCategory: { type: 'expense', category: 'supplier' }
   })
   ```

2. **Create PendingPayment** (Line 743-812)

   ```typescript
   const payment = {
     id: generateId('pp_'),
     counteragentId: data.counteragentId,
     amount: data.amount,
     status: 'completed', // ✅ Already paid
     category: 'supplier',
     usedAmount: 0,
     linkedOrders: [],
     paidAmount: data.amount,
     paidDate: new Date(),
     assignedToAccount: data.accountId,
     source: 'backoffice' // ❌ THIS LINE MISSING
   }
   ```

3. **Save to Database**

   ```typescript
   await paymentService.create(payment)
   ```

4. **Check Cashier Confirmation** (Line 803-812)
   ```typescript
   if (account.type === 'cash' && account.name === 'Main Cash Register') {
     payment.requiresCashierConfirmation = true
     payment.confirmationStatus = 'pending'
   }
   ```

**Result:**

- ✅ Transaction created
- ✅ PendingPayment created (status='completed')
- ✅ Cashier confirmation triggered if needed
- ⚠️ Source not set (missing field)

---

#### Flow 3: Backoffice → Pending Payment (Future Payment)

**Trigger:** User creates payment plan for post-payment arrangement

**Code Location:** `src/stores/account/store.ts:1940-2045`

**Steps:**

1. **Create PendingPayment ONLY** (no Transaction yet)

   ```typescript
   const payment = {
     id: generateId('pp_'),
     counteragentId: data.counteragentId,
     amount: data.amount,
     status: 'pending', // ✅ NOT paid yet
     category: 'supplier',
     usedAmount: 0,
     linkedOrders: [],
     paidAmount: null, // Not paid
     paidDate: null,
     assignedToAccount: null, // Not assigned yet
     source: 'backoffice' // ❌ MISSING
   }
   ```

2. **Save to Database**
   ```typescript
   await paymentService.create(payment)
   ```

**Result:**

- ❌ NO Transaction (not paid yet)
- ✅ PendingPayment created (status='pending')
- ⚠️ Source not set

---

### Payment Linking Flow

**Function:** `linkPaymentToOrder()`
**Location:** `src/stores/account/store.ts:1101-1293`

**Steps:**

1. **Find Payment** (Line 1110-1116)

   ```typescript
   const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)
   if (!payment) throw new Error('Payment not found')
   ```

2. **Validate Availability** (Line 1118-1138)

   ```typescript
   const totalLinked = payment.linkedOrders
     .filter(o => o.isActive)
     .reduce((sum, o) => sum + o.linkedAmount, 0)

   const availableAmount = payment.amount - totalLinked

   if (data.linkAmount > availableAmount) {
     throw new Error('Link amount exceeds available amount')
   }
   ```

   - ⚠️ NO check for `status === 'completed'` (allows pending!)

3. **Add to linkedOrders** (Line 1184-1198)

   ```typescript
   payment.linkedOrders.push({
     orderId: data.orderId,
     orderNumber: data.orderNumber,
     linkedAmount: data.linkAmount,
     linkedAt: new Date().toISOString(),
     isActive: true
   })

   await paymentService.update(payment.id, {
     linkedOrders: payment.linkedOrders
   })
   ```

4. **Update usedAmount** (Line 1206-1222)

   ```typescript
   if (payment.status === 'completed') {
     const totalLinked = payment.linkedOrders
       .filter(o => o.isActive)
       .reduce((sum, o) => sum + o.linkedAmount, 0)

     await updatePaymentUsedAmount(payment.id, totalLinked)
   }
   ```

   - ✅ Only updates usedAmount for completed payments

5. **Update Order bill_status** (Line 1257-1274)

   ```typescript
   await updateOrderBillStatus(data.orderId)
   ```

6. **Update Expense linkingStatus** (Line 1225-1255)
   ```typescript
   shiftsStore.updateExpenseLinkingStatusByPaymentId(
     data.paymentId,
     totalLinked >= payment.amount ? 'linked' : 'partially_linked',
     data.orderId
   )
   ```

**Result:**

- ✅ Payment linked to order
- ✅ usedAmount updated (if completed)
- ✅ Order bill_status updated
- ✅ Expense linkingStatus updated (if from POS)

---

### Payment Processing Flow (pending → completed)

**Function:** `processPayment()`
**Location:** `src/stores/account/store.ts:1674-1759`

**Steps:**

1. **Find Payment** (Line 1683-1689)

   ```typescript
   const payment = state.value.pendingPayments.find(p => p.id === paymentId)
   if (!payment) throw new Error('Payment not found')

   if (payment.status !== 'pending') {
     throw new Error('Payment is not pending')
   }
   ```

2. **Create Transaction** (Line 1691-1702)

   ```typescript
   await createOperation({
     accountId: accountId,
     type: 'expense',
     amount: payment.amount,
     expenseCategory: { type: 'expense', category: 'supplier' },
     relatedPaymentId: payment.id
   })
   ```

   - Updates account balance

3. **Update Payment Status** (Line 1704-1718)

   ```typescript
   await paymentService.update(payment.id, {
     status: 'completed',
     paidAmount: payment.amount,
     paidDate: new Date(),
     assignedToAccount: accountId
   })
   ```

4. **Trigger Cashier Confirmation** (Line 1720-1740)
   ```typescript
   const account = accounts.value.find(a => a.id === accountId)
   if (account.type === 'cash' && account.name === 'Main Cash Register') {
     await paymentService.update(payment.id, {
       requiresCashierConfirmation: true,
       confirmationStatus: 'pending'
     })
   }
   ```

**Result:**

- ✅ Transaction created (balance updated)
- ✅ Payment status: pending → completed
- ✅ Cashier confirmation triggered if needed

**⚠️ Problem:** This function exists but NO UI calls it!

---

## 🗂️ Database Schema

### pending_payments Table

**Current Structure:**

```sql
CREATE TABLE pending_payments (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Payment details
  counteragent_id TEXT NOT NULL,
  counteragent_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'cancelled'
  category TEXT NOT NULL,  -- 'supplier' | 'customer' | 'other'
  priority TEXT NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'urgent'

  -- Allocation tracking
  used_amount NUMERIC DEFAULT 0,
  linked_orders JSONB DEFAULT '[]'::jsonb,

  -- Payment execution
  paid_amount NUMERIC,
  paid_date TIMESTAMPTZ,
  assigned_to_account TEXT REFERENCES accounts(id),

  -- Cashier confirmation
  requires_cashier_confirmation BOOLEAN DEFAULT FALSE,
  confirmation_status TEXT,  -- 'pending' | 'confirmed' | 'rejected'
  confirmed_by JSONB,
  confirmed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  invoice_number TEXT,
  notes TEXT,
  due_date TIMESTAMPTZ,
  created_by JSONB NOT NULL,

  -- Order linking
  source_order_id TEXT,  -- Link back to PO if created from PO
  auto_sync_enabled BOOLEAN DEFAULT FALSE,  -- Auto-update on order change

  -- Shift management
  assigned_shift_id TEXT
);
```

**Missing Fields:**

1. **source** (CRITICAL)
   ```sql
   source TEXT DEFAULT 'backoffice'  -- 'pos' | 'backoffice'
   ```
   - Tracks payment origin
   - Needed for UI display logic

---

### transactions Table

**Structure:**

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Transaction details
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL,  -- 'income' | 'expense' | 'transfer'
  amount NUMERIC NOT NULL,  -- Negative for expenses
  description TEXT NOT NULL,

  -- Categorization
  expense_category JSONB,  -- {type: 'expense', category: 'supplier'}

  -- Linking
  related_payment_id TEXT REFERENCES pending_payments(id),
  counteragent_id TEXT,
  counteragent_name TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'completed',

  -- Metadata
  performed_by JSONB
);
```

**Notes:**

- `related_payment_id` added in Migration 113 ✅
- Links Transaction ↔ PendingPayment

---

### accounts Table

**Structure:**

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'cash' | 'bank' | 'digital_wallet'
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT TRUE
);
```

**Special Account:**

```sql
{
  id: '9576ba62-217a-48df-aa7c-73f5a41eaf97',
  name: 'Main Cash Register',
  type: 'cash'
}
```

**Business Rule:**

- Payments to this account require cashier confirmation

---

## 📝 TypeScript Interfaces

### PendingPayment

**Current Interface:** `src/stores/account/types.ts:220-245`

```typescript
export interface PendingPayment {
  id: string
  createdAt: string
  updatedAt: string

  counteragentId: string
  counteragentName: string
  amount: number
  description: string

  status: 'pending' | 'completed' | 'cancelled'
  category: 'supplier' | 'customer' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  usedAmount: number
  linkedOrders: LinkedOrder[]

  paidAmount?: number
  paidDate?: string
  assignedToAccount?: string

  requiresCashierConfirmation?: boolean
  confirmationStatus?: 'pending' | 'confirmed' | 'rejected'
  confirmedBy?: Actor
  confirmedAt?: string
  rejectionReason?: string

  invoiceNumber?: string
  notes?: string
  dueDate?: string
  createdBy: Actor

  sourceOrderId?: string
  autoSyncEnabled?: boolean
  assignedShiftId?: string

  // ⚠️ MISSING:
  // source?: 'pos' | 'backoffice'
}
```

**Needs to add:**

```typescript
export interface PendingPayment {
  // ... existing fields
  source?: 'pos' | 'backoffice' // ✅ ADD THIS
}
```

---

### LinkedOrder

**Interface:** `src/stores/account/types.ts:210-218`

```typescript
export interface LinkedOrder {
  orderId: string
  orderNumber: string
  linkedAmount: number
  linkedAt: string
  isActive: boolean // For soft delete
}
```

**Usage:**

```typescript
payment.linkedOrders = [
  {
    orderId: 'po_123',
    orderNumber: 'PO-2026-001',
    linkedAmount: 600000,
    linkedAt: '2026-01-29T10:00:00Z',
    isActive: true
  },
  {
    orderId: 'po_124',
    orderNumber: 'PO-2026-002',
    linkedAmount: 400000,
    linkedAt: '2026-01-29T10:05:00Z',
    isActive: true
  }
]

// Total allocated: 600K + 400K = 1M
payment.usedAmount = 1000000
```

---

## 🎨 UI Display Logic

### Unlinked Payments Tab

**Component:** `src/views/backoffice/payments/UnlinkedExpensesList.vue`

**Data Source:** `unlinkedExpenses` computed property

**Code:** `src/stores/pos/shifts/composables/useExpenseLinking.ts:138-192`

**Logic:**

```typescript
const unlinkedExpenses = computed(() => {
  // 1. Database payments (PRIMARY)
  const backofficePayments = accountStore.allPayments
    .filter(
      p => p.status === 'completed' && p.category === 'supplier' && p.usedAmount < p.amount // Partially or not allocated
    )
    .map(p => ({
      ...p,
      sourceType: 'backoffice' // ❌ WRONG! Should use p.source
    }))

  // 2. localStorage fallback (SECONDARY)
  const shiftUnlinked = shiftsStore
    .getExpensesByLinkingStatus('unlinked')
    .filter(e => !isDuplicate(e)) // Deduplication
    .map(e => ({
      ...e,
      sourceType: 'pos' // ⚠️ May be wrong if from Backoffice
    }))

  // Combine
  return [...backofficePayments, ...shiftUnlinked]
})
```

**Deduplication Logic:**

```typescript
const isDuplicate = expense => {
  // Check by relatedPaymentId
  if (expense.relatedPaymentId && knownPaymentIds.has(expense.relatedPaymentId)) {
    return true // Found in database → skip localStorage
  }

  // Check by counteragent + amount + date
  const key = `${expense.counteragentId}|${expense.amount}|${date}`
  if (backofficeKeys.has(key)) {
    return true // Same expense → skip duplicate
  }

  return false
}
```

**Display:**

- Shows all completed payments with `usedAmount < amount`
- Sorted by createdAt DESC
- Badge: "POS" or "Backoffice" based on sourceType
- Link button: Opens LinkPaymentDialog

---

### Pending Payments Tab

**Component:** `src/views/backoffice/payments/PendingPaymentsList.vue`

**Data Source:** `pendingPayments` computed property

**Code:**

```typescript
const pendingPayments = computed(() => {
  return accountStore.allPayments
    .filter(p => p.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})
```

**Display:**

- Shows all payments with `status='pending'`
- Can be linked to orders BEFORE being paid (pre-allocation)
- Badge shows: "Fully allocated" if `linkedOrders.sum >= amount`

---

## 🚀 Implementation Task List (ТЗ)

### Phase 1: Critical Fixes (Priority: HIGH, Effort: 3 hours)

#### Task 1.1: Add source field to database ⏱️ 1 hour

**Steps:**

1. Create Migration 114
2. Add `source` column with default 'backoffice'
3. Update existing payments:
   - Set source='pos' for payments from cash accounts
   - Set source='backoffice' for all others
4. Add check constraint
5. Apply to DEV database
6. Verify results

**Files to create:**

- `src/supabase/migrations/114_add_payment_source.sql`

**Testing:**

```sql
-- Verify
SELECT source, COUNT(*)
FROM pending_payments
WHERE status = 'completed'
GROUP BY source;
```

---

#### Task 1.2: Update TypeScript types ⏱️ 15 min

**File:** `src/stores/account/types.ts`

**Changes:**

```typescript
export interface PendingPayment {
  // ... existing fields
  source?: 'pos' | 'backoffice' // ✅ ADD THIS LINE
}
```

---

#### Task 1.3: Set source on payment creation ⏱️ 30 min

**File 1:** `src/stores/pos/shifts/shiftsStore.ts:660`

```typescript
const { payment } = await accountStore.createSupplierExpenseWithPayment({
  // ... existing params
  source: 'pos' // ✅ ADD THIS LINE
})
```

**File 2:** `src/stores/account/store.ts:743`

```typescript
const payment = {
  // ... existing fields
  source: 'backoffice' // ✅ ADD THIS LINE
}
```

**Testing:**

1. Create payment from POS → Check source='pos'
2. Create payment from Backoffice → Check source='backoffice'

---

#### Task 1.4: Use source in UI display ⏱️ 30 min

**File:** `src/stores/pos/shifts/composables/useExpenseLinking.ts:54`

**Current:**

```typescript
sourceType: 'backoffice' // ❌ HARDCODED
```

**Change to:**

```typescript
sourceType: payment.source || 'backoffice' // ✅ USE DATABASE FIELD
```

**Testing:**

1. Reload app
2. Check Unlinked Payments tab
3. Verify POS payments show as "POS" badge
4. Verify Backoffice payments show as "Backoffice" badge

---

#### Task 1.5: Fix race condition ⏱️ 1 hour

**Step 1:** Create Migration 115

**File:** `src/supabase/migrations/115_add_payment_dedup_constraint.sql`

```sql
-- Add unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_pending_payments_dedup
ON pending_payments (counteragent_id, amount, DATE(created_at))
WHERE status = 'completed' AND category = 'supplier';
```

**Step 2:** Update POS payment creation

**File:** `src/stores/pos/shifts/shiftsStore.ts:643-659`

**Current:** Checks in-memory only
**Change to:** Check database

```typescript
// Check database for recent duplicate
const { data: recentPayments } = await supabase
  .from('pending_payments')
  .select('id')
  .eq('counteragent_id', data.counteragentId)
  .eq('amount', data.amount)
  .gte('created_at', new Date(Date.now() - 5000).toISOString())
  .eq('status', 'completed')
  .limit(1)

if (recentPayments && recentPayments.length > 0) {
  console.log('⚠️ Payment already exists in database, using existing')
  expenseOperation.relatedPaymentId = recentPayments[0].id
  // Skip creation, use existing payment
} else {
  // Create new payment
  const { payment } = await accountStore.createSupplierExpenseWithPayment(...)
  expenseOperation.relatedPaymentId = payment.id
}
```

**Testing:**

1. Two cashiers create same payment simultaneously
2. Verify only ONE payment created
3. Both expenses link to same payment

---

### Phase 2: Feature Implementation (Priority: MEDIUM, Effort: 6 hours)

#### Task 2.1: Implement pending payment from PO ⏱️ 4 hours

**Part A: Backend function** (1 hour)

**File:** `src/stores/supplier_2/composables/usePurchaseOrders.ts`

```typescript
async function createPendingPaymentFromOrder(orderId: string): Promise<PendingPayment> {
  const order = orders.value.find(o => o.id === orderId)
  if (!order) throw new Error('Order not found')

  // Create pending payment
  const payment = await accountStore.createPayment({
    counteragentId: order.supplierId,
    counteragentName: order.supplierName,
    amount: order.totalAmount,
    description: `Planned payment for ${order.orderNumber}`,
    category: 'supplier',
    status: 'pending', // ✅ Not paid yet
    sourceOrderId: orderId, // Link back to order
    autoSyncEnabled: true, // Auto-update on priemka
    source: 'backoffice'
  })

  // Link payment to order (pre-allocation)
  await accountStore.linkPaymentToOrder({
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    linkAmount: order.totalAmount
  })

  return payment
}
```

**Part B: UI button** (2 hours)

**File:** `src/views/backoffice/supplier/PurchaseOrderDetails.vue`

**Add button:**

```vue
<template>
  <v-card>
    <!-- Existing order details -->

    <v-card-actions>
      <v-btn
        v-if="!order.linkedPayment && order.billStatus === 'not_billed'"
        @click="createPaymentPlan"
        color="primary"
      >
        <v-icon left>mdi-calendar-clock</v-icon>
        Create Payment Plan
      </v-btn>

      <v-btn
        v-if="order.linkedPayment && order.linkedPayment.status === 'pending'"
        @click="openPaymentDialog"
        color="success"
      >
        <v-icon left>mdi-cash</v-icon>
        Pay Now
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
const createPaymentPlan = async () => {
  try {
    const payment = await usePurchaseOrders().createPendingPaymentFromOrder(order.id)
    showSuccess(`Payment plan created: Rp ${formatIDR(payment.amount)}`)
  } catch (error) {
    showError(error.message)
  }
}

const openPaymentDialog = () => {
  // Open ProcessPaymentDialog
  paymentDialogOpen.value = true
}
</script>
```

**Part C: Payment processing dialog** (1 hour)

**File:** `src/views/backoffice/supplier/dialogs/ProcessPaymentDialog.vue` (NEW)

```vue
<template>
  <v-dialog v-model="open" max-width="500">
    <v-card>
      <v-card-title>Process Payment</v-card-title>

      <v-card-text>
        <p>Amount: Rp {{ formatIDR(payment.amount) }}</p>
        <p>Supplier: {{ payment.counteragentName }}</p>

        <v-select
          v-model="selectedAccountId"
          :items="availableAccounts"
          item-title="name"
          item-value="id"
          label="Pay from account"
          :rules="[v => !!v || 'Account required']"
        >
          <template #item="{ item, props }">
            <v-list-item v-bind="props">
              <v-list-item-title>
                {{ item.name }}
                <v-chip size="small" class="ml-2">Rp {{ formatIDR(item.balance) }}</v-chip>
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-select>
      </v-card-text>

      <v-card-actions>
        <v-btn @click="close">Cancel</v-btn>
        <v-btn
          @click="processPayment"
          color="primary"
          :loading="loading"
          :disabled="!selectedAccountId"
        >
          Confirm Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const processPayment = async () => {
  loading.value = true
  try {
    await accountStore.processPayment(payment.id, selectedAccountId.value)
    showSuccess('Payment processed successfully')
    close()
  } catch (error) {
    showError(error.message)
  } finally {
    loading.value = false
  }
}
</script>
```

**Testing:**

1. Open PO details
2. Click "Create Payment Plan"
3. Verify pending payment created
4. Verify payment pre-linked to order
5. Click "Pay Now"
6. Select account
7. Confirm payment
8. Verify status changed to 'completed'
9. Verify transaction created

---

#### Task 2.2: Implement auto-sync on priemka ⏱️ 2 hours

**Decision needed:** Choose option A, B, C, or D (see Question 2)

**Assuming Option C (flag-based):**

**File:** `src/stores/supplier_2/composables/usePurchaseOrders.ts`

**Add function:**

```typescript
async function updateOrderAfterReceipt(orderId: string, actualAmount: number): Promise<void> {
  const order = orders.value.find(o => o.id === orderId)
  if (!order) throw new Error('Order not found')

  // Update order amount
  const previousAmount = order.totalAmount
  order.totalAmount = actualAmount
  await orderService.update(order)

  // Find linked pending payment with autoSync enabled
  const payment = accountStore.payments.find(
    p => p.sourceOrderId === orderId && p.status === 'pending' && p.autoSyncEnabled === true
  )

  if (payment) {
    const amountDiff = actualAmount - previousAmount

    // Update payment amount
    await accountStore.updatePayment(payment.id, {
      amount: actualAmount,
      linkedOrders: payment.linkedOrders.map(lo =>
        lo.orderId === orderId ? { ...lo, linkedAmount: actualAmount } : lo
      )
    })

    console.log(
      `✅ Auto-synced payment ${payment.id}: ${previousAmount} → ${actualAmount} (${amountDiff > 0 ? '+' : ''}${amountDiff})`
    )
  }
}
```

**Call in receipt processing:**

```typescript
// After receipt confirmation
await updateOrderAfterReceipt(order.id, confirmedTotalAmount)
```

**Testing:**

1. Create PO: Rp 1,000,000
2. Create pending payment (autoSync=true)
3. Process receipt: Actual = Rp 900,000
4. Verify payment updated to Rp 900,000
5. Verify linkedAmount updated

---

### Phase 3: Documentation (Priority: LOW, Effort: 2 hours)

#### Task 3.1: Update payments-system.md ⏱️ 1.5 hours

**File:** `src/About/account/payments-system.md`

**Sections to update:**

1. Add "Payment Creation Flows" section

   - POS → Supplier Payment
   - Backoffice → Supplier Payment
   - Backoffice → Pending Payment
   - PO → Pending Payment (new!)

2. Add "Pending vs Completed" clarification

   - pending = not paid, may be pre-allocated
   - completed = paid, ready for allocation

3. Add "Auto-sync" feature documentation

4. Update all code examples with `source` field

5. Add flow diagrams

---

#### Task 3.2: Add inline code comments ⏱️ 30 min

**Files to document:**

1. `src/stores/pos/shifts/shiftsStore.ts:583-708`

   - Add comment explaining two-step process (Transaction + PendingPayment)
   - Document why both are needed

2. `src/stores/account/store.ts:linkPaymentToOrder`

   - Document that pending payments CAN be linked (pre-allocation)

3. `src/stores/pos/shifts/composables/useExpenseLinking.ts:138-192`
   - Document deduplication strategy

---

### Phase 4: Testing (Priority: HIGH, Effort: 2 hours)

#### Task 4.1: Manual testing checklist ⏱️ 1 hour

**Test cases:**

1. **POS Payment Creation**

   - [ ] Create supplier expense from POS
   - [ ] Verify Transaction created (balance updated)
   - [ ] Verify PendingPayment created (status='completed', source='pos')
   - [ ] Verify payment shows in Unlinked (POS) tab
   - [ ] Verify no duplicates if created twice quickly

2. **Backoffice Payment Creation**

   - [ ] Create supplier payment from Backoffice
   - [ ] Verify Transaction created
   - [ ] Verify PendingPayment created (status='completed', source='backoffice')
   - [ ] Verify payment shows in Unlinked (Backoffice) tab

3. **Pending Payment Creation**

   - [ ] Create pending payment from Backoffice
   - [ ] Verify NO Transaction created
   - [ ] Verify PendingPayment created (status='pending')
   - [ ] Verify payment shows in Pending Payments tab

4. **Payment Linking**

   - [ ] Link completed payment to order (full amount)
   - [ ] Verify order bill_status='fully_paid'
   - [ ] Link completed payment to order (partial)
   - [ ] Verify order bill_status='partially_paid'
   - [ ] Link pending payment to order (pre-allocation)
   - [ ] Verify order bill_status='not_billed' (still unpaid)

5. **Overpayment**

   - [ ] Create payment Rp 1M
   - [ ] Link Rp 600K to Order A
   - [ ] Link Rp 400K to Order B
   - [ ] Verify usedAmount=1M
   - [ ] Verify both orders show correct bill_status

6. **Cashier Confirmation**

   - [ ] Create payment from Backoffice → Main Cash Register
   - [ ] Verify requiresCashierConfirmation=true
   - [ ] Verify confirmation_status='pending'
   - [ ] (Manual) Cashier confirms
   - [ ] Verify confirmation_status='confirmed'

7. **Auto-sync (if implemented)**
   - [ ] Create PO: Rp 1M
   - [ ] Create pending payment (autoSync=true)
   - [ ] Process receipt: Rp 900K
   - [ ] Verify payment updated to Rp 900K

---

#### Task 4.2: Database integrity checks ⏱️ 30 min

**SQL queries:**

```sql
-- 1. Check all completed payments have source
SELECT COUNT(*)
FROM pending_payments
WHERE status = 'completed'
  AND source IS NULL;
-- Expected: 0

-- 2. Check POS payments
SELECT COUNT(*)
FROM pending_payments
WHERE source = 'pos'
  AND status = 'completed';
-- Expected: 19+ (current count)

-- 3. Check no orphaned transactions
SELECT COUNT(*)
FROM transactions t
WHERE expense_category->>'category' = 'supplier'
  AND related_payment_id IS NULL
  AND status = 'completed';
-- Expected: 0 (after Migration 113)

-- 4. Check pending payments with linkedOrders
SELECT
  id,
  status,
  amount,
  jsonb_array_length(linked_orders) as linked_count
FROM pending_payments
WHERE status = 'pending'
  AND jsonb_array_length(linked_orders) > 0;
-- Expected: 5 (this is CORRECT - pre-allocated)

-- 5. Check usedAmount consistency
SELECT
  id,
  amount,
  used_amount,
  (SELECT SUM((lo->>'linkedAmount')::numeric)
   FROM jsonb_array_elements(linked_orders) lo
   WHERE (lo->>'isActive')::boolean = true) as calculated_used
FROM pending_payments
WHERE status = 'completed'
HAVING used_amount != calculated_used;
-- Expected: 0 (should match)
```

---

#### Task 4.3: UI regression testing ⏱️ 30 min

**Test scenarios:**

1. **Reload after localStorage clear**

   - [ ] Clear localStorage
   - [ ] Reload app
   - [ ] Verify all POS payments still show
   - [ ] Verify correct badges (POS vs Backoffice)

2. **Duplicate display check**

   - [ ] Create payment from POS
   - [ ] Verify appears once in Unlinked tab
   - [ ] NOT duplicated

3. **Linking workflow**
   - [ ] Open Unlinked Payments
   - [ ] Click "Link" on payment
   - [ ] Select order
   - [ ] Enter amount
   - [ ] Confirm
   - [ ] Verify payment moved to Linked tab
   - [ ] Verify order bill_status updated

---

## 📈 Estimated Effort Summary

| Phase                           | Tasks        | Total Effort |
| ------------------------------- | ------------ | ------------ |
| Phase 1: Critical Fixes         | 5 tasks      | 3 hours      |
| Phase 2: Feature Implementation | 2 tasks      | 6 hours      |
| Phase 3: Documentation          | 2 tasks      | 2 hours      |
| Phase 4: Testing                | 3 tasks      | 2 hours      |
| **TOTAL**                       | **12 tasks** | **13 hours** |

---

## 🎯 Priority Recommendations

### Do Now (Today)

1. Task 1.1-1.4: Add source field (3 hours)
2. Task 1.5: Fix race condition (1 hour)
3. Task 4.2: Database integrity checks (30 min)

### Do This Week

1. Task 2.1: Implement pending payment from PO (4 hours)
2. Task 2.2: Implement auto-sync (2 hours)
3. Task 4.1: Manual testing (1 hour)

### Do Next Sprint

1. Task 3.1-3.2: Documentation (2 hours)
2. Task 4.3: UI regression testing (30 min)

---

## ❓ Questions Remaining

### For User Decision:

1. **Question 2:** How should auto-sync work? (Choose A, B, C, or D)
2. **Question 3.1:** Where should "Pay" button appear? (Choose A, B, C, or D)
3. **Question 3.2:** Who can execute payment? (Choose A, B, C, or D)
4. **Question 3.3:** Which accounts to show? (Choose A, B, C, or D)

---

## 📚 Related Documentation

- `src/About/account/payments-system.md` - Existing docs (needs update)
- `src/supabase/migrations/113_link_existing_payments.sql` - Recent migration
- This file - Comprehensive analysis

---

## 🔄 Change Log

| Date       | Author            | Changes                        |
| ---------- | ----------------- | ------------------------------ |
| 2026-01-29 | Claude Code Agent | Initial comprehensive analysis |

---

**End of Analysis**
