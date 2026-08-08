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
import { deriveCssVars, schemeIdFromName } from "@/lib/color-schemes";
import type { ColorSchemeDefinition } from "@/stores/color-scheme-store";

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

// ---------- Color schemes (§4.9) ----------

/** Get the active color scheme id (from tblSystemSettings.color_scheme). */
export async function getActiveColorScheme(): Promise<ActionResult<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblSystemSettings")
    .select("settingValue")
    .eq("settingKey", "color_scheme")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data?.settingValue ?? "earthy" };
}

/** Set the active color scheme id (upsert). */
export async function setActiveColorScheme(schemeId: string): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tblSystemSettings")
    .upsert(
      { settingKey: "color_scheme", settingValue: schemeId },
      { onConflict: "settingKey" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tetapan");
  return { ok: true };
}

/** List custom color schemes (parsed from JSON columns). */
export async function listCustomColorSchemes(): Promise<ActionResult<ColorSchemeDefinition[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblColorSchemes")
    .select("*")
    .order("ID", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const schemes: ColorSchemeDefinition[] = (data ?? []).map((r) => ({
    schemeId: (r as { schemeId: string }).schemeId,
    name: (r as { name: string }).name,
    colors: JSON.parse((r as { colors: string }).colors || "[]") as string[],
    css: JSON.parse((r as { css: string }).css || "{}") as Record<string, string>,
  }));
  return { ok: true, data: schemes };
}

/**
 * Create a custom color scheme from a name + 5 colors. Generates the
 * schemeId from the name, derives CSS vars, and rejects duplicate ids.
 */
export async function createCustomColorScheme(input: {
  name: string;
  colors: string[];
}): Promise<ActionResult<ColorSchemeDefinition>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama skema warna diperlukan." };
  if (!Array.isArray(input.colors) || input.colors.length !== 5) {
    return { ok: false, error: "Skema warna mesti mengandungi 5 warna." };
  }
  const schemeId = schemeIdFromName(name);
  if (!schemeId) return { ok: false, error: "Nama skema warna tidak sah." };

  const supabase = createAdminClient();

  // Duplicate schemeId check (built-in or custom).
  const { data: clash } = await supabase
    .from("tblColorSchemes")
    .select("schemeId")
    .eq("schemeId", schemeId)
    .maybeSingle();
  if (clash) return { ok: false, error: `Skema warna '${schemeId}' sudah wujud.` };

  const css = deriveCssVars(input.colors);
  const row = {
    schemeId,
    name,
    colors: JSON.stringify(input.colors),
    css: JSON.stringify(css),
    isBuiltIn: 0,
  };
  const { data: inserted, error } = await supabase
    .from("tblColorSchemes")
    .insert(row)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tetapan");
  return {
    ok: true,
    data: {
      schemeId: (inserted as { schemeId: string }).schemeId,
      name: (inserted as { name: string }).name,
      colors: input.colors,
      css,
    },
  };
}

/**
 * Delete a custom color scheme. If it was the active scheme, reset the
 * active scheme to 'earthy' (both DB + client).
 */
export async function deleteCustomColorScheme(id: number): Promise<ActionResult<{ resetToEarthy: boolean }>> {
  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("tblColorSchemes")
    .select("schemeId")
    .eq("ID", id)
    .maybeSingle();

  const { error } = await supabase.from("tblColorSchemes").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  let resetToEarthy = false;
  if (target) {
    const active = await getActiveColorScheme();
    if (active.ok && active.data === target.schemeId) {
      await supabase
        .from("tblSystemSettings")
        .upsert(
          { settingKey: "color_scheme", settingValue: "earthy" },
          { onConflict: "settingKey" },
        );
      resetToEarthy = true;
    }
  }

  revalidatePath("/tetapan");
  return { ok: true, data: { resetToEarthy } };
}