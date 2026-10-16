-- ============================================================
-- Fractional pack size support - consolidated patch
--
-- Lets saizPek hold fractional values (e.g. 17.6) and stores the matching
-- fractional baki (500 - 24 * 20.2 = 15.2) without rounding it away.
--
-- Contains one ALTER TABLE and one `create or replace function` - no data
-- changes, so it is safe to run against a live database. Idempotent.
--
-- Run this AFTER fix_running_numbers.sql. Both scripts now install the same
-- create_prabungkus, so re-running either one afterwards is safe.
--
-- Background:
--   * saizPek is already double precision (and REAL in the original SQLite),
--     but baki was an integer column, so a fractional remainder was silently
--     rounded by the ::integer cast.
--   * create_prabungkus computed baki with `::integer`; it now casts to
--     double precision so the exact remainder is preserved.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- baki must hold a fractional remainder (e.g. 500 - 24 * 20.2 = 15.2).
-- Integer -> double precision is lossless for existing rows.
alter table public.tblsenaraiprabungkus
  alter column baki type double precision
  using baki::double precision;

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
    nullif((p_ubat->>'baki')::double precision, null),
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
