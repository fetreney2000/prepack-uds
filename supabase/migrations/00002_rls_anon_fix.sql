-- ============================================================
-- RLS fix: allow `anon` role (browser client) to read core data.
-- The app uses the anon key client-side (no login), so the previous
-- policies scoped to `authenticated` only returned zero rows for anon.
-- Re-runnable; safe to run against an existing database (no data loss).
-- ============================================================

-- Core tables: full access for anon + authenticated
drop policy if exists "app_users_full_access_jenislabel" on public.tblJenisLabel;
create policy "app_users_full_access_jenislabel" on public.tblJenisLabel
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_jenisworksheet" on public.tblJenisWorksheet;
create policy "app_users_full_access_jenisworksheet" on public.tblJenisWorksheet
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_kategori" on public.tblKategoriUbat;
create policy "app_users_full_access_kategori" on public.tblKategoriUbat
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_unitsku" on public.tblUnitSKU;
create policy "app_users_full_access_unitsku" on public.tblUnitSKU
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_unitpku" on public.tblUnitPKU;
create policy "app_users_full_access_unitpku" on public.tblUnitPKU
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_ubat" on public.tblSenaraiUbat;
create policy "app_users_full_access_ubat" on public.tblSenaraiUbat
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_prabungkus" on public.tblSenaraiPrabungkus;
create policy "app_users_full_access_prabungkus" on public.tblSenaraiPrabungkus
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "uds_full_access_namauBat" on uds.tblNamaUbat;
create policy "uds_full_access_namauBat" on uds.tblNamaUbat
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "uds_full_access_rekodlabel" on uds.tblRekodLabel;
create policy "uds_full_access_rekodlabel" on uds.tblRekodLabel
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "auth_attempts_app" on public.tblAuthAttempts;
create policy "auth_attempts_app" on public.tblAuthAttempts
  for all to anon, authenticated using (true) with check (true);

-- Tetapan-sensitive tables: reads open to all, writes gated behind password
drop policy if exists "settings_read" on public.tblSystemSettings;
create policy "settings_read" on public.tblSystemSettings
  for select to anon, authenticated using (true);

drop policy if exists "settings_write" on public.tblSystemSettings;
create policy "settings_write" on public.tblSystemSettings
  for all to anon, authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');

drop policy if exists "color_schemes_read" on public.tblColorSchemes;
create policy "color_schemes_read" on public.tblColorSchemes
  for select to anon, authenticated using (true);

drop policy if exists "color_schemes_write" on public.tblColorSchemes;
create policy "color_schemes_write" on public.tblColorSchemes
  for all to anon, authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');