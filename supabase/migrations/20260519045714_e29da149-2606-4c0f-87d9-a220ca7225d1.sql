
ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS video_jobs_updated_at_status_idx
  ON public.video_jobs (updated_at)
  WHERE status NOT IN ('completed', 'done', 'failed', 'error', 'fallback_completed');
