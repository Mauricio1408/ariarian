"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { WorkOrder, WorkOrderStage } from "@/lib/types";
import { deadline, DATE_TIER_CLASS, monthDay, php } from "@/lib/format";
import { Avatar, PriorityPill, Thumb } from "@/components/ui/primitives";
import { T } from "@/components/ui/motion";

const COLS: { stage: WorkOrderStage; title: string; sub: string; dot: string }[] = [
  { stage: "reported", title: "Reported", sub: "Awaiting triage decision", dot: "bg-bad-chart" },
  { stage: "in_repair", title: "In repair", sub: "Assigned to a technician or vendor", dot: "bg-warn-solid" },
  { stage: "resolved", title: "Resolved this month", sub: "Closed since Mar 1", dot: "bg-good-solid" },
];

export function Board({ orders, onResolve, onNew, onOpen }: { orders: WorkOrder[]; onResolve: (id: string) => void; onNew: () => void; onOpen: (id: string) => void }) {
  const { dispatch, toast } = useStore();
  const [over, setOver] = useState<WorkOrderStage | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const columnAt = (x: number, y: number) => {
    for (const c of COLS) {
      const r = refs.current[c.stage]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.stage;
    }
    return null;
  };

  const drop = (wo: WorkOrder, to: WorkOrderStage | null) => {
    setOver(null); setDragging(null);
    if (!to || to === wo.stage) return;
    if (to === "resolved") { onResolve(wo.id); return; }
    if (wo.stage === "resolved") { toast({ title: "Resolved work orders are closed", body: "Open a new work order instead", tone: "bad" }); return; }
    dispatch({ type: "stage", woId: wo.id, stage: to });
    toast({ title: to === "in_repair" ? "Moved to In repair" : "Moved back to Reported", body: `${wo.summary} • audit entry recorded` });
  };

  const visible = (stage: WorkOrderStage) => {
    const list = orders.filter((w) => w.stage === stage && (stage !== "resolved" || (w.closedOn ?? "") >= "2026-03-01"))
      .sort((a, b) => stage === "resolved" ? (b.closedOn ?? "").localeCompare(a.closedOn ?? "") : 0);
    return { list, shown: expanded[stage] ? list : list.slice(0, stage === "resolved" ? 4 : 3) };
  };

  return (
    <LayoutGroup>
      <div className="grid grid-cols-3 gap-10 mt-6">
        {COLS.map((c) => {
          const { list, shown } = visible(c.stage);
          const isOver = over === c.stage && dragging && orders.find((w) => w.id === dragging)?.stage !== c.stage;
          return (
            <div key={c.stage} ref={(el) => { refs.current[c.stage] = el; }}
              className={cn("relative rounded-[18px] -m-3 p-3 transition-[background-color,box-shadow] duration-200", isOver && "bg-brand-50 shadow-[inset_0_0_0_2px_var(--color-brand-300)]")}>
              <div className="flex items-center gap-2.5 px-3">
                <span className={cn("size-2.5 rounded-full", c.dot)} />
                <span className="text-[15px] font-medium">{c.title}</span>
                <motion.span key={list.length} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={T.spring} className="grid place-items-center min-w-[30px] h-6 rounded-full bg-white text-[12px] text-ink-2 tnum">{list.length}</motion.span>
                {c.stage !== "resolved" && <button onClick={onNew} aria-label={`Add to ${c.title}`} className="ml-auto grid place-items-center size-7 rounded-md text-ink-2 hover:bg-white hover:text-ink cursor-pointer"><Plus size={16} /></button>}
              </div>
              <p className="t-b3 text-ink-2 px-3 mt-1 mb-2.5">{c.sub}</p>
              <div className="flex flex-col gap-2.5 min-h-[140px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.map((w, i) => (
                    <Card key={w.id} wo={w} i={i} dragging={dragging === w.id}
                      onDragStart={() => setDragging(w.id)}
                      onDrag={(x, y) => setOver(columnAt(x, y))}
                      onDrop={(x, y) => drop(w, columnAt(x, y))}
                      onOpen={() => (w.stage === "resolved" ? onOpen(w.id) : onResolve(w.id))} />
                  ))}
                </AnimatePresence>
                <AnimatePresence>{isOver && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 64 }} exit={{ opacity: 0, height: 0 }} transition={T.state}
                    className="rounded-xl border-2 border-dashed border-brand-300 grid place-items-center t-b2 text-brand-700">
                    {c.stage === "resolved" ? "Drop to resolve" : `Move to ${c.title}`}
                  </motion.div>
                )}</AnimatePresence>
              </div>
              {list.length > shown.length || expanded[c.stage] ? (
                <button onClick={() => setExpanded((e) => ({ ...e, [c.stage]: !e[c.stage] }))} className="block mx-auto mt-3 t-b3 text-ink-2 hover:text-ink cursor-pointer">
                  {expanded[c.stage] ? "Show less" : `+ ${list.length - shown.length} more`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function Card({ wo, i, dragging, onDragStart, onDrag, onDrop, onOpen }: {
  wo: WorkOrder; i: number; dragging: boolean; onDragStart: () => void; onDrag: (x: number, y: number) => void; onDrop: (x: number, y: number) => void; onOpen: () => void;
}) {
  const L = useLookups();
  const a = L.asset.get(wo.assetId);
  const by = L.employee.get(wo.reportedBy);
  const moved = useRef(false);
  if (!a) return null;
  const d = deadline(wo.promisedOn);
  const tech = wo.technician.includes("·") ? wo.technician : wo.technician;
  return (
    <motion.div layout layoutId={`wo-${wo.id}`}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { ...T.state, delay: i * 0.03 } }} exit={{ opacity: 0, scale: 0.95 }}
      drag dragSnapToOrigin dragElastic={0.9} dragMomentum={false}
      whileDrag={{ scale: 1.04, rotate: 2, boxShadow: "0 24px 48px -12px rgb(5 18 18 / 0.28)", zIndex: 40, cursor: "grabbing" }}
      onDragStart={() => { moved.current = true; onDragStart(); }}
      onDrag={(e) => { const p = e as PointerEvent; onDrag(p.clientX, p.clientY); }}
      onDragEnd={(e) => { const p = e as PointerEvent; onDrop(p.clientX, p.clientY); setTimeout(() => { moved.current = false; }, 0); }}
      onClick={() => { if (!moved.current) onOpen(); }}
      className={cn("relative card-raised px-3 pt-3 pb-2.5 cursor-grab select-none touch-none", dragging && "z-40")}>
      <div className="flex items-start gap-3">
        <Thumb src={a.photo} category={a.category} size={40} className="rounded-md" />
        <div className="min-w-0"><p className="text-[15px] font-medium leading-tight truncate">{a.name}</p><p className="t-b3 text-ink-2 mt-1">{a.serial}</p></div>
      </div>
      <p className="text-[15px] mt-2.5">{wo.summary}</p>
      <div className="flex items-center gap-2 mt-2.5">
        {wo.stage === "resolved" ? (
          <>
            <span className="grid place-items-center size-6 rounded-full bg-tint text-[10px] text-ink-2 font-medium">{tech.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
            <span className="t-b3 text-ink-2 truncate">{tech}</span>
            <span className="ml-auto t-b3 text-ink-2 whitespace-nowrap">Closed {monthDay(wo.closedOn!)} • {php(wo.cost ?? 0)}</span>
          </>
        ) : (
          <>
            <PriorityPill p={wo.priority} />
            {wo.stage === "reported" ? (<><Avatar src={by?.avatar} name={by?.name ?? "?"} size={20} /><span className="t-b3 text-ink-2 truncate">{by?.name}</span></>)
              : (<><span className="grid place-items-center size-5 rounded-full bg-tint text-[9px] text-ink-2">{tech[0]}</span><span className="t-b3 text-ink-2 truncate">{tech}</span></>)}
            <span className={cn("ml-auto t-b3 whitespace-nowrap", wo.stage === "reported" ? (d.tier === "over" ? DATE_TIER_CLASS.over : "text-ink-2") : DATE_TIER_CLASS[d.tier])}>
              {wo.stage === "reported" ? (d.tier === "over" ? d.label : `Reported ${monthDay(wo.reportedOn)}`) : d.label}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
