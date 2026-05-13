create table if not exists public.profiles (
  id uuid primary key,
  email text not null,
  display_name text,
  organization text,
  job_title text,
  country_region text,
  phone text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));

alter table public.contact_requests
  add column if not exists user_id uuid,
  add column if not exists subject text,
  add column if not exists last_replied_at timestamptz,
  add column if not exists closed_at timestamptz;

create index if not exists contact_requests_user_id_idx
  on public.contact_requests (user_id);

create index if not exists contact_requests_work_email_idx
  on public.contact_requests (lower(work_email));

create index if not exists contact_requests_status_idx
  on public.contact_requests (status);

create table if not exists public.contact_request_replies (
  id uuid primary key default gen_random_uuid(),
  contact_request_id uuid not null references public.contact_requests(id) on delete cascade,
  author_user_id uuid not null,
  author_role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.contact_request_replies
    add constraint contact_request_replies_author_role_check
    check (author_role in ('user', 'admin'));
exception
  when duplicate_object then null;
end $$;

create index if not exists contact_request_replies_request_id_idx
  on public.contact_request_replies (contact_request_id);
