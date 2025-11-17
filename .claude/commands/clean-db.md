---
description: Clean temporary data from database (orders, payments, reset tables)
tags: [database, cleanup, testing]
---

Clean all temporary test data from the database:

1. Delete all orders
2. Delete all payments
3. Reset all tables to 'available' status
4. Clear table order references

Execute the cleanup SQL and show summary of deleted records.

**IMPORTANT:** This only cleans temporary POS data (orders, payments, table status). It does NOT delete:

- Menu items
- Products
- Shifts
- Users
- Other permanent data
