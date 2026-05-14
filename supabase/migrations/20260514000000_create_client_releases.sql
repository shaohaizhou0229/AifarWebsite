create table if not exists public.client_releases (
  platform text primary key,
  version text,
  build_number text,
  release_notes text,
  storage_path text,
  external_url text,
  file_size bigint,
  checksum_sha256 text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_releases
  add constraint client_releases_platform_check
  check (platform in ('windows', 'ios', 'android_phone', 'android_pad', 'mac'));

insert into public.client_releases (platform)
values
  ('windows'),
  ('ios'),
  ('android_phone'),
  ('android_pad'),
  ('mac')
on conflict (platform) do nothing;

insert into storage.buckets (id, name, public)
values ('client-downloads', 'client-downloads', false)
on conflict (id) do nothing;

alter table public.client_releases enable row level security;

revoke all on public.client_releases from anon, authenticated;
grant select on public.client_releases to anon, authenticated;
grant update (
  version,
  build_number,
  release_notes,
  storage_path,
  external_url,
  file_size,
  checksum_sha256,
  is_published,
  published_at,
  created_by,
  updated_at
) on public.client_releases to authenticated;

drop policy if exists "Published client releases are public" on public.client_releases;
create policy "Published client releases are public"
on public.client_releases
for select
to anon, authenticated
using (
  is_published
  or private.is_admin()
);

drop policy if exists "Admins can update client releases" on public.client_releases;
create policy "Admins can update client releases"
on public.client_releases
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Published client files are publicly readable" on storage.objects;
create policy "Published client files are publicly readable"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'client-downloads'
  and exists (
    select 1
    from public.client_releases cr
    where cr.storage_path = name
      and cr.is_published
  )
);

drop policy if exists "Admins can upload client files" on storage.objects;
create policy "Admins can upload client files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-downloads'
  and private.is_admin()
);

drop policy if exists "Admins can update client files" on storage.objects;
create policy "Admins can update client files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-downloads'
  and private.is_admin()
)
with check (
  bucket_id = 'client-downloads'
  and private.is_admin()
);
