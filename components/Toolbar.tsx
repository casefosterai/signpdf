"use client";

import type { FieldType } from "@/lib/types";

type ToolbarProps = {
  pageIndex: number;
  pageCount: number;
  pendingFieldType: FieldType | null;
  onPickFieldType: (type: FieldType | null) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  canDownload: boolean;
};

export default function Toolbar({
  pageIndex,
  pageCount,
  pendingFieldType,
  onPickFieldType,
  onPrevPage,
  onNextPage,
  onDownload,
  isDownloading,
  canDownload,
}: ToolbarProps) {
  // pendingFieldType === null means "Select mode" — no placement, just
  // tap fields to select / move / resize.
  const isSelectMode = pendingFieldType === null;

  const placementTools: { type: FieldType; label: string; icon: string }[] = [
    { type: "signature", label: "Signature", icon: "✍️" },
    { type: "text", label: "Text", icon: "Aa" },
    { type: "date", label: "Date", icon: "📅" },
  ];

  return (
    <div
      className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Top row: title + download */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <h1 className="text-sm font-semibold tracking-tight">signpdf</h1>
        </div>
        <button
          onClick={onDownload}
          disabled={!canDownload || isDownloading}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {isDownloading ? "Saving…" : "Download"}
        </button>
      </div>

      {/* Tool row */}
      <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2">
        {/* Select tool — first, default active */}
        <button
          onClick={() => onPickFieldType(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            isSelectMode
              ? "border-accent bg-accent text-black"
              : "border-neutral-700 bg-neutral-900 text-neutral-200"
          }`}
          aria-label="Select mode"
        >
          {/* Cursor / arrow icon */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 1.5L9.5 5L6 6L4.5 9.5L2 1.5Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>Select</span>
        </button>

        {/* Visual divider */}
        <div className="h-5 w-px shrink-0 bg-neutral-800" />

        {placementTools.map((t) => {
          const active = pendingFieldType === t.type;
          return (
            <button
              key={t.type}
              onClick={() => onPickFieldType(active ? null : t.type)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-accent bg-accent text-black"
                  : "border-neutral-700 bg-neutral-900 text-neutral-200"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}

        <div className="ml-auto flex shrink-0 items-center gap-1 text-xs text-neutral-300">
          <button
            onClick={onPrevPage}
            disabled={pageIndex === 0}
            className="rounded-md border border-neutral-700 px-2 py-1 disabled:opacity-30"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="px-1 tabular-nums">
            {pageIndex + 1} / {pageCount}
          </span>
          <button
            onClick={onNextPage}
            disabled={pageIndex >= pageCount - 1}
            className="rounded-md border border-neutral-700 px-2 py-1 disabled:opacity-30"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      {!isSelectMode && (
        <div className="border-t border-neutral-800 bg-accent/10 px-3 py-1.5 text-[11px] text-accent">
          Tap on the document to place a {pendingFieldType} field.
        </div>
      )}
      {isSelectMode && (
        <div className="border-t border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-[11px] text-neutral-400">
          Tap a field to select it. Drag to move, drag the corner to resize.
        </div>
      )}
    </div>
  );
}
