
-- Apex360-IF rebrand: recategorize + rename old "Popular Schedules" fasting protocols
UPDATE public.fasting_protocols SET
  name = 'Apex Workday 16',
  category = 'BOOST ENERGY',
  description = 'Apex Workday 16 — a clean 16-hour daily window during the work week, flexible on weekends. Fuel focus and steady energy without cutting carbs.'
WHERE name = '16:8 Weekdays';

UPDATE public.fasting_protocols SET
  name = 'Apex Hormone Balance',
  category = 'GET HEALTHIER',
  description = 'A gentler cycling window designed for hormonal balance and sustainable rhythm. Focus on protein + smart carb timing around training.'
WHERE name = 'Crescendo Fasting';

UPDATE public.fasting_protocols SET
  name = 'Apex Progressive Ladder',
  category = 'LOSE WEIGHT',
  description = 'Gradually extends your daily fasting window over four weeks. Deficit + protein first — carbs earned around training.'
WHERE name = 'Progressive';

UPDATE public.fasting_protocols SET
  name = 'Apex Weekend Extend',
  category = 'LOSE WEIGHT',
  description = 'Extended weekend fasts paired with balanced weekday windows. Great for busy schedules that need weekday flexibility.'
WHERE name = 'Weekend Warrior';

UPDATE public.fasting_protocols SET
  name = 'Apex 5:2 Reset',
  category = 'LOSE WEIGHT',
  description = 'Two reduced-intake days paired with five normal Apex eating days. Deficit-driven fat loss with strong protein anchoring.'
WHERE name = '5:2 Diet';

UPDATE public.fasting_protocols SET
  name = 'Apex Full-Day Reset',
  category = 'LOSE WEIGHT',
  description = 'Flexible 24-hour fasts, twice per week. Powerful metabolic reset — always break gently with protein first.'
WHERE name = 'Eat-Stop-Eat';

UPDATE public.fasting_protocols SET
  name = 'Apex 4:3 Reset',
  category = 'LOSE WEIGHT',
  description = 'Fast three non-consecutive days, eat normally the other four. Aggressive deficit protocol — pair with high protein.'
WHERE name = '4:3 Diet';

UPDATE public.fasting_protocols SET
  name = 'Apex Weight Kickstart',
  description = 'A 14-day launch protocol that builds daily consistency and metabolic flexibility. Higher protein, smart carb timing, no elimination.'
WHERE name = 'Weight Kickstart';

UPDATE public.fasting_protocols SET
  name = 'Apex Health Foundations',
  description = 'Establishes a consistent daily rhythm to lower systemic inflammation and give the gut daily repair time.'
WHERE name = 'Health Foundations';

UPDATE public.fasting_protocols SET
  name = 'Apex Morning Clarity',
  description = 'Aligns your fasting window with peak morning cortisol to eliminate brain fog and sustain mental clarity.'
WHERE name = 'Morning Clarity';

UPDATE public.fasting_protocols SET
  name = 'Apex Energy Reset',
  description = 'Stabilizes blood sugar and improves daily energy with a balanced 14-hour daily window.'
WHERE name = 'Energy Reset';

UPDATE public.fasting_protocols SET
  name = 'Apex Fasting Kickstart',
  description = 'A gentle introduction to intermittent fasting with consistent daily windows. You are WHEN you eat.'
WHERE name = 'Fasting Kickstart';

UPDATE public.fasting_protocols SET
  name = 'Apex Steady Energy',
  description = 'Improves digestion, sleep, and daily energy rhythm through a consistent 16-hour window.'
WHERE name = 'Steady Energy';

UPDATE public.fasting_protocols SET
  name = 'Apex Rhythm Restore',
  description = 'Reduces evening insulin spikes and supports mitochondrial health with a strict 16-hour window.'
WHERE name = 'Rhythm Restore';

UPDATE public.fasting_protocols SET
  name = 'Apex Deep Focus',
  description = 'Optimized for the workday. Uses ketone production to fuel deep cognitive work while keeping weekends flexible.'
WHERE name = 'Deep Focus';

UPDATE public.fasting_protocols SET
  name = 'Apex Health Reset',
  description = 'A comprehensive 4-week reset to normalize insulin sensitivity and restore natural hunger cues.'
WHERE name = 'Health Reset';

UPDATE public.fasting_protocols SET
  name = 'Apex Fat Loss Ladder',
  description = 'Progressive fasting designed to transition the body toward fat use — deficit + protein first.'
WHERE name = 'Fat Loss Ladder';

UPDATE public.fasting_protocols SET
  name = 'Apex Advanced Health',
  description = 'Leverages longer 18-hour windows to trigger autophagy — your body''s cellular cleanup and renewal process.'
WHERE name = 'Advanced Health Protocol';

UPDATE public.fasting_protocols SET
  name = 'Apex Metabolic Reset',
  description = 'Structured 18-hour daily fasts to improve metabolic efficiency and fat adaptation.'
WHERE name = 'Metabolic Reset';

UPDATE public.fasting_protocols SET
  name = 'Apex Flow State',
  description = 'Trains your brain to run on ketones for sustained 4-hour blocks of high-performance focus.'
WHERE name = 'Flow State';

-- Alternate Day fallback if it exists
UPDATE public.fasting_protocols SET
  name = 'Apex Alternate Day',
  category = 'LOSE WEIGHT',
  description = 'Alternating fasting and eating days for advanced practitioners. Deficit-driven with protein anchoring.'
WHERE name ILIKE 'Alternate Day%' OR name ILIKE '%Alternate-Day%';
