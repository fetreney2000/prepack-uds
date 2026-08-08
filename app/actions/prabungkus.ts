// Server Actions — prepack records (PP-NNNN/YY-X)
// Phase 2: transactional ID reservation via Postgres RPC (atomic).
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { prabungkusInputSchema, type PrabungkusInput } from "@/lib/validation";

export interface ActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------- Create (transactional reservePrepackId + insert) ----------

export async function createPrabungkus(
  input: PrabungkusInput,
): Promise<ActionResult<{ ID: number; idPrabungkus: string }>> {
  const parsed = prabungkusInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak sah.",
    };
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  // Transactional reservation + insert happens server-side in one function.
  const { data: row, error } = await supabase.rpc("create_prabungkus", {
    p_kategori: data.kategoriUbat,
    p_tarikh: data.tarikh,
    p_ubat: data,
  });

  if (error) {
    return { ok: false, error: `Gagal menjana ID Prabungkus yang unik: ${error.message}` };
  }

  revalidatePath("/rekod-prabungkus");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");

  return { ok: true, data: row as { ID: number; idPrabungkus: string } };
}

// ---------- Preview next ID (no reserve) ----------

export async function previewPrepackId(
  kategoriUbat: string,
  tarikh: string,
): Promise<ActionResult<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("preview_prepack_id", {
    p_kategori: kategoriUbat,
    p_tarikh: tarikh,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as string };
}

// ---------- Update (does not touch idPrabungkus or kategoriUbat) ----------

export async function updatePrabungkus(
  id: number,
  input: PrabungkusInput,
): Promise<ActionResult> {
  const parsed = prabungkusInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tblsenaraiprabungkus")
    .update({
      idUbat: data.idUbat,
      namaUbat: data.namaUbat,
      tarikh: data.tarikh,
      namaDagangan: data.namaDagangan,
      nomborKelompok: data.nomborKelompok,
      tarikhLuputAsal: data.tarikhLuputAsal,
      tarikhLuputBaharu: data.tarikhLuputBaharu,
      pengilang: data.pengilang,
      nomborMAL: data.nomborMAL,
      kuantitiUntukDiprabungkus: data.kuantitiUntukDiprabungkus,
      saizPek: data.saizPek,
      deskripsiPek: data.deskripsiPek,
      hargaSetiapPek: data.hargaSetiapPek,
      jumlahPekDihasilkan: data.jumlahPekDihasilkan,
      baki: data.baki,
      arahanTambahan: data.arahanTambahan,
    })
    .eq("ID", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/rekod-prabungkus");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { ok: true };
}

// ---------- Delete ----------

export async function deletePrabungkus(id: number): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tblsenaraiprabungkus").delete().eq("ID", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rekod-prabungkus");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  return { ok: true };
}