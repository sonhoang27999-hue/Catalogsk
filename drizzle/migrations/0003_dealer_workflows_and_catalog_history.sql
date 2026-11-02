CREATE TABLE public.catalog_share_lists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 title text NOT NULL DEFAULT 'Danh sách sản phẩm SK',
 product_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.catalog_share_lists TO authenticated;
GRANT ALL ON public.catalog_share_lists TO service_role;
ALTER TABLE public.catalog_share_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read share lists" ON public.catalog_share_lists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners create share lists" ON public.catalog_share_lists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners revoke share lists" ON public.catalog_share_lists FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.catalog_preferences (
 user_id uuid PRIMARY KEY,
 favorite_ids uuid[] NOT NULL DEFAULT '{}',
 recent_vehicles jsonb NOT NULL DEFAULT '[]',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.catalog_preferences TO authenticated;
GRANT ALL ON public.catalog_preferences TO service_role;
ALTER TABLE public.catalog_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read catalog preferences" ON public.catalog_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners insert catalog preferences" ON public.catalog_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners update catalog preferences" ON public.catalog_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.read_catalog_share(_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id', s.id, 'title', s.title, 'created_at', s.created_at, 'products', COALESCE((
 SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'image_url', p.image_url, 'image_key', p.image_key, 'description', p.description, 'price', p.price, 'sale_price', p.sale_price, 'video_url', p.video_url, 'detail_url', p.detail_url) ORDER BY array_position(s.product_ids, p.id)) FROM public.products p WHERE p.id = ANY(s.product_ids)
 ), '[]'::jsonb)) FROM public.catalog_share_lists s WHERE s.id = _id;
$$;
REVOKE ALL ON FUNCTION public.read_catalog_share(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_catalog_share(uuid) TO anon, authenticated, service_role;
CREATE FUNCTION public.toggle_catalog_favorite(_id uuid) RETURNS uuid[] LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result uuid[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Vui lòng đăng nhập'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = _id) THEN RAISE EXCEPTION 'Sản phẩm không còn tồn tại'; END IF;
 INSERT INTO public.catalog_preferences(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 UPDATE public.catalog_preferences SET favorite_ids = CASE WHEN _id = ANY(favorite_ids) THEN array_remove(favorite_ids, _id) ELSE array_append(favorite_ids, _id) END, updated_at = now() WHERE user_id = auth.uid() RETURNING favorite_ids INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.toggle_catalog_favorite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_catalog_favorite(uuid) TO authenticated;
CREATE TABLE public.catalog_change_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid,
 actor_email text NOT NULL DEFAULT '',
 table_name text NOT NULL,
 entity_id uuid NOT NULL,
 operation text NOT NULL,
 before_row jsonb,
 after_row jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_change_history TO authenticated;
GRANT ALL ON public.catalog_change_history TO service_role;
ALTER TABLE public.catalog_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads catalog change history" ON public.catalog_change_history FOR SELECT TO authenticated USING(public.has_any_role(auth.uid(), ARRAY['admin','manager']));
CREATE INDEX catalog_change_history_created_idx ON public.catalog_change_history(created_at DESC);
CREATE INDEX catalog_change_history_entity_idx ON public.catalog_change_history(table_name, entity_id, created_at DESC);
CREATE FUNCTION public.capture_catalog_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_data jsonb; new_data jsonb; entity uuid;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_data := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN new_data := to_jsonb(NEW); END IF;
 IF TG_OP = 'UPDATE' AND (old_data - 'updated_at') = (new_data - 'updated_at') THEN RETURN NEW; END IF;
 entity := (COALESCE(new_data, old_data) ->> CASE WHEN TG_TABLE_NAME = 'product_dealer_prices' THEN 'product_id' ELSE 'id' END)::uuid;
 INSERT INTO public.catalog_change_history(actor_id, actor_email, table_name, entity_id, operation, before_row, after_row)
 VALUES(auth.uid(), COALESCE(auth.jwt()->>'email',''), TG_TABLE_NAME, entity, TG_OP, old_data, new_data);
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.capture_catalog_change() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['categories','series','models','nodes','products','product_dealer_prices','videos'] LOOP
 EXECUTE format('CREATE TRIGGER catalog_change_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_catalog_change()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.restore_catalog_edit(_event_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE event public.catalog_change_history; current_data jsonb; primary_column text; assignments text;
BEGIN
 IF NOT public.has_any_role(auth.uid(),ARRAY['admin','manager']) THEN RAISE EXCEPTION 'Không có quyền khôi phục'; END IF;
 SELECT * INTO event FROM public.catalog_change_history WHERE id = _event_id;
 IF NOT FOUND OR event.operation <> 'UPDATE' THEN RAISE EXCEPTION 'Chỉ khôi phục các lần chỉnh sửa'; END IF;
 IF event.table_name <> ALL(ARRAY['categories','series','models','nodes','products','product_dealer_prices','videos']) THEN RAISE EXCEPTION 'Bảng không hợp lệ'; END IF;
 primary_column := CASE WHEN event.table_name = 'product_dealer_prices' THEN 'product_id' ELSE 'id' END;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %I = $1 FOR UPDATE',event.table_name,primary_column) INTO current_data USING event.entity_id;
 IF current_data IS NULL OR (current_data - 'updated_at') IS DISTINCT FROM (event.after_row - 'updated_at') THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi sau lần sửa này. Hãy kiểm tra lần sửa mới nhất.'; END IF;
 SELECT string_agg(format('%I = r.%I', key, key), ', ') INTO assignments FROM jsonb_object_keys(event.before_row) key WHERE key NOT IN(primary_column,'created_at','updated_at');
 EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I, $1) r WHERE t.%I = $2',event.table_name,assignments,event.table_name,primary_column) USING event.before_row,event.entity_id;
END; $$;
REVOKE ALL ON FUNCTION public.restore_catalog_edit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_catalog_edit(uuid) TO authenticated;