---
description: Clean temporary data from database (orders, payments, batches, reset tables)
tags: [database, cleanup, testing]
---

Clean all temporary test data from the database:

1. Delete recipe write-offs (food cost decomposition data)
2. Delete discount events (bill/item discounts)
3. Delete sales transactions (linked to orders)
4. Delete all payments
5. Delete all orders
6. Delete all shifts (created during testing)
7. **Delete auto-generated negative batches** (from sales & production)
8. **Delete auto-generated preparation operations** (linked to storage)
9. Reset all tables to 'available' status
10. Clear table order references

Execute the cleanup SQL and show summary of deleted records.

**IMPORTANT:** This only cleans temporary POS data (orders, payments, shifts, table status, sales transactions, discount events, auto-generated batches). It does NOT delete:

- Menu items
- Products
- Users
- Recipes
- Suppliers
- Manually created batches and operations
- Other permanent data

---

## SQL Script

Use the following SQL to perform the cleanup (respects all foreign key dependencies):

```sql
-- Get counts before deletion
SELECT
  (SELECT COUNT(*) FROM recipe_write_offs) as recipe_write_offs_before,
  (SELECT COUNT(*) FROM discount_events) as discount_events_before,
  (SELECT COUNT(*) FROM sales_transactions) as sales_transactions_before,
  (SELECT COUNT(*) FROM payments) as payments_before,
  (SELECT COUNT(*) FROM orders) as orders_before,
  (SELECT COUNT(*) FROM shifts) as shifts_before,
  (SELECT COUNT(*) FROM tables WHERE status != 'available') as occupied_tables_before,
  (SELECT COUNT(*) FROM storage_batches WHERE is_negative = true AND (negative_reason LIKE 'Auto sales write-off:%' OR negative_reason LIKE 'Production:%' OR negative_reason IS NULL)) as auto_negative_storage_batches_before,
  (SELECT COUNT(*) FROM preparation_batches WHERE is_negative = true AND (negative_reason LIKE 'Auto sales write-off:%' OR negative_reason LIKE 'Production:%' OR negative_reason IS NULL)) as auto_negative_prep_batches_before;

-- Complete cleanup in correct order (respecting foreign key constraints)

-- Step 1: Clear recipe_write_off_id references in sales_transactions (avoid circular dependency)
UPDATE sales_transactions SET recipe_write_off_id = NULL WHERE recipe_write_off_id IS NOT NULL;

-- Step 2: Delete recipe_write_offs
DELETE FROM recipe_write_offs;

-- Step 3: Delete discount_events (depends on orders)
DELETE FROM discount_events;

-- Step 4: Delete sales_transactions (depends on orders)
DELETE FROM sales_transactions;

-- Step 5: Delete all payments (depends on orders)
DELETE FROM payments;

-- Step 6: Delete all orders
DELETE FROM orders;

-- Step 7: Delete all shifts
DELETE FROM shifts;

-- Step 8: Reset all tables to available status
UPDATE tables
SET status = 'available',
    current_order_id = NULL,
    updated_at = NOW()
WHERE status != 'available' OR current_order_id IS NOT NULL;

-- Step 9: Delete auto-generated negative batches from storage_batches
-- These are created by sales transactions (FIFO) and production operations
-- Also delete old negative batches with NULL reason (created before reason field was added)
DELETE FROM storage_batches
WHERE is_negative = true
  AND (
    negative_reason LIKE 'Auto sales write-off:%'
    OR negative_reason LIKE 'Production:%'
    OR negative_reason IS NULL
  );

-- Step 10: Delete auto-generated negative batches from preparation_batches
-- These are created by sales transactions (FIFO) and production operations
-- Also delete old negative batches with NULL reason (created before reason field was added)
DELETE FROM preparation_batches
WHERE is_negative = true
  AND (
    negative_reason LIKE 'Auto sales write-off:%'
    OR negative_reason LIKE 'Production:%'
    OR negative_reason IS NULL
  );

-- Return comprehensive summary
SELECT
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
  (SELECT COUNT(*) FROM preparation_batches WHERE is_negative = true) as negative_prep_batches_remaining;
```

---

## Foreign Key Dependencies

The cleanup respects the following dependency chain:

```
recipe_write_offs ←→ sales_transactions → orders → payments
                                            ↑
                                      discount_events
                                            ↓
                                        tables (current_order_id)

storage_batches (negative) ← sales_transactions (FIFO allocation)
preparation_batches (negative) ← sales_transactions (FIFO allocation)

shifts (independent, no FK dependencies)
```

**Note:**

- There's a circular dependency between `recipe_write_offs` and `sales_transactions`, so we first clear the reference in `sales_transactions` before deleting
- `discount_events` depends on `orders` (order_id, bill_id, item_id), so must be deleted before orders
- Negative batches are created automatically during FIFO allocation from sales transactions
- Batches are identified by `negative_reason` pattern:
  - `'Auto sales write-off:%'` - Created by sales FIFO allocation
  - `'Production:%'` - Created by production/recipe operations
- Manual batches (receipts, manual write-offs, corrections) are NOT deleted
- Shifts can be deleted independently as they have no foreign key dependencies with other temporary data

---

## What Gets Deleted

✅ **POS Temporary Data:**

- Orders, bills, items
- Payments and payment allocations
- Discount events
- Sales transactions
- Recipe write-offs
- Table occupancy status
- Active shifts

✅ **Auto-Generated Inventory Data:**

- Negative storage batches (from sales FIFO)
- Negative preparation batches (from sales FIFO)
- Production-related negative batches

❌ **Preserved Data:**

- Menu items and recipes
- Products and ingredients
- Suppliers and counteragents
- Users and permissions
- Manual inventory operations
- Manual batches (receipts, corrections)
- Positive batches (all receipts and productions)
