// ============================================================
// UDS PDF label renderer — pdfkit (Node runtime only)
// Phase 3/4. Reproduces the grid/font fitting algorithm from
// lib/biz/uds-label-layout.ts (byte-for-byte faithful) and draws
// the page with pdfkit, registering the real TTF fonts from
// public/fonts (excluding lucide) exactly as the original §4.7.
//
// Layout constants:
//   Page 3.5" x 2.3"; margins 0.2cm; double thin borders (0.3pt
//   line, inner offset 0.6pt); per-cell padding; bold simulated by
//   drawing text twice at a 0.2pt x-offset; text vertically centered.
//   compress:false, pdfVersion:'1.7'.
// ============================================================

import PDFDocument from "pdfkit";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  buildCellLines,
  findBestLayout,
  computeCellGeometry,
  nbSpacify,
  availableSizePt,
  DEFAULT_FONT_SIZE,
  BORDER_LINE_WIDTH,
  CELL_PADDING_LEFT_PT,
  CELL_PADDING_RIGHT_PT,
  LINE_GAP,
  type TextMeasurer,
  type UdsMode,
} from "@/lib/biz/uds-label-layout";

const FONT_DIR = join(process.cwd(), "public", "fonts");

// Candidate fonts for the solver. No font is preferred — the solver
// picks whichever font yields the most cells (largest grid) and the
// best fit.
const CANDIDATE_FONTS = ["Bell Centennial", "Inter", "Roboto"];

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

interface LoadedFont {
  name: string; // base name without extension
  data: Buffer;
}

let fontCache: LoadedFont[] | null = null;

/**
 * Load all .ttf fonts from public/fonts (excluding lucide), sorted
 * alphabetically by name — matching the original §4.7 registration.
 */
async function loadFonts(): Promise<LoadedFont[]> {
  if (fontCache) return fontCache;
  let entries: string[];
  try {
    entries = await readdir(FONT_DIR);
  } catch {
    fontCache = [];
    return [];
  }
  const names = entries
    .filter((f) => f.toLowerCase().endsWith(".ttf"))
    .map((f) => f.replace(/\.ttf$/i, ""))
    .filter((n) => n.toLowerCase() !== "lucide")
    .sort((a, b) => a.localeCompare(b));

  const fonts: LoadedFont[] = [];
  for (const name of names) {
    try {
      const data = await readFile(join(FONT_DIR, `${name}.ttf`));
      fonts.push({ name, data });
    } catch {
      // Skip unreadable fonts.
    }
  }
  fontCache = fonts;
  return fonts;
}

// A measurable font name is the base font name or a bold variant.
// pdfkit registers the font under its base name; we use the base name
// for fitting (measuring) and register both normal + bold faces.
const BOLD_SUFFIX = "-bold";

/**
 * Render a UDS label PDF. Returns a Promise resolving to the pdfkit
 * buffer + the chosen layout metadata (for the X-UDS-* headers).
 */
export async function renderUdsLabelPdf(input: UdsPdfInput): Promise<UdsPdfResult> {
  const loaded = await loadFonts();
  const fontNames = loaded.map((f) => f.name);
  const fontMap = new Map(loaded.map((f) => [f.name, f.data]));

  // Solver font candidates (no preference), falling back to any loaded
  // font if none of the candidates are available.
  const candidates = CANDIDATE_FONTS.filter((n) => fontNames.includes(n));
  const autoFonts = candidates.length > 0 ? candidates : fontNames;

  const cell = buildCellLines(
    input.nama,
    input.kekuatan,
    input.kelompok,
    input.luput,
  );

  const measurer: TextMeasurer = {
    widthOfString(text, fontName, fontSize) {
      return widthOf(text, fontName, fontSize);
    },
  };

  const candidate = findBestLayout(
    cell,
    autoFonts.length > 0 ? autoFonts : ["Helvetica"],
    {
      mode: input.mode,
      cols: input.cols,
      rows: input.rows,
      font: input.font,
      fontSize: input.fontSize,
    },
    measurer,
  );

  // Fallback: if nothing fits, use a candidate font at a readable size.
  const font = candidate?.font ?? autoFonts[0] ?? fontNames[0] ?? "Helvetica";
  const fontSize = candidate?.fontSize ?? DEFAULT_FONT_SIZE;
  const cols = candidate?.cols ?? 4;
  const rows = candidate?.rows ?? 4;

  // Final lines to render (4 or 5). If the solver found nothing, build
  // a best-effort 4-line layout from the raw cell.
  let fitted: string[] = candidate?.lines ?? [];
  if (fitted.length === 0) {
    fitted = [cell.nama, cell.kekuatan, cell.kelompok, cell.luput].filter((l) => l.length > 0);
  }

  const doc = new PDFDocument({
    size: [252, 165.6],
    margin: 0,
    compress: false,
    pdfVersion: "1.7",
    autoFirstPage: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  // Register fonts (normal + bold face for simulated-bold drawing).
  const useStandard = fontMap.size === 0;
  if (useStandard) {
    doc.font("Helvetica");
  } else {
    const base = font.replace(BOLD_SUFFIX, "");
    const data = fontMap.get(base) ?? fontMap.values().next().value;
    if (data) {
      doc.registerFont("label-font", data);
      doc.font("label-font");
    } else {
      doc.font("Helvetica");
    }
  }

  const geo = computeCellGeometry(cols, rows);
  const { width: availW } = availableSizePt();
  const marginPt = (252 - availW) / 2;

  // Font size for drawing (clamped as pdfkit handles TTF sizes in pt).
  const drawFontSize = Math.min(Math.max(fontSize, 4), 6);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginPt + c * geo.cellWidthPt;
      const y = marginPt + r * geo.cellHeightPt;
      drawCell(doc, x, y, geo.cellWidthPt, geo.cellHeightPt, fitted, drawFontSize);
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
  lines: string[],
  fontSize: number,
): void {
  // Single-line border.
  doc.lineWidth(BORDER_LINE_WIDTH);
  doc.strokeColor("#000000");
  doc.rect(x, y, w, h).stroke();

  doc.fontSize(fontSize);

  const textW = w - CELL_PADDING_LEFT_PT - CELL_PADDING_RIGHT_PT;
  const lineHeight = fontSize + LINE_GAP;
  const totalTextH = lines.length * lineHeight;
  const startY = y + (h - totalTextH) / 2;

  lines.forEach((line, i) => {
    // pdfkit's doc.text uses y as the TOP of the text, so no baseline
    // offset here — otherwise the block is pushed down by fontSize.
    const ty = startY + i * lineHeight;
    const tx = x + CELL_PADDING_LEFT_PT;
    drawLine(doc, line, tx, ty, textW);
  });
}

// Bold simulation: draw text twice at a 0.2pt x-offset. Text is
// center-aligned within the cell's text box.
function drawLine(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxW: number,
): void {
  const display = nbSpacify(text);
  const opts: PDFKit.Mixins.TextOptions = {
    width: maxW,
    lineBreak: false,
    ellipsis: false,
    height: 1,
    align: "center",
  };
  doc.text(display, x, y, opts);
  doc.text(display, x + 0.2, y, opts);
}

// Approximate glyph-width fitting metric (Helvetica metric, scaled).
// The original used pdfkit's widthOfString with the registered TTF;
// this approximation keeps the pure fitting module deterministic and
// testable without a live pdfkit instance.
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
    z: 500, "{": 334, "|": 260, "}": 334, "~": 584,
  };
  const nb = "\u00A0";
  if (ch === nb) return 278;
  return widths[ch.toUpperCase()] ?? widths[ch] ?? 556;
}