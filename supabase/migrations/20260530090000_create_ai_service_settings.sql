create table if not exists public.ai_service_settings (
  environment_key text primary key,
  config jsonb not null default '{}'::jsonb,
  encrypted_secrets jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_service_settings_environment_key_check
    check (environment_key in ('production', 'preview', 'development'))
);

alter table public.ai_service_settings enable row level security;

revoke all on public.ai_service_settings from anon, authenticated;
grant select, insert, update on public.ai_service_settings to authenticated;

drop policy if exists "Settings admins can manage AI service settings" on public.ai_service_settings;
create policy "Settings admins can manage AI service settings"
on public.ai_service_settings
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
