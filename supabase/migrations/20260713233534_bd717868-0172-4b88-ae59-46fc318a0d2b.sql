DO $$
DECLARE
  v_client_id uuid := '1eee93c2-55e6-47bd-a68a-a1ed4219911e'::uuid;
  v_trainer_id uuid;
  v_protocol_id uuid;
  v_skd_id uuid;
  v_category_id uuid;
  v_existing_assignment_id uuid;
BEGIN
  SELECT trainer_id INTO v_trainer_id
  FROM public.client_feature_settings
  WHERE client_id = v_client_id
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Client feature settings not found for %', v_client_id;
  END IF;

  SELECT id INTO v_category_id
  FROM public.keto_categories
  WHERE trainer_id = v_trainer_id
    AND name IN ('Strict Keto', 'Flexible Keto')
  ORDER BY CASE WHEN name = 'Strict Keto' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_category_id IS NULL THEN
    INSERT INTO public.keto_categories (trainer_id, name, icon_name, color, order_index)
    VALUES (v_trainer_id, 'Strict Keto', 'Zap', '#3b82f6', 0)
    RETURNING id INTO v_category_id;
  END IF;

  SELECT id INTO v_protocol_id
  FROM public.fasting_protocols
  WHERE lower(name) = lower('16:8 Weekdays')
  LIMIT 1;

  IF v_protocol_id IS NULL THEN
    INSERT INTO public.fasting_protocols (
      name, category, description, duration_days, fast_target_hours,
      difficulty_level, engine_allowed, min_level_required, plan_type,
      intensity_tier, is_extended_fast, is_youth_safe
    ) VALUES (
      '16:8 Weekdays', 'LOSE WEIGHT',
      'Weekday 16-hour fasts with an 8-hour eating window.',
      3, 16, 'intermediate', ARRAY['metabolic','performance'], 1,
      'fasting', 'medium', false, true
    )
    RETURNING id INTO v_protocol_id;
  ELSE
    UPDATE public.fasting_protocols
    SET category = 'LOSE WEIGHT',
        description = 'Weekday 16-hour fasts with an 8-hour eating window.',
        duration_days = 3,
        fast_target_hours = 16,
        difficulty_level = 'intermediate',
        engine_allowed = ARRAY['metabolic','performance'],
        min_level_required = 1,
        plan_type = 'fasting',
        intensity_tier = 'medium',
        is_extended_fast = false,
        is_youth_safe = true
    WHERE id = v_protocol_id;
  END IF;

  SELECT id INTO v_skd_id
  FROM public.keto_types
  WHERE abbreviation = 'SKD'
     OR lower(name) = lower('Standard Ketogenic Diet')
  ORDER BY CASE WHEN abbreviation = 'SKD' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_skd_id IS NULL THEN
    INSERT INTO public.keto_types (
      trainer_id, category_id, abbreviation, name, subtitle, description,
      fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty,
      engine_compatibility, how_it_works, built_for, coach_notes, color,
      order_index, is_active, macro_mode, protein_grams, fat_grams, carb_grams
    ) VALUES (
      v_trainer_id, v_category_id, 'SKD', 'Standard Ketogenic Diet',
      'Classic ketogenic macro split for consistent fat adaptation.',
      'A standard ketogenic diet using low carbs, moderate protein, and higher fat.',
      73, 22, 5, 20, 'beginner', 'both',
      'Follow standard ketogenic macros with low carbohydrates, moderate protein, and higher fat to support ketosis and steady energy.',
      ARRAY['Fat loss','Metabolic health','Daily consistency'],
      ARRAY['Keep carbs low and consistent.','Prioritize protein and whole foods.'],
      '#3B82F6', 1, true, 'percent', 110, 162, 20
    )
    RETURNING id INTO v_skd_id;
  ELSE
    UPDATE public.keto_types
    SET trainer_id = v_trainer_id,
        category_id = v_category_id,
        abbreviation = 'SKD',
        name = 'Standard Ketogenic Diet',
        subtitle = 'Classic ketogenic macro split for consistent fat adaptation.',
        description = 'A standard ketogenic diet using low carbs, moderate protein, and higher fat.',
        fat_pct = 73,
        protein_pct = 22,
        carbs_pct = 5,
        carb_limit_grams = 20,
        difficulty = 'beginner',
        engine_compatibility = 'both',
        how_it_works = 'Follow standard ketogenic macros with low carbohydrates, moderate protein, and higher fat to support ketosis and steady energy.',
        built_for = ARRAY['Fat loss','Metabolic health','Daily consistency'],
        coach_notes = ARRAY['Keep carbs low and consistent.','Prioritize protein and whole foods.'],
        color = '#3B82F6',
        order_index = 1,
        is_active = true,
        macro_mode = 'percent',
        protein_grams = 110,
        fat_grams = 162,
        carb_grams = 20,
        updated_at = now()
    WHERE id = v_skd_id;
  END IF;

  UPDATE public.client_keto_assignments
  SET is_active = false, updated_at = now()
  WHERE client_id = v_client_id;

  SELECT id INTO v_existing_assignment_id
  FROM public.client_keto_assignments
  WHERE client_id = v_client_id AND keto_type_id = v_skd_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_existing_assignment_id IS NULL THEN
    INSERT INTO public.client_keto_assignments (
      client_id, keto_type_id, assigned_by, is_active, assigned_at, updated_at
    ) VALUES (
      v_client_id, v_skd_id, v_trainer_id, true, now(), now()
    );
  ELSE
    UPDATE public.client_keto_assignments
    SET assigned_by = v_trainer_id,
        is_active = true,
        assigned_at = now(),
        updated_at = now()
    WHERE id = v_existing_assignment_id;
  END IF;

  UPDATE public.client_feature_settings
  SET selected_protocol_id = v_protocol_id,
      selected_quick_plan_id = null,
      protocol_start_date = current_date - 1,
      assigned_protocol_duration_days = 3,
      active_fast_start_at = null,
      active_fast_target_hours = null,
      eating_window_ends_at = null,
      last_fast_ended_at = null,
      last_fast_completed_at = null,
      protocol_assigned_by = v_trainer_id,
      protocol_completed = false,
      maintenance_mode = false,
      maintenance_schedule_type = null,
      fasting_enabled = true,
      eating_window_hours = 8,
      updated_at = now()
  WHERE client_id = v_client_id;

  DELETE FROM public.protocol_assignment_history
  WHERE client_id = v_client_id
    AND (
      protocol_name ILIKE '%Apex%'
      OR previous_protocol_name ILIKE '%Apex%'
      OR note ILIKE '%Apex%'
    );

  DELETE FROM public.fasting_protocols
  WHERE name ILIKE 'Apex%';

  UPDATE public.keto_types
  SET how_it_works = replace(how_it_works, 'Apex', 'ketosis'),
      description = replace(description, 'Apex', 'ketosis'),
      updated_at = now()
  WHERE how_it_works ILIKE '%Apex%'
     OR description ILIKE '%Apex%';
END $$;