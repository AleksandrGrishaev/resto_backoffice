# Order Item Cancellation Validation & Write-off System

## Sprint: POS Item Cancellation

**Status**: Planned
**Priority**: High

---

## Task List

- [ ] **1. Database Migration** - Add cancellation fields to order_items table
- [ ] **2. Types Update** - Add cancellation fields to PosBillItem interface
- [ ] **3. Services Layer** - Add cancelItem method to orders service
- [ ] **4. Store Action** - Add cancelItem action to ordersStore
- [ ] **5. Cancellation Composable** - Create useCancellation.ts with write-off integration
- [ ] **6. Cancel Dialog** - Update BillItemCancelDialog with reason selector and write-off checkbox
- [ ] **7. BillItem UI** - Add validation and visual feedback for cancelled items
- [ ] **8. OrderSection** - Wire up new cancellation flow

---

## Business Logic

### Cancellation Rules by Status:

| Status    | Action                | Reason Required | Write-off Dialog |
| --------- | --------------------- | --------------- | ---------------- |
| `draft`   | DELETE item           | No              | No               |
| `waiting` | Mark as `cancelled`   | Yes             | Ask              |
| `cooking` | Mark as `cancelled`   | Yes             | Ask              |
| `ready`   | Mark as `cancelled`   | Yes             | Ask              |
| `served`  | BLOCK (cannot cancel) | -               | -                |
| `paid`    | BLOCK (cannot cancel) | -               | -                |

### Cancellation Reasons:

- Kitchen mistake
- Customer refused
- Wrong order
- Out of stock
- Other (with text input)

### Write-off Integration:

- Use existing `DecompositionEngine` + `WriteOffAdapter` for ingredient decomposition
- Create write-off with reason `other` (add note referencing cancelled order)
- User decides per-cancellation whether to write-off ingredients

---

## Implementation Details

### 1. Database Migration

```sql
-- Migration: add_item_cancellation_fields
ALTER TABLE order_items
ADD COLUMN cancelled_at timestamptz,
ADD COLUMN cancelled_by text,
ADD COLUMN cancellation_reason text,
ADD COLUMN cancellation_notes text,
ADD COLUMN write_off_operation_id uuid;
```

### 2. Types (`src/stores/pos/types.ts`)

Add to `PosBillItem`:

```typescript
cancelledAt?: string
cancelledBy?: string
cancellationReason?: string
cancellationNotes?: string
writeOffOperationId?: string  // Link to write-off if created
```

### 3. Files to Modify

| File                                                   | Changes                                |
| ------------------------------------------------------ | -------------------------------------- |
| `src/stores/pos/types.ts`                              | Add cancellation fields to PosBillItem |
| `src/stores/pos/orders/services.ts`                    | Add cancelItem() method                |
| `src/stores/pos/orders/ordersStore.ts`                 | Add cancelItem() action                |
| `src/stores/pos/orders/composables/useCancellation.ts` | NEW: Cancellation + write-off logic    |
| `src/views/pos/order/dialogs/BillItemCancelDialog.vue` | Reason selector, write-off checkbox    |
| `src/views/pos/order/components/BillItem.vue`          | Validation, visual feedback            |
| `src/views/pos/order/OrderSection.vue`                 | Wire up new flow                       |

### 4. Cancel Dialog Changes (`BillItemCancelDialog.vue`)

- Add v-select for cancellation reason
- Add "Other" option with text input
- Add "Write-off ingredients" checkbox (shown for waiting+ statuses)
- Emit: `{ itemId, reason, notes, shouldWriteOff }`

### 5. useCancellation Composable

```typescript
// src/stores/pos/orders/composables/useCancellation.ts
export function useCancellation() {
  async function cancelItem(
    item: PosBillItem,
    reason: string,
    notes?: string,
    shouldWriteOff?: boolean
  ): Promise<ServiceResponse<void>> {
    // 1. Validate status (block served/paid)
    // 2. If draft: delete item
    // 3. If waiting+: update status to 'cancelled'
    // 4. If shouldWriteOff: decompose & create write-off
  }
}
```

---

## Validation Summary

### Cancel Button Enabled:

- Item status: `draft`, `waiting`, `cooking`, `ready`
- Item paymentStatus: NOT `paid`

### Cancel Button Disabled (with tooltip):

- Item status: `served` � "Cannot cancel served items"
- Item paymentStatus: `paid` � "Cannot cancel paid items"
