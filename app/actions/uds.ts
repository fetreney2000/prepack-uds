// Server Actions — UDS label system
// Phase 2: server-generated year-scoped Rujukan (atomic via RPC),
// read-only Rujukan on update, normalization + canonical name override.
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  udsRekodLabelInputSchema,
  udsUbatInputSchema,
  normalizeUdsInput,
  type UdsRekodLabelInput,
  type UdsUbatInput,
} from "@/lib/validation";

export interface ActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------- UDS record: create (server-generated Rujukan) ----------

export async function createUdsRekodLabel(
  input: UdsRekodLabelInput,
): Promise<ActionResult<{ ID: number; Rujukan: string }>> {
  const parsed = udsRekodLabelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const norm = normalizeUdsInput(parsed.data);

  // Canonical tblNamaUbat.Nama override when NamaUbatID provided.
  const normalized = await applyCanonicalName(norm);
  const supabase = createAdminClient();

  // Server discards any client-supplied Rujukan; atomic reserve + insert.
  const { data: row, error } = await supabase.rpc("create_uds_label", {
    p_tarikh: normalized.Tarikh,
    p_namaUbat: normalized.NamaUbat,
    p_kekuatan: normalized.Kekuatan,
    p_kelompok: normalized.Kelompok,
    p_luput: normalized.Luput,
    p_kuantiti: normalized.Kuantiti,
    p_penyedia: normalized.Penyedia,
    p_luputnormalized: normalized.LuputNormalized,
    p_namaUbat_id: normalized.NamaUbatID,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/rekod-label");
  revalidatePath("/uds/laporan");
  return {
    ok: true,
    data: row as { ID: number; Rujukan: string },
  };
}

// ---------- UDS record: update (Rujukan read-only) ----------

export async function updateUdsRekodLabel(
  id: number,
  input: UdsRekodLabelInput,
): Promise<ActionResult> {
  const parsed = udsRekodLabelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const norm = normalizeUdsInput(parsed.data);
  const normalized = await applyCanonicalName(norm);
  const supabase = createAdminClient();

  // Rujukan is read-only: preserve the existing record's value.
  const { error } = await supabase
    .from("uds.tblRekodLabel")
    .update({
      Tarikh: normalized.Tarikh,
      NamaUbat: normalized.NamaUbat,
      Kekuatan: normalized.Kekuatan,
      Kelompok: normalized.Kelompok,
      Luput: normalized.Luput,
      Kuantiti: normalized.Kuantiti,
      Penyedia: normalized.Penyedia,
      LuputNormalized: normalized.LuputNormalized,
      NamaUbatID: normalized.NamaUbatID,
    })
    .eq("ID", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/rekod-label");
  revalidatePath("/uds/laporan");
  return { ok: true };
}

// ---------- UDS record: delete ----------

export async function deleteUdsRekodLabel(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("uds.tblRekodLabel").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/rekod-label");
  revalidatePath("/uds/laporan");
  return { ok: true };
}

// ---------- UDS record: preview next Rujukan (no reserve) ----------

export async function previewUdsRujukan(
  tarikh: string,
): Promise<ActionResult<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("preview_uds_rujukan", { p_tarikh: tarikh });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as string };
}

// ---------- UDS medication CRUD ----------

export async function createUdsUbat(
  input: UdsUbatInput,
): Promise<ActionResult<{ ID: number }>> {
  const parsed = udsUbatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("uds.tblNamaUbat")
    .insert({
      Nama: parsed.data.Nama.trim().toUpperCase(),
      Kekuatan: parsed.data.Kekuatan ? parsed.data.Kekuatan.trim().toUpperCase() : null,
    })
    .select("ID")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/senarai-ubat");
  return { ok: true, data: { ID: (row as { ID: number }).ID } };
}

export async function updateUdsUbat(
  id: number,
  input: UdsUbatInput,
): Promise<ActionResult> {
  const parsed = udsUbatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("uds.tblNamaUbat")
    .update({
      Nama: parsed.data.Nama.trim().toUpperCase(),
      Kekuatan: parsed.data.Kekuatan ? parsed.data.Kekuatan.trim().toUpperCase() : null,
    })
    .eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/senarai-ubat");
  return { ok: true };
}

export async function deleteUdsUbat(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("uds.tblNamaUbat").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/uds/senarai-ubat");
  return { ok: true };
}

// ---------- Helpers ----------

async function applyCanonicalName(
  norm: ReturnType<typeof normalizeUdsInput>,
): Promise<ReturnType<typeof normalizeUdsInput>> {
  if (!norm.NamaUbatID) return norm;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("uds.tblNamaUbat")
    .select("Nama")
    .eq("ID", norm.NamaUbatID)
    .single();
  if (data?.Nama) {
    return { ...norm, NamaUbat: data.Nama.trim().toUpperCase() };
  }
  return norm;
}