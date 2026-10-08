DROP POLICY IF EXISTS "Price viewers read dealer prices" ON public.product_dealer_prices;
CREATE POLICY "Price viewers read dealer prices" ON public.product_dealer_prices FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','dealer1','price_viewer']));