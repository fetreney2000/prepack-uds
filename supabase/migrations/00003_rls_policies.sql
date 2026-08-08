-- ============================================================
-- Sistem Pengurusan Prabungkus Ubat — Modernization
-- PHASE 0 Migration 00003: RLS policies
-- Single shared password model (approved). Core tables are fully
-- open (matching original: all pages except Tetapan are public).
-- Tetapan-sensitive tables (settings, color schemes) gate WRITES
-- behind app.password_verified, set by Server Actions post-/verify.
--
-- NOTE: Server Actions use the service_role key (bypasses RLS),
-- matching the original's no-RLS reality. These policies are
-- defense-in-depth for any authenticated-role access.
--
-- Idempotent: each `drop policy if exists` ensures the file can be
-- re-run safely (e.g. via the SQL editor) without "already exists"
-- errors.
-- ============================================================

-- ---------- Enable RLS on all tables ----------
-- (idempotent: enabling RLS when already enabled is a no-op)

alter table public.tblJenisLabel        enable row level security;
alter table public.tblJenisWorksheet    enable row level security;
alter table public.tblKategoriUbat      enable row level security;
alter table public.tblUnitSKU           enable row level security;
alter table public.tblUnitPKU           enable row level security;
alter table public.tblSystemSettings    enable row level security;
alter table public.tblColorSchemes      enable row level security;
alter table public.tblSenaraiUbat       enable row level security;
alter table public.tblSenaraiPrabungkus enable row level security;
alter table uds.tblNamaUbat             enable row level security;
alter table uds.tblRekodLabel           enable row level security;

-- ---------- Core tables: full access for authenticated ----------
-- Matches original: all pages except Tetapan are open (no per-user data).

drop policy if exists "app_users_full_access_jenislabel" on public.tblJenisLabel;
create policy "app_users_full_access_jenislabel" on public.tblJenisLabel
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_jenisworksheet" on public.tblJenisWorksheet;
create policy "app_users_full_access_jenisworksheet" on public.tblJenisWorksheet
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_kategori" on public.tblKategoriUbat;
create policy "app_users_full_access_kategori" on public.tblKategoriUbat
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_unitsku" on public.tblUnitSKU;
create policy "app_users_full_access_unitsku" on public.tblUnitSKU
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_unitpku" on public.tblUnitPKU;
create policy "app_users_full_access_unitpku" on public.tblUnitPKU
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_ubat" on public.tblSenaraiUbat;
create policy "app_users_full_access_ubat" on public.tblSenaraiUbat
  for all to authenticated using (true) with check (true);

drop policy if exists "app_users_full_access_prabungkus" on public.tblSenaraiPrabungkus;
create policy "app_users_full_access_prabungkus" on public.tblSenaraiPrabungkus
  for all to authenticated using (true) with check (true);

drop policy if exists "uds_full_access_namauBat" on uds.tblNamaUbat;
create policy "uds_full_access_namauBat" on uds.tblNamaUbat
  for all to authenticated using (true) with check (true);

drop policy if exists "uds_full_access_rekodlabel" on uds.tblRekodLabel;
create policy "uds_full_access_rekodlabel" on uds.tblRekodLabel
  for all to authenticated using (true) with check (true);

-- ---------- Tetapan-sensitive tables ----------
-- Reads open (matching original: settings readable to render theme).
-- Writes gated behind app.password_verified (set post-/verify).

drop policy if exists "settings_read" on public.tblSystemSettings;
create policy "settings_read" on public.tblSystemSettings
  for select to authenticated using (true);

drop policy if exists "settings_write" on public.tblSystemSettings;
create policy "settings_write" on public.tblSystemSettings
  for all to authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');

drop policy if exists "color_schemes_read" on public.tblColorSchemes;
create policy "color_schemes_read" on public.tblColorSchemes
  for select to authenticated using (true);

drop policy if exists "color_schemes_write" on public.tblColorSchemes;
create policy "color_schemes_write" on public.tblColorSchemes
  for all to authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');