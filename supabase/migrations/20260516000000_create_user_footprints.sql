create table if not exists public.user_footprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  summary text not null,
  related_type text,
  related_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_footprints_user_id_created_at_idx
  on public.user_footprints (user_id, created_at desc);

create index if not exists user_footprints_actor_user_id_idx
  on public.user_footprints (actor_user_id);

create index if not exists user_footprints_event_type_idx
  on public.user_footprints (event_type);

alter table public.user_footprints enable row level security;

revoke all on public.user_footprints from anon, authenticated;

grant select, insert on public.user_footprints to authenticated;

drop policy if exists "Users can view their own footprints" on public.user_footprints;
create policy "Users can view their own footprints"
on public.user_footprints
for select
to authenticated
using (
  private.is_admin()
  or user_id = (select auth.uid())
);

drop policy if exists "Users can insert their own footprints" on public.user_footprints;
create policy "Users can insert their own footprints"
on public.user_footprints
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or private.is_admin()
);
