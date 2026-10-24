-- PrimeTimeAgain: DRAFT Supabase schema. NOT applied to any project.
-- Review and approve before creating production infrastructure.
-- Every table is protected by Row Level Security: users can only access their own rows.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  language text not null default 'en',
  prime_memory text,
  memory_special text, memory_changed text, memory_regain text,
  starting_point jsonb not null default '{}'::jsonb,
  avatar jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.comeback_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  duration_days int not null check (duration_days between 14 and 365),
  daily_minutes int not null check (daily_minutes between 5 and 240),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text,                -- null for custom goals
  title text,                      -- custom goal name
  area text not null check (area in ('body','mind','money','social','lifestyle','presence')),
  starting_point text not null default '',
  desired_outcome text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.goal_actions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.user_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text,
  title text,
  minutes int not null check (minutes between 1 and 240),
  difficulty int not null check (difficulty between 1 and 3),
  active boolean not null default true
);

create table public.day_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,              -- the user's local calendar date
  generated boolean not null default false,
  recovery boolean not null default false,
  primary key (user_id, date)
);

create table public.missions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  goal_id uuid references public.user_goals (id) on delete set null,
  action_template_id text,
  title text,
  minutes int not null,
  difficulty int not null,
  status text not null check (status in ('open','done','skipped','postponed')),
  completed_at timestamptz,
  carried_from date,
  primary key (user_id, id),
  foreign key (user_id, date) references public.day_records (user_id, date) on delete cascade
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood int not null check (mood between 1 and 5),
  prompt_key text,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  metric text not null check (metric in ('weight','waist','confidence','energy')),
  value numeric not null,
  created_at timestamptz not null default now()
);

create table public.consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,              -- e.g. 'coach_reads_reflections', 'selfie_processing'
  granted boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

-- Progress photos are NOT stored in Supabase by default (device-only). If cloud backup is ever added,
-- use a private Storage bucket with per-user folder policies and explicit opt-in.

-- Row Level Security
do $$
declare t text;
begin
  foreach t in array array['comeback_programs','user_goals','goal_actions','day_records','missions','reflections','measurements','consents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy own_rows on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- History protection (server side): only today's missions may change. The app sends its local date;
-- an Edge Function or trigger should reject updates where date < (user's local today).
