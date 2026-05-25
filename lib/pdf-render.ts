// Wraps pdfjs-dist for rendering PDF pages onto canvas elements.
// pdfjs needs a "worker" script — a separate JS file that does heavy lifting
// off the main thread. We point it at a CDN-hosted worker that matches our
// installed version.

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;

// Lazy-load pdfjs only in the browser. Keeps it out of the server bundle.
async function getPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("pdfjs is browser-only");
  }
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsLibPromise;
}

export async function loadPdfDocument(
  bytes: ArrayBuffer
): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  // Clone the buffer because pdfjs takes ownership of it. We need to keep
  // the original bytes intact so we can stamp them later with pdf-lib.
  const copy = bytes.slice(0);
  const task = pdfjs.getDocument({ data: copy });
  return task.promise;
}

export async function getPageSizes(doc: PDFDocumentProxy) {
  const sizes: { width: number; height: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    sizes.push({ width: viewport.width, height: viewport.height });
  }
  return sizes;
}

// Render a page to canvas. Optionally accepts a callback that receives the
// RenderTask, so the caller can cancel it if a new render starts before
// this one finishes (avoids "Cannot use the same canvas during multiple
// render() operations" errors).
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  onTaskStart?: (task: RenderTask) => void
): Promise<void> {
  const page = await doc.getPage(pageIndex + 1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = cssWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  // For sharp rendering on retina screens, scale the actual canvas by DPR.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const task = page.render({ canvasContext: ctx, viewport, canvas });
  if (onTaskStart) onTaskStart(task);
  await task.promise;
}
