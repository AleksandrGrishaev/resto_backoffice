-- Function: ai_readonly_query
-- Description: Execute read-only SQL queries for AI sherpa analytics
-- Used by: Edge Function sql-proxy
-- Date: 2026-02-25

CREATE OR REPLACE FUNCTION ai_readonly_query(sql_query text, max_rows int DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized text;
  limited_query text;
BEGIN
  -- Normalize: strip leading whitespace/newlines, lowercase
  normalized := lower(regexp_replace(trim(both from sql_query), '^\s+', '', 'g'));

  -- Only allow SELECT and WITH (CTE) statements
  IF normalized !~ '^(select|with)\s' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only SELECT queries are allowed');
  END IF;

  -- Block DML/DDL after semicolons
  IF normalized ~ ';\s*(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\s' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Multiple statements or DML/DDL operations are not allowed');
  END IF;

  -- Block multiple statements
  IF normalized ~ ';\s*\S' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Multiple statements are not allowed');
  END IF;

  -- Auto-add LIMIT if not present
  limited_query := sql_query;
  IF normalized NOT LIKE '%limit%' THEN
    limited_query := sql_query || ' LIMIT ' || max_rows;
  END IF;

  -- Execute and return as JSONB array
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || limited_query || ') t'
    INTO result;

  RETURN jsonb_build_object('success', true, 'data', result, 'rows', jsonb_array_length(result));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

-- Only service_role can call (Edge Functions use service_role)
REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM anon;
REVOKE ALL ON FUNCTION ai_readonly_query(text, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION ai_readonly_query(text, int) TO service_role;
