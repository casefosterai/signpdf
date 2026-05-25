"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

type SignaturePadProps = {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

export default function SignaturePad({ open, onClose, onSave }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 320, h: 180 });
  const [isEmpty, setIsEmpty] = useState(true);

  // Size the canvas to its container. SignatureCanvas needs explicit pixel
  // dimensions or it draws at the wrong scale.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDims({ w: Math.floor(rect.width), h: Math.floor(rect.width * 0.5) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  if (!open) return null;

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    const sig = sigRef.current;
    if (!sig || sig.isEmpty()) return;
    // Trim whitespace so the signature fills its box when stamped.
    const dataUrl = sig.getTrimmedCanvas().toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-neutral-900 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Draw your signature</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          ref={wrapperRef}
          className="overflow-hidden rounded-lg border border-neutral-700 bg-white"
          style={{ touchAction: "none" }}
        >
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{
              width: dims.w,
              height: dims.h,
              style: { display: "block", width: "100%", height: dims.h },
            }}
            onEnd={() => setIsEmpty(false)}
          />
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          Draw with your finger or a stylus. Tip: a slow, deliberate signature looks more natural.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 rounded-lg border border-neutral-700 py-2.5 text-sm font-medium text-neutral-200"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
