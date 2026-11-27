-- Fixed search_path for the sync sequence trigger (Supabase security advisor 0011). Behaviour unchanged.
alter function public.bump_server_seq() set search_path = public, pg_temp;
