"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronsUpDown, ListFilter, Plus, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";
import { Popover } from "./overlay";
import type { ExportFormat } from "@/lib/export";
import { T } from "./motion";

export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("group relative flex items-center h-9 rounded-full border border-ink/70 bg-white pl-4 pr-3 transition-[border-color,box-shadow] duration-[120ms] focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_var(--color-brand-100)]", className)}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-ink-2 outline-none" />
      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.button key="x" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={T.hover}
            onClick={() => onChange("")} aria-label="Clear search" className="grid place-items-center size-6 rounded-full hover:bg-tint cursor-pointer">
            <X size={16} />
          </motion.button>
        ) : (
          <motion.span key="s" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={T.hover}>
            <Search size={20} strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center gap-3 text-[16px]">
      <motion.button whileTap={{ scale: 0.94 }} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"
        className="grid place-items-center size-8 rounded-md hover:bg-tint disabled:opacity-30 cursor-pointer disabled:cursor-default"><ArrowLeft size={18} /></motion.button>
      <span className="tnum whitespace-nowrap">Page {page} <span className="text-ink-3 mx-1">|</span> {pages}</span>
      <motion.button whileTap={{ scale: 0.94 }} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"
        className="grid place-items-center size-8 rounded-md hover:bg-tint disabled:opacity-30 cursor-pointer disabled:cursor-default"><ArrowRight size={18} /></motion.button>
    </div>
  );
}

/* Figma "Popup Overlay" family — white card, 40px rows, a search header (Sort 1601:5423, Filter 1601:5422). */
function PopupSearch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 h-8 mx-1.5 mt-1.5 mb-1 px-2 rounded-[4px] border border-brand-300 bg-white text-[14px]">
      <span className="text-ink-3 whitespace-nowrap">{label}</span>
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type to search" className="flex-1 min-w-0 outline-none bg-transparent text-ink placeholder:text-ink-3" />
    </label>
  );
}

export function SortMenu<K extends string>({ options, value, onChange }: { options: { key: K; label: string; icon?: LucideIcon }[]; value: { key: K; dir: "asc" | "desc" } | null; onChange: (v: { key: K; dir: "asc" | "desc" } | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative">
      <Button variant="gray" iconRight={ChevronsUpDown} onClick={() => { setOpen((o) => !o); setQ(""); }} className={cn(value && "bg-brand-100 text-brand-700 hover:bg-brand-200")}>
        Sort
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[240px] p-0 rounded-[8px]">
        <PopupSearch label="Sort By:" value={q} onChange={setQ} />
        <div className="pb-1.5">
          {list.map((o) => {
            const on = value?.key === o.key;
            const I = o.icon;
            return (
              <button key={o.key} onClick={() => onChange(on ? (value!.dir === "asc" ? { key: o.key, dir: "desc" } : null) : { key: o.key, dir: "asc" })}
                className={cn("w-full flex items-center gap-3 h-10 px-4 text-[16px] text-left cursor-pointer transition-colors duration-[120ms]", on ? "text-brand-700 bg-brand-50" : "text-ink hover:bg-tint")}>
                {I && <I size={20} strokeWidth={1.5} />}
                <span className="flex-1">{o.label}</span>
                {on && <ArrowDown size={15} className={cn("transition-transform duration-200", value!.dir === "asc" && "rotate-180")} />}
              </button>
            );
          })}
          {list.length === 0 && <p className="px-4 py-2 t-b2 text-ink-3">No match</p>}
        </div>
      </Popover>
    </div>
  );
}

export interface FilterGroup { key: string; label: string; options: string[]; icons?: Record<string, LucideIcon> }
export type FilterValue = Record<string, string[]>;

export function FilterMenu({ groups, value, onChange }: { groups: FilterGroup[]; value: FilterValue; onChange: (v: FilterValue) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const n = Object.values(value).reduce((s, x) => s + x.length, 0);
  const toggle = (g: string, o: string) => {
    const cur = value[g] ?? [];
    onChange({ ...value, [g]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
  };
  return (
    <div className="relative">
      <Button variant="gray" iconRight={ListFilter} onClick={() => { setOpen((o) => !o); setQ(""); }} className={cn(n && "bg-brand-100 text-brand-700 hover:bg-brand-200")}>
        Filter
        {n > 0 && <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-brand-500 text-white text-[11px] tnum">{n}</span>}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[260px] p-0 rounded-[8px] max-h-[460px] overflow-auto">
        <PopupSearch label="Filter By:" value={q} onChange={setQ} />
        {groups.map((g) => {
          const opts = g.options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
          if (!opts.length) return null;
          return (
            <div key={g.key} className="pb-1">
              {groups.length > 1 && <p className="t-l1 text-ink-3 px-4 pt-2 pb-1">{g.label}</p>}
              {opts.map((o) => {
                const on = (value[g.key] ?? []).includes(o);
                const I = g.icons?.[o];
                return (
                  <button key={o} onClick={() => toggle(g.key, o)}
                    className={cn("w-full flex items-center gap-3 h-10 px-4 text-[16px] text-left cursor-pointer transition-colors duration-[120ms]", on ? "bg-brand-50 text-brand-800" : "text-ink hover:bg-tint")}>
                    {I && <I size={20} strokeWidth={1.5} />}
                    <span className="flex-1 truncate">{o}</span>
                    {on ? <Check size={18} strokeWidth={2.4} className="text-brand-500" /> : <Plus size={18} strokeWidth={1.75} className="text-ink" />}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="flex justify-end border-t border-line px-1.5 py-1.5">
          <Button size="sm" variant="ghost" disabled={!n} onClick={() => onChange({})}>Clear all</Button>
        </div>
      </Popover>
    </div>
  );
}

/** Figma "Overlay - Export" (1601:5761): a dark menu — Excel, CSV, PDF. */
export function ExportButton({ onPick }: { onPick: (f: ExportFormat) => void }) {
  const [open, setOpen] = useState(false);
  // File-type marks exported from the Figma Export Option component (1344:3835)
  const items: { f: ExportFormat; label: string; icon: string }[] = [
    { f: "excel", label: "Excel", icon: "/img/icons/excel.svg" },
    { f: "csv", label: "CSV", icon: "/img/icons/csv.svg" },
    { f: "pdf", label: "PDF", icon: "/img/icons/pdf.svg" },
  ];
  return (
    <div className="relative">
      <Button variant="dark" iconRight={ArrowDown} onClick={() => setOpen((o) => !o)}>Export</Button>
      <Popover open={open} onClose={() => setOpen(false)} className="min-w-0 w-[110px] p-1 rounded-[6px] bg-[#0b0b0b] border-[#0b0b0b]">
        {items.map(({ f, label, icon }) => (
          <button key={f} onClick={() => { setOpen(false); onPick(f); }}
            className="w-full flex items-center gap-2.5 h-10 px-2.5 rounded-[4px] text-[15px] text-white hover:bg-white/10 cursor-pointer transition-colors duration-[120ms]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt="" width={20} height={20} className="size-5 object-contain" />{label}
          </button>
        ))}
      </Popover>
    </div>
  );
}

/** Active filter chips with remove — sits under the toolbar. */
export function FilterChips({ value, onChange, extra }: { value: FilterValue; onChange: (v: FilterValue) => void; extra?: React.ReactNode }) {
  const chips = Object.entries(value).flatMap(([g, os]) => os.map((o) => ({ g, o })));
  return (
    <AnimatePresence initial={false}>
      {(chips.length > 0 || extra) && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {extra}
            <AnimatePresence>
              {chips.map(({ g, o }) => (
                <motion.button key={g + o} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={T.state}
                  onClick={() => onChange({ ...value, [g]: value[g].filter((x) => x !== o) })}
                  className="group inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full bg-brand-100 text-brand-800 text-[13px] cursor-pointer hover:bg-brand-200">
                  <span className="text-brand-700/70 capitalize">{g}:</span>{o}<X size={13} className="opacity-60 group-hover:opacity-100" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Th({ icon: I, children, className, small }: { icon?: LucideIcon; children: React.ReactNode; className?: string; small?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-ink-2 whitespace-nowrap", small ? "text-[14px]" : "text-[16px]", className)}>
      {children}{I && <I size={17} strokeWidth={1.75} className="text-ink-2" />}
    </span>
  );
}

/** Row enter/exit used by every table. */
export const rowMotion = (i: number) => ({
  layout: "position" as const,
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { ...T.state, delay: Math.min(i, 12) * 0 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
});
