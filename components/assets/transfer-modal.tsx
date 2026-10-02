"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, ArrowRightLeft, Check, FileText, Info } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF } from "@/lib/types";
import type { Employee } from "@/lib/types";
import { formType } from "@/lib/selectors";
import { FIELD_ICON as F } from "@/lib/field-icons";
import { longDate, php } from "@/lib/format";
import { Avatar, Button, CategoryChip, Thumb } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { PersonPicker } from "@/components/ui/person-picker";
import { T } from "@/components/ui/motion";
import { RecordRow, RecordSection } from "./record";

const ADDRESS: Record<string, string> = {
  "Central Office": "DOST Compound, Bicutan, Taguig", "Regional Office VI": "Magsaysay Village, La Paz, Iloilo City",
  "Regional Office XI": "Friendship Rd, Dumanlas, Davao City", "Regional Office III": "Gov't Center, San Fernando, Pampanga", "Logistics Center": "Brgy. Sto. Tomas, Biñan, Laguna",
};
const first = (e?: Employee | null) => e?.name.split(" ")[0] ?? "";

/** Transfer Asset (4667:6703) — what moves, from whom, to whom, and what that changes. */
export function TransferModal({ open, assetIds, onClose, onDone }: { open: boolean; assetIds: string[]; onClose: () => void; onDone?: () => void }) {
  const { state, dispatch, toast, me, issueForms } = useStore();
  const router = useRouter();
  const L = useLookups();
  const assets = assetIds.map((id) => L.asset.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof L.asset.get>>[];
  const lead = assets[0];
  const [from, setFrom] = useState<Employee | undefined>(undefined);
  const pickDefault = (f?: Employee) => (me.id !== f?.id ? me : state.employees.find((e) => e.id !== f?.id && e.status === "Active")!);
  const [to, setTo] = useState<Employee>(me);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"form" | "saving" | "done">("form");
  const [key, setKey] = useState("");

  const k = assetIds.join(",") + open;
  if (k !== key) {
    // Freeze the starting custodian when the modal opens, so the From card does not flip after the transfer lands.
    const f = lead?.custodianId ? L.employee.get(lead.custodianId) : undefined;
    const t = pickDefault(f);
    setKey(k); setFrom(f); setTo(t); setLocation(ADDRESS[t.office] ?? ""); setNote(""); setPhase("form");
  }
  if (!lead) return null;

  const moving = assets.reduce((s, a) => s + a.cost, 0);
  const held = (id?: string) => state.assets.filter((a) => a.custodianId === id).reduce((s, a) => s + a.cost, 0);
  const done = phase === "done";
  // Once the transfer is stored, `held` already reflects it — show the before → after either way.
  const fromNow = from ? held(from.id) + (done ? moving : 0) : 0;
  const toNow = held(to.id) - (done ? moving : 0);
  const forms = [...new Set(assets.map(formType))];
  const formLabel = forms.join(" + ");

  const confirm = () => {
    setPhase("saving");
    setTimeout(() => {
      dispatch({ type: "transfer", assetIds, to: to.id, office: to.office, address: location.trim() || undefined, note: note.trim() || undefined });
      setPhase("done");
      onDone?.();
      toast({ title: assets.length > 1 ? `${assets.length} assets transferred` : `${lead.name} transferred`, body: `New custodian: ${to.name} • audit entry recorded`, tone: "good" });
    }, 700);
  };
  const issue = () => {
    const ids = issueForms(to.id, assetIds);
    onClose();
    if (ids[0]) router.push(`/forms/${ids[0]}`);
  };

  return (
    <Modal open={open} onClose={phase === "saving" ? () => {} : onClose} label="Transfer asset" className="w-[780px] max-w-[calc(100vw-48px)] rounded-[24px] bg-[#f4f4f4] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-7 py-5 bg-white border-b border-line shrink-0">
        <span className="grid place-items-center size-11 rounded-xl bg-brand-50 text-brand-600"><ArrowRightLeft size={20} strokeWidth={1.9} /></span>
        <div className="min-w-0">
          <h2 className="t-h5">Transfer asset{assets.length > 1 ? "s" : ""}</h2>
          <p className="t-b2 text-ink-2">Move accountability to another custodian · {longDate(AS_OF)}</p>
        </div>
        <CloseButton onClick={onClose} className="ml-auto -mr-2" />
      </header>

      <div className="flex-1 overflow-y-auto scroll-slim px-7 py-6 space-y-4">
        {/* What is moving */}
        <section className="flex items-center gap-4 rounded-[14px] bg-white border border-line/80 p-3 pr-5">
          <span className="relative shrink-0" style={{ width: 64 + Math.min(assets.length - 1, 2) * 14, height: 64 }}>
            {assets.slice(0, 3).reverse().map((a, i, arr) => (
              <span key={a.id} className="absolute top-0 rounded-[10px] ring-2 ring-white overflow-hidden" style={{ left: (arr.length - 1 - i) * 14 }}>
                <Thumb src={a.photo} category={a.category} size={64} className="rounded-[10px]" />
              </span>
            ))}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold truncate">{lead.name}{assets.length > 1 && <span className="text-ink-2 font-medium"> +{assets.length - 1} more</span>}</p>
            <p className="t-b2 text-ink-2 tnum truncate mt-0.5">{assets.length > 1 ? `${assets.length} assets` : `${lead.serial} · ${lead.tag}`}</p>
          </div>
          {assets.length === 1 && <CategoryChip category={lead.category} size="sm" />}
          <div className="text-right shrink-0">
            <p className="t-l1 text-ink-2">Value</p>
            <p className="text-[17px] font-semibold tnum">{php(moving)}</p>
          </div>
        </section>

        {/* From → To */}
        <section className="grid grid-cols-[1fr_40px_1fr] items-stretch gap-2">
          <div className="rounded-[14px] bg-white border border-line/80 p-4">
            <p className="t-l1 text-ink-2">From</p>
            <div className={cn("flex items-center gap-3 mt-3 transition-opacity duration-200", done && "opacity-50")}>
              {from ? <Avatar src={from.avatar} name={from.name} size={44} /> : <span className="size-11 rounded-full border border-dashed border-ink-3 shrink-0" />}
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold truncate">{from?.name ?? "Unassigned"}</span>
                <span className="block t-b3 text-ink-2 truncate mt-0.5">{from ? `${from.position} · ${from.office}` : "Not currently issued to anyone"}</span>
              </span>
            </div>
            {from && <Accountable before={fromNow} after={fromNow - moving} />}
          </div>

          <div className="grid place-items-center">
            <motion.span animate={phase === "saving" ? { x: [0, 5, 0] } : { x: 0 }} transition={phase === "saving" ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : T.state}
              className={cn("grid place-items-center size-9 rounded-full transition-colors duration-200", done ? "bg-good-text text-white" : "bg-brand-500 text-white")}>
              {done ? <Check size={18} strokeWidth={2.75} /> : <ArrowRight size={18} strokeWidth={2.25} />}
            </motion.span>
          </div>

          <div className={cn("rounded-[14px] border p-4 transition-colors duration-200", done ? "bg-good-soft/30 border-good-solid/50" : "bg-white border-line/80")}>
            <p className="t-l1 text-ink-2">To</p>
            <div className="mt-2 -mx-1.5">
              <PersonPicker variant="card" disabled={phase !== "form"} value={to} exclude={from?.id}
                onChange={(e) => { setTo(e); setLocation(ADDRESS[e.office] ?? location); }} />
            </div>
            <Accountable before={toNow} after={toNow + moving} up />
          </div>
        </section>

        <AnimatePresence initial={false} mode="wait">
          {done ? (
            <motion.section key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.overlay}
              className="rounded-[14px] bg-white border border-line/80 px-6 py-6 flex items-center gap-5">
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={T.spring} className="grid place-items-center size-14 shrink-0 rounded-full bg-good-soft text-good-text"><Check size={28} strokeWidth={2.5} /></motion.span>
              <div className="min-w-0">
                <h3 className="t-h5">Transfer recorded</h3>
                <p className="t-b2 text-ink-2 mt-1">{to.name} is now accountable for {assets.length > 1 ? `${assets.length} assets` : lead.name}. Both custodian records and the audit log are updated. Issue the {formLabel} so {first(to)} can sign for {assets.length > 1 ? "them" : "it"}.</p>
              </div>
            </motion.section>
          ) : (
            <motion.div key="form" exit={{ opacity: 0 }} transition={T.state} className="space-y-4">
              <RecordSection title="Handover details">
                <RecordRow icon={F.location} label="New location">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Building, room or address"
                    className="w-full h-9 rounded-md px-2.5 bg-transparent text-[15px] outline-none placeholder:text-ink-3 transition-[background-color,box-shadow] duration-[120ms] hover:bg-tint focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-brand-400),0_0_0_3px_var(--color-brand-100)]" />
                </RecordRow>
                <RecordRow icon={F.department} label="Department"><span className="px-2.5 text-[15px] truncate">{to.department}</span></RecordRow>
                <RecordRow icon={F.office} label="Office"><span className="px-2.5 text-[15px] truncate">DOST {to.office}</span></RecordRow>
                <RecordRow icon={F.employeeId} label="Employee number"><span className="px-2.5 text-[15px] tnum">{to.id}</span></RecordRow>
                <RecordRow icon={F.notes} label="Reason">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional — e.g. reassigned to the regional office"
                    className="w-full h-9 rounded-md px-2.5 bg-transparent text-[15px] outline-none placeholder:text-ink-3 transition-[background-color,box-shadow] duration-[120ms] hover:bg-tint focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-brand-400),0_0_0_3px_var(--color-brand-100)]" />
                </RecordRow>
              </RecordSection>
              <p className="flex gap-3 rounded-[12px] bg-brand-50 border border-brand-100 px-4 py-3 t-b2 text-ink">
                <Info size={18} strokeWidth={1.75} className="shrink-0 mt-px text-brand-600" />
                <span>Accountability moves with the asset. {from ? <>It leaves {first(from)}’s {formLabel}</> : <>It enters custody</>} and {first(to)} signs a new {formLabel} once you issue it. The audit log records the handover on {longDate(AS_OF)}.</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex items-center gap-2.5 px-7 h-[68px] bg-white border-t border-line shrink-0">
        {done ? (
          <>
            <Button variant="soft" icon={FileText} onClick={issue} className="h-10 px-4">Issue {formLabel} to {first(to)}</Button>
            <Button variant="primary" onClick={onClose} className="ml-auto h-10 px-5">Done</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={phase === "saving"} className="ml-auto h-10 px-4">Cancel</Button>
            <Button variant="primary" icon={ArrowRightLeft} loading={phase === "saving"} onClick={confirm} className="h-10 px-4">Transfer {assets.length > 1 ? `${assets.length} assets` : "asset"}</Button>
          </>
        )}
      </footer>
    </Modal>
  );
}

function Accountable({ before, after, up }: { before: number; after: number; up?: boolean }) {
  return (
    <p className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line t-b3 text-ink-2 tnum">
      Accountable <span className="ml-auto">{php(before)}</span>
      <ArrowRight size={12} strokeWidth={2} />
      <span className={cn("font-semibold", up ? "text-good-text" : "text-ink")}>{php(Math.max(0, after))}</span>
    </p>
  );
}
