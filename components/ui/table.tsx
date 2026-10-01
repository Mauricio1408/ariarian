"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronsUpDown, ListFilter, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";
import { MenuItem, Popover } from "./overlay";
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
      <motion.button whileTap={{ x: -3 }} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"
        className="grid place-items-center size-8 rounded-md hover:bg-tint disabled:opacity-30 cursor-pointer disabled:cursor-default"><ArrowLeft size={18} /></motion.button>
      <span className="tnum whitespace-nowrap">Page <motion.span key={page} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={T.state} className="inline-block">{page}</motion.span> <span className="text-ink-3 mx-1">|</span> {pages}</span>
      <motion.button whileTap={{ x: 3 }} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"
        className="grid place-items-center size-8 rounded-md hover:bg-tint disabled:opacity-30 cursor-pointer disabled:cursor-default"><ArrowRight size={18} /></motion.button>
    </div>
  );
}

export function SortMenu<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: { key: K; dir: "asc" | "desc" } | null; onChange: (v: { key: K; dir: "asc" | "desc" } | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="gray" iconRight={ChevronsUpDown} onClick={() => setOpen((o) => !o)} className={cn(value && "bg-brand-100 text-brand-700 hover:bg-brand-200")}>
        Sort
      </Button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <p className="t-l1 text-ink-3 px-3 pt-2 pb-1.5">Sort by</p>
        {options.map((o) => {
          const on = value?.key === o.key;
          return (
            <MenuItem key={o.key} active={on} onClick={() => onChange(on ? (value!.dir === "asc" ? { key: o.key, dir: "desc" } : null) : { key: o.key, dir: "asc" })}>
              <span className="flex-1">{o.label}</span>
              {on && <motion.span initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: value!.dir === "asc" ? 0 : 180, opacity: 1 }} transition={T.state}><ArrowDown size={14} className="rotate-180" /></motion.span>}
            </MenuItem>
          );
        })}
      </Popover>
    </div>
  );
}

export interface FilterGroup { key: string; label: string; options: string[] }
export type FilterValue = Record<string, string[]>;

export function FilterMenu({ groups, value, onChange }: { groups: FilterGroup[]; value: FilterValue; onChange: (v: FilterValue) => void }) {
  const [open, setOpen] = useState(false);
  const n = Object.values(value).reduce((s, x) => s + x.length, 0);
  const toggle = (g: string, o: string) => {
    const cur = value[g] ?? [];
    onChange({ ...value, [g]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
  };
  return (
    <div className="relative">
      <Button variant="gray" iconRight={ListFilter} onClick={() => setOpen((o) => !o)} className={cn(n && "bg-brand-100 text-brand-700 hover:bg-brand-200")}>
        Filter
        <AnimatePresence>{n > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={T.spring} className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-brand-500 text-white text-[11px] tnum">{n}</motion.span>}</AnimatePresence>
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[300px] max-h-[460px] overflow-auto">
        {groups.map((g) => (
          <div key={g.key} className="px-1.5 pb-2">
            <p className="t-l1 text-ink-3 px-1.5 pt-2 pb-1.5">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.options.map((o) => {
                const on = (value[g.key] ?? []).includes(o);
                return (
                  <motion.button key={o} whileTap={{ scale: 0.95 }} onClick={() => toggle(g.key, o)}
                    className={cn("inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[13px] border cursor-pointer transition-colors duration-[120ms]",
                      on ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-line text-ink hover:border-ink-3")}>
                    {on && <Check size={12} strokeWidth={2.5} />}{o}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex justify-end border-t border-line mt-1 pt-1.5">
          <Button size="sm" variant="ghost" disabled={!n} onClick={() => onChange({})}>Clear all</Button>
        </div>
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
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { ...T.state, delay: Math.min(i, 12) * 0.022 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
});
