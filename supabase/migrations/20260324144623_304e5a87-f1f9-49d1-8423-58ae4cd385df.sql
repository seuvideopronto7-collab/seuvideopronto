
-- Table: video_jobs (extend existing or create)
CREATE TABLE IF NOT EXISTS public.video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  progress int NOT NULL DEFAULT 0,
  prompt text,
  image_url text,
  video_url text,
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.video_jobs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own jobs" ON public.video_jobs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all jobs" ON public.video_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all jobs" ON public.video_jobs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_jobs;

-- Table: assets
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.assets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Table: integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  api_key text,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON public.integrations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own integrations" ON public.integrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own integrations" ON public.integrations
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Table: usuarios_planos
CREATE TABLE IF NOT EXISTS public.usuarios_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plano text NOT NULL DEFAULT 'start',
  limite_diario_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  uso_hoje_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan" ON public.usuarios_planos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own plan" ON public.usuarios_planos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own plan" ON public.usuarios_planos
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Table: produtos_gerados
CREATE TABLE IF NOT EXISTS public.produtos_gerados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT '',
  nicho text NOT NULL DEFAULT '',
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own produtos" ON public.produtos_gerados
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own produtos" ON public.produtos_gerados
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own produtos" ON public.produtos_gerados
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for new buckets
CREATE POLICY "Auth upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "Auth read images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'images');
CREATE POLICY "Public read images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'images');

CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Auth read videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos');
CREATE POLICY "Public read videos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'videos');

CREATE POLICY "Auth upload audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio');
CREATE POLICY "Auth read audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'audio');
