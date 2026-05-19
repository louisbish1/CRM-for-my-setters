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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists user_email text;

alter table public.approved_users add column if not exists is_admin boolean not null default false;
alter table public.leads add column if not exists created_by_user_id uuid;
alter table public.leads add column if not exists created_by_email text;
alter table public.leads add column if not exists created_by_name text;
alter table public.leads add column if not exists archived boolean not null default false;
alter table public.leads drop column if exists created_by;

alter table public.approved_users enable row level security;
alter table public.leads enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_status enable row level security;

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
drop policy if exists "Lead creators can update their leads" on public.leads;
create policy "Lead creators can update their leads"
on public.leads
for update
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
  and (
    created_by_user_id = auth.uid()
    or exists (
      select 1
      from public.approved_users
      where approved_users.email = auth.jwt() ->> 'email'
        and approved_users.is_admin = true
    )
  )
  and archived = false
)
with check (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
  and (
    created_by_user_id = auth.uid()
    or exists (
      select 1
      from public.approved_users
      where approved_users.email = auth.jwt() ->> 'email'
        and approved_users.is_admin = true
    )
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
  and archived = true
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

drop policy if exists "Approved users can read user status" on public.user_status;
create policy "Approved users can read user status"
on public.user_status
for select
to authenticated
using (
  exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

drop policy if exists "Approved users can insert their own status" on public.user_status;
create policy "Approved users can insert their own status"
on public.user_status
for insert
to authenticated
with check (
  user_id = auth.uid()
  and email = auth.jwt() ->> 'email'
  and exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

drop policy if exists "Approved users can update their own status" on public.user_status;
create policy "Approved users can update their own status"
on public.user_status
for update
to authenticated
using (
  user_id = auth.uid()
  and email = auth.jwt() ->> 'email'
  and exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
)
with check (
  user_id = auth.uid()
  and email = auth.jwt() ->> 'email'
  and exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
  )
);

insert into public.approved_users (email, is_admin)
values ('louisbish0612@gmail.com', true)
on conflict (email) do update set is_admin = excluded.is_admin;

drop policy if exists "Admins can manage their own push subscriptions" on public.push_subscriptions;
create policy "Admins can manage their own push subscriptions"
on public.push_subscriptions
for all
to authenticated
using (
  user_id = auth.uid()
  and user_email = auth.jwt() ->> 'email'
  and exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
      and approved_users.is_admin = true
  )
)
with check (
  user_id = auth.uid()
  and user_email = auth.jwt() ->> 'email'
  and exists (
    select 1
    from public.approved_users
    where approved_users.email = auth.jwt() ->> 'email'
      and approved_users.is_admin = true
  )
);

-- Add allowed staff manually, for example:
-- insert into public.approved_users (email) values ('setter@company.com');
