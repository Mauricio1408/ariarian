"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Briefcase, Calendar, FileText, MapPin, Paperclip, PhilippinePeso, Repeat, Shield, Tag, TrendingUp, Upload, Wrench, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AGENCIES } from "@/lib/seed";
import { accumulated, ageMonths, bookValue, formType, monthly } from "@/lib/selectors";
import { amount, deadline, DATE_TIER_CLASS, longDate, monthDay, php, phpExact, shortDate } from "@/lib/format";
import { AS_OF } from "@/lib/types";
import { CalendarPopup } from "@/components/ui/popups";
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
          <div className="flex-1 overflow-y-auto scroll-slim px-5 pb-5">
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

/** Figma "Asset Details - Service" (957:3443): a Log Service form, then the service history. */
function Service({ id }: { id: string }) {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();
  const a = L.asset.get(id)!;
  const [date, setDate] = useState<string | null>(null);
  const [cost, setCost] = useState("");
  const [provider, setProvider] = useState("");
  const [desc, setDesc] = useState("");
  const [cal, setCal] = useState(false);
  const [err, setErr] = useState(false);
  const wos = state.workOrders.filter((w) => w.assetId === id).sort((x, y) => y.reportedOn.localeCompare(x.reportedOn));
  const field = "w-full h-8 rounded-[4px] bg-tint px-5 text-[14px] outline-none placeholder:text-ink-2 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-brand-200)] transition-[background-color,box-shadow]";
  const submit = () => {
    if (!date || !provider.trim()) { setErr(true); return; }
    dispatch({ type: "logService", assetId: id, date, cost: Number(cost.replace(/[^\d]/g, "")) || 0, provider: provider.trim(), description: desc.trim() });
    toast({ title: "Service logged", body: `${a.name} • ${provider.trim()}`, tone: "good" });
    setDate(null); setCost(""); setProvider(""); setDesc(""); setErr(false);
  };
  return (
    <>
      <section className="card-raised px-6 pt-6 pb-4">
        <h3 className="text-[16px] font-medium px-5">Log Service</h3>
        <div className="grid grid-cols-2 gap-x-16 mt-3">
          <div className="relative">
            <button type="button" onClick={() => setCal((v) => !v)} className={cn(field, "flex items-center justify-between text-left cursor-pointer", err && !date && "shadow-[0_0_0_1px_var(--color-bad-text)]")}>
              <span className={date ? "text-ink" : "text-ink-2"}>{date ? longDate(date) : "Select Date"}</span><Calendar size={13} />
            </button>
            <CalendarPopup open={cal} onClose={() => setCal(false)} value={date ?? AS_OF} max={AS_OF} onDone={setDate} />
          </div>
          <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d,]/g, ""))} placeholder="COST (₱)" inputMode="numeric" className={cn(field, "text-[12px] placeholder:text-[12px]")} />
        </div>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Input Provider" className={cn(field, "mt-6", err && !provider.trim() && "shadow-[0_0_0_1px_var(--color-bad-text)]")} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add Description" rows={3} className={cn(field, "h-20 py-3 mt-6 resize-none")} />
        <button type="button" onClick={submit} className="w-full h-9 mt-5 rounded-[4px] bg-brand-100 text-[16px] hover:bg-brand-200 cursor-pointer transition-colors">Log Service</button>
      </section>
      <section className="card-raised px-6 py-5">
        <div className="flex items-center"><p className="t-l1 text-ink-2">Service history</p><Link href="/maintenance" className="ml-auto t-b3 text-brand-600 hover:underline">Open queue</Link></div>
        {wos.length === 0 && <p className="t-b2 text-ink-2 mt-4">No service on record.</p>}
        <ol className="relative mt-4 ml-2 border-l border-line">
          {wos.map((wo) => (
            <li key={wo.id} className="relative pl-6 pb-5 last:pb-0">
              <span className={cn("absolute -left-[6px] top-1.5 size-[11px] rounded-full ring-4 ring-white", wo.stage === "resolved" ? "bg-good-solid" : wo.stage === "in_repair" ? "bg-warn-solid" : "bg-bad-chart")} />
              <div className="flex items-center gap-2"><p className="t-b2s">{wo.summary}</p><span className="ml-auto"><PriorityPill p={wo.priority} /></span></div>
              <p className="t-b3 text-ink-2 mt-0.5">{wo.problem} • {wo.technician} • {monthDay(wo.reportedOn)}</p>
              <p className="t-b3 mt-0.5">{wo.stage === "resolved" ? <span className="text-good-text">Closed {monthDay(wo.closedOn!)}{wo.cost !== null ? ` • ${php(wo.cost)}` : ""}</span> : <span className={DATE_TIER_CLASS[deadline(wo.promisedOn).tier]}>{wo.stage === "in_repair" ? "In repair" : "Awaiting triage"} • {deadline(wo.promisedOn).label}</span>}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** Figma "Asset Details - Value" (973:3207): purchase · maintenance · TCO · value retained. */
function Value({ id }: { id: string }) {
  const { state } = useStore();
  const L = useLookups();
  const a = L.asset.get(id)!;
  const maint = state.workOrders.filter((w) => w.assetId === id).reduce((s, w) => s + (w.cost ?? 0), 0);
  const retained = bookValue(a) / a.cost;
  const money = (n: number) => <span className="flex items-baseline gap-4"><span>₱</span><span className="tnum">{amount(n)}</span></span>;
  return (
    <>
      <div className="grid grid-cols-2 gap-5">
        <section className="card-raised px-6 py-5">
          <p className="text-[13px] tracking-[0.06em] uppercase text-ink-2">Purchase</p>
          <p className="text-[24px] font-semibold mt-2">{money(a.cost)}</p>
        </section>
        <section className="rounded-[16px] border-2 border-warn-solid/70 bg-warn-soft px-6 py-5">
          <p className="text-[13px] tracking-[0.06em] uppercase text-warn-text">Maintenance</p>
          <p className="text-[24px] font-semibold mt-2">{money(maint)}</p>
        </section>
      </div>
      <section className="rounded-[12px] bg-brand-200 px-6 h-20 flex items-center shadow-raised">
        <p className="text-[13px] uppercase">TCO (Ownership)</p>
        <p className="ml-auto text-[30px] font-semibold">{money(a.cost + maint)}</p>
      </section>
      <section className="card-raised px-6 py-5">
        <div className="flex items-end"><p className="text-[13px] tracking-[0.06em] uppercase text-ink-2 leading-tight">Value<br />retained</p><p className="ml-auto text-[14px] tnum">{Math.round(retained * 100)}%</p></div>
        <div className="h-2 rounded-full bg-brand-100 mt-2 overflow-hidden"><motion.div className="h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${retained * 100}%` }} transition={{ duration: 0.7, ease: EASE }} /></div>
        <dl className="mt-4">
          {([["Monthly depreciation", php(monthly(a))], ["Accumulated to date", php(accumulated(a))], ["Age", `${(ageMonths(a) / 12).toFixed(1)} years`], ["Form", formType(a) === "PAR" ? "PAR — capital asset" : "ICS — semi-expendable"]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex py-2 border-t border-line t-b2"><dt className="text-ink-2">{k}</dt><dd className="ml-auto tnum">{v}</dd></div>
          ))}
        </dl>
      </section>
    </>
  );
}

/** Figma "Asset Details - Documents" (974:3239): an invoice / warranty-card drop zone. */
function Documents({ id, onTransfer }: { id: string; onTransfer: () => void }) {
  const { state, dispatch, issueForms, toast } = useStore();
  const router = useRouter();
  const L = useLookups();
  const a = L.asset.get(id)!;
  const [over, setOver] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const forms = state.forms.filter((f) => f.assetIds.includes(id));
  const take = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setReading(f.name);
    setTimeout(() => {
      dispatch({ type: "attachDocument", assetId: id, name: f.name, size: f.size });
      setReading(null);
      toast({ title: "Document attached", body: `${f.name} • details extracted: ${a.serial}, warranty to ${shortDate(a.warrantyEnd)}`, tone: "good" });
    }, 1100);
  };
  return (
    <>
      <section
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={cn("card-raised h-[214px] grid place-items-center text-center cursor-pointer transition-[box-shadow,background-color] duration-200", over && "bg-brand-50 shadow-[inset_0_0_0_2px_var(--color-brand-300)]")}>
        <input ref={input} type="file" hidden accept=".pdf,image/*" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
        <div>
          {reading ? <span className="inline-block size-7 rounded-full border-2 border-brand-500 border-r-transparent animate-spin" /> : <Upload size={28} strokeWidth={1.5} className="mx-auto" />}
          <p className="text-[16px] mt-3">{reading ? `Reading ${reading}…` : "Drop invoice or warranty card"}</p>
          <p className="t-b3 text-ink-2 mt-1">AI will automatically extract details</p>
        </div>
      </section>
      <section className="card-raised px-6 py-5">
        <p className="t-l1 text-ink-2">Files</p>
        <div className="mt-3 space-y-2">
          {(a.documents ?? []).map((d) => (
            <div key={d.name + d.addedOn} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
              <Paperclip size={18} className="text-ink-2" /><span className="min-w-0"><span className="block t-b2s truncate">{d.name}</span><span className="block t-b3 text-ink-2">{Math.max(1, Math.round(d.size / 1024))} KB • {longDate(d.addedOn)}</span></span>
            </div>
          ))}
          {forms.map((f) => (
            <Link key={f.id} href={`/forms/${f.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:border-ink-3 hover:bg-tint transition-colors">
              <FileText size={18} className="text-brand-600" />
              <span><span className="block t-b2s">{f.type === "PAR" ? "Property Acknowledgement Receipt" : "Inventory Custodian Slip"}</span><span className="block t-b3 text-ink-2">{f.id} • {longDate(f.issuedOn)}</span></span>
            </Link>
          ))}
          {!forms.length && !(a.documents ?? []).length && <p className="t-b2 text-ink-2">No documents yet.</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="primary" disabled={!a.custodianId} onClick={() => {
            const ids = issueForms(a.custodianId!, [a.id]);
            toast({ title: `${formType(a)} generated`, body: ids[0], tone: "good" });
            router.push(`/forms/${ids[0]}`);
          }}>Generate {formType(a)}</Button>
          <Button onClick={onTransfer}>Transfer custodian</Button>
        </div>
      </section>
    </>
  );
}
