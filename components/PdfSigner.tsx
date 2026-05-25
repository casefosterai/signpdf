"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument, getPageSizes } from "@/lib/pdf-render";
import { stampPdf, downloadPdf } from "@/lib/pdf-stamp";
import type { Field, FieldType, LoadedPdf } from "@/lib/types";
import PdfPreview from "./PdfPreview";
import Toolbar from "./Toolbar";
import SignaturePad from "./SignaturePad";

// Default field box sizes, expressed as ratios of the page.
const DEFAULT_FIELD_SIZE: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 0.25, h: 0.06 },
  text: { w: 0.25, h: 0.03 },
  date: { w: 0.18, h: 0.03 },
};

export default function PdfSigner() {
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  // null = Select mode (default). Otherwise we're placing a field of that type.
  const [pendingFieldType, setPendingFieldType] = useState<FieldType | null>(null);
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  const fieldAwaitingSignatureRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setIsLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(bytes);
      const pageSizes = await getPageSizes(pdfDoc);
      setLoaded({
        bytes,
        fileName: file.name,
        pageCount: pdfDoc.numPages,
        pageSizes,
      });
      setDoc(pdfDoc);
      setPageIndex(0);
      setFields([]);
      setSelectedFieldId(null);
      setPendingFieldType(null);
    } catch (err) {
      console.error(err);
      setError("Could not read that PDF. It might be password-protected or corrupted.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onUploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  // Drag-and-drop on desktop
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDragOver);
    return () => {
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDragOver);
    };
  }, [handleFile]);

  // Place a new field at (xRatio, yRatio) on the current page.
  // After placing, return to Select mode automatically.
  const placeField = (page: number, xRatio: number, yRatio: number) => {
    if (!pendingFieldType) return;
    const size = DEFAULT_FIELD_SIZE[pendingFieldType];
    const xR = clamp(xRatio - size.w / 2, 0, 1 - size.w);
    const yR = clamp(yRatio - size.h / 2, 0, 1 - size.h);

    const id = cryptoRandomId();
    const placedType = pendingFieldType;
    let newField: Field = {
      id,
      type: placedType,
      pageIndex: page,
      xRatio: xR,
      yRatio: yR,
      widthRatio: size.w,
      heightRatio: size.h,
    };

    if (placedType === "date") {
      newField.text = formatDate(new Date());
    } else if (placedType === "text") {
      const t = window.prompt("Enter text:", "");
      if (t === null || t.trim() === "") {
        // Cancelled — don't create the field, stay in placement mode.
        return;
      }
      newField.text = t;
    }

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);

    if (placedType === "signature") {
      fieldAwaitingSignatureRef.current = id;
      setSignaturePadOpen(true);
    }

    // Auto-return to Select mode so they can immediately move/resize the new field.
    setPendingFieldType(null);
  };

  const updateField = (next: Field) => {
    setFields((prev) => prev.map((f) => (f.id === next.id ? next : f)));
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const editField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    if (field.type === "signature") {
      fieldAwaitingSignatureRef.current = id;
      setSignaturePadOpen(true);
    } else if (field.type === "text") {
      const t = window.prompt("Edit text:", field.text ?? "");
      if (t !== null) updateField({ ...field, text: t });
    } else if (field.type === "date") {
      const t = window.prompt("Edit date:", field.text ?? formatDate(new Date()));
      if (t !== null) updateField({ ...field, text: t });
    }
  };

  const handleSignatureSaved = (dataUrl: string) => {
    const id = fieldAwaitingSignatureRef.current;
    if (id) {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, signatureDataUrl: dataUrl } : f))
      );
    }
    fieldAwaitingSignatureRef.current = null;
    setSignaturePadOpen(false);
  };

  const handleDownload = async () => {
    if (!loaded) return;
    setIsDownloading(true);
    try {
      const stamped = await stampPdf(loaded, fields);
      const outName = loaded.fileName.replace(/\.pdf$/i, "") + "-signed.pdf";
      downloadPdf(stamped, outName);
    } catch (err) {
      console.error(err);
      setError("Something went wrong saving the PDF. Try again, or reload the page.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartOver = () => {
    setLoaded(null);
    setDoc(null);
    setFields([]);
    setSelectedFieldId(null);
    setPendingFieldType(null);
  };

  if (!loaded || !doc) {
    return <UploadScreen onPick={onUploadInputChange} isLoading={isLoading} error={error} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <Toolbar
        pageIndex={pageIndex}
        pageCount={loaded.pageCount}
        pendingFieldType={pendingFieldType}
        onPickFieldType={(t) => {
          setPendingFieldType(t);
          // When entering placement mode, deselect any current field so the
          // toolbar isn't visually competing with the placement cursor.
          if (t !== null) setSelectedFieldId(null);
        }}
        onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
        onNextPage={() => setPageIndex((p) => Math.min(loaded.pageCount - 1, p + 1))}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        canDownload={fields.length > 0}
      />

      <div className="flex-1 overflow-y-auto p-3 pb-24">
        <PdfPreview
          doc={doc}
          pageIndex={pageIndex}
          fields={fields}
          selectedFieldId={selectedFieldId}
          pendingFieldType={pendingFieldType}
          onPlaceField={placeField}
          onSelectField={setSelectedFieldId}
          onChangeField={updateField}
          onDeleteField={deleteField}
          onEditField={editField}
        />

        {error && (
          <p className="mx-auto mt-3 max-w-3xl rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mx-auto mt-6 max-w-3xl px-2 text-center">
          <button
            onClick={handleStartOver}
            className="text-xs text-neutral-500 underline-offset-4 hover:underline"
          >
            Start over with a different PDF
          </button>
        </div>

        <p className="mx-auto mt-2 max-w-3xl px-2 text-center text-[10px] leading-relaxed text-neutral-600">
          Files never leave your device. For high-stakes contracts (real estate, legal,
          financial), use a service like DocuSign that provides an audit trail.
        </p>
      </div>

      <SignaturePad
        open={signaturePadOpen}
        onClose={() => {
          const id = fieldAwaitingSignatureRef.current;
          if (id) {
            const field = fields.find((f) => f.id === id);
            if (field && !field.signatureDataUrl) deleteField(id);
          }
          fieldAwaitingSignatureRef.current = null;
          setSignaturePadOpen(false);
        }}
        onSave={handleSignatureSaved}
      />
    </div>
  );
}

function UploadScreen({
  onPick,
  isLoading,
  error,
}: {
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-[11px] text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Files never leave your device
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sign a PDF<br />in your browser.
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Upload, drop a signature, download. No accounts. No uploads to a server.
        </p>

        <label
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${
            isLoading
              ? "border-neutral-700 bg-neutral-900"
              : "border-neutral-700 bg-neutral-900/40 hover:border-accent hover:bg-neutral-900"
          }`}
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={onPick}
            className="hidden"
            disabled={isLoading}
          />
          <div className="text-2xl">📄</div>
          <div className="mt-2 text-sm font-medium">
            {isLoading ? "Loading…" : "Choose a PDF"}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            or drop a file anywhere on this page
          </div>
        </label>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <p className="mt-8 text-[11px] leading-relaxed text-neutral-600">
          For high-stakes contracts (real estate, legal, financial), use a service
          like DocuSign that provides an audit trail. This tool is for everyday
          paperwork — waivers, forms, simple agreements.
        </p>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
