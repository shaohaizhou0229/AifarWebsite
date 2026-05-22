alter table public.site_page_content_snapshots
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

alter table public.site_page_content_snapshots
  drop constraint if exists site_page_content_snapshots_type_check;

alter table public.site_page_content_snapshots
  add constraint site_page_content_snapshots_type_check
  check (snapshot_type in ('draft_saved', 'published', 'restored', 'template_applied', 'manual'));

create index if not exists site_page_content_snapshots_active_lookup_idx
  on public.site_page_content_snapshots (page_key, locale, archived_at, created_at desc);

grant select, insert, update on public.site_page_content_snapshots to authenticated;
