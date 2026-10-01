"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { T } from "@/components/ui/motion";

/** Figma 4593:966 — V2 Permission denied. */
export function PermissionDenied({ what, compact }: { what: string; compact?: boolean }) {
  const router = useRouter();
  const { me, toast } = useStore();
  const [requested, setRequested] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={T.overlay}
      className={compact ? "max-w-[520px] mx-auto text-center py-6" : "card-raised w-[560px] mx-auto px-12 py-12 text-center"}>
      <motion.span initial={{ rotate: -12, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }} transition={{ ...T.spring, delay: 0.1 }}
        className="inline-grid place-items-center size-14 rounded-xl bg-warn-soft text-warn-text text-[22px] font-semibold">!</motion.span>
      <h2 className="text-[20px] font-semibold mt-4">{what} is restricted</h2>
      <p className="t-b2 text-ink-2 mt-1.5 leading-[1.45]">
        Your role — {me.position}, property custodian — covers the assets in your name. Valuation, depreciation and
        bulk exports are limited to Administrative Officer V and above.
      </p>
      <p className="card-tinted t-b3 text-ink-2 px-4 py-3 mt-4">Need access? Ask your office administrator to raise your role, or request a one-off export.</p>
      <div className="flex items-center justify-center gap-2.5 mt-5">
        <Button variant="primary" onClick={() => router.push("/employees?employee=" + me.id)}>Back to my assets</Button>
        <Button variant="outline" disabled={requested} onClick={() => { setRequested(true); toast({ title: "Access requested", body: "Mauricio Bergancia will review your request", tone: "good" }); }}>
          {requested ? "Request sent" : "Request access"}
        </Button>
      </div>
    </motion.div>
  );
}
