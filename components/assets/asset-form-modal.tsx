"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY, AS_OF, CAPITALISATION_THRESHOLD, OPERATIONAL_STATUS, PHYSICAL_CONDITION } from "@/lib/types";
import type { Asset, AssetCategory } from "@/lib/types";
import { AGENCIES, OFFICES } from "@/lib/seed";
import { php } from "@/lib/format";
import { Button, CATEGORY_ICON, Field, Select, categoryTone } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";
import { EmployeePicker } from "./transfer-modal";

const PREFIX: Record<AssetCategory, string> = { Hardware: "SN-HW", Software: "LIC", Office: "OFC", Vehicles: "VEH", Appliances: "APP", Essentials: "ESS", Others: "LAB" };

export function AssetFormModal({ open, asset, onClose, onSaved }: { open: boolean; asset: Asset | null; onClose: () => void; onSaved: (a: Asset, isNew: boolean) => void }) {
  const { state, dispatch, me } = useStore();
  const blank = (): Asset => {
    const n = 900 + state.seq + state.assets.length;
    return {
      id: `DOST-2026-${String(n).padStart(4, "0")}`, tag: `DOST-HAR-${String(n).slice(-3)}`, serial: `SN-HW-${n}`, name: "", category: "Hardware",
      agency: "DOST", office: "Central Office", room: "Room 201", address: "DOST Compound, Bicutan, Taguig", custodianId: me.id, cost: 0,
      acquiredOn: AS_OF, operational: "In Use", condition: "Excellent", warrantyStart: AS_OF, warrantyEnd: "2029-03-14", lastAudit: AS_OF,
    };
  };
  const [draft, setDraft] = useState<Asset>(asset ?? blank());
  const [key, setKey] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [shakeN, setShakeN] = useState(0);
  const k = `${open}-${asset?.id ?? "new"}`;
  if (k !== key) { setKey(k); setDraft(asset ?? blank()); setErrors({}); setSaving(false); }

  const set = <K extends keyof Asset>(f: K, v: Asset[K]) => setDraft((d) => ({ ...d, [f]: v }));
  const custodian = state.employees.find((e) => e.id === draft.custodianId) ?? me;

  const save = () => {
    const e = { name: !draft.name.trim(), cost: !(draft.cost > 0), serial: !draft.serial.trim() };
    setErrors(e);
    if (Object.values(e).some(Boolean)) { setShakeN((n) => n + 1); return; }
    setSaving(true);
    setTimeout(() => {
      dispatch({ type: "upsertAsset", asset: draft, isNew: !asset });
      onSaved(draft, !asset);
      onClose();
    }, 550);
  };

  return (
    <Modal open={open} onClose={onClose} label={asset ? "Edit asset" : "Add asset"} shake={shakeN} className="w-[760px]">
      <header className="flex items-center px-8 h-[72px] border-b border-line">
        <div><h2 className="text-[20px] font-semibold">{asset ? "Edit asset" : "Register a new asset"}</h2><p className="t-b3 text-ink-2">{draft.id} • assigned on registration</p></div>
        <CloseButton onClick={onClose} className="ml-auto" />
      </header>
      <div className="px-8 py-6 space-y-6">
        <div>
          <p className="t-b2 text-ink-2 mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {ASSET_CATEGORY.map((c) => {
              const I = CATEGORY_ICON[c]; const on = draft.category === c;
              return (
                <motion.button key={c} whileTap={{ scale: 0.95 }} onClick={() => { set("category", c); if (!asset) set("serial", `${PREFIX[c]}-${draft.serial.split("-").pop()}`); }}
                  className={cn("relative flex items-center gap-1.5 h-9 px-3 rounded-md text-[14px] cursor-pointer border transition-colors duration-[120ms]",
                    on ? cn(categoryTone(c), "border-current") : "border-line text-ink-2 hover:border-ink-3")}>
                  <I size={15} strokeWidth={1.75} />{c}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(errors.name && "[&_input]:border-bad-text")}><Field label="Asset name" placeholder="e.g. Dell Latitude 7440" value={draft.name} onChange={(e) => set("name", e.target.value)} autoFocus />{errors.name && <p className="t-b3 text-bad-text mt-1">Give the asset a name.</p>}</div>
          <div className={cn(errors.serial && "[&_input]:border-bad-text")}><Field label="Serial ID" value={draft.serial} onChange={(e) => set("serial", e.target.value)} /></div>
          <div className={cn(errors.cost && "[&_input]:border-bad-text")}>
            <Field label="Acquisition cost (₱)" inputMode="numeric" value={draft.cost ? draft.cost.toLocaleString("en-PH") : ""} placeholder="0" onChange={(e) => set("cost", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
            <motion.p key={draft.cost >= CAPITALISATION_THRESHOLD ? "par" : "ics"} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={T.state} className={cn("t-b3 mt-1", errors.cost ? "text-bad-text" : "text-ink-2")}>
              {errors.cost ? "Enter the acquisition cost." : draft.cost >= CAPITALISATION_THRESHOLD ? `Capital asset — issued on a PAR, depreciated monthly` : `Below ${php(CAPITALISATION_THRESHOLD)} — semi-expendable, issued on an ICS`}
            </motion.p>
          </div>
          <Field label="Purchase date" type="date" value={draft.acquiredOn} max={AS_OF} onChange={(e) => set("acquiredOn", e.target.value)} />
          <Select label="Agency" value={draft.agency} onChange={(v) => set("agency", v)} options={AGENCIES.map((g) => ({ value: g.code, label: `${g.code} — ${g.name}` }))} />
          <Select label="Office" value={draft.office} onChange={(v) => set("office", v)} options={OFFICES.map((o) => ({ value: o, label: o }))} />
          <Select label="Operational status" value={draft.operational} onChange={(v) => set("operational", v as Asset["operational"])} options={OPERATIONAL_STATUS.slice(0, 4).map((o) => ({ value: o, label: o }))} />
          <Select label="Physical condition" value={draft.condition} onChange={(v) => set("condition", v as Asset["condition"])} options={PHYSICAL_CONDITION.map((o) => ({ value: o, label: o }))} />
          <Field label="Room / location" value={draft.room} onChange={(e) => set("room", e.target.value)} />
          <Field label="Warranty ends" type="date" value={draft.warrantyEnd} onChange={(e) => set("warrantyEnd", e.target.value)} />
        </div>
        <EmployeePicker label="Custodian" value={custodian} onChange={(e) => set("custodianId", e.id)} />
      </div>
      <footer className="flex justify-end gap-3 px-8 h-[72px] items-center border-t border-line">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>{asset ? "Save changes" : "Register asset"}</Button>
      </footer>
    </Modal>
  );
}
