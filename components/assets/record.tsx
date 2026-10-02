import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationalStatus, PhysicalCondition } from "@/lib/types";

export const OP_TONE: Record<OperationalStatus, string> = { "In Use": "bg-good-soft/70 text-good-text", Maintenance: "bg-warn-soft text-warn-text", Standby: "bg-brand-100 text-brand-700", Damaged: "bg-bad-soft/80 text-bad-text", Decommissioned: "bg-brand-50 text-brand-700" };
export const PH_TONE: Record<PhysicalCondition, string> = { Excellent: "bg-good-soft/70 text-good-text", Fair: "bg-warn-soft text-warn-text", Poor: "bg-bad-soft/80 text-bad-text" };

export function StatusPill({ tone, children, size = "md" }: { tone: string; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap", size === "md" ? "h-7 pl-2.5 pr-3 text-[14px]" : "h-6 pl-2 pr-2.5 text-[13px]", tone)}>
      <span className="size-1.5 rounded-full bg-current" />{children}
    </span>
  );
}

/**
 * Record layout shared by the asset modal and the asset drawer: titled white sections of
 * icon · label · value rows (the Figma field rows, grouped the way Twenty / Attio group a record).
 */
export function RecordSection({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] bg-white border border-line/80", className)}>
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-1.5">
        <h3 className="t-l1 text-ink-2">{title}</h3>
        {aside && <span className="ml-auto">{aside}</span>}
      </header>
      <div className="divide-y divide-line/80">{children}</div>
    </section>
  );
}

export function RecordRow({ icon: I, label, children, error, required, className, labelWidth = 150 }: {
  icon: LucideIcon; label: string; children: React.ReactNode; error?: boolean; required?: boolean; className?: string; labelWidth?: number;
}) {
  return (
    <div className={cn("relative flex items-center gap-3 min-h-[50px] px-4 py-1.5", className)}>
      <I size={18} strokeWidth={1.6} className={cn("shrink-0", error ? "text-bad-text" : "text-ink-2")} />
      <span className={cn("shrink-0 text-[14px]", error ? "text-bad-text" : "text-ink-2")} style={{ width: labelWidth }}>
        {label}{required && <span className="text-ink-3" aria-hidden> *</span>}
      </span>
      <div className="relative flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  );
}
