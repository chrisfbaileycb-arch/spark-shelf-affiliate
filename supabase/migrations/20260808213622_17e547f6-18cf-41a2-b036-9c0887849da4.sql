CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  generation_enabled boolean NOT NULL DEFAULT true,
  daily_global_video_cap integer NOT NULL DEFAULT 250,
  per_user_daily_video_cap integer NOT NULL DEFAULT 10,
  pause_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;