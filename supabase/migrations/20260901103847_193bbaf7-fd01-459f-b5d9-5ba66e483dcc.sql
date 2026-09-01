CREATE TABLE public.account_owners (
  user_id uuid PRIMARY KEY,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_owners_created_by ON public.account_owners (created_by);

GRANT SELECT ON public.account_owners TO authenticated;
GRANT ALL ON public.account_owners TO service_role;

ALTER TABLE public.account_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage account owners" ON public.account_owners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Dealer1 reads own created accounts" ON public.account_owners
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());