// ============================================================
// Pack & remainder calculation — `calculatePekAndBaki`
//
// Pack size may be fractional (e.g. 17.6), which is exactly where naive
// `Math.floor(kuantiti / saizPek)` and `kuantiti % saizPek` go wrong in
// binary floating point:
//
//   176 / 17.6     === 10
//   176 % 17.6     === 17.599999999999987   <-- WRONG, should be 0
//   176 - 10*17.6  === 0                    <-- correct
//
// IEEE-754 `%` is derived from the exact quotient rather than the rounded
// division result, so it disagrees with `kuantiti - pek * saizPek` whenever
// the size is not exactly representable. The remainder is therefore derived
// from the rounded pack count instead. Both results are rounded to 6 dp to
// strip binary noise (15.200000000000017 -> 15.2, -2.8e-14 -> 0).
//
// Rules:
//   if kuantiti > 0 and saizPek > 0:
//     jumlahPekDihasilkan = floor(round(kuantiti / saizPek))
//     baki                = round(kuantiti - jumlahPekDihasilkan * saizPek)
//   else:
//     both null — matches the original's "no calculation" behaviour.
// ============================================================

/** Decimal places kept when stripping floating-point noise. */
const PRECISION_DP = 6;

export interface PekBaki {
  jumlahPekDihasilkan: number | null;
  baki: number | null;
}

/**
 * Round to a fixed number of decimal places and normalise -0 to 0 so the
 * value serialises and renders as a plain number.
 */
function roundTo(value: number, dp: number): number {
  const factor = 10 ** dp;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
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
    const jumlahPekDihasilkan = Math.floor(roundTo(qty / size, PRECISION_DP));
    return {
      jumlahPekDihasilkan,
      baki: roundTo(qty - jumlahPekDihasilkan * size, PRECISION_DP),
    };
  }

  return { jumlahPekDihasilkan: null, baki: null };
}
