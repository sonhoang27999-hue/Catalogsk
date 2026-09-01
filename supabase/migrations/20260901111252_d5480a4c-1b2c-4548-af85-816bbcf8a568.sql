REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated, service_role;