-- ============================================================
-- PHASE 1: Organizations, integrations, social scaffold, jobs
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.integration_category AS ENUM ('outbound', 'social');
CREATE TYPE public.integration_state AS ENUM ('not_connected', 'staged', 'connected', 'expired', 'revoked', 'error');
CREATE TYPE public.social_platform AS ENUM ('tiktok', 'instagram', 'youtube', 'linkedin', 'x', 'facebook');
CREATE TYPE public.post_state AS ENUM ('draft', 'awaiting_approval', 'scheduled', 'publishing', 'published', 'failed', 'canceled');
CREATE TYPE public.job_state AS ENUM ('queued', 'running', 'succeeded', 'failed', 'dead');

-- ---------- ORGANIZATIONS ----------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My workspace',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_personal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Non-recursive security-definer membership helpers
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org AND m.user_id = _user)
$$;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org AND m.user_id = _user AND m.role IN ('owner','admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM anon;

CREATE POLICY "members read their organizations" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "admins update their organizations" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_admin(id, auth.uid()))
  WITH CHECK (public.is_org_admin(id, auth.uid()));

CREATE POLICY "members read org membership" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- ORG SETTINGS ----------
CREATE TABLE public.org_settings (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  active_outbound_provider text NOT NULL DEFAULT 'apollo',
  social_adapter text NOT NULL DEFAULT 'ayrshare',
  social_dry_run boolean NOT NULL DEFAULT true,
  autopublish_enabled boolean NOT NULL DEFAULT false,
  test_post_passed_at timestamptz,
  daily_post_cap integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_settings_active_outbound_provider_check
    CHECK (active_outbound_provider IN ('apollo', 'instantly'))
);
GRANT SELECT ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read org settings" ON public.org_settings
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER org_settings_updated_at BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- INTEGRATION CREDENTIALS (service role only) ----------
CREATE TABLE public.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category public.integration_category NOT NULL,
  provider text NOT NULL,
  ciphertext text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  status public.integration_state NOT NULL DEFAULT 'staged',
  masked_hint text,
  last_validated_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category, provider)
);
-- Deliberately NO grants to anon/authenticated: credentials are service-role only.
GRANT ALL ON public.integration_credentials TO service_role;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER integration_credentials_updated_at BEFORE UPDATE ON public.integration_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Safe, non-sensitive projection for org members.
CREATE VIEW public.integration_status
WITH (security_invoker = true) AS
  SELECT c.org_id, c.category, c.provider, c.status, c.masked_hint,
         c.last_validated_at, c.created_at, c.updated_at
  FROM public.integration_credentials c
  WHERE public.is_org_member(c.org_id, auth.uid());
GRANT SELECT ON public.integration_status TO authenticated;
GRANT SELECT ON public.integration_status TO service_role;

-- ---------- SOCIAL PROVIDER PROFILES (service role only) ----------
CREATE TABLE public.social_provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  adapter text NOT NULL DEFAULT 'ayrshare',
  profile_ref_ciphertext text,
  key_version integer NOT NULL DEFAULT 1,
  status public.integration_state NOT NULL DEFAULT 'not_connected',
  external_profile_title text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_provider_profiles TO service_role;
ALTER TABLE public.social_provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER social_provider_profiles_updated_at BEFORE UPDATE ON public.social_provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE VIEW public.social_profile_status
WITH (security_invoker = true) AS
  SELECT p.org_id, p.adapter, p.status, p.external_profile_title, p.updated_at,
         (p.profile_ref_ciphertext IS NOT NULL) AS has_profile
  FROM public.social_provider_profiles p
  WHERE public.is_org_member(p.org_id, auth.uid());
GRANT SELECT ON public.social_profile_status TO authenticated;
GRANT SELECT ON public.social_profile_status TO service_role;

-- ---------- SOCIAL ACCOUNTS (safe metadata) ----------
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  external_account_id text NOT NULL,
  handle text,
  display_name text,
  avatar_url text,
  status public.integration_state NOT NULL DEFAULT 'not_connected',
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, external_account_id)
);
GRANT SELECT ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read social accounts" ON public.social_accounts
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- SOCIAL POSTS ----------
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled post',
  master_caption text NOT NULL DEFAULT '',
  state public.post_state NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage social posts" ON public.social_posts
  FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.social_post_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  caption text NOT NULL DEFAULT '',
  platform_title text,
  privacy text NOT NULL DEFAULT 'public',
  thumbnail_url text,
  media_url text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  state public.post_state NOT NULL DEFAULT 'draft',
  external_post_id text,
  permalink text,
  idempotency_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform),
  UNIQUE (idempotency_key)
);
CREATE UNIQUE INDEX social_post_variants_external_uidx
  ON public.social_post_variants (platform, external_post_id)
  WHERE external_post_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_variants TO authenticated;
GRANT ALL ON public.social_post_variants TO service_role;
ALTER TABLE public.social_post_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage post variants" ON public.social_post_variants
  FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER social_post_variants_updated_at BEFORE UPDATE ON public.social_post_variants
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.social_post_events (
  id bigserial PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.social_post_variants(id) ON DELETE CASCADE,
  type text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  from_state public.post_state,
  to_state public.post_state,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_post_events TO authenticated;
GRANT ALL ON public.social_post_events TO service_role;
ALTER TABLE public.social_post_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read post events" ON public.social_post_events
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));

-- ---------- JOB QUEUE (service role only) ----------
CREATE TABLE public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engine text NOT NULL,
  kind text NOT NULL,
  run_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.job_state NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_queue TO service_role;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX job_queue_due_idx ON public.job_queue (status, next_run_at);
CREATE TRIGGER job_queue_updated_at BEFORE UPDATE ON public.job_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.job_runs (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.job_queue(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  outcome text,
  items_processed integer NOT NULL DEFAULT 0,
  error text
);
GRANT ALL ON public.job_runs TO service_role;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

-- Sanitized, member-visible job status (no payload, no error internals).
CREATE VIEW public.job_status
WITH (security_invoker = true) AS
  SELECT j.id, j.org_id, j.engine, j.kind, j.status, j.attempts, j.max_attempts,
         j.next_run_at, j.created_at, j.updated_at
  FROM public.job_queue j
  WHERE public.is_org_member(j.org_id, auth.uid());
GRANT SELECT ON public.job_status TO authenticated;
GRANT SELECT ON public.job_status TO service_role;

-- ---------- PERSONAL ORG PROVISIONING ----------
CREATE OR REPLACE FUNCTION public.provision_personal_org(_user_id uuid, _name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing uuid;
  new_org uuid;
BEGIN
  SELECT o.id INTO existing FROM public.organizations o
   WHERE o.owner_id = _user_id AND o.is_personal LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.organizations (name, owner_id, is_personal)
    VALUES (COALESCE(NULLIF(_name, ''), 'My workspace'), _user_id, true)
    RETURNING id INTO new_org;
  INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org, _user_id, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  INSERT INTO public.org_settings (org_id) VALUES (new_org)
    ON CONFLICT (org_id) DO NOTHING;
  RETURN new_org;
END $$;
REVOKE EXECUTE ON FUNCTION public.provision_personal_org(uuid, text) FROM anon, authenticated;

-- Extend signup handler with personal org provisioning (rest preserved).
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

  PERFORM public.provision_personal_org(
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)) || '''s workspace'
  );

  RETURN NEW;
END $$;

-- Backfill personal orgs for existing users.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.id, COALESCE(p.display_name, 'My') AS dn FROM public.profiles p LOOP
    PERFORM public.provision_personal_org(r.id, r.dn || '''s workspace');
  END LOOP;
END $$;