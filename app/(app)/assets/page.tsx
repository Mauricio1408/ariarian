"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Box, Plus, Search, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY, OPERATIONAL_STATUS } from "@/lib/types";
import type { Asset, AssetCategory, OperationalStatus } from "@/lib/types";
import { CATEGORY_ICON } from "@/components/ui/primitives";
import { formType } from "@/lib/selectors";
import { php } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page } from "@/components/shell/topbar";
import { Button, Skeleton, Thumb } from "@/components/ui/primitives";
import { ExportButton, FilterChips, type FilterValue } from "@/components/ui/table";
import { ChoiceButton, RecordCard, RecordHeading, RecordPagination, RecordSearch } from "@/components/ui/record-kit";
import { T } from "@/components/ui/motion";
import { AssetDrawer } from "@/components/assets/asset-drawer";
import { AssetReadOnlyModal, AssetSplitPanel } from "@/components/assets/asset-panels";
import { OP_TONE, StatusPill } from "@/components/assets/record";
import { TransferModal } from "@/components/assets/transfer-modal";
import { AssetFormModal, DeleteAssetFlow } from "@/components/assets/asset-form-modal";
import type { ExportFormat } from "@/lib/export";

const PER = 10;
// Column widths from Figma 4773:1908 (list) and 4773:2065 (split view).
const LIST_COLS = [108, 168, 150, 130, 72] as const;
const SPLIT_COLS = [110, 80] as const;

export default function AssetsPage() {
  return (
    <Page crumb="Asset Inventory" icon={Box}>
      <Suspense><Registry /></Suspense>
    </Page>
  );
}

function Registry() {
  const { state, dispatch, toast } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const doExport = useExport();

  const [q, setQ] = useState(params.get("q") ?? "");
  // Category and Status are the toolbar choices; agency and condition arrive from dashboard drill-downs.
  const [category, setCategory] = useState<AssetCategory | null>((params.get("category") as AssetCategory) ?? null);
  const [status, setStatus] = useState<OperationalStatus | null>((params.get("status") as OperationalStatus) ?? null);
  const [extra, setExtra] = useState<FilterValue>(() => {
    const f: FilterValue = {};
    if (params.get("agency")) f.agency = [params.get("agency")!];
    if (params.get("condition")) f.condition = [params.get("condition")!];
    return f;
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<string[] | null>(null);
  const [form, setForm] = useState<{ asset: Asset | null } | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const openId = params.get("asset");
  const selectedId = params.get("selected");

  // Loading skeleton (Figma 4773:5300) on first paint and on every page turn.
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
    return assets.filter((a) =>
      (!needle || `${a.name} ${a.serial} ${a.tag} ${a.id}`.toLowerCase().includes(needle)) &&
      (!category || a.category === category) &&
      (!status || a.operational === status) &&
      (!extra.condition?.length || extra.condition.includes(a.condition)) &&
      (!extra.agency?.length || extra.agency.includes(a.agency)));
  }, [assets, q, category, status, extra]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * PER, p * PER);
  const pageTotal = shown.reduce((s, a) => s + a.cost, 0);
  const selected = selectedId ? assets.find((a) => a.id === selectedId) : undefined;
  const split = !!selected;
  const custodian = state.role === "custodian";

  const clearAll = () => { setQ(""); setCategory(null); setStatus(null); setExtra({}); setPage(1); };
  const exportRows = (list: Asset[], fmt: ExportFormat = "csv") => doExport("asset-registry", ["Property No.", "Name", "Category", "Serial", "Operational", "Physical", "Agency", "Office", "Cost"],
    list.map((a) => [a.id, a.name, a.category, a.serial, a.operational, a.condition, a.agency, a.office, a.cost]), fmt);

  return (
    <>
      <RecordHeading title="Global Asset Registry"
        sub={`${assets.length} total assets · Last updated March 14, 2026`}
        right={<Button variant="primary" size="rec" onClick={() => setForm({ asset: null })}>Add asset</Button>} />

      {/* Search and filters */}
      <div className="flex items-center gap-3 mt-6">
        <RecordSearch value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by asset name, serial, or tag" className="flex-1" />
        <ChoiceButton label="Category" value={category} options={ASSET_CATEGORY} icons={CATEGORY_ICON} onPick={(v) => { setCategory(v); setPage(1); }} />
        <ChoiceButton label="Status" value={status} options={OPERATIONAL_STATUS} onPick={(v) => { setStatus(v); setPage(1); }} align="right" />
        <ExportButton record onPick={(f) => exportRows(rows, f)} />
      </div>
      <FilterChips value={extra} onChange={(v) => { setExtra(v); setPage(1); }} />

      <div className="flex gap-3 items-start mt-6">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <RecordCard>
            {/* Column labels */}
            <div className="flex items-center h-[42px] px-4 bg-head text-[12px] leading-[1.4] text-ink-2">
              <span className="flex-1 min-w-0">Asset</span>
              {split ? (
                <><span style={{ width: SPLIT_COLS[0] }}>Status</span><span style={{ width: SPLIT_COLS[1] }}>Condition</span></>
              ) : (
                <>
                  <span style={{ width: LIST_COLS[0] }}>Category</span><span style={{ width: LIST_COLS[1] }}>Serial ID</span>
                  <span style={{ width: LIST_COLS[2] }}>Operational status</span><span style={{ width: LIST_COLS[3] }}>Physical condition</span>
                  <span style={{ width: LIST_COLS[4] }}>Action</span>
                </>
              )}
            </div>

            <div className="relative min-h-[240px]">
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                    {Array.from({ length: Math.max(1, Math.min(PER, shown.length || 8)) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 h-[60px] px-4 border-b border-rule" style={{ opacity: 1 - i * 0.07 }}>
                        <Skeleton className="size-9 rounded-[8px]" /><Skeleton className="h-3 w-40" />
                        <span className="flex-1" /><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-3 w-16 ml-8" />
                      </div>
                    ))}
                  </motion.div>
                ) : shown.length === 0 ? (
                  <EmptyState key="empty" q={q} filtered={!!category || !!status || Object.values(extra).some((v) => v.length)} total={assets.length}
                    onClear={clearAll} onSearchAll={() => { setCategory(null); setStatus(null); setExtra({}); }} onAdd={() => setForm({ asset: null })}
                    onImport={() => { dispatch({ type: "registryEmpty", on: false }); toast({ title: "Imported procurement CSV", body: `${state.assets.length} assets restored`, tone: "good" }); load(700); }} />
                ) : (
                  <motion.div key={`page-${p}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    {shown.map((a) => {
                      const sel = selectedId === a.id;
                      return (
                        <div key={a.id} role="button" tabIndex={0} aria-pressed={sel}
                          onClick={() => setParam("selected", sel ? null : a.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setParam("selected", sel ? null : a.id); } }}
                          className={cn("flex items-center h-[60px] px-4 border-b border-rule cursor-pointer outline-none transition-colors duration-[120ms] focus-visible:bg-brand-50",
                            sel ? "bg-pick shadow-[inset_3px_0_0_var(--color-brand-500)]" : "bg-white hover:bg-tint", flash === a.id && "bg-good-soft/50")}>
                          <span className="flex-1 min-w-0 flex items-center gap-2.5 pr-3">
                            <Thumb src={a.photo} category={a.category} size={36} className="rounded-[8px]" />
                            <span className="min-w-0 flex flex-col gap-0.5 leading-[1.4]">
                              <span className="text-[14px] font-medium text-deep truncate">{a.name}</span>
                              {split && <span className="text-[12px] text-ink-2 truncate">{a.serial}</span>}
                            </span>
                          </span>
                          {split ? (
                            <>
                              <span style={{ width: SPLIT_COLS[0] }}><StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill></span>
                              <span style={{ width: SPLIT_COLS[1] }} className="text-[12px] text-deep">{a.condition}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ width: LIST_COLS[0] }} className="px-4 text-[14px] text-n-600 truncate">{a.category}</span>
                              <span style={{ width: LIST_COLS[1] }} className="px-4 text-[14px] text-n-600 truncate">{a.serial}</span>
                              <span style={{ width: LIST_COLS[2] }}><StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill></span>
                              <span style={{ width: LIST_COLS[3] }} className="text-[14px] text-deep">{a.condition}</span>
                              <button type="button" style={{ width: LIST_COLS[4] }} onClick={(e) => { e.stopPropagation(); setParam("asset", a.id); }}
                                className="text-left text-[14px] font-medium text-brand-700 hover:text-brand-800 hover:underline underline-offset-2 cursor-pointer">View →</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {assets.length > 0 && (
              <RecordPagination page={p} pages={pages} from={(p - 1) * PER + 1} to={(p - 1) * PER + shown.length} total={rows.length} noun="assets" per={PER}
                onPage={(n) => { setPage(n); load(); }} />
            )}
          </RecordCard>

          {assets.length > 0 && (
            <div className="flex items-start justify-between leading-[1.4]">
              <p className="text-[12px] text-ink-2">Visible-page value only · not the portfolio total</p>
              <motion.p key={pageTotal} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="text-[14px] font-medium text-deep tnum">{php(pageTotal)}</motion.p>
            </div>
          )}
        </div>

        <AssetSplitPanel asset={selected} onClose={() => setParam("selected", null)} onOpen={(id) => setParam("asset", id)} />
      </div>

      {custodian ? (
        <AssetReadOnlyModal asset={openId ? state.assets.find((a) => a.id === openId) : undefined} onClose={() => setParam("asset", null)} />
      ) : (
        <AssetDrawer assetId={openId} onClose={() => setParam("asset", null)} onTransfer={(id) => setTransfer([id])} onEdit={(a) => setForm({ asset: a })} onDelete={(a) => setDeleting([a.id])} />
      )}
      <TransferModal open={!!transfer} assetIds={transfer ?? []} onClose={() => setTransfer(null)} />
      <DeleteAssetFlow assetIds={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setParam("asset", null); }} />
      <AssetFormModal open={!!form} asset={form?.asset ?? null} onClose={() => setForm(null)}
        onSaved={(a, isNew) => {
          if (isNew) { clearAll(); }
          setFlash(a.id); setTimeout(() => setFlash(null), 1600);
          toast({ title: isNew ? `${a.name} registered` : `${a.name} updated`, body: isNew ? `${a.id} • ${formType(a)} applies` : "Changes saved to the registry", tone: "good" });
        }} />
    </>
  );
}

/** Empty registry (Figma 4773:4704) and No results (4773:5002), restyled into the record card. */
function EmptyState({ q, filtered, total, onClear, onSearchAll, onAdd, onImport }: {
  q: string; filtered: boolean; total: number; onClear: () => void; onSearchAll: () => void; onAdd: () => void; onImport: () => void;
}) {
  const { state } = useStore();
  const qMatches = q ? state.assets.filter((a) => `${a.name} ${a.serial} ${a.tag}`.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.page} className="py-16 px-6 text-center">
      <motion.span initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={T.spring}
        className={cn("inline-grid place-items-center size-12 rounded-[12px]", total === 0 ? "bg-brand-100 text-brand-600" : "bg-head border border-rule text-ink-2")}>
        {total === 0 ? <Plus size={20} /> : <Search size={19} />}
      </motion.span>
      {total === 0 ? (
        <>
          <h3 className="text-[20px] font-semibold text-deep mt-3">No assets registered yet</h3>
          <p className="t-b2 text-ink-2 max-w-[420px] mx-auto mt-1">Register your first asset, or import the procurement CSV to bring an existing inventory in. Every asset needs a custodian before it can be issued a PAR or ICS.</p>
          <div className="flex justify-center gap-3 mt-5"><Button variant="primary" size="rec" onClick={onAdd}>Add asset</Button><Button variant="record" size="rec" icon={Upload} onClick={onImport}>Import CSV</Button></div>
        </>
      ) : (
        <>
          <h3 className="text-[20px] font-semibold text-deep mt-3">No assets match these filters</h3>
          <p className="t-b2 text-ink-2 max-w-[440px] mx-auto mt-1">
            {q ? <>“{q}”{filtered ? " with the current filters" : ""} returns nothing.{qMatches.length > 0 && ` ${qMatches.length} of the ${total} assets match “${q}” — ${qMatches.map((a) => a.condition).filter((v, i, xs) => xs.indexOf(v) === i).join(", ")} condition.`}</> : "Try removing a filter to widen the search."}
          </p>
          <div className="flex justify-center gap-3 mt-5"><Button variant="record" size="rec" onClick={onClear}>Clear filters</Button>{q && filtered && <Button variant="record" size="rec" onClick={onSearchAll}>Search all assets</Button>}</div>
        </>
      )}
    </motion.div>
  );
}
