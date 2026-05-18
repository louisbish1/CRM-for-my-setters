create extension if not exists "pgcrypto";

create type public.lead_status as enum (
  'New',
  'Contacted',
  'Interested',
  'Call Booked',
  'Won',
  'Lost'
);

create table public.approved_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  need text,
  estimated_value numeric(12,2),
  status public.lead_status not null default 'New',
  notes text,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table public.approved_users enable row level security;
alter table public.leads enable row level security;

create policy "Approved users can read themselves"
on public.approved_users
for select
using (auth.jwt() ->> 'email' = email);

create policy "Approved users can read leads"
on public.leads
for select
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

create policy "Approved users can insert leads"
on public.leads
for insert
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

create policy "Approved users can update leads"
on public.leads
for update
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

create policy "Approved users can delete leads"
on public.leads
for delete
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

-- Add allowed staff manually, for example:
-- insert into public.approved_users (email) values ('setter@company.com');
