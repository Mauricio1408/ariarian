"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { amount, longDate, slashDate } from "@/lib/format";
import { Button } from "@/components/ui/primitives";
import { EASE, T } from "@/components/ui/motion";
import type { Employee } from "@/lib/types";

function Sig({ title, person, date }: { title: string; person: Employee; date: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold mb-7">{title}</p>
      {[[person.name, "Signature over Printed Name"], [person.position, "Position / Office"], [longDate(date), "Date"]].map(([v, l]) => (
        <div key={l} className="mb-3 text-center"><p className="text-[12px] border-b border-ink pb-0.5">{v}</p><p className="text-[11px] text-ink-2">{l}</p></div>
      ))}
    </div>
  );
}

/** Figma 4594:1024 (PAR) and 4596:1014 (ICS) — the signature documents. */
export default function FormPage() {
  const { formId } = useParams<{ formId: string }>();
  const router = useRouter();
  const { state, hydrated } = useStore();
  const L = useLookups();
  const form = state.forms.find((f) => f.id === decodeURIComponent(formId));

  if (!form) {
    return (
      <div className="min-h-screen grid place-items-center">
        {hydrated && <div className="text-center"><FileText className="mx-auto text-ink-3" /><p className="mt-2">Form not found.</p><Link href="/employees" className="text-brand-600 hover:underline">Back to Employees</Link></div>}
      </div>
    );
  }
  const emp = L.employee.get(form.employeeId)!;
  const issuer = L.employee.get(form.issuedBy)!;
  const items = form.assetIds.map((id) => L.asset.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof L.asset.get>>[];
  const total = items.reduce((s, a) => s + a.cost, 0);
  const par = form.type === "PAR";
  const blanks = Math.max(0, 6 - items.length);
  const sibling = state.forms.find((f) => f.employeeId === form.employeeId && f.type !== form.type);


  return (
    <div className="min-h-screen bg-[#e9edf0] py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={T.page} className="no-print w-[794px] mx-auto flex items-center gap-3 mb-5">
        <Button icon={ArrowLeft} onClick={() => router.back()}>Back</Button>
        <div className="ml-2"><p className="t-b2s">{par ? "Property Acknowledgement Receipt" : "Inventory Custodian Slip"}</p><p className="t-b3 text-ink-2">{form.id} • {items.length} item{items.length > 1 ? "s" : ""} • {emp.name}</p></div>
        <div className="ml-auto flex gap-2">
          {sibling && <Button onClick={() => router.replace(`/forms/${sibling.id}`)}>View {sibling.type}</Button>}
          <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print</Button>
        </div>
      </motion.div>

      <motion.article key={form.id} initial={{ opacity: 0, y: 40, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, ease: EASE }}
        style={{ transformPerspective: 1600 }}
        className="w-[794px] min-h-[1123px] mx-auto bg-white shadow-overlay px-14 pt-14 pb-10 text-ink print:shadow-none print:w-full">
        <header className="text-center">
          <p className="text-[12px] text-ink-2">Republic of the Philippines</p>
          <p className="text-[14px] font-semibold mt-1">DEPARTMENT OF SCIENCE AND TECHNOLOGY</p>
          <p className="text-[12px] text-ink-2 mt-1">Planning and Evaluation Service · Science Education Institute</p>
          <h1 className="text-[16px] font-semibold tracking-[0.04em] mt-8">{par ? "PROPERTY ACKNOWLEDGEMENT RECEIPT" : "INVENTORY CUSTODIAN SLIP"}</h1>
        </header>
        <div className="grid grid-cols-2 gap-10 mt-8 text-[12px]">
          <p className="border-b border-ink pb-1"><span className="text-ink-2">Entity Name:</span>&nbsp; DOST {emp.office}</p>
          <p className="border-b border-ink pb-1"><span className="text-ink-2">Fund Cluster:</span>&nbsp; 01 — Regular Agency Fund</p>
          <span />
          <p className="border-b border-ink pb-1 pl-16"><span className="text-ink-2">{form.type} No.:</span>&nbsp; {form.id}</p>
        </div>

        <table className="w-full mt-8 text-[12px] border-collapse [&_td]:border [&_th]:border [&_td]:border-ink [&_th]:border-ink [&_td]:px-2 [&_th]:px-2">
          <thead>
            {par ? (
              <tr className="h-[44px] font-semibold">
                <th className="w-[70px]">Quantity</th><th className="w-[48px]">Unit</th><th className="text-left">Description</th><th className="text-left w-[152px]">Property Number</th><th className="w-[88px]">Date Acquired</th><th className="text-right w-[84px]">Amount</th>
              </tr>
            ) : (
              <tr className="h-[44px] font-semibold">
                <th className="w-[54px]">Quantity</th><th className="w-[40px]">Unit</th><th className="text-right w-[68px]">Unit Cost</th><th className="text-right w-[72px]">Total Cost</th><th className="text-left">Description</th><th className="text-left w-[96px]">Inventory Item No.</th><th className="w-[60px]">Estimated Useful Life</th>
              </tr>
            )}
          </thead>
          <tbody>
            {items.map((a, i) => (
              <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.08 }} className="h-[34px]">
                {par ? (<><td className="text-center">1</td><td className="text-center">unit</td><td>{a.spec ?? a.name}</td><td>{a.id}</td><td className="text-center tnum">{slashDate(a.acquiredOn)}</td><td className="text-right tnum">{amount(a.cost)}</td></>)
                  : (<><td className="text-center">1</td><td className="text-center">unit</td><td className="text-right tnum">{amount(a.cost)}</td><td className="text-right tnum">{amount(a.cost)}</td><td>{a.spec ?? a.name}</td><td>{a.id}</td><td className="text-center">5 years</td></>)}
              </motion.tr>
            ))}
            {Array.from({ length: blanks }).map((_, i) => <tr key={`b${i}`} className="h-7">{Array.from({ length: par ? 6 : 7 }).map((__, j) => <td key={j} />)}</tr>)}
            <tr className="h-[30px] font-semibold">
              {par ? (<><td /><td /><td /><td /><td className="text-center">Total</td><td className="text-right tnum">{amount(total)}</td></>)
                : (<><td /><td /><td className="text-right">Total</td><td className="text-right tnum">{amount(total)}</td><td /><td /><td /></>)}
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-10 mt-9">
          {par ? (<><Sig title="Received by:" person={emp} date={form.issuedOn} /><Sig title="Issued by:" person={issuer} date={form.issuedOn} /></>) : (<><Sig title="Received from:" person={issuer} date={form.issuedOn} /><Sig title="Received by:" person={emp} date={form.issuedOn} /></>)}
        </div>
        <p className="mt-6 rounded-md bg-tint px-3 py-2.5 text-[12px] text-ink-2 leading-[1.5]">
          {par
            ? "Issued for property, plant and equipment at or above the ₱50,000 capitalisation threshold (COA Circular 2022-004). Items below the threshold are issued to the same custodian on an Inventory Custodian Slip."
            : "Issued for semi-expendable property below the ₱50,000 capitalisation threshold (COA Circular 2022-004). These items are tracked but not depreciated. Items at or above the threshold are issued to the same custodian on a Property Acknowledgement Receipt."}{" "}
          Generated from AriArian on {longDate(form.issuedOn)}.
        </p>
      </motion.article>
    </div>
  );
}
