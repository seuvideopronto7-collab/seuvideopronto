create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null default 'free',
  videos_limit integer,
  videos_used integer not null default 0,
  reset_date timestamptz not null default (now() + interval '1 day'),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_select_own'
  ) then
    create policy subscriptions_select_own
      on public.subscriptions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_insert_own'
  ) then
    create policy subscriptions_insert_own
      on public.subscriptions
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_update_own'
  ) then
    create policy subscriptions_update_own
      on public.subscriptions
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_select_all_admin'
  ) then
    create policy subscriptions_select_all_admin
      on public.subscriptions
      for select
      using (public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_update_all_admin'
  ) then
    create policy subscriptions_update_all_admin
      on public.subscriptions
      for update
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

alter table public.video_jobs
  add column if not exists priority integer not null default 1;

create index if not exists video_jobs_priority_idx on public.video_jobs (priority desc, created_at asc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  insert into public.usuarios_planos (user_id, plano, limite_diario_json, uso_hoje_json, reset_at)
  values (
    new.id,
    'start',
    '{"videos_curto_dia":10,"duracao_curto":3,"vozes_ia":true,"estilos":1000,"legendas_premium":true,"editor":true}'::jsonb,
    '{}'::jsonb,
    now() + interval '1 day'
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, videos_limit, videos_used, reset_date, status)
  values (
    new.id,
    'free',
    2,
    0,
    now() + interval '1 day',
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
