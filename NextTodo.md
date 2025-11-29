# Next Sprint: Payment Method UI Improvements & Account Binding

**Created:** 2025-11-29
**Priority:** HIGH
**Status:** ✅ COMPLETED + BUGFIX

---

## Bug Fix: Multi-Payment Method Sync (2025-11-29)

### Problem

При закрытии смены транзакции создавались только для CASH метода в основной кассе. Платежи картой и QR-кодом не синхронизировались в их целевые счета.

### Root Cause

Функции `syncShiftToAccount()` в shiftsStore и ShiftSyncAdapter обрабатывали только `cash` метод оплаты:

```typescript
const cashPaymentMethod = shift.paymentMethods.find(pm => pm.methodType === 'cash')
const cashReceived = cashPaymentMethod?.amount || 0
```

### Solution

Обновлена логика синхронизации для обработки ВСЕХ методов оплаты:

1. **Цикл по всем payment methods** в смене
2. **Маппинг к аккаунтам** через `paymentMethodService.getAll()`
3. **Корректировки и возвраты** применяются только к POS cash register
4. **Отдельная транзакция** для каждого метода в его целевой счёт

**Файлы изменены:**

- `src/stores/pos/shifts/shiftsStore.ts` (syncShiftToAccount)
- `src/core/sync/adapters/ShiftSyncAdapter.ts` (sync method)

**Логика:**

```typescript
for (const pmSummary of shift.paymentMethods) {
  const paymentMethod = allPaymentMethods.find(pm => pm.id === pmSummary.methodId)
  const isCashMethod = paymentMethod.isPosСashRegister

  // Корректировки только для cash
  let netAmount = isCashMethod
    ? pmSummary.amount - cashRefunds + totalCorrections
    : pmSummary.amount

  // Транзакция в целевой счёт метода
  await accountStore.createOperation({
    accountId: paymentMethod.accountId,
    amount: netAmount,
    description: `POS Shift ${shift.shiftNumber} - ${pmSummary.methodName} Income`
  })
}
```

**Результат:**

- ✅ Cash → acc_1 (Main Cash Register) с учётом возвратов и корректировок
- ✅ Card → acc_3 (Card Terminal) полная сумма
- ✅ QR/QRIS → acc_2 (Bank Account) полная сумма
- ✅ Прямые расходы вычитаются из POS cash register

### Second Bug Fix: Payment Methods Not Saved on Shift Close

**Problem:**
`currentShift.value.paymentMethods` был пустым (все amounts = 0) при закрытии смены, хотя реальные платежи существовали.

**Root Cause:**
EndShiftDialog вычислял `topPaymentMethods` из реальных платежей, но **не обновлял** `currentShift.value.paymentMethods` перед вызовом `endShift()`.

**Solution:**
Добавлено обновление `paymentMethods` перед закрытием смены:

```typescript
// EndShiftDialog.vue:585-593
currentShift.value.paymentMethods = Array.from(topPaymentMethods.value.values()).map(pm => ({
  methodId: pm.methodId,
  methodName: pm.methodName,
  methodType: pm.methodType,
  count: pm.count,
  amount: pm.amount
}))
```

**File Changed:**

- `src/views/pos/shifts/dialogs/EndShiftDialog.vue:585-593`

---

## Completed Tasks

✅ **Phase 1: Database Schema Update**

- Создана и применена миграция 020_add_pos_cash_register_flag.sql
- Добавлено поле is_pos_cash_register с уникальным индексом
- Создан триггер для автоматического снятия флага с других записей
- Установлен флаг для 'cash' метода по умолчанию

✅ **Optional Migration**

- Создан файл 021_simplify_payment_type.sql (не применен)
- Готов для будущего упрощения типов на 'cash' | 'bank'

✅ **Phase 2: TypeScript Types Update**

- Добавлен новый тип PaymentType = 'cash' | 'bank'
- Обновлен интерфейс PaymentMethod с полем isPosСashRegister
- Обновлены DTOs (CreatePaymentMethodDto, UpdatePaymentMethodDto)
- Файл: src/types/payment.ts

✅ **Phase 3: Service Layer Update**

- Добавлено поле is_pos_cash_register в transformFromDb()
- Добавлено поле в методы create() и update()
- Добавлен новый метод getPosСashRegister() для получения основной кассы POS
- Файл: src/stores/catalog/payment-methods.service.ts

✅ **Phase 4: UI Updates**

- Обновлен PaymentMethodDialog.vue:
  - Упрощенный селектор типа (Cash/Bank)
  - Добавлен селектор аккаунта с иконками и балансами
  - Добавлен чекбокс "Use as main POS cash register"
- Обновлен PaymentMethodList.vue:
  - Показывается имя связанного аккаунта
  - Добавлен бейдж "POS Cash" для основной кассы
- Файлы: src/views/catalog/payment-methods/

✅ **Phase 5: POS Integration Update**

- Добавлена функция getPosCashRegisterAccountId() в shiftsStore
- Обновлены функции syncShiftToAccount() и loadPendingPayments()
- Динамическое получение account ID из payment methods вместо хардкода
- Файл: src/stores/pos/shifts/shiftsStore.ts
- Файл: src/core/sync/adapters/ShiftSyncAdapter.ts

✅ **Phase 6: Build Verification**

- Успешно прошла сборка проекта (pnpm build)
- Нет ошибок типизации
- Все изменения интегрированы корректно

## Problem Analysis

### Current Issues

1. **Missing Account Binding in UI**

   - Payment method dialog doesn't show account selector
   - Can't select which account receives payments
   - `accountId` exists in DB but not editable in UI

2. **Type vs Payment Method Confusion**

   - Current "Type" field shows account types (cash, card, bank, ewallet, gojeck, grab)
   - Should be: **Type = 'cash' or 'bank'** (payment mechanism)
   - Payment Method Name = "Cash", "Credit Card", "GoPay", etc. (user-friendly name)

3. **No POS Cash Register Designation**
   - Need to mark which payment method is "Main POS Cash Register"
   - Critical for shift cash management
   - Currently hardcoded as `code: 'cash'` → `acc_1`

### Data Model Analysis

**Current `payment_methods` table:**

```sql
- id: TEXT (pk)
- name: TEXT           -- Display name (e.g., "Cash", "Credit Card")
- code: TEXT UNIQUE    -- System code ('cash', 'card', 'qr', 'gopay')
- type: TEXT           -- AccountType ('cash' | 'bank' | 'card' | 'gojeck' | 'grab')
- account_id: TEXT     -- Target account (FK to accounts)
- is_active: BOOLEAN
- requires_details: BOOLEAN
- display_order: INTEGER
- icon: TEXT
- description: TEXT
```

**Current seed data:**

```
Cash           → acc_1 (Main Cash Register)
Credit Card    → acc_3 (Card Terminal)
QR Code (QRIS) → acc_2 (Bank Account - BCA)
```

### Proposed Solution

**Simplify Type Field:**

- Type should only be: **'cash'** or **'bank'**
  - `cash` = physical cash payments (goes to cash account)
  - `bank` = non-cash payments (card, QR, e-wallet → bank/card accounts)

**Add POS Cash Register Flag:**

- New field: `is_pos_cash_register: BOOLEAN`
- Only ONE payment method can have this flag = true
- This method is used for shift cash management
- Default: `code: 'cash'` → `is_pos_cash_register: true`

---

## Sprint Tasks

### Phase 1: Database Schema Update

#### Task 1.1: Add `is_pos_cash_register` field

**File:** `src/supabase/migrations/020_add_pos_cash_register_flag.sql`

```sql
-- Migration: 020_add_pos_cash_register_flag
-- Description: Add flag to identify main POS cash register
-- Date: 2025-11-29

-- Add new column
ALTER TABLE payment_methods
ADD COLUMN is_pos_cash_register BOOLEAN NOT NULL DEFAULT false;

-- Create unique partial index (only one can be true)
CREATE UNIQUE INDEX idx_payment_methods_pos_cash_register
  ON payment_methods(is_pos_cash_register)
  WHERE is_pos_cash_register = true;

-- Set Cash as default POS cash register
UPDATE payment_methods
SET is_pos_cash_register = true
WHERE code = 'cash';

-- Add constraint check (optional, for safety)
CREATE OR REPLACE FUNCTION check_single_pos_cash_register()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pos_cash_register = true THEN
    -- Unset all other records
    UPDATE payment_methods
    SET is_pos_cash_register = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_pos_cash_register
  BEFORE UPDATE OF is_pos_cash_register ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION check_single_pos_cash_register();

COMMENT ON COLUMN payment_methods.is_pos_cash_register IS
  'Identifies the main cash register for POS shift management. Only one can be true.';
```

#### Task 1.2: Simplify Type enum (optional migration)

**File:** `src/supabase/migrations/021_simplify_payment_type.sql`

```sql
-- Migration: 021_simplify_payment_type
-- Description: Simplify payment type to 'cash' or 'bank'
-- Date: 2025-11-29
-- Status: OPTIONAL (for future)

-- Update existing types to simplified version
UPDATE payment_methods SET type = 'cash' WHERE type IN ('cash');
UPDATE payment_methods SET type = 'bank' WHERE type IN ('card', 'bank', 'ewallet', 'gojeck', 'grab');

-- Add check constraint
ALTER TABLE payment_methods
ADD CONSTRAINT payment_methods_type_check
CHECK (type IN ('cash', 'bank'));

COMMENT ON COLUMN payment_methods.type IS
  'Payment mechanism: cash (physical cash) or bank (electronic: card, QR, e-wallet)';
```

---

### Phase 2: TypeScript Types Update

#### Task 2.1: Update PaymentMethod interface

**File:** `src/types/payment.ts`

```typescript
/**
 * Payment Type - simplified to two categories
 */
export type PaymentType = 'cash' | 'bank'

/**
 * Payment Method - maps payment types to accounting accounts
 */
export interface PaymentMethod extends BaseEntity {
  name: string // Display name (e.g., "Cash", "Credit Card", "GoPay")
  code: string // Unique code ('cash', 'card', 'qr', 'gopay')
  type: PaymentType // ✅ CHANGED: Only 'cash' | 'bank'
  accountId: string | null // Target account (required for saving)
  isActive: boolean
  isPosСashRegister: boolean // ✅ NEW: Is this the main POS cash register?
  requiresDetails: boolean
  displayOrder: number
  icon?: string
  description?: string
}

export interface CreatePaymentMethodDto {
  name: string
  code: string
  type: PaymentType // ✅ CHANGED
  accountId: string // ✅ REQUIRED (no longer optional)
  isPosСashRegister?: boolean // ✅ NEW
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
}

export interface UpdatePaymentMethodDto {
  name?: string
  accountId?: string
  type?: PaymentType // ✅ CHANGED
  isActive?: boolean
  isPosСashRegister?: boolean // ✅ NEW
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
}
```

---

### Phase 3: Service Layer Update

#### Task 3.1: Update payment-methods.service.ts

**File:** `src/stores/catalog/payment-methods.service.ts`

**Changes:**

1. Add `is_pos_cash_register` to DB mapping
2. Update `transformFromDb()` to include new field
3. Add method `getPosСashRegister()` to get main cash register

```typescript
/**
 * Get the main POS cash register payment method
 */
async getPosСashRegister(): Promise<PaymentMethod | null> {
  try {
    const methods = await this.getAll()
    return methods.find(m => m.isPosСashRegister && m.isActive) || null
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch POS cash register', { error })
    throw error
  }
}

private transformFromDb(row: any): PaymentMethod {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    code: row.code,
    type: row.type,
    accountId: row.account_id,
    isActive: row.is_active,
    isPosСashRegister: row.is_pos_cash_register, // ✅ NEW
    requiresDetails: row.requires_details,
    displayOrder: row.display_order,
    icon: row.icon,
    description: row.description
  }
}
```

---

### Phase 4: UI Updates

#### Task 4.1: Update PaymentMethodDialog.vue

**File:** `src/views/catalog/payment-methods/PaymentMethodDialog.vue`

**Changes:**

1. **Replace "Type" select with simplified version:**

```vue
<v-select
  v-model="formData.type"
  label="Type"
  :items="paymentTypes"
  :rules="[v => !!v || 'Required field']"
  hint="Cash = physical cash, Bank = electronic (card/QR/e-wallet)"
  required
/>

<script>
const paymentTypes = [
  { title: 'Cash (Physical)', value: 'cash' },
  { title: 'Bank (Electronic)', value: 'bank' }
]
</script>
```

2. **Add Account selector (CRITICAL):**

```vue
<v-select
  v-model="formData.accountId"
  label="Account"
  :items="accountOptions"
  item-title="name"
  item-value="id"
  :rules="[v => !!v || 'Required field']"
  hint="Select the account where payments will be deposited"
  required
>
  <template #selection="{ item }">
    <div class="d-flex align-center">
      <v-icon :color="getAccountColor(item.raw.type)" size="small" class="mr-2">
        {{ getAccountIcon(item.raw.type) }}
      </v-icon>
      <span>{{ item.title }}</span>
    </div>
  </template>
  <template #item="{ item, props }">
    <v-list-item v-bind="props">
      <template #prepend>
        <v-icon :color="getAccountColor(item.raw.type)">
          {{ getAccountIcon(item.raw.type) }}
        </v-icon>
      </template>
      <template #subtitle>
        {{ item.raw.type.toUpperCase() }} • {{ formatIDR(item.raw.balance) }}
      </template>
    </v-list-item>
  </template>
</v-select>

<script setup>
import { useAccountStore } from '@/stores/account'
import { formatIDR } from '@/utils'

const accountStore = useAccountStore()

const accountOptions = computed(() => {
  return accountStore.accounts
    .filter(acc => acc.isActive)
    .map(acc => ({
      name: acc.name,
      id: acc.id,
      type: acc.type,
      balance: acc.balance
    }))
})

function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    gojeck: 'mdi-motorbike',
    grab: 'mdi-car'
  }
  return icons[type] || 'mdi-wallet'
}

function getAccountColor(type: string): string {
  const colors: Record<string, string> = {
    cash: 'success',
    bank: 'primary',
    card: 'info',
    gojeck: 'success',
    grab: 'warning'
  }
  return colors[type] || 'grey'
}
</script>
```

3. **Add POS Cash Register checkbox:**

```vue
<v-checkbox
  v-model="formData.isPosСashRegister"
  label="Use as main POS cash register"
  color="primary"
  hint="Only one payment method can be the main cash register"
  persistent-hint
/>
```

#### Task 4.2: Update PaymentMethodList.vue

**File:** `src/views/catalog/payment-methods/PaymentMethodList.vue`

**Changes:**

1. **Show account name in list:**

```vue
<v-list-item-title>{{ method.name }}</v-list-item-title>
<v-list-item-subtitle>
  Account: {{ getAccountName(method.accountId) }}
</v-list-item-subtitle>

<script>
const accountStore = useAccountStore()

function getAccountName(accountId: string | null): string {
  if (!accountId) return 'Not assigned'
  const account = accountStore.accounts.find(a => a.id === accountId)
  return account?.name || 'Unknown'
}
</script>
```

2. **Show POS Cash Register badge:**

```vue
<v-chip v-if="method.isPosСashRegister" size="small" color="primary" variant="flat" class="mr-2">
  <v-icon left size="small">mdi-cash-register</v-icon>
  POS Cash Register
</v-chip>
```

---

### Phase 5: POS Integration Update

#### Task 5.1: Use POS cash register in shift management

**File:** `src/stores/pos/shifts/shiftsStore.ts`

**Change:** Get POS cash register dynamically instead of hardcoding 'cash'

```typescript
async function startShift(openingCash: number): Promise<ServiceResponse<PosShift>> {
  try {
    // ✅ Get POS cash register payment method
    const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
    const posCashRegister = await paymentMethodService.getPosСashRegister()

    if (!posCashRegister) {
      return {
        success: false,
        error: 'No POS cash register configured. Please set up payment methods.'
      }
    }

    // Use the configured cash register account
    const cashAccountId = posCashRegister.accountId!

    // ... rest of shift start logic
  }
}
```

---

## Success Criteria

### Must Have ✅

1. ✅ Account selector in payment method dialog
2. ✅ Type simplified to 'cash' | 'bank'
3. ✅ POS Cash Register flag with unique constraint
4. ✅ Account name visible in payment method list
5. ✅ POS uses configured cash register (not hardcoded)

### Should Have 🎯

1. Account balance shown in selector
2. Account icons and colors
3. POS Cash Register badge in list
4. Validation: can't save without account
5. Warning when changing POS cash register

### Nice to Have 💎

1. Account quick-create from payment dialog
2. Payment method analytics by account
3. Bulk account reassignment

---

## Migration Path

1. **Step 1:** Apply migration 020 (add `is_pos_cash_register`)
2. **Step 2:** Update TypeScript types
3. **Step 3:** Update service layer
4. **Step 4:** Update UI components
5. **Step 5:** Update POS integration
6. **Step 6:** Test end-to-end flow
7. **Step 7 (optional):** Apply migration 021 (simplify type enum)

---

## Technical Debt

- Old `type` field still has AccountType values in DB
- Need migration to convert to simplified 'cash' | 'bank'
- Consider adding `category` field for sub-types (card, qr, ewallet) if needed for reporting

---

## Testing Checklist

### Payment Method Management

- [ ] Create payment method with account selection
- [ ] Edit payment method to change account
- [ ] Toggle POS cash register flag
- [ ] Only one method can be POS cash register
- [ ] Cannot save without account selected
- [ ] Account list loads from accountStore

### POS Integration

- [ ] Shift uses configured POS cash register
- [ ] Error if no POS cash register configured
- [ ] Payments go to correct accounts based on mapping
- [ ] Change cash register and verify shift uses new one

### Data Integrity

- [ ] Database constraint prevents multiple POS cash registers
- [ ] Trigger auto-unsets old cash register when setting new one
- [ ] Account deletion doesn't break payment methods (SET NULL)

---

## Files to Modify

**Database:**

- `src/supabase/migrations/020_add_pos_cash_register_flag.sql` (new)
- `src/supabase/migrations/021_simplify_payment_type.sql` (optional, new)

**Types:**

- `src/types/payment.ts` (update PaymentMethod interface)

**Services:**

- `src/stores/catalog/payment-methods.service.ts` (add field mapping)

**UI:**

- `src/views/catalog/payment-methods/PaymentMethodDialog.vue` (add account selector)
- `src/views/catalog/payment-methods/PaymentMethodList.vue` (show account, badge)

**POS:**

- `src/stores/pos/shifts/shiftsStore.ts` (use configured cash register)
- `src/stores/pos/payments/paymentsStore.ts` (already using mapping ✅)

---

## Estimate

- **Database migrations:** 30 min
- **Types & Service:** 30 min
- **UI components:** 2 hours
- **POS integration:** 1 hour
- **Testing:** 1 hour
- **Total:** ~5 hours

---

## Notes

- This sprint completes the payment method → account mapping feature
- Critical for accurate financial reporting
- Enables flexible cash management (can change main cash register)
- Foundation for future multi-currency or multi-location support
