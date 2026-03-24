create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  status text default 'pending',
  progress int default 0,
  prompt text,
  image_url text,
  video_url text,
  caption_text text,
  error text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.video_jobs
  add column if not exists user_id uuid,
  add column if not exists status text default 'pending',
  add column if not exists progress int default 0,
  add column if not exists prompt text,
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists caption_text text,
  add column if not exists error text,
  add column if not exists created_at timestamp default now(),
  add column if not exists updated_at timestamp default now();

alter table public.video_jobs alter column id set default gen_random_uuid();
alter table public.video_jobs alter column status set default 'pending';
alter table public.video_jobs alter column progress set default 0;
alter table public.video_jobs alter column created_at set default now();
alter table public.video_jobs alter column updated_at set default now();

create index if not exists video_jobs_user_id_idx on public.video_jobs (user_id);
create index if not exists video_jobs_created_at_idx on public.video_jobs (created_at desc);

alter table public.video_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'video_jobs' and policyname = 'video_jobs_select_own'
  ) then
    create policy video_jobs_select_own
      on public.video_jobs
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'video_jobs' and policyname = 'video_jobs_insert_own'
  ) then
    create policy video_jobs_insert_own
      on public.video_jobs
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'video_jobs' and policyname = 'video_jobs_update_own'
  ) then
    create policy video_jobs_update_own
      on public.video_jobs
      for update
      using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_video_jobs_updated_at') then
    create trigger set_video_jobs_updated_at
      before update on public.video_jobs
      for each row
      execute function public.set_updated_at();
  end if;
end $$;
