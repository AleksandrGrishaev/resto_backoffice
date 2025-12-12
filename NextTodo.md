# Sprint: order_items Architecture Migration

## Summary

Refactored the order items storage from JSONB (orders.items) to a separate `order_items` table to enable:

- Direct Realtime subscriptions on item status changes
- Department-based filtering (kitchen vs bar)
- KPI timestamp tracking for analytics
- Proper sound alerts only when item status CHANGES to 'waiting'

---

## Completed Phases

### Phase 1: Database Migrations

- [x] Migration 053 - Create `order_items` table with KPI timestamps
- [x] Migration 054 - Add `bills` JSONB to orders, remove `items` JSONB
- [x] Migration 055 - Add order_items to Realtime publication + REPLICA IDENTITY FULL

### Phase 2: TypeScript Types + Mappers

- [x] `src/supabase/types.ts` - Added order_items table definition
- [x] Added helper types: `SupabaseOrderItem`, `SupabaseOrderItemInsert`, `SupabaseOrderItemUpdate`
- [x] `supabaseMappers.ts` - Complete rewrite:
  - Removed `flattenBillsToItems()`, `reconstructBillsFromItems()`
  - Added `toOrderItemInsert()`, `toOrderItemUpdate()`, `fromOrderItemRow()`
  - Added `extractItemsForInsert()`, `getTimestampFieldForStatus()`, `buildStatusUpdatePayload()`

### Phase 3: Persistence Layer (services.ts)

- [x] `getAllOrders()` - 2 queries (orders + order_items)
- [x] `createOrder()` - INSERT order only (items added separately)
- [x] `addItemToBill()` - INSERT into order_items
- [x] `updateItemQuantity()` - UPDATE order_items
- [x] `removeItemFromBill()` - DELETE from order_items
- [x] `sendOrderToKitchen()` - UPDATE order_items with KPI timestamps
- [x] Changed localStorage key: `pos_bill_items` -> `pos_order_items`

### Phase 4: Realtime Subscriptions

- [x] `OrderAlertService.ts` - Subscribe to order_items, filter by department
  - `handleItemSentToKitchen()` - triggers on status change to 'waiting'
  - `handleItemReady()` - triggers on status change to 'ready'
  - Removed old `hasItemsForDepartment()` - now filters at item level
- [x] `useKitchenRealtime.ts` - Item-based subscriptions
  - Primary subscription on order_items
  - Optional secondary subscription on orders for metadata
  - Department filter support

### Phase 5: Kitchen Operations

- [x] `kitchenService.ts` - Direct UPDATE on order_items table
  - `getActiveKitchenOrders()` - 2 queries (orders + order_items)
  - `getOrderById()` - New method for fetching single order with items
  - `updateItemStatus()` - Direct UPDATE with KPI timestamps
  - `checkAndUpdateOrderStatus()` - Recalculates from order_items
- [x] `kitchen/index.ts` (kitchenStore) - Updated for item-based updates
  - `handleItemUpdate()` - Handles item INSERT/UPDATE/DELETE
  - `handleOrderUpdate()` - Handles order metadata changes
  - `recalculateOrderStatus()` - Derives order status from items

### Phase 6: POS Realtime

- [x] `useOrdersRealtime.ts` - Dual subscription (orders + order_items)
  - `handleOrderUpdate()` - Order metadata changes
  - `handleItemUpdate()` - Item status changes from kitchen
  - localStorage sync for offline support

---

## Verification Checklist

### Database

- [ ] Verify order_items table exists: `SELECT * FROM order_items LIMIT 1`
- [ ] Verify Realtime publication: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
- [ ] Verify REPLICA IDENTITY: `SELECT relname, relreplident FROM pg_class WHERE relname = 'order_items'`

### POS Flow

- [ ] Create new dine-in order
- [ ] Add items to bill
- [ ] Verify items appear in order_items table
- [ ] Send order to kitchen
- [ ] Verify item status = 'waiting' and sent_to_kitchen_at is set

### Kitchen Monitor Flow

- [ ] Kitchen Monitor sees the order
- [ ] Change item status: waiting -> cooking
- [ ] Verify cooking_started_at is set
- [ ] Change item status: cooking -> ready
- [ ] Verify ready_at is set
- [ ] POS reflects status changes

### Sound Alerts (Critical!)

| #   | Scenario                                       | Kitchen Monitor | Bar Monitor |
| --- | ---------------------------------------------- | --------------- | ----------- |
| 1   | New order with kitchen item only               | Sound plays     | No sound    |
| 2   | New order with bar item only                   | No sound        | Sound plays |
| 3   | New order with kitchen + bar items             | Sound plays     | Sound plays |
| 4   | Add bar item to existing waiting kitchen order | No sound        | Sound plays |
| 5   | Add kitchen item to existing waiting bar order | Sound plays     | No sound    |
| 6   | Item status: waiting -> cooking                | No sound        | No sound    |
| 7   | Item status: cooking -> ready                  | No sound        | No sound    |
| 8   | UPDATE item without status change              | No sound        | No sound    |

### Mixed Orders (Critical!)

- [ ] Create order with 1 kitchen item + 1 bar item
- [ ] Send to kitchen
- [ ] Kitchen Monitor: sees kitchen item, plays sound once
- [ ] Bar Monitor: sees bar item, plays sound once
- [ ] Each monitor only shows items for their department

---

## New Architecture

```
SUPABASE:
+------------------------------------------+
|  orders                                  |
|  ├── id, order_number, status, type...   |
|  └── bills: JSONB[] (metadata only)      |
+------------------------------------------+
|  order_items (NEW)                       |
|  ├── id, order_id, bill_id, bill_number  |
|  ├── menu_item_id, menu_item_name...     |
|  ├── status, department <- Realtime!     |
|  └── KPI timestamps                      |
+------------------------------------------+

localStorage:
+------------------------------------------+
|  pos_orders      -> PosOrder[] (no bills)|
|  pos_bills       -> PosBill[] (no items) |
|  pos_order_items -> PosBillItem[]        |
+------------------------------------------+
```

---

## Files Modified

| File                                         | Changes                                  |
| -------------------------------------------- | ---------------------------------------- |
| **Migrations**                               |                                          |
| `053_create_order_items_table.sql`           | NEW - Create table with KPI timestamps   |
| `054_update_orders_structure.sql`            | NEW - bills JSONB, remove items          |
| `055_order_items_realtime_publication.sql`   | NEW - Enable Realtime                    |
| **Types**                                    |                                          |
| `src/supabase/types.ts`                      | + order_items definition, + helper types |
| **Mappers**                                  |                                          |
| `src/stores/pos/orders/supabaseMappers.ts`   | Complete rewrite                         |
| **Persistence**                              |                                          |
| `src/stores/pos/orders/services.ts`          | 2-table operations                       |
| **Realtime**                                 |                                          |
| `src/stores/pos/orders/useOrdersRealtime.ts` | Dual subscription                        |
| `src/stores/kitchen/useKitchenRealtime.ts`   | Item-based subscription                  |
| `src/core/pwa/services/OrderAlertService.ts` | Item-based alerts                        |
| **Kitchen**                                  |                                          |
| `src/stores/kitchen/kitchenService.ts`       | Direct UPDATE order_items                |
| `src/stores/kitchen/index.ts`                | handleItemUpdate                         |

---

## KPI Metrics Available

```sql
-- Wait time in queue
wait_time = cooking_started_at - sent_to_kitchen_at

-- Cooking time
cooking_time = ready_at - cooking_started_at

-- Total kitchen time
kitchen_total = ready_at - sent_to_kitchen_at

-- Full order time (draft to served)
order_total = served_at - draft_at
```

---

## Known Risks

| Risk                    | Probability | Mitigation                              |
| ----------------------- | ----------- | --------------------------------------- |
| POS flow regression     | High        | Step-by-step testing                    |
| Kitchen Notes lost      | Medium      | Preserved merge logic with localStorage |
| Atomicity (2 queries)   | Low         | Eventual consistency acceptable         |
| Performance (2 queries) | Low         | Indexes on order_id                     |
| localStorage desync     | Medium      | Test offline mode thoroughly            |

---

## Next Steps

1. Run `pnpm dev` and test complete flow
2. Verify sound alerts work correctly per test matrix
3. Test mixed orders (kitchen + bar)
4. Apply migrations to PRODUCTION when verified
