# POS System Store Architecture

## Overview

The POS system uses a two-store architecture for managing orders and bills:

- `BillStore`: Manages active bill and its items
- `OrderStore`: Manages collection of bills and order-level operations

## BillStore

### Purpose

Handles operations and state management for the currently active bill.

### State

- `activeBill: Bill | null` - Currently selected bill
- `hasUnsavedChanges: boolean` - Tracks bill modifications
- `selection: SelectableState` - Manages item selection state
- `billHistory: BillHistoryChange[]` - Tracks bill changes

### Computed Properties

- `billSubtotal` - Calculates bill subtotal
- `billTaxes` - Calculates service and government taxes
- `billTotal` - Calculates total with taxes
- `hasSelection` - Checks if items are selected

### Methods

#### Selection Management

- `clearSelection()` - Clears all selections
- `toggleItemSelection(itemId: string)` - Toggles single item selection
- `isItemSelected(itemId: string)` - Checks if item is selected

#### Bill Management

- `setActiveBill(bill: Bill | null)` - Sets active bill
- `updateBillName(name: string)` - Updates bill name
- `validateBill(): ValidationResult` - Validates bill data
- `validateStatus(status: string): ValidationResult` - Validates bill status
- `isBillEditable(): boolean` - Checks if bill can be edited

#### History Management

- `addHistoryRecord()` - Records bill changes

## OrderStore

### Purpose

Manages multiple bills within an order and handles order-level operations.

### State

- `bills: Bill[]` - Collection of all bills
- `activeBillId: string | null` - ID of active bill
- `hasUnsavedChanges: boolean` - Tracks order modifications
- `lastSavedState` - Keeps last saved state

### Computed Properties

- `activeBill` - Currently selected bill
- `orderSubtotal` - Total for all bills
- `orderTaxes` - Taxes for entire order
- `orderTotal` - Order total with taxes
- `canSave` - Checks if order can be saved

### Methods

#### Initialization

- `initialize(orderId: string)` - Sets up order state
- `reset()` - Clears order state
- `createInitialBill(orderId: string)` - Creates first bill

#### Bill Management

- `addBill(orderId: string)` - Creates new bill
- `setActiveBill(billId: string)` - Changes active bill
- `mergeBills()` - Combines multiple bills
- `moveBillToTable(billId: string, tableId: string)` - Changes bill table
- `updateBillType(billId: string, type: DeliveryType)` - Updates delivery type

#### Item Operations

- `moveItem(itemId: string, fromBillId: string, toBillId: string)` - Moves items between bills

#### Order Operations

- `confirmOrder()` - Saves and confirms order
- `validateOrder()` - Validates entire order

## Store Interactions

### Data Flow

```
TableStore → OrderStore → BillStore
    │             │           │
    └─────────────┴───────────┘
         Event Updates
```

### Responsibilities Division

1. **BillStore**

   - Active bill state
   - Item selection
   - Bill validation
   - Bill history

2. **OrderStore**
   - Bills collection
   - Order validation
   - Bill movement
   - Data persistence

### Validation Chain

```
OrderStore.validateOrder()
         ↓
   BillStore.validateBill()
         ↓
   BillStore.validateStatus()
```

### State Sync

- OrderStore maintains collection
- BillStore tracks active bill
- Changes propagate up from BillStore to OrderStore

## Best Practices

### Error Handling

- All methods return ValidationResult
- Errors are logged with DebugUtils
- State is preserved on error

### Data Consistency

- Changes tracked via hasUnsavedChanges
- History recorded for all modifications
- Validation before state changes

### Performance

- Computed properties for calculations
- Deep watchers for change detection
- Optimized selection handling

# TableStore

## Purpose

Manages tables state and order assignments in the restaurant system.

## State

```typescript
// Primary State
tables: Table[]               // List of all tables
orders: Order[]              // All orders
ordersData: Map<string, OrderData> // Order data storage
activeOrderId: string | null  // Current active order
```

## Computed Properties

### Order Related

- `activeOrder` - Currently selected order
- `activeOrders` - All active (non-completed) orders
- `getOrderById` - Order lookup by ID
- `getOrderBills` - Bills for specific order

### Table Related

- `getTableById` - Table lookup by ID
- `isMultipleBillsAllowed` - Checks if order type allows multiple bills

## Methods

### Table Management

```typescript
updateTableStatus(
  tableId: string,
  status: TableStatus,
  orderId?: string
): void
```

- Updates table status (free/occupied/reserved)
- Links/unlinks orders with tables
- Updates table metadata

### Order Management

#### Creation & Assignment

```typescript
createOrder(
  type: OrderType,
  tableId: string
): string
```

- Creates new order with unique ID
- Assigns to table if dine-in
- Generates order number

#### Status Changes

```typescript
completeOrder(orderId: string): void
```

- Marks order as completed
- Releases assigned table
- Updates order status

#### Table Operations

```typescript
moveOrderToTable(
  orderId: string,
  targetTableId: string
): Promise<void>
```

- Moves order to different table
- Updates table statuses
- Preserves order history

```typescript
changeOrderTable(
  orderId: string,
  newTableId: string
): Promise<void>
```

- Changes order's assigned table
- Handles table status updates

#### Type Management

```typescript
changeOrderType(
  orderId: string,
  newType: OrderType,
  tableId?: string
): Promise<void>
```

- Changes order type (dine-in/takeaway/delivery)
- Handles table assignments
- Validates type change

```typescript
validateOrderTypeChange(
  orderId: string,
  newType: OrderType
): boolean
```

- Validates if order type change is allowed
- Checks bill constraints

### Data Management

```typescript
saveOrderData(
  orderId: string,
  bills: Bill[]
): void
```

- Saves order state
- Updates order history
- Manages data persistence

```typescript
getOrderData(
  orderId: string
): OrderData | undefined
```

- Retrieves order data
- Returns undefined if not found

## State Transitions

### Table Status Flow

```
free → occupied → free
     ↑          ↓
    reserved ←--┘
```

### Order Type Transitions

```
dine-in ←→ takeaway
  ↕          ↕
    delivery
```

## Validation Rules

### Table Assignment

- Only one active order per table
- Table must be free for assignment
- Dine-in orders require table assignment

### Order Type Changes

- Multiple bills only allowed for dine-in
- Takeaway/delivery orders release tables
- Type changes validate bill constraints

## Integration Points

### With OrderStore

- Provides order data storage
- Manages order-table relationships
- Validates order operations

### With BillStore

- Validates bill operations
- Provides bill storage context
- Manages bill constraints

## Error Handling

### Common Errors

- Table not found
- Order not found
- Invalid status transition
- Validation failures

### Error Response Format

```typescript
{
  isValid: boolean
  code: string
  message: string
}
```

## Best Practices

### State Updates

- Atomic operations
- Validation before changes
- Event logging
- State consistency checks

### Performance Considerations

- Computed property caching
- Minimal state updates
- Efficient lookups

### Data Integrity

- Validation before state changes
- Consistent error handling
- State recovery mechanisms
