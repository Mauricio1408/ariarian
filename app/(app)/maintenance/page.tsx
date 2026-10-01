"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Box, ChevronDown, CircleDot, Loader, Maximize2, Pencil, Plus, Send, Tag, Trash2, Wrench } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PRIORITY, PROBLEM_TYPE } from "@/lib/types";
import type { WorkOrder } from "@/lib/types";
import { OFFICES } from "@/lib/seed";
import { daysOpen, isOverdue, openOrders } from "@/lib/selectors";
import { deadline, DATE_TIER_CLASS, php, phpExact } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page, PageTitle } from "@/components/shell/topbar";
import { Button, Checkbox, CountUp, IconButton, Thumb } from "@/components/ui/primitives";
import { MenuItem, Popover } from "@/components/ui/overlay";
import { FilterChips, FilterMenu, Pager, SearchBox, SortMenu, Th, rowMotion, type FilterValue } from "@/components/ui/table";
import { BulkBar } from "@/components/ui/bulk-bar";
import { T } from "@/components/ui/motion";
import { ProblemChip } from "@/components/maintenance/problem-chip";
import { ResolveModal } from "@/components/maintenance/resolve-modal";
import { WorkOrderModal } from "@/components/maintenance/work-order-modal";
import { Board } from "@/components/maintenance/board";

const COLS = "grid-cols-[44px_196px_166px_160px_160px_1fr_150px]";
const PER = 10;

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
  const [sort, setSort] = useState<{ key: "promised" | "priority" | "asset"; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    let r = open.filter(match);
    if (sort) {
      const d = sort.dir === "asc" ? 1 : -1;
      const key = (w: WorkOrder) => sort.key === "promised" ? w.promisedOn ?? "" : sort.key === "priority" ? PRIORITY.indexOf(w.priority) : L.asset.get(w.assetId)?.name ?? "";
      r = [...r].sort((a, b) => (key(a) > key(b) ? d : key(a) < key(b) ? -d : 0));
    } else {
      r = [...r].sort((a, b) => (a.promisedOn ?? "").localeCompare(b.promisedOn ?? ""));
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workOrders, L, q, filters, sort]);

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

  const toolbarRight = (
    <div className="ml-auto flex items-center gap-[18px]">
      <SortMenu value={sort} onChange={setSort} options={[{ key: "promised", label: "Promised date" }, { key: "priority", label: "Priority" }, { key: "asset", label: "Asset" }]} />
      <FilterMenu value={filters} onChange={(v) => { setFilters(v); setPage(1); }} groups={[
        { key: "problem", label: "Problem", options: [...PROBLEM_TYPE] }, { key: "priority", label: "Priority", options: [...PRIORITY] },
        { key: "technician", label: "Technician", options: technicians }, { key: "office", label: "Office", options: [...OFFICES] },
      ]} />
      <Button variant="primary" iconRight={Plus} onClick={() => setWoModal({ editing: null })}>New Work Order</Button>
      <Button variant="dark" iconRight={ArrowDown} onClick={() => doExport("maintenance-queue.csv", ["Work order", "Asset", "Problem", "Summary", "Technician", "Stage", "Promised"], rows.map((w) => [w.id, L.asset.get(w.assetId)?.name ?? "", w.problem, w.summary, w.technician, w.stage, w.promisedOn ?? ""]))}>Export</Button>
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {mode === "list" ? (
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={T.page}>
            <PageTitle title="Maintenance Queue" sub="Last Updated: March 14, 2026" right={<Toggle mode={mode} onChange={(m) => setParam("mode", m === "board" ? "board" : null)} />} />
            <section className="card-raised px-4 pt-5 pb-2">
              <div className="flex items-center gap-4">
                <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by asset, technician, or work order" className="w-[440px]" />
                <Pager page={p} pages={pages} onPage={setPage} />
                {toolbarRight}
              </div>
              <FilterChips value={filters} onChange={setFilters} />
              <div className={cn("grid items-center h-[42px] mt-2 dash-b px-3", COLS)}>
                <Checkbox checked={shown.length > 0 && shown.every((w) => selected.has(w.id))} label="Select page"
                  onChange={(v) => setSelected((s) => { const n = new Set(s); shown.forEach((w) => (v ? n.add(w.id) : n.delete(w.id))); return n; })} />
                <Th icon={Pencil}>Asset</Th><Th icon={Box}>Problem</Th><Th icon={Tag}>Technician</Th><Th icon={CircleDot}>Stage</Th><Th icon={Box} small>Promised</Th><Th icon={Loader} className="justify-end pr-3">Actions</Th>
              </div>
              <div className="min-h-[200px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.length === 0 && (
                    <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                      <p className="text-[18px] font-semibold">{open.length ? "No work orders match" : "Queue is clear"}</p>
                      <p className="t-b2 text-ink-2 mt-1">{open.length ? "Try a different search or filter." : "Every reported issue has been resolved."}</p>
                    </motion.div>
                  )}
                  {shown.map((w, i) => {
                    const a = L.asset.get(w.assetId);
                    if (!a) return null;
                    const d = deadline(w.promisedOn);
                    const sel = selected.has(w.id);
                    return (
                      <motion.div key={w.id} {...rowMotion(i)} onClick={() => setParam("resolve", w.id)}
                        className={cn("group grid items-center h-12 border-b border-line px-3 cursor-pointer transition-colors duration-[120ms]", COLS, sel ? "bg-brand-50" : "hover:bg-tint")}>
                        <Checkbox checked={sel} label={`Select ${a.name}`} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(w.id)) n.delete(w.id); else n.add(w.id); return n; })} />
                        <span className="flex items-center gap-3 min-w-0 pr-2"><Thumb src={a.photo} category={a.category} size={28} /><span className="text-[15px] font-medium truncate">{a.name}</span></span>
                        <span><ProblemChip p={w.problem} /></span>
                        <span className="t-b1 truncate pr-2">{w.technician.replace(" · in-house", "")}</span>
                        <span className={cn("t-b1", w.stage === "in_repair" ? "text-good-text" : "text-ink")}>{w.stage === "in_repair" ? "In repair" : "Reported"}</span>
                        <span className={cn("t-b1", DATE_TIER_CLASS[d.tier])}>{d.label}</span>
                        <span className="relative flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <IconButton icon={Maximize2} label="Resolve issue" onClick={() => setParam("resolve", w.id)} className="text-ink" />
                          <IconButton icon={Send} label="Nudge technician" onClick={() => toast({ title: `Reminder sent to ${w.technician}`, body: `${a.name} • ${d.label}` })} className="text-brand-500 hover:bg-brand-50" />
                          <IconButton icon={Pencil} label="Edit work order" onClick={() => setWoModal({ editing: w })} className="text-good-text hover:bg-good-soft/40" />
                          <IconButton icon={Trash2} label="Cancel work order" onClick={() => cancel(w)} className="text-bad-text hover:bg-bad-soft/40" />
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <button onClick={() => setWoModal({ editing: null })} aria-label="New work order" className="group flex items-center h-12 w-full px-3 border-b border-line hover:bg-tint cursor-pointer transition-colors">
                <Plus size={18} className="transition-transform duration-200 group-hover:rotate-90" /><span className="ml-3 t-b2 text-ink-2 opacity-0 group-hover:opacity-100 transition-opacity">New work order</span>
              </button>
              <div className="flex items-center h-12 px-4 border-b border-line">
                <span className="text-[16px] font-semibold tnum">Showing {shown.length} of {rows.length} open</span>
                <span className="ml-auto text-[16px] tnum">Repair spend YTD: <b className="font-semibold">{phpExact(ytd)}</b></span>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={T.page}>
            <div className="flex items-start mb-6">
              <div><h1 className="t-h1">Maintenance</h1><p className="t-b2 text-ink-2 mt-0.5">Work orders across {state.assets.length} assets. Drag a card to change its stage.</p></div>
              <Button variant="primary" size="lg" iconRight={Plus} className="ml-auto mt-1" onClick={() => setWoModal({ editing: null })}>New Work Order</Button>
            </div>
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

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())} actions={[
        { label: "Move to In repair", run: () => { [...selected].forEach((id) => dispatch({ type: "stage", woId: id, stage: "in_repair" })); toast({ title: `${selected.size} moved to In repair`, tone: "good" }); setSelected(new Set()); } },
        { label: "Nudge technicians", run: () => { toast({ title: `${selected.size} reminders sent` }); setSelected(new Set()); } },
        { label: "Cancel", danger: true, run: () => { const ws = state.workOrders.filter((w) => selected.has(w.id)); ws.forEach((w) => dispatch({ type: "removeWorkOrder", woId: w.id })); setSelected(new Set()); toast({ title: `${ws.length} work orders cancelled`, action: { label: "Undo", run: () => ws.forEach((w) => dispatch({ type: "restoreWorkOrder", wo: w })) } }); } },
      ]} />
      <ResolveModal woId={resolveId} onClose={() => setParam("resolve", null)} />
      <WorkOrderModal open={!!woModal} editing={woModal?.editing ?? null} onClose={() => setWoModal(null)} />
    </>
  );
}
