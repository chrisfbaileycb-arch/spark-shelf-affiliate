ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS campaign_mode text NOT NULL DEFAULT 'affiliate';

ALTER TABLE public.products ALTER COLUMN source_url SET DEFAULT '';