"use client";

import { useRouter } from "next/navigation";
import { useStore } from "./store";
import { exportTable, type ExportFormat } from "./export";

/** Export is a privileged action — custodians hit Permission denied (Figma 4593:966). */
export function useExport() {
  const { state, toast } = useStore();
  const router = useRouter();
  return (filename: string, header: string[], rows: (string | number)[][], format: ExportFormat = "csv") => {
    if (state.role === "custodian") { router.push("/restricted?what=Export"); return; }
    exportTable(filename, header, rows, format);
    toast({ title: `Exported ${rows.length} rows`, body: `${filename.replace(/\.\w+$/, "")} · ${format === "excel" ? "Excel" : format.toUpperCase()}`, tone: "good" });
  };
}
