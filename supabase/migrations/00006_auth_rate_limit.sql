-- ============================================================
-- Phase 5 migration: auth attempt rate limiting
-- Persists failed admin-password attempts keyed by a client
-- fingerprint so the limit survives Vercel cold starts (in-memory
-- maps alone are unreliable across ephemeral serverless instances).
-- ============================================================

create table if not exists public.tblAuthAttempts (
  fingerprint text primary key,
  attempt_count integer not null default 0,
  locked_until text,           -- ISO timestamp or null
  updated_at text not null default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
);

-- Lock the fingerprint row FOR UPDATE and return current state.
create or replace function public.lock_auth_attempt(p_fingerprint text)
returns table (attempt_count integer, locked_until text)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tblauthattempts (fingerprint, attempt_count, locked_until)
  values (p_fingerprint, 0, null)
  on conflict (fingerprint) do nothing;
  return query
    select a.attempt_count::integer, a.locked_until::text
    from public.tblauthattempts a
    where a.fingerprint = p_fingerprint
    for update;
end;
$$;

-- RLS: Server Actions use the service_role key (bypasses RLS), matching
-- the no-RLS reality. Defense-in-depth for any authenticated role.
alter table public.tblAuthAttempts enable row level security;

drop policy if exists "auth_attempts_app" on public.tblAuthAttempts;
create policy "auth_attempts_app" on public.tblAuthAttempts
  for all to authenticated using (true) with check (true);