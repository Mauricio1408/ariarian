"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Bell, Box, Clock, Coins, LayoutGrid, PanelLeft, RotateCcw, Settings, User, UserRound, Inbox, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { openOrders } from "@/lib/selectors";
import { Avatar } from "@/components/ui/primitives";
import { T } from "@/components/ui/motion";
import { useShell } from "./shell-context";

interface Item { href: string; label: string; icon: LucideIcon; badge?: number; badgeTone?: "warn" | "brand"; match?: (p: string) => boolean; onClick?: () => void }

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { state, me, dispatch, toast } = useStore();
  const { collapsed, setCollapsed, setNotificationsOpen, openSettings, notificationsOpen, settingsTab } = useShell();
  const [menu, setMenu] = useState(false);

  // Sidebar Button.md — the Maintenance badge counts work orders awaiting triage.
  const triage = openOrders(state).filter((w) => w.stage === "reported").length;
  const unread = state.notifications.filter((n) => !n.read).length;

  const main: Item[] = [
    { href: "/", label: "Dashboard", icon: LayoutGrid, match: (p) => p === "/" },
    { href: "/assets", label: "Asset Inventory", icon: Box },
    { href: "/employees", label: "Employees", icon: User },
    { href: "/audit-log", label: "Audit Log", icon: Clock },
    { href: "/maintenance", label: "Maintenance", icon: Wrench, badge: triage, badgeTone: "warn" },
    { href: "/financial-reports", label: "Financial Reports", icon: Coins },
  ];
  const support: Item[] = [
    { href: "#notifications", label: "Notifications", icon: Bell, badge: unread, badgeTone: "brand", onClick: () => setNotificationsOpen(true) },
    { href: "#settings", label: "Settings", icon: Settings, onClick: () => openSettings("Profile") },
  ];
  const isActive = (i: Item) => {
    if (i.href === "#notifications") return notificationsOpen;
    if (i.href === "#settings") return settingsTab !== null;
    return i.match ? i.match(path) : path.startsWith(i.href);
  };
  const overlayOpen = notificationsOpen || settingsTab !== null;

  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 308 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="sticky top-0 h-screen shrink-0 border-r border-line bg-page flex flex-col z-20 no-print"
    >
      {/* Brand */}
      <div className="h-[84px] dash-b flex items-center px-5 gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-3 min-w-0 focus-ring rounded-md">
          <span className="grid place-items-center size-[30px] rounded-[7px] bg-brand-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.svg" alt="" width={20} height={20} />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }} transition={T.state}
                className="text-[20px] tracking-[-0.01em] whitespace-nowrap">
                DOST Ari<span className="text-brand-500">Arian</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <motion.button onClick={() => setCollapsed(!collapsed)} whileTap={{ scale: 0.9 }} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("grid place-items-center size-8 rounded-md text-ink-2 hover:text-ink hover:bg-white cursor-pointer focus-ring", collapsed ? "absolute left-[26px] top-[70px] bg-white border border-line shadow-raised size-7" : "ml-auto")}>
          <PanelLeft size={20} strokeWidth={1.75} />
        </motion.button>
      </div>

      <Section label="Main Navigation" collapsed={collapsed}>
        {main.map((i) => <NavItem key={i.href} item={i} active={!overlayOpen && isActive(i)} collapsed={collapsed} group="main" />)}
      </Section>

      <div className="flex-1 dash-b" />

      <Section label="Support" collapsed={collapsed}>
        {support.map((i) => <NavItem key={i.href} item={i} active={isActive(i)} collapsed={collapsed} group="support" />)}
      </Section>

      {/* Profile card → demo controls */}
      <div className="relative px-3 pb-3 pt-1">
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }} transition={T.state}
              className="absolute bottom-[calc(100%+4px)] left-3 w-[284px] rounded-xl bg-white shadow-overlay border border-line p-1.5 z-30">
              <p className="t-l1 text-ink-3 px-3 pt-2 pb-1.5">Prototype controls</p>
              <MenuButton icon={UserRound} onClick={() => {
                const next = state.role === "admin" ? "custodian" : "admin";
                dispatch({ type: "role", role: next }); setMenu(false);
                toast({ title: next === "custodian" ? "Viewing as Juan Dela Cruz" : "Viewing as Mauricio Bergancia", body: next === "custodian" ? "Property custodian · Financial Reports and Export are restricted" : "Administrative Officer V · full access" });
              }}>
                View as {state.role === "admin" ? "custodian (Juan Dela Cruz)" : "admin (Mauricio Bergancia)"}
              </MenuButton>
              <MenuButton icon={Inbox} onClick={() => { dispatch({ type: "registryEmpty", on: !state.registryEmpty }); setMenu(false); router.push("/assets"); }}>
                {state.registryEmpty ? "Restore registry" : "Preview empty registry"}
              </MenuButton>
              <MenuButton icon={RotateCcw} onClick={() => { dispatch({ type: "reset" }); setMenu(false); toast({ title: "Demo data reset", body: "Every screen is back to March 14, 2026", tone: "good" }); }}>
                Reset demo data
              </MenuButton>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setMenu((m) => !m)} whileTap={{ scale: 0.98 }}
          className={cn("w-full flex items-center gap-2.5 rounded-[10px] border border-ink/80 bg-white/40 hover:bg-white transition-colors duration-[120ms] cursor-pointer focus-ring text-left",
            collapsed ? "p-1.5 justify-center" : "px-2.5 py-2")}>
          <Avatar src={me.avatar} name={me.name} size={28} />
          {!collapsed && (
            <span className="min-w-0">
              <motion.span key={me.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={T.state} className="block text-[15px] font-semibold leading-tight truncate">{me.name}</motion.span>
              <span className="block text-[12px] text-ink-2 truncate">{me.email}</span>
            </span>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}

function Section({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="px-3.5 pt-7 pb-6">
      <p className={cn("t-b2 text-ink-2 px-[5px] mb-4 h-5 whitespace-nowrap transition-opacity duration-200", collapsed && "opacity-0")}>{label}</p>
      <nav className="flex flex-col gap-2">{children}</nav>
    </div>
  );
}

function NavItem({ item, active, collapsed, group }: { item: Item; active: boolean; collapsed: boolean; group: string }) {
  const I = item.icon;
  const inner = (
    <>
      {active && <motion.span layoutId={`nav-active-${group}`} transition={T.spring} className="absolute inset-0 rounded-lg bg-brand-100" />}
      <I size={24} strokeWidth={1.5} className="relative shrink-0" />
      {!collapsed && <span className={cn("relative whitespace-nowrap", active ? "font-semibold" : "font-normal")}>{item.label}</span>}
      {!!item.badge && (
        <motion.span key={item.badge} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={T.spring}
          className={cn("relative tnum grid place-items-center rounded-full text-[11px] font-medium",
            collapsed ? "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1" : "ml-auto min-w-[28px] h-[18px] px-1.5",
            item.badgeTone === "warn" ? "bg-warn-soft text-warn-text" : "bg-brand-100 text-brand-600")}>
          {item.badge}
        </motion.span>
      )}
    </>
  );
  const cls = cn("group relative flex items-center gap-[18px] h-10 rounded-lg px-[10px] text-[16px] text-ink focus-ring",
    "transition-colors duration-[120ms] ease-ariarian", !active && "hover:bg-white", collapsed && "justify-center px-0");
  return item.onClick ? (
    <button onClick={item.onClick} className={cn(cls, "cursor-pointer text-left")} title={collapsed ? item.label : undefined}>{inner}</button>
  ) : (
    <Link href={item.href} className={cls} title={collapsed ? item.label : undefined}>{inner}</Link>
  );
}

function MenuButton({ icon: I, children, onClick }: { icon: LucideIcon; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 h-10 rounded-lg t-b2 text-ink hover:bg-tint cursor-pointer text-left transition-colors duration-[120ms]">
      <I size={16} strokeWidth={1.75} className="text-ink-2" />{children}
    </button>
  );
}
