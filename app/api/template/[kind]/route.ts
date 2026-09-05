// Template management — create a new label/worksheet type + upload its .docx.
// Node runtime. Tetapan password gate is UI-level (matches existing settings).
//
//   POST /api/template/label      (multipart: deskripsi + file)
//   POST /api/template/worksheet  (multipart: deskripsi + file)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginRequest } from "@/lib/api/same-origin";
import {
  prepareTemplateUpload,
  sanitizeTemplateFileName,
  templateStorageKey,
  TEMPLATE_BUCKET,
  type TemplateKind,
} from "@/lib/docx/template-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getFile(formData: FormData): File | null {
  const value = formData.get("file");
  return typeof value === "string" ? null : value;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<NextResponse> {
  const { kind } = await params;
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak sah." }, { status: 403 });
  }
  const kindValid: TemplateKind = kind === "label" ? "label" : "worksheet";
  const isLabel = kindValid === "label";
  const table = isLabel ? "tbljenislabel" : "tbljenisworksheet";
  const descColumn = isLabel ? "deskripsilabel" : "deskripsiworksheet";
  const nameColumn = "namafail";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Borang tidak sah." }, { status: 400 });
  }

  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  if (!deskripsi) {
    return NextResponse.json(
      { ok: false, error: "Deskripsi diperlukan." },
      { status: 400 },
    );
  }

  const file = getFile(formData);
  const prepared = await prepareTemplateUpload(file);
  if (!prepared.ok) {
    return NextResponse.json({ ok: false, error: prepared.error }, { status: 400 });
  }

  const namaFail = sanitizeTemplateFileName(file?.name ?? "");
  if (!namaFail) {
    return NextResponse.json(
      { ok: false, error: "Nama fail tidak sah." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // namaFail is unique within the table (it maps to a single storage key).
  const { data: clash, error: clashErr } = await supabase
    .from(table)
    .select("ID")
    .eq(nameColumn, namaFail)
    .maybeSingle();
  if (clashErr || clash) {
    return NextResponse.json(
      { ok: false, error: "Nama fail sudah wujud." },
      { status: 409 },
    );
  }

  // Insert the type row first, then upload; roll back the row on failure.
  const { data: inserted, error: insertErr } = await supabase
    .from(table)
    .insert({ [descColumn]: deskripsi, [nameColumn]: namaFail })
    .select("ID")
    .single();
  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Nama fail sudah wujud." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: insertErr.message ?? "Gagal mencipta jenis." },
      { status: 500 },
    );
  }
  if (!inserted) {
    return NextResponse.json(
      { ok: false, error: "Gagal mencipta jenis." },
      { status: 500 },
    );
  }

  const key = templateStorageKey(kindValid, namaFail);
  const { error: uploadErr } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .upload(key, prepared.buffer as Uint8Array, {
      contentType: DOCX_CONTENT_TYPE,
      upsert: false,
    });
  if (uploadErr) {
    await supabase.from(table).delete().eq("ID", (inserted as { ID: number }).ID);
    return NextResponse.json(
      { ok: false, error: `Gagal memuat naik fail: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: (inserted as { ID: number }).ID,
    warn: prepared.unknownFields ?? [],
  });
}
