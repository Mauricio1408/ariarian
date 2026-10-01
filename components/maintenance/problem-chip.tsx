import { cn } from "@/lib/utils";
import type { ProblemType } from "@/lib/types";

const TONE: Record<ProblemType, string> = {
  "Physical Damage": "bg-good-soft text-good-text",
  "Hardware Failure": "bg-bad-soft text-bad-text",
  "Software Issue": "bg-brand-100 text-brand-700",
  "Battery Issue": "bg-warn-soft text-warn-text",
  Others: "bg-tint text-ink-2 border border-line",
};

export function ProblemChip({ p, className }: { p: ProblemType; className?: string }) {
  return <span className={cn("inline-grid place-items-center h-9 w-[140px] rounded-md text-[14px] whitespace-nowrap", TONE[p], className)}>{p}</span>;
}
