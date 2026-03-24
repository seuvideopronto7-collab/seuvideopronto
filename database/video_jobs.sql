CREATE TABLE public.video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  prompt text,
  image_url text,
  video_url text,
  error text,
  progress int NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their jobs"
ON public.video_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert jobs"
ON public.video_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their jobs"
ON public.video_jobs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX video_jobs_user_id_idx ON public.video_jobs (user_id);
CREATE INDEX video_jobs_status_idx ON public.video_jobs (status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_video_jobs_updated_at
BEFORE UPDATE ON public.video_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
