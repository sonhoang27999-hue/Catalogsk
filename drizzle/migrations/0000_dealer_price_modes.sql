CREATE TABLE public.dealer_price_modes (
  user_id uuid PRIMARY KEY,
  mode text NOT NULL DEFAULT 'both' CHECK (mode IN ('excl','incl','both')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealer_price_modes TO authenticated;
GRANT ALL ON public.dealer_price_modes TO service_role;
ALTER TABLE public.dealer_price_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own price mode" ON public.dealer_price_modes FOR SELECT TO authenticated USING (auth.uid() = user_id);