-- Migration: 219_rls_security_overhaul
-- Description: Replace open RLS policies with is_staff()-gated access
-- Date: 2026-03-16
-- Author: Claude Code
--
-- CONTEXT: Enabling Supabase Anonymous Auth for guest dine-in sessions on website.
-- Anonymous users get `authenticated` role — same as staff. Current policies are
-- wide open ({public} ALL true), meaning anyone with the anon key can read/write
-- financial data, orders, PII. This migration tightens all policies.
--
-- SAFETY: All POS/Kitchen users are in `users` table → is_staff() returns true.
-- All customer-facing RPCs are SECURITY DEFINER → bypass RLS entirely.
-- DDL is transactional → no window where policies are missing.

BEGIN;

-- ============================================================================
-- SECTION A: Staff-only tables
-- Drop open policies, create staff_all with is_staff()
-- ============================================================================

-- A1: Tables with {public} ALL true — "Allow all for authenticated users"
-- 33 tables sharing the same policy name

DROP POLICY IF EXISTS "Allow all for authenticated users" ON accounts;
CREATE POLICY "staff_all" ON accounts FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON counteragents;
CREATE POLICY "staff_all" ON counteragents FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON delete_procurement_requests;
CREATE POLICY "staff_all" ON delete_procurement_requests FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON delete_purchase_orders;
CREATE POLICY "staff_all" ON delete_purchase_orders FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON delete_receipts;
CREATE POLICY "staff_all" ON delete_receipts FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_documents;
CREATE POLICY "staff_all" ON inventory_documents FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
CREATE POLICY "staff_all" ON orders FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated" ON order_items;
CREATE POLICY "staff_all" ON order_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON package_options;
CREATE POLICY "staff_all" ON package_options FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments;
CREATE POLICY "staff_all" ON payments FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON pending_payments;
CREATE POLICY "staff_all" ON pending_payments FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparation_batches;
CREATE POLICY "staff_all" ON preparation_batches FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparation_categories;
CREATE POLICY "staff_all" ON preparation_categories FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparation_ingredients;
CREATE POLICY "staff_all" ON preparation_ingredients FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparation_inventory_documents;
CREATE POLICY "staff_all" ON preparation_inventory_documents FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparation_operations;
CREATE POLICY "staff_all" ON preparation_operations FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON preparations;
CREATE POLICY "staff_all" ON preparations FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
CREATE POLICY "staff_all" ON products FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON recipe_components;
CREATE POLICY "staff_all" ON recipe_components FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON recipe_steps;
CREATE POLICY "staff_all" ON recipe_steps FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON recipe_write_offs;
CREATE POLICY "staff_all" ON recipe_write_offs FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON recipes;
CREATE POLICY "staff_all" ON recipes FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON sales_transactions;
CREATE POLICY "staff_all" ON sales_transactions FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON shifts;
CREATE POLICY "staff_all" ON shifts FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON storage_batches;
CREATE POLICY "staff_all" ON storage_batches FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON storage_operations;
CREATE POLICY "staff_all" ON storage_operations FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_order_items;
CREATE POLICY "staff_all" ON supplierstore_order_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_orders;
CREATE POLICY "staff_all" ON supplierstore_orders FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_receipt_items;
CREATE POLICY "staff_all" ON supplierstore_receipt_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_receipts;
CREATE POLICY "staff_all" ON supplierstore_receipts FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_request_items;
CREATE POLICY "staff_all" ON supplierstore_request_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON supplierstore_requests;
CREATE POLICY "staff_all" ON supplierstore_requests FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON tables;
CREATE POLICY "staff_all" ON tables FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
CREATE POLICY "staff_all" ON transactions FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON operations_alerts;
CREATE POLICY "staff_all" ON operations_alerts FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- A2: Tables with differently-named {public} ALL true policies

DROP POLICY IF EXISTS "app_settings_all" ON app_settings;
CREATE POLICY "staff_all" ON app_settings FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "expense_links_all" ON expense_invoice_links;
CREATE POLICY "staff_all" ON expense_invoice_links FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- payment_methods: drop both {public} policies
DROP POLICY IF EXISTS "payment_methods_write" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_read" ON payment_methods;
CREATE POLICY "staff_all" ON payment_methods FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- transaction_categories: drop both {public} policies
DROP POLICY IF EXISTS "Write for admin" ON transaction_categories;
DROP POLICY IF EXISTS "Read for authenticated" ON transaction_categories;
CREATE POLICY "staff_all" ON transaction_categories FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- A3: Tables with granular {public} policies

-- entity_change_log: {public} INSERT/SELECT → staff only
DROP POLICY IF EXISTS "Allow insert changelog" ON entity_change_log;
DROP POLICY IF EXISTS "Allow read changelog" ON entity_change_log;
CREATE POLICY "staff_insert" ON entity_change_log FOR INSERT TO authenticated
  WITH CHECK (is_staff());
CREATE POLICY "staff_select" ON entity_change_log FOR SELECT TO authenticated
  USING (is_staff());

-- recipe_categories: {public} INSERT/UPDATE/DELETE + {authenticated} SELECT → staff ALL
DROP POLICY IF EXISTS "Allow delete recipe_categories" ON recipe_categories;
DROP POLICY IF EXISTS "Allow insert recipe_categories" ON recipe_categories;
DROP POLICY IF EXISTS "Allow update recipe_categories" ON recipe_categories;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON recipe_categories;
CREATE POLICY "staff_all" ON recipe_categories FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- A4: Tables with {authenticated} open policies → tighten to is_staff()

-- inventory_quick_lists
DROP POLICY IF EXISTS "Allow all for authenticated users" ON inventory_quick_lists;
CREATE POLICY "staff_all" ON inventory_quick_lists FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- inventory_snapshots
DROP POLICY IF EXISTS "Allow authenticated insert on inventory_snapshots" ON inventory_snapshots;
DROP POLICY IF EXISTS "Allow authenticated read on inventory_snapshots" ON inventory_snapshots;
DROP POLICY IF EXISTS "Allow authenticated update on inventory_snapshots" ON inventory_snapshots;
CREATE POLICY "staff_all" ON inventory_snapshots FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- kitchen_bar_kpi
DROP POLICY IF EXISTS "Allow authenticated users to insert kitchen_bar_kpi" ON kitchen_bar_kpi;
DROP POLICY IF EXISTS "Allow authenticated users to read kitchen_bar_kpi" ON kitchen_bar_kpi;
DROP POLICY IF EXISTS "Allow authenticated users to update kitchen_bar_kpi" ON kitchen_bar_kpi;
CREATE POLICY "staff_all" ON kitchen_bar_kpi FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- kpi_settings
DROP POLICY IF EXISTS "Allow read for authenticated" ON kpi_settings;
DROP POLICY IF EXISTS "Allow update for authenticated" ON kpi_settings;
CREATE POLICY "staff_all" ON kpi_settings FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- printer_settings
DROP POLICY IF EXISTS "Allow admin insert" ON printer_settings;
DROP POLICY IF EXISTS "Allow authenticated read" ON printer_settings;
DROP POLICY IF EXISTS "Allow admin update" ON printer_settings;
CREATE POLICY "staff_all" ON printer_settings FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- production_schedule
DROP POLICY IF EXISTS "Allow authenticated users to delete production_schedule" ON production_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to insert production_schedule" ON production_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to read production_schedule" ON production_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to update production_schedule" ON production_schedule;
CREATE POLICY "staff_all" ON production_schedule FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- taxes
DROP POLICY IF EXISTS "taxes_delete_authenticated" ON taxes;
DROP POLICY IF EXISTS "taxes_insert_authenticated" ON taxes;
DROP POLICY IF EXISTS "taxes_select_authenticated" ON taxes;
DROP POLICY IF EXISTS "taxes_update_authenticated" ON taxes;
CREATE POLICY "staff_all" ON taxes FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- channel_taxes
DROP POLICY IF EXISTS "channel_taxes_delete_authenticated" ON channel_taxes;
DROP POLICY IF EXISTS "channel_taxes_insert_authenticated" ON channel_taxes;
DROP POLICY IF EXISTS "channel_taxes_select_authenticated" ON channel_taxes;
DROP POLICY IF EXISTS "channel_taxes_update_authenticated" ON channel_taxes;
CREATE POLICY "staff_all" ON channel_taxes FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());


-- ============================================================================
-- SECTION B: Public-read + staff-write tables
-- Menu/channel data readable by website visitors, writable only by staff
-- ============================================================================

-- menu_items: anon sees active only, authenticated sees all, staff writes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_items;
CREATE POLICY "anon_read_active" ON menu_items FOR SELECT TO anon
  USING (is_active = true);
CREATE POLICY "auth_read" ON menu_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON menu_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- menu_categories: anon sees active only, authenticated sees all, staff writes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_categories;
CREATE POLICY "anon_read_active" ON menu_categories FOR SELECT TO anon
  USING (is_active = true);
CREATE POLICY "auth_read" ON menu_categories FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON menu_categories FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- menu_collections: anon sees published only (status='active'), auth sees all, staff writes
DROP POLICY IF EXISTS "menu_collections_delete" ON menu_collections;
DROP POLICY IF EXISTS "menu_collections_insert" ON menu_collections;
DROP POLICY IF EXISTS "menu_collections_select" ON menu_collections;
DROP POLICY IF EXISTS "menu_collections_update" ON menu_collections;
CREATE POLICY "anon_read_active" ON menu_collections FOR SELECT TO anon
  USING (status = 'active');
CREATE POLICY "auth_read" ON menu_collections FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON menu_collections FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- menu_collection_items: anon reads all (filtered via collection join), auth reads all, staff writes
DROP POLICY IF EXISTS "menu_collection_items_delete" ON menu_collection_items;
DROP POLICY IF EXISTS "menu_collection_items_insert" ON menu_collection_items;
DROP POLICY IF EXISTS "menu_collection_items_select" ON menu_collection_items;
DROP POLICY IF EXISTS "menu_collection_items_update" ON menu_collection_items;
CREATE POLICY "anon_read" ON menu_collection_items FOR SELECT TO anon
  USING (true);
CREATE POLICY "auth_read" ON menu_collection_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON menu_collection_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- sales_channels: authenticated reads, staff writes
DROP POLICY IF EXISTS "Allow admin manage sales_channels" ON sales_channels;
DROP POLICY IF EXISTS "Allow read sales_channels" ON sales_channels;
CREATE POLICY "auth_read" ON sales_channels FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON sales_channels FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- channel_prices: authenticated reads, staff writes
DROP POLICY IF EXISTS "Allow admin manage channel_prices" ON channel_prices;
DROP POLICY IF EXISTS "Allow read channel_prices" ON channel_prices;
CREATE POLICY "auth_read" ON channel_prices FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON channel_prices FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- channel_menu_items: authenticated reads, staff writes
DROP POLICY IF EXISTS "Allow admin manage channel_menu_items" ON channel_menu_items;
DROP POLICY IF EXISTS "Allow read channel_menu_items" ON channel_menu_items;
CREATE POLICY "auth_read" ON channel_menu_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON channel_menu_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- channel_payment_methods: authenticated reads, staff writes
DROP POLICY IF EXISTS "auth_write" ON channel_payment_methods;
DROP POLICY IF EXISTS "auth_read" ON channel_payment_methods;
CREATE POLICY "auth_read" ON channel_payment_methods FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON channel_payment_methods FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- content_translations: keep existing anon read, tighten write to staff
DROP POLICY IF EXISTS "Allow authenticated full access" ON content_translations;
-- Keeping: "Allow anonymous read access" {anon} SELECT true
CREATE POLICY "auth_read" ON content_translations FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON content_translations FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- website_homepage_sections: keep anon read (is_active filter), tighten write to staff
DROP POLICY IF EXISTS "auth_all_sections" ON website_homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_delete" ON website_homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_insert" ON website_homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_select" ON website_homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_update" ON website_homepage_sections;
-- Keeping: "anon_read_sections" {anon} SELECT (is_active = true)
CREATE POLICY "auth_read" ON website_homepage_sections FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON website_homepage_sections FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- website_homepage_items: keep anon read (is_active filter), tighten write to staff
DROP POLICY IF EXISTS "auth_all_items" ON website_homepage_items;
DROP POLICY IF EXISTS "homepage_items_delete" ON website_homepage_items;
DROP POLICY IF EXISTS "homepage_items_insert" ON website_homepage_items;
DROP POLICY IF EXISTS "homepage_items_select" ON website_homepage_items;
DROP POLICY IF EXISTS "homepage_items_update" ON website_homepage_items;
-- Keeping: "anon_read_items" {anon} SELECT (is_active = true)
CREATE POLICY "auth_read" ON website_homepage_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON website_homepage_items FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());


-- ============================================================================
-- SECTION C: Customer-own-data tables
-- Staff gets full access; customers can read their own records
-- ============================================================================

-- customers: staff ALL, customer reads own (via customer_identities link)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
CREATE POLICY "staff_all" ON customers FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "customer_read_own" ON customers FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT customer_id FROM customer_identities
      WHERE auth_user_id = auth.uid()
    )
  );

-- customer_identities: staff ALL, customer reads own
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customer_identities;
CREATE POLICY "staff_all" ON customer_identities FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "customer_read_own" ON customer_identities FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- stamp_reward_redemptions: staff only (customers access via RPCs)
DROP POLICY IF EXISTS "Allow authenticated full access on stamp_reward_redemptions" ON stamp_reward_redemptions;
CREATE POLICY "staff_all" ON stamp_reward_redemptions FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());


-- ============================================================================
-- SECTION D: Enable RLS on unprotected tables + add staff policies
-- ============================================================================

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON loyalty_points FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON loyalty_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_write" ON loyalty_settings FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON loyalty_transactions FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON stamp_cards FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE stamp_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON stamp_entries FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE supplierstore_receipt_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON supplierstore_receipt_corrections FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());


-- ============================================================================
-- SECTION E: GoBiz config
-- Drop open authenticated policies, keep service_role, add staff_all
-- ============================================================================

DROP POLICY IF EXISTS "Allow manage gobiz_config" ON gobiz_config;
DROP POLICY IF EXISTS "Allow read gobiz_config" ON gobiz_config;
-- Keeping: "Allow service_role full access gobiz_config" {service_role} ALL true
CREATE POLICY "staff_all" ON gobiz_config FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());


-- ============================================================================
-- SECTION F: Validation
-- Verify no open policies remain and all tables have RLS enabled
-- ============================================================================

DO $$ BEGIN
  -- Check 1: No {public} ALL true policies (except discount_events which has role-based checks)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text = '{public}'
      AND cmd = 'ALL'
      AND qual = 'true'
      AND tablename NOT IN ('discount_events')
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Open {public} ALL true policies still exist! Run: SELECT tablename, policyname FROM pg_policies WHERE schemaname=''public'' AND roles::text=''{public}'' AND cmd=''ALL'' AND qual=''true'';';
  END IF;

  -- Check 2: All public tables have RLS enabled
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Tables without RLS exist! Run: SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=''public'' AND c.relkind=''r'' AND NOT c.relrowsecurity;';
  END IF;

  RAISE NOTICE '✅ Migration 219: RLS security overhaul complete — all validations passed';
END $$;

COMMIT;
