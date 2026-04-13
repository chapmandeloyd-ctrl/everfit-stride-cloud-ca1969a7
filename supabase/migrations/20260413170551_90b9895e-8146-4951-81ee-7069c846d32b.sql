
-- Grocery lists table
CREATE TABLE public.grocery_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Grocery List',
  list_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grocery lists" ON public.grocery_lists FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create own grocery lists" ON public.grocery_lists FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update own grocery lists" ON public.grocery_lists FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Users can delete own grocery lists" ON public.grocery_lists FOR DELETE USING (auth.uid() = client_id);

CREATE TRIGGER update_grocery_lists_updated_at BEFORE UPDATE ON public.grocery_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grocery list items table
CREATE TABLE public.grocery_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  meal_sources TEXT[] DEFAULT '{}',
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grocery items" ON public.grocery_list_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.grocery_lists gl WHERE gl.id = list_id AND gl.client_id = auth.uid()));
CREATE POLICY "Users can create own grocery items" ON public.grocery_list_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.grocery_lists gl WHERE gl.id = list_id AND gl.client_id = auth.uid()));
CREATE POLICY "Users can update own grocery items" ON public.grocery_list_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.grocery_lists gl WHERE gl.id = list_id AND gl.client_id = auth.uid()));
CREATE POLICY "Users can delete own grocery items" ON public.grocery_list_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.grocery_lists gl WHERE gl.id = list_id AND gl.client_id = auth.uid()));
