# Current Sprint: Payment Method to Account Mapping + Critical Shift Validation

## Sprint Goal

50;87>20BL ?>;=>F5==K9 <0??8=3 A?>A>1>2 >?;0BK : 0::0C=B0< G5@57 B01;8FC  A UI C?@02;5=85<, 8A?@028BL :@8B8G5A:85 1038 A 20;840F859 0:B82=>9 A<5=K 2 POS A8AB5<5.

---

## Phase 1: Critical Bug Fixes - Active Shift Validation

### Problem Statement

** "':** POS A8AB5<0 ?>72>;O5B A>74020BL 70:07K, A>E@0=OBL 87<5=5=8O 8 ?@>2>48BL ?;0B568  0:B82=>9 A<5=K. -B> ?@82>48B ::

- `payment.shiftId = undefined` - ?;0B568 =5 ?@82O70=K : A<5=5
- `payment_methods have no amounts` - A?>A>1K >?;0BK =5 >1=>2;ONBAO
- 52>7<>6=>ABL A8=E@>=870F88 shift � account store
- >B5@O 40==KE > ?@>4060E 2 >BG5B=>AB8

### Required Changes

#### 1.1 Prevent Order Creation Without Active Shift

**File:** `src/stores/pos/orders/ordersStore.ts`

**Locations to add validation:**

- `createOrder()` - 70?@5B8BL A>740=85 =>2>3> 70:070
- `addItemToBill()` - 70?@5B8BL 4>102;5=85 B>20@>2
- `updateBillItem()` - 70?@5B8BL 87<5=5=85 B>20@>2
- `cancelBillItem()` - 70?@5B8BL >B<5=C B>20@>2
- `setBillDiscount()` - 70?@5B8BL ?@8<5=5=85 A:84>:

**Validation logic:**

```typescript
// Import at top
import { useShiftsStore } from '../shifts/shiftsStore'

// Add to each action:
async function createOrder(...) {
  const shiftsStore = useShiftsStore()

  if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
    return {
      success: false,
      error: 'Cannot create order: No active shift. Please start a shift first.'
    }
  }

  // ... existing logic
}
```

**UI Impact:**

- >:07K20BL alert/notification ?>;L7>20B5;N
- @54;>68BL >B:@KBL A<5=C (redirect to shift management)

---

#### 1.2 Prevent Payment Processing Without Active Shift

**File:** `src/stores/pos/payments/paymentsStore.ts`

**Location:** `processSimplePayment()` - line 80-87

**Change from:**

```typescript
// Warn if no active shift
if (!currentShift) {
  console.warn('� [paymentsStore] Processing payment without active shift')
}
```

**To:**

```typescript
// L BLOCK payment if no active shift
if (!currentShift || currentShift.status !== 'active') {
  return {
    success: false,
    error: 'Cannot process payment: No active shift. Please start a shift first.'
  }
}
```

**Similar check needed in:**

- `processRefund()` - line 201-205
- `createRefund()` - line 308-312

---

#### 1.3 UI Guard - POS Main View

**File:** `src/views/pos/PosMainView.vue`

**Add global guard:**

```vue
<template>
  <div v-if="!hasActiveShift" class="no-shift-overlay">
    <v-card max-width="500" class="mx-auto mt-10">
      <v-card-title>No Active Shift</v-card-title>
      <v-card-text>You must start a shift before processing orders and payments.</v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="goToShiftManagement">Start Shift</v-btn>
      </v-card-actions>
    </v-card>
  </div>

  <!-- Existing POS interface (disabled if no shift) -->
  <div v-else>
    <!-- ... existing content -->
  </div>
</template>

<script setup lang="ts">
const hasActiveShift = computed(() => {
  return shiftsStore.currentShift?.status === 'active'
})

function goToShiftManagement() {
  router.push('/pos/shifts')
}
</script>
```

**Alternative (less intrusive):**

- Show warning banner at top
- Disable "Add Item" and "Pay" buttons
- Gray out table interactions

---

#### 1.4 Tables Interaction Guard

**File:** `src/views/pos/tables/TablesSidebar.vue`

**Add validation before opening table:**

```typescript
function handleTableClick(table: PosTable) {
  //  Check active shift first
  if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
    // Show error dialog
    showNoShiftError.value = true
    return
  }

  // ... existing logic
}
```

---

#### 1.5 Menu Item Selection Guard

**File:** `src/views/pos/menu/MenuSection.vue`

**Block adding items to bill:**

```typescript
async function handleAddToBill(menuItem: MenuItem) {
  //  Check active shift
  if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
    emit('error', 'Cannot add items: No active shift')
    return
  }

  // ... existing logic
}
```

---

### Testing Checklist (Phase 1)

- [ ] Start app WITHOUT opening shift
- [ ] Try to create new order � should fail with error
- [ ] Try to add item to existing order � should fail
- [ ] Try to process payment � should fail
- [ ] UI should show "Start Shift" prompt/button
- [ ] After starting shift � all operations work normally
- [ ] After ending shift � operations blocked again
- [ ] Error messages are user-friendly and actionable

---

## Phase 2: Payment Method to Account Mapping

### 2.1 Database Schema

**Migration:** `src/supabase/migrations/012_create_payment_methods_table.sql`

```sql
-- Migration: 012_create_payment_methods_table
-- Description: Create payment_methods table for mapping payment types to accounts
-- Date: 2025-11-29

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY DEFAULT ('pm_' || gen_random_uuid()::text),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core fields
  name TEXT NOT NULL, -- Display name (e.g., "Cash", "Credit Card", "GoPay")
  code TEXT NOT NULL UNIQUE, -- Unique code for programmatic use ('cash', 'card', 'qr', 'gopay')
  type TEXT NOT NULL, -- AccountType: 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'

  -- Account mapping
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_details BOOLEAN NOT NULL DEFAULT false, -- Requires card number, etc.
  display_order INTEGER NOT NULL DEFAULT 0, -- Sort order in UI

  -- Metadata
  icon TEXT, -- Material Design icon name (optional)
  description TEXT -- Optional description
);

-- Create index for active methods (frequently queried)
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active) WHERE is_active = true;

-- Create index for code lookup (used in POS)
CREATE INDEX idx_payment_methods_code ON payment_methods(code);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Seed data: Default payment methods
INSERT INTO payment_methods (name, code, type, account_id, is_active, requires_details, display_order, icon, description) VALUES
  ('Cash', 'cash', 'cash', 'acc_1', true, false, 1, 'mdi-cash', 'Cash payments - Main cash register'),
  ('Credit/Debit Card', 'card', 'card', 'acc_3', true, true, 2, 'mdi-credit-card', 'Card payments via terminal'),
  ('QR Code (QRIS)', 'qr', 'bank', 'acc_2', true, false, 3, 'mdi-qrcode', 'QR code payments to bank account')
ON CONFLICT (code) DO NOTHING;

-- RLS Policies (if needed)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read for all authenticated users
CREATE POLICY payment_methods_read ON payment_methods
  FOR SELECT
  USING (true);

-- Policy: Allow write for admins only (optional - add user role check)
CREATE POLICY payment_methods_write ON payment_methods
  FOR ALL
  USING (true); -- TODO: Add role-based check when auth is implemented

COMMENT ON TABLE payment_methods IS 'Payment method to account mapping for POS system';
COMMENT ON COLUMN payment_methods.code IS 'Unique code used in POS system (e.g., cash, card, qr)';
COMMENT ON COLUMN payment_methods.account_id IS 'Target account for this payment method';
```

**Apply migration:**

```bash
# Use MCP tool or Supabase CLI
mcp__supabase__apply_migration({
  name: "create_payment_methods_table",
  query: "..." // SQL above
})
```

---

### 2.2 TypeScript Types

**Update:** `src/types/payment.ts`

```typescript
import { BaseEntity } from './common'

// Payment Method (from DB)
export interface PaymentMethod extends BaseEntity {
  name: string
  code: string // 'cash' | 'card' | 'qr' | 'gopay' | 'shopeepay' | ...
  type: 'cash' | 'bank' | 'card' | 'gojeck' | 'grab' // AccountType
  accountId: string | null // Can be null if not mapped yet
  isActive: boolean
  requiresDetails: boolean
  displayOrder: number
  icon?: string
  description?: string
}

// DTO for creating payment method
export interface CreatePaymentMethodDto {
  name: string
  code: string
  type: 'cash' | 'bank' | 'card' | 'gojeck' | 'grab'
  accountId: string
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
}

// DTO for updating payment method
export interface UpdatePaymentMethodDto {
  name?: string
  accountId?: string
  isActive?: boolean
  requiresDetails?: boolean
  displayOrder?: number
  icon?: string
  description?: string
}
```

---

### 2.3 Service Layer

**File:** `src/services/payment-method.service.ts`

**Update to use Supabase:**

```typescript
import { supabase } from '@/config/supabase'
import type { PaymentMethod, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@/types/payment'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PaymentMethodService'

class PaymentMethodService {
  private cache: PaymentMethod[] | null = null
  private cacheTimestamp: number = 0
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get all payment methods (cached)
   */
  async getAll(): Promise<PaymentMethod[]> {
    try {
      // Check cache
      const now = Date.now()
      if (this.cache && now - this.cacheTimestamp < this.CACHE_TTL) {
        DebugUtils.debug(MODULE_NAME, 'Returning cached payment methods')
        return this.cache
      }

      DebugUtils.info(MODULE_NAME, 'Fetching payment methods from Supabase')

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error

      // Transform snake_case to camelCase
      this.cache = (data || []).map(this.transformFromDb)
      this.cacheTimestamp = now

      DebugUtils.info(MODULE_NAME, 'Payment methods loaded', { count: this.cache.length })
      return this.cache
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payment methods', { error })
      throw error
    }
  }

  /**
   * Get payment method by code (for POS use)
   */
  async getByCode(code: string): Promise<PaymentMethod | null> {
    const methods = await this.getAll()
    return methods.find(m => m.code === code && m.isActive) || null
  }

  /**
   * Get active payment methods only
   */
  async getActive(): Promise<PaymentMethod[]> {
    const methods = await this.getAll()
    return methods.filter(m => m.isActive)
  }

  /**
   * Create new payment method
   */
  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating payment method', { dto })

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          name: dto.name,
          code: dto.code,
          type: dto.type,
          account_id: dto.accountId,
          requires_details: dto.requiresDetails || false,
          display_order: dto.displayOrder || 0,
          icon: dto.icon || null,
          description: dto.description || null
        })
        .select()
        .single()

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Payment method created', { id: data.id })

      return this.transformFromDb(data)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment method', { error })
      throw error
    }
  }

  /**
   * Update payment method
   */
  async update(id: string, dto: UpdatePaymentMethodDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment method', { id, dto })

      const updateData: any = {}
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.accountId !== undefined) updateData.account_id = dto.accountId
      if (dto.isActive !== undefined) updateData.is_active = dto.isActive
      if (dto.requiresDetails !== undefined) updateData.requires_details = dto.requiresDetails
      if (dto.displayOrder !== undefined) updateData.display_order = dto.displayOrder
      if (dto.icon !== undefined) updateData.icon = dto.icon
      if (dto.description !== undefined) updateData.description = dto.description

      const { error } = await supabase.from('payment_methods').update(updateData).eq('id', id)

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Payment method updated')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment method', { error })
      throw error
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
  }

  /**
   * Transform DB row to TypeScript type
   */
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
      requiresDetails: row.requires_details,
      displayOrder: row.display_order,
      icon: row.icon,
      description: row.description
    }
  }
}

export const paymentMethodService = new PaymentMethodService()
```

---

### 2.4 Update Payment Method Dialog

**File:** `src/components/payment-settings/PaymentMethodDialog.vue`

**Add account selector field:**

```vue
<template>
  <v-dialog v-model="internalValue" max-width="600px">
    <v-card>
      <v-card-title>
        {{ isEdit ? 'Edit Payment Method' : 'Add Payment Method' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <!-- Name -->
          <v-text-field
            v-model="formData.name"
            label="Name"
            :rules="[rules.required]"
            hint="Display name (e.g., 'Cash', 'Credit Card')"
          />

          <!-- Code -->
          <v-text-field
            v-model="formData.code"
            label="Code"
            :rules="[rules.required, rules.code]"
            :disabled="isEdit"
            hint="Unique code for POS (e.g., 'cash', 'card', 'gopay')"
          />

          <!-- Type -->
          <v-select
            v-model="formData.type"
            label="Type"
            :items="typeOptions"
            :rules="[rules.required]"
            hint="Account type for this payment method"
          />

          <!--  NEW: Account Selector -->
          <v-select
            v-model="formData.accountId"
            label="Target Account"
            :items="accountOptions"
            item-title="label"
            item-value="value"
            :rules="[rules.required]"
            hint="Select the account where payments will be recorded"
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
                  {{ item.raw.type.toUpperCase() }}
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Requires Details -->
          <v-checkbox
            v-model="formData.requiresDetails"
            label="Requires additional details (card number, etc.)"
          />

          <!-- Display Order -->
          <v-text-field
            v-model.number="formData.displayOrder"
            label="Display Order"
            type="number"
            hint="Order in which this method appears (lower = first)"
          />

          <!-- Icon (optional) -->
          <v-text-field
            v-model="formData.icon"
            label="Icon (MDI)"
            hint="Material Design Icon name (e.g., 'mdi-cash')"
          />

          <!-- Description (optional) -->
          <v-textarea
            v-model="formData.description"
            label="Description"
            rows="2"
            hint="Optional description for internal use"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cancel</v-btn>
        <v-btn color="primary" :disabled="!formValid" @click="save">
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import type { PaymentMethod } from '@/types/payment'

interface Props {
  modelValue: boolean
  method: PaymentMethod | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'saved'])

const accountStore = useAccountStore()

// Form state
const formRef = ref()
const formValid = ref(false)
const formData = ref({
  name: '',
  code: '',
  type: 'cash' as 'cash' | 'bank' | 'card' | 'gojeck' | 'grab',
  accountId: '',
  requiresDetails: false,
  displayOrder: 0,
  icon: '',
  description: ''
})

// Computed
const isEdit = computed(() => !!props.method)
const internalValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

// Account options from store
const accountOptions = computed(() => {
  return accountStore.accounts
    .filter(acc => acc.isActive)
    .map(acc => ({
      label: acc.name,
      value: acc.id,
      type: acc.type
    }))
})

const typeOptions = [
  { title: 'Cash', value: 'cash' },
  { title: 'Bank', value: 'bank' },
  { title: 'Card', value: 'card' },
  { title: 'GoJek', value: 'gojeck' },
  { title: 'Grab', value: 'grab' }
]

// Validation rules
const rules = {
  required: (v: any) => !!v || 'Required',
  code: (v: string) => /^[a-z0-9_-]+$/.test(v) || 'Code must be lowercase alphanumeric with - or _'
}

// Watch for prop changes
watch(
  () => props.method,
  method => {
    if (method) {
      formData.value = {
        name: method.name,
        code: method.code,
        type: method.type,
        accountId: method.accountId || '',
        requiresDetails: method.requiresDetails,
        displayOrder: method.displayOrder,
        icon: method.icon || '',
        description: method.description || ''
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Methods
function resetForm() {
  formData.value = {
    name: '',
    code: '',
    type: 'cash',
    accountId: '',
    requiresDetails: false,
    displayOrder: 0,
    icon: '',
    description: ''
  }
}

function close() {
  internalValue.value = false
}

async function save() {
  emit('saved', formData.value)
  close()
}

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

---

### 2.5 Update POS Payment Processing

**File:** `src/stores/pos/payments/paymentsStore.ts`

**Change:** Use accountId from payment method mapping instead of hardcoded 'account_cash'

```typescript
async function processSimplePayment(
  orderId: string,
  billIds: string[],
  itemIds: string[],
  method: PaymentMethod, // 'cash' | 'card' | 'qr'
  amount: number,
  receivedAmount?: number
): Promise<ServiceResponse<PosPayment>> {
  loading.value = true

  try {
    // 1.  Get current shift (REQUIRED)
    const { useShiftsStore } = await import('../shifts/shiftsStore')
    const shiftsStore = useShiftsStore()
    const currentShift = shiftsStore.currentShift

    // L BLOCK if no active shift
    if (!currentShift || currentShift.status !== 'active') {
      return {
        success: false,
        error: 'Cannot process payment: No active shift. Please start a shift first.'
      }
    }

    // 2.  Get payment method mapping to find accountId
    const { paymentMethodService } = await import('@/services/payment-method.service')
    const paymentMethodMapping = await paymentMethodService.getByCode(method)

    if (!paymentMethodMapping) {
      return {
        success: false,
        error: `Payment method '${method}' not configured. Please contact administrator.`
      }
    }

    if (!paymentMethodMapping.accountId) {
      return {
        success: false,
        error: `Payment method '${method}' is not mapped to an account. Please contact administrator.`
      }
    }

    const accountId = paymentMethodMapping.accountId

    // 3. Create payment with shiftId and accountId
    const paymentData = {
      orderId,
      billIds,
      itemIds,
      method,
      amount,
      receivedAmount,
      processedBy: 'Current User', // TODO: Get from authStore
      shiftId: currentShift.id //  Now guaranteed to exist
    }

    const result = await paymentsService.processPayment(paymentData)

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Payment processing failed')
    }

    const payment = result.data

    // 4. Add to in-memory store
    payments.value.push(payment)

    // 5. Link payment to order and items
    await linkPaymentToOrder(orderId, payment.id, itemIds)

    // 6. Add transaction to shift with correct accountId
    await shiftsStore.addShiftTransaction(
      orderId,
      payment.id,
      accountId, //  Use accountId from mapping instead of hardcoded 'account_cash'
      amount,
      `Payment ${payment.paymentNumber} - ${method}`
    )

    // 7.  Update payment methods in shift (now guaranteed to work)
    await shiftsStore.updatePaymentMethods(payment.method, amount)

    // 8. Record sales transaction
    // ... existing sales recording logic

    console.log('=� Payment processed:', payment.paymentNumber, {
      shiftId: payment.shiftId,
      accountId,
      amount,
      method
    })

    return { success: true, data: payment }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment processing failed'
    error.value = message
    return { success: false, error: message }
  } finally {
    loading.value = false
  }
}
```

---

## Testing Plan

### Phase 1 Testing: Shift Validation

1. **Start app without shift:**

   - [ ] Cannot create orders
   - [ ] Cannot add items
   - [ ] Cannot process payments
   - [ ] UI shows "Start Shift" prompt

2. **After starting shift:**

   - [ ] All operations work normally
   - [ ] Payments have shiftId
   - [ ] paymentMethods update correctly

3. **After ending shift:**
   - [ ] Operations blocked again
   - [ ] Error messages clear and actionable

### Phase 2 Testing: Payment Method Mapping

1. **Payment Settings UI:**

   - [ ] Create new payment method with account
   - [ ] Edit existing method to change account
   - [ ] Multiple methods � same account works
   - [ ] Cannot activate method without account

2. **POS Payment Processing:**

   - [ ] Cash payment � acc_1 (Main Cash Register)
   - [ ] Card payment � acc_3 (Card Terminal)
   - [ ] QR payment � acc_2 (Bank Account - BCA)
   - [ ] Check shift.paymentMethods updated correctly
   - [ ] Check account transactions created

3. **Shift Close & Sync:**
   - [ ] Shift totals match payment methods
   - [ ] Sync to Account Store uses correct accounts
   - [ ] Income transactions created in correct accounts

---

## Success Criteria

 **Critical Bugs Fixed:**

- [ ] Cannot create orders without active shift
- [ ] Cannot process payments without active shift
- [ ] All payments have shiftId assigned
- [ ] shift.paymentMethods always update correctly

 **Payment Method Mapping:**

- [ ] Database table created and seeded
- [ ] UI allows creating/editing methods with account selection
- [ ] POS uses mapping to determine target account
- [ ] Multiple methods can map to same account

 **Code Quality:**

- [ ] Migration file documented and applied
- [ ] TypeScript types updated
- [ ] Services use Supabase (no localStorage for this feature)
- [ ] Error handling and user feedback implemented

---

## Next Steps After This Sprint

1. **Add more payment methods** (GoPay, ShopeePay, Dana, OVO)
2. **Analytics per payment method** (report by method + account)
3. **Payment method icons** in POS UI
4. **Conditional fields** based on requiresDetails (card number, etc.)
5. **Permission-based editing** of payment methods (admin only)
