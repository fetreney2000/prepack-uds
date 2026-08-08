// Server Actions — settings (Tetapan), year-scoped running numbers
// Phase 2: lookup CRUD (categories, units, label/worksheet types),
// year-scoped running-number validation, highest-number query.
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lookupInputSchema,
  labelTypeInputSchema,
  worksheetTypeInputSchema,
  runningNumberInputSchema,
  type LookupInput,
} from "@/lib/validation";

export interface ActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------- Generic lookup CRUD (kategori, unit-sku, unit-pku) ----------

export async function createLookup(
  table: "tblKategoriUbat" | "tblUnitSKU" | "tblUnitPKU",
  input: LookupInput,
): Promise<ActionResult> {
  const parsed = lookupInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const supabase = createAdminClient();
  const { error } =
    table === "tblKategoriUbat"
      ? await supabase
          .from("tblKategoriUbat")
          .insert({ nama: parsed.data.nama, prefix: parsed.data.prefix ?? "X" })
      : await supabase.from(table).insert({ nama: parsed.data.nama });
  if (error) return { ok: false, error: error.message };

  revalidateLookups();
  return { ok: true };
}

export async function updateLookup(
  table: "tblKategoriUbat" | "tblUnitSKU" | "tblUnitPKU",
  id: number,
  input: LookupInput,
): Promise<ActionResult> {
  const parsed = lookupInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const supabase = createAdminClient();
  const { error } =
    table === "tblKategoriUbat"
      ? await supabase
          .from("tblKategoriUbat")
          .update({ nama: parsed.data.nama, prefix: parsed.data.prefix ?? "X" })
          .eq("ID", id)
      : await supabase.from(table).update({ nama: parsed.data.nama }).eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidateLookups();
  return { ok: true };
}

export async function deleteLookup(
  table: "tblKategoriUbat" | "tblUnitSKU" | "tblUnitPKU",
  id: number,
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidateLookups();
  return { ok: true };
}

// ---------- Label types (tblJenisLabel) ----------

export async function createLabelType(input: {
  deskripsiLabel: string;
  namaFail: string;
}): Promise<ActionResult> {
  const parsed = labelTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisLabel").insert(parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function updateLabelType(
  id: number,
  input: { deskripsiLabel: string; namaFail: string },
): Promise<ActionResult> {
  const parsed = labelTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisLabel").update(parsed.data).eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function deleteLabelType(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisLabel").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

// ---------- Worksheet types (tblJenisWorksheet) ----------

export async function createWorksheetType(input: {
  deskripsiWorksheet: string;
  namaFail: string;
}): Promise<ActionResult> {
  const parsed = worksheetTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisWorksheet").insert(parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function updateWorksheetType(
  id: number,
  input: { deskripsiWorksheet: string; namaFail: string },
): Promise<ActionResult> {
  const parsed = worksheetTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisWorksheet").update(parsed.data).eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function deleteWorksheetType(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblJenisWorksheet").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

// ---------- Running number (year-scoped, validated) ----------

/**
 * Year-scoped running-number update. Rejects values <= the highest used
 * number for that year (derived from existing PP-NNNN/YY ids).
 * Returns the highest number in the error metadata for client display.
 */
export async function updateRunningNumber(
  year: number,
  value: number,
): Promise<ActionResult<{ highest: number }>> {
  const parsed = runningNumberInputSchema.safeParse({ year, value });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const supabase = createAdminClient();

  const { data: highest, error: highErr } = await supabase.rpc(
    "highest_prepack_number",
    { p_year: year },
  );
  if (highErr) return { ok: false, error: highErr.message };
  const maxNumber: number = highest ?? 0;

  if (value <= maxNumber) {
    return {
      ok: false,
      error: `Nilai nombor berurutan mesti melebihi nombor tertinggi yang digunakan (${maxNumber}).`,
      data: { highest: maxNumber },
    };
  }

  const { error } = await supabase
    .from("tblSystemSettings")
    .upsert(
      { settingKey: `running_number_${year}`, settingValue: String(value) },
      { onConflict: "settingKey" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tetapan");
  return { ok: true, data: { highest: maxNumber } };
}

/**
 * Read the current running number for a year (default 1 if absent).
 */
export async function getRunningNumber(year: number): Promise<ActionResult<number>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblSystemSettings")
    .select("settingValue")
    .eq("settingKey", `running_number_${year}`)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ? parseInt(data.settingValue, 10) : 1 };
}

// ---------- Helpers ----------

function revalidateLookups() {
  revalidatePath("/tetapan");
  revalidatePath("/senarai-ubat");
  revalidatePath("/rekod-prabungkus");
}