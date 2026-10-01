"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/shell/sidebar";
import { ShellProvider } from "@/components/shell/shell-context";
import { NotificationsPanel } from "@/components/shell/notifications";
import { SettingsModal } from "@/components/shell/settings-modal";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { state, hydrated } = useStore();
  const router = useRouter();
  // The prototype starts at sign-in: no session → /login.
  useEffect(() => { if (hydrated && !state.session) router.replace("/login"); }, [hydrated, state.session, router]);
  if (!hydrated || !state.session) return <div className="min-h-screen bg-page" />;

  return (
    <ShellProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <NotificationsPanel />
      <SettingsModal />
    </ShellProvider>
  );
}
