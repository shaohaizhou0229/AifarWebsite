create table if not exists public.project_asset_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  display_name text not null,
  relative_path text not null default '',
  directory_path text not null default '',
  mime_type text not null,
  file_size bigint not null default 0,
  source text not null default 'upload',
  upload_status text not null default 'uploading',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_asset_upload_sessions
  drop constraint if exists project_asset_upload_sessions_source_check;

alter table public.project_asset_upload_sessions
  add constraint project_asset_upload_sessions_source_check
  check (source in ('upload', 'folder_upload', 'generated', 'system'));

alter table public.project_asset_upload_sessions
  drop constraint if exists project_asset_upload_sessions_status_check;

alter table public.project_asset_upload_sessions
  add constraint project_asset_upload_sessions_status_check
  check (upload_status in ('uploading', 'paused', 'cancelled', 'failed', 'completed'));

alter table public.project_asset_upload_sessions
  drop constraint if exists project_asset_upload_sessions_file_size_check;

alter table public.project_asset_upload_sessions
  add constraint project_asset_upload_sessions_file_size_check
  check (file_size > 0 and file_size <= 5242880);

create index if not exists project_asset_upload_sessions_lookup_idx
  on public.project_asset_upload_sessions (upload_status, updated_at desc);

create index if not exists project_asset_upload_sessions_directory_idx
  on public.project_asset_upload_sessions (directory_path, updated_at desc);

alter table public.project_asset_upload_sessions enable row level security;

revoke all on public.project_asset_upload_sessions from anon, authenticated;
grant select, insert, update on public.project_asset_upload_sessions to authenticated;

drop policy if exists "Admins can manage project asset upload sessions" on public.project_asset_upload_sessions;
create policy "Admins can manage project asset upload sessions"
on public.project_asset_upload_sessions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
