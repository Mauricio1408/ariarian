"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Calendar, ChevronDown, CircleDot, Clock, Box, Building2, Landmark, Paperclip, Pencil, PhilippinePeso, Plus, Tag, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF, CAPITALISATION_THRESHOLD, OPERATIONAL_STATUS, PHYSICAL_CONDITION } from "@/lib/types";
import type { Asset, AssetCategory, OperationalStatus, PhysicalCondition } from "@/lib/types";
import { AGENCIES, OFFICES } from "@/lib/seed";
import { longDate, php } from "@/lib/format";
import { CategoryChip } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { CalendarPopup, CategoryPopup, DepartmentPopup, OptionPopup } from "@/components/ui/popups";
import { T } from "@/components/ui/motion";
import { IllustratedModal } from "@/components/auth/auth-ui";
import { EmployeePicker } from "./transfer-modal";

export type AssetModalMode = "add" | "edit" | "view";

const PREFIX: Record<AssetCategory, string> = { Hardware: "SN-HW", Software: "LIC", Office: "OFC", Vehicles: "VEH", Appliances: "APP", Essentials: "ESS", Others: "LAB" };
const OP_TONE: Record<OperationalStatus, string> = { "In Use": "bg-good-soft text-good-text", Maintenance: "bg-warn-soft text-warn-text", Standby: "bg-brand-100 text-brand-700", Damaged: "bg-bad-soft text-bad-text", Decommissioned: "bg-tint text-ink-2" };
const PH_TONE: Record<PhysicalCondition, string> = { Excellent: "bg-good-soft text-good-text", Fair: "bg-warn-soft text-warn-text", Poor: "bg-bad-soft text-bad-text" };
const OPS = OPERATIONAL_STATUS.slice(0, 4) as OperationalStatus[];

/** Downscale an uploaded photo so it fits comfortably in localStorage. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function Row({ icon: I, label, children, error, half }: { icon: LucideIcon; label: string; children: React.ReactNode; error?: boolean; half?: boolean }) {
  return (
    <div className={cn("relative flex items-center gap-3 h-12", half ? "col-span-1" : "col-span-2")}>
      <I size={20} strokeWidth={1.5} className={cn("shrink-0", error ? "text-bad-text" : "text-ink")} />
      <span className={cn("w-[166px] shrink-0 text-[16px]", error ? "text-bad-text" : "text-ink-2")}>{label}</span>
      <div className="flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  );
}

function TextCell({ value, onChange, placeholder, view, error }: { value: string; onChange: (v: string) => void; placeholder: string; view: boolean; error?: boolean }) {
  if (view) return <span className="w-full h-7 px-2 rounded-[2px] bg-white text-[16px] leading-7 truncate">{value || "—"}</span>;
  return (
    <span className={cn("w-full flex items-center h-7 rounded-[2px] transition-colors duration-[120ms]", value ? "bg-white" : "bg-transparent hover:bg-white/60 focus-within:bg-white", error && "ring-1 ring-bad-text")}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 h-full px-2 bg-transparent outline-none text-[16px] placeholder:text-ink-3" />
    </span>
  );
}

function PillSelect({ onToggle, view, onClear, children }: { onToggle: () => void; view: boolean; onClear?: () => void; children: React.ReactNode }) {
  return (
    <div className="relative flex-1 flex items-center">
      <button type="button" disabled={view} onClick={onToggle} className="flex-1 flex items-center min-h-9 text-left cursor-pointer disabled:cursor-default">{children}</button>
      {!view && (onClear
        ? <button type="button" onClick={onClear} aria-label="Clear" className="grid place-items-center size-7 rounded hover:bg-white cursor-pointer"><X size={20} strokeWidth={1.75} /></button>
        : <button type="button" onClick={onToggle} aria-label="Open" className="grid place-items-center size-7 rounded hover:bg-white cursor-pointer"><ChevronDown size={20} strokeWidth={1.75} /></button>)}
      {view && onClear && <span className="grid place-items-center size-7 text-ink"><X size={20} strokeWidth={1.75} /></span>}
    </div>
  );
}

const Pill = ({ tone, children }: { tone: string; children: React.ReactNode }) => <span className={cn("inline-flex items-center h-[26px] px-5 rounded-[4px] text-[16px]", tone)}>{children}</span>;

/** Figma "Asset Modal Overlays" — Add 958:3267 · Edit 1926:9325 · View 1906:13986. */
export function AssetFormModal({ open, asset, mode = asset ? "edit" : "add", onClose, onSaved }: {
  open: boolean; asset: Asset | null; mode?: AssetModalMode; onClose: () => void; onSaved?: (a: Asset, isNew: boolean) => void;
}) {
  const { state, dispatch, me } = useStore();
  const blank = (): Asset => {
    const n = 900 + state.seq + state.assets.length;
    return {
      id: `DOST-2026-${String(n).padStart(4, "0")}`, tag: "", serial: "", name: "", category: "Hardware",
      agency: "DOST", office: me.office, department: me.department, room: "Room 201", address: "DOST Compound, Bicutan, Taguig", custodianId: me.id, cost: 0,
      acquiredOn: AS_OF, operational: "In Use", condition: "Excellent", warrantyStart: AS_OF, warrantyEnd: "2029-03-14", lastAudit: AS_OF,
    };
  };
  const [d, setD] = useState<Asset>(asset ?? blank());
  const [key, setKey] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const [menu, setMenu] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const k = `${open}-${asset?.id ?? "new"}-${mode}`;
  if (k !== key) { setKey(k); setD(asset ?? blank()); setErrors({}); setSaving(false); setMenu(null); }

  const view = mode === "view";
  const set = <K extends keyof Asset>(f: K, v: Asset[K]) => { setD((x) => ({ ...x, [f]: v })); setErrors((e) => ({ ...e, [f]: false })); };
  const custodian = state.employees.find((e) => e.id === d.custodianId) ?? me;
  const hero = d.photo ?? (mode === "add" ? undefined : "/img/asset-hero.jpg");

  const save = () => {
    const e = { name: !d.name.trim(), serial: !d.serial.trim(), cost: !(d.cost > 0) };
    setErrors(e);
    if (Object.values(e).some(Boolean)) { setShake((n) => n + 1); return; }
    setSaving(true);
    const out: Asset = { ...d, tag: d.tag.trim() || `DOST-${d.category.slice(0, 3).toUpperCase()}-${d.id.slice(-3)}` };
    setTimeout(() => {
      dispatch({ type: "upsertAsset", asset: out, isNew: !asset });
      onSaved?.(out, !asset);
      onClose();
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} label={view ? "View asset" : asset ? "Edit asset" : "Add new asset"} shake={shake}
      className="w-[1000px] max-w-[calc(100vw-48px)] rounded-[28px] bg-[#f4f4f4] overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-slim px-5 pt-5">
        {/* Photo */}
        <div className="relative h-[480px] max-h-[44vh] rounded-[16px] overflow-hidden bg-n-350 grid place-items-center">
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          {!view && (
            <button type="button" onClick={() => file.current?.click()}
              className={cn("relative inline-flex items-center gap-2 rounded-[6px] bg-brand-500 text-white font-semibold cursor-pointer hover:bg-brand-600 transition-colors",
                hero ? "absolute right-4 bottom-4 h-10 px-3 text-[15px]" : "h-12 px-4 text-[24px]")}>
              {hero ? "Change Photo" : "Upload Photo"} <Plus size={hero ? 18 : 26} strokeWidth={2.4} />
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("photo", await readPhoto(f)); e.target.value = ""; }} />
        </div>

        <h2 className="text-[40px] font-bold tracking-[-0.02em] mt-6">{view ? "View Asset" : asset ? "Edit Asset" : "Add New Asset"}</h2>

        <p className="text-[16px] font-semibold mt-5 mb-1 px-1">Asset Information</p>
        <div className="grid grid-cols-2 gap-x-8 px-1">
          <Row icon={Pencil} label="Asset Name:" error={errors.name}><TextCell view={view} value={d.name} onChange={(v) => set("name", v)} error={errors.name} placeholder="Input Asset Name" /></Row>
          <Row icon={Tag} label="Serial ID / Key:" error={errors.serial}><TextCell view={view} value={d.serial} onChange={(v) => set("serial", v)} error={errors.serial} placeholder={`Input Serial ID / Key (e.g. ${PREFIX[d.category]}-0001)`} /></Row>
          <Row icon={Paperclip} label="Asset Tag:" half><TextCell view={view} value={d.tag} onChange={(v) => set("tag", v)} placeholder="Input Asset Tag" /></Row>
          <Row icon={Box} label="Asset Type:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "cat" ? null : "cat")} onClear={asset || d.category !== "Hardware" ? () => set("category", "Hardware") : undefined}>
              <span className="[&>span]:h-9"><CategoryChip category={d.category} /></span>
            </PillSelect>
            <CategoryPopup open={menu === "cat"} onClose={() => setMenu(null)} value={d.category} onPick={(v) => set("category", v as AssetCategory)} />
          </Row>
          <Row icon={CircleDot} label="Operational Status:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "op" ? null : "op")} onClear={() => set("operational", "In Use")}><Pill tone={OP_TONE[d.operational]}>{d.operational}</Pill></PillSelect>
            <OptionPopup open={menu === "op"} onClose={() => setMenu(null)} options={OPS} value={d.operational} onPick={(v) => set("operational", v)}
              tones={{ "In Use": "text-good-text", Maintenance: "text-warn-text", Standby: "text-brand-600", Damaged: "text-bad-text" }} />
          </Row>
          <Row icon={Box} label="Physical Status:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "ph" ? null : "ph")} onClear={() => set("condition", "Excellent")}><Pill tone={PH_TONE[d.condition]}>{d.condition}</Pill></PillSelect>
            <OptionPopup open={menu === "ph"} onClose={() => setMenu(null)} options={PHYSICAL_CONDITION} value={d.condition} onPick={(v) => set("condition", v)}
              tones={{ Excellent: "text-good-text", Fair: "text-warn-text", Poor: "text-bad-text" }} />
          </Row>
        </div>

        <p className="text-[16px] font-semibold mt-5 mb-1 px-1">Value &amp; Custody</p>
        <div className="grid grid-cols-2 gap-x-8 px-1 pb-4">
          <Row icon={PhilippinePeso} label="Acquisition Cost:" error={errors.cost} half>
            {view ? <span className="w-full h-7 px-2 rounded-[2px] bg-white leading-7 tnum">{php(d.cost)}</span> : (
              <span className={cn("w-full flex items-center h-7 rounded-[2px]", d.cost ? "bg-white" : "hover:bg-white/60 focus-within:bg-white", errors.cost && "ring-1 ring-bad-text")}>
                <span className="pl-2 text-ink-2">₱</span>
                <input inputMode="numeric" value={d.cost ? d.cost.toLocaleString("en-PH") : ""} placeholder="0" onChange={(e) => set("cost", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                  className="flex-1 min-w-0 h-full px-1.5 bg-transparent outline-none text-[16px] tnum placeholder:text-ink-3" />
              </span>
            )}
          </Row>
          <Row icon={Calendar} label="Purchase Date:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "date" ? null : "date")}><span className="h-7 px-2 rounded-[2px] bg-white leading-7">{longDate(d.acquiredOn)}</span></PillSelect>
            <CalendarPopup open={menu === "date"} onClose={() => setMenu(null)} value={d.acquiredOn} max={AS_OF} onDone={(v) => set("acquiredOn", v)} align="right" />
          </Row>
          <div className="col-span-2 -mt-1 mb-1 pl-8 t-b3 text-ink-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={d.cost >= CAPITALISATION_THRESHOLD ? "par" : "ics"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state}>
                {d.cost >= CAPITALISATION_THRESHOLD ? "Capital asset — issued on a PAR and depreciated monthly." : `Below ${php(CAPITALISATION_THRESHOLD)} — semi-expendable, issued on an ICS.`}
              </motion.span>
            </AnimatePresence>
          </div>
          <Row icon={Building2} label="Office:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "office" ? null : "office")}><span className="h-7 px-2 rounded-[2px] bg-white leading-7 truncate">DOST {d.office}</span></PillSelect>
            <OptionPopup open={menu === "office"} onClose={() => setMenu(null)} options={OFFICES} value={d.office as (typeof OFFICES)[number]} onPick={(v) => set("office", v)} width={240} />
          </Row>
          <Row icon={Landmark} label="Agency:" half>
            <PillSelect view={view} onToggle={() => setMenu(menu === "agency" ? null : "agency")}><span className="h-7 px-2 rounded-[2px] bg-white leading-7 truncate">{d.agency} — {AGENCIES.find((g) => g.code === d.agency)?.name}</span></PillSelect>
            <OptionPopup open={menu === "agency"} onClose={() => setMenu(null)} options={AGENCIES.map((g) => g.code)} value={d.agency} onPick={(v) => set("agency", v)} width={180} align="right" />
          </Row>
          <Row icon={Building2} label="Department:">
            <PillSelect view={view} onToggle={() => setMenu(menu === "dept" ? null : "dept")}><span className="h-7 px-2 rounded-[2px] bg-white leading-7 truncate">{d.department}</span></PillSelect>
            <DepartmentPopup open={menu === "dept"} onClose={() => setMenu(null)} value={d.department} onPick={(v) => set("department", v)} />
          </Row>
          <Row icon={User} label="Custodian:">
            {view ? <span className="w-full h-7 px-2 rounded-[2px] bg-white leading-7">{custodian.name} · {custodian.position}</span>
              : <div className="w-full [&>div>span]:hidden [&_input]:h-8 [&_input]:text-[16px] [&_input]:font-normal [&_input]:rounded-[2px] [&_input]:border-0"><EmployeePicker label="" value={custodian} onChange={(e) => { set("custodianId", e.id); set("office", e.office); set("department", e.department); }} /></div>}
          </Row>
        </div>
        <AnimatePresence>{Object.values(errors).some(Boolean) && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-1 pb-3 t-b2 text-bad-text">Add the asset name, serial ID and acquisition cost.</motion.p>
        )}</AnimatePresence>
      </div>

      <footer className="flex items-center gap-3 px-6 h-[76px] shrink-0">
        <span className="flex items-center gap-2 t-b2 text-ink-2"><Calendar size={15} />{longDate(view || asset ? d.acquiredOn : AS_OF)}<span className="mx-1">•</span><Clock size={15} />12:00 AM</span>
        <div className="ml-auto flex gap-3">
          {view ? (
            <button type="button" onClick={onClose} className="h-[33px] px-3 rounded-[6px] border border-line bg-tint text-[20px] font-semibold text-ink-2 hover:bg-line cursor-pointer transition-colors">Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="h-[33px] px-3 rounded-[6px] border border-line bg-tint text-[20px] font-semibold text-ink-2 hover:bg-line cursor-pointer transition-colors">Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="relative h-[33px] px-3 rounded-[6px] border border-brand-200 bg-brand-100 text-[20px] font-semibold text-brand-800 hover:bg-brand-200 cursor-pointer transition-colors disabled:opacity-70">
                <span className={cn(saving && "opacity-0")}>{asset ? "Edit Asset" : "Add Asset"}</span>
                {saving && <span className="absolute inset-0 grid place-items-center"><span className="size-4 rounded-full border-2 border-brand-700 border-r-transparent animate-spin" /></span>}
              </button>
            </>
          )}
        </div>
      </footer>
    </Modal>
  );
}

/** Figma Delete Asset (4229:14732) → Asset Successfully Deleted (4229:14733). */
export function DeleteAssetFlow({ assetIds, onClose, onDeleted }: { assetIds: string[] | null; onClose: () => void; onDeleted?: () => void }) {
  const { dispatch } = useStore();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const k = assetIds?.join(",") ?? null;
  if (k !== seen) { setSeen(k); if (k) { setDone(false); setBusy(false); } }
  const many = (assetIds?.length ?? 0) > 1;
  const btn = "h-[60px] px-9 rounded-[6px] text-[24px] font-semibold cursor-pointer transition-colors border";
  return (
    <>
      <IllustratedModal open={!!assetIds && !done} onClose={onClose} label="Delete asset" image="/img/illustrations/delete.jpg" imageHeight={347}
        title={many ? `Delete ${assetIds!.length} Assets` : "Delete Asset"} body={<>Are you sure you want to delete {many ? "these assets" : "this asset"}?<br />This action cannot be undone</>}>
        <div className="flex justify-center gap-5">
          <button type="button" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { dispatch({ type: "removeAssets", ids: assetIds! }); setDone(true); onDeleted?.(); }, 450); }}
            className={cn(btn, "bg-bad-soft/80 border-bad-soft text-bad-text hover:bg-bad-soft disabled:opacity-70")}>{busy ? "Deleting…" : "Delete"}</button>
          <button type="button" onClick={onClose} className={cn(btn, "bg-tint border-line text-ink-2 hover:bg-line")}>Cancel</button>
        </div>
      </IllustratedModal>
      <IllustratedModal open={!!assetIds && done} onClose={onClose} label="Asset deleted" image="/img/illustrations/delete.jpg" imageHeight={347}
        title={many ? "Assets Successfully Deleted" : "Asset Successfully Deleted"} body="Proceed to Asset Registry">
        <button type="button" onClick={onClose} className={cn(btn, "bg-tint border-line text-ink-2 hover:bg-line")}>Proceed</button>
      </IllustratedModal>
    </>
  );
}
