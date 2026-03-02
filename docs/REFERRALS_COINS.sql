-- Referrals + Coins MVP
-- Run this script in Supabase SQL Editor.

-- 1) Profiles: referral and coin fields
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists coins_balance bigint not null default 0;

create unique index if not exists profiles_referral_code_unique_idx
  on public.profiles (referral_code)
  where referral_code is not null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by);

-- Keep protected fields immutable from client-side updates.
revoke update (referral_code, referred_by, coins_balance) on public.profiles from authenticated;

-- 2) Ledger table for coin history
create table if not exists public.coin_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coin_transactions_user_created_idx
  on public.coin_transactions (user_id, created_at desc);

alter table public.coin_transactions enable row level security;

drop policy if exists coin_transactions_select_own on public.coin_transactions;
create policy coin_transactions_select_own
  on public.coin_transactions
  for select
  using (user_id = (select auth.uid()));

-- 3) Referrals table for audit + qualification state
create table if not exists public.referrals (
  id bigserial primary key,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null unique references public.profiles(id) on delete cascade,
  code_used text not null,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'cancelled')),
  inviter_reward bigint not null default 100,
  invitee_reward bigint not null default 30,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referrals_inviter_status_idx
  on public.referrals (inviter_id, status);

create index if not exists referrals_invitee_status_idx
  on public.referrals (invitee_id, status);

alter table public.referrals enable row level security;

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals
  for select
  using (
    inviter_id = (select auth.uid())
    or invitee_id = (select auth.uid())
  );

-- 4) Helpers for referral code
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1
      from public.profiles p
      where p.referral_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

create or replace function public.set_referral_code_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if tg_op = 'INSERT' then
    if new.referral_code is null or length(trim(new.referral_code)) = 0 then
      new.referral_code := public.generate_referral_code();
    else
      new.referral_code := upper(trim(new.referral_code));
    end if;
    new.referred_by := null;
    new.coins_balance := coalesce(new.coins_balance, 0);
    return new;
  end if;

  if current_setting('productivy.allow_protected_profile_update', true) = '1' then
    return new;
  end if;

  -- Keep these values immutable in normal profile updates.
  new.referral_code := old.referral_code;
  new.referred_by := old.referred_by;
  new.coins_balance := old.coins_balance;

  return new;
end;
$$;

drop trigger if exists before_profile_referral_guard on public.profiles;
create trigger before_profile_referral_guard
before insert or update on public.profiles
for each row
execute function public.set_referral_code_on_profile();

-- Backfill users without code.
update public.profiles p
set referral_code = public.generate_referral_code()
where p.referral_code is null or length(trim(p.referral_code)) = 0;

-- 5) RPC: claim referral code (one-time)
create or replace function public.claim_referral_code(
  p_code text
)
returns table (
  inviter_id uuid,
  invitee_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_code text;
  v_inviter_id uuid;
  v_invitee_id uuid;
begin
  v_invitee_id := (select auth.uid());
  if v_invitee_id is null then
    raise exception 'Not authenticated';
  end if;

  v_code := upper(trim(coalesce(p_code, '')));
  if length(v_code) < 4 then
    raise exception 'Invalid referral code';
  end if;

  select p.id
  into v_inviter_id
  from public.profiles p
  where p.referral_code = v_code
  limit 1;

  if v_inviter_id is null then
    raise exception 'Referral code not found';
  end if;

  if v_inviter_id = v_invitee_id then
    raise exception 'You cannot use your own referral code';
  end if;

  perform set_config('productivy.allow_protected_profile_update', '1', true);

  update public.profiles p
  set referred_by = v_inviter_id
  where p.id = v_invitee_id
    and p.referred_by is null;

  if not found then
    raise exception 'Referral code already claimed';
  end if;

  insert into public.referrals (inviter_id, invitee_id, code_used, status)
  values (v_inviter_id, v_invitee_id, v_code, 'pending')
  on conflict (invitee_id) do nothing;

  return query
  select v_inviter_id, v_invitee_id, 'pending'::text;
end;
$$;

grant execute on function public.claim_referral_code(text) to authenticated;

-- 6) Reward on first qualified focus session (>= 10 min)
create or replace function public.process_referral_on_focus_session()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_referral_id bigint;
  v_inviter_id uuid;
  v_invitee_id uuid;
  v_inviter_reward bigint;
  v_invitee_reward bigint;
begin
  if new.minutes < 10 then
    return new;
  end if;

  with target as (
    select r.id, r.inviter_id, r.invitee_id, r.inviter_reward, r.invitee_reward
    from public.referrals r
    where r.invitee_id = new.user_id
      and r.status = 'pending'
    order by r.created_at asc
    limit 1
    for update
  ), marked as (
    update public.referrals r
    set
      status = 'qualified',
      qualified_at = now(),
      rewarded_at = now()
    from target t
    where r.id = t.id
      and r.status = 'pending'
    returning t.id, t.inviter_id, t.invitee_id, t.inviter_reward, t.invitee_reward
  )
  select m.id, m.inviter_id, m.invitee_id, m.inviter_reward, m.invitee_reward
  into v_referral_id, v_inviter_id, v_invitee_id, v_inviter_reward, v_invitee_reward
  from marked m;

  if v_referral_id is null then
    return new;
  end if;

  perform set_config('productivy.allow_protected_profile_update', '1', true);

  update public.profiles
  set coins_balance = coins_balance + v_inviter_reward
  where id = v_inviter_id;

  update public.profiles
  set coins_balance = coins_balance + v_invitee_reward
  where id = v_invitee_id;

  insert into public.coin_transactions (user_id, amount, reason, metadata)
  values
    (
      v_inviter_id,
      v_inviter_reward,
      'referral_inviter_bonus',
      jsonb_build_object(
        'referral_id', v_referral_id,
        'invitee_id', v_invitee_id
      )
    ),
    (
      v_invitee_id,
      v_invitee_reward,
      'referral_invitee_bonus',
      jsonb_build_object(
        'referral_id', v_referral_id,
        'inviter_id', v_inviter_id
      )
    );

  return new;
end;
$$;

drop trigger if exists on_focus_session_referral_reward on public.focus_sessions;
create trigger on_focus_session_referral_reward
after insert on public.focus_sessions
for each row
execute function public.process_referral_on_focus_session();

-- 7) RPC: summary for profile UI
create or replace function public.get_my_referral_summary()
returns table (
  referral_code text,
  coins_balance bigint,
  total_referrals integer,
  pending_referrals integer,
  qualified_referrals integer
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    p.referral_code,
    p.coins_balance,
    coalesce(count(r.id), 0)::int as total_referrals,
    coalesce(sum(case when r.status = 'pending' then 1 else 0 end), 0)::int as pending_referrals,
    coalesce(sum(case when r.status = 'qualified' then 1 else 0 end), 0)::int as qualified_referrals
  from public.profiles p
  left join public.referrals r on r.inviter_id = p.id
  where p.id = (select auth.uid())
  group by p.id;
$$;

grant execute on function public.get_my_referral_summary() to authenticated;

-- 8) RPC: coin history for own profile
create or replace function public.get_my_coin_transactions(
  p_limit integer default 20
)
returns table (
  id bigint,
  amount bigint,
  reason text,
  metadata jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    ct.id,
    ct.amount,
    ct.reason,
    ct.metadata,
    ct.created_at
  from public.coin_transactions ct
  where ct.user_id = (select auth.uid())
  order by ct.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

grant execute on function public.get_my_coin_transactions(integer) to authenticated;
