# Transaction Categories System

## Overview

Create unified `transaction_categories` table for financial categories (expense/income).
COGS categories (`product`, `food_cost`, `inventory_*`) remain hardcoded in TypeScript.

---

## Phase 1: Database Migration

### File: `src/supabase/migrations/067_create_transaction_categories.sql`

```sql
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    is_opex BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read for authenticated" ON transaction_categories FOR SELECT USING (true);
CREATE POLICY "Write for admin" ON transaction_categories FOR ALL USING (true);

-- Seed data
INSERT INTO transaction_categories (code, name, type, is_opex, is_system, sort_order) VALUES
-- OPEX (Operating Expenses)
('utilities', 'Utilities', 'expense', true, false, 1),
('salary', 'Salary', 'expense', true, false, 2),
('rent', 'Rent', 'expense', true, false, 3),
('transport', 'Transport', 'expense', true, false, 4),
('cleaning', 'Cleaning', 'expense', true, false, 5),
('security', 'Security', 'expense', true, false, 6),
('renovation', 'Renovation', 'expense', true, false, 7),
('marketing', 'Marketing', 'expense', true, false, 8),
('maintenance', 'Maintenance', 'expense', true, false, 9),
('service', 'Service', 'expense', true, false, 10),
('takeaway', 'Takeaway', 'expense', true, false, 11),
('other', 'Other Expenses', 'expense', true, false, 12),
-- Non-OPEX Expenses
('supplier', 'Supplier Payment', 'expense', false, true, 20),
('tax', 'Tax', 'expense', false, false, 21),
('invest', 'Investment', 'expense', false, false, 22),
-- Income
('sales', 'Sales', 'income', false, true, 30),
('other_income', 'Other Income', 'income', false, false, 31);
```

### Seed Data Summary (17 categories)

| code                          | name             | type    | is_opex | is_system | Description              |
| ----------------------------- | ---------------- | ------- | :-----: | :-------: | ------------------------ |
| **OPEX (Operating Expenses)** |
| utilities                     | Utilities        | expense |  true   |   false   | Electricity, water, gas  |
| salary                        | Salary           | expense |  true   |   false   | Employee salaries        |
| rent                          | Rent             | expense |  true   |   false   | Rent payments            |
| transport                     | Transport        | expense |  true   |   false   | Delivery, transport      |
| cleaning                      | Cleaning         | expense |  true   |   false   | Cleaning services        |
| security                      | Security         | expense |  true   |   false   | Security services        |
| renovation                    | Renovation       | expense |  true   |   false   | Repairs, renovation      |
| marketing                     | Marketing        | expense |  true   |   false   | Advertising, marketing   |
| maintenance                   | Maintenance      | expense |  true   |   false   | Equipment maintenance    |
| service                       | Service          | expense |  true   |   false   | External services        |
| takeaway                      | Takeaway         | expense |  true   |   false   | Takeaway expenses        |
| other                         | Other Expenses   | expense |  true   |   false   | Other operating expenses |
| **Non-OPEX Expenses**         |
| supplier                      | Supplier Payment | expense |  false  |   true    | Payments to suppliers    |
| tax                           | Tax              | expense |  false  |   false   | Tax payments             |
| invest                        | Investment       | expense |  false  |   false   | Investments              |
| **Income**                    |
| sales                         | Sales            | income  |  false  |   true    | POS sales revenue        |
| other_income                  | Other Income     | income  |  false  |   false   | Other income             |

---

## Phase 2: TypeScript Types

### CREATE: `src/types/category.ts`

```typescript
export type CategoryType = 'expense' | 'income'

export interface TransactionCategory {
  id: string
  code: string
  name: string
  type: CategoryType
  isOpex: boolean
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryDto {
  code: string
  name: string
  type: CategoryType
  isOpex?: boolean
  description?: string
}

export interface UpdateCategoryDto {
  name?: string
  isOpex?: boolean
  isActive?: boolean
  sortOrder?: number
  description?: string
}
```

---

## Phase 3: Category Service

### CREATE: `src/stores/catalog/category.service.ts`

Follow pattern from `payment-methods.service.ts`:

```typescript
class CategoryService {
  private cache: TransactionCategory[] | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Transform snake_case to camelCase
  private transformRow(row: any): TransactionCategory {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      isOpex: row.is_opex,
      isSystem: row.is_system,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getAll(): Promise<TransactionCategory[]>
  async getByType(type: CategoryType): Promise<TransactionCategory[]>
  async getByCode(code: string): Promise<TransactionCategory | null>
  async getActive(): Promise<TransactionCategory[]>
  async getOpexCategories(): Promise<TransactionCategory[]>
  async create(dto: CreateCategoryDto): Promise<TransactionCategory>
  async update(id: string, dto: UpdateCategoryDto): Promise<void>
  async delete(id: string): Promise<void> // throws if is_system
  async toggleActive(id: string, isActive: boolean): Promise<void>
  private invalidateCache(): void
}

export const categoryService = new CategoryService()
```

---

## Phase 4: Payment Settings Store

### UPDATE: `src/stores/catalog/payment-settings.store.ts`

Add categories to existing store:

```typescript
// === STATE ===
categories: TransactionCategory[]

// === GETTERS ===
expenseCategories: (state) =>
  state.categories
    .filter(c => c.type === 'expense' && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

incomeCategories: (state) =>
  state.categories
    .filter(c => c.type === 'income' && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

opexCategories: (state) =>
  state.categories
    .filter(c => c.isOpex && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

getCategoryByCode: (state) => (code: string) =>
  state.categories.find(c => c.code === code)

// === ACTIONS ===
async fetchCategories() {
  this.categories = await categoryService.getAll()
}

async createCategory(dto: CreateCategoryDto) {
  const category = await categoryService.create(dto)
  this.categories.push(category)
  return category
}

async updateCategory(id: string, dto: UpdateCategoryDto) {
  await categoryService.update(id, dto)
  await this.fetchCategories() // refresh cache
}

async deleteCategory(id: string) {
  const category = this.categories.find(c => c.id === id)
  if (category?.isSystem) {
    throw new Error('Cannot delete system category')
  }
  await categoryService.delete(id)
  this.categories = this.categories.filter(c => c.id !== id)
}

// Update initialize() to include categories
async initialize() {
  await Promise.all([
    this.fetchPaymentMethods(),
    this.fetchTaxes(),
    this.fetchCategories() // ADD THIS
  ])
}
```

---

## Phase 5: UI Components

### CREATE: `src/components/payment-settings/CategoryList.vue`

```vue
<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-tag-multiple" class="me-2" />
      Categories
      <v-spacer />
      <v-btn color="primary" size="small" @click="$emit('add')">
        <v-icon icon="mdi-plus" start />
        Add
      </v-btn>
    </v-card-title>

    <!-- Filter Tabs -->
    <v-tabs v-model="filter" density="compact">
      <v-tab value="all">All</v-tab>
      <v-tab value="expense">Expense</v-tab>
      <v-tab value="income">Income</v-tab>
    </v-tabs>

    <v-list density="compact">
      <v-list-item
        v-for="category in filteredCategories"
        :key="category.id"
        @click="$emit('edit', category)"
      >
        <template #prepend>
          <v-icon :icon="category.type === 'income' ? 'mdi-arrow-down' : 'mdi-arrow-up'" />
        </template>

        <v-list-item-title>{{ category.name }}</v-list-item-title>
        <v-list-item-subtitle>{{ category.code }}</v-list-item-subtitle>

        <template #append>
          <v-chip v-if="category.isOpex" size="x-small" color="blue" class="me-1">OPEX</v-chip>
          <v-chip v-if="category.isSystem" size="x-small" color="grey">
            <v-icon icon="mdi-lock" size="x-small" />
          </v-chip>
          <v-chip v-if="!category.isActive" size="x-small" color="warning">Inactive</v-chip>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
// Props: categories: TransactionCategory[]
// Emits: add, edit(category)
// Filter logic by type
</script>
```

### CREATE: `src/components/payment-settings/CategoryDialog.vue`

```vue
<template>
  <base-dialog v-model="dialog" :title="isEdit ? 'Edit Category' : 'Add Category'">
    <v-form ref="form" v-model="valid">
      <!-- Code (disabled for system) -->
      <v-text-field
        v-model="formData.code"
        label="Code"
        :disabled="isSystem"
        :rules="[rules.required, rules.snakeCase]"
        hint="lowercase_with_underscores"
      />

      <!-- Name -->
      <v-text-field v-model="formData.name" label="Name" :rules="[rules.required]" />

      <!-- Type (disabled for system) -->
      <v-select
        v-model="formData.type"
        label="Type"
        :items="['expense', 'income']"
        :disabled="isSystem"
        :rules="[rules.required]"
      />

      <!-- Is OPEX (only for expense, disabled for system) -->
      <v-checkbox
        v-if="formData.type === 'expense'"
        v-model="formData.isOpex"
        label="Include in OPEX (P&L Report)"
        :disabled="isSystem"
      />

      <!-- Description -->
      <v-textarea v-model="formData.description" label="Description" rows="2" />
    </v-form>

    <template #actions>
      <v-btn @click="close">Cancel</v-btn>
      <v-btn color="primary" :loading="loading" @click="save">Save</v-btn>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
// Props: modelValue, category?: TransactionCategory
// Emits: update:modelValue, saved
// Validation: code must be snake_case
// System categories: code and type are readonly
</script>
```

### UPDATE: `src/views/catalog/PaymentSettingsView.vue`

Add third column for Categories:

```vue
<template>
  <v-container>
    <v-row>
      <!-- Payment Methods -->
      <v-col cols="12" md="4">
        <PaymentMethodList ... />
      </v-col>

      <!-- Taxes -->
      <v-col cols="12" md="4">
        <TaxList ... />
      </v-col>

      <!-- Categories (NEW) -->
      <v-col cols="12" md="4">
        <CategoryList
          :categories="store.categories"
          @add="showCategoryDialog()"
          @edit="showCategoryDialog($event)"
        />
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <PaymentMethodDialog ... />
    <TaxDialog ... />
    <CategoryDialog
      v-model="dialogs.category"
      :category="editingCategory"
      @saved="onCategorySaved"
    />
  </v-container>
</template>
```

---

## Phase 6: Update Account Types

### UPDATE: `src/stores/account/types.ts`

Change ExpenseCategory interface:

```typescript
// BEFORE
export interface ExpenseCategory {
  type: 'daily' | 'investment'
  category: DailyExpenseCategory | InvestmentCategory
}

// AFTER
export interface ExpenseCategory {
  type: 'expense' | 'income'
  category: string // code from DB or COGS constant
}

// Keep for backward compatibility (COGS only)
/**
 * @deprecated Use TransactionCategory from stores/catalog for financial categories.
 * This type remains only for COGS categories in P&L calculations.
 */
export type DailyExpenseCategory =
  | 'product'
  | 'food_cost'
  | 'inventory_variance'
  | 'inventory_adjustment'
  | 'training_education'
  | 'recipe_development'

/** @deprecated */
export type InvestmentCategory = 'shares' | 'other'
```

### UPDATE: `src/stores/account/constants.ts`

Add COGS labels, deprecate old constants:

```typescript
/**
 * COGS categories - remain hardcoded for P&L calculations
 * These are NOT in transaction_categories table
 */
export const COGS_CATEGORY_LABELS: Record<string, string> = {
  product: 'Products',
  food_cost: 'Food Cost (Negative Batches)',
  inventory_variance: 'Inventory Variance (Reconciliation)',
  inventory_adjustment: 'Inventory Adjustment (Physical Count)',
  training_education: 'Training & Education',
  recipe_development: 'Recipe Development'
}

/**
 * @deprecated Use store.getCategoryByCode() for financial categories
 * This constant remains only for backward compatibility
 */
export const EXPENSE_CATEGORIES = {
  daily: { ... },      // kept for old code
  investment: { ... }  // kept for old code
}
```

---

## Phase 7: Update Expense Dropdowns

### UPDATE: `src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue`

Replace hardcoded categories with store:

```typescript
// BEFORE
import { EXPENSE_CATEGORIES } from '@/stores/account/types'

const expenseCategories = computed(() => {
  const categories = EXPENSE_CATEGORIES.daily
  return Object.entries(categories).map(([value, label]) => ({
    value: value as DailyExpenseCategory,
    label
  }))
})

// AFTER
import { usePaymentSettingsStore } from '@/stores/catalog'

const paymentSettingsStore = usePaymentSettingsStore()

const expenseCategories = computed(() =>
  paymentSettingsStore.expenseCategories.map(c => ({
    value: c.code,
    label: c.name
  }))
)

// When creating expense:
const expenseData = {
  ...
  expenseCategory: {
    type: 'expense',  // Changed from 'daily'
    category: form.value.category
  }
}
```

### UPDATE: `src/views/accounts/components/dialogs/OperationDialog.vue`

Same changes as ExpenseOperationDialog:

- Replace EXPENSE_CATEGORIES with store
- Remove type selector (Daily/Investment) - now flat list
- Change type: 'daily' to type: 'expense'

```typescript
// BEFORE - two-level selection
<v-select v-model="expenseType" :items="['daily', 'investment']" />
<v-select v-model="category" :items="EXPENSE_CATEGORIES[expenseType]" />

// AFTER - flat list
<v-select
  v-model="category"
  :items="paymentSettingsStore.expenseCategories"
  item-title="name"
  item-value="code"
/>
```

### UPDATE: `src/views/accounts/components/list/PaymentConfirmationDialog.vue`

Change supplier payment category:

```typescript
// BEFORE (line ~233)
expenseCategory: { type: 'daily', category: 'product' }

// AFTER
expenseCategory: { type: 'expense', category: 'supplier' }
```

---

## Phase 8: Update Category Labels

### UPDATE: `src/views/accounts/components/dialogs/transaction-detail/TransactionDetailContent.vue`

```typescript
// BEFORE
import { EXPENSE_CATEGORIES } from '@/stores/account/constants'

function getCategoryLabel(expenseCategory: ExpenseCategory): string {
  if (!expenseCategory) return 'No category'
  return EXPENSE_CATEGORIES[expenseCategory.type][expenseCategory.category]
}

// AFTER
import { usePaymentSettingsStore } from '@/stores/catalog'
import { COGS_CATEGORY_LABELS } from '@/stores/account/constants'

const paymentSettingsStore = usePaymentSettingsStore()

function getCategoryLabel(expenseCategory: ExpenseCategory): string {
  if (!expenseCategory) return 'No category'

  // Try to find in store (financial categories)
  const category = paymentSettingsStore.getCategoryByCode(expenseCategory.category)
  if (category) return category.name

  // Fallback to COGS labels
  if (COGS_CATEGORY_LABELS[expenseCategory.category]) {
    return COGS_CATEGORY_LABELS[expenseCategory.category]
  }

  // Last resort - return raw code
  return expenseCategory.category
}
```

### Same changes for:

- `src/views/accounts/components/detail/AccountOperations.vue` - getExpenseCategoryLabel()
- `src/views/accounts/AccountDetailView.vue` - getCategoryLabel()
- `src/views/accounts/components/detail/PendingPaymentsSection.vue` - getCategoryLabel(), getCategoryColor()

---

## Phase 9: P&L Report Updates

### UPDATE: `src/stores/analytics/types.ts`

Change PLReport interface:

```typescript
// BEFORE
opex: {
  total: number
  byCategory: {
    utilities: number
    salary: number
    rent: number
    transport: number
    cleaning: number
    security: number
    renovation: number
    trainingEducation: number
    recipeDevelopment: number
    marketing: number
    other: number
  }
}

// AFTER
opex: {
  total: number
  byCategory: Record<string, number> // Dynamic based on DB categories
}
```

### UPDATE: `src/stores/analytics/plReportStore.ts`

Replace hardcoded OPEX with dynamic:

```typescript
// BEFORE (lines ~212-228)
const opex = {
  byCategory: {
    utilities: sumByExpenseCategory(opexTransactions, 'utilities'),
    salary: sumByExpenseCategory(opexTransactions, 'salary'),
    rent: sumByExpenseCategory(opexTransactions, 'rent')
    // ... 11 hardcoded lines
  },
  total: 0
}

// AFTER
import { usePaymentSettingsStore } from '@/stores/catalog'

const paymentSettingsStore = usePaymentSettingsStore()
const opexCategories = paymentSettingsStore.opexCategories

const opex: PLReport['opex'] = {
  byCategory: {},
  total: 0
}

// Dynamic loop over DB categories
for (const cat of opexCategories) {
  const amount = sumByExpenseCategory(opexTransactions, cat.code)
  opex.byCategory[cat.code] = amount
  opex.total += amount
}
```

### UPDATE: `src/views/backoffice/analytics/PLReportView.vue`

Replace hardcoded rows with dynamic:

```vue
<!-- BEFORE: 11 hardcoded <tr> elements -->
<tr>
  <td class="pl-8">Utilities</td>
  <td class="text-right">{{ formatIDR(report.opex.byCategory.utilities) }}</td>
</tr>
<tr>
  <td class="pl-8">Salary</td>
  <td class="text-right">{{ formatIDR(report.opex.byCategory.salary) }}</td>
</tr>
<!-- ... more hardcoded rows -->

<!-- AFTER: Dynamic loop -->
<tr v-for="(amount, code) in report.opex.byCategory" :key="code">
  <td class="pl-8">{{ getCategoryName(code) }}</td>
  <td class="text-right">{{ formatIDR(amount) }}</td>
</tr>

<script setup>
import { usePaymentSettingsStore } from '@/stores/catalog'
import { COGS_CATEGORY_LABELS } from '@/stores/account/constants'

const paymentSettingsStore = usePaymentSettingsStore()

function getCategoryName(code: string): string {
  const category = paymentSettingsStore.getCategoryByCode(code)
  return category?.name || COGS_CATEGORY_LABELS[code] || code
}
</script>
```

---

## Key Changes Summary

### ExpenseCategory.type

```
BEFORE: 'daily' | 'investment'
AFTER:  'expense' | 'income'
```

### UI: Flat list instead of groups

```
BEFORE: Select type (Daily/Investment) → Select category from that type
AFTER:  Single dropdown with all expense categories (sorted by sort_order)
```

### Supplier payments

```
BEFORE: expenseCategory: { type: 'daily', category: 'product' }
AFTER:  expenseCategory: { type: 'expense', category: 'supplier' }
```

### Category lookup

```
BEFORE: EXPENSE_CATEGORIES[type][category]
AFTER:  store.getCategoryByCode(category)?.name || COGS_CATEGORY_LABELS[category]
```

---

## Files Summary

### CREATE (5 files)

| File                                                            | Description             |
| --------------------------------------------------------------- | ----------------------- |
| `src/supabase/migrations/067_create_transaction_categories.sql` | Table + seed data       |
| `src/types/category.ts`                                         | TypeScript interfaces   |
| `src/stores/catalog/category.service.ts`                        | Service with caching    |
| `src/components/payment-settings/CategoryList.vue`              | Category list component |
| `src/components/payment-settings/CategoryDialog.vue`            | Create/edit dialog      |

### UPDATE (13 files)

| File                                                                                    | Changes                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/stores/catalog/payment-settings.store.ts`                                          | Add categories state, getters, actions      |
| `src/views/catalog/PaymentSettingsView.vue`                                             | Add 3rd column for Categories               |
| `src/stores/account/types.ts`                                                           | ExpenseCategory.type: 'expense' \| 'income' |
| `src/stores/account/constants.ts`                                                       | Add COGS_CATEGORY_LABELS, deprecate old     |
| `src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue`                               | Use store instead of constants              |
| `src/views/accounts/components/dialogs/OperationDialog.vue`                             | Flat list, use store                        |
| `src/views/accounts/components/list/PaymentConfirmationDialog.vue`                      | 'product' → 'supplier'                      |
| `src/views/accounts/components/dialogs/transaction-detail/TransactionDetailContent.vue` | Dynamic getCategoryLabel                    |
| `src/views/accounts/components/detail/AccountOperations.vue`                            | Dynamic getExpenseCategoryLabel             |
| `src/views/accounts/AccountDetailView.vue`                                              | Dynamic getCategoryLabel                    |
| `src/views/accounts/components/detail/PendingPaymentsSection.vue`                       | Dynamic labels and colors                   |
| `src/stores/analytics/types.ts`                                                         | PLReport.opex.byCategory → Record           |
| `src/stores/analytics/plReportStore.ts`                                                 | Dynamic OPEX calculation                    |
| `src/views/backoffice/analytics/PLReportView.vue`                                       | Dynamic OPEX rows                           |

---

## Implementation Order

- [ ] 1. Create migration 067 + apply on DEV
- [ ] 2. Create `src/types/category.ts`
- [ ] 3. Create `src/stores/catalog/category.service.ts`
- [ ] 4. Update `src/stores/catalog/payment-settings.store.ts`
- [ ] 5. Update `src/stores/account/types.ts` (ExpenseCategory)
- [ ] 6. Update `src/stores/account/constants.ts` (COGS_CATEGORY_LABELS)
- [ ] 7. Create `CategoryList.vue` and `CategoryDialog.vue`
- [ ] 8. Update `PaymentSettingsView.vue`
- [ ] 9. Update expense dropdowns (3 files)
- [ ] 10. Update category labels (4 files)
- [ ] 11. Update P&L Report (3 files)
- [ ] 12. Test all flows
- [ ] 13. Apply migration on PROD

---

## Backward Compatibility

1. **COGS categories stay hardcoded** - `product`, `food_cost`, `inventory_*` not in DB
2. **expense_category JSONB unchanged** - parse `.category` and lookup in store by code
3. **Fallback to constants** - if category not in store (COGS), use COGS_CATEGORY_LABELS
4. **PendingPayment.category** - will use same transaction_categories table
