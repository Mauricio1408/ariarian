"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Box, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Folder, Hash, Loader, MoreHorizontal, PhilippinePeso, Plus, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CAPITALISATION_THRESHOLD } from "@/lib/types";
import type { Employee, EmployeeStatus } from "@/lib/types";
import { OFFICES } from "@/lib/seed";
import { php } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page, PageTitle } from "@/components/shell/topbar";
import { Avatar, Button, Checkbox, CountUp, Pill, Tabs } from "@/components/ui/primitives";
import { FilterChips, FilterMenu, Pager, SearchBox, SortMenu, Th, rowMotion, type FilterValue } from "@/components/ui/table";
import { KpiCard } from "@/components/ui/kpi";
import { BulkBar } from "@/components/ui/bulk-bar";
import { T } from "@/components/ui/motion";
import { TransferModal } from "@/components/assets/transfer-modal";
import { EmployeeDrawer } from "@/components/employees/employee-drawer";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";

type TabKey = "Active" | "On Leave" | "Clearance" | "All";
const COLS = "grid-cols-[52px_208px_164px_170px_1fr_70px_134px_92px]";

export default function EmployeesPage() {
  return <Page crumb="Employees" icon={User}><Suspense><Employees /></Suspense></Page>;
}

function Employees() {
  const { state, issueForms, toast } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const doExport = useExport();
  const tab = (params.get("tab") as TabKey) ?? "Active";
  const openId = params.get("employee");

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValue>({});
  const [sort, setSort] = useState<{ key: "name" | "assets" | "value" | "office"; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transfer, setTransfer] = useState<string[] | null>(null);
  const [form, setForm] = useState<{ e: Employee | null } | null>(null);
  const [perOpen, setPerOpen] = useState(false);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.replace(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  const stats = useMemo(() => {
    const held = new Map<string, { n: number; v: number }>();
    for (const a of state.assets) if (a.custodianId) {
      const h = held.get(a.custodianId) ?? { n: 0, v: 0 }; h.n++; h.v += a.cost; held.set(a.custodianId, h);
    }
    return held;
  }, [state.assets]);

  const counts: Record<TabKey, number> = {
    Active: state.employees.filter((e) => e.status === "Active").length,
    "On Leave": state.employees.filter((e) => e.status === "On Leave").length,
    Clearance: state.employees.filter((e) => e.status === "Clearance").length,
    All: state.employees.length,
  };
  const holders = state.employees.filter((e) => (stats.get(e.id)?.n ?? 0) > 0).length;
  const unassigned = state.assets.filter((a) => !a.custodianId).length;
  const clearance = state.employees.filter((e) => e.status === "Clearance");
  const pastDeadline = clearance.filter((e) => (e.clearanceDeadline ?? "9999") < "2026-03-14").length;
  const clearanceHolding = clearance.filter((e) => (stats.get(e.id)?.n ?? 0) > 0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = state.employees
      .filter((e) => tab === "All" || e.status === (tab as EmployeeStatus))
      .filter((e) => !needle || `${e.name} ${e.id} ${e.office} ${e.position}`.toLowerCase().includes(needle))
      .filter((e) => !filters.office?.length || filters.office.includes(e.office))
      .filter((e) => !filters.holding?.length || filters.holding.includes((stats.get(e.id)?.n ?? 0) > 0 ? "Holds assets" : "No assets"));
    // Default order mirrors the design: largest accountability among named custodians first.
    const v = (e: Employee) => stats.get(e.id)?.v ?? 0;
    if (sort) {
      const d = sort.dir === "asc" ? 1 : -1;
      const key = (e: Employee) => sort.key === "name" ? e.name : sort.key === "office" ? e.office : sort.key === "assets" ? stats.get(e.id)?.n ?? 0 : v(e);
      r = [...r].sort((a, b) => (key(a) > key(b) ? d : key(a) < key(b) ? -d : 0));
    } else {
      const pin = ["DOST-2019-0117", "DOST-2020-0342", "DOST-2021-0088", "DOST-2018-0225", "DOST-2017-0056", "DOST-2015-0311"];
      r = [...r].sort((a, b) => {
        const ia = pin.indexOf(a.id), ib = pin.indexOf(b.id);
        if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        return v(b) - v(a);
      });
    }
    return r;
  }, [state.employees, tab, q, filters, sort, stats]);

  const pages = Math.max(1, Math.ceil(rows.length / per));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * per, p * per);
  const allOnPage = shown.length > 0 && shown.every((e) => selected.has(e.id));

  const selectedAssets = () => state.assets.filter((a) => a.custodianId && selected.has(a.custodianId)).map((a) => a.id);

  return (
    <>
      <PageTitle title="Employees" sub="Property custodians and asset accountability across DOST." />
      <div className="grid grid-cols-4 gap-5 -mt-1">
        <KpiCard i={0} label="Total Employees" tone="good" value={<CountUp value={state.employees.length} />} delta={<>▲ {Math.max(2, state.employees.length - 46)} this quarter</>} onClick={() => setParam("tab", "All")} />
        <KpiCard i={1} label="With Assets Assigned" tone="brand" value={<CountUp value={holders} />} delta={`${Math.round((holders / state.employees.length) * 100)}% of staff`} />
        <KpiCard i={2} label="Assets Unassigned" tone="warn" value={<CountUp value={unassigned} />} delta={`of ${state.assets.length} assets • ${Math.round((unassigned / state.assets.length) * 100)}%`} onClick={() => router.push("/assets")} />
        <KpiCard i={3} label="Pending Clearance" tone="bad" value={<CountUp value={clearance.length} />} delta={`${pastDeadline} past deadline`} onClick={() => setParam("tab", "Clearance")} active={tab === "Clearance"} />
      </div>

      <div className="mt-6 border-b border-line">
        <Tabs id="emp-tabs" value={tab} onChange={(k) => { setParam("tab", k === "Active" ? null : k); setPage(1); setSelected(new Set()); }}
          tabs={(["Active", "On Leave", "Clearance", "All"] as TabKey[]).map((k) => ({ key: k, label: k, count: counts[k] }))} />
      </div>

      <div className="flex items-center gap-4 mt-5">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, employee ID, or office" className="w-[440px]" />
        <div className="ml-6"><Pager page={p} pages={pages} onPage={setPage} /></div>
        <div className="ml-auto flex items-center gap-[18px]">
          <SortMenu value={sort} onChange={setSort} options={[{ key: "name", label: "Name" }, { key: "office", label: "Office" }, { key: "assets", label: "Assets held" }, { key: "value", label: "Accountable value" }]} />
          <FilterMenu value={filters} onChange={(v) => { setFilters(v); setPage(1); }} groups={[{ key: "office", label: "Office", options: [...OFFICES] }, { key: "holding", label: "Custody", options: ["Holds assets", "No assets"] }]} />
          <Button variant="primary" iconRight={Plus} onClick={() => setForm({ e: null })}>Add Employee</Button>
          <Button variant="dark" iconRight={ArrowDown} onClick={() => doExport("employees.csv", ["Employee ID", "Name", "Position", "Office", "Assets", "Accountable", "Status"], rows.map((e) => [e.id, e.name, e.position, e.office, stats.get(e.id)?.n ?? 0, stats.get(e.id)?.v ?? 0, e.status]))}>Export</Button>
        </div>
      </div>
      <FilterChips value={filters} onChange={setFilters} />

      <AnimatePresence initial={false}>
        {tab === "Clearance" && clearanceHolding.length > 0 && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state} className="overflow-hidden">
            <span className="block mt-5 rounded-lg bg-bad-soft/40 px-4 py-3 t-b2 text-bad-text">
              Clearance closes only when every assigned asset is transferred. {clearanceHolding.map((e) => e.name).join(" and ")} still hold {clearanceHolding.reduce((s, e) => s + (stats.get(e.id)?.n ?? 0), 0)} assets between them.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <section className="card-raised mt-5 overflow-hidden">
        <div className={cn("grid items-center h-[60px] px-5 dash-b", COLS)}>
          <Checkbox checked={allOnPage} indeterminate={!allOnPage && shown.some((e) => selected.has(e.id))} label="Select page"
            onChange={() => setSelected((s) => { const n = new Set(s); shown.forEach((e) => (allOnPage ? n.delete(e.id) : n.add(e.id))); return n; })} />
          <Th icon={User}>Employee</Th><Th icon={Hash}>Employee ID</Th><Th icon={Briefcase}>Position</Th><Th icon={Folder}>Office</Th>
          <Th icon={Box} className="justify-end">Assets</Th><Th icon={PhilippinePeso} className="justify-end">Accountable</Th><Th icon={Loader} className="justify-end">Status</Th>
        </div>
        <div className="min-h-[120px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.length === 0 && (
              <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14 text-center t-b2 text-ink-2">No employees match. <button onClick={() => { setQ(""); setFilters({}); }} className="text-brand-600 hover:underline cursor-pointer">Clear search</button></motion.p>
            )}
            {shown.map((e, i) => {
              const s = stats.get(e.id); const sel = selected.has(e.id);
              return (
                <motion.div key={`${tab}-${e.id}`} {...rowMotion(i)} onClick={() => setParam("employee", e.id)}
                  className={cn("group grid items-center h-[73px] px-5 border-b border-line cursor-pointer transition-colors duration-[120ms]", COLS, sel ? "bg-brand-50" : "hover:bg-tint")}>
                  <Checkbox checked={sel} label={`Select ${e.name}`} onChange={() => setSelected((x) => { const n = new Set(x); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} />
                  <span className="flex items-center gap-3 min-w-0"><Avatar src={e.avatar} name={e.name} size={32} />
                    <span className="min-w-0"><span className="block text-[15px] truncate">{e.name}</span><span className="block t-b3 text-ink-2 truncate">{e.email}</span></span></span>
                  <span className="text-[15px] tnum">{e.id}</span>
                  <span className="text-[15px] pr-2 leading-tight">{e.position}</span>
                  <span className="text-[15px] pr-2">DOST {e.office}</span>
                  <span className="text-[15px] text-right tnum">{s?.n ?? 0}</span>
                  <span className="text-[15px] text-right tnum">{php(s?.v ?? 0)}</span>
                  <span className="flex justify-end items-center gap-1">
                    <Pill tone={e.status === "Active" ? "good" : e.status === "Clearance" ? "bad" : "warn"}>{e.status}</Pill>
                    <MoreHorizontal size={16} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="flex items-center h-[50px] px-5 t-b2 text-ink-2">
          <div className="relative">
            <button onClick={() => setPerOpen((o) => !o)} className="flex items-center gap-1 cursor-pointer hover:text-ink">Rows per page <span className="text-ink ml-1.5">{per}</span><ChevronDown size={13} /></button>
            <AnimatePresence>{perOpen && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.state} className="absolute bottom-8 left-20 bg-white rounded-lg shadow-overlay border border-line p-1 z-10">
                {[6, 10, 20].map((n) => <button key={n} onClick={() => { setPer(n); setPage(1); setPerOpen(false); }} className={cn("block w-14 h-8 rounded-md cursor-pointer hover:bg-tint", n === per && "bg-brand-100 text-brand-700")}>{n}</button>)}
              </motion.div>
            )}</AnimatePresence>
          </div>
          <span className="ml-auto tnum">{rows.length ? (p - 1) * per + 1 : 0}–{(p - 1) * per + shown.length} of {rows.length}</span>
          <div className="flex items-center gap-1 ml-4">
            <button disabled={p <= 1} onClick={() => setPage(p - 1)} className="size-7 grid place-items-center rounded hover:bg-tint disabled:opacity-30 cursor-pointer"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={cn("relative size-7 grid place-items-center rounded cursor-pointer tnum", n === p ? "text-ink font-semibold" : "hover:bg-tint")}>
                {n === p && <motion.span layoutId="emp-page" transition={T.spring} className="absolute inset-0 rounded bg-tint" />}<span className="relative">{n}</span>
              </button>
            ))}
            <button disabled={p >= pages} onClick={() => setPage(p + 1)} className="size-7 grid place-items-center rounded hover:bg-tint disabled:opacity-30 cursor-pointer"><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())} actions={[
        { label: "Transfer assets", run: () => { const ids = selectedAssets(); if (!ids.length) { toast({ title: "Selected staff hold no assets", tone: "bad" }); return; } setTransfer(ids); } },
        { label: "Generate PAR/ICS", run: () => {
          const ids = [...selected].filter((id) => (stats.get(id)?.n ?? 0) > 0).flatMap((id) => issueForms(id));
          if (!ids.length) { toast({ title: "Selected staff hold no assets", tone: "bad" }); return; }
          toast({ title: `${ids.length} property form${ids.length > 1 ? "s" : ""} generated`, body: `₱${CAPITALISATION_THRESHOLD.toLocaleString()} threshold splits PAR and ICS`, tone: "good" });
          router.push(`/forms/${ids[0]}`);
        } },
        { label: "Export", run: () => doExport("employees-selected.csv", ["Employee ID", "Name", "Office", "Assets", "Accountable"], state.employees.filter((e) => selected.has(e.id)).map((e) => [e.id, e.name, e.office, stats.get(e.id)?.n ?? 0, stats.get(e.id)?.v ?? 0])) },
      ]} />

      <EmployeeDrawer employeeId={openId} onClose={() => setParam("employee", null)} onTransfer={(ids) => setTransfer(ids)} onEdit={(id) => setForm({ e: state.employees.find((x) => x.id === id)! })} />
      <TransferModal open={!!transfer} assetIds={transfer ?? []} onClose={() => setTransfer(null)} onDone={() => setSelected(new Set())} />
      <EmployeeFormModal open={!!form} employee={form?.e ?? null} onClose={() => setForm(null)} />
    </>
  );
}
