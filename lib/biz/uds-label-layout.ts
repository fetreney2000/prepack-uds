// ============================================================
// UDS PDF label layout algorithm — pure, testable module
// Ported from analysis §4.7 (must be byte-for-byte faithful).
//
// Page      : 3.5" x 2.3" (252pt x 165.6pt); margins 0.2cm all sides
// Grid      : cols ∈ [4..8], rows ∈ [4..7] (min 4×4, max 8×7)
// Cell      : 4 lines; padding L 1.5 / R 1.0 / V 1.0 pt; lineGap -0.2
// Lines     : 1 = Nama, 2 = Kekuatan, 3 = "B.N : "+Kelompok,
//             4 = "EXP : "+Luput. Lines 3/4 NEVER wrap (NBSP).
// Fitting   : auto mode line 1 truncation is last resort; manual
//             truncates name first; words wider than box → reject.
// Selection : auto maximizes (cellsCount, fontSize, cols); font size
//             clamped [4.8, 5.0] (5.0 → 4.8), default 5.0.
// ============================================================

// ---------- Layout constants ----------

export const PAGE_WIDTH_PT = 3.5 * 72;      // 252 pt
export const PAGE_HEIGHT_PT = 2.3 * 72;     // 165.6 pt
export const MARGIN_CM = 0.2;
export const MARGIN_PT = MARGIN_CM * 28.3465; // ~5.67 pt per side
export const CELL_PADDING_LEFT_PT = 1.5;
export const CELL_PADDING_RIGHT_PT = 1.0;
export const CELL_PADDING_VERTICAL_PT = 1.0;
export const LINE_GAP = -0.2;

export const MIN_COLS = 4;
export const MAX_COLS = 8;
export const MIN_ROWS = 4;
export const MAX_ROWS = 7;

export const MIN_FONT_SIZE = 4.0;
export const MAX_FONT_SIZE = 6.0;
export const DEFAULT_FONT_SIZE = 5.0;
export const AUTO_MAX_FONT_SIZE = 5.0; // auto mode starts at 5.0 …
export const AUTO_MIN_FONT_SIZE = 4.8; // … and reduces only to 4.8
export const FONT_STEP = 0.1;

export const BORDER_LINE_WIDTH = 0.3;
export const INNER_BORDER_OFFSET_PT = 0.6;

// ---------- Types ----------

/** Measures rendered text width for a given font + size. */
export interface TextMeasurer {
  widthOfString(text: string, fontName: string, fontSize: number): number;
}

export interface CellText {
  line1: string; // canonical Nama (uppercased)
  line2: string; // Kekuatan (uppercased) or ''
  line3: string; // "B.N : " + Kelompok (uppercased, NBSP)
  line4: string; // "EXP : " + Luput (uppercased, NBSP)
}

export type UdsMode = 'auto' | 'manual';

export interface UdsLabelOptions {
  mode: UdsMode;
  cols?: number;
  rows?: number;
  font?: string;
  fontSize?: number;
}

export interface UdsCellGeometry {
  cols: number;
  rows: number;
  cellWidthPt: number;
  cellHeightPt: number;
  textWidthPt: number;
  textHeightPt: number;
}

export interface UdsLabelCandidate {
  font: string;
  fontSize: number;
  cols: number;
  rows: number;
  cellsCount: number;
  mode: UdsMode;
  lines: CellText[];      // per-cell final (truncated) text
  fits: boolean;          // all cells fit after final pass
}

// ---------- Pure helpers ----------

/** Available drawable area on the page (pt). */
export function availableSizePt(): { width: number; height: number } {
  return {
    width: PAGE_WIDTH_PT - 2 * MARGIN_PT,
    height: PAGE_HEIGHT_PT - 2 * MARGIN_PT,
  };
}

/** Compute cell geometry for a grid. */
export function computeCellGeometry(cols: number, rows: number): UdsCellGeometry {
  const { width, height } = availableSizePt();
  const cellWidthPt = width / cols;
  const cellHeightPt = height / rows;
  return {
    cols,
    rows,
    cellWidthPt,
    cellHeightPt,
    textWidthPt: cellWidthPt - CELL_PADDING_LEFT_PT - CELL_PADDING_RIGHT_PT,
    textHeightPt: cellHeightPt - 2 * CELL_PADDING_VERTICAL_PT,
  };
}

/** Replace spaces with NBSP so a line never wraps. */
export function nbSpacify(text: string): string {
  return text.replace(/ /g, '\u00A0');
}

/**
 * Build the 4 cell lines from canonical names + group + expiry.
 */
export function buildCellLines(
  nama: string,
  kekuatan: string | null | undefined,
  kelompok: string,
  luput: string,
): CellText {
  const n = (nama ?? '').trim().toUpperCase();
  const k = (kekuatan ?? '').trim().toUpperCase();
  const g = (kelompok ?? '').trim().toUpperCase();
  const e = (luput ?? '').trim().toUpperCase();
  return {
    line1: n,
    line2: k,
    line3: nbSpacify(`B.N : ${g}`),
    line4: nbSpacify(`EXP : ${e}`),
  };
}

/** Split a line into words (normal spaces preserved → NBSP split). */
function wordsOf(line: string): string[] {
  return line.split('\u00A0');
}

/**
 * Check whether any single word in a line is wider than the box.
 * If so, the grid is rejected entirely (fitting rule).
 */
export function hasWordWiderThanBox(
  line: string,
  textWidthPt: number,
  measurer: TextMeasurer,
  fontName: string,
  fontSize: number,
): boolean {
  return wordsOf(line).some((w) => w.length > 0 && measurer.widthOfString(w, fontName, fontSize) > textWidthPt);
}

/**
 * Truncate a single-line string to fit a width, appending '...'.
 * Returns the original if it already fits.
 */
export function truncateToFit(
  line: string,
  maxWidthPt: number,
  measurer: TextMeasurer,
  fontName: string,
  fontSize: number,
): string {
  if (measurer.widthOfString(line, fontName, fontSize) <= maxWidthPt) return line;
  let i = line.length;
  // Cut from the end until "prefix..." fits.
  while (i > 0) {
    const candidate = line.slice(0, i) + '...';
    if (measurer.widthOfString(candidate, fontName, fontSize) <= maxWidthPt) {
      return candidate;
    }
    i--;
  }
  return '...';
}

/**
 * Compute the max font size that fits all 4 lines of a cell,
 * given the truncation policy. Returns candidate lines (final text)
 * or null if the grid/size cannot fit at all.
 *
 * Truncation priority:
 *   auto   → line 2 (kekuatan) first, then line 1 (name); lines 3/4
 *            truncate only if still too wide (NBSP, no wrap).
 *   manual → line 1 (name) first, then line 2; lines 3/4 same.
 */
export function fitCell(
  cell: CellText,
  geo: UdsCellGeometry,
  fontName: string,
  fontSize: number,
  measurer: TextMeasurer,
  mode: UdsMode,
): CellText | null {
  const w = geo.textWidthPt;

  // Words wider than the box → reject this grid entirely.
  for (const line of [cell.line1, cell.line2]) {
    if (hasWordWiderThanBox(line, w, measurer, fontName, fontSize)) return null;
  }
  // Lines 3/4 are NBSP-joined; a single NBSP word wider than box → reject.
  for (const line of [cell.line3, cell.line4]) {
    if (hasWordWiderThanBox(line, w, measurer, fontName, fontSize)) return null;
  }

  // Determine per-line truncation order.
  const nameIsFirst = mode === 'manual';

  let l1 = cell.line1;
  let l2 = cell.line2;

  if (nameIsFirst) {
    // Manual: truncate name first, then kekuatan.
    if (!fitsLine(l1, w, measurer, fontName, fontSize)) {
      l1 = truncateToFit(l1, w, measurer, fontName, fontSize);
    }
    if (!fitsLine(l2, w, measurer, fontName, fontSize)) {
      l2 = truncateToFit(l2, w, measurer, fontName, fontSize);
    }
  } else {
    // Auto: truncate kekuatan first, then name (name is last resort).
    if (!fitsLine(l2, w, measurer, fontName, fontSize)) {
      l2 = truncateToFit(l2, w, measurer, fontName, fontSize);
    }
    if (!fitsLine(l1, w, measurer, fontName, fontSize)) {
      l1 = truncateToFit(l1, w, measurer, fontName, fontSize);
    }
  }

  // Lines 3/4: NBSP no-wrap; truncate with '...' if still too wide.
  let l3 = cell.line3;
  let l4 = cell.line4;
  if (!fitsLine(l3, w, measurer, fontName, fontSize)) {
    l3 = nbSpacify(truncateToFit(l3.replace(/\u00A0/g, ' '), w, measurer, fontName, fontSize));
  }
  if (!fitsLine(l4, w, measurer, fontName, fontSize)) {
    l4 = nbSpacify(truncateToFit(l4.replace(/\u00A0/g, ' '), w, measurer, fontName, fontSize));
  }

  // Final re-check: every line must fit after truncation.
  if (
    !fitsLine(l1, w, measurer, fontName, fontSize) ||
    !fitsLine(l2, w, measurer, fontName, fontSize) ||
    !fitsLine(l3, w, measurer, fontName, fontSize) ||
    !fitsLine(l4, w, measurer, fontName, fontSize)
  ) {
    return null;
  }

  return { line1: l1, line2: l2, line3: l3, line4: l4 };
}

function fitsLine(
  line: string,
  w: number,
  measurer: TextMeasurer,
  fontName: string,
  fontSize: number,
): boolean {
  return line.length === 0 || measurer.widthOfString(line, fontName, fontSize) <= w;
}

// ---------- Candidate comparison ----------

/**
 * Compare two candidates. Prefer more cells, then larger font size,
 * then more columns. Stable for deterministic output.
 */
export function compareCandidates(a: UdsLabelCandidate, b: UdsLabelCandidate): number {
  if (a.cellsCount !== b.cellsCount) return b.cellsCount - a.cellsCount;
  if (a.fontSize !== b.fontSize) return b.fontSize - a.fontSize;
  if (a.cols !== b.cols) return b.cols - a.cols;
  return 0;
}

// ---------- Grid enumeration ----------

export function* enumerateGrids(): Generator<{ cols: number; rows: number }> {
  for (let rows = MIN_ROWS; rows <= MAX_ROWS; rows++) {
    for (let cols = MIN_COLS; cols <= MAX_COLS; cols++) {
      yield { cols, rows };
    }
  }
}

// ---------- Top-level layout search ----------

/**
 * Find the best label layout for a cell's content.
 *
 * auto:
 *   - tries every grid (cols 4..8, rows 4..7), sorted by cell count asc
 *   - reduces font from MAX to AUTO_MIN (4.8) in FONT_STEP increments
 *   - tries fonts alphabetically (provided list)
 *   - picks candidate maximizing (cellsCount, fontSize, cols)
 *
 * manual:
 *   - uses client-provided cols/rows/font/fontSize (clamped)
 *   - single candidate; null if it doesn't fit
 */
export function findBestLayout(
  cell: CellText,
  fonts: string[],
  options: UdsLabelOptions,
  measurer: TextMeasurer,
): UdsLabelCandidate | null {
  const mode = options.mode === 'manual' ? 'manual' : 'auto';

  if (mode === 'manual') {
    const cols = clampInt(options.cols ?? MIN_COLS, MIN_COLS, MAX_COLS);
    const rows = clampInt(options.rows ?? MIN_ROWS, MIN_ROWS, MAX_ROWS);
    const font = options.font || fonts[0] || 'Helvetica';
    const fontSize = clampNum(options.fontSize ?? DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE);
    const geo = computeCellGeometry(cols, rows);
    const fitted = fitCell(cell, geo, font, fontSize, measurer, mode);
    if (!fitted) return null;
    return {
      font,
      fontSize,
      cols,
      rows,
      cellsCount: cols * rows,
      mode,
      lines: [fitted],
      fits: true,
    };
  }

  // Auto: enumerate grids; prefer starting at 5x5 minimum where possible.
  // We enumerate all grids but the compare prefers more cells, so larger
  // grids win if they fit.
  const gridList: { cols: number; rows: number }[] = [];
  for (const g of enumerateGrids()) gridList.push(g);

  // Sort grids by cell count ascending so we evaluate smaller grids first,
  // then larger; compareCandidates later picks the best.
  gridList.sort((a, b) => a.cols * a.rows - b.cols * b.rows);

  const sortedFonts = [...fonts].sort();
  let best: UdsLabelCandidate | null = null;

  for (const g of gridList) {
    const cellsCount = g.cols * g.rows;
    // Skip grids smaller than an already-found best cell count.
    if (best && cellsCount < best.cellsCount) continue;
    for (const font of sortedFonts) {
      for (let size = AUTO_MAX_FONT_SIZE; size >= AUTO_MIN_FONT_SIZE - 1e-9; size -= FONT_STEP) {
        const fs = round2(size);
        const geo = computeCellGeometry(g.cols, g.rows);
        const fitted = fitCell(cell, geo, font, fs, measurer, mode);
        if (fitted) {
          const candidate: UdsLabelCandidate = {
            font,
            fontSize: fs,
            cols: g.cols,
            rows: g.rows,
            cellsCount,
            mode,
            lines: [fitted],
            fits: true,
          };
          if (!best || compareCandidates(candidate, best) < 0) {
            best = candidate;
          }
          // Larger font fits for this grid → no need to try smaller sizes.
          break;
        }
      }
    }
  }

  return best;
}

// ---------- Small utilities ----------

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}