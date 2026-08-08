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

// Map a raw PostgREST row (lowercase unquoted columns) to the camelCase
// shape the app components expect. Quoted "ID" stays uppercase.
function mapPrabungkus(row: Record<string, unknown>): PrabungkusRecord {
  return {
    ID: row.ID as number,
    idUbat: (row.idubat as number | null) ?? null,
    namaUbat: (row.namaubat as string) ?? "",
    tarikh: (row.tarikh as string) ?? "",
    idPrabungkus: (row.idprabungkus as string) ?? "",
    namaDagangan: (row.namadagangan as string | null) ?? null,
    nomborKelompok: (row.nomborkelompok as string | null) ?? null,
    tarikhLuputAsal: (row.tarikhluputasal as string | null) ?? null,
    tarikhLuputBaharu: (row.tarikhluputbaharu as string | null) ?? null,
    pengilang: (row.pengilang as string | null) ?? null,
    nomborMAL: (row.nombormal as string | null) ?? null,
    kuantitiUntukDiprabungkus: (row.kuantitiuntukdiprabungkus as number | null) ?? null,
    saizPek: (row.saizpek as number | null) ?? null,
    deskripsiPek: (row.deskripsipek as string | null) ?? null,
    hargaSetiapPek: (row.hargasetiappek as number | null) ?? null,
    jumlahPekDihasilkan: (row.jumlahpekdihasilkan as number | null) ?? null,
    baki: (row.baki as number | null) ?? null,
    arahanTambahan: (row.arahantambahan as string | null) ?? null,
  };
}

function mapUbat(row: Record<string, unknown>): UbatRecord {
  const jenisLabel = row.jenislabel as { deskripsilabel?: string } | null;
  const jenisWorksheet = row.jenisworksheet as { deskripsiworksheet?: string } | null;
  return {
    ID: row.ID as number,
    deskripsiPrabungkus: (row.deskripsiprabungkus as string | null) ?? null,
    namaUbat: (row.namaubat as string) ?? "",
    namaDagangan: (row.namadagangan as string | null) ?? null,
    kategoriUbat: (row.kategoriubat as string) ?? "",
    unitSKU: (row.unitsku as string | null) ?? null,
    unitPKU: (row.unitpku as string | null) ?? null,
    harga: (row.harga as number | null) ?? null,
    saizPek: (row.saizpek as number | null) ?? null,
    pengilang: (row.pengilang as string | null) ?? null,
    nomborMAL: (row.nombormal as string | null) ?? null,
    arahanTambahan: (row.arahantambahan as string | null) ?? null,
    jangkaHayat: (row.jangkahayat as number | null) ?? null,
    jenisLabel: (row.jenislabel as number | null) ?? null,
    jenisWorksheet: (row.jenisworksheet as number | null) ?? null,
    deskripsiLabel: jenisLabel?.deskripsilabel ?? null,
    deskripsiWorksheet: jenisWorksheet?.deskripsiworksheet ?? null,
  };
}

export function usePrabungkusList() {
  return useQuery({
    queryKey: ["prabungkus"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblsenaraiprabungkus")
        .select("*")
        .order("tarikh", { ascending: false })
        .order("idprabungkus", { ascending: false }) as unknown as {
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      };
      if (error) throw error;
      return (data ?? []).map(mapPrabungkus);
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
        .select("*, jenislabel:jenislabel(deskripsilabel), jenisworksheet:jenisworksheet(deskripsiworksheet)")
        .order("namaubat", { ascending: true })) as unknown as {
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      };
      if (error) throw error;
      return (data ?? []).map(mapUbat);
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