"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PRIORITY, PROBLEM_TYPE } from "@/lib/types";
import type { Priority, ProblemType, WorkOrder } from "@/lib/types";
import { OFFICES } from "@/lib/seed";
import { daysOpen, isOverdue, openOrders } from "@/lib/selectors";
import { deadline, DATE_TIER_CLASS, php } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import type { ExportFormat } from "@/lib/export";
import { Page } from "@/components/shell/topbar";
import { Button, CountUp, IconButton, Thumb } from "@/components/ui/primitives";
import { MenuItem, Popover } from "@/components/ui/overlay";
import { ExportButton, FilterChips, SearchBox, rowMotion, type FilterValue } from "@/components/ui/table";
import { ChoiceButton, RecordCard, RecordHeading, RecordPagination, RecordSearch } from "@/components/ui/record-kit";
import { T } from "@/components/ui/motion";
import { OP_TONE, StatusPill } from "@/components/assets/record";
import { ProblemChip } from "@/components/maintenance/problem-chip";
import { ResolveModal } from "@/components/maintenance/resolve-modal";
import { WorkOrderModal } from "@/components/maintenance/work-order-modal";
import { Board } from "@/components/maintenance/board";

const PER = 10;
// Problem · Technician · Stage · Promised · Action — the record-table widths of the new list look.
const COLS = [170, 170, 120, 130, 140] as const;

export default function MaintenancePage() {
  return <Page crumb="Maintenance" icon={Wrench}><Suspense><Maintenance /></Suspense></Page>;
}

function Toggle({ mode, onChange }: { mode: "board" | "list"; onChange: (m: "board" | "list") => void }) {
  return (
    <div className="relative flex h-9 rounded-md border border-line bg-white overflow-hidden">
      {(["board", "list"] as const).map((m) => (
        <button key={m} onClick={() => onChange(m)} className={cn("relative w-[61px] text-[13px] capitalize cursor-pointer", mode === m ? "text-brand-800" : "text-ink hover:bg-tint")}>
          {mode === m && <motion.span layoutId="mode-toggle" transition={T.spring} className="absolute inset-0 bg-brand-100" />}
          <span className="relative">{m}</span>
        </button>
      ))}
    </div>
  );
}

function Maintenance() {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const doExport = useExport();
  const mode = params.get("mode") === "board" ? "board" : "list";
  const resolveId = params.get("resolve");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValue>({});
  const [page, setPage] = useState(1);
  const [woModal, setWoModal] = useState<{ editing: WorkOrder | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.replace(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  const match = (w: WorkOrder) => {
    const a = L.asset.get(w.assetId);
    const needle = q.trim().toLowerCase();
    return (!needle || `${a?.name} ${a?.serial} ${w.technician} ${w.id} ${w.summary}`.toLowerCase().includes(needle)) &&
      (!filters.problem?.length || filters.problem.includes(w.problem)) &&
      (!filters.priority?.length || filters.priority.includes(w.priority)) &&
      (!filters.technician?.length || filters.technician.includes(w.technician)) &&
      (!filters.office?.length || (a && filters.office.includes(a.office)));
  };

  const open = openOrders(state);
  const rows = useMemo(() => {
    // Most urgent first: overdue, then by promised date.
    const r = [...open.filter(match)].sort((a, b) => (a.promisedOn ?? "").localeCompare(b.promisedOn ?? ""));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workOrders, L, q, filters]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * PER, p * PER);
  const ytd = state.workOrders.filter((w) => w.closedOn?.startsWith("2026")).reduce((s, w) => s + (w.cost ?? 0), 0);
  const reported = open.filter((w) => w.stage === "reported");
  const inRepair = open.filter((w) => w.stage === "in_repair");
  const resolvedMar = state.workOrders.filter((w) => w.stage === "resolved" && (w.closedOn ?? "") >= "2026-03-01");
  const avgOpen = inRepair.length ? inRepair.reduce((s, w) => s + daysOpen(w), 0) / inRepair.length : 0;
  const technicians = [...new Set(state.workOrders.map((w) => w.technician))];

  const cancel = (w: WorkOrder) => {
    dispatch({ type: "removeWorkOrder", woId: w.id });
    toast({ title: "Work order cancelled", body: `${L.asset.get(w.assetId)?.name} • ${w.summary}`, action: { label: "Undo", run: () => dispatch({ type: "restoreWorkOrder", wo: w }) } });
  };

  const exportQueue = (fmt: ExportFormat) => doExport("maintenance-queue", ["Work order", "Asset", "Problem", "Summary", "Technician", "Stage", "Promised"], rows.map((w) => [w.id, L.asset.get(w.assetId)?.name ?? "", w.problem, w.summary, w.technician, w.stage, w.promisedOn ?? ""]), fmt);

  // KPI strip shared by both views (Figma 4773:7115).
  const kpis = (
    <section className="card-raised grid grid-cols-5 divide-x divide-line">
      {[
        { l: "Needs Triage", v: <CountUp value={reported.length} />, s: <span className="text-bad-text">▲ {reported.filter((w) => w.reportedOn > "2026-03-07").length} this week</span> },
        { l: "In Repair", v: <CountUp value={inRepair.length} />, s: <span className="text-ink-2">avg. {avgOpen.toFixed(1)} days open</span> },
        { l: "Resolved this month", v: <CountUp value={resolvedMar.length} />, s: <span className="text-good-text">▲ {Math.max(0, resolvedMar.length - 5)} vs Feb</span> },
        { l: "Repair Spend YTD", v: <CountUp value={ytd} format={php} />, s: <span className="text-ink-2">of ₱1.2M budget • {Math.round((ytd / 1_200_000) * 100)}%</span> },
        { l: "Overdue", v: <CountUp value={open.filter(isOverdue).length} />, s: <span className="text-bad-text">past promised date</span> },
      ].map((k, i) => (
        <motion.div key={k.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.page, delay: 0.05 + i * 0.04 }} className="px-4 py-6">
          <p className="t-b3 text-ink-2">{k.l}</p><p className="text-[28px] font-semibold tracking-[-0.01em] leading-tight mt-1">{k.v}</p><p className="t-b3 mt-0.5">{k.s}</p>
        </motion.div>
      ))}
    </section>
  );


  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {mode === "list" ? (
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={T.page}>
            <RecordHeading title="Maintenance Queue" sub="March 14, 2026 · Review issues and monitor ongoing work"
              right={<><Toggle mode={mode} onChange={(m) => setParam("mode", m === "board" ? "board" : null)} /><Button variant="primary" size="rec" onClick={() => setWoModal({ editing: null })}>New work order</Button></>} />
            <div className="mt-6">{kpis}</div>
            <div className="flex items-center gap-3 mt-6">
              <RecordSearch value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by asset, technician, or work order" className="flex-1" />
              <ChoiceButton label="Problem" value={(filters.problem?.[0] as ProblemType) ?? null} options={PROBLEM_TYPE} onPick={(v) => { setFilters((f) => ({ ...f, problem: v ? [v] : [] })); setPage(1); }} />
              <ChoiceButton label="Priority" value={(filters.priority?.[0] as Priority) ?? null} options={PRIORITY} onPick={(v) => { setFilters((f) => ({ ...f, priority: v ? [v] : [] })); setPage(1); }} align="right" />
              <ExportButton record onPick={exportQueue} />
            </div>
            <RecordCard className="mt-6">
              <div className="flex items-center h-[42px] px-4 bg-head text-[12px] leading-[1.4] text-ink-2">
                <span className="flex-1 min-w-0">Asset</span>
                <span style={{ width: COLS[0] }}>Problem</span><span style={{ width: COLS[1] }}>Technician</span>
                <span style={{ width: COLS[2] }}>Stage</span><span style={{ width: COLS[3] }}>Promised</span><span style={{ width: COLS[4] }}>Action</span>
              </div>
              <div className="min-h-[200px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.length === 0 && (
                    <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                      <p className="text-[18px] font-semibold text-deep">{open.length ? "No work orders match" : "Queue is clear"}</p>
                      <p className="t-b2 text-ink-2 mt-1">{open.length ? "Try a different search or filter." : "Every reported issue has been resolved."}</p>
                    </motion.div>
                  )}
                  {shown.map((w, i) => {
                    const a = L.asset.get(w.assetId);
                    if (!a) return null;
                    const d = deadline(w.promisedOn);
                    return (
                      <motion.div key={w.id} {...rowMotion(i)} onClick={() => setParam("resolve", w.id)}
                        className="group flex items-center h-[60px] px-4 border-b border-rule bg-white cursor-pointer transition-colors duration-[120ms] hover:bg-tint">
                        <span className="flex-1 min-w-0 flex items-center gap-2.5 pr-3">
                          <Thumb src={a.photo} category={a.category} size={36} className="rounded-[8px]" />
                          <span className="min-w-0 flex flex-col gap-0.5 leading-[1.4]">
                            <span className="text-[14px] font-medium text-deep truncate">{a.name}</span>
                            <span className="text-[12px] text-ink-2 truncate">{a.serial} · {w.summary}</span>
                          </span>
                        </span>
                        <span style={{ width: COLS[0] }}><ProblemChip p={w.problem} className="h-6 w-auto px-2.5 rounded-full text-[13px] font-medium" /></span>
                        <span style={{ width: COLS[1] }} className="text-[14px] text-n-600 truncate pr-3">{w.technician.replace(" · in-house", "")}</span>
                        <span style={{ width: COLS[2] }}><StatusPill size="sm" tone={w.stage === "in_repair" ? OP_TONE.Maintenance : OP_TONE.Standby}>{w.stage === "in_repair" ? "In repair" : "Reported"}</StatusPill></span>
                        <span style={{ width: COLS[3] }} className={cn("text-[14px]", DATE_TIER_CLASS[d.tier])}>{d.label}</span>
                        <span style={{ width: COLS[4] }} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => setParam("resolve", w.id)} className="text-[14px] font-medium text-brand-700 hover:text-brand-800 hover:underline underline-offset-2 cursor-pointer whitespace-nowrap">Resolve →</button>
                          <span className="ml-auto flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <IconButton icon={Pencil} label="Edit work order" onClick={() => setWoModal({ editing: w })} className="size-7 text-good-text hover:bg-good-soft/40" />
                            <IconButton icon={Trash2} label="Cancel work order" onClick={() => cancel(w)} className="size-7 text-bad-text hover:bg-bad-soft/40" />
                          </span>
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <RecordPagination page={p} pages={pages} from={(p - 1) * PER + 1} to={(p - 1) * PER + shown.length} total={rows.length} noun="open work orders" per={PER} onPage={setPage} />
            </RecordCard>
            <div className="flex items-start justify-between leading-[1.4] mt-3">
              <p className="text-[12px] text-ink-2">Repair spend year to date · closed work orders</p>
              <p className="text-[14px] font-medium text-deep tnum">{php(ytd)}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={T.page}>
            <div className="flex items-start mb-6">
              <div><h1 className="t-h1">Maintenance</h1><p className="t-b2 text-ink-2 mt-0.5">Work orders across {state.assets.length} assets. Drag a card to change its stage.</p></div>
              <Button variant="primary" size="lg" iconRight={Plus} className="ml-auto mt-1" onClick={() => setWoModal({ editing: null })}>New Work Order</Button>
            </div>
            {kpis}
            <div className="flex items-center gap-3 mt-5">
              <SearchBox value={q} onChange={setQ} placeholder="Search work orders, assets, or technicians" className="w-[440px]" />
              <div className="ml-auto flex items-center gap-3">
                {([["office", "Office", [...OFFICES]], ["priority", "Priority", [...PRIORITY]], ["technician", "Technician", technicians]] as [string, string, string[]][]).map(([k, l, opts]) => (
                  <div key={k} className="relative">
                    <Button className={cn((filters[k]?.length ?? 0) > 0 && "border-brand-300 bg-brand-50")} onClick={() => setMenu(menu === k ? null : k)}>{l}{(filters[k]?.length ?? 0) > 0 && <span className="text-brand-600 tnum">· {filters[k].length}</span>}<ChevronDown size={14} /></Button>
                    <Popover open={menu === k} onClose={() => setMenu(null)}>
                      {opts.map((o) => <MenuItem key={o} active={filters[k]?.includes(o)} onClick={() => setFilters((f) => ({ ...f, [k]: f[k]?.includes(o) ? f[k].filter((x) => x !== o) : [...(f[k] ?? []), o] }))}>{o}</MenuItem>)}
                    </Popover>
                  </div>
                ))}
                <Toggle mode={mode} onChange={(m) => setParam("mode", m === "board" ? "board" : null)} />
              </div>
            </div>
            <FilterChips value={filters} onChange={setFilters} />
            <Board orders={state.workOrders.filter(match)} onResolve={(id) => setParam("resolve", id)} onNew={() => setWoModal({ editing: null })}
              onOpen={(id) => { const w = state.workOrders.find((x) => x.id === id); if (w) router.push(`/assets?asset=${w.assetId}`); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <ResolveModal woId={resolveId} onClose={() => setParam("resolve", null)} />
      <WorkOrderModal open={!!woModal} editing={woModal?.editing ?? null} onClose={() => setWoModal(null)} />
    </>
  );
}
