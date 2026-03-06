-- Migration: 135_cleanup_duplicate_transactions
-- Description: Delete duplicate expense transactions and recalculate account balances
-- Date: 2026-02-03
-- Author: Claude Code
--
-- CONTEXT:
-- 16 groups of duplicate expense transactions found in PRODUCTION.
-- Root cause: createTransaction succeeds (INSERT committed), but subsequent
-- fetchTransactions/updateBalance may timeout. Error propagates to UI,
-- user clicks Save again -> duplicate created.
-- Total phantom expenses: ~Rp 10,911,500
--
-- This migration:
-- 1. Identifies duplicates (same description, amount, type, account_id within same minute)
-- 2. Keeps the FIRST transaction in each group (earliest created_at)
-- 3. Deletes the duplicates
-- 4. Recalculates all account balances from remaining transactions

-- PRE-MIGRATION: Show duplicates that will be deleted (for verification)
-- Run this SELECT first to verify before applying:
--
-- SELECT t1.id, t1.description, t1.amount, t1.type, t1.account_id, t1.created_at,
--        ROW_NUMBER() OVER (
--          PARTITION BY t1.description, t1.amount, t1.type, t1.account_id,
--                       date_trunc('minute', t1.created_at)
--          ORDER BY t1.created_at
--        ) as rn
-- FROM transactions t1
-- WHERE t1.type = 'expense'
-- ORDER BY t1.created_at DESC;

-- STEP 1: Delete duplicate expense transactions (keep earliest in each group)
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY description, amount, type, account_id,
                   date_trunc('minute', created_at)
      ORDER BY created_at
    ) as rn
  FROM transactions
  WHERE type = 'expense'
)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- STEP 2: Recalculate balance for ALL accounts based on actual transactions
-- This corrects any balance drift from the duplicate transactions
UPDATE accounts a
SET balance = (
  SELECT COALESCE(SUM(
    CASE
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'correction' THEN t.amount
      ELSE 0
    END
  ), 0)
  FROM transactions t
  WHERE t.account_id = a.id
);

-- POST-MIGRATION VALIDATION:
-- Run these queries to verify:
--
-- 1. No more duplicates:
-- SELECT description, amount, type, account_id, date_trunc('minute', created_at) as minute,
--        COUNT(*) as cnt
-- FROM transactions WHERE type = 'expense'
-- GROUP BY description, amount, type, account_id, date_trunc('minute', created_at)
-- HAVING COUNT(*) > 1;
--
-- 2. Account balances match transaction sums:
-- SELECT a.id, a.name, a.balance as stored_balance,
--   COALESCE(SUM(
--     CASE
--       WHEN t.type = 'income' THEN t.amount
--       WHEN t.type = 'expense' THEN -t.amount
--       WHEN t.type = 'correction' THEN t.amount
--       ELSE 0
--     END
--   ), 0) as calculated_balance
-- FROM accounts a
-- LEFT JOIN transactions t ON t.account_id = a.id
-- GROUP BY a.id, a.name, a.balance;
