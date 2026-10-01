"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/primitives";
import { T } from "@/components/ui/motion";
import { AuthField, BrandPanel, FormError, IllustratedModal, PillButton, SmallPrimary } from "@/components/auth/auth-ui";

/** Figma 4571:30959 — Login & Signup. The email decides the role: the admin, or a custodian. */
export default function LoginPage() {
  const router = useRouter();
  const { state, dispatch, hydrated } = useStore();
  const [email, setEmail] = useState("m.bergancia@dost.gov.ph");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState<"form" | "sent" | null>(null);
  const [resetEmail, setResetEmail] = useState("m.bergancia@dost.gov.ph");
  const [sending, setSending] = useState(false);

  useEffect(() => { if (hydrated && state.session) router.replace("/"); }, [hydrated, state.session, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const who = state.employees.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!who) { setError("We couldn't find an account for that email. Request access to get one."); setField("email"); return; }
    if (!password) { setError("Enter your password to continue."); setField("password"); return; }
    setError(null); setField(null); setLoading(true);
    setTimeout(() => { dispatch({ type: "login", employeeId: who.id, remember }); router.replace("/"); }, 650);
  };

  return (
    <main className="min-h-screen bg-page flex items-center justify-center gap-[60px] px-[60px] py-10">
      <BrandPanel />
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={T.page} className="w-[560px] max-w-full" noValidate>
        <h1 className="text-[56px] font-bold tracking-[-0.025em] leading-tight text-center">Welcome Back!</h1>
        <p className="text-[24px] text-ink-2 text-center mt-3">Get back in and manage your department&apos;s assets</p>
        <div className="mt-14 space-y-5">
          <AuthField label="Work Email" type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} error={field === "email"} placeholder="you@dost.gov.ph" />
          <AuthField label="Password" password autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} error={field === "password"} placeholder="Enter your password" autoFocus />
        </div>
        <div className="flex items-center mt-6">
          <label className="flex items-center gap-3 text-[16px] text-ink-2 cursor-pointer select-none">
            <Checkbox checked={remember} onChange={setRemember} label="Remember me" /> Remember Me
          </label>
          <button type="button" onClick={() => setForgot("form")} className="ml-auto text-[16px] text-ink-2 hover:text-brand-600 hover:underline underline-offset-2 cursor-pointer">Forgot Password?</button>
        </div>
        <FormError msg={error} />
        <PillButton type="submit" loading={loading} className="mt-6">Log In</PillButton>
        <div className="dash-t mt-14 pt-0 h-px" />
        <p className="text-center text-[16px] mt-28">Need an account? <Link href="/request-access" className="underline underline-offset-2 hover:text-brand-600">Request access</Link></p>
        <p className="text-center t-b3 text-ink-3 mt-4">Demo: any password · m.bergancia@dost.gov.ph (admin) or juandelacruz@dost.gov.ph (custodian)</p>
      </motion.form>

      <IllustratedModal open={forgot === "form"} onClose={() => setForgot(null)} label="Forgot password" image="/img/illustrations/forgot.jpg"
        title="Forgot Password?" body="Kindly enter your email and we’ll send you a link to reset it.">
        <form className="flex items-end gap-5 text-left" onSubmit={(e) => { e.preventDefault(); setSending(true); setTimeout(() => { setSending(false); setForgot("sent"); }, 650); }}>
          <label className="flex-1">
            <span className="block text-[14px] font-semibold mb-1.5">Email</span>
            <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
              className="w-full h-11 rounded-[8px] border border-ink-3 px-4 text-[16px] outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] transition-[border-color,box-shadow]" />
          </label>
          <SmallPrimary type="submit" arrow loading={sending}>Send Link</SmallPrimary>
        </form>
      </IllustratedModal>
      <IllustratedModal open={forgot === "sent"} onClose={() => setForgot(null)} label="Reset link sent" image="/img/illustrations/sent.jpg"
        title="Reset Link Sent" body="Please check your email to continue">
        <SmallPrimary onClick={() => setForgot(null)}>Proceed</SmallPrimary>
      </IllustratedModal>
    </main>
  );
}
