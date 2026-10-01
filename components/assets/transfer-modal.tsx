"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Hash, MapPin, Repeat, Shield, User, X } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF } from "@/lib/types";
import type { Employee } from "@/lib/types";
import { longDate } from "@/lib/format";
import { Avatar, CategoryChip, Field } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

const DEPT: Record<string, string> = {
  "Central Office": "Administrative Service (AS)", "Regional Office VI": "Regional Operations — Western Visayas",
  "Regional Office XI": "Regional Operations — Davao", "Regional Office III": "Regional Operations — Central Luzon", "Logistics Center": "General Services Division",
};
const ADDRESS: Record<string, string> = {
  "Central Office": "DOST Compound, Bicutan, Taguig", "Regional Office VI": "Magsaysay Village, La Paz, Iloilo City",
  "Regional Office XI": "Friendship Rd, Dumanlas, Davao City", "Regional Office III": "Gov't Center, San Fernando, Pampanga", "Logistics Center": "Brgy. Sto. Tomas, Biñan, Laguna",
};

export function TransferModal({ open, assetIds, onClose, onDone }: { open: boolean; assetIds: string[]; onClose: () => void; onDone?: () => void }) {
  const { state, dispatch, toast, me } = useStore();
  const L = useLookups();
  const assets = assetIds.map((id) => L.asset.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof L.asset.get>>[];
  const lead = assets[0];
  const from = lead?.custodianId ? L.employee.get(lead.custodianId) : undefined;
  const defaultTo = me.id !== from?.id ? me : state.employees.find((e) => e.id !== from?.id && e.status === "Active")!;
  const [to, setTo] = useState<Employee>(defaultTo);
  const [location, setLocation] = useState(ADDRESS[defaultTo.office]);
  const [phase, setPhase] = useState<"form" | "saving" | "done">("form");
  const [key, setKey] = useState("");

  const k = assetIds.join(",") + open;
  if (k !== key) { setKey(k); setTo(defaultTo); setLocation(ADDRESS[defaultTo.office]); setPhase("form"); }

  if (!lead) return null;
  const hero = lead.name.startsWith("MacBook") ? "/img/assets/macbook-hero.png" : lead.photo;

  const confirm = () => {
    setPhase("saving");
    setTimeout(() => {
      dispatch({ type: "transfer", assetIds, to: to.id, office: to.office, address: location });
      setPhase("done");
      setTimeout(() => {
        onClose(); onDone?.();
        toast({ title: assets.length > 1 ? `${assets.length} assets transferred` : `${lead.name} transferred`, body: `New custodian: ${to.name} • audit entry recorded`, tone: "good" });
      }, 1100);
    }, 700);
  };

  return (
    <Modal open={open} onClose={phase === "saving" ? () => {} : onClose} label="Transfer asset" className="w-[1200px] p-4 flex gap-8">
      {/* Visual panel */}
      <div className="relative w-[560px] h-[660px] shrink-0 rounded-[18px] overflow-hidden bg-ink">
        {hero ? (
          <motion.img src={hero} alt="" className="absolute inset-0 size-full object-cover" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }} />
        ) : <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-ink" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute left-6 right-6 bottom-6">
          <div className="flex items-center gap-4 mb-5">
            <AnimatePresence mode="popLayout">
              <motion.div key={from?.id ?? "none"} initial={{ opacity: 0, x: -10 }} animate={{ opacity: phase === "done" ? 0.35 : 1, x: 0 }} transition={T.state}>
                {from ? <Avatar src={from.avatar} name={from.name} size={84} ring /> : <span className="grid place-items-center size-[84px] rounded-full ring-[3px] ring-white bg-white/20 text-white text-[13px]">Unassigned</span>}
              </motion.div>
            </AnimatePresence>
            <motion.span animate={{ rotate: phase === "saving" ? 360 : phase === "done" ? 180 : 0 }} transition={phase === "saving" ? { duration: 0.8, repeat: Infinity, ease: "linear" } : T.spring} className="text-white">
              <Repeat size={30} strokeWidth={2} />
            </motion.span>
            <AnimatePresence mode="popLayout">
              <motion.div key={to.id} initial={{ opacity: 0, scale: 0.6, x: 20 }} animate={{ opacity: 1, scale: phase === "done" ? 1.08 : 1, x: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={T.spring} className="relative">
                <Avatar src={to.avatar} name={to.name} size={84} ring />
                <AnimatePresence>{phase === "done" && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={T.spring} className="absolute -right-1 -bottom-1 grid place-items-center size-8 rounded-full bg-good-text text-white ring-[3px] ring-white"><Check size={18} strokeWidth={3} /></motion.span>
                )}</AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
          <h2 className="text-white text-[40px] font-semibold tracking-[-0.02em] leading-tight">{lead.name}{assets.length > 1 && <span className="text-white/70 text-[24px] font-medium"> +{assets.length - 1} more</span>}</h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="h-8 px-3 rounded-[4px] bg-white text-ink text-[15px] grid place-items-center">{lead.serial}</span>
            <span className="[&>span]:h-8 [&>span]:w-auto [&>span]:px-3 [&>span]:text-[15px] [&>span]:rounded-[4px]"><CategoryChip category={lead.category} /></span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col pr-6 py-12">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.overlay} className="m-auto text-center">
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={T.spring} className="inline-grid place-items-center size-20 rounded-full bg-good-soft text-good-text"><Check size={40} strokeWidth={2.5} /></motion.span>
              <h3 className="t-h3 mt-5">Transfer recorded</h3>
              <p className="t-b1 text-ink-2 mt-2">{to.name} is now accountable for {assets.length > 1 ? `${assets.length} assets` : lead.name}.<br />The audit log and both custodian records are updated.</p>
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0, x: -10 }} transition={T.state} className="flex flex-col h-full">
              <p className="t-b1 text-ink-2">{longDate(AS_OF)}</p>
              <h3 className="text-[40px] font-semibold tracking-[-0.02em] mt-1 mb-8">Transferring Asset{assets.length > 1 ? "s" : ""}</h3>
              <div className="space-y-5">
                <Field label="New Location" icon={MapPin} value={location} onChange={(e) => setLocation(e.target.value)} className="h-10 text-[18px] font-medium" />
                <EmployeePicker value={to} exclude={from?.id} onChange={(e) => { setTo(e); setLocation(ADDRESS[e.office]); }} />
                <Field label="Employee Number" icon={Hash} value={to.id} readOnly className="h-10 text-[18px] font-medium read-only:bg-white read-only:text-ink" />
                <Field label="Department" icon={Shield} value={DEPT[to.office] ?? to.office} readOnly className="h-10 text-[18px] font-medium read-only:bg-white read-only:text-ink" />
              </div>
              <div className="mt-auto flex justify-end gap-3 pt-8">
                <motion.button whileTap={{ scale: 0.97 }} onClick={confirm} disabled={phase === "saving"}
                  className="h-11 px-3 rounded-md bg-brand-100 text-brand-700 text-[20px] font-medium flex items-center gap-2 hover:bg-brand-200 cursor-pointer transition-colors disabled:opacity-70">
                  {phase === "saving" ? <span className="size-5 rounded-full border-2 border-current border-r-transparent animate-spin" /> : null}Confirm <Check size={20} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onClose} disabled={phase === "saving"}
                  className="h-11 px-3 rounded-md bg-bad-soft/70 text-bad-text text-[20px] font-medium flex items-center gap-2 hover:bg-bad-soft cursor-pointer transition-colors">
                  Cancel <X size={20} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

export function EmployeePicker({ value, onChange, exclude, label = "New Custodian / Assignee" }: { value: Employee; onChange: (e: Employee) => void; exclude?: string; label?: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(() => state.employees
    .filter((e) => e.id !== exclude && e.status !== "Clearance")
    .filter((e) => !q || `${e.name} ${e.id} ${e.office}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 7), [state.employees, q, exclude]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <span className="flex items-center gap-1.5 t-b2 text-ink-2 mb-1.5"><User size={15} strokeWidth={1.75} />{label}</span>
      <input value={open ? q : value.name} onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => setQ(e.target.value)} placeholder="Search staff by name or ID"
        className="w-full h-10 rounded-md border border-line bg-white px-3 text-[18px] font-medium text-ink focus:outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] transition-[border-color,box-shadow] duration-[120ms] hover:border-ink-3" />
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={T.state}
            className="absolute z-20 top-[calc(100%+6px)] left-0 right-0 rounded-xl bg-white shadow-overlay border border-line p-1.5 max-h-[300px] overflow-auto">
            {list.length === 0 && <li className="px-3 py-3 t-b2 text-ink-2">No staff match “{q}”.</li>}
            {list.map((e) => (
              <li key={e.id}>
                <button onClick={() => { onChange(e); setOpen(false); }}
                  className={cn("w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors duration-[120ms]", e.id === value.id ? "bg-brand-100" : "hover:bg-tint")}>
                  <Avatar src={e.avatar} name={e.name} size={30} />
                  <span className="min-w-0"><span className="block t-b2s">{e.name}</span><span className="block t-b3 text-ink-2 truncate">{e.id} • {e.position} • {e.office}</span></span>
                  {e.id === value.id && <Check size={16} className="ml-auto text-brand-600" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
