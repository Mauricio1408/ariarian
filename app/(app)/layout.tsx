"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { ShellProvider } from "@/components/shell/shell-context";
import { NotificationsPanel } from "@/components/shell/notifications";
import { SettingsModal } from "@/components/shell/settings-modal";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
