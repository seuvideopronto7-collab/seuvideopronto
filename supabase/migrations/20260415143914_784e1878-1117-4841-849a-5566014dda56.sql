-- Device sessions table for anti-account-sharing
CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_label text NOT NULL DEFAULT 'Desconhecido',
  ip_address text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_blocked boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own device sessions"
ON public.device_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can register devices"
ON public.device_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.device_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on device_sessions"
ON public.device_sessions FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX device_sessions_user_id_idx ON public.device_sessions(user_id);
CREATE INDEX device_sessions_fingerprint_idx ON public.device_sessions(user_id, device_fingerprint);

-- Function to check device limit (max 3 active devices in last 24h)
CREATE OR REPLACE FUNCTION public.check_device_limit(_user_id uuid, _fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active_count int;
  _max_devices int := 3;
  _is_known boolean;
  _is_blocked boolean;
BEGIN
  SELECT ds.is_blocked INTO _is_blocked
  FROM device_sessions ds
  WHERE ds.user_id = _user_id AND ds.device_fingerprint = _fingerprint;

  IF _is_blocked = true THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DEVICE_BLOCKED');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM device_sessions ds
    WHERE ds.user_id = _user_id AND ds.device_fingerprint = _fingerprint
  ) INTO _is_known;

  IF _is_known THEN
    UPDATE device_sessions SET last_active_at = now()
    WHERE user_id = _user_id AND device_fingerprint = _fingerprint;
    RETURN jsonb_build_object('allowed', true, 'reason', 'KNOWN_DEVICE');
  END IF;

  SELECT count(*) INTO _active_count
  FROM device_sessions ds
  WHERE ds.user_id = _user_id
    AND ds.last_active_at > now() - interval '24 hours'
    AND ds.is_blocked = false;

  IF _active_count >= _max_devices THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'MAX_DEVICES_REACHED', 'active', _active_count);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'NEW_DEVICE');
END;
$$;

REVOKE ALL ON FUNCTION public.check_device_limit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_device_limit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_device_limit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_device_limit(uuid, text) TO service_role;

-- Add watermark_text to video_jobs for tracking
ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS watermark_text text;