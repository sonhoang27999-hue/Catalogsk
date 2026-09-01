-- 1. Vai trò mới: quản trị viên (manager)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- 2. Hàm kiểm tra nhiều vai trò (so sánh dạng text để tránh lỗi enum mới trong cùng migration)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated;

-- 3. Quản trị viên được ghi nội dung catalog như admin
DROP POLICY IF EXISTS "Admins write categories" ON public.categories;
CREATE POLICY "Admins and managers write categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write series" ON public.series;
CREATE POLICY "Admins and managers write series" ON public.series
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write models" ON public.models;
CREATE POLICY "Admins and managers write models" ON public.models
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write nodes" ON public.nodes;
CREATE POLICY "Admins and managers write nodes" ON public.nodes
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write products" ON public.products;
CREATE POLICY "Admins and managers write products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write videos" ON public.videos;
CREATE POLICY "Admins and managers write videos" ON public.videos
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Admins write site settings" ON public.site_settings;
CREATE POLICY "Admins and managers write site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']));

-- 4. Quản trị viên xem được lịch sử truy cập
DROP POLICY IF EXISTS "Admins read access logs" ON public.access_logs;
CREATE POLICY "Admins and managers read access logs" ON public.access_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']));