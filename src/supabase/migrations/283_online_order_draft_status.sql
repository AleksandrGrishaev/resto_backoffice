-- Migration: 283_online_order_draft_status
-- Description: Online orders now arrive as 'draft' instead of 'waiting'.
--   POS must review and confirm (send to kitchen) before items appear on kitchen display.
--   Also: add_to_online_order inserts new items as 'draft', allows 'draft' order status,
--          includes DecompositionEngine fields in modifiers JSONB.
--   Also: update_online_order allows 'draft' status, reuses existing bill_id.
-- Date: 2026-04-01
-- Applied to DEV via mcp__supabase_dev__apply_migration on 2026-04-01
-- PROD: pending user confirmation

-- ============================================================
-- Source: src/supabase/functions/create_online_order.sql
-- ============================================================


-- ============================================================
-- 1. Update create_online_order RPC
--    - When pickup_time is a specific time (not 'asap'), set items to 'scheduled'
--    - Set sent_to_kitchen_at = NULL for scheduled items
--    - Set estimated_ready_time on the order
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_online_order(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_order_id UUID;
  v_order_number TEXT;
  v_counter INTEGER;
  v_type TEXT;
  v_fulfillment TEXT;
  v_channel_id UUID;
  v_channel_code TEXT;
  v_items JSONB;
  v_item JSONB;
  v_menu_item RECORD;
  v_variant JSONB;
  v_modifier JSONB;
  v_mod_group JSONB;
  v_mod_option JSONB;
  v_unit_price NUMERIC;
  v_modifiers_total NUMERIC;
  v_item_total NUMERIC;
  v_order_subtotal NUMERIC := 0;
  v_bill_id UUID;
  v_bill_items JSONB := '[]'::jsonb;
  v_result_items JSONB := '[]'::jsonb;
  v_item_id UUID;
  v_selected_modifiers JSONB;
  v_kitchen_hours JSONB;
  v_today_key TEXT;
  v_now_time TIME;
  v_open_time TIME;
  v_close_time TIME;
  -- Quantity splitting (POS expects quantity=1 per row)
  v_item_quantity INTEGER;
  v_single_item_total NUMERIC;
  v_q INTEGER;
  -- Scheduled order support
  v_pickup_time TEXT;
  v_is_scheduled BOOLEAN := false;
  v_estimated_ready TIMESTAMPTZ;
BEGIN
  -- ============================================================
  -- 1. Extract and validate input
  -- ============================================================
  v_type := p_data->>'type';
  v_fulfillment := p_data->>'fulfillmentMethod';
  v_items := p_data->'items';
  v_pickup_time := p_data->>'pickupTime';

  IF v_type IS NULL OR v_type NOT IN ('dine_in', 'takeaway') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid order type. Must be dine_in or takeaway');
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must contain at least one item');
  END IF;

  -- Input bounds validation
  IF jsonb_array_length(v_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many items (max 50)');
  END IF;

  IF length(p_data->>'customerName') > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer name too long');
  END IF;

  IF length(p_data->>'customerPhone') > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone number too long');
  END IF;

  -- Takeaway requires contact info
  IF v_type = 'takeaway' THEN
    IF (p_data->>'customerName') IS NULL OR (p_data->>'customerPhone') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Customer name and phone are required for takeaway orders');
    END IF;
  END IF;

  -- 1b. Determine if this is a scheduled order (for display only, items still start as draft)
  v_is_scheduled := (v_pickup_time IS NOT NULL AND v_pickup_time != 'asap' AND v_pickup_time ~ '^\d{1,2}:\d{2}$');

  IF v_is_scheduled THEN
    v_estimated_ready := (
      (now() AT TIME ZONE 'Asia/Jakarta')::date
      + v_pickup_time::time
    ) AT TIME ZONE 'Asia/Jakarta';
  ELSE
    v_estimated_ready := NULL;
  END IF;

  -- ============================================================
  -- 2. Authentication check
  -- ============================================================
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- ============================================================
  -- 3. Check kitchen hours
  -- ============================================================
  SELECT value INTO v_kitchen_hours
  FROM website_settings
  WHERE key = 'kitchen_hours';

  IF v_kitchen_hours IS NOT NULL AND (v_kitchen_hours->>'enabled')::boolean = true THEN
    -- Get current day key (mon, tue, wed, etc.) using locale-independent approach
    v_today_key := (ARRAY['sun','mon','tue','wed','thu','fri','sat'])[EXTRACT(DOW FROM now() AT TIME ZONE 'Asia/Jakarta')::int + 1];
    v_now_time := (now() AT TIME ZONE 'Asia/Jakarta')::time;

    IF v_kitchen_hours->'schedule'->v_today_key IS NOT NULL THEN
      v_open_time := (v_kitchen_hours->'schedule'->v_today_key->>'open')::time;
      v_close_time := (v_kitchen_hours->'schedule'->v_today_key->>'close')::time;

      IF v_now_time < v_open_time OR v_now_time > v_close_time THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Kitchen is currently closed',
          'opensAt', v_open_time::text,
          'closesAt', v_close_time::text
        );
      END IF;
    END IF;
  END IF;

  -- ============================================================
  -- 4. Resolve customer from auth
  -- ============================================================
  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  -- Extract customer name/phone from input, fallback to customers table
  v_customer_name := p_data->>'customerName';
  v_customer_phone := p_data->>'customerPhone';

  IF v_customer_id IS NOT NULL AND (v_customer_name IS NULL OR v_customer_phone IS NULL) THEN
    SELECT
      COALESCE(v_customer_name, c.name),
      COALESCE(v_customer_phone, c.phone)
    INTO v_customer_name, v_customer_phone
    FROM customers c
    WHERE c.id = v_customer_id;
  END IF;

  -- ============================================================
  -- 5. Resolve channel (takeaway channel for website orders)
  -- ============================================================
  SELECT id, code INTO v_channel_id, v_channel_code
  FROM sales_channels
  WHERE code = 'takeaway' AND is_active = true
  LIMIT 1;

  -- Fallback: use dine_in channel for dine_in orders
  IF v_type = 'dine_in' THEN
    SELECT id, code INTO v_channel_id, v_channel_code
    FROM sales_channels
    WHERE code = 'dine_in' AND is_active = true
    LIMIT 1;
  END IF;

  -- ============================================================
  -- 6. Generate sequential order number: SK-{MMDD}-{daily_counter}
  --    Date prefix prevents collisions across days since counter resets daily
  -- ============================================================
  INSERT INTO order_counters (counter_date, last_number)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (counter_date)
  DO UPDATE SET last_number = order_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO v_counter;

  v_order_number := 'SK-' || to_char(CURRENT_DATE, 'MMDD') || '-' || v_counter;

  -- ============================================================
  -- 7. Create order
  -- ============================================================
  v_order_id := gen_random_uuid();
  v_bill_id := gen_random_uuid();

  INSERT INTO orders (
    id, order_number, type, status, payment_status,
    customer_id, customer_name, customer_phone,
    table_number, pickup_time, comment,
    source, fulfillment_method,
    channel_id, channel_code,
    subtotal, discount, tax, total,
    total_amount, discount_amount, tax_amount, final_amount,
    estimated_ready_time,
    bills, created_by
  ) VALUES (
    v_order_id, v_order_number, v_type, 'draft', 'unpaid',
    v_customer_id, v_customer_name, v_customer_phone,
    p_data->>'tableNumber', v_pickup_time, p_data->>'comment',
    'website', v_fulfillment,
    v_channel_id, v_channel_code,
    0, 0, 0, 0,
    0, 0, 0, 0,
    v_estimated_ready,
    '[]'::jsonb, auth.uid()
  );

  -- ============================================================
  -- 8. Process items: validate, resolve prices, insert
  -- ============================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    -- Validate menu item exists and is active
    SELECT mi.id, mi.name, mi.price, mi.variants, mi.modifier_groups, mi.department, mi.image_url
    INTO v_menu_item
    FROM menu_items mi
    WHERE mi.id = (v_item->>'menuItemId')::uuid
      AND (mi.is_active = true OR mi.status = 'active');

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION '%', 'Menu item not found or inactive: ' || (v_item->>'menuItemId');
    END IF;

    -- Resolve variant price
    v_unit_price := v_menu_item.price;
    v_variant := NULL;

    IF v_item->>'variantId' IS NOT NULL AND v_menu_item.variants IS NOT NULL THEN
      SELECT elem INTO v_variant
      FROM jsonb_array_elements(v_menu_item.variants) elem
      WHERE elem->>'id' = v_item->>'variantId'
        AND (elem->>'isActive')::boolean = true;

      IF v_variant IS NULL THEN
        RAISE EXCEPTION '%', 'Variant not found: ' || (v_item->>'variantId');
      END IF;

      v_unit_price := (v_variant->>'price')::numeric;
    END IF;

    -- Check channel-specific price override
    IF v_channel_id IS NOT NULL THEN
      DECLARE v_channel_price NUMERIC;
      BEGIN
        SELECT cp.price INTO v_channel_price
        FROM channel_prices cp
        WHERE cp.channel_id = v_channel_id
          AND cp.menu_item_id = v_menu_item.id
          AND (cp.variant_id = v_item->>'variantId' OR cp.variant_id IS NULL)
          AND cp.is_active = true
        ORDER BY cp.variant_id NULLS LAST
        LIMIT 1;

        IF v_channel_price IS NOT NULL THEN
          v_unit_price := v_channel_price;
        END IF;
      END;
    END IF;

    -- Resolve modifier prices
    v_modifiers_total := 0;
    v_selected_modifiers := '[]'::jsonb;

    IF v_item->'modifiers' IS NOT NULL AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      -- Menu item must support modifiers if customer sent them
      IF v_menu_item.modifier_groups IS NULL THEN
        RAISE EXCEPTION '%', 'Menu item does not support modifiers: ' || v_menu_item.name;
      END IF;

      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        -- Find modifier group in menu_item's modifier_groups JSONB
        SELECT grp INTO v_mod_group
        FROM jsonb_array_elements(v_menu_item.modifier_groups) grp
        WHERE grp->>'id' = v_modifier->>'groupId';

        IF v_mod_group IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier group not found: ' || (v_modifier->>'groupId');
        END IF;

        SELECT opt INTO v_mod_option
        FROM jsonb_array_elements(v_mod_group->'options') opt
        WHERE opt->>'id' = v_modifier->>'optionId'
          AND (opt->>'isActive')::boolean = true;

        IF v_mod_option IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier option not found: ' || (v_modifier->>'optionId');
        END IF;

        v_modifiers_total := v_modifiers_total + COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0) * COALESCE((v_modifier->>'quantity')::integer, 1);

        v_selected_modifiers := v_selected_modifiers || jsonb_build_array(jsonb_build_object(
          'groupId', v_modifier->>'groupId',
          'groupName', v_mod_group->>'name',
          'optionId', v_modifier->>'optionId',
          'optionName', v_mod_option->>'name',
          'priceAdjustment', COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0),
          'quantity', COALESCE((v_modifier->>'quantity')::integer, 1),
          -- Fields required by DecompositionEngine for ingredient write-offs
          'groupType', v_mod_group->>'type',
          'isDefault', COALESCE((v_mod_option->>'isDefault')::boolean, false),
          'composition', COALESCE(v_mod_option->'composition', '[]'::jsonb),
          'targetComponents', COALESCE(v_mod_group->'targetComponents', '[]'::jsonb)
        ));
      END LOOP;
    END IF;

    -- Calculate item total (split into N rows with quantity=1 for POS)
    v_item_quantity := COALESCE((v_item->>'quantity')::integer, 1);
    v_single_item_total := v_unit_price + v_modifiers_total;
    v_item_total := v_single_item_total * v_item_quantity;
    v_order_subtotal := v_order_subtotal + v_item_total;

    -- Insert N separate order_items (POS expects quantity=1 per row for grouping)
    FOR v_q IN 1..v_item_quantity LOOP
      v_item_id := gen_random_uuid();

      INSERT INTO order_items (
        id, order_id, bill_id, bill_number,
        menu_item_id, menu_item_name,
        variant_id, variant_name,
        quantity, unit_price, modifiers_total, total_price,
        selected_modifiers,
        status, department,
        kitchen_notes,
        draft_at, sent_to_kitchen_at, created_at, updated_at
      ) VALUES (
        v_item_id, v_order_id, v_bill_id, '1',
        v_menu_item.id, v_menu_item.name,
        v_item->>'variantId', COALESCE(v_variant->>'name', NULL),
        1, v_unit_price, v_modifiers_total, v_single_item_total,
        CASE WHEN jsonb_array_length(v_selected_modifiers) > 0 THEN v_selected_modifiers ELSE NULL END,
        'draft', v_menu_item.department,
        v_item->>'kitchenNotes',
        now(), NULL, now(), now()
      );

      -- Collect for bill and result
      v_bill_items := v_bill_items || jsonb_build_array(jsonb_build_object(
        'id', v_item_id,
        'menuItemId', v_menu_item.id,
        'menuItemName', v_menu_item.name,
        'variantId', v_item->>'variantId',
        'variantName', COALESCE(v_variant->>'name', NULL),
        'quantity', 1,
        'unitPrice', v_unit_price,
        'modifiersTotal', v_modifiers_total,
        'totalPrice', v_single_item_total
      ));

      v_result_items := v_result_items || jsonb_build_array(jsonb_build_object(
        'id', v_item_id,
        'menuItemId', v_menu_item.id,
        'menuItemName', v_menu_item.name,
        'quantity', 1,
        'unitPrice', v_unit_price,
        'totalPrice', v_single_item_total,
        'imageUrl', v_menu_item.image_url
      ));
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 9. Update order totals and bills
  -- ============================================================
  UPDATE orders SET
    subtotal = v_order_subtotal,
    total = v_order_subtotal,
    total_amount = v_order_subtotal,
    final_amount = v_order_subtotal,
    bills = jsonb_build_array(jsonb_build_object(
      'id', v_bill_id,
      'billNumber', '1',
      'orderId', v_order_id,
      'name', 'Bill 1',
      'items', v_bill_items,
      'subtotal', v_order_subtotal,
      'discountAmount', 0,
      'taxAmount', 0,
      'total', v_order_subtotal,
      'status', 'active',
      'paymentStatus', 'unpaid',
      'paidAmount', 0,
      'customerId', v_customer_id,
      'customerName', v_customer_name,
      'createdAt', now(),
      'updatedAt', now()
    ))
  WHERE id = v_order_id;

  -- ============================================================
  -- 10. Return success
  -- ============================================================
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'total', v_order_subtotal,
    'scheduled', v_is_scheduled,
    'estimatedReadyTime', v_estimated_ready,
    'items', v_result_items
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_online_order(jsonb) TO authenticated;

-- ============================================================
-- Source: src/supabase/functions/add_to_online_order.sql
-- ============================================================


CREATE OR REPLACE FUNCTION public.add_to_online_order(p_order_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Auth check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Get order and verify (FOR UPDATE prevents TOCTOU race)
  SELECT id, status, customer_id, customer_name, channel_id, subtotal, bills INTO v_order
  FROM orders WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.customer_id != v_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_order.status NOT IN ('draft', 'waiting', 'cooking') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot add items when order status is ' || v_order.status);
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Items list cannot be empty');
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many items (max 50)');
  END IF;

  v_channel_id := v_order.channel_id;

  -- Get existing bill_id (first bill)
  IF v_order.bills IS NOT NULL AND jsonb_array_length(v_order.bills) > 0 THEN
    v_bill_id := (v_order.bills->0->>'id')::uuid;
  ELSE
    v_bill_id := gen_random_uuid();
  END IF;

  -- Process new items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT mi.id, mi.name, mi.price, mi.variants, mi.modifier_groups, mi.department
    INTO v_menu_item
    FROM menu_items mi
    WHERE mi.id = (v_item->>'menuItemId')::uuid
      AND (mi.is_active = true OR mi.status = 'active');

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION '%', 'Menu item not found: ' || (v_item->>'menuItemId');
    END IF;

    v_unit_price := v_menu_item.price;
    v_variant := NULL;

    IF v_item->>'variantId' IS NOT NULL AND v_menu_item.variants IS NOT NULL THEN
      SELECT elem INTO v_variant
      FROM jsonb_array_elements(v_menu_item.variants) elem
      WHERE elem->>'id' = v_item->>'variantId' AND (elem->>'isActive')::boolean = true;

      IF v_variant IS NULL THEN
        RAISE EXCEPTION '%', 'Variant not found: ' || (v_item->>'variantId');
      END IF;
      v_unit_price := (v_variant->>'price')::numeric;
    END IF;

    -- Channel price override
    IF v_channel_id IS NOT NULL THEN
      DECLARE v_channel_price NUMERIC;
      BEGIN
        SELECT cp.price INTO v_channel_price
        FROM channel_prices cp
        WHERE cp.channel_id = v_channel_id
          AND cp.menu_item_id = v_menu_item.id
          AND (cp.variant_id = v_item->>'variantId' OR cp.variant_id IS NULL)
          AND cp.is_active = true
        ORDER BY cp.variant_id NULLS LAST
        LIMIT 1;
        IF v_channel_price IS NOT NULL THEN
          v_unit_price := v_channel_price;
        END IF;
      END;
    END IF;

    -- Resolve modifiers
    v_modifiers_total := 0;
    v_selected_modifiers := '[]'::jsonb;

    IF v_item->'modifiers' IS NOT NULL AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      -- Menu item must support modifiers if customer sent them
      IF v_menu_item.modifier_groups IS NULL THEN
        RAISE EXCEPTION '%', 'Menu item does not support modifiers: ' || v_menu_item.name;
      END IF;

      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT grp INTO v_mod_group
        FROM jsonb_array_elements(v_menu_item.modifier_groups) grp
        WHERE grp->>'id' = v_modifier->>'groupId';

        IF v_mod_group IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier group not found: ' || (v_modifier->>'groupId');
        END IF;

        SELECT opt INTO v_mod_option
        FROM jsonb_array_elements(v_mod_group->'options') opt
        WHERE opt->>'id' = v_modifier->>'optionId' AND (opt->>'isActive')::boolean = true;

        IF v_mod_option IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier option not found: ' || (v_modifier->>'optionId');
        END IF;

        v_modifiers_total := v_modifiers_total + COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0) * COALESCE((v_modifier->>'quantity')::integer, 1);
        v_selected_modifiers := v_selected_modifiers || jsonb_build_array(jsonb_build_object(
          'groupId', v_modifier->>'groupId', 'groupName', v_mod_group->>'name',
          'optionId', v_modifier->>'optionId', 'optionName', v_mod_option->>'name',
          'priceAdjustment', COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0),
          'quantity', COALESCE((v_modifier->>'quantity')::integer, 1),
          -- Fields required by DecompositionEngine for ingredient write-offs
          'groupType', v_mod_group->>'type',
          'isDefault', COALESCE((v_mod_option->>'isDefault')::boolean, false),
          'composition', COALESCE(v_mod_option->'composition', '[]'::jsonb),
          'targetComponents', COALESCE(v_mod_group->'targetComponents', '[]'::jsonb)
        ));
      END LOOP;
    END IF;

    v_item_quantity := COALESCE((v_item->>'quantity')::integer, 1);
    v_single_item_total := v_unit_price + v_modifiers_total;
    v_item_total := v_single_item_total * v_item_quantity;
    v_added_subtotal := v_added_subtotal + v_item_total;

    -- Insert N separate order_items (POS expects quantity=1 per row for grouping)
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
        'draft', v_menu_item.department, v_item->>'kitchenNotes',
        now(), NULL, now(), now()
      );
    END LOOP;
  END LOOP;

  -- Update totals
  v_new_total := COALESCE(v_order.subtotal, 0) + v_added_subtotal;

  -- Rebuild bills JSONB with all items (existing + new)
  UPDATE orders SET
    subtotal = v_new_total, total = v_new_total,
    total_amount = v_new_total, final_amount = v_new_total,
    bills = (
      SELECT jsonb_build_array(jsonb_build_object(
        'id', v_bill_id,
        'billNumber', '1',
        'items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'menuItemName', oi.menu_item_name,
            'variantId', oi.variant_id,
            'variantName', oi.variant_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'modifiersTotal', oi.modifiers_total,
            'totalPrice', oi.total_price
          ))
          FROM order_items oi
          WHERE oi.order_id = p_order_id AND oi.status != 'cancelled'
        ), '[]'::jsonb),
        'orderId', p_order_id,
        'name', 'Bill 1',
        'subtotal', v_new_total,
        'discountAmount', 0,
        'taxAmount', 0,
        'total', v_new_total,
        'status', 'active',
        'paymentStatus', 'unpaid',
        'paidAmount', 0,
        'customerId', v_order.customer_id,
        'customerName', v_order.customer_name,
        'createdAt', now(),
        'updatedAt', now()
      ))
    ),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'total', v_new_total, 'addedAmount', v_added_subtotal);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_to_online_order(uuid, jsonb) TO authenticated;

-- ============================================================
-- Source: src/supabase/functions/update_online_order.sql
-- ============================================================


CREATE OR REPLACE FUNCTION public.update_online_order(p_order_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_order_subtotal NUMERIC := 0;
  v_bill_id UUID;
  v_bill_items JSONB := '[]'::jsonb;
  v_item_id UUID;
  v_selected_modifiers JSONB;
  v_item_quantity INTEGER;
  v_single_item_total NUMERIC;
  v_q INTEGER;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT ci.customer_id INTO v_customer_id
  FROM customer_identities ci
  WHERE ci.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Get order and verify (FOR UPDATE prevents TOCTOU race)
  SELECT id, status, customer_id, customer_name, channel_id, bills INTO v_order
  FROM orders WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.customer_id != v_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_order.status NOT IN ('draft', 'waiting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only update orders with status draft or waiting');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Items list cannot be empty');
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many items (max 50)');
  END IF;

  v_channel_id := v_order.channel_id;

  -- Delete existing items
  DELETE FROM order_items WHERE order_id = p_order_id;

  -- Reuse existing bill_id to preserve POS local state references
  IF v_order.bills IS NOT NULL AND jsonb_array_length(v_order.bills) > 0 THEN
    v_bill_id := (v_order.bills->0->>'id')::uuid;
  ELSE
    v_bill_id := gen_random_uuid();
  END IF;

  -- Process new items (same logic as create_online_order)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT mi.id, mi.name, mi.price, mi.variants, mi.modifier_groups, mi.department
    INTO v_menu_item
    FROM menu_items mi
    WHERE mi.id = (v_item->>'menuItemId')::uuid
      AND (mi.is_active = true OR mi.status = 'active');

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION '%', 'Menu item not found: ' || (v_item->>'menuItemId');
    END IF;

    -- Resolve variant price
    v_unit_price := v_menu_item.price;
    v_variant := NULL;

    IF v_item->>'variantId' IS NOT NULL AND v_menu_item.variants IS NOT NULL THEN
      SELECT elem INTO v_variant
      FROM jsonb_array_elements(v_menu_item.variants) elem
      WHERE elem->>'id' = v_item->>'variantId' AND (elem->>'isActive')::boolean = true;

      IF v_variant IS NULL THEN
        RAISE EXCEPTION '%', 'Variant not found: ' || (v_item->>'variantId');
      END IF;
      v_unit_price := (v_variant->>'price')::numeric;
    END IF;

    -- Channel price override
    IF v_channel_id IS NOT NULL THEN
      DECLARE v_channel_price NUMERIC;
      BEGIN
        SELECT cp.price INTO v_channel_price
        FROM channel_prices cp
        WHERE cp.channel_id = v_channel_id
          AND cp.menu_item_id = v_menu_item.id
          AND (cp.variant_id = v_item->>'variantId' OR cp.variant_id IS NULL)
          AND cp.is_active = true
        ORDER BY cp.variant_id NULLS LAST
        LIMIT 1;
        IF v_channel_price IS NOT NULL THEN
          v_unit_price := v_channel_price;
        END IF;
      END;
    END IF;

    -- Resolve modifiers
    v_modifiers_total := 0;
    v_selected_modifiers := '[]'::jsonb;

    IF v_item->'modifiers' IS NOT NULL AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      -- Menu item must support modifiers if customer sent them
      IF v_menu_item.modifier_groups IS NULL THEN
        RAISE EXCEPTION '%', 'Menu item does not support modifiers: ' || v_menu_item.name;
      END IF;

      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT grp INTO v_mod_group
        FROM jsonb_array_elements(v_menu_item.modifier_groups) grp
        WHERE grp->>'id' = v_modifier->>'groupId';

        IF v_mod_group IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier group not found: ' || (v_modifier->>'groupId');
        END IF;

        SELECT opt INTO v_mod_option
        FROM jsonb_array_elements(v_mod_group->'options') opt
        WHERE opt->>'id' = v_modifier->>'optionId' AND (opt->>'isActive')::boolean = true;

        IF v_mod_option IS NULL THEN
          RAISE EXCEPTION '%', 'Modifier option not found: ' || (v_modifier->>'optionId');
        END IF;

        v_modifiers_total := v_modifiers_total + COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0) * COALESCE((v_modifier->>'quantity')::integer, 1);
        v_selected_modifiers := v_selected_modifiers || jsonb_build_array(jsonb_build_object(
          'groupId', v_modifier->>'groupId',
          'groupName', v_mod_group->>'name',
          'optionId', v_modifier->>'optionId',
          'optionName', v_mod_option->>'name',
          'priceAdjustment', COALESCE((v_mod_option->>'priceAdjustment')::numeric, 0),
          'quantity', COALESCE((v_modifier->>'quantity')::integer, 1),
          -- Fields required by DecompositionEngine for ingredient write-offs
          'groupType', v_mod_group->>'type',
          'isDefault', COALESCE((v_mod_option->>'isDefault')::boolean, false),
          'composition', COALESCE(v_mod_option->'composition', '[]'::jsonb),
          'targetComponents', COALESCE(v_mod_group->'targetComponents', '[]'::jsonb)
        ));
      END LOOP;
    END IF;

    v_item_quantity := COALESCE((v_item->>'quantity')::integer, 1);
    v_single_item_total := v_unit_price + v_modifiers_total;
    v_item_total := v_single_item_total * v_item_quantity;
    v_order_subtotal := v_order_subtotal + v_item_total;

    -- Insert N separate order_items (POS expects quantity=1 per row for grouping)
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
        'draft', v_menu_item.department, v_item->>'kitchenNotes',
        now(), NULL, now(), now()
      );

      v_bill_items := v_bill_items || jsonb_build_array(jsonb_build_object(
        'id', v_item_id, 'menuItemId', v_menu_item.id, 'menuItemName', v_menu_item.name,
        'variantId', v_item->>'variantId', 'variantName', COALESCE(v_variant->>'name', NULL),
        'quantity', 1,
        'unitPrice', v_unit_price, 'modifiersTotal', v_modifiers_total, 'totalPrice', v_single_item_total
      ));
    END LOOP;
  END LOOP;

  -- Update order totals
  UPDATE orders SET
    subtotal = v_order_subtotal,
    total = v_order_subtotal,
    total_amount = v_order_subtotal,
    final_amount = v_order_subtotal,
    bills = jsonb_build_array(jsonb_build_object(
      'id', v_bill_id, 'billNumber', '1', 'orderId', p_order_id, 'name', 'Bill 1',
      'items', v_bill_items, 'subtotal', v_order_subtotal, 'discountAmount', 0, 'taxAmount', 0,
      'total', v_order_subtotal, 'status', 'active', 'paymentStatus', 'unpaid', 'paidAmount', 0,
      'customerId', v_order.customer_id, 'customerName', v_order.customer_name,
      'createdAt', now(), 'updatedAt', now()
    )),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'total', v_order_subtotal);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_online_order(uuid, jsonb) TO authenticated;
