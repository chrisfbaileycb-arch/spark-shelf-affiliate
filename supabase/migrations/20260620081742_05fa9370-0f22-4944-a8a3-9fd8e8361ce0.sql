
-- Replace overly permissive insert policy with one that requires a real link
DROP POLICY IF EXISTS "anyone inserts clicks" ON public.link_clicks;
CREATE POLICY "valid click insert" ON public.link_clicks FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.affiliate_links al WHERE al.id = affiliate_link_id));

-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon;

-- Storage policies (per-user folder = auth.uid()/...)
CREATE POLICY "videos own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "videos own write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "videos own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "videos own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "assets own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "assets own write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "assets own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "assets own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);
