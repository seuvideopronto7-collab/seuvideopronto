ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS client_id TEXT;
