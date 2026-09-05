// ============================================================
// Seed script â€” imports original SQLite data (if provided),
// generates the admin password hash, and backfills year-scoped
// running numbers. Preserves original IDs (identity columns
// accept explicit values via OVERRIDING SYSTEM VALUE).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   PREPACK_DB=path/to/prepack_webapp.db \
//   UDS_DB=path/to/labeluds.db \
//   npm run seed
//
// If SQLite files are absent, it only ensures the admin password.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import initSqlJs, { type Database } from "sql.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREPACK_DB = process.env.PREPACK_DB;
const UDS_DB = process.env.UDS_DB;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Password helpers ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512");
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = pbkdf2Sync(password, salt, 1000, 64, "sha512");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------- SQLite reading ----------

async function openSqlite(dbPath?: string): Promise<Database | null> {
  if (!dbPath || !existsSync(dbPath)) return null;
  const SQL = await initSqlJs();
  const file = readFileSync(dbPath);
  return new SQL.Database(file);
}

function readAll(db: Database, sql: string): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return rows;
}

async function insertPreservingId(
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin.from(table).insert(rows);
  if (error) {
    console.error(`  [${table}] FAILED: ${error.message}`);
  } else {
    console.log(`  [${table}] inserted ${rows.length} rows (IDs preserved)`);
  }
}

// ---------- Main ----------

async function main() {
  // 0. Ensure the UDS label PDF caching bucket exists (free-tier safe).
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "uds-labels")) {
    const { error } = await admin.storage.createBucket("uds-labels", {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error) {
      console.error("Failed to create uds-labels bucket:", error.message);
    } else {
      console.log("Storage bucket 'uds-labels' created.");
    }
  }

  // 1. Ensure admin password (default farmasi456)
  const { data: existing } = await admin
    .from("tblsystemsettings")
    .select("settingkey")
    .eq("settingkey", "admin_password")
    .maybeSingle();

  if (!existing) {
    const hash = hashPassword("farmasi456");
    const { error } = await admin
      .from("tblsystemsettings")
      .upsert({ settingkey: "admin_password", settingvalue: hash });
    if (error) {
      console.error("Failed to set admin password:", error.message);
    } else {
      console.log("Admin password set (default farmasi456). Change it in Tetapan.");
    }
  }

  // 2. Import prepack_webapp.db
  const prepackDb = await openSqlite(PREPACK_DB);
  if (prepackDb) {
    console.log("Importing prepack_webapp.db...");
    const tables: [string, string][] = [
      ["tblJenisLabel", "SELECT * FROM tblJenisLabel"],
      ["tblJenisWorksheet", "SELECT * FROM tblJenisWorksheet"],
      ["tblKategoriUbat", "SELECT * FROM tblKategoriUbat"],
      ["tblUnitSKU", "SELECT * FROM tblUnitSKU"],
      ["tblUnitPKU", "SELECT * FROM tblUnitPKU"],
      ["tblSystemSettings", "SELECT * FROM tblSystemSettings"],
      ["tblColorSchemes", "SELECT * FROM tblColorSchemes"],
      ["tblSenaraiUbat", "SELECT * FROM tblSenaraiUbat"],
      ["tblSenaraiPrabungkus", "SELECT * FROM tblSenaraiPrabungkus"],
    ];
    for (const [table, sql] of tables) {
      const rows = readAll(prepackDb, sql);
      await insertPreservingId(`public.${table}`, rows);
    }

    // 3. Backfill year-scoped running numbers from existing PP ids.
    const { data: prabungkus } = await admin
      .from("tblsenaraiprabungkus")
      .select("idPrabungkus, tarikh");
    if (prabungkus) {
      const byYear: Record<string, number> = {};
      for (const r of prabungkus) {
        const m = /^PP-(\d{4})\/(\d{2})-(.)$/.exec(r.idPrabungkus || "");
        if (!m) continue;
        const year = r.tarikh ? r.tarikh.slice(0, 4) : "";
        if (!year) continue;
        const num = parseInt(m[1], 10);
        if (!byYear[year] || num > byYear[year]) byYear[year] = num;
      }
      for (const [year, max] of Object.entries(byYear)) {
        const key = `running_number_${year}`;
        const { error } = await admin
          .from("tblsystemsettings")
          .upsert({ settingkey: key, settingvalue: String(max + 1) });
        if (error) {
          console.error(`  Running number for ${year} FAILED: ${error.message}`);
        } else {
          console.log(`  Running number for ${year} set to ${max + 1}`);
        }
      }
    }
    prepackDb.close();
  }

  // 4. Import labeluds.db
  const udsDb = await openSqlite(UDS_DB);
  if (udsDb) {
    console.log("Importing labeluds.db...");
    const udsTables: [string, string][] = [
      ["uds.tblNamaUbat", 'SELECT "ID","Nama","Kekuatan" FROM tblNamaUbat'],
      [
        "uds.tblRekodLabel",
        'SELECT "ID","Tarikh","Rujukan","NamaUbat","Kekuatan","Kelompok","Luput","Kuantiti","Penyedia","LuputNormalized","NamaUbatID" FROM tblRekodLabel',
      ],
    ];
    for (const [table, sql] of udsTables) {
      const rows = readAll(udsDb, sql);
      await insertPreservingId(table, rows);
    }

    // 5. Backfill year-scoped UDS running numbers.
    const { data: rekod } = await admin
      .schema("uds").from("tblrekodlabel")
      .select("Rujukan, Tarikh");
    if (rekod) {
      const byYear: Record<string, number> = {};
      for (const r of rekod) {
        const m = /^UDS-(\d{4})\/(\d{2})$/.exec(r.Rujukan || "");
        if (!m) continue;
        const year = r.Tarikh ? r.Tarikh.slice(0, 4) : "";
        if (!year) continue;
        const num = parseInt(m[1], 10);
        if (!byYear[year] || num > byYear[year]) byYear[year] = num;
      }
      for (const [year, max] of Object.entries(byYear)) {
        const key = `running_number_uds_${year}`;
        const { error } = await admin
          .from("tblsystemsettings")
          .upsert({ settingkey: key, settingvalue: String(max + 1) });
        if (error) {
          console.error(`  UDS running number for ${year} FAILED: ${error.message}`);
        } else {
          console.log(`  UDS running number for ${year} set to ${max + 1}`);
        }
      }
    }
    udsDb.close();
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
