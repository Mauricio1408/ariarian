// Seed dataset for the prototype.
//
// The rows visible in Figma page 4592:2 (Version 2) are written out by hand so
// the first screen of every view matches the design. The remainder of the 72
// assets / 48 employees is generated with a seeded PRNG under the constraints
// the design's headline figures imply, so every KPI is *computed* from data
// rather than typed in:
//
//   category value   Vehicles 5,850,000 · Hardware 3,180,000 · Others 2,510,000
//                    Office 1,486,500 · Appliances 968,000 · Software+Essentials 954,000
//   total            14,948,500 (72 assets)
//   operational      Damaged 29 · Maintenance 22 · Standby 7 · In Use 14
//   condition        Excellent 9 · Fair 27 · Poor 36
//   agencies         SEI 12 · DepEd 11 · DA 10 · DOH 9 · DOST 8 · DICT 6 · DPWH 5 · ASTI 4 · DENR 4 · DTI 3
//   warranty         62 covered (14·12·11·8·7·6·4 lapse 2026→2032) · 10 expired
//   custodians       48 staff · 41 hold assets · 6 assets unassigned · 3 in clearance
//   depreciation     straight-line 120 months, accumulated ≈ 5,827,900

import type {
  Agency, Asset, AssetCategory, AuditEntry, AppNotification, Dataset, Employee,
  OperationalStatus, PhysicalCondition, Priority, ProblemType, PropertyForm, WorkOrder,
} from "./types";
import { AS_OF, DEPARTMENTS } from "./types";

/* ── PRNG ─────────────────────────────────────────────────────── */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Reset on every buildSeed() so server and client generate identical rows.
let rnd = mulberry32(20260314);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const shuffle = <T,>(xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m, 2)}-${pad(d, 2)}`;
const addMonths = (s: string, months: number) => {
  const d = new Date(s + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/** Split `total` into `n` parts by random weights, rounded to the hundred; last absorbs remainder. */
function splitTotal(total: number, n: number, spread = 0.7): number[] {
  if (n === 0) return [];
  const w = Array.from({ length: n }, () => 1 - spread / 2 + rnd() * spread);
  const s = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.round((total * x) / s / 100) * 100);
  parts[n - 1] = total - parts.slice(0, -1).reduce((a, b) => a + b, 0);
  return parts;
}

/* ── Reference data ───────────────────────────────────────────── */
export const AGENCIES: Agency[] = [
  { code: "SEI", name: "Science Education Institute" },
  { code: "DepEd", name: "Department of Education" },
  { code: "DA", name: "Department of Agriculture" },
  { code: "DOH", name: "Department of Health" },
  { code: "DOST", name: "Department of Science and Technology" },
  { code: "DICT", name: "Department of Information and Communications Technology" },
  { code: "DPWH", name: "Department of Public Works and Highways" },
  { code: "ASTI", name: "Advanced Science and Technology Institute" },
  { code: "DENR", name: "Department of Environment and Natural Resources" },
  { code: "DTI", name: "Department of Trade and Industry" },
];
const AGENCY_QUOTA: Record<string, number> = { SEI: 12, DepEd: 11, DA: 10, DOH: 9, DOST: 8, DICT: 6, DPWH: 5, ASTI: 4, DENR: 4, DTI: 3 };

export const OFFICES = ["Central Office", "Regional Office VI", "Regional Office XI", "Regional Office III", "Logistics Center"] as const;
const OFFICE_ADDRESS: Record<string, string> = {
  "Central Office": "DOST Compound, Bicutan, Taguig",
  "Regional Office VI": "Magsaysay Village, La Paz, Iloilo City",
  "Regional Office XI": "Friendship Rd, Dumanlas, Davao City",
  "Regional Office III": "Diosdado Macapagal Gov't Center, San Fernando, Pampanga",
  "Logistics Center": "Brgy. Sto. Tomas, Biñan, Laguna",
};
const ROOMS = ["Room 201", "Room 305", "Records Room", "Server Room", "Lab 2", "Warehouse A", "Conference Rm B", "Admin Wing", "Motor Pool"];

/* ── Employees ────────────────────────────────────────────────── */
const NAMED_EMPLOYEES: Employee[] = [
  { id: "DOST-2016-0102", department: "Administrative Service (AS)", name: "Mauricio Bergancia", email: "m.bergancia@dost.gov.ph", position: "Administrative Officer V", office: "Central Office", status: "Active", avatar: "/img/people/mauricio.jpg", lastAudit: "2026-03-02" },
  { id: "DOST-2019-0117", department: "Administrative Service (AS)", name: "Juan Dela Cruz", email: "juandelacruz@dost.gov.ph", position: "Administrative Officer III", office: "Central Office", status: "Active", avatar: "/img/people/juan.jpg", lastAudit: "2026-03-11" },
  { id: "DOST-2020-0342", department: "Planning and Evaluation Service (PES)", name: "Maria Santos", email: "msantos@dost.gov.ph", position: "Administrative Officer II", office: "Regional Office VI", status: "Active", avatar: "/img/people/maria.jpg", lastAudit: "2026-02-18" },
  { id: "DOST-2021-0088", department: "Administrative Service (AS)", name: "Ramon Cruz", email: "rcruz@dost.gov.ph", position: "Administrative Aide VI", office: "Central Office", status: "Active", avatar: "/img/people/ramon.jpg", lastAudit: "2026-02-24" },
  { id: "DOST-2018-0225", department: "Financial and Management Service (FMS)", name: "Liza Reyes", email: "lreyes@dost.gov.ph", position: "Supply Officer II", office: "Central Office", status: "Active", avatar: "/img/people/liza.jpg", lastAudit: "2026-03-05" },
  { id: "DOST-2017-0056", department: "Science and Technology Information Institute (STII)", name: "Ana Villanueva", email: "avillanueva@dost.gov.ph", position: "Science Research Spec. II", office: "Regional Office XI", status: "Active", avatar: "/img/people/ana.jpg", lastAudit: "2026-01-30" },
  { id: "DOST-2015-0311", department: "Administrative Service (AS)", name: "Grace Tan", email: "gtan@dost.gov.ph", position: "Motor Pool Supervisor", office: "Logistics Center", status: "Active", avatar: "/img/people/grace.jpg", lastAudit: "2026-01-08" },
  { id: "DOST-2022-0140", department: "Science and Technology Information Institute (STII)", name: "Carlos Rivera", email: "crivera@dost.gov.ph", position: "IT Officer I", office: "Central Office", status: "Active", avatar: "/img/people/carlos.jpg", lastAudit: "2026-02-10" },
  { id: "DOST-2023-0511", department: "Technology Application and Promotion Institute (TAPI)", name: "Paolo Mendoza", email: "pmendoza@dost.gov.ph", position: "Project Dev. Officer I", office: "Regional Office III", status: "Clearance", avatar: "/img/people/paolo.jpg", clearanceDeadline: "2026-03-27" },
  { id: "DOST-2015-0044", department: "Office of the Secretary (OSEC)", name: "Rosa Lim", email: "rlim@dost.gov.ph", position: "Administrative Officer IV", office: "Central Office", status: "Clearance", avatar: "/img/people/rosa.png", clearanceDeadline: "2026-03-10" },
  { id: "DOST-2021-0377", department: "Planning and Evaluation Service (PES)", name: "Miguel Bautista", email: "mbautista@dost.gov.ph", position: "Science Research Analyst", office: "Regional Office VI", status: "Clearance", avatar: "/img/people/miguel.jpg", clearanceDeadline: "2026-03-12" },
];
export const ME_ID = "DOST-2016-0102";
export const CUSTODIAN_ID = "DOST-2019-0117";
const E = Object.fromEntries(NAMED_EMPLOYEES.map((e) => [e.name.split(" ")[0].toLowerCase(), e.id])) as Record<string, string>;

const FIRST = ["Angelica", "Benjie", "Carmela", "Dante", "Elaine", "Francis", "Gilbert", "Hazel", "Isagani", "Jasmine", "Kristine", "Leonardo", "Marites", "Noel", "Odessa", "Patrick", "Queenie", "Rafael", "Sheila", "Teodoro", "Ursula", "Vicente", "Wilma", "Ximena", "Yolanda", "Zaldy", "Arnel", "Bea", "Cesar", "Divina", "Efren", "Florante", "Gemma", "Herminio", "Imelda", "Jericho", "Karla"];
const LAST = ["Aquino", "Bautista", "Castillo", "Dimaculangan", "Estrada", "Fernandez", "Garcia", "Hernandez", "Ignacio", "Jimenez", "Katigbak", "Lopez", "Macaraeg", "Navarro", "Ocampo", "Panganiban", "Quiambao", "Ramos", "Salazar", "Tolentino", "Umali", "Valdez", "Yap", "Zamora", "Agustin", "Bernardo", "Cabrera", "Domingo", "Evangelista", "Flores", "Gonzales", "Herrera", "Ilagan", "Javier", "Lacson", "Manalo", "Natividad"];
const POSITIONS = ["Administrative Assistant II", "Science Research Spec. I", "Project Assistant III", "Accountant II", "Planning Officer III", "Engineer II", "Information Officer II", "Statistician II", "Records Officer I", "Budget Officer II", "Science Aide", "Training Specialist I"];
const AVATAR_POOL = ["/img/people/p5.jpg", "/img/people/p31.jpg", "/img/people/p35.jpg"];

function genEmployees(): Employee[] {
  const out: Employee[] = [];
  for (let i = 0; i < 37; i++) {
    const first = FIRST[i], last = LAST[(i * 7) % LAST.length];
    const year = 2012 + Math.floor(rnd() * 13);
    out.push({
      id: `DOST-${year}-${pad(100 + Math.floor(rnd() * 880))}`,
      name: `${first} ${last}`,
      email: `${first[0].toLowerCase()}${last.toLowerCase()}@dost.gov.ph`,
      position: pick(POSITIONS),
      office: pick(OFFICES.slice(0, 4)),
      department: DEPARTMENTS[(i * 3) % DEPARTMENTS.length],
      status: i === 11 ? "On Leave" : "Active",
      avatar: i < 3 ? AVATAR_POOL[i] : undefined,
      lastAudit: iso(2026, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 27)),
    });
  }
  return out;
}

/* ── Assets ───────────────────────────────────────────────────── */
type Draft = Omit<Asset, "acquiredOn" | "warrantyStart" | "warrantyEnd" | "room" | "address" | "agency" | "office" | "tag" | "department"> &
  Partial<Pick<Asset, "acquiredOn" | "warrantyEnd" | "room" | "address" | "agency" | "office" | "tag">>;

const NAMED_ASSETS: Draft[] = [
  { id: "DOST-2023-0117", serial: "SN-APL-0117", name: "MacBook Pro 16\"", spec: "MacBook Pro 16\" M1 — 16GB / 512GB", category: "Hardware", custodianId: E.juan, cost: 164995, acquiredOn: "2023-11-30", operational: "In Use", condition: "Excellent", photo: "/img/assets/macbook-pro.jpg", agency: "SEI", office: "Central Office", warrantyEnd: "2026-11-30" },
  { id: "DOST-2024-0342", serial: "SN-DEL-0342", name: "Dell OptiPlex 7010", spec: "Dell OptiPlex 7010 desktop", category: "Hardware", custodianId: E.juan, cost: 48500, acquiredOn: "2024-03-12", operational: "Maintenance", condition: "Poor", photo: "/img/assets/dell-optiplex.jpg", agency: "DOST", office: "Central Office", warrantyEnd: "2027-03-12" },
  { id: "DOST-2025-0225", serial: "SN-LEN-0225", name: "Lenovo ThinkPad T14", spec: "Lenovo ThinkPad T14 Gen 3", category: "Hardware", custodianId: E.juan, cost: 78400, acquiredOn: "2025-03-10", operational: "In Use", condition: "Excellent", photo: "/img/assets/lenovo-thinkpad.jpg", agency: "SEI", office: "Central Office", warrantyEnd: "2028-03-10" },
  { id: "DOST-2021-0814", serial: "TYT-HLX-0814", name: "Toyota Hilux 2.4G", spec: "Toyota Hilux 2.4G 4x2 MT", category: "Vehicles", custodianId: E.grace, cost: 2120000, acquiredOn: "2021-08-14", operational: "Maintenance", condition: "Poor", photo: "/img/assets/toyota-hilux.jpg", agency: "DA", office: "Logistics Center", room: "Motor Pool", warrantyEnd: "2026-08-14", tag: "DOST-VEH-002" },
  { id: "DOST-2024-0088", serial: "OFC-2630-04", name: "Canon iR 2630", spec: "Canon imageRUNNER 2630 copier", category: "Office", custodianId: E.juan, cost: 132750, acquiredOn: "2024-08-14", operational: "Maintenance", condition: "Poor", photo: "/img/assets/canon-ir.jpg", agency: "SEI", office: "Central Office", warrantyEnd: "2027-08-14" },
  { id: "DOST-2026-0817", serial: "VEH-0817", name: "Ford Transit Van", spec: "Ford Transit Van 2.2 TDCi", category: "Vehicles", custodianId: E.grace, cost: 1950000, acquiredOn: "2026-01-08", operational: "In Use", condition: "Fair", photo: "/img/assets/ford-transit.jpg", agency: "SEI", office: "Logistics Center", room: "Warehouse A", address: "Brgy. Sto. Tomas, Biñan, Laguna", warrantyEnd: "2029-01-08", tag: "DOST-VEH-001" },
  { id: "DOST-2022-1014", serial: "APP-MIT-1014", name: "Mitsubishi Aircon", spec: "Mitsubishi Heavy 2.0HP inverter split", category: "Appliances", custodianId: E.liza, cost: 45500, acquiredOn: "2022-02-24", operational: "Maintenance", condition: "Poor", photo: "/img/assets/mitsubishi-aircon.jpg", agency: "DOH", office: "Central Office", warrantyEnd: "2025-02-24" },
  { id: "DOST-2024-0290", serial: "SN-DEL-0290", name: "Dell Latitude 5420", spec: "Dell Latitude 5420 14\" laptop", category: "Hardware", custodianId: E.ana, cost: 52700, acquiredOn: "2024-09-05", operational: "Standby", condition: "Fair", photo: "/img/assets/dell-latitude.jpg", agency: "DepEd", office: "Regional Office XI", warrantyEnd: "2027-09-05" },
  { id: "DOST-2023-0410", serial: "SN-ACR-0410", name: "Acer Aspire 5", spec: "Acer Aspire 5 A515 laptop", category: "Hardware", custodianId: E.ramon, cost: 38900, acquiredOn: "2023-05-02", operational: "Damaged", condition: "Poor", photo: "/img/assets/acer-aspire.jpg", agency: "DepEd", office: "Central Office", warrantyEnd: "2026-05-02" },
  { id: "DOST-2025-0011", serial: "OFC-KYO-11", name: "Kyocera M2040dn", spec: "Kyocera ECOSYS M2040dn MFP", category: "Office", custodianId: E.rosa, cost: 54200, acquiredOn: "2025-11-20", operational: "Damaged", condition: "Poor", photo: "/img/assets/kyocera.jpg", agency: "DICT", office: "Central Office", warrantyEnd: "2028-11-20" },
  { id: "DOST-2022-0251", serial: "OFC-EBX51-02", name: "Epson Projector EB-X51", spec: "Epson EB-X51 projector", category: "Office", custodianId: E.juan, cost: 42500, acquiredOn: "2022-06-01", operational: "Maintenance", condition: "Fair", photo: "/img/assets/epson-projector.jpg", agency: "SEI", office: "Central Office", warrantyEnd: "2025-06-01" },
  { id: "DOST-2023-0409", serial: "OFC-M404-09", name: "HP LaserJet Pro M404", spec: "HP LaserJet Pro M404 printer", category: "Office", custodianId: E.juan, cost: 21900, acquiredOn: "2023-04-09", operational: "Maintenance", condition: "Poor", photo: "/img/assets/hp-laserjet.jpg", agency: "DOST", office: "Central Office", warrantyEnd: "2026-04-09" },
  { id: "DOST-2022-0522", serial: "VEH-0522", name: "Toyota Innova 2.8E", spec: "Toyota Innova 2.8E AT diesel", category: "Vehicles", custodianId: E.grace, cost: 1780000, acquiredOn: "2022-05-22", operational: "Damaged", condition: "Poor", photo: "/img/assets/toyota-innova.jpg", agency: "DPWH", office: "Logistics Center", room: "Motor Pool", warrantyEnd: "2027-05-22", tag: "DOST-VEH-003" },
  { id: "DOST-2021-0007", serial: "APP-CAR-07", name: "Carrier Aircon 2HP", spec: "Carrier Optima 2HP window type", category: "Appliances", custodianId: E.liza, cost: 41500, acquiredOn: "2021-07-01", operational: "Damaged", condition: "Poor", photo: "/img/assets/carrier-aircon.jpg", agency: "DA", office: "Central Office", warrantyEnd: "2024-07-01" },
  { id: "DOST-2023-0022", serial: "OFC-SAM-22", name: "Samsung 55\" Display", spec: "Samsung 55\" QM55B signage display", category: "Office", custodianId: E.maria, cost: 36800, acquiredOn: "2023-02-28", operational: "Damaged", condition: "Poor", photo: "/img/assets/samsung-display.jpg", agency: "DOH", office: "Regional Office VI", warrantyEnd: "2026-02-28" },
  { id: "DOST-2024-0009", serial: "OFC-BRO-09", name: "Brother DCP-T720", spec: "Brother DCP-T720DW ink tank printer", category: "Office", custodianId: E.carlos, cost: 12900, acquiredOn: "2024-02-24", operational: "Damaged", condition: "Poor", photo: "/img/assets/brother-dcp.jpg", agency: "ASTI", office: "Central Office", warrantyEnd: "2026-02-24" },
  { id: "DOST-2023-0012", serial: "OFC-BRH-12", name: "Brother HL-L2350", spec: "Brother HL-L2350DW mono laser", category: "Office", custodianId: E.maria, cost: 9800, acquiredOn: "2023-04-12", operational: "In Use", condition: "Fair", photo: "/img/assets/brother-hl.jpg", agency: "DOST", office: "Regional Office VI", warrantyEnd: "2027-04-12" },
];

// Generated pool — names per category (order matters for pinned fillers below).
const POOL: Record<Exclude<AssetCategory, "Vehicles">, string[]> = {
  Hardware: ["Dell PowerEdge T150", "Cisco Catalyst 1000 Stack", "Synology DS920+", "Dell Precision 3660", "HP Z2 Mini G9", "MSI Modern 15", "HP EliteBook 840", "ASUS TUF 16", "Lenovo IdeaCentre 5", "HP ProDesk 400", "Acer Veriton X", "Apple iMac 24\"", "Dell UltraSharp 27", "Lenovo ThinkCentre M70", "Ubiquiti UniFi AP", "APC Smart-UPS 1500", "ASUS ExpertBook B9", "Huawei MateBook D15", "HP Z2 Workstation"],
  Others: ["Spectrophotometer UV-1800", "Fume Hood FH-1200", "Centrifuge 5430R", "Generator Set 10kVA", "Analytical Balance AX224", "Laboratory Incubator", "Milli-Q Water Purifier", "Microscope CX43"],
  Software: ["Adobe PS", "ArcGIS Pro", "Microsoft 365 E3", "AutoCAD LT", "SPSS Statistics", "MATLAB", "Kaspersky Endpoint", "Zoom Workplace", "Tableau Creator"],
  Office: ["Sharp MX-3071 Copier", "Fujitsu fi-7160 Scanner", "Logitech Rally Bar", "Canon imageCLASS MF445", "Fellowes Powershred", "Epson EcoTank L6290", "Steelcase Think Chairs"],
  Appliances: ["Samsung Smart Refrigerator", "Daikin Inverter 3HP", "Carrier Ceiling Cassette 4HP", "LG Commercial Refrigerator", "Sharp Industrial Dehumidifier", "Panasonic Air Purifier Set"],
  Essentials: ["Medicine", "First Aid Cabinet", "Fire Extinguisher Set", "Emergency Go-Bag Kit", "AED Defibrillator", "PPE & Hard Hats"],
};
const CAT_TARGET: Record<AssetCategory, number> = { Vehicles: 5850000, Hardware: 3180000, Others: 2510000, Office: 1486500, Appliances: 968000, Software: 702000, Essentials: 252000 };
const SERIAL_PREFIX: Record<AssetCategory, string> = { Hardware: "SN-HW", Software: "LIC", Office: "OFC", Vehicles: "VEH", Appliances: "APP", Essentials: "ESS", Others: "LAB" };
const WARRANTY_URL: Record<string, string> = { "ASUS TUF 16": "asus-tuf-ph.com", "Adobe PS": "adobe.com/support" };

// Custodian fillers: [employee key, category, pool index, value]. Sized so the
// accountable totals on the Employees screen reproduce exactly.
const FILLERS: [string, Exclude<AssetCategory, "Vehicles">, number, number][] = [
  ["liza", "Others", 0, 520000], ["liza", "Others", 1, 410000], ["liza", "Others", 2, 380000], ["liza", "Others", 3, 300000],
  ["liza", "Hardware", 0, 260000], ["liza", "Hardware", 1, 210000], ["liza", "Hardware", 2, 150000],
  ["maria", "Hardware", 3, 198300], ["maria", "Hardware", 4, 142000],
  ["ramon", "Hardware", 5, 54500],
  ["ana", "Software", 0, 120300], ["ana", "Software", 1, 85000],
  ["paolo", "Hardware", 6, 88200], ["paolo", "Office", 0, 43000],
  ["rosa", "Office", 1, 96800], ["rosa", "Office", 2, 61500], ["rosa", "Appliances", 0, 84300],
];

function genAssets(employees: Employee[]): Asset[] {
  const drafts: Draft[] = NAMED_ASSETS.map((a) => ({ ...a }));
  const pinned = new Map<string, { value: number; custodian: string }>();
  for (const [who, cat, idx, value] of FILLERS) pinned.set(`${cat}:${idx}`, { value, custodian: E[who] });

  let serialN = 100;
  for (const cat of Object.keys(POOL) as (keyof typeof POOL)[]) {
    const names = POOL[cat];
    const namedSum = drafts.filter((d) => d.category === cat).reduce((s, d) => s + d.cost, 0);
    const pinnedHere = names.map((_, i) => pinned.get(`${cat}:${i}`));
    const pinnedSum = pinnedHere.reduce((s, p) => s + (p?.value ?? 0), 0);
    const free = names.filter((_, i) => !pinnedHere[i]).length;
    const freeValues = splitTotal(CAT_TARGET[cat] - namedSum - pinnedSum, free, cat === "Essentials" ? 1.4 : 0.9);
    let f = 0;
    names.forEach((name, i) => {
      const p = pinnedHere[i];
      const year = 2017 + Math.floor(rnd() * 9);
      serialN += 7 + Math.floor(rnd() * 40);
      drafts.push({
        id: `DOST-${year}-${pad(serialN)}`,
        serial: cat === "Essentials" && name === "Medicine" ? "N/A" : `${SERIAL_PREFIX[cat]}-${pad(serialN)}`,
        name, category: cat, custodianId: p?.custodian ?? null,
        cost: p ? p.value : freeValues[f++],
        operational: "In Use", condition: "Fair",
        acquiredOn: iso(year, 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)),
      });
    });
  }

  // ── operational & condition quotas over the generated rows ──
  const gen = drafts.slice(NAMED_ASSETS.length);
  const ops: OperationalStatus[] = [
    ...Array(23).fill("Damaged"), ...Array(16).fill("Maintenance"), ...Array(6).fill("Standby"), ...Array(10).fill("In Use"),
  ];
  const conds: Record<OperationalStatus, PhysicalCondition[]> = { Damaged: [], Maintenance: [], Standby: [], "In Use": [], Decommissioned: [] };
  // Excellent 7 · Fair 23 · Poor 25 — correlated with operational status.
  conds.Damaged = [...Array(20).fill("Poor"), ...Array(3).fill("Fair")];
  conds.Maintenance = [...Array(5).fill("Poor"), ...Array(11).fill("Fair")];
  conds.Standby = [...Array(5).fill("Fair"), ...Array(1).fill("Excellent")];
  conds["In Use"] = [...Array(6).fill("Excellent"), ...Array(4).fill("Fair")];
  const opOrder = shuffle(ops);
  gen.forEach((d, i) => { d.operational = opOrder[i]; });
  for (const k of Object.keys(conds) as OperationalStatus[]) {
    const list = shuffle(conds[k]);
    gen.filter((d) => d.operational === k).forEach((d, i) => { d.condition = list[i]; });
  }
  // A few named-looking rows read better with fixed states.
  const fix = (name: string, op: OperationalStatus, c: PhysicalCondition) => {
    const d = gen.find((x) => x.name === name); const o = gen.find((x) => x.operational === op && x.condition === c && x !== d);
    if (d && o) { [d.operational, o.operational] = [o.operational, d.operational]; [d.condition, o.condition] = [o.condition, d.condition]; }
  };
  fix("ASUS TUF 16", "In Use", "Excellent");
  fix("Adobe PS", "In Use", "Excellent");
  fix("Medicine", "In Use", "Fair");

  // ── agencies to quota ──
  const counts: Record<string, number> = {};
  for (const d of drafts) if (d.agency) counts[d.agency] = (counts[d.agency] ?? 0) + 1;
  const agencyBag: string[] = [];
  for (const [code, q] of Object.entries(AGENCY_QUOTA)) for (let i = 0; i < q - (counts[code] ?? 0); i++) agencyBag.push(code);
  const bag = shuffle(agencyBag);
  drafts.filter((d) => !d.agency).forEach((d, i) => { d.agency = bag[i]; });

  // ── custodians: 6 unassigned, the rest one each to other staff ──
  const others = employees.filter((e) => !Object.values(E).includes(e.id) || e.id === ME_ID).filter((e) => e.status !== "Clearance");
  const holders = shuffle(others).slice(0, 32);
  const unassigned = gen.filter((d) => !d.custodianId);
  unassigned.forEach((d, i) => { d.custodianId = i < 32 ? holders[i].id : null; });

  // ── offices / rooms / tags ──
  const empOffice = new Map(employees.map((e) => [e.id, e.office]));
  const tagN: Record<string, number> = {};
  drafts.forEach((d) => {
    d.office = d.office ?? (d.custodianId ? empOffice.get(d.custodianId) : undefined) ?? "Central Office";
    d.room = d.room ?? (d.category === "Vehicles" ? "Motor Pool" : pick(ROOMS.slice(0, 8)));
    d.address = d.address ?? OFFICE_ADDRESS[d.office!];
    const prefix = d.category.slice(0, 3).toUpperCase();
    tagN[prefix] = (tagN[prefix] ?? 0) + 1;
    d.tag = d.tag ?? `DOST-${prefix}-${pad(tagN[prefix] + 3, 3)}`;
  });

  // ── acquisition ages: solve so accumulated depreciation ≈ 5,827,900 ──
  // 4 small items are fully depreciated (acquired > 10 years ago).
  const ageOf = (d: Draft) => monthsBetween(d.acquiredOn!, AS_OF);
  const old = gen.filter((d) => d.cost < 20000 && d.category !== "Software").slice(0, 4);
  old.forEach((d, i) => { d.acquiredOn = iso(2013 + (i % 3), 2 + i, 10 + i); });
  // Rows visible on the Warranty Breakdown table (Figma 4677:7197).
  const asus = gen.find((d) => d.name === "ASUS TUF 16")!;
  const adobe = gen.find((d) => d.name === "Adobe PS")!;
  Object.assign(asus, { acquiredOn: "2023-11-30", warrantyEnd: "2026-11-30" });
  Object.assign(adobe, { acquiredOn: "2024-08-14", warrantyEnd: "2028-08-14" });
  const fixed = new Set<Draft>([...drafts.slice(0, NAMED_ASSETS.length), ...old, asus, adobe]);
  const target = 5827900 * 120;
  for (let pass = 0; pass < 6; pass++) {
    const fixedSum = drafts.filter((d) => fixed.has(d)).reduce((s, d) => s + d.cost * Math.min(ageOf(d), 120), 0);
    const movable = drafts.filter((d) => !fixed.has(d));
    const movSum = movable.reduce((s, d) => s + d.cost * ageOf(d), 0);
    const k = (target - fixedSum) / movSum;
    movable.forEach((d) => {
      const m = Math.max(2, Math.min(118, Math.round(ageOf(d) * k)));
      d.acquiredOn = addMonths(AS_OF, -m).slice(0, 8) + pad(1 + Math.floor(rnd() * 27), 2);
    });
  }

  // ── warranty: 10 expired, 62 covered lapsing 14·12·11·8·7·6·4 over 2026→2032 ──
  const lapse: Record<number, number> = { 2026: 14, 2027: 12, 2028: 11, 2029: 8, 2030: 7, 2031: 6, 2032: 4 };
  let expired = 10;
  for (const d of drafts) {
    if (!d.warrantyEnd) continue;
    if (d.warrantyEnd < AS_OF) expired--; else lapse[Number(d.warrantyEnd.slice(0, 4))]--;
  }
  const yearBag: number[] = [];
  for (const [y, n] of Object.entries(lapse)) for (let i = 0; i < n; i++) yearBag.push(Number(y));
  for (let i = 0; i < expired; i++) yearBag.push(2025 - (i % 3));
  const yb = shuffle(yearBag);
  drafts.filter((d) => !d.warrantyEnd).forEach((d, i) => {
    const y = yb[i] ?? 2027;
    const m = y === 2026 ? 4 + Math.floor(rnd() * 8) : 1 + Math.floor(rnd() * 12);
    d.warrantyEnd = iso(y, m, 1 + Math.floor(rnd() * 27));
  });
  const empDept = new Map(employees.map((e) => [e.id, e.department]));
  return drafts.map((d, i) => ({
    ...d,
    department: (d.custodianId && empDept.get(d.custodianId)) || DEPARTMENTS[i % DEPARTMENTS.length],
    tag: d.tag!, agency: d.agency!, office: d.office!, room: d.room!, address: d.address!, acquiredOn: d.acquiredOn!,
    warrantyStart: d.acquiredOn!,
    warrantyEnd: d.warrantyEnd!,
    warrantyUrl: WARRANTY_URL[d.name],
    lastAudit: iso(2026, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 27)),
  }));
}

export function monthsBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number); const [by, bm, bd] = b.split("-").map(Number);
  return Math.max(0, (by - ay) * 12 + (bm - am) - (bd < ad ? 1 : 0));
}

/* ── Work orders ──────────────────────────────────────────────── */
type WOSeed = [assetName: string, problem: ProblemType, summary: string, priority: Priority, tech: string, stage: WorkOrder["stage"], reportedOn: string, by: string, promised: string | null, closed?: string, cost?: number];

const WO_SEEDS: WOSeed[] = [
  ["Canon iR 2630", "Physical Damage", "Recurring paper jam", "Medium", "Dataworld", "reported", "2026-02-14", "juan", "2026-02-21"],
  ["Toyota Hilux 2.4G", "Hardware Failure", "Brake squeal, 10k service due", "High", "R. Cruz", "reported", "2026-02-20", "ramon", "2026-02-28"],
  ["Mitsubishi Aircon", "Hardware Failure", "Compressor replacement", "High", "FixIT Manila", "in_repair", "2026-02-26", "liza", "2026-03-07"],
  ["Dell OptiPlex 7010", "Software Issue", "Random shutdowns under load", "High", "C. Rivera", "reported", "2026-03-06", "maria", "2026-03-20"],
  ["Acer Aspire 5", "Battery Issue", "Screen cracked, battery swelling", "High", "MicroCircuit", "reported", "2026-03-12", "ramon", "2026-03-23"],
  ["Kyocera M2040dn", "Physical Damage", "Paper tray hinge snapped", "Medium", "Dataworld", "in_repair", "2026-03-01", "rosa", "2026-03-26"],
  ["Dell Latitude 5420", "Software Issue", "Reimage after malware flag", "Medium", "C. Rivera", "reported", "2026-03-10", "ana", "2026-03-29"],
  ["MacBook Pro 16\"", "Battery Issue", "Battery service recommended", "Low", "MicroCircuit", "in_repair", "2026-03-05", "juan", "2026-04-02"],
  ["Lenovo ThinkPad T14", "Hardware Failure", "Loose hinge, display flicker", "Low", "R. Cruz", "reported", "2026-03-11", "juan", "2026-04-06"],
  ["Ford Transit Van", "Physical Damage", "Rear bumper dent", "Medium", "FixIT Manila", "in_repair", "2026-03-03", "grace", "2026-04-10"],
  ["Epson Projector EB-X51", "Hardware Failure", "Lamp replacement", "Medium", "A. Cruz · in-house", "in_repair", "2026-03-04", "juan", "2026-03-18"],
  ["HP LaserJet Pro M404", "Hardware Failure", "Fuser unit replacement", "Low", "HP service partner", "in_repair", "2026-03-02", "juan", "2026-03-24"],
  // resolved this month
  ["Ford Transit Van", "Others", "Preventive service · 20,000 km", "Low", "Motor pool", "resolved", "2026-03-08", "grace", "2026-03-10", "2026-03-10", 8450],
  ["Lenovo ThinkPad T14", "Hardware Failure", "Keyboard replaced", "Medium", "A. Cruz · in-house", "resolved", "2026-03-03", "juan", "2026-03-07", "2026-03-07", 4200],
  ["Dell Latitude 5420", "Battery Issue", "Battery replaced, moved to Standby", "Medium", "R. Santos · in-house", "resolved", "2026-02-27", "ana", "2026-03-04", "2026-03-04", 5100],
  ["MacBook Pro 16\"", "Hardware Failure", "SSD swap under warranty", "High", "Apple authorised service", "resolved", "2026-02-20", "juan", "2026-03-02", "2026-03-02", 0],
];
const TECHS = ["Dataworld", "R. Cruz", "FixIT Manila", "C. Rivera", "MicroCircuit", "A. Cruz · in-house", "R. Santos · in-house"];
const SUMMARIES: Record<ProblemType, string[]> = {
  "Hardware Failure": ["Won't power on", "Fan grinding noise", "Port no longer detected", "Overheating under load"],
  "Software Issue": ["License expired, renewal pending", "Update loop on boot", "Driver conflict after patch"],
  "Battery Issue": ["Battery drains in under an hour", "Not holding charge"],
  "Physical Damage": ["Casing cracked in transit", "Water damage", "Glass panel shattered"],
  Others: ["Calibration overdue", "Missing accessories on audit"],
};

function genWorkOrders(assets: Asset[]): WorkOrder[] {
  const byName = new Map(assets.map((a) => [a.name, a]));
  const out: WorkOrder[] = [];
  let n = 1000;
  for (const s of WO_SEEDS) {
    const [name, problem, summary, priority, technician, stage, reportedOn, by, promisedOn, closedOn, cost] = s;
    out.push({ id: `WO-${++n}`, assetId: byName.get(name)!.id, problem, summary, priority, technician, stage, reportedOn, reportedBy: E[by], promisedOn, closedOn: closedOn ?? null, cost: cost ?? null });
  }
  // The Figma save-conflict path: Canon iR 2630 moved to Rosa Lim while the dialog was open.
  out[0].conflict = { by: "Liza Reyes", to: "Rosa Lim", minutesAgo: 4 };

  // 10 more open: 6 reported + 4 in repair, on generated Maintenance-status assets.
  const used = new Set(out.map((w) => w.assetId));
  const pool = shuffle(assets.filter((a) => a.operational === "Maintenance" && !used.has(a.id)));
  const stages: WorkOrder["stage"][] = ["reported", "reported", "reported", "reported", "reported", "reported", "in_repair", "in_repair", "in_repair", "in_repair"];
  stages.forEach((stage, i) => {
    const a = pool[i % pool.length];
    const problem = a.category === "Software" ? "Software Issue" : pick(["Hardware Failure", "Physical Damage", "Battery Issue", "Others"] as ProblemType[]);
    const rd = iso(2026, 3, 1 + Math.floor(rnd() * 12));
    out.push({
      id: `WO-${++n}`, assetId: a.id, problem, summary: pick(SUMMARIES[problem]), priority: pick(["High", "Medium", "Low"] as Priority[]),
      technician: pick(TECHS), stage, reportedOn: rd, reportedBy: E[pick(["juan", "maria", "liza", "ana", "ramon"])],
      promisedOn: iso(2026, 4, 12 + Math.floor(rnd() * 16)), closedOn: null, cost: null,
    });
  });
  // 4 more resolved this month, then Jan–Feb history; YTD spend = 742,300.
  const hist = shuffle(assets.filter((a) => a.operational !== "Maintenance"));
  const extra: { closed: string; month: number }[] = [
    ...[5, 9, 11, 12].map((d) => ({ closed: iso(2026, 3, d), month: 3 })),
    ...[3, 9, 15, 20, 26].map((d) => ({ closed: iso(2026, 2, d), month: 2 })),
    ...[6, 13, 19, 27].map((d) => ({ closed: iso(2026, 1, d), month: 1 })),
  ];
  const seededSpend = out.reduce((s, w) => s + (w.cost ?? 0), 0);
  const costs = splitTotal(742300 - seededSpend, extra.length, 1.2);
  extra.forEach((e, i) => {
    const a = hist[i];
    const problem = pick(["Hardware Failure", "Physical Damage", "Battery Issue", "Others"] as ProblemType[]);
    out.push({
      id: `WO-${++n}`, assetId: a.id, problem, summary: pick(SUMMARIES[problem]), priority: pick(["High", "Medium", "Low"] as Priority[]),
      technician: pick(TECHS), stage: "resolved", reportedOn: addMonths(e.closed, 0).slice(0, 8) + "01", reportedBy: E.juan,
      promisedOn: e.closed, closedOn: e.closed, cost: costs[i], resolution: "Returned to service",
    });
  });
  return out;
}

/* ── Audit log ────────────────────────────────────────────────── */
function genAudit(assets: Asset[], employees: Employee[]): AuditEntry[] {
  const byName = new Map(assets.map((a) => [a.name, a]));
  const visible: [string, string, string, AuditEntry["action"]][] = [
    ["MacBook Pro 16\"", "juan", "2026-03-11", "Audited"],
    ["Toyota Hilux 2.4G", "maria", "2026-03-04", "Transferred"],
    ["Mitsubishi Aircon", "ramon", "2026-02-24", "Reported"],
    ["Ford Transit Van", "grace", "2026-01-08", "Registered"],
    ["Medicine", "liza", "2025-12-16", "Registered"],
    ["Kyocera M2040dn", "rosa", "2025-11-20", "Registered"],
    ["Canon iR 2630", "juan", "2025-10-02", "Updated"],
    ["Lenovo ThinkPad T14", "carlos", "2025-03-10", "Registered"],
    ["Dell Latitude 5420", "ana", "2024-09-05", "Registered"],
    ["Dell OptiPlex 7010", "juan", "2024-08-09", "Updated"],
  ];
  const out: AuditEntry[] = visible.map(([name, who, date, action], i) => ({
    id: `AU-${pad(900 - i)}`, assetId: byName.get(name)!.id, action, byId: E[who], date,
  }));
  const rest = shuffle(assets.filter((a) => !visible.some(([n]) => n === a.name))).slice(0, 38);
  const actions: AuditEntry["action"][] = ["Registered", "Transferred", "Updated", "Audited", "Reported"];
  rest.forEach((a, i) => {
    const y = 2024 - Math.floor(i / 16);
    out.push({ id: `AU-${pad(880 - i)}`, assetId: a.id, action: pick(actions), byId: pick(employees).id, date: iso(y, 12 - (i % 12), 1 + Math.floor(rnd() * 27)) });
  });
  return out;
}

/* ── Notifications ────────────────────────────────────────────── */
const NOTIFICATIONS: AppNotification[] = [
  { id: "N-12", kind: "maintenance", title: "Damage reported", body: "Acer Aspire 5 (SN-ACR-0410) reported by Ramon Cruz — screen cracked", date: "2026-03-14", time: "9:42 AM", read: false, action: { label: "Open Resolve Issue", href: "/maintenance?resolve=WO-1005" } },
  { id: "N-11", kind: "transfer", title: "Transfer approved", body: "Toyota Hilux 2.4G moved to DOST Regional Office VI • custodian Maria Santos", date: "2026-03-14", time: "8:15 AM", read: false },
  { id: "N-10", kind: "warranty", title: "Warranties expiring", body: "14 warranties lapse in 2026 — first is Kyocera M2040dn on Apr 3", date: "2026-03-14", time: "7:30 AM", read: false, action: { label: "View warranties", href: "/?view=warranty" } },
  { id: "N-09", kind: "maintenance", title: "Repair update", body: "HP LaserJet Pro M404 — fuser unit ordered, back in service by Mar 24", date: "2026-03-13", time: "4:05 PM", read: false },
  { id: "N-08", kind: "people", title: "Clearance started", body: "Paolo Mendoza must return 2 assets before Mar 27", date: "2026-03-13", time: "11:20 AM", read: false, action: { label: "View clearance", href: "/employees?tab=Clearance" } },
  { id: "N-07", kind: "audit", title: "Audit due this quarter", body: "3 Excellent-condition assets are due for physical audit", date: "2026-03-13", time: "9:00 AM", read: false },
  { id: "N-06", kind: "maintenance", title: "Queued for triage", body: "Canon iR 2630 — paper jam recurring, reported by Juan Dela Cruz", date: "2026-03-09", time: "Mar 9", read: false },
  { id: "N-05", kind: "people", title: "Employee added", body: "Miguel Bautista joined DOST Regional Office VI as Science Research Analyst", date: "2026-03-08", time: "Mar 8", read: false },
  { id: "N-04", kind: "transfer", title: "Transfer requested", body: "Dell Latitude 5420 to Regional Office XI • awaiting your approval", date: "2026-03-07", time: "Mar 7", read: false, action: { label: "Review", href: "/assets?asset=DOST-2024-0290" } },
  { id: "N-03", kind: "maintenance", title: "Overdue repair", body: "Mitsubishi Aircon passed its promised date with FixIT Manila", date: "2026-03-07", time: "Mar 7", read: false },
  { id: "N-02", kind: "transfer", title: "Transfer completed", body: "Ford Transit Van registered to Logistics Center • custodian Grace Tan", date: "2026-03-06", time: "Mar 6", read: false },
  { id: "N-01", kind: "warranty", title: "Warranty lapsed", body: "Samsung 55\" Display warranty ended Feb 28 — repairs are now billable", date: "2026-03-01", time: "Mar 1", read: false },
  { id: "N-00", kind: "maintenance", title: "Repair closed", body: "MacBook Pro 16\" SSD swap completed under warranty at ₱0", date: "2026-03-02", time: "Mar 2", read: true },
];

/* ── Property forms ───────────────────────────────────────────── */
const FORMS: PropertyForm[] = [
  { id: "DOST-PAR-2026-0117", type: "PAR", employeeId: "DOST-2019-0117", assetIds: ["DOST-2023-0117", "DOST-2024-0088", "DOST-2025-0225"], issuedOn: AS_OF, issuedBy: ME_ID },
  { id: "DOST-ICS-2026-0117", type: "ICS", employeeId: "DOST-2019-0117", assetIds: ["DOST-2024-0342", "DOST-2022-0251", "DOST-2023-0409"], issuedOn: AS_OF, issuedBy: ME_ID },
];

/* ── Assemble ─────────────────────────────────────────────────── */
export function buildSeed(): Dataset {
  rnd = mulberry32(20260314);
  const employees = [...NAMED_EMPLOYEES, ...genEmployees()];
  const assets = genAssets(employees);
  return {
    agencies: AGENCIES,
    employees,
    assets,
    workOrders: genWorkOrders(assets),
    audit: genAudit(assets, employees),
    notifications: NOTIFICATIONS,
    forms: FORMS,
    settings: {
      twoFactor: true,
      requirePhoto: false,
      digest: "Weekdays • 8:00 AM",
      notify: {
        "Damage reports": { app: true, email: true },
        Transfers: { app: true, email: false },
        "Warranty expiring": { app: true, email: true },
        "Repair updates": { app: true, email: false },
        Clearance: { app: true, email: true },
        "Audit reminders": { app: true, email: true },
      },
      profile: { name: "Mauricio Bergancia", email: "m.bergancia@dost.gov.ph", office: "DOST Central Office", position: "Administrative Officer V", division: "Administrative Service" },
    },
  };
}
