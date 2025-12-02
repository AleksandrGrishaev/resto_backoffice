# Sprint: Configurable Tax & Service Charge System

## =� Overview

Transform hardcoded tax rates (10% government tax, 5% service charge) into a fully configurable system with detailed tax accounting, P&L integration, and separate tax collection reporting.

## <� Goals

1.  Make taxes configurable via PaymentSettingsView.vue
2.  Cache tax settings at POS initialization for offline use
3.  Remove all hardcoded tax values
4.  Track tax amounts separately in orders, bills, payments, and transactions
5.  Update P&L to show gross revenue (before tax) vs net revenue (after tax)
6.  Create dedicated Tax Collection report

## =� Implementation Phases

### **Phase 1: Tax Settings Database Infrastructure** �

**Files to create/modify:**

- `src/supabase/migrations/0XX_create_taxes_table.sql` (NEW)
- `src/stores/catalog/services/tax.service.ts` (MODIFY - add Supabase integration)
- `src/stores/catalog/payment-settings.store.ts` (VERIFY - should already work)

**Tasks:**

1.  Create `taxes` table migration
2. � Update TaxService to use Supabase (mirror PaymentMethodService pattern)
3. � Seed default taxes: Service (5%) and Government (10%)
4. � Test tax CRUD in PaymentSettingsView.vue

**Migration SQL:**

```sql
CREATE TABLE taxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL CHECK (code IN ('service', 'government')),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  description TEXT
);

INSERT INTO taxes (name, code, percentage, display_order) VALUES
  ('Service Charge', 'service', 5.00, 1),
  ('Government Tax', 'government', 10.00, 2);
```

---

### **Phase 2: POS Integration & Settings Cache** =�

**Files to modify:**

- `src/stores/pos/index.ts` (POS initialization)
- `src/stores/pos/composables/useTaxSettings.ts` (NEW)
- `src/stores/catalog/payment-settings.store.ts` (localStorage cache)

**Tasks:**

1. Add tax settings loading to `initializePOS()` (after Account Store init)
2. Create `useTaxSettings()` composable for POS access to tax rates
3. Implement localStorage caching (key: `pos_tax_settings_cache`)
4. Cache invalidation: on POS restart only
5. Add fallback to defaults if settings not loaded

---

### **Phase 3: Remove Tax Hardcoding** =�

**Files to modify:**

- `src/stores/pos/orders/composables/useOrderCalculations.ts`
- `src/views/pos/order/OrderSection.vue`
- `src/views/pos/order/components/OrderTotals.vue`
- `src/views/pos/order/components/OrderInfo.vue`

**Tasks:**

1. Update `useOrderCalculations()` to require tax rates from options
2. Remove hardcoded `serviceTaxRate = 5` and `governmentTaxRate = 10`
3. Update all components to pass tax rates from `useTaxSettings()`
4. Add validation: fail if tax rates not provided
5. Update `includeServiceTax` / `includeGovernmentTax` to use `isActive` from settings

---

### **Phase 4: Tax Amount Tracking in Orders/Bills** =�

**Files to modify:**

- `src/stores/pos/orders/ordersStore.ts`
- `src/stores/pos/types.ts`
- `src/stores/pos/orders/composables/useOrderCalculations.ts`

**Tasks:**

1. Add fields to PosOrder: `serviceTaxAmount`, `governmentTaxAmount`, `totalTaxAmount`
2. Update `recalculateOrderTotals()` to store calculated tax amounts
3. Add same fields to PosBill
4. Ensure tax amounts recalculated on every order change
5. Persist tax amounts when saving order to Supabase

---

### **Phase 5: Tax Tracking in Payments & Transactions** =�

**Files to modify:**

- `src/stores/pos/payments/paymentsStore.ts`
- `src/stores/pos/payments/types.ts`
- `src/stores/sales/salesStore.ts`
- `src/stores/sales/types.ts`

**Tasks:**

1. Add tax breakdown to PosPayment
2. Update `processSimplePayment()` to extract tax amounts
3. Add tax fields to SalesTransaction type
4. Update `recordSalesTransaction()` to store taxes separately
5. **CRITICAL:** Ensure profit calculations exclude taxes

---

### **Phase 6: P&L Report Enhancement** =�

**Files to modify:**

- `src/stores/analytics/plReportStore.ts`
- `src/stores/analytics/types.ts`

**Tasks:**

1. Add tax section to PLReport type
2. Update revenue calculation (gross vs net)
3. Add tax breakdown (service vs government)
4. Update P&L view to display tax section
5. Ensure gross profit excludes taxes

---

### **Phase 7: Tax Collection Report** =�

**Files to create:**

- `src/views/backoffice/analytics/TaxReportView.vue`
- `src/stores/analytics/taxReportStore.ts`

**Tasks:**

1. Create Tax Collection report view
2. Show breakdown: Service Tax vs Government Tax
3. Filter by date range, shift, payment method
4. Show daily/weekly/monthly aggregations
5. Export to CSV/Excel
6. Add to Analytics menu

---

## =� Critical Points

1. **Database migration first** - Must create `taxes` table before anything else
2. **Profit calculations** - NEVER include taxes in COGS or profit calculations
3. **Backwards compatibility** - Ensure existing orders without tax breakdown still work
4. **Validation** - POS should not allow checkout if tax settings not loaded
5. **Migration script** - May need to backfill `taxAmount` for existing orders

---

## � Progress Tracker

- **Phase 1:** � In Progress
- **Phase 2:** =� Pending
- **Phase 3:** =� Pending
- **Phase 4:** =� Pending
- **Phase 5:** =� Pending
- **Phase 6:** =� Pending
- **Phase 7:** =� Pending

---

## =� Notes

- Tax settings will be loaded once at POS initialization and cached locally
- Changes to tax settings require POS restart to take effect
- Only 2 tax types supported: Service Charge and Government Tax
- Taxes calculated per order, not per bill
- All existing orders will have `taxAmount = 0` until recalculated

# другие правки

## <� SPRINT 1: UUID Migration for Account Store

**Priority:** HIGH
**Complexity:** LARGE REFACTORING
**Risk Level:** HIGH (affects core financial data)
**Estimated Effort:** 3-5 days

### =� Overview

Currently, Account Store uses **string-based IDs** like `'acc_1'`, `'acc_2'`, etc. This causes:

- L ID collisions risk
- L Hardcoded references throughout codebase
- L Difficult to maintain and scale
- L Non-standard approach (Supabase uses UUID by default)

**Goal:** Migrate all account IDs to **UUID format** and refactor all references.

---

### =

Phase 1: Discovery & Impact Analysis

#### 1.1 Find All Account ID References

**Search patterns:**

```bash
# Hardcoded account IDs
grep -r "acc_1" src/
grep -r "acc_2" src/
grep -r "'acc_" src/
grep -r '"acc_' src/

# Constants
grep -r "POS_CASH_ACCOUNT_ID" src/

# Type references
grep -r "accountId" src/
grep -r "assignedToAccount" src/
```

**Expected locations:**

- `src/stores/account/types.ts` - POS_CASH_ACCOUNT_ID constant
- `src/stores/account/store.ts` - account references
- `src/stores/account/service.ts` - account operations
- `src/stores/pos/` - POS cash account references
- `src/views/backoffice/accounts/` - UI components
- `src/views/backoffice/analytics/` - P&L reports
- `src/stores/counteragents/` - payment account assignments
- Database seed scripts (if any)

#### 1.2 Document Current Account Structure

```typescript
// CURRENT (String-based)
interface Account {
  id: string // 'acc_1', 'acc_2', etc.
  name: string
  type: AccountType
  balance: number
  // ...
}

// TARGET (UUID-based)
interface Account {
  id: string // UUID format: '550e8400-e29b-41d4-a716-446655440000'
  name: string
  type: AccountType
  balance: number
  // ...
}
```

---

### =� Phase 2: Database Migration

#### 2.1 Create Migration File

**File:** `src/supabase/migrations/XXX_migrate_accounts_to_uuid.sql`

```sql
-- Migration: XXX_migrate_accounts_to_uuid
-- Description: Convert account IDs from string format to UUID
-- Date: 2025-12-01
-- Author: Kitchen App Team

-- � CRITICAL: This is a DESTRUCTIVE migration
-- Backup database before running!

-- STEP 1: Create mapping table for old -> new IDs
CREATE TABLE IF NOT EXISTS account_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Generate UUIDs for existing accounts
INSERT INTO account_id_mapping (old_id, new_id, account_name)
SELECT
  id,
  gen_random_uuid(),
  name
FROM accounts
ON CONFLICT (old_id) DO NOTHING;

-- STEP 3: Add new UUID column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS id_new UUID;

-- STEP 4: Update accounts with new UUIDs
UPDATE accounts a
SET id_new = m.new_id
FROM account_id_mapping m
WHERE a.id = m.old_id;

-- STEP 5: Update foreign keys in transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id_new UUID;

UPDATE transactions t
SET account_id_new = m.new_id
FROM account_id_mapping m
WHERE t.account_id = m.old_id;

-- STEP 6: Update foreign keys in pending_payments table
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS assigned_to_account_new UUID;

UPDATE pending_payments p
SET assigned_to_account_new = m.new_id
FROM account_id_mapping m
WHERE p.assigned_to_account = m.old_id;

-- STEP 7: Verify data integrity
-- Check all accounts have new UUIDs
SELECT 'Accounts without UUID' AS check_name, COUNT(*) AS count
FROM accounts
WHERE id_new IS NULL;

-- Check all transactions mapped
SELECT 'Transactions without UUID' AS check_name, COUNT(*) AS count
FROM transactions
WHERE account_id_new IS NULL AND account_id IS NOT NULL;

-- Check all payments mapped
SELECT 'Payments without UUID' AS check_name, COUNT(*) AS count
FROM pending_payments
WHERE assigned_to_account_new IS NULL AND assigned_to_account IS NOT NULL;

-- STEP 8: Switch to new IDs (CRITICAL STEP)
-- � ONLY RUN AFTER VERIFYING DATA INTEGRITY!

-- Rename old columns
ALTER TABLE accounts RENAME COLUMN id TO id_old;
ALTER TABLE accounts RENAME COLUMN id_new TO id;

ALTER TABLE transactions RENAME COLUMN account_id TO account_id_old;
ALTER TABLE transactions RENAME COLUMN account_id_new TO account_id;

ALTER TABLE pending_payments RENAME COLUMN assigned_to_account TO assigned_to_account_old;
ALTER TABLE pending_payments RENAME COLUMN assigned_to_account_new TO assigned_to_account;

-- STEP 9: Update primary key and constraints
ALTER TABLE accounts DROP CONSTRAINT accounts_pkey;
ALTER TABLE accounts ADD PRIMARY KEY (id);

-- STEP 10: Add foreign key constraints
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_account
  FOREIGN KEY (account_id)
  REFERENCES accounts(id)
  ON DELETE RESTRICT;

ALTER TABLE pending_payments
  ADD CONSTRAINT fk_pending_payments_account
  FOREIGN KEY (assigned_to_account)
  REFERENCES accounts(id)
  ON DELETE SET NULL;

-- STEP 11: Create indices for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_account_id ON pending_payments(assigned_to_account);

-- STEP 12: Keep mapping table for reference (don't drop it)
-- This allows rollback and debugging
COMMENT ON TABLE account_id_mapping IS 'Mapping table for account ID migration from string to UUID. Keep for reference and potential rollback.';

-- STEP 13: (Optional) Drop old columns after verification period
-- � ONLY RUN AFTER 1+ WEEK OF STABLE OPERATION
-- ALTER TABLE accounts DROP COLUMN id_old;
-- ALTER TABLE transactions DROP COLUMN account_id_old;
-- ALTER TABLE pending_payments DROP COLUMN assigned_to_account_old;
```

#### 2.2 Create Rollback Migration

**File:** `src/supabase/migrations/XXX_rollback_accounts_uuid.sql`

```sql
-- Rollback Migration: XXX_rollback_accounts_uuid
-- Description: Rollback UUID migration and restore string IDs
-- � EMERGENCY USE ONLY

-- Restore old columns as primary
ALTER TABLE accounts RENAME COLUMN id TO id_uuid;
ALTER TABLE accounts RENAME COLUMN id_old TO id;

ALTER TABLE transactions RENAME COLUMN account_id TO account_id_uuid;
ALTER TABLE transactions RENAME COLUMN account_id_old TO account_id;

ALTER TABLE pending_payments RENAME COLUMN assigned_to_account TO assigned_to_account_uuid;
ALTER TABLE pending_payments RENAME COLUMN assigned_to_account_old TO assigned_to_account;

-- Restore primary key
ALTER TABLE accounts DROP CONSTRAINT accounts_pkey;
ALTER TABLE accounts ADD PRIMARY KEY (id);

-- Drop foreign keys
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_account;
ALTER TABLE pending_payments DROP CONSTRAINT IF EXISTS fk_pending_payments_account;
```

---

### =� Phase 3: Code Refactoring

#### 3.1 Update Constants

**File:** `src/stores/account/types.ts`

```typescript
// BEFORE:
export const POS_CASH_ACCOUNT_ID = 'acc_1'

// AFTER: Store mapping in config or environment
// Option 1: Create config file
// src/config/accounts.ts
export const ACCOUNT_MAPPINGS = {
  POS_CASH: '550e8400-e29b-41d4-a716-446655440000', // UUID from migration
  BANK_BNI: '660e8400-e29b-41d4-a716-446655440001',
  RESERVE_CASH: '770e8400-e29b-41d4-a716-446655440002'
} as const

// Option 2: Load from Supabase at runtime
// More flexible but requires async initialization
export let POS_CASH_ACCOUNT_ID: string | null = null

export async function initializeAccountConstants() {
  const { data } = await supabase.from('accounts').select('id').eq('name', 'A=>2=0O :0AA0').single()

  if (data) {
    POS_CASH_ACCOUNT_ID = data.id
  }
}
```

#### 3.2 Update Account Service

**File:** `src/stores/account/service.ts`

```typescript
// No changes needed - service already uses `id: string`
// UUID is just a string format

//  Verify these methods work with UUID:
async getById(id: string): Promise<Account | null>
async create(data: ...): Promise<Account>
async update(id: string, data: ...): Promise<void>
```

#### 3.3 Update Supabase Mappers

**File:** `src/stores/account/supabaseMappers.ts`

```typescript
// Verify UUID handling in mappers
export function accountFromSupabase(data: any): Account {
  return {
    id: data.id, // Should be UUID string
    name: data.name,
    type: data.type as AccountType,
    balance: data.balance
    // ...
  }
}

// Add validation helper
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
```

#### 3.4 Update Components

**Files to update:**

- `src/views/backoffice/accounts/AccountsView.vue`
- `src/views/backoffice/accounts/components/*.vue`
- `src/views/pos/` (POS cash account references)
- Any component with hardcoded `'acc_1'`

**Search and replace pattern:**

```typescript
// BEFORE:
if (accountId === 'acc_1') { ... }

// AFTER:
import { ACCOUNT_MAPPINGS } from '@/config/accounts'
if (accountId === ACCOUNT_MAPPINGS.POS_CASH) { ... }

// OR (if using runtime loading):
import { POS_CASH_ACCOUNT_ID } from '@/stores/account/types'
if (accountId === POS_CASH_ACCOUNT_ID) { ... }
```

#### 3.5 Update Seed Scripts

**Files:**

- `src/scripts/seed-accounts.ts` (if exists)
- Any test data generation scripts

```typescript
// BEFORE:
const accounts = [
  { id: 'acc_1', name: 'A=>2=0O :0AA0', ... },
  { id: 'acc_2', name: 'BNI Bank', ... },
]

// AFTER:
import { v4 as uuidv4 } from 'uuid'

const accounts = [
  { id: uuidv4(), name: 'A=>2=0O :0AA0', ... },
  { id: uuidv4(), name: 'BNI Bank', ... },
]

// OR use fixed UUIDs from migration:
const accounts = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: 'A=>2=0O :0AA0', ... },
  { id: '660e8400-e29b-41d4-a716-446655440001', name: 'BNI Bank', ... },
]
```

---

### >� Phase 4: Testing

#### 4.1 Unit Tests

```typescript
// Test UUID validation
describe('UUID Validation', () => {
  it('should accept valid UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('should reject old string IDs', () => {
    expect(isValidUUID('acc_1')).toBe(false)
  })
})

// Test account operations with UUID
describe('Account Service', () => {
  it('should create account with UUID', async () => {
    const account = await accountService.create({ ... })
    expect(isValidUUID(account.id)).toBe(true)
  })
})
```

#### 4.2 Integration Tests

-  Create account and verify UUID format
-  Create transaction and verify account reference
-  Create payment and verify account assignment
-  Transfer between accounts using UUIDs
-  POS operations with UUID-based cash account
-  P&L Report with UUID-based transactions

#### 4.3 Manual Testing Checklist

- [ ] Open Accounts view - all accounts load correctly
- [ ] Create new account - generates UUID
- [ ] Create transaction - account reference works
- [ ] Create payment - account assignment works
- [ ] Open POS - cash account identified correctly
- [ ] Generate P&L Report - transactions load correctly
- [ ] Transfer between accounts - both accounts updated
- [ ] Check database directly - verify UUID format

---

### =� Phase 5: Deployment

#### 5.1 Pre-Deployment

1.  **Backup production database**

   ```bash
   # Using Supabase CLI
   npx supabase db dump > backup_before_uuid_migration.sql
   ```

2.  **Test migration on staging/dev database**

   ```bash
   npx supabase db reset --db-url <dev-db-url>
   npx supabase migration up
   ```

3.  **Verify data integrity on staging**
   - Check account count matches
   - Check all transactions have valid account references
   - Check all payments have valid account assignments

#### 5.2 Deployment Steps

1. **Announce maintenance window** (30-60 minutes)
2. **Stop application** (prevent new writes)
3. **Run migration** on production database
4. **Verify data integrity** (run checks from migration)
5. **Deploy updated code** with UUID support
6. **Smoke test** critical paths (create transaction, POS operations)
7. **Resume application**
8. **Monitor logs** for UUID-related errors

#### 5.3 Post-Deployment

1. **Keep mapping table** for 1-2 weeks
2. **Monitor error logs** for hardcoded ID references
3. **After stability period** - drop old columns (Step 13 in migration)

---

### � Risks & Mitigation

| Risk                        | Impact   | Probability | Mitigation                                               |
| --------------------------- | -------- | ----------- | -------------------------------------------------------- |
| Data loss during migration  | CRITICAL | LOW         | Full database backup, test on staging first              |
| Missed hardcoded references | HIGH     | MEDIUM      | Comprehensive grep search, runtime validation            |
| Performance degradation     | MEDIUM   | LOW         | Add indices on UUID columns, benchmark before/after      |
| POS operations break        | HIGH     | MEDIUM      | Extensive testing of POS cash account detection          |
| Rollback complexity         | HIGH     | LOW         | Prepare rollback migration, keep old columns temporarily |

---

### =� Notes

- **UUID format:** Use PostgreSQL `gen_random_uuid()` or `uuid-ossp` extension
- **Backwards compatibility:** Keep old columns for 1-2 weeks for rollback
- **Mapping table:** NEVER delete - useful for debugging and data analysis
- **Testing:** Focus on POS operations - most critical for business
- **Documentation:** Update CLAUDE.md with new account ID format

## Что еще работает не так?
