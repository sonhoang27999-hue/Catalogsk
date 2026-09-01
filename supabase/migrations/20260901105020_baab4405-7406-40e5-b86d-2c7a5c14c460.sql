CREATE TABLE public.access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL DEFAULT '',
  event text NOT NULL DEFAULT 'view',
  path text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_created_at ON public.access_logs (created_at DESC);
CREATE INDEX idx_access_logs_user_id ON public.access_logs (user_id);

GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own access logs"
  ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read access logs"
  ON public.access_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));