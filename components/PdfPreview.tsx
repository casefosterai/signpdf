"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { renderPageToCanvas } from "@/lib/pdf-render";
import type { Field, FieldType } from "@/lib/types";
import FieldOverlay from "./FieldOverlay";

type PdfPreviewProps = {
  doc: PDFDocumentProxy;
  pageIndex: number;
  fields: Field[];
  selectedFieldId: string | null;
  pendingFieldType: FieldType | null;
  onPlaceField: (pageIndex: number, xRatio: number, yRatio: number) => void;
  onSelectField: (id: string | null) => void;
  onChangeField: (next: Field) => void;
  onDeleteField: (id: string) => void;
  onEditField: (id: string) => void;
};

export default function PdfPreview({
  doc,
  pageIndex,
  fields,
  selectedFieldId,
  pendingFieldType,
  onPlaceField,
  onSelectField,
  onChangeField,
  onDeleteField,
  onEditField,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number } | null>(
    null
  );

  // Track the in-flight render task so we can cancel it if a new render starts
  // before the old one finishes. pdfjs throws "Cannot use the same canvas during
  // multiple render() operations" otherwise — common in React Strict Mode (dev)
  // and when the ResizeObserver fires during the initial mount.
  const activeTaskRef = useRef<RenderTask | null>(null);
  const lastRenderedWidthRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const render = async (cssWidth: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // If a previous render is still running, cancel it and wait for it to settle.
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
          await activeTaskRef.current.promise.catch(() => {
            // Cancellation throws — that's expected, swallow it.
          });
        } catch {
          // ignore
        }
        activeTaskRef.current = null;
      }
      if (cancelled) return;

      try {
        await renderPageToCanvas(doc, pageIndex, canvas, cssWidth, (task) => {
          activeTaskRef.current = task;
        });
        if (cancelled) return;
        lastRenderedWidthRef.current = cssWidth;
        setRenderedSize({
          w: canvas.clientWidth,
          h: canvas.clientHeight,
        });
      } catch (err: unknown) {
        // Cancellation surfaces as a "RenderingCancelledException" — ignore it.
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name?: string }).name === "RenderingCancelledException"
        ) {
          return;
        }
        // Any other error is a real problem; surface to console.
        console.error("PDF render failed:", err);
      } finally {
        activeTaskRef.current = null;
      }
    };

    const triggerRender = () => {
      const container = containerRef.current;
      if (!container) return;
      const cssWidth = container.clientWidth;
      if (cssWidth <= 0) return;
      render(cssWidth);
    };

    // Initial render
    triggerRender();

    // Resize handling, debounced. ResizeObserver can fire many times rapidly
    // during initial layout — debouncing prevents stacking renders.
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        const newWidth = container.clientWidth;
        // Skip if width didn't actually change — observer fires on tiny shifts too.
        if (Math.abs(newWidth - lastRenderedWidthRef.current) < 1) return;
        triggerRender();
      }, 120);
    });

    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      // Cancel any render still in flight when the effect tears down.
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeTaskRef.current = null;
      }
    };
  }, [doc, pageIndex]);

  // Tap on the page (when a field type is pending) to place a new field there.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pendingFieldType || !renderedSize) {
      onSelectField(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xRatio = x / rect.width;
    const yRatio = y / rect.height;
    onPlaceField(pageIndex, xRatio, yRatio);
  };

  const fieldsOnThisPage = fields.filter((f) => f.pageIndex === pageIndex);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
      <div
        className="relative"
        onClick={handleClick}
        style={{
          cursor: pendingFieldType ? "crosshair" : "default",
        }}
      >
        <canvas ref={canvasRef} className="block w-full" />
        {renderedSize && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ width: renderedSize.w, height: renderedSize.h }}
          >
            {fieldsOnThisPage.map((field) => (
              <div key={field.id} className="pointer-events-auto">
                <FieldOverlay
                  field={field}
                  pageWidthPx={renderedSize.w}
                  pageHeightPx={renderedSize.h}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => onSelectField(field.id)}
                  onChange={onChangeField}
                  onDelete={() => onDeleteField(field.id)}
                  onEdit={() => onEditField(field.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
