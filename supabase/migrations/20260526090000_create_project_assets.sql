update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
where id = 'site-content-images';

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  display_name text not null,
  directory_path text not null default '',
  mime_type text not null,
  file_size bigint not null default 0,
  width integer,
  height integer,
  source text not null default 'upload',
  alt_text text not null default '',
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_assets
  drop constraint if exists project_assets_source_check;

alter table public.project_assets
  add constraint project_assets_source_check
  check (source in ('upload', 'folder_upload', 'generated', 'system'));

alter table public.project_assets
  drop constraint if exists project_assets_file_size_check;

alter table public.project_assets
  add constraint project_assets_file_size_check
  check (file_size > 0 and file_size <= 5242880);

create index if not exists project_assets_lookup_idx
  on public.project_assets (archived_at, updated_at desc);

create index if not exists project_assets_directory_idx
  on public.project_assets (directory_path, archived_at, updated_at desc);

create index if not exists project_assets_source_idx
  on public.project_assets (source, archived_at, updated_at desc);

alter table public.project_assets enable row level security;

revoke all on public.project_assets from anon, authenticated;
grant select, insert, update on public.project_assets to authenticated;

drop policy if exists "Admins can manage project assets" on public.project_assets;
create policy "Admins can manage project assets"
on public.project_assets
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can read site content images" on storage.objects;
create policy "Admins can read site content images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-content-images'
  and private.is_admin()
);

drop policy if exists "Published site content images are public" on storage.objects;
create policy "Published site content images are public"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'site-content-images'
  and (
    exists (
      select 1
      from public.site_page_contents spc
      where spc.is_published
        and (
          spc.hero_image_path = name
          or spc.published_content::text like '%' || to_jsonb(name::text)::text || '%'
        )
    )
    or exists (
      select 1
      from public.documents d
      join public.document_categories dc on dc.key = d.category_key
      join public.document_versions dv on dv.id = d.current_version_id
      where d.is_published
        and d.deleted_at is null
        and dc.requires_login_to_view = false
        and dv.markdown_content like '%' || name || '%'
    )
  )
);
