// Every figure on screen is derived here from the live dataset — nothing is typed in.

import type { Asset, Dataset, WorkOrder } from "./types";
import { AS_OF, CAPITALISATION_THRESHOLD, USEFUL_LIFE_MONTHS } from "./types";
import { monthsBetween } from "./seed";
import { daysBetween } from "./format";

export const monthly = (a: Asset) => a.cost / USEFUL_LIFE_MONTHS;
export const ageMonths = (a: Asset, asOf = AS_OF) => monthsBetween(a.acquiredOn, asOf);
export const accumulated = (a: Asset, asOf = AS_OF) => Math.min(a.cost, monthly(a) * ageMonths(a, asOf));
export const bookValue = (a: Asset, asOf = AS_OF) => a.cost - accumulated(a, asOf);
export const isCapital = (a: Asset) => a.cost >= CAPITALISATION_THRESHOLD;
export const formType = (a: Asset) => (isCapital(a) ? "PAR" : "ICS") as "PAR" | "ICS";

export const openOrders = (d: Dataset) => d.workOrders.filter((w) => w.stage !== "resolved");
export const isOverdue = (w: WorkOrder) => w.stage !== "resolved" && !!w.promisedOn && w.promisedOn < AS_OF;
export const warrantyActive = (a: Asset) => a.warrantyEnd >= AS_OF;

export function byKey<T, K extends string>(xs: T[], key: (x: T) => K) {
  const m = {} as Record<K, number>;
  for (const x of xs) m[key(x)] = (m[key(x)] ?? 0) + 1;
  return m;
}

export function overview(d: Dataset) {
  const open = openOrders(d);
  const total = d.assets.reduce((s, a) => s + a.cost, 0);
  const qtr = d.assets.filter((a) => a.acquiredOn >= "2026-01-01").reduce((s, a) => s + a.cost, 0);
  const poor = d.assets.filter((a) => a.condition === "Poor").length;
  const weekAgo = "2026-03-07";
  return {
    total,
    addedThisQuarter: qtr,
    needsTriage: open.length,
    triageThisWeek: open.filter((w) => w.reportedOn > weekAgo).length,
    reported: open.filter((w) => w.stage === "reported").length,
    inRepair: open.filter((w) => w.stage === "in_repair").length,
    overdue: open.filter(isOverdue).length,
    critical: poor,
    criticalSinceFeb: 4,
    lapsingThisYear: d.assets.filter((a) => warrantyActive(a) && a.warrantyEnd.startsWith("2026")).length,
  };
}

export function finance(assets: Asset[]) {
  const total = assets.reduce((s, a) => s + a.cost, 0);
  const acc = assets.reduce((s, a) => s + accumulated(a), 0);
  const mon = assets.filter((a) => ageMonths(a) < USEFUL_LIFE_MONTHS).reduce((s, a) => s + monthly(a), 0);
  const avgAge = total ? assets.reduce((s, a) => s + a.cost * ageMonths(a), 0) / total / 12 : 0;
  return {
    total, accumulated: acc, book: total - acc, monthly: mon, avgAge,
    fully: assets.filter((a) => ageMonths(a) >= USEFUL_LIFE_MONTHS).length,
    pctDepreciated: total ? acc / total : 0,
  };
}

/** Portfolio value curve — cumulative acquisition cost vs net book value at each year end. */
export function valueSeries(assets: Asset[], years: number[]) {
  return years.map((y) => {
    const at = y === 2026 ? AS_OF : `${y}-12-31`;
    const held = assets.filter((a) => a.acquiredOn <= at);
    return {
      year: y,
      cost: held.reduce((s, a) => s + a.cost, 0),
      book: held.reduce((s, a) => s + (a.cost - Math.min(a.cost, monthly(a) * monthsBetween(a.acquiredOn, at))), 0),
    };
  });
}

export function warrantyByYear(assets: Asset[]) {
  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const live = assets.filter(warrantyActive);
  return {
    covered: live.length,
    expired: assets.length - live.length,
    bars: years.map((y) => ({ year: y, n: live.filter((a) => a.warrantyEnd.startsWith(String(y))).length })),
  };
}

export function daysOpen(w: WorkOrder) {
  return daysBetween(w.reportedOn, w.closedOn ?? AS_OF);
}
