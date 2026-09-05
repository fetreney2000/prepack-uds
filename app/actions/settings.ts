// Server Actions — settings (Tetapan), year-scoped running numbers
// Phase 2: lookup CRUD (categories, units, label/worksheet types),
// year-scoped running-number validation, highest-number query.
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEMPLATE_BUCKET, templateStorageKey } from "@/lib/docx/template-constants";
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
          .from("tblkategoriubat")
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
          .from("tblkategoriubat")
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

// Template files live in Supabase Storage bucket `templates`, keyed by
// `labels/<namaFail>` / `worksheets/<namaFail>` (see lib/docx/template-constants).
// `namaFail` is derived from the uploaded .docx (app/api/template/...) and is
// immutable after creation, so updates change only the description.

export async function updateLabelType(
  id: number,
  input: { deskripsiLabel: string },
): Promise<ActionResult> {
  const parsed = labelTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tbljenislabel")
    .update({ deskripsilabel: parsed.data.deskripsiLabel })
    .eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function deleteLabelType(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("tbljenislabel")
    .select("namafail")
    .eq("ID", id)
    .maybeSingle();
  const { error } = await supabase.from("tbljenislabel").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };
  const namaFail = (target as { namafail?: string } | null)?.namafail;
  if (namaFail) {
    await supabase.storage
      .from(TEMPLATE_BUCKET)
      .remove([templateStorageKey("label", namaFail)]);
  }
  revalidateLookups();
  return { ok: true };
}

// ---------- Worksheet types (tblJenisWorksheet) ----------

export async function updateWorksheetType(
  id: number,
  input: { deskripsiWorksheet: string },
): Promise<ActionResult> {
  const parsed = worksheetTypeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tbljenisworksheet")
    .update({ deskripsiworksheet: parsed.data.deskripsiWorksheet })
    .eq("ID", id);
  if (error) return { ok: false, error: error.message };
  revalidateLookups();
  return { ok: true };
}

export async function deleteWorksheetType(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("tbljenisworksheet")
    .select("namafail")
    .eq("ID", id)
    .maybeSingle();
  const { error } = await supabase.from("tbljenisworksheet").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };
  const namaFail = (target as { namafail?: string } | null)?.namafail;
  if (namaFail) {
    await supabase.storage
      .from(TEMPLATE_BUCKET)
      .remove([templateStorageKey("worksheet", namaFail)]);
  }
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
    .from("tblsystemsettings")
    .upsert(
      { settingkey: `running_number_${year}`, settingvalue: String(value) },
      { onConflict: "settingkey" },
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
    .from("tblsystemsettings")
    .select("settingvalue")
    .eq("settingkey", `running_number_${year}`)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ? parseInt(data.settingvalue, 10) : 1 };
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
    .from("tblsystemsettings")
    .select("settingvalue")
    .eq("settingkey", "color_scheme")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data?.settingvalue ?? "light" };
}

/** Set the active color scheme id (upsert). */
export async function setActiveColorScheme(schemeId: string): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tblsystemsettings")
    .upsert(
      { settingkey: "color_scheme", settingvalue: schemeId },
      { onConflict: "settingkey" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tetapan");
  return { ok: true };
}

/** List custom color schemes (parsed from JSON columns). */
export async function listCustomColorSchemes(): Promise<ActionResult<ColorSchemeDefinition[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblcolorschemes")
    .select("*")
    .order("ID", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const schemes: ColorSchemeDefinition[] = (data ?? []).map((r) => ({
    schemeId: (r as { schemeid: string }).schemeid,
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
  const { data: clash, error: clashErr } = await supabase
    .from("tblcolorschemes")
    .select("schemeid")
    .eq("schemeid", schemeId)
    .maybeSingle();
  if (clashErr || clash) return { ok: false, error: `Skema warna '${schemeId}' sudah wujud.` };

  const css = deriveCssVars(input.colors);
  const row = {
    schemeid: schemeId,
    name,
    colors: JSON.stringify(input.colors),
    css: JSON.stringify(css),
    isbuiltin: 0,
  };
  const { data: inserted, error } = await supabase
    .from("tblcolorschemes")
    .insert(row)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tetapan");
  return {
    ok: true,
    data: {
      schemeId: (inserted as { schemeid: string }).schemeid,
      name: (inserted as { name: string }).name,
      colors: input.colors,
      css,
    },
  };
}

/**
 * Delete a custom color scheme. If it was the active scheme, reset the
 * active scheme to 'light' (both DB + client).
 */
export async function deleteCustomColorScheme(id: number): Promise<ActionResult<{ resetToLight: boolean }>> {
  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("tblcolorschemes")
    .select("schemeid")
    .eq("ID", id)
    .maybeSingle();

  const { error } = await supabase.from("tblcolorschemes").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  let resetToLight = false;
  const targetSchemeId = (target as { schemeid?: string } | null)?.schemeid;
  if (targetSchemeId) {
    const active = await getActiveColorScheme();
    if (active.ok && active.data === targetSchemeId) {
      await supabase
        .from("tblsystemsettings")
        .upsert(
          { settingkey: "color_scheme", settingvalue: "light" },
          { onConflict: "settingkey" },
        );
      resetToLight = true;
    }
  }

  revalidatePath("/tetapan");
  return { ok: true, data: { resetToLight } };
}