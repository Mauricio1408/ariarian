"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF, PRIORITY, PROBLEM_TYPE } from "@/lib/types";
import type { Priority, ProblemType, WorkOrder } from "@/lib/types";
import { Button, Field, Select, Thumb } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

const TECHS = ["Dataworld", "R. Cruz", "FixIT Manila", "C. Rivera", "MicroCircuit", "A. Cruz · in-house", "R. Santos · in-house", "HP service partner", "Motor pool"];

export function WorkOrderModal({ open, editing, presetAsset, onClose }: { open: boolean; editing: WorkOrder | null; presetAsset?: string; onClose: () => void }) {
  const { state, dispatch, toast, me } = useStore();
  const [assetId, setAssetId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [problem, setProblem] = useState<ProblemType>("Hardware Failure");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [tech, setTech] = useState(TECHS[0]);
  const [promised, setPromised] = useState("2026-03-28");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(0);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState("");
  const k = `${open}-${editing?.id ?? presetAsset ?? "new"}`;
  if (k !== key) {
    setKey(k); setErr(false); setSaving(false); setQ("");
    setAssetId(editing?.assetId ?? presetAsset ?? null); setProblem(editing?.problem ?? "Hardware Failure"); setSummary(editing?.summary ?? "");
    setPriority(editing?.priority ?? "Medium"); setTech(editing?.technician ?? TECHS[0]); setPromised(editing?.promisedOn ?? "2026-03-28");
  }

  const matches = useMemo(() => state.assets.filter((a) => !q || `${a.name} ${a.serial}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [state.assets, q]);
  const picked = state.assets.find((a) => a.id === assetId);

  const save = () => {
    if (!assetId || !summary.trim()) { setErr(true); setShake((n) => n + 1); return; }
    setSaving(true);
    setTimeout(() => {
      if (editing) dispatch({ type: "editWorkOrder", wo: { ...editing, assetId, problem, summary: summary.trim(), priority, technician: tech, promisedOn: promised } });
      else dispatch({ type: "newWorkOrder", wo: { assetId, problem, summary: summary.trim(), priority, technician: tech, stage: "reported", reportedOn: AS_OF, reportedBy: me.id, promisedOn: promised, closedOn: null, cost: null } });
      toast({ title: editing ? "Work order updated" : "Work order created", body: `${picked?.name} • queued for triage`, tone: "good" });
      onClose();
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} label="Work order" shake={shake} className="w-[640px]">
      <header className="flex items-center px-8 h-[72px] border-b border-line">
        <div><h2 className="text-[20px] font-semibold">{editing ? `Edit ${editing.id}` : "New work order"}</h2><p className="t-b3 text-ink-2">Lands in Reported, awaiting triage</p></div>
        <CloseButton onClick={onClose} className="ml-auto" />
      </header>
      <div className="px-8 py-6 space-y-5">
        <div>
          <p className="t-b2 text-ink-2 mb-1.5">Asset</p>
          <AnimatePresence mode="wait" initial={false}>
            {picked ? (
              <motion.div key="picked" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.state} className="flex items-center gap-3 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2.5">
                <Thumb src={picked.photo} category={picked.category} size={36} />
                <span><span className="block t-b2s">{picked.name}</span><span className="block t-b3 text-ink-2">{picked.serial} • {picked.operational}</span></span>
                <button onClick={() => setAssetId(null)} className="ml-auto t-b3 text-brand-600 hover:underline cursor-pointer">Change</button>
              </motion.div>
            ) : (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state}>
                <div className={cn("flex items-center gap-2 h-10 rounded-md border px-3 focus-within:border-brand-500", err ? "border-bad-text" : "border-line")}>
                  <Search size={16} className="text-ink-3" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets by name or serial" className="flex-1 outline-none text-[15px]" />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {matches.map((a) => (
                    <button key={a.id} onClick={() => setAssetId(a.id)} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-tint cursor-pointer transition-colors">
                      <Thumb src={a.photo} category={a.category} size={26} /><span className="min-w-0"><span className="block t-b2 truncate">{a.name}</span><span className="block t-b3 text-ink-2">{a.serial}</span></span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div>
          <p className="t-b2 text-ink-2 mb-1.5">Problem</p>
          <div className="flex flex-wrap gap-2">
            {PROBLEM_TYPE.map((p) => (
              <motion.button key={p} whileTap={{ scale: 0.95 }} onClick={() => setProblem(p)}
                className={cn("flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] border cursor-pointer transition-colors", problem === p ? "bg-ink text-white border-ink" : "border-line hover:border-ink-3")}>
                {problem === p && <Check size={13} />}{p}
              </motion.button>
            ))}
          </div>
        </div>
        <div className={cn(err && !summary.trim() && "[&_input]:border-bad-text")}><Field label="What's wrong?" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Fan grinding noise, shuts down under load" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="t-b2 text-ink-2 mb-1.5">Priority</p>
            <div className="relative flex h-10 rounded-md bg-tint p-1">
              {PRIORITY.map((p) => (
                <button key={p} onClick={() => setPriority(p)} className={cn("relative flex-1 text-[13px] rounded cursor-pointer", priority === p ? "text-ink font-medium" : "text-ink-2")}>
                  {priority === p && <motion.span layoutId="prio" transition={T.spring} className="absolute inset-0 rounded bg-white shadow-raised" />}<span className="relative">{p}</span>
                </button>
              ))}
            </div>
          </div>
          <Select label="Technician" value={tech} onChange={setTech} options={TECHS.map((t) => ({ value: t, label: t }))} />
          <Field label="Promised date" type="date" min={AS_OF} value={promised} onChange={(e) => setPromised(e.target.value)} />
        </div>
        {err && <p className="t-b3 text-bad-text">Pick an asset and describe the problem.</p>}
      </div>
      <footer className="flex justify-end gap-3 px-8 h-[72px] items-center border-t border-line">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>{editing ? "Save changes" : "Create work order"}</Button>
      </footer>
    </Modal>
  );
}
