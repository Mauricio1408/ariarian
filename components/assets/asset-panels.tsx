"use client";

import { AnimatePresence, motion } from "motion/react";
import { MapPin, X } from "lucide-react";
import { useLookups } from "@/lib/store";
import { formType } from "@/lib/selectors";
import { longDate, php } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { Avatar, Button, Thumb } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { RecordDivider, RecordLabel } from "@/components/ui/record-kit";
import { T } from "@/components/ui/motion";
import { OP_TONE, PH_TONE, StatusPill } from "./record";

/** Asset photo at a given box; falls back to the category tile when the record has no photo. */
function Photo({ a, className }: { a: Asset; className: string }) {
  return a.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.photo} alt={a.name} draggable={false} className={`object-cover ${className}`} />
  ) : (
    <span className={`grid place-items-center bg-head ${className}`}><Thumb category={a.category} size={56} /></span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 leading-[1.4]">
      <span className="text-[12px] text-ink-2 shrink-0">{label}</span>
      <span className="text-[14px] text-deep text-right truncate">{children}</span>
    </div>
  );
}

/** 02 — Asset Registry · Split View: the 380px "Selected asset" panel (Figma 4773:2169). */
export function AssetSplitPanel({ asset: a, onClose, onOpen }: { asset: Asset | undefined; onClose: () => void; onOpen: (id: string) => void }) {
  const L = useLookups();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {a && (
        <motion.aside key="panel" aria-label="Selected asset"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }} transition={T.page}
          className="w-[380px] shrink-0 self-stretch bg-white border border-rule rounded-[12px] overflow-hidden flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-rule text-[12px] text-ink-2 leading-[1.4]">
            <span>SELECTED ASSET</span>
            <button type="button" onClick={onClose} aria-label="Close panel" className="grid place-items-center size-6 -m-1 rounded-md hover:bg-tint cursor-pointer"><X size={14} /></button>
          </header>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="flex flex-col">
              <div className="p-4"><Photo a={a} className="w-full h-[180px] rounded-[10px]" /></div>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-deep">{a.name}</h2>
                  <p className="text-[12px] text-ink-2 leading-[1.4]">{a.serial} · {a.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill>
                  <StatusPill size="sm" tone={PH_TONE[a.condition]}>{a.condition}</StatusPill>
                </div>
                <RecordDivider />
                <div className="flex flex-col gap-2.5">
                  <Field label="Acquisition value"><span className="font-medium tnum">{php(a.cost)}</span></Field>
                  <Field label="Acquired on">{longDate(a.acquiredOn)}</Field>
                  <Field label="Category">{a.category}</Field>
                </div>
                <RecordDivider />
                <div className="flex flex-col gap-2.5">
                  <RecordLabel>Assigned to</RecordLabel>
                  {(() => {
                    const c = a.custodianId ? L.employee.get(a.custodianId) : undefined;
                    return c ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar src={c.avatar} name={c.name} size={36} />
                        <div className="min-w-0 leading-[1.4]">
                          <p className="text-[14px] font-medium text-deep truncate">{c.name}</p>
                          <p className="text-[12px] text-ink-2 truncate">{c.position}</p>
                        </div>
                      </div>
                    ) : <p className="text-[14px] text-ink-2">Unassigned — no custodian yet</p>;
                  })()}
                </div>
                <RecordDivider />
                <div className="flex flex-col gap-2">
                  <RecordLabel>Department &amp; location</RecordLabel>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} strokeWidth={1.6} className="shrink-0 text-ink-2" />
                    <div className="min-w-0 leading-[1.4]">
                      <p className="text-[14px] text-deep truncate">{a.department}</p>
                      <p className="text-[12px] text-ink-2 truncate">{a.office}</p>
                    </div>
                  </div>
                </div>
                <RecordDivider />
                <Button variant="primary" size="rec" className="self-start" onClick={() => onOpen(a.id)}>View full record</Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function RecordField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 min-h-[62px] py-[7px]">
      <span className="flex-1 text-[12px] text-ink-2">{label}</span>
      <span className="flex-1 min-w-0 text-[14px] text-ink">{children}</span>
    </div>
  );
}

/**
 * 04 — Asset Record · Read-Only Modal (Figma 4773:2360). Shown to custodians, who can see the record
 * but not transfer, edit or print it; admins get the 4-tab drawer from the same "View full record".
 */
export function AssetReadOnlyModal({ asset: a, onClose }: { asset: Asset | undefined; onClose: () => void }) {
  const L = useLookups();
  const c = a?.custodianId ? L.employee.get(a.custodianId) : undefined;
  const par = a ? formType(a) === "PAR" : false;
  return (
    <Modal open={!!a} onClose={onClose} label="Asset record" className="w-[1000px] max-w-[calc(100vw-48px)] rounded-[16px] p-6">
      {a && (
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0 flex flex-col gap-[5px]">
              <p className="text-[12px] text-ink-2 leading-[1.4]">ASSET RECORD · READ ONLY</p>
              <h2 className="text-[24px] font-bold leading-[1.25] tracking-[-0.01em] text-deep truncate">{a.name}</h2>
            </div>
            <StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill>
            <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center size-8 rounded-md text-ink-2 hover:bg-tint cursor-pointer"><X size={20} strokeWidth={2.2} /></button>
          </div>
          <RecordDivider />
          <div className="flex gap-6 items-start">
            <div className="w-[208px] shrink-0 flex flex-col gap-4">
              <Photo a={a} className="size-[208px] rounded-[12px]" />
              <p className="text-[12px] text-ink-2 leading-[1.4]">ACQUISITION COST</p>
              <p className="text-[28px] font-bold leading-[1.2] tracking-[-0.015em] text-deep tnum">{php(a.cost)}</p>
              <div className="bg-pick rounded-[8px] p-3 flex flex-col gap-[7px] text-[12px]">
                <p className="font-semibold uppercase tracking-[0.06em] leading-[1.3] text-brand-700">{par ? "PAR" : "ICS"}</p>
                <p className="text-ink-2 leading-[1.4]">{par
                  ? "Capital asset — issued on a Property Acknowledgement Receipt and depreciated monthly."
                  : "Semi-expendable — below ₱50,000, issued on an Inventory Custodian Slip."}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <RecordLabel strong>Identification</RecordLabel>
              <RecordField label="Asset record number">{a.id}</RecordField>
              <RecordField label="Serial ID / key">{a.serial}</RecordField>
              <RecordField label="Asset tag">{a.tag}</RecordField>
              <RecordField label="Asset type">{a.category}</RecordField>
              <RecordDivider />
              <RecordLabel strong>Acquisition</RecordLabel>
              <RecordField label="Purchase date">{longDate(a.acquiredOn)}</RecordField>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <RecordLabel strong>Condition</RecordLabel>
              <div className="flex flex-col gap-2 items-start">
                <p className="text-[12px] text-ink-2 leading-[1.4]">Operational status</p>
                <StatusPill size="sm" tone={OP_TONE[a.operational]}>{a.operational}</StatusPill>
                <p className="text-[12px] text-ink-2 leading-[1.4]">Physical condition</p>
                <StatusPill size="sm" tone={PH_TONE[a.condition]}>{a.condition}</StatusPill>
              </div>
              <RecordDivider />
              <RecordLabel strong>Custody &amp; location</RecordLabel>
              {c ? (
                <div className="flex items-center gap-3 h-[60px] py-2">
                  <Avatar src={c.avatar} name={c.name} size={44} />
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <p className="text-[16px] font-semibold text-ink truncate">{c.name}</p>
                    <p className="text-[12px] text-ink-2">{c.position}</p>
                  </div>
                </div>
              ) : <p className="text-[14px] text-ink-2 h-[60px] flex items-center">Unassigned</p>}
              <div className="flex flex-col -mt-4">
                <RecordField label="Department">{a.department}</RecordField>
                <RecordField label="Office">DOST {a.office}</RecordField>
                <RecordField label="Agency">{a.agency} — {L.agency.get(a.agency)?.name ?? a.agency}</RecordField>
              </div>
            </div>
          </div>
          <RecordDivider />
          <div className="flex items-center gap-4">
            <p className="flex-1 text-[12px] text-ink-2 leading-[1.4]">{a.lastAudit ? `Last audit · ${longDate(a.lastAudit)}` : "Not audited yet"}</p>
            <Button variant="record" size="rec" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
