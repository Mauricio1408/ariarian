"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type SettingsTab = "Profile" | "Preferences" | "Notifications" | "Security" | "General" | "Asset categories" | "Members & roles";

interface Shell {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  settingsTab: SettingsTab | null;
  openSettings: (t?: SettingsTab | null) => void;
}

const C = createContext<Shell | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const v = useMemo(() => ({
    collapsed, setCollapsed, notificationsOpen, setNotificationsOpen, settingsTab,
    openSettings: (t: SettingsTab | null = "Profile") => setSettingsTab(t),
  }), [collapsed, notificationsOpen, settingsTab]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useShell() {
  const c = useContext(C);
  if (!c) throw new Error("useShell outside ShellProvider");
  return c;
}
