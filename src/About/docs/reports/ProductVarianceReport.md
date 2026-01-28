# Product Variance Report

## TODO (2026-01-27)

### Исправлено:

- [x] **Знак Variance** - исправлен в v3.5. Теперь: `+` = surplus (больше чем ожидалось), `-` = shortage (меньше чем ожидалось)
- [x] **Portion-type preparations** - исправлен расчёт in_preps для portion-type (было 170x завышение для Tuna)

### Требует доработки (после инвентаризации в феврале):

1. **Opening In Preps** - Opening НЕ включает продукты в полуфабрикатах

   - Сейчас: Opening = только raw stock из `inventory_snapshots`
   - Надо: Opening = raw stock + продукты в prep batches на дату открытия
   - Проблема: нет исторических данных о состоянии батчей на прошлые даты
   - Решение: после инвентаризации полуфабрикатов в феврале, считать от этой даты

2. **Closing In Preps** - показывает ТЕКУЩЕЕ состояние, а не на конец периода

   - Сейчас: `pb.current_quantity` - это сегодняшнее значение
   - Надо: состояние батчей на дату конца периода
   - Решение: то же - работаем с данными после февральской инвентаризации

3. **Историческое состояние батчей полуфабрикатов**
   - Списание работает корректно (проверено 2026-01-27)
   - Старые данные (до января) не имеют корректных списаний
   - Рекомендация: начать отсчёт с февральской инвентаризации

---

## Overview

Product Variance Report analyzes discrepancies between expected and actual product inventory. It helps identify:

- Unrecorded losses (theft, spoilage not logged)
- Recipe errors (incorrect ingredient quantities)
- Receipt errors (wrong quantities received)
- Data entry mistakes

## Key Formula

```
Variance = Opening + Received - Sales - Loss - Closing
```

| Field        | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| **Opening**  | Stock at the beginning of selected period (from inventory snapshot)       |
| **Received** | Products received from suppliers during period                            |
| **Sales**    | Theoretical usage from orders (direct + via recipes + via preparations)   |
| **Loss**     | Products written off (expired, spoiled, other) + traced from preparations |
| **Closing**  | Current stock at end of period (raw batches + in preparations)            |
| **Variance** | Should be 0 if everything is recorded correctly                           |

## Understanding Variance

### Variance = 0 (Balanced)

Everything is recorded correctly. All product movements are accounted for.

### Variance > 0 (Shortage - Product "Disappeared")

Product is missing. Possible causes:

- **Theft** - Product was stolen
- **Unrecorded sales** - Orders not completed in system
- **Recipe errors** - Actual usage higher than recipe specifies
- **Unrecorded spoilage** - Product thrown away without logging

### Variance < 0 (Surplus - Product "Appeared")

More product than expected. Possible causes:

- **Receipt errors** - Received more than logged
- **Recipe errors** - Actual usage lower than recipe specifies
- **Inventory count errors** - Wrong stock count

## Sales Calculation

### Three Paths of Product Sales

The report traces product usage through three paths:

#### 1. Direct Product Sales

Product sold directly as part of menu item composition:

```
Menu Item Variant → Composition (type='product') → Product
```

#### 2. Sales via Recipes

Product used as ingredient in recipes that are sold:

```
Menu Item Variant → Composition (type='recipe') → Recipe Components → Product
```

#### 3. Sales via Preparations

Product used in preparations that are consumed through orders:

```
Menu Item Variant → Composition (type='preparation') → Preparation Ingredients → Product
            OR
Menu Item Variant → Composition (type='recipe') → Recipe Components (type='preparation') → Preparation Ingredients → Product
```

**Total Sales = Direct Sales + Sales via Recipes + Sales via Preparations**

## Loss Calculation

### Direct Losses

Write-off operations for the product with reasons:

- `expired` - Product expired
- `spoiled` - Product spoiled before expiration
- `expiration` - Alternative expiration reason
- `other` - Other losses (theft, damage, etc.)

### Traced Losses (from Preparations)

When a preparation containing this product is written off, the proportional product loss is traced back:

```
Preparation Write-off × (Product Quantity per Batch / Output Quantity) = Traced Product Loss
```

**Total Loss = Direct Loss + Traced Loss**

## Opening Stock

Opening stock is retrieved from `inventory_snapshots` table for the day before period start.

Requirements:

- Inventory snapshot must exist for the product
- Snapshot date = period start date - 1 day

If no snapshot exists, opening stock is 0.

## Closing Stock

Closing stock consists of two parts:

### 1. Raw Stock (Direct Batches)

Active storage batches with `current_quantity > 0`:

```sql
storage_batches WHERE item_id = product AND status = 'active'
```

### 2. Stock in Preparations

Product quantity "locked" in active preparation batches:

```
Preparation Batch Quantity × (Product per Batch / Output Quantity)
```

**Total Closing = Raw Stock + Stock in Preparations**

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

## Detail Dialog (V2)

Click on any product row to open the detailed breakdown dialog.

### Formula Bar

Visual representation of the variance formula with clickable values:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Opening  +  Received  -  Sales  -  Loss  -  Closing  =  VARIANCE  │
│  [100 kg]    [+50 kg]   [-80 kg]  [-5 kg]  [-60 kg]    [+5 kg]     │
│  Rp 500K     Rp 250K    Rp 400K   Rp 25K   Rp 300K     Rp 25K      │
└─────────────────────────────────────────────────────────────────────┘
```

### Expandable Sections

#### 1. Opening Section

- Quantity and amount from snapshot
- Link to source inventory document
- Snapshot date and source type

#### 2. Received Section

- Total quantity and amount
- Top 5 receipts with:
  - Receipt number and date
  - Supplier name
  - Quantity, unit cost, total cost
- "Show more" for additional receipts

#### 3. Sales Section

- Direct vs Via Preparations breakdown
- Top 5 menu items by product usage:
  - Menu item name and variant
  - Quantity sold
  - Product used
  - Product cost
- Preparations that produced this product

#### 4. Loss Section

- Breakdown by reason (expired, spoiled, other)
- Recent loss details with batch numbers
- Traced losses from preparation write-offs

#### 5. Closing Section

- Raw stock with batch details:
  - Batch number
  - Receipt date
  - Quantity and cost
- Stock in preparations:
  - Preparation name
  - Production date
  - Product quantity locked

#### 6. Variance Section

- Final variance quantity and amount
- Interpretation (shortage/surplus/balanced)
- Possible reasons for variance

## Best Practices

1. **Run weekly** - Generate report at least once a week
2. **Investigate red rows** - Critical variances need immediate attention
3. **Check recipes** - High variance may indicate recipe quantity errors
4. **Verify receipts** - Negative variance often means receipt quantity errors
5. **Review preparations** - Large traced losses may indicate production issues
6. **Track trends** - Compare reports over time to identify patterns
7. **Create snapshots** - Run inventory counts to establish accurate opening balances

## Technical Details

### RPC Functions

| Function                          | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `get_product_variance_report_v3`  | Main report with summary per product  |
| `get_product_variance_details_v2` | Detailed breakdown for single product |

### Key Tables

| Table                                      | Purpose                     |
| ------------------------------------------ | --------------------------- |
| `products`                                 | Product catalog             |
| `inventory_snapshots`                      | Opening stock snapshots     |
| `supplierstore_receipt_items`              | Received quantities         |
| `orders` / `order_items` / `payments`      | Completed orders            |
| `menu_items` (variants JSONB)              | Menu compositions           |
| `recipes` / `recipe_components`            | Recipe definitions          |
| `preparations` / `preparation_ingredients` | Preparation definitions     |
| `storage_operations`                       | Product write-offs          |
| `preparation_operations`                   | Preparation write-offs      |
| `storage_batches`                          | Current product batches     |
| `preparation_batches`                      | Current preparation batches |

### Schema Notes

- `supplierstore_orders.supplier_id` is TEXT (requires cast to UUID for counteragents join)
- `storage_batches.receipt_date` - batch receipt date
- `preparation_batches.production_date` - batch production date
- `recipe_components.component_id` is TEXT
- `menu_items.variants[].composition[].id` is TEXT in JSONB

### Limitations

- Opening stock requires inventory snapshot for date before period start
- Only active products are included
- Only confirmed operations are counted
- Sales require completed payments within period
- Preparations consumption is calculated from order decomposition, not actual production
