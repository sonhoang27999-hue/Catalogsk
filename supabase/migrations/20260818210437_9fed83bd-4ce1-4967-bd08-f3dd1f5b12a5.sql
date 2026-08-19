CREATE TABLE public.product_dealer_prices (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  dealer_price bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_dealer_prices TO authenticated;
GRANT ALL ON public.product_dealer_prices TO service_role;

ALTER TABLE public.product_dealer_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price viewers read dealer prices"
  ON public.product_dealer_prices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'price_viewer'::app_role));

CREATE POLICY "Admins write dealer prices"
  ON public.product_dealer_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.product_dealer_prices (product_id, dealer_price)
SELECT id, dealer_price FROM public.products WHERE dealer_price IS NOT NULL;

ALTER TABLE public.products DROP COLUMN dealer_price;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_dealer_prices_updated_at
BEFORE UPDATE ON public.product_dealer_prices
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();