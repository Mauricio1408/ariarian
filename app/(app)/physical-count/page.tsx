"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Flashlight,
  FlashlightOff,
  Package,
  QrCode,
  RefreshCw,
  Scan,
  ScanLine,
  Smartphone,
  Tag,
  TriangleAlert,
  User,
  Zap,
  ZapOff,
  ArrowLeft,
  MapPin,
  Building
} from "lucide-react";
import { useStore, useLookups } from "@/lib/store";
import { amount, php, phpShort } from "@/lib/format";
import { T } from "@/components/ui/motion";
import { Button, CategoryChip } from "@/components/ui/primitives";
import { StatusPill, OP_TONE, PH_TONE } from "@/components/assets/record";
import type { PhysicalCondition, Asset } from "@/lib/types";

type Step = "scan" | "confirm" | "complete";

export default function PhysicalCountPage() {
  const { state, dispatch, toast } = useStore();
  const L = useLookups();

  const [step, setStep] = useState<Step>("scan");
  const [frameMode, setFrameMode] = useState<"phone" | "wide">("phone");
  const [flashOn, setFlashOn] = useState(false);
  const [manualTag, setManualTag] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  // Pick a realistic asset from the registry for the scanner demo
  const sampleAsset: Asset =
    state.assets.find((a) => a.id === "DOST-2023-0117" || a.name.includes("MacBook")) ??
    state.assets[0];

  const custodian = sampleAsset.custodianId ? L.employee.get(sampleAsset.custodianId) : null;

  const [selectedCondition, setSelectedCondition] = useState<PhysicalCondition>(
    sampleAsset.condition || "Excellent"
  );
  const [discrepancyFlagged, setDiscrepancyFlagged] = useState(false);

  // Audit counts
  const totalAssets = state.assets.length;
  const countedCount = 18;
  const progressPercent = Math.round((countedCount / totalAssets) * 100);

  const handleSimulateScan = () => {
    setStep("confirm");
  };

  const handleConfirmNext = () => {
    dispatch({
      type: "auditPhysicalCount",
      assetId: sampleAsset.id,
      condition: selectedCondition,
      note: `Physical count verified • Condition: ${selectedCondition}${
        discrepancyFlagged ? " (Discrepancy flagged)" : ""
      }`,
    });

    toast({
      title: `${sampleAsset.name} Verified`,
      body: `Annual count recorded • Condition marked as ${selectedCondition}`,
      tone: "good",
    });

    setStep("complete");
  };

  const handleCompleteSubmission = () => {
    dispatch({
      type: "auditPhysicalCount",
      assetId: sampleAsset.id,
      note: `Annual Physical Inventory Count 2026 completed • COA RPCPPE generated`,
    });

    toast({
      title: "Inventory Count Submitted",
      body: "COA RPCPPE submitted to Auditor • Registry updated",
      tone: "good",
    });

    setStep("scan");
    setDiscrepancyFlagged(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto py-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-brand-100 text-brand-700">
              <ScanLine size={13} /> Mobile Field Auditor
            </span>
            <span className="text-ink-3 text-[13px]">· COA Compliance Tool</span>
          </div>
          <h1 className="t-h1 text-[28px] md:text-[32px]">Annual Physical Count</h1>
          <p className="t-b2 text-ink-2 mt-1">
            Barcoding & Physical Inventory Verification (Figma Frames 07 · Scan, Confirm, Complete)
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-line p-1 shrink-0">
          <button
            onClick={() => setFrameMode("phone")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              frameMode === "phone"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <Smartphone size={15} /> Device Frame (390×844)
          </button>
          <button
            onClick={() => setFrameMode("wide")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              frameMode === "wide"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <Scan size={15} /> Full-Width
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex justify-center">
        <div
          className={`transition-all duration-300 ${
            frameMode === "phone"
              ? "w-[390px] h-[844px] rounded-[44px] border-[10px] border-[#181D27] shadow-overlay overflow-hidden bg-black flex flex-col relative"
              : "w-full max-w-[760px] min-h-[700px] rounded-2xl border border-line bg-white p-6 shadow-sm flex flex-col"
          }`}
        >
          {/* iOS Status Bar in phone mode */}
          {frameMode === "phone" && (
            <div className="h-11 px-6 flex items-center justify-between text-white text-[13px] font-medium shrink-0 select-none z-30">
              <span>9:41</span>
              <div className="size-4 rounded-full bg-black mx-auto" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">5G</span>
                <div className="w-5 h-2.5 rounded-sm border border-white/60 p-0.5 flex">
                  <div className="w-full h-full bg-white rounded-[1px]" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: SCAN VIEWFINDER (Figma 4749:2962) */}
          {step === "scan" && (
            <div className="flex-1 flex flex-col bg-[#0F141C] text-white overflow-hidden relative">
              {/* Header */}
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between z-20 bg-[#0F141C]/90 backdrop-blur">
                <div>
                  <h2 className="text-[15px] font-semibold">Physical Count 2026</h2>
                  <p className="text-[12px] text-white/60">DOST Central Office · Step 1 of 3</p>
                </div>
                <button
                  onClick={() => setFlashOn(!flashOn)}
                  className={`size-9 rounded-full grid place-items-center transition-colors cursor-pointer ${
                    flashOn ? "bg-amber-400 text-black" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  title="Toggle Flash"
                >
                  {flashOn ? <Zap size={16} /> : <ZapOff size={16} />}
                </button>
              </div>

              {/* Progress bar */}
              <div className="px-5 py-3 bg-[#161D27] border-b border-white/10 z-20">
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-white/80">
                    <span className="font-semibold text-white">{countedCount}</span> of{" "}
                    {totalAssets} assets reviewed
                  </span>
                  <span className="font-semibold text-brand-300">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-brand-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Camera Viewfinder */}
              <div className="flex-1 relative flex flex-col items-center justify-center p-6 select-none overflow-hidden">
                {/* Background camera simulation */}
                <div
                  className={`absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${
                    flashOn ? "opacity-35" : "opacity-20"
                  }`}
                  style={{
                    backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Laser scan line animation */}
                <div className="absolute inset-x-12 top-24 bottom-32 pointer-events-none flex flex-col justify-center">
                  <div className="w-full h-64 border-2 border-white/30 rounded-2xl relative flex items-center justify-center">
                    {/* Corner Reticle brackets */}
                    <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                    {/* Animated scanning beam */}
                    <motion.div
                      animate={{ y: [-90, 90, -90] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"
                    />

                    {/* Target tag mockup in reticle */}
                    <div className="text-center opacity-70">
                      <QrCode size={48} className="mx-auto text-white/50 mb-2" />
                      <span className="font-mono text-[11px] tracking-wider text-cyan-300">
                        ALIGN BARCODE OR QR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-auto mb-2 text-center z-10">
                  <p className="text-[13px] font-medium text-white/90">
                    Point camera at property tag
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Format: DOST-VEH-001 or DOST-IT-0042
                  </p>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="p-4 bg-[#161D27] border-t border-white/10 flex flex-col gap-2.5 z-20">
                <button
                  onClick={handleSimulateScan}
                  className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-transform"
                >
                  <Scan size={18} /> Simulate Tag Scan (MacBook Pro)
                </button>

                <button
                  onClick={() => setManualOpen(!manualOpen)}
                  className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Tag size={13} /> Enter Tag Manually
                </button>

                {manualOpen && (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="e.g. DOST-2023-0117"
                      value={manualTag}
                      onChange={(e) => setManualTag(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg bg-black/40 border border-white/20 text-white text-[13px] outline-none focus:border-brand-400"
                    />
                    <button
                      onClick={handleSimulateScan}
                      className="px-4 h-9 rounded-lg bg-brand-500 text-white text-[12px] font-medium"
                    >
                      Look up
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ASSET CONFIRMATION (Figma 4749:3009) */}
          {step === "confirm" && (
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">
              {/* Header */}
              <div className="px-5 py-3 border-b border-line flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
                <button
                  onClick={() => setStep("scan")}
                  className="text-ink-2 hover:text-ink flex items-center gap-1 text-[13px] font-medium cursor-pointer"
                >
                  <ArrowLeft size={16} /> Rescan
                </button>
                <div className="text-center">
                  <h2 className="text-[14px] font-semibold text-ink">Asset 19 of {totalAssets}</h2>
                  <p className="text-[11px] text-ink-3">Step 2 of 3</p>
                </div>
                <div className="size-6" />
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">
                {/* Verified Match Card */}
                <div className="rounded-xl border border-good-solid/40 bg-good-soft/20 p-3.5">
                  <div className="flex items-center gap-2 text-good-text text-[13px] font-semibold mb-2">
                    <CheckCircle2 size={16} /> Verified Tag Match
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-14 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
                      <Package size={28} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-ink leading-snug">
                        {sampleAsset.name}
                      </h3>
                      <p className="text-[12px] font-mono text-ink-2 mt-0.5">
                        Property: {sampleAsset.id}
                      </p>
                      <p className="text-[12px] font-mono text-ink-3">
                        Serial: {sampleAsset.serial}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recorded Custody & Location */}
                <div className="rounded-xl border border-line bg-page/50 p-3.5 space-y-2.5 text-[13px]">
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <span className="text-ink-2 flex items-center gap-1.5">
                      <User size={14} /> Recorded Custodian
                    </span>
                    <span className="font-semibold text-ink">
                      {custodian?.name ?? "Juan Dela Cruz"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <span className="text-ink-2 flex items-center gap-1.5">
                      <Building size={14} /> Department
                    </span>
                    <span className="font-medium text-ink">{sampleAsset.department}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-ink-2 flex items-center gap-1.5">
                      <MapPin size={14} /> Room / Location
                    </span>
                    <span className="font-medium text-ink">{sampleAsset.room}</span>
                  </div>
                </div>

                {/* Condition Assessment Selector */}
                <div>
                  <h4 className="text-[13px] font-semibold text-ink mb-1">
                    Physical Condition Assessment
                  </h4>
                  <p className="text-[11px] text-ink-3 mb-2.5">
                    Required under COA Property Guidelines
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        cond: "Excellent" as const,
                        title: "Excellent / Good",
                        desc: "Fully functional, normal wear, no defects",
                      },
                      {
                        cond: "Fair" as const,
                        title: "Fair Condition",
                        desc: "Operational with minor cosmetic wear or degradation",
                      },
                      {
                        cond: "Poor" as const,
                        title: "Poor / Damaged",
                        desc: "Non-operational or requires maintenance triage",
                      },
                    ].map((item) => (
                      <label
                        key={item.cond}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedCondition === item.cond
                            ? "border-brand-500 bg-brand-50/60 shadow-sm"
                            : "border-line bg-white hover:bg-page"
                        }`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          checked={selectedCondition === item.cond}
                          onChange={() => setSelectedCondition(item.cond)}
                          className="mt-1 accent-brand-500"
                        />
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
                          <p className="text-[11.5px] text-ink-2 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Flag discrepancy toggle */}
                <button
                  type="button"
                  onClick={() => setDiscrepancyFlagged(!discrepancyFlagged)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer ${
                    discrepancyFlagged
                      ? "border-amber-400 bg-amber-50 text-amber-900"
                      : "border-line text-ink-2 hover:bg-page"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TriangleAlert size={16} /> Flag Location or Spec Discrepancy
                  </span>
                  <span className="text-[12px] underline">
                    {discrepancyFlagged ? "Flagged" : "Add note"}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-line bg-white flex gap-2.5 sticky bottom-0">
                <button
                  onClick={() => setStep("scan")}
                  className="px-4 h-11 rounded-xl border border-line text-ink-2 text-[13px] font-medium hover:bg-page transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirmNext}
                  className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                >
                  Confirm & Next Asset <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COUNT RECONCILIATION & COA RPCPPE (Figma 4749:3071) */}
          {step === "complete" && (
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">
              <div className="p-5 flex-1 flex flex-col">
                {/* Success Header */}
                <div className="text-center pt-2 pb-4">
                  <div className="size-16 rounded-full bg-good-soft text-good-text mx-auto grid place-items-center mb-3">
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 className="text-[20px] font-bold text-ink">Physical Count Complete</h2>
                  <p className="text-[12.5px] text-ink-2 mt-1">
                    DOST Central Office · Annual Physical Inventory 2026
                  </p>
                </div>

                {/* Summary Card */}
                <div className="rounded-xl border border-line divide-y divide-line bg-page/40 my-3 text-[13px]">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-ink-2">Total Assets Counted</span>
                    <span className="font-semibold text-ink">{totalAssets} of {totalAssets}</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-ink-2">Verified & Matched</span>
                    <span className="font-semibold text-good-text">68 assets</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-ink-2">Condition Flagged / Damaged</span>
                    <span className="font-semibold text-warn-text">3 assets</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-ink-2">Unaccounted / Missing</span>
                    <span className="font-semibold text-bad-text">1 asset</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white font-medium">
                    <span className="text-ink">Total Portfolio Value Verified</span>
                    <span className="font-bold text-ink text-[14px]">
                      {php(14948500)}
                    </span>
                  </div>
                </div>

                {/* COA Notice */}
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 my-2">
                  <p className="text-[12.5px] text-amber-900 leading-snug flex items-start gap-2">
                    <TriangleAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>1 Discrepancy Flagged:</strong> Asset DOST-2021-0089 requires location
                      reconciliation before formal audit closure.
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-4 space-y-2.5">
                  <Link
                    href="/forms/PAR-2026-001"
                    className="w-full h-11 rounded-xl border border-line bg-white hover:bg-page text-ink font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={16} className="text-brand-600" /> View / Generate COA RPCPPE Report
                  </Link>

                  <button
                    onClick={handleCompleteSubmission}
                    className="w-full h-11 rounded-xl bg-good-text hover:bg-good-text/90 text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                  >
                    <Check size={18} /> Submit Inventory Count to Audit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
