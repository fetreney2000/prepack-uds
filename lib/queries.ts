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
      const { data, error } = await supabase
        .from("tblSenaraiPrabungkus")
        .select("*")
        .order("tarikh", { ascending: false })
        .order("idPrabungkus", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrabungkusRecord[];
    },
  });
}

export function useUbatList() {
  return useQuery({
    queryKey: ["ubat"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblSenaraiUbat")
        .select("*, jenisLabel:jenisLabel(deskripsiLabel), jenisWorksheet:jenisWorksheet(deskripsiWorksheet)")
        .order("namaUbat", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UbatRecord[];
    },
  });
}

export function useUdsRekodLabelList() {
  return useQuery({
    queryKey: ["uds-rekod-label"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("uds.tblRekodLabel")
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
        .from("uds.tblNamaUbat")
        .select("*")
        .order("Nama", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UdsUbat[];
    },
  });
}