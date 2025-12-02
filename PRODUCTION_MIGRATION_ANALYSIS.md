# Production Migration Analysis (013-031)

**Date:** 2025-12-02
**Target:** Production Database (bkntdcvzatawencxghob.supabase.co)
**Analyzed by:** Claude Code

## ⚠️ CRITICAL ISSUES FOUND

### 🔴 HIGH RISK - Will Fail on Production

#### 1. **Migration 019** - Payment Methods Table (SEED DATA WITH HARDCODED ACCOUNT IDS)

**File:** `019_create_payment_methods_table.sql`

**Problem:**

```sql
INSERT INTO payment_methods (..., account_id, ...) VALUES
  ('Cash', 'cash', 'cash', 'acc_1', ...),  -- ❌ acc_1 may not exist
  ('Credit/Debit Card', 'card', 'card', 'acc_3', ...),  -- ❌ acc_3 may not exist
  ('QR Code (QRIS)', 'qr', 'bank', 'acc_2', ...)  -- ❌ acc_2 may not exist
```

**Why it will fail:**

- Production database is empty (no accounts yet)
- Foreign key constraint: `account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL`
- If `acc_1`, `acc_2`, `acc_3` don't exist → **FOREIGN KEY VIOLATION**

**Solution:** Either:

1. Run this migration AFTER creating accounts in production
2. Modify migration to use `account_id = NULL` initially
3. Create a separate seed script to run after account setup

---

#### 2. **Migration 027** - Backfill Write-off Expenses (REFERENCES acc_1)

**File:** `027_backfill_writeoff_expenses.sql`

**Problem:**

```sql
INSERT INTO transactions (
  account_id,
  ...
)
SELECT
  'acc_1' as account_id,  -- ❌ Hardcoded acc_1
  ...
FROM storage_operations so
```

**Why it will fail:**

- Assumes `acc_1` exists
- If no write-offs in production → will succeed but do nothing
- If write-offs exist but `acc_1` doesn't → **FOREIGN KEY VIOLATION**

**Solution:**

- Safe on empty production (no storage_operations = no insert)
- If production has data → need to ensure `acc_1` exists first

---

#### 3. **Migration 028** - Backfill OPEX Write-offs (REFERENCES acc_1)

**File:** `028_backfill_opex_writeoffs.sql`

**Problem:** Same as Migration 027

```sql
'acc_1' as account_id,  -- ❌ Hardcoded acc_1
```

**Solution:** Same as Migration 027

---

#### 4. **Migration 029** - Production Write-off Expenses (REFERENCES acc_1)

**File:** `029_production_writeoff_expenses.sql`

**Problem:** Combination of 027 + 028, same issue

```sql
'acc_1' as account_id,  -- ❌ Hardcoded acc_1
```

**Solution:** Same as Migration 027

---

#### 5. **Migration 031** - Migrate Supplier IDs (HARDCODED UUID MAPPING)

**File:** `031_migrate_supplier_ids_to_uuid.sql`

**Problem:**

```sql
INSERT INTO supplier_id_mapping (old_id, new_id, supplier_name) VALUES
  ('sup-dairy-fresh', 'ec9f8799-aad8-4ebf-94db-40ef5eeb28a2', ...),  -- ❌ UUID may not exist
  ('sup-fresh-veg-market', '166912ab-f999-409e-abb7-e3571fe21ac0', ...),
  ...
```

**Why it will fail:**

- If production has products with `primary_supplier_id = 'sup-dairy-fresh'` etc.
- But counteragents table doesn't have UUID `ec9f8799-aad8-4ebf-94db-40ef5eeb28a2`
- Migration will update products → **FOREIGN KEY VIOLATION** (if FK exists)
- Or products will reference non-existent suppliers

**Solution:**

- If production is empty → migration will succeed but do nothing
- If production has products → need to ensure counteragents exist with matching UUIDs first

---

## ✅ SAFE MIGRATIONS (Will Not Fail)

### 🟢 Schema Changes Only (DDL)

| Migration | Description                        | Risk Level | Notes                                                           |
| --------- | ---------------------------------- | ---------- | --------------------------------------------------------------- |
| 013       | Fix preparation batches department | **LOW**    | Updates existing data + adds trigger. Safe if no prep_batches   |
| 014       | Add shelf_life to preparations     | **LOW**    | Adds column with DEFAULT 2. Backfills based on department. Safe |
| 015       | Add operation links                | **LOW**    | Adds columns + indexes. No data required                        |
| 016       | Fix is_admin infinite loop         | **LOW**    | Function update. Safe                                           |
| 017       | Create sales_transactions table    | **LOW**    | New table. Safe                                                 |
| 018       | Add actual_cost to sales           | **LOW**    | Adds column. Safe                                               |
| 020       | Add POS cash register flag         | **LOW**    | Adds column. Safe                                               |
| 021       | Simplify payment_type              | **LOW**    | Function update. Safe                                           |
| 023       | Negative inventory support         | **LOW**    | Adds columns + indexes. Safe                                    |
| 025       | Negative inventory indexes         | **LOW**    | Adds indexes. Safe                                              |
| 026       | Fix reconciled negative batches    | **LOW**    | Function update. Safe                                           |
| 030       | Cleanup unused field               | **LOW**    | Drops column. Safe if column unused                             |

---

### 🟡 Data Migrations (DML) - Safe on Empty DB

| Migration | Description                       | Risk Level | Notes                                                   |
| --------- | --------------------------------- | ---------- | ------------------------------------------------------- |
| 022       | Cleanup empty expense account IDs | **LOW**    | Updates shifts with invalid data. Safe if no shifts     |
| 024       | Backfill last_known_costs         | **LOW**    | Updates products/preps from batches. Safe if no batches |

---

## 📋 RECOMMENDED DEPLOYMENT PLAN

### Phase 1: Pre-Migration Setup (MANUAL)

Before running migrations, set up production:

1. **Create Main Account (`acc_1`)**

   ```sql
   INSERT INTO accounts (id, name, type, initial_balance, current_balance)
   VALUES ('acc_1', 'Main Cash Register', 'cash', 0, 0);
   ```

2. **Create Bank Account (`acc_2`)**

   ```sql
   INSERT INTO accounts (id, name, type, initial_balance, current_balance)
   VALUES ('acc_2', 'Bank Account - BCA', 'bank', 0, 0);
   ```

3. **Create Card Terminal Account (`acc_3`)**

   ```sql
   INSERT INTO accounts (id, name, type, initial_balance, current_balance)
   VALUES ('acc_3', 'Card Terminal', 'card', 0, 0);
   ```

4. **Create Counteragents (Suppliers)** - Only if you have products referencing them

   ```sql
   -- Check if migration 031 is needed
   SELECT DISTINCT primary_supplier_id FROM products WHERE primary_supplier_id IS NOT NULL;

   -- If any results, create counteragents with matching UUIDs from migration 031
   ```

---

### Phase 2: Run Migrations (AUTOMATED)

**Option A: Run All Migrations (if production is empty)**

```bash
# All migrations should succeed on empty production
for i in {013..031}; do
  echo "Running migration ${i}..."
  supabase db push --file src/supabase/migrations/${i}_*.sql
done
```

**Option B: Run Safe Migrations First, Risky Ones After Setup**

```bash
# Safe migrations (schema changes)
supabase db push --file src/supabase/migrations/013_*.sql
supabase db push --file src/supabase/migrations/014_*.sql
...
supabase db push --file src/supabase/migrations/018_*.sql

# STOP HERE - Create accounts manually (Phase 1)

# Risky migration with FK dependencies
supabase db push --file src/supabase/migrations/019_*.sql  # Needs acc_1, acc_2, acc_3

# Continue with remaining safe migrations
...
```

---

### Phase 3: Post-Migration Validation

```sql
-- 1. Verify payment_methods created
SELECT * FROM payment_methods;

-- 2. Verify accounts exist
SELECT * FROM accounts WHERE id IN ('acc_1', 'acc_2', 'acc_3');

-- 3. Check for orphaned data
SELECT COUNT(*) FROM payment_methods WHERE account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = payment_methods.account_id);

-- 4. Verify supplier migration (if applicable)
SELECT COUNT(*) FROM products WHERE primary_supplier_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM counteragents WHERE id::text = products.primary_supplier_id);
```

---

## 🎯 FINAL RECOMMENDATION

### For Fresh Production Database (Empty):

**Strategy:** Skip problematic migrations initially

1. ✅ Run migrations 013-018, 020-026, 030 (all safe schema changes)
2. ⏭️ **SKIP** 019, 027, 028, 029 initially
3. ⏭️ **SKIP** 031 until you have products
4. 📝 Manually create accounts (acc_1, acc_2, acc_3)
5. ✅ Then run migration 019
6. ✅ As you add data, run 027, 028, 029, 031 as needed

### For Production with Existing Data:

**Strategy:** Ensure dependencies exist

1. ✅ Check if accounts exist: `SELECT * FROM accounts WHERE id IN ('acc_1', 'acc_2', 'acc_3')`
2. ✅ If not → create them first
3. ✅ Check if counteragents exist for migration 031
4. ✅ If not → create them with matching UUIDs from migration
5. ✅ Then run all migrations

---

## ⚡ QUICK CHECKLIST

Before deployment:

- [ ] Production database backed up
- [ ] Accounts `acc_1`, `acc_2`, `acc_3` created (or migration 019 modified)
- [ ] Counteragents created if needed for migration 031
- [ ] Test migrations on staging/dev first
- [ ] Have rollback plan ready

---

## 🔄 ROLLBACK STRATEGY

If migrations fail:

1. Most schema migrations are **additive** (add columns/tables) → safe to leave
2. Data migrations (022, 024, 027, 028, 029, 031) may need manual rollback
3. Keep backup of production before migration
4. Worst case: restore from backup

**Specific rollback SQL available in each migration file's comments**
