# Production Release — Pending Migrations

## KPI Bonus Pools (2026-03-29)

**Status:** Applied to DEV, NOT yet applied to PROD

### Migration 262: `kpi_bonus_pools`

New tables + columns for KPI bonus pool system.

```sql
-- New tables:
-- kpi_bonus_schemes — per-department bonus pool config (pool type, weights, thresholds)
-- kpi_bonus_snapshots — immutable KPI calculation snapshots per payroll period

-- Altered tables:
-- payroll_items: +kpi_bonus NUMERIC NOT NULL DEFAULT 0
-- payroll_periods: +total_kpi_bonuses NUMERIC NOT NULL DEFAULT 0

-- Also includes: RLS, grants, triggers, index on kpi_bonus_snapshots(payroll_period_id)
```

**Apply:** `mcp__supabase_prod__apply_migration` with content from `262_kpi_bonus_pools.sql`

### Migration 263: `kpi_rank_multiplier_and_loss_rate`

Rank-based KPI distribution + loss rate target.

```sql
ALTER TABLE staff_ranks ADD COLUMN kpi_multiplier NUMERIC NOT NULL DEFAULT 1.0;
UPDATE staff_ranks SET kpi_multiplier = 1.5 WHERE name = 'Senior';
UPDATE staff_ranks SET kpi_multiplier = 1.0 WHERE name = 'Junior';
ALTER TABLE kpi_bonus_schemes ADD COLUMN loss_rate_target NUMERIC NOT NULL DEFAULT 3;
```

**Apply:** `mcp__supabase_prod__apply_migration` with content from `263_kpi_rank_multiplier_and_loss_rate.sql`

### Migration 264: `kpi_per_metric_thresholds`

Per-metric minimum score thresholds (y/n or minimum % to pass).

```sql
ALTER TABLE kpi_bonus_schemes
  ADD COLUMN threshold_food_cost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_time INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_production INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN threshold_ritual INTEGER NOT NULL DEFAULT 0;
```

**Apply:** `mcp__supabase_prod__apply_migration` with content from `264_kpi_per_metric_thresholds.sql`

### Migration 265: `kpi_avg_check_per_guest`

Avg Check Per Guest metric — 5th KPI metric for bonus schemes.

```sql
ALTER TABLE kpi_bonus_schemes
  ADD COLUMN IF NOT EXISTS weight_avg_check INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS threshold_avg_check INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_check_target INTEGER DEFAULT 0;

ALTER TABLE kpi_bonus_snapshots
  ADD COLUMN IF NOT EXISTS score_avg_check NUMERIC DEFAULT -1,
  ADD COLUMN IF NOT EXISTS weight_avg_check INTEGER DEFAULT 0;
```

**Apply:** `mcp__supabase_prod__apply_migration` with content from `265_kpi_avg_check_per_guest.sql`

### Migration 266: `get_avg_check_per_guest_rpc`

RPC function to calculate avg check per guest from bill-level guest counts (orders.bills JSONB).

```sql
CREATE OR REPLACE FUNCTION get_avg_check_per_guest(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (total_revenue NUMERIC, total_guests BIGINT)
-- Queries dine-in orders, extracts guestCount from bills JSONB
-- Excludes cancelled orders and cancelled bills
```

**Apply:** `mcp__supabase_prod__apply_migration` with content from `266_get_avg_check_per_guest_rpc.sql`

### Post-migration Steps

1. Apply all 5 migrations in order (262 → 263 → 264 → 265 → 266)
2. Seed default schemes via Settings UI or SQL:
   ```sql
   INSERT INTO kpi_bonus_schemes (department, name, pool_type, pool_amount, weight_food_cost, weight_time, weight_production, weight_ritual, weight_avg_check, threshold_food_cost, threshold_time, threshold_production, threshold_ritual, threshold_avg_check, loss_rate_target, avg_check_target)
   VALUES
     ('kitchen', 'Kitchen KPI Bonus', 'fixed', 0, 20, 25, 40, 15, 0, 100, 80, 100, 80, 0, 3, 0),
     ('bar', 'Bar KPI Bonus', 'fixed', 0, 20, 10, 30, 10, 30, 100, 80, 100, 80, 80, 2, 100000);
   ```
3. Configure actual pool amounts via Settings > KPI > Bonus Pools
4. Verify with a test payroll calculation
