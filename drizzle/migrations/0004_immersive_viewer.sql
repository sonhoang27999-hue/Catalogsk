CREATE TABLE public.immersive_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid,
  node_id uuid,
  product_id uuid,
  kind text NOT NULL CHECK (kind IN ('panorama','model','photo','video','compare')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  title text NOT NULL DEFAULT '',
  caption text,
  sort integer NOT NULL DEFAULT 0,
  draft_media jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_media jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_url text,
  hotspots jsonb NOT NULL DEFAULT '[]'::jsonb,
  led_presets jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT immersive_target CHECK (series_id IS NOT NULL OR node_id IS NOT NULL OR product_id IS NOT NULL)
);
CREATE INDEX immersive_scenes_series_idx ON public.immersive_scenes(series_id, status, sort);
CREATE INDEX immersive_scenes_node_idx ON public.immersive_scenes(node_id, status, sort);
CREATE INDEX immersive_scenes_product_idx ON public.immersive_scenes(product_id, status, sort);

GRANT SELECT ON public.immersive_scenes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immersive_scenes TO authenticated;
GRANT ALL ON public.immersive_scenes TO service_role;
ALTER TABLE public.immersive_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published immersive scenes" ON public.immersive_scenes
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Staff read all immersive scenes" ON public.immersive_scenes
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']));
CREATE POLICY "Staff write immersive scenes" ON public.immersive_scenes
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

CREATE TRIGGER trg_immersive_scenes_updated_at BEFORE UPDATE ON public.immersive_scenes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Staff manage immersive drafts" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'immersive-drafts' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (bucket_id = 'immersive-drafts' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']));
CREATE POLICY "Anyone reads published immersive media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'immersive-media');
CREATE POLICY "Staff write published immersive media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'immersive-media' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']));
CREATE POLICY "Staff update published immersive media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'immersive-media' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']));
CREATE POLICY "Staff delete published immersive media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'immersive-media' AND public.has_any_role(auth.uid(), ARRAY['admin','manager']));