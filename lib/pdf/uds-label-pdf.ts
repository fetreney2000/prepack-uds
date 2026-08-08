// ============================================================
// UDS PDF label renderer — pdfkit (Node runtime only)
// Phase 3. Reproduces the grid/font fitting algorithm from
// lib/biz/uds-label-layout.ts (byte-for-byte faithful) and draws
// the page with pdfkit using the chosen candidate.
//
// Layout constants (§4.7):
//   Page 3.5" x 2.3"; margins 0.2cm; double thin borders (0.3pt
//   line, inner offset 0.6pt); per-cell padding; bold simulated by
//   drawing text twice at a 0.2pt x-offset; text vertically centered.
//   compress:false, pdfVersion:'1.7'.
// ============================================================

import PDFDocument from "pdfkit";
import {
  buildCellLines,
  findBestLayout,
  computeCellGeometry,
  nbSpacify,
  availableSizePt,
  DEFAULT_FONT_SIZE,
  BORDER_LINE_WIDTH,
  INNER_BORDER_OFFSET_PT,
  CELL_PADDING_LEFT_PT,
  CELL_PADDING_RIGHT_PT,
  LINE_GAP,
  type TextMeasurer,
  type UdsMode,
} from "@/lib/biz/uds-label-layout";

export interface UdsPdfInput {
  nama: string;
  kekuatan: string | null;
  kelompok: string;
  luput: string;
  mode: UdsMode;
  cols?: number;
  rows?: number;
  font?: string;
  fontSize?: number;
}

export interface UdsPdfResult {
  buffer: Uint8Array;
  font: string;
  fontSize: number;
  cols: number;
  rows: number;
  cellsCount: number;
  mode: UdsMode;
}

// Fonts available without external TTF files. Map to pdfkit standard
// AFM fonts. The original 16 TTFs (Arial, Calibri, Verdana, ...) should
// be dropped into public/fonts/ for full fidelity; the layout search
// enumerates fonts alphabetically, so plain names keep output stable.
const STANDARD_FONTS: Record<string, string> = {
  courier: "Courier",
  "courier-bold": "Courier-Bold",
  helvetica: "Helvetica",
  "helvetica-bold": "Helvetica-Bold",
  times: "Times-Roman",
};

/**
 * Render a UDS label PDF. Returns a Promise resolving to the pdfkit
 * buffer + the chosen layout metadata (for the X-UDS-* headers).
 */
export function renderUdsLabelPdf(input: UdsPdfInput): Promise<UdsPdfResult> {
  const cell = buildCellLines(
    input.nama,
    input.kekuatan,
    input.kelompok,
    input.luput,
  );

  const fontNames = Object.keys(STANDARD_FONTS).sort();
  const measurer: TextMeasurer = {
    widthOfString(text, fontName, fontSize) {
      return widthOf(text, STANDARD_FONTS[fontName] ?? "Helvetica", fontSize);
    },
  };

  const candidate = findBestLayout(
    cell,
    fontNames,
    {
      mode: input.mode,
      cols: input.cols,
      rows: input.rows,
      font: input.font,
      fontSize: input.fontSize,
    },
    measurer,
  );

  // Fallback: if nothing fits, use smallest readable defaults.
  const font = candidate?.font ?? "helvetica";
  const fontSize = candidate?.fontSize ?? DEFAULT_FONT_SIZE;
  const cols = candidate?.cols ?? 4;
  const rows = candidate?.rows ?? 4;
  const fitted = candidate?.lines[0] ?? cell;

  const doc = new PDFDocument({
    size: [252, 165.6],
    margin: 0,
    compress: false,
    pdfVersion: "1.7",
    autoFirstPage: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const pdfFont = STANDARD_FONTS[font] ?? "Helvetica";
  const geo = computeCellGeometry(cols, rows);
  const { width: availW } = availableSizePt();
  const marginPt = (252 - availW) / 2;

  // Draw cells.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginPt + c * geo.cellWidthPt;
      const y = marginPt + r * geo.cellHeightPt;
      drawCell(doc, x, y, geo.cellWidthPt, geo.cellHeightPt, fitted, pdfFont, fontSize);
    }
  }

  doc.end();

  return new Promise<UdsPdfResult>((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer: new Uint8Array(buffer),
        font,
        fontSize,
        cols,
        rows,
        cellsCount: cols * rows,
        mode: input.mode,
      });
    });
    doc.on("error", reject);
  });
}

function drawCell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  cell: { line1: string; line2: string; line3: string; line4: string },
  fontName: string,
  fontSize: number,
): void {
  // Double thin borders: outer 0.3pt, inner offset 0.6pt.
  doc.lineWidth(BORDER_LINE_WIDTH);
  doc.strokeColor("#000000");
  doc.rect(x, y, w, h).stroke();
  doc.rect(x + INNER_BORDER_OFFSET_PT, y + INNER_BORDER_OFFSET_PT, w - 2 * INNER_BORDER_OFFSET_PT, h - 2 * INNER_BORDER_OFFSET_PT).stroke();

  doc.font(fontName);
  doc.fontSize(fontSize);

  const textW = w - CELL_PADDING_LEFT_PT - CELL_PADDING_RIGHT_PT;
  const lines = [cell.line1, cell.line2, cell.line3, cell.line4];
  const lineHeight = fontSize + LINE_GAP;
  const totalTextH = lines.length * lineHeight;
  const startY = y + (h - totalTextH) / 2;

  lines.forEach((line, i) => {
    const ty = startY + i * lineHeight + fontSize; // baseline
    const tx = x + CELL_PADDING_LEFT_PT;
    // Lines 3/4 use NBSP (no wrap). All lines drawn once, clipped to box.
    drawLine(doc, line, tx, ty, textW);
  });
}

// Bold simulation: draw text twice at a 0.2pt x-offset.
function drawLine(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxW: number,
): void {
  const display = nbSpacify(text);
  doc.text(display, x, y, {
    width: maxW,
    lineBreak: false,
    ellipsis: false,
    height: 1,
  });
  // Simulate bold by offsetting 0.2pt.
  doc.text(display, x + 0.2, y, {
    width: maxW,
    lineBreak: false,
    ellipsis: false,
    height: 1,
  });
}

// Approximate AFM glyph widths for the fitting loop (Helvetica metrics).
function widthOf(text: string, _fontName: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    w += charWidth(ch);
  }
  return (w / 1000) * fontSize;
}

function charWidth(ch: string): number {
  const widths: Record<string, number> = {
    " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667,
    "'": 191, "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333,
    ".": 278, "/": 278, "0": 556, "1": 556, "2": 556, "3": 556, "4": 556,
    "5": 556, "6": 556, "7": 556, "8": 556, "9": 556, ":": 278, ";": 278,
    "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015, A: 667, B: 667,
    C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
    K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
    S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
    "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556,
    b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
    j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556,
    r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500,
    z: 500, "{": 334, "|": 260, "}": 334, "~": 584, "·": 278,
  };
  const nb = "\u00A0";
  if (ch === nb) return 278;
  return widths[ch.toUpperCase()] ?? widths[ch] ?? 556;
}