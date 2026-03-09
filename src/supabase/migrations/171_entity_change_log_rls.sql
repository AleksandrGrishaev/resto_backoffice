-- Migration: 171_entity_change_log_rls
-- Description: RLS policies for entity_change_log audit table
-- Date: 2026-03-08

ALTER TABLE entity_change_log ENABLE ROW LEVEL SECURITY;

-- Use 'public' role (same as other tables — app uses anon key)
CREATE POLICY "Allow read changelog" ON entity_change_log
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert changelog" ON entity_change_log
  FOR INSERT TO public WITH CHECK (true);

-- service_role bypasses RLS, so seed scripts and Edge Functions still work
