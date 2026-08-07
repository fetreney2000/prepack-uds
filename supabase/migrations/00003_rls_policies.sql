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
-- ============================================================

-- ---------- Enable RLS on all tables ----------

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

create policy "app_users_full_access_jenislabel" on public.tblJenisLabel
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_jenisworksheet" on public.tblJenisWorksheet
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_kategori" on public.tblKategoriUbat
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_unitsku" on public.tblUnitSKU
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_unitpku" on public.tblUnitPKU
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_ubat" on public.tblSenaraiUbat
  for all to authenticated using (true) with check (true);

create policy "app_users_full_access_prabungkus" on public.tblSenaraiPrabungkus
  for all to authenticated using (true) with check (true);

create policy "uds_full_access_namauBat" on uds.tblNamaUbat
  for all to authenticated using (true) with check (true);

create policy "uds_full_access_rekodlabel" on uds.tblRekodLabel
  for all to authenticated using (true) with check (true);

-- ---------- Tetapan-sensitive tables ----------
-- Reads open (matching original: settings readable to render theme).
-- Writes gated behind app.password_verified (set post-/verify).

create policy "settings_read" on public.tblSystemSettings
  for select to authenticated using (true);

create policy "settings_write" on public.tblSystemSettings
  for all to authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');

create policy "color_schemes_read" on public.tblColorSchemes
  for select to authenticated using (true);

create policy "color_schemes_write" on public.tblColorSchemes
  for all to authenticated
  using (pg_catalog.current_setting('app.password_verified', true) = 'true')
  with check (pg_catalog.current_setting('app.password_verified', true) = 'true');