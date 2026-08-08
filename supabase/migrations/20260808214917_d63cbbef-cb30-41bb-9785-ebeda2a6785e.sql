CREATE OR REPLACE FUNCTION public.consume_video_quota(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF s.tier = 'trial' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_required', 'tier', 'trial', 'used', 0, 'limit', 0);
  END IF;

  IF s.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_inactive', 'tier', s.tier::text, 'status', s.status::text);
  END IF;

  cap := CASE s.tier WHEN 'test' THEN 3 WHEN 'starter' THEN 15 WHEN 'pro' THEN 30 ELSE 0 END;

  INSERT INTO public.usage_counters (user_id, period_start, videos_used)
    VALUES (_user_id, pstart, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT videos_used INTO used FROM public.usage_counters
    WHERE user_id = _user_id AND period_start = pstart FOR UPDATE;

  IF used >= cap THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'tier', s.tier::text, 'used', used, 'limit', cap);
  END IF;

  UPDATE public.usage_counters SET videos_used = videos_used + 1
    WHERE user_id = _user_id AND period_start = pstart;

  RETURN jsonb_build_object('ok', true, 'tier', s.tier::text, 'used', used + 1, 'limit', cap);
END $function$;