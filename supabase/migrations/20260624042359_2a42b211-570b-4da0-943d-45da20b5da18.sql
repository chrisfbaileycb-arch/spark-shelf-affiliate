ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(translate(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8), 'abcdef', 'ABCDEF'));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END $$;

UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credited_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stripe_balance_txn_id text,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_user_id)
);

GRANT SELECT ON public.referral_conversions TO authenticated;
GRANT ALL ON public.referral_conversions TO service_role;

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrers can view their own conversions" ON public.referral_conversions;
CREATE POLICY "Referrers can view their own conversions"
  ON public.referral_conversions FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE INDEX IF NOT EXISTS referral_conversions_referrer_idx ON public.referral_conversions(referrer_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pstart date := date_trunc('month', now())::date;
  ref_code text;
  referrer uuid;
BEGIN
  ref_code := NULLIF(upper(NEW.raw_user_meta_data->>'referred_by_code'), '');
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles WHERE referral_code = ref_code;
    IF referrer = NEW.id THEN referrer := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (id, display_name, referral_code, referred_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
      public.gen_referral_code(),
      referrer
    );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.personas (user_id, name, bio, gender, age_range, vibe, niche, voice_tone, catchphrases, speech_quirks, heygen_avatar_id, elevenlabs_voice_id, is_default)
    VALUES (
      NEW.id, 'Maya',
      'A bubbly 25-year-old lifestyle influencer who loves discovering new finds and sharing them with her besties. Warm, excited, and conversational.',
      'female', '25-32', 'energetic-genz', 'lifestyle', 'bubbly',
      '["literally obsessed", "ok bestie hear me out", "this is a game changer", "run dont walk"]'::jsonb,
      'Uses "like" naturally, ends sentences with rising intonation, lots of enthusiasm.',
      'Daisy-inskirt-20220818', '2d5b0e6cf36f460aa7fc47e3eee4ba54', true
    );

  INSERT INTO public.subscriptions (user_id, tier, status) VALUES (NEW.id, 'trial', 'trialing');
  INSERT INTO public.usage_counters (user_id, period_start, videos_used) VALUES (NEW.id, pstart, 0);

  RETURN NEW;
END $$;