// Template management — replace a label/worksheet template file and
// download the raw template for editing in Word. Node runtime.
//
//   POST /api/template/[kind]/[id]  (multipart: file)  → replace
//   GET  /api/template/[kind]/[id]                      → download raw .docx
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginRequest } from "@/lib/api/same-origin";
import {
  prepareTemplateUpload,
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

interface TypeRow {
  ID: number;
  namafail: string;
}

async function resolveType(
  kind: TemplateKind,
  id: number,
): Promise<{ row: TypeRow | null; error?: string }> {
  const table = kind === "label" ? "tbljenislabel" : "tbljenisworksheet";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("ID, namafail")
    .eq("ID", id)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: "Jenis tidak dijumpai." };
  return { row: data as TypeRow };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
): Promise<NextResponse> {
  const { kind, id } = await params;
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak sah." }, { status: 403 });
  }
  const kindValid: TemplateKind = kind === "label" ? "label" : "worksheet";
  const typeId = parseInt(id, 10);
  if (Number.isNaN(typeId)) {
    return NextResponse.json({ ok: false, error: "ID tidak sah." }, { status: 400 });
  }

  const { row, error } = await resolveType(kindValid, typeId);
  if (error || !row) {
    return NextResponse.json({ ok: false, error: error ?? "Jenis tidak dijumpai." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Borang tidak sah." }, { status: 400 });
  }

  const prepared = await prepareTemplateUpload(getFile(formData));
  if (!prepared.ok) {
    return NextResponse.json({ ok: false, error: prepared.error }, { status: 400 });
  }

  // Replace writes to the row's existing namaFail key (uploaded filename is ignored).
  const supabase = createAdminClient();
  const key = templateStorageKey(kindValid, row.namafail);
  const { error: uploadErr } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .upload(key, prepared.buffer as Uint8Array, {
      contentType: DOCX_CONTENT_TYPE,
      upsert: true,
    });
  if (uploadErr) {
    return NextResponse.json(
      { ok: false, error: `Gagal memuat naik fail: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, warn: prepared.unknownFields ?? [] });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
): Promise<NextResponse> {
  const { kind, id } = await params;
  const kindValid: TemplateKind = kind === "label" ? "label" : "worksheet";
  const typeId = parseInt(id, 10);
  if (Number.isNaN(typeId)) {
    return NextResponse.json({ ok: false, error: "ID tidak sah." }, { status: 400 });
  }

  const { row, error } = await resolveType(kindValid, typeId);
  if (error || !row) {
    return NextResponse.json({ ok: false, error: error ?? "Jenis tidak dijumpai." }, { status: 404 });
  }

  const supabase = createAdminClient();
  const key = templateStorageKey(kindValid, row.namafail);
  const { data, error: downloadErr } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .download(key);
  if (downloadErr || !data) {
    return NextResponse.json({ ok: false, error: "Fail templat tidak dijumpai." }, { status: 404 });
  }

  const buffer = await data.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": DOCX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${row.namafail}"`,
    },
  });
}
