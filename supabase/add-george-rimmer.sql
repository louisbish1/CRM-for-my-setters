insert into public.approved_users (email, is_admin)
values ('georgerim7@gmail.com', false)
on conflict (email) do update set is_admin = excluded.is_admin;
