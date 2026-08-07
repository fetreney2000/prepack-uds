// ============================================================
// Expiry (luput) calculations — shared client + server
// 1. calculateTarikhLuputBaharu — new expiry after prepacking
// 2. parseLuputToISO — luput string grammar → ISO date
// ============================================================

/**
 * Calculate the new expiry date (tarikhLuputBaharu) after prepacking.
 *
 * Rules (exact, from analysis §4.2):
 * - if jangkaHayat == 0 or unset → tarikhLuputBaharu = tarikhLuputAsal
 * - else:
 *     newExpiry = tarikhPrabungkus + jangkaHayat days
 *     if tarikhLuputAsal present AND tarikhLuputAsal < newExpiry:
 *         tarikhLuputBaharu = tarikhLuputAsal   // never extend past original
 *     else:
 *         tarikhLuputBaharu = newExpiry
 *
 * All dates are ISO 'YYYY-MM-DD' strings. Returns 'YYYY-MM-DD' or null.
 */
export function calculateTarikhLuputBaharu(
  jangkaHayat: number | null | undefined,
  tarikhPrabungkus: string | null | undefined,
  tarikhLuputAsal: string | null | undefined,
): string | null {
  const hayat = jangkaHayat ?? 0;

  // No shelf life → copy original expiry (or null)
  if (hayat === 0) {
    return tarikhLuputAsal ?? null;
  }

  // No prepack date → cannot compute; fall back to original
  if (!tarikhPrabungkus || !/^\d{4}-\d{2}-\d{2}$/.test(tarikhPrabungkus)) {
    return tarikhLuputAsal ?? null;
  }

  const prepackDate = new Date(tarikhPrabungkus + 'T00:00:00');
  prepackDate.setDate(prepackDate.getDate() + hayat);
  const newExpiry = toIsoDate(prepackDate);

  // Never extend past the original expiry
  if (tarikhLuputAsal && /^\d{4}-\d{2}-\d{2}$/.test(tarikhLuputAsal)) {
    if (tarikhLuputAsal < newExpiry) {
      return tarikhLuputAsal;
    }
  }

  return newExpiry;
}

/**
 * Format a Date as ISO 'YYYY-MM-DD' (local, no timezone shift).
 */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Last day of a given month (1-based).
 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Parse a luput string to ISO 'YYYY-MM-DD' (or null if invalid).
 * Accepted (after trim + uppercase):
 *   MM/YY      → 20YY + last day of month → ISO
 *   MM/YYYY    → last day of month → ISO
 *   DD/MM/YY   → 20YY
 *   DD/MM/YYYY
 * 2-digit year → prefix "20". Month 1..12, day validated against month length.
 * Empty → null (allowed, no normalization).
 */
export function parseLuputToISO(luput: string | null | undefined): string | null {
  if (!luput) return null;
  const s = luput.trim().toUpperCase();
  if (!s) return null;

  // MM/YY or MM/YYYY
  let m = /^(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const month = parseInt(m[1], 10);
    const yearStr = m[2];
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
    if (month < 1 || month > 12) return null;
    const day = lastDayOfMonth(year, month);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // DD/MM/YY or DD/MM/YYYY
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const yearStr = m[3];
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
    if (month < 1 || month > 12) return null;
    const maxDay = lastDayOfMonth(year, month);
    if (day < 1 || day > maxDay) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Validate a luput string against the accepted grammar.
 * Returns true if parses to a valid ISO date, false otherwise.
 */
export function isValidLuput(luput: string | null | undefined): boolean {
  return parseLuputToISO(luput) !== null;
}