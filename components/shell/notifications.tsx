"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Check, ClipboardCheck, ShieldAlert, SlidersHorizontal, User, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { AS_OF } from "@/lib/types";
import { Tabs, Toggle } from "@/components/ui/primitives";
import { CloseButton, useEscape } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";
import { monthDay } from "@/lib/format";
import { useShell } from "./shell-context";

const KIND: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  maintenance: { icon: Wrench, tone: "bg-bad-soft/60 text-bad-text" },
  transfer: { icon: ArrowLeftRight, tone: "bg-brand-100 text-brand-600" },
  warranty: { icon: ShieldAlert, tone: "bg-warn-soft text-warn-text" },
  people: { icon: User, tone: "bg-good-soft/70 text-good-text" },
  audit: { icon: ClipboardCheck, tone: "bg-tint text-ink-2 border border-line" },
};
type Filter = "all" | "maintenance" | "transfer" | "warranty" | "people";

export function NotificationsPanel() {
  const { notificationsOpen: open, setNotificationsOpen } = useShell();
  const close = () => setNotificationsOpen(false);
  const { state, dispatch } = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  useEscape(open, () => setNotificationsOpen(false));

  const unread = state.notifications.filter((n) => !n.read);
  const countOf = (k: NotificationKind) => unread.filter((n) => n.kind === k).length;
  const list = state.notifications
    .filter((n) => filter === "all" || n.kind === filter)
    .filter((n) => !unreadOnly || !n.read);

  const groups = useMemo(() => {
    const g: { label: string; items: AppNotification[] }[] = [
      { label: `Today • ${monthDay(AS_OF).toUpperCase()}`, items: [] },
      { label: "Yesterday • MAR 13", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const n of list) (n.date === AS_OF ? g[0] : n.date === "2026-03-13" ? g[1] : g[2]).items.push(n);
    return g.filter((x) => x.items.length);
  }, [list]);

  const go = (n: AppNotification) => {
    dispatch({ type: "readNotifications", ids: [n.id] });
    if (n.action) { close(); router.push(n.action.href); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-[#3f5562]/45" onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.overlay} />
          <motion.aside role="dialog" aria-label="Notifications"
            className="fixed z-50 top-4 bottom-4 right-4 w-[600px] rounded-[20px] bg-white shadow-overlay flex flex-col overflow-hidden"
            initial={{ x: 640, opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 640, opacity: 0.6, transition: { duration: 0.2 } }}
            transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}>
            <div className="px-6 pt-6 pb-3">
              <div className="flex items-start">
                <div>
                  <h2 className="text-[20px] font-semibold">Notifications</h2>
                  <p className="t-b2 text-ink-2 mt-0.5"><span className="tnum">{unread.length}</span> unread</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.96 }} disabled={!unread.length} onClick={() => dispatch({ type: "readNotifications", ids: "all" })}
                    className="flex items-center gap-2 h-8 px-3 rounded-md bg-tint text-[13px] text-ink hover:bg-line disabled:opacity-50 cursor-pointer transition-colors duration-[120ms]">
                    <Check size={15} /> Mark all as read
                  </motion.button>
                  <button aria-label="Notification settings" className="grid place-items-center size-8 rounded-md bg-tint hover:bg-line cursor-pointer"><SlidersHorizontal size={16} /></button>
                  <CloseButton onClick={close} />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <Tabs id="notif" variant="pill" className="min-w-0 gap-0.5 [&>button]:px-2.5 [&>button]:shrink-0" value={filter} onChange={setFilter} tabs={[
                  { key: "all", label: "All", count: unread.length },
                  { key: "maintenance", label: "Maintenance", count: countOf("maintenance") },
                  { key: "transfer", label: "Transfers", count: countOf("transfer") },
                  { key: "warranty", label: "Warranty", count: countOf("warranty") },
                  { key: "people", label: "People", count: countOf("people") },
                ]} />
                <label className="ml-auto shrink-0 flex items-center gap-2 text-[13px] text-ink-2 whitespace-nowrap pl-3 cursor-pointer">Unread only <Toggle on={unreadOnly} onChange={setUnreadOnly} label="Unread only" /></label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scroll-slim">
              <AnimatePresence mode="popLayout" initial={false}>
                {groups.length === 0 && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-24 text-center">
                    <span className="inline-grid place-items-center size-12 rounded-xl bg-good-soft/60 text-good-text mb-3"><Check /></span>
                    <p className="font-medium">You&apos;re all caught up</p>
                    <p className="t-b2 text-ink-2">Nothing unread in this filter.</p>
                  </motion.div>
                )}
                {groups.map((g) => (
                  <motion.section key={g.label} layout transition={T.state}>
                    <h3 className="t-l1 text-ink-2 px-6 py-3 border-t border-line">{g.label}</h3>
                    {g.items.map((n) => {
                      const k = KIND[n.kind];
                      return (
                        <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={T.state} onClick={() => dispatch({ type: "readNotifications", ids: [n.id] })}
                          className={cn("group relative flex gap-4 px-6 py-4 border-t border-line cursor-pointer transition-colors duration-200",
                            n.read ? "bg-white hover:bg-tint" : "bg-brand-50/70 hover:bg-brand-50")}>
                          <span className={cn("grid place-items-center size-9 rounded-full shrink-0", k.tone)}><k.icon size={17} strokeWidth={1.75} /></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium">{n.title}</p>
                            <p className="t-b2 text-ink-2 mt-1">{n.body}</p>
                            {n.action && (
                              <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); go(n); }}
                                className="mt-2.5 h-[30px] px-2.5 rounded-md border border-line bg-white text-[13px] hover:border-ink-3 cursor-pointer transition-colors">
                                {n.action.label}
                              </motion.button>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2.5 shrink-0">
                            <span className="text-[12px] text-ink-2">{n.time}</span>
                            <AnimatePresence>{!n.read && <motion.span exit={{ scale: 0, opacity: 0 }} transition={T.state} className="size-2 rounded-full bg-brand-500" />}</AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.section>
                ))}
              </AnimatePresence>
            </div>
            <div className="border-t border-line py-3.5 text-center">
              <button onClick={() => { setFilter("all"); setUnreadOnly(false); }} className="group inline-flex items-center gap-1.5 text-[15px] text-brand-600 hover:text-brand-700 cursor-pointer">
                View all notifications <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
