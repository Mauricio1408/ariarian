// Formatting and the date-colour rule.
// Source: Obsidian Vault/AriArian/{Color Tokens,Business Rules}.md

import { AS_OF } from "./types";

const group = new Intl.NumberFormat("en-PH");
const group2 = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₱489,045 */
export const php = (n: number) => `₱${group.format(Math.round(n))}`;
/** ₱ 4,685,945.00 */
export const phpExact = (n: number) => `₱ ${group2.format(n)}`;
/** 164,995.00 (forms) */
export const amount = (n: number) => group2.format(n);
export const count = (n: number) => group.format(n);

/** ₱14.9M · ₱124.5K */
export function phpShort(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₱${n}`;
}

const D = (iso: string) => new Date(iso + "T00:00:00");
export const longDate = (iso: string) => D(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
export const shortDate = (iso: string) => D(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const monthDay = (iso: string) => D(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const slashDate = (iso: string) => D(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

export const daysBetween = (a: string, b: string) => Math.round((D(b).getTime() - D(a).getTime()) / 86_400_000);

/**
 * Three tiers, applied to every date in the product. Colour only where there is a decision.
 *   past  neutral  the event already happened
 *   due   amber    a deadline is live
 *   over  red      the deadline has passed
 */
export type DateTier = "past" | "due" | "over";
export const DATE_TIER_CLASS: Record<DateTier, string> = {
  past: "text-date-past",
  due: "text-date-due",
  over: "text-date-over",
};

export function deadline(iso: string | null, asOf = AS_OF): { tier: DateTier; label: string } {
  if (!iso) return { tier: "past", label: "—" };
  const d = daysBetween(asOf, iso);
  if (d < 0) {
    const wks = Math.max(1, Math.round(-d / 7));
    return { tier: "over", label: `Overdue ${wks} wk${wks > 1 ? "s" : ""}` };
  }
  return { tier: "due", label: `Due ${monthDay(iso)}` };
}

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");
export const firstInitial = (name: string) => { const [f, ...r] = name.split(" "); return `${f[0]}. ${r[r.length - 1]}`; };
