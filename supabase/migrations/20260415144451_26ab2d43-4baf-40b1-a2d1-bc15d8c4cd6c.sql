-- Remove the dangerous user self-update policy
DROP POLICY IF EXISTS "Users can update own plan" ON public.usuarios_planos;

-- Add service_role full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'usuarios_planos' AND policyname = 'Service role full access usuarios_planos'
  ) THEN
    CREATE POLICY "Service role full access usuarios_planos"
    ON public.usuarios_planos FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;