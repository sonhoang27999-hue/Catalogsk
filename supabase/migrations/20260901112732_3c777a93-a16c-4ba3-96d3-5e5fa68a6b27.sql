DROP POLICY IF EXISTS "Admins read dealer applications" ON public.dealer_applications;
CREATE POLICY "Admins and managers read dealer applications" ON public.dealer_applications FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins update dealer applications" ON public.dealer_applications;
CREATE POLICY "Admins and managers update dealer applications" ON public.dealer_applications FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager'])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins delete dealer applications" ON public.dealer_applications;
CREATE POLICY "Admins and managers delete dealer applications" ON public.dealer_applications FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write dealer prices" ON public.product_dealer_prices;
CREATE POLICY "Admins and managers write dealer prices" ON public.product_dealer_prices FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager'])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Price viewers read dealer prices" ON public.product_dealer_prices;
CREATE POLICY "Price viewers read dealer prices" ON public.product_dealer_prices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'price_viewer'::app_role));

DROP POLICY IF EXISTS "Admins manage account owners" ON public.account_owners;
CREATE POLICY "Admins and managers manage account owners" ON public.account_owners FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager'])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));