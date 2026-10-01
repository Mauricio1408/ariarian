"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY, DEPARTMENTS } from "@/lib/types";
import type { AssetCategory } from "@/lib/types";
import { CATEGORY_ICON } from "./primitives";
import { Popover } from "./overlay";

/* The Figma "Popup Overlay" family, used wherever a field opens a chooser. */

/** Plain list — category (1964:10650), problem type (2020:19152), stage (2020:19151). */
export function OptionPopup<T extends string>({ open, onClose, options, value, onPick, icons, tones, align = "left", width = 200, plus }: {
  open: boolean; onClose: () => void; options: readonly T[]; value?: T | null; onPick: (v: T) => void;
  icons?: Partial<Record<T, LucideIcon>>; tones?: Partial<Record<T, string>>; align?: "left" | "right"; width?: number; plus?: boolean;
}) {
  return (
    <Popover open={open} onClose={onClose} align={align} className="p-0 py-1 rounded-[6px]" >
      <div style={{ width }}>
        {options.map((o) => {
          const I = icons?.[o] as LucideIcon | undefined;
          const on = value === o;
          return (
            <button key={o} type="button" onClick={() => { onPick(o); onClose(); }}
              className={cn("w-full flex items-center gap-3 h-10 px-4 text-[16px] text-left cursor-pointer transition-colors duration-[120ms]", on ? "bg-brand-50" : "hover:bg-tint", tones?.[o] ?? "text-ink")}>
              {I && <I size={20} strokeWidth={1.5} />}
              <span className="flex-1 truncate">{o}</span>
              {on ? <Check size={17} strokeWidth={2.4} className="text-brand-500" /> : plus ? <span className="text-[20px] leading-none text-ink">+</span> : null}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

export function CategoryPopup(props: { open: boolean; onClose: () => void; value?: AssetCategory | "All" | null; onPick: (v: AssetCategory | "All") => void; withAll?: boolean; align?: "left" | "right" }) {
  const options = (props.withAll ? ["All", ...ASSET_CATEGORY] : [...ASSET_CATEGORY]) as (AssetCategory | "All")[];
  return <OptionPopup {...props} options={options} icons={CATEGORY_ICON as Partial<Record<AssetCategory | "All", LucideIcon>>} width={182} />;
}

/** Department chooser — Figma 1964:9875: DOST services with a radio on the right. */
export function DepartmentPopup({ open, onClose, value, onPick, withAll, align = "left" }: { open: boolean; onClose: () => void; value: string; onPick: (v: string) => void; withAll?: boolean; align?: "left" | "right" }) {
  const list = withAll ? ["All", ...DEPARTMENTS] : [...DEPARTMENTS];
  return (
    <Popover open={open} onClose={onClose} align={align} className="p-0 py-1 rounded-[6px] border-brand-300">
      <div className="w-[520px] max-h-[420px] overflow-auto">
        {list.map((d) => {
          const on = value === d;
          return (
            <button key={d} type="button" onClick={() => { onPick(d); onClose(); }}
              className={cn("w-full flex items-center gap-3 h-9 px-4 text-[15px] text-left cursor-pointer transition-colors duration-[120ms]", on ? "bg-brand-50" : "hover:bg-tint")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d === "All" ? <span className="size-5" /> : <img src="/img/logomark.png" alt="" width={20} height={20} className="rounded-full" />}
              <span className="flex-1 truncate">{d === "All" ? "All departments" : d}</span>
              <span className={cn("grid place-items-center size-[18px] rounded-full border-[1.75px]", on ? "border-brand-500" : "border-ink")}>
                {on && <span className="size-2.5 rounded-full bg-brand-500" />}
              </span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar — Figma 1903:13802: month header, S–S grid, Cancel / Done. */
export function CalendarPopup({ open, onClose, value, onDone, align = "left", max }: { open: boolean; onClose: () => void; value: string | null; onDone: (iso: string) => void; align?: "left" | "right"; max?: string }) {
  const init = value ?? "2026-03-14";
  const [y, setY] = useState(Number(init.slice(0, 4)));
  const [m, setM] = useState(Number(init.slice(5, 7)) - 1);
  const [pick, setPick] = useState<string>(init);
  const [seen, setSeen] = useState(open);
  if (open !== seen) { setSeen(open); if (open) { setPick(init); setY(Number(init.slice(0, 4))); setM(Number(init.slice(5, 7)) - 1); } }

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const cells: { d: number; cur: boolean; iso?: string }[] = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ d: prevDays - i, cur: false });
  for (let d = 1; d <= days; d++) cells.push({ d, cur: true, iso: `${y}-${pad(m + 1)}-${pad(d)}` });
  while (cells.length % 7) cells.push({ d: cells.length - days - first + 1, cur: false });
  const step = (n: number) => { const t = new Date(y, m + n, 1); setY(t.getFullYear()); setM(t.getMonth()); };

  return (
    <Popover open={open} onClose={onClose} align={align} className="p-0 rounded-[20px]">
      <div className="w-[336px] px-6 pt-5 pb-5">
        <div className="flex items-center">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="grid place-items-center size-8 rounded-md text-brand-500 hover:bg-tint cursor-pointer"><ChevronLeft size={20} /></button>
          <p className="flex-1 text-center text-[18px] font-semibold">{MONTHS[m]} {y !== 2026 && y}</p>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className="grid place-items-center size-8 rounded-md text-brand-500 hover:bg-tint cursor-pointer"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 mt-4 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="text-[15px] font-semibold text-brand-500 h-8 grid place-items-center">{d}</span>)}
          {cells.map((c, i) => {
            const on = c.iso === pick;
            const disabled = !c.cur || (max && c.iso! > max);
            return (
              <button key={i} type="button" disabled={!!disabled} onClick={() => setPick(c.iso!)}
                className={cn("h-8 grid place-items-center text-[15px] tnum cursor-pointer disabled:cursor-default", !c.cur && "text-ink-3",
                  c.cur && disabled && "text-ink-3/60")}>
                <span className={cn("grid place-items-center size-7 rounded-[4px] transition-colors duration-[120ms]", on ? "bg-brand-500 text-white" : c.cur && !disabled && "hover:bg-tint")}>{c.d}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button type="button" onClick={onClose} className="h-10 rounded-[8px] bg-tint text-[15px] font-semibold hover:bg-line cursor-pointer transition-colors">Cancel</button>
          <button type="button" onClick={() => { onDone(pick); onClose(); }} className="h-10 rounded-[8px] bg-brand-500 text-white text-[15px] font-semibold hover:bg-brand-600 cursor-pointer transition-colors">Done</button>
        </div>
      </div>
    </Popover>
  );
}
