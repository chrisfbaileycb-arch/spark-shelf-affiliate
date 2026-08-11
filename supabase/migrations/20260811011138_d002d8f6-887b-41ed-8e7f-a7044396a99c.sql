
-- Campaign workflow spine ---------------------------------------------------
CREATE TABLE public.campaign_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  current_step smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_workflows TO authenticated;
GRANT ALL ON public.campaign_workflows TO service_role;
ALTER TABLE public.campaign_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage workflows" ON public.campaign_workflows FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER campaign_workflows_updated_at BEFORE UPDATE ON public.campaign_workflows
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.product_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL UNIQUE REFERENCES public.campaign_workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  offer text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  proof_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints text NOT NULL DEFAULT '',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_briefs TO authenticated;
GRANT ALL ON public.product_briefs TO service_role;
ALTER TABLE public.product_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage briefs" ON public.product_briefs FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER product_briefs_updated_at BEFORE UPDATE ON public.product_briefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.gtm_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL UNIQUE REFERENCES public.campaign_workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  icp jsonb NOT NULL DEFAULT '{}'::jsonb,
  positioning text NOT NULL DEFAULT '',
  angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta text NOT NULL DEFAULT '',
  model text,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gtm_strategies TO authenticated;
GRANT ALL ON public.gtm_strategies TO service_role;
ALTER TABLE public.gtm_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage strategies" ON public.gtm_strategies FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER gtm_strategies_updated_at BEFORE UPDATE ON public.gtm_strategies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.content_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL UNIQUE REFERENCES public.campaign_workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  hooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  scripts jsonb NOT NULL DEFAULT '[]'::jsonb,
  captions jsonb NOT NULL DEFAULT '[]'::jsonb,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  email_angle text NOT NULL DEFAULT '',
  model text,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_packs TO authenticated;
GRANT ALL ON public.content_packs TO service_role;
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage content packs" ON public.content_packs FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER content_packs_updated_at BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Outbound pipeline ---------------------------------------------------------
CREATE TABLE public.outbound_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL UNIQUE REFERENCES public.campaign_workflows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'apollo',
  icp_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  qualification_threshold smallint NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'draft',
  sending_paused boolean NOT NULL DEFAULT true,
  provider_sequence_id text,
  email_account_id text,
  last_searched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_campaigns TO authenticated;
GRANT ALL ON public.outbound_campaigns TO service_role;
ALTER TABLE public.outbound_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage outbound campaigns" ON public.outbound_campaigns FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER outbound_campaigns_updated_at BEFORE UPDATE ON public.outbound_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outbound_campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'apollo',
  provider_person_id text,
  dedupe_key text NOT NULL,
  full_name text,
  title text,
  company text,
  company_domain text,
  linkedin_url text,
  location text,
  email text,
  email_status text,
  enriched_at timestamptz,
  provider_contact_id text,
  qualification_score smallint,
  qualification_reason text,
  qualification_model text,
  qualified_at timestamptz,
  status text NOT NULL DEFAULT 'sourced',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outbound_campaign_id, dedupe_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  outbound_campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'apollo',
  provider_sequence_id text,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequences TO authenticated;
GRANT ALL ON public.sequences TO service_role;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage sequences" ON public.sequences FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER sequences_updated_at BEFORE UPDATE ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_number smallint NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  delay_days smallint NOT NULL DEFAULT 0,
  provider_step_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_steps TO authenticated;
GRANT ALL ON public.sequence_steps TO service_role;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage sequence steps" ON public.sequence_steps FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER sequence_steps_updated_at BEFORE UPDATE ON public.sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  provider_enrollment_id text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'paused',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.outbound_events (
  id bigserial PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text NOT NULL DEFAULT 'app',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outbound_events TO authenticated;
GRANT ALL ON public.outbound_events TO service_role;
ALTER TABLE public.outbound_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read outbound events" ON public.outbound_events FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE TABLE public.integration_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  step text NOT NULL,
  status text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_test_runs TO authenticated;
GRANT ALL ON public.integration_test_runs TO service_role;
ALTER TABLE public.integration_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read test runs" ON public.integration_test_runs FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
CREATE INDEX integration_test_runs_org_provider_idx ON public.integration_test_runs (org_id, provider, created_at DESC);
