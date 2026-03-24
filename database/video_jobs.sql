CREATE TABLE public.video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text,
  progress int,
  video_url text,
  created_at timestamp DEFAULT now()
);
