-- ============================================================
-- Sistem Pengurusan Prabungkus Ubat — Modernization
-- PHASE 0 Migration 00004: seed data
-- Lookup tables + default settings + default color scheme.
-- Running numbers are year-scoped (approved deviation): default 1.
-- Admin password default: farmasi456 (PBKDF2-SHA512, 1000 iters,
-- 16-byte salt, 64-byte hash). Placeholder replaced by seed.ts to
-- generate a real random salt at install time.
--
-- Idempotent: re-running this file is safe (seed rows are cleared
-- before re-insert, keyed tables use ON CONFLICT DO NOTHING).
-- ============================================================

-- ---------- tblJenisLabel (label template types) ----------
delete from public.tblJenisLabel;
insert into public.tblJenisLabel (deskripsiLabel, namaFail) values
  ('Tablet',                'label_tablet.docx'),
  ('Kapsul',                'label_kapsul.docx'),
  ('Suspensi',              'label_suspensi.docx'),
  ('Salap',                 'label_salap.docx'),
  ('Krim',                  'label_krim.docx'),
  ('Losion',                'label_losion.docx'),
  ('Titisan Mata',          'label_titisan_mata.docx'),
  ('Titisan Telinga',       'label_titisan_telinga.docx'),
  ('Titisan Hidung',        'label_titisan_hidung.docx'),
  ('Semburan Hidung',       'label_semburan_hidung.docx'),
  ('Semburan Mulut',        'label_semburan_mulut.docx'),
  ('Suntikan',              'label_suntikan.docx'),
  ('Infusi',                'label_infusi.docx'),
  ('Ubat Gigi',             'label_ubat_gigi.docx'),
  ('Gargle',                'label_gargle.docx'),
  ('Suppositori',           'label_suppositori.docx'),
  ('Pes',                   'label_pes.docx'),
  ('Gel',                   'label_gel.docx'),
  ('Sirap',                 'label_sirap.docx'),
  ('Emulsi',                'label_emulsi.docx'),
  ('Serbuk',                'label_serbuk.docx'),
  ('Air',                   'label_air.docx'),
  ('Aerosol',               'label_aerosol.docx'),
  ('Penyelesaian',          'label_penyelesaian.docx'),
  ('Penyelesaian Ubat',     'label_penyelesaian_ubat.docx'),
  ('Penyedut',              'label_penyedut.docx'),
  ('Penyembur',             'label_penyembur.docx'),
  ('Pengesan',              'label_pengesan.docx'),
  ('Pembasuh',              'label_pembasuh.docx'),
  ('Pencuci',               'label_pencuci.docx'),
  ('Losyen',                'label_losyen.docx'),
  ('Penyapu',               'label_penyapu.docx'),
  ('Penghalau',             'label_penghalau.docx');

-- ---------- tblJenisWorksheet (worksheet template types) ----------
delete from public.tblJenisWorksheet;
insert into public.tblJenisWorksheet (deskripsiWorksheet, namaFail) values
  ('Umum', 'Kertas Kerja - Umum.docx');

-- ---------- tblKategoriUbat (prepack categories with prefix) ----------
delete from public.tblKategoriUbat;
insert into public.tblKategoriUbat (nama, prefix) values
  ('Tablet/T/I', 'T'),
  ('Internal/E', 'I'),
  ('Eksternal/E', 'E');

-- ---------- tblUnitSKU ----------
delete from public.tblUnitSKU;
insert into public.tblUnitSKU (nama) values
  ('Tablet'),
  ('Kapsul'),
  ('Botol'),
  ('Tiub'),
  ('Pek'),
  ('Ampul'),
  ('Sachet');

-- ---------- tblUnitPKU ----------
delete from public.tblUnitPKU;
insert into public.tblUnitPKU (nama) values
  ('Pek'),
  ('Botol'),
  ('Tiub');

-- ---------- tblSystemSettings ----------
-- Year-scoped running numbers default to 1 for the current year.
-- admin_password placeholder: replaced by seed.ts.
insert into public.tblSystemSettings (settingKey, settingValue) values
  ('admin_password', '__ADMIN_HASH__'),
  ('color_scheme',   'light')
on conflict (settingKey) do nothing;

-- ---------- tblColorSchemes: default built-in (light / Bold Wikipedia) ----------
insert into public.tblColorSchemes (schemeId, name, colors, css, isBuiltIn) values
  ('light', 'Light', '["#ffffff","#f4f4f5","#e4e4e7","#1f6feb","#52525b"]', '{"--background":"hsl(0 0% 100%)","--foreground":"hsl(0 0% 15%)","--card":"hsl(0 0% 100%)","--card-foreground":"hsl(0 0% 15%)","--popover":"hsl(0 0% 100%)","--popover-foreground":"hsl(0 0% 15%)","--primary":"hsl(214 85% 45%)","--primary-foreground":"hsl(0 0% 100%)","--secondary":"hsl(210 20% 96%)","--secondary-foreground":"hsl(0 0% 15%)","--muted":"hsl(0 0% 96%)","--muted-foreground":"hsl(0 0% 45%)","--accent":"hsl(214 85% 96%)","--accent-foreground":"hsl(214 85% 35%)","--destructive":"hsl(0 84% 44%)","--destructive-foreground":"hsl(0 0% 100%)","--border":"hsl(0 0% 82%)","--input":"hsl(0 0% 90%)","--ring":"hsl(214 85% 45%)","--chart-1":"hsl(214 85% 45%)","--chart-2":"hsl(160 84% 39%)","--chart-3":"hsl(30 95% 45%)","--chart-4":"hsl(280 75% 55%)","--chart-5":"hsl(340 85% 50%)","--sidebar":"hsl(0 0% 98%)","--sidebar-foreground":"hsl(0 0% 25%)","--sidebar-primary":"hsl(214 85% 45%)","--sidebar-primary-foreground":"hsl(0 0% 100%)","--sidebar-accent":"hsl(214 40% 94%)","--sidebar-accent-foreground":"hsl(214 85% 35%)","--sidebar-border":"hsl(0 0% 90%)","--sidebar-ring":"hsl(214 85% 45%)","--radius":"0.125rem","--font-sans":"\\"Inter\\", \\"Segoe UI\\", \\"Helvetica Neue\\", sans-serif","--font-mono":"\\"Geist Mono\\", monospace","--shadow-color":"rgba(0, 0, 0, 0.1)","--shadow-opacity":"0.05","--shadow-blur":"4px","--shadow-spread":"0px","--shadow-offset-x":"0px","--shadow-offset-y":"1px","--letter-spacing":"0.0125em"}', 1)
on conflict (schemeId) do nothing;