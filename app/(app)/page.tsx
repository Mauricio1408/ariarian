"use client";

import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { Page } from "@/components/shell/topbar";
import { Dashboard } from "@/components/dashboard/dashboard";

export default function DashboardPage() {
  return (
    <Page crumb="Dashboard" icon={LayoutGrid}>
      <Suspense>
        <Dashboard />
      </Suspense>
    </Page>
  );
}
