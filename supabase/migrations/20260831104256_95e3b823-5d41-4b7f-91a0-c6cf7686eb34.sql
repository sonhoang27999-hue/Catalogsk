DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','series','models','nodes','products','videos','product_dealer_prices','site_settings']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;