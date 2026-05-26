create table if not exists public.project_asset_folders (
  id uuid primary key default gen_random_uuid(),
  directory_path text not null,
  display_name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_asset_folders_active_path_idx
  on public.project_asset_folders (lower(directory_path))
  where archived_at is null;

create index if not exists project_asset_folders_lookup_idx
  on public.project_asset_folders (archived_at, updated_at desc);

create table if not exists public.project_asset_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_asset_tags_active_name_idx
  on public.project_asset_tags (lower(name))
  where archived_at is null;

create index if not exists project_asset_tags_lookup_idx
  on public.project_asset_tags (archived_at, updated_at desc);

insert into public.project_asset_folders (directory_path, display_name)
select distinct directory_path, directory_path
from public.project_assets
where archived_at is null and directory_path <> ''
on conflict do nothing;

insert into public.project_asset_tags (name)
select distinct tag
from public.project_assets
cross join lateral unnest(tags) as tag
where archived_at is null and tag <> ''
on conflict do nothing;

alter table public.project_asset_folders enable row level security;
alter table public.project_asset_tags enable row level security;

revoke all on public.project_asset_folders from anon, authenticated;
revoke all on public.project_asset_tags from anon, authenticated;
grant select, insert, update on public.project_asset_folders to authenticated;
grant select, insert, update on public.project_asset_tags to authenticated;

drop policy if exists "Admins can manage project asset folders" on public.project_asset_folders;
create policy "Admins can manage project asset folders"
on public.project_asset_folders
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can manage project asset tags" on public.project_asset_tags;
create policy "Admins can manage project asset tags"
on public.project_asset_tags
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
