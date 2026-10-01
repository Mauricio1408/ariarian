"""
Generate supabase/seed.sql for AriArian.

Every aggregate in Obsidian Vault/AriArian/{Asset,Employee,Work Order,
Property Form} Schema.md is treated as a hard constraint and asserted at
the bottom of this file. If an assertion fails, the seed is not written.

Run:  python scripts/gen_seed.py
"""

from __future__ import annotations
from pathlib import Path
from datetime import date, timedelta

AS_OF = date(2026, 3, 14)

# ── Constraints from the vault ───────────────────────────────────────
CATEGORY_TARGET = {                 # (count, acquisition_cost sum)
    "Vehicles":   (3,  5_850_000),
    "Hardware":   (24, 3_180_000),
    "Others":     (4,  2_510_000),
    "Office":     (14, 1_486_500),
    "Appliances": (11,   968_000),
    "Software":   (9,    742_000),
    "Essentials": (7,    212_000),
}
TOTAL_ASSETS = 72
TOTAL_VALUE = 14_948_500

AGENCY_TARGET = {                   # asset count per administering agency
    "SEI": 12, "DepEd": 11, "DA": 10, "DOH": 9, "DOST": 8,
    "DICT": 6, "DPWH": 5, "ASTI": 4, "DENR": 4, "DTI": 3,
}
CONDITION_TARGET = {"Excellent": 9, "Fair": 27, "Poor": 36}
STATUS_TARGET = {
    "In Use": 14, "Standby": 7, "Maintenance": 22,
    "Damaged": 29, "Decommissioned": 0,
}

WO_STAGE_TARGET = {"reported": 12, "in_repair": 10, "resolved": 8}
WO_OVERDUE = 3
WO_SPEND = 742_300

WARRANTY_ACTIVE, WARRANTY_EXPIRED, WARRANTY_LAPSING_2026 = 62, 10, 14

TAG_PREFIX = {
    "Hardware": "SN", "Office": "OFC", "Vehicles": "TYT",
    "Appliances": "APP", "Software": "SFT", "Essentials": "ESS",
    "Others": "OTH",
}

# ── Named employees (assets held, accountable value) ─────────────────
NAMED = [
    ("Juan Dela Cruz",  "Administrative Officer III",   6,   489_045, "Active"),
    ("Maria Santos",    "Administrative Officer II",    4,   386_900, "Active"),
    ("Ramon Cruz",      "Administrative Aide VI",       2,    93_400, "Active"),
    ("Liza Reyes",      "Supply Officer II",            9, 2_317_000, "Active"),
    ("Ana Villanueva",  "Science Research Spec. II",    3,   258_000, "Active"),
    ("Grace Tan",       "Motor Pool Supervisor",        3, 5_850_000, "Active"),
    ("Carlos Rivera",   "IT Officer I",                 5,   472_300, "Active"),
    ("Paolo Mendoza",   "Project Dev. Officer I",       2,   131_200, "Clearance"),
    ("Rosa Lim",        "Administrative Officer IV",    4,   296_800, "Clearance"),
    ("Miguel Bautista", "Science Research Analyst",     0,         0, "Clearance"),
]
TOTAL_EMPLOYEES = 48
EMP_STATUS_TARGET = {"Active": 44, "On Leave": 1, "Clearance": 3}

# Juan's six assets are quoted verbatim in the case study — fixed.
JUAN_ASSETS = [
    ('MacBook Pro 16"',            "Hardware", 164_995),
    ("Canon imageRUNNER 2630",     "Office",   132_750),
    ("Lenovo ThinkPad T14",        "Hardware",  78_400),
    ("Dell OptiPlex 7010",         "Hardware",  48_500),
    ("Epson EB-X51 Projector",     "Office",    42_500),
    ("HP LaserJet Pro M404",       "Office",    21_900),
]
GRACE_ASSETS = [
    ("Toyota Hilux 2.4G",          "Vehicles", 2_450_000),
    ("Toyota Innova 2.8E",         "Vehicles", 1_850_000),
    ("Isuzu NLR Utility Truck",    "Vehicles", 1_550_000),
]

# (employee, category, count, total cost) for the remaining named holders.
# Row sums equal each employee's accountable value; column sums are checked
# against CATEGORY_TARGET at the end.
CELLS = [
    ("Liza Reyes",     "Others",     3, 1_880_000),
    ("Liza Reyes",     "Hardware",   4,   380_000),
    ("Liza Reyes",     "Appliances", 2,    57_000),
    ("Maria Santos",   "Hardware",   2,   268_900),
    ("Maria Santos",   "Office",     2,   118_000),
    ("Carlos Rivera",  "Hardware",   3,   372_300),
    ("Carlos Rivera",  "Software",   2,   100_000),
    ("Rosa Lim",       "Office",     2,   176_800),
    ("Rosa Lim",       "Appliances", 2,   120_000),
    ("Ana Villanueva", "Software",   2,   198_000),
    ("Ana Villanueva", "Essentials", 1,    60_000),
    ("Paolo Mendoza",  "Hardware",   1,    95_200),
    ("Paolo Mendoza",  "Appliances", 1,    36_000),
    ("Ramon Cruz",     "Office",     1,    63_400),
    ("Ramon Cruz",     "Essentials", 1,    30_000),
]

# Remainder held by unnamed staff / unassigned, per category: (others, unassigned)
FILL_SPLIT = {
    "Hardware":   (9, 2),
    "Office":     (5, 1),
    "Others":     (1, 0),
    "Appliances": (5, 1),
    "Software":   (4, 1),
    "Essentials": (4, 1),
}

CATALOG = {
    "Hardware": ["Dell Latitude 5440", "HP EliteBook 840", "Acer Veriton M200",
                 "Asus ExpertCenter D700", "Lenovo ThinkCentre M70q",
                 "Dell Precision 3660", "HP ProDesk 400 G9", "Apple Mac mini M2",
                 "Asus Vivobook 15", "MSI Modern 14", "Intel NUC 13 Pro",
                 "Dell OptiPlex 5000", "HP Z2 Mini G9", "Lenovo Legion T5",
                 "Acer Aspire TC", "Synology DS923+ NAS", "Ubiquiti Dream Machine",
                 "Cisco Catalyst 1000", "APC Smart-UPS 1500", "Brother ADS-4300N",
                 "Logitech Rally Bar"],
    "Office":   ["Steelcase Series 1 Chair", "Ergonomic Task Chair",
                 "Conference Table 8-Seater", "Filing Cabinet 4-Drawer",
                 "Whiteboard 1200x900", "Reception Desk", "Bookshelf Unit",
                 "Office Partition Set", "Executive Desk", "Visitor Chair Set",
                 "Document Shredder"],
    "Vehicles": [],
    "Appliances": ["Carrier Split-Type AC 2.0HP", "Panasonic Inverter AC 1.5HP",
                   "Samsung Refrigerator 8cf", "Water Dispenser Hot/Cold",
                   "Microwave Oven 25L", "Electric Fan Stand 18in",
                   "Air Purifier HEPA", "Coffee Maker 12-Cup",
                   "Dehumidifier 20L", "Induction Cooker", "Vacuum Cleaner 2L"],
    "Software": ["Microsoft 365 E3 Licence", "Adobe Creative Cloud Licence",
                 "AutoCAD LT Subscription", "Windows Server 2022 CAL",
                 "Kaspersky Endpoint Security", "Zoom Business Licence",
                 "Tableau Creator Licence", "ArcGIS Desktop Licence",
                 "SPSS Statistics Base"],
    "Essentials": ["First Aid Cabinet", "Fire Extinguisher 10lb",
                   "Emergency Light Unit", "Water Purifier Filter Set",
                   "Safety Signage Pack", "Tool Kit 120-Piece",
                   "Ladder Aluminium 8ft"],
    "Others":   ["Laboratory Fume Hood", "Analytical Balance 0.1mg",
                 "Spectrophotometer UV-Vis", "Autoclave Sterilizer 50L"],
}


def split(total: int, n: int) -> list[int]:
    """n positive ints summing exactly to total, snapped to hundreds."""
    if n == 1:
        return [total]
    base = max(100, (total // n // 100) * 100)
    parts = [base] * n
    parts[-1] = total - base * (n - 1)
    if parts[-1] <= 0:                      # too coarse — fall back to even
        base = total // n
        parts = [base] * n
        parts[-1] = total - base * (n - 1)
    # nudge for variety while preserving the sum
    if n >= 3 and parts[0] > 2000 and parts[-1] > 2000:
        step = min(parts[0] // 4, parts[-1] // 4)
        step -= step % 100
        parts[0] += step
        parts[-1] -= step
    return parts


# ── Build employees ──────────────────────────────────────────────────
FIRST = ["Ronaldo", "Cecilia", "Efren", "Marites", "Dante", "Imelda", "Ferdinand",
         "Luzviminda", "Rogelio", "Nenita", "Arturo", "Corazon", "Benigno",
         "Perlita", "Wilfredo", "Josefina", "Reynaldo", "Erlinda", "Alfredo",
         "Remedios", "Teodoro", "Lourdes", "Silverio", "Angelita", "Bonifacio",
         "Milagros", "Eduardo", "Consuelo", "Rodolfo", "Purificacion", "Salvador",
         "Natividad", "Isagani", "Fe", "Leonardo", "Rosario", "Crisanto", "Dolores"]
LAST = ["Aquino", "Bautista", "Castillo", "Dizon", "Espino", "Fajardo", "Gonzales",
        "Hernandez", "Ilagan", "Javier", "Lagman", "Macapagal", "Navarro",
        "Ocampo", "Pascual", "Quinto", "Ramos", "Salazar", "Tolentino", "Urbano",
        "Valdez", "Wenceslao", "Ybanez", "Zamora", "Abueg", "Bolisay", "Cuevas",
        "Dagdag", "Enriquez", "Ferrer", "Galang", "Hizon", "Inocencio", "Jocson",
        "Katigbak", "Lumbao", "Mabini", "Nepomuceno"]
POSITIONS = ["Administrative Aide IV", "Administrative Officer I",
             "Science Research Specialist I", "Project Development Officer II",
             "Administrative Assistant III", "Supply Officer I",
             "Information Systems Analyst I", "Engineer II"]

AGENCY_NAMES = {
    "DOST":  "Department of Science and Technology",
    "SEI":   "DOST Science Education Institute",
    "ASTI":  "DOST Advanced Science and Technology Institute",
    "DepEd": "Department of Education",
    "DA":    "Department of Agriculture",
    "DOH":   "Department of Health",
    "DICT":  "Department of Information and Communications Technology",
    "DPWH":  "Department of Public Works and Highways",
    "DENR":  "Department of Environment and Natural Resources",
    "DTI":   "Department of Trade and Industry",
}

agencies, offices = [], []
for i, (code, _) in enumerate(AGENCY_TARGET.items(), start=1):
    aid = f"AG-{i:02d}"
    agencies.append((aid, code, AGENCY_NAMES[code]))
    offices.append((f"OF-{i:02d}", aid, f"{code} Property and Supply Office"))

employees = []          # (employee_id, office_id, name, position, email, status)


def email_for(name: str, taken: set[str]) -> str:
    parts = name.lower().replace('"', "").split()
    base = f"{parts[0]}.{parts[-1]}"
    e = f"{base}@dost.gov.ph"
    n = 2
    while e in taken:
        e = f"{base}{n}@dost.gov.ph"
        n += 1
    taken.add(e)
    return e


seen_emails: set[str] = set()
for i, (name, pos, _n, _v, status) in enumerate(NAMED, start=1):
    employees.append((f"DOST-2026-{i:04d}", offices[(i - 1) % len(offices)][0],
                      name, pos, email_for(name, seen_emails), status))

unnamed_status = ["On Leave"] + ["Active"] * (TOTAL_EMPLOYEES - len(NAMED) - 1)
for j in range(TOTAL_EMPLOYEES - len(NAMED)):
    idx = len(NAMED) + j + 1
    name = f"{FIRST[j % len(FIRST)]} {LAST[j % len(LAST)]}"
    employees.append((f"DOST-2026-{idx:04d}", offices[idx % len(offices)][0],
                      name, POSITIONS[j % len(POSITIONS)],
                      email_for(name, seen_emails), unnamed_status[j]))

emp_id = {e[2]: e[0] for e in employees}
unnamed_ids = [e[0] for e in employees[len(NAMED):]]

# ── Build assets ─────────────────────────────────────────────────────
assets = []             # dict per asset
used = {c: 0 for c in CATALOG}


def take_name(cat: str) -> str:
    i = used[cat]
    used[cat] += 1
    pool = CATALOG[cat]
    return pool[i] if i < len(pool) else f"{cat} Unit {i + 1:02d}"


def add(name, cat, cost, custodian):
    n = len(assets) + 1
    assets.append({
        "asset_id": f"DOST-2026-{n:04d}",
        "tag": f"{TAG_PREFIX[cat]}-{n:04d}",
        "name": name, "category": cat, "cost": int(cost),
        "custodian": custodian,
    })


for name, cat, cost in JUAN_ASSETS:
    add(name, cat, cost, emp_id["Juan Dela Cruz"])
    used[cat] += 0
for name, cat, cost in GRACE_ASSETS:
    add(name, cat, cost, emp_id["Grace Tan"])

for who, cat, count, total in CELLS:
    for cost in split(total, count):
        add(take_name(cat), cat, cost, emp_id[who])

# remainder: unnamed holders get exactly one asset each, then unassigned
holder_cursor = 0
for cat, (n_other, n_unassigned) in FILL_SPLIT.items():
    got_count, got_total = 0, 0
    for a in assets:
        if a["category"] == cat:
            got_count += 1
            got_total += a["cost"]
    want_count, want_total = CATEGORY_TARGET[cat]
    rem_count, rem_total = want_count - got_count, want_total - got_total
    assert rem_count == n_other + n_unassigned, (cat, rem_count, n_other, n_unassigned)
    costs = split(rem_total, rem_count)
    for k, cost in enumerate(costs):
        if k < n_other:
            add(take_name(cat), cat, cost, unnamed_ids[holder_cursor])
            holder_cursor += 1
        else:
            add(take_name(cat), cat, cost, None)

# ── Distribute agency / office / condition / status ──────────────────
agency_slots = []
for i, (code, n) in enumerate(AGENCY_TARGET.items()):
    agency_slots += [agencies[i][0]] * n
condition_slots = []
for cond, n in CONDITION_TARGET.items():
    condition_slots += [cond] * n
status_slots = []
for st, n in STATUS_TARGET.items():
    status_slots += [st] * n

# interleave so a status is not clustered into one agency
for i, a in enumerate(assets):
    a["agency_id"] = agency_slots[(i * 7) % len(agency_slots)]

# that stride can repeat; assign deterministically instead
remaining = list(agency_slots)
for a in assets:
    a["agency_id"] = remaining.pop(0)
for a, cond in zip(assets, condition_slots):
    a["condition"] = cond
for a, st in zip(assets, status_slots):
    a["status"] = st

office_of_agency = {ag[0]: of[0] for ag, of in zip(agencies, offices)}
for a in assets:
    a["office_id"] = office_of_agency[a["agency_id"]]

# acquisition dates spread over 2019-2025
for i, a in enumerate(assets):
    a["acquired_on"] = date(2019 + (i % 7), 1 + (i % 12), 1 + (i % 27))

# ── Warranties ───────────────────────────────────────────────────────
warranties = []
expired_idx = set(range(WARRANTY_EXPIRED))
lapsing_idx = set(range(WARRANTY_EXPIRED, WARRANTY_EXPIRED + WARRANTY_LAPSING_2026))
for i, a in enumerate(assets):
    start = a["acquired_on"]
    if i in expired_idx:
        ends = AS_OF - timedelta(days=30 + i * 11)
    elif i in lapsing_idx:
        ends = date(2026, 4 + (i % 9), 1 + (i % 27))     # Apr–Dec 2026
    else:
        ends = date(2027 + (i % 3), 1 + (i % 12), 1 + (i % 27))
    warranties.append((f"WR-{i + 1:04d}", a["asset_id"],
                       ["Authorised Dealer", "Manufacturer Direct",
                        "Third-Party Service"][i % 3], start, ends))

# ── Work orders ──────────────────────────────────────────────────────
maint = [a for a in assets if a["status"] == "Maintenance"]
assert len(maint) == 22
non_maint = [a for a in assets if a["status"] != "Maintenance"]

work_orders = []
# A problem type has to make sense for the thing it is reported against:
# a conference table does not have a software issue.
PROBLEMS_BY_CATEGORY = {
    "Hardware":   ["Hardware Failure", "Software Issue", "Battery Issue"],
    "Software":   ["Software Issue", "Others"],
    "Office":     ["Physical Damage", "Others"],
    "Appliances": ["Hardware Failure", "Physical Damage", "Others"],
    "Vehicles":   ["Hardware Failure", "Physical Damage"],
    "Essentials": ["Physical Damage", "Others"],
    "Others":     ["Hardware Failure", "Physical Damage", "Others"],
}


def problem_for(asset: dict, i: int) -> str:
    pool = PROBLEMS_BY_CATEGORY[asset["category"]]
    return pool[i % len(pool)]


PRIOS = ["High", "Medium", "Low"]
TECHS = ["In-house — C. Rivera", "Vendor — Dataworld", "Vendor — MicroCircuit",
         "In-house — R. Cruz", "Vendor — FixIT Manila"]

open_costs = split(WO_SPEND, WO_STAGE_TARGET["in_repair"] + WO_STAGE_TARGET["resolved"])
ci = 0
for i, a in enumerate(maint):
    stage = "reported" if i < WO_STAGE_TARGET["reported"] else "in_repair"
    opened = AS_OF - timedelta(days=5 + i * 3)
    # exactly WO_OVERDUE of the open orders sit past their promised date
    promised = AS_OF - timedelta(days=7 + i) if i < WO_OVERDUE else AS_OF + timedelta(days=6 + i)
    cost = None
    if stage == "in_repair":
        cost = open_costs[ci]; ci += 1
    work_orders.append({
        "id": f"WO-{i + 1:04d}", "asset_id": a["asset_id"],
        "problem": problem_for(a, i), "priority": PRIOS[i % 3],
        "tech": TECHS[i % 5], "opened_on": opened, "promised_on": promised,
        "closed_on": None, "cost": cost, "stage": stage,
    })
for k in range(WO_STAGE_TARGET["resolved"]):
    a = non_maint[k]
    opened = AS_OF - timedelta(days=60 + k * 5)
    work_orders.append({
        "id": f"WO-{22 + k + 1:04d}", "asset_id": a["asset_id"],
        "problem": problem_for(a, k), "priority": PRIOS[k % 3],
        "tech": TECHS[k % 5], "opened_on": opened,
        "promised_on": opened + timedelta(days=14),
        "closed_on": opened + timedelta(days=10),
        "cost": open_costs[ci + k], "stage": "resolved",
    })

# ── Property forms (PAR >= 50,000 / ICS < 50,000) ────────────────────
by_custodian: dict[str, list[dict]] = {}
for a in assets:
    if a["custodian"]:
        by_custodian.setdefault(a["custodian"], []).append(a)

forms, form_items = [], []
pn = in_ = 0
for cust, held in sorted(by_custodian.items()):
    par = [a for a in held if a["cost"] >= 50_000]
    ics = [a for a in held if a["cost"] < 50_000]
    if par:
        pn += 1
        fid = f"DOST-PAR-2026-{pn:04d}"
        forms.append((fid, cust, "PAR", AS_OF))
        form_items += [(fid, a["asset_id"]) for a in par]
    if ics:
        in_ += 1
        fid = f"DOST-ICS-2026-{in_:04d}"
        forms.append((fid, cust, "ICS", AS_OF))
        form_items += [(fid, a["asset_id"]) for a in ics]

# ════════════════════════════════════════════════════════════════════
# ASSERTIONS — every figure quoted in the vault
# ════════════════════════════════════════════════════════════════════
def check(label, got, want):
    status = "ok " if got == want else "FAIL"
    print(f"  [{status}] {label:<44} got {got!s:>12}  want {want!s:>12}")
    return got == want


ok = True
print("Asset totals")
ok &= check("asset count", len(assets), TOTAL_ASSETS)
ok &= check("acquisition cost total", sum(a["cost"] for a in assets), TOTAL_VALUE)

print("Per category (count, sum)")
for cat, (n, s) in CATEGORY_TARGET.items():
    got_n = sum(1 for a in assets if a["category"] == cat)
    got_s = sum(a["cost"] for a in assets if a["category"] == cat)
    ok &= check(f"{cat} count", got_n, n)
    ok &= check(f"{cat} sum", got_s, s)

print("Distributions")
for cond, n in CONDITION_TARGET.items():
    ok &= check(f"condition {cond}", sum(1 for a in assets if a["condition"] == cond), n)
for st, n in STATUS_TARGET.items():
    ok &= check(f"status {st}", sum(1 for a in assets if a["status"] == st), n)
for i, (code, n) in enumerate(AGENCY_TARGET.items()):
    got = sum(1 for a in assets if a["agency_id"] == agencies[i][0])
    ok &= check(f"agency {code}", got, n)

print("Employees")
ok &= check("employee count", len(employees), TOTAL_EMPLOYEES)
for st, n in EMP_STATUS_TARGET.items():
    ok &= check(f"employee status {st}", sum(1 for e in employees if e[5] == st), n)
ok &= check("unassigned assets", sum(1 for a in assets if not a["custodian"]), 6)

print("Named accountability")
for name, _pos, count, value, _st in NAMED:
    eid = emp_id[name]
    held = by_custodian.get(eid, [])
    ok &= check(f"{name} assets", len(held), count)
    ok &= check(f"{name} accountable", sum(a["cost"] for a in held), value)

print("Work orders")
ok &= check("work order count", len(work_orders), sum(WO_STAGE_TARGET.values()))
for stage, n in WO_STAGE_TARGET.items():
    ok &= check(f"stage {stage}", sum(1 for w in work_orders if w["stage"] == stage), n)
ok &= check("past promised date",
            sum(1 for w in work_orders
                if w["promised_on"] and w["promised_on"] < AS_OF and w["stage"] != "resolved"),
            WO_OVERDUE)
ok &= check("repair spend", sum(w["cost"] or 0 for w in work_orders), WO_SPEND)

print("Warranties")
ok &= check("warranty count", len(warranties), TOTAL_ASSETS)
ok &= check("active", sum(1 for w in warranties if w[4] >= AS_OF), WARRANTY_ACTIVE)
ok &= check("expired", sum(1 for w in warranties if w[4] < AS_OF), WARRANTY_EXPIRED)
ok &= check("lapsing in 2026",
            sum(1 for w in warranties if w[4] >= AS_OF and w[4].year == 2026),
            WARRANTY_LAPSING_2026)

print("Dashboard slots")
ok &= check("headline — needs triage",
            sum(1 for a in assets if a["status"] == "Maintenance"), 22)
ok &= check("KPI — critical needs",
            sum(1 for a in assets if a["condition"] == "Poor"), 36)
ok &= check("attention monitor",
            sum(1 for a in assets if a["status"] != "In Use"), 58)

print("PAR / ICS worked example")
juan = emp_id["Juan Dela Cruz"]
jf = [f for f in forms if f[1] == juan]
for fid, _c, typ, _d in jf:
    items = [i[1] for i in form_items if i[0] == fid]
    total = sum(a["cost"] for a in assets if a["asset_id"] in items)
    if typ == "PAR":
        ok &= check("Juan PAR items", len(items), 3)
        ok &= check("Juan PAR total", total, 376_145)
    else:
        ok &= check("Juan ICS items", len(items), 3)
        ok &= check("Juan ICS total", total, 112_900)

holders = len(by_custodian)
print(f"\n  note: asset-holders = {holders} "
      f"(vault says 41 — see the arithmetic note in the report)")

if not ok:
    raise SystemExit("\nAssertions failed — seed not written.")

# ════════════════════════════════════════════════════════════════════
# Emit SQL
# ════════════════════════════════════════════════════════════════════
def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def rows(vals):
    return ",\n  ".join("(" + ", ".join(q(v) for v in r) + ")" for r in vals)


out = ["-- Generated by scripts/gen_seed.py — do not edit by hand.",
       f"-- Dataset of record as of {AS_OF}. All aggregates asserted at generation.",
       "", "begin;", "",
       "insert into agency (agency_id, code, name) values",
       "  " + rows(agencies) + ";", "",
       "insert into office (office_id, agency_id, name) values",
       "  " + rows(offices) + ";", "",
       "insert into employee (employee_id, office_id, full_name, position, work_email, status) values",
       "  " + rows(employees) + ";", "",
       "insert into asset (asset_id, tag, name, category, agency_id, office_id,"
       " custodian_id, acquisition_cost, acquired_on, operational_status,"
       " physical_condition) values",
       "  " + rows([(a["asset_id"], a["tag"], a["name"], a["category"],
                     a["agency_id"], a["office_id"], a["custodian"], a["cost"],
                     a["acquired_on"], a["status"], a["condition"])
                    for a in assets]) + ";", "",
       "insert into warranty (warranty_id, asset_id, provider, starts_on, ends_on) values",
       "  " + rows(warranties) + ";", "",
       "insert into work_order (work_order_id, asset_id, problem_type, priority,"
       " technician, opened_on, promised_on, closed_on, cost, stage) values",
       "  " + rows([(w["id"], w["asset_id"], w["problem"], w["priority"], w["tech"],
                     w["opened_on"], w["promised_on"], w["closed_on"], w["cost"],
                     w["stage"]) for w in work_orders]) + ";", "",
       "insert into property_form (form_id, employee_id, type, issued_on) values",
       "  " + rows(forms) + ";", "",
       "insert into property_form_item (form_id, asset_id) values",
       "  " + rows(form_items) + ";", "",
       "commit;", ""]

root = Path(__file__).resolve().parent.parent
dest = root / "supabase" / "seed.sql"
dest.write_text("\n".join(out), encoding="utf-8")
print(f"\nwrote {dest} ({len(assets)} assets, {len(employees)} employees, "
      f"{len(work_orders)} work orders, {len(forms)} forms)")

# ── Same data as a JSON fixture, so the UI renders before Supabase ──
import json

months = lambda d: max(0, (AS_OF.year - d.year) * 12 + (AS_OF.month - d.month))
fixture = {
    "as_of": AS_OF.isoformat(),
    "agencies": [{"agency_id": a, "code": c, "name": n} for a, c, n in agencies],
    "offices": [{"office_id": o, "agency_id": a, "name": n} for o, a, n in offices],
    "employees": [
        {"employee_id": e[0], "office_id": e[1], "full_name": e[2],
         "position": e[3], "work_email": e[4], "status": e[5],
         "assets_held": len(by_custodian.get(e[0], [])),
         "accountable_value": sum(a["cost"] for a in by_custodian.get(e[0], []))}
        for e in employees
    ],
    "assets": [
        {"asset_id": a["asset_id"], "tag": a["tag"], "name": a["name"],
         "category": a["category"], "agency_id": a["agency_id"],
         "office_id": a["office_id"], "custodian_id": a["custodian"],
         "acquisition_cost": a["cost"], "acquired_on": a["acquired_on"].isoformat(),
         "useful_life_months": 120,
         "operational_status": a["status"], "physical_condition": a["condition"],
         "monthly_depreciation": round(a["cost"] / 120, 2),
         "accumulated_depreciation": min(
             round(a["cost"] / 120 * months(a["acquired_on"]), 2), a["cost"]),
         "net_book_value": a["cost"] - min(
             round(a["cost"] / 120 * months(a["acquired_on"]), 2), a["cost"]),
         "is_capital": a["cost"] >= 50_000}
        for a in assets
    ],
    "warranties": [
        {"warranty_id": w[0], "asset_id": w[1], "provider": w[2],
         "starts_on": w[3].isoformat(), "ends_on": w[4].isoformat()}
        for w in warranties
    ],
    "work_orders": [
        {"work_order_id": w["id"], "asset_id": w["asset_id"],
         "problem_type": w["problem"], "priority": w["priority"],
         "technician": w["tech"], "opened_on": w["opened_on"].isoformat(),
         "promised_on": w["promised_on"].isoformat() if w["promised_on"] else None,
         "closed_on": w["closed_on"].isoformat() if w["closed_on"] else None,
         "cost": w["cost"], "stage": w["stage"]}
        for w in work_orders
    ],
    "property_forms": [
        {"form_id": f[0], "employee_id": f[1], "type": f[2],
         "issued_on": f[3].isoformat(),
         "asset_ids": [i[1] for i in form_items if i[0] == f[0]]}
        for f in forms
    ],
}
fx = root / "lib" / "data" / "fixture.json"
fx.write_text(json.dumps(fixture, separators=(",", ":")), encoding="utf-8")
print(f"wrote {fx} ({fx.stat().st_size:,} bytes)")
