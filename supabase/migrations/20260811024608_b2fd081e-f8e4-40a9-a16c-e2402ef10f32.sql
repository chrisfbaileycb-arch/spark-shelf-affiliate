CREATE TABLE public.calendar_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  slot_time time NOT NULL DEFAULT '09:00',
  title text NOT NULL DEFAULT '',
  engine text NOT NULL DEFAULT 'avatar',
  platforms jsonb NOT NULL DEFAULT '["tiktok"]'::jsonb,
  hook text NOT NULL DEFAULT '',
  script text NOT NULL DEFAULT '',
  video_prompt text NOT NULL DEFAULT '',
  image_prompt text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  disclosure text NOT NULL DEFAULT '#ad — commissionable link',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  generated_at timestamptz,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_slots_org_date_idx ON public.calendar_slots (org_id, plan_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_slots TO authenticated;
GRANT ALL ON public.calendar_slots TO service_role;

ALTER TABLE public.calendar_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage calendar slots"
ON public.calendar_slots FOR ALL TO authenticated
USING (public.is_org_member(org_id, auth.uid()))
WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER calendar_slots_set_updated_at
BEFORE UPDATE ON public.calendar_slots
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();