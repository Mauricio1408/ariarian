"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Box, CircleDot, FileText, Maximize2, Pencil, Plus, Repeat, Search, Send, Tag, Trash2, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY, OPERATIONAL_STATUS, PHYSICAL_CONDITION } from "@/lib/types";
import { CATEGORY_ICON } from "@/components/ui/primitives";
import type { Asset } from "@/lib/types";
import { AGENCIES } from "@/lib/seed";
import { formType } from "@/lib/selectors";
import { phpExact } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page, PageTitle } from "@/components/shell/topbar";
import { Button, CategoryChip, Checkbox, IconButton, OPERATIONAL_TEXT, Skeleton, Thumb } from "@/components/ui/primitives";
import { ResizableHeader, TableScroll, useColumns } from "@/components/ui/columns";
import { FIELD_ICON as F } from "@/lib/field-icons";
import { ExportButton, FilterChips, FilterMenu, Pager, SearchBox, SortMenu, Th, rowMotion, type FilterValue } from "@/components/ui/table";
import { T } from "@/components/ui/motion";
import { AssetDrawer } from "@/components/assets/asset-drawer";
import { TransferModal } from "@/components/assets/transfer-modal";
import { AssetFormModal, DeleteAssetFlow } from "@/components/assets/asset-form-modal";
import type { ExportFormat } from "@/lib/export";
import { BulkBar } from "@/components/ui/bulk-bar";

const PER = 10;
type SortKey = "name" | "category" | "serial" | "operational" | "condition" | "cost";

export default function AssetsPage() {
  return (
    <Page crumb="Asset Inventory" icon={Box}>
      <Suspense><Registry /></Suspense>
    </Page>
  );
}

function Registry() {
  const { state, dispatch, toast, issueForms } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const doExport = useExport();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<FilterValue>(() => {
    const f: FilterValue = {};
    if (params.get("agency")) f.agency = [params.get("agency")!];
    if (params.get("condition")) f.condition = [params.get("condition")!];
    if (params.get("status")) f.status = [params.get("status")!];
    if (params.get("category")) f.category = [params.get("category")!];
    return f;
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const cols = useColumns("assets", [{ w: 44, fixed: true }, { w: 220, min: 160 }, { w: 166, min: 150 }, { w: 160 }, { w: 160 }, { w: "fr" }, { w: 160, min: 150 }]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transfer, setTransfer] = useState<string[] | null>(null);
  const [form, setForm] = useState<{ asset: Asset | null } | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const openId = params.get("asset");

  // The Loading state (Figma 4592:31435) on first paint and on every page turn.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const load = (ms = 420) => { setLoading(true); clearTimeout(timer.current); timer.current = setTimeout(() => setLoading(false), ms); };
  useEffect(() => { timer.current = setTimeout(() => setLoading(false), 650); return () => clearTimeout(timer.current); }, []);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.replace(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  const assets = useMemo(() => (state.registryEmpty ? [] : state.assets), [state.registryEmpty, state.assets]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = assets.filter((a) =>
      (!needle || `${a.name} ${a.serial} ${a.tag} ${a.id}`.toLowerCase().includes(needle)) &&
      (!filters.category?.length || filters.category.includes(a.category)) &&
      (!filters.status?.length || filters.status.includes(a.operational)) &&
      (!filters.condition?.length || filters.condition.includes(a.condition)) &&
      (!filters.agency?.length || filters.agency.includes(a.agency)));
    if (sort) {
      const k = sort.key, d = sort.dir === "asc" ? 1 : -1;
      const val = (a: Asset) => (k === "operational" ? a.operational : k === "condition" ? PHYSICAL_CONDITION.indexOf(a.condition) : a[k]);
      r = [...r].sort((a, b) => (val(a) > val(b) ? d : val(a) < val(b) ? -d : 0));
    }
    return r;
  }, [assets, q, filters, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * PER, p * PER);
  const pageTotal = shown.reduce((s, a) => s + a.cost, 0);
  const allOnPage = shown.length > 0 && shown.every((a) => selected.has(a.id));
  const someOnPage = shown.some((a) => selected.has(a.id));
  const filtered = q.trim() !== "" || Object.values(filters).some((v) => v.length);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const remove = (ids: string[]) => setDeleting(ids);
  const issue = (a: Asset) => {
    if (!a.custodianId) { toast({ title: "Assign a custodian first", body: "A PAR or ICS is issued to a person", tone: "bad" }); return; }
    const ids = issueForms(a.custodianId, [a.id]);
    toast({ title: `${formType(a)} issued for ${a.name}`, body: `${ids[0]} • ₱50,000 threshold applied`, tone: "good" });
    router.push(`/forms/${ids[0]}`);
  };
  const exportRows = (list: Asset[], fmt: ExportFormat = "csv") => doExport("asset-registry", ["Property No.", "Name", "Category", "Serial", "Operational", "Physical", "Agency", "Office", "Cost"],
    list.map((a) => [a.id, a.name, a.category, a.serial, a.operational, a.condition, a.agency, a.office, a.cost]), fmt);

  return (
    <>
      <PageTitle title="Global Asset Registry" sub="Last Updated: March 14, 2026" />
      <section className="card-raised px-4 pt-5 pb-2">
        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by asset name, serial, or tag" className="w-[440px]" />
          <div className="ml-6"><Pager page={p} pages={pages} onPage={(n) => { setPage(n); load(); }} /></div>
          <div className="ml-auto flex items-center gap-[18px]">
            <SortMenu value={sort} onChange={setSort} options={[{ key: "name", label: "Name", icon: Pencil }, { key: "category", label: "Asset type", icon: Box }, { key: "serial", label: "Serial ID", icon: Tag }, { key: "operational", label: "Operational", icon: CircleDot }, { key: "condition", label: "Physical condition", icon: Box }, { key: "cost", label: "Value", icon: Tag }]} />
            <FilterMenu value={filters} onChange={(v) => { setFilters(v); setPage(1); }} groups={[
              { key: "category", label: "Asset type", options: [...ASSET_CATEGORY], icons: CATEGORY_ICON },
              { key: "status", label: "Operational", options: OPERATIONAL_STATUS.slice(0, 4) as unknown as string[] },
              { key: "condition", label: "Physical", options: [...PHYSICAL_CONDITION] },
              { key: "agency", label: "Agency", options: AGENCIES.map((g) => g.code) },
            ]} />
            <Button variant="primary" iconRight={Plus} onClick={() => setForm({ asset: null })}>Add Asset</Button>
            <ExportButton onPick={(f) => exportRows(rows, f)} />
          </div>
        </div>
        <FilterChips value={filters} onChange={(v) => { setFilters(v); setPage(1); }} />

        <TableScroll>
        {/* Header */}
        <ResizableHeader cols={cols} className="h-[42px] mt-2 dash-b px-3">
          <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} label="Select page"
            onChange={() => setSelected((s) => { const n = new Set(s); shown.forEach((a) => (allOnPage ? n.delete(a.id) : n.add(a.id))); return n; })} />
          <Th icon={F.name}>Asset Name</Th><Th icon={F.type}>Asset Type</Th><Th icon={F.serial}>Serial ID</Th><Th icon={F.operational}>Operational</Th><Th icon={F.physical}>Physical</Th>
          <Th icon={F.status} className="justify-end pr-3">Actions</Th>
        </ResizableHeader>

        {/* Body */}
        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                {Array.from({ length: Math.max(1, Math.min(PER, shown.length || 8)) }).map((_, i) => (
                  <div key={i} className="grid items-center h-12 border-b border-line px-3" style={{ ...cols.style, opacity: 1 - i * 0.07 }}>
                    <Skeleton className="size-4" /><span className="flex items-center gap-3"><Skeleton className="size-7" /><Skeleton className="h-3 w-28" /></span>
                    <Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24 ml-auto" />
                  </div>
                ))}
              </motion.div>
            ) : shown.length === 0 ? (
              <EmptyState key="empty" filtered={filtered} q={q} total={assets.length}
                onClear={() => { setQ(""); setFilters({}); }} onSearchAll={() => setFilters({})} onAdd={() => setForm({ asset: null })}
                onImport={() => { dispatch({ type: "registryEmpty", on: false }); toast({ title: "Imported procurement CSV", body: `${state.assets.length} assets restored`, tone: "good" }); load(700); }} />
            ) : (
              <motion.div key={`page-${p}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                <AnimatePresence initial={false} mode="popLayout">
                  {shown.map((a, i) => {
                    const sel = selected.has(a.id);
                    return (
                      <motion.div key={a.id} {...rowMotion(i)} onClick={() => setParam("asset", a.id)} style={cols.style}
                        className={cn("group relative grid items-center h-12 border-b border-line px-3 cursor-pointer transition-colors duration-[120ms]",
                          sel ? "bg-brand-50" : "hover:bg-tint", flash === a.id && "bg-good-soft/50")}>
                        <Checkbox checked={sel} onChange={() => toggle(a.id)} label={`Select ${a.name}`} />
                        <span className="flex items-center gap-3 min-w-0 pr-2"><Thumb src={a.photo} category={a.category} size={28} /><span className="text-[15px] font-medium truncate">{a.name}</span></span>
                        <span><CategoryChip category={a.category} /></span>
                        <span className="t-b1 tnum truncate pr-2">{a.serial}</span>
                        <span className={cn("t-b1", OPERATIONAL_TEXT[a.operational])}>{a.operational}</span>
                        <span className="t-b1">{a.condition}</span>
                        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <IconButton icon={Maximize2} label="Open details" onClick={() => setParam("asset", a.id)} className="text-ink" />
                          <IconButton icon={Send} label={`Issue ${formType(a)}`} onClick={() => issue(a)} className="text-brand-500 hover:bg-brand-50" />
                          <IconButton icon={Pencil} label="Edit" onClick={() => setForm({ asset: a })} className="text-good-text hover:bg-good-soft/40" />
                          <IconButton icon={Trash2} label="Delete" onClick={() => remove([a.id])} className="text-bad-text hover:bg-bad-soft/40" />
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </TableScroll>

        {/* Footer */}
        {assets.length > 0 && (
          <>
            <button onClick={() => setForm({ asset: null })} aria-label="Add asset" className="group flex items-center h-12 w-full px-3 border-b border-line text-ink hover:bg-tint cursor-pointer transition-colors">
              <Plus size={18} /><span className="ml-3 t-b2 text-ink-2 opacity-0 group-hover:opacity-100 transition-opacity">Add asset</span>
            </button>
            <div className="flex items-center h-12 px-4 border-b border-line">
              <span className="text-[16px] font-semibold tnum">Showing {shown.length} of {rows.length}{filtered ? ` (filtered from ${assets.length})` : ""}</span>
              <span className="ml-auto text-[16px] font-semibold tnum">Total: <motion.span key={pageTotal} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>{phpExact(pageTotal)}</motion.span></span>
            </div>
          </>
        )}
      </section>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())} actions={[
        { label: "Transfer assets", icon: Repeat, run: () => setTransfer([...selected]) },
        { label: "Generate PAR/ICS", icon: FileText, run: () => {
          const ids = [...selected]; const first = state.assets.find((a) => a.id === ids[0]);
          const holder = first?.custodianId; if (!holder) return;
          const formIds = issueForms(holder, ids.filter((id) => state.assets.find((a) => a.id === id)?.custodianId === holder));
          toast({ title: `${formIds.length} form${formIds.length > 1 ? "s" : ""} generated`, body: formIds.join(" • "), tone: "good" });
          router.push(`/forms/${formIds[0]}`);
        } },
        { label: "Export", run: () => exportRows(state.assets.filter((a) => selected.has(a.id))) },
        { label: "Delete", icon: Trash2, danger: true, run: () => remove([...selected]) },
      ]} />

      <AssetDrawer assetId={openId} onClose={() => setParam("asset", null)} onTransfer={(id) => setTransfer([id])} onEdit={(a) => setForm({ asset: a })} />
      <TransferModal open={!!transfer} assetIds={transfer ?? []} onClose={() => setTransfer(null)} onDone={() => setSelected(new Set())} />
      <DeleteAssetFlow assetIds={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setSelected(new Set()); setParam("asset", null); }} />
      <AssetFormModal open={!!form} asset={form?.asset ?? null} onClose={() => setForm(null)}
        onSaved={(a, isNew) => {
          if (isNew) { setQ(""); setFilters({}); setSort(null); setPage(1); }
          setFlash(a.id); setTimeout(() => setFlash(null), 1600);
          toast({ title: isNew ? `${a.name} registered` : `${a.name} updated`, body: isNew ? `${a.id} • ${formType(a)} applies` : "Changes saved to the registry", tone: "good" });
        }} />
    </>
  );
}

function EmptyState({ filtered, q, total, onClear, onSearchAll, onAdd, onImport }: {
  filtered: boolean; q: string; total: number; onClear: () => void; onSearchAll: () => void; onAdd: () => void; onImport: () => void;
}) {
  const { state } = useStore();
  const qMatches = q ? state.assets.filter((a) => `${a.name} ${a.serial} ${a.tag}`.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.page} className="py-16 text-center">
      <motion.span initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={T.spring}
        className={cn("inline-grid place-items-center size-14 rounded-xl", total === 0 ? "bg-brand-100 text-brand-600" : "bg-tint text-ink")}>
        {total === 0 ? <Plus size={22} /> : <Search size={20} />}
      </motion.span>
      {total === 0 ? (
        <>
          <h3 className="text-[20px] font-semibold mt-3">No assets registered yet</h3>
          <p className="t-b2 text-ink-2 max-w-[420px] mx-auto mt-1">Register your first asset, or import the procurement CSV to bring an existing inventory in. Every asset needs a custodian before it can be issued a PAR or ICS.</p>
          <div className="flex justify-center gap-2.5 mt-4"><Button variant="primary" onClick={onAdd}>Add Asset</Button><Button icon={Upload} onClick={onImport}>Import CSV</Button></div>
        </>
      ) : (
        <>
          <h3 className="text-[20px] font-semibold mt-3">No assets match these filters</h3>
          <p className="t-b2 text-ink-2 max-w-[440px] mx-auto mt-1">
            {q ? <>“{q}”{filtered ? " with the current filters" : ""} returns nothing.{qMatches.length > 0 && ` ${qMatches.length} of the ${total} assets match “${q}” — ${qMatches.map((a) => a.condition).filter((v, i, xs) => xs.indexOf(v) === i).join(", ")} condition.`}</> : "Try removing a filter to widen the search."}
          </p>
          <div className="flex justify-center gap-2.5 mt-4"><Button onClick={onClear}>Clear filters</Button>{q && <Button onClick={onSearchAll}>Search all assets</Button>}</div>
        </>
      )}
    </motion.div>
  );
}
