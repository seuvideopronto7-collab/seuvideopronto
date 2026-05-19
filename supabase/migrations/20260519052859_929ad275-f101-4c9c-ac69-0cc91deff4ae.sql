CREATE OR REPLACE FUNCTION public.claim_video_job(_job_id uuid, _lock_ttl_seconds integer DEFAULT 300)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_row public.video_jobs%ROWTYPE;
BEGIN
  UPDATE public.video_jobs
  SET
    status = 'processing',
    progress = 5,
    error = NULL,
    provider = COALESCE(provider, 'native'),
    render_mode = COALESCE(render_mode, 'native_pipeline'),
    metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'pipeline_lock', true,
        'pipeline_locked_at', now(),
        'current_step', 'processing'
      )
  WHERE id = _job_id
    AND status IN ('pending', 'processing')
    AND (
      COALESCE((metadata->>'pipeline_lock')::boolean, false) = false
      OR COALESCE((metadata->>'pipeline_locked_at')::timestamptz, updated_at) < now() - make_interval(secs => _lock_ttl_seconds)
    )
  RETURNING * INTO claimed_row;

  IF claimed_row.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'job', to_jsonb(claimed_row)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_video_job(uuid, integer) TO service_role;