"use client";

import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useId, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";

/** The brand card on Login & Signup (Figma 4571:30959) and Request Access (4571:30785). */
export function BrandPanel() {
  return (
    <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={T.page}
      className="relative hidden lg:flex flex-col w-[700px] max-w-[48vw] h-[860px] max-h-[calc(100vh-80px)] rounded-[24px] bg-brand-100 overflow-hidden shrink-0">
      <div className="flex items-start justify-between p-6">
        <span className="rounded-[6px] bg-white px-2.5 py-1.5 text-[20px] tracking-[-0.01em]">DOST Ari<span className="text-brand-500">Arian</span></span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logomark.png" alt="" width={28} height={28} />
      </div>
      <div className="flex-1 grid place-items-center px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/login-stack.png" alt="" width={444} height={411} className="w-[63%] h-auto select-none" draggable={false} />
      </div>
      <div className="p-6 pt-0">
        <p className="text-[40px] font-bold tracking-[-0.02em] leading-none">Managing Assets Wisely.</p>
        <p className="text-[16px] leading-[1.5] mt-1 max-w-[580px]">Make your assets well managed with DOST AriArian, the department’s very own Asset Lifecycle Management System.</p>
      </div>
    </motion.aside>
  );
}

export const AuthField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean; password?: boolean }>(
  function AuthField({ label, error, password, className, type, ...rest }, ref) {
    const id = useId();
    const [show, setShow] = useState(false);
    return (
      <label htmlFor={id} className="block">
        <span className="block text-[16px] font-semibold mb-1.5">{label}</span>
        <span className={cn("flex items-center h-12 rounded-full border bg-white pl-5 pr-3 transition-[border-color,box-shadow] duration-[120ms]",
          "focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_var(--color-brand-100)]", error ? "border-bad-text" : "border-ink-3")}>
          <input ref={ref} id={id} type={password ? (show ? "text" : "password") : type} {...rest}
            className={cn("flex-1 min-w-0 bg-transparent outline-none text-[16px] text-ink placeholder:text-ink-2", className)} />
          {password && (
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
              className="grid place-items-center size-8 rounded-full text-ink hover:bg-tint cursor-pointer">
              {show ? <Eye size={22} strokeWidth={1.75} /> : <EyeOff size={22} strokeWidth={1.75} />}
            </button>
          )}
        </span>
      </label>
    );
  },
);

export function PillButton({ children, loading, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cn("relative w-full h-12 rounded-full bg-brand-500 text-white text-[20px] font-medium cursor-pointer transition-colors duration-[120ms] hover:bg-brand-600 active:bg-brand-700 disabled:opacity-70 focus-ring", className)}>
      <span className={cn(loading && "opacity-0")}>{children}</span>
      {loading && <span className="absolute inset-0 grid place-items-center"><span className="size-5 rounded-full border-2 border-white border-r-transparent animate-spin" /></span>}
    </button>
  );
}

export function FormError({ msg }: { msg: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T.state} className="overflow-hidden">
          <span className="block rounded-lg bg-bad-soft/50 text-bad-text text-[14px] px-4 py-2.5 mt-4">{msg}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * The illustrated 800px modal family — Forgot Password (2187:14768), Reset Link Sent (4014:12234),
 * Request Sent (4480:25344), Delete Asset (4229:14732), Asset Successfully Deleted (4229:14733).
 */
export function IllustratedModal({ open, onClose, image, title, body, children, label, imageHeight = 360 }: {
  open: boolean; onClose: () => void; image: string; title: string; body: React.ReactNode; children: React.ReactNode; label: string; imageHeight?: number;
}) {
  return (
    <Modal open={open} onClose={onClose} label={label} className="w-[800px] max-w-[calc(100vw-48px)] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="block w-full object-cover" style={{ height: imageHeight }} draggable={false} />
      <div className="px-[60px] pt-10 pb-12 text-center">
        <h2 className="text-[40px] font-bold tracking-[-0.02em] leading-tight">{title}</h2>
        <p className="text-[20px] text-ink-2 mt-2">{body}</p>
        <div className="mt-7">{children}</div>
      </div>
    </Modal>
  );
}

export function SmallPrimary({ children, loading, arrow, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; arrow?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cn("relative inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] bg-brand-500 text-white text-[16px] font-semibold cursor-pointer hover:bg-brand-600 transition-colors duration-[120ms] disabled:opacity-70 focus-ring", className)}>
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}{arrow && <ArrowRight size={18} />}</span>
      {loading && <span className="absolute inset-0 grid place-items-center"><span className="size-4 rounded-full border-2 border-white border-r-transparent animate-spin" /></span>}
    </button>
  );
}
