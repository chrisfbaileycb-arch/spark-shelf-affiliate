REVOKE ALL ON FUNCTION public.consume_video_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_image_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_image_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_video_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_image_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_image_quota(uuid, integer) TO service_role;