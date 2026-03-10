"use client";

import { useState, useRef, useEffect } from "react";

export function PlanSummaryTooltip({ summary }: { summary: string }) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-400 transition-colors hover:bg-violet-500/30 hover:text-violet-300"
        aria-label="View plan summary"
      >
        ?
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 text-xs font-bold text-violet-400">Plan Summary</p>
          <p className="text-sm leading-relaxed text-violet-200">{summary}</p>
        </div>
      )}
    </div>
  );
}
