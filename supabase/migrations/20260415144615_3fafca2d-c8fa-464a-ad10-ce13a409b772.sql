-- Add DELETE policy for integrations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'Users can delete own integrations'
  ) THEN
    CREATE POLICY "Users can delete own integrations"
    ON public.integrations FOR DELETE TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;