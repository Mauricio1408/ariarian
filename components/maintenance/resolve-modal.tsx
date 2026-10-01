"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Box, Check, Reply } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

type Outcome = "storage" | "service";
type Phase = "form" | "saving" | "conflict" | "reloaded" | "done";

/** Figma 4656:1483 (Resolve Issue) and 4657:1899 (Save conflict). */
export function ResolveModal({ woId, onClose }: { woId: string | null; onClose: () => void }) {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();
  const wo = woId ? state.workOrders.find((w) => w.id === woId) : undefined;
  const asset = wo ? L.asset.get(wo.assetId) : undefined;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [shake, setShake] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  if (woId !== open) { setOpen(woId); setOutcome(null); setNote(""); setPhase("form"); }

  const confirm = () => {
    if (!wo || !outcome) { setShake((n) => n + 1); return; }
    setPhase("saving");
    setTimeout(() => {
      if (wo.conflict && phase !== "reloaded") { setPhase("conflict"); setShake((n) => n + 1); return; }
      dispatch({ type: "resolve", woId: wo.id, outcome, note: note.trim() });
      setPhase("done");
      setTimeout(() => {
        onClose();
        toast({ title: `${asset?.name} resolved`, body: outcome === "service" ? "Returned to service • In Use" : "Moved to storage • Standby", tone: "good" });
      }, 900);
    }, 650);
  };
  const reload = () => {
    if (!wo?.conflict) return;
    dispatch({ type: "clearConflict", woId: wo.id });
    setPhase("reloaded");
  };

  const conflict = phase === "conflict";
  return (
    <Modal open={!!wo} onClose={phase === "saving" ? () => {} : onClose} label="Resolve issue" shake={shake} className="w-[432px]">
      {wo && asset && (
        <div className="relative">
          <header className="flex items-center px-11 pt-10 pb-4 dash-b">
            <h2 className="text-[16px]">Resolve Issue</h2>
            <CloseButton onClick={onClose} className="ml-auto -mr-6" />
          </header>

          <AnimatePresence initial={false}>
            {conflict && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state} className="overflow-hidden">
                <div className="mx-4 mt-3 rounded-lg border border-bad-solid/50 bg-bad-soft/40 px-4 py-3">
                  <p className="flex items-center gap-2.5 text-[14px] text-bad-text"><span className="size-3 rounded-full bg-bad-text" />Couldn&apos;t save — this asset moved</p>
                  <p className="text-[11.5px] text-bad-text/90 mt-1 pl-[22px] leading-snug">{asset.name} was transferred to {wo.conflict!.to} {wo.conflict!.minutesAgo} minutes ago by {wo.conflict!.by}. Reload to see the current custodian before resolving.</p>
                  <div className="flex gap-2 mt-2.5 pl-[22px]">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={reload} className="h-[26px] px-3 rounded-md bg-bad-text text-white text-[12px] cursor-pointer hover:bg-[#9a1f02]">Reload</motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={onClose} className="h-[26px] px-3 rounded-md border border-bad-solid/50 bg-white text-bad-text text-[12px] cursor-pointer hover:bg-bad-soft/30">Discard changes</motion.button>
                  </div>
                </div>
              </motion.div>
            )}
            {phase === "reloaded" && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state} className="overflow-hidden">
                <span className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200 px-4 py-2.5 text-[12.5px] text-brand-800"><Check size={14} />Reloaded — {wo.conflict?.to ?? "Rosa Lim"} is now the custodian. You can resolve.</span>
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {phase === "done" ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={T.overlay} className="px-6 py-14 text-center">
                <motion.span initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={T.spring} className="inline-grid place-items-center size-16 rounded-full bg-good-soft text-good-text"><Check size={32} strokeWidth={2.6} /></motion.span>
                <p className="text-[18px] font-semibold mt-4">Issue resolved</p>
                <p className="t-b2 text-ink-2 mt-1">{asset.name} is now {outcome === "service" ? "In Use" : "on Standby"}.</p>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }} className={cn("px-6 pb-16 transition-opacity", conflict && "opacity-60 pointer-events-none")}>
                <p className="text-[16px] text-ink-2 px-5 mt-3 leading-snug">You are marking “{asset.name}” as resolved. What is the new status?</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Option icon={Box} label="Move to Storage" on={outcome === "storage"} onClick={() => setOutcome("storage")} />
                  <Option icon={Reply} label="Return to Service" on={outcome === "service"} onClick={() => setOutcome("service")} />
                </div>
                <label className="block mt-8">
                  <span className="text-[13px] font-medium uppercase tracking-[0.02em] text-ink-2">Resolution note (optional)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={wo.summary}
                    className="mt-1.5 w-full h-[84px] rounded-lg bg-white shadow-[0_0_14px_rgb(0_0_0/0.08)] px-3 py-2.5 text-[14px] resize-none outline-none focus:shadow-[0_0_0_3px_var(--color-brand-100),0_0_14px_rgb(0_0_0/0.08)] transition-shadow placeholder:text-ink-3" />
                </label>
                <div className="flex items-center justify-end gap-6 mt-5">
                  <button onClick={onClose} className="text-[16px] font-medium text-ink-2 hover:text-ink cursor-pointer">Cancel</button>
                  <Button variant="success" className="h-[33px] px-6 rounded-[4px] text-[14px]" loading={phase === "saving"} disabled={conflict} onClick={confirm}>Confirm Resolution</Button>
                </div>
                <AnimatePresence>{shake > 0 && !outcome && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-right t-b3 text-bad-text mt-2">Choose a new status first.</motion.p>}</AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}

function Option({ icon: I, label, on, onClick }: { icon: LucideIcon; label: string; on: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={T.hover}
      className={cn("relative h-[84px] rounded-lg bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-[box-shadow,color] duration-200",
        on ? "shadow-[0_0_0_2px_var(--color-brand-500),0_8px_20px_-6px_rgb(0_173_239/0.35)] text-brand-700" : "shadow-[0_0_14px_rgb(0_0_0/0.08)] text-ink-2 hover:text-ink")}>
      <I size={20} strokeWidth={1.5} />
      <span className="text-[13px] font-medium">{label}</span>
      <AnimatePresence>{on && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={T.spring} className="absolute top-2 right-2 grid place-items-center size-[18px] rounded-full bg-brand-500 text-white"><Check size={11} strokeWidth={3} /></motion.span>
      )}</AnimatePresence>
    </motion.button>
  );
}
