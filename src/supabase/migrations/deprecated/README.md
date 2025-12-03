# Deprecated Migrations

This folder contains migrations that were applied to fix issues but are no longer needed for new deployments.

## Discount Events RLS Fix (098-102)

**Date:** 2025-12-04
**Issue:** Bill discount events failed to save with `403 Forbidden - RLS policy violation`

### Problem History

Migration `034_create_discount_events_table.sql` had two issues:

1. **Column Constraint:** `applied_by UUID NOT NULL` - blocked system-generated discounts
2. **RLS Policy:** `WITH CHECK (applied_by = auth.uid())` - didn't work in async/background contexts

### Fix Attempts

These migrations were applied to production to fix the issue:

| Migration                                          | Date       | Description                           | Result                           |
| -------------------------------------------------- | ---------- | ------------------------------------- | -------------------------------- |
| `098_make_discount_events_applied_by_nullable.sql` | 2025-12-03 | Made `applied_by` column nullable     | ✅ Partial fix                   |
| `099_fix_discount_events_insert_policy.sql`        | 2025-12-04 | Tried `TO authenticated`              | ❌ Failed                        |
| `100_fix_discount_events_policy_match_orders.sql`  | 2025-12-04 | Tried `auth.role() = 'authenticated'` | ❌ Failed                        |
| `101_temp_disable_rls_discount_events.sql`         | 2025-12-04 | Temporarily disabled RLS for testing  | ✅ Confirmed RLS was the blocker |
| `102_enable_rls_with_uid_check.sql`                | 2025-12-04 | Used `auth.uid() IS NOT NULL`         | ✅ **FINAL FIX**                 |

### Root Cause

**Problem:** `auth.role() = 'authenticated'` doesn't work in background async contexts

Discount events are saved in `queueBackgroundSalesRecording()` (async background queue).
In this context:

- `auth.role()` may return `'anon'` even if JWT token is present
- `auth.uid()` directly checks user ID in JWT token (more reliable)

### Final Solution (Applied in 102)

```sql
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);  -- ✅ Works in all contexts
```

### Current State

**Migration 034 has been corrected** to include:

- ✅ `applied_by UUID` (nullable)
- ✅ `WITH CHECK (auth.uid() IS NOT NULL)` (correct RLS policy)

**New deployments** should use the corrected `034_create_discount_events_table.sql` only.

**Existing deployments** already have these fixes applied via migrations 098-102.

### Why These Migrations Are Deprecated

1. **Already Applied:** These migrations are in production database's `supabase_migrations` table
2. **Consolidated:** All fixes are now included in corrected migration 034
3. **Historical Record:** Kept here for audit trail and debugging reference
4. **Not Needed:** New deployments don't need these intermediate fixes

### Database Sync Status

If you need to verify which migrations are applied to your database:

```sql
SELECT version, name
FROM supabase_migrations
WHERE name LIKE '%discount%'
ORDER BY version;
```

### Lessons Learned

1. **`auth.role()` vs `auth.uid()`:**

   - `auth.role()` is unreliable in background/async contexts
   - `auth.uid() IS NOT NULL` is more robust for authentication checks
   - Use `auth.uid()` for policies in async/queued operations

2. **Testing Methodology:**

   - Temporarily disabling RLS helps isolate issues
   - Test policies in actual application context, not just SQL scripts
   - Compare with working tables to find patterns

3. **Background Operations:**
   - Operations in async queues may have different auth context
   - JWT token is present but role string may differ
   - Always test policies with actual application flow

---

**Last Updated:** 2025-12-04
**Documentation:** See `NextTodoError.md` for detailed debugging process
