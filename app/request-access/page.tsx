"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { T } from "@/components/ui/motion";
import { AuthField, BrandPanel, FormError, IllustratedModal, PillButton, SmallPrimary } from "@/components/auth/auth-ui";

/** Figma 4571:30785 — Request Access, then Request Sent (4480:25344). */
export default function RequestAccessPage() {
  const router = useRouter();
  const { dispatch } = useStore();
  const [f, setF] = useState({ name: "", id: "", email: "", office: "DOST Central Office" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setError(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim()) { setError("Your name and work email are required."); return; }
    if (!/@dost\.gov\.ph$/i.test(f.email.trim())) { setError("Use your @dost.gov.ph work email."); return; }
    if (f.id && !/^DOST-\d{4}-\d{4}$/i.test(f.id.trim())) { setError("Employee ID follows DOST-YYYY-NNNN."); return; }
    setLoading(true);
    setTimeout(() => {
      dispatch({ type: "requestAccess", name: f.name.trim(), email: f.email.trim(), office: f.office.trim() || "DOST Central Office", employeeId: f.id.trim().toUpperCase() || "pending" });
      setLoading(false); setSent(true);
    }, 650);
  };

  return (
    <main className="min-h-screen bg-page flex items-center justify-center gap-[60px] px-[60px] py-10">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={T.page} className="w-[560px] max-w-full" noValidate>
        <h1 className="text-[56px] font-bold tracking-[-0.025em] leading-tight text-center">Request access</h1>
        <p className="text-[24px] text-ink-2 text-center mt-3">Your office administrator will activate your account.</p>
        <div className="mt-12 space-y-5">
          <AuthField label="Full name" value={f.name} onChange={set("name")} placeholder="Juan Dela Cruz" autoFocus />
          <AuthField label="Employee ID" value={f.id} onChange={set("id")} placeholder="DOST-YYYY-NNNN" />
          <AuthField label="Work email" type="email" value={f.email} onChange={set("email")} placeholder="firstname.lastname@dost.gov.ph" />
          <AuthField label="Office" value={f.office} onChange={set("office")} placeholder="DOST Central Office" />
        </div>
        <FormError msg={error} />
        <PillButton type="submit" loading={loading} className="mt-7">Send request</PillButton>
        <p className="text-center text-[16px] mt-11">Already have an account? <Link href="/login" className="underline underline-offset-2 hover:text-brand-600">Log in</Link></p>
      </motion.form>
      <BrandPanel />

      <IllustratedModal open={sent} onClose={() => router.push("/login")} label="Request sent" image="/img/illustrations/sent.jpg"
        title="Request sent" body="We’ll email you once your account is active">
        <SmallPrimary onClick={() => router.push("/login")}>Back to log in</SmallPrimary>
      </IllustratedModal>
    </main>
  );
}
