-- RPC: get_my_orders (v2)
-- Returns customer's orders with online ordering fields
-- Auth: Required (uses auth.uid() to resolve customer)
-- Returns: JSON array of orders with items

CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_result JSON;
BEGIN
  SELECT ci.customer_id INTO v_customer_id
  FROM public.customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      o.id,
      o.order_number,
      o.status,
      o.type,
      o.source,
      o.fulfillment_method,
      o.final_amount,
      o.payment_status,
      o.customer_name,
      o.customer_phone,
      o.table_number,
      o.pickup_time,
      o.comment,
      o.estimated_ready_time,
      o.cancellation_requested_at,
      o.cancellation_reason,
      o.cancellation_resolved_at,
      o.created_at,
      o.updated_at,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'menu_item_name', oi.menu_item_name,
          'variant_id', oi.variant_id,
          'variant_name', oi.variant_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'modifiers_total', oi.modifiers_total,
          'total_price', oi.total_price,
          'selected_modifiers', oi.selected_modifiers,
          'kitchen_notes', oi.kitchen_notes,
          'status', oi.status,
          'image_url', mi.image_url
        )), '[]'::json)
        FROM public.order_items oi
        LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = o.id
          AND oi.status != 'cancelled'
      ) AS items
    FROM public.orders o
    WHERE o.customer_id = v_customer_id
      AND o.status != 'draft'
    ORDER BY o.created_at DESC
    LIMIT 50
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
