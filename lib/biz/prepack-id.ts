// ============================================================
// Prepack ID generation — `PP-NNNN/YY-X` (year-scoped)
// Approved deviation: running numbers reset every calendar year.
// Pure functions + transactional wrapper.
// ============================================================

import { currentYearInKl } from "@/lib/format";

/**
 * Pad a number to a fixed width with leading zeros.
 */
export function padStart(num: number, width: number): string {
  return String(num).padStart(width, '0');
}

/**
 * Extract the full 4-digit year from a date string 'YYYY-MM-DD'.
 * Falls back to the current year if the date is missing/invalid.
 */
export function extractYearFromTarikh(tarikh?: string | null): number {
  if (tarikh && /^\d{4}-\d{2}-\d{2}$/.test(tarikh)) {
    const y = parseInt(tarikh.slice(0, 4), 10);
    if (!Number.isNaN(y) && y > 0) return y;
  }
  return currentYearInKl();
}

/**
 * Last 2 digits of a year, as a 2-char string.
 */
export function yearFragment(year: number): string {
  return padStart(year % 100, 2);
}

/**
 * Normalize a category prefix: trim + uppercase, default 'X'.
 */
export function normalizePrefix(prefix?: string | null): string {
  const p = (prefix ?? '').trim().toUpperCase();
  return p || 'X';
}

/**
 * Build a prepack ID candidate from a running number and date.
 * Pure — no DB access.
 */
export function buildPrepackId(prefix: string | null, runningNum: number, tarikh?: string | null): string {
  const p = normalizePrefix(prefix);
  const year = extractYearFromTarikh(tarikh);
  return `PP-${padStart(runningNum, 4)}/${yearFragment(year)}-${p}`;
}

/**
 * Extract the numeric running number from an existing 'PP-NNNN/YY-X' id.
 * Returns null if the id does not match the expected shape.
 */
export function extractRunningNumber(idPrabungkus: string): number | null {
  const m = /^PP-(\d{4})\//.exec(idPrabungkus);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Highest used running number for a given year, derived from IDs.
 * Returns 0 if no records exist for that year.
 */
export function highestUsedNumber(ids: string[], year: number): number {
  const frag = yearFragment(year);
  let max = 0;
  for (const id of ids) {
    const m = /^PP-(\d{4})\/(\d{2})-(.)$/.exec(id);
    if (!m) continue;
    if (m[2] === frag) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}