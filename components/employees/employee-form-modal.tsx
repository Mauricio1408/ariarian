"use client";

import { useState } from "react";
import { BadgeCheck, Briefcase, Building2, ChevronDown, CircleCheck, Mail, MapPin, Phone, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { OFFICES } from "@/lib/seed";
import { EMPLOYEE_STATUS } from "@/lib/types";
import type { Employee } from "@/lib/types";
import { Modal } from "@/components/ui/overlay";
import { DepartmentPopup, OptionPopup } from "@/components/ui/popups";

function Cell({ icon: I, value, onChange, placeholder, error, type = "text" }: { icon: LucideIcon; value: string; onChange: (v: string) => void; placeholder: string; error?: boolean; type?: string }) {
  return (
    <label className={cn("flex items-center gap-2 h-7 rounded-[8px] border bg-white px-2.5 transition-[border-color,box-shadow] duration-[120ms] focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_var(--color-brand-100)]",
      error ? "border-bad-text" : "border-line")}>
      <I size={15} strokeWidth={1.5} className="text-ink-2 shrink-0" />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" />
    </label>
  );
}

function SelectCell({ icon: I, label, placeholder, onClick }: { icon: LucideIcon; label: string; placeholder: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-2 h-7 rounded-[8px] border border-line bg-white px-2.5 text-left cursor-pointer hover:border-ink-3 transition-colors">
      <I size={15} strokeWidth={1.5} className="text-ink-2 shrink-0" />
      <span className={cn("flex-1 truncate text-[15px]", !label && "text-ink-3")}>{label || placeholder}</span>
      <ChevronDown size={16} className="text-ink-2" />
    </button>
  );
}

/** Figma "Employee Registration" (2037:17202). Full name and position added in the same row style. */
export function EmployeeFormModal({ open, employee, onClose }: { open: boolean; employee: Employee | null; onClose: () => void }) {
  const { state, dispatch, toast } = useStore();
  const blank = (): Employee => ({
    id: `DOST-2026-${String(600 + state.seq + state.employees.length).padStart(4, "0")}`, name: "", email: "", position: "",
    office: "Central Office", department: "", status: "Active", lastAudit: "2026-03-14",
  });
  const [d, setD] = useState<Employee & { agencyName?: string }>(employee ?? blank());
  const [key, setKey] = useState("");
  const [err, setErr] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const [menu, setMenu] = useState<string | null>(null);
  const k = `${open}-${employee?.id ?? "new"}`;
  if (k !== key) { setKey(k); setD(employee ? { ...employee, agencyName: "Department of Science and Technology" } : { ...blank(), agencyName: "" }); setErr({}); setSaving(false); setMenu(null); }
  const set = <K extends keyof (Employee & { agencyName?: string })>(f: K, v: (Employee & { agencyName?: string })[K]) => { setD((x) => ({ ...x, [f]: v })); setErr((e) => ({ ...e, [f]: false })); };

  const save = () => {
    const email = d.email.trim();
    const e = { name: !d.name.trim(), email: !/@dost\.gov\.ph$/i.test(email), department: !d.department, position: !d.position.trim() };
    setErr(e);
    if (Object.values(e).some(Boolean)) { setShake((n) => n + 1); return; }
    setSaving(true);
    const { agencyName: _a, ...emp } = d; void _a;
    setTimeout(() => {
      dispatch({ type: "upsertEmployee", employee: { ...emp, email }, isNew: !employee });
      toast({ title: employee ? `${d.name} updated` : `${d.name} registered`, body: employee ? "Employee record saved" : `${d.id} • ${d.department}`, tone: "good" });
      onClose();
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} label={employee ? "Edit employee" : "Employee registration"} shake={shake} className="w-[659px] max-w-[calc(100vw-48px)] rounded-[20px] overflow-visible">
      <div className="px-[43px] pt-9 pb-6">
        <h2 className="text-[20px] font-semibold">{employee ? "Edit Employee" : "Employee Registration"}</h2>

        <p className="text-[16px] text-ink-2 mt-4 mb-2">Personal Information</p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-3">
          <Cell icon={User} value={d.name} onChange={(v) => set("name", v)} placeholder="Enter full name" error={err.name} />
          <Cell icon={Mail} type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="Enter email address" error={err.email} />
          <Cell icon={Phone} value={d.contact ?? ""} onChange={(v) => set("contact", v)} placeholder="Enter contact number" />
          <Cell icon={Briefcase} value={d.position} onChange={(v) => set("position", v)} placeholder="Enter position" error={err.position} />
        </div>

        <p className="text-[16px] text-ink-2 mt-5 mb-2">Organizational Information</p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-3">
          <div className={cn("relative", err.department && "[&>button]:border-bad-text")}>
            <SelectCell icon={Building2} label={d.department} placeholder="Select department" onClick={() => setMenu(menu === "dept" ? null : "dept")} />
            <DepartmentPopup open={menu === "dept"} onClose={() => setMenu(null)} value={d.department} onPick={(v) => set("department", v)} />
          </div>
          <div className="relative">
            <Cell icon={Users} value={d.agencyName ?? ""} onChange={(v) => set("agencyName", v)} placeholder="Enter agency name" />
          </div>
          <div className="relative">
            <SelectCell icon={Building2} label={d.office ? `DOST ${d.office}` : ""} placeholder="Enter office" onClick={() => setMenu(menu === "office" ? null : "office")} />
            <OptionPopup open={menu === "office"} onClose={() => setMenu(null)} options={OFFICES} value={d.office as (typeof OFFICES)[number]} onPick={(v) => set("office", v)} width={240} />
          </div>
          <Cell icon={MapPin} value={d.address ?? ""} onChange={(v) => set("address", v)} placeholder="Enter address" />
          {employee && (
            <div className="relative">
              <SelectCell icon={BadgeCheck} label={d.status} placeholder="Status" onClick={() => setMenu(menu === "status" ? null : "status")} />
              <OptionPopup open={menu === "status"} onClose={() => setMenu(null)} options={EMPLOYEE_STATUS} value={d.status} onPick={(v) => set("status", v)} width={200} />
            </div>
          )}
        </div>
        {Object.values(err).some(Boolean) && <p className="t-b3 text-bad-text mt-3">Add a name, position, department and an @dost.gov.ph email.</p>}

        <div className="flex items-center justify-end gap-5 mt-6">
          <button type="button" onClick={onClose} className="text-[16px] font-medium text-ink-2 hover:text-ink cursor-pointer">Cancel</button>
          <button type="button" onClick={save} disabled={saving}
            className="relative inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[6px] bg-brand-500 text-white text-[15px] font-semibold hover:bg-brand-600 cursor-pointer transition-colors disabled:opacity-70">
            <span className={cn("inline-flex items-center gap-1.5", saving && "opacity-0")}><CircleCheck size={15} />{employee ? "Save" : "Register"}</span>
            {saving && <span className="absolute inset-0 grid place-items-center"><span className="size-4 rounded-full border-2 border-white border-r-transparent animate-spin" /></span>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
