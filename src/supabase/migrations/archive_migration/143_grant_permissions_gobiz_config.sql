-- Migration: 143_grant_permissions_gobiz_config
-- Description: Grant table-level permissions for gobiz_config
-- Date: 2026-02-05

GRANT SELECT, INSERT, UPDATE, DELETE ON gobiz_config TO authenticated;
GRANT SELECT ON gobiz_config TO anon;
