REVOKE EXECUTE ON FUNCTION public.list_admins() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_price_viewers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_admin(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_price_viewer(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_price_viewers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_price_viewer(text, boolean) TO authenticated;