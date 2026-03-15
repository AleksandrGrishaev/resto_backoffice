# Online Ordering — Web-Winter UI Tasks

> **Date**: 2026-03-15
> **Status**: Planning
> **Depends on**: Backoffice RPC functions implementation

## Architecture: Order Model

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   source     │     │    type      │     │  fulfillment_method  │
│  pos | web   │     │ dine_in      │     │  self_pickup         │
│              │     │ takeaway     │     │  goshop              │
│              │     │              │     │  courier (future)    │
└──────────────┘     └──────────────┘     └──────────────────────┘
```

- **source** — where the order was created (POS terminal or website)
- **type** — how the food is consumed (eat in or take away)
- **fulfillment_method** — how the customer receives takeaway food
  - `self_pickup` — customer picks up themselves
  - `goshop` — customer orders GoJek pickup via their app
  - `courier` — restaurant's own delivery (future)

**Note:** `fulfillment_method` only applies to `takeaway` orders. `dine_in` orders don't need it.

## 1. Order Status — Realtime Sync

### Status Flow (visible to customer)

```
waiting → cooking → ready → collected/served
                          → cancelled
```

### Implementation

Web-winter subscribes to order status changes via Supabase Realtime:

```typescript
// Subscribe to user's active orders
supabase
  .channel('my-orders')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `customer_id=eq.${customerId}`
    },
    payload => {
      // Update order status in UI
      updateOrderStatus(payload.new.id, payload.new.status)
    }
  )
  .subscribe()
```

### UI States

| Status      | Customer sees       | Icon | Color  |
| ----------- | ------------------- | ---- | ------ |
| `waiting`   | "Order received"    | ⏳   | amber  |
| `cooking`   | "Being prepared"    | 🔥   | orange |
| `ready`     | "Ready for pickup!" | ✅   | green  |
| `collected` | "Completed"         | 📦   | grey   |
| `cancelled` | "Cancelled"         | ❌   | red    |

### Notifications

- Push notification (if PWA/app) when status changes to `ready`
- Sound alert on `ready` status
- Auto-dismiss completed orders after 5 minutes

## 2. Estimated Preparation Time

### Phase 1 (MVP — from backoffice)

- Backoffice stores average prep time per menu item (from recipe data)
- On order creation, RPC returns `estimated_ready_time` based on:
  - Sum of max prep times across items
  - Current queue depth (number of active orders)
  - Simple formula: `base_prep_time + (queue_size * 3 min)`

### Phase 2 (Smart — ML-based, future)

- Track actual preparation times (waiting → ready timestamps)
- Learn patterns: time of day, order complexity, kitchen load
- Provide dynamic estimates that improve over time

### UI Display

```
┌─────────────────────────────────┐
│  🕐 Estimated: ~25 min         │
│  ████████░░░░░░ 60%            │
│  Your order is being prepared   │
└─────────────────────────────────┘
```

- Progress bar based on elapsed time vs estimate
- Update estimate if order moves to `cooking` faster/slower than expected
- Show "Almost ready!" when > 80% of estimated time elapsed

## 3. Order Creation Flow (replace stubs)

### Current Stubs to Replace

- `useCreateOrder()` → call `supabase.rpc('create_online_order', {...})`
- `useOrderActions().cancelOrder()` → call `supabase.rpc('cancel_online_order', {...})`
- `useOrderActions().updateOrder()` → call `supabase.rpc('update_online_order', {...})`
- `useOrderActions().addToOrder()` → call `supabase.rpc('add_to_online_order', {...})`

### Order Form Fields

**Dine In:**

- Table number (optional, free text — "preferred table")
- Comment (optional)

**Takeaway:**

- Customer name (required)
- Customer phone (required)
- Fulfillment method: `self_pickup` | `goshop` (radio/select)
- Pickup time: "ASAP" or scheduled time picker
- Comment (optional)

### After Order Created

- Show order confirmation with order number (e.g., "SK-42")
- Redirect to "My Orders" page
- Start realtime subscription for status updates

## 4. My Orders Page

### Active Orders

- Live status with realtime updates
- Countdown timer to estimated ready time
- Order details expandable (items, modifiers, total)
- Cancel button (only if status = `waiting`)
- Add items button (if status in `waiting`, `cooking`)

### Order History

- Past orders (completed, cancelled)
- Reorder button → pre-fill cart with same items
- Simple date grouping (Today, Yesterday, This week, etc.)

## 5. Kitchen Hours Integration

### Behavior

- Check `website_settings.kitchen_hours` before showing order form
- If kitchen is closed:
  - Show "Kitchen is closed" message
  - Show next opening time
  - Optionally allow pre-orders for next day (future)
- If kitchen closes within 30 min:
  - Show warning: "Kitchen closes soon, order now!"

### Data Source

```typescript
const { data } = await supabase
  .from('website_settings')
  .select('value')
  .eq('key', 'kitchen_hours')
  .single()
```

## 6. Future Enhancements

- [ ] Order rating after completion
- [ ] Loyalty points integration (see LOYALTY_SPEC.md)
- [ ] Repeat order (one-tap reorder)
- [ ] Order scheduling (pre-order for specific date/time)
- [ ] Split bill for dine-in groups
- [ ] Own courier tracking with map (when courier fulfillment added)
