CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_role_idx ON public.users (role);
CREATE INDEX users_username_idx ON public.users (username);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions (user_id);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ALTER COLUMN is_active SET DEFAULT true;

UPDATE public.profiles SET is_active = true WHERE is_active IS DISTINCT FROM true;
