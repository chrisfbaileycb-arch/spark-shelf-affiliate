REVOKE EXECUTE ON FUNCTION public.resolve_affiliate_redirect(text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_redirect(text, text, text) TO service_role;