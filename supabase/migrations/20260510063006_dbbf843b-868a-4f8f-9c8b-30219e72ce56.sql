-- =========================================================
-- LOCKDOWN TOTAL — usuarios_planos
-- =========================================================
ALTER TABLE public.usuarios_planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_planos_update" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_insert" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_delete" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_select" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_select_own" ON public.usuarios_planos;
DROP POLICY IF EXISTS "Users can view own plan" ON public.usuarios_planos;
DROP POLICY IF EXISTS "Only admins can delete plans" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_block_update" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_block_insert" ON public.usuarios_planos;
DROP POLICY IF EXISTS "usuarios_planos_block_delete" ON public.usuarios_planos;

CREATE POLICY "usuarios_planos_select_own"
ON public.usuarios_planos
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "usuarios_planos_block_update"
ON public.usuarios_planos
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "usuarios_planos_block_insert"
ON public.usuarios_planos
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "usuarios_planos_block_delete"
ON public.usuarios_planos
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

GRANT SELECT ON public.usuarios_planos TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.usuarios_planos FROM authenticated;

-- =========================================================
-- device_sessions — permitir DELETE pelo dono
-- =========================================================
DROP POLICY IF EXISTS "Users can delete own device sessions" ON public.device_sessions;
CREATE POLICY "Users can delete own device sessions"
ON public.device_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);