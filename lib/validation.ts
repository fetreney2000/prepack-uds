// Shared zod schemas for Server Action validation (Phase 2)
import { z } from "zod";
import { parseLuputToISO } from "@/lib/biz/luput";

// ---------- Common field helpers ----------

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarikh mesti dalam format YYYY-MM-DD");

const intOrNull = z
  .number()
  .int()
  .nullish()
  .transform((v) => v ?? null);

const numOrNull = z
  .number()
  .nullish()
  .transform((v) => v ?? null);

const strOrNull = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

// ---------- Prepack record ----------

export const prabungkusInputSchema = z.object({
  idUbat: intOrNull,
  namaUbat: z.string().trim().min(1, "Nama ubat diperlukan"),
  kategoriUbat: z.string().trim().min(1, "Kategori diperlukan"),
  tarikh: isoDate,
  namaDagangan: strOrNull,
  nomborKelompok: strOrNull,
  tarikhLuputAsal: strOrNull,
  tarikhLuputBaharu: strOrNull,
  pengilang: strOrNull,
  nomborMAL: strOrNull,
  kuantitiUntukDiprabungkus: intOrNull,
  saizPek: numOrNull,
  deskripsiPek: strOrNull,
  hargaSetiapPek: numOrNull,
  jumlahPekDihasilkan: intOrNull,
  baki: intOrNull,
  arahanTambahan: strOrNull,
});

export type PrabungkusInput = z.infer<typeof prabungkusInputSchema>;

// ---------- Medication master ----------

export const ubatInputSchema = z.object({
  deskripsiPrabungkus: strOrNull,
  namaUbat: z.string().trim().min(1, "Nama ubat diperlukan"),
  namaDagangan: strOrNull,
  kategoriUbat: z.string().trim().min(1, "Kategori diperlukan"),
  unitSKU: strOrNull,
  unitPKU: strOrNull,
  harga: numOrNull,
  saizPek: numOrNull,
  pengilang: strOrNull,
  nomborMAL: strOrNull,
  arahanTambahan: strOrNull,
  jangkaHayat: intOrNull,
  jenisLabel: intOrNull,
  jenisWorksheet: intOrNull,
});

export type UbatInput = z.infer<typeof ubatInputSchema>;

// ---------- UDS record ----------

export const udsRekodLabelInputSchema = z.object({
  Tarikh: isoDate,
  // Rujukan deliberately excluded: server-generated on create, read-only on update.
  NamaUbat: z.string().trim().min(1, "Nama ubat diperlukan"),
  Kekuatan: strOrNull,
  Kelompok: z.string().trim().min(1, "Kelompok diperlukan"),
  Luput: z.string().trim().min(1, "Luput diperlukan"),
  Kuantiti: z.number().int().min(0, "Kuantiti perlu >= 0"),
  Penyedia: z.string().trim().min(1, "Penyedia diperlukan"),
  NamaUbatID: intOrNull,
});

export type UdsRekodLabelInput = z.infer<typeof udsRekodLabelInputSchema>;

// ---------- UDS medication ----------

export const udsUbatInputSchema = z.object({
  Nama: z.string().trim().min(1, "Nama diperlukan"),
  Kekuatan: strOrNull,
});

export type UdsUbatInput = z.infer<typeof udsUbatInputSchema>;

// ---------- Lookup / settings ----------

export const lookupInputSchema = z.object({
  nama: z.string().trim().min(1, "Nama diperlukan"),
  prefix: strOrNull, // only used for kategoriUbat
});

export type LookupInput = z.infer<typeof lookupInputSchema>;

export const labelTypeInputSchema = z.object({
  deskripsiLabel: z.string().trim().min(1, "Deskripsi diperlukan"),
  namaFail: z.string().trim().min(1, "Nama fail diperlukan"),
});

export const worksheetTypeInputSchema = z.object({
  deskripsiWorksheet: z.string().trim().min(1, "Deskripsi diperlukan"),
  namaFail: z.string().trim().min(1, "Nama fail diperlukan"),
});

export const runningNumberInputSchema = z.object({
  year: z.number().int().min(2000, "Tahun tidak sah"),
  value: z.number().int().min(1, "Nilai mestilah >= 1"),
});

export type RunningNumberInput = z.infer<typeof runningNumberInputSchema>;

// ---------- Auth ----------

export const verifyPasswordSchema = z.object({
  password: z.string().max(200, "Kata laluan terlalu panjang"),
});

export const changePasswordSchema = z.object({
  current: z.string().max(200, "Kata laluan terlalu panjang"),
  next: z
    .string()
    .trim()
    .min(6, "Kata laluan baharu mestilah sekurang-kurangnya 6 aksara")
    .max(200, "Kata laluan terlalu panjang"),
});

// ---------- UDS normalization helper ----------
// Mirrors the server-side trim().toUpperCase() + canonical-name override.

export interface NormalizedUdsInput {
  Tarikh: string;
  NamaUbat: string;
  Kekuatan: string | null;
  Kelompok: string;
  Luput: string;
  Kuantiti: number;
  Penyedia: string;
  LuputNormalized: string | null;
  NamaUbatID: number | null;
}

/**
 * Normalize a validated UDS input: trim + uppercase text fields,
 * compute LuputNormalized from the Luput grammar.
 */
export function normalizeUdsInput(input: UdsRekodLabelInput): NormalizedUdsInput {
  return {
    Tarikh: input.Tarikh,
    NamaUbat: input.NamaUbat.trim().toUpperCase(),
    Kekuatan: input.Kekuatan ? input.Kekuatan.trim().toUpperCase() : null,
    Kelompok: input.Kelompok.trim().toUpperCase(),
    Luput: input.Luput.trim().toUpperCase(),
    Kuantiti: input.Kuantiti,
    Penyedia: input.Penyedia.trim().toUpperCase(),
    LuputNormalized: parseLuputToISO(input.Luput),
    NamaUbatID: input.NamaUbatID,
  };
}