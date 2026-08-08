// UDS label PDF Route Handler — pdfkit (Node runtime)
// Phase 3. Reproduces the §4.7 grid/font fitting algorithm and streams
// the PDF. Content-hash caching in Supabase Storage: for a given record
// + options the PDF is deterministic, so it is cached under a hash key
// (avoids re-render on reprint within Vercel Hobby function-time limits).
// The layout metadata is stored alongside as a JSON sidecar so cached
// responses retain the X-UDS-* headers.
//
// Headers (as the original client toast reads):
//   X-UDS-Font, X-UDS-Font-Size, X-UDS-Grid (colsxrows),
//   X-UDS-Cells, X-UDS-Mode
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderUdsLabelPdf } from "@/lib/pdf/uds-label-pdf";
import type { UdsMode } from "@/lib/biz/uds-label-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "uds-labels";

interface LayoutMeta {
  font: string;
  fontSize: number;
  cols: number;
  rows: number;
  cellsCount: number;
  mode: UdsMode;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Load the record.
  const { data: record, error } = await supabase
    .schema("uds")
    .from("tblrekodlabel")
    .select("*")
    .eq("ID", recordId)
    .single();

  if (error || !record) {
    return NextResponse.json({ error: "Rekod tidak dijumpai." }, { status: 404 });
  }

  // Canonical Nama from tblNamaUbat when NamaUbatID is valid, else stored.
  let canonicalNama = (record as { NamaUbat: string }).NamaUbat;
  let canonicalKekuatan = (record as { Kekuatan: string | null }).Kekuatan;
  const namaUbatId = (record as { NamaUbatID: number | null }).NamaUbatID;
  if (namaUbatId) {
    const { data: med } = await supabase
      .schema("uds")
      .from("tblnamaubat")
      .select("Nama, Kekuatan")
      .eq("ID", namaUbatId)
      .maybeSingle();
    if (med) {
      canonicalNama = (med as { Nama: string }).Nama;
      canonicalKekuatan = (med as { Kekuatan: string | null }).Kekuatan ?? canonicalKekuatan;
    }
  }

  // Parse options (auto/manual grid + font).
  const url = new URL(req.url);
  const mode: UdsMode = url.searchParams.get("mode") === "manual" ? "manual" : "auto";
  const cols = numParam(url, "cols");
  const rows = numParam(url, "rows");
  const font = url.searchParams.get("font") ?? undefined;
  const fontSize = numParam(url, "fontSize");

  // Content-hash cache key: record + options.
  const cacheKey = `${recordId}_${mode}_${cols ?? "a"}_${rows ?? "a"}_${font ?? "a"}_${fontSize ?? "a"}`;
  const hash = await sha256(cacheKey);

  // Serve from cache when present.
  const cached = await tryGetCached(supabase, hash);
  if (cached) {
    return respond(cached.buffer, cached.meta, (record as { Rujukan: string }).Rujukan);
  }

  // Render fresh.
  const result = await renderUdsLabelPdf({
    nama: canonicalNama,
    kekuatan: canonicalKekuatan,
    kelompok: (record as { Kelompok: string }).Kelompok,
    luput: (record as { Luput: string }).Luput,
    mode,
    cols,
    rows,
    font,
    fontSize,
  });

  const meta: LayoutMeta = {
    font: result.font,
    fontSize: result.fontSize,
    cols: result.cols,
    rows: result.rows,
    cellsCount: result.cellsCount,
    mode: result.mode,
  };

  // Best-effort cache write (non-fatal on failure).
  await tryPutCached(supabase, hash, result.buffer, meta);

  return respond(result.buffer, meta, (record as { Rujukan: string }).Rujukan);
}

// ---------- response ----------

function respond(
  buffer: Uint8Array,
  meta: LayoutMeta,
  rujukan: string,
): Response {
  const safeRujukan = rujukan.replace(/[^A-Z0-9-_.]/gi, "_");
  const filename = `UDS-${safeRujukan}.pdf`;
  const pdfBlob = new Blob([buffer as unknown as BlobPart], { type: "application/pdf" });
  return new Response(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-UDS-Font": meta.font,
      "X-UDS-Font-Size": String(meta.fontSize),
      "X-UDS-Grid": `${meta.cols}x${meta.rows}`,
      "X-UDS-Cells": String(meta.cellsCount),
      "X-UDS-Mode": meta.mode,
      "Cache-Control": "public, immutable",
    },
  });
}

// ---------- helpers ----------

function numParam(url: URL, key: string): number | undefined {
  const v = url.searchParams.get(key);
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function tryGetCached(
  supabase: ReturnType<typeof createAdminClient>,
  hash: string,
): Promise<{ buffer: Uint8Array; meta: LayoutMeta } | null> {
  const [pdfRes, metaRes] = await Promise.all([
    supabase.storage.from(BUCKET).download(`${hash}.pdf`),
    supabase.storage.from(BUCKET).download(`${hash}.json`),
  ]);
  if (pdfRes.error || !pdfRes.data || metaRes.error || !metaRes.data) return null;
  const buf = await pdfRes.data.arrayBuffer();
  const meta = (await metaRes.data.text()) as string;
  let parsed: LayoutMeta;
  try {
    parsed = JSON.parse(meta) as LayoutMeta;
  } catch {
    return null;
  }
  return { buffer: new Uint8Array(buf), meta: parsed };
}

async function tryPutCached(
  supabase: ReturnType<typeof createAdminClient>,
  hash: string,
  buffer: Uint8Array,
  meta: LayoutMeta,
): Promise<void> {
  try {
    await supabase.storage.from(BUCKET).upload(`${hash}.pdf`, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    await supabase.storage.from(BUCKET).upload(`${hash}.json`, JSON.stringify(meta), {
      contentType: "application/json",
      upsert: true,
    });
  } catch {
    // Cache write failures are non-fatal.
  }
}