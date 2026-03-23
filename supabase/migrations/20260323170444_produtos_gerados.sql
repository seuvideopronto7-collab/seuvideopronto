CREATE TABLE public.produtos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  nicho TEXT NOT NULL DEFAULT '',
  estrutura JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX produtos_gerados_user_id_idx ON public.produtos_gerados (user_id);

ALTER TABLE public.produtos_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own produtos_gerados"
  ON public.produtos_gerados FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own produtos_gerados"
  ON public.produtos_gerados FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own produtos_gerados"
  ON public.produtos_gerados FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own produtos_gerados"
  ON public.produtos_gerados FOR DELETE TO authenticated
  USING (user_id = auth.uid());
