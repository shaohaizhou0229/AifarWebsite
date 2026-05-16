create table if not exists public.document_categories (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  requires_login_to_view boolean not null default false,
  allow_authenticated_download boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_categories
  add constraint document_categories_key_check
  check (key in ('operation_guides', 'technical_whitepapers', 'deployment_manuals', 'feature_lists'));

insert into public.document_categories (
  key,
  label,
  description,
  sort_order,
  requires_login_to_view,
  allow_authenticated_download
)
values
  ('operation_guides', 'Operation guides', 'User-facing operation guides and how-to materials.', 10, false, true),
  ('technical_whitepapers', 'Technical whitepapers', 'Architecture, security, and technical background documents.', 20, false, true),
  ('deployment_manuals', 'Deployment manuals', 'Deployment and environment preparation manuals.', 30, true, true),
  ('feature_lists', 'Feature lists', 'Product capability lists and release scope documents.', 40, false, true)
on conflict (key) do update
set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.document_categories(key),
  slug text not null unique,
  title text not null,
  summary text,
  current_version_id uuid,
  current_version_label text,
  is_published boolean not null default false,
  published_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents
  add constraint documents_slug_check
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_label text not null,
  markdown_content text not null,
  storage_path text,
  original_filename text,
  file_size bigint,
  checksum_sha256 text,
  content_type text not null default 'text/markdown',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.documents
  drop constraint if exists documents_current_version_id_fkey;

alter table public.documents
  add constraint documents_current_version_id_fkey
  foreign key (current_version_id) references public.document_versions(id) on delete set null;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.document_versions(id) on delete cascade,
  chunk_index integer not null,
  heading_path text,
  content text not null,
  token_estimate integer not null default 0,
  content_hash text not null,
  index_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (version_id, chunk_index)
);

alter table public.document_chunks
  add constraint document_chunks_index_status_check
  check (index_status in ('pending', 'indexed', 'failed'));

insert into storage.buckets (id, name, public)
values ('site-documents', 'site-documents', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880
where id = 'site-documents';

alter table public.document_categories enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_chunks enable row level security;

revoke all on public.document_categories from anon, authenticated;
revoke all on public.documents from anon, authenticated;
revoke all on public.document_versions from anon, authenticated;
revoke all on public.document_chunks from anon, authenticated;

grant select on public.document_categories to anon, authenticated;
grant select on public.documents to anon, authenticated;
grant select on public.document_versions to anon, authenticated;
grant select on public.document_chunks to authenticated;
grant insert, update on public.documents to authenticated;
grant insert on public.document_versions to authenticated;
grant insert, delete on public.document_chunks to authenticated;

drop policy if exists "Public document categories are readable" on public.document_categories;
create policy "Public document categories are readable"
on public.document_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Published public documents are readable" on public.documents;
create policy "Published public documents are readable"
on public.documents
for select
to anon, authenticated
using (
  is_published
  and deleted_at is null
  and exists (
    select 1
    from public.document_categories dc
    where dc.key = category_key
      and dc.requires_login_to_view = false
  )
);

drop policy if exists "Authenticated users can read login-gated documents" on public.documents;
create policy "Authenticated users can read login-gated documents"
on public.documents
for select
to authenticated
using (is_published and deleted_at is null);

drop policy if exists "Admins can manage documents" on public.documents;
create policy "Admins can manage documents"
on public.documents
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Published public versions are readable" on public.document_versions;
create policy "Published public versions are readable"
on public.document_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.documents d
    join public.document_categories dc on dc.key = d.category_key
    where d.current_version_id = document_versions.id
      and d.is_published
      and d.deleted_at is null
      and dc.requires_login_to_view = false
  )
);

drop policy if exists "Authenticated users can read login-gated versions" on public.document_versions;
create policy "Authenticated users can read login-gated versions"
on public.document_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.documents d
    where d.current_version_id = document_versions.id
      and d.is_published
      and d.deleted_at is null
  )
);

drop policy if exists "Admins can manage document versions" on public.document_versions;
create policy "Admins can manage document versions"
on public.document_versions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can manage document chunks" on public.document_chunks;
create policy "Admins can manage document chunks"
on public.document_chunks
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can upload site documents" on storage.objects;
create policy "Admins can upload site documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-documents'
  and private.is_admin()
);

drop policy if exists "Admins can update site documents" on storage.objects;
create policy "Admins can update site documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-documents'
  and private.is_admin()
)
with check (
  bucket_id = 'site-documents'
  and private.is_admin()
);

drop policy if exists "Authenticated users can download allowed site documents" on storage.objects;
create policy "Authenticated users can download allowed site documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-documents'
  and exists (
    select 1
    from public.documents d
    join public.document_categories dc on dc.key = d.category_key
    join public.document_versions dv on dv.id = d.current_version_id
    where dv.storage_path = name
      and d.is_published
      and d.deleted_at is null
      and dc.allow_authenticated_download
  )
);

drop policy if exists "Admins can delete site documents" on storage.objects;
create policy "Admins can delete site documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-documents'
  and private.is_admin()
);
