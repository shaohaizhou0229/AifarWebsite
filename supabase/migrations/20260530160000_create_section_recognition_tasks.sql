create table if not exists public.site_section_recognition_tasks (
  id uuid primary key default gen_random_uuid(),
  page_key text,
  locale text not null,
  industry text not null default 'custom',
  section_type_hint text not null default 'auto',
  purpose_hint text not null default '',
  status text not null default 'queued',
  progress integer not null default 0,
  screenshot_filename text not null default '',
  screenshot_mime_type text not null default '',
  screenshot_size bigint not null default 0,
  screenshot_data_url text not null default '',
  candidate jsonb,
  recognition jsonb,
  error_code text not null default '',
  error_message text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_page_key_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_page_key_check
  check (page_key is null or page_key in ('home', 'product'));

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_locale_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_locale_check
  check (locale in ('en', 'zh-CN', 'fr', 'ar'));

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_industry_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_industry_check
  check (industry in ('public_service', 'marketing', 'tourism', 'corporate', 'custom'));

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_status_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_status_check
  check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'expired'));

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_progress_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_progress_check
  check (progress >= 0 and progress <= 100);

alter table public.site_section_recognition_tasks
  drop constraint if exists site_section_recognition_tasks_screenshot_size_check;

alter table public.site_section_recognition_tasks
  add constraint site_section_recognition_tasks_screenshot_size_check
  check (screenshot_size >= 0 and screenshot_size <= 5242880);

create index if not exists site_section_recognition_tasks_lookup_idx
  on public.site_section_recognition_tasks (created_by, status, updated_at desc);

create index if not exists site_section_recognition_tasks_page_idx
  on public.site_section_recognition_tasks (locale, page_key, updated_at desc);

alter table public.site_section_recognition_tasks enable row level security;

revoke all on public.site_section_recognition_tasks from anon, authenticated;
grant select, insert, update on public.site_section_recognition_tasks to authenticated;

drop policy if exists "Admins can manage site section recognition tasks" on public.site_section_recognition_tasks;
create policy "Admins can manage site section recognition tasks"
on public.site_section_recognition_tasks
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
