# Product Variance Report

## Overview

Product Variance Report analyzes discrepancies between expected and actual product inventory. It helps identify:

- Unrecorded losses (theft, spoilage not logged)
- Recipe errors (incorrect ingredient quantities)
- Receipt errors (wrong quantities received)
- Data entry mistakes

## Key Formula

```
Variance = Opening + Received - Sales - Loss - Stock
```

| Field          | Description                                                |
| -------------- | ---------------------------------------------------------- |
| **Opening**    | Stock at the beginning of selected period                  |
| **Received**   | Products received from suppliers during period             |
| **Sales**      | Theoretical usage from orders (decomposed through recipes) |
| **Write-offs** | Actual write-offs from storage (for comparison)            |
| **Loss**       | Products written off (expired, spoiled, other)             |
| **Stock**      | Current stock at the end of period                         |
| **Variance**   | Should be 0 if everything is recorded correctly            |

## Sales Calculation (V3)

### Two Types of Sales Metrics

The report shows **two different sales metrics** for comparison:

### 1. Sales (Theoretical) - MAIN METRIC

Calculated by **decomposing completed orders through recipes** to products.

**Decomposition Path:**

```
Completed Orders
  → Order Items (menu items sold)
    → Menu Item Variants
      → Composition (recipe/preparation/product)
        → Recipe Components (products/preparations)
          → Preparation Ingredients (products)
            → PRODUCTS (final decomposition)
```

**Example:**

```
Order: 2x "Burger Meal"
  → Menu Variant composition: 1x "Burger Recipe"
    → Recipe components: 150g beef, 50g bun, 20g sauce
      → Theoretical product usage: 300g beef, 100g bun, 40g sauce
```

This is the **main metric** used in variance calculation because it represents what **should have been used** based on recipes.

### 2. Write-offs (Actual) - COMPARISON METRIC

Based on actual write-off operations from storage:

```
storage_operations WHERE write_off_details.reason = 'sales_consumption'
```

This shows what was **actually written off** in the system. The difference between Sales and Write-offs can reveal:

- **Recipe errors** - if theoretical > actual, recipes may have incorrect quantities
- **Unrecorded usage** - if actual > theoretical, products are being used without orders
- **System not synced** - write-offs not happening when orders are completed

### Sales vs Write-offs Difference

When the difference is significant (> Rp 100), it's shown in the Write-offs column:

- **Positive (+)** = Theoretical sales > Actual write-offs (possible recipe over-estimation)
- **Negative (-)** = Theoretical sales < Actual write-offs (unrecorded usage or manual write-offs)

## How Loss is Calculated

Loss includes write-offs with reasons:

- `expired` - Product expired
- `spoiled` - Product spoiled before expiration
- `other` - Other losses (theft, damage, etc.)
- `expiration` - Alternative expiration reason

Loss is also traced through preparations (same logic as write-offs).

**Total Loss = Direct Loss + Traced Loss**

## Understanding Variance

### Variance = 0 (OK)

Everything is recorded correctly. All product movements are accounted for.

### Variance > 0 (Product "Disappeared")

Product is missing. Possible causes:

- **Theft** - Product was stolen
- **Unrecorded sales** - Orders not completed in system
- **Recipe errors** - Actual usage higher than recipe specifies
- **Unrecorded spoilage** - Product thrown away without logging

### Variance < 0 (Product "Appeared")

More product than expected. Possible causes:

- **Receipt errors** - Received more than logged
- **Recipe errors** - Actual usage lower than recipe specifies
- **Inventory count errors** - Wrong stock count

## Row Color Coding

| Color            | Variance Amount | Action Required                    |
| ---------------- | --------------- | ---------------------------------- |
| **Red**          | > Rp 100,000    | Critical - investigate immediately |
| **Orange**       | > Rp 10,000     | Warning - review when possible     |
| **Light Yellow** | < Rp 10,000     | Minor - acceptable variance        |
| **No highlight** | = 0             | OK - no action needed              |

## Filters

- **Date Range** - Select period for analysis
- **Department** - Filter by Kitchen or Bar
- **Show only with variance** - Hide products with zero variance
- **Search** - Find specific products by name

## Detail Dialog

Click on a row (for products with preparations) to see:

- **Direct Sales/Loss** - Product sold/lost directly
- **Traced Sales/Loss** - Attributed from preparation sales/losses
- **Preparations breakdown** - Which preparations use this product and their contribution

## Best Practices

1. **Run weekly** - Generate report at least once a week
2. **Investigate red rows** - Critical variances need immediate attention
3. **Compare Sales vs Write-offs** - Large differences indicate system sync issues
4. **Check recipes** - High variance may indicate recipe errors
5. **Verify receipts** - Negative variance often means receipt quantity errors
6. **Track trends** - Compare reports over time to identify patterns

## Technical Details

### SQL Function

`get_product_variance_report_v3(p_start_date, p_end_date, p_department)`

### Data Sources

- `products` - Product catalog
- `orders` / `order_items` - Completed orders (for theoretical sales)
- `menu_items` - Menu item variants and compositions
- `recipes` / `recipe_components` - Recipe definitions
- `preparations` / `preparation_ingredients` - Preparation definitions
- `storage_batches` - Current stock (closing)
- `storage_operations` - Write-offs (actual sales, loss)
- `preparation_operations` - Preparation write-offs
- `supplierstore_receipts` / `supplierstore_receipt_items` - Received products

### Limitations

- Opening stock is calculated as batches with `receipt_date < period_start`
- Only active products are included
- Only confirmed operations are counted
- Theoretical sales require completed orders with `paid_at` in period
