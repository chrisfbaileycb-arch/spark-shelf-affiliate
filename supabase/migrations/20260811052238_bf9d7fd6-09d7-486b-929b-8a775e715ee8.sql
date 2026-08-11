ALTER TABLE public.gtm_strategies
  ADD COLUMN IF NOT EXISTS channel_plan jsonb,
  ADD COLUMN IF NOT EXISTS weekly_budget numeric,
  ADD COLUMN IF NOT EXISTS channel_plan_generated_at timestamptz;