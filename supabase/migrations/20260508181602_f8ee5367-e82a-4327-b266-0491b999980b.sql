INSERT INTO public.quick_fasting_plans (name, fast_hours, eat_hours, intensity_tier, description, order_index)
VALUES
  ('Gentle 12', 12, 12, 'low', jsonb_build_object('subtitle','A clean overnight fast — finish dinner, skip late snacks, break at breakfast.'), 2),
  ('Lean 14', 14, 10, 'low', jsonb_build_object('subtitle','Push breakfast slightly later. A balanced rhythm for new fasters.'), 3),
  ('Classic 16:8', 16, 8, 'medium', jsonb_build_object('subtitle','The most-studied window. Supports fat adaptation, focus, and steady energy.'), 4),
  ('Focused 18:6', 18, 6, 'medium', jsonb_build_object('subtitle','A tighter eating window for accelerated fat use and metabolic clarity.'), 5),
  ('Warrior 20:4', 20, 4, 'high', jsonb_build_object('subtitle','One large meal plus a small snack. Strong adaptation and appetite control.'), 6),
  ('OMAD 23:1', 23, 1, 'high', jsonb_build_object('subtitle','One Meal A Day. Maximum simplicity — only when fully fat-adapted.'), 7),
  ('Extended 36', 36, 12, 'extreme', jsonb_build_object('subtitle','A full-day fast for deep autophagy and metabolic reset. Break gently.'), 8),
  ('Extended 48', 48, 12, 'extreme', jsonb_build_object('subtitle','Two-day protocol for advanced practitioners. Coach approval required.'), 9)
ON CONFLICT DO NOTHING;