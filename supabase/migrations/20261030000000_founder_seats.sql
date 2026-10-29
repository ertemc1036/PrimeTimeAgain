-- Diet9 Founders Edition: the first 1,000 verified accounts get Diet9 Pro for free, for good.
--
-- * A seat is stored permanently in public.founder_seats (one per account, numbered 1..capacity).
-- * Only verified accounts get a seat: email confirmed, not anonymous.
-- * Seats are handed out by the database itself (trigger on auth.users), so neither the app nor a
--   manipulated request can grant one. Parallel sign-ups are serialised with an advisory lock, and
--   the unique constraints make double seats impossible even without it.
-- * Accounts that already exist and are verified get seats in the order they were verified.
-- * A seat is never handed out twice: if a founder deletes their account, the seat stays used.
-- * No payment, no subscription: the seat is not connected to the store in any way.
--
-- Safe to run once on the production project (`supabase db push`), only after the owner approves.

create table public.founder_settings (
  id boolean primary key default true check (id),
  capacity integer not null check (capacity >= 0)
);
insert into public.founder_settings (id, capacity) values (true, 1000);
alter table public.founder_settings enable row level security; -- no policies: service role only

create table public.founder_seats (
  seat_no integer primary key check (seat_no >= 1),
  -- null after the founder deleted their account; the seat stays used
  user_id uuid unique references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.founder_seats enable row level security;
create policy "read own founder seat" on public.founder_seats for select to authenticated using (user_id = (select auth.uid()));
-- Supabase grants new tables to anon/authenticated by default; only reading the own seat is allowed.
revoke all on public.founder_settings, public.founder_seats from anon, authenticated;
grant select on public.founder_seats to authenticated;

-- Give the account a seat if it is verified and seats are left. Idempotent; returns the seat number
-- or null. Callable only by the server (trigger, service role).
create or replace function public.claim_founder_seat(p_user uuid) returns integer
language plpgsql security definer set search_path = public, auth as $$
declare
  v_seat integer;
  v_capacity integer;
  v_taken integer;
begin
  select seat_no into v_seat from public.founder_seats where user_id = p_user;
  if v_seat is not null then return v_seat; end if;

  select capacity into v_capacity from public.founder_settings where id;
  -- Cheap exit once all seats are gone (no lock needed: the count only grows).
  select count(*) into v_taken from public.founder_seats;
  if v_taken >= coalesce(v_capacity, 0) then return null; end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_user and u.email_confirmed_at is not null and coalesce(u.is_anonymous, false) = false
  ) then
    return null;
  end if;

  -- One claim at a time across all sessions until this transaction ends.
  perform pg_advisory_xact_lock(hashtext('diet9_founder_seats'));
  select seat_no into v_seat from public.founder_seats where user_id = p_user;
  if v_seat is not null then return v_seat; end if;
  select count(*) into v_taken from public.founder_seats;
  if v_taken >= v_capacity then return null; end if;

  insert into public.founder_seats (seat_no, user_id) values (v_taken + 1, p_user)
  returning seat_no into v_seat;
  return v_seat;
end $$;
revoke all on function public.claim_founder_seat(uuid) from public, anon, authenticated;

-- Seats handed out and total, for the counter in the app ("742 of 1,000"). Exposes counts only;
-- the app reads it through the public `founders` Edge Function.
create or replace function public.founder_seats_status() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'capacity', (select capacity from public.founder_settings where id),
    'taken', (select count(*)::int from public.founder_seats)
  );
$$;
revoke all on function public.founder_seats_status() from public, anon, authenticated;

-- Hand out the seat when an account becomes verified (at sign-up with auto-confirm, or when the
-- email code is confirmed). Never blocks sign-up: errors only raise a warning, and the entitlement
-- check claims the seat again later.
create or replace function public.founder_seat_on_verified() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  begin
    perform public.claim_founder_seat(new.id);
  exception when others then
    raise warning 'founder seat for % not assigned: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.founder_seat_on_verified() from public, anon, authenticated;

create trigger founder_seat_on_insert after insert on auth.users
  for each row when (new.email_confirmed_at is not null) execute function public.founder_seat_on_verified();
create trigger founder_seat_on_confirm after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.founder_seat_on_verified();

-- Existing verified accounts, in the order they were verified (then registered).
do $$
declare r record;
begin
  for r in
    select id from auth.users
    where email_confirmed_at is not null and coalesce(is_anonymous, false) = false
    order by email_confirmed_at, created_at, id
  loop
    exit when public.claim_founder_seat(r.id) is null;
  end loop;
end $$;
