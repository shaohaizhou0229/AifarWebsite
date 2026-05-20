create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  locale text,
  event_type text not null default 'page_view',
  referrer_host text,
  user_agent_family text,
  created_at timestamptz not null default now(),
  constraint site_analytics_events_event_type_check
    check (event_type in ('page_view', 'download_click')),
  constraint site_analytics_events_locale_check
    check (locale is null or locale in ('en', 'zh-CN', 'fr', 'ar'))
);

create index if not exists site_analytics_events_created_at_idx
  on public.site_analytics_events (created_at desc);

create index if not exists site_analytics_events_event_created_idx
  on public.site_analytics_events (event_type, created_at desc);

create index if not exists site_analytics_events_path_created_idx
  on public.site_analytics_events (path, created_at desc);

revoke all on public.site_analytics_events from anon, authenticated;
