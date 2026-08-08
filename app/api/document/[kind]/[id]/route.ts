// DOCX generation Route Handler — worksheet & label (download-only)
// Node runtime (docxtemplater + pizzip). Approved deviation: no Word
// shell-open; documents are download-only.
//
//   GET /api/document/worksheet/:id  → KertasKerja_<safeId>.docx
//   GET /api/document/label/:id      → Label_<safeId>.docx
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  renderDocument,
  buildTemplateData,
  DEFAULT_WORKSHEET_TEMPLATE,
  DEFAULT_LABEL_TEMPLATE,
  type TemplateRecord,
} from "@/lib/docx/template-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "worksheet" | "label";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
): Promise<NextResponse> {
  const { kind, id } = await params;
  const kindValid: Kind = kind === "label" ? "label" : "worksheet";
  const recordId = parseInt(id, 10);
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Load the prepack record.
  const { data: record, error } = await supabase
    .from("tblSenaraiPrabungkus")
    .select("*")
    .eq("ID", recordId)
    .single();

  if (error || !record) {
    return NextResponse.json({ error: "Rekod tidak dijumpai." }, { status: 404 });
  }

  // Resolve the medication: by idUbat, falling back to lookup by namaUbat.
  const med = await resolveMedication(supabase, record);

  // Determine the template file (defaults per kind).
  const templateField =
    kindValid === "label" ? "jenisLabel" : "jenisWorksheet";
  const templateTable =
    kindValid === "label" ? "tblJenisLabel" : "tblJenisWorksheet";
  const defaultTemplate =
    kindValid === "label" ? DEFAULT_LABEL_TEMPLATE : DEFAULT_WORKSHEET_TEMPLATE;

  let templateFileName = defaultTemplate;
  const medTypeId = (med as Record<string, unknown>)?.[templateField];
  if (medTypeId != null) {
    const { data: typeRow } = await supabase
      .from(templateTable)
      .select("namaFail")
      .eq("ID", medTypeId)
      .maybeSingle();
    if (typeRow?.namaFail) templateFileName = typeRow.namaFail;
  }

  // Render the document.
  const data = buildTemplateData(record as TemplateRecord, med);
  const buffer = await renderDocument(templateFileName, data);

  const safeBase = sanitizeId((record as { idPrabungkus?: string }).idPrabungkus ?? String(recordId));
  const filename =
    kindValid === "label" ? `Label_${safeBase}.docx` : `KertasKerja_${safeBase}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function resolveMedication(
  supabase: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const idUbat = record.idUbat as number | null;
  let med: Record<string, unknown> | null = null;

  if (idUbat) {
    const { data } = await supabase
      .from("tblSenaraiUbat")
      .select("*")
      .eq("ID", idUbat)
      .maybeSingle();
    med = data ?? null;
  }

  if (!med && record.namaUbat) {
    const { data } = await supabase
      .from("tblSenaraiUbat")
      .select("*")
      .eq("namaUbat", record.namaUbat)
      .maybeSingle();
    med = data ?? null;
  }

  return med;
}

/** Sanitize to [A-Za-z0-9_-] for a safe filename. */
function sanitizeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}