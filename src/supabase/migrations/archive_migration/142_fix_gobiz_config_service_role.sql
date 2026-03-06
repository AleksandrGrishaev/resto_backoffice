-- Migration: 142_fix_gobiz_config_service_role
-- Description: Grant service_role access to gobiz_config table
-- Date: 2026-02-05

-- The gobiz_config table was created without GRANT for service_role.
-- Edge Functions use SUPABASE_SERVICE_ROLE_KEY which maps to the service_role
-- database role. Without this grant, the gobiz-proxy Edge Function gets
-- "permission denied for table gobiz_config".

GRANT ALL ON gobiz_config TO service_role;
