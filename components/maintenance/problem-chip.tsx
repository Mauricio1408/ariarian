import { cn } from "@/lib/utils";
import type { ProblemType } from "@/lib/types";

/** Figma Table Data 633:1387 — Problem chips: 158x35, radius 8, Light 16. */
const TONE: Record<ProblemType, string> = {
  "Hardware Failure": "bg-cat-hw-bg text-cat-hw",
  "Physical Damage": "bg-cat-veh-bg text-cat-veh",
  "Software Issue": "bg-cat-sw-bg text-cat-sw",
  "Battery Issue": "bg-cat-app-bg text-cat-app",
  Others: "bg-cat-oth-bg text-cat-oth",
};

export function ProblemChip({ p, className }: { p: ProblemType; className?: string }) {
  return <span className={cn("inline-grid place-items-center h-[35px] w-[158px] rounded-lg text-[16px] font-light whitespace-nowrap", TONE[p], className)}>{p}</span>;
}
