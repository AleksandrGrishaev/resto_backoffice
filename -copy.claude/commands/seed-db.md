# /seed-db

Execute seed scripts to populate Supabase database with test data.

## Task

Use MCP Supabase tools to seed data from `src/stores/shared/productDefinitions.ts` (CORE_PRODUCTS array).

## Process

1. Read product data from `src/stores/shared/productDefinitions.ts`
2. Map `CoreProductDefinition` fields to `products` table schema:
   - `nameEn` → `name`
   - `name` → `name_ru`
   - `category` → `category`
   - `purchaseCost` → `price`
   - `purchaseUnit` → `unit`
   - `tags` = `[category, ...usedInDepartments]`
   - `description` = metadata summary
3. Use `mcp__supabase__execute_sql` to INSERT products
4. Report results (success/failure count)

## Mapping Details

CoreProductDefinition → products table:

- `id` → auto-generated UUID (ignore prod-\* IDs)
- `name` → nameEn
- `name_ru` → name
- `category` → category
- `price` → purchaseCost
- `cost` → baseCostPerUnit \* purchaseToBaseRatio
- `unit` → purchaseUnit
- `is_active` → true
- `is_available` → true
- `track_stock` → false
- `tags` → [category, ...usedInDepartments]
- `description` → "Base unit: {baseUnit}, Yield: {yieldPercentage}%, Shelf life: {shelfLifeDays} days"

## Example Workflow

```bash
/clean-db          # Clear all data first
/seed-db           # Populate with test data
```

## Expected Output

```
🌱 Seeding products from productDefinitions...
✅ Seeded: Beef Steak
✅ Seeded: Potato
✅ Seeded: Fresh Tomato
...
📊 Summary: 28/28 products seeded successfully
```
