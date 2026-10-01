"use client";

// One client store for the whole prototype. Every action writes an audit entry,
// so the Audit Log is a real trail of what the viewer did in the demo.
// State persists to localStorage; "Reset demo" restores the seed.

import { MotionGlobalConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { buildSeed, CUSTODIAN_ID, ME_ID } from "./seed";
import type { AppNotification, Asset, AuditEntry, Dataset, Employee, PropertyForm, Session, Settings, WorkOrder, WorkOrderStage } from "./types";
import { AS_OF } from "./types";
import { formType } from "./selectors";

export type Role = "admin" | "custodian";

interface State extends Dataset {
  role: Role;
  session: Session | null;
  registryEmpty: boolean;
  seq: number;
  hydrated?: boolean;
}

type Action =
  | { type: "hydrate"; state: State | null }
  | { type: "reset" }
  | { type: "role"; role: Role }
  | { type: "login"; employeeId: string; remember: boolean }
  | { type: "logout" }
  | { type: "requestAccess"; name: string; email: string; office: string; employeeId: string }
  | { type: "logService"; assetId: string; date: string; cost: number; provider: string; description: string }
  | { type: "attachDocument"; assetId: string; name: string; size: number }
  | { type: "registryEmpty"; on: boolean }
  | { type: "transfer"; assetIds: string[]; to: string; office?: string; address?: string }
  | { type: "resolve"; woId: string; outcome: "storage" | "service"; note: string }
  | { type: "stage"; woId: string; stage: WorkOrderStage }
  | { type: "clearConflict"; woId: string }
  | { type: "newWorkOrder"; wo: Omit<WorkOrder, "id"> }
  | { type: "upsertAsset"; asset: Asset; isNew: boolean }
  | { type: "removeAssets"; ids: string[] }
  | { type: "restoreAssets"; assets: Asset[] }
  | { type: "issueForm"; form: PropertyForm }
  | { type: "readNotifications"; ids: string[] | "all" }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "upsertEmployee"; employee: Employee; isNew: boolean }
  | { type: "removeWorkOrder"; woId: string }
  | { type: "restoreWorkOrder"; wo: WorkOrder }
  | { type: "editWorkOrder"; wo: WorkOrder };

const KEY = "ariarian:v3";

// Dev only: a preview pane loaded hidden throttles timers, so Motion would crawl — skip animation there.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && (window as unknown as { __ARIARIAN_HIDDEN__?: number }).__ARIARIAN_HIDDEN__) {
  MotionGlobalConfig.skipAnimations = true;
}

function fresh(): State {
  return { ...buildSeed(), role: "admin", session: null, registryEmpty: false, seq: 1 };
}

function audit(s: State, e: Omit<AuditEntry, "id" | "date" | "byId">): AuditEntry {
  return { id: `AU-L${s.seq}`, date: AS_OF, byId: s.session?.employeeId ?? (s.role === "admin" ? ME_ID : CUSTODIAN_ID), fresh: true, ...e };
}

function notify(s: State, n: Omit<AppNotification, "id" | "date" | "time" | "read">): AppNotification {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { id: `N-L${s.seq}`, date: AS_OF, time, read: false, ...n };
}

function reducer(s: State, a: Action): State {
  const seq = s.seq + 1;
  switch (a.type) {
    case "hydrate": {
      const base = a.state ? { ...fresh(), ...a.state } : s;
      return { ...base, hydrated: true };
    }
    case "reset": return { ...fresh(), session: s.session, role: s.role, hydrated: s.hydrated };
    case "role": return { ...s, role: a.role, session: s.session ? { ...s.session, employeeId: a.role === "admin" ? ME_ID : CUSTODIAN_ID } : s.session };
    case "login": return { ...s, session: { employeeId: a.employeeId, remember: a.remember }, role: a.employeeId === ME_ID ? "admin" : "custodian" };
    case "logout": return { ...s, session: null };
    case "requestAccess":
      return { ...s, seq: seq + 1, notifications: [notify({ ...s, seq }, { kind: "people", title: "Access requested", body: `${a.name} (${a.employeeId}) asked for an account at ${a.office} — ${a.email}`, action: { label: "Review", href: "/employees?tab=All" } }), ...s.notifications] };
    case "logService": {
      const id = `WO-${3000 + seq}`;
      const wo: WorkOrder = { id, assetId: a.assetId, problem: "Others", summary: a.description || "Service logged", priority: "Low", technician: a.provider || "In-house", stage: "resolved", reportedOn: a.date, reportedBy: s.session?.employeeId ?? ME_ID, promisedOn: a.date, closedOn: a.date, cost: a.cost, resolution: a.description };
      return { ...s, seq: seq + 1, workOrders: [wo, ...s.workOrders], audit: [audit(s, { assetId: a.assetId, action: "Updated", note: `Service logged · ₱${a.cost.toLocaleString("en-PH")}` }), ...s.audit] };
    }
    case "attachDocument":
      return { ...s, seq, assets: s.assets.map((x) => x.id === a.assetId ? { ...x, documents: [{ name: a.name, size: a.size, addedOn: AS_OF }, ...(x.documents ?? [])] } : x), audit: [audit(s, { assetId: a.assetId, action: "Updated", note: `Attached ${a.name}` }), ...s.audit] };
    case "registryEmpty": return { ...s, registryEmpty: a.on };
    case "transfer": {
      const to = s.employees.find((e) => e.id === a.to);
      if (!to) return s;
      const moved = s.assets.filter((x) => a.assetIds.includes(x.id));
      const assets = s.assets.map((x) => a.assetIds.includes(x.id)
        ? { ...x, custodianId: a.to, office: a.office ?? to.office, address: a.address ?? x.address } : x);
      const entries = moved.map((x, i) => audit({ ...s, seq: seq + i }, { assetId: x.id, action: "Transferred", note: `to ${to.name}` }));
      const n = notify({ ...s, seq }, {
        kind: "transfer", title: "Transfer completed",
        body: moved.length === 1 ? `${moved[0].name} moved to ${to.name} • ${to.office}` : `${moved.length} assets moved to ${to.name} • ${to.office}`,
        action: { label: "View custodian", href: `/employees?employee=${to.id}` },
      });
      return { ...s, seq: seq + moved.length, assets, audit: [...entries, ...s.audit], notifications: [n, ...s.notifications] };
    }
    case "resolve": {
      const wo = s.workOrders.find((w) => w.id === a.woId);
      if (!wo) return s;
      const asset = s.assets.find((x) => x.id === wo.assetId)!;
      const workOrders = s.workOrders.map((w) => w.id === a.woId
        ? { ...w, stage: "resolved" as const, closedOn: AS_OF, cost: w.cost ?? 0, resolution: a.note || (a.outcome === "service" ? "Returned to service" : "Moved to storage") } : w);
      const assets = s.assets.map((x) => x.id === wo.assetId
        ? { ...x, operational: a.outcome === "service" ? "In Use" as const : "Standby" as const, condition: x.condition === "Poor" ? "Fair" as const : x.condition } : x);
      const n = notify({ ...s, seq }, {
        kind: "maintenance", title: "Issue resolved",
        body: `${asset.name} ${a.outcome === "service" ? "returned to service" : "moved to storage"}${a.note ? ` — ${a.note}` : ""}`,
      });
      return { ...s, seq: seq + 1, workOrders, assets, audit: [audit({ ...s, seq }, { assetId: asset.id, action: "Resolved", note: a.outcome === "service" ? "Return to Service" : "Move to Storage" }), ...s.audit], notifications: [n, ...s.notifications] };
    }
    case "stage": {
      const wo = s.workOrders.find((w) => w.id === a.woId);
      if (!wo || wo.stage === a.stage) return s;
      const workOrders = s.workOrders.map((w) => w.id === a.woId ? { ...w, stage: a.stage } : w);
      const assets = a.stage === "in_repair"
        ? s.assets.map((x) => x.id === wo.assetId ? { ...x, operational: "Maintenance" as const } : x) : s.assets;
      return { ...s, seq, workOrders, assets, audit: [audit(s, { assetId: wo.assetId, action: "Updated", note: a.stage === "in_repair" ? "Moved to In repair" : "Moved back to Reported" }), ...s.audit] };
    }
    case "clearConflict":
      return { ...s, workOrders: s.workOrders.map((w) => w.id === a.woId ? { ...w, conflict: undefined } : w) };
    case "newWorkOrder": {
      const id = `WO-${2000 + seq}`;
      const assets = s.assets.map((x) => x.id === a.wo.assetId && x.operational === "In Use" ? { ...x, operational: "Maintenance" as const } : x);
      const name = s.assets.find((x) => x.id === a.wo.assetId)?.name ?? "Asset";
      const n = notify({ ...s, seq }, { kind: "maintenance", title: "Queued for triage", body: `${name} — ${a.wo.summary}`, action: { label: "Open Resolve Issue", href: `/maintenance?resolve=${id}` } });
      return { ...s, seq: seq + 1, assets, workOrders: [{ ...a.wo, id }, ...s.workOrders], audit: [audit(s, { assetId: a.wo.assetId, action: "Reported", note: a.wo.summary }), ...s.audit], notifications: [n, ...s.notifications] };
    }
    case "upsertAsset": {
      const assets = a.isNew ? [a.asset, ...s.assets] : s.assets.map((x) => x.id === a.asset.id ? a.asset : x);
      return { ...s, seq, assets, registryEmpty: false, audit: [audit(s, { assetId: a.asset.id, action: a.isNew ? "Registered" : "Updated" }), ...s.audit] };
    }
    case "removeAssets":
      return { ...s, seq, assets: s.assets.filter((x) => !a.ids.includes(x.id)), audit: [...a.ids.map((id, i) => audit({ ...s, seq: seq + i }, { assetId: id, action: "Removed" })), ...s.audit] };
    case "restoreAssets": {
      const ids = new Set(a.assets.map((x) => x.id));
      return { ...s, assets: [...a.assets, ...s.assets.filter((x) => !ids.has(x.id))], audit: s.audit.filter((e) => !(e.action === "Removed" && ids.has(e.assetId) && e.fresh)) };
    }
    case "issueForm":
      return { ...s, seq, forms: [a.form, ...s.forms.filter((f) => f.id !== a.form.id)], audit: [...a.form.assetIds.map((id, i) => audit({ ...s, seq: seq + i }, { assetId: id, action: a.form.type === "PAR" ? "Issued PAR" : "Issued ICS", note: a.form.id })), ...s.audit] };
    case "readNotifications":
      return { ...s, notifications: s.notifications.map((n) => a.ids === "all" || a.ids.includes(n.id) ? { ...n, read: true } : n) };
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "removeWorkOrder":
      return { ...s, workOrders: s.workOrders.filter((w) => w.id !== a.woId) };
    case "restoreWorkOrder":
      return { ...s, workOrders: [a.wo, ...s.workOrders.filter((w) => w.id !== a.wo.id)] };
    case "editWorkOrder":
      return { ...s, seq, workOrders: s.workOrders.map((w) => w.id === a.wo.id ? a.wo : w), audit: [audit(s, { assetId: a.wo.assetId, action: "Updated", note: `Work order ${a.wo.id}` }), ...s.audit] };
    case "upsertEmployee": {
      const employees = a.isNew ? [a.employee, ...s.employees] : s.employees.map((e) => e.id === a.employee.id ? a.employee : e);
      const n = a.isNew ? [notify({ ...s, seq }, { kind: "people", title: "Employee added", body: `${a.employee.name} joined DOST ${a.employee.office} as ${a.employee.position}` }), ...s.notifications] : s.notifications;
      return { ...s, seq: seq + 1, employees, notifications: n };
    }
  }
}

/* ── Toasts ───────────────────────────────────────────────────── */
export interface Toast { id: number; title: string; body?: string; tone?: "default" | "good" | "bad"; action?: { label: string; run: () => void } }

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  hydrated: boolean;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  me: Dataset["employees"][number];
  /** Issue (or re-issue) a PAR/ICS for an employee's assets; returns the form id. */
  issueForms: (employeeId: string, assetIds?: string[]) => string[];
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, fresh);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as State) : null;
      // "Remember me" off → the session lives only as long as the browser tab.
      if (saved?.session && !saved.session.remember && !sessionStorage.getItem("ariarian:tab")) saved.session = null;
      dispatch({ type: "hydrate", state: saved });
    } catch { dispatch({ type: "hydrate", state: null }); /* storage unavailable — run on the seed */ }
  }, []);

  const hydrated = !!state.hydrated;
  useEffect(() => {
    if (!hydrated) return;
    try { if (state.session) sessionStorage.setItem("ariarian:tab", "1"); else sessionStorage.removeItem("ariarian:tab"); } catch { /* ignore */ }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, hydrated]);

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++tid.current;
    setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
    setTimeout(() => dismissToast(id), t.action ? 6000 : 3800);
  }, [dismissToast]);

  const me = useMemo(
    () => state.employees.find((e) => e.id === (state.session?.employeeId ?? (state.role === "admin" ? ME_ID : CUSTODIAN_ID)))
      ?? state.employees.find((e) => e.id === ME_ID)!,
    [state.employees, state.role, state.session],
  );

  const issueForms = useCallback((employeeId: string, assetIds?: string[]) => {
    const held = state.assets.filter((a) => a.custodianId === employeeId && (!assetIds || assetIds.includes(a.id)));
    const ids: string[] = [];
    for (const type of ["PAR", "ICS"] as const) {
      const items = held.filter((a) => formType(a) === type);
      if (!items.length) continue;
      const suffix = assetIds?.length === 1 ? assetIds[0].slice(-4) : employeeId.slice(-4);
      const id = `DOST-${type}-2026-${suffix}`;
      dispatch({ type: "issueForm", form: { id, type, employeeId, assetIds: items.map((a) => a.id), issuedOn: AS_OF, issuedBy: ME_ID } });
      ids.push(id);
    }
    return ids;
  }, [state.assets]);

  const value = useMemo(() => ({ state, dispatch, hydrated, toasts, toast, dismissToast, me, issueForms }),
    [state, hydrated, toasts, toast, dismissToast, me, issueForms]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

export function useLookups() {
  const { state } = useStore();
  return useMemo(() => ({
    asset: new Map(state.assets.map((a) => [a.id, a])),
    employee: new Map(state.employees.map((e) => [e.id, e])),
    agency: new Map(state.agencies.map((g) => [g.code, g])),
  }), [state.assets, state.employees, state.agencies]);
}
