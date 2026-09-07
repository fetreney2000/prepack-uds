-- Fix: create_prabungkus — replace quoted "idPrabungkus" with unquoted idprabungkus
-- The column was created without quotes, so PostgreSQL stores it as lowercase.
-- Run this in the Supabase SQL Editor to fix the deployed function.
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

create or replace function public.create_prabungkus(
  p_kategori          text,
  p_tarikh            text,
  p_ubat              jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
AS $$
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
    v_id := 'PP-' || lpad(v_candidate::text, 4, '0') || '/' || v_frag || '-' || v_prefix;
    if not exists (
      select 1 from public.tblsenaraiprabungkus where idprabungkus = v_id
    ) then
      exit;
    end if;
    v_candidate := v_candidate + 1;
    v_next := greatest(v_next, v_candidate);
  end loop;

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
