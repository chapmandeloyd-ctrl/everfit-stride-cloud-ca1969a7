/**
 * KSOM-360 branded PDF exporter.
 *
 * Section-based, composable PDF generator built on pdf-lib. Used by every
 * "Export as PDF" feature in the app (keto plan, protocols, workouts...) so
 * every document a client shares looks like it came from the same brand.
 *
 * - US Letter portrait, 0.75" margins, generous whitespace
 * - Inter font embedded for brand parity (loaded at runtime, cached). Falls
 *   back to bundled Helvetica if the network fetch fails so exports work offline.
 * - Lion logo embedded from src/assets/logo.png (Vite asset import).
 * - Auto-paginates: every section measures and inserts a page break + branded
 *   continuation header when it would overflow.
 */

import { PDFDocument, PDFFont, PDFPage, PDFImage, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import logoUrl from "@/assets/logo.png";

/* --------------------------------- types --------------------------------- */

export type RGB = { r: number; g: number; b: number };

export interface MacroTile {
  label: string;
  value: string;
  /** Optional secondary line (e.g. "≤30g net carbs"). */
  detail?: string;
}

export type PdfSection =
  | { type: "hero"; eyebrow?: string; title: string; subtitle?: string }
  | { type: "macros"; tiles: MacroTile[] }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "keyValue"; rows: { label: string; value: string }[] }
  | { type: "divider" }
  | { type: "spacer"; height?: number };

export interface BrandedPdfOptions {
  /** Filename without extension. ".pdf" is appended automatically. */
  filename: string;
  /** Header eyebrow, e.g. "Personalized Keto Plan". */
  documentLabel: string;
  /** Accent color used for rules, quote bars, and the macro tile underline. */
  accentColor?: RGB;
  /** Pulled into the footer: "Prepared for {clientName}". */
  clientName?: string | null;
  /** Document body. */
  sections: PdfSection[];
  /** Optional document subject metadata. */
  subject?: string;
}

/* ------------------------------- constants ------------------------------- */

const PAGE_WIDTH = 612;  // US Letter @ 72dpi
const PAGE_HEIGHT = 792;
const MARGIN = 54;       // 0.75"
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 72;
const FOOTER_HEIGHT = 40;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 8;
const CONTENT_BOTTOM = FOOTER_HEIGHT + 24;

const BRAND_RED: RGB = { r: 204 / 255, g: 24 / 255, b: 30 / 255 };  // #CC181E
const INK: RGB = { r: 17 / 255, g: 24 / 255, b: 39 / 255 };
const MUTED: RGB = { r: 107 / 255, g: 114 / 255, b: 128 / 255 };
const HAIRLINE: RGB = { r: 229 / 255, g: 231 / 255, b: 235 / 255 };
const SOFT_FILL: RGB = { r: 249 / 255, g: 250 / 255, b: 251 / 255 };

/* --------------------------- font / asset loaders --------------------------- */

let interRegularBytes: ArrayBuffer | null = null;
let interBoldBytes: ArrayBuffer | null = null;
let interLoadAttempted = false;

async function fetchBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadInterFonts(): Promise<void> {
  if (interLoadAttempted) return;
  interLoadAttempted = true;
  // pdf-lib + fontkit need OpenType (OTF/TTF), not woff2.
  const [reg, bold] = await Promise.all([
    fetchBytes("https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Regular.otf"),
    fetchBytes("https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Bold.otf"),
  ]);
  interRegularBytes = reg;
  interBoldBytes = bold;
}

/* -------------------------------- helpers -------------------------------- */

function toColor({ r, g, b }: RGB) {
  return rgb(r, g, b);
}

/**
 * Replace characters that the WinAnsi encoding (used by pdf-lib's standard
 * Helvetica fallback) can't encode. Inter, when it loads, handles all of
 * these natively — but if the CDN fetch fails we silently fall back to
 * Helvetica and would otherwise crash on "≤", "—", smart quotes, etc.
 * Always run user-facing strings through this before measuring or drawing.
 */
function safeText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\u2264/g, "<=")  // ≤
    .replace(/\u2265/g, ">=")  // ≥
    .replace(/\u2260/g, "!=")  // ≠
    .replace(/\u2248/g, "~")   // ≈
    .replace(/\u00B1/g, "+/-") // ±
    .replace(/\u2212/g, "-")   // −
    .replace(/[\u2013\u2014]/g, "-")          // – —
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'") // ‘ ’ ‚ ′
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"') // “ ” „ ″
    .replace(/\u2026/g, "...") // …
    .replace(/\u00B7/g, "·" /* keep middle dot, WinAnsi has it */)
    .replace(/[\u2022\u25CF]/g, "•" /* WinAnsi bullet */)
    .replace(/\u00A0/g, " ")   // nbsp
    // Strip anything else outside the WinAnsi-safe range as a last resort.
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u20AC\u2022\u00B7]/g, "");
}

/** Word-wrap that respects existing line breaks in the input. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = safeText(text).split(/\n/);
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, size);
      if (w > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/* ------------------------------- renderer ------------------------------- */

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  cursorY: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  logo: PDFImage | null;
  accent: RGB;
  documentLabel: string;
  clientName?: string | null;
}

function drawHeader(ctx: Ctx) {
  const { page, fontRegular, fontBold, logo, accent, documentLabel } = ctx;
  const top = PAGE_HEIGHT - 28;

  // Logo + wordmark (left)
  let wordmarkX = MARGIN;
  if (logo) {
    const targetH = 28;
    const aspect = logo.width / logo.height;
    const targetW = targetH * aspect;
    page.drawImage(logo, {
      x: MARGIN,
      y: top - targetH,
      width: targetW,
      height: targetH,
    });
    wordmarkX = MARGIN + targetW + 10;
  }
  page.drawText("KSOM-360", {
    x: wordmarkX,
    y: top - (logo ? 19 : 18),
    size: 13,
    font: fontBold,
    color: toColor(BRAND_RED),
  });

  // Eyebrow + date (right)
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eyebrow = documentLabel.toUpperCase();
  const eyebrowSize = 8;
  const eyebrowW = fontBold.widthOfTextAtSize(eyebrow, eyebrowSize);
  page.drawText(eyebrow, {
    x: PAGE_WIDTH - MARGIN - eyebrowW,
    y: top - 8,
    size: eyebrowSize,
    font: fontBold,
    color: toColor(MUTED),
  });
  const dateW = fontRegular.widthOfTextAtSize(date, 9);
  page.drawText(date, {
    x: PAGE_WIDTH - MARGIN - dateW,
    y: top - 22,
    size: 9,
    font: fontRegular,
    color: toColor(MUTED),
  });

  // Accent rule under the header
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: CONTENT_WIDTH,
    height: 1.5,
    color: toColor(accent),
  });
}

function drawFooter(ctx: Ctx) {
  const { page, fontRegular, clientName } = ctx;
  const y = 22;
  page.drawRectangle({
    x: MARGIN,
    y: y + 14,
    width: CONTENT_WIDTH,
    height: 0.5,
    color: toColor(HAIRLINE),
  });
  const left = clientName ? `Prepared for ${clientName}` : "Prepared by KSOM-360";
  page.drawText(left, {
    x: MARGIN,
    y,
    size: 8,
    font: fontRegular,
    color: toColor(MUTED),
  });
  const right = "ksom-360.app";
  const rightW = fontRegular.widthOfTextAtSize(right, 8);
  page.drawText(right, {
    x: PAGE_WIDTH - MARGIN - rightW,
    y,
    size: 8,
    font: fontRegular,
    color: toColor(MUTED),
  });
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(ctx);
  drawFooter(ctx);
  ctx.cursorY = CONTENT_TOP;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.cursorY - needed < CONTENT_BOTTOM) {
    newPage(ctx);
  }
}

/* ----------------------------- section renderers ----------------------------- */

function renderHero(ctx: Ctx, s: Extract<PdfSection, { type: "hero" }>) {
  const { fontBold, fontRegular, accent } = ctx;

  if (s.eyebrow) {
    ensureSpace(ctx, 14);
    ctx.page.drawText(safeText(s.eyebrow.toUpperCase()), {
      x: MARGIN,
      y: ctx.cursorY - 10,
      size: 9,
      font: fontBold,
      color: toColor(accent),
    });
    ctx.cursorY -= 18;
  }

  ensureSpace(ctx, 32);
  ctx.page.drawText(safeText(s.title), {
    x: MARGIN,
    y: ctx.cursorY - 28,
    size: 28,
    font: fontBold,
    color: toColor(INK),
  });
  ctx.cursorY -= 36;

  if (s.subtitle) {
    const lines = wrapText(s.subtitle, fontRegular, 12, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(ctx, 16);
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.cursorY - 12,
        size: 12,
        font: fontRegular,
        color: toColor(MUTED),
      });
      ctx.cursorY -= 16;
    }
  }
  ctx.cursorY -= 8;
}

function renderMacros(ctx: Ctx, s: Extract<PdfSection, { type: "macros" }>) {
  const tiles = s.tiles;
  if (tiles.length === 0) return;
  const gap = 10;
  const tileW = (CONTENT_WIDTH - gap * (tiles.length - 1)) / tiles.length;
  const tileH = 64;
  ensureSpace(ctx, tileH + 14);

  tiles.forEach((tile, i) => {
    const x = MARGIN + i * (tileW + gap);
    const y = ctx.cursorY - tileH;
    ctx.page.drawRectangle({
      x, y, width: tileW, height: tileH,
      color: toColor(SOFT_FILL),
      borderColor: toColor(HAIRLINE),
      borderWidth: 0.75,
    });
    ctx.page.drawRectangle({
      x, y, width: tileW, height: 2.5,
      color: toColor(ctx.accent),
    });
    const valueSize = 22;
    const valueStr = safeText(tile.value);
    const valueW = ctx.fontBold.widthOfTextAtSize(valueStr, valueSize);
    ctx.page.drawText(valueStr, {
      x: x + (tileW - valueW) / 2,
      y: y + tileH - 30,
      size: valueSize,
      font: ctx.fontBold,
      color: toColor(INK),
    });
    const labelSize = 8;
    const label = safeText(tile.label.toUpperCase());
    const labelW = ctx.fontBold.widthOfTextAtSize(label, labelSize);
    ctx.page.drawText(label, {
      x: x + (tileW - labelW) / 2,
      y: y + tileH - 44,
      size: labelSize,
      font: ctx.fontBold,
      color: toColor(MUTED),
    });
    if (tile.detail) {
      const detailSize = 8;
      const detailStr = safeText(tile.detail);
      const detailW = ctx.fontRegular.widthOfTextAtSize(detailStr, detailSize);
      ctx.page.drawText(detailStr, {
        x: x + (tileW - detailW) / 2,
        y: y + 8,
        size: detailSize,
        font: ctx.fontRegular,
        color: toColor(MUTED),
      });
    }
  });

  ctx.cursorY -= tileH + 14;
}

function renderHeading(ctx: Ctx, s: Extract<PdfSection, { type: "heading" }>) {
  ensureSpace(ctx, 22);
  ctx.page.drawText(safeText(s.text.toUpperCase()), {
    x: MARGIN,
    y: ctx.cursorY - 12,
    size: 10,
    font: ctx.fontBold,
    color: toColor(INK),
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.cursorY - 16,
    width: 24,
    height: 1.5,
    color: toColor(ctx.accent),
  });
  ctx.cursorY -= 22;
}

function renderParagraph(ctx: Ctx, s: Extract<PdfSection, { type: "paragraph" }>) {
  const lines = wrapText(s.text, ctx.fontRegular, 10.5, CONTENT_WIDTH);
  const lineHeight = 14;
  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    if (line) {
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.cursorY - 11,
        size: 10.5,
        font: ctx.fontRegular,
        color: toColor(INK),
      });
    }
    ctx.cursorY -= lineHeight;
  }
  ctx.cursorY -= 4;
}

function renderListItems(
  ctx: Ctx,
  items: string[],
  numbered: boolean,
) {
  const indent = 16;
  const lineHeight = 14;
  const size = 10.5;
  items.forEach((item, idx) => {
    const prefix = numbered ? `${idx + 1}.` : "•";
    const lines = wrapText(item, ctx.fontRegular, size, CONTENT_WIDTH - indent);
    lines.forEach((line, lineIdx) => {
      ensureSpace(ctx, lineHeight);
      if (lineIdx === 0) {
        ctx.page.drawText(prefix, {
          x: MARGIN,
          y: ctx.cursorY - 11,
          size,
          font: ctx.fontBold,
          color: toColor(ctx.accent),
        });
      }
      ctx.page.drawText(line, {
        x: MARGIN + indent,
        y: ctx.cursorY - 11,
        size,
        font: ctx.fontRegular,
        color: toColor(INK),
      });
      ctx.cursorY -= lineHeight;
    });
    ctx.cursorY -= 2;
  });
  ctx.cursorY -= 4;
}

function renderQuote(ctx: Ctx, s: Extract<PdfSection, { type: "quote" }>) {
  const padX = 14;
  const padY = 12;
  const size = 11;
  const lineHeight = 16;
  const innerWidth = CONTENT_WIDTH - padX - 18;
  const lines = wrapText(s.text, ctx.fontRegular, size, innerWidth);
  const attribLines = s.attribution
    ? wrapText(s.attribution, ctx.fontBold, 9, innerWidth)
    : [];
  const blockH =
    padY * 2 + lines.length * lineHeight + (attribLines.length ? 6 + attribLines.length * 12 : 0);

  ensureSpace(ctx, blockH + 8);
  const top = ctx.cursorY;
  ctx.page.drawRectangle({
    x: MARGIN, y: top - blockH,
    width: CONTENT_WIDTH, height: blockH,
    color: toColor(SOFT_FILL),
  });
  ctx.page.drawRectangle({
    x: MARGIN, y: top - blockH,
    width: 3, height: blockH,
    color: toColor(ctx.accent),
  });

  let textY = top - padY - size;
  for (const line of lines) {
    ctx.page.drawText(line, {
      x: MARGIN + padX + 6,
      y: textY,
      size,
      font: ctx.fontRegular,
      color: toColor(INK),
    });
    textY -= lineHeight;
  }
  if (attribLines.length) {
    textY -= 2;
    for (const line of attribLines) {
      ctx.page.drawText(line, {
        x: MARGIN + padX + 6,
        y: textY,
        size: 9,
        font: ctx.fontBold,
        color: toColor(MUTED),
      });
      textY -= 12;
    }
  }
  ctx.cursorY = top - blockH - 10;
}

function renderKeyValue(ctx: Ctx, s: Extract<PdfSection, { type: "keyValue" }>) {
  const rowH = 22;
  s.rows.forEach((row, i) => {
    ensureSpace(ctx, rowH);
    const y = ctx.cursorY - rowH;
    if (i % 2 === 0) {
      ctx.page.drawRectangle({
        x: MARGIN, y,
        width: CONTENT_WIDTH, height: rowH,
        color: toColor(SOFT_FILL),
      });
    }
    ctx.page.drawText(safeText(row.label), {
      x: MARGIN + 12, y: y + 7,
      size: 10, font: ctx.fontBold,
      color: toColor(INK),
    });
    const valueStr = safeText(row.value);
    const valueW = ctx.fontRegular.widthOfTextAtSize(valueStr, 10);
    ctx.page.drawText(valueStr, {
      x: PAGE_WIDTH - MARGIN - 12 - valueW, y: y + 7,
      size: 10, font: ctx.fontRegular,
      color: toColor(MUTED),
    });
    ctx.cursorY -= rowH;
  });
  ctx.cursorY -= 6;
}

function renderDivider(ctx: Ctx) {
  ensureSpace(ctx, 14);
  ctx.page.drawRectangle({
    x: MARGIN, y: ctx.cursorY - 6,
    width: CONTENT_WIDTH, height: 0.5,
    color: toColor(HAIRLINE),
  });
  ctx.cursorY -= 14;
}

/* ------------------------------ public API ------------------------------ */

/**
 * Generate the branded PDF and trigger a browser download.
 */
export async function exportBrandedPdf(options: BrandedPdfOptions): Promise<Uint8Array> {
  const accent = options.accentColor ?? BRAND_RED;

  // Best-effort font + logo fetches in parallel.
  await loadInterFonts();
  const logoBytes = await fetchBytes(logoUrl);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${options.documentLabel} — KSOM-360`);
  doc.setAuthor("KSOM-360");
  doc.setProducer("KSOM-360");
  doc.setCreator("KSOM-360");
  if (options.subject) doc.setSubject(options.subject);

  let fontRegular: PDFFont;
  let fontBold: PDFFont;
  if (interRegularBytes && interBoldBytes) {
    try {
      fontRegular = await doc.embedFont(interRegularBytes, { subset: true });
      fontBold = await doc.embedFont(interBoldBytes, { subset: true });
    } catch {
      fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    }
  } else {
    fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  let logo: PDFImage | null = null;
  if (logoBytes) {
    try {
      logo = await doc.embedPng(logoBytes);
    } catch {
      try {
        logo = await doc.embedJpg(logoBytes);
      } catch {
        logo = null;
      }
    }
  }

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    cursorY: CONTENT_TOP,
    fontRegular,
    fontBold,
    logo,
    accent,
    documentLabel: options.documentLabel,
    clientName: options.clientName,
  };
  drawHeader(ctx);
  drawFooter(ctx);

  for (const section of options.sections) {
    switch (section.type) {
      case "hero": renderHero(ctx, section); break;
      case "macros": renderMacros(ctx, section); break;
      case "heading": renderHeading(ctx, section); break;
      case "paragraph": renderParagraph(ctx, section); break;
      case "bullets": renderListItems(ctx, section.items, false); break;
      case "numbered": renderListItems(ctx, section.items, true); break;
      case "quote": renderQuote(ctx, section); break;
      case "keyValue": renderKeyValue(ctx, section); break;
      case "divider": renderDivider(ctx); break;
      case "spacer": ctx.cursorY -= section.height ?? 12; break;
    }
  }

  const bytes = await doc.save();

  // Trigger download.
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = options.filename.endsWith(".pdf") ? options.filename : `${options.filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return bytes;
}

/** Convert a "#RRGGBB" string into the {r,g,b} 0–1 format used by this module. */
export function hexToRgb(hex?: string | null): RGB | undefined {
  if (!hex) return undefined;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}
