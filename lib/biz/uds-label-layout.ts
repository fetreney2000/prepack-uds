// ============================================================
// UDS PDF label layout algorithm — pure, testable module
// Ported from analysis §4.7 (must be byte-for-byte faithful).
//
// Page      : 3.5" x 2.3" (252pt x 165.6pt); margins 0.2cm all sides
// Grid      : cols ∈ [4..8], rows ∈ [4..7] (min 4×4, max 8×7)
// Cell      : 4 to 6 lines; padding L 1.5 / R 1.0 / V 1.0 pt; lineGap -0.2
// Lines     : Nama+Kekuatan (1..3 lines, combined), Kelompok, Luput.
//             Nama may wrap onto the top, second and third top line to
//             avoid truncation; Kekuatan is combined with Nama to save
//             space. Kelompok/Luput NEVER wrap (NBSP).
// Fitting   : text is NEVER truncated — a grid/size only qualifies if
//             every line fits fully; otherwise it is rejected.
// Selection : auto solver picks the LARGEST grid that fits (most cells
//             per label); no font is preferred — within the winning grid
//             it chooses the font+size with the largest font size [5.0,
//             5.5] (5.5 → 5.0), default 5.0.
// ============================================================

// ---------- Layout constants ----------

export const PAGE_WIDTH_PT = 3.5 * 72;      // 252 pt
export const PAGE_HEIGHT_PT = 2.3 * 72;     // 165.6 pt
export const MARGIN_CM = 0.2;
export const MARGIN_PT = MARGIN_CM * 28.3465; // ~5.67 pt per side
export const CELL_PADDING_LEFT_PT = 2.0;
export const CELL_PADDING_RIGHT_PT = 2.0;
export const CELL_PADDING_VERTICAL_PT = 2.0;
export const LINE_GAP = 0.8;

export const MIN_COLS = 4;
export const MAX_COLS = 8;
export const MIN_ROWS = 4;
export const MAX_ROWS = 7;

export const MIN_FONT_SIZE = 5.0;
export const MAX_FONT_SIZE = 5.5;
export const DEFAULT_FONT_SIZE = 5.0;
export const AUTO_MAX_FONT_SIZE = 5.5; // auto mode starts at 5.5 …
export const AUTO_MIN_FONT_SIZE = 5.0; // … and reduces only to 5.0
export const FONT_STEP = 0.1;

export const BORDER_LINE_WIDTH = 0.3;
export const INNER_BORDER_OFFSET_PT = 0.6;

// ---------- Types ----------

/** Measures rendered text width for a given font + size. */
export interface TextMeasurer {
  widthOfString(text: string, fontName: string, fontSize: number): number;
}

export interface CellText {
  nama: string;       // canonical Nama (uppercased)
  kekuatan: string;   // Kekuatan (uppercased) or '' — combined with Nama
  kelompok: string;   // Kelompok (uppercased, NBSP)
  luput: string;      // Luput (uppercased, NBSP)
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
  lines: string[];    // final rendered lines (4 or 5)
  fits: boolean;      // all cells fit after final pass
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
 * Build the raw cell content from canonical names + group + expiry.
 * Nama may wrap onto a second line during fitting (4 or 5 lines total).
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
    nama: n,
    kekuatan: k,
    kelompok: nbSpacify(g),
    luput: nbSpacify(e),
  };
}

// ---------- Fitting ----------

/**
 * Compute the final lines for a cell at the given grid + size.
 *
 * Nama is combined with Kekuatan and permitted to occupy the top,
 * second and third top line (wrapped at word boundaries) to avoid
 * truncation, so a cell can have 4 to 6 lines:
 *   [namaKekuatanL1, namaKekuatanL2?, namaKekuatanL3?, kelompok, luput]
 * Text is NEVER truncated — a grid/size that cannot fit every line
 * fully (width AND height) is rejected (returns null).
 */
export function fitCell(
  cell: CellText,
  geo: UdsCellGeometry,
  fontName: string,
  fontSize: number,
  measurer: TextMeasurer,
): { lines: string[] } | null {
  const w = geo.textWidthPt;

  // Combine Nama + Kekuatan, then wrap into up to 3 lines.
  const combined = [cell.nama, cell.kekuatan].filter((s) => s.length > 0).join(' ');
  const namaBlock = wrapNama(combined, w, measurer, fontName, fontSize);
  if (!namaBlock) return null;

  const lines = [...namaBlock, cell.kelompok, cell.luput];

  // Width: every line must fit fully.
  for (const line of lines) {
    if (!fitsLine(line, w, measurer, fontName, fontSize)) {
      return null;
    }
  }

  // Height: the total line block must fit the cell's text height.
  const lineHeight = fontSize + LINE_GAP;
  const totalH = lines.length * lineHeight;
  if (totalH > geo.textHeightPt) {
    return null;
  }

  return { lines };
}

/** Maximum lines the Nama+Kekuatan block may occupy. */
const NAMA_MAX_LINES = 3;

/**
 * Greedy word-wrap a string into up to NAMA_MAX_LINES (3) lines so it
 * fits the width without truncation. Returns null if it cannot fit even
 * across all allowed lines (e.g. a single word wider than the box).
 */
function wrapNama(
  text: string,
  w: number,
  measurer: TextMeasurer,
  fontName: string,
  fontSize: number,
): string[] | null {
  if (text.length === 0) return [''];
  if (measurer.widthOfString(text, fontName, fontSize) <= w) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measurer.widthOfString(candidate, fontName, fontSize) <= w) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        // A single word is wider than the box — cannot fit.
        return null;
      }
      if (lines.length >= NAMA_MAX_LINES) return null;
    }
  }
  if (current) lines.push(current);

  return lines.length <= NAMA_MAX_LINES ? lines : null;
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
 * auto (solver):
 *   - tries grids (cols 4..8, rows 4..7) largest-first (most cells)
 *   - no font is preferred — for each grid picks the font+size with the
 *     largest font size (5.0 → 4.8) that fits ALL text fully
 *   - returns the FIRST grid that fits (no truncation, no overflow) →
 *     the largest possible grid (most cells per label)
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
    const fitted = fitCell(cell, geo, font, fontSize, measurer);
    if (!fitted) return null;
    return {
      font,
      fontSize,
      cols,
      rows,
      cellsCount: cols * rows,
      mode,
      lines: fitted.lines,
      fits: true,
    };
  }

  // Auto: solve for the LARGEST grid that fits all text without
  // truncation or overflow (more cells per label). Grids are tried
  // largest-first. No font is preferred — for each grid we pick the
  // font+size that yields the largest font size (best readability).
  const gridList: { cols: number; rows: number }[] = [];
  for (const g of enumerateGrids()) gridList.push(g);

  // Largest grid first (most cells).
  gridList.sort((a, b) => b.cols * b.rows - a.cols * a.rows);

  const candidates = fonts.length > 0 ? fonts : ['Helvetica'];

  for (const g of gridList) {
    const geo = computeCellGeometry(g.cols, g.rows);
    let bestFit: UdsLabelCandidate | null = null;
    for (const font of candidates) {
      for (let size = AUTO_MAX_FONT_SIZE; size >= AUTO_MIN_FONT_SIZE - 1e-9; size -= FONT_STEP) {
        const fs = round2(size);
        const fitted = fitCell(cell, geo, font, fs, measurer);
        if (fitted) {
          if (!bestFit || fs > bestFit.fontSize) {
            bestFit = {
              font,
              fontSize: fs,
              cols: g.cols,
              rows: g.rows,
              cellsCount: g.cols * g.rows,
              mode,
              lines: fitted.lines,
              fits: true,
            };
          }
          // Try the next font at its own largest fitting size.
          break;
        }
      }
    }
    if (bestFit) return bestFit;
  }

  return null;
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