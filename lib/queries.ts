// TanStack Query data-access hooks — read-only surfaces (Phase 1)
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ---------- Types (mirror the DB schema) ----------

export interface PrabungkusRecord {
  ID: number;
  idUbat: number | null;
  namaUbat: string;
  tarikh: string;
  idPrabungkus: string;
  namaDagangan: string | null;
  nomborKelompok: string | null;
  tarikhLuputAsal: string | null;
  tarikhLuputBaharu: string | null;
  pengilang: string | null;
  nomborMAL: string | null;
  kuantitiUntukDiprabungkus: number | null;
  saizPek: number | null;
  deskripsiPek: string | null;
  hargaSetiapPek: number | null;
  jumlahPekDihasilkan: number | null;
  baki: number | null;
  arahanTambahan: string | null;
}

export interface UbatRecord {
  ID: number;
  deskripsiPrabungkus: string | null;
  namaUbat: string;
  namaDagangan: string | null;
  kategoriUbat: string;
  unitSKU: string | null;
  unitPKU: string | null;
  harga: number | null;
  saizPek: number | null;
  pengilang: string | null;
  nomborMAL: string | null;
  arahanTambahan: string | null;
  jangkaHayat: number | null;
  jenisLabel: number | null;
  jenisWorksheet: number | null;
  deskripsiLabel?: string | null;
  deskripsiWorksheet?: string | null;
}

export interface UdsRekodLabel {
  ID: number;
  Tarikh: string;
  Rujukan: string;
  NamaUbat: string;
  Kekuatan: string | null;
  Kelompok: string;
  Luput: string;
  Kuantiti: number;
  Penyedia: string;
  LuputNormalized: string | null;
  NamaUbatID: number | null;
}

export interface UdsUbat {
  ID: number;
  Nama: string;
  Kekuatan: string | null;
}

// ---------- Query hooks ----------

export function usePrabungkusList() {
  return useQuery({
    queryKey: ["prabungkus"],
    queryFn: async () => {
      const supabase = createClient();
      // Use explicit SQL aliases so PostgREST returns camelCase keys
      // directly — no client-side remapping required.
      const { data, error } = (await supabase
        .from("tblsenaraiprabungkus")
        .select(
          "ID, idUbat:idubat, namaUbat:namaubat, tarikh, idPrabungkus:idprabungkus, " +
            "namaDagangan:namadagangan, nomborKelompok:nomborkelompok, " +
            "tarikhLuputAsal:tarikhluputasal, tarikhLuputBaharu:tarikhluputbaharu, " +
            "pengilang, nomborMAL:nombormal, " +
            "kuantitiUntukDiprabungkus:kuantitiuntukdiprabungkus, " +
            "saizPek:saizpek, deskripsiPek:deskripsipek, " +
            "hargaSetiapPek:hargasetiappek, jumlahPekDihasilkan:jumlahpekdihasilkan, " +
            "baki, arahanTambahan:arahantambahan",
        )
        .order("tarikh", { ascending: false })
        .order("idprabungkus", { ascending: false })) as unknown as {
        data: PrabungkusRecord[] | null;
        error: { message: string } | null;
      };
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUbatList() {
  return useQuery({
    queryKey: ["ubat"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = (await supabase
        .from("tblsenaraiubat")
        .select(
          "ID, deskripsiPrabungkus:deskripsiprabungkus, namaUbat:namaubat, " +
            "namaDagangan:namadagangan, kategoriUbat:kategoriubat, unitSKU:unitsku, " +
            "unitPKU:unitpku, harga, saizPek:saizpek, pengilang, nomborMAL:nombormal, " +
            "arahanTambahan:arahantambahan, jangkaHayat:jangkahayat, jenisLabel:jenislabel, jenisWorksheet:jenisworksheet",
        )
        .order("namaubat", { ascending: true })) as unknown as {
        data: UbatRecord[] | null;
        error: { message: string } | null;
      };
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUdsRekodLabelList() {
  return useQuery({
    queryKey: ["uds-rekod-label"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .schema("uds")
        .from("tblrekodlabel")
        .select("*")
        .order("Tarikh", { ascending: false })
        .order("ID", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UdsRekodLabel[];
    },
  });
}

export function useUdsUbatList() {
  return useQuery({
    queryKey: ["uds-ubat"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .schema("uds")
        .from("tblnamaubat")
        .select("*")
        .order("Nama", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UdsUbat[];
    },
  });
}