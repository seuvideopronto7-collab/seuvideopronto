-- ============================================
-- FASE 1 (Estabilidade): tabela job_steps
-- Rastreia cada etapa do pipeline de produção de vídeo
-- (script → voice → scenes → motion → sound → render → delivery)
-- ============================================

CREATE TYPE public.job_step_name AS ENUM (
  'script',
  'voice',
  'scenes',
  'motion',
  'sound',
  'render',
  'delivery'
);

CREATE TYPE public.job_step_status AS ENUM (
  'pending',
  'running',
  'done',
  'error',
  'skipped'
);

CREATE TABLE public.job_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.pipeline_jobs(id) ON DELETE CASCADE,
  step public.job_step_name NOT NULL,
  status public.job_step_status NOT NULL DEFAULT 'pending',
  provider text,
  fallback_used boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  error_message text,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, step)
);

CREATE INDEX job_steps_job_id_idx ON public.job_steps(job_id);
CREATE INDEX job_steps_status_idx ON public.job_steps(status);

ALTER TABLE public.job_steps ENABLE ROW LEVEL SECURITY;

-- Owner-scoped RLS via parent pipeline_jobs
CREATE POLICY "Users can view own job_steps"
ON public.job_steps FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pipeline_jobs pj
  WHERE pj.id = job_steps.job_id AND pj.user_id = auth.uid()
));

CREATE POLICY "Users can insert own job_steps"
ON public.job_steps FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pipeline_jobs pj
  WHERE pj.id = job_steps.job_id AND pj.user_id = auth.uid()
));

CREATE POLICY "Users can update own job_steps"
ON public.job_steps FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pipeline_jobs pj
  WHERE pj.id = job_steps.job_id AND pj.user_id = auth.uid()
));

CREATE POLICY "Users can delete own job_steps"
ON public.job_steps FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pipeline_jobs pj
  WHERE pj.id = job_steps.job_id AND pj.user_id = auth.uid()
));

CREATE POLICY "Admins can view all job_steps"
ON public.job_steps FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_job_steps_updated_at
BEFORE UPDATE ON public.job_steps
FOR EACH ROW EXECUTE FUNCTION public.update_pipeline_updated_at();