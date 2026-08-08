# Sistem Pengurusan Prabungkus Ubat — Modern Rewrite

Modernization of the medication prepacking management system for **Jabatan Farmasi, Hospital Keningau, Malaysia**. Built on **Next.js 15 (App Router) + Supabase (PostgreSQL + Storage + RLS)**, deployed on **Vercel Hobby**.

The system has two independent sub-systems sharing one UI shell:

1. **Prabungkus core** — medication master list, prepacking records (`PP-NNNN/YY-X`), daily/monthly/yearly reports, dashboard, settings (categories, units, label/worksheet types, year-scoped running numbers, color schemes, admin password).
2. **UDS label system** — label-record tracking (`UDS-NNNN/YY`), a medication name list, and a custom PDF label printer (3.5" × 2.3" grid labels, 4–8 cols × 4–7 rows, auto font selection).

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling / UI | Tailwind CSS + shadcn/ui |
| Tables | TanStack Table + shadcn Table |
| Client data | TanStack Query |
| UI state | Zustand (UI only) |
| Animation | Framer Motion |
| Validation | zod |
| Dates | date-fns (dd/mm/yyyy, Malay months) |
| DOCX | docxtemplater + pizzip (Node runtime) |
| PDF | pdfkit (Node runtime) |
| Database / Auth | Supabase (PostgreSQL + Storage + RLS), two schemas (`public` + `uds`) |
| Hosting | Vercel Hobby (online only) |

---

## Getting Started (local development)

### Prerequisites
- Node.js ≥ 20
- A Supabase project (free tier)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in your Supabase URL, anon key, and service-role key.

### 3. Apply the database schema
Apply the migrations in `supabase/migrations/` in order (00001 → 00006) to your Supabase project. You can run them from the Supabase Dashboard → SQL Editor, or use the Supabase CLI:
```bash
supabase db push
```

### 4. Seed the database (optional, for migration)
The seed script imports the original SQLite data (`prepack_webapp.db`, `labeluds.db`), preserves original IDs, sets the default admin password, backfills year-scoped running numbers, and creates the PDF-caching storage bucket.
```bash
# with SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and SQLite paths in env
npm run seed
```
Default admin password (Hobby/login): **`farmasi456`** — change it in Tetapan after first login.

### 5. Run the dev server
```bash
npm run dev
```
Open http://localhost:3000.

---

## Deployment (Vercel + Supabase)

1. **Create a Supabase project** and apply the migrations (`supabase/migrations/`).
2. **Run the seed** once (see above) to load lookup tables, settings, the default password, and (optionally) the original data.
3. **Push the repo to GitHub** and import it into Vercel (or use `vercel` CLI).
4. **Add environment variables** in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Deploy.** The build outputs 13 static pages + 2 Node-runtime route handlers (`/api/document/[kind]/[id]`, `/api/uds/[id]/label.pdf`).

### Free-tier notes
- Document generators run on the **Node runtime** (never Edge), so pdfkit/docxtemplater work within Vercel Hobby function limits.
- UDS label PDFs are cached in the Supabase Storage bucket `uds-labels` (keyed by record + options hash), so reprints hit the cache instead of re-rendering.
- Templates (34 `.docx`) and fonts (16 `.ttf`) are vendored into `public/` — no per-request Storage reads.
- Data volume is well under the 500 MB free limit.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run seed` | Import original SQLite data + prime settings |
| `npm run test:differential` | Differential test vs. original SQLite data |

---

## Fidelity Checklist

Verified against `MODERNIZATION_ANALYSIS.md`. All items implemented and confirmed.

### Schema & data
- [x] `public` schema mirrors `prepack_webapp.db` (9 tables, identity columns preserve IDs)
- [x] `uds` schema mirrors `labeluds.db`; **`LuputParseNote` dropped** (approved deviation)
- [x] Soft references (`idUbat`, `NamaUbatID`) — no FK cascade; denormalized `namaUbat`/`Nama` snapshots written on create/update
- [x] Medication delete preserves orphaned prepack records (no cascade, no block)
- [x] Seed imports original data preserving IDs; backfills year-scoped running numbers

### Business logic
- [x] **Prepack ID** `PP-NNNN/YY-X` — year-scoped running numbers (approved deviation), transactional reservation
- [x] **Concurrency-safe** ID generation — single Postgres transaction via `SELECT … FOR UPDATE` (RPC functions)
- [x] **Expiry** `calculateTarikhLuputBaharu` — exactly per §4.2 (never extend past original)
- [x] **Pack/remainder** `calculatePekAndBaki` — `floor(qty/size)`, `qty % size`
- [x] **UDS Rujukan** `UDS-NNNN/YY` — server-generated, year-scoped, read-only on update, increments only on successful insert
- [x] **Luput parsing grammar** — `MM/YY`, `MM/YYYY`, `DD/MM/YY`, `DD/MM/YYYY`; invalid → null; empty → allowed
- [x] UDS normalization — trim + uppercase, canonical `Nama` override when `NamaUbatID` valid

### Reports & dashboard
- [x] Daily / monthly / yearly / range reports grouped by `namaUbat` (totalWorksheet, totalPekDihasilkan, uniqueMeds)
- [x] Dashboard current-month + YTD cards + 12-month table
- [x] UDS reports (totalQuantity, totalRecords, uniqueMeds, uniqueStaff)

### Document generation
- [x] DOCX worksheet/label via docxtemplater, download-only (approved deviation)
- [x] Template selection by `jenisWorksheet`/`jenisLabel` → `namaFail`, with defaults
- [x] `saizPekFormatted`, dd/mm/yyyy dates, `harga.toFixed(2)` merge fields
- [x] **UDS PDF label** — pure layout module (`lib/biz/uds-label-layout.ts`) reproduces §4.7: cols 4–8 × rows 4–7, auto font selection, truncation priority, bold simulation, double borders
- [x] PDF content-hash caching in Supabase Storage; `X-UDS-*` metadata headers

### Auth & settings
- [x] Single shared password, PBKDF2-SHA512 (1000 iters, 16-byte salt, 64-byte hash), default `farmasi456`
- [x] Tetapan password gate (client flag + server enforcement on sensitive actions)
- [x] Password change requires current + min 6 chars
- [x] **Rate-limited** login attempts (5 fails → 30-min lockout, persisted)
- [x] 16 built-in color schemes + custom scheme CRUD; active scheme in `tblSystemSettings`
- [x] Color scheme applied via CSS vars with localStorage preload for instant first paint
- [x] Year-scoped running-number admin validation

---

## Architecture Notes

- **Server Actions** are the source of truth for all mutations; TanStack Query caches their results; Zustand holds only UI state.
- **Year-scoped running numbers** are stored as `running_number_<YYYY>` / `running_number_uds_<YYYY>` in `tblSystemSettings` (approved deviation — counters reset each year).
- **Migrations** (`supabase/migrations/`):
  - `00001` public schema
  - `00002` uds schema
  - `00003` RLS policies
  - `00004` seed data (lookups + defaults)
  - `00005` transactional ID reservation RPC functions
  - `00006` auth rate-limit table