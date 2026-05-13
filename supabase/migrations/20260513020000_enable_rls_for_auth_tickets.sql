create schema if not exists private;

revoke all on schema private from public;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.contact_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.contact_request_replies enable row level security;

revoke all on public.contact_requests from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.contact_request_replies from anon, authenticated;

grant insert on public.contact_requests to anon, authenticated;
grant select on public.contact_requests to authenticated;
grant update (status, last_replied_at, closed_at, updated_at) on public.contact_requests to authenticated;

grant select on public.profiles to authenticated;
grant insert (id, email, display_name, organization, job_title, country_region, phone) on public.profiles to authenticated;
grant update (display_name, organization, job_title, country_region, phone, updated_at) on public.profiles to authenticated;

grant select on public.contact_request_replies to authenticated;
grant insert on public.contact_request_replies to authenticated;

drop policy if exists "Anyone can submit website contact requests" on public.contact_requests;
create policy "Anyone can submit website contact requests"
on public.contact_requests
for insert
to anon, authenticated
with check (
  user_id is null
  or user_id = (select auth.uid())
);

drop policy if exists "Users can view their own contact requests" on public.contact_requests;
create policy "Users can view their own contact requests"
on public.contact_requests
for select
to authenticated
using (
  private.is_admin()
  or user_id = (select auth.uid())
  or lower(work_email) = lower((select auth.jwt() ->> 'email'))
);

drop policy if exists "Admins can update contact request status" on public.contact_requests;
create policy "Admins can update contact request status"
on public.contact_requests
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
  and role = 'user'
);

drop policy if exists "Users can view permitted profiles" on public.profiles;
create policy "Users can view permitted profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Users can view replies for their tickets" on public.contact_request_replies;
create policy "Users can view replies for their tickets"
on public.contact_request_replies
for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.contact_requests cr
    where cr.id = contact_request_id
      and (
        cr.user_id = (select auth.uid())
        or lower(cr.work_email) = lower((select auth.jwt() ->> 'email'))
      )
  )
);

drop policy if exists "Admins can insert ticket replies" on public.contact_request_replies;
create policy "Admins can insert ticket replies"
on public.contact_request_replies
for insert
to authenticated
with check (
  private.is_admin()
  and author_user_id = (select auth.uid())
  and author_role = 'admin'
);
