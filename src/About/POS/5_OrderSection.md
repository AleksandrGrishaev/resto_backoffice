# POS System Business Logic & Components Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Components Structure](#components-structure)
5. [Store Management](#store-management)
6. [Selection System](#selection-system)
7. [Calculations](#calculations)
8. [Business Workflows](#business-workflows)
9. [Component Interactions](#component-interactions)
10. [Error Handling](#error-handling)
11. [Future Improvements](#future-improvements)

---

## Overview

### System Purpose

The POS (Point of Sale) system is designed for restaurant/cafe operations with support for:

- Multiple order types (Dine-in, Takeaway, Delivery)
- Multi-bill orders (split billing)
- Kitchen integration
- Payment processing
- Inventory management integration

### Key Business Rules

1. **Orders** contain one or more **Bills**
2. **Bills** contain **Items** (menu items with quantities)
3. **Selection** works across items and entire bills
4. **Calculations** are centralized and reactive
5. **Status tracking** through entire order lifecycle
6. **Payment** can be partial or complete per bill

---

## Architecture

### Store Structure

```
usePosOrdersStore (Main Store)
├── orders: PosOrder[]           # All orders
├── currentOrderId: string       # Active order
├── activeBillId: string         # Active bill within order
├── selectedItems: Set<string>   # Selected item IDs
├── selectedBills: Set<string>   # Selected bill IDs
└── methods                      # All business logic
```

### Component Hierarchy

```
OrderSection.vue (Coordinator)
├── OrderInfo.vue               # Order header info
├── BillsManager.vue            # Main bills management
│   ├── BillsTabs.vue          # Bill navigation
│   └── BillItem.vue           # Individual items
├── OrderTotals.vue            # Calculations display
└── OrderActions.vue           # Action buttons
```

---

## Data Flow

### 1. Order Creation Flow

```
TableStore/OrderStore
    ↓ createOrder()
PosOrder { id, type, bills: [] }
    ↓ auto-create first bill
PosBill { id, orderId, items: [] }
    ↓ setActive
ordersStore.currentOrderId = orderId
ordersStore.activeBillId = billId
```

### 2. Item Addition Flow

```
MenuSection → select item
    ↓ emit('add-item')
PosMainView.handleAddItemFromMenu()
    ↓ ordersStore.addItemToBill()
OrdersService.addItemToBill()
    ↓ localStorage update
PosBillItem created
    ↓ recalculateOrderTotals()
UI automatically updates (reactive)
```

### 3. Selection Flow

```
BillItem checkbox → click
    ↓ emit('select', itemId, selected)
BillsManager.handleItemSelect()
    ↓ ordersStore.toggleItemSelection(itemId)
selectedItems.add/delete(itemId)
    ↓ auto-check bill if all items selected
selectedBills.add/delete(billId)
    ↓ UI updates (computed reactive)
All components reflect selection state
```

---

## Components Structure

### OrderSection.vue (Main Coordinator)

**Responsibilities:**

- Manages all child components
- Executes calculations using `useOrderCalculations`
- Handles all business actions
- Coordinates data flow between components

**Key Features:**

- Uses `useOrderCalculations` composable for all totals
- Passes calculated data to OrderTotals as props
- Manages loading states and error handling
- Integrates with ordersStore for centralized selection

**Props & Data:**

```typescript
// No props - gets data from stores
const currentOrder = computed(() => ordersStore.currentOrder)
const orderTotals = computed(() => ({
  subtotal: calculations.subtotal.value,
  finalTotal: calculations.finalTotal.value
  // ... all calculated values
}))
```

### BillsManager.vue (Bills & Items Management)

**Responsibilities:**

- Displays all bills for current order
- Manages item selection state
- Handles item actions (modify, cancel, etc.)
- Processes checkout and kitchen actions

**Key Features:**

- Uses centralized selection from ordersStore
- No local selection state
- Reactive UI updates based on store selection
- Action bar shows selected items count

**Selection Integration:**

```typescript
// Uses store for all selection logic
:selected="ordersStore.isItemSelected(item.id)"
@select="handleItemSelect"

const handleItemSelect = (itemId: string, selected: boolean) => {
  ordersStore.toggleItemSelection(itemId)
}
```

### BillsTabs.vue (Bill Navigation)

**Responsibilities:**

- Display all bills with status indicators
- Handle bill creation/deletion/renaming
- Show payment status and item counts
- Bill-level selection

**Key Features:**

- Payment status indicators (paid/partial/unpaid)
- New items badges
- Bill selection checkboxes
- Only allows multiple bills for dine-in orders

**Status Indicators:**

```typescript
// Payment status
bill.paymentStatus: 'paid' | 'partial' | 'unpaid'

// New items count
getNewItemsCount(bill) = items.filter(item => item.status === 'pending').length
```

### BillItem.vue (Individual Item Display)

**Responsibilities:**

- Display item details (name, price, quantity, status)
- Handle item selection
- Provide item actions (modify, cancel, add note)
- Show modifications and special requests

**Key Features:**

- Status-based styling and icons
- Quantity controls (+ / -)
- Selection checkbox integration
- Actions menu for item operations

**Item States:**

```typescript
status: 'pending' | // Just added, not sent to kitchen
  'active' | // Normal state
  'sent_to_kitchen' | // Sent to kitchen
  'preparing' | // Being prepared
  'ready' | // Ready for service
  'served' | // Served to customer
  'cancelled' // Cancelled
```

### OrderTotals.vue (Calculations Display)

**Responsibilities:**

- Display all calculated totals
- Show tax breakdowns
- Display payment status
- Show bills breakdown

**Key Features:**

- Pure presentation component
- Receives all data via props
- No calculation logic
- Expandable bills breakdown

**Data Structure:**

```typescript
interface OrderTotals {
  subtotal: number
  itemDiscounts: number
  billDiscounts: number
  serviceTax: number
  governmentTax: number
  finalTotal: number
  paidAmount: number
  remainingAmount: number
}
```

### OrderActions.vue (Action Buttons)

**Responsibilities:**

- Save order changes
- Send orders to kitchen
- Print bills
- Move items between bills
- Process checkout

**Key Features:**

- No QuickActions (removed)
- Shows selection counts in buttons
- Validates action availability
- Integrates with centralized selection

**Action Availability:**

```typescript
canSendToKitchen = hasActiveItems && (hasSelection || hasNewItems)
canMove = ordersStore.hasSelection
canCheckout = hasItems && hasUnpaidBills
```

---

## Store Management

### PosOrdersStore Structure

```typescript
// State
orders: PosOrder[]              // All orders
currentOrderId: string | null   // Active order
activeBillId: string | null     // Active bill

// Selection State (NEW)
selectedItems: Set<string>      // Selected item IDs
selectedBills: Set<string>      // Selected bill IDs

// Computed
currentOrder                    // Current order object
activeBill                      // Current bill object
selectedItemIds                 // Array of selected item IDs
hasSelection                    // Boolean if anything selected

// Methods
selectOrder(orderId)           // Change active order
selectBill(billId)             // Change active bill
addItemToBill()                // Add menu item to bill
toggleItemSelection()          // Toggle item selection
toggleBillSelection()          // Toggle bill selection
clearSelection()               // Clear all selections
sendOrderToKitchen(itemIds)    // Send specific items to kitchen
```

### Selection Logic

```typescript
// Item Selection
toggleItemSelection(itemId) {
  if (selectedItems.has(itemId)) {
    selectedItems.delete(itemId)
  } else {
    selectedItems.add(itemId)
  }

  // Auto-select bill if all items selected
  if (allBillItemsSelected) {
    selectedBills.add(billId)
  } else {
    selectedBills.delete(billId)
  }
}

// Bill Selection
toggleBillSelection(billId) {
  if (selectedBills.has(billId)) {
    selectedBills.delete(billId)
    // Deselect all items in bill
    bill.items.forEach(item => selectedItems.delete(item.id))
  } else {
    selectedBills.add(billId)
    // Select all items in bill
    bill.items.forEach(item => selectedItems.add(item.id))
  }
}
```

---

## Selection System

### Centralized Selection Architecture

All selection logic is centralized in `ordersStore` to eliminate duplication and ensure consistency.

### Selection States

1. **No Selection** - Default state
2. **Item Selection** - Individual items selected via checkboxes
3. **Bill Selection** - Entire bill selected (auto-selects all items)
4. **Mixed Selection** - Combination of individual items and bills

### Selection Rules

1. **Item → Bill**: If all items in a bill are selected, the bill becomes selected
2. **Bill → Items**: If a bill is selected, all its items are selected
3. **Clear on Change**: Selection clears when switching orders or bills
4. **Persistent**: Selection persists during actions within same order/bill

### UI Selection Indicators

```typescript
// Item level
<BillItem :selected="ordersStore.isItemSelected(item.id)" />

// Bill level
<BillsTabs :is-bill-selected="ordersStore.isBillSelected" />

// Action buttons
<v-btn :disabled="!ordersStore.hasSelection">
  Move Items ({{ ordersStore.selectedItemsCount }})
</v-btn>
```

---

## Calculations

### Calculation Architecture

Uses `useOrderCalculations` composable for all calculations, ensuring consistency and reactivity.

### Calculation Flow

```typescript
// In OrderSection.vue
const calculations = useOrderCalculations(() => bills.value, {
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  includeServiceTax: true,
  includeGovernmentTax: true
})

// Pass to OrderTotals
const orderTotals = computed(() => ({
  subtotal: calculations.subtotal.value,
  itemDiscounts: calculations.itemDiscounts.value
  // ... all values
}))
```

### Calculation Hierarchy

```
1. Subtotal (sum of all active items)
2. - Item Discounts (individual item discounts)
3. - Bill Discounts (bill-level discounts)
4. = Discounted Subtotal
5. + Service Tax (5% of discounted subtotal)
6. + Government Tax (10% of discounted subtotal)
7. = Final Total
```

### Tax Calculation Rules

- Taxes calculated on **discounted subtotal** (after all discounts)
- Service tax: 5% (configurable)
- Government tax: 10% (configurable)
- Taxes can be disabled via props

---

## Business Workflows

### 1. Complete Order Workflow

```
1. Create Order (TableStore or direct)
   ↓
2. Auto-create first bill
   ↓
3. Add items from menu
   ↓
4. Send items to kitchen (selected or all new)
   ↓
5. Items prepared and served
   ↓
6. Process payment (selected items or full bill)
   ↓
7. Close order when all bills paid
```

### 2. Split Bill Workflow

```
1. Start with single bill containing multiple items
   ↓
2. Create additional bills (dine-in only)
   ↓
3. Select items to move
   ↓
4. Move items between bills
   ↓
5. Each bill can be paid separately
   ↓
6. Order complete when all bills paid
```

### 3. Kitchen Integration Workflow

```
1. Items added with status: 'pending'
   ↓
2. Select items (or send all new items)
   ↓
3. Send to Kitchen → status: 'sent_to_kitchen'
   ↓
4. Kitchen updates status: 'preparing' → 'ready'
   ↓
5. Staff serves item → status: 'served'
```

### 4. Payment Workflow

```
1. Select items for payment (or entire bill)
   ↓
2. Calculate payment amount (including taxes)
   ↓
3. Process payment
   ↓
4. Update item paymentStatus: 'paid'
   ↓
5. Update bill paymentStatus based on items
   ↓
6. Order status updates when all bills paid
```

---

## Component Interactions

### Data Flow Between Components

```
OrderSection (Data Source)
├── Gets data from ordersStore
├── Calculates totals with useOrderCalculations
├── Passes data down via props
└── Handles all business logic

BillsManager (Display & Actions)
├── Receives bills data via props
├── Uses ordersStore for selection
├── Emits actions up to OrderSection
└── Manages item interactions

OrderTotals (Pure Display)
├── Receives calculated totals via props
├── No business logic
├── Pure presentation component
└── Shows formatted calculations

OrderActions (Action Triggers)
├── Receives order/bills data via props
├── Uses ordersStore for selection info
├── Emits action events to OrderSection
└── Shows action availability
```

### Event Flow

```
User Action (click, select, etc.)
    ↓
Component Event (emit)
    ↓
OrderSection Handler
    ↓
Store Update (ordersStore method)
    ↓
Service Call (if needed)
    ↓
UI Update (reactive computed)
```

### Props vs Store Usage

**Props Used For:**

- Static configuration (tax rates, display options)
- Calculated data (totals, breakdowns)
- Order/bill data passed down

**Store Used For:**

- Selection state (selectedItems, selectedBills)
- Current order/bill state
- Business actions (add, remove, update items)

---

## Error Handling

### Error Categories

1. **Validation Errors** - Invalid data or business rule violations
2. **Service Errors** - localStorage or API failures
3. **UI Errors** - Component rendering issues
4. **Selection Errors** - Invalid selection states

### Error Handling Strategy

```typescript
// Service Level
try {
  const result = await ordersService.addItemToBill(...)
  if (!result.success) {
    throw new Error(result.error)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Operation failed'
  return { success: false, error: message }
}

// Component Level
const handleAction = async () => {
  try {
    const result = await ordersStore.someAction()
    if (result.success) {
      showSuccess('Action completed')
    } else {
      showError(result.error)
    }
  } catch (error) {
    showError('Unexpected error occurred')
  }
}
```

### Error Recovery

- **Auto-retry** for network failures
- **Data validation** before service calls
- **Graceful degradation** for non-critical features
- **Clear error messages** for user actions

---

## Future Improvements

### Performance Optimizations

1. **Virtual scrolling** for large item lists
2. **Debounced calculations** for rapid changes
3. **Memoized components** for expensive renders
4. **Lazy loading** for bill content

### Feature Enhancements

1. **Drag & drop** for moving items between bills
2. **Keyboard shortcuts** for common actions
3. **Offline support** with sync when online
4. **Advanced filtering** and search

### Architecture Improvements

1. **TypeScript strict mode** for better type safety
2. **Unit tests** for all business logic
3. **E2E tests** for critical workflows
4. **Performance monitoring** for optimization

### Integration Points

1. **Real kitchen integration** (WebSocket/API)
2. **Payment processor** integration
3. **Inventory management** sync
4. **Customer management** system
5. **Reporting and analytics** module

---

## Development Guidelines

### Code Organization

- **Single Responsibility** - Each component has one clear purpose
- **Centralized State** - All shared state in appropriate stores
- **Reactive Patterns** - Use computed properties for derived data
- **Type Safety** - Comprehensive TypeScript interfaces

### Testing Strategy

- **Unit Tests** - All store methods and utilities
- **Component Tests** - Individual component behavior
- **Integration Tests** - Component interaction flows
- **E2E Tests** - Complete business workflows

### Performance Considerations

- **Computed Properties** - For expensive calculations
- **Event Debouncing** - For rapid user interactions
- **Memory Management** - Clean up watchers and subscriptions
- **Bundle Optimization** - Tree shaking and code splitting

This guide provides the foundation for understanding and extending the POS system architecture and business logic.
