CREATE TABLE public.video_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  etapa_atual INTEGER NOT NULL DEFAULT 1,
  etapas_concluidas INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pipeline"
ON public.video_pipeline FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pipeline"
ON public.video_pipeline FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pipeline"
ON public.video_pipeline FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_video_pipeline_updated_at
BEFORE UPDATE ON public.video_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.update_pipeline_updated_at();