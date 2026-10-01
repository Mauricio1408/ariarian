"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box } from "lucide-react";
import { Page } from "@/components/shell/topbar";
import { PermissionDenied } from "@/components/shell/permission-denied";

function Restricted() {
  const what = useSearchParams().get("what") ?? "This action";
  return <div className="min-h-[calc(100vh-200px)] grid place-items-center"><PermissionDenied what={what} /></div>;
}

export default function RestrictedPage() {
  return (
    <Page crumb="Permission" icon={Box}>
      <Suspense><Restricted /></Suspense>
    </Page>
  );
}
