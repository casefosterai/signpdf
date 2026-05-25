export type FieldType = "signature" | "text" | "date";

export type Field = {
  id: string;
  type: FieldType;
  pageIndex: number;
  // Position is stored in NORMALIZED coordinates (0..1) of the page,
  // with origin at top-left to match how the browser sees the preview.
  // We convert to PDF coordinates (origin bottom-left) only when stamping.
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  // Content varies by type
  signatureDataUrl?: string; // PNG data URL from the signature pad
  text?: string; // for text + date fields
};

export type LoadedPdf = {
  // The original PDF bytes — we keep these around to stamp later.
  bytes: ArrayBuffer;
  fileName: string;
  pageCount: number;
  // Width/height of each page in PDF points (1pt = 1/72in).
  pageSizes: { width: number; height: number }[];
};
