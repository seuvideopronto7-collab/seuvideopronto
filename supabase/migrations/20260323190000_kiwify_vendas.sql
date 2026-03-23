CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_id TEXT UNIQUE,
  origem TEXT NOT NULL DEFAULT 'kiwify',
  nome_cliente TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  produto TEXT NOT NULL DEFAULT '',
  valor NUMERIC,
  status TEXT NOT NULL DEFAULT 'unknown',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vendas_user_id_idx ON public.vendas (user_id);
CREATE INDEX vendas_status_idx ON public.vendas (status);
CREATE INDEX vendas_created_at_idx ON public.vendas (created_at);
CREATE INDEX vendas_email_idx ON public.vendas (email);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vendas"
  ON public.vendas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all vendas"
  ON public.vendas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
