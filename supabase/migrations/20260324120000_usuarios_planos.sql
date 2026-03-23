CREATE TABLE public.usuarios_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plano TEXT NOT NULL DEFAULT 'start',
  limite_diario_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  uso_hoje_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX usuarios_planos_user_id_idx ON public.usuarios_planos (user_id);

ALTER TABLE public.usuarios_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usuarios_planos"
  ON public.usuarios_planos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usuarios_planos"
  ON public.usuarios_planos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own usuarios_planos"
  ON public.usuarios_planos FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all usuarios_planos"
  ON public.usuarios_planos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all usuarios_planos"
  ON public.usuarios_planos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  INSERT INTO public.usuarios_planos (user_id, plano, limite_diario_json, uso_hoje_json, reset_at)
  VALUES (
    NEW.id,
    'start',
    '{"videos_curto_dia":10,"duracao_curto":3,"vozes_ia":true,"estilos":1000,"legendas_premium":true,"editor":true}'::jsonb,
    '{}'::jsonb,
    now() + interval '1 day'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
