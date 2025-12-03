# Supabase Authentication & RLS Policies

## Overview

This document describes critical considerations for Supabase authentication and Row Level Security (RLS) policies, particularly in async/background operation contexts.

## Key Issue: RLS Policies in Background Operations

### Problem

**Symptom:** Operations fail with `403 Forbidden - new row violates row-level security policy` error, even though user is authenticated and JWT token is present.

**Context:** This occurs when database operations are executed in background/async contexts (queues, delayed operations, background tasks).

### Root Cause

**`auth.role()` is unreliable in background/async contexts:**

```sql
-- ❌ This fails in background operations
CREATE POLICY table_insert ON table_name
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'authenticated');
```

**Why it fails:**

- Background operations may run in different execution context
- `auth.role()` can return `'anon'` instead of `'authenticated'` even with valid JWT
- JWT token is present but role string differs from expected value

### Solution

**Use `auth.uid()` instead of `auth.role()`:**

```sql
-- ✅ This works in all contexts
CREATE POLICY table_insert ON table_name
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Why it works:**

- `auth.uid()` directly checks user ID in JWT token
- More reliable - if user ID exists, user is definitely authenticated
- Works consistently in both foreground and background contexts

## Real-World Example: Discount Events

### The Problem

**Table:** `discount_events`
**Operation:** INSERT during background sales recording (`queueBackgroundSalesRecording()`)
**Error:** `403 Forbidden - RLS policy violation`

### Failed Attempts

**Attempt 1:** Match pattern from working tables (orders, payments)

```sql
-- Works for orders/payments (foreground operations)
-- Fails for discount_events (background operations)
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'authenticated');
```

**Why it failed:** Orders/payments are saved in foreground (direct user action), but discount_events are saved in background async queue.

### Final Solution

```sql
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Result:** ✅ Works in both foreground and background contexts

## Comparison: Foreground vs Background Operations

| Operation Type | Example                             | Context            | `auth.role()` | `auth.uid()` |
| -------------- | ----------------------------------- | ------------------ | ------------- | ------------ |
| **Foreground** | Orders, Payments                    | Direct user action | ✅ Works      | ✅ Works     |
| **Background** | Discount events, Sales transactions | Async queue        | ❌ Fails      | ✅ Works     |

## Best Practices

### ✅ DO

1. **Use `auth.uid() IS NOT NULL` for background operations:**

   ```sql
   WITH CHECK (auth.uid() IS NOT NULL)
   ```

2. **Use `TO public` for client-side operations:**

   ```sql
   FOR INSERT TO public
   ```

3. **Test policies in actual application context:**

   - Don't just test with SQL scripts
   - Test the full flow: user action → async queue → database

4. **Consider operation timing:**
   - Foreground (immediate): `auth.role()` may work
   - Background (delayed/queued): Use `auth.uid()`

### ❌ DON'T

1. **Don't use `TO authenticated` for client operations:**

   ```sql
   -- ❌ Doesn't work with Supabase client
   FOR INSERT TO authenticated
   ```

   Use `TO public` instead.

2. **Don't rely on `auth.role()` for background operations:**

   ```sql
   -- ❌ Unreliable in async context
   WITH CHECK (auth.role() = 'authenticated')
   ```

   Use `auth.uid() IS NOT NULL` instead.

3. **Don't assume all operations have same auth context:**
   - Foreground and background may behave differently
   - Always test in actual usage scenario

## Testing RLS Policies

### Quick Test: Temporarily Disable RLS

```sql
-- Disable RLS for testing
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Test your operation
-- If it works → problem is RLS policy
-- If it fails → problem is elsewhere (constraints, validation, etc.)

-- Re-enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Verify Auth Context

```sql
-- Check current auth context
SELECT
  auth.role() as current_role,
  auth.uid() as current_user_id;
```

## Common Patterns

### Pattern 1: Simple Insert (Foreground)

```sql
-- For tables where inserts happen via direct user action
CREATE POLICY table_insert ON table_name
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Pattern 2: User-Owned Records

```sql
-- For tables where users can only access their own records
CREATE POLICY table_view_own ON table_name
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY table_insert_own ON table_name
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());
```

### Pattern 3: Role-Based Access

```sql
-- For tables requiring specific roles
CREATE POLICY table_view_admin ON table_name
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );
```

### Pattern 4: Background Operations (Critical!)

```sql
-- For tables with background/async operations
CREATE POLICY table_insert ON table_name
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);  -- ✅ Works in all contexts
```

## Migration 034 Fix

The original `discount_events` table had two issues:

**Issue 1: Column Constraint**

```sql
-- ❌ Original
applied_by UUID NOT NULL

-- ✅ Fixed
applied_by UUID  -- Nullable for system-generated events
```

**Issue 2: RLS Policy**

```sql
-- ❌ Original
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  WITH CHECK (applied_by = auth.uid());

-- ✅ Fixed
CREATE POLICY discount_events_create ON discount_events
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);
```

## Debugging Checklist

When you encounter RLS 403 errors:

1. ✅ **Verify JWT token is present:**

   - Check if other operations work (orders, payments)
   - If yes → token is present, problem is policy-specific

2. ✅ **Check operation context:**

   - Foreground (direct user action)?
   - Background (async queue, delayed task)?

3. ✅ **Review policy check:**

   - Using `auth.role()`? → Consider `auth.uid()`
   - Using `TO authenticated`? → Change to `TO public`

4. ✅ **Test with RLS disabled:**

   - If works → problem confirmed to be RLS policy
   - If fails → problem is elsewhere (constraints, etc.)

5. ✅ **Compare with working tables:**
   - Find similar tables that work
   - Compare policies and contexts

## References

- **Detailed debugging log:** `NextTodoError.md`
- **Migration history:** `src/supabase/migrations/deprecated/README.md`
- **Corrected migration:** `src/supabase/migrations/034_create_discount_events_table.sql`

## Key Takeaway

> **Use `auth.uid() IS NOT NULL` instead of `auth.role() = 'authenticated'` for RLS policies on tables that have background/async operations.**

This is more robust and works consistently across all execution contexts.

---

**Last Updated:** 2025-12-04
**Related Issue:** Bill discount events RLS 403 Forbidden error
