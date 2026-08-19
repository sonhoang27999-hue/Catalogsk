CREATE OR REPLACE FUNCTION public.set_price_viewer(_email text, _enabled boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Chi quan tri vien moi duoc cap quyen';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay tai khoan voi email nay';
  END IF;

  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'price_viewer')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'price_viewer';
  END IF;

  RETURN _email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_price_viewer(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_price_viewer(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_price_viewers()
RETURNS TABLE (email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Chi quan tri vien moi duoc xem danh sach';
  END IF;
  RETURN QUERY
    SELECT u.email::text
    FROM public.user_roles r
    JOIN auth.users u ON u.id = r.user_id
    WHERE r.role = 'price_viewer'
    ORDER BY u.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_price_viewers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_price_viewers() TO authenticated;