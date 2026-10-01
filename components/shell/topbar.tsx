"use client";

import { motion } from "motion/react";
import { Bell, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { T } from "@/components/ui/motion";
import { useShell } from "./shell-context";

export function Topbar({ crumb, icon: I }: { crumb: string; icon: LucideIcon }) {
  const { setNotificationsOpen, openSettings } = useShell();
  const { state } = useStore();
  const unread = state.notifications.some((n) => !n.read);
  return (
    <header className="h-[84px] dash-b flex items-center gap-4 pl-[22px] pr-5 no-print">
      <p className="flex items-center gap-4 text-[16px] text-ink">
        {crumb} <I size={20} strokeWidth={1.75} />
      </p>
      <div className="ml-auto flex items-center gap-4">
        <TopIcon label="Notifications" onClick={() => setNotificationsOpen(true)} icon={Bell} dot={unread} />
        <TopIcon label="Settings" onClick={() => openSettings("Profile")} icon={Settings} />
      </div>
    </header>
  );
}

function TopIcon({ icon: I, label, onClick, dot }: { icon: LucideIcon; label: string; onClick: () => void; dot?: boolean }) {
  return (
    <motion.button aria-label={label} title={label} onClick={onClick} whileTap={{ scale: 0.94 }} transition={T.hover}
      className="relative grid place-items-center size-9 rounded-full text-ink hover:bg-white transition-colors duration-[120ms] cursor-pointer focus-ring">
      <I size={24} strokeWidth={1.9} />
      {dot && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-bad-chart ring-2 ring-page" />}
    </motion.button>
  );
}

/** Page frame — topbar + an entry animation for the content (240ms page dissolve). */
export function Page({ crumb, icon, children, className }: { crumb: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <>
      <Topbar crumb={crumb} icon={icon} />
      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={T.page}
        className={cn("pl-[22px] pr-5 pt-7 pb-16", className)}>
        {children}
      </motion.main>
    </>
  );
}

export function PageTitle({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6 mb-6">
      <div className="min-w-0">
        <h1 className="t-h1 text-ink">{title}</h1>
        {sub && <p className="t-b2 text-ink-2 mt-2.5">{sub}</p>}
      </div>
      {right && <div className="ml-auto pt-2">{right}</div>}
    </div>
  );
}
