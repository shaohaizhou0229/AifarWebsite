create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  work_email text not null,
  organization text,
  request_type text not null,
  message text not null,
  status text not null default 'new',
  source text not null default 'website_contact',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  alter table public.contact_requests
    add constraint contact_requests_request_type_check
    check (request_type in ('product_inquiry', 'technical_support', 'partnership', 'other'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contact_requests
    add constraint contact_requests_status_check
    check (status in ('new', 'in_progress', 'closed'));
exception
  when duplicate_object then null;
end $$;
