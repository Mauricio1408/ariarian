"use client";

import { useMemo, useState } from "react";
import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Pencil } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page, PageTitle } from "@/components/shell/topbar";
import { Avatar, CategoryChip, Thumb } from "@/components/ui/primitives";
import { ResizableHeader, TableScroll, useColumns } from "@/components/ui/columns";
import { FIELD_ICON as F } from "@/lib/field-icons";
import { ExportButton, FilterChips, FilterMenu, Pager, SearchBox, SortMenu, Th, rowMotion, type FilterValue } from "@/components/ui/table";
import { T } from "@/components/ui/motion";

const ACTION_TONE: Record<string, string> = {
  Transferred: "text-brand-600", Resolved: "text-good-text", Removed: "text-bad-text", Reported: "text-warn-text",
  "Issued PAR": "text-brand-700", "Issued ICS": "text-brand-700", Registered: "text-ink-2", Updated: "text-ink-2", Audited: "text-ink-2",
};

export default function AuditLogPage() {
  const { state } = useStore();
  const L = useLookups();
  const doExport = useExport();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValue>({});
  const [sort, setSort] = useState<{ key: "date" | "name"; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const cols = useColumns("audit", [{ w: 56, fixed: true }, { w: 240, min: 170 }, { w: 150 }, { w: 166, min: 150 }, { w: 190 }, { w: 200 }, { w: "fr" }]);
  const [per, setPer] = useState(10);
  const [viewing, setViewing] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = state.audit.map((e) => ({ e, a: L.asset.get(e.assetId), by: L.employee.get(e.byId) }))
      .filter(({ e, a }) => !needle || `${a?.name} ${a?.serial} ${a?.tag} ${e.action} ${e.note ?? ""}`.toLowerCase().includes(needle))
      .filter(({ e }) => !filters.action?.length || filters.action.includes(e.action))
      .filter(({ a }) => !filters.type?.length || (a && filters.type.includes(a.category)));
    if (sort) {
      const d = sort.dir === "asc" ? 1 : -1;
      r = [...r].sort((x, y) => sort.key === "date" ? x.e.date.localeCompare(y.e.date) * d : (x.a?.name ?? "").localeCompare(y.a?.name ?? "") * d);
    }
    return r;
  }, [state.audit, L, q, filters, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / per));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * per, p * per);

  return (
    <Page crumb="Audit Log" icon={Clock}>
      <PageTitle title="Equipment Audit Log" sub="Tracing equipment lifecycle, assignments, and movement across the organization." />
      <section className="card-raised px-4 pt-4 pb-1">
        <div className="flex items-center gap-4">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by Asset Name, Tag, or Description" className="w-[440px]" />
          <div className="ml-24"><Pager page={p} pages={pages} onPage={setPage} /></div>
          <div className="ml-auto flex items-center gap-3">
            <SortMenu value={sort} onChange={setSort} options={[{ key: "name", label: "Name", icon: Pencil }, { key: "date", label: "Date", icon: Clock }]} />
            <FilterMenu value={filters} onChange={(v) => { setFilters(v); setPage(1); }} groups={[
              { key: "action", label: "Action", options: ["Registered", "Transferred", "Resolved", "Reported", "Updated", "Issued PAR", "Issued ICS", "Removed", "Audited"] },
              { key: "type", label: "Type", options: [...ASSET_CATEGORY] },
            ]} />
            <ExportButton onPick={(fmt) => doExport("audit-log.csv", ["Date", "Action", "Asset", "Serial", "Type", "By", "Note"], rows.map(({ e, a, by }) => [e.date, e.action, a?.name ?? e.assetId, a?.serial ?? "", a?.category ?? "", by?.name ?? "", e.note ?? ""]), fmt)} />
          </div>
        </div>
        <FilterChips value={filters} onChange={setFilters} />
        <TableScroll>
        <ResizableHeader cols={cols} className="h-[64px] mt-2 px-3 dash-b">
          <span /><Th icon={F.name}>Asset Name</Th><Th icon={F.serial}>Serial ID</Th><Th icon={F.type}>Type</Th><Th icon={F.department}>Department</Th><Th icon={F.person}>Registered By</Th><Th icon={F.date}>Date</Th>
        </ResizableHeader>
        <div className="min-h-[200px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map(({ e, a, by }, i) => (
              <motion.div key={e.id} {...rowMotion(i)} onClick={() => a && setViewing(a.id)} style={cols.style}
                className="relative grid items-center h-[60px] px-3 border-b border-line cursor-pointer transition-colors duration-[120ms] hover:bg-tint">
                {e.fresh && <motion.span initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 2.4, delay: 0.4 }} className="absolute inset-0 bg-brand-100 pointer-events-none" />}
                <span className="relative t-b1 tnum pl-2">{(p - 1) * per + i + 1}</span>
                <span className="relative flex items-center gap-3 min-w-0 pr-2">
                  {a ? <Thumb src={a.photo} category={a.category} size={28} /> : <span className="size-7 rounded bg-line" />}
                  <span className="min-w-0"><span className="block text-[16px] font-semibold truncate">{a?.name ?? "Removed asset"}</span>
                    <span className={cn("block text-[11.5px] leading-none -mt-0.5", ACTION_TONE[e.action])}>{e.action}{e.note ? ` · ${e.note}` : ""}</span></span>
                </span>
                <span className="relative t-b1 tnum">{a?.serial ?? "—"}</span>
                <span className="relative">{a && <CategoryChip category={a.category} />}</span>
                <span className="relative t-b1">{a ? a.department.replace(/ (.*)$/, "") : "—"}</span>
                <span className="relative flex items-center gap-2.5 min-w-0">
                  <Avatar src={by?.avatar} name={by?.name ?? "?"} size={30} />
                  <span className="min-w-0"><span className="block text-[15px] font-semibold truncate">{by?.name}</span><span className="block t-b3 text-ink-2 truncate">{by?.position.replace("Administrative Officer", "Admin").replace("Administrative Aide VI", "Admin I")}</span></span>
                </span>
                <span className="relative t-b1 text-ink-2">{e.fresh ? <span className="text-brand-600 font-medium">Just now</span> : shortDate(e.date)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        </TableScroll>
        <div className="flex items-center h-[52px] px-5 t-b2 text-ink-2">
          <button onClick={() => { setPer(per === 10 ? 20 : 10); setPage(1); }} className="flex items-center gap-1 cursor-pointer hover:text-ink">Rows per page <span className="text-ink ml-1.5">{per}</span><ChevronDown size={13} /></button>
          <span className="ml-auto tnum">{(p - 1) * per + 1}–{(p - 1) * per + shown.length} of {rows.length}</span>
          <div className="flex items-center gap-1 ml-4">
            <button disabled={p <= 1} onClick={() => setPage(p - 1)} className="size-7 grid place-items-center rounded hover:bg-tint disabled:opacity-30 cursor-pointer"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={cn("relative size-7 grid place-items-center rounded cursor-pointer tnum", n === p ? "text-ink font-semibold" : "hover:bg-tint")}>
                {n === p && <motion.span layoutId="audit-page" transition={T.spring} className="absolute inset-0 rounded bg-tint" />}<span className="relative">{n}</span>
              </button>
            ))}
            <button disabled={p >= pages} onClick={() => setPage(p + 1)} className="size-7 grid place-items-center rounded hover:bg-tint disabled:opacity-30 cursor-pointer"><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>
      <AssetFormModal open={!!viewing} mode="view" asset={state.assets.find((x) => x.id === viewing) ?? null} onClose={() => setViewing(null)} />
    </Page>
  );
}
