alter table public.client_releases
  add column if not exists upload_status text not null default 'idle',
  add column if not exists original_filename text,
  add column if not exists content_type text;

alter table public.client_releases
  drop constraint if exists client_releases_upload_status_check;

alter table public.client_releases
  add constraint client_releases_upload_status_check
  check (upload_status in ('idle', 'uploading', 'uploaded', 'failed'));

grant update (
  upload_status,
  original_filename,
  content_type,
  updated_at
) on public.client_releases to authenticated;

drop policy if exists "Admins can read client download files" on storage.objects;
create policy "Admins can read client download files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-downloads'
  and private.is_admin()
);
