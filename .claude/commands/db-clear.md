---
description: Clean temporary data from database (orders, payments, reset tables)
tags: [database, cleanup, testing]
---

Clean all temporary test data from the database:

1. Delete recipe write-offs (food cost decomposition data)
2. Delete sales transactions (linked to orders)
3. Delete all payments
4. Delete all orders
5. Reset all tables to 'available' status
6. Clear table order references

Execute the cleanup SQL and show summary of deleted records.

**IMPORTANT:** This only cleans temporary POS data (orders, payments, table status, sales transactions). It does NOT delete:

- Menu items
- Products
- Shifts
- Users
- Recipes
- Suppliers
- Other permanent data

---

## SQL Script

Use the following SQL to perform the cleanup (respects all foreign key dependencies):

```sql
-- Get counts before deletion
SELECT
  (SELECT COUNT(*) FROM recipe_write_offs) as recipe_write_offs_before,
  (SELECT COUNT(*) FROM sales_transactions) as sales_transactions_before,
  (SELECT COUNT(*) FROM payments) as payments_before,
  (SELECT COUNT(*) FROM orders) as orders_before,
  (SELECT COUNT(*) FROM tables WHERE status != 'available') as occupied_tables_before;

-- Complete cleanup in correct order (respecting foreign key constraints)

-- Step 1: Clear recipe_write_off_id references in sales_transactions (avoid circular dependency)
UPDATE sales_transactions SET recipe_write_off_id = NULL WHERE recipe_write_off_id IS NOT NULL;

-- Step 2: Delete recipe_write_offs
DELETE FROM recipe_write_offs;

-- Step 3: Delete sales_transactions (depends on orders)
DELETE FROM sales_transactions;

-- Step 4: Delete all payments (depends on orders)
DELETE FROM payments;

-- Step 5: Delete all orders
DELETE FROM orders;

-- Step 6: Reset all tables to available status
UPDATE tables
SET status = 'available',
    current_order_id = NULL,
    updated_at = NOW()
WHERE status != 'available' OR current_order_id IS NOT NULL;

-- Return comprehensive summary
SELECT
  (SELECT COUNT(*) FROM recipe_write_offs) as recipe_write_offs_after,
  (SELECT COUNT(*) FROM sales_transactions) as sales_transactions_after,
  (SELECT COUNT(*) FROM orders) as orders_after,
  (SELECT COUNT(*) FROM payments) as payments_after,
  (SELECT COUNT(*) FROM tables WHERE status = 'available') as available_tables,
  (SELECT COUNT(*) FROM tables WHERE status != 'available') as occupied_tables,
  (SELECT COUNT(*) FROM tables) as total_tables;
```

---

## Foreign Key Dependencies

The cleanup respects the following dependency chain:

```
recipe_write_offs ←→ sales_transactions → orders → payments
                                              ↓
                                          tables (current_order_id)
```

**Note:** There's a circular dependency between `recipe_write_offs` and `sales_transactions`, so we first clear the reference in `sales_transactions` before deleting.
