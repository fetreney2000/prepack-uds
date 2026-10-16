-- !!! SUPERSEDED !!!
-- Do NOT run this script. It restores bugs fixed in fix_running_numbers.sql
-- (lpad() truncation -> infinite loop, setval off-by-one, missing counter lock).
-- Kept only for history. Use supabase/fix_running_numbers.sql instead.
-- ============================================================
-- Deploy highest_uds_number function to Supabase
-- Run this in the Supabase SQL Editor.

create or replace function public.highest_uds_number(p_year integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(
    substring("Rujukan" from 5 for 4)::integer
  ), 0)
  from uds.tblrekodlabel
  where "Rujukan" ~ '^UDS-[0-9]{4}/[0-9]{2}$'
    and substring("Rujukan" from 10 for 2) = lpad((p_year % 100)::text, 2, '0');
$$;

