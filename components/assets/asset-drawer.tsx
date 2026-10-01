"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Briefcase, Calendar, FileText, MapPin, Paperclip, PhilippinePeso, Repeat, Shield, Tag, TrendingUp, Wrench, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AGENCIES } from "@/lib/seed";
import { accumulated, ageMonths, bookValue, formType, monthly } from "@/lib/selectors";
import { deadline, DATE_TIER_CLASS, longDate, monthDay, php, phpExact } from "@/lib/format";
import { Avatar, Button, OPERATIONAL_TEXT, PriorityPill } from "@/components/ui/primitives";
import { CloseButton, Drawer } from "@/components/ui/overlay";
import { EASE, T } from "@/components/ui/motion";
import { Barcode, QrCode } from "./codes";

type Tab = "Overview" | "Service" | "Value" | "Documents";
const TABS: { key: Tab; icon: LucideIcon }[] = [
  { key: "Overview", icon: Eye }, { key: "Service", icon: Wrench }, { key: "Value", icon: TrendingUp }, { key: "Documents", icon: Paperclip },
];

export function AssetDrawer({ assetId, onClose, onTransfer }: { assetId: string | null; onClose: () => void; onTransfer: (id: string) => void }) {
  const L = useLookups();
  const a = assetId ? L.asset.get(assetId) : undefined;
  const [tab, setTab] = useState<Tab>("Overview");
  const [shown, setShown] = useState<string | null>(null);
  if (assetId !== shown) { setShown(assetId); if (assetId) setTab("Overview"); }

  return (
    <Drawer open={!!a} onClose={onClose} width={582} label="Asset details" className="bg-tint">
      {a && (
        <>
          <header className="flex items-center h-[84px] px-10 dash-b bg-white shrink-0">
            <h2 className="text-[16px]">Asset Details</h2>
            <CloseButton onClick={onClose} className="ml-auto" />
          </header>
          <div className="flex justify-center gap-1 pt-4 pb-1 bg-white/0">
            {TABS.map(({ key, icon: I }) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn("relative flex items-center gap-1.5 h-9 px-4 text-[13px] cursor-pointer transition-colors duration-[120ms]", tab === key ? "text-brand-600" : "text-ink-2 hover:text-ink")}>
                <I size={14} strokeWidth={1.75} />{key}
                {tab === key && <motion.span layoutId="asset-tab" transition={T.spring} className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={T.swap} className="space-y-6 pt-2">
                {tab === "Overview" && <Overview id={a.id} />}
                {tab === "Service" && <Service id={a.id} />}
                {tab === "Value" && <Value id={a.id} />}
                {tab === "Documents" && <Documents id={a.id} onTransfer={() => onTransfer(a.id)} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="px-5 pb-5 pt-2 flex gap-3 shrink-0">
            <Button variant="outline" icon={Repeat} className="h-11" onClick={() => onTransfer(a.id)}>Transfer</Button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => window.print()}
              className="flex-1 h-11 rounded-md bg-brand-100 text-ink text-[16px] hover:bg-brand-200 cursor-pointer transition-colors duration-[120ms]">Print Label</motion.button>
          </div>
        </>
      )}
    </Drawer>
  );
}

function Overview({ id }: { id: string }) {
  const L = useLookups();
  const a = L.asset.get(id)!;
  const agency = AGENCIES.find((g) => g.code === a.agency);
  const custodian = a.custodianId ? L.employee.get(a.custodianId) : undefined;
  const code = a.category === "Vehicles" ? `VIN-${a.serial.replace(/\D/g, "").padStart(4, "5")}${a.id.slice(-3)}` : a.serial;
  const rows: { icon: LucideIcon; label: string; value: React.ReactNode; half?: boolean }[] = [
    { icon: Tag, label: "Asset tag", value: a.tag.replace(/-/g, " - ") },
    { icon: Shield, label: "Department", value: `${agency?.name} (${a.agency})` },
    { icon: Shield, label: "Agency", value: `${agency?.name} (${a.agency})` },
    { icon: Briefcase, label: "Office", value: a.office },
    { icon: MapPin, label: "Room/Location", value: a.room, half: true },
    { icon: Calendar, label: "Purchase date", value: <span className="text-ink-2">{longDate(a.acquiredOn)}</span>, half: true },
    { icon: PhilippinePeso, label: "Value", value: phpExact(a.cost).replace(".00", "") },
    { icon: MapPin, label: "Physical address", value: a.address },
  ];
  return (
    <>
      <section className="card-raised px-8 py-7">
        <h3 className="text-[24px] font-medium leading-tight">{a.name}</h3>
        <p className="text-[16px] text-ink-2 uppercase tracking-wide">{a.category}</p>
        <div className="flex items-end justify-between mt-4">
          <div className="p-1.5 rounded-md border border-line"><QrCode value={a.id} size={100} /></div>
          <div className="text-right">
            <div className="flex justify-end"><Barcode value={a.tag} width={128} height={32} /></div>
            <p className="text-[18px] font-medium tracking-[0.5em] mt-2">{a.category === "Vehicles" ? "VIN-" : a.serial.split("-")[0] + "-"}</p>
            <div className="mt-1"><Barcode value={code} width={258} height={32} /></div>
            <p className="text-[18px] font-medium tracking-[0.55em] tnum mt-1">{code.replace(/\D/g, "").split("").join("")}</p>
            <p className="text-[16px] text-ink-2 mt-1">{code}</p>
          </div>
        </div>
      </section>
      <section className="card-raised px-6 py-3">
        <div className="grid grid-cols-2">
          {rows.map((r, i) => (
            <motion.div key={r.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ ...T.state, delay: 0.05 + i * 0.03 }}
              className={cn("flex gap-4 py-4", r.half ? "col-span-1" : "col-span-2")}>
              <r.icon size={18} strokeWidth={1.75} className="text-ink mt-1 shrink-0" />
              <div className="min-w-0"><p className="text-[10.5px] uppercase tracking-wide leading-none">{r.label}</p><p className="text-[16px] leading-tight mt-0.5">{r.value}</p></div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-4 py-4 border-t border-line">
          {custodian ? <Avatar src={custodian.avatar} name={custodian.name} size={34} /> : <span className="size-[34px] rounded-full bg-line" />}
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide leading-none">Custodian</p>
            {custodian ? <Link href={`/employees?employee=${custodian.id}`} className="text-[16px] hover:text-brand-600 transition-colors">{custodian.name} <span className="text-ink-2 t-b2">• {custodian.position}</span></Link> : <p className="text-[16px] text-ink-2">Unassigned</p>}
          </div>
          <span className={cn("ml-auto t-b2s", OPERATIONAL_TEXT[a.operational])}>{a.operational}</span>
        </div>
      </section>
    </>
  );
}

function Service({ id }: { id: string }) {
  const { state } = useStore();
  const L = useLookups();
  const a = L.asset.get(id)!;
  const wos = state.workOrders.filter((w) => w.assetId === id).sort((x, y) => y.reportedOn.localeCompare(x.reportedOn));
  const w = deadline(a.warrantyEnd);
  return (
    <>
      <section className="card-raised px-6 py-5">
        <p className="t-l1 text-ink-2">Warranty</p>
        <div className="flex items-baseline mt-2"><p className="text-[20px] font-medium">{w.tier === "over" ? "Expired" : "Covered"} until {longDate(a.warrantyEnd)}</p></div>
        <p className={cn("t-b2 mt-1", DATE_TIER_CLASS[w.tier === "over" ? "over" : a.warrantyEnd.startsWith("2026") ? "due" : "past"])}>
          {w.tier === "over" ? "Repairs are now billable" : a.warrantyEnd.startsWith("2026") ? "Lapses this year — request renewal before Q4" : `Started ${longDate(a.warrantyStart)}`}
        </p>
      </section>
      <section className="card-raised px-6 py-5">
        <div className="flex items-center"><p className="t-l1 text-ink-2">Service history</p><Link href="/maintenance" className="ml-auto t-b3 text-brand-600 hover:underline">Open queue</Link></div>
        {wos.length === 0 && <p className="t-b2 text-ink-2 mt-4">No work orders on record. Last audited {monthDay(a.lastAudit ?? "2026-03-01")}.</p>}
        <ol className="relative mt-4 ml-2 border-l border-line">
          {wos.map((wo, i) => (
            <motion.li key={wo.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...T.state, delay: i * 0.05 }} className="relative pl-6 pb-5 last:pb-0">
              <span className={cn("absolute -left-[6px] top-1.5 size-[11px] rounded-full ring-4 ring-white", wo.stage === "resolved" ? "bg-good-solid" : wo.stage === "in_repair" ? "bg-warn-solid" : "bg-bad-chart")} />
              <div className="flex items-center gap-2"><p className="t-b2s">{wo.summary}</p><span className="ml-auto"><PriorityPill p={wo.priority} /></span></div>
              <p className="t-b3 text-ink-2 mt-0.5">{wo.problem} • {wo.technician} • reported {monthDay(wo.reportedOn)}</p>
              <p className="t-b3 mt-0.5">{wo.stage === "resolved" ? <span className="text-good-text">Closed {monthDay(wo.closedOn!)}{wo.cost !== null ? ` • ${php(wo.cost)}` : ""}</span> : <span className={DATE_TIER_CLASS[deadline(wo.promisedOn).tier]}>{wo.stage === "in_repair" ? "In repair" : "Awaiting triage"} • {deadline(wo.promisedOn).label}</span>}</p>
            </motion.li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Value({ id }: { id: string }) {
  const L = useLookups();
  const a = L.asset.get(id)!;
  const acc = accumulated(a), bv = bookValue(a), pct = acc / a.cost;
  const rows: [string, string][] = [
    ["Acquisition cost", php(a.cost)], ["Method", "Straight-line • 10 years"], ["Monthly depreciation", php(monthly(a))],
    ["Age", `${(ageMonths(a) / 12).toFixed(1)} years`], ["Accumulated to date", php(acc)], ["Form", formType(a) === "PAR" ? "PAR — capital asset" : "ICS — semi-expendable"],
  ];
  return (
    <section className="card-raised px-6 py-6">
      <p className="t-l1 text-ink-2">Net book value</p>
      <p className="text-[36px] font-bold tracking-[-0.02em] tnum mt-1">{php(bv)}</p>
      <div className="h-2.5 rounded-full bg-brand-100 mt-3 overflow-hidden"><motion.div className="h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${(1 - pct) * 100}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} /></div>
      <p className="t-b3 text-ink-2 mt-1.5">{Math.round(pct * 100)}% depreciated</p>
      <dl className="mt-5">
        {rows.map(([k, v]) => <div key={k} className="flex py-2.5 border-t border-line t-b2"><dt className="text-ink-2">{k}</dt><dd className="ml-auto tnum">{v}</dd></div>)}
      </dl>
    </section>
  );
}

function Documents({ id, onTransfer }: { id: string; onTransfer: () => void }) {
  const { state, issueForms, toast } = useStore();
  const router = useRouter();
  const L = useLookups();
  const a = L.asset.get(id)!;
  const forms = state.forms.filter((f) => f.assetIds.includes(id));
  return (
    <section className="card-raised px-6 py-5">
      <p className="t-l1 text-ink-2">Property forms</p>
      <p className="t-b3 text-ink-2 mt-1">At or above ₱50,000 → PAR. Below → ICS. This asset files on a <b className="text-ink">{formType(a)}</b>.</p>
      <div className="mt-4 space-y-2">
        {forms.length === 0 && <p className="t-b2 text-ink-2">No form issued yet.</p>}
        {forms.map((f) => (
          <Link key={f.id} href={`/forms/${f.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 hover:border-ink-3 hover:bg-tint transition-colors">
            <FileText size={20} className="text-brand-600" />
            <span><span className="block t-b2s">{f.type === "PAR" ? "Property Acknowledgement Receipt" : "Inventory Custodian Slip"}</span><span className="block t-b3 text-ink-2">{f.id} • {longDate(f.issuedOn)}</span></span>
          </Link>
        ))}
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="primary" disabled={!a.custodianId} onClick={() => {
          const ids = issueForms(a.custodianId!, [a.id]);
          toast({ title: `${formType(a)} generated`, body: ids[0], tone: "good" });
          router.push(`/forms/${ids[0]}`);
        }}>Generate {formType(a)}</Button>
        <Button onClick={onTransfer}>Transfer custodian</Button>
      </div>
    </section>
  );
}
