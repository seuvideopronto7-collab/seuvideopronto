REVOKE ALL ON FUNCTION public.update_pipeline_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_lock_usuarios_planos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.check_device_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_device_limit(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.increment_videos_used(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_videos_used(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_user_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated, service_role;