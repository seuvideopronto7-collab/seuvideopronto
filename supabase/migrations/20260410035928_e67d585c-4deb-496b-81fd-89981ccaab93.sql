
-- Enum para tipos de entrada
CREATE TYPE public.job_input_type AS ENUM ('ideia', 'imagem', 'produto', 'autoridade', 'viral', 'dark');

-- Enum para plataformas
CREATE TYPE public.job_platform AS ENUM ('tiktok', 'reels', 'shorts', 'feed', 'stories', 'youtube');

-- Enum para objetivos
CREATE TYPE public.job_objective AS ENUM ('vendas', 'autoridade', 'engajamento');

-- Enum para estágio do pipeline
CREATE TYPE public.job_stage AS ENUM ('a_fazer', 'roteiro', 'narracao', 'imagens', 'video', 'concluido');

-- Enum para status do job
CREATE TYPE public.job_status AS ENUM ('aguardando', 'processando', 'concluido', 'erro', 'cancelado');

-- Enum para tipos de asset
CREATE TYPE public.asset_type AS ENUM ('script', 'audio', 'image', 'video', 'subtitle', 'thumbnail');

-- Enum para nível de log
CREATE TYPE public.log_level AS ENUM ('info', 'warning', 'error');

-- ===================== TABELA PIPELINE_JOBS =====================
CREATE TABLE public.pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  input_type public.job_input_type NOT NULL DEFAULT 'ideia',
  platform public.job_platform NOT NULL DEFAULT 'reels',
  duration text NOT NULL DEFAULT '30s',
  objective public.job_objective NOT NULL DEFAULT 'vendas',
  niche text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT 'feminina',
  cta text NOT NULL DEFAULT '',
  copy_base text NOT NULL DEFAULT '',
  visual_style text NOT NULL DEFAULT 'premium_escuro',
  reference_image_url text,
  current_stage public.job_stage NOT NULL DEFAULT 'a_fazer',
  status public.job_status NOT NULL DEFAULT 'aguardando',
  progress integer NOT NULL DEFAULT 0,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 2,
  script_mode text NOT NULL DEFAULT 'comercial',
  aspect_ratio text NOT NULL DEFAULT '9:16',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pipeline_jobs"
  ON public.pipeline_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pipeline_jobs"
  ON public.pipeline_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pipeline_jobs"
  ON public.pipeline_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own pipeline_jobs"
  ON public.pipeline_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all pipeline_jobs"
  ON public.pipeline_jobs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all pipeline_jobs"
  ON public.pipeline_jobs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX pipeline_jobs_user_id_idx ON public.pipeline_jobs (user_id);
CREATE INDEX pipeline_jobs_status_idx ON public.pipeline_jobs (status);
CREATE INDEX pipeline_jobs_stage_idx ON public.pipeline_jobs (current_stage);

-- Trigger updated_at
CREATE TRIGGER set_pipeline_jobs_updated_at
  BEFORE UPDATE ON public.pipeline_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_pipeline_updated_at();

-- ===================== TABELA JOB_ASSETS =====================
CREATE TABLE public.job_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.pipeline_jobs(id) ON DELETE CASCADE,
  type public.asset_type NOT NULL,
  scene_index integer,
  provider text NOT NULL DEFAULT 'internal',
  url text,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job_assets"
  ON public.job_assets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipeline_jobs WHERE id = job_assets.job_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own job_assets"
  ON public.job_assets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pipeline_jobs WHERE id = job_assets.job_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own job_assets"
  ON public.job_assets FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipeline_jobs WHERE id = job_assets.job_id AND user_id = auth.uid()));

CREATE POLICY "Admins can view all job_assets"
  ON public.job_assets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX job_assets_job_id_idx ON public.job_assets (job_id);
CREATE INDEX job_assets_type_idx ON public.job_assets (type);

-- ===================== TABELA JOB_LOGS =====================
CREATE TABLE public.job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.pipeline_jobs(id) ON DELETE CASCADE,
  stage public.job_stage NOT NULL,
  level public.log_level NOT NULL DEFAULT 'info',
  message text NOT NULL DEFAULT '',
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job_logs"
  ON public.job_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipeline_jobs WHERE id = job_logs.job_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own job_logs"
  ON public.job_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pipeline_jobs WHERE id = job_logs.job_id AND user_id = auth.uid()));

CREATE POLICY "Admins can view all job_logs"
  ON public.job_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX job_logs_job_id_idx ON public.job_logs (job_id);
CREATE INDEX job_logs_stage_idx ON public.job_logs (stage);

-- Enable realtime for pipeline_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_jobs;
