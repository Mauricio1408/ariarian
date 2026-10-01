"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FileText } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CAPITALISATION_THRESHOLD } from "@/lib/types";
import { longDate, monthDay, php, shortDate } from "@/lib/format";
import { Avatar, Button, Pill } from "@/components/ui/primitives";
import { CloseButton, Drawer } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

type Tab = "assets" | "forms" | "history";

export function EmployeeDrawer({ employeeId, onClose, onTransfer, onEdit }: { employeeId: string | null; onClose: () => void; onTransfer: (assetIds: string[]) => void; onEdit: (id: string) => void }) {
  const { state, issueForms, toast, dispatch } = useStore();
  const L = useLookups();
  const router = useRouter();
  const e = employeeId ? L.employee.get(employeeId) : undefined;
  const [tab, setTab] = useState<Tab>("assets");
  const [shown, setShown] = useState<string | null>(null);
  if (employeeId !== shown) { setShown(employeeId); setTab("assets"); }

  const held = e ? state.assets.filter((a) => a.custodianId === e.id).sort((a, b) => b.cost - a.cost) : [];
  const total = held.reduce((s, a) => s + a.cost, 0);
  const forms = e ? state.forms.filter((f) => f.employeeId === e.id) : [];
  const history = e ? state.audit.filter((x) => x.byId === e.id || held.some((a) => a.id === x.assetId)).slice(0, 12) : [];

  const generate = () => {
    if (!e || !held.length) return;
    const ids = issueForms(e.id);
    toast({ title: ids.length > 1 ? "PAR and ICS generated" : `${ids[0].includes("PAR") ? "PAR" : "ICS"} generated`, body: `${held.filter((a) => a.cost >= CAPITALISATION_THRESHOLD).length} items on PAR • ${held.filter((a) => a.cost < CAPITALISATION_THRESHOLD).length} on ICS`, tone: "good" });
    router.push(`/forms/${ids[0]}`);
  };

  return (
    <Drawer open={!!e} onClose={onClose} width={480} label="Employee">
      {e && (
        <>
          <header className="px-6 pt-8 pb-5 border-b border-line">
            <div className="flex items-center"><p className="t-b1 text-ink-2">Employee</p><CloseButton onClick={onClose} className="ml-auto -mr-2" /></div>
            <div className="flex items-center gap-4 mt-4">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={T.spring}><Avatar src={e.avatar} name={e.name} size={64} /></motion.div>
              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold leading-tight">{e.name}</h2>
                <p className="t-b2">{e.position} • {e.office}</p>
                <p className="t-b3 text-ink-2">{e.id} • {e.email}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Pill tone={e.status === "Active" ? "good" : e.status === "Clearance" ? "bad" : "warn"} className="h-8 px-3 text-[14px] rounded-full">{e.status}</Pill>
              {held.length > 0 && <Pill tone="neutral" className="h-8 px-3 text-[14px] text-ink bg-tint border-0 rounded-full">Property custodian</Pill>}
            </div>
            {e.status === "Clearance" && (
              <div className="mt-4 rounded-lg bg-bad-soft/40 px-3 py-2.5 t-b3 text-bad-text flex items-center gap-3">
                <span className="flex-1">{held.length ? `Clearance closes when all ${held.length} assets are transferred — deadline ${monthDay(e.clearanceDeadline ?? "2026-03-27")}.` : "All assets returned. Clearance can be closed."}</span>
                {held.length === 0 && <Button size="sm" variant="primary" onClick={() => { dispatch({ type: "upsertEmployee", employee: { ...e, status: "Active" }, isNew: false }); toast({ title: `${e.name} cleared`, tone: "good" }); }}>Close clearance</Button>}
              </div>
            )}
          </header>
          <div className="grid grid-cols-3 px-4 py-4 border-b border-line">
            <div><p className="t-b3 text-ink-2">Assets</p><p className="text-[20px] font-semibold tnum">{held.length}</p></div>
            <div><p className="t-b3 text-ink-2">Accountable value</p><p className="text-[20px] font-semibold tnum">{php(total)}</p></div>
            <div><p className="t-b3 text-ink-2">Last audit</p><p className="text-[20px] font-semibold">{shortDate(e.lastAudit ?? "2026-03-01")}</p></div>
          </div>
          <div className="flex gap-6 px-6 border-b border-line">
            {([["assets", `Assets (${held.length})`], ["forms", "Property forms"], ["history", "History"]] as [Tab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn("relative h-11 t-b2 cursor-pointer transition-colors", tab === k ? "text-ink font-medium" : "text-ink-2 hover:text-ink")}>
                {l}{tab === k && <motion.span layoutId="emp-tab" transition={T.spring} className="absolute left-0 right-0 bottom-0 h-[2px] bg-ink rounded-full" />}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto scroll-slim">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={T.swap}>
                {tab === "assets" && (
                  <>
                    {held.length === 0 && <p className="px-6 py-10 text-center t-b2 text-ink-2">No assets in {e.name.split(" ")[0]}&apos;s name.</p>}
                    {held.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.state, delay: i * 0.03 }}>
                        <Link href={`/assets?asset=${a.id}`} className="flex items-center px-6 h-16 border-b border-line hover:bg-tint transition-colors">
                          <span><span className="block text-[15px]">{a.name}</span><span className="block t-b3 text-ink-2">{a.serial} • {a.category}</span></span>
                          <span className="ml-auto text-right"><span className="block text-[15px] tnum">{php(a.cost)}</span><span className="block t-b3 text-ink-2">{a.condition}</span></span>
                        </Link>
                      </motion.div>
                    ))}
                    {held.length > 0 && (
                      <div className="flex items-center px-6 h-[44px] bg-n-500 text-white"><span className="text-[15px] font-semibold uppercase">Total accountable</span><span className="ml-auto text-[15px] font-semibold tnum">{php(total)}</span></div>
                    )}
                  </>
                )}
                {tab === "forms" && (
                  <div className="p-6 space-y-2">
                    {forms.length === 0 && <p className="t-b2 text-ink-2">No PAR or ICS issued yet.</p>}
                    {forms.map((f) => (
                      <Link key={f.id} href={`/forms/${f.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 hover:border-ink-3 hover:bg-tint transition-colors">
                        <FileText size={20} className="text-brand-600" />
                        <span><span className="block t-b2s">{f.type} • {f.assetIds.length} item{f.assetIds.length > 1 ? "s" : ""}</span><span className="block t-b3 text-ink-2">{f.id} • {longDate(f.issuedOn)}</span></span>
                      </Link>
                    ))}
                  </div>
                )}
                {tab === "history" && (
                  <ol className="p-6 space-y-3">
                    {history.length === 0 && <p className="t-b2 text-ink-2">No activity recorded.</p>}
                    {history.map((h) => (
                      <li key={h.id} className="flex gap-3 t-b2"><span className="size-2 rounded-full bg-brand-500 mt-1.5 shrink-0" /><span><b className="font-medium">{h.action}</b> {L.asset.get(h.assetId)?.name ?? "asset"}{h.note ? ` — ${h.note}` : ""}<span className="block t-b3 text-ink-2">{shortDate(h.date)} • by {L.employee.get(h.byId)?.name}</span></span></li>
                    ))}
                  </ol>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <footer className="flex gap-2.5 px-6 py-5 border-t border-line">
            <Button variant="primary" className="flex-1 h-10" disabled={!held.length} onClick={() => onTransfer(held.map((a) => a.id))}>Transfer assets</Button>
            <Button className="flex-1 h-10" disabled={!held.length} onClick={generate}>Generate PAR / ICS</Button>
            <Button className="flex-1 h-10" onClick={() => onEdit(e.id)}>Edit</Button>
          </footer>
        </>
      )}
    </Drawer>
  );
}
