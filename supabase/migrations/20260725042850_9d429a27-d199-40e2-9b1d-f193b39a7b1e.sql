
-- Remove broad anon SELECT on affiliate_links
DROP POLICY IF EXISTS "public read by code" ON public.affiliate_links;
REVOKE SELECT ON public.affiliate_links FROM anon;

-- Secure resolver: returns only destination_url for a given short_code and logs click.
CREATE OR REPLACE FUNCTION public.resolve_affiliate_redirect(
  _code text,
  _referer text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_id uuid;
  dest text;
BEGIN
  SELECT id, destination_url INTO link_id, dest
  FROM public.affiliate_links
  WHERE short_code = _code
  LIMIT 1;

  IF link_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.link_clicks (affiliate_link_id, referer, user_agent)
  VALUES (link_id, _referer, _user_agent);

  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE id = link_id;

  RETURN dest;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_affiliate_redirect(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_redirect(text, text, text) TO anon, authenticated;
