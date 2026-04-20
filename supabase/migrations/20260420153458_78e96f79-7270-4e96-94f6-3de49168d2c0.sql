
-- 1. client_feature_settings: add title + text color fields for greeting/hero/fasting/eating-window cards
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS greeting_title text,
  ADD COLUMN IF NOT EXISTS dashboard_hero_title text,
  ADD COLUMN IF NOT EXISTS dashboard_hero_text_color text,
  ADD COLUMN IF NOT EXISTS fasting_card_title text,
  ADD COLUMN IF NOT EXISTS fasting_card_text_color text,
  ADD COLUMN IF NOT EXISTS eating_window_card_title text,
  ADD COLUMN IF NOT EXISTS eating_window_card_message text,
  ADD COLUMN IF NOT EXISTS eating_window_card_text_color text;

-- 2. client_rest_day_cards: add title, text color, overlay opacity
ALTER TABLE public.client_rest_day_cards
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS overlay_opacity integer NOT NULL DEFAULT 50;

-- 3. client_sport_day_cards: add title, text color, overlay opacity
ALTER TABLE public.client_sport_day_cards
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS overlay_opacity integer NOT NULL DEFAULT 50;
