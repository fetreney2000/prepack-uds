// ============================================================
// One-time upload of the built-in DOCX templates into Supabase
// Storage (bucket `templates`).
//
// Runs AFTER migrate-2026.ts (or seed.ts) so tblJenisLabel /
// tblJenisWorksheet contain the authoritative namaFail values.
// Uploads public/templates/<namaFail> to:
//   - labels/<namaFail>      (tblJenisLabel)
//   - worksheets/<namaFail>  (tblJenisWorksheet)
// Files referenced by a type row but missing from the repo are
// logged as skipped.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx supabase/upload-templates.ts
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  TEMPLATE_BUCKET,
  templateStorageKey,
} from "../lib/docx/template-constants";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEMPLATE_DIR = join(process.cwd(), "public", "templates");
const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TypeRow {
  ID: number;
  namafail: string;
}

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === TEMPLATE_BUCKET)) return;
  const { error } = await admin.storage.createBucket(TEMPLATE_BUCKET, {
    public: false,
    fileSizeLimit: 4 * 1024 * 1024,
  });
  if (error) {
    console.error(`Failed to create '${TEMPLATE_BUCKET}' bucket:`, error.message);
    process.exit(1);
  }
  console.log(`Storage bucket '${TEMPLATE_BUCKET}' created.`);
}

async function uploadForTable(
  table: "tbljenislabel" | "tbljenisworksheet",
  kind: "label" | "worksheet",
): Promise<void> {
  const { data, error } = await admin.from(table).select("ID, namafail");
  if (error) {
    console.error(`  [${table}] select failed: ${error.message}`);
    return;
  }

  const rows = (data ?? []) as TypeRow[];
  let uploaded = 0;
  let skipped = 0;

  for (const row of rows) {
    const namaFail = row.namafail;
    if (!namaFail) {
      skipped += 1;
      continue;
    }

    const filePath = join(TEMPLATE_DIR, namaFail);
    if (!existsSync(filePath)) {
      console.log(`  [${table}] SKIP (missing file): ${namaFail}`);
      skipped += 1;
      continue;
    }

    const fileBytes = readFileSync(filePath);
    const key = templateStorageKey(kind, namaFail);
    const { error: uploadErr } = await admin.storage
      .from(TEMPLATE_BUCKET)
      .upload(key, fileBytes, {
        contentType: DOCX_CONTENT_TYPE,
        upsert: true,
      });
    if (uploadErr) {
      console.error(`  [${table}] FAILED ${namaFail}: ${uploadErr.message}`);
    } else {
      uploaded += 1;
    }
  }

  console.log(`  [${table}] uploaded ${uploaded}, skipped ${skipped}`);
}

async function main(): Promise<void> {
  await ensureBucket();
  console.log("=== Uploading label templates ===");
  await uploadForTable("tbljenislabel", "label");
  console.log("=== Uploading worksheet templates ===");
  await uploadForTable("tbljenisworksheet", "worksheet");
  console.log("Template upload complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
