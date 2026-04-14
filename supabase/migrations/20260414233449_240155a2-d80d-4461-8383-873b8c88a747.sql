UPDATE recipes SET carb_limit_note = 'Higher carb (65g) — strictly for TKD performance windows, not for SKD days' WHERE name = 'Apple Walnut Energy Salad with Honey';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (2g) — deep ketosis safe, no carb concerns' WHERE name = 'Bacon & Eggs Metabolic Control Plate';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (3g) — deep ketosis safe, no carb concerns' WHERE name = 'Bacon Avocado Power Omelet';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'Bacon Egg Salad Lettuce Wraps';
UPDATE recipes SET carb_limit_note = 'Very low carb (10g) — stays well within daily keto limits' WHERE name = 'Cajun Shrimp & Avocado Power Bowl with Cilantro Lime';
UPDATE recipes SET carb_limit_note = 'Low carb (12g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Chili Lime Shrimp Power Bowl with Avocado';
UPDATE recipes SET carb_limit_note = 'Low carb (15g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Citrus Herb Steak Precision Plate';
UPDATE recipes SET carb_limit_note = 'Very low carb (8g) — stays well within daily keto limits' WHERE name = 'Classic Chicken Cobb Power Bowl';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'Clean Keto Egg & Avocado Control Bowl';
UPDATE recipes SET carb_limit_note = 'Very low carb (8g) — stays well within daily keto limits' WHERE name = 'Crispy Chicken Control Bowl with Avocado & Eggs';
UPDATE recipes SET carb_limit_note = 'Very low carb (6g) — stays well within daily keto limits' WHERE name = 'Double Cheeseburger Lettuce Wrap';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (5g) — deep ketosis safe, no carb concerns' WHERE name = 'Garlic Butter Steak & Shrimp Power Plate';
UPDATE recipes SET carb_limit_note = 'Moderate carb (35g) — best suited for TKD or HPKD protocols, track daily total carefully' WHERE name = 'Greek Yogurt Berry Power Bowl';
UPDATE recipes SET carb_limit_note = 'Low carb (18g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Grilled Chicken Greek Bowl with Tzatziki';
UPDATE recipes SET carb_limit_note = 'Very low carb (8g) — stays well within daily keto limits' WHERE name = 'Halloumi Steak Breakfast Plate with Avocado';
UPDATE recipes SET carb_limit_note = 'Higher carb (72g) — strictly for TKD performance windows, not for SKD days' WHERE name = 'High-Carb Fruit Recovery Bowl';
UPDATE recipes SET carb_limit_note = 'Moderate carb (28g) — best suited for TKD or HPKD protocols, track daily total carefully' WHERE name = 'High Protein Flex Bowl with Eggs, Cottage Cheese & Berries';
UPDATE recipes SET carb_limit_note = 'Very low carb (6g) — stays well within daily keto limits' WHERE name = 'Keto Antipasto Power Bowl';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'Keto Cobb Power Bowl';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (3g) — deep ketosis safe, no carb concerns' WHERE name = 'Keto Power Patties & Eggs Plate';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'KSOM Breakfast Power Bowl with Eggs, Bacon & Avocado';
UPDATE recipes SET carb_limit_note = 'Low carb (12g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Lean Chicken Avocado Power Bowl';
UPDATE recipes SET carb_limit_note = 'Very low carb (10g) — stays well within daily keto limits' WHERE name = 'Loaded Beef Lettuce Wrap Tacos';
UPDATE recipes SET carb_limit_note = 'Very low carb (6g) — stays well within daily keto limits' WHERE name = 'Mediterranean Keto Mozzarella & Avocado Bowl';
UPDATE recipes SET carb_limit_note = 'Low carb (18g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Metabolic Flex Egg & Greens Bowl with Berries';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (5g) — deep ketosis safe, no carb concerns' WHERE name = 'Protein Fuel Bowl with Eggs, Beef & Avocado';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'Protein Scramble with Sausage & Spinach';
UPDATE recipes SET carb_limit_note = 'Moderate carb (22g) — best suited for TKD or HPKD protocols, track daily total carefully' WHERE name = 'Real Life Protein Balance Plate with Eggs, Sausage & Fruit';
UPDATE recipes SET carb_limit_note = 'Low carb (20g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Scrambled Eggs, Grilled Sausage & Berry Performance Plate';
UPDATE recipes SET carb_limit_note = 'Low carb (18g) — fits standard keto if this is your primary carb source for the meal' WHERE name = 'Steak, Eggs & Pineapple Performance Board';
UPDATE recipes SET carb_limit_note = 'Ultra-low carb (4g) — deep ketosis safe, no carb concerns' WHERE name = 'Steak Scramble Plate with Avocado';
UPDATE recipes SET carb_limit_note = 'Moderate carb (32g) — best suited for TKD or HPKD protocols, track daily total carefully' WHERE name = 'TKD Chicken Power Bowl with Corn & Avocado';
UPDATE recipes SET carb_limit_note = 'Moderate carb (35g) — best suited for TKD or HPKD protocols, track daily total carefully' WHERE name = 'TKD Salmon Performance Plate with Plantains';
UPDATE recipes SET carb_limit_note = 'Very low carb (6g) — stays well within daily keto limits' WHERE name = 'Ultimate Steak & Breakfast Feast Plate';
UPDATE recipes SET 
  meal_role = 'recovery_support',
  meal_timing = 'Anytime — during fasting as electrolyte support or as a warm snack',
  why_it_works = 'Bone broth provides collagen, electrolytes, and amino acids that support gut health and hydration without breaking ketosis. At only 50 calories, it can be used strategically during fasting windows or as a warm comfort option.',
  keto_types = ARRAY['SKD','HPKD','TKD'],
  best_for = ARRAY['Fasting support','Electrolyte replenishment','Gut health','Light snack between meals','Cold weather comfort'],
  avoid_if = ARRAY['Needing a full meal','High calorie targets'],
  carb_limit_note = 'Ultra-low carb (3g) — fasting safe, no carb concerns',
  protein_target_note = 'Light protein (10g) — supplemental only, not a primary protein source'
WHERE name = 'Bare Bones Instant Beef Bone Broth';