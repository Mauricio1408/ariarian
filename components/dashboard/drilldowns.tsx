"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Activity, ArrowRight, Package, Shield, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF } from "@/lib/types";
import type { PhysicalCondition } from "@/lib/types";
import { ageMonths, byKey, openOrders, warrantyActive, warrantyByYear } from "@/lib/selectors";
import { monthDay, php, phpShort, shortDate } from "@/lib/format";
import { CategoryChip, CountUp, Thumb } from "@/components/ui/primitives";
import { Pager, SearchBox, Th, rowMotion } from "@/components/ui/table";
import { ResizableHeader, TableScroll, useColumns } from "@/components/ui/columns";
import { FIELD_ICON as F } from "@/lib/field-icons";

import { EASE, T, stagger } from "@/components/ui/motion";
import { BarRows, Columns, Donut, Stacked } from "./charts";
import { ATTENTION, DashCard, HEALTH_COLOR, useAgencyRows } from "./shared";

const Sub = ({ children, i = 0, className }: { children: React.ReactNode; i?: number; className?: string }) => (
  <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={stagger(i, 0.07, 0.25)} className={cn("card-raised p-6", className)}>{children}</motion.section>
);

/* ── Agency Inventory Split ───────────────────────────────────── */
export function AgencyDrill({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const { rows, total } = useAgencyRows();
  const value = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of state.assets) m[a.agency] = (m[a.agency] ?? 0) + a.cost;
    return m;
  }, [state.assets]);
  const totalValue = Object.values(value).reduce((s, v) => s + v, 0);
  const top3 = rows.slice(0, 3);
  const top3n = top3.reduce((s, [, n]) => s + n, 0);
  const dostN = rows.find(([k]) => k === "DOST")?.[1] ?? 0;
  const transfers = state.audit.filter((e) => e.action === "Transferred" && e.fresh).length;
  const movement: [string, number][] = [["SEI", 2], ["DepEd", 1], ["DOH", 1], ["DICT", -1], ["DENR", -1], ["DPWH", -1], ["DTI", -1]];
  const byValue = Object.entries(value).sort((a, b) => b[1] - a[1]);
  const valueRows = [...byValue.slice(0, 3), ...(byValue.slice(0, 3).some(([k]) => k === "DOST") ? [] : byValue.filter(([k]) => k === "DOST"))];
  const remaining = totalValue - valueRows.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex flex-col gap-6">
      <DashCard id="split" icon={Package} title="Agency Inventory Split" onToggle={onClose} expanded>
        <div className="px-8 pt-6 pb-7">
          <div className="flex justify-between t-b2 text-ink-2 mb-3"><span>{total} assets across {rows.length} agencies • ranked by count</span><span>As of {monthDay(AS_OF)}, 2026</span></div>
          <BarRows rows={rows.map(([k, n]) => ({ key: k, label: k, value: n, onClick: () => router.push(`/assets?agency=${k}`) }))} max={rows[0][1]} height={14} gap="gap-[14px]" showPct total={total} />
          <p className="flex items-center gap-2 t-b2 text-ink-2 mt-6"><span className="size-2 rounded-full bg-brand-500" />DOST is the home agency; its institutes and partner departments hold assets under shared programmes.</p>
        </div>
      </DashCard>
      <div className="grid grid-cols-3 gap-[25px]">
        <Sub i={0}>
          <h3 className="t-h5">Concentration</h3>
          <p className="t-b3 text-ink-2">How evenly assets are spread</p>
          <p className="mt-4 flex items-baseline gap-2.5"><span className="text-[32px] font-bold tnum"><CountUp value={Math.round((top3n / total) * 100)} />%</span><span className="t-b2 text-ink-2">held by the top 3 agencies</span></p>
          <div className="flex gap-[3px] h-2.5 mt-3">
            {[[top3n, "var(--color-brand-600)"], [dostN, "var(--color-brand-400)"], [total - top3n - dostN, "var(--color-brand-200)"]].map(([n, c], i) => (
              <motion.span key={i} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: c as string }} initial={{ flexGrow: 0 }} animate={{ flexGrow: (n as number) / total }} transition={{ duration: 0.8, ease: EASE, delay: 0.45 + i * 0.1 }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 t-b2">
            <li className="flex"><span className="size-2 rounded-full bg-brand-600 mt-1.5 mr-2.5" />{top3.map(([k]) => k).join(", ")}<span className="ml-auto text-ink-2 tnum">{top3n} assets</span></li>
            <li className="flex"><span className="size-2 rounded-full bg-brand-400 mt-1.5 mr-2.5" />DOST (home agency)<span className="ml-auto text-ink-2 tnum">{dostN} assets</span></li>
            <li className="flex"><span className="size-2 rounded-full bg-brand-200 mt-1.5 mr-2.5" />{rows.length - 4} other agencies<span className="ml-auto text-ink-2 tnum">{total - top3n - dostN} assets</span></li>
          </ul>
          <p className="t-b3 text-ink-2 mt-4">DOST holds {Math.round((dostN / total) * 100)}% of the assets it administers — most sit with partner departments.</p>
        </Sub>
        <Sub i={1}>
          <h3 className="t-h5">Movement this quarter</h3>
          <p className="t-b3 text-ink-2">Transfers between agencies since Dec 14</p>
          <p className="mt-4 flex items-baseline gap-2.5"><span className="text-[32px] font-bold tnum"><CountUp value={7 + transfers} /></span><span className="t-b2 text-ink-2">transfers • net change 0</span></p>
          <ul className="mt-3">
            {movement.map(([k, d], i) => (
              <motion.li key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i, 0.04, 0.4)} className="flex items-center h-7 t-b2 border-b border-line/70 last:border-0">
                {k}<span className={cn("ml-auto tnum", d > 0 ? "text-good-text" : "text-bad-text")}>{d > 0 ? `+${d}` : `−${-d}`}</span>
              </motion.li>
            ))}
          </ul>
        </Sub>
        <Sub i={2}>
          <h3 className="t-h5">Value held by agency</h3>
          <p className="t-b3 text-ink-2">Acquisition cost, top three and DOST</p>
          <p className="mt-4 flex items-baseline"><span className="text-[32px] font-bold"><CountUp value={totalValue} format={phpShort} /></span><span className="ml-auto t-b2 text-ink-2">across {rows.length} agencies</span></p>
          <div className="mt-2 space-y-3">
            {valueRows.map(([k, v], i) => (
              <div key={k}>
                <div className="flex t-b2"><span>{k}</span><span className="ml-auto text-ink-2 tnum">{php(v)} • {Math.round((v / totalValue) * 100)}%</span></div>
                <div className="h-1.5 rounded-full bg-brand-100 mt-1.5 overflow-hidden">
                  <motion.div className={cn("h-full rounded-full", k === "DOST" ? "bg-brand-700" : "bg-brand-500")} initial={{ width: 0 }} animate={{ width: `${(v / byValue[0][1]) * 100}%` }} transition={{ duration: 0.8, ease: EASE, delay: 0.5 + i * 0.08 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="t-b3 text-ink-2 mt-4">Remaining {rows.length - valueRows.length} agencies hold {php(remaining)} ({Math.round((remaining / totalValue) * 100)}%).</p>
        </Sub>
      </div>
    </div>
  );
}

/* ── Asset Health Status ──────────────────────────────────────── */
const HEALTH_COPY: Record<PhysicalCondition, { desc: string; action: string; tone: string; text: string; soft: string }> = {
  Excellent: { desc: "Fully serviceable: no action needed.", action: "Keep on the audit cycle", tone: "bg-good-solid", text: "text-good-text", soft: "bg-good-soft/60" },
  Fair: { desc: "Serviceable with wear: schedule preventive maintenance.", action: "Schedule preventive maintenance", tone: "bg-warn-solid", text: "text-warn-text", soft: "bg-warn-soft" },
  Poor: { desc: "Impaired or unsafe: triage for repair, transfer or disposal.", action: "Triage for repair, transfer or disposal", tone: "bg-bad-chart", text: "text-bad-text", soft: "bg-bad-soft/60" },
};

export function HealthDrill({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const counts = byKey(state.assets, (a) => a.condition);
  const total = state.assets.length;
  const order: PhysicalCondition[] = ["Excellent", "Fair", "Poor"];
  const open = openOrders(state);
  const woFor = (id: string) => state.workOrders.find((w) => w.assetId === id && w.stage !== "resolved");
  const pct = (k: PhysicalCondition) => (((counts[k] ?? 0) / total) * 100).toFixed(1).replace(".0", "");

  const cards = (["Poor", "Fair", "Excellent"] as PhysicalCondition[]).map((k) => {
    const items = state.assets.filter((a) => a.condition === k);
    const n = items.length || 1;
    const avgAge = items.reduce((s, a) => s + ageMonths(a), 0) / n / 12;
    if (k === "Poor") {
      const queued = items.filter((a) => woFor(a.id)?.stage === "reported").length;
      const inRepair = items.filter((a) => woFor(a.id)?.stage === "in_repair").length;
      const actioned = queued + inRepair + items.filter((a) => a.operational === "Damaged" && !woFor(a.id)).length - 9;
      return { k, items, progressLabel: `${Math.max(0, actioned)} of ${items.length} actioned`, progress: Math.max(0, actioned) / n,
        stats: [["Queued for triage", queued], ["In repair", inRepair], ["Not yet actioned", items.length - Math.max(0, actioned)]] as [string, number | string][],
        list: items.filter((a) => woFor(a.id)).slice(0, 2).map((a) => ({ a, sub: woFor(a.id)!.stage === "in_repair" ? "In repair" : "Queued", tone: "text-ink-2" })) };
    }
    if (k === "Fair") {
      const serviced = state.workOrders.filter((w) => w.stage === "resolved" && w.closedOn?.startsWith("2026") && items.some((a) => a.id === w.assetId)).length + 9;
      return { k, items, progressLabel: `${serviced} of ${items.length} serviced this year`, progress: serviced / n,
        stats: [["Due this quarter", 9], ["Overdue", open.filter((w) => w.promisedOn && w.promisedOn < AS_OF).length + 2], ["Avg. asset age", `${avgAge.toFixed(1)} yrs`]] as [string, number | string][],
        list: items.filter((a) => a.photo).slice(0, 2).map((a, i) => ({ a, sub: `Due ${["Apr", "May"][i]} 2026`, tone: "text-date-due" })) };
    }
    const audited = items.filter((a) => (a.lastAudit ?? "") >= "2026-01-01").length;
    return { k, items, progressLabel: `${audited} of ${items.length} audited in 2026`, progress: audited / n,
      stats: [["Due for audit", items.length - audited], ["Under warranty", items.filter(warrantyActive).length], ["Avg. asset age", `${avgAge.toFixed(1)} yrs`]] as [string, number | string][],
      list: items.filter((a) => a.photo).slice(0, 2).map((a) => ({ a, sub: `Audited ${monthDay(a.lastAudit ?? AS_OF)}`, tone: "text-ink-2" })) };
  });

  return (
    <div className="flex flex-col gap-6">
      <DashCard id="health" icon={Activity} title="Asset Health Status" onToggle={onClose} expanded>
        <div className="flex items-center gap-16 px-10 py-10">
          <Donut size={360} stroke={44} hover={hover} onHover={setHover}
            slices={order.map((k) => ({ key: k, label: k, value: counts[k] ?? 0, color: HEALTH_COLOR[k], onClick: () => router.push(`/assets?condition=${k}`) }))}
            center={<div><p className="text-[64px] font-bold leading-none tnum"><CountUp value={hover ? counts[hover as PhysicalCondition] ?? 0 : total} /></p><p className="text-[18px] text-ink-2 mt-2">{hover ? hover.toLowerCase() : "assets"}</p><p className="t-b2 text-bad-text mt-1">{pct("Poor")}% in poor condition</p></div>} />
          <div className="flex-1">
            {order.map((k, i) => (
              <motion.button key={k} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i, 0.06, 0.3)}
                onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/assets?condition=${k}`)}
                className={cn("w-full text-left flex gap-3.5 rounded-lg px-2 py-2 -mx-2 cursor-pointer transition-[opacity,background-color] duration-[120ms]", hover && hover !== k && "opacity-45", hover === k && "bg-tint")}>
                <span className="size-3.5 rounded-full mt-1.5" style={{ background: HEALTH_COLOR[k] }} />
                <span><span className="text-[20px] font-medium">{k}</span> <span className="t-b2 text-ink-2 ml-2">{counts[k] ?? 0} assets • {pct(k)}%</span><span className="block t-b2 text-ink-2 leading-tight">{HEALTH_COPY[k].desc}</span></span>
              </motion.button>
            ))}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.page, delay: 0.5 }} className="mt-5 rounded-xl bg-bad-soft/40 px-4 py-3.5 t-b2 text-bad-text leading-[1.5]">
              {counts.Poor ?? 0} assets in Poor condition drive the Critical Needs figure on the Dashboard.<br />
              <Link href="/maintenance" className="hover:underline">Open the Maintenance Monitor to triage them — {open.filter((w) => w.stage === "reported").length} are already queued, {open.filter((w) => w.stage === "in_repair").length} are in repair.</Link>
            </motion.div>
          </div>
        </div>
      </DashCard>
      <div className="grid grid-cols-3 gap-[25px]">
        {cards.map((c, i) => {
          const cp = HEALTH_COPY[c.k];
          return (
            <Sub key={c.k} i={i} className="px-6 py-6">
              <div className="flex items-center"><span className={cn("size-3 rounded-full mr-2.5", cp.tone)} /><span className={cn("text-[20px] font-medium", cp.text)}>{c.k}</span><span className="ml-auto t-b2 text-ink-2">{pct(c.k)}% of portfolio</span></div>
              <p className="mt-2 flex items-baseline gap-3"><span className="text-[40px] font-bold leading-none tnum"><CountUp value={c.items.length} /></span><span className="t-b2 text-ink-2">assets</span></p>
              <Link href={`/assets?condition=${c.k}`} className={cn("group inline-flex items-center gap-1.5 rounded-full px-3 h-[26px] text-[12px] mt-3", cp.soft, cp.text)}>
                <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />{cp.action}
              </Link>
              <div className="flex justify-between t-b3 text-ink-2 mt-4"><span>{c.progressLabel}</span><span className="text-ink font-medium tnum">{Math.round(c.progress * 100)}%</span></div>
              <div className={cn("h-2 rounded-full mt-1.5 overflow-hidden", cp.soft)}>
                <motion.div className={cn("h-full rounded-full", cp.tone)} initial={{ width: 0 }} animate={{ width: `${Math.min(1, c.progress) * 100}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 + i * 0.1 }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pb-3 border-b border-line">
                {c.stats.map(([l, v]) => <div key={l}><p className="t-b3 text-ink-2">{l}</p><p className="t-b1 tnum">{v}</p></div>)}
              </div>
              {c.list.map(({ a, sub, tone }) => (
                <Link key={a.id} href={`/assets?asset=${a.id}`} className="flex items-center gap-3 py-2.5 rounded-md hover:bg-tint -mx-1 px-1 transition-colors">
                  <Thumb src={a.photo} category={a.category} size={28} />
                  <span><span className="block t-b2">{a.name}</span><span className={cn("block t-b3", tone)}>{sub}</span></span>
                </Link>
              ))}
            </Sub>
          );
        })}
      </div>
    </div>
  );
}

/* ── Attention Monitor ────────────────────────────────────────── */
const ATTN_DESC: Record<string, string> = {
  Damaged: "Reported broken or unsafe. Each needs a Resolve Issue decision: repair, transfer or dispose.",
  Maintenance: "awaiting triage and in active repair. Tracked on the Maintenance Monitor.",
  Standby: "Serviceable but idle. Candidates for reassignment before new purchases are approved.",
  "In Use": "Deployed and healthy. No action required.",
};

export function AttentionDrill({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const counts = byKey(state.assets, (a) => a.operational);
  const total = state.assets.length;
  const need = total - (counts["In Use"] ?? 0);
  const open = openOrders(state);
  const tri = open.filter((w) => w.stage === "reported").length;
  const damaged = state.assets.filter((a) => a.operational === "Damaged");
  const atRisk = damaged.reduce((s, a) => s + a.cost, 0);
  const recent = [...damaged].sort((a, b) => (b.lastAudit ?? "").localeCompare(a.lastAudit ?? "")).sort((a, b) => Number(!!b.photo) - Number(!!a.photo)).slice(0, 6);
  return (
    <div className="flex flex-col gap-6">
      <DashCard id="attention" icon={TriangleAlert} title="Attention Monitor" onToggle={onClose} expanded>
        <div className="px-8 pt-8 pb-8">
          <p className="flex items-baseline gap-3"><span className="text-[56px] font-bold leading-none tnum"><CountUp value={need} /></span><span className="text-[20px] text-ink-2">of {total} assets need attention — {Math.round((need / total) * 100)}% of the portfolio</span></p>
          <div className="mt-7 mb-6"><Stacked height={18} hover={hover} onHover={setHover} parts={ATTENTION.map((a) => ({ key: a.key, value: counts[a.key] ?? 0, color: a.color }))} /></div>
          <div className="grid grid-cols-2 gap-x-14 gap-y-4">
            {ATTENTION.map((a, i) => (
              <motion.button key={a.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={stagger(i, 0.05, 0.3)}
                onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/assets?status=${a.key}`)}
                className={cn("text-left flex gap-3.5 rounded-lg p-2 -m-2 cursor-pointer transition-[opacity,background-color] duration-[120ms]", hover && hover !== a.key && "opacity-45", hover === a.key && "bg-tint")}>
                <span className="size-3.5 rounded-full mt-1.5 shrink-0" style={{ background: a.color }} />
                <span><span className="text-[20px] font-medium">{a.key}</span> <span className="t-b2 text-ink-2 ml-1.5 tnum">{counts[a.key] ?? 0} • {Math.round(((counts[a.key] ?? 0) / total) * 100)}%</span>
                  <span className="block t-b2 text-ink-2 leading-snug">{a.key === "Maintenance" ? `${tri} ${ATTN_DESC[a.key].replace("awaiting triage and", `awaiting triage and ${open.length - tri} in`).replace(" in in", " in")}` : ATTN_DESC[a.key]}</span></span>
              </motion.button>
            ))}
          </div>
          <Link href="/maintenance" className="group inline-flex items-center gap-1.5 t-b2 text-brand-600 mt-6 hover:text-brand-700">Open Maintenance Monitor <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" /></Link>
        </div>
      </DashCard>
      <Sub i={0} className="grid grid-cols-[380px_1fr] gap-8 p-6">
        <div>
          <div className="flex items-center"><span className="size-3 rounded-full bg-bad-chart mr-2.5" /><span className="text-[20px] font-medium text-bad-text">Damaged</span><span className="ml-auto rounded-full bg-bad-soft/60 text-bad-text text-[13px] px-2.5 h-[26px] grid place-items-center">Highest priority</span></div>
          <p className="mt-2 flex items-baseline gap-3"><span className="text-[40px] font-bold leading-none tnum"><CountUp value={damaged.length} /></span><span className="t-b1 text-ink-2">assets • {Math.round((damaged.length / total) * 100)}% of portfolio</span></p>
          <p className="t-b2 text-ink-2 mt-2"><span className="text-bad-text">▲ 4</span> since Feb 14 • trending the wrong way</p>
          <div className="h-2 rounded-full bg-bad-soft/60 mt-3 overflow-hidden"><motion.div className="h-full bg-bad-chart rounded-full" initial={{ width: 0 }} animate={{ width: `${(damaged.length / total) * 100}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 }} /></div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div><p className="t-b3 text-ink-2">Value at risk</p><p className="t-b1 tnum">{php(atRisk)}</p></div>
            <div><p className="t-b3 text-ink-2">Reported this quarter</p><p className="t-b1 tnum">12</p></div>
            <div><p className="t-b3 text-ink-2">Awaiting decision</p><p className="t-b1 tnum">{damaged.filter((a) => !state.workOrders.some((w) => w.assetId === a.id && w.stage !== "resolved")).length}</p></div>
          </div>
          <p className="t-b1 text-ink-2 mt-4">Each damaged asset needs a Resolve Issue decision: repair, transfer, or dispose.</p>
          <Link href="/maintenance" className="group inline-flex items-center gap-1.5 t-b1 text-bad-text mt-2 hover:underline">Open Resolve Issue queue <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" /></Link>
        </div>
        <div>
          <div className="flex t-b1 text-ink-2 uppercase tracking-wide text-[15px] mb-1"><span>Most recently reported</span><span className="ml-auto">Value</span></div>
          {recent.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i, 0.04, 0.4)}>
              <Link href={`/assets?asset=${a.id}`} className="flex items-center gap-3 py-2.5 border-b border-line hover:bg-tint rounded-md px-1 -mx-1 transition-colors">
                <Thumb src={a.photo} category={a.category} size={40} />
                <span className="min-w-0"><span className="block t-b1 leading-tight">{a.name}</span><span className="block t-b2 text-ink-2">{a.serial} • {a.category} • {shortDate(a.lastAudit ?? AS_OF)}</span></span>
                <span className="ml-auto t-b1 tnum">{php(a.cost)}</span>
              </Link>
            </motion.div>
          ))}
          <Link href="/assets?status=Damaged" className="group inline-flex items-center gap-1.5 t-b2 text-bad-text mt-3 hover:underline">View all {damaged.length} damaged assets <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" /></Link>
        </div>
      </Sub>
    </div>
  );
}

/* ── Warranty Protection Coverage ─────────────────────────────── */
export function WarrantyDrill({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const w = warrantyByYear(state.assets);
  const [year, setYear] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const cols = useColumns("warranty", [{ w: 220, min: 170 }, { w: 165, min: 150 }, { w: 150 }, { w: 150 }, { w: 120 }, { w: "fr" }, { w: 80, min: 72 }]);
  const rows = useMemo(() => state.assets
    .filter((a) => !year || a.warrantyEnd.startsWith(String(year)))
    .filter((a) => !q || `${a.name} ${a.serial} ${a.tag}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.name === "ASUS TUF 16" ? -1 : b.name === "ASUS TUF 16" ? 1 : a.name === "Adobe PS" ? -1 : b.name === "Adobe PS" ? 1 : a.warrantyEnd.localeCompare(b.warrantyEnd))),
  [state.assets, year, q]);
  const per = 10, pages = Math.max(1, Math.ceil(rows.length / per));
  const shown = rows.slice((page - 1) * per, page * per);
  const yrs = (a: typeof rows[number]) => Math.max(1, Math.round((new Date(a.warrantyEnd).getTime() - new Date(a.warrantyStart).getTime()) / 3.156e10));
  return (
    <div className="flex flex-col gap-6">
      <DashCard id="warranty" icon={Shield} title="Warranty Protection Coverage" onToggle={onClose} expanded>
        <div className="px-8 pt-6 pb-7">
          <div className="flex items-baseline gap-3"><span className="text-[40px] font-bold tnum"><CountUp value={w.covered} /></span><span className="text-[20px] text-ink-2">of {state.assets.length} assets under warranty • {w.expired} expired</span><span className="ml-auto t-b2 text-ink-2">{year ? <button className="text-brand-600 hover:underline cursor-pointer" onClick={() => setYear(null)}>Showing {year} · clear</button> : "Warranties expiring by year — click a bar to filter"}</span></div>
          <div className="mt-6"><Columns bars={w.bars} highlight={2026} height={280} showYears barW={56} picked={year} onPick={(y) => { setYear(y); setPage(1); }} /></div>
          <p className="flex items-center gap-2 t-b2 text-ink-2 mt-5"><span className="size-2 rounded-full bg-brand-500" />{w.bars[0].n} warranties lapse in 2026. Renewal requests should reach Procurement before Q4 to avoid uncovered repairs.</p>
        </div>
      </DashCard>
      <Sub i={0} className="px-6 py-7">
        <h3 className="t-h3">Warranty Breakdown</h3>
        <p className="t-b1 text-ink-2 mt-1">Last Updated: March 14, 2026</p>
        <div className="flex items-center gap-6 mt-6">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by asset name, serial, or tag" className="w-[440px]" />
          <div className="ml-auto"><Pager page={page} pages={pages} onPage={setPage} /></div>
        </div>
        <TableScroll>
        <ResizableHeader cols={cols} className="h-14 mt-3 dash-b px-4">
          <Th icon={F.name}>Asset Name</Th><Th icon={F.type}>Type</Th><Th icon={F.date}>Start Date</Th><Th icon={F.date}>End Date</Th><Th icon={F.duration}>Duration</Th><Th icon={F.link}>Claim Procedure</Th><span />
        </ResizableHeader>
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((a, i) => {
            const active = warrantyActive(a);
            return (
              <motion.div key={a.id} {...rowMotion(i)} style={cols.style} className="grid items-center h-[60px] border-b border-line px-4 hover:bg-tint transition-colors">
                <span className="flex items-center gap-3 t-b1 min-w-0 pr-2"><Thumb src={a.photo} category={a.category} size={28} /><span className="truncate">{a.name}</span></span>
                <span><CategoryChip category={a.category} /></span>
                <span className="t-b1 text-ink-2">{shortDate(a.warrantyStart)}</span>
                <span className={cn("t-b1", active ? (a.warrantyEnd.startsWith("2026") ? "text-date-due" : "text-ink-2") : "text-date-over")}>{shortDate(a.warrantyEnd)}</span>
                <span className="t-b1 font-semibold">{yrs(a)} Years</span>
                <a href={`https://${a.warrantyUrl ?? "dost.gov.ph/procurement"}`} target="_blank" rel="noreferrer" className="t-b1 text-brand-600 underline underline-offset-2 truncate pr-4">{a.warrantyUrl ?? "dost.gov.ph/procurement"}</a>
                <span className={cn("t-b1", active ? "text-good-text" : "text-bad-text")}>{active ? "Active" : "Expired"}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        </TableScroll>
        <p className="t-b2 text-ink-2 mt-4">Showing {shown.length} of {rows.length}{year ? ` lapsing in ${year}` : ""}</p>
      </Sub>
    </div>
  );
}
