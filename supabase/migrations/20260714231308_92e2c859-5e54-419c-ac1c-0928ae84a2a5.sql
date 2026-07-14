
DO $$
DECLARE
  v_trainer_id uuid := '74d00d92-ac01-4363-a8f5-46cfdf54b7fb';
  v_strict uuid;
  v_perf uuid;
  v_flex uuid;
  v_ther uuid;
BEGIN
  -- Reactivate the trainer's existing keto types
  UPDATE public.keto_types
  SET is_active = true, updated_at = now()
  WHERE trainer_id = v_trainer_id;

  SELECT id INTO v_strict FROM public.keto_categories WHERE trainer_id=v_trainer_id AND name='Strict Keto' LIMIT 1;
  SELECT id INTO v_perf   FROM public.keto_categories WHERE trainer_id=v_trainer_id AND name='Performance Keto' LIMIT 1;
  SELECT id INTO v_flex   FROM public.keto_categories WHERE trainer_id=v_trainer_id AND name='Flexible Keto' LIMIT 1;
  SELECT id INTO v_ther   FROM public.keto_categories WHERE trainer_id=v_trainer_id AND name='Therapeutic Keto' LIMIT 1;

  -- Add missing standard keto types
  INSERT INTO public.keto_types (trainer_id, category_id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty, engine_compatibility, how_it_works, built_for, coach_notes, color, order_index, is_active, macro_mode)
  SELECT v_trainer_id, COALESCE(v_perf, v_strict), 'HPKD', 'High-Protein Ketogenic Diet',
    'Higher protein for lean mass retention and satiety.',
    'A ketogenic variant that raises protein to support muscle while keeping carbs low.',
    65, 30, 5, 25, 'intermediate', 'both',
    'Higher protein intake supports lean mass and satiety while carbs stay low enough for ketosis.',
    ARRAY['Muscle retention','Higher satiety','Active clients'],
    ARRAY['Prioritize complete protein at every meal.'],
    '#E4572E', 2, true, 'percent'
  WHERE NOT EXISTS (SELECT 1 FROM public.keto_types WHERE trainer_id=v_trainer_id AND abbreviation='HPKD');

  INSERT INTO public.keto_types (trainer_id, category_id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty, engine_compatibility, how_it_works, built_for, coach_notes, color, order_index, is_active, macro_mode)
  SELECT v_trainer_id, COALESCE(v_perf, v_strict), 'TKD', 'Targeted Ketogenic Diet',
    'Time carbs around training for performance.',
    'Add 25–50g of fast carbs around workouts while otherwise staying in ketosis.',
    65, 25, 10, 50, 'intermediate', 'both',
    'Consume targeted carbs 30 minutes pre-workout to fuel training without breaking ketosis long-term.',
    ARRAY['Strength athletes','Performance clients'],
    ARRAY['Only use carbs on training days.'],
    '#8B5CF6', 3, true, 'percent'
  WHERE NOT EXISTS (SELECT 1 FROM public.keto_types WHERE trainer_id=v_trainer_id AND abbreviation='TKD');

  INSERT INTO public.keto_types (trainer_id, category_id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty, engine_compatibility, how_it_works, built_for, coach_notes, color, order_index, is_active, macro_mode)
  SELECT v_trainer_id, COALESCE(v_perf, v_strict), 'CKD', 'Cyclical Ketogenic Diet',
    '5 low-carb days, 2 higher-carb days.',
    'Cycle between strict keto and controlled carb refeeds to support high-volume training.',
    60, 25, 15, 50, 'advanced', 'both',
    'Follow strict keto 5 days, then a controlled 1–2 day carb refeed to restore glycogen.',
    ARRAY['Advanced athletes','High-volume training'],
    ARRAY['Only for experienced fat-adapted clients.'],
    '#0EA5A4', 4, true, 'percent'
  WHERE NOT EXISTS (SELECT 1 FROM public.keto_types WHERE trainer_id=v_trainer_id AND abbreviation='CKD');

  -- Seed standard fasting protocols (idempotent by name)
  INSERT INTO public.fasting_protocols (name, category, description, duration_days, fast_target_hours, difficulty_level, engine_allowed, min_level_required, plan_type, intensity_tier, is_extended_fast, is_youth_safe)
  SELECT * FROM (VALUES
    ('16:8 Daily',        'LOSE WEIGHT', 'Daily 16-hour fast with an 8-hour eating window.',            7,  16, 'beginner',     ARRAY['metabolic','performance'], 1, 'fasting', 'low',      false, true),
    ('18:6 Daily',        'LOSE WEIGHT', 'Daily 18-hour fast with a 6-hour eating window.',             7,  18, 'intermediate', ARRAY['metabolic','performance'], 2, 'fasting', 'medium',   false, true),
    ('20:4 Warrior',      'LOSE WEIGHT', 'Daily 20-hour fast with a 4-hour eating window.',             7,  20, 'advanced',     ARRAY['metabolic','performance'], 3, 'fasting', 'high',     false, false),
    ('OMAD',              'LOSE WEIGHT', 'One meal a day — 23-hour fast, 1-hour eating window.',       7,  23, 'advanced',     ARRAY['metabolic','performance'], 3, 'fasting', 'high',     false, false),
    ('5:2',               'LOSE WEIGHT', 'Five normal eating days, two low-calorie fast days.',        7,  24, 'intermediate', ARRAY['metabolic','performance'], 2, 'fasting', 'medium',   false, true),
    ('4:3',               'LOSE WEIGHT', 'Alternating three 24-hour fast days per week.',              7,  24, 'advanced',     ARRAY['metabolic','performance'], 3, 'fasting', 'high',     false, false),
    ('Eat-Stop-Eat',      'LOSE WEIGHT', 'One or two full 24-hour fasts per week.',                    7,  24, 'intermediate', ARRAY['metabolic','performance'], 2, 'fasting', 'medium',   false, true),
    ('Weekend Warrior',   'LOSE WEIGHT', 'Two 36-hour weekend fasts, normal eating weekdays.',         7,  36, 'advanced',     ARRAY['metabolic','performance'], 3, 'fasting', 'high',     true,  false),
    ('24h Reset',         'LOSE WEIGHT', 'Single 24-hour reset fast.',                                 1,  24, 'intermediate', ARRAY['metabolic','performance'], 2, 'fasting', 'medium',   false, true),
    ('36h Extended',      'LOSE WEIGHT', 'Single 36-hour extended fast.',                              2,  36, 'advanced',     ARRAY['metabolic','performance'], 3, 'fasting', 'high',     true,  false),
    ('48h Extended',      'LOSE WEIGHT', 'Two-day extended fast for advanced fasters.',                2,  48, 'advanced',     ARRAY['metabolic','performance'], 4, 'fasting', 'high',     true,  false)
  ) AS v(name, category, description, duration_days, fast_target_hours, difficulty_level, engine_allowed, min_level_required, plan_type, intensity_tier, is_extended_fast, is_youth_safe)
  WHERE NOT EXISTS (SELECT 1 FROM public.fasting_protocols fp WHERE lower(fp.name) = lower(v.name));
END $$;
