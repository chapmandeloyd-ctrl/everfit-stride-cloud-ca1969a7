
-- Add sync tracking columns to grocery_list_items
ALTER TABLE public.grocery_list_items
  ADD COLUMN IF NOT EXISTS used_amount text DEFAULT '0',
  ADD COLUMN IF NOT EXISTS original_amount text,
  ADD COLUMN IF NOT EXISTS is_low_stock boolean NOT NULL DEFAULT false;

-- Backfill original_amount from amount
UPDATE public.grocery_list_items SET original_amount = amount WHERE original_amount IS NULL;

-- Add weekly cycle columns to grocery_lists
ALTER TABLE public.grocery_lists
  ADD COLUMN IF NOT EXISTS week_start date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
