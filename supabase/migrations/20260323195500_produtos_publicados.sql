CREATE TABLE public.produtos_publicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT '',
  link_checkout TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX produtos_publicados_user_id_idx ON public.produtos_publicados (user_id);
CREATE INDEX produtos_publicados_platform_idx ON public.produtos_publicados (platform);

ALTER TABLE public.produtos_publicados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own produtos_publicados"
  ON public.produtos_publicados FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own produtos_publicados"
  ON public.produtos_publicados FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own produtos_publicados"
  ON public.produtos_publicados FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own produtos_publicados"
  ON public.produtos_publicados FOR DELETE TO authenticated
  USING (user_id = auth.uid());
