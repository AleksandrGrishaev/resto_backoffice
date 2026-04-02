-- Migration: 236_fix_add_to_order_anonymous_ownership
-- Description: Allow anonymous users to add items to their own orders
-- Date: 2026-03-20
--
-- PROBLEM: add_to_online_order checks customer_identities and returns
-- "Customer not found" for anonymous users (who have no identity after fix 235).
-- cancel_online_order and update_online_order already have created_by fallback.
--
-- FIX: Replace strict customer_id check with dual auth:
--   customer_id match OR created_by = auth.uid()

CREATE OR REPLACE FUNCTION public.add_to_online_order(p_order_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_order RECORD;
  v_channel_id UUID;
  v_item JSONB;
  v_menu_item RECORD;
  v_variant JSONB;
  v_modifier JSONB;
  v_mod_group JSONB;
  v_mod_option JSONB;
  v_unit_price NUMERIC;
  v_modifiers_total NUMERIC;
  v_item_total NUMERIC;
  v_added_subtotal NUMERIC := 0;
  v_bill_id UUID;
  v_item_id UUID;
  v_selected_modifiers JSONB;
  v_item_quantity INTEGER;
  v_single_item_total NUMERIC;
  v_q INTEGER;
  v_new_total NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Try to resolve customer (may be NULL for anonymous users)
  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci WHERE ci.auth_user_id = auth.uid() LIMIT 1;

  SELECT id, status, customer_id, created_by, channel_id, subtotal, bills INTO v_order
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;

  -- Authorization: customer_id match OR created_by match
  IF NOT (
    (v_customer_id IS NOT NULL AND v_order.customer_id = v_customer_id)
    OR v_order.created_by = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_order.status NOT IN ('waiting', 'cooking') THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot add items when order status is ' || v_order.status); END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Items list cannot be empty'); END IF;
  IF jsonb_array_length(p_items) > 50 THEN RETURN jsonb_build_object('success', false, 'error', 'Too many items (max 50)'); END IF;

  v_channel_id := v_order.channel_id;

  IF v_order.bills IS NOT NULL AND jsonb_array_length(v_order.bills) > 0 THEN
    v_bill_id := (v_order.bills->0->>'id')::uuid;
  ELSE
    v_bill_id := gen_random_uuid();
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT mi.id, mi.name, mi.price, mi.variants, mi.modifier_groups, mi.department
    INTO v_menu_item FROM menu_items mi
    WHERE mi.id = (v_item->>'menuItemId')::uuid AND (mi.is_active = true OR mi.status = 'active');

    IF v_menu_item.id IS NULL THEN RAISE EXCEPTION '%', 'Menu item not found: ' || (v_item->>'menuItemId'); END IF;

    v_unit_price := v_menu_item.price;
    v_variant := NULL;

    IF v_item->>'variantId' IS NOT NULL AND v_menu_item.variants IS NOT NULL THEN
      SELECT elem INTO v_variant FROM jsonb_array_elements(v_menu_item.variants) elem
      WHERE elem->>'id' = v_item->>'variantId' AND (elem->>'isActive')::boolean = true;
      IF v_variant IS NULL THEN RAISE EXCEPTION '%', 'Variant not found: ' || (v_item->>'variantId'); END IF;
      v_unit_price := (v_variant->>'price')::numeric;
    END IF;

    IF v_channel_id IS NOT NULL THEN
      DECLARE v_channel_price NUMERIC;
      BEGIN
        SELECT cp.price INTO v_channel_price FROM channel_prices cp
        WHERE cp.channel_id = v_channel_id AND cp.menu_item_id = v_menu_item.id
          AND (cp.variant_id = v_item->>'variantId' OR cp.variant_id IS NULL)
          AND cp.is_active = true
        ORDER BY cp.variant_id NULLS LAST LIMIT 1;
        IF v_channel_price IS NOT NULL THEN v_unit_price := v_channel_price; END IF;
      END;
    END IF;

    v_modifiers_total := 0;
    v_selected_modifiers := '[]'::jsonb;

    IF v_item->'modifiers' IS NOT NULL AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      IF v_menu_item.modifier_groups IS NULL THEN
        RAISE EXCEPTION '%', 'Menu item does not support modifiers: ' || v_menu_item.name;
      END IF;

      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT grp INTO v_mod_group FROM jsonb_array_elements(v_menu_item.modifier_groups) grp
        WHERE grp->>'id' = v_modifier->>'groupId';
        IF v_mod_group IS NULL THEN RAISE EXCEPTION '%', 'Modifier group not found: ' || (v_modifier->>'groupId'); END IF;

        SELECT opt INTO v_mod_option FROM jsonb_array_elements(v_mod_group->'options') opt
        WHERE opt->>'id' = v_modifier->>'optionId' AND (opt->>'isActive')::boolean = true;
        IF v_mod_option IS NULL THEN RAISE EXCEPTION '%', 'Modifier option not found: ' || (v_modifier->>'optionId'); END IF;

        v_modifiers_total := v_modifiers_total + COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0) * COALESCE((v_modifier->>'quantity')::integer, 1);
        v_selected_modifiers := v_selected_modifiers || jsonb_build_array(jsonb_build_object(
          'groupId', v_modifier->>'groupId', 'groupName', v_mod_group->>'name',
          'optionId', v_modifier->>'optionId', 'optionName', v_mod_option->>'name',
          'priceAdjustment', COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0),
          'quantity', COALESCE((v_modifier->>'quantity')::integer, 1)
        ));
      END LOOP;
    END IF;

    v_item_quantity := COALESCE((v_item->>'quantity')::integer, 1);
    v_single_item_total := v_unit_price + v_modifiers_total;
    v_item_total := v_single_item_total * v_item_quantity;
    v_added_subtotal := v_added_subtotal + v_item_total;

    FOR v_q IN 1..v_item_quantity LOOP
      v_item_id := gen_random_uuid();

      INSERT INTO order_items (
        id, order_id, bill_id, bill_number,
        menu_item_id, menu_item_name, variant_id, variant_name,
        quantity, unit_price, modifiers_total, total_price,
        selected_modifiers, status, department, kitchen_notes,
        draft_at, sent_to_kitchen_at, created_at, updated_at
      ) VALUES (
        v_item_id, p_order_id, v_bill_id, '1',
        v_menu_item.id, v_menu_item.name, v_item->>'variantId', COALESCE(v_variant->>'name', NULL),
        1, v_unit_price, v_modifiers_total, v_single_item_total,
        CASE WHEN jsonb_array_length(v_selected_modifiers) > 0 THEN v_selected_modifiers ELSE NULL END,
        'waiting', v_menu_item.department, v_item->>'kitchenNotes',
        now(), now(), now(), now()
      );
    END LOOP;
  END LOOP;

  v_new_total := COALESCE(v_order.subtotal, 0) + v_added_subtotal;

  UPDATE orders SET
    subtotal = v_new_total, total = v_new_total,
    total_amount = v_new_total, final_amount = v_new_total,
    bills = (
      SELECT jsonb_build_array(jsonb_build_object(
        'id', v_bill_id, 'billNumber', '1',
        'items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', oi.id, 'menuItemId', oi.menu_item_id, 'menuItemName', oi.menu_item_name,
            'variantId', oi.variant_id, 'variantName', oi.variant_name,
            'quantity', oi.quantity, 'unitPrice', oi.unit_price,
            'modifiersTotal', oi.modifiers_total, 'totalPrice', oi.total_price
          )) FROM order_items oi WHERE oi.order_id = p_order_id AND oi.status != 'cancelled'
        ), '[]'::jsonb),
        'orderId', p_order_id, 'name', 'Bill 1',
        'subtotal', v_new_total, 'discountAmount', 0, 'taxAmount', 0,
        'total', v_new_total, 'status', 'active', 'paymentStatus', 'unpaid', 'paidAmount', 0,
        'createdAt', now(), 'updatedAt', now()
      ))
    ),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'total', v_new_total, 'addedAmount', v_added_subtotal);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
