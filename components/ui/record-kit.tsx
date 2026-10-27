"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";
import { OptionPopup } from "./popups";

/*
 * Record direction kit — the flat, bordered layout of the Final Prototype's "Selected Direction"
 * screens (registry 4773:1889, audit log 4773:8059, resolve 4773:7887). Cards are white with a
 * 1px Rule border and 12px radius, values are Deep, labels Ink-2.
 */

export function RecordHeading({ title, sub, right, className }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex-1 min-w-0">
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-deep">{title}</h1>
        {sub && <p className="t-b2 text-ink-2 mt-2">{sub}</p>}
      </div>
      {right && <div className="shrink-0 flex items-center gap-3">{right}</div>}
    </div>
  );
}

export function RecordCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("bg-white border border-rule rounded-[12px] overflow-hidden", className)}>{children}</section>;
}

/** 44px search field with a leading magnifier (Figma "Search records"). */
export function RecordSearch({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("flex items-center gap-1 h-11 px-2 rounded-[8px] border border-rule bg-white transition-[border-color,box-shadow] duration-[120ms] focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_var(--color-brand-100)]", className)}>
      <Search size={20} strokeWidth={1.75} className="shrink-0 text-ink" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-0 pl-1 bg-transparent text-[14px] text-ink placeholder:text-n-350 outline-none" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="grid place-items-center size-6 rounded-full hover:bg-tint cursor-pointer">
          <X size={15} />
        </button>
      )}
    </label>
  );
}

/** "Category ▾" — a Record/Button outline that opens a single-choice popup; "All" clears it. */
export function ChoiceButton<T extends string>({ label, value, options, onPick, icons, align = "left" }: {
  label: string; value: T | null; options: readonly T[]; onPick: (v: T | null) => void; icons?: Partial<Record<T | "All", LucideIcon>>; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const all = ["All", ...options] as (T | "All")[];
  return (
    <div className="relative">
      <Button variant="record" size="rec" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className={cn(value && "border-brand-500 bg-brand-50")}>
        {value ? <><span className="text-ink-2">{label}:</span> {value}</> : label} <span aria-hidden className="text-[10px] -ml-1">▾</span>
      </Button>
      <OptionPopup open={open} onClose={() => setOpen(false)} options={all} value={value ?? "All"} icons={icons} align={align}
        onPick={(v) => onPick(v === "All" ? null : (v as T))} />
    </div>
  );
}

/** Uppercase section label used across the record cards ("ASSIGNED TO", "IDENTIFICATION"). */
export function RecordLabel({ children, strong, className }: { children: React.ReactNode; strong?: boolean; className?: string }) {
  return <p className={cn("text-[12px] leading-[1.3] text-ink-2 uppercase", strong && "font-semibold tracking-[0.06em]", className)}>{children}</p>;
}

export function RecordDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-rule shrink-0", className)} />;
}

/** "1–10 of 72 assets · 10 per page" · ‹ Page 1 of 8 › */
export function RecordPagination({ page, pages, from, to, total, noun, per, onPage }: {
  page: number; pages: number; from: number; to: number; total: number; noun: string; per: number; onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 leading-[1.4]">
      <p className="text-[12px] text-ink-2 tnum">{total ? `${from}–${to}` : 0} of {total} {noun} · {per} per page</p>
      <div className="flex items-center gap-1 text-[14px] font-medium text-deep tnum">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"
          className="grid place-items-center size-7 rounded-md hover:bg-tint disabled:opacity-30 disabled:cursor-default cursor-pointer"><ChevronLeft size={15} /></button>
        <span className="px-1">Page {page} of {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"
          className="grid place-items-center size-7 rounded-md hover:bg-tint disabled:opacity-30 disabled:cursor-default cursor-pointer"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}
