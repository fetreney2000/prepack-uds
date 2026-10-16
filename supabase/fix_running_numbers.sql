-- ============================================================
-- Running-number / ID-reservation functions - consolidated patch
--
-- SUPERSEDES: fix_create_prabungkus.sql, fix_identity_sequence.sql,
--             fix_highest_uds_number.sql
--             (kept for history; do NOT re-run them - they restore the
--             bugs fixed here)
--
-- Contains only `create or replace function` statements - no table
-- drops or data changes, so it is safe to run against a live database.
--
-- Fixes over the previously deployed versions:
--   1. lpad() TRUNCATES strings wider than its target, so a counter at
--      10000+ mapped 10000/10001/... onto the same id and the collision
--      loop never terminated. Numbers are now padded but never truncated,
--      with a hard iteration guard as a safety valve.
--   2. setval(seq, max+1) uses is_called = true, so the next insert got
--      max+2 and EVERY prepack record skipped an ID. Now uses the
--      three-arg form with is_called = false.
--   3. create_uds_label bumped the counter to counter+1 even when the
--      collision loop had advanced further, so later inserts rescanned
--      the same collisions.
--   4. lock_*_counter returned 1 without taking a lock on the
--      first-of-year path, letting two concurrent creates mint the same
--      ID. The row is now locked unconditionally.
--   5. highest_prepack_number / highest_uds_number assumed exactly 4
--      digits and a single-character prefix, so IDs outside that shape
--      were invisible to the admin running-number validation.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================
-- Prepack counter helpers
create or replace function public.lock_prepack_counter(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  -- Ensure the row exists, then lock it unconditionally. Locking on both paths
  -- closes the race where two concurrent first-of-year callers both found no
  -- row, both read 1, and neither held a lock.
  insert into public.tblsystemsettings (settingkey, settingvalue)
  values ('running_number_' || p_year, '1')
  on conflict (settingkey) do nothing;

  select settingvalue::integer into v_value
  from public.tblsystemsettings
  where settingkey = 'running_number_' || p_year
  for update;

  return coalesce(v_value, 1);
end;
$$;

create or replace function public.bump_prepack_counter(p_year integer, p_next integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  insert into public.tblsystemsettings (settingkey, settingvalue)
  values ('running_number_' || p_year, p_next::text)
  on conflict (settingkey) do update
    set settingvalue = greatest(
      public.tblsystemsettings.settingvalue::integer, p_next
    )::text
  returning settingvalue::integer into v_new;
  return v_new;
end;
$$;

-- UDS counter helpers
create or replace function public.lock_uds_counter(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  -- Ensure the row exists, then lock it unconditionally (see lock_prepack_counter).
  insert into public.tblsystemsettings (settingkey, settingvalue)
  values ('running_number_uds_' || p_year, '1')
  on conflict (settingkey) do nothing;

  select settingvalue::integer into v_value
  from public.tblsystemsettings
  where settingkey = 'running_number_uds_' || p_year
  for update;

  return coalesce(v_value, 1);
end;
$$;

create or replace function public.bump_uds_counter(p_year integer, p_next integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  insert into public.tblsystemsettings (settingkey, settingvalue)
  values ('running_number_uds_' || p_year, p_next::text)
  on conflict (settingkey) do update
    set settingvalue = greatest(
      public.tblsystemsettings.settingvalue::integer, p_next
    )::text
  returning settingvalue::integer into v_new;
  return v_new;
end;
$$;

-- Prepack: atomic create with reserved PP-NNNN/YY-X
create or replace function public.create_prabungkus(
  p_kategori          text,
  p_tarikh            text,
  p_ubat              jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix  text;
  v_year    integer;
  v_frag    text;
  v_counter integer;
  v_candidate integer;
  v_id      text;
  v_num     text;
  v_next    integer;
  v_row     jsonb;
begin
  select coalesce(prefix, 'X') into v_prefix
    from public.tblkategoriubat
    where nama = p_kategori;
  if v_prefix is null or v_prefix = '' then
    v_prefix := 'X';
  end if;
  v_prefix := upper(trim(v_prefix));

  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');

  select lock_prepack_counter(v_year) into v_counter;

  v_candidate := v_counter;
  v_next := v_counter;
  loop
    -- lpad() TRUNCATES strings longer than its target width, which would map
    -- 10000/10001/... onto the same id and spin forever. Pad, never truncate.
    if length(v_candidate::text) > 4 then
      v_num := v_candidate::text;
    else
      v_num := lpad(v_candidate::text, 4, '0');
    end if;
    v_id := 'PP-' || v_num || '/' || v_frag || '-' || v_prefix;
    if not exists (
      select 1 from public.tblsenaraiprabungkus where idprabungkus = v_id
    ) then
      exit;
    end if;
    v_candidate := v_candidate + 1;
    v_next := greatest(v_next, v_candidate);
    -- Safety valve: fail loudly rather than spin unboundedly.
    if v_candidate > v_counter + 100000 then
      raise exception 'Tidak dapat menjana ID Prabungkus yang unik';
    end if;
  end loop;

  -- Self-heal: point the identity sequence just past the highest existing ID.
  -- is_called = false makes the next nextval() return exactly max(ID)+1; the
  -- two-arg form sets is_called = true and would skip an ID on every insert.
  perform setval(
    pg_get_serial_sequence('public.tblsenaraiprabungkus', 'ID'),
    (select coalesce(max("ID"), 0) + 1 from public.tblsenaraiprabungkus),
    false
  );

  insert into public.tblsenaraiprabungkus (
    idubat, namaubat, tarikh, idprabungkus, namadagangan,
    nomborkelompok, tarikhluputasal, tarikhluputbaharu, pengilang,
    nombormal, kuantitiuntukdiprabungkus, saizpek, deskripsipek,
    hargasetiappek, jumlahpekdihasilkan, baki, arahanTambahan
  )
  values (
    (p_ubat->>'idUbat')::bigint,
    coalesce(p_ubat->>'namaUbat', ''),
    p_tarikh,
    v_id,
    nullif(p_ubat->>'namaDagangan', ''),
    nullif(p_ubat->>'nomborKelompok', ''),
    nullif(p_ubat->>'tarikhLuputAsal', ''),
    nullif(p_ubat->>'tarikhLuputBaharu', ''),
    nullif(p_ubat->>'pengilang', ''),
    nullif(p_ubat->>'nomborMAL', ''),
    nullif((p_ubat->>'kuantitiUntukDiprabungkus')::integer, null),
    coalesce((p_ubat->>'saizPek')::double precision, 0),
    nullif(p_ubat->>'deskripsiPek', ''),
    nullif((p_ubat->>'hargaSetiapPek')::double precision, null),
    nullif((p_ubat->>'jumlahPekDihasilkan')::integer, null),
    nullif((p_ubat->>'baki')::integer, null),
    nullif(p_ubat->>'arahanTambahan', '')
  );

  v_next := v_next + 1;
  perform bump_prepack_counter(v_year, v_next);

  select row_to_json(t) into v_row from (
    select "ID", idubat, namaubat, tarikh, idprabungkus as "idPrabungkus", namadagangan,
      nomborkelompok, tarikhluputasal, tarikhluputbaharu, pengilang,
      nombormal, kuantitiuntukdiprabungkus, saizpek, deskripsipek,
      hargasetiappek, jumlahpekdihasilkan, baki, arahanTambahan
    from public.tblsenaraiprabungkus
    where idprabungkus = v_id
  ) t;

  return v_row;
end;
$$;

-- Prepack: preview next ID (no reserve)
create or replace function public.preview_prepack_id(p_kategori text, p_tarikh text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_year integer;
  v_frag text;
  v_counter integer;
  v_candidate integer;
  v_id text;
begin
  select coalesce(prefix, 'X') into v_prefix
    from public.tblkategoriubat where nama = p_kategori;
  v_prefix := coalesce(upper(trim(v_prefix)), 'X');
  if v_prefix = '' then v_prefix := 'X'; end if;

  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');

  select coalesce(settingvalue::integer, 1) into v_counter
    from public.tblsystemsettings
    where settingkey = 'running_number_' || v_year;

  v_candidate := coalesce(v_counter, 1);
  loop
    -- Pad without truncating (see create_prabungkus).
    if length(v_candidate::text) > 4 then
      v_id := 'PP-' || v_candidate::text || '/' || v_frag || '-' || v_prefix;
    else
      v_id := 'PP-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag || '-' || v_prefix;
    end if;
    if not exists (select 1 from public.tblsenaraiprabungkus where idprabungkus = v_id) then
      return v_id;
    end if;
    v_candidate := v_candidate + 1;
  end loop;
end;
$$;

-- Highest used prepack running number for a given year (admin validation)
create or replace function public.highest_prepack_number(p_year integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(
    substring(split_part(idprabungkus, '/', 1) from 4)::integer
  ), 0)
  from public.tblsenaraiprabungkus
  where idprabungkus ~ '^PP-[0-9]+/[0-9]{2}-'
    and substring(split_part(idprabungkus, '/', 2) from 1 for 2)
        = lpad((p_year % 100)::text, 2, '0');
$$;

-- Highest used UDS running number for a given year (admin validation)
create or replace function public.highest_uds_number(p_year integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(
    substring(split_part("Rujukan", '/', 1) from 5)::integer
  ), 0)
  from uds.tblrekodlabel
  where "Rujukan" ~ '^UDS-[0-9]+/[0-9]{2}$'
    and substring(split_part("Rujukan", '/', 2) from 1 for 2)
        = lpad((p_year % 100)::text, 2, '0');
$$;

-- UDS: atomic create with reserved UDS-NNNN/YY
create or replace function public.create_uds_label(
  p_tarikh text,
  p_namaUbat text,
  p_kekuatan text,
  p_kelompok text,
  p_luput text,
  p_kuantiti integer,
  p_penyedia text,
  p_luputnormalized text,
  p_namaUbat_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_frag text;
  v_counter integer;
  v_candidate integer;
  v_id text;
  v_next integer;
  v_row jsonb;
begin
  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');

  select lock_uds_counter(v_year) into v_counter;
  v_candidate := v_counter;
  v_next := v_counter;
  loop
    -- Pad without truncating (see create_prabungkus).
    if length(v_candidate::text) > 4 then
      v_id := 'UDS-' || v_candidate::text || '/' || v_frag;
    else
      v_id := 'UDS-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag;
    end if;
    if not exists (select 1 from uds.tblrekodlabel where "Rujukan" = v_id) then
      exit;
    end if;
    v_candidate := v_candidate + 1;
    v_next := greatest(v_next, v_candidate);
    if v_candidate > v_counter + 100000 then
      raise exception 'Tidak dapat menjana Rujukan UDS yang unik';
    end if;
  end loop;

  insert into uds.tblrekodlabel (
    "Tarikh", "Rujukan", "NamaUbat", "Kekuatan", "Kelompok",
    "Luput", "Kuantiti", "Penyedia", "LuputNormalized", "NamaUbatID"
  )
  values (
    p_tarikh, v_id, p_namaUbat, nullif(p_kekuatan, ''), p_kelompok,
    p_luput, p_kuantiti, p_penyedia, nullif(p_luputnormalized, ''), p_namaUbat_id
  );

  -- Advance past every candidate that was skipped, not just the first, so
  -- later inserts do not rescan the same collisions.
  v_next := v_next + 1;
  perform bump_uds_counter(v_year, v_next);

  select row_to_json(t) into v_row from (
    select "ID", "Tarikh", "Rujukan", "NamaUbat", "Kekuatan", "Kelompok",
      "Luput", "Kuantiti", "Penyedia", "LuputNormalized", "NamaUbatID"
    from uds.tblrekodlabel where "Rujukan" = v_id
  ) t;
  return v_row;
end;
$$;

-- UDS: preview next Rujukan (no reserve)
create or replace function public.preview_uds_rujukan(p_tarikh text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_frag text;
  v_counter integer;
  v_candidate integer;
  v_id text;
begin
  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');
  select coalesce(settingvalue::integer, 1) into v_counter
    from public.tblsystemsettings
    where settingkey = 'running_number_uds_' || v_year;
  v_candidate := coalesce(v_counter, 1);
  loop
    -- Pad without truncating (see create_prabungkus).
    if length(v_candidate::text) > 4 then
      v_id := 'UDS-' || v_candidate::text || '/' || v_frag;
    else
      v_id := 'UDS-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag;
    end if;
    if not exists (select 1 from uds.tblrekodlabel where "Rujukan" = v_id) then
      return v_id;
    end if;
    v_candidate := v_candidate + 1;
  end loop;
end;
$$;
