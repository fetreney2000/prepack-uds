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

  const file = getFile(formData);
  const prepared = await prepareTemplateUpload(file);
  if (!prepared.ok) {
    return NextResponse.json({ ok: false, error: prepared.error }, { status: 400 });
  }

  const supabase = createAdminClient();
  const table = kindValid === "label" ? "tbljenislabel" : "tbljenisworksheet";

  const oldName = row.namafail;
  const newName = sanitizeTemplateFileName(file?.name ?? "");
  const nameChanged = newName.length > 0 && newName !== oldName;

  if (nameChanged) {
    // Reject a rename that collides with another row's filename.
    const { data: clash, error: clashErr } = await supabase
      .from(table)
      .select("ID")
      .eq("namafail", newName)
      .neq("ID", typeId)
      .maybeSingle();
    if (clashErr || clash) {
      return NextResponse.json(
        { ok: false, error: "Nama fail sudah wujud." },
        { status: 409 },
      );
    }
  }

  const key = templateStorageKey(kindValid, nameChanged ? newName : oldName);
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

  if (nameChanged) {
    // Point the row at the new filename (render + download read this).
    const { error: updateErr } = await supabase
      .from(table)
      .update({ namafail: newName })
      .eq("ID", typeId);
    if (updateErr) {
      await supabase.storage.from(TEMPLATE_BUCKET).remove([key]);
      return NextResponse.json(
        { ok: false, error: `Gagal mengemas kini nama fail: ${updateErr.message}` },
        { status: 500 },
      );
    }
    // Remove the previous object (best-effort).
    await supabase.storage
      .from(TEMPLATE_BUCKET)
      .remove([templateStorageKey(kindValid, oldName)]);
  }

  return NextResponse.json({
    ok: true,
    warn: prepared.unknownFields ?? [],
    namaFail: nameChanged ? newName : oldName,
  });
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
