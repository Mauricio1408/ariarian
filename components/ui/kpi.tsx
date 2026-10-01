"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Sparkbars } from "./primitives";
import { stagger } from "./motion";

type Tone = "good" | "brand" | "warn" | "bad";
const DOT: Record<Tone, string> = { good: "bg-good-solid", brand: "bg-brand-500", warn: "bg-warn-solid", bad: "bg-bad-chart" };
const PILL: Record<Tone, string> = { good: "bg-good-soft text-good-text", brand: "bg-brand-100 text-brand-700", warn: "bg-warn-soft text-warn-text", bad: "bg-bad-soft/80 text-bad-text" };

export function KpiCard({ label, value, delta, tone, i = 0, onClick, active }: { label: string; value: React.ReactNode; delta: React.ReactNode; tone: Tone; i?: number; onClick?: () => void; active?: boolean }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={!onClick}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(i, 0.05, 0.05)}
      whileHover={onClick ? { y: -2 } : undefined}
      className={cn("card-raised text-left px-[18px] pt-5 pb-4 flex items-start gap-3 transition-shadow duration-200 enabled:cursor-pointer enabled:hover:shadow-lift disabled:cursor-default",
        active && "ring-2 ring-brand-300")}>
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-2 t-b2 text-ink-2 whitespace-nowrap"><span className={cn("size-2 rounded-full shrink-0", DOT[tone])} />{label}</p>
        <p className="text-[32px] font-bold tracking-[-0.02em] leading-[1.2] mt-0.5">{value}</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 h-[22px] text-[12px] mt-1 whitespace-nowrap", PILL[tone])}>{delta}</span>
      </div>
      <div className="pt-7"><Sparkbars tone={tone === "warn" ? "amber" : tone} delay={i * 0.05} /></div>
    </motion.button>
  );
}
