// ============================================================
// DOCX generation — worksheet & label templates (docxtemplater)
// Phase 3. Node runtime only.
//
// Fidelity notes (§4.6):
//   - Template file chosen by namaFail from tblJenisWorksheet /
//     tblJenisLabel, falling back to the defaults:
//       worksheet → 'Kertas Kerja - Umum.docx'
//       label     → 'label_tablet.docx'
//   - buildTemplateData composes the exact merge fields:
//     saizPekFormatted, dd/mm/yyyy dates, hargaSetiapPek.toFixed(2).
//   - Rendering uses docxtemplater with delimiters '{{ ' / ' }}',
//     paragraphLoop:true, linebreaks:true.
//
// The 34 original .docx templates are NOT vendored in this repo.
// A minimal fallback template is generated in-code so the pipeline is
// functional; drop the real files into public/templates/ to match the
// original layouts byte-for-byte.
// ============================================================

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatDate } from "@/lib/format";

// ---------- Types ----------

export interface TemplateRecord {
  ID: number;
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
export const DEFAULT_LABEL_TEMPLATE = "label_tablet.docx";

const TEMPLATE_DIR = join(process.cwd(), "public", "templates");

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
 * Load a .docx template from disk (or a generated fallback) and render
 * it with the given data. Returns the .docx buffer (Uint8Array).
 */
export async function renderDocument(
  templateFileName: string,
  data: TemplateData,
): Promise<Uint8Array> {
  let zip: PizZip;
  try {
    const file = await readFile(join(TEMPLATE_DIR, templateFileName));
    zip = new PizZip(file);
  } catch {
    // Template not vendored → use a generated minimal fallback that
    // carries all merge fields so the pipeline is functional.
    zip = createFallbackTemplate();
  }

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