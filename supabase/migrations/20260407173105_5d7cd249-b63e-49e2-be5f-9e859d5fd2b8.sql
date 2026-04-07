ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;