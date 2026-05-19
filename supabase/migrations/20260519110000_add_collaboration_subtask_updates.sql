create table if not exists public.admin_collaboration_subtask_updates (
  id uuid primary key default gen_random_uuid(),
  subtask_id uuid not null references public.admin_collaboration_subtasks(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  previous_status text,
  status text,
  message text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.admin_collaboration_subtask_updates
    add constraint admin_collaboration_subtask_updates_status_check
    check (status is null or status in ('not_started', 'in_progress', 'blocked', 'completed'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.admin_collaboration_subtask_updates
    add constraint admin_collaboration_subtask_updates_previous_status_check
    check (previous_status is null or previous_status in ('not_started', 'in_progress', 'blocked', 'completed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists admin_collaboration_subtask_updates_subtask_idx
  on public.admin_collaboration_subtask_updates (subtask_id, created_at desc);

create index if not exists admin_collaboration_subtask_updates_author_idx
  on public.admin_collaboration_subtask_updates (author_user_id, created_at desc);

alter table public.admin_collaboration_subtask_updates enable row level security;

revoke all on public.admin_collaboration_subtask_updates from anon, authenticated;
grant select, insert on public.admin_collaboration_subtask_updates to authenticated;

drop policy if exists "Collaboration members can manage subtasks" on public.admin_collaboration_subtasks;
create policy "Collaboration members can manage subtasks"
on public.admin_collaboration_subtasks
for all
to authenticated
using (
  assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    where t.id = admin_collaboration_subtasks.task_id
      and t.created_by_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    join public.admin_collaboration_spaces s on s.id = t.space_id
    join public.admin_collaboration_space_members m on m.space_id = s.id
    where t.id = admin_collaboration_subtasks.task_id
      and m.user_id = auth.uid()
      and (s.leader_user_id = auth.uid() or m.member_role = 'leader')
  )
)
with check (
  assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    where t.id = admin_collaboration_subtasks.task_id
      and t.created_by_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.admin_collaboration_tasks t
    join public.admin_collaboration_spaces s on s.id = t.space_id
    join public.admin_collaboration_space_members m on m.space_id = s.id
    where t.id = admin_collaboration_subtasks.task_id
      and m.user_id = auth.uid()
      and (s.leader_user_id = auth.uid() or m.member_role = 'leader')
  )
);

drop policy if exists "Collaboration members can read subtask updates" on public.admin_collaboration_subtask_updates;
create policy "Collaboration members can read subtask updates"
on public.admin_collaboration_subtask_updates
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_collaboration_subtasks st
    join public.admin_collaboration_tasks t on t.id = st.task_id
    join public.admin_collaboration_space_members m on m.space_id = t.space_id
    where st.id = admin_collaboration_subtask_updates.subtask_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Collaboration subtask actors can create updates" on public.admin_collaboration_subtask_updates;
create policy "Collaboration subtask actors can create updates"
on public.admin_collaboration_subtask_updates
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.admin_collaboration_subtasks st
    join public.admin_collaboration_tasks t on t.id = st.task_id
    join public.admin_collaboration_spaces s on s.id = t.space_id
    join public.admin_collaboration_space_members m on m.space_id = t.space_id
    where st.id = admin_collaboration_subtask_updates.subtask_id
      and m.user_id = auth.uid()
      and (
        st.assignee_user_id = auth.uid()
        or st.created_by_user_id = auth.uid()
        or t.created_by_user_id = auth.uid()
        or s.leader_user_id = auth.uid()
        or m.member_role = 'leader'
      )
  )
);
