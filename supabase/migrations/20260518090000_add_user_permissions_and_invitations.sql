alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists admin_permissions text[] not null default '{}'::text[],
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists deletion_reason text;

do $$
begin
  alter table public.profiles
    add constraint profiles_account_status_check
    check (account_status in ('active', 'deactivated', 'deleted'));
exception
  when duplicate_object then null;
end $$;

update public.profiles
set admin_permissions = array[
  'admin.users',
  'admin.product',
  'admin.downloads',
  'admin.docs',
  'admin.support',
  'admin.contact'
]
where role = 'admin'
  and (admin_permissions is null or cardinality(admin_permissions) = 0);

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  organization text,
  job_title text,
  country_region text,
  phone text,
  role text not null default 'user',
  admin_permissions text[] not null default '{}'::text[],
  status text not null default 'pending',
  invited_by_user_id uuid references public.profiles(id) on delete set null,
  accepted_by_user_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  canceled_at timestamptz,
  canceled_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.user_invitations
    add constraint user_invitations_role_check
    check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.user_invitations
    add constraint user_invitations_status_check
    check (status in ('pending', 'accepted', 'canceled'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists user_invitations_pending_email_unique_idx
  on public.user_invitations (lower(email))
  where status = 'pending';

create index if not exists user_invitations_status_idx
  on public.user_invitations (status);

alter table public.user_invitations enable row level security;

revoke all on public.user_invitations from anon, authenticated;
grant select, insert, update on public.user_invitations to authenticated;

drop policy if exists "Admins can manage user invitations" on public.user_invitations;
create policy "Admins can manage user invitations"
on public.user_invitations
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
