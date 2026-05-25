"use client";

import { useRef } from "react";
import type { Field } from "@/lib/types";

type FieldOverlayProps = {
  field: Field;
  pageWidthPx: number;
  pageHeightPx: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: Field) => void;
  onDelete: () => void;
  onEdit: () => void;
};

// A field rendered on top of a PDF page. Drag the body to move; drag the
// bottom-right corner to resize. Works for mouse + touch via Pointer Events.
//
// Important: this whole element calls stopPropagation() on its pointer events
// so the underlying page click handler in PdfPreview never fires when you
// interact with a field. Otherwise tapping a field while in placement mode
// would create a *new* field on top of the existing one.
export default function FieldOverlay({
  field,
  pageWidthPx,
  pageHeightPx,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onEdit,
}: FieldOverlayProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  const x = field.xRatio * pageWidthPx;
  const y = field.yRatio * pageHeightPx;
  const w = field.widthRatio * pageWidthPx;
  const h = field.heightRatio * pageHeightPx;

  // Generic pointer-based drag. Used for both move and resize.
  const startDrag = (
    e: React.PointerEvent,
    mode: "move" | "resize"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startXRatio = field.xRatio;
    const startYRatio = field.yRatio;
    const startWRatio = field.widthRatio;
    const startHRatio = field.heightRatio;

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers throw on capture if the pointer is gone — safe to ignore.
    }

    let didMove = false;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / pageWidthPx;
      const dy = (ev.clientY - startY) / pageHeightPx;

      // Tiny movements shouldn't count as a drag (lets you tap to select).
      if (!didMove && Math.abs(ev.clientX - startX) < 3 && Math.abs(ev.clientY - startY) < 3) {
        return;
      }
      didMove = true;

      if (mode === "move") {
        const nextX = clamp(startXRatio + dx, 0, 1 - field.widthRatio);
        const nextY = clamp(startYRatio + dy, 0, 1 - field.heightRatio);
        onChange({ ...field, xRatio: nextX, yRatio: nextY });
      } else {
        const minW = 0.04;
        const minH = 0.015;
        const nextW = clamp(startWRatio + dx, minW, 1 - field.xRatio);
        const nextH = clamp(startHRatio + dy, minH, 1 - field.yRatio);
        onChange({ ...field, widthRatio: nextW, heightRatio: nextH });
      }
    };

    const onUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const showSignaturePreview = field.type === "signature" && field.signatureDataUrl;
  const showText = (field.type === "text" || field.type === "date") && field.text;
  const isPlaceholder = !showSignaturePreview && !showText;

  return (
    <div
      ref={elRef}
      onPointerDown={(e) => startDrag(e, "move")}
      onClick={(e) => {
        // Block the page-level click handler from firing.
        e.stopPropagation();
      }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        touchAction: "none",
      }}
      className={`flex items-center justify-center rounded ${
        isSelected
          ? "border-2 border-accent bg-accent/10"
          : "border border-dashed border-accent/70 bg-white/5"
      }`}
    >
      {showSignaturePreview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={field.signatureDataUrl}
          alt="signature"
          className="pointer-events-none h-full w-full object-contain"
          draggable={false}
        />
      )}
      {showText && (
        <span
          className="pointer-events-none w-full truncate px-1 text-black"
          style={{
            fontSize: Math.max(10, h * 0.7),
            lineHeight: `${h}px`,
          }}
        >
          {field.text}
        </span>
      )}
      {isPlaceholder && (
        <span className="pointer-events-none text-[10px] uppercase tracking-wide text-accent">
          {field.type}
        </span>
      )}

      {/* Toolbar above the field when selected */}
      {isSelected && (
        <div
          className="absolute -top-9 left-0 flex gap-1 rounded-md bg-neutral-800 p-1 text-xs shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded px-2 py-1 text-neutral-100 hover:bg-neutral-700"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded px-2 py-1 text-red-300 hover:bg-neutral-700"
          >
            Delete
          </button>
        </div>
      )}

      {/* Resize handle — bottom-right corner.
          Has its own (transparent) larger hit area for easier touch grabbing.
          The visible square is small; the touch zone is much bigger. */}
      {isSelected && (
        <div
          onPointerDown={(e) => startDrag(e, "resize")}
          onClick={(e) => e.stopPropagation()}
          aria-label="Resize"
          style={{
            position: "absolute",
            right: -16,
            bottom: -16,
            width: 32,
            height: 32,
            touchAction: "none",
            cursor: "nwse-resize",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            // No pointer-events:none anywhere on the chain — handle is interactive.
          }}
        >
          {/* Visible knob */}
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "#FF4D4D",
              border: "2px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
