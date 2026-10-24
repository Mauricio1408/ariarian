"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  Package,
  RefreshCw,
  Reply,
  ShieldAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

type Outcome = "storage" | "service";
type Phase = "form" | "saving" | "conflict" | "reloaded" | "done";

/** Figma 4749:2793 (05 — Resolve Issue) and 4749:2876 (06 — Save Conflict). */
export function ResolveModal({
  woId,
  onClose,
}: {
  woId: string | null;
  onClose: () => void;
}) {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();
  const wo = woId ? state.workOrders.find((w) => w.id === woId) : undefined;
  const asset = wo ? L.asset.get(wo.assetId) : undefined;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [shake, setShake] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  if (woId !== open) {
    setOpen(woId);
    setOutcome(null);
    setNote("");
    setPhase("form");
  }

  const confirm = () => {
    if (!wo || !outcome) {
      setShake((n) => n + 1);
      return;
    }
    setPhase("saving");
    setTimeout(() => {
      // Canon iR 2630 or any work order with a conflict triggers 06 Save Conflict
      if (wo.conflict && phase !== "reloaded") {
        setPhase("conflict");
        setShake((n) => n + 1);
        return;
      }
      dispatch({ type: "resolve", woId: wo.id, outcome, note: note.trim() });
      setPhase("done");
      setTimeout(() => {
        onClose();
        toast({
          title: `${asset?.name} resolved`,
          body:
            outcome === "service"
              ? "Returned to service • In Use"
              : "Moved to storage • Standby",
          tone: "good",
        });
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
    <Modal
      open={!!wo}
      onClose={phase === "saving" ? () => {} : onClose}
      label={conflict ? "Save Conflict Recovery" : "Resolve Issue"}
      shake={shake}
      className={cn(
        "transition-all duration-300",
        conflict ? "w-[920px] max-w-[95vw]" : "w-[460px]"
      )}
    >
      {wo && asset && (
        <div className="relative">
          {/* Header */}
          <header className="flex items-center px-8 pt-7 pb-4 dash-b">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">
                {conflict ? "Save Conflict Recovery" : "Resolve Issue"}
              </h2>
              <p className="text-[12px] text-ink-3 mt-0.5">
                {conflict
                  ? "Concurrency collision detected • Server version modified by another custodian"
                  : `Work Order #${wo.id} · ${asset.name}`}
              </p>
            </div>
            <CloseButton onClick={onClose} className="ml-auto" />
          </header>

          {/* Conflict Notification banner when in reloaded state */}
          {phase === "reloaded" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={T.state}
              className="px-8 pt-4"
            >
              <div className="flex items-center gap-2 rounded-lg bg-good-soft/50 border border-good-solid/50 px-4 py-2.5 text-[13px] text-good-text">
                <Check size={16} />
                <span>
                  <strong>Reloaded successfully:</strong> Latest server record loaded. You may now
                  confirm resolution.
                </span>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {/* PHASE: CONFLICT (Figma 4749:2876 — 2-Column Landscape Recovery) */}
            {conflict ? (
              <motion.div
                key="conflict"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={T.state}
                className="p-8"
              >
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column: Current record and recovery */}
                  <div className="flex flex-col justify-between rounded-2xl border border-line bg-page/40 p-5">
                    <div>
                      <div className="flex items-center gap-3 pb-4 border-b border-line">
                        <div className="size-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                          <Package size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold text-ink truncate">{asset.name}</h3>
                          <p className="text-[12px] font-mono text-ink-2">{asset.id}</p>
                          <p className="text-[11px] font-mono text-ink-3">{asset.serial}</p>
                        </div>
                      </div>

                      {/* Error details */}
                      <div className="mt-4 rounded-xl border border-bad-solid/40 bg-bad-soft/30 p-4">
                        <div className="flex items-center gap-2 text-bad-text text-[13.5px] font-semibold">
                          <ShieldAlert size={17} /> Couldn&apos;t save — this asset moved
                        </div>
                        <p className="text-[12px] text-bad-text/90 mt-1.5 leading-relaxed">
                          <strong>{asset.name}</strong> was transferred to{" "}
                          <strong>{wo.conflict?.to ?? "Rosa Lim"}</strong>{" "}
                          {wo.conflict?.minutesAgo ?? 4} minutes ago by{" "}
                          <strong>{wo.conflict?.by ?? "Juan Dela Cruz"}</strong>.
                        </p>
                        <p className="text-[11.5px] text-bad-text/80 mt-1">
                          Reload to see the current custodian before finalizing resolution.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-line/80 space-y-2">
                      <button
                        onClick={reload}
                        className="w-full h-10 rounded-xl bg-bad-text hover:bg-[#9a1f02] text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                      >
                        <RefreshCw size={15} /> Safe Recovery: Reload Server State
                      </button>
                      <p className="text-[11px] text-ink-3 text-center">
                        Preserves your draft resolution note while syncing latest custody records.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Your retained draft */}
                  <div className="flex flex-col justify-between rounded-2xl border border-line bg-white p-5">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-line">
                        <h4 className="text-[14px] font-bold text-ink">Your Retained Draft</h4>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
                          Unsaved
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-3">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                            Target Status
                          </span>
                          <p className="text-[14px] font-semibold text-ink mt-0.5">
                            {outcome === "storage" ? "Move to Storage (Standby)" : "Return to Service (In Use)"}
                          </p>
                        </div>

                        {note && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                              Draft Note
                            </span>
                            <p className="text-[13px] text-ink-2 mt-0.5 p-2.5 rounded-lg bg-page border border-line text-sm italic">
                              &ldquo;{note}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="rounded-xl border border-line bg-page/60 p-3 text-[12px] text-ink-2">
                          <p>
                            Direct overwrite is blocked by DOST AriArian concurrency control to
                            prevent accidental data loss.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-line space-y-2">
                      <button
                        onClick={onClose}
                        className="w-full h-10 rounded-xl border border-line bg-white hover:bg-page text-ink-2 hover:text-ink text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <X size={15} /> Discard Draft & Close
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : phase === "done" ? (
              /* PHASE: DONE SUCCESS */
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={T.overlay}
                className="px-8 py-12 text-center"
              >
                <motion.span
                  initial={{ scale: 0.4, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={T.spring}
                  className="inline-grid place-items-center size-16 rounded-full bg-good-soft text-good-text mx-auto"
                >
                  <Check size={32} strokeWidth={2.6} />
                </motion.span>
                <p className="text-[19px] font-bold text-ink mt-4">Issue Resolved Successfully</p>
                <p className="t-b2 text-ink-2 mt-1">
                  <strong>{asset.name}</strong> is now marked as{" "}
                  {outcome === "service" ? "In Use" : "on Standby"}.
                </p>
              </motion.div>
            ) : (
              /* PHASE: STANDARD RESOLVE FORM */
              <motion.div key="form" exit={{ opacity: 0 }} className="px-8 pb-8 pt-4">
                <p className="text-[14.5px] text-ink-2 leading-snug">
                  You are marking <strong>{asset.name}</strong> as resolved. Choose the updated
                  operational status:
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Option
                    icon={Box}
                    label="Move to Storage"
                    desc="Sets status to Standby"
                    on={outcome === "storage"}
                    onClick={() => setOutcome("storage")}
                  />
                  <Option
                    icon={Reply}
                    label="Return to Service"
                    desc="Sets status to In Use"
                    on={outcome === "service"}
                    onClick={() => setOutcome("service")}
                  />
                </div>

                <label className="block mt-6">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-2">
                    Resolution Note (optional)
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={`e.g. Component replaced, calibrated, and ready for redeployment.`}
                    className="mt-1.5 w-full h-[84px] rounded-xl border border-line bg-page/30 px-3.5 py-2.5 text-[14px] resize-none outline-none focus:border-brand-400 focus:bg-white transition-all placeholder:text-ink-3"
                  />
                </label>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-line">
                  <button
                    onClick={onClose}
                    className="px-4 h-9 rounded-lg text-[14px] font-medium text-ink-2 hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="success"
                    className="h-10 px-6 rounded-lg text-[14px] font-semibold"
                    loading={phase === "saving"}
                    onClick={confirm}
                  >
                    Confirm Resolution
                  </Button>
                </div>

                <AnimatePresence>
                  {shake > 0 && !outcome && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-right text-[12px] text-bad-text mt-2 font-medium"
                    >
                      Please select an operational status above.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}

function Option({
  icon: I,
  label,
  desc,
  on,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={T.hover}
      className={cn(
        "relative p-4 rounded-xl flex flex-col items-start gap-1 cursor-pointer border text-left transition-all duration-200",
        on
          ? "border-brand-500 bg-brand-50/70 shadow-sm"
          : "border-line bg-white hover:bg-page"
      )}
    >
      <div
        className={cn(
          "size-8 rounded-lg flex items-center justify-center mb-1",
          on ? "bg-brand-500 text-white" : "bg-page text-ink-2"
        )}
      >
        <I size={18} strokeWidth={1.8} />
      </div>
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <span className="text-[12px] text-ink-3">{desc}</span>
    </motion.button>
  );
}
