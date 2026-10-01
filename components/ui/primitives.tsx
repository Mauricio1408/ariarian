"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { forwardRef, useEffect, useId, useRef } from "react";
import { Box, Check, Heart, Monitor, Server, Truck, Tv, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetCategory, OperationalStatus, Priority } from "@/lib/types";
import { T } from "./motion";

/* ── Button ───────────────────────────────────────────────────── */
type Variant = "primary" | "dark" | "gray" | "outline" | "ghost" | "soft" | "danger-soft" | "success" | "link";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  dark: "bg-ink text-white hover:bg-n-500",
  gray: "bg-[#e3e7ea] text-ink-2 hover:bg-[#d8dde1]",
  outline: "bg-white text-ink border border-line hover:border-ink-3 hover:bg-tint",
  ghost: "text-ink-2 hover:bg-tint hover:text-ink",
  soft: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  "danger-soft": "bg-bad-soft text-bad-text hover:bg-[#ffc2b2]",
  success: "bg-good-text text-white hover:bg-[#347d1a] shadow-[0_6px_14px_-6px_rgb(60_144_30/0.6)]",
  link: "text-brand-600 hover:text-brand-700 px-0",
};

export interface ButtonProps extends Omit<React.ComponentProps<typeof motion.button>, "children"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", icon: I, iconRight: IR, loading, className, children, disabled, ...rest }, ref,
) {
  const sz = size === "sm" ? "h-8 px-3 text-[13px] gap-1.5" : size === "lg" ? "h-11 px-5 text-[17px] gap-2" : "h-9 px-3.5 text-[15px] gap-2";
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={T.hover}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none focus-ring",
        "transition-[background-color,color,border-color,box-shadow,opacity] duration-[120ms] ease-ariarian",
        "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        sz, VARIANT[variant], className,
      )}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-[inherit]", loading && "opacity-0")}>
        {I && <I size={size === "lg" ? 20 : 16} strokeWidth={1.75} />}
        {children}
        {IR && <IR size={size === "lg" ? 20 : 18} strokeWidth={1.75} />}
      </span>
      {loading && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center">
          <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
        </motion.span>
      )}
    </motion.button>
  );
});

export function IconButton({ icon: I, label, className, tone, ...rest }: { icon: LucideIcon; label: string; tone?: string } & React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.94 }}
      transition={T.hover}
      className={cn("grid place-items-center size-8 rounded-md cursor-pointer focus-ring hover:bg-tint transition-colors duration-[120ms]", tone, className)}
      {...rest}
    >
      <I size={18} strokeWidth={1.75} />
    </motion.button>
  );
}

/* ── Category chip ────────────────────────────────────────────── */
export const CATEGORY_ICON: Record<AssetCategory, LucideIcon> = {
  Hardware: Server, Vehicles: Truck, Office: Users, Appliances: Tv, Software: Monitor, Essentials: Heart, Others: Box,
};
const CATEGORY_TONE: Record<AssetCategory, string> = {
  Hardware: "bg-cat-hw-bg text-cat-hw",
  Vehicles: "bg-cat-veh-bg text-cat-veh",
  Office: "bg-cat-off-bg text-cat-off",
  Appliances: "bg-cat-app-bg text-cat-app",
  Software: "bg-cat-sw-bg text-cat-sw",
  Essentials: "bg-cat-ess-bg text-cat-ess",
  Others: "bg-brand-50 text-brand-700",
};
export function CategoryChip({ category, size = "md" }: { category: AssetCategory; size?: "sm" | "md" }) {
  const I = CATEGORY_ICON[category];
  return (
    <span className={cn("inline-flex items-center justify-center gap-2 rounded-md", CATEGORY_TONE[category],
      size === "md" ? "h-10 w-[140px] text-[16px]" : "h-6 px-2 text-[13px] gap-1.5")}>
      <I size={size === "md" ? 17 : 13} strokeWidth={1.75} />
      {category}
    </span>
  );
}
export const categoryTone = (c: AssetCategory) => CATEGORY_TONE[c];

/* ── Status text ──────────────────────────────────────────────── */
export const OPERATIONAL_TEXT: Record<OperationalStatus, string> = {
  "In Use": "text-good-text", Maintenance: "text-warn-text", Standby: "text-brand-500", Damaged: "text-bad-text", Decommissioned: "text-ink-3",
};
export const OPERATIONAL_DOT: Record<OperationalStatus, string> = {
  Damaged: "bg-bad-chart", Maintenance: "bg-warn-solid", Standby: "bg-brand-500", "In Use": "bg-good-solid", Decommissioned: "bg-ink-3",
};

export function Pill({ tone = "neutral", className, children }: { tone?: "good" | "warn" | "bad" | "brand" | "neutral" | "dark"; className?: string; children: React.ReactNode }) {
  const t = {
    good: "bg-good-soft/70 text-good-text", warn: "bg-warn-soft text-warn-text", bad: "bg-bad-soft/80 text-bad-text",
    brand: "bg-brand-100 text-brand-700", neutral: "bg-tint text-ink-2 border border-line", dark: "bg-n-500 text-white",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[12px] font-medium whitespace-nowrap", t, className)}>{children}</span>;
}

export function PriorityPill({ p }: { p: Priority }) {
  return <Pill tone={p === "High" ? "bad" : p === "Medium" ? "warn" : "neutral"} className="rounded-full">{p}</Pill>;
}

/* ── Checkbox — blue when active (Figma Table Data / Checked Box 855:2519) ── */
export function Checkbox({ checked, indeterminate, onChange, label, className }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label?: string; className?: string }) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn("relative grid place-items-center size-[18px] shrink-0 rounded-[4px] border-[1.75px] cursor-pointer focus-ring",
        "transition-colors duration-[120ms] ease-ariarian", on ? "bg-brand-500 border-brand-500" : "bg-white border-ink hover:border-brand-500", className)}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-white">
        {indeterminate && !checked ? (
          <path key="dash" d="M4 8h8" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        ) : (
          <motion.path key="check" d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={T.state} />
        )}
      </svg>
    </button>
  );
}

/* ── Toggle ───────────────────────────────────────────────────── */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn("relative h-[22px] w-[38px] rounded-full p-[3px] cursor-pointer focus-ring transition-colors duration-200 ease-ariarian", on ? "bg-brand-500" : "bg-[#d5dbe0]")}>
      <motion.span layout transition={T.spring} className={cn("block size-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)]", on && "ml-auto")} />
    </button>
  );
}

/* ── Avatar / thumbnail ───────────────────────────────────────── */
export function Avatar({ src, name, size = 32, ring, className }: { src?: string; name: string; size?: number; ring?: boolean; className?: string }) {
  const ini = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} draggable={false}
      className={cn("rounded-full object-cover shrink-0 bg-tint", ring && "ring-[3px] ring-white", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn("grid place-items-center rounded-full shrink-0 bg-brand-100 text-brand-700 font-semibold", ring && "ring-[3px] ring-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>{ini}</span>
  );
}

export function Thumb({ src, category, size = 28, className }: { src?: string; category: AssetCategory; size?: number; className?: string }) {
  const I = CATEGORY_ICON[category];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} draggable={false} className={cn("rounded-[5px] object-cover shrink-0", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn("grid place-items-center rounded-[5px] shrink-0", CATEGORY_TONE[category], className)} style={{ width: size, height: size }}>
      <I size={size * 0.55} strokeWidth={1.75} />
    </span>
  );
}

/* ── Count-up number ──────────────────────────────────────────── */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("en-PH"), duration = 0.9, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, format);
  const first = useRef(true);
  useEffect(() => {
    // A hidden tab pauses requestAnimationFrame — land on the value instead of stalling at 0.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") { mv.set(value); first.current = false; return; }
    if (!inView) return;
    const c = animate(mv, value, { duration: first.current ? duration : 0.6, ease: [0.32, 0.72, 0, 1] });
    first.current = false;
    return c.stop;
  }, [value, inView, mv, duration]);
  return <motion.span ref={ref} className={cn("tnum", className)}>{text}</motion.span>;
}

/* ── KPI spark bars (the five-step mini bars on stat cards) ───── */
export function Sparkbars({ tone }: { tone: "good" | "warn" | "bad" | "brand" | "amber"; delay?: number }) {
  const colors = {
    good: ["#d7ffc9", "#c4f3b2", "#b0e99b", "#9bdc84", "#3c901e"],
    warn: ["#ffebc9", "#ffe0ab", "#ffd58e", "#ffcb73", "#c47f07"],
    amber: ["#ffebc9", "#ffe0ab", "#ffd58e", "#ffcb73", "#e4a33a"],
    bad: ["#ffd4c9", "#ffc0b0", "#ffab97", "#ff967e", "#c33a1a"],
    brand: ["#c9f0ff", "#a6e5ff", "#80d9ff", "#5cd2ff", "#00adef"],
  }[tone];
  const h = tone === "bad" ? [7, 11, 15, 19, 23] : [14, 15, 16, 17, 23];
  return (
    <span className="inline-flex items-end gap-[3px] h-6" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} className="w-[5px] rounded-[2px]" style={{ background: c, height: h[i] }} />
      ))}
    </span>
  );
}

/* ── Fields ───────────────────────────────────────────────────── */
export const Field = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: LucideIcon; hint?: string }>(
  function Field({ label, icon: I, hint, className, id, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <label htmlFor={fid} className="block">
        {label && <span className="flex items-center gap-1.5 t-b2 text-ink-2 mb-1.5">{I && <I size={15} strokeWidth={1.75} />}{label}</span>}
        <input ref={ref} id={fid} {...rest}
          className={cn("w-full h-10 rounded-md border border-line bg-white px-3 text-[15px] text-ink placeholder:text-ink-3",
            "transition-[border-color,box-shadow] duration-[120ms] ease-ariarian hover:border-ink-3",
            "focus:outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] read-only:bg-tint read-only:text-ink-2", className)} />
        {hint && <span className="block t-b3 text-ink-3 mt-1">{hint}</span>}
      </label>
    );
  },
);

export function Select({ label, value, onChange, options, className }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("block", className)}>
      {label && <span className="block t-b2 text-ink-2 mb-1.5">{label}</span>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border border-line bg-white px-3 text-[15px] text-ink cursor-pointer hover:border-ink-3 focus:outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] transition-[border-color,box-shadow] duration-[120ms]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/* ── Tabs with sliding indicator ──────────────────────────────── */
export function Tabs<K extends string>({ tabs, value, onChange, id, variant = "underline", className }: {
  tabs: { key: K; label: React.ReactNode; count?: number }[]; value: K; onChange: (k: K) => void; id: string; variant?: "underline" | "pill"; className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex items-center", variant === "underline" ? "gap-8" : "gap-1", className)}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button key={t.key} role="tab" aria-selected={active} onClick={() => onChange(t.key)}
            className={cn("relative flex items-center gap-2 cursor-pointer focus-ring rounded-sm transition-colors duration-[120ms]",
              variant === "underline" ? "pb-2.5 t-b1" : "h-8 px-3 rounded-full text-[13px]",
              active ? (variant === "underline" ? "text-ink font-medium" : "text-white") : "text-ink-2 hover:text-ink")}>
            {variant === "pill" && active && <motion.span layoutId={`${id}-pill`} transition={T.spring} className="absolute inset-0 rounded-full bg-brand-500" />}
            <span className="relative">{t.label}</span>
            {t.count !== undefined && (
              <span className={cn("relative tnum text-[12px] rounded-full px-1.5 min-w-[22px] h-[18px] grid place-items-center transition-colors duration-200",
                active && variant === "underline" ? "bg-n-500 text-white" : active ? "text-white/90" : "text-ink-2")}>{t.count}</span>
            )}
            {variant === "underline" && active && <motion.span layoutId={`${id}-line`} transition={T.spring} className="absolute -bottom-px left-0 right-0 h-[2px] bg-ink rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
export const Skeleton = ({ className }: { className?: string }) => <span className={cn("skeleton block", className)} />;

/* ── Small check burst used on success ────────────────────────── */
export function SuccessCheck({ size = 56 }: { size?: number }) {
  return (
    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={T.spring}
      className="grid place-items-center rounded-full bg-good-soft text-good-text" style={{ width: size, height: size }}>
      <Check size={size * 0.5} strokeWidth={2.4} />
    </motion.span>
  );
}
