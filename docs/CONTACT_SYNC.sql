-- Contacts sync support
-- 1) Add phone column (if not present)
alter table public.profiles
  add column if not exists phone text;

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

-- 2) RPC for matching contacts
create or replace function public.match_contact_phones(
  current_user_id uuid,
  phones text[]
)
returns table (
  id uuid,
  username text,
  avatar_url text,
  is_focusing boolean,
  current_streak int4,
  last_focus_date date,
  phone text
)
language sql
stable
as $$
  select
    p.id,
    p.username,
    p.avatar_url,
    p.is_focusing,
    p.current_streak,
    p.last_focus_date,
    p.phone
  from public.profiles p
  where p.phone is not null
    and p.phone = any(phones)
    and p.id <> current_user_id;
$$;
