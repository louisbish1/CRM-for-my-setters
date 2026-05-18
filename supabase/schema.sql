create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'lead_status'
  ) then
    create type public.lead_status as enum (
      'New',
      'Contacted',
      'Interested',
      'Call Booked',
      'Won',
      'Lost'
    );
  end if;
end
$$;

create table if not exists public.approved_users (
  email text primary key,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  need text,
  estimated_value numeric(12,2),
  status public.lead_status not null default 'New',
  notes text,
  created_by_user_id uuid not null references auth.users(id),
  created_by_email text not null,
  created_by_name text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.approved_users add column if not exists is_admin boolean not null default false;
alter table public.leads add column if not exists created_by_user_id uuid;
alter table public.leads add column if not exists created_by_email text;
alter table public.leads add column if not exists created_by_name text;
alter table public.leads add column if not exists archived boolean not null default false;
alter table public.leads drop column if exists created_by;

alter table public.approved_users enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Approved users can read themselves" on public.approved_users;
create policy "Approved users can read themselves"
on public.approved_users
for select
to authenticated
using (auth.jwt() ->> 'email' = email);

drop policy if exists "Approved users can read leads" on public.leads;
create policy "Approved users can read leads"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

drop policy if exists "Approved users can insert leads" on public.leads;
create policy "Approved users can insert leads"
on public.leads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
  and created_by_user_id = auth.uid()
  and created_by_email = auth.jwt() ->> 'email'
);

drop policy if exists "Approved users can update leads" on public.leads;
create policy "Approved users can update leads"
on public.leads
for update
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
  and archived = false
)
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
  and archived = false
);

drop policy if exists "Admins can archive leads" on public.leads;
create policy "Admins can archive leads"
on public.leads
for update
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
      and approved_users.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
      and approved_users.is_admin = true
  )
);

drop policy if exists "Approved users can delete leads" on public.leads;
drop policy if exists "Only admins can delete leads" on public.leads;
create policy "Only admins can delete leads"
on public.leads
for delete
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
      and approved_users.is_admin = true
  )
);

insert into public.approved_users (email, is_admin)
values ('louisbish0612@gmail.com', true)
on conflict (email) do update set is_admin = excluded.is_admin;

-- Add allowed staff manually, for example:
-- insert into public.approved_users (email) values ('setter@company.com');
