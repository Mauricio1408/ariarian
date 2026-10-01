"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { T } from "./motion";

/**
 * Scroll lock, reference-counted. Overlays stack (drawer → transfer modal) and close in any
 * order; saving/restoring body.overflow per overlay left the page stuck at "hidden".
 */
let locks = 0;
export function lockScroll() {
  locks++;
  document.body.style.overflow = "hidden";
  return () => { locks = Math.max(0, locks - 1); if (locks === 0) document.body.style.overflow = ""; };
}

/**
 * Every overlay closes on Escape (Motion Tokens.md — ON_KEY_DOWN 27) — but only the top-most one,
 * so Escape on a modal opened over a drawer leaves the drawer open.
 */
const escapeStack: { current: () => void }[] = [];
let escapeBound = false;
function onEscape(e: KeyboardEvent) {
  if (e.key !== "Escape" || !escapeStack.length) return;
  e.stopImmediatePropagation();
  escapeStack[escapeStack.length - 1].current();
}

export function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  useEffect(() => { ref.current = onClose; });
  useEffect(() => {
    if (!open) return;
    if (!escapeBound) { window.addEventListener("keydown", onEscape, true); escapeBound = true; }
    escapeStack.push(ref);
    const unlock = lockScroll();
    return () => {
      const i = escapeStack.lastIndexOf(ref);
      if (i >= 0) escapeStack.splice(i, 1);
      unlock();
    };
  }, [open]);
}

function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}

const Scrim = ({ onClick, z = "z-40" }: { onClick: () => void; z?: string }) => (
  <motion.div className={cn("fixed inset-0", z, " bg-[#3f5562]/45 backdrop-blur-[1.5px]")} onClick={onClick}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.16 } }} transition={T.overlay} />
);

export function Modal({ open, onClose, children, className, label, shake }: {
  open: boolean; onClose: () => void; children: React.ReactNode; className?: string; label: string; shake?: number;
}) {
  useEscape(open, onClose);
  const controls = useAnimationControls();
  useEffect(() => {
    if (shake) controls.start({ x: [0, -9, 8, -5, 3, 0], transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] } });
  }, [shake, controls]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Scrim onClick={onClose} z="z-[55]" />
            <div className="fixed inset-0 z-[60] grid place-items-center p-6 pointer-events-none">
              <motion.div role="dialog" aria-modal aria-label={label}
                className="pointer-events-auto"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.16 } }}
                transition={T.overlay}>
                <motion.div animate={controls} className={cn("relative bg-white rounded-[20px] shadow-overlay max-h-[calc(100vh-48px)] overflow-auto scroll-slim", className)}>
                  {children}
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Drawer({ open, onClose, children, width = 480, label, className }: {
  open: boolean; onClose: () => void; children: React.ReactNode; width?: number; label: string; className?: string;
}) {
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Scrim onClick={onClose} />
            <motion.aside role="dialog" aria-modal aria-label={label}
              className={cn("fixed top-0 right-0 bottom-0 z-50 bg-white shadow-overlay flex flex-col", className)}
              style={{ width }}
              initial={{ x: width + 40 }} animate={{ x: 0 }} exit={{ x: width + 40, transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}>
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function CloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <motion.button onClick={onClick} aria-label="Close" whileTap={{ scale: 0.92 }} transition={T.hover}
      className={cn("grid place-items-center size-8 rounded-full text-ink hover:bg-tint cursor-pointer focus-ring", className)}>
      <X size={20} strokeWidth={1.75} />
    </motion.button>
  );
}

/** Anchored popover — Sort / Filter / row menus. */
export function Popover({ open, onClose, children, className, align = "right" }: {
  open: boolean; onClose: () => void; children: React.ReactNode; className?: string; align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h); window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref}
          className={cn("absolute top-[calc(100%+8px)] z-30 min-w-[220px] rounded-xl bg-white shadow-overlay border border-line p-1.5", align === "right" ? "right-0" : "left-0", className)}
          initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
          transition={T.state} style={{ transformOrigin: align === "right" ? "top right" : "top left" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MenuItem({ children, active, onClick, icon }: { children: React.ReactNode; active?: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("w-full flex items-center gap-2.5 text-left px-3 h-9 rounded-lg t-b2 cursor-pointer transition-colors duration-[120ms]",
        active ? "bg-brand-100 text-brand-800 font-medium" : "text-ink hover:bg-tint")}>
      {icon}{children}
    </button>
  );
}

/* ── Toaster ──────────────────────────────────────────────────── */
export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none no-print">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const I = t.tone === "bad" ? TriangleAlert : t.tone === "good" ? CheckCircle2 : Info;
          return (
            <motion.div key={t.id} layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
              transition={T.spring}
              className="pointer-events-auto flex items-center gap-3 min-w-[340px] max-w-[520px] rounded-xl bg-ink text-white pl-4 pr-2 py-2.5 shadow-overlay">
              <I size={18} className={t.tone === "bad" ? "text-bad-solid" : t.tone === "good" ? "text-good-solid" : "text-brand-300"} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium">{t.title}</p>
                {t.body && <p className="text-[12.5px] text-white/65 truncate">{t.body}</p>}
              </div>
              {t.action && (
                <button onClick={() => { t.action!.run(); dismissToast(t.id); }}
                  className="h-8 px-3 rounded-md text-[13px] font-medium text-brand-300 hover:bg-white/10 cursor-pointer">{t.action.label}</button>
              )}
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="grid place-items-center size-8 rounded-md text-white/60 hover:text-white hover:bg-white/10 cursor-pointer">
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
