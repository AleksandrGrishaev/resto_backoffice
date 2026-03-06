-- Migration: 136_fix_missing_payment_methods_feb1_3
-- Description: Fix missing payment methods in shifts and create missing account transactions
-- Date: 2026-02-04
--
-- ROOT CAUSE (2 bugs fixed in code):
--   1. EndShiftDialog.vue had .slice(0,4) limiting payment_methods to top 4 by amount
--   2. ShiftSyncAdapter idempotency check used shiftNumber (not unique per shift) instead of shift.id
--
-- AFFECTED SHIFTS:
--   Feb 1 (bc49c84b): GoJek 56,350 dropped by slice → not synced to GoJek account
--   Feb 2 (b07742c5): BCA 218,500 dropped by slice → not synced to BCA account
--   Feb 3 (aefaa0ef): Alex 100,625 dropped by slice + GoJek 389,850 skipped by idempotency
--
-- TOTAL UNSYNCED: Rp 765,325
--
-- ACCOUNTS:
--   GoJek: 5cdef5af-4e8e-4693-ba9e-558b591fefdd
--   BCA:   40fe2d1a-54c7-43c1-a41c-5c338b498a23
--   Alex:  63db6714-8e15-4c7d-9368-2732170cc46c
--
-- TAX BREAKDOWN (15% total: 5% service + 10% local):
--   amount / 1.15 = pureRevenue
--   pureRevenue * 0.05 = serviceTax
--   pureRevenue * 0.10 = localTax

BEGIN;

-- =====================================================
-- STEP 1: Fix payment_methods array in shifts table
-- =====================================================

-- Feb 1 shift: Add GoJek (56,350)
UPDATE shifts
SET payment_methods = payment_methods || '[{"type": "bank", "code": "gojek", "label": "GoJek", "amount": 56350}]'::jsonb,
    updated_at = NOW()
WHERE id = 'bc49c84b-3937-4caf-ac99-8766e1286b37';

-- Feb 2 shift: Add BCA (218,500)
UPDATE shifts
SET payment_methods = payment_methods || '[{"type": "bank", "code": "bca", "label": "BCA", "amount": 218500}]'::jsonb,
    updated_at = NOW()
WHERE id = 'b07742c5-c1e9-45fe-9784-f2288a7041f0';

-- Feb 3 shift: Add Alex (100,625) - GoJek already in payment_methods
UPDATE shifts
SET payment_methods = payment_methods || '[{"type": "bank", "code": "alex", "label": "Alex", "amount": 100625}]'::jsonb,
    updated_at = NOW()
WHERE id = 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01';

-- Add 'code' field to existing entries that lack it (older shifts without code)
UPDATE shifts
SET payment_methods = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'BNI' THEN elem || '{"code": "bni"}'::jsonb
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'Cash' THEN elem || '{"code": "cash"}'::jsonb
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'Grab' THEN elem || '{"code": "grab"}'::jsonb
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'BCA' THEN elem || '{"code": "bca"}'::jsonb
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'GoJek' THEN elem || '{"code": "gojek"}'::jsonb
      WHEN elem->>'code' IS NULL AND elem->>'label' = 'Alex' THEN elem || '{"code": "alex"}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(payment_methods) elem
)
WHERE id IN (
  'bc49c84b-3937-4caf-ac99-8766e1286b37',
  'b07742c5-c1e9-45fe-9784-f2288a7041f0',
  'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01'
);


-- =====================================================
-- STEP 2: Create missing income transactions
-- =====================================================
-- Tax formula: total / 1.15 = revenue, revenue * 0.05 = service_tax, revenue * 0.10 = local_tax
-- NOTE: balance_after uses current balance at execution time (retroactive fix)

-- ----- Feb 1: GoJek 56,350 → GoJek account -----
-- Revenue: 49,000 | Service Tax: 2,450 | Local Tax: 4,900
INSERT INTO transactions (id, account_id, type, amount, description, balance_after,
  expense_category, performed_by, status, is_correction, related_payment_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 49000,
   'FIX: POS Shift SHIFT-20260131-2026-01-31 - GoJek Revenue',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 49000,
   '{"type": "income", "category": "sales"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'bc49c84b-3937-4caf-ac99-8766e1286b37', NOW(), NOW()),
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 2450,
   'FIX: POS Shift SHIFT-20260131-2026-01-31 - GoJek Service Tax (5%)',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 49000 + 2450,
   '{"type": "income", "category": "service_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'bc49c84b-3937-4caf-ac99-8766e1286b37', NOW(), NOW()),
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 4900,
   'FIX: POS Shift SHIFT-20260131-2026-01-31 - GoJek Local Tax (10%)',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 49000 + 2450 + 4900,
   '{"type": "income", "category": "local_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'bc49c84b-3937-4caf-ac99-8766e1286b37', NOW(), NOW());

UPDATE accounts SET balance = balance + 56350, updated_at = NOW()
WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd';


-- ----- Feb 2: BCA 218,500 → BCA account -----
-- Revenue: 190,000 | Service Tax: 9,500 | Local Tax: 19,000
INSERT INTO transactions (id, account_id, type, amount, description, balance_after,
  expense_category, performed_by, status, is_correction, related_payment_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), '40fe2d1a-54c7-43c1-a41c-5c338b498a23', 'income', 190000,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 - BCA Revenue',
   (SELECT balance FROM accounts WHERE id = '40fe2d1a-54c7-43c1-a41c-5c338b498a23') + 190000,
   '{"type": "income", "category": "sales"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'b07742c5-c1e9-45fe-9784-f2288a7041f0', NOW(), NOW()),
  (gen_random_uuid(), '40fe2d1a-54c7-43c1-a41c-5c338b498a23', 'income', 9500,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 - BCA Service Tax (5%)',
   (SELECT balance FROM accounts WHERE id = '40fe2d1a-54c7-43c1-a41c-5c338b498a23') + 190000 + 9500,
   '{"type": "income", "category": "service_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'b07742c5-c1e9-45fe-9784-f2288a7041f0', NOW(), NOW()),
  (gen_random_uuid(), '40fe2d1a-54c7-43c1-a41c-5c338b498a23', 'income', 19000,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 - BCA Local Tax (10%)',
   (SELECT balance FROM accounts WHERE id = '40fe2d1a-54c7-43c1-a41c-5c338b498a23') + 190000 + 9500 + 19000,
   '{"type": "income", "category": "local_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'b07742c5-c1e9-45fe-9784-f2288a7041f0', NOW(), NOW());

UPDATE accounts SET balance = balance + 218500, updated_at = NOW()
WHERE id = '40fe2d1a-54c7-43c1-a41c-5c338b498a23';


-- ----- Feb 3: GoJek 389,850 → GoJek account (idempotency bug) -----
-- Revenue: 339,000 | Service Tax: 16,950 | Local Tax: 33,900
INSERT INTO transactions (id, account_id, type, amount, description, balance_after,
  expense_category, performed_by, status, is_correction, related_payment_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 339000,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - GoJek Revenue',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 339000,
   '{"type": "income", "category": "sales"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW()),
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 16950,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - GoJek Service Tax (5%)',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 339000 + 16950,
   '{"type": "income", "category": "service_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW()),
  (gen_random_uuid(), '5cdef5af-4e8e-4693-ba9e-558b591fefdd', 'income', 33900,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - GoJek Local Tax (10%)',
   (SELECT balance FROM accounts WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd') + 339000 + 16950 + 33900,
   '{"type": "income", "category": "local_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW());

UPDATE accounts SET balance = balance + 389850, updated_at = NOW()
WHERE id = '5cdef5af-4e8e-4693-ba9e-558b591fefdd';


-- ----- Feb 3: Alex 100,625 → Alex account (slice bug) -----
-- Revenue: 87,500 | Service Tax: 4,375 | Local Tax: 8,750
INSERT INTO transactions (id, account_id, type, amount, description, balance_after,
  expense_category, performed_by, status, is_correction, related_payment_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), '63db6714-8e15-4c7d-9368-2732170cc46c', 'income', 87500,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - Alex Revenue',
   (SELECT balance FROM accounts WHERE id = '63db6714-8e15-4c7d-9368-2732170cc46c') + 87500,
   '{"type": "income", "category": "sales"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW()),
  (gen_random_uuid(), '63db6714-8e15-4c7d-9368-2732170cc46c', 'income', 4375,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - Alex Service Tax (5%)',
   (SELECT balance FROM accounts WHERE id = '63db6714-8e15-4c7d-9368-2732170cc46c') + 87500 + 4375,
   '{"type": "income", "category": "service_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW()),
  (gen_random_uuid(), '63db6714-8e15-4c7d-9368-2732170cc46c', 'income', 8750,
   'FIX: POS Shift SHIFT-20260202-2026-02-02 (03-Feb) - Alex Local Tax (10%)',
   (SELECT balance FROM accounts WHERE id = '63db6714-8e15-4c7d-9368-2732170cc46c') + 87500 + 4375 + 8750,
   '{"type": "income", "category": "local_tax"}'::jsonb,
   '{"id": "", "name": "System Fix", "type": "system"}'::jsonb,
   'completed', false, 'aefaa0ef-e0a8-41ee-936a-0a6dc8677a01', NOW(), NOW());

UPDATE accounts SET balance = balance + 100625, updated_at = NOW()
WHERE id = '63db6714-8e15-4c7d-9368-2732170cc46c';

COMMIT;
