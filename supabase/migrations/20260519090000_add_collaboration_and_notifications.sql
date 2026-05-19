alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"email": true, "inApp": true}'::jsonb;

update public.profiles
set notification_preferences = '{"email": true, "inApp": true}'::jsonb
where notification_preferences is null;

update public.profiles
set admin_permissions = (
  select array_agg(distinct permission)
  from unnest(admin_permissions || array['admin.collaboration']) as permission
)
where role = 'admin'
  and account_status = 'active'
  and admin_permissions @> array['admin.users']::text[]
  and not admin_permissions @> array['admin.collaboration']::text[];

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  related_type text,
  related_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, read_at)
  where read_at is null;

create index if not exists notifications_related_idx
  on public.notifications (related_type, related_id);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select, insert, update on public.notifications to authenticated;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications
for select
to authenticated
using (recipient_user_id = (select auth.uid()));

drop policy if exists "Users can mark their own notifications" on public.notifications;
create policy "Users can mark their own notifications"
on public.notifications
for update
to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

drop policy if exists "Admins can create notifications" on public.notifications;
create policy "Admins can create notifications"
on public.notifications
for insert
to authenticated
with check (private.is_admin());

create table if not exists public.admin_collaboration_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  leader_user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active',
  created_by_user_id uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.admin_collaboration_spaces
    add constraint admin_collaboration_spaces_status_check
    check (status in ('active', 'closed'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_collaboration_space_members (
  space_id uuid not null references public.admin_collaboration_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member',
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

do $$
begin
  alter table public.admin_collaboration_space_members
    add constraint admin_collaboration_space_members_role_check
    check (member_role in ('leader', 'member'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_collaboration_tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.admin_collaboration_spaces(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  task_type text not null default 'one_time',
  repeat_frequency text,
  repeat_limit int,
  generated_count int not null default 1,
  next_run_at timestamptz,
  recurrence_template_id uuid references public.admin_collaboration_tasks(id) on delete set null,
  is_recurring_closed boolean not null default false,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.admin_collaboration_tasks
    add constraint admin_collaboration_tasks_type_check
    check (task_type in ('one_time', 'recurring'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.admin_collaboration_tasks
    add constraint admin_collaboration_tasks_repeat_frequency_check
    check (repeat_frequency is null or repeat_frequency in ('daily', 'weekly', 'monthly'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_collaboration_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.admin_collaboration_tasks(id) on delete cascade,
  title text not null,
  description text,
  assignee_user_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  status text not null default 'not_started',
  due_soon_notified_at timestamptz,
  overdue_notified_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.admin_collaboration_subtasks
    add constraint admin_collaboration_subtasks_status_check
    check (status in ('not_started', 'in_progress', 'blocked', 'completed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists admin_collaboration_spaces_leader_idx
  on public.admin_collaboration_spaces (leader_user_id, status);

create index if not exists admin_collaboration_space_members_user_idx
  on public.admin_collaboration_space_members (user_id);

create index if not exists admin_collaboration_tasks_space_idx
  on public.admin_collaboration_tasks (space_id, created_at desc);

create index if not exists admin_collaboration_tasks_next_run_idx
  on public.admin_collaboration_tasks (next_run_at)
  where task_type = 'recurring' and is_recurring_closed = false;

create index if not exists admin_collaboration_subtasks_assignee_idx
  on public.admin_collaboration_subtasks (assignee_user_id, status, due_at);

alter table public.admin_collaboration_spaces enable row level security;
alter table public.admin_collaboration_space_members enable row level security;
alter table public.admin_collaboration_tasks enable row level security;
alter table public.admin_collaboration_subtasks enable row level security;

revoke all on public.admin_collaboration_spaces from anon, authenticated;
revoke all on public.admin_collaboration_space_members from anon, authenticated;
revoke all on public.admin_collaboration_tasks from anon, authenticated;
revoke all on public.admin_collaboration_subtasks from anon, authenticated;

grant select, insert, update on public.admin_collaboration_spaces to authenticated;
grant select, insert, update, delete on public.admin_collaboration_space_members to authenticated;
grant select, insert, update on public.admin_collaboration_tasks to authenticated;
grant select, insert, update on public.admin_collaboration_subtasks to authenticated;

drop policy if exists "Collaboration members can read spaces" on public.admin_collaboration_spaces;
create policy "Collaboration members can read spaces"
on public.admin_collaboration_spaces
for select
to authenticated
using (
  exists (
    select 1 from public.admin_collaboration_space_members m
    where m.space_id = id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration leaders can manage spaces" on public.admin_collaboration_spaces;
create policy "Collaboration leaders can manage spaces"
on public.admin_collaboration_spaces
for all
to authenticated
using (leader_user_id = (select auth.uid()))
with check (leader_user_id = (select auth.uid()));

drop policy if exists "Collaboration members can read members" on public.admin_collaboration_space_members;
create policy "Collaboration members can read members"
on public.admin_collaboration_space_members
for select
to authenticated
using (
  exists (
    select 1 from public.admin_collaboration_space_members m
    where m.space_id = space_id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration leaders can manage members" on public.admin_collaboration_space_members;
create policy "Collaboration leaders can manage members"
on public.admin_collaboration_space_members
for all
to authenticated
using (
  exists (
    select 1 from public.admin_collaboration_spaces s
    where s.id = space_id and s.leader_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_collaboration_spaces s
    where s.id = space_id and s.leader_user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration members can read tasks" on public.admin_collaboration_tasks;
create policy "Collaboration members can read tasks"
on public.admin_collaboration_tasks
for select
to authenticated
using (
  exists (
    select 1 from public.admin_collaboration_space_members m
    where m.space_id = space_id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration members can manage tasks" on public.admin_collaboration_tasks;
create policy "Collaboration members can manage tasks"
on public.admin_collaboration_tasks
for all
to authenticated
using (
  exists (
    select 1 from public.admin_collaboration_space_members m
    where m.space_id = space_id and m.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_collaboration_space_members m
    where m.space_id = space_id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration members can read subtasks" on public.admin_collaboration_subtasks;
create policy "Collaboration members can read subtasks"
on public.admin_collaboration_subtasks
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_collaboration_tasks t
    join public.admin_collaboration_space_members m on m.space_id = t.space_id
    where t.id = task_id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Collaboration members can manage subtasks" on public.admin_collaboration_subtasks;
create policy "Collaboration members can manage subtasks"
on public.admin_collaboration_subtasks
for all
to authenticated
using (
  assignee_user_id = (select auth.uid())
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    join public.admin_collaboration_spaces s on s.id = t.space_id
    where t.id = task_id and s.leader_user_id = (select auth.uid())
  )
)
with check (
  assignee_user_id = (select auth.uid())
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    join public.admin_collaboration_spaces s on s.id = t.space_id
    where t.id = task_id and s.leader_user_id = (select auth.uid())
  )
);
