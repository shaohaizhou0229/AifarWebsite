alter table public.contact_requests
  add column if not exists priority text not null default 'normal',
  add column if not exists category text,
  add column if not exists assignee_user_id uuid,
  add column if not exists resolved_at timestamptz;

alter table public.contact_requests
  drop constraint if exists contact_requests_status_check;

alter table public.contact_requests
  add constraint contact_requests_status_check
  check (status in ('new', 'in_progress', 'waiting_customer', 'resolved', 'closed'));

do $$
begin
  alter table public.contact_requests
    add constraint contact_requests_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contact_requests
    add constraint contact_requests_category_check
    check (category is null or category in ('account_access', 'client_download', 'installation', 'product_usage', 'bug_report', 'partnership', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contact_requests
    add constraint contact_requests_assignee_user_id_fkey
    foreign key (assignee_user_id) references public.profiles(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists contact_requests_priority_idx
  on public.contact_requests (priority);

create index if not exists contact_requests_category_idx
  on public.contact_requests (category);

create index if not exists contact_requests_assignee_user_id_idx
  on public.contact_requests (assignee_user_id);

grant update (status, priority, category, assignee_user_id, last_replied_at, resolved_at, closed_at, updated_at)
  on public.contact_requests to authenticated;

create table if not exists public.contact_request_internal_notes (
  id uuid primary key default gen_random_uuid(),
  contact_request_id uuid not null references public.contact_requests(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_request_internal_notes_request_id_idx
  on public.contact_request_internal_notes (contact_request_id);

alter table public.contact_request_internal_notes enable row level security;

revoke all on public.contact_request_internal_notes from anon, authenticated;
grant select, insert on public.contact_request_internal_notes to authenticated;

drop policy if exists "Admins can view ticket internal notes" on public.contact_request_internal_notes;
create policy "Admins can view ticket internal notes"
on public.contact_request_internal_notes
for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins can insert ticket internal notes" on public.contact_request_internal_notes;
create policy "Admins can insert ticket internal notes"
on public.contact_request_internal_notes
for insert
to authenticated
with check (
  private.is_admin()
  and author_user_id = (select auth.uid())
);
