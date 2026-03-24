
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS credentials text;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS last_test_at timestamptz;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS client_id text;
