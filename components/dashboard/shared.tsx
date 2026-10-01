"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { OperationalStatus, PhysicalCondition } from "@/lib/types";
import { byKey } from "@/lib/selectors";
import { EASE, T } from "@/components/ui/motion";

export type View = "split" | "health" | "attention" | "warranty";

export const HEALTH_COLOR: Record<PhysicalCondition, string> = { Excellent: "var(--color-sev-1)", Fair: "var(--color-sev-2)", Poor: "var(--color-sev-3)" };
export const ATTENTION: { key: OperationalStatus; color: string; desc: string }[] = [
  { key: "Damaged", color: "var(--color-bad-chart)", desc: "Report or dispose" },
  { key: "Maintenance", color: "var(--color-warn-solid)", desc: "" },
  { key: "Standby", color: "var(--color-brand-500)", desc: "Idle, reassignable" },
  { key: "In Use", color: "var(--color-good-solid)", desc: "Healthy" },
];

/* ── Card frame shared by grid + drill-down (layoutId morph) ──── */
export function DashCard({ id, icon: I, title, onToggle, expanded, children, className, delay = 0 }: {
  id: View; icon: LucideIcon; title: string; onToggle: () => void; expanded?: boolean; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.section layoutId={`card-${id}`} transition={{ layout: { duration: 0.42, ease: EASE } }}
      initial={expanded ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      style={{ borderRadius: 16 }}
      className={cn("bg-white shadow-raised overflow-hidden", className)}>
      <motion.div layout="position" className={cn("flex items-center gap-4", expanded ? "px-8 pt-10 pb-7 dash-b mx-0" : "px-6 pt-5 pb-3")}>
        <I size={expanded ? 30 : 26} strokeWidth={1.75} />
        <h2 className={expanded ? "t-h2 font-semibold" : "t-h3"}>{title}</h2>
        <motion.button onClick={onToggle} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          whileTap={{ scale: 0.94 }} transition={T.hover}
          className="ml-auto grid place-items-center size-9 rounded-md hover:bg-tint cursor-pointer focus-ring">
          {expanded ? <Minimize2 size={28} strokeWidth={1.6} /> : <Maximize2 size={22} strokeWidth={1.75} />}
        </motion.button>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...T.page, delay: expanded ? 0.18 : delay }}>
        {children}
      </motion.div>
    </motion.section>
  );
}

export function useAgencyRows() {
  const { state } = useStore();
  return useMemo(() => {
    const counts = byKey(state.assets, (a) => a.agency);
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { rows, total: state.assets.length };
  }, [state.assets]);
}

