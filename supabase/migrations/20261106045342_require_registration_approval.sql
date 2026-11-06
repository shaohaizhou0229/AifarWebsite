-- Version assigned by Supabase apply_migration.
alter table public.profiles drop constraint profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active', 'pending_approval', 'deactivated', 'deleted'));
alter table public.profiles alter column account_status set default 'pending_approval';
