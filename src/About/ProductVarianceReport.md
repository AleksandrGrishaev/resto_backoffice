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

| Field        | Description                                       |
| ------------ | ------------------------------------------------- |
| **Opening**  | Stock at the beginning of selected period         |
| **Received** | Products received from suppliers during period    |
| **Sales**    | Products consumed through sales (direct + traced) |
| **Loss**     | Products written off (expired, spoiled, other)    |
| **Stock**    | Current stock at the end of period                |
| **Variance** | Should be 0 if everything is recorded correctly   |

## How Sales are Calculated

Sales include **two types of consumption**:

### 1. Direct Sales

Products sold directly (e.g., bottled drinks, packaged items):

```
storage_operations WHERE write_off_details.reason = 'sales_consumption'
                   AND items.itemType = 'product'
```

### 2. Traced Sales (through Preparations)

Products used in semi-finished products (preparations) that were then sold.

**Tracing Logic:**

```
1. Find all preparations that use this product (from preparation_ingredients)
2. Get all preparation sales (preparation_operations with reason = 'sales_consumption')
3. Calculate how much product was used:

   product_qty = (prep_sold_qty / prep_output_qty) * recipe_product_qty

   Example:
   - Preparation "Burger Patty" uses 150g beef per 1 patty (output)
   - 10 patties were sold
   - Traced beef usage = (10 / 1) * 150g = 1500g
```

**Total Sales = Direct Sales + Traced Sales**

## How Loss is Calculated

Loss includes write-offs with reasons:

- `expired` - Product expired
- `spoiled` - Product spoiled before expiration
- `other` - Other losses (theft, damage, etc.)
- `expiration` - Alternative expiration reason

Loss is also traced through preparations (same logic as Sales).

**Total Loss = Direct Loss + Traced Loss**

## Understanding Variance

### Variance = 0 (OK)

Everything is recorded correctly. All product movements are accounted for.

### Variance > 0 (Product "Disappeared")

Product is missing. Possible causes:

- **Theft** - Product was stolen
- **Unrecorded sales** - Sales not logged in system
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
3. **Check recipes** - High variance on products used in many preparations may indicate recipe errors
4. **Verify receipts** - Negative variance often means receipt quantity errors
5. **Track trends** - Compare reports over time to identify patterns

## Technical Details

### SQL Function

`get_product_variance_report_v2(p_start_date, p_end_date, p_department)`

### Data Sources

- `products` - Product catalog
- `storage_batches` - Current stock (closing)
- `storage_operations` - Write-offs (sales, loss)
- `supplierstore_receipts` / `supplierstore_receipt_items` - Received products
- `preparations` / `preparation_ingredients` - Recipe definitions
- `preparation_operations` - Preparation production and write-offs

### Limitations

- Opening stock is calculated as batches with `receipt_date < period_start`
- Only active products are included
- Only confirmed operations are counted
