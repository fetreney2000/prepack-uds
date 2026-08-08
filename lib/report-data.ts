// Report aggregation helpers (pure) — daily/monthly/yearly
import { PrabungkusRecord } from "@/lib/queries";

export interface ReportGroupRow {
  namaUbat: string;
  totalWorksheet: number;
  totalPekDihasilkan: number;
}

export interface ReportResult {
  groups: ReportGroupRow[];
  totalWorksheet: number;
  totalPekDihasilkan: number;
  uniqueMeds: number;
  breakdown?: { [key: string]: { totalWorksheet: number; totalPekDihasilkan: number } };
}

/**
 * Build a report grouped by namaUbat for a date filter.
 * @param records all prepack records
 * @param filterFn returns true for records in scope
 */
export function buildGroupedReport(
  records: PrabungkusRecord[],
  filterFn: (r: PrabungkusRecord) => boolean,
): ReportResult {
  const map = new Map<string, ReportGroupRow>();
  let totalWorksheet = 0;
  let totalPekDihasilkan = 0;

  for (const r of records) {
    if (!filterFn(r)) continue;
    totalWorksheet += 1;
    totalPekDihasilkan += r.jumlahPekDihasilkan ?? 0;
    const cur = map.get(r.namaUbat) ?? {
      namaUbat: r.namaUbat,
      totalWorksheet: 0,
      totalPekDihasilkan: 0,
    };
    cur.totalWorksheet += 1;
    cur.totalPekDihasilkan += r.jumlahPekDihasilkan ?? 0;
    map.set(r.namaUbat, cur);
  }

  const groups = Array.from(map.values());
  return {
    groups,
    totalWorksheet,
    totalPekDihasilkan,
    uniqueMeds: groups.length,
  };
}

/** Daily report: filter by exact date 'YYYY-MM-DD'. */
export function dailyReport(records: PrabungkusRecord[], date: string): ReportResult {
  return buildGroupedReport(records, (r) => r.tarikh === date);
}

/** Monthly report: filter by 'YYYY-MM' prefix + daily breakdown. */
export function monthlyReport(records: PrabungkusRecord[], year: number, month: number): ReportResult {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const result = buildGroupedReport(records, (r) => r.tarikh.startsWith(prefix));
  // daily breakdown
  const breakdown: ReportResult["breakdown"] = {};
  for (const r of records) {
    if (!r.tarikh.startsWith(prefix)) continue;
    const day = r.tarikh.slice(8, 10);
    breakdown[day] = breakdown[day] ?? { totalWorksheet: 0, totalPekDihasilkan: 0 };
    breakdown[day].totalWorksheet += 1;
    breakdown[day].totalPekDihasilkan += r.jumlahPekDihasilkan ?? 0;
  }
  result.breakdown = breakdown;
  return result;
}

/** Yearly report: filter by 'YYYY' prefix + monthly breakdown. */
export function yearlyReport(records: PrabungkusRecord[], year: number): ReportResult {
  const prefix = `${year}`;
  const result = buildGroupedReport(records, (r) => r.tarikh.startsWith(prefix));
  const breakdown: ReportResult["breakdown"] = {};
  for (const r of records) {
    if (!r.tarikh.startsWith(prefix)) continue;
    const month = r.tarikh.slice(5, 7); // 'MM'
    breakdown[month] = breakdown[month] ?? { totalWorksheet: 0, totalPekDihasilkan: 0 };
    breakdown[month].totalWorksheet += 1;
    breakdown[month].totalPekDihasilkan += r.jumlahPekDihasilkan ?? 0;
  }
  result.breakdown = breakdown;
  return result;
}