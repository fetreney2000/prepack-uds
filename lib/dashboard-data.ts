// Dashboard aggregation helpers (pure) — current month + YTD + 12-month table
import { MALAY_MONTHS_SHORT } from "@/lib/format";

export interface MonthStat {
  month: number; // 1-12
  label: string;
  totalPek: number;
  totalWorksheet: number;
  totalJenisUbat: number;
}

export interface DashboardData {
  currentMonth: MonthStat;
  ytd: { totalPek: number; totalWorksheet: number; totalJenisUbat: number };
  months: MonthStat[];
  monthLabel: string;
  yearLabel: string;
}

interface RecordRow {
  tarikh?: string | null;
  jumlahPekDihasilkan?: number | null;
  namaUbat?: string | null;
}

/**
 * Aggregate prepack records into dashboard stats.
 * @param records prepack records (already loaded)
 * @param year target year (defaults to current)
 * @param month target month (1-12, defaults to current)
 */
export function computeDashboard(records: RecordRow[], year: number, month: number): DashboardData {
  const monthStats: MonthStat[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MALAY_MONTHS_SHORT[i],
    totalPek: 0,
    totalWorksheet: 0,
    totalJenisUbat: 0,
  }));

  const medsByMonth = new Map<number, Set<string>>();

  for (const r of records) {
    if (!r.tarikh) continue;
    const y = parseInt(r.tarikh.slice(0, 4), 10);
    if (y !== year) continue;
    const m = parseInt(r.tarikh.slice(5, 7), 10);
    if (m < 1 || m > 12) continue;

    const stat = monthStats[m - 1];
    stat.totalWorksheet += 1;
    stat.totalPek += r.jumlahPekDihasilkan ?? 0;

    if (!medsByMonth.has(m)) medsByMonth.set(m, new Set());
    if (r.namaUbat) medsByMonth.get(m)!.add(r.namaUbat);
  }

  for (let i = 0; i < 12; i++) {
    monthStats[i].totalJenisUbat = medsByMonth.get(i + 1)?.size ?? 0;
  }

  const currentMonth = { ...monthStats[month - 1] };
  const ytd = { totalPek: 0, totalWorksheet: 0, totalJenisUbat: 0 };
  for (let i = 0; i < month; i++) {
    const s = monthStats[i];
    ytd.totalPek += s.totalPek;
    ytd.totalWorksheet += s.totalWorksheet;
    ytd.totalJenisUbat += s.totalJenisUbat;
  }

  return {
    currentMonth,
    ytd,
    months: monthStats,
    monthLabel: monthStats[month - 1].label,
    yearLabel: String(year),
  };
}