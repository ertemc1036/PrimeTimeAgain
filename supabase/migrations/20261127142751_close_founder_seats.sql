-- Founders Edition closed: no further lifetime seats. The capacity is set to the seats already
-- handed out, so claim_founder_seat() returns null for everyone new; existing seats (and their
-- PrimeMe+) stay untouched. To reopen later, raise the capacity again.
update public.founder_settings
set capacity = (select count(*) from public.founder_seats)
where id;
