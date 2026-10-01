"use client";

import { useRouter } from "next/navigation";
import { useStore } from "./store";
import { downloadCsv } from "./export";

/** Export is a privileged action — custodians hit Permission denied (Figma 4593:966). */
export function useExport() {
  const { state, toast } = useStore();
  const router = useRouter();
  return (filename: string, header: string[], rows: (string | number)[][]) => {
    if (state.role === "custodian") { router.push("/restricted?what=Export"); return; }
    downloadCsv(filename, header, rows);
    toast({ title: `Exported ${rows.length} rows`, body: filename, tone: "good" });
  };
}
