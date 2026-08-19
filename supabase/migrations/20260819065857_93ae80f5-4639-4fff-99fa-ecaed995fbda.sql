CREATE TABLE public.dealer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.dealer_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.dealer_applications TO authenticated;
GRANT ALL ON public.dealer_applications TO service_role;

ALTER TABLE public.dealer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit dealer application"
  ON public.dealer_applications FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "Admins read dealer applications"
  ON public.dealer_applications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update dealer applications"
  ON public.dealer_applications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete dealer applications"
  ON public.dealer_applications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_dealer_applications_updated_at
  BEFORE UPDATE ON public.dealer_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();