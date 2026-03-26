-- convert_entity_type(p_entity_id UUID, p_from_type TEXT, p_to_type TEXT, p_new_fields JSONB)
-- Converts a recipe to a preparation or vice versa within a single transaction.
-- Migrates components, updates menu_items JSONB references, updates parent recipe/preparation references.
-- Archives the old entity (keeps audit trail for historical write-offs/orders).

CREATE OR REPLACE FUNCTION public.convert_entity_type(
  p_entity_id UUID,
  p_from_type TEXT,   -- 'recipe' or 'preparation'
  p_to_type TEXT,     -- 'preparation' or 'recipe'
  p_new_fields JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
  v_entity_name TEXT;
  v_entity_department TEXT;
  v_entity_description TEXT;
  v_updated_menu_items INT := 0;
  v_updated_parent_recipes INT := 0;
  v_archived_batches INT := 0;
  v_blocker TEXT;
  -- recipe fields
  v_recipe RECORD;
  -- preparation fields
  v_prep RECORD;
  -- component migration
  v_comp RECORD;
  v_new_sort INT := 0;
  -- menu item update
  v_mi RECORD;
  v_variants JSONB;
  v_modifier_groups JSONB;
  v_changed BOOLEAN;
BEGIN
  -- ============================================
  -- VALIDATE INPUTS
  -- ============================================
  IF p_from_type NOT IN ('recipe', 'preparation') OR p_to_type NOT IN ('recipe', 'preparation') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid type. Must be recipe or preparation.');
  END IF;

  IF p_from_type = p_to_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source and target types are the same.');
  END IF;

  -- ============================================
  -- RECIPE → PREPARATION
  -- ============================================
  IF p_from_type = 'recipe' AND p_to_type = 'preparation' THEN

    -- 1. Fetch recipe
    SELECT * INTO v_recipe FROM recipes WHERE id = p_entity_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Recipe not found.');
    END IF;

    -- 2. Check blocker: recipe has sub-recipe components (preparations can't contain recipes)
    SELECT string_agg(rc.component_id::text, ', ')
    INTO v_blocker
    FROM recipe_components rc
    WHERE rc.recipe_id = p_entity_id AND rc.component_type = 'recipe';

    IF v_blocker IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Recipe contains sub-recipe components. Replace them with preparations or products first.',
        'blocker', 'has_sub_recipes',
        'blocking_ids', v_blocker
      );
    END IF;

    v_entity_name := v_recipe.name;
    v_entity_department := COALESCE(v_recipe.department, 'kitchen');
    v_entity_description := v_recipe.description;

    -- 3. Create new preparation
    INSERT INTO preparations (
      id, name, code, description, type, department,
      output_quantity, output_unit, preparation_time, instructions,
      is_active, shelf_life, portion_type, portion_size,
      status, last_edited_at, created_at, updated_at
    ) VALUES (
      v_new_id,
      v_entity_name,
      COALESCE(p_new_fields->>'code', 'P-CNV'),
      v_entity_description,
      COALESCE(p_new_fields->>'type', ''),                       -- preparation category (user must select)
      v_entity_department,
      COALESCE(v_recipe.portion_size, 1),                        -- outputQuantity = portionSize
      COALESCE(v_recipe.portion_unit, 'portion'),                -- outputUnit = portionUnit
      COALESCE(v_recipe.prep_time, 0),                           -- preparationTime = prepTime
      COALESCE(p_new_fields->>'instructions', ''),               -- flattened instructions
      true,
      COALESCE((p_new_fields->>'shelfLife')::int, 2),            -- user fills or default
      COALESCE(p_new_fields->>'portionType', 'weight'),
      COALESCE((p_new_fields->>'portionSize')::numeric, NULL),
      'active',
      NOW(),
      NOW(),
      NOW()
    );

    -- 4. Migrate recipe_components → preparation_ingredients
    FOR v_comp IN
      SELECT * FROM recipe_components WHERE recipe_id = p_entity_id ORDER BY sort_order
    LOOP
      v_new_sort := v_new_sort + 1;
      INSERT INTO preparation_ingredients (
        id, preparation_id, ingredient_id, type, quantity, unit, notes, sort_order, use_yield_percentage
      ) VALUES (
        gen_random_uuid(),
        v_new_id,
        v_comp.component_id::uuid,   -- component_id is text, ingredient_id is uuid
        v_comp.component_type,  -- 'product' or 'preparation'
        v_comp.quantity,
        v_comp.unit,
        v_comp.notes,
        v_new_sort,
        COALESCE(v_comp.use_yield_percentage, false)
      );
    END LOOP;

    -- 5. Archive old recipe
    UPDATE recipes SET
      is_active = false,
      status = 'archived',
      updated_at = NOW()
    WHERE id = p_entity_id;

  -- ============================================
  -- PREPARATION → RECIPE
  -- ============================================
  ELSIF p_from_type = 'preparation' AND p_to_type = 'recipe' THEN

    -- 1. Fetch preparation
    SELECT * INTO v_prep FROM preparations WHERE id = p_entity_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Preparation not found.');
    END IF;

    -- 2. Check blocker: preparation is used as ingredient in OTHER preparations
    SELECT string_agg(pi.preparation_id::text, ', ')
    INTO v_blocker
    FROM preparation_ingredients pi
    WHERE pi.ingredient_id = p_entity_id AND pi.type = 'preparation';

    IF v_blocker IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Preparation is used as ingredient in other preparations. Remove those references first.',
        'blocker', 'used_in_preparations',
        'blocking_ids', v_blocker
      );
    END IF;

    v_entity_name := v_prep.name;
    v_entity_department := COALESCE(v_prep.department, 'kitchen');
    v_entity_description := v_prep.description;

    -- 3. Create new recipe
    INSERT INTO recipes (
      id, name, code, description, category, department,
      portion_size, portion_unit, prep_time, cook_time,
      difficulty, is_active, legacy_id,
      status, last_edited_at, created_at, updated_at
    ) VALUES (
      v_new_id,
      v_entity_name,
      COALESCE(p_new_fields->>'code', 'R-CNV'),
      v_entity_description,
      COALESCE((p_new_fields->>'category')::uuid, NULL),           -- recipe category UUID (user must select)
      v_entity_department,
      COALESCE(v_prep.output_quantity, 1),                       -- portionSize = outputQuantity
      COALESCE(v_prep.output_unit, 'portion'),                   -- portionUnit = outputUnit
      COALESCE(v_prep.preparation_time, 0),                      -- prepTime = preparationTime
      COALESCE((p_new_fields->>'cookTime')::int, 0),
      COALESCE(p_new_fields->>'difficulty', 'medium'),
      true,
      '',
      'active',
      NOW(),
      NOW(),
      NOW()
    );

    -- 4. Migrate preparation_ingredients → recipe_components
    FOR v_comp IN
      SELECT * FROM preparation_ingredients WHERE preparation_id = p_entity_id ORDER BY sort_order
    LOOP
      v_new_sort := v_new_sort + 1;
      INSERT INTO recipe_components (
        id, recipe_id, component_id, component_type, quantity, unit, notes, sort_order, use_yield_percentage, is_optional
      ) VALUES (
        gen_random_uuid(),
        v_new_id,
        v_comp.ingredient_id::text,   -- ingredient_id is uuid, component_id is text
        v_comp.type,  -- 'product' or 'preparation'
        v_comp.quantity,
        v_comp.unit,
        v_comp.notes,
        v_new_sort,
        COALESCE(v_comp.use_yield_percentage, false),
        false
      );
    END LOOP;

    -- 5. Archive old preparation
    UPDATE preparations SET
      is_active = false,
      status = 'archived',
      updated_at = NOW()
    WHERE id = p_entity_id;

    -- 6. Archive preparation batches
    UPDATE storage_batches SET
      is_active = false
    WHERE item_id = p_entity_id::text AND item_type = 'preparation' AND is_active = true;

    GET DIAGNOSTICS v_archived_batches = ROW_COUNT;

  END IF;

  -- ============================================
  -- UPDATE MENU ITEMS (both directions)
  -- ============================================
  -- Menu items store composition as JSONB in `variants` column.
  -- Each variant has composition[] array with {type, id, ...}
  -- Also modifier_groups[].options[].composition[] may reference entities.

  FOR v_mi IN
    SELECT id, variants, modifier_groups FROM menu_items
  LOOP
    v_changed := false;
    v_variants := v_mi.variants;
    v_modifier_groups := v_mi.modifier_groups;

    -- Update variants composition
    IF v_variants IS NOT NULL AND jsonb_array_length(v_variants) > 0 THEN
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(variant->'composition') = 'array' THEN
            variant || jsonb_build_object('composition',
              (SELECT COALESCE(jsonb_agg(
                CASE
                  WHEN comp->>'type' = p_from_type AND comp->>'id' = p_entity_id::text
                  THEN comp || jsonb_build_object('type', p_to_type, 'id', v_new_id::text)
                  ELSE comp
                END
              ), '[]'::jsonb)
              FROM jsonb_array_elements(variant->'composition') comp)
            )
          ELSE variant
        END
      )
      INTO v_variants
      FROM jsonb_array_elements(v_variants) variant;
    END IF;

    -- Update modifier_groups options composition
    IF v_modifier_groups IS NOT NULL AND jsonb_typeof(v_modifier_groups) = 'array' AND jsonb_array_length(v_modifier_groups) > 0 THEN
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(mg->'options') = 'array' THEN
            mg || jsonb_build_object('options',
              (SELECT COALESCE(jsonb_agg(
                CASE
                  WHEN jsonb_typeof(opt->'composition') = 'array' THEN
                    opt || jsonb_build_object('composition',
                      (SELECT COALESCE(jsonb_agg(
                        CASE
                          WHEN comp->>'type' = p_from_type AND comp->>'id' = p_entity_id::text
                          THEN comp || jsonb_build_object('type', p_to_type, 'id', v_new_id::text)
                          ELSE comp
                        END
                      ), '[]'::jsonb)
                      FROM jsonb_array_elements(opt->'composition') comp)
                    )
                  ELSE opt
                END
              ), '[]'::jsonb)
              FROM jsonb_array_elements(mg->'options') opt)
            )
          ELSE mg
        END
      )
      INTO v_modifier_groups
      FROM jsonb_array_elements(v_modifier_groups) mg;
    END IF;

    -- Check if anything changed
    IF v_variants::text IS DISTINCT FROM v_mi.variants::text
       OR v_modifier_groups::text IS DISTINCT FROM v_mi.modifier_groups::text THEN
      UPDATE menu_items SET
        variants = COALESCE(v_variants, variants),
        modifier_groups = COALESCE(v_modifier_groups, modifier_groups),
        updated_at = NOW()
      WHERE id = v_mi.id;
      v_updated_menu_items := v_updated_menu_items + 1;
    END IF;
  END LOOP;

  -- ============================================
  -- UPDATE PARENT RECIPE_COMPONENTS
  -- ============================================
  -- Other recipes referencing old entity → point to new entity with new type
  UPDATE recipe_components SET
    component_id = v_new_id::text,
    component_type = p_to_type
  WHERE component_id = p_entity_id::text AND component_type = p_from_type;

  GET DIAGNOSTICS v_updated_parent_recipes = ROW_COUNT;

  -- ============================================
  -- UPDATE PARENT PREPARATION_INGREDIENTS (only for recipe→preparation)
  -- For prep→recipe: blocked above if used in preparations
  -- ============================================
  IF p_from_type = 'recipe' AND p_to_type = 'preparation' THEN
    -- Recipes can be used in other recipes as components.
    -- When converting to preparation, update preparation_ingredients too (unlikely but safe).
    UPDATE preparation_ingredients SET
      ingredient_id = v_new_id,
      type = 'preparation'
    WHERE ingredient_id = p_entity_id AND type = 'recipe';
  END IF;

  -- ============================================
  -- RETURN SUCCESS
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'new_id', v_new_id::text,
    'old_id', p_entity_id::text,
    'from_type', p_from_type,
    'to_type', p_to_type,
    'entity_name', v_entity_name,
    'updated_menu_items_count', v_updated_menu_items,
    'updated_parent_recipes_count', v_updated_parent_recipes,
    'archived_batches_count', v_archived_batches
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
