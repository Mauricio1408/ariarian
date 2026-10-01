"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/primitives";
import { EASE, T } from "@/components/ui/motion";

/* ── Horizontal bar rows (Agency Inventory Split) ─────────────── */
export interface BarRow { key: string; label: string; value: number; sub?: string; muted?: boolean; onClick?: () => void }

export function BarRows({ rows, max, gap = "gap-[13px]", height = 10, showPct, total, labelW = 92 }: {
  rows: BarRow[]; max: number; gap?: string; height?: number; showPct?: boolean; total?: number; labelW?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className={cn("flex flex-col", gap)} onMouseLeave={() => setHover(null)}>
      {rows.map((r, i) => (
        <div key={r.key} onMouseEnter={() => setHover(r.key)} onClick={r.onClick}
          className={cn("group grid items-center gap-x-4 rounded-md -mx-2 px-2 py-0.5 transition-[background-color,opacity] duration-[120ms]",
            r.onClick && "cursor-pointer", hover && hover !== r.key ? "opacity-55" : "opacity-100", hover === r.key && "bg-tint")}
          style={{ gridTemplateColumns: showPct ? `${labelW}px 1fr 36px 44px` : `${labelW}px 1fr 36px` }}>
          <span className={cn("t-b1 truncate", r.muted ? "text-ink-2" : "text-ink")}>{r.label}</span>
          <span className="relative rounded-full bg-brand-100 overflow-hidden" style={{ height }}>
            <motion.span className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
              initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.05 }} />
          </span>
          <span className="t-b1 text-right tnum"><CountUp value={r.value} /></span>
          {showPct && total ? <span className="t-b2 text-ink-2 text-right tnum">{Math.round((r.value / total) * 100)}%</span> : null}
        </div>
      ))}
    </div>
  );
}

/* ── Donut (Asset Health Status) ──────────────────────────────── */
export interface Slice { key: string; label: string; value: number; color: string; onClick?: () => void }

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

export function Donut({ slices, size = 210, stroke = 22, center, hover, onHover }: {
  slices: Slice[]; size?: number; stroke?: number; center: React.ReactNode; hover: string | null; onHover: (k: string | null) => void;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2 - 4;
  const c = size / 2;
  const gap = 0.045;
  const starts = slices.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? -Math.PI / 2 + gap / 2 : acc[i - 1] + (slices[i - 1].value / total) * Math.PI * 2], []);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {slices.map((s, i) => {
          const span = (s.value / total) * Math.PI * 2;
          const d = arc(c, c, r, starts[i], starts[i] + Math.max(0.001, span - gap));
          const on = hover === s.key;
          return (
            <motion.path key={s.key} d={d} fill="none" stroke={s.color} strokeLinecap="butt"
              initial={{ pathLength: 0, strokeWidth: stroke }}
              animate={{ pathLength: 1, strokeWidth: on ? stroke + 8 : stroke, opacity: hover && !on ? 0.45 : 1 }}
              transition={{ pathLength: { duration: 0.9, ease: EASE, delay: 0.2 + i * 0.18 }, strokeWidth: T.state, opacity: T.state }}
              onMouseEnter={() => onHover(s.key)} onMouseLeave={() => onHover(null)} onClick={s.onClick}
              className={s.onClick ? "cursor-pointer" : undefined} />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">{center}</div>
    </div>
  );
}

/* ── Stacked bar (Attention Monitor) ──────────────────────────── */
export function Stacked({ parts, height = 14, hover, onHover }: {
  parts: { key: string; value: number; color: string }[]; height?: number; hover: string | null; onHover: (k: string | null) => void;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="flex w-full gap-[3px]" style={{ height }} onMouseLeave={() => onHover(null)}>
      {parts.map((p, i) => (
        <motion.span key={p.key} onMouseEnter={() => onHover(p.key)}
          className={cn("h-full first:rounded-l-full last:rounded-r-full origin-left")}
          style={{ background: p.color }}
          initial={{ flexGrow: 0, opacity: 0 }}
          animate={{ flexGrow: p.value / total, opacity: hover && hover !== p.key ? 0.35 : 1, scaleY: hover === p.key ? 1.25 : 1 }}
          transition={{ flexGrow: { duration: 0.8, ease: EASE, delay: 0.15 + i * 0.08 }, opacity: T.state, scaleY: T.state }} />
      ))}
    </div>
  );
}

/* ── Column chart (Warranty coverage) ─────────────────────────── */
export function Columns({ bars, max = 16, height = 130, highlight, onPick, picked, showYears = false, ticks = [0, 4, 8, 12, 16], barW = 28 }: {
  bars: { year: number; n: number }[]; max?: number; height?: number; highlight?: number; onPick?: (y: number | null) => void; picked?: number | null; showYears?: boolean; ticks?: number[]; barW?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-3">
      <div className="relative w-6 shrink-0" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 t-b3 text-ink-2 tnum -translate-y-1/2" style={{ top: height - (t / max) * height }}>{t}</span>
        ))}
      </div>
      <div className="relative flex-1">
        {ticks.slice(1).map((t) => (
          <span key={t} className="absolute left-0 right-0 border-t border-dashed border-line" style={{ top: height - (t / max) * height }} />
        ))}
        <div className="relative flex items-end justify-between px-2" style={{ height }} onMouseLeave={() => setHover(null)}>
          {bars.map((b, i) => {
            const on = hover === b.year || picked === b.year;
            const dim = (hover !== null || (picked ?? null) !== null) && !on;
            return (
              <button key={b.year} onMouseEnter={() => setHover(b.year)} onClick={() => onPick?.(picked === b.year ? null : b.year)}
                className={cn("relative flex flex-col items-center justify-end h-full", onPick && "cursor-pointer")} style={{ width: barW + 24 }}>
                <motion.span className="t-b2 text-ink tnum mb-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: dim ? 0.4 : 1, y: 0 }} transition={{ ...T.page, delay: 0.5 + i * 0.06 }}>
                  {b.n}
                </motion.span>
                <motion.span className="rounded-t-[6px] origin-bottom"
                  style={{ width: barW, height: (b.n / max) * height, background: b.year === highlight ? "var(--color-brand-500)" : "var(--color-brand-300)" }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1, opacity: dim ? 0.4 : 1, filter: on ? "brightness(0.92)" : "brightness(1)" }}
                  transition={{ scaleY: { duration: 0.7, ease: EASE, delay: 0.2 + i * 0.06 }, opacity: T.state }} />
                <AnimatePresence>
                  {hover === b.year && (
                    <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.hover}
                      className="absolute -top-9 z-10 whitespace-nowrap rounded-md bg-ink text-white text-[12px] px-2 py-1 shadow-overlay">
                      {b.n} lapse in {b.year}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
        {showYears && (
          <div className="flex justify-between px-2 mt-3">
            {bars.map((b) => (
              <span key={b.year} className={cn("t-b2 text-center tnum", b.year === highlight ? "text-brand-600" : "text-ink-2")} style={{ width: barW + 24 }}>{b.year}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Line chart (Portfolio value over time) ───────────────────── */
export function LineChart({ series, years, width = 640, height = 230, colors, format }: {
  series: { key: string; label: string; values: number[] }[]; years: number[]; width?: number; height?: number; colors: string[]; format: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = 16_000_000;
  const padL = 56, padB = 28, w = width - padL, h = height - padB;
  const x = (i: number) => padL + (i / (years.length - 1)) * w;
  const y = (v: number) => h - (v / max) * h;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" onMouseLeave={() => setHover(null)}>
      {[0, 4e6, 8e6, 12e6, 16e6].map((t) => (
        <g key={t}>
          <line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray="4 6" />
          <text x={0} y={y(t) + 4} className="fill-ink-2 text-[11px]">₱{t / 1e6}M</text>
        </g>
      ))}
      {years.map((yr, i) => (
        <text key={yr} x={x(i)} y={height - 4} textAnchor="middle" className="fill-ink-2 text-[11px]">{yr}</text>
      ))}
      {series.map((s, si) => {
        const d = s.values.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ");
        return (
          <g key={s.key}>
            <motion.path d={d} fill="none" stroke={colors[si]} strokeWidth={2.2} strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE, delay: 0.2 + si * 0.2 }} />
            {s.values.map((v, i) => (
              <motion.circle key={i} cx={x(i)} cy={y(v)} fill={colors[si]} initial={{ r: 0 }} animate={{ r: hover === i ? 5.5 : 3.5 }}
                transition={{ r: hover === null ? { ...T.state, delay: 0.5 + i * 0.12 + si * 0.2 } : T.state }} />
            ))}
          </g>
        );
      })}
      {years.map((yr, i) => (
        <rect key={yr} x={x(i) - w / (years.length - 1) / 2} y={0} width={w / (years.length - 1)} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
      <AnimatePresence>
        {hover !== null && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.hover} pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} stroke="var(--color-ink-3)" strokeDasharray="3 4" />
            <g transform={`translate(${Math.min(x(hover) + 10, width - 170)}, 8)`}>
              <rect width={160} height={62} rx={8} fill="var(--color-ink)" />
              <text x={12} y={20} className="fill-white text-[12px] font-semibold">{years[hover]}</text>
              {series.map((s, si) => (
                <g key={s.key} transform={`translate(12, ${36 + si * 16})`}>
                  <circle r={3.5} cx={3} cy={-4} fill={colors[si]} />
                  <text x={12} y={0} className="fill-white/80 text-[11px]">{s.label}</text>
                  <text x={136} y={0} textAnchor="end" className="fill-white text-[11px] tnum">{format(s.values[hover])}</text>
                </g>
              ))}
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
