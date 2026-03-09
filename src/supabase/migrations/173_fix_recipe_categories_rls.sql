-- Migration: 173_fix_recipe_categories_rls
-- Description: Add public INSERT/UPDATE/DELETE policies for recipe_categories
-- The app uses anon key, so auth.uid()-based policies don't work
-- Date: 2026-03-09

-- Drop the broken admin-only policy
DROP POLICY IF EXISTS "Allow all for admins" ON recipe_categories;

-- Add open policies matching the pattern used across other tables
CREATE POLICY "Allow insert recipe_categories" ON recipe_categories
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update recipe_categories" ON recipe_categories
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete recipe_categories" ON recipe_categories
  FOR DELETE TO public USING (true);
