// UDS report aggregation helpers (pure)
import { UdsRekodLabel } from "@/lib/queries";

export interface UdsReportResult {
  totalQuantity: number;
  totalRecords: number;
  uniqueMeds: number;
  uniqueStaff: number;
  breakdown?: { [key: string]: { totalQuantity: number; totalRecords: number } };
}

export type UdsReportType = "daily" | "monthly" | "yearly" | "all";

function buildUdsReport(
  records: UdsRekodLabel[],
  filterFn: (r: UdsRekodLabel) => boolean,
): Omit<UdsReportResult, "breakdown"> {
  let totalQuantity = 0;
  let totalRecords = 0;
  const meds = new Set<number>();
  const staff = new Set<string>();

  for (const r of records) {
    if (!filterFn(r)) continue;
    totalQuantity += r.Kuantiti ?? 0;
    totalRecords += 1;
    if (r.NamaUbatID != null) meds.add(r.NamaUbatID);
    if (r.Penyedia) staff.add(r.Penyedia);
  }

  return { totalQuantity, totalRecords, uniqueMeds: meds.size, uniqueStaff: staff.size };
}

/** All-time UDS report. */
export function udsAllReport(records: UdsRekodLabel[]): UdsReportResult {
  return buildUdsReport(records, () => true);
}

/** Daily UDS report: exact date 'YYYY-MM-DD'. */
export function udsDailyReport(records: UdsRekodLabel[], date: string): UdsReportResult {
  return buildUdsReport(records, (r) => r.Tarikh === date);
}

/** Monthly UDS report: 'YYYY-MM' prefix + daily breakdown. */
export function udsMonthlyReport(records: UdsRekodLabel[], year: number, month: number): UdsReportResult {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const result: UdsReportResult = buildUdsReport(records, (r) => r.Tarikh.startsWith(prefix));
  const breakdown: UdsReportResult["breakdown"] = {};
  for (const r of records) {
    if (!r.Tarikh.startsWith(prefix)) continue;
    const day = r.Tarikh.slice(8, 10);
    breakdown[day] = breakdown[day] ?? { totalQuantity: 0, totalRecords: 0 };
    breakdown[day].totalQuantity += r.Kuantiti ?? 0;
    breakdown[day].totalRecords += 1;
  }
  result.breakdown = breakdown;
  return result;
}

/** Yearly UDS report: 'YYYY' prefix + monthly breakdown. */
export function udsYearlyReport(records: UdsRekodLabel[], year: number): UdsReportResult {
  const prefix = `${year}`;
  const result: UdsReportResult = buildUdsReport(records, (r) => r.Tarikh.startsWith(prefix));
  const breakdown: UdsReportResult["breakdown"] = {};
  for (const r of records) {
    if (!r.Tarikh.startsWith(prefix)) continue;
    const month = r.Tarikh.slice(5, 7);
    breakdown[month] = breakdown[month] ?? { totalQuantity: 0, totalRecords: 0 };
    breakdown[month].totalQuantity += r.Kuantiti ?? 0;
    breakdown[month].totalRecords += 1;
  }
  result.breakdown = breakdown;
  return result;
}