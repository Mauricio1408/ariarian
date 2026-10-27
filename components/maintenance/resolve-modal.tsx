"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Box, Check, CircleAlert, RefreshCw, Reply, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Asset, WorkOrder } from "@/lib/types";
import { Button, Thumb } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { RecordDivider } from "@/components/ui/record-kit";
import { T } from "@/components/ui/motion";

type Outcome = "storage" | "service";
type Phase = "form" | "saving" | "conflict" | "done";

const OUTCOME: Record<Outcome, { label: string; status: string; icon: LucideIcon; consequence: string }> = {
  storage: { label: "Move to storage", status: "Standby", icon: Box, consequence: "Keep the asset out of active use." },
  service: { label: "Return to service", status: "In Use", icon: Reply, consequence: "Make the asset available for active use." },
};

/** 05 — Resolve Issue (Figma 4773:7938) and 06 — Save Conflict (4773:8021). */
export function ResolveModal({ woId, onClose }: { woId: string | null; onClose: () => void }) {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();
  const wo = woId ? state.workOrders.find((w) => w.id === woId) : undefined;
  const asset = wo ? L.asset.get(wo.assetId) : undefined;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [refreshed, setRefreshed] = useState(false);
  const [shake, setShake] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  if (woId !== open) {
    setOpen(woId); setOutcome(null); setNote(""); setPhase("form"); setRefreshed(false);
  }

  const confirm = () => {
    if (!wo || !outcome) { setShake((n) => n + 1); return; }
    setPhase("saving");
    setTimeout(() => {
      // The seeded Canon iR2630 order was moved by someone else while this dialog was open.
      if (wo.conflict) { setPhase("conflict"); setShake((n) => n + 1); return; }
      dispatch({ type: "resolve", woId: wo.id, outcome, note: note.trim() });
      setPhase("done");
      setTimeout(() => {
        onClose();
        toast({ title: `${asset?.name} resolved`, body: outcome === "service" ? "Returned to service • In Use" : "Moved to storage • Standby", tone: "good" });
      }, 900);
    }, 650);
  };

  const refresh = () => {
    if (!wo) return;
    dispatch({ type: "clearConflict", woId: wo.id });
    setRefreshed(true);
    setPhase("form");
  };

  const conflict = phase === "conflict";
  const holder = asset?.custodianId ? L.employee.get(asset.custodianId) : undefined;

  return (
    <Modal open={!!wo} onClose={phase === "saving" ? () => {} : onClose} label={conflict ? "Refresh before resolving" : "Resolve issue"} shake={shake}
      className={cn("rounded-[16px] p-6 max-w-[calc(100vw-48px)]", conflict ? "w-[960px]" : "w-[920px]")}>
      {wo && asset && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <p className="text-[12px] text-ink-2 leading-[1.4]">{conflict ? "RESOLVE ISSUE / SAVE BLOCKED" : "MAINTENANCE / RESOLUTION"}</p>
              <h2 className="text-[24px] font-bold leading-[1.25] tracking-[-0.01em] text-deep">{conflict ? "Refresh before resolving" : "Resolve issue"}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center size-8 rounded-md text-ink-2 hover:bg-tint cursor-pointer"><X size={20} strokeWidth={2.2} /></button>
          </div>
          <RecordDivider />

          <AnimatePresence mode="wait" initial={false}>
            {conflict ? (
              <motion.div key="conflict" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.state} className="flex gap-5 items-start">
                {/* Current record and recovery */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <AssetBeingResolved asset={asset} wo={wo} />
                  <div className="bg-bad-wash border border-bad-edge rounded-[10px] p-4 flex flex-col gap-3">
                    <p className="flex items-center gap-2.5 text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-date-over">
                      <CircleAlert size={20} strokeWidth={2} className="shrink-0" />Couldn’t save — this asset moved
                    </p>
                    <p className="text-[14px] leading-[1.4] text-bad-ink">
                      {asset.name} was transferred to {wo.conflict?.to} {wo.conflict?.minutesAgo} minutes ago by {wo.conflict?.by}. Reload to see the current custodian before resolving.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button variant="primary" size="rec" className="w-full" icon={RefreshCw} onClick={refresh}>Refresh details · Keep draft</Button>
                    <p className="text-[12px] text-ink-2 leading-[1.4]">Loads the current asset details. Keeps the outcome and optional note for your review; does not save the resolution.</p>
                  </div>
                </div>
                {/* Your retained draft */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <div className="bg-pick border border-rule rounded-[10px] p-4 flex flex-col gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3] text-brand-700">Your unsaved resolution</p>
                    <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">{outcome && `${OUTCOME[outcome].label} → ${OUTCOME[outcome].status}`}</p>
                    <p className="text-[12px] text-ink-2 leading-[1.4]">Selected outcome · Not saved</p>
                    <RecordDivider />
                    <p className="text-[14px] font-medium text-deep leading-[1.4]">Resolution note · {note.trim() ? "Draft retained" : "None added"}</p>
                    {note.trim() && <p className="text-[14px] text-ink italic leading-[1.4]">“{note.trim()}”</p>}
                    <p className="text-[14px] text-ink-2 leading-[1.4]">Your unsaved note will be kept for review when you refresh details. Review the current custodian before confirming again.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="flex-1 text-[12px] text-ink-2 leading-[1.4]">Confirm resolution is unavailable until details are refreshed.</p>
                    <Button variant="record" size="rec" disabled className="disabled:opacity-40">Confirm resolution</Button>
                  </div>
                  <RecordDivider />
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-[12px] text-ink-2 leading-[1.4]">Discard removes your unsaved outcome and note.</p>
                    <Button variant="record" size="rec" className="shadow-[0_0_10px_rgb(0_0_0/0.1)]" onClick={onClose}>Discard draft &amp; close</Button>
                  </div>
                </div>
              </motion.div>
            ) : phase === "done" ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={T.overlay} className="py-10 text-center">
                <motion.span initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={T.spring}
                  className="inline-grid place-items-center size-16 rounded-full bg-good-soft text-good-text"><Check size={32} strokeWidth={2.6} /></motion.span>
                <p className="text-[20px] font-semibold text-deep mt-4">Issue resolved</p>
                <p className="t-b2 text-ink-2 mt-1">{asset.name} is now {outcome === "service" ? "In Use" : "on Standby"}.</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex flex-col gap-5">
                {refreshed && (
                  <div className="flex items-start gap-2.5 rounded-[10px] bg-good-soft/50 border border-good-solid/50 px-4 py-3 text-[14px] text-good-text leading-[1.4]">
                    <Check size={17} className="shrink-0 mt-0.5" />
                    <span>Details refreshed — {asset.name} is now held by <b className="font-semibold">{holder?.name ?? "the new custodian"}</b>. Your outcome and note were kept; review them and confirm again.</span>
                  </div>
                )}
                <AssetBeingResolved asset={asset} wo={wo} />
                <div className="flex flex-col gap-3">
                  <p className="text-[14px] font-medium text-deep leading-[1.4]">Choose the new operational status</p>
                  <div role="radiogroup" aria-label="New operational status" className="grid grid-cols-2 gap-[42px]">
                    {(["storage", "service"] as const).map((k) => <Choice key={k} k={k} on={outcome === k} onPick={() => setOutcome(k)} />)}
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-[12px] leading-[1.4]">
                    {(["storage", "service"] as const).map((k) => (
                      <div key={k} className="flex flex-col gap-1">
                        <p className={outcome === k ? "text-brand-700" : "text-ink-2"}>{outcome === k && "Selected · "}{OUTCOME[k].label} → {OUTCOME[k].status}</p>
                        <p className="text-ink-2">{OUTCOME[k].consequence}</p>
                      </div>
                    ))}
                  </div>
                  <p className={cn("text-[12px] leading-[1.4]", shake > 0 && !outcome ? "text-bad-text font-medium" : "text-ink-2")}>
                    {shake > 0 && !outcome ? "Choose an operational status before confirming." : "Selection is not saved until you confirm."}
                  </p>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-[14px] font-medium text-deep leading-[1.4]">Resolution note (optional)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about the resolution…"
                    className="min-h-[88px] w-full rounded-[8px] border border-rule bg-white p-3.5 text-[14px] leading-[1.4] text-ink placeholder:text-ink-2 resize-none outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] transition-[border-color,box-shadow]" />
                </label>
                <RecordDivider />
                <div className="flex justify-end gap-2.5">
                  <Button variant="record" size="rec" onClick={onClose}>Cancel</Button>
                  <Button variant="primary" size="rec" loading={phase === "saving"} onClick={confirm}>Confirm resolution</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}

function AssetBeingResolved({ asset: a, wo }: { asset: Asset; wo: WorkOrder }) {
  return (
    <div className="bg-head rounded-[10px] p-3.5 flex items-center gap-3.5">
      <Thumb src={a.photo} category={a.category} size={52} className="rounded-[8px]" />
      <div className="min-w-0 flex flex-col gap-1">
        <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep truncate">{a.name}</p>
        <p className="text-[14px] text-ink-2 leading-[1.2]">{a.serial}</p>
        <p className="text-[12px] text-ink-2 leading-[1.4]">Reported issue · {wo.summary}</p>
      </div>
    </div>
  );
}

/** Resolution choice card (Figma "Frame/Default" ↔ "Frame/Variant3"): 83px, icon above a radio label. */
function Choice({ k, on, onPick }: { k: Outcome; on: boolean; onPick: () => void }) {
  const { label, icon: I } = OUTCOME[k];
  return (
    <motion.button type="button" role="radio" aria-checked={on} onClick={onPick} whileTap={{ scale: 0.985 }} transition={T.hover}
      className={cn("h-[83px] rounded-[8px] border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-[120ms]",
        on ? "bg-pick border-brand-500" : "bg-white border-n-300 hover:border-rule hover:bg-tint")}>
      <I size={22} strokeWidth={1.6} className={on ? "text-ink/60" : "text-ink/40"} />
      <span className={cn("flex items-center gap-1.5 text-[13px] font-bold", on ? "text-brand-700" : "text-n-350")}>
        <span className={cn("grid place-items-center size-3 rounded-full border", on ? "border-brand-700" : "border-n-350")}>{on && <span className="size-1.5 rounded-full bg-brand-700" />}</span>
        {label}
      </span>
    </motion.button>
  );
}
