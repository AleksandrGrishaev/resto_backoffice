# COGS Department Assignment

## Overview

This document describes how COGS (Cost of Goods Sold) is distributed between Kitchen and Bar departments for Food Cost KPI calculation.

## Formula

```
Total COGS = Sales COGS + Spoilage + Shortage - Surplus
```

## Department Assignment Rules

| Component      | Source Table                                   | Department Assignment                                    |
| -------------- | ---------------------------------------------- | -------------------------------------------------------- |
| **Sales COGS** | `sales_transactions`                           | `menu_item.department`                                   |
| **Spoilage**   | `storage_operations`, `preparation_operations` | `storage_operations.department` (who performs write-off) |
| **Shortage**   | `inventory_documents`                          | `products.used_in_departments[1]` (primary department)   |
| **Surplus**    | `inventory_documents`                          | `products.used_in_departments[1]` (primary department)   |

## Primary Department

For products used in both Kitchen and Bar (`usedInDepartments: ['kitchen', 'bar']`), the **primary department** is the first element of the array.

### Changing Primary Department

Use the **KPI Settings** page (`/kpi-settings`) to change the primary department for dual-department products:

1. Navigate to `/kpi-settings`
2. Select "Product Departments" tab
3. Click Kitchen or Bar button for each product
4. The selected department becomes primary (first in array)

## Component Details

### 1. Sales COGS

Automatically assigned based on menu item:

```
MenuItem.department → OrderItem.department → SalesTransaction.department
```

No configuration needed - department follows the menu item.

### 2. Spoilage (Write-offs)

Assigned to the department that performs the write-off:

- **Kitchen staff** writes off milk → Kitchen COGS
- **Bar staff** writes off same milk → Bar COGS

This reflects operational responsibility - the department that spoiled/wasted the product bears the cost.

### 3. Shortage/Surplus (Inventory)

For products used in both departments, assigned to the **primary department**:

- Milk has `usedInDepartments: ['kitchen', 'bar']` → Kitchen is primary
- Inventory shortage for milk → Kitchen COGS
- To change: Use KPI Settings to make Bar primary

## SQL Implementation

The `get_food_cost_kpi_month` RPC function handles department filtering:

```sql
-- Spoilage: Filter by storage_operations.department
WHERE (p_department IS NULL OR department = p_department)

-- Shortage/Surplus: Filter by product's primary department
COALESCE(p.used_in_departments[1], 'kitchen') as kpi_department
WHERE (p_department IS NULL OR kpi_department = p_department)
```

## Files

| File                                                                  | Purpose                   |
| --------------------------------------------------------------------- | ------------------------- |
| `src/supabase/migrations/060_update_food_cost_kpi_inventory_dept.sql` | SQL function              |
| `src/views/backoffice/settings/KpiSettingsView.vue`                   | UI for primary department |
| `src/stores/kitchenKpi/services/foodCostKpiService.ts`                | Frontend service          |

## Examples

### Scenario 1: Milk Spoilage

- Milk: `usedInDepartments: ['kitchen', 'bar']`
- Bar staff writes off 1L milk (spoiled)
- Result: **Bar COGS** (because Bar performed write-off)

### Scenario 2: Milk Shortage

- Milk: `usedInDepartments: ['kitchen', 'bar']`
- Inventory finds 2L missing
- Result: **Kitchen COGS** (because Kitchen is primary)

### Scenario 3: Changing Assignment

- Admin changes Milk primary to Bar via KPI Settings
- Now: `usedInDepartments: ['bar', 'kitchen']`
- Next inventory shortage → **Bar COGS**
