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
    .from("tblsenaraiprabungkus")
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
    kindValid === "label" ? "jenislabel" : "jenisworksheet";
  const templateTable =
    kindValid === "label" ? "tbljenislabel" : "tbljenisworksheet";
  const defaultTemplate =
    kindValid === "label" ? DEFAULT_LABEL_TEMPLATE : DEFAULT_WORKSHEET_TEMPLATE;

  let templateFileName = defaultTemplate;
  const medTypeId = (med as Record<string, unknown>)?.[templateField];
  if (medTypeId != null) {
    const { data: typeRow } = await supabase
      .from(templateTable)
      .select("namafail")
      .eq("ID", medTypeId)
      .maybeSingle();
    if (typeRow?.namafail) templateFileName = typeRow.namafail;
  }

  // Render the document.
  const data = buildTemplateData(mapRecord(record), med);
  const buffer = await renderDocument(templateFileName, data);

  const safeBase = sanitizeId((record as { idprabungkus?: string }).idprabungkus ?? String(recordId));
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

// Map a raw PostgREST row (lowercase unquoted columns) to the camelCase
// shape buildTemplateData expects.
function mapRecord(row: Record<string, unknown>): TemplateRecord {
  return {
    ID: row.ID as number,
    idPrabungkus: (row.idprabungkus as string) ?? "",
    tarikh: (row.tarikh as string) ?? "",
    namaUbat: (row.namaubat as string) ?? "",
    namaDagangan: (row.namadagangan as string | null) ?? null,
    nomborKelompok: (row.nomborkelompok as string | null) ?? null,
    tarikhLuputAsal: (row.tarikhluputasal as string | null) ?? null,
    tarikhLuputBaharu: (row.tarikhluputbaharu as string | null) ?? null,
    pengilang: (row.pengilang as string | null) ?? null,
    nomborMAL: (row.nombormal as string | null) ?? null,
    kuantitiUntukDiprabungkus: (row.kuantitiuntukdiprabungkus as number | null) ?? null,
    saizPek: (row.saizpek as number | null) ?? null,
    deskripsiPek: (row.deskripsipek as string | null) ?? null,
    hargaSetiapPek: (row.hargasetiappek as number | null) ?? null,
    jumlahPekDihasilkan: (row.jumlahpekdihasilkan as number | null) ?? null,
    baki: (row.baki as number | null) ?? null,
    arahanTambahan: (row.arahantambahan as string | null) ?? null,
  };
}

async function resolveMedication(
  supabase: ReturnType<typeof createAdminClient>,
  record: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const idUbat = record.idubat as number | null;
  let med: Record<string, unknown> | null = null;

  if (idUbat) {
    const { data } = await supabase
      .from("tblsenaraiubat")
      .select("*")
      .eq("ID", idUbat)
      .maybeSingle();
    med = data ?? null;
  }

  if (!med && record.namaubat) {
    const { data } = await supabase
      .from("tblsenaraiubat")
      .select("*")
      .eq("namaubat", record.namaubat)
      .maybeSingle();
    med = data ?? null;
  }

  // Normalize the fields buildTemplateData reads (camelCase).
  if (med) {
    med = {
      ...med,
      unitSKU: med.unitsku ?? med.unitSKU ?? null,
      kategoriUbat: med.kategoriubat ?? med.kategoriUbat ?? null,
    };
  }

  return med;
}

/** Sanitize to [A-Za-z0-9_-] for a safe filename. */
function sanitizeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}