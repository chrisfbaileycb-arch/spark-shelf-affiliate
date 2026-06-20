
-- =============== PERSONAS ===============
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT 'female',
  age_range text NOT NULL DEFAULT '25-32',
  vibe text NOT NULL DEFAULT 'energetic-genz',
  niche text NOT NULL DEFAULT 'lifestyle',
  voice_tone text NOT NULL DEFAULT 'bubbly',
  catchphrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  speech_quirks text NOT NULL DEFAULT '',
  heygen_avatar_id text NOT NULL DEFAULT 'Daisy-inskirt-20220818',
  elevenlabs_voice_id text NOT NULL DEFAULT '2d5b0e6cf36f460aa7fc47e3eee4ba54',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personas_owner_all" ON public.personas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX personas_user_idx ON public.personas(user_id);

-- =============== SUBSCRIPTIONS ===============
CREATE TYPE public.sub_tier AS ENUM ('trial', 'starter', 'pro');
CREATE TYPE public.sub_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');

CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.sub_tier NOT NULL DEFAULT 'trial',
  status public.sub_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  trial_videos_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_owner_read" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE TRIGGER subs_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== USAGE COUNTERS ===============
CREATE TABLE public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  videos_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_owner_read" ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);
CREATE TRIGGER usage_updated_at BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== VIDEOS: persona_id ===============
ALTER TABLE public.videos ADD COLUMN persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL;

-- =============== Updated signup trigger ===============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pstart date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.personas (user_id, name, bio, gender, age_range, vibe, niche, voice_tone, catchphrases, speech_quirks, heygen_avatar_id, elevenlabs_voice_id, is_default)
    VALUES (
      NEW.id,
      'Maya',
      'A bubbly 25-year-old lifestyle influencer who loves discovering new finds and sharing them with her besties. Warm, excited, and conversational.',
      'female', '25-32', 'energetic-genz', 'lifestyle', 'bubbly',
      '["literally obsessed", "ok bestie hear me out", "this is a game changer", "run dont walk"]'::jsonb,
      'Uses "like" naturally, ends sentences with rising intonation, lots of enthusiasm.',
      'Daisy-inskirt-20220818',
      '2d5b0e6cf36f460aa7fc47e3eee4ba54',
      true
    );

  INSERT INTO public.subscriptions (user_id, tier, status) VALUES (NEW.id, 'trial', 'trialing');
  INSERT INTO public.usage_counters (user_id, period_start, videos_used) VALUES (NEW.id, pstart, 0);

  RETURN NEW;
END $$;

-- =============== Quota check + increment ===============
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

  IF s.tier = 'trial' THEN
    IF s.trial_videos_used >= 3 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'trial_exhausted', 'tier', 'trial', 'used', s.trial_videos_used, 'limit', 3);
    END IF;
    UPDATE public.subscriptions SET trial_videos_used = trial_videos_used + 1 WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'tier', 'trial', 'used', s.trial_videos_used + 1, 'limit', 3);
  END IF;

  IF s.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_inactive', 'tier', s.tier::text, 'status', s.status::text);
  END IF;

  cap := CASE s.tier WHEN 'starter' THEN 15 WHEN 'pro' THEN 30 ELSE 0 END;

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
END $$;

GRANT EXECUTE ON FUNCTION public.consume_video_quota(uuid) TO authenticated, service_role;
