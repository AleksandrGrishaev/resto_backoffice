# Deferred Receipt Arrival — Conflict Detection & Resolution

**Last Updated:** 2026-03-10
**Author:** Development Team
**Status:** Active

---

## Problem

Products physically arrive at the restaurant before the office enters the receipt into the system. If the kitchen performs an inventory count in the gap between physical arrival and digital entry, the surplus from the unrecorded delivery gets counted as an inventory adjustment (+N correction batches). When the receipt is later entered with the actual arrival time, the same stock is counted twice — once via inventory correction and once via the receipt.

### Timeline Example

```
09:00 — System shows 5 kg potatoes (batch A)
10:00 — 10 kg potatoes arrive physically (NOT entered in system)
10:30 — Kitchen uses 8 kg → FIFO consumes batch A (5 kg), creates NEG batch (-3 kg)
11:00 — Kitchen does inventory: physical = 7 kg, system = -3 kg
         → difference = +10 kg → surplus correction batch created (+10 kg)
18:00 — Office enters receipt: 10 kg, arrival time = 10:00
         → complete_receipt_full: creates +10 kg batch, reconciles NEG (-3 → 0)
         → BUT the +10 correction batch from inventory is still there!
         → Total: 10 (correction) + 7 (receipt after reconcile) = 17 kg
         → Actual: 7 kg. Double-counted by 10 kg.
```

## Solution

### Architecture

```
Receipt Dialog (Base or Quick)
  │
  ├─ Watchdog pre-check (price/quantity anomalies)
  │
  ├─ Arrival Conflict Check ← NEW
  │   ├─ Find inventory documents confirmed AFTER arrival time
  │   ├─ Match surplus items with receipt items
  │   ├─ Find correction batches via storage_operation_id FK
  │   └─ Show ArrivalConflictDialog if conflicts found
  │
  └─ Proceed with receipt completion
```

### Conflict Detection Flow

1. **Trigger**: Receipt is being completed (any delivery date — the check only fires if a matching confirmed inventory exists)
2. **Query** `inventory_documents` with `status='confirmed'` and `updated_at > arrivalTime`
3. **Parse** JSONB `items` array, find items where `difference > 0` (surplus) AND `itemId` matches a receipt item
4. **Find correction operations** via `storage_operations` where `correction_details.relatedId = inventoryDocId`
5. **Find correction batches** via `storage_batches.storage_operation_id` FK (primary) or notes pattern fallback (for pre-migration data)
6. **Calculate** `adjustableAmount = min(receiptQty, surplusBatchCurrentQty, inventorySurplus)`

### Conflict Resolution

When user clicks "Adjust Inventory":

1. **Reduce** surplus correction batch `current_quantity` by `adjustableAmount`
2. If quantity reaches 0 → set `status='consumed'`, `is_active=false`
3. Recalculate `total_value = current_quantity × cost_per_unit`
4. **Create audit** `storage_operations` record with `correction_details.reason = 'receipt_arrival_adjustment'`
5. **Update receipt** with `arrival_adjustment_applied=true` and `arrival_adjustment_details` JSONB

When user clicks "Skip":

- Receipt completes normally, no batch modifications

## Key Files

| File                                                                 | Purpose                               |
| -------------------------------------------------------------------- | ------------------------------------- |
| `src/stores/storage/composables/useReceiptArrivalConflict.ts`        | Detection + resolution composable     |
| `src/views/supplier_2/components/receipts/ArrivalConflictDialog.vue` | Warning dialog UI                     |
| `src/views/supplier_2/components/receipts/BaseReceiptDialog.vue`     | Integration (purchase order receipts) |
| `src/views/supplier_2/components/receipts/QuickReceiptDialog.vue`    | Integration (quick receipts)          |

## Database Schema

### `storage_batches.storage_operation_id` (Migration 201)

```sql
ALTER TABLE storage_batches
  ADD COLUMN storage_operation_id TEXT REFERENCES storage_operations(id);
```

Links correction batches to the operation that created them. Set automatically by `storageService.createCorrection()` for surplus batches. Indexed with a partial index (`WHERE storage_operation_id IS NOT NULL`).

**Lookup chain:**

```
inventory_documents.id
  → storage_operations.correction_details->>'relatedId'
    → storage_batches.storage_operation_id
```

### `supplierstore_receipts` tracking columns (Migration 200)

```sql
ALTER TABLE supplierstore_receipts
  ADD COLUMN arrival_adjustment_applied BOOLEAN DEFAULT false;
  ADD COLUMN arrival_adjustment_details JSONB;
```

### Audit trail in `storage_operations`

```json
{
  "operation_type": "correction",
  "document_number": "ARA-XXXXXX",
  "correction_details": {
    "reason": "receipt_arrival_adjustment",
    "relatedId": "<inventory_document_id>",
    "relatedName": "INV-001",
    "receiptId": "<receipt_id>"
  },
  "items": [{ "itemId": "...", "quantity": -10000, "unit": "gram" }]
}
```

## Interaction with Negative Batch Reconciliation

The receipt arrival conflict system works **alongside** the existing negative batch reconciliation:

- **NEG reconciliation** (in `complete_receipt_full` RPC): Handles negative batches created by write-offs when stock was insufficient. Receipt arrival creates a positive batch, and the RPC auto-reconciles any NEG batches for the same product.
- **Arrival conflict adjustment**: Handles surplus correction batches from inventory counts. These are separate positive batches that need to be reduced.

Both can happen in the same receipt completion:

1. Receipt creates +10 kg batch
2. NEG reconciliation absorbs -3 kg deficit → effective +7 kg
3. Arrival adjustment reduces +10 kg correction batch → removes double-counting

## Fallback for Legacy Data

Batches created before migration 201 (no `storage_operation_id`) are found using a fallback:

- Time window: inventory `updated_at` ± 15 minutes
- Notes pattern: `ILIKE '%Inventory adjustment: DOC-NUMBER%'`

This fallback will become unnecessary once all correction batches are created with the new FK.

## Edge Cases

| Scenario                                                          | Behavior                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Partial surplus consumed (e.g., 10 kg surplus, 3 kg already used) | `adjustableAmount = min(receiptQty, currentQty=7, surplus=10) = 7`        |
| Multiple inventories between arrival and now                      | Each inventory shown as separate group in dialog                          |
| Receipt date is current (no inventories after it)                 | No conflicts found, receipt proceeds normally                             |
| No matching inventory documents                                   | No dialog shown, receipt proceeds normally                                |
| Adjustment partially fails                                        | Succeeded items get audit record, receipt still completes                 |
| Quick receipt (receipt doesn't exist yet)                         | Conflicts detected before RPC, adjustments applied after receipt creation |

## Verification Queries

```sql
-- Find correction batches linked to a specific inventory
SELECT b.id, b.item_id, b.current_quantity, b.notes, b.storage_operation_id
FROM storage_batches b
JOIN storage_operations op ON b.storage_operation_id = op.id
WHERE op.correction_details->>'relatedId' = '<inventory_doc_id>'
  AND b.source_type = 'correction';

-- Find all arrival adjustment operations
SELECT id, document_number, correction_details, notes
FROM storage_operations
WHERE correction_details->>'reason' = 'receipt_arrival_adjustment'
ORDER BY created_at DESC;

-- Check receipt tracking
SELECT id, receipt_number, arrival_adjustment_applied, arrival_adjustment_details
FROM supplierstore_receipts
WHERE arrival_adjustment_applied = true;
```
