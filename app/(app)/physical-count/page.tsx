"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ClipboardCheck, Flashlight, FlashlightOff, ScanLine, X, Zap, ZapOff } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { longDate, monthDay } from "@/lib/format";
import { AS_OF } from "@/lib/types";
import type { Asset, PhysicalCondition } from "@/lib/types";
import { Topbar } from "@/components/shell/topbar";
import { Button, Thumb } from "@/components/ui/primitives";
import { RecordDivider } from "@/components/ui/record-kit";
import { T } from "@/components/ui/motion";

type Step = "scan" | "confirm" | "complete";

const CONDITION: { k: PhysicalCondition; meaning: string }[] = [
  { k: "Excellent", meaning: "Fully serviceable" },
  { k: "Fair", meaning: "Serviceable with wear" },
  { k: "Poor", meaning: "Impaired or unsafe" },
];

export default function PhysicalCountPage() {
  return <Suspense><PhysicalCount /></Suspense>;
}

/**
 * 07 — Annual Physical Count, the field auditor's phone flow (Figma 4773:8205 Scan → 4773:8252 Confirm →
 * 4773:8314 Complete). Full-screen on phones; a centred 390px column beside the sidebar on desktop.
 */
function PhysicalCount() {
  const { state, dispatch, toast } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const assets = state.assets;
  const total = assets.length;

  // The count picks up where the design leaves it: 18 of 72 reviewed, 3 not found, MacBook Pro next.
  const [session] = useState(() => {
    const next = assets.find((a) => a.id === "DOST-2023-0117") ?? assets[0];
    const done = assets.filter((a) => a.id !== next?.id).slice(-18).map((a) => a.id);
    return { done, missing: done.slice(0, 3) };
  });
  const jump = params.get("step") === "complete";
  const [reviewed, setReviewed] = useState<string[]>(() => (jump ? assets.map((a) => a.id) : session.done));
  const [missing, setMissing] = useState<string[]>(session.missing);
  const [changed, setChanged] = useState(2);
  const [step, setStep] = useState<Step>(jump ? "complete" : "scan");
  const [current, setCurrent] = useState<Asset | null>(null);
  const [condition, setCondition] = useState<PhysicalCondition>("Excellent");
  const [flash, setFlash] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [manualError, setManualError] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const queue = useMemo(() => {
    const done = new Set(reviewed);
    const first = assets.find((a) => a.id === "DOST-2023-0117");
    const rest = assets.filter((a) => !done.has(a.id) && a.id !== first?.id);
    return first && !done.has(first.id) ? [first, ...rest] : rest;
  }, [assets, reviewed]);

  const pct = Math.round((reviewed.length / total) * 100);
  const remaining = total - reviewed.length;

  const match = (a: Asset) => { setCurrent(a); setCondition(a.condition); setManual(null); setManualError(false); setStep("confirm"); };
  const scan = () => { if (queue[0]) match(queue[0]); };
  const lookup = () => {
    const t = (manual ?? "").trim().toLowerCase();
    const a = assets.find((x) => [x.id, x.tag, x.serial].some((v) => v.toLowerCase() === t));
    if (a) match(a); else setManualError(true);
  };
  const advance = (ids: string[]) => {
    if (ids.length >= total) setStep("complete");
    else setStep("scan");
    setCurrent(null);
  };
  const confirm = () => {
    if (!current) return;
    if (condition !== current.condition) setChanged((n) => n + 1);
    dispatch({ type: "auditPhysicalCount", assetId: current.id, condition, note: `Physical count 2026 · ${condition}` });
    const ids = reviewed.includes(current.id) ? reviewed : [...reviewed, current.id];
    setReviewed(ids);
    setMissing((m) => m.filter((x) => x !== current.id));
    toast({ title: `${current.name} reviewed`, body: `Condition today · ${condition}`, tone: "good" });
    advance(ids);
  };
  const notFound = () => {
    if (!current) return;
    const ids = reviewed.includes(current.id) ? reviewed : [...reviewed, current.id];
    setReviewed(ids);
    setMissing((m) => (m.includes(current.id) ? m : [...m, current.id]));
    toast({ title: `${current.name} marked not found`, body: "It stays on the report as unlocated", tone: "bad" });
    advance(ids);
  };
  const submit = () => {
    setSubmitted(true);
    toast({ title: "Count report submitted", body: "RPCPPE sent for supply officer review", tone: "good" });
  };

  const missingAssets = missing.map((id) => assets.find((a) => a.id === id)).filter(Boolean) as Asset[];
  const L = useLookups();

  return (
    <>
      <div className="hidden md:block"><Topbar crumb="Physical Count" icon={ScanLine} /></div>
      <main className="md:flex md:justify-center md:py-8">
        <div className="relative flex flex-col bg-head min-h-dvh md:min-h-[780px] w-full md:w-[390px] md:border md:border-rule md:rounded-[16px] md:overflow-hidden md:shadow-raised">
          {/* Count header */}
          <header className="bg-white flex items-center gap-3.5 px-5 py-3 shrink-0">
            {step === "scan" ? (
              <button type="button" onClick={() => router.push("/")} aria-label="Close count" className="grid place-items-center size-7 -ml-1 rounded-md text-deep hover:bg-tint cursor-pointer"><X size={22} strokeWidth={2.4} /></button>
            ) : (
              <button type="button" onClick={() => { setStep("scan"); setCurrent(null); }} aria-label="Back to scanner" className="grid place-items-center size-7 -ml-1 rounded-md text-deep hover:bg-tint cursor-pointer"><ChevronLeft size={24} strokeWidth={2.4} /></button>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-[16px] leading-[1.5] text-deep">Physical count 2026</p>
              <p className="text-[14px] leading-[1.4] text-ink-2">DOST Central Office</p>
            </div>
            <p className="text-[12px] text-ink-2 tnum">{step === "scan" ? 1 : step === "confirm" ? 2 : 3} / 3</p>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {step === "scan" && (
              <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state} className="flex-1 flex flex-col">
                {/* Review progress */}
                <div className="bg-white px-5 py-4 flex flex-col gap-[9px] border-t border-head">
                  <div className="flex justify-between text-[14px] font-medium leading-[1.4]">
                    <span className="text-deep tnum">{reviewed.length} of {total} reviewed</span><span className="text-brand-700 tnum">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-[3px] bg-track overflow-hidden">
                    <motion.div className="h-full rounded-[3px] bg-brand-500" initial={false} animate={{ width: `${pct}%` }} transition={T.page} />
                  </div>
                </div>
                {/* Scan workspace */}
                <div className="flex-1 flex flex-col gap-4 p-5">
                  <div className="flex-1 min-h-[340px] bg-scan rounded-[16px] p-6 flex flex-col items-center justify-center gap-6">
                    <div className="w-full flex items-start justify-between">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3] text-scan-ink">Asset tag scanner</p>
                      <button type="button" onClick={() => setFlash((f) => !f)} aria-label={flash ? "Turn flashlight off" : "Turn flashlight on"} className="text-white/90 hover:text-white cursor-pointer">
                        {flash ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
                      </button>
                    </div>
                    <button type="button" onClick={scan} aria-label={queue[0] ? `Scan tag (simulates ${queue[0].name})` : "Nothing left to scan"}
                      className={cn("relative grid place-items-center w-[260px] h-[174px] rounded-[14px] border-[3px] border-brand-500 cursor-pointer overflow-hidden transition-shadow", flash && "shadow-[0_0_40px_rgb(255_255_255/0.25)_inset]")}>
                      <ScanLine size={40} strokeWidth={1.5} className="text-scan-ink" />
                      <motion.span aria-hidden className="absolute inset-x-4 h-px bg-brand-400/80" animate={{ top: ["18%", "82%", "18%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
                    </button>
                    <div className="w-full text-center flex flex-col gap-2">
                      <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-white">Point at the asset tag</p>
                      <p className="text-[14px] leading-[1.4] text-scan-ink">DOST-YYYY-NNNN</p>
                      <p className="text-[14px] leading-[1.4] text-scan-ink">Keep the label inside the frame.</p>
                    </div>
                    <button type="button" onClick={() => setFlash((f) => !f)} aria-pressed={flash}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-scan-edge text-[14px] font-medium text-white hover:bg-white/5 cursor-pointer">
                      {flash ? <Zap size={16} /> : <ZapOff size={16} />}{flash ? "Flash on" : "Flash off"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {manual === null ? (
                      <Button variant="record" size="rec" className="w-full" onClick={() => setManual("")}>Enter tag manually</Button>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-2">
                        <input autoFocus value={manual} onChange={(e) => { setManual(e.target.value); setManualError(false); }} placeholder="DOST-2023-0117"
                          className={cn("flex-1 min-w-0 h-10 px-3 rounded-[6px] border bg-white text-[15px] outline-none focus:shadow-[0_0_0_3px_var(--color-brand-100)]", manualError ? "border-bad-text" : "border-rule focus:border-brand-500")} />
                        <Button type="submit" variant="primary" size="rec">Find</Button>
                      </form>
                    )}
                    <p className={cn("text-[14px] leading-[1.4]", manualError ? "text-bad-text" : "text-ink-2")}>
                      {manualError ? "No asset has that tag, serial or record number." : "Can’t scan the label? Type the tag instead."}
                    </p>
                  </div>
                </div>
                {/* Count controls */}
                <div className="bg-white p-5 flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[16px] leading-[1.5] text-deep tnum">{remaining} remaining</p>
                    <p className="text-[12px] leading-[1.4] text-ink-2 tnum">{missing.length} not found so far</p>
                  </div>
                  <Button variant="record" size="rec" onClick={() => { toast({ title: "Count paused", body: `${reviewed.length} of ${total} reviewed · resume any time` }); router.push("/"); }}>Pause count</Button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && current && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={T.state} className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col gap-3.5 p-5">
                  <div className="flex justify-between text-[14px] font-medium leading-[1.4]">
                    <span className="text-deep tnum">Asset {Math.min(total, reviewed.length + 1)} of {total}</span><span className="text-brand-700">Tag matched</span>
                  </div>
                  <div className="bg-white border border-rule rounded-[12px] p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Thumb src={current.photo} category={current.category} size={60} className="rounded-[8px]" />
                      <div className="min-w-0 flex flex-col gap-1">
                        <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">{current.name}</p>
                        <p className="text-[12px] leading-[1.4] text-ink-2">{current.serial} · {current.category}</p>
                      </div>
                    </div>
                    <p className="text-[14px] font-medium leading-[1.4] text-brand-700">Matched tag · {current.id}</p>
                    <RecordDivider />
                    <div className="flex flex-col gap-1.5 leading-[1.4]">
                      <p className="text-[12px] text-ink-2">CUSTODIAN</p>
                      <p className="text-[14px] font-medium text-deep">{current.custodianId ? L.employee.get(current.custodianId)?.name : "Unassigned"}</p>
                    </div>
                    <div className="flex gap-3 leading-[1.4]">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-[12px] text-ink-2">LAST LOCATION</p>
                        <p className="text-[14px] text-deep">{current.office} · {current.room}</p>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-[12px] text-ink-2">LAST CONDITION</p>
                        <p className="text-[14px] text-deep">{current.condition}{current.lastAudit ? ` · audited ${monthDay(current.lastAudit)}` : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Condition today" className="flex flex-col gap-2.5">
                    <p className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">Condition today</p>
                    <p className="text-[14px] leading-[1.4] text-ink-2">Inspect the asset before confirming.</p>
                    {CONDITION.map(({ k, meaning }) => {
                      const on = condition === k;
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setCondition(k)}
                          className={cn("flex items-center gap-3 min-h-[62px] px-3.5 py-2.5 rounded-[10px] text-left cursor-pointer transition-colors duration-[120ms]",
                            on ? "bg-pick border-2 border-brand-500" : "bg-white border border-rule hover:bg-tint")}>
                          <span className={cn("grid place-items-center size-5 rounded-full border-2 shrink-0", on ? "border-brand-600" : "border-radio")}>
                            {on && <span className="size-2.5 rounded-full bg-brand-600" />}
                          </span>
                          <span className="flex flex-col gap-[3px] leading-[1.4]">
                            <span className="text-[14px] font-medium text-deep">{k}</span>
                            <span className="text-[12px] text-ink-2">{meaning}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white px-5 pt-3 pb-5 flex flex-col gap-[9px]">
                  <div className="flex gap-2.5">
                    <Button variant="record" size="rec" onClick={notFound}>Not found</Button>
                    <Button variant="primary" size="rec" className="flex-1" onClick={confirm}>Confirm &amp; next</Button>
                  </div>
                  <p className="text-[12px] leading-[1.4] text-ink-2">Confirm records this review; Not found marks it unlocated.</p>
                </div>
              </motion.div>
            )}

            {step === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.page} className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-2">
                    <span className="grid place-items-center size-10 rounded-[10px] bg-pick text-brand-700"><ClipboardCheck size={24} strokeWidth={1.75} /></span>
                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.015em] text-deep">Count review complete</h1>
                    <p className="text-[14px] leading-[1.4] text-ink-2">{longDate(AS_OF)} · {submitted ? "Report submitted" : "Ready for report review"}</p>
                  </div>
                  <div className="bg-white border border-rule rounded-[12px] overflow-hidden text-[14px] leading-[1.4]">
                    {[
                      ["Reviewed", `${reviewed.length} of ${total}`],
                      ["Physically located", `${reviewed.length - missing.length} assets`],
                      ["Not located", `${missing.length} assets`, "text-date-over"],
                      ["Condition changes", `${changed} assets`],
                      ["New locations", "5 assets"],
                    ].map(([l, v, tone]) => (
                      <div key={l} className="flex justify-between px-4 py-3 border-b border-rule last:border-b-0">
                        <span className="text-ink-2">{l}</span><span className={cn("font-medium tnum", tone ?? "text-deep")}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] leading-[1.4] text-ink-2">Condition changes and new locations may refer to the same assets; do not add these counts.</p>
                  {missing.length > 0 && (
                    <div className="bg-warn-wash rounded-[10px] p-3.5 flex flex-col gap-2 text-[14px] leading-[1.4] text-warn-ink">
                      <p className="font-medium">{missing.length} asset{missing.length === 1 ? "" : "s"} remain{missing.length === 1 ? "s" : ""} unaccounted</p>
                      <p>They stay on the report until a supply officer signs off.</p>
                    </div>
                  )}
                  {missing.length > 0 && (
                    <>
                      <Button variant="record" size="rec" className="w-full" aria-expanded={showMissing} onClick={() => setShowMissing((v) => !v)}>
                        {showMissing ? "Hide unaccounted assets" : "Review unaccounted assets"}
                      </Button>
                      <AnimatePresence initial={false}>
                        {showMissing && (
                          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state}
                            className="bg-white border border-rule rounded-[12px] overflow-hidden">
                            {missingAssets.map((a) => (
                              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-rule last:border-b-0">
                                <Thumb src={a.photo} category={a.category} size={36} className="rounded-[8px]" />
                                <span className="min-w-0 flex-1 leading-[1.4]">
                                  <span className="block text-[14px] font-medium text-deep truncate">{a.name}</span>
                                  <span className="block text-[12px] text-ink-2 truncate">{a.id} · {a.office} · {a.room}</span>
                                </span>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
                <div className="bg-white px-5 pt-4 pb-5 flex flex-col gap-2.5">
                  <Button variant="primary" size="rec" className="w-full" disabled={submitted} onClick={submit}>{submitted ? "Count report submitted" : "Submit count report"}</Button>
                  <p className="text-[14px] leading-[1.4] text-ink-2">RPCPPE — Report on the Physical Count of Property, Plant and Equipment</p>
                  <p className="text-[12px] leading-[1.4] text-ink-2">{submitted ? `Submitted ${longDate(AS_OF)} for supply officer sign-off.` : "Review the report before submission. Nothing has been submitted yet."}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
