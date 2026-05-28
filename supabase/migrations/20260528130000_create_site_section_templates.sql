create table if not exists public.site_section_templates (
  id uuid primary key default gen_random_uuid(),
  page_key text,
  locale text not null,
  name text not null,
  description text,
  industry text not null default 'custom',
  purpose text not null default 'general',
  tags text[] not null default '{}'::text[],
  source text not null default 'manual',
  status text not null default 'ready',
  risk_flags text[] not null default '{}'::text[],
  template_content jsonb not null,
  is_favorite boolean not null default false,
  usage_count integer not null default 0,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_section_templates
  drop constraint if exists site_section_templates_page_key_check;

alter table public.site_section_templates
  add constraint site_section_templates_page_key_check
  check (page_key is null or page_key in ('home', 'product'));

alter table public.site_section_templates
  drop constraint if exists site_section_templates_locale_check;

alter table public.site_section_templates
  add constraint site_section_templates_locale_check
  check (locale in ('en', 'zh-CN', 'fr', 'ar'));

alter table public.site_section_templates
  drop constraint if exists site_section_templates_source_check;

alter table public.site_section_templates
  add constraint site_section_templates_source_check
  check (source in ('system', 'manual', 'ai'));

alter table public.site_section_templates
  drop constraint if exists site_section_templates_status_check;

alter table public.site_section_templates
  add constraint site_section_templates_status_check
  check (status in ('ready', 'pending_review'));

alter table public.site_section_templates
  drop constraint if exists site_section_templates_industry_check;

alter table public.site_section_templates
  add constraint site_section_templates_industry_check
  check (industry in ('public_service', 'marketing', 'tourism', 'corporate', 'custom'));

alter table public.site_section_templates
  drop constraint if exists site_section_templates_usage_count_check;

alter table public.site_section_templates
  add constraint site_section_templates_usage_count_check
  check (usage_count >= 0);

create index if not exists site_section_templates_lookup_idx
  on public.site_section_templates (locale, page_key, archived_at, is_favorite desc, usage_count desc, updated_at desc);

create index if not exists site_section_templates_source_idx
  on public.site_section_templates (locale, source, archived_at, updated_at desc);

create index if not exists site_section_templates_industry_idx
  on public.site_section_templates (locale, industry, archived_at, updated_at desc);

alter table public.site_section_templates enable row level security;

revoke all on public.site_section_templates from anon, authenticated;
grant select, insert, update on public.site_section_templates to authenticated;

drop policy if exists "Admins can manage site section templates" on public.site_section_templates;
create policy "Admins can manage site section templates"
on public.site_section_templates
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
