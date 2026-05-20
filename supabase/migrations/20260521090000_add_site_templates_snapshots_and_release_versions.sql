alter table public.contact_requests
  drop constraint if exists contact_requests_request_type_check;

alter table public.contact_requests
  add constraint contact_requests_request_type_check
  check (
    request_type in (
      'product_inquiry',
      'technical_support',
      'partnership',
      'other',
      'account_access',
      'client_download',
      'installation',
      'product_usage',
      'bug_report'
    )
  );

create table if not exists public.site_page_content_snapshots (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  locale text not null,
  snapshot_type text not null,
  content jsonb not null,
  summary text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.site_page_content_snapshots
  drop constraint if exists site_page_content_snapshots_page_key_check;

alter table public.site_page_content_snapshots
  add constraint site_page_content_snapshots_page_key_check
  check (page_key in ('home', 'product'));

alter table public.site_page_content_snapshots
  drop constraint if exists site_page_content_snapshots_locale_check;

alter table public.site_page_content_snapshots
  add constraint site_page_content_snapshots_locale_check
  check (locale in ('en', 'zh-CN', 'fr', 'ar'));

alter table public.site_page_content_snapshots
  drop constraint if exists site_page_content_snapshots_type_check;

alter table public.site_page_content_snapshots
  add constraint site_page_content_snapshots_type_check
  check (snapshot_type in ('draft_saved', 'published', 'restored', 'template_applied'));

create index if not exists site_page_content_snapshots_lookup_idx
  on public.site_page_content_snapshots (page_key, locale, created_at desc);

create table if not exists public.site_page_templates (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  locale text not null,
  name text not null,
  description text,
  template_content jsonb not null,
  include_seo boolean not null default false,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_page_templates
  drop constraint if exists site_page_templates_page_key_check;

alter table public.site_page_templates
  add constraint site_page_templates_page_key_check
  check (page_key in ('home', 'product'));

alter table public.site_page_templates
  drop constraint if exists site_page_templates_locale_check;

alter table public.site_page_templates
  add constraint site_page_templates_locale_check
  check (locale in ('en', 'zh-CN', 'fr', 'ar'));

create index if not exists site_page_templates_lookup_idx
  on public.site_page_templates (page_key, locale, archived_at, updated_at desc);

create table if not exists public.site_page_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_page_templates(id) on delete cascade,
  version_type text not null,
  template_content jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.site_page_template_versions
  drop constraint if exists site_page_template_versions_type_check;

alter table public.site_page_template_versions
  add constraint site_page_template_versions_type_check
  check (version_type in ('created', 'updated', 'archived'));

create index if not exists site_page_template_versions_lookup_idx
  on public.site_page_template_versions (template_id, created_at desc);

create table if not exists public.client_release_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  version text,
  build_number text,
  release_notes text,
  storage_path text,
  external_url text,
  file_size bigint,
  checksum_sha256 text,
  upload_status text not null default 'idle',
  original_filename text,
  content_type text,
  is_published boolean not null default false,
  published_at timestamptz,
  snapshot_type text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.client_release_versions
  drop constraint if exists client_release_versions_platform_check;

alter table public.client_release_versions
  add constraint client_release_versions_platform_check
  check (platform in ('windows', 'ios', 'android_phone', 'android_pad', 'mac'));

alter table public.client_release_versions
  drop constraint if exists client_release_versions_upload_status_check;

alter table public.client_release_versions
  add constraint client_release_versions_upload_status_check
  check (upload_status in ('idle', 'uploading', 'uploaded', 'failed'));

alter table public.client_release_versions
  drop constraint if exists client_release_versions_snapshot_type_check;

alter table public.client_release_versions
  add constraint client_release_versions_snapshot_type_check
  check (
    snapshot_type in (
      'details_saved',
      'published',
      'file_uploaded',
      'upload_started',
      'upload_idle',
      'upload_uploading',
      'upload_uploaded',
      'upload_failed',
      'file_cleared',
      'restored'
    )
  );

create index if not exists client_release_versions_lookup_idx
  on public.client_release_versions (platform, created_at desc);

alter table public.site_page_content_snapshots enable row level security;
alter table public.site_page_templates enable row level security;
alter table public.site_page_template_versions enable row level security;
alter table public.client_release_versions enable row level security;

revoke all on public.site_page_content_snapshots from anon, authenticated;
revoke all on public.site_page_templates from anon, authenticated;
revoke all on public.site_page_template_versions from anon, authenticated;
revoke all on public.client_release_versions from anon, authenticated;

grant select, insert on public.site_page_content_snapshots to authenticated;
grant select, insert, update on public.site_page_templates to authenticated;
grant select, insert on public.site_page_template_versions to authenticated;
grant select, insert on public.client_release_versions to authenticated;

drop policy if exists "Admins can manage site page content snapshots" on public.site_page_content_snapshots;
create policy "Admins can manage site page content snapshots"
on public.site_page_content_snapshots
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can manage site page templates" on public.site_page_templates;
create policy "Admins can manage site page templates"
on public.site_page_templates
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can manage site page template versions" on public.site_page_template_versions;
create policy "Admins can manage site page template versions"
on public.site_page_template_versions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins can manage client release versions" on public.client_release_versions;
create policy "Admins can manage client release versions"
on public.client_release_versions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
