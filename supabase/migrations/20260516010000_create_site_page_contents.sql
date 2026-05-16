create table if not exists public.site_page_contents (
  page_key text not null,
  locale text not null,
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb,
  hero_image_path text,
  hero_image_alt text,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (page_key, locale)
);

alter table public.site_page_contents
  drop constraint if exists site_page_contents_page_key_check;

alter table public.site_page_contents
  add constraint site_page_contents_page_key_check
  check (page_key in ('home', 'product'));

alter table public.site_page_contents
  drop constraint if exists site_page_contents_locale_check;

alter table public.site_page_contents
  add constraint site_page_contents_locale_check
  check (locale in ('en', 'zh-CN', 'fr', 'ar'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-content-images',
  'site-content-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.site_page_contents enable row level security;

revoke all on public.site_page_contents from anon, authenticated;
grant select on public.site_page_contents to anon, authenticated;
grant insert (
  page_key,
  locale,
  draft_content,
  hero_image_path,
  hero_image_alt,
  is_published,
  published_at,
  updated_by,
  updated_at
) on public.site_page_contents to authenticated;
grant update (
  draft_content,
  published_content,
  hero_image_path,
  hero_image_alt,
  is_published,
  published_at,
  updated_by,
  updated_at
) on public.site_page_contents to authenticated;

drop policy if exists "Published site page content is public" on public.site_page_contents;
create policy "Published site page content is public"
on public.site_page_contents
for select
to anon, authenticated
using (is_published);

drop policy if exists "Admins can manage site page content" on public.site_page_contents;
create policy "Admins can manage site page content"
on public.site_page_contents
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Published site content images are public" on storage.objects;
create policy "Published site content images are public"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'site-content-images'
  and exists (
    select 1
    from public.site_page_contents spc
    where spc.hero_image_path = name
      and spc.is_published
  )
);

drop policy if exists "Admins can upload site content images" on storage.objects;
create policy "Admins can upload site content images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-content-images'
  and private.is_admin()
);

drop policy if exists "Admins can update site content images" on storage.objects;
create policy "Admins can update site content images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-content-images'
  and private.is_admin()
)
with check (
  bucket_id = 'site-content-images'
  and private.is_admin()
);

drop policy if exists "Admins can delete site content images" on storage.objects;
create policy "Admins can delete site content images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-content-images'
  and private.is_admin()
);
