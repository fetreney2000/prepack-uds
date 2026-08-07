// ============================================================
// Pack & remainder calculation — `calculatePekAndBaki`
// Exact formula from analysis §4.2:
//   if kuantiti > 0 and saizPek > 0:
//     jumlahPekDihasilkan = floor(kuantiti / saizPek)
//     baki = kuantiti % saizPek
// ============================================================

export interface PekBaki {
  jumlahPekDihasilkan: number | null;
  baki: number | null;
}

/**
 * Compute the number of packs produced and the remainder.
 * Returns nulls when inputs are invalid (kuantiti <= 0 or saizPek <= 0),
 * matching the original's "no calculation" behavior.
 */
export function calculatePekAndBaki(
  kuantiti: number | null | undefined,
  saizPek: number | null | undefined,
): PekBaki {
  const qty = kuantiti ?? 0;
  const size = saizPek ?? 0;

  if (qty > 0 && size > 0) {
    return {
      jumlahPekDihasilkan: Math.floor(qty / size),
      baki: qty % size,
    };
  }

  return { jumlahPekDihasilkan: null, baki: null };
}