# RLS Security Policy

## Overview

All tables in the `public` schema are protected by Row Level Security (RLS) policies.
Access is controlled by the `is_staff()` function and role-based targeting.

## Role Hierarchy

| Role                                             | Description                                   | `is_staff()` | Access Pattern                        |
| ------------------------------------------------ | --------------------------------------------- | ------------ | ------------------------------------- |
| `service_role`                                   | Supabase service key (Edge Functions, seeds)  | Bypasses RLS | Full access                           |
| Staff (admin, manager, cashier, waiter, kitchen) | Users in `users` table with `is_active=true`  | `true`       | Via `is_staff()` policies             |
| Anonymous Auth (website customers)               | `authenticated` role but NOT in `users` table | `false`      | Limited: read menu, own data via RPCs |
| `anon`                                           | Unauthenticated (raw anon key)                | N/A          | Read-only on menu tables              |

## `is_staff()` Function

```sql
CREATE FUNCTION is_staff() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Returns `true` only for users with a row in the `users` table. Website customers
(anonymous auth) are NOT in `users` and get `false`.

## Table Classification

### Staff-Only Tables (~53 tables)

Full CRUD access requires `is_staff()`. No public or anonymous access.

**Policy: `staff_all FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff())`**

| Category           | Tables                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders & POS       | `orders`, `order_items`, `payments`, `pending_payments`, `shifts`, `tables`                                                                                                                                                 |
| Financial          | `transactions`, `sales_transactions`, `accounts`, `transaction_categories`, `payment_methods`                                                                                                                               |
| Products & Recipes | `products`, `product_categories`\*, `recipes`, `recipe_components`, `recipe_steps`, `recipe_write_offs`, `recipe_categories`                                                                                                |
| Preparations       | `preparations`, `preparation_batches`, `preparation_categories`, `preparation_ingredients`, `preparation_inventory_documents`, `preparation_operations`                                                                     |
| Storage            | `storage_batches`, `storage_operations`, `inventory_documents`, `inventory_snapshots`, `inventory_quick_lists`, `warehouses`\*                                                                                              |
| Suppliers          | `counteragents`, `supplierstore_orders`, `supplierstore_order_items`, `supplierstore_receipts`, `supplierstore_receipt_items`, `supplierstore_receipt_corrections`, `supplierstore_requests`, `supplierstore_request_items` |
| Kitchen            | `kitchen_bar_kpi`, `kpi_settings`, `production_schedule`, `printer_settings`                                                                                                                                                |
| Config             | `app_settings`, `taxes`, `channel_taxes`, `gobiz_config`, `package_options`                                                                                                                                                 |
| Operations         | `operations_alerts`, `entity_change_log`, `expense_invoice_links`                                                                                                                                                           |
| Legacy cleanup     | `delete_procurement_requests`, `delete_purchase_orders`, `delete_receipts`                                                                                                                                                  |
| Loyalty            | `loyalty_points`, `loyalty_transactions`, `stamp_cards`, `stamp_entries`, `stamp_reward_redemptions`                                                                                                                        |

_`product_categories` — write requires admin role, read requires `is_staff()`_
_`warehouses` — write requires admin/manager role, read requires `is_staff()`_

### Public-Read + Staff-Write Tables (~12 tables)

Website visitors can read menu data. Only staff can modify.

| Table                       | `anon` SELECT       | `authenticated` SELECT | Staff write  |
| --------------------------- | ------------------- | ---------------------- | ------------ |
| `menu_items`                | `is_active = true`  | `true`                 | `is_staff()` |
| `menu_categories`           | `is_active = true`  | `true`                 | `is_staff()` |
| `menu_collections`          | `status = 'active'` | `true`                 | `is_staff()` |
| `menu_collection_items`     | `true`              | `true`                 | `is_staff()` |
| `sales_channels`            | —                   | `true`                 | `is_staff()` |
| `channel_prices`            | —                   | `true`                 | `is_staff()` |
| `channel_menu_items`        | —                   | `true`                 | `is_staff()` |
| `channel_payment_methods`   | —                   | `true`                 | `is_staff()` |
| `content_translations`      | `true`              | `true`                 | `is_staff()` |
| `website_homepage_sections` | `is_active = true`  | `true`                 | `is_staff()` |
| `website_homepage_items`    | `is_active = true`  | `true`                 | `is_staff()` |
| `loyalty_settings`          | —                   | `true` (read)          | `is_staff()` |

### Customer-Own-Data Tables (2 tables)

Staff gets full access. Customers can read only their own records.

| Table                 | Staff                | Customer                                            |
| --------------------- | -------------------- | --------------------------------------------------- |
| `customers`           | ALL via `is_staff()` | SELECT own (via `customer_identities.auth_user_id`) |
| `customer_identities` | ALL via `is_staff()` | SELECT own (`auth_user_id = auth.uid()`)            |

### Role-Based Access Tables (4 tables)

These tables use custom role checks (not `is_staff()`).

| Table                 | Policy Logic                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `discount_events`     | INSERT: `is_staff()`, SELECT: own (`applied_by`) or admin/manager, UPDATE: admin/manager only |
| `website_settings`    | `is_staff()` for write, filtered auth read (hides `auth_secrets`), anon read (no secrets)     |
| `order_counters`      | `is_staff()` for read, `service_role` for write                                               |
| `telegram_auth_codes` | `service_role` only                                                                           |

### Users Table

| Policy                  | Role            | Operation | Condition         |
| ----------------------- | --------------- | --------- | ----------------- |
| `users_view_own`        | `authenticated` | SELECT    | `auth.uid() = id` |
| `users_update_own`      | `authenticated` | UPDATE    | `auth.uid() = id` |
| `admins_view_all_users` | —               | SELECT    | admin role check  |
| `admins_create_users`   | —               | INSERT    | admin role check  |
| `admins_update_users`   | —               | UPDATE    | admin role check  |

## Web-Winter Access Patterns

The customer-facing website (web-winter) accesses data through two mechanisms:

### 1. Direct Reads (via anon/authenticated policies)

- Menu items, categories, collections (filtered by `is_active`/`status`)
- Content translations
- Homepage sections and items
- Channel prices and availability

### 2. SECURITY DEFINER RPCs (bypass RLS)

All write operations and sensitive reads go through RPCs:

- `create_online_order` — creates order + items + payment
- `get_my_orders` — reads customer's orders
- `cancel_my_order` — cancels customer's order
- `get_loyalty_status` — reads loyalty data
- `redeem_stamp_reward` — creates redemption
- etc.

## Policy Naming Convention

| Pattern                          | Meaning                                           |
| -------------------------------- | ------------------------------------------------- |
| `staff_all`                      | Staff-only full CRUD                              |
| `staff_write`                    | Staff-only write (used with separate read policy) |
| `staff_read`                     | Staff-only read (used with separate write policy) |
| `staff_insert` / `staff_select`  | Staff-only granular ops                           |
| `auth_read`                      | All authenticated users can read                  |
| `anon_read` / `anon_read_active` | Anonymous can read (optionally filtered)          |
| `customer_read_own`              | Customer reads own records                        |

## Adding New Tables

When creating a new table, ALWAYS:

1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Add appropriate policy based on table classification:
   - Staff-only: `CREATE POLICY "staff_all" ON new_table FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());`
   - Public-read: Add `anon`/`auth` SELECT + `staff_write` policies
3. Grant to service_role if Edge Functions need access: `GRANT ALL ON new_table TO service_role;`

## Migration History

| Migration | Description                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| 216       | Fixed `website_settings` and `order_counters` policies                                                            |
| 217       | Added RPC input validation                                                                                        |
| 218       | Protected telegram token                                                                                          |
| **219**   | **Full RLS security overhaul — replaced all open `{public} ALL true` policies**                                   |
| **220**   | **Tightened remaining: `discount_events` INSERT, `product_categories`/`warehouses` SELECT, `users` role cleanup** |
