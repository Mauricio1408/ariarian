"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Pencil, RefreshCw, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AS_OF, CAPITALISATION_THRESHOLD, OPERATIONAL_STATUS, PHYSICAL_CONDITION } from "@/lib/types";
import type { Asset, AssetCategory, OperationalStatus } from "@/lib/types";
import { AGENCIES, OFFICES } from "@/lib/seed";
import { FIELD_ICON as F } from "@/lib/field-icons";
import { longDate, php } from "@/lib/format";
import { Button, CATEGORY_ICON, CategoryChip, categoryTone } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { CalendarPopup, CategoryPopup, DepartmentPopup, OptionPopup } from "@/components/ui/popups";
import { PersonPicker } from "@/components/ui/person-picker";
import { T } from "@/components/ui/motion";
import { IllustratedModal } from "@/components/auth/auth-ui";
import { OP_TONE, PH_TONE, RecordRow, RecordSection, StatusPill } from "./record";

export type AssetModalMode = "add" | "edit" | "view";

const PREFIX: Record<AssetCategory, string> = { Hardware: "SN-HW", Software: "LIC", Office: "OFC", Vehicles: "VEH", Appliances: "APP", Essentials: "ESS", Others: "LAB" };
const OPS = OPERATIONAL_STATUS.slice(0, 4) as OperationalStatus[];

/** Single-choice fields the X button can empty. An emptied field must be chosen again before saving. */
type Clearable = "category" | "operational" | "condition";

/** Downscale an uploaded photo so it fits comfortably in localStorage, keeping it sharp at 2x. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function TextCell({ value, onChange, placeholder, view, error, mono }: { value: string; onChange: (v: string) => void; placeholder: string; view: boolean; error?: boolean; mono?: boolean }) {
  if (view) return <span className={cn("px-2.5 text-[15px] truncate", mono && "tnum", !value && "text-ink-3")}>{value || "—"}</span>;
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={cn("w-full h-9 rounded-md px-2.5 bg-transparent text-[15px] outline-none placeholder:text-ink-3 transition-[background-color,box-shadow] duration-[120ms]",
        "hover:bg-tint focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-brand-400),0_0_0_3px_var(--color-brand-100)]", mono && "tnum",
        error && "shadow-[inset_0_0_0_1px_var(--color-bad-text)]")} />
  );
}

/** A value that opens a picker. `onClear` (single-choice fields) empties it; otherwise a chevron. */
function SelectCell({ onToggle, view, onClear, open, error, children }: { onToggle: () => void; view: boolean; onClear?: () => void; open?: boolean; error?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex-1 min-w-0 flex items-center rounded-md transition-colors duration-[120ms]", !view && "hover:bg-tint", open && "bg-tint", error && "shadow-[inset_0_0_0_1px_var(--color-bad-text)]")}>
      <button type="button" disabled={view} onClick={onToggle} className="flex-1 min-w-0 flex items-center h-9 px-2.5 text-left text-[15px] cursor-pointer disabled:cursor-default">{children}</button>
      {!view && (onClear
        ? <button type="button" onClick={onClear} aria-label="Clear value" title="Clear" className="grid place-items-center size-8 mr-0.5 rounded-md text-ink-2 hover:text-ink hover:bg-line/70 cursor-pointer transition-colors"><X size={16} strokeWidth={2} /></button>
        : <button type="button" onClick={onToggle} aria-label="Choose" className="grid place-items-center size-8 mr-0.5 rounded-md text-ink-2 cursor-pointer"><ChevronDown size={18} strokeWidth={1.75} className={cn("transition-transform duration-200", open && "rotate-180")} /></button>)}
    </div>
  );
}

const Placeholder = ({ children }: { children: React.ReactNode }) => <span className="text-ink-3">{children}</span>;

/** Asset record — Add (958:3267) · Edit (1926:9325) · View (1906:13986), laid out as a record page. */
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
  const fresh = (): Partial<Record<Clearable, boolean>> => (asset ? {} : { category: true, operational: true, condition: true });
  const [d, setD] = useState<Asset>(asset ?? blank());
  const [unset, setUnset] = useState<Partial<Record<Clearable, boolean>>>(fresh);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const [menu, setMenu] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const k = `${open}-${asset?.id ?? "new"}-${mode}`;
  if (k !== key) { setKey(k); setD(asset ?? blank()); setUnset(fresh()); setEditing(false); setErrors({}); setSaving(false); setMenu(null); }

  const view = mode === "view" && !editing;
  const isNew = !asset;
  const set = <K extends keyof Asset>(f: K, v: Asset[K]) => { setD((x) => ({ ...x, [f]: v })); setErrors((e) => ({ ...e, [f]: false })); };
  const pick = <K extends Clearable>(f: K, v: Asset[K]) => { set(f, v); setUnset((u) => ({ ...u, [f]: false })); };
  const clear = (f: Clearable) => { setUnset((u) => ({ ...u, [f]: true })); setMenu(null); };
  const toggle = (m: string) => setMenu(menu === m ? null : m);
  const custodian = state.employees.find((e) => e.id === d.custodianId) ?? null;
  const agency = AGENCIES.find((g) => g.code === d.agency);
  const capital = d.cost >= CAPITALISATION_THRESHOLD;
  const CatIcon = CATEGORY_ICON[d.category];

  const takePhoto = async (f?: File | null) => { if (f && f.type.startsWith("image/")) set("photo", await readPhoto(f)); };

  const save = () => {
    const e: Record<string, boolean> = {
      name: !d.name.trim(), serial: !d.serial.trim(), cost: !(d.cost > 0),
      category: !!unset.category, operational: !!unset.operational, condition: !!unset.condition,
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) { setShake((n) => n + 1); return; }
    setSaving(true);
    const out: Asset = { ...d, tag: d.tag.trim() || `DOST-${d.category.slice(0, 3).toUpperCase()}-${d.id.slice(-3)}` };
    setTimeout(() => {
      dispatch({ type: "upsertAsset", asset: out, isNew });
      onSaved?.(out, isNew);
      onClose();
    }, 500);
  };

  const missing = Object.entries(errors).filter(([, v]) => v).map(([f]) => ({ name: "asset name", serial: "serial ID", cost: "acquisition cost", category: "asset type", operational: "operational status", condition: "physical status" }[f]));

  return (
    <Modal open={open} onClose={onClose} label={view ? "View asset" : isNew ? "Add new asset" : "Edit asset"} shake={shake}
      className="w-[1040px] max-w-[calc(100vw-48px)] rounded-[24px] bg-[#f4f4f4] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-start gap-4 px-7 pt-6 pb-5 bg-white border-b border-line shrink-0">
        <div className="min-w-0">
          <p className="t-b3 text-ink-2 tnum">Asset registry · {d.id}</p>
          <h2 className="t-h4 mt-0.5 truncate">{view ? d.name : isNew ? "Add new asset" : `Edit ${asset?.name}`}</h2>
        </div>
        {view && <span className="mt-1.5"><StatusPill tone={OP_TONE[d.operational]}>{d.operational}</StatusPill></span>}
        <CloseButton onClick={onClose} className="ml-auto -mr-2" />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scroll-slim">
        <div className="grid grid-cols-[300px_1fr] gap-5 px-6 py-5 items-start">
          {/* Left — photo + value summary */}
          <aside className="sticky top-5 space-y-4">
            <div
              onDragOver={(e) => { if (view) return; e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)}
              onDrop={(e) => { if (view) return; e.preventDefault(); setDropping(false); takePhoto(e.dataTransfer.files?.[0]); }}
              className={cn("group relative aspect-square rounded-[16px] overflow-hidden transition-shadow duration-200",
                d.photo ? "bg-n-350" : cn("grid place-items-center", view ? categoryTone(d.category) : "bg-white border-2 border-dashed border-dash"),
                dropping && "shadow-[0_0_0_3px_var(--color-brand-300)]")}>
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt={d.name} className="absolute inset-0 size-full object-cover" />
              ) : view ? (
                <CatIcon size={72} strokeWidth={1.25} />
              ) : (
                <button type="button" onClick={() => file.current?.click()} className="flex flex-col items-center text-center px-6 cursor-pointer">
                  <span className="grid place-items-center size-12 rounded-full bg-brand-50 text-brand-600"><ImagePlus size={22} strokeWidth={1.75} /></span>
                  <span className="t-b2s mt-3">Upload a photo</span>
                  <span className="t-b3 text-ink-2 mt-0.5">Drop an image here or click to browse</span>
                </button>
              )}
              {d.photo && !view && (
                <button type="button" onClick={() => file.current?.click()}
                  className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/95 text-[13px] font-medium text-ink shadow-raised opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-[120ms] cursor-pointer">
                  <RefreshCw size={14} strokeWidth={2} /> Change photo
                </button>
              )}
              <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { await takePhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </div>

            <div className="rounded-[14px] bg-white border border-line/80 p-4">
              <p className="t-l1 text-ink-2">Acquisition cost</p>
              <p className="text-[26px] font-bold tracking-[-0.02em] tnum mt-1">{d.cost ? php(d.cost) : <span className="text-ink-3">₱0</span>}</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={capital ? "par" : "ics"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state} className="mt-3 flex gap-2.5">
                  <span className={cn("shrink-0 h-6 px-2 rounded-md text-[12px] font-semibold grid place-items-center", capital ? "bg-brand-100 text-brand-700" : "bg-warn-soft text-warn-text")}>{capital ? "PAR" : "ICS"}</span>
                  <p className="t-b3 text-ink-2 leading-[1.45]">{capital ? "Capital asset — issued on a Property Acknowledgement Receipt and depreciated monthly." : `Below ${php(CAPITALISATION_THRESHOLD)} — semi-expendable, issued on an Inventory Custodian Slip.`}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>

          {/* Right — the record */}
          <div className="space-y-4 min-w-0">
            <RecordSection title="Identification">
              <RecordRow icon={F.name} label="Asset name" required={!view} error={errors.name}>
                <TextCell view={view} value={d.name} onChange={(v) => set("name", v)} error={errors.name} placeholder="e.g. Lenovo ThinkPad T14" />
              </RecordRow>
              <RecordRow icon={F.serial} label="Serial ID / Key" required={!view} error={errors.serial}>
                <TextCell mono view={view} value={d.serial} onChange={(v) => set("serial", v)} error={errors.serial} placeholder={`e.g. ${PREFIX[d.category]}-0001`} />
              </RecordRow>
              <RecordRow icon={F.tag} label="Asset tag">
                <TextCell mono view={view} value={d.tag} onChange={(v) => set("tag", v)} placeholder="Generated on save if left blank" />
              </RecordRow>
              <RecordRow icon={F.type} label="Asset type" required={!view} error={errors.category}>
                <SelectCell view={view} open={menu === "cat"} error={errors.category} onToggle={() => toggle("cat")} onClear={unset.category ? undefined : () => clear("category")}>
                  {unset.category ? <Placeholder>Select asset type</Placeholder> : <span className="[&>span]:h-8 [&>span]:w-auto [&>span]:px-3 [&>span]:text-[14px]"><CategoryChip category={d.category} /></span>}
                </SelectCell>
                <CategoryPopup open={menu === "cat"} onClose={() => setMenu(null)} value={unset.category ? null : d.category} onPick={(v) => { pick("category", v as AssetCategory); setMenu(null); }} />
              </RecordRow>
            </RecordSection>

            <RecordSection title="Condition">
              <RecordRow icon={F.operational} label="Operational status" required={!view} error={errors.operational}>
                <SelectCell view={view} open={menu === "op"} error={errors.operational} onToggle={() => toggle("op")} onClear={unset.operational ? undefined : () => clear("operational")}>
                  {unset.operational ? <Placeholder>Select status</Placeholder> : <StatusPill tone={OP_TONE[d.operational]}>{d.operational}</StatusPill>}
                </SelectCell>
                <OptionPopup open={menu === "op"} onClose={() => setMenu(null)} options={OPS} value={unset.operational ? null : d.operational} onPick={(v) => { pick("operational", v); setMenu(null); }}
                  tones={{ "In Use": "text-good-text", Maintenance: "text-warn-text", Standby: "text-brand-600", Damaged: "text-bad-text" }} />
              </RecordRow>
              <RecordRow icon={F.physical} label="Physical status" required={!view} error={errors.condition}>
                <SelectCell view={view} open={menu === "ph"} error={errors.condition} onToggle={() => toggle("ph")} onClear={unset.condition ? undefined : () => clear("condition")}>
                  {unset.condition ? <Placeholder>Select condition</Placeholder> : <StatusPill tone={PH_TONE[d.condition]}>{d.condition}</StatusPill>}
                </SelectCell>
                <OptionPopup open={menu === "ph"} onClose={() => setMenu(null)} options={PHYSICAL_CONDITION} value={unset.condition ? null : d.condition} onPick={(v) => { pick("condition", v); setMenu(null); }}
                  tones={{ Excellent: "text-good-text", Fair: "text-warn-text", Poor: "text-bad-text" }} />
              </RecordRow>
            </RecordSection>

            <RecordSection title="Acquisition">
              <RecordRow icon={F.value} label="Acquisition cost" required={!view} error={errors.cost}>
                {view ? <span className="px-2.5 text-[15px] tnum">{php(d.cost)}</span> : (
                  <span className={cn("w-full flex items-center h-9 rounded-md transition-[background-color,box-shadow] duration-[120ms] hover:bg-tint focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_var(--color-brand-400),0_0_0_3px_var(--color-brand-100)]",
                    errors.cost && "shadow-[inset_0_0_0_1px_var(--color-bad-text)]")}>
                    <span className="pl-2.5 text-[15px] text-ink-2">₱</span>
                    <input inputMode="numeric" value={d.cost ? d.cost.toLocaleString("en-PH") : ""} placeholder="0" onChange={(e) => set("cost", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                      className="flex-1 min-w-0 h-full px-1.5 bg-transparent outline-none text-[15px] tnum placeholder:text-ink-3" />
                  </span>
                )}
              </RecordRow>
              <RecordRow icon={F.date} label="Purchase date">
                <SelectCell view={view} open={menu === "date"} onToggle={() => toggle("date")}>{longDate(d.acquiredOn)}</SelectCell>
                <CalendarPopup open={menu === "date"} onClose={() => setMenu(null)} value={d.acquiredOn} max={AS_OF} onDone={(v) => set("acquiredOn", v)} />
              </RecordRow>
            </RecordSection>

            <RecordSection title="Custody & location">
              <RecordRow icon={F.custodian} label="Custodian">
                {view ? (
                  <span className="px-1.5 w-full"><PersonPicker disabled value={custodian} onChange={() => {}} /></span>
                ) : (
                  <PersonPicker value={custodian} placement="up" onChange={(e) => { set("custodianId", e.id); set("office", e.office); set("department", e.department); }} />
                )}
              </RecordRow>
              <RecordRow icon={F.department} label="Department">
                <SelectCell view={view} open={menu === "dept"} onToggle={() => toggle("dept")}><span className="truncate">{d.department}</span></SelectCell>
                <DepartmentPopup open={menu === "dept"} onClose={() => setMenu(null)} value={d.department} onPick={(v) => { set("department", v); setMenu(null); }} />
              </RecordRow>
              <RecordRow icon={F.office} label="Office">
                <SelectCell view={view} open={menu === "office"} onToggle={() => toggle("office")}><span className="truncate">DOST {d.office}</span></SelectCell>
                <OptionPopup open={menu === "office"} onClose={() => setMenu(null)} options={OFFICES} value={d.office as (typeof OFFICES)[number]} onPick={(v) => { set("office", v); setMenu(null); }} width={260} />
              </RecordRow>
              <RecordRow icon={F.agency} label="Agency">
                <SelectCell view={view} open={menu === "agency"} onToggle={() => toggle("agency")}>
                  <span className="truncate"><span className="font-medium">{d.agency}</span><span className="text-ink-2"> — {agency?.name}</span></span>
                </SelectCell>
                <OptionPopup open={menu === "agency"} onClose={() => setMenu(null)} options={AGENCIES.map((g) => g.code)} value={d.agency} onPick={(v) => { set("agency", v); setMenu(null); }} width={200} />
              </RecordRow>
            </RecordSection>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-3 px-7 h-[68px] bg-white border-t border-line shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {missing.length ? (
            <motion.p key="err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={T.state} className="t-b2 text-bad-text truncate">
              Add the {missing.join(", ").replace(/, ([^,]*)$/, " and $1")}.
            </motion.p>
          ) : (
            <motion.p key="meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state} className="flex items-center gap-2 t-b2 text-ink-2 truncate">
              <F.date size={15} strokeWidth={1.75} />
              {isNew ? <>Logged to the audit trail as {me.name} · {longDate(AS_OF)}</> : <>Acquired {longDate(d.acquiredOn)}{d.lastAudit ? ` · last audit ${longDate(d.lastAudit)}` : ""}</>}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="ml-auto flex gap-2.5 shrink-0">
          {view ? (
            <>
              <Button onClick={onClose} className="h-10 px-4">Close</Button>
              <Button variant="primary" icon={Pencil} onClick={() => setEditing(true)} className="h-10 px-4">Edit asset</Button>
            </>
          ) : (
            <>
              <Button onClick={onClose} className="h-10 px-4">Cancel</Button>
              <Button variant="primary" loading={saving} onClick={save} className="h-10 px-4">{isNew ? "Add asset" : "Save changes"}</Button>
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
