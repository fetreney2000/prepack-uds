-- ============================================================
-- Phase 2 migration: transactional ID reservation (RPC functions)
--
-- Running numbers are year-scoped (approved deviation): stored as
-- `running_number_<YYYY>` / `running_number_uds_<YYYY>` in
-- tblSystemSettings. Reservation MUST be a single Postgres
-- transaction using `SELECT ... FOR UPDATE` on the counter row to
-- remain race-free under concurrent users.
--
-- Postgres functions are atomic: each `create or replace function`
-- body runs to completion inside one transaction, so the lock +
-- ID scan + insert + counter bump below are all-or-nothing.
-- ============================================================

-- ---------- Prepack counter helpers ----------

-- Lock the year counter row FOR UPDATE and return its current value.
-- Creates the row (default 1) if absent. Intended to be called from
-- within create_prabungkus, which provides the surrounding transaction.
create or replace function public.lock_prepack_counter(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  if exists (
    select 1 from public.tblsystemsettings
    where settingkey = 'running_number_' || p_year
  ) then
    select settingvalue::integer into v_value
    from public.tblsystemsettings
    where settingkey = 'running_number_' || p_year
    for update;
  else
    insert into public.tblsystemsettings (settingkey, settingvalue)
    values ('running_number_' || p_year, '1')
    on conflict (settingkey) do nothing;
    v_value := 1;
  end if;
  return v_value;
end;
$$;

-- Monotonically bump a year counter to at least p_next.
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

-- Lock the UDS year counter row FOR UPDATE and return its current value.
create or replace function public.lock_uds_counter(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  if exists (
    select 1 from public.tblsystemsettings
    where settingkey = 'running_number_uds_' || p_year
  ) then
    select settingvalue::integer into v_value
    from public.tblsystemsettings
    where settingkey = 'running_number_uds_' || p_year
    for update;
  else
    insert into public.tblsystemsettings (settingkey, settingvalue)
    values ('running_number_uds_' || p_year, '1')
    on conflict (settingkey) do nothing;
    v_value := 1;
  end if;
  return v_value;
end;
$$;

-- Monotonically bump a UDS year counter to at least p_next.
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

-- ---------- Prepack: atomic create with reserved PP-NNNN/YY-X ----------
-- Returns the created row as JSON. Throws a unique-violation-style
-- exception if the chosen ID collides repeatedly (backstop).
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
  v_next    integer;
  v_row     jsonb;
begin
  -- Normalize category -> prefix via lookup, fallback 'X' (getCategoryPrefix)
  select coalesce(prefix, 'X') into v_prefix
    from public.tblkategoriubat
    where nama = p_kategori;
  if v_prefix is null or v_prefix = '' then
    v_prefix := 'X';
  end if;
  v_prefix := upper(trim(v_prefix));

  -- Year from the date string (fallback current year)
  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');

  -- Lock/read the year-scoped counter (FOR UPDATE)
  select lock_prepack_counter(v_year) into v_counter;

  -- Scan for a free candidate, skipping collisions
  v_candidate := v_counter;
  v_next := v_counter;
  loop
    v_id := 'PP-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag || '-' || v_prefix;
    if not exists (
      select 1 from public.tblsenaraiprabungkus where idprabungkus = v_id
    ) then
      exit;
    end if;
    v_candidate := v_candidate + 1;
    v_next := greatest(v_next, v_candidate);
  end loop;

  -- Insert (denormalized snapshot from p_ubat)
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

  -- Bump the counter to next free value
  v_next := v_next + 1;
  perform bump_prepack_counter(v_year, v_next);

  -- Return the created row
  select row_to_json(t) into v_row from (
    select "ID", idubat, namaubat, tarikh, "idPrabungkus", namadagangan,
      nomborkelompok, tarikhluputasal, tarikhluputbaharu, pengilang,
      nombormal, kuantitiuntukdiprabungkus, saizpek, deskripsipek,
      hargasetiappek, jumlahpekdihasilkan, baki, arahanTambahan
    from public.tblsenaraiprabungkus
    where "idPrabungkus" = v_id
  ) t;

  -- Copy the generated id back into the returned json
  return v_row;
end;
$$;

-- ---------- Prepack: preview next ID (no reserve) ----------
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
    v_id := 'PP-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag || '-' || v_prefix;
    if not exists (select 1 from public.tblsenaraiprabungkus where idprabungkus = v_id) then
      return v_id;
    end if;
    v_candidate := v_candidate + 1;
  end loop;
end;
$$;

-- Highest used prepack running number for a given year (admin validation).
-- Matches the /YY fragment (positions 9-10) of the ID against the tail of p_year.
create or replace function public.highest_prepack_number(p_year integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(
    substring(idprabungkus from 4 for 4)::integer
  ), 0)
  from public.tblsenaraiprabungkus
  where idprabungkus ~ '^PP-[0-9]{4}/[0-9]{2}-'
    and substring(idprabungkus from 9 for 2) = lpad((p_year % 100)::text, 2, '0');
$$;

-- ---------- UDS: atomic create with reserved UDS-NNNN/YY ----------
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
  v_row jsonb;
begin
  v_year := coalesce(substring(p_tarikh from 1 for 4)::integer, extract(year from now())::integer);
  v_frag := lpad((v_year % 100)::text, 2, '0');

  select lock_uds_counter(v_year) into v_counter;
  v_candidate := v_counter;
  loop
    v_id := 'UDS-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag;
    if not exists (select 1 from uds.tblrekodlabel where "Rujukan" = v_id) then
      exit;
    end if;
    v_candidate := v_candidate + 1;
  end loop;

  insert into uds.tblrekodlabel (
    "Tarikh", "Rujukan", "NamaUbat", "Kekuatan", "Kelompok",
    "Luput", "Kuantiti", "Penyedia", "LuputNormalized", "NamaUbatID"
  )
  values (
    p_tarikh, v_id, p_namaUbat, nullif(p_kekuatan, ''), p_kelompok,
    p_luput, p_kuantiti, p_penyedia, nullif(p_luputnormalized, ''), p_namaUbat_id
  );

  perform bump_uds_counter(v_year, v_counter + 1);

  select row_to_json(t) into v_row from (
    select "ID", "Tarikh", "Rujukan", "NamaUbat", "Kekuatan", "Kelompok",
      "Luput", "Kuantiti", "Penyedia", "LuputNormalized", "NamaUbatID"
    from uds.tblrekodlabel where "Rujukan" = v_id
  ) t;
  return v_row;
end;
$$;

-- ---------- UDS: preview next Rujukan (no reserve) ----------
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
    v_id := 'UDS-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag;
    if not exists (select 1 from uds.tblrekodlabel where "Rujukan" = v_id) then
      return v_id;
    end if;
    v_candidate := v_candidate + 1;
  end loop;
end;
$$;
