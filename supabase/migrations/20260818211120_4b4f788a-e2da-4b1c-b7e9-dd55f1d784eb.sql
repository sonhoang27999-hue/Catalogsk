ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'classic';

CREATE TABLE public.nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nodes" ON public.nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write nodes" ON public.nodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX nodes_category_idx ON public.nodes(category_id);
CREATE INDEX nodes_parent_idx ON public.nodes(parent_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS node_id uuid REFERENCES public.nodes(id) ON DELETE CASCADE;
ALTER TABLE public.products ALTER COLUMN model_id DROP NOT NULL;
CREATE INDEX products_node_idx ON public.products(node_id);