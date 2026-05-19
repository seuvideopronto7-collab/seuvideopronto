
ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS error_code text;

CREATE INDEX IF NOT EXISTS video_jobs_heartbeat_idx ON public.video_jobs (last_heartbeat);

CREATE OR REPLACE FUNCTION public.update_video_job_heartbeat(_job_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.video_jobs
  SET last_heartbeat = now()
  WHERE id = _job_id;
$$;

CREATE OR REPLACE FUNCTION public.video_jobs_watchdog(_stale_minutes int DEFAULT 5)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  WITH stale AS (
    UPDATE public.video_jobs
    SET
      status = 'failed',
      progress = 100,
      error = COALESCE(error, 'pipeline_timeout'),
      error_code = 'pipeline_timeout',
      video_url = NULL,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'pipeline_lock', false,
        'needs_browser_render', false,
        'timed_out_at', now()
      )
    WHERE status IN ('pending','queued','processing','rendering','uploading',
                     'generating_prompt','generating_script','script_ready',
                     'generating_audio','generating_voice','generating_images',
                     'generating_video','fallback_processing')
      AND last_heartbeat < now() - make_interval(mins => _stale_minutes)
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM stale;
  RETURN affected;
END;
$$;

-- Heal currently stuck jobs right now
SELECT public.video_jobs_watchdog(5);
