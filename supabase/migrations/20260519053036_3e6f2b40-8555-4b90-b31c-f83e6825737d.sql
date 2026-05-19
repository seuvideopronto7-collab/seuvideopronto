REVOKE EXECUTE ON FUNCTION public.claim_video_job(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_video_job(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_video_job(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_video_job(uuid, integer) TO service_role;