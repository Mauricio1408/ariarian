// Domain types for the AriArian prototype.
// Enumerations come from Obsidian Vault/AriArian/Business Rules.md.

export const OPERATIONAL_STATUS = ["In Use", "Standby", "Maintenance", "Damaged", "Decommissioned"] as const;
export const PHYSICAL_CONDITION = ["Excellent", "Fair", "Poor"] as const;
export const ASSET_CATEGORY = ["Hardware", "Software", "Office", "Vehicles", "Appliances", "Essentials", "Others"] as const;
export const EMPLOYEE_STATUS = ["Active", "On Leave", "Clearance"] as const;
export const WORK_ORDER_STAGE = ["reported", "in_repair", "resolved"] as const;
export const PROBLEM_TYPE = ["Hardware Failure", "Software Issue", "Battery Issue", "Physical Damage", "Others"] as const;
export const PRIORITY = ["High", "Medium", "Low"] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUS)[number];
export type PhysicalCondition = (typeof PHYSICAL_CONDITION)[number];
export type AssetCategory = (typeof ASSET_CATEGORY)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[number];
export type WorkOrderStage = (typeof WORK_ORDER_STAGE)[number];
export type ProblemType = (typeof PROBLEM_TYPE)[number];
export type Priority = (typeof PRIORITY)[number];

/** Capitalisation threshold — COA Circular 2022-004. PAR at or above, ICS below. */
export const CAPITALISATION_THRESHOLD = 50_000;
/** Straight-line depreciation period, in months. */
export const USEFUL_LIFE_MONTHS = 120;
/** Reporting date. Every figure computes against this, not the wall clock. */
export const AS_OF = "2026-03-14";

export interface Agency { code: string; name: string }

export interface Employee {
  id: string;            // DOST-2019-0117
  name: string;
  email: string;
  position: string;
  office: string;
  department: string;
  contact?: string;
  address?: string;
  status: EmployeeStatus;
  avatar?: string;
  lastAudit?: string;
  clearanceDeadline?: string;
}

export interface Asset {
  id: string;            // property number DOST-2023-0117
  tag: string;           // DOST-VEH-001
  serial: string;        // SN-APL-0117
  name: string;
  spec?: string;         // long description used on PAR/ICS
  category: AssetCategory;
  agency: string;        // agency code
  office: string;
  department: string;    // DOST service (OSEC, PES, FMS, AS…)
  room: string;
  address: string;
  custodianId: string | null;
  cost: number;
  acquiredOn: string;
  operational: OperationalStatus;
  condition: PhysicalCondition;
  warrantyStart: string;
  warrantyEnd: string;
  warrantyUrl?: string;
  photo?: string;
  lastAudit?: string;
  documents?: { name: string; size: number; addedOn: string }[];
}

export interface WorkOrder {
  id: string;
  assetId: string;
  problem: ProblemType;
  summary: string;
  priority: Priority;
  technician: string;
  stage: WorkOrderStage;
  reportedOn: string;
  reportedBy: string;     // employee id
  promisedOn: string | null;
  closedOn: string | null;
  cost: number | null;
  resolution?: string;
  /** Prototype hook: the first confirm hits the save-conflict state (Figma 4657:1899). */
  conflict?: { by: string; to: string; minutesAgo: number };
}

export type AuditAction = "Registered" | "Transferred" | "Resolved" | "Reported" | "Updated" | "Issued PAR" | "Issued ICS" | "Removed" | "Audited";

export interface AuditEntry {
  id: string;
  assetId: string;
  action: AuditAction;
  byId: string;
  date: string;
  note?: string;
  fresh?: boolean;
}

export type NotificationKind = "maintenance" | "transfer" | "warranty" | "people" | "audit";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  date: string;
  time: string;
  read: boolean;
  action?: { label: string; href: string };
}

export interface PropertyForm {
  id: string;             // DOST-PAR-2026-0117
  type: "PAR" | "ICS";
  employeeId: string;
  assetIds: string[];
  issuedOn: string;
  issuedBy: string;
}

/** DOST services — Figma popup 1964:9875 (Financial Reports · Department filter). */
export const DEPARTMENTS = [
  "Office of the Secretary (OSEC)", "Undersecretaries’ Offices", "Planning and Evaluation Service (PES)",
  "Financial and Management Service (FMS)", "Administrative Service (AS)", "Internal Audit Service (IAS)",
  "Legal Service (LS)", "Science and Technology Information Institute (STII)",
  "Technology Application and Promotion Institute (TAPI)", "International Cooperation Unit",
] as const;

export interface Session { employeeId: string; remember: boolean }

export interface Settings {
  twoFactor: boolean;
  requirePhoto: boolean;
  notify: Record<string, { app: boolean; email: boolean }>;
  digest: string;
  profile: { name: string; email: string; office: string; position: string; division: string };
}

export interface Dataset {
  agencies: Agency[];
  employees: Employee[];
  assets: Asset[];
  workOrders: WorkOrder[];
  audit: AuditEntry[];
  notifications: AppNotification[];
  forms: PropertyForm[];
  settings: Settings;
}
