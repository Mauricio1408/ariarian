"use client";

import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { T } from "./motion";

/** The dark floating selection bar (Employees v2, 2 selected). */
export function BulkBar({ count, actions, onClear }: { count: number; actions: { label: string; icon?: LucideIcon; run: () => void; danger?: boolean }[]; onClear: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div initial={{ y: 80, opacity: 0, x: "-50%" }} animate={{ y: 0, opacity: 1, x: "-50%" }} exit={{ y: 80, opacity: 0, x: "-50%" }} transition={T.spring}
          className="fixed bottom-6 left-[calc(50%+154px)] z-30 flex items-center gap-1.5 rounded-xl bg-[#111] text-white pl-4 pr-2 py-2 shadow-overlay no-print">
          <span className="text-[15px] pr-3 border-r border-white/20 mr-1 tnum whitespace-nowrap">
            <motion.span key={count} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={T.state} className="inline-block">{count}</motion.span> selected
          </span>
          {actions.map((a) => (
            <motion.button key={a.label} whileTap={{ scale: 0.96 }} onClick={a.run}
              className={cn("h-9 px-3 rounded-md text-[15px] cursor-pointer transition-colors duration-[120ms] whitespace-nowrap",
                a.danger ? "text-bad-solid hover:bg-bad-text/25" : "bg-white/10 hover:bg-white/20")}>
              {a.label}
            </motion.button>
          ))}
          <button onClick={onClear} className="h-9 px-3 rounded-md text-[15px] text-white/70 hover:text-white cursor-pointer">Deselect</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
