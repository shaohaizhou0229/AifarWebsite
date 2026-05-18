create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  to_email text not null,
  subject text not null,
  html_content text not null,
  text_content text not null,
  status text not null default 'pending',
  provider text,
  provider_message_id text,
  related_type text,
  related_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  retry_count int not null default 0,
  failure_reason text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.email_notifications
    add constraint email_notifications_status_check
    check (status in ('pending', 'sending', 'sent', 'failed', 'canceled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists email_notifications_status_scheduled_idx
  on public.email_notifications (status, scheduled_at);

create index if not exists email_notifications_event_type_idx
  on public.email_notifications (event_type);

alter table public.email_notifications enable row level security;

revoke all on public.email_notifications from anon, authenticated;
grant select, insert, update on public.email_notifications to authenticated;

drop policy if exists "Admins can read email notifications" on public.email_notifications;
create policy "Admins can read email notifications"
on public.email_notifications
for select
to authenticated
using (private.is_admin());
