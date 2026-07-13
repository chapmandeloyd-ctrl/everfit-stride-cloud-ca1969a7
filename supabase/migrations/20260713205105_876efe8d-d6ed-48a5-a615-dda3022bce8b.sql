
UPDATE public.keto_types SET
  subtitle = 'Foundational daily fuel',
  description = 'The Apex baseline — protein-forward, moderate carbs, and steady fats to build a consistent daily eating rhythm.'
WHERE abbreviation = 'APEX-B';

UPDATE public.keto_types SET
  subtitle = 'High protein for muscle retention',
  description = 'Elevated protein intake to support muscle preservation, strength, and athletic recovery inside your eating window.'
WHERE abbreviation = 'APEX-P';

UPDATE public.keto_types SET
  subtitle = 'Strategic carb cycling for active lifestyles',
  description = 'Alternates lower-carb days with higher-carb refeeds to replenish glycogen around your most demanding training.'
WHERE abbreviation = 'APEX-L';

UPDATE public.keto_types SET
  subtitle = 'Fuel workouts on training days',
  description = 'Places fast-digesting carbs around your workouts to power performance, while staying lean the rest of the day.'
WHERE abbreviation = 'APEX-R';

UPDATE public.keto_types SET
  subtitle = 'Deep low-carb reset',
  description = 'A fat-forward, very low-carb reset for advanced clients focused on fat adaptation and appetite control.'
WHERE abbreviation = 'APEX-X';

UPDATE public.keto_types
SET how_it_works = regexp_replace(how_it_works, '\m(keto|ketogenic|ketosis)\M', 'Apex', 'gi')
WHERE how_it_works ~* '\m(keto|ketogenic|ketosis)\M';
