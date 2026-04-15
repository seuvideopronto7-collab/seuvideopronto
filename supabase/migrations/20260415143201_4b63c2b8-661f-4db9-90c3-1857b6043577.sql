
CREATE OR REPLACE FUNCTION public.increment_videos_used(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET videos_used = videos_used + 1
  WHERE user_id = _user_id;
END;
$$;

-- Only service_role can call this function
REVOKE ALL ON FUNCTION public.increment_videos_used(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_videos_used(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.increment_videos_used(uuid) FROM anon;
