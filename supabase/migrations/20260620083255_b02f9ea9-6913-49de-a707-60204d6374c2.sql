ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS heygen_video_id text,
  ADD COLUMN IF NOT EXISTS heygen_avatar_id text,
  ADD COLUMN IF NOT EXISTS generation_cost integer,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'heygen';