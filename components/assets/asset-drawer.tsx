"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { ArrowRightLeft, ArrowUpRight, Eye, FileText, Paperclip, Pencil, Printer, TrendingUp, Upload, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import { AGENCIES } from "@/lib/seed";
import { FIELD_ICON as F } from "@/lib/field-icons";
import { accumulated, ageMonths, bookValue, formType, monthly, warrantyActive } from "@/lib/selectors";
import { amount, deadline, DATE_TIER_CLASS, longDate, monthDay, php, phpExact, shortDate } from "@/lib/format";
import { AS_OF } from "@/lib/types";
import { CalendarPopup } from "@/components/ui/popups";
import { Avatar, Button, CategoryChip, PriorityPill } from "@/components/ui/primitives";
import { CloseButton, Drawer } from "@/components/ui/overlay";
import { EASE, T } from "@/components/ui/motion";
import { Barcode, QrCode } from "./codes";
import { OP_TONE, PH_TONE, RecordRow, RecordSection, StatusPill } from "./record";

type Tab = "Overview" | "Service" | "Value" | "Documents";
const TABS: { key: Tab; icon: LucideIcon }[] = [
  { key: "Overview", icon: Eye }, { key: "Service", icon: Wrench }, { key: "Value", icon: TrendingUp }, { key: "Documents", icon: Paperclip },
];
const CARD = "rounded-[14px] bg-white border border-line/80";

/** Asset Details — an entity header (photo, name, status, quick actions) over tabbed record sections. */
export function AssetDrawer({ assetId, onClose, onTransfer, onEdit }: { assetId: string | null; onClose: () => void; onTransfer: (id: string) => void; onEdit?: (a: Asset) => void }) {
  const L = useLookups();
  const a = assetId ? L.asset.get(assetId) : undefined;
  const [tab, setTab] = useState<Tab>("Overview");
  const [shown, setShown] = useState<string | null>(null);
  if (assetId !== shown) { setShown(assetId); if (assetId) setTab("Overview"); }

  return (
    <Drawer open={!!a} onClose={onClose} width={600} label="Asset details" className="bg-[#f4f4f4]">
      {a && (
        <>
          <header className="bg-white border-b border-line shrink-0">
            <div className="flex items-center gap-2 h-14 px-6">
              <p className="t-b2 text-ink-2">Asset details <span className="text-ink-3">/</span> <span className="tnum">{a.id}</span></p>
              <CloseButton onClick={onClose} className="ml-auto -mr-2" />
            </div>
            <div className="flex gap-4 px-6 pt-1 pb-5">
              <span className="size-[88px] shrink-0 rounded-[14px] overflow-hidden bg-tint">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo} alt={a.name} className="size-full object-cover" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="t-h4 truncate">{a.name}</h2>
                <p className="t-b2 text-ink-2 tnum truncate">{a.serial} · {a.tag}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <CategoryChip category={a.category} size="sm" />
                  <StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill>
                  <StatusPill size="sm" tone={PH_TONE[a.condition]}>{a.condition}</StatusPill>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-4">
              <Button size="sm" variant="primary" icon={ArrowRightLeft} onClick={() => onTransfer(a.id)} className="h-9 px-3.5">Transfer</Button>
              <Button size="sm" icon={Printer} onClick={() => window.print()} className="h-9 px-3.5">Print label</Button>
              {onEdit && <Button size="sm" icon={Pencil} onClick={() => onEdit(a)} className="h-9 px-3.5">Edit</Button>}
            </div>
            <div role="tablist" className="flex gap-1 px-4">
              {TABS.map(({ key, icon: I }) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={cn("relative flex items-center gap-1.5 h-10 px-3 text-[14px] cursor-pointer transition-colors duration-[120ms]", tab === key ? "text-ink font-medium" : "text-ink-2 hover:text-ink")}>
                  <I size={15} strokeWidth={1.75} />{key}
                  {tab === key && <motion.span layoutId="asset-tab" transition={T.spring} className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-brand-500" />}
                </button>
              ))}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto scroll-slim px-5 pb-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={T.swap} className="space-y-4 pt-5">
                {tab === "Overview" && <Overview id={a.id} />}
                {tab === "Service" && <Service id={a.id} />}
                {tab === "Value" && <Value id={a.id} />}
                {tab === "Documents" && <Documents id={a.id} onTransfer={() => onTransfer(a.id)} />}
              </motion.div>
            </AnimatePresence>
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
  const live = warrantyActive(a);
  return (
    <>
      <RecordSection title="Assignment">
        <RecordRow icon={F.custodian} label="Custodian" labelWidth={130}>
          {custodian ? (
            <Link href={`/employees?employee=${custodian.id}`} className="group flex items-center gap-2.5 min-w-0 -my-1 py-1 px-1.5 rounded-md hover:bg-tint transition-colors">
              <Avatar src={custodian.avatar} name={custodian.name} size={28} />
              <span className="min-w-0"><span className="block text-[15px] font-medium truncate group-hover:text-brand-600 transition-colors">{custodian.name}</span><span className="block t-b3 text-ink-2 truncate">{custodian.position}</span></span>
            </Link>
          ) : <span className="px-1.5 text-[15px] text-ink-3">Unassigned</span>}
        </RecordRow>
        <RecordRow icon={F.department} label="Department" labelWidth={130}><span className="px-1.5 text-[15px] truncate">{a.department}</span></RecordRow>
        <RecordRow icon={F.office} label="Office" labelWidth={130}><span className="px-1.5 text-[15px] truncate">DOST {a.office}</span></RecordRow>
        <RecordRow icon={F.location} label="Room / location" labelWidth={130}><span className="px-1.5 text-[15px] truncate">{a.room ?? "—"}</span></RecordRow>
        <RecordRow icon={F.address} label="Address" labelWidth={130}><span className="px-1.5 text-[15px] leading-snug py-1">{a.address ?? "—"}</span></RecordRow>
      </RecordSection>

      <RecordSection title="Acquisition">
        <RecordRow icon={F.value} label="Acquisition cost" labelWidth={130}><span className="px-1.5 text-[15px] font-medium tnum">{phpExact(a.cost).replace(".00", "")}</span><span className="ml-auto t-b3 text-ink-2">{formType(a)}</span></RecordRow>
        <RecordRow icon={F.date} label="Purchase date" labelWidth={130}><span className="px-1.5 text-[15px]">{longDate(a.acquiredOn)}</span></RecordRow>
        <RecordRow icon={F.agency} label="Agency" labelWidth={130}><span className="px-1.5 text-[15px] truncate"><span className="font-medium">{a.agency}</span><span className="text-ink-2"> — {agency?.name}</span></span></RecordRow>
        <RecordRow icon={F.warranty} label="Warranty" labelWidth={130}>
          <span className={cn("px-1.5 text-[15px]", live ? (a.warrantyEnd.startsWith("2026") ? "text-date-due" : "text-ink") : "text-date-over")}>{live ? "Until" : "Expired"} {longDate(a.warrantyEnd)}</span>
          {a.warrantyUrl && <a href={`https://${a.warrantyUrl}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 t-b3 text-brand-600 hover:underline">Claim <ArrowUpRight size={13} /></a>}
        </RecordRow>
      </RecordSection>

      <section className={cn(CARD, "px-5 py-4")}>
        <header className="flex items-center"><h3 className="t-l1 text-ink-2">Property label</h3><span className="ml-auto t-b3 text-ink-3">Scan to open this record</span></header>
        <div className="flex items-center gap-5 mt-3">
          <div className="p-1.5 rounded-lg border border-line shrink-0"><QrCode value={a.id} size={92} /></div>
          <div className="min-w-0 flex-1">
            <Barcode value={code} width={300} height={40} />
            <p className="t-b2 tnum tracking-[0.2em] mt-1.5 truncate">{code}</p>
            <p className="t-b3 text-ink-2 tnum mt-0.5">Tag {a.tag}</p>
          </div>
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
  const field = "w-full h-8 rounded-md bg-tint px-3.5 text-[14px] outline-none placeholder:text-ink-2 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-brand-200)] transition-[background-color,box-shadow]";
  const submit = () => {
    if (!date || !provider.trim()) { setErr(true); return; }
    dispatch({ type: "logService", assetId: id, date, cost: Number(cost.replace(/[^\d]/g, "")) || 0, provider: provider.trim(), description: desc.trim() });
    toast({ title: "Service logged", body: `${a.name} • ${provider.trim()}`, tone: "good" });
    setDate(null); setCost(""); setProvider(""); setDesc(""); setErr(false);
  };
  return (
    <>
      <section className={cn(CARD, "px-6 pt-6 pb-4")}>
        <h3 className="t-l1 text-ink-2">Log service</h3>
        <div className="grid grid-cols-2 gap-x-4 mt-3">
          <div className="relative">
            <button type="button" onClick={() => setCal((v) => !v)} className={cn(field, "flex items-center justify-between text-left cursor-pointer", err && !date && "shadow-[0_0_0_1px_var(--color-bad-text)]")}>
              <span className={date ? "text-ink" : "text-ink-2"}>{date ? longDate(date) : "Select Date"}</span><F.date size={14} strokeWidth={1.75} />
            </button>
            <CalendarPopup open={cal} onClose={() => setCal(false)} value={date ?? AS_OF} max={AS_OF} onDone={setDate} />
          </div>
          <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d,]/g, ""))} placeholder="COST (₱)" inputMode="numeric" className={cn(field, "text-[12px] placeholder:text-[12px]")} />
        </div>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Input Provider" className={cn(field, "mt-3", err && !provider.trim() && "shadow-[0_0_0_1px_var(--color-bad-text)]")} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add Description" rows={3} className={cn(field, "h-20 py-3 mt-3 resize-none")} />
        <button type="button" onClick={submit} className="w-full h-9 mt-4 rounded-md bg-brand-500 text-white text-[15px] font-medium hover:bg-brand-600 cursor-pointer transition-colors">Log service</button>
      </section>
      <section className={cn(CARD, "px-6 py-5")}>
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
        <section className={cn(CARD, "px-6 py-5")}>
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
      <section className={cn(CARD, "px-6 py-5")}>
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
      <section className={cn(CARD, "px-6 py-5")}>
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
