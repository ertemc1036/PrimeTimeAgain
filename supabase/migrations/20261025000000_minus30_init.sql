-- MINUS 30 — initial schema.
-- Every user-owned table is protected by row-level security: a signed-in user can only read and
-- write their own rows. Entitlements and AI usage are written only by Edge Functions (service role).
-- Health data is never shared with advertising services.

create extension if not exists "pgcrypto";

-- Profiles ---------------------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  adult_confirmed boolean not null check (adult_confirmed),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  height_cm numeric check (height_cm between 120 and 230),
  start_weight_kg numeric check (start_weight_kg between 30 and 350),
  goal_weight_kg numeric check (goal_weight_kg between 30 and 350),
  goals text[] not null default '{}',
  activity_prefs text[] not null default '{}',
  food_prefs jsonb not null default '{}'::jsonb,
  planning_time text not null default '20:30',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily plans (one per user per local date) -------------------------------------------------------
create table public.day_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meals jsonb not null default '[]'::jsonb,
  flexible_meals boolean not null default false,
  activity jsonb,
  saved_at timestamptz,
  saved_on date,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.food_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  consumed_at timestamptz not null,
  local_time text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null check (char_length(title) between 1 and 80),
  items jsonb not null default '[]'::jsonb,
  notes text,
  entry_method text not null check (entry_method in ('manual', 'plan', 'ai')),
  plan_meal_id text,
  ai_estimated boolean not null default false,
  outside_window boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_date on public.food_logs (user_id, date);

create table public.food_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.activity_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('gym', 'outdoor_walk', 'outdoor_run', 'home')),
  start_time text not null,
  duration_min int not null check (duration_min between 1 and 600),
  description text not null check (char_length(description) between 2 and 200),
  entry_method text not null check (entry_method in ('manual', 'photo')),
  photo_path text,
  ai_environment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The same workout can't be saved twice.
  unique (user_id, type, date, start_time, duration_min)
);
create index activity_logs_user_date on public.activity_logs (user_id, date);

create table public.recovery_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.weight_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kg numeric not null check (kg between 30 and 350),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.progress_photos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.saved_meals (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  meal_type text,
  items jsonb not null default '[]'::jsonb,
  favorite boolean not null default false,
  last_used_at timestamptz not null default now()
);

create table public.custom_foods (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  serving_label text not null,
  serving_grams numeric,
  per_serving jsonb not null
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notifications jsonb not null default '{}'::jsonb,
  eating_window jsonb not null default '{}'::jsonb,
  journey jsonb not null default '{}'::jsonb,
  coach_consent boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.coach_messages (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);

-- Server-only tables --------------------------------------------------------------------------------
-- Entitlements come only from verified store events (RevenueCat webhook). Users can read their own row.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  status text not null default 'none' check (status in ('active', 'grace_period', 'billing_issue', 'expired', 'none')),
  product_id text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Per-request AI usage for rate limiting and cost control (no images or message content stored).
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fn text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_fn_time on public.ai_usage (user_id, fn, created_at desc);

-- Row-level security -------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'day_plans', 'food_logs', 'food_completions', 'activity_logs', 'recovery_logs',
    'weight_entries', 'progress_photos', 'saved_meals', 'custom_foods', 'user_settings',
    'achievements', 'coach_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.entitlements enable row level security;
create policy "read own entitlement" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));

alter table public.ai_usage enable row level security; -- no policies: service role only

-- Private storage (no public URLs). Files live under "<user id>/..." -----------------------------
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('workout-photos', 'workout-photos', false) on conflict (id) do nothing;

create policy "own photo files" on storage.objects for all to authenticated
  using (bucket_id in ('progress-photos', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('progress-photos', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
