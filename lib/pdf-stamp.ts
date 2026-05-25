// Stamps fields onto the original PDF using pdf-lib.
// pdf-lib uses PDF coordinate space: origin at bottom-left, units in points (1/72 inch).
// Our Field positions are normalized (0..1) with origin at TOP-left, so we flip Y.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Field, LoadedPdf } from "./types";

export async function stampPdf(
  source: LoadedPdf,
  fields: Field[]
): Promise<Uint8Array> {
  // Clone bytes: pdf-lib will modify the buffer it receives.
  const pdfDoc = await PDFDocument.load(source.bytes.slice(0));
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Cache embedded signature images so the same drawing isn't embedded twice.
  const signatureImageCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>();

  for (const field of fields) {
    const page = pages[field.pageIndex];
    if (!page) continue;

    const { width: pageW, height: pageH } = page.getSize();

    // Convert normalized coordinates (top-left origin) to PDF space (bottom-left origin).
    const x = field.xRatio * pageW;
    const w = field.widthRatio * pageW;
    const h = field.heightRatio * pageH;
    // y in PDF space = pageH - (yRatio * pageH) - h
    const y = pageH - field.yRatio * pageH - h;

    if (field.type === "signature" && field.signatureDataUrl) {
      let img = signatureImageCache.get(field.signatureDataUrl);
      if (!img) {
        const pngBytes = dataUrlToBytes(field.signatureDataUrl);
        img = await pdfDoc.embedPng(pngBytes);
        signatureImageCache.set(field.signatureDataUrl, img);
      }
      // Fit the image inside the field box while preserving aspect ratio.
      const scaled = img.scaleToFit(w, h);
      page.drawImage(img, {
        x: x + (w - scaled.width) / 2,
        y: y + (h - scaled.height) / 2,
        width: scaled.width,
        height: scaled.height,
      });
    } else if ((field.type === "text" || field.type === "date") && field.text) {
      // Choose a font size that fits the box height. PDF font size roughly
      // equals cap height in points; 0.7 of box height looks right.
      const fontSize = Math.max(8, h * 0.7);
      page.drawText(field.text, {
        x: x + 2,
        y: y + (h - fontSize) / 2 + fontSize * 0.15,
        size: fontSize,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
    }
  }

  return pdfDoc.save();
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  // dataUrl looks like "data:image/png;base64,XXXXXX"
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  // Copy to a fresh ArrayBuffer to avoid TS complaints about ArrayBufferLike.
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  const blob = new Blob([out], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
