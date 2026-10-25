-- MINUS 30 — database schema.
--
-- The app is local-first. Each record the app stores on the device (profile, plans, meals, workouts,
-- rest days, weights, photo metadata, settings, coach messages…) is mirrored as one row of
-- public.user_records. The `sync` Edge Function writes and reads these rows inside a transaction
-- that runs as the `authenticated` role with the caller's JWT claims, so row-level security applies
-- to every read and write. Health data is never shared with advertising services.

create extension if not exists pgcrypto;

-- Synced records --------------------------------------------------------------------------------
create sequence public.user_records_seq;

create table public.user_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'profile', 'plan', 'food', 'foodDone', 'activity', 'rest', 'weight', 'photo',
    'savedMeal', 'customFood', 'settings', 'achievement', 'coach'
  )),
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,100}$'),
  data jsonb check (data is null or jsonb_typeof(data) = 'object'),
  deleted boolean not null default false,
  -- Last-write-wins clock: when the change was made on the device, plus a content hash tie-break.
  updated_at timestamptz not null,
  version text not null,
  -- Monotonic per change; clients pull everything after their last seen value.
  server_seq bigint not null default nextval('public.user_records_seq'),
  primary key (user_id, collection, id),
  check (deleted or data is not null),
  check (pg_column_size(data) <= 65536)
);

create index user_records_pull on public.user_records (user_id, server_seq);

-- The same workout (type, date, start time, duration) can't be stored twice, whatever device created it.
create unique index user_records_unique_workout on public.user_records (
  user_id, (data ->> 'type'), (data ->> 'date'), (data ->> 'startTime'), (data ->> 'durationMin')
) where collection = 'activity' and not deleted;

create or replace function public.bump_server_seq() returns trigger language plpgsql as $$
begin
  new.server_seq := nextval('public.user_records_seq');
  return new;
end $$;
create trigger user_records_seq before update on public.user_records for each row execute function public.bump_server_seq();

alter table public.user_records enable row level security;
create policy "read own records" on public.user_records for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own records" on public.user_records for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own records" on public.user_records for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own records" on public.user_records for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.user_records to authenticated;
grant usage on sequence public.user_records_seq to authenticated;

-- Server-only tables ------------------------------------------------------------------------------
-- Pro status comes only from verified store data (RevenueCat webhook or REST API). Users can read their own row.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'none' check (status in ('active', 'grace_period', 'billing_issue', 'expired', 'none')),
  product_id text,
  store text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "read own entitlement" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));
grant select on public.entitlements to authenticated;

-- AI request log for rate limiting and cost control. No images, prompts or replies are stored.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fn text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_fn_time on public.ai_usage (user_id, fn, created_at desc);
alter table public.ai_usage enable row level security; -- no policies: service role only

-- Retention: AI usage rows are only needed for rate limits. Schedule daily, e.g. with pg_cron:
--   select cron.schedule('purge-ai-usage', '17 3 * * *', 'select public.purge_ai_usage()');
create or replace function public.purge_ai_usage() returns void language sql security definer set search_path = public as $$
  delete from public.ai_usage where created_at < now() - interval '30 days';
$$;
revoke all on function public.purge_ai_usage() from public, anon, authenticated;

-- Nothing in public is reachable for anonymous callers.
revoke all on all tables in schema public from anon;

-- Private photo storage. Files live under "<user id>/<photo id>.jpg"; there are no public URLs. ----
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('workout-photos', 'workout-photos', false) on conflict (id) do nothing;

create policy "own photo files" on storage.objects for all to authenticated
  using (bucket_id in ('progress-photos', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('progress-photos', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
