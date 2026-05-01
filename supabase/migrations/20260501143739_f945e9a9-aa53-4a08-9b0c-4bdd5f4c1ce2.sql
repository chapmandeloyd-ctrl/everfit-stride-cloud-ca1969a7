-- Add flexible details JSONB to capture full Supplement Facts label
ALTER TABLE public.client_beverages
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.beverage_logs
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.client_beverages.details IS 'Flexible nutrient data: { serving, electrolytes: {sodium_mg, potassium_mg, magnesium_mg, calcium_mg}, vitamins: [{name, amount, unit, dv_pct}], aminos: [{name, amount_mg}], caffeine_mg, sugar_g, added_sugar_g, fiber_g, other: [{name, amount, unit}] }';
COMMENT ON COLUMN public.beverage_logs.details IS 'Snapshot of details JSONB from client_beverages at log time';