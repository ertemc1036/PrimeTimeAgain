-- Diet9: proven identities for Sign in with Apple and sign-up without email confirmation.
--
-- With "Confirm email" turned off, Supabase marks every new email account as confirmed at once, so
-- `email_confirmed_at` no longer proves that someone owns the address. This migration records a real
-- proof instead and uses it for two things:
--
-- 1. Founders Edition: a founder seat now needs a proven identity – Sign in with Apple, or an email
--    address confirmed with a code (sign-up code, login code or password-reset code). Mass sign-ups
--    with made-up addresses therefore get no seats.
-- 2. Account takeover protection: Supabase links an Apple ID automatically to an existing account
--    with the same email. Without proof, someone could pre-register another person's address with
--    their own password and later receive that person's Apple login. Linking a further sign-in
--    method to an email/password account is therefore only allowed once its email is proven.
--
-- Apply BEFORE turning off "Confirm email" (see docs/LIVE_SETUP.md): existing accounts are treated
-- as proven when they went through the confirmation that was required until then.

create table public.identity_proofs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- email_code: confirmed with an emailed code; apple: Sign in with Apple;
  -- email_confirmed: confirmed while email confirmation was required (existing accounts)
  method text not null check (method in ('email_code', 'apple', 'email_confirmed')),
  proven_at timestamptz not null default now()
);
alter table public.identity_proofs enable row level security; -- no policies: server only
revoke all on public.identity_proofs from anon, authenticated;

-- Record a proof (first one wins) and hand out a founder seat if one is left.
create or replace function public.record_identity_proof(p_user uuid, p_method text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.identity_proofs (user_id, method) values (p_user, p_method) on conflict (user_id) do nothing;
  -- The proof stays even if the seat can't be handed out now; the entitlement check retries.
  begin
    perform public.claim_founder_seat(p_user);
  exception when others then
    raise warning 'founder seat for % not assigned: %', p_user, sqlerrm;
  end;
end $$;
revoke all on function public.record_identity_proof(uuid, text) from public, anon, authenticated;

-- Founder seats now require a proven identity (instead of email_confirmed_at).
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
  select count(*) into v_taken from public.founder_seats;
  if v_taken >= coalesce(v_capacity, 0) then return null; end if;

  if not exists (select 1 from public.identity_proofs p where p.user_id = p_user)
     or not exists (select 1 from auth.users u where u.id = p_user and coalesce(u.is_anonymous, false) = false) then
    return null;
  end if;

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

-- Proof 1: a session started with an emailed code. Supabase records how each session was started in
-- auth.mfa_amr_claims ('otp' = login code, 'recovery' = password-reset code, 'email/signup' and
-- 'magiclink' = confirmation). Never blocks the login.
create or replace function public.identity_proof_from_session() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid;
begin
  if new.authentication_method in ('otp', 'recovery', 'magiclink', 'email/signup', 'invite', 'email_change') then
    begin
      select user_id into v_user from auth.sessions where id = new.session_id;
      if v_user is not null then perform public.record_identity_proof(v_user, 'email_code'); end if;
    exception when others then
      raise warning 'identity proof for session % not recorded: %', new.session_id, sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke all on function public.identity_proof_from_session() from public, anon, authenticated;
create trigger identity_proof_on_session after insert on auth.mfa_amr_claims
  for each row execute function public.identity_proof_from_session();

-- Proof 2: the email was confirmed while confirmation was required (null → set on an existing
-- account). Replaces the founder trigger function of 20261030000000 (same trigger, new body).
create or replace function public.founder_seat_on_verified() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  begin
    perform public.record_identity_proof(new.id, 'email_code');
  exception when others then
    raise warning 'identity proof for % not recorded: %', new.id, sqlerrm;
  end;
  return new;
end $$;
-- Accounts confirmed automatically (confirmation turned off) prove nothing: Supabase sets
-- email_confirmed_at right after creating them, but never sends a confirmation email, so
-- confirmation_sent_at stays empty.
drop trigger if exists founder_seat_on_insert on auth.users;
drop trigger if exists founder_seat_on_confirm on auth.users;
create trigger identity_proof_on_confirm after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null and new.confirmation_sent_at is not null)
  execute function public.founder_seat_on_verified();

-- Proof 3 and link protection: Sign in with Apple.
create or replace function public.identity_link_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  -- Adding Apple (or any other provider) to an existing email/password account requires that the
  -- account's email is proven; otherwise a pre-registered stranger's account could take over.
  if new.provider <> 'email'
     and exists (select 1 from auth.identities i where i.user_id = new.user_id and i.provider = 'email')
     and not exists (select 1 from public.identity_proofs p where p.user_id = new.user_id) then
    raise exception 'diet9_link_requires_verified_email'
      using hint = 'Confirm the account email with a code before linking another sign-in method.';
  end if;
  return new;
end $$;
revoke all on function public.identity_link_guard() from public, anon, authenticated;
create trigger identity_link_guard before insert on auth.identities
  for each row execute function public.identity_link_guard();

create or replace function public.identity_proof_from_apple() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  begin
    perform public.record_identity_proof(new.user_id, 'apple');
  exception when others then
    raise warning 'apple identity proof for % not recorded: %', new.user_id, sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.identity_proof_from_apple() from public, anon, authenticated;
create trigger identity_proof_on_apple after insert on auth.identities
  for each row when (new.provider = 'apple') execute function public.identity_proof_from_apple();

-- Is the caller's identity proven? (for the app: show "confirm your email" only when needed)
create or replace function public.identity_proven(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.identity_proofs where user_id = p_user);
$$;
revoke all on function public.identity_proven(uuid) from public, anon, authenticated;

-- Backfill, oldest first: founders keep their seats and count as proven; accounts that went through
-- the email confirmation, Apple accounts and accounts with a code-based session are proven.
insert into public.identity_proofs (user_id, method, proven_at)
select s.user_id, 'email_confirmed', s.granted_at from public.founder_seats s where s.user_id is not null
on conflict (user_id) do nothing;

insert into public.identity_proofs (user_id, method, proven_at)
select u.id, 'email_confirmed', u.email_confirmed_at from auth.users u
where u.email_confirmed_at is not null and u.confirmation_sent_at is not null and coalesce(u.is_anonymous, false) = false
on conflict (user_id) do nothing;

insert into public.identity_proofs (user_id, method, proven_at)
select distinct on (i.user_id) i.user_id, 'apple', coalesce(i.created_at, now()) from auth.identities i where i.provider = 'apple'
order by i.user_id, i.created_at
on conflict (user_id) do nothing;

insert into public.identity_proofs (user_id, method, proven_at)
select distinct on (s.user_id) s.user_id, 'email_code', c.created_at
from auth.mfa_amr_claims c join auth.sessions s on s.id = c.session_id
where c.authentication_method in ('otp', 'recovery', 'magiclink', 'email/signup', 'invite', 'email_change')
order by s.user_id, c.created_at
on conflict (user_id) do nothing;

do $$
declare r record;
begin
  for r in
    select p.user_id from public.identity_proofs p
    where not exists (select 1 from public.founder_seats s where s.user_id = p.user_id)
    order by p.proven_at, p.user_id
  loop
    exit when public.claim_founder_seat(r.user_id) is null;
  end loop;
end $$;
