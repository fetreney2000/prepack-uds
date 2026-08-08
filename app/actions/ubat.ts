// Server Actions — medication master (tblSenaraiUbat)
// Phase 2: CRUD with zod validation. Soft-delete semantics preserved
// (deleting a medication never cascades; orphaned prepack records keep
// their denormalized namaUbat — no FK, app-level integrity only).
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ubatInputSchema, type UbatInput } from "@/lib/validation";

export interface ActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------- Create ----------

export async function createUbat(
  input: UbatInput,
): Promise<ActionResult<{ ID: number }>> {
  const parsed = ubatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("tblsenaraiubat")
    .insert({
      deskripsiprabungkus: data.deskripsiPrabungkus,
      namaubat: data.namaUbat,
      namadagangan: data.namaDagangan,
      kategoriubat: data.kategoriUbat,
      unitsku: data.unitSKU,
      unitpku: data.unitPKU,
      harga: data.harga,
      saizpek: data.saizPek,
      pengilang: data.pengilang,
      nombormal: data.nomborMAL,
      arahantambahan: data.arahanTambahan,
      jangkahayat: data.jangkaHayat,
      jenislabel: data.jenisLabel,
      jenisworksheet: data.jenisWorksheet,
    })
    .select("ID")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/senarai-ubat");
  revalidatePath("/rekod-prabungkus");
  return { ok: true, data: { ID: (row as { ID: number }).ID } };
}

// ---------- Update ----------

export async function updateUbat(
  id: number,
  input: UbatInput,
): Promise<ActionResult> {
  const parsed = ubatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tblsenaraiubat")
    .update({
      deskripsiprabungkus: data.deskripsiPrabungkus,
      namaubat: data.namaUbat,
      namadagangan: data.namaDagangan,
      kategoriubat: data.kategoriUbat,
      unitsku: data.unitSKU,
      unitpku: data.unitPKU,
      harga: data.harga,
      saizpek: data.saizPek,
      pengilang: data.pengilang,
      nombormal: data.nomborMAL,
      arahantambahan: data.arahanTambahan,
      jangkahayat: data.jangkaHayat,
      jenislabel: data.jenisLabel,
      jenisworksheet: data.jenisWorksheet,
    })
    .eq("ID", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/senarai-ubat");
  revalidatePath("/rekod-prabungkus");
  return { ok: true };
}

// ---------- Delete (no cascade, no in-use check — matching original) ----------

export async function deleteUbat(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  // Soft-reference integrity: no FK cascade, no block. Orphaned prepack
  // records keep their denormalized namaUbat snapshot.
  const { error } = await supabase.from("tblsenaraiubat").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/senarai-ubat");
  revalidatePath("/rekod-prabungkus");
  return { ok: true };
}