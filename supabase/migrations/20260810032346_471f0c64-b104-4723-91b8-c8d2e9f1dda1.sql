ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS broll_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_kind text NOT NULL DEFAULT 'avatar';

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_video_kind_check;
ALTER TABLE public.videos
  ADD CONSTRAINT videos_video_kind_check CHECK (video_kind IN ('avatar', 'broll'));

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS per_user_daily_broll_cap integer NOT NULL DEFAULT 20;

CREATE OR REPLACE FUNCTION public.plan_limits(_tier public.sub_tier)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _tier::text
    WHEN 'starter' THEN jsonb_build_object('videos', 5,  'broll', 10,  'images', 30)
    WHEN 'pro'     THEN jsonb_build_object('videos', 15, 'broll', 30,  'images', 150)
    WHEN 'agency'  THEN jsonb_build_object('videos', 30, 'broll', 100, 'images', 500)
    WHEN 'test'    THEN jsonb_build_object('videos', 5,  'broll', 10,  'images', 30)
    ELSE jsonb_build_object('videos', 0, 'broll', 0, 'images', 0)
  END
$$;

CREATE OR REPLACE FUNCTION public.consume_broll_quota(_user_id uuid)
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

  cap := (public.plan_limits(s.tier)->>'broll')::int;

  IF cap = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_required', 'tier', s.tier::text, 'used', 0, 'limit', 0);
  END IF;

  IF s.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_inactive', 'tier', s.tier::text, 'status', s.status::text);
  END IF;

  INSERT INTO public.usage_counters (user_id, period_start, videos_used, images_used, broll_used)
    VALUES (_user_id, pstart, 0, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT broll_used INTO used FROM public.usage_counters
    WHERE user_id = _user_id AND period_start = pstart FOR UPDATE;

  IF used >= cap THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'kind', 'broll', 'tier', s.tier::text, 'used', used, 'limit', cap);
  END IF;

  UPDATE public.usage_counters SET broll_used = broll_used + 1
    WHERE user_id = _user_id AND period_start = pstart;

  RETURN jsonb_build_object('ok', true, 'kind', 'broll', 'tier', s.tier::text, 'used', used + 1, 'limit', cap);
END $$;

CREATE OR REPLACE FUNCTION public.release_broll_quota(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.usage_counters
     SET broll_used = GREATEST(broll_used - 1, 0)
   WHERE user_id = _user_id
     AND period_start = date_trunc('month', now())::date;
$$;

REVOKE ALL ON FUNCTION public.consume_broll_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_broll_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_broll_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_broll_quota(uuid) TO service_role;