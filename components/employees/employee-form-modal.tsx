"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EMPLOYEE_STATUS } from "@/lib/types";
import type { Employee } from "@/lib/types";
import { OFFICES } from "@/lib/seed";
import { Avatar, Button, Field, Select } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";

export function EmployeeFormModal({ open, employee, onClose }: { open: boolean; employee: Employee | null; onClose: () => void }) {
  const { state, dispatch, toast } = useStore();
  const blank = (): Employee => ({ id: `DOST-2026-${String(600 + state.seq + state.employees.length).padStart(4, "0")}`, name: "", email: "", position: "", office: "Central Office", status: "Active", lastAudit: "2026-03-14" });
  const [d, setD] = useState<Employee>(employee ?? blank());
  const [key, setKey] = useState("");
  const [err, setErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const k = `${open}-${employee?.id ?? "new"}`;
  if (k !== key) { setKey(k); setD(employee ?? blank()); setErr(false); setSaving(false); }
  const set = <K extends keyof Employee>(f: K, v: Employee[K]) => setD((x) => ({ ...x, [f]: v }));

  const save = () => {
    if (!d.name.trim() || !d.position.trim()) { setErr(true); setShake((n) => n + 1); return; }
    setSaving(true);
    const email = d.email || `${d.name.split(" ")[0][0].toLowerCase()}${d.name.split(" ").pop()!.toLowerCase()}@dost.gov.ph`;
    setTimeout(() => {
      dispatch({ type: "upsertEmployee", employee: { ...d, email }, isNew: !employee });
      toast({ title: employee ? `${d.name} updated` : `${d.name} added`, body: employee ? "Employee record saved" : `${d.id} • ${d.office}`, tone: "good" });
      onClose();
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} label={employee ? "Edit employee" : "Add employee"} shake={shake} className="w-[640px]">
      <header className="flex items-center gap-4 px-8 h-[80px] border-b border-line">
        <Avatar src={d.avatar} name={d.name || "New Employee"} size={44} />
        <div><h2 className="text-[20px] font-semibold">{employee ? "Edit employee" : "Add employee"}</h2><p className="t-b3 text-ink-2">{d.id}</p></div>
        <CloseButton onClick={onClose} className="ml-auto" />
      </header>
      <div className="grid grid-cols-2 gap-4 px-8 py-6">
        <div className={cn(err && !d.name.trim() && "[&_input]:border-bad-text")}><Field label="Full name" value={d.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="e.g. Andrea Ramos" /></div>
        <Field label="Work email" value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="auto-generated if blank" />
        <div className={cn(err && !d.position.trim() && "[&_input]:border-bad-text")}><Field label="Position" value={d.position} onChange={(e) => set("position", e.target.value)} placeholder="e.g. Administrative Officer II" /></div>
        <Select label="Office" value={d.office} onChange={(v) => set("office", v)} options={OFFICES.map((o) => ({ value: o, label: o }))} />
        <Select label="Status" value={d.status} onChange={(v) => set("status", v as Employee["status"])} options={EMPLOYEE_STATUS.map((o) => ({ value: o, label: o }))} />
        <Field label="Employee ID" value={d.id} readOnly />
        {err && <p className="col-span-2 t-b3 text-bad-text">Name and position are required.</p>}
      </div>
      <footer className="flex justify-end gap-3 px-8 h-[72px] items-center border-t border-line">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>{employee ? "Save changes" : "Add employee"}</Button>
      </footer>
    </Modal>
  );
}
