-- Add RLS policies for warehouses table
-- Run in Supabase SQL Editor (Production)

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view warehouses
CREATE POLICY "warehouses_view_authenticated"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and managers can manage warehouses
CREATE POLICY "warehouses_manage_admins"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (roles @> ARRAY['admin'] OR roles @> ARRAY['manager'])
    )
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'warehouses';
