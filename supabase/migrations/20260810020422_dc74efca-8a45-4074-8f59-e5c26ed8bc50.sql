-- 1. New plan level
ALTER TYPE public.sub_tier ADD VALUE IF NOT EXISTS 'agency';

-- 2. Track image usage alongside video usage
ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS images_used integer NOT NULL DEFAULT 0;

-- 3. Products/campaigns know what they are
DO $$ BEGIN
  CREATE TYPE public.asset_kind AS ENUM ('ecommerce', 'mobile_app', 'saas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS asset_kind public.asset_kind NOT NULL DEFAULT 'ecommerce';

-- 4. Campaign kits
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  source_url text NOT NULL,
  asset_kind public.asset_kind NOT NULL DEFAULT 'ecommerce',
  name text NOT NULL DEFAULT 'Untitled campaign',
  status text NOT NULL DEFAULT 'pending',
  step text,
  error text,
  include_video boolean NOT NULL DEFAULT true,
  destination_url text,
  utm_source text NOT NULL DEFAULT 'influencer_echo',
  utm_medium text NOT NULL DEFAULT 'social',
  utm_campaign text,
  headline text,
  primary_text text,
  ad_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own campaigns" ON public.campaigns;
CREATE POLICY "Users manage their own campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS campaigns_user_created_idx
  ON public.campaigns (user_id, created_at DESC);

-- 5. Ad images belong to campaigns and can carry copy + mockup style
ALTER TABLE public.ad_images
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS primary_text text,
  ADD COLUMN IF NOT EXISTS mockup_style text;

CREATE INDEX IF NOT EXISTS ad_images_campaign_idx ON public.ad_images (campaign_id);

-- 6. Quota engine: separate video + image allowances per tier
CREATE OR REPLACE FUNCTION public.plan_limits(_tier public.sub_tier)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _tier::text
    WHEN 'starter' THEN jsonb_build_object('videos', 5,  'images', 30)
    WHEN 'pro'     THEN jsonb_build_object('videos', 15, 'images', 150)
    WHEN 'agency'  THEN jsonb_build_object('videos', 30, 'images', 500)
    WHEN 'test'    THEN jsonb_build_object('videos', 5,  'images', 30)
    ELSE jsonb_build_object('videos', 0, 'images', 0)
  END
$$;

CREATE OR REPLACE FUNCTION public.consume_video_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  pstart date := date_trunc('month', now())::date;
  used integer;
  cap integer;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_subscription');
  END IF;

  cap := (public.plan_limits(s.tier)->>'videos')::int;

  IF cap = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_required', 'tier', s.tier::text, 'used', 0, 'limit', 0);
  END IF;

  IF s.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_inactive', 'tier', s.tier::text, 'status', s.status::text);
  END IF;

  INSERT INTO public.usage_counters (user_id, period_start, videos_used)
    VALUES (_user_id, pstart, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT videos_used INTO used FROM public.usage_counters
    WHERE user_id = _user_id AND period_start = pstart FOR UPDATE;

  IF used >= cap THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'kind', 'video', 'tier', s.tier::text, 'used', used, 'limit', cap);
  END IF;

  UPDATE public.usage_counters SET videos_used = videos_used + 1
    WHERE user_id = _user_id AND period_start = pstart;

  RETURN jsonb_build_object('ok', true, 'kind', 'video', 'tier', s.tier::text, 'used', used + 1, 'limit', cap);
END $$;

CREATE OR REPLACE FUNCTION public.consume_image_quota(_user_id uuid, _count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  pstart date := date_trunc('month', now())::date;
  used integer;
  cap integer;
  n integer := GREATEST(COALESCE(_count, 1), 1);
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_subscription');
  END IF;

  cap := (public.plan_limits(s.tier)->>'images')::int;

  IF cap = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_required', 'tier', s.tier::text, 'used', 0, 'limit', 0);
  END IF;

  IF s.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_inactive', 'tier', s.tier::text, 'status', s.status::text);
  END IF;

  INSERT INTO public.usage_counters (user_id, period_start, videos_used, images_used)
    VALUES (_user_id, pstart, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT images_used INTO used FROM public.usage_counters
    WHERE user_id = _user_id AND period_start = pstart FOR UPDATE;

  IF used + n > cap THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'kind', 'image', 'tier', s.tier::text, 'used', used, 'limit', cap, 'requested', n);
  END IF;

  UPDATE public.usage_counters SET images_used = images_used + n
    WHERE user_id = _user_id AND period_start = pstart;

  RETURN jsonb_build_object('ok', true, 'kind', 'image', 'tier', s.tier::text, 'used', used + n, 'limit', cap);
END $$;

-- Release image quota when a render fails, so users aren't charged for nothing.
CREATE OR REPLACE FUNCTION public.release_image_quota(_user_id uuid, _count integer DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.usage_counters
     SET images_used = GREATEST(images_used - GREATEST(COALESCE(_count, 1), 1), 0)
   WHERE user_id = _user_id
     AND period_start = date_trunc('month', now())::date;
$$;