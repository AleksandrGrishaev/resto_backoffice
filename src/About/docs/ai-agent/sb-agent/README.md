# Cafe Database — AI Sherpa Read-Only Access

## Connection

**Endpoint:**

```
POST https://bkntdcvzatawencxghob.supabase.co/functions/v1/sql-proxy
```

**Authentication:**

```
Header: x-api-key: <YOUR_API_KEY>
Content-Type: application/json
```

**Request format:**

```json
{
  "query": "SELECT * FROM v_food_cost_report LIMIT 10",
  "max_rows": 1000
}
```

**Response format:**

```json
{
  "success": true,
  "data": [ {...}, {...} ],
  "rows": 10
}
```

---

## Quick Start

### 1. Explore the schema

```json
{ "query": "show tables" }
{ "query": "show views" }
{ "query": "describe menu_items" }
```

### 2. Get the full menu with food cost

```sql
SELECT * FROM v_menu_with_cost WHERE is_active = true
```

### 3. Sales for a date range

```sql
SELECT * FROM v_daily_sales
WHERE sale_date BETWEEN '2026-02-01' AND '2026-02-25'
ORDER BY sale_date
```

### 4. Food cost analysis

```sql
SELECT * FROM v_food_cost_report
WHERE sale_date >= '2026-02-01'
ORDER BY avg_margin_pct ASC
```

---

## Pre-built Analytical Views

### `v_menu_with_cost`

Full menu with recipe cost and channel pricing.

| Column         | Type    | Description                                          |
| -------------- | ------- | ---------------------------------------------------- |
| id             | uuid    | Menu item ID                                         |
| name           | text    | Dish name                                            |
| department     | text    | `kitchen` or `bar`                                   |
| is_active      | bool    | Currently on the menu                                |
| category       | text    | Menu category name                                   |
| price          | numeric | Base selling price (IDR)                             |
| estimated_cost | numeric | Estimated cost (may be 0 if not set)                 |
| recipe_id      | uuid    | Linked recipe ID (nullable)                          |
| recipe_cost    | numeric | Recipe calculated cost (nullable)                    |
| portion_size   | numeric | Recipe portion size                                  |
| portion_unit   | text    | Recipe portion unit (e.g., `gram`)                   |
| channel_prices | jsonb   | Array: `[{"channel": "gobiz", "price": 45000}, ...]` |
| variants       | jsonb   | Dish variants (sizes, options)                       |

### `v_daily_sales`

Daily revenue aggregated by order type and sales channel.

| Column           | Type    | Description                                      |
| ---------------- | ------- | ------------------------------------------------ |
| sale_date        | date    | Sale date (WITA timezone)                        |
| total_orders     | int     | Number of orders                                 |
| total_items_sold | int     | Number of items sold                             |
| gross_revenue    | numeric | Revenue before discounts                         |
| total_discounts  | numeric | Total discounts applied                          |
| total_tax        | numeric | Total tax collected                              |
| net_revenue      | numeric | Final revenue after discounts and tax            |
| order_type       | text    | `dine_in`, `takeaway`, `delivery`                |
| channel          | text    | `dine_in`, `takeaway`, `gobiz`, `grab`, `direct` |
| cash_total       | numeric | Cash payments                                    |
| card_total       | numeric | Card payments                                    |
| qr_total         | numeric | QR/digital payments                              |

### `v_food_cost_report`

Actual food cost per menu item per day, calculated from FIFO batch allocations.

**Important:** This view provides TWO revenue figures:

- `total_revenue_gross` — price before discounts (menu price x quantity)
- `total_revenue_net` — actual collected revenue after all discounts

Use `food_cost_pct_net` for real profitability analysis (matches internal reports).
Use `food_cost_pct_gross` to evaluate menu pricing efficiency.

| Column              | Type    | Description                                             |
| ------------------- | ------- | ------------------------------------------------------- |
| menu_item_id        | uuid    | Menu item ID                                            |
| menu_item_name      | text    | Dish name                                               |
| department          | text    | `kitchen` or `bar`                                      |
| sale_date           | date    | Sale date (WITA timezone)                               |
| times_sold          | int     | Number of times sold                                    |
| total_quantity      | numeric | Total portions sold                                     |
| avg_selling_price   | numeric | Average base selling price (IDR)                        |
| avg_food_cost       | numeric | Average actual food cost per portion (IDR)              |
| total_food_cost     | numeric | Total food cost (ingredients)                           |
| total_revenue_gross | numeric | Revenue BEFORE discounts (menu price x qty)             |
| total_revenue_net   | numeric | Revenue AFTER discounts (actual collected)              |
| total_discounts     | numeric | Total discounts applied (item + bill level)             |
| total_profit        | numeric | Gross profit (net revenue - food cost)                  |
| avg_margin_pct      | numeric | Average profit margin % (based on net revenue)          |
| food_cost_pct_net   | numeric | Food cost % based on NET revenue (real profitability)   |
| food_cost_pct_gross | numeric | Food cost % based on GROSS revenue (pricing efficiency) |

### `v_recipe_details`

Recipe decomposition — full ingredient tree with costs.

| Column                   | Type    | Description                                      |
| ------------------------ | ------- | ------------------------------------------------ |
| recipe_id                | uuid    | Recipe ID                                        |
| recipe_name              | text    | Recipe name                                      |
| department               | text    | `kitchen` or `bar`                               |
| estimated_cost           | numeric | Recipe estimated total cost                      |
| portion_size             | numeric | Output portion size                              |
| portion_unit             | text    | Output unit                                      |
| component_type           | text    | `product` (raw) or `preparation` (semi-finished) |
| ingredient_name          | text    | Ingredient name                                  |
| quantity                 | numeric | Quantity used per portion                        |
| unit                     | text    | Unit of measurement                              |
| ingredient_cost_per_unit | numeric | Last known cost per unit (IDR)                   |
| ingredient_base_unit     | text    | Base unit of the ingredient                      |

---

## Available Tables (25 total)

### Menu & Pricing

| Table                | Description                                       |
| -------------------- | ------------------------------------------------- |
| `menu_items`         | All dishes with prices, departments, variants     |
| `menu_categories`    | Menu categories (Appetizer, Main, Beverage, etc.) |
| `sales_channels`     | Sales channels: dine_in, takeaway, gobiz, grab    |
| `channel_prices`     | Per-channel pricing for menu items                |
| `channel_taxes`      | Tax rules per channel                             |
| `channel_menu_items` | Menu availability per channel                     |
| `taxes`              | Tax definitions (service tax, government tax)     |

### Recipes & Ingredients

| Table                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `recipes`                 | Recipes with cost, portion size, department            |
| `recipe_components`       | Recipe ingredients (product or preparation references) |
| `recipe_categories`       | Recipe categories                                      |
| `preparations`            | Semi-finished products (doughs, sauces, cuts, etc.)    |
| `preparation_ingredients` | Ingredients of preparations                            |
| `preparation_categories`  | Preparation categories                                 |
| `products`                | Raw products/ingredients with purchase prices          |
| `product_categories`      | Product categories                                     |

### Sales & Payments

| Table                | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `orders`             | Orders with totals, discounts, tax, channel, status                         |
| `order_items`        | Individual items in orders (with prices, status)                            |
| `sales_transactions` | Detailed sales records with FIFO actual_cost and profit_calculation (JSONB) |
| `shifts`             | Cashier shifts with revenue summaries                                       |
| `payments`           | Payment records (cash, card, QR)                                            |
| `payment_methods`    | Payment method definitions                                                  |
| `discount_events`    | Applied discounts with details                                              |

### Inventory

| Table                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `storage_batches`     | Raw product inventory batches (FIFO, cost_per_unit) |
| `preparation_batches` | Semi-finished product batches                       |

### Reference

| Table                    | Description                         |
| ------------------------ | ----------------------------------- |
| `transaction_categories` | Expense/income category definitions |

---

## Key JSONB Fields

### `sales_transactions.profit_calculation`

```json
{
  "cost": 19930.27,
  "revenue": 65000,
  "grossProfit": 45069.73,
  "profitMargin": 69.34,
  "originalPrice": 65000,
  "ingredientsCost": 19930.27,
  "itemOwnDiscount": 0,
  "allocatedBillDiscount": 0
}
```

### `sales_transactions.actual_cost`

```json
{
  "method": "FIFO",
  "totalCost": 19930.27,
  "calculatedAt": "2025-12-24T02:35:20.710Z",
  "productCosts": [
    {
      "productId": "...",
      "productName": "Tomato local",
      "quantity": 166.67,
      "unit": "gram",
      "totalCost": 2333.33,
      "averageCostPerUnit": 14.0,
      "batchAllocations": [{ "batchId": "...", "costPerUnit": 14, "allocatedQuantity": 166.67 }]
    }
  ],
  "preparationCosts": [
    {
      "preparationId": "...",
      "preparationName": "Concase",
      "quantity": 60,
      "unit": "ml",
      "totalCost": 4668.6,
      "averageCostPerUnit": 77.81
    }
  ]
}
```

---

## Currency & Locale

- **Currency**: IDR (Indonesian Rupiah), no decimals in display
- **Timezone**: WITA (Asia/Makassar, UTC+8)
- **Prices**: Stored as numeric, e.g. `65000` = Rp 65,000

---

## Example Queries

### Top 10 dishes by profit margin (last 30 days)

```sql
SELECT menu_item_name, department,
       SUM(total_quantity) as qty_sold,
       ROUND(AVG(avg_margin_pct), 1) as avg_margin,
       SUM(total_revenue) as revenue,
       SUM(total_food_cost) as cost,
       SUM(total_profit) as profit
FROM v_food_cost_report
WHERE sale_date >= CURRENT_DATE - 30
GROUP BY menu_item_id, menu_item_name, department
ORDER BY avg_margin DESC
LIMIT 10
```

### Daily revenue trend

```sql
SELECT sale_date,
       SUM(net_revenue) as total_revenue,
       SUM(total_orders) as orders
FROM v_daily_sales
WHERE sale_date >= '2026-02-01'
GROUP BY sale_date
ORDER BY sale_date
```

### Worst food cost items (margin < 40%)

```sql
SELECT menu_item_name, department,
       ROUND(AVG(avg_margin_pct), 1) as avg_margin,
       ROUND(AVG(avg_food_cost), 0) as avg_cost,
       ROUND(AVG(avg_selling_price), 0) as avg_price
FROM v_food_cost_report
WHERE sale_date >= CURRENT_DATE - 30
GROUP BY menu_item_id, menu_item_name, department
HAVING AVG(avg_margin_pct) < 40
ORDER BY avg_margin ASC
```

### Recipe ingredient cost breakdown

```sql
SELECT recipe_name, ingredient_name, component_type,
       quantity, unit, ingredient_cost_per_unit,
       ROUND(quantity * ingredient_cost_per_unit, 0) as line_cost
FROM v_recipe_details
WHERE recipe_name = 'Shakshuka'
ORDER BY line_cost DESC
```

### Revenue by sales channel

```sql
SELECT channel,
       SUM(net_revenue) as revenue,
       SUM(total_orders) as orders
FROM v_daily_sales
WHERE sale_date >= CURRENT_DATE - 30
GROUP BY channel
ORDER BY revenue DESC
```

---

## Security Constraints

- **Read-only**: Only `SELECT` and `WITH` (CTE) queries are allowed
- **No DML/DDL**: INSERT, UPDATE, DELETE, DROP, ALTER, etc. are blocked
- **No multi-statements**: Semicolons followed by more SQL are blocked
- **Auto-limit**: If no LIMIT clause is provided, max 1000 rows are returned
- **API key required**: Every request must include `x-api-key` header
- **Tables restricted**: Only the 25 tables listed above + 4 views are accessible

---

## Error Handling

```json
{"success": false, "error": "Only SELECT queries are allowed"}
{"success": false, "error": "Invalid or missing API key"}
{"success": false, "error": "relation \"users\" does not exist", "code": "42P01"}
```

Note: If you query a table not in the granted list, you'll get a "permission denied" error.
