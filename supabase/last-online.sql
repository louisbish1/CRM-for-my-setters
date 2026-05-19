create table if not exists public.user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_status add column if not exists role text;

alter table public.user_status enable row level security;

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
