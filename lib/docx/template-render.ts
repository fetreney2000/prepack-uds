// ============================================================
// DOCX generation — worksheet & label templates (docxtemplater)
// Phase 3. Node runtime only.
//
// Fidelity notes (§4.6):
//   - Template file chosen by namaFail from tblJenisWorksheet /
//     tblJenisLabel, falling back to the defaults:
//       worksheet → 'Kertas Kerja - Umum.docx'
//       label     → 'Tablet - Nama - Sebelum - Saiz L.docx'
//   - buildTemplateData composes the exact merge fields:
//     saizPekFormatted, dd/mm/yyyy dates, hargaSetiapPek.toFixed(2).
//   - Rendering uses docxtemplater with delimiters '{{ ' / ' }}',
//     paragraphLoop:true, linebreaks:true.
//
// Templates are stored in Supabase Storage (bucket `templates`) keyed by
// `labels/<namaFail>` / `worksheets/<namaFail>`; the renderer receives raw
// bytes. The public/templates/ files are only used as the one-time upload
// source and repo backup, not read at render time.
// ============================================================

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/format";
import { TEMPLATE_BUCKET, templateStorageKey } from "./template-constants";
import type { TemplateKind } from "./template-constants";

export { TEMPLATE_BUCKET, templateStorageKey };
export type { TemplateKind };

// ---------- Types ----------

export interface TemplateRecord {
  ID: number;
  idPrabungkus?: string;
  tarikh: string;
  namaUbat: string;
  namaDagangan?: string | null;
  nomborKelompok?: string | null;
  tarikhLuputAsal?: string | null;
  tarikhLuputBaharu?: string | null;
  pengilang?: string | null;
  nomborMAL?: string | null;
  kuantitiUntukDiprabungkus?: number | null;
  saizPek?: number | null;
  deskripsiPek?: string | null;
  hargaSetiapPek?: number | null;
  jumlahPekDihasilkan?: number | null;
  baki?: number | null;
  arahanTambahan?: string | null;
}

export interface TemplateMedication {
  unitSKU?: string | null;
}

export interface TemplateData {
  id: number;
  idPrabungkus?: string;
  saizPekFormatted: string;
  tarikh: string;
  tarikhLuputAsal: string;
  tarikhLuputBaharu: string;
  hargaSetiapPek: string;
  namaUbat: string;
  namaDagangan: string;
  nomborKelompok: string;
  pengilang: string;
  nomborMAL: string;
  kuantitiUntukDiprabungkus: number;
  saizPek: number;
  deskripsiPek: string;
  jumlahPekDihasilkan: number;
  baki: number;
  arahanTambahan: string;
}

export const DEFAULT_WORKSHEET_TEMPLATE = "Kertas Kerja - Umum.docx";
export const DEFAULT_LABEL_TEMPLATE = "Tablet - Nama - Sebelum - Saiz L.docx";

/** A merge field exposed to templates, with a Malay label + description. */
export interface TemplateField {
  key: string;
  label: string;
  description: string;
}

/**
 * All merge fields available to label/worksheet templates (Jinja-style
 * `{{ field }}` placeholders, rendered by docxtemplater). Single source of
 * truth used for both the Tetapan UI and upload validation.
 */
export const TEMPLATE_FIELDS: TemplateField[] = [
  { key: "idPrabungkus", label: "ID Prabungkus", description: "No. rujukan prabungkus (cth: PP-0001/26-1)" },
  { key: "namaUbat", label: "Nama Ubat", description: "Nama generik ubat" },
  { key: "namaDagangan", label: "Nama Dagangan", description: "Nama jenama/dagangan ubat" },
  { key: "nomborKelompok", label: "No. Kelompok", description: "Nombor kelompok (batch)" },
  { key: "saizPek", label: "Saiz Pek", description: "Saiz pek (nombor)" },
  { key: "saizPekFormatted", label: "Saiz Pek + Unit", description: "Saiz pek dengan unit SKU (cth: 30 TAB)" },
  { key: "deskripsiPek", label: "Deskripsi Pek", description: "Deskripsi pek" },
  { key: "kuantitiUntukDiprabungkus", label: "Kuantiti Diprabungkus", description: "Kuantiti untuk diprabungkus" },
  { key: "jumlahPekDihasilkan", label: "Jumlah Pek", description: "Jumlah pek dihasilkan" },
  { key: "baki", label: "Baki", description: "Baki lebihan selepas prabungkus" },
  { key: "tarikh", label: "Tarikh", description: "Tarikh prabungkus (dd/mm/yyyy)" },
  { key: "tarikhLuputAsal", label: "Tarikh Luput Asal", description: "Tarikh luput asal (dd/mm/yyyy)" },
  { key: "tarikhLuputBaharu", label: "Tarikh Luput Baharu", description: "Tarikh luput baharu (dd/mm/yyyy)" },
  { key: "hargaSetiapPek", label: "Harga Setiap Pek", description: "Harga setiap pek (2 titik perpuluhan)" },
  { key: "pengilang", label: "Pengilang", description: "Nama pengilang" },
  { key: "nomborMAL", label: "No. MAL", description: "Nombor pendaftaran MAL" },
  { key: "arahanTambahan", label: "Arahan Tambahan", description: "Arahan tambahan ubat" },
  { key: "id", label: "ID Rekod", description: "ID dalaman rekod (angka)" },
];

/** Merge field keys — used for upload warnings. */
export const KNOWN_MERGE_FIELDS: string[] = TEMPLATE_FIELDS.map((f) => f.key);

/**
 * Compose the merge data for a worksheet/label template (§4.6).
 * Dates → dd/mm/yyyy; harga → fixed 2 decimals; all with original
 * fallback semantics ('' or 0).
 */
export function buildTemplateData(
  record: TemplateRecord,
  ubat?: TemplateMedication | null,
): TemplateData {
  let saizPekFormatted = "";
  // saizPek + " " + first 3 chars of unitSKU (only if both present)
  if (record.saizPek != null && ubat?.unitSKU) {
    saizPekFormatted = `${record.saizPek} ${ubat.unitSKU.trim().slice(0, 3)}`;
  }

  return {
    id: record.ID,
    idPrabungkus: (record as { idPrabungkus?: string }).idPrabungkus ?? "",
    saizPekFormatted,
    tarikh: formatDate(record.tarikh),
    tarikhLuputAsal: formatDate(record.tarikhLuputAsal),
    tarikhLuputBaharu: formatDate(record.tarikhLuputBaharu),
    hargaSetiapPek: (record.hargaSetiapPek ?? 0).toFixed(2),
    namaUbat: record.namaUbat ?? "",
    namaDagangan: record.namaDagangan ?? "",
    nomborKelompok: record.nomborKelompok ?? "",
    pengilang: record.pengilang ?? "",
    nomborMAL: record.nomborMAL ?? "",
    kuantitiUntukDiprabungkus: record.kuantitiUntukDiprabungkus ?? 0,
    saizPek: record.saizPek ?? 0,
    deskripsiPek: record.deskripsiPek ?? "",
    jumlahPekDihasilkan: record.jumlahPekDihasilkan ?? 0,
    baki: record.baki ?? 0,
    arahanTambahan: record.arahanTambahan ?? "",
  };
}

/**
 * Download a template's raw bytes from Supabase Storage. Returns null only
 * when the object is genuinely absent (caller falls back to the generated
 * minimal template). Other failures (bucket missing, permission, network)
 * throw so a misconfigured deployment fails loudly instead of degrading.
 */
// Short-TTL in-memory cache so batch renders don't re-download identical
// template bytes. Bounded staleness (60s) avoids needing cross-instance
// invalidation after a replace.
const templateCache = new Map<string, { buffer: Uint8Array; expiresAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 60_000;

export async function loadTemplateBuffer(
  supabase: SupabaseClient,
  storageKey: string,
): Promise<Uint8Array | null> {
  const cached = templateCache.get(storageKey);
  if (cached && cached.expiresAt > Date.now()) return cached.buffer;

  const { data, error } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .download(storageKey);

  if (error) {
    const status =
      (error as { statusCode?: number; status?: number }).statusCode ??
      (error as { status?: number }).status;
    if (status === 404 || /not found/i.test(error.message)) return null;
    console.error("[template-render] storage download failed:", error.message);
    throw new Error(`Gagal memuat templat: ${error.message}`);
  }
  if (!data) return null;

  const buf = new Uint8Array(await data.arrayBuffer());
  templateCache.set(storageKey, {
    buffer: buf,
    expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS,
  });
  return buf;
}

/**
 * Render a .docx template (raw bytes) with the given merge data.
 * Returns the rendered .docx buffer.
 */
export function renderDocument(buffer: Uint8Array, data: TemplateData): Uint8Array {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{ ", end: " }}" },
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);
  return doc.getZip().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });
}

export interface TemplateInspection {
  valid: boolean;
  unknownFields: string[];
}

/**
 * Validate that a buffer is a real .docx (zip with word/document.xml)
 * and extract any {{ merge fields }} that are not part of the known set.
 */
export function inspectTemplate(buffer: Uint8Array): TemplateInspection {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return { valid: false, unknownFields: [] };
  }

  const documentXml = zip.file("word/document.xml");
  if (!documentXml) return { valid: false, unknownFields: [] };

  const xml = documentXml.asText();
  const tokens = Array.from(
    xml.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g),
    (m) => m[1].trim(),
  );
  const known = new Set<string>(KNOWN_MERGE_FIELDS);
  const unknownFields = Array.from(new Set(tokens)).filter(
    (t) => t.length > 0 && !known.has(t),
  );
  return { valid: true, unknownFields };
}

/** Maximum accepted .docx template size. Kept under Vercel's ~4.5 MB request
 *  body limit so the server-side check is actually reachable. */
export const MAX_TEMPLATE_SIZE = 4 * 1024 * 1024;

/** Sanitize a user-supplied filename to a safe storage key ([A-Za-z0-9 ._-]). */
export function sanitizeTemplateFileName(name: string): string {
  return name
    .replace(/^.*[\\/]/, "")
    .replace(/[^A-Za-z0-9 ._-]/g, "_")
    .trim();
}

export interface TemplateUploadResult {
  ok: boolean;
  error?: string;
  buffer?: Uint8Array;
  unknownFields?: string[];
}

/**
 * Validate and read a template File from a multipart form: size, .docx
 * extension, and valid zip structure. Returns the raw bytes and any
 * unrecognized merge fields (non-blocking warning).
 */
export async function prepareTemplateUpload(
  file: File | null,
): Promise<TemplateUploadResult> {
  if (!file) return { ok: false, error: "Fail tidak diberikan." };
  if (file.size === 0) return { ok: false, error: "Fail kosong." };
  if (file.size > MAX_TEMPLATE_SIZE) {
    return { ok: false, error: "Saiz fail melebihi 4 MB." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { ok: false, error: "Hanya fail .docx dibenarkan." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectTemplate(buffer);
  if (!inspection.valid) {
    return { ok: false, error: "Fail bukan dokumen .docx yang sah." };
  }
  return { ok: true, buffer, unknownFields: inspection.unknownFields };
}

/**
 * Render the minimal fallback template carrying all merge fields.
 * Used when a referenced template is absent (never fails a render).
 */
export function createFallbackTemplateBuffer(): Uint8Array {
  return createFallbackTemplate().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });
}

/**
 * Build a minimal valid .docx containing the standard merge fields.
 * Used only when the real template file is absent.
 */
function createFallbackTemplate(): PizZip {
  const fields = [
    "idPrabungkus",
    "tarikh",
    "namaUbat",
    "namaDagangan",
    "nomborKelompok",
    "saizPekFormatted",
    "tarikhLuputAsal",
    "tarikhLuputBaharu",
    "pengilang",
    "nomborMAL",
    "kuantitiUntukDiprabungkus",
    "deskripsiPek",
    "hargaSetiapPek",
    "jumlahPekDihasilkan",
    "baki",
    "arahanTambahan",
  ];

  const body = fields
    .map(
      (f) =>
        `<w:p><w:r><w:t>{{ ${f} }}</w:t></w:r></w:p>`,
    )
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;

  const contentType = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentType);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", documentXml);
  return zip;
}
