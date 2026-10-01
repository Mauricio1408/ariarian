"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { Activity, ArrowRight, Package, Shield, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF } from "@/lib/types";
import type { PhysicalCondition } from "@/lib/types";
import { byKey, overview, warrantyByYear, openOrders } from "@/lib/selectors";
import { longDate, monthDay, phpShort } from "@/lib/format";
import { CountUp, Sparkbars } from "@/components/ui/primitives";
import { T } from "@/components/ui/motion";
import { BarRows, Columns, Donut, Stacked } from "./charts";
import { ATTENTION, DashCard, HEALTH_COLOR, useAgencyRows, type View } from "./shared";
import { AgencyDrill, AttentionDrill, HealthDrill, WarrantyDrill } from "./drilldowns";

const VIEWS: View[] = ["split", "health", "attention", "warranty"];


export function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("view") as View | null;
  const view = raw && VIEWS.includes(raw) ? raw : null;
  const go = (v: View | null) => router.push(v ? `/?view=${v}` : "/", { scroll: false });

  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout" initial={false}>
        {view ? (
          <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            {view === "split" && <AgencyDrill onClose={() => go(null)} />}
            {view === "health" && <HealthDrill onClose={() => go(null)} />}
            {view === "attention" && <AttentionDrill onClose={() => go(null)} />}
            {view === "warranty" && <WarrantyDrill onClose={() => go(null)} />}
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <Grid onOpen={go} />
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

/* ── Grid ─────────────────────────────────────────────────────── */
function Grid({ onOpen }: { onOpen: (v: View) => void }) {
  const { state } = useStore();
  const o = overview(state);
  const router = useRouter();

  return (
    <div>
      <motion.div className="mb-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={T.page}>
        <h1 className="t-h1"><CountUp value={o.needsTriage} /> assets need triage today</h1>
        <p className="t-b2 text-ink-2 mt-3">
          <Link href="/maintenance" className="hover:text-ink hover:underline underline-offset-2">{o.overdue} work orders are past their promised date.</Link>{" "}
          <Link href="/?view=warranty" scroll={false} className="hover:text-ink hover:underline underline-offset-2">{o.lapsingThisYear} warranties lapse this year.</Link>
        </p>
      </motion.div>

      {/* Portfolio overview */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.page, delay: 0.05 }}
        className="card-raised flex items-stretch px-4 py-5 mb-6 border border-line/60">
        <div className="w-[300px] max-[1380px]:w-[220px] shrink flex flex-col justify-between py-2 pl-2">
          <h2 className="t-h3">Portfolio Overview</h2>
          <p className="t-b1 text-ink-2">{longDate(AS_OF)}</p>
        </div>
        <Kpi label="Needs Triage" dot="bg-warn-text" value={<CountUp value={o.needsTriage} />} delta={`▲ ${o.triageThisWeek} this week`} tone="warn" spark="amber" onClick={() => router.push("/maintenance")} />
        <Kpi label="Total Value" dot="bg-good-text" value={<CountUp value={o.total} format={phpShort} />} delta={`▲ ${phpShort(o.addedThisQuarter)} this qtr`} tone="good" spark="good" onClick={() => router.push("/financial-reports")} />
        <Kpi label="Critical Needs" dot="bg-bad-text" value={<CountUp value={o.critical} />} delta={`▲ ${o.criticalSinceFeb} since Feb 14`} tone="bad" spark="bad" last onClick={() => onOpen("health")} />
      </motion.section>

      <div className="grid grid-cols-2 gap-[25px]">
        <AgencyCard onOpen={() => onOpen("split")} />
        <HealthCard onOpen={() => onOpen("health")} />
        <AttentionCard onOpen={() => onOpen("attention")} />
        <WarrantyCard onOpen={() => onOpen("warranty")} />
      </div>
    </div>
  );
}

function Kpi({ label, dot, value, delta, tone, spark, last, onClick }: {
  label: string; dot: string; value: React.ReactNode; delta: string; tone: "warn" | "good" | "bad"; spark: "amber" | "good" | "bad"; last?: boolean; onClick: () => void;
}) {
  const pill = { warn: "bg-warn-soft text-warn-text", good: "bg-good-soft text-good-text", bad: "bg-bad-soft/80 text-bad-text" }[tone];
  return (
    <button onClick={onClick} className={cn("group flex-1 min-w-0 flex items-start gap-3 px-8 max-[1380px]:px-5 py-2 text-left cursor-pointer rounded-lg transition-colors duration-[120ms] hover:bg-tint", !last && "border-r border-line")}>
      <div className="flex-1">
        <p className="flex items-center gap-2 t-b2 text-ink-2 whitespace-nowrap"><span className={cn("size-2 rounded-full shrink-0", dot)} />{label}</p>
        <p className="text-[32px] font-bold tracking-[-0.02em] leading-[1.15] mt-1">{value}</p>
        <span className={cn("inline-flex items-center rounded-full px-2.5 h-[22px] text-[12px] mt-1 whitespace-nowrap", pill)}>{delta}</span>
      </div>
      <div className="pt-6 transition-transform duration-200 group-hover:-translate-y-0.5"><Sparkbars tone={spark} /></div>
    </button>
  );
}

/* ── Agency Inventory Split ───────────────────────────────────── */
function AgencyCard({ onOpen }: { onOpen: () => void }) {
  const { rows, total } = useAgencyRows();
  const router = useRouter();
  const top = rows.slice(0, 6), rest = rows.slice(6);
  const others = rest.reduce((s, [, n]) => s + n, 0);
  const bars = [
    ...top.map(([k, n]) => ({ key: k, label: k, value: n, onClick: () => router.push(`/assets?agency=${k}`) })),
    { key: "others", label: `Others (${rest.length})`, value: others, muted: true },
  ];
  return (
    <DashCard id="split" icon={Package} title="Agency Inventory Split" onToggle={onOpen} className="h-[350px]" delay={0.1}>
      <div className="px-6 pt-2">
        <div className="flex justify-between t-b2 text-ink-2 mb-2"><span>{total} assets across {rows.length} agencies</span><span>As of {monthDay(AS_OF)}, 2026</span></div>
        <BarRows rows={bars} max={Math.max(...bars.map((b) => b.value))} gap="gap-[7px]" labelW={76} />
        <p className="flex items-center gap-2 t-b3 text-ink-2 mt-5">
          <span className="size-2 rounded-full bg-brand-500" />DOST — home agency • Others: {rest.map(([k, n]) => `${k} ${n}`).join(", ")}
        </p>
      </div>
    </DashCard>
  );
}

/* ── Asset Health Status ──────────────────────────────────────── */
function HealthCard({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const counts = byKey(state.assets, (a) => a.condition);
  const total = state.assets.length;
  const order: PhysicalCondition[] = ["Excellent", "Fair", "Poor"];
  const h = hover as PhysicalCondition | null;
  return (
    <DashCard id="health" icon={Activity} title="Asset Health Status" onToggle={onOpen} className="h-[350px]" delay={0.16}>
      <div className="flex items-center gap-6 px-6 pt-1">
        <Donut size={226} stroke={26} hover={hover} onHover={setHover}
          slices={order.map((k) => ({ key: k, label: k, value: counts[k] ?? 0, color: HEALTH_COLOR[k], onClick: () => router.push(`/assets?condition=${k}`) }))}
          center={
            <AnimatePresence mode="wait">
              <motion.div key={h ?? "all"} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={T.hover}>
                <p className="text-[40px] font-bold leading-none tnum">{h ? counts[h] ?? 0 : <CountUp value={total} />}</p>
                <p className="text-[18px] text-ink-2 mt-1">{h ? h.toLowerCase() : "assets"}</p>
              </motion.div>
            </AnimatePresence>
          } />
        <div className="flex-1">
          {order.map((k) => (
            <button key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/assets?condition=${k}`)}
              className={cn("w-full grid grid-cols-[1fr_40px_52px] items-center h-[33px] rounded-md px-1 -mx-1 cursor-pointer transition-[opacity,background-color] duration-[120ms]", hover && hover !== k && "opacity-45", hover === k && "bg-tint")}>
              <span className="flex items-center gap-2.5 t-b2 text-left"><span className="size-2.5 rounded-full" style={{ background: HEALTH_COLOR[k] }} />{k}</span>
              <span className="t-b2 text-right tnum"><CountUp value={counts[k] ?? 0} /></span>
              <span className="t-b2 text-ink-2 text-right tnum">{(((counts[k] ?? 0) / total) * 100).toFixed(1).replace(".0", "")}%</span>
            </button>
          ))}
          <motion.button onClick={onOpen} whileHover={{ y: -1 }} transition={T.hover}
            className="mt-3 w-full text-left rounded-lg bg-bad-soft/45 px-3 py-2.5 t-l1 text-bad-text leading-[1.45] cursor-pointer">
            {Math.round(((counts.Poor ?? 0) / total) * 100) >= 50 ? "Half the portfolio is" : `${Math.round(((counts.Poor ?? 0) / total) * 100)}% of the portfolio is`} in poor condition — {counts.Poor ?? 0} assets flagged as critical needs.
          </motion.button>
        </div>
      </div>
    </DashCard>
  );
}

/* ── Attention Monitor ────────────────────────────────────────── */
function AttentionCard({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const counts = byKey(state.assets, (a) => a.operational);
  const total = state.assets.length;
  const need = total - (counts["In Use"] ?? 0);
  const open = openOrders(state);
  const tri = open.filter((w) => w.stage === "reported").length, rep = open.length - tri;
  return (
    <DashCard id="attention" icon={TriangleAlert} title="Attention Monitor" onToggle={onOpen} className="h-[350px]" delay={0.22}>
      <div className="px-6">
        <p className="flex items-baseline gap-3"><span className="text-[32px] font-bold tnum"><CountUp value={need} /></span><span className="t-b2 text-ink-2">of {total} assets need attention</span></p>
        <div className="mt-2 mb-4"><Stacked hover={hover} onHover={setHover} parts={ATTENTION.map((a) => ({ key: a.key, value: counts[a.key] ?? 0, color: a.color }))} /></div>
        {ATTENTION.map((a) => (
          <button key={a.key} onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/assets?status=${a.key}`)}
            className={cn("w-full grid grid-cols-[134px_1fr_40px_44px] items-center h-[29px] rounded-md px-1 -mx-1 cursor-pointer transition-[opacity,background-color] duration-[120ms]", hover && hover !== a.key && "opacity-45", hover === a.key && "bg-tint")}>
            <span className="flex items-center gap-2.5 t-b2s text-left"><span className="size-2.5 rounded-full" style={{ background: a.color }} />{a.key}</span>
            <span className="t-b3 text-ink-2 text-left">{a.key === "Maintenance" ? `Triage ${tri} • In repair ${rep}` : a.desc}</span>
            <span className="t-b2 text-right tnum"><CountUp value={counts[a.key] ?? 0} /></span>
            <span className="t-b3 text-ink-2 text-right tnum">{Math.round(((counts[a.key] ?? 0) / total) * 100)}%</span>
          </button>
        ))}
        <Link href="/maintenance" className="group inline-flex items-center gap-1.5 t-l1 text-brand-600 mt-3 hover:text-brand-700">
          View maintenance queue <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </DashCard>
  );
}

/* ── Warranty Protection Coverage ─────────────────────────────── */
function WarrantyCard({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore();
  const w = warrantyByYear(state.assets);
  return (
    <DashCard id="warranty" icon={Shield} title="Warranty Protection Coverage" onToggle={onOpen} className="h-[350px]" delay={0.28}>
      <div className="px-6">
        <div className="flex items-baseline gap-3"><span className="text-[32px] font-bold tnum"><CountUp value={w.covered} /></span><span className="t-b2 text-ink-2">of {state.assets.length} under warranty • {w.expired} expired</span><span className="ml-auto t-b3 text-ink-2">Expiring by year</span></div>
        <div className="mt-3"><Columns bars={w.bars} highlight={2026} height={150} showYears barW={40} /></div>
      </div>
    </DashCard>
  );
}

