# Account Store - Runtime Configuration Architecture

## 📁 File Structure

```
src/stores/account/
├── README.md              # This file - documentation
├── types.ts               # Type definitions and interfaces
├── constants.ts           # ✨ NEW: Static constants (categories, statuses, labels)
├── accountConfig.ts       # ✨ NEW: Runtime account configuration (UUID support)
├── store.ts               # Pinia store implementation
├── service.ts             # API services
├── supabaseMappers.ts     # Supabase data mappers
└── index.ts               # Public API exports
```

## 🎯 Purpose

This architecture supports **both string IDs (dev) and UUID (production)** for operational accounts without code changes.

### Why This Structure?

**Before (Sprint UUID Migration):**

- Hardcoded account IDs: `'acc_1'`, `'acc_2'`, `'acc_3'`
- Located in `src/config/accounts.ts` (disconnected from store)
- No clear separation between constants and runtime config

**After (Current):**

- ✅ Runtime account ID loading from database
- ✅ Supports both string (dev) and UUID (production)
- ✅ Clear separation: static constants vs dynamic config
- ✅ Co-located with account store logic
- ✅ Easy to test and maintain

## 📝 Module Descriptions

### `types.ts` - Type Definitions

**Contains:**

- TypeScript interfaces (`Account`, `Transaction`, `PendingPayment`, etc.)
- Type aliases (`OperationType`, `PaymentStatus`, etc.)
- DTOs (`CreateOperationDto`, `ProcessPaymentDto`, etc.)

**Does NOT contain:**

- Constants (moved to `constants.ts`)
- Runtime config (moved to `accountConfig.ts`)

**Re-exports:**

- All constants from `constants.ts` for backwards compatibility

### `constants.ts` - Static Constants

**Contains:**

- `EXPENSE_CATEGORIES` - Category labels for display
- `OPERATION_TYPES` - Operation type labels
- `PAYMENT_PRIORITIES` - Payment priority labels (Russian)
- `PAYMENT_STATUSES` - Payment status labels (Russian)
- `PAYMENT_CATEGORIES` - Payment category labels
- `AMOUNT_CHANGE_REASONS` - Amount change reason labels
- `POS_CASH_ACCOUNT_ID` - **DEPRECATED** legacy constant

**Pattern:**

```typescript
export const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  processing: 'В обработке',
  completed: 'Оплачен'
  // ...
} as const
```

### `accountConfig.ts` - Runtime Configuration

**Main responsibility:** Load and manage operational account IDs at runtime.

**Key exports:**

- `ACCOUNT_CONFIG` - Runtime config object
- `initializeAccountConfig(supabase)` - Initialize from database
- `getPOSCashAccountId()` - Get POS cash account ID
- `getBankAccountId()` - Get bank account ID
- `getCardAccountId()` - Get card terminal account ID
- `getPOSCashAccountWithFallback()` - Safe version with fallback
- `isAccountConfigInitialized()` - Check if initialized
- `isUUID(id)` - Check if ID is UUID format
- `normalizeAccountId(id)` - Convert legacy IDs to current format

**Architecture:**

```typescript
// Runtime config (populated at app startup)
export const ACCOUNT_CONFIG = {
  POS_CASH: {
    id: null,                    // Will be 'acc_1' or UUID
    name: 'Main Cash Register',
    type: 'cash'
  },
  // ...
}

// Initialization (called in AppInitializer)
export async function initializeAccountConfig(supabase) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type')
    .in('name', ['Main Cash Register', ...])

  // Map by name (not by hardcoded ID!)
  accounts.forEach(acc => {
    if (acc.name === 'Main Cash Register') {
      ACCOUNT_CONFIG.POS_CASH.id = acc.id
    }
  })
}

// Usage (throws if not initialized)
export function getPOSCashAccountId(): string {
  if (!ACCOUNT_CONFIG.POS_CASH.id) {
    throw new Error('Account config not initialized')
  }
  return ACCOUNT_CONFIG.POS_CASH.id
}
```

### `index.ts` - Public API

**Exports:**

- All types from `types.ts`
- All constants from `constants.ts`
- All account config from `accountConfig.ts`
- Store and services

**Single entry point for external modules:**

```typescript
// Recommended: Import from index
import { getPOSCashAccountId, PAYMENT_STATUSES } from '@/stores/account'

// Also works (but not recommended)
import { getPOSCashAccountId } from '@/stores/account/accountConfig'
import { PAYMENT_STATUSES } from '@/stores/account/constants'
```

## 🔄 How It Works

### 1. App Initialization

```typescript
// src/core/appInitializer.ts
import { initializeAccountConfig } from '@/stores/account'
import { supabase } from '@/supabase/client'

async function initialize() {
  // Phase 1: Initialize critical stores
  await initializeCriticalStores()

  // Phase 1.5: Load account IDs from database
  await initializeAccountConfig(supabase)

  // Phase 2: Initialize role-based stores (can now use account IDs)
  await initializeRoleBasedStores()
}
```

### 2. Using Account IDs

```typescript
// In any service/store
import { getPOSCashAccountId } from '@/stores/account'

async function recordExpense() {
  const accountId = getPOSCashAccountId() // 'acc_1' in dev, UUID in prod

  await accountStore.createOperation({
    accountId,
    type: 'expense',
    amount: -1000
    // ...
  })
}
```

### 3. Safe Version with Fallback

```typescript
import { getPOSCashAccountWithFallback } from '@/stores/account'

// Won't throw - falls back to 'acc_1' if not initialized
const accountId = getPOSCashAccountWithFallback()
```

## 🌍 Environment Support

### Dev Environment

```sql
-- accounts table in dev
id      | name                  | type
--------|----------------------|------
'acc_1' | Main Cash Register   | cash
'acc_2' | Bank Account - BCA   | bank
'acc_3' | Card Terminal        | card
```

**Behavior:**

- `getPOSCashAccountId()` → `'acc_1'`
- Legacy code with hardcoded `'acc_1'` still works
- No migration needed

### Production Environment

```sql
-- accounts table in production
id                                   | name                  | type
------------------------------------|----------------------|------
'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3...'| Main Cash Register   | cash
'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4...'| Bank Account - BCA   | bank
'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5...'| Card Terminal        | card
```

**Behavior:**

- `getPOSCashAccountId()` → `'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3...'`
- UUID format detected automatically
- Account found by **name**, not hardcoded ID

## 🛠️ Migration Guide

### For New Code

✅ **DO:**

```typescript
import { getPOSCashAccountId } from '@/stores/account'

const accountId = getPOSCashAccountId()
```

❌ **DON'T:**

```typescript
// Hardcoded ID - won't work in production!
const accountId = 'acc_1'

// Direct access - fragile!
import { ACCOUNT_CONFIG } from '@/stores/account'
const accountId = ACCOUNT_CONFIG.POS_CASH.id
```

### For Existing Code

**Old code (still works due to backwards compatibility):**

```typescript
import { POS_CASH_ACCOUNT_ID } from '@/stores/account/types'

if (accountId === POS_CASH_ACCOUNT_ID) {
  // ...
}
```

**Recommended update:**

```typescript
import { getPOSCashAccountId } from '@/stores/account'

if (accountId === getPOSCashAccountId()) {
  // Works with both string IDs and UUID!
}
```

## 📦 Real-World Examples

### Example 1: Write-Off Expense Service

```typescript
// src/stores/storage/writeOffExpenseService.ts
import { useAccountStore, getPOSCashAccountId } from '@/stores/account'

async function recordManualAdjustment(params) {
  const accountStore = useAccountStore()

  // Get POS cash account ID dynamically
  const accountId = getPOSCashAccountId()
  const account = accountStore.accounts.find(a => a.id === accountId)

  if (!account) {
    throw new Error(`POS cash account (${accountId}) not found`)
  }

  await accountStore.createOperation({
    accountId: account.id,
    type: 'expense'
    // ...
  })
}
```

### Example 2: Shift Sync Adapter

```typescript
// src/core/sync/adapters/ShiftSyncAdapter.ts
import { getPOSCashAccountId } from '@/stores/account'

async function validate(shift) {
  const accountStore = useAccountStore()

  // Verify POS cash account exists
  let posCashId: string | null = null
  try {
    posCashId = getPOSCashAccountId()
  } catch (error) {
    console.warn('Account config not initialized')
  }

  const hasPOSAccount = accountStore.accounts?.some(a => a.id === posCashId)

  return hasPOSAccount
}
```

## 🧪 Testing

```typescript
import {
  initializeAccountConfig,
  getPOSCashAccountId,
  __resetAccountConfig
} from '@/stores/account'

describe('Account Config', () => {
  beforeEach(() => {
    __resetAccountConfig() // Reset for clean state
  })

  it('should initialize from database', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          in: () => ({
            data: [{ id: 'uuid-123', name: 'Main Cash Register', type: 'cash' }],
            error: null
          })
        })
      })
    }

    await initializeAccountConfig(mockSupabase)
    expect(getPOSCashAccountId()).toBe('uuid-123')
  })
})
```

## 📚 Further Reading

- **Production deployment:** `PRODUCTION_UUID_STRATEGY.md`
- **Migration analysis:** `PRODUCTION_MIGRATION_ANALYSIS.md`
- **Account Store API:** See `store.ts` and `service.ts`
