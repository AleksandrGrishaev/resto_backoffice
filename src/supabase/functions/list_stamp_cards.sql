-- Function: list_stamp_cards
-- Description: List all stamp cards with computed stamp counts from stamp_entries
-- Usage: SELECT * FROM list_stamp_cards();

CREATE OR REPLACE FUNCTION list_stamp_cards()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', sc.id,
    'card_number', sc.card_number,
    'status', sc.status,
    'cycle', sc.cycle,
    'customer_id', sc.customer_id,
    'customer_name', c.name,
    'created_at', sc.created_at,
    'stamps', COALESCE(
      (SELECT SUM(se.stamps) FROM stamp_entries se
       WHERE se.card_id = sc.id AND se.cycle = sc.cycle AND se.expires_at > now()),
      0
    ),
    'last_stamp_at', (SELECT MAX(se.created_at) FROM stamp_entries se WHERE se.card_id = sc.id)
  )
  FROM stamp_cards sc
  LEFT JOIN customers c ON c.id = sc.customer_id
  ORDER BY sc.card_number;
END;
$$;
