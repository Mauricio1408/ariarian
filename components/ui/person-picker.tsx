"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import { Avatar } from "./primitives";
import { T } from "./motion";
import { useEscape } from "./overlay";

/**
 * Custodian / assignee picker. The selected person is always shown with their face,
 * so a custodian field reads the same in a table, a modal and the transfer flow.
 * `variant="field"` sits inside a form row; `variant="card"` is the larger From → To card.
 */
export function PersonPicker({ value, onChange, exclude, variant = "field", placement = "down", placeholder = "Select a custodian", error, disabled }: {
  value: Employee | null; onChange: (e: Employee) => void; exclude?: string; variant?: "field" | "card";
  placement?: "down" | "up"; placeholder?: string; error?: boolean; disabled?: boolean;
}) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(() => state.employees
    .filter((e) => e.id !== exclude && e.status !== "Clearance")
    .filter((e) => !q || `${e.name} ${e.id} ${e.office} ${e.position}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8), [state.employees, q, exclude]);

  useEscape(open, () => setOpen(false), false);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const card = variant === "card";
  return (
    <div ref={ref} className="relative w-full">
      <button type="button" disabled={disabled} onClick={() => { setOpen((o) => !o); setQ(""); }} aria-haspopup="listbox" aria-expanded={open}
        className={cn("group w-full flex items-center text-left cursor-pointer disabled:cursor-default transition-[background-color,border-color,box-shadow] duration-[120ms] focus-ring",
          card ? "gap-3 rounded-xl border bg-white px-3.5 py-3 hover:border-ink-3" : "gap-2.5 h-9 rounded-md px-1.5 hover:bg-white",
          card && (open ? "border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]" : "border-line"),
          error && "ring-1 ring-bad-text")}>
        {value ? <Avatar src={value.avatar} name={value.name} size={card ? 44 : 26} /> : <span className={cn("rounded-full border border-dashed border-ink-3 shrink-0", card ? "size-11" : "size-[26px]")} />}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate", card ? "text-[16px] font-semibold" : "text-[15px]", !value && "text-ink-3 font-normal")}>{value?.name ?? placeholder}</span>
          {value && <span className={cn("block truncate text-ink-2", card ? "t-b3 mt-0.5" : "hidden")}>{value.position} · {value.office}</span>}
        </span>
        {value && !card && <span className="t-b3 text-ink-3 truncate max-w-[45%]">{value.position}</span>}
        {!disabled && <ChevronDown size={18} strokeWidth={1.75} className={cn("shrink-0 text-ink-2 transition-transform duration-200", open && "rotate-180")} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: placement === "up" ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: placement === "up" ? 4 : -4 }} transition={T.state}
            className={cn("absolute z-30 left-0 right-0 min-w-[300px] rounded-xl bg-white shadow-overlay border border-line p-1.5",
              placement === "up" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]")}>
            <label className="flex items-center gap-2 h-9 px-2.5 mb-1 rounded-lg bg-tint text-ink-2 focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_var(--color-brand-300)]">
              <Search size={16} strokeWidth={1.75} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search staff by name, ID or office" className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-3" />
            </label>
            <ul role="listbox" className="max-h-[264px] overflow-auto scroll-slim">
              {list.length === 0 && <li className="px-3 py-3 t-b2 text-ink-2">No staff match “{q}”.</li>}
              {list.map((e) => {
                const on = e.id === value?.id;
                return (
                  <li key={e.id} role="option" aria-selected={on}>
                    <button type="button" onClick={() => { onChange(e); setOpen(false); }}
                      className={cn("w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors duration-[120ms]", on ? "bg-brand-50" : "hover:bg-tint")}>
                      <Avatar src={e.avatar} name={e.name} size={30} />
                      <span className="min-w-0 flex-1"><span className="block t-b2s truncate">{e.name}</span><span className="block t-b3 text-ink-2 truncate">{e.id} · {e.position} · {e.office}</span></span>
                      {on && <Check size={16} strokeWidth={2.25} className="shrink-0 text-brand-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
