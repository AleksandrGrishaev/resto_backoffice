# Kitchen Monitor Request Feature - Implementation Plan

## Overview

Add a "Request" tab to Kitchen and Bar monitors, enabling staff to create procurement requests directly from the monitor interface with AI-powered suggestions. This feature mirrors the supplier_2 Order Assistant functionality but is adapted for the kitchen/bar context.

**IMPORTANT:** useKitchenRequest uses **ISOLATED STATE** - does NOT wrap useOrderAssistant to avoid shared state conflicts between Kitchen Request and Supplier2 Order Assistant screens.

---

## Requirements

| Requirement              | Detail                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| **Request Type**         | Create and send procurement requests only (no order fulfillment) |
| **Access**               | All monitor users: `admin`, `kitchen`, `bar` roles               |
| **Department Filtering** | Auto-filter by current department                                |
| **Kitchen Monitor**      | Shows only Kitchen products                                      |
| **Bar Monitor**          | Shows only Bar products                                          |
| **Admin**                | Uses sidebar department selection                                |

---

## Architecture

### Target File Structure

```
src/views/kitchen/request/
   RequestScreen.vue                          # Main screen component
   composables/
      useKitchenRequest.ts                   # Kitchen-specific composable (ISOLATED STATE)
   components/
       KitchenOrderAssistant.vue              # Adapted from BaseOrderAssistant
       KitchenManualItemForm.vue              # Adapted from ManualItemForm
       KitchenSummaryPanel.vue                # Adapted from RequestSummaryPanel
       KitchenSuggestionCard.vue              # Adapted from SuggestionItemCard
       KitchenQuickAddDialog.vue              # Copy from QuickAddItemDialog
       ItemSearchWidget.vue                   # Copy from supplier_2
       package/
           PackageSelector.vue                # Copy from supplier_2
           PackageOptionDialog.vue            # Copy from supplier_2 (for package creation)
```

### Component Hierarchy

```
RequestScreen.vue
   KitchenOrderAssistant.vue
       Tab: Suggestions
          KitchenSuggestionCard.vue (multiple)
       Tab: Manual
          KitchenManualItemForm.vue
              ItemSearchWidget.vue
              KitchenQuickAddDialog.vue
                  PackageSelector.vue
                  PackageOptionDialog.vue
       Tab: Summary
           KitchenSummaryPanel.vue
               PackageSelector.vue
               PackageOptionDialog.vue
```

### Data Flow

```
KitchenSidebar (selectedDepartment, screen-select)
    ↓
KitchenMainView (routes to screen)
    ↓ prop: selectedDepartment
RequestScreen (effectiveDepartment from composable)
    ↓ props: department, requestedBy
KitchenOrderAssistant
    ↓ prop: department
KitchenManualItemForm (filters products by department)
```

### Department Detection Logic

| User Role | selectedDepartment | effectiveDepartment |
| --------- | ------------------ | ------------------- |
| admin     | 'all'              | 'kitchen' (default) |
| admin     | 'kitchen'          | 'kitchen'           |
| admin     | 'bar'              | 'bar'               |
| kitchen   | any                | 'kitchen'           |
| bar       | any                | 'bar'               |

---

## Sprint 1: Foundation (Components & Composables)

### Task 1.1: Create `useKitchenRequest.ts` composable (ISOLATED STATE)

**File:** `src/views/kitchen/request/composables/useKitchenRequest.ts`

**CRITICAL:** This composable has its own ISOLATED state. It does NOT wrap `useOrderAssistant` to avoid sharing state with the Supplier2 Order Assistant.

**Responsibilities:**

- `effectiveDepartment`: Auto-detect from user role or use `selectedDepartment`
- `pendingRequestCount`: Count of draft/submitted requests for badge
- `requestedByName`: Current user's display name from authStore
- Local `selectedItems` state (NOT shared with supplier_2)
- Department-filtered suggestions

**Implementation:**

```typescript
// useKitchenRequest.ts - ISOLATED STATE VERSION
import { computed, reactive, ref, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSupplierStore } from '@/stores/supplier_2/supplierStore'
import { useProductsStore } from '@/stores/productsStore'
import { useStorageStore } from '@/stores/storage'
import type {
  Department,
  OrderSuggestion,
  RequestItem,
  CreateRequestData,
  Priority
} from '@/stores/supplier_2/types'
import { formatIDR } from '@/utils/currency'

// LOCAL STATE (not shared with supplier_2)
interface KitchenRequestState {
  selectedItems: RequestItem[]
  isGenerating: boolean
  isCreatingRequest: boolean
}

export function useKitchenRequest(selectedDepartment?: Ref<'all' | 'kitchen' | 'bar'>) {
  const authStore = useAuthStore()
  const supplierStore = useSupplierStore()
  const productsStore = useProductsStore()
  const storageStore = useStorageStore()

  // ISOLATED state - not shared with supplier_2
  const state = reactive<KitchenRequestState>({
    selectedItems: [],
    isGenerating: false,
    isCreatingRequest: false
  })

  // Auto-detect department from role
  const effectiveDepartment = computed((): Department => {
    const roles = authStore.userRoles
    if (roles.includes('admin') && selectedDepartment?.value) {
      if (selectedDepartment.value === 'all') return 'kitchen'
      return selectedDepartment.value as Department
    }
    if (roles.includes('bar') && !roles.includes('kitchen')) return 'bar'
    return 'kitchen'
  })

  // Pending request count for badge
  const pendingRequestCount = computed(() => {
    return supplierStore.state.requests.filter(
      r => r.status === 'draft' || r.status === 'submitted'
    ).length
  })

  const requestedByName = computed(() => authStore.currentUser?.email || 'Kitchen Staff')

  // Filter suggestions by department
  const departmentFilteredSuggestions = computed(() => {
    const dept = effectiveDepartment.value
    const suggestions = supplierStore.state.orderSuggestions || []
    return suggestions.filter(suggestion => {
      const product = productsStore.getProductById(suggestion.itemId)
      return product?.usedInDepartments?.includes(dept)
    })
  })

  // Generate suggestions for current department
  async function generateSuggestions(): Promise<void> {
    state.isGenerating = true
    try {
      await storageStore.fetchBalances(effectiveDepartment.value)
      await supplierStore.refreshSuggestions(effectiveDepartment.value)
    } finally {
      state.isGenerating = false
    }
  }

  // Add item to local selection
  function addSelectedItem(suggestion: OrderSuggestion, customQuantity?: number): void {
    const existing = state.selectedItems.find(i => i.itemId === suggestion.itemId)
    if (existing) {
      existing.requestedQuantity += customQuantity || suggestion.suggestedQuantity
    } else {
      const product = productsStore.getProductById(suggestion.itemId)
      state.selectedItems.push({
        id: `item-${Date.now()}`,
        itemId: suggestion.itemId,
        itemName: suggestion.itemName,
        category: product?.category || 'other',
        requestedQuantity: customQuantity || suggestion.suggestedQuantity,
        unit: product?.baseUnit || 'gram',
        estimatedPrice: suggestion.estimatedPrice || product?.lastKnownCost || 0,
        priority: suggestion.urgency === 'high' ? 'urgent' : 'normal'
      })
    }
  }

  function removeSelectedItem(itemId: string): void {
    const idx = state.selectedItems.findIndex(i => i.itemId === itemId)
    if (idx !== -1) state.selectedItems.splice(idx, 1)
  }

  function clearSelectedItems(): void {
    state.selectedItems = []
  }

  // Create request using supplierStore
  async function createRequest(
    requestedBy: string,
    priority: Priority,
    notes?: string
  ): Promise<string> {
    state.isCreatingRequest = true
    try {
      const createData: CreateRequestData = {
        department: effectiveDepartment.value,
        requestedBy,
        items: state.selectedItems,
        priority,
        notes: notes || `Request from Kitchen Monitor`
      }
      const newRequest = await supplierStore.createRequest(createData)
      clearSelectedItems()
      await supplierStore.refreshSuggestions(effectiveDepartment.value)
      return newRequest.id
    } finally {
      state.isCreatingRequest = false
    }
  }

  return {
    // State
    state,
    selectedItems: computed(() => state.selectedItems),
    isGenerating: computed(() => state.isGenerating),
    isCreatingRequest: computed(() => state.isCreatingRequest),

    // Department
    effectiveDepartment,
    pendingRequestCount,
    requestedByName,

    // Suggestions
    departmentFilteredSuggestions,
    generateSuggestions,

    // Item management
    addSelectedItem,
    removeSelectedItem,
    clearSelectedItems,

    // Request creation
    createRequest,

    // Re-export stores for component access
    supplierStore,
    productsStore
  }
}
```

### Task 1.2: Clone and adapt shared components

**Source → Target mapping:**

| #   | Source File                                                    | Target File                                                  | Changes Required                                                                  |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | `supplier_2/components/shared/BaseOrderAssistant.vue`          | `kitchen/request/components/KitchenOrderAssistant.vue`       | Convert dialog to inline component, remove department toggle, use department prop |
| 2   | `supplier_2/components/shared/ManualItemForm.vue`              | `kitchen/request/components/KitchenManualItemForm.vue`       | Add `department` prop for product filtering                                       |
| 3   | `supplier_2/components/shared/RequestSummaryPanel.vue`         | `kitchen/request/components/KitchenSummaryPanel.vue`         | Simplified layout, add department display                                         |
| 4   | `supplier_2/components/shared/SuggestionItemCard.vue`          | `kitchen/request/components/KitchenSuggestionCard.vue`       | Dark theme styling adjustments                                                    |
| 5   | `supplier_2/components/shared/QuickAddItemDialog.vue`          | `kitchen/request/components/KitchenQuickAddDialog.vue`       | Copy with minor path updates                                                      |
| 6   | `supplier_2/components/procurement/ItemSearchWidget.vue`       | `kitchen/request/components/ItemSearchWidget.vue`            | Copy                                                                              |
| 7   | `supplier_2/components/shared/package/PackageSelector.vue`     | `kitchen/request/components/package/PackageSelector.vue`     | Copy                                                                              |
| 8   | `supplier_2/components/shared/package/PackageOptionDialog.vue` | `kitchen/request/components/package/PackageOptionDialog.vue` | Copy                                                                              |

### Task 1.3: KitchenOrderAssistant key changes

**Original (BaseOrderAssistant.vue):**

- Full-screen dialog with `v-dialog`
- Department toggle in header (Kitchen/Bar buttons)
- Uses `useOrderAssistant` directly

**Adapted (KitchenOrderAssistant.vue):**

- Inline component (no dialog wrapper)
- Department passed as prop (no toggle)
- Receives `department` and `requestedBy` from parent
- Uses `useKitchenRequest` for isolated state

**Key code differences:**

```vue
<!-- Remove: v-dialog wrapper -->
<!-- Remove: Department toggle section -->
<!-- Add: Props interface -->
<script setup lang="ts">
interface Props {
  department: 'kitchen' | 'bar'
  requestedBy: string
}
const props = defineProps<Props>()

// Use props.department instead of selectedDepartmentIndex
// Use useKitchenRequest instead of useOrderAssistant for isolated state
</script>
```

### Task 1.4: KitchenManualItemForm key changes

**Add department prop and filter products:**

```typescript
interface Props {
  existingItemIds?: string[]
  loading?: boolean
  department: 'kitchen' | 'bar' // NEW
}

const availableProductsForSearch = computed(() => {
  const activeProducts = productsStore.products.filter(
    p => p.isActive && (p.usedInDepartments?.includes(props.department) || !p.usedInDepartments) // Include unrestricted products
  )
  // ... enrichment with stock data
})
```

---

## Sprint 2: RequestScreen Integration

### Task 2.1: Create `RequestScreen.vue`

**File:** `src/views/kitchen/request/RequestScreen.vue`

```vue
<template>
  <div class="request-screen">
    <!-- Header with department indicator -->
    <div class="request-header">
      <div class="d-flex align-center gap-3">
        <v-icon size="32" color="primary">mdi-clipboard-list</v-icon>
        <div>
          <h2 class="text-h5 font-weight-bold">Create Procurement Request</h2>
          <div class="text-body-2 text-medium-emphasis">
            AI-powered suggestions for {{ effectiveDepartment }}
          </div>
        </div>
      </div>
      <v-chip :color="effectiveDepartment === 'kitchen' ? 'orange' : 'purple'" size="large">
        <v-icon start>
          {{ effectiveDepartment === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail' }}
        </v-icon>
        {{ effectiveDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
      </v-chip>
    </div>

    <!-- Inline Assistant -->
    <KitchenOrderAssistant
      :department="effectiveDepartment"
      :requested-by="requestedByName"
      @success="handleRequestSuccess"
      @error="handleRequestError"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      <v-icon start>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      <v-icon start>mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useKitchenRequest } from './composables/useKitchenRequest'
import KitchenOrderAssistant from './components/KitchenOrderAssistant.vue'

interface Props {
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

const props = defineProps<Props>()

const { effectiveDepartment, requestedByName } = useKitchenRequest(
  toRef(props, 'selectedDepartment')
)

const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const handleRequestSuccess = (message: string) => {
  successMessage.value = message
  showSuccess.value = true
}

const handleRequestError = (message: string) => {
  errorMessage.value = message
  showError.value = true
}
</script>

<style scoped lang="scss">
.request-screen {
  height: 100%;
  padding: var(--spacing-lg);
  overflow-y: auto;
  background-color: var(--v-theme-surface);
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
```

### Task 2.2: Update `KitchenSidebar.vue`

**File:** `src/views/kitchen/components/KitchenSidebar.vue`

**Changes:**

1. **Update Props interface:**

```typescript
interface Props {
  currentScreen?: 'orders' | 'preparation' | 'kpi' | 'request' // Add 'request'
}
```

2. **Update emit type:**

```typescript
const emit = defineEmits<{
  'screen-select': [screen: 'orders' | 'preparation' | 'kpi' | 'request'] // Add 'request'
  'department-change': [department: 'all' | 'kitchen' | 'bar']
}>()
```

3. **Import composable:**

```typescript
import { useKitchenRequest } from '../request/composables/useKitchenRequest'

const { pendingRequestCount } = useKitchenRequest()
```

4. **Add Request button in template (after KPI button):**

```vue
<div class="separator" />

<!-- Request Screen Button -->
<v-btn
  :class="['screen-btn', { active: currentScreen === 'request' }]"
  :color="currentScreen === 'request' ? 'primary' : undefined"
  :variant="currentScreen === 'request' ? 'flat' : 'text'"
  block
  height="56"
  @click="handleScreenSelect('request')"
>
  <div class="screen-btn-content">
    <v-icon size="24">mdi-clipboard-list</v-icon>
    <span class="screen-btn-label">Request</span>
    <v-badge
      v-if="pendingRequestCount > 0"
      :content="pendingRequestCount"
      color="warning"
      inline
    />
  </div>
</v-btn>
```

5. **Update handleScreenSelect method:**

```typescript
const handleScreenSelect = (screen: 'orders' | 'preparation' | 'kpi' | 'request') => {
  DebugUtils.debug(MODULE_NAME, 'Screen selected', { screen })
  emit('screen-select', screen)
}
```

### Task 2.3: Update `KitchenMainView.vue`

**File:** `src/views/kitchen/KitchenMainView.vue`

**Changes:**

1. **Update currentScreen type:**

```typescript
const currentScreen = ref<'orders' | 'preparation' | 'kpi' | 'request'>('orders')
```

2. **Import RequestScreen:**

```typescript
import RequestScreen from './request/RequestScreen.vue'
```

3. **Add RequestScreen to template (in screen switching section):**

```vue
<!-- Request Screen -->
<RequestScreen v-else-if="currentScreen === 'request'" :selected-department="selectedDepartment" />
```

4. **Update handleScreenSelect:**

```typescript
const handleScreenSelect = (screen: 'orders' | 'preparation' | 'kpi' | 'request'): void => {
  currentScreen.value = screen
  DebugUtils.debug(MODULE_NAME, 'Screen selected', { screen })
}
```

---

## Sprint 3: Testing & Verification

### Task 3.1: Test department auto-filtering

| #   | Scenario                           | Expected Behavior                          |
| --- | ---------------------------------- | ------------------------------------------ |
| 1   | Admin selects "All" in sidebar     | Request screen shows Kitchen products      |
| 2   | Admin selects "Kitchen" in sidebar | Request screen shows Kitchen products      |
| 3   | Admin selects "Bar" in sidebar     | Request screen shows Bar products          |
| 4   | Kitchen user (no admin role)       | Request screen shows only Kitchen products |
| 5   | Bar user (no admin role)           | Request screen shows only Bar products     |

### Task 3.2: Verify isolated state

Test that Kitchen Request and Supplier2 Order Assistant do NOT share state:

1. Add items in Kitchen Request
2. Open Supplier2 Order Assistant
3. Verify items are NOT visible in Supplier2

### Task 3.3: Verify product filtering

Products are filtered by `product.usedInDepartments?.includes(department)`:

```typescript
// In KitchenManualItemForm.vue
const availableProductsForSearch = computed(() => {
  const dept = props.department
  return productsStore.products.filter(
    p => p.isActive && (p.usedInDepartments?.includes(dept) || !p.usedInDepartments)
  )
})
```

---

## Sprint 4: Polish & Error Handling

### Task 4.1: Badge implementation

**Already implemented in Sprint 2.2** - Sidebar shows pending request count:

- Color: `warning` (yellow/orange)
- Shows count of `draft` + `submitted` requests
- Updates reactively

### Task 4.2: Loading states

**In KitchenOrderAssistant.vue:**

```vue
<!-- Loading overlay for suggestions -->
<div v-if="isGenerating" class="loading-overlay">
  <v-progress-circular indeterminate color="primary" size="48" />
  <span class="mt-3">Analyzing stock levels...</span>
</div>

<!-- Loading state for request submission -->
<v-btn
  :loading="isCreating"
  :disabled="isCreating || selectedCount === 0"
  color="success"
  @click="sendRequest"
>
  <v-icon start>mdi-send</v-icon>
  {{ isCreating ? 'Sending...' : 'Send Request' }}
</v-btn>
```

### Task 4.3: Error handling

**In RequestScreen.vue:**

- Error snackbar with 5 second timeout
- Red color, alert icon
- Error message from child component

### Task 4.4: Success notifications

**In RequestScreen.vue:**

- Success snackbar with 3 second timeout
- Green color, check icon
- Message: "Request {id} created successfully"

### Task 4.5: Kitchen-appropriate styling

**Large touch targets (48px minimum) for tablet use:**

```scss
.kitchen-order-assistant {
  .v-tab {
    min-height: 56px;
    font-size: var(--text-base);
  }

  .v-btn {
    min-height: var(--touch-button); // 48px
  }
}
```

---

## Files to Modify Summary

| File                                              | Action                              | Sprint |
| ------------------------------------------------- | ----------------------------------- | ------ |
| `src/views/kitchen/KitchenMainView.vue`           | MODIFY - add request screen routing | 2      |
| `src/views/kitchen/components/KitchenSidebar.vue` | MODIFY - add Request button         | 2      |

## Files to Create Summary

| File                                                                   | Action                  | Sprint |
| ---------------------------------------------------------------------- | ----------------------- | ------ |
| `src/views/kitchen/request/RequestScreen.vue`                          | CREATE                  | 2      |
| `src/views/kitchen/request/composables/useKitchenRequest.ts`           | CREATE (ISOLATED STATE) | 1      |
| `src/views/kitchen/request/components/KitchenOrderAssistant.vue`       | CREATE (adapt)          | 1      |
| `src/views/kitchen/request/components/KitchenManualItemForm.vue`       | CREATE (adapt)          | 1      |
| `src/views/kitchen/request/components/KitchenSummaryPanel.vue`         | CREATE (adapt)          | 1      |
| `src/views/kitchen/request/components/KitchenSuggestionCard.vue`       | CREATE (adapt)          | 1      |
| `src/views/kitchen/request/components/KitchenQuickAddDialog.vue`       | CREATE (copy)           | 1      |
| `src/views/kitchen/request/components/ItemSearchWidget.vue`            | CREATE (copy)           | 1      |
| `src/views/kitchen/request/components/package/PackageSelector.vue`     | CREATE (copy)           | 1      |
| `src/views/kitchen/request/components/package/PackageOptionDialog.vue` | CREATE (copy)           | 1      |

## Source Files Reference

| Source File                                                              | Purpose                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| `src/views/supplier_2/components/shared/BaseOrderAssistant.vue`          | Template for KitchenOrderAssistant                |
| `src/views/supplier_2/components/shared/ManualItemForm.vue`              | Template for KitchenManualItemForm                |
| `src/views/supplier_2/components/shared/RequestSummaryPanel.vue`         | Template for KitchenSummaryPanel                  |
| `src/views/supplier_2/components/shared/SuggestionItemCard.vue`          | Template for KitchenSuggestionCard                |
| `src/views/supplier_2/components/shared/QuickAddItemDialog.vue`          | Copy for KitchenQuickAddDialog                    |
| `src/views/supplier_2/components/procurement/ItemSearchWidget.vue`       | Copy                                              |
| `src/views/supplier_2/components/shared/package/PackageSelector.vue`     | Copy                                              |
| `src/views/supplier_2/components/shared/package/PackageOptionDialog.vue` | Copy (for package creation)                       |
| `src/stores/supplier_2/composables/useOrderAssistant.ts`                 | Reference only (DO NOT WRAP - use isolated state) |

---

## Dependencies (No Changes Needed)

- `supplierStore` from `@/stores/supplier_2` - request CRUD, suggestions refresh
- `productsStore` - product data
- `storageStore` - stock balances
- `authStore` - user roles

**No database migrations needed** - reuses existing supplier_2 tables.
