-- Migration: 267_grant_dashboard_views
-- Description: Grant SELECT on analytics views to authenticated/anon roles for PostgREST access
-- Date: 2026-03-29
-- Context: Admin Dashboard uses v_daily_sales and v_food_cost_report via Supabase client (PostgREST).
--          These views only had grants for ai_readonly and postgres, causing 403 Forbidden.

GRANT SELECT ON v_daily_sales TO authenticated;
GRANT SELECT ON v_food_cost_report TO authenticated;
GRANT SELECT ON v_daily_sales TO anon;
GRANT SELECT ON v_food_cost_report TO anon;
