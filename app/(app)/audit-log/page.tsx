"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { shortDate } from "@/lib/format";
import { useExport } from "@/lib/use-export";
import { Page } from "@/components/shell/topbar";
import { Thumb } from "@/components/ui/primitives";
import { ExportButton } from "@/components/ui/table";
import { ChoiceButton, RecordCard, RecordDivider, RecordSearch } from "@/components/ui/record-kit";
import { AssetReadOnlyModal } from "@/components/assets/asset-panels";
import { T } from "@/components/ui/motion";

/**
 * 03 — Equipment Audit Log (Figma 4773:8059). The feed holds asset registrations only — dated source
 * records with the registering officer. Transfers, repairs and status changes stay in the store (they
 * feed the employee history) but are not inferred into this log.
 */
export default function AuditLogPage() {
  const { state } = useStore();
  const L = useLookups();
  const doExport = useExport();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [office, setOffice] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const records = useMemo(() => state.audit
    .filter((e) => e.action === "Registered")
    .map((e) => ({ e, a: L.asset.get(e.assetId), by: L.employee.get(e.byId) }))
    .sort((x, y) => y.e.date.localeCompare(x.e.date)), [state.audit, L]);

  const years = useMemo(() => [...new Set(records.map(({ e }) => e.date.slice(0, 4)))], [records]);
  const offices = useMemo(() => [...new Set(records.map(({ by }) => by?.office).filter(Boolean) as string[])].sort(), [records]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records.filter(({ e, a, by }) =>
      (!needle || `${a?.name} ${a?.serial} ${a?.tag} ${by?.name} ${by?.position}`.toLowerCase().includes(needle)) &&
      (!year || e.date.startsWith(year)) && (!office || by?.office === office));
  }, [records, q, year, office]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => { const y = r.e.date.slice(0, 4); m.set(y, [...(m.get(y) ?? []), r]); });
    return [...m.entries()];
  }, [rows]);

  const span = years.length ? `${years[years.length - 1]}–${years[0]}` : "—";

  return (
    <Page crumb="Audit Log" icon={Clock}>
      <RecordCard className="p-5">
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-deep">Equipment Audit Log</h1>
        <p className="t-b2 text-ink-2 mt-2">Asset registration records · Dates and registering officers from the source records</p>
      </RecordCard>

      <div className="flex items-center gap-3 mt-6">
        <RecordSearch value={q} onChange={setQ} placeholder="Search assets, serial IDs, or registering officers" className="flex-1" />
        <ChoiceButton label="Registration date" value={year} options={years} onPick={setYear} align="right" />
        <ExportButton record label="Export records" onPick={(fmt) => doExport("audit-log", ["Registered on", "Asset", "Serial", "Property No.", "Registered by", "Position", "Office"],
          rows.map(({ e, a, by }) => [e.date, a?.name ?? e.assetId, a?.serial ?? "", e.assetId, by?.name ?? "", by?.position ?? "", by?.office ?? ""]), fmt)} />
      </div>

      <div className="flex gap-5 items-start mt-6">
        {/* Chronological registration feed */}
        <div className="flex-[0_1_744px] min-w-0">
          <RecordCard className="px-4">
            <AnimatePresence initial={false} mode="popLayout">
              {groups.map(([y, list]) => (
                <motion.div key={y} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state}>
                  <p className="h-7 flex items-end text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3] text-brand-700">{y} / Asset registrations</p>
                  {list.map(({ e, a, by }) => (
                    <button key={e.id} type="button" onClick={() => a && setViewing(a.id)} disabled={!a}
                      className="relative w-full flex items-center gap-3 h-[61px] border-b border-rule text-left cursor-pointer disabled:cursor-default hover:bg-tint transition-colors duration-[120ms]">
                      {e.fresh && <motion.span initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 2.4, delay: 0.4 }} className="absolute inset-0 bg-brand-100 pointer-events-none" />}
                      {a ? <Thumb src={a.photo} category={a.category} size={40} className="relative rounded-[6px]" /> : <span className="relative size-10 rounded-[6px] bg-rule" />}
                      <span className="relative flex-1 min-w-0 flex flex-col gap-[3px] leading-[1.4]">
                        <span className="text-[14px] font-medium text-deep truncate">{a ? `${a.name} · ${a.serial}` : "Removed asset"}</span>
                        <span className="text-[12px] text-ink-2 truncate">{by ? `${by.name} · ${by.position} · ${by.office}` : "Unknown officer"}</span>
                      </span>
                      <span className={cn("relative w-[92px] shrink-0 text-right text-[12px] leading-[1.4]", e.fresh ? "text-brand-600 font-medium" : "text-ink-2")}>
                        {e.fresh ? "Just now" : shortDate(e.date)}
                      </span>
                    </button>
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
            {rows.length === 0 && (
              <p className="py-12 text-center t-b2 text-ink-2">No registrations match{q ? <> “{q}”</> : ""}{year ? ` in ${year}` : ""}{office ? ` at ${office}` : ""}.</p>
            )}
            <p className="h-[42px] flex items-center text-[12px] text-ink-2 leading-[1.4]">{rows.length} record{rows.length === 1 ? "" : "s"} shown · Newest first</p>
          </RecordCard>
        </div>

        {/* Registration context */}
        <div className="flex-1 min-w-[280px] flex flex-col gap-5">
          <RecordCard className="p-5 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">What these records show</h2>
            <p className="t-b2 text-ink-2">Each entry records an asset registration—not a transfer, repair or status change.</p>
            <RecordDivider />
            <p className="text-[12px] text-ink-2 leading-[1.4]">{records.length} dated source records · {span}</p>
          </RecordCard>
          <RecordCard className="p-5 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">Read the evidence</h2>
            <p className="text-[14px] font-medium text-deep leading-[1.4]">Asset → registering officer → date</p>
            <p className="t-b2 text-ink-2">Full roles are shown instead of inconsistent abbreviations.</p>
            <RecordDivider />
            <h2 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">No inferred history</h2>
            <p className="t-b2 text-ink-2">Transfers and condition changes are not added to this feed unless an event is evidenced.</p>
          </RecordCard>
          <RecordCard className="p-5 flex flex-col gap-4 leading-[1.4]">
            <p className="text-[12px] text-ink-2">OFFICE CONTEXT</p>
            {offices.map((o) => (
              <button key={o} type="button" onClick={() => setOffice(office === o ? null : o)} aria-pressed={office === o}
                className={cn("text-left text-[14px] cursor-pointer transition-colors duration-[120ms] hover:text-deep", office === o ? "text-brand-700 font-medium" : "text-ink-2")}>
                {o}
              </button>
            ))}
          </RecordCard>
        </div>
      </div>

      <AssetReadOnlyModal asset={viewing ? state.assets.find((x) => x.id === viewing) : undefined} onClose={() => setViewing(null)} />
    </Page>
  );
}
