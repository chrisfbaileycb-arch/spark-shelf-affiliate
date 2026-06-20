
CREATE OR REPLACE FUNCTION public.tg_bump_link_clicks() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE id = NEW.affiliate_link_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_bump_link_clicks() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bump_clicks AFTER INSERT ON public.link_clicks FOR EACH ROW EXECUTE FUNCTION public.tg_bump_link_clicks();
