-- ============================================================
-- Sistem Pengurusan Prabungkus Ubat — Modernization
-- PHASE 0 Migration 00004: seed data
-- Lookup tables + default settings + default color scheme.
-- Running numbers are year-scoped (approved deviation): default 1.
-- Admin password default: farmasi456 (PBKDF2-SHA512, 1000 iters,
-- 16-byte salt, 64-byte hash). Placeholder replaced by seed.ts to
-- generate a real random salt at install time.
-- ============================================================

-- ---------- tblJenisLabel (label template types) ----------
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
insert into public.tblJenisWorksheet (deskripsiWorksheet, namaFail) values
  ('Umum', 'Kertas Kerja - Umum.docx');

-- ---------- tblKategoriUbat (prepack categories with prefix) ----------
insert into public.tblKategoriUbat (nama, prefix) values
  ('Tablet/T/I', 'T'),
  ('Internal/E', 'I'),
  ('Eksternal/E', 'E');

-- ---------- tblUnitSKU ----------
insert into public.tblUnitSKU (nama) values
  ('Tablet'),
  ('Kapsul'),
  ('Botol'),
  ('Tiub'),
  ('Pek'),
  ('Ampul'),
  ('Sachet');

-- ---------- tblUnitPKU ----------
insert into public.tblUnitPKU (nama) values
  ('Pek'),
  ('Botol'),
  ('Tiub');

-- ---------- tblSystemSettings ----------
-- Year-scoped running numbers default to 1 for the current year.
-- admin_password placeholder: replaced by seed.ts.
insert into public.tblSystemSettings (settingKey, settingValue) values
  ('admin_password', '__ADMIN_HASH__'),
  ('color_scheme',   'light');

-- ---------- tblColorSchemes: default built-in (light) ----------
insert into public.tblColorSchemes (schemeId, name, colors, css, isBuiltIn) values
  ('light', 'Light', '["#ffffff","#f4f4f5","#e4e4e7","#18181b","#52525b"]', '{"--background":"#ffffff","--foreground":"#f5f5f5","--primary":"#18181b","--primary-foreground":"#ffffff","--accent":"#e4e4e7","--accent-foreground":"#f5f5f5","--surface-alt":"#f4f4f5","--text-primary":"#52525b","--text-secondary":"#52525b","--border":"#e4e4e7","--ring":"#18181b","--card":"#ffffff","--card-foreground":"#f5f5f5","--popover":"#ffffff","--popover-foreground":"#f5f5f5","--secondary":"#f4f4f5","--secondary-foreground":"#f5f5f5","--muted":"#f4f4f5","--muted-foreground":"#52525b","--destructive":"#d33","--destructive-foreground":"#ffffff","--input":"#e4e4e7","--radius":"0.5rem"}', 1);