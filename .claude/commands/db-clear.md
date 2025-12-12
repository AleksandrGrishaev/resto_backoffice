---
description: Erase temporary data from database (orders, payments, batches, reset tables)
tags: [database, cleanup, testing]
---

Clean all temporary test data from the database:

1. Delete order items (items in orders)
2. Delete recipe write-offs (food cost decomposition data)
3. Delete discount events (bill/item discounts)
4. Delete sales transactions (linked to orders)
5. Delete all payments
6. Delete all orders
7. Delete all shifts (created during testing)
8. **Delete auto-generated negative batches** (from sales & production)
9. **Delete auto-generated storage operations** (sales_consumption, production_consumption)
10. **Delete auto-generated preparation operations** (linked to storage)
11. **Delete kitchen/bar KPI records** (staff performance data)
12. Reset all tables to 'available' status
13. Clear table order references

Execute the cleanup SQL and show summary of deleted records.

**IMPORTANT:** This only cleans temporary POS data (orders, payments, shifts, table status, sales transactions, discount events, auto-generated batches and operations). It does NOT delete:

- Menu items
- Products
- Users
- Recipes
- Suppliers
- Manually created batches and operations
- Other permanent data (storage receipts, manual write-offs, etc.)
- Production schedule

---

## SQL Script

Use the following SQL to perform the cleanup (respects all foreign key dependencies):

```sql
-- Get counts before deletion
SELECT
  (SELECT COUNT(*) FROM order_items) as order_items_before,
  (SELECT COUNT(*) FROM recipe_write_offs) as recipe_write_offs_before,
  (SELECT COUNT(*) FROM discount_events) as discount_events_before,
  (SELECT COUNT(*) FROM sales_transactions) as sales_transactions_before,
  (SELECT COUNT(*) FROM payments) as payments_before,
  (SELECT COUNT(*) FROM orders) as orders_before,
  (SELECT COUNT(*) FROM shifts) as shifts_before,
  (SELECT COUNT(*) FROM tables WHERE status != 'available') as occupied_tables_before,
  (SELECT COUNT(*) FROM storage_batches WHERE is_negative = true) as negative_storage_batches_before,
  (SELECT COUNT(*) FROM preparation_batches WHERE is_negative = true) as negative_prep_batches_before,
  (SELECT COUNT(*) FROM storage_operations WHERE write_off_details->>'reason' IN ('sales_consumption', 'production_consumption')) as auto_storage_ops_before,
  (SELECT COUNT(*) FROM preparation_operations WHERE write_off_details->>'reason' IN ('production_consumption', 'sales_consumption') OR consumption_details IS NOT NULL) as auto_prep_ops_before,
  (SELECT COUNT(*) FROM kitchen_bar_kpi) as kitchen_bar_kpi_before;

-- Complete cleanup in correct order (respecting foreign key constraints)

-- Step 1: Delete order_items (depends on orders)
DELETE FROM order_items;

-- Step 2: Clear recipe_write_off_id references in sales_transactions (avoid circular dependency)
UPDATE sales_transactions SET recipe_write_off_id = NULL WHERE recipe_write_off_id IS NOT NULL;

-- Step 3: Delete recipe_write_offs
DELETE FROM recipe_write_offs;

-- Step 4: Delete discount_events (depends on orders, shifts)
DELETE FROM discount_events;

-- Step 5: Delete sales_transactions (depends on orders)
DELETE FROM sales_transactions;

-- Step 6: Delete all payments (depends on orders)
DELETE FROM payments;

-- Step 7: Delete all orders
DELETE FROM orders;

-- Step 8: Delete all shifts
DELETE FROM shifts;

-- Step 9: Reset all tables to available status
UPDATE tables
SET status = 'available',
    current_order_id = NULL,
    updated_at = NOW()
WHERE status != 'available' OR current_order_id IS NOT NULL;

-- Step 10: Delete auto-generated negative batches from storage_batches
-- These are created by sales transactions (FIFO) and production operations
DELETE FROM storage_batches
WHERE is_negative = true;

-- Step 11: Delete auto-generated negative batches from preparation_batches
-- These are created by sales transactions (FIFO) and production operations
DELETE FROM preparation_batches
WHERE is_negative = true;

-- Step 12: Delete auto-generated storage operations (sales & production consumption)
-- These are created automatically when selling items or producing preparations
DELETE FROM storage_operations
WHERE operation_type = 'write_off'
  AND write_off_details->>'reason' IN ('sales_consumption', 'production_consumption');

-- Step 13: Delete auto-generated preparation operations
-- Production operations and related write-offs
DELETE FROM preparation_operations
WHERE operation_type IN ('production', 'write_off')
  AND (
    write_off_details->>'reason' IN ('production_consumption', 'sales_consumption')
    OR consumption_details IS NOT NULL
    OR notes LIKE 'Production:%'
  );

-- Step 14: Delete kitchen/bar KPI records (staff performance tracking)
DELETE FROM kitchen_bar_kpi;

-- Return comprehensive summary
SELECT
  (SELECT COUNT(*) FROM order_items) as order_items_after,
  (SELECT COUNT(*) FROM recipe_write_offs) as recipe_write_offs_after,
  (SELECT COUNT(*) FROM discount_events) as discount_events_after,
  (SELECT COUNT(*) FROM sales_transactions) as sales_transactions_after,
  (SELECT COUNT(*) FROM orders) as orders_after,
  (SELECT COUNT(*) FROM payments) as payments_after,
  (SELECT COUNT(*) FROM shifts) as shifts_after,
  (SELECT COUNT(*) FROM tables WHERE status = 'available') as available_tables,
  (SELECT COUNT(*) FROM tables WHERE status != 'available') as occupied_tables,
  (SELECT COUNT(*) FROM tables) as total_tables,
  (SELECT COUNT(*) FROM storage_batches WHERE is_negative = true) as negative_storage_batches_remaining,
  (SELECT COUNT(*) FROM preparation_batches WHERE is_negative = true) as negative_prep_batches_remaining,
  (SELECT COUNT(*) FROM storage_operations WHERE write_off_details->>'reason' IN ('sales_consumption', 'production_consumption')) as auto_storage_ops_remaining,
  (SELECT COUNT(*) FROM preparation_operations WHERE consumption_details IS NOT NULL) as auto_prep_ops_remaining,
  (SELECT COUNT(*) FROM kitchen_bar_kpi) as kitchen_bar_kpi_remaining;
```

---

## Foreign Key Dependencies

The cleanup respects the following dependency chain:

```
order_items → orders → payments
                ↑
recipe_write_offs ←→ sales_transactions → orders → discount_events
                                            ↓
                                        tables (current_order_id)

storage_batches (negative) ← sales_transactions (FIFO allocation)
preparation_batches (negative) ← sales_transactions (FIFO allocation)

storage_operations (sales_consumption, production_consumption) ← auto-generated
preparation_operations (production) ← auto-generated

kitchen_bar_kpi (independent, no FK dependencies)
shifts (independent, no FK dependencies)
```

**Note:**

- `order_items` depends on `orders`, so must be deleted first
- There's a circular dependency between `recipe_write_offs` and `sales_transactions`, so we first clear the reference in `sales_transactions` before deleting
- `discount_events` depends on `orders` (order_id, bill_id, item_id), so must be deleted before orders
- Negative batches are created automatically during FIFO allocation from sales transactions
- Storage operations with `sales_consumption` or `production_consumption` are auto-generated
- Manual batches (receipts, manual write-offs, corrections) are NOT deleted
- Manual storage operations (reason: other, expired, spoiled, etc.) are NOT deleted
- Shifts can be deleted independently as they have no foreign key dependencies with other temporary data

---

## What Gets Deleted

✅ **POS Temporary Data:**

- Order items (bill items)
- Orders, bills
- Payments and payment allocations
- Discount events
- Sales transactions
- Recipe write-offs
- Table occupancy status
- Active shifts

✅ **Auto-Generated Inventory Data:**

- Negative storage batches (from sales FIFO)
- Negative preparation batches (from sales FIFO)
- Storage operations with reason: `sales_consumption`, `production_consumption`
- Preparation operations (production, consumption)

✅ **KPI Data:**

- Kitchen/Bar staff KPI records

❌ **Preserved Data:**

- Menu items and recipes
- Products and ingredients
- Suppliers and counteragents
- Users and permissions
- Manual inventory operations (receipts, corrections)
- Manual write-offs (reason: other, expired, spoiled, etc.)
- Positive batches (all receipts and productions)
- Production schedule
