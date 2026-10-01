"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Box, Calendar, ChevronDown, Coins, Plus, Shield, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY } from "@/lib/types";
import { OFFICES } from "@/lib/seed";
import { accumulated, bookValue, finance, valueSeries } from "@/lib/selectors";
import { php, phpShort, shortDate } from "@/lib/format";
import { Page, PageTitle } from "@/components/shell/topbar";
import { PermissionDenied } from "@/components/shell/permission-denied";
import { CountUp } from "@/components/ui/primitives";
import { KpiCard } from "@/components/ui/kpi";
import { CalendarPopup, CategoryPopup, DepartmentPopup, OptionPopup } from "@/components/ui/popups";
import { ExportButton } from "@/components/ui/table";
import { useExport } from "@/lib/use-export";
import type { AssetCategory } from "@/lib/types";
import { AS_OF } from "@/lib/types";
import { EASE, T, stagger } from "@/components/ui/motion";
import { LineChart } from "@/components/dashboard/charts";

type Range = "1Y" | "3Y" | "5Y" | "All";

export default function FinancialReportsPage() {
  const { state } = useStore();
  return (
    <Page crumb="Financial Reports" icon={state.role === "custodian" ? Box : Coins}>
      {state.role === "custodian" ? <div className="min-h-[calc(100vh-200px)] grid place-items-center"><PermissionDenied what="Financial Reports" /></div> : <Reports />}
    </Page>
  );
}

function Reports() {
  const { state } = useStore();
  const doExport = useExport();
  const [cat, setCat] = useState("All");
  const [office, setOffice] = useState("All");
  const [dept, setDept] = useState("All");
  const [since, setSince] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("5Y");
  const [extra, setExtra] = useState(false);
  const [condition, setCondition] = useState("All");

  const assets = useMemo(() => state.assets.filter((a) =>
    (cat === "All" || a.category === cat) && (office === "All" || a.office === office) && (dept === "All" || a.department === dept) &&
    (!since || a.acquiredOn >= since) && (condition === "All" || a.condition === condition)), [state.assets, cat, office, dept, since, condition]);
  const f = finance(assets);
  const ytd = state.workOrders.filter((w) => w.closedOn?.startsWith("2026") && assets.some((a) => a.id === w.assetId)).reduce((s, w) => s + (w.cost ?? 0), 0);
  const tco = f.total * 1.04 + ytd;
  const quarter = assets.filter((a) => a.acquiredOn >= "2026-01-01").reduce((s, a) => s + a.cost, 0);
  const years = range === "1Y" ? [2025, 2026] : range === "3Y" ? [2023, 2024, 2025, 2026] : range === "5Y" ? [2021, 2022, 2023, 2024, 2025, 2026] : [2016, 2018, 2020, 2022, 2024, 2026];
  const series = valueSeries(assets, years);
  const filtered = cat !== "All" || office !== "All" || since !== null || dept !== "All" || condition !== "All";

  const byCat = ASSET_CATEGORY.map((c) => [c, assets.filter((a) => a.category === c).reduce((s, a) => s + a.cost, 0)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const byOffice = OFFICES.map((o) => [o, assets.filter((a) => a.office === o).reduce((s, a) => s + a.cost, 0)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const vkey = `${cat}-${office}-${dept}-${since}-${condition}`;

  return (
    <>
      <PageTitle title="Financial Reports" sub="Asset Valuation, Lifecycle Budgeting, and Investment Analysis." />
      <div className="flex items-center gap-3 -mt-2 mb-5">
        <Chip icon={Box} label="Category" value={cat} open={menu === "cat"} onToggle={() => setMenu(menu === "cat" ? null : "cat")}>
          <CategoryPopup withAll open={menu === "cat"} onClose={() => setMenu(null)} value={cat as AssetCategory | "All"} onPick={setCat} />
        </Chip>
        <Chip icon={Shield} label="Department" value={dept === "All" ? "All" : dept.replace(/ \(.*\)$/, "")} open={menu === "dept"} onToggle={() => setMenu(menu === "dept" ? null : "dept")}>
          <DepartmentPopup withAll open={menu === "dept"} onClose={() => setMenu(null)} value={dept} onPick={setDept} />
        </Chip>
        <Chip icon={Calendar} label="Acquired" value={since ? `Since ${shortDate(since)}` : "Any date"} open={menu === "acq"} onToggle={() => setMenu(menu === "acq" ? null : "acq")}>
          <CalendarPopup open={menu === "acq"} onClose={() => setMenu(null)} value={since ?? "2026-01-01"} max={AS_OF} onDone={setSince} />
        </Chip>
        {office !== "All" && (
          <button onClick={() => setOffice("All")} className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-brand-400 bg-brand-50 text-[14px] cursor-pointer">
            <span className="text-ink-2">Office</span><span className="font-medium">{office}</span><X size={14} />
          </button>
        )}
        <AnimatePresence initial={false}>
          {extra && (
            <motion.div initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: "auto" }} exit={{ opacity: 0, scale: 0.9, width: 0 }} transition={T.state}>
              <Chip icon={Box} label="Condition" value={condition} open={menu === "cond"} onToggle={() => setMenu(menu === "cond" ? null : "cond")}>
                <OptionPopup open={menu === "cond"} onClose={() => setMenu(null)} options={["All", "Excellent", "Fair", "Poor"] as const} value={condition as "All"} onPick={setCondition} width={180} />
              </Chip>
            </motion.div>
          )}
        </AnimatePresence>
        {!extra && <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setExtra(true); setMenu("cond"); }} className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-dashed border-ink-3 text-[14px] hover:bg-white cursor-pointer"><Plus size={14} />Add filter</motion.button>}
        <span className="ml-auto t-b2 text-ink-3 tnum">{assets.length} assets • {php(f.total)}</span>
        <button onClick={() => { setCat("All"); setOffice("All"); setSince(null); setDept("All"); setCondition("All"); setExtra(false); }} disabled={!filtered}
          className="flex items-center gap-1 t-b2 text-brand-600 disabled:text-ink-3 cursor-pointer disabled:cursor-default ml-4">Reset <X size={15} /></button>
        <div className="ml-3"><ExportButton onPick={(fmt) => doExport("financial-report", ["Property No.", "Asset", "Category", "Department", "Office", "Acquired", "Cost", "Accumulated", "Book value"],
          assets.map((a) => [a.id, a.name, a.category, a.department, a.office, a.acquiredOn, a.cost, Math.round(accumulated(a)), Math.round(bookValue(a))]), fmt)} /></div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <KpiCard i={0} label="Acquisition Cost" tone="brand" value={<CountUp value={f.total} format={phpShort} />} delta={<>▲ {phpShort(quarter)} this quarter</>} />
        <KpiCard i={1} label="Book Value" tone="good" value={<CountUp value={f.book} format={phpShort} />} delta={`${Math.round((f.book / (f.total || 1)) * 100)}% of acquisition cost`} />
        <KpiCard i={2} label="TCO (Ownership)" tone="warn" value={<CountUp value={tco} format={phpShort} />} delta={`incl. ${php(ytd)} repairs YTD`} />
        <KpiCard i={3} label="Monthly Depreciation" tone="bad" value={<CountUp value={f.monthly} format={phpShort} />} delta={`${php(f.accumulated)} to date`} />
      </div>

      <div className="grid grid-cols-[715px_1fr] gap-5 mt-5">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0, 0, 0.15)} className="card-raised px-5 pt-5 pb-4">
          <div className="flex items-start">
            <div><h2 className="text-[20px] font-medium leading-none">Portfolio Value Over Time</h2><p className="t-b2 text-ink-2">Cumulative acquisition cost vs. net book value, {years[0]}–2026</p></div>
            <div className="ml-auto flex gap-1.5">
              {(["1Y", "3Y", "5Y", "All"] as Range[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={cn("relative h-[30px] w-[38px] rounded-md text-[12px] cursor-pointer", range === r ? "text-white" : "bg-tint text-ink-2 hover:bg-line")}>
                  {range === r && <motion.span layoutId="range" transition={T.spring} className="absolute inset-0 rounded-md bg-brand-500" />}<span className="relative">{r}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-5 t-b3 text-ink-2 mt-4 mb-2"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-brand-700" />Acquisition cost</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-good-text" />Net book value</span></div>
          <LineChart key={`${range}-${vkey}`} years={years} format={phpShort} colors={["var(--color-brand-700)", "var(--color-good-text)"]}
            series={[{ key: "cost", label: "Acquisition", values: series.map((s) => s.cost) }, { key: "book", label: "Book value", values: series.map((s) => s.book) }]} />
        </motion.section>
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(1, 0.06, 0.15)} className="card-raised px-5 pt-5 pb-5">
          <h2 className="text-[20px] font-medium">Depreciation</h2>
          <p className="t-b2 text-ink-2 mt-1">Straight-line, applied monthly</p>
          <dl className="mt-4 space-y-3.5 t-b2">
            {[["Method", "Straight-line"], ["Useful life", "10 years"], ["Monthly depreciation", php(f.monthly)], ["Accumulated to date", php(f.accumulated)], ["Average asset age", `${f.avgAge.toFixed(1)} years`], ["Fully depreciated", `${f.fully} assets`]].map(([k, v]) => (
              <div key={k} className="flex"><dt className="text-ink-2">{k}</dt><dd className="ml-auto tnum"><motion.span key={`${vkey}${v}`} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }}>{v}</motion.span></dd></div>
            ))}
          </dl>
          <div className="flex t-b3 text-ink-2 mt-7"><span>Portfolio depreciated</span><span className="ml-auto text-ink tnum">{Math.round(f.pctDepreciated * 100)}%</span></div>
          <div className="h-2 rounded-full bg-brand-100 mt-2 overflow-hidden"><motion.div className="h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${f.pctDepreciated * 100}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }} /></div>
        </motion.section>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-5">
        <ValueBars i={2} title="Value by Category" sub={`Acquisition cost across ${assets.length} assets`} rows={byCat} onPick={(c) => setCat(cat === c ? "All" : c)} active={cat} />
        <ValueBars i={3} title="Value by Office" sub="Where the portfolio is held" rows={byOffice} onPick={(o) => setOffice(office === o ? "All" : o)} active={office} total={f.total} />
      </div>
    </>
  );
}

function Chip({ icon: I, label, value, open, onToggle, children }: { icon: LucideIcon; label: string; value: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const on = value !== "All" && value !== "Any date";
  return (
    <div className="relative">
      <button onClick={onToggle}
        className={cn("flex items-center gap-2 h-10 px-3.5 rounded-xl border bg-white text-[14px] cursor-pointer transition-colors whitespace-nowrap", on ? "border-brand-400 bg-brand-50" : "border-line hover:border-ink-3")}>
        <I size={15} strokeWidth={1.75} /><span className="text-ink-2">{label}</span><span className="font-medium max-w-[220px] truncate">{value}</span>
        <ChevronDown size={13} className={cn("text-ink-2 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {children}
    </div>
  );
}

function ValueBars({ title, sub, rows, i, onPick, active, total }: { title: string; sub: string; rows: readonly (readonly [string, number])[]; i: number; onPick: (k: string) => void; active: string; total?: number }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(i, 0.06, 0.15)} className="card-raised px-5 pt-5 pb-4">
      <h2 className="text-[20px] font-medium leading-none">{title}</h2>
      <p className="t-b2 text-ink-2">{sub}</p>
      <div className="mt-4 space-y-1">
        {rows.length === 0 && <p className="t-b2 text-ink-2 py-6">No assets in this filter.</p>}
        {rows.map(([k, v], j) => (
          <button key={k} onClick={() => onPick(k)}
            className={cn("w-full grid grid-cols-[150px_1fr_110px] items-center gap-4 h-8 rounded-md px-1.5 -mx-1.5 cursor-pointer transition-colors", active === k ? "bg-brand-50" : "hover:bg-tint")}>
            <span className="t-b2 text-left truncate">{k}</span>
            <span className="h-2.5 rounded-full bg-brand-100 overflow-hidden"><motion.span className="block h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 + j * 0.05 }} /></span>
            <span className="t-b2 text-right tnum"><CountUp value={v} format={php} /></span>
          </button>
        ))}
      </div>
      {total !== undefined && <div className="flex t-b2 border-t border-line mt-3 pt-3"><span className="text-ink-2">Total</span><span className="ml-auto tnum">{php(total)}</span></div>}
    </motion.section>
  );
}
