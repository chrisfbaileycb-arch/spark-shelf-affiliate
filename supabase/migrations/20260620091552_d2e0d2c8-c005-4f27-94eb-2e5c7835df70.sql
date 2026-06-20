
REVOKE EXECUTE ON FUNCTION public.consume_video_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_video_quota(uuid) TO service_role;
