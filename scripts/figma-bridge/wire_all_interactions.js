/**
 * Comprehensive Prototype Wire-up Script for AriArian Final Prototype
 * Runs directly through the bridge into Figma!
 */

const page = figma.root.children.find(p => p.name === "Final Prototype");
if (!page) throw new Error("Could not find 'Final Prototype' page");

// Index all frames by exact name
const frames = new Map();
for (const child of page.children) {
  frames.set(child.name, child);
}

console.log(`Found ${frames.size} frames on 'Final Prototype' page.`);

// Helper to set reaction with custom bezier
function setReaction(node, destinationNode, transitionType = "DISSOLVE", duration = 0.2) {
  if (!node || !destinationNode) return false;

  let transition = null;
  if (transitionType === "SMART_ANIMATE") {
    transition = {
      type: "SMART_ANIMATE",
      easing: { type: "CUSTOM_CUBIC_BEZIER", x1: 0.32, y1: 0.72, x2: 0, y2: 1 },
      duration: duration
    };
  } else if (transitionType === "MOVE_IN_RIGHT") {
    transition = {
      type: "MOVE_IN",
      direction: "LEFT",
      easing: { type: "EASE_OUT" },
      duration: duration
    };
  } else if (transitionType === "MOVE_OUT_RIGHT") {
    transition = {
      type: "MOVE_OUT",
      direction: "RIGHT",
      easing: { type: "EASE_OUT" },
      duration: duration
    };
  } else {
    transition = {
      type: "DISSOLVE",
      easing: { type: "EASE_OUT" },
      duration: duration
    };
  }

  try {
    node.reactions = [
      {
        trigger: { type: "ON_CLICK" },
        actions: [
          {
            type: "NODE",
            destinationId: destinationNode.id,
            navigation: "NAVIGATE",
            transition: transition
          }
        ]
      }
    ];
    return true;
  } catch (e) {
    console.warn(`Could not set reaction on ${node.name}:`, e.message);
    return false;
  }
}

let wiredCount = 0;

// 1. GLOBAL SIDEBAR WIRE-UP
const dashboard = frames.get("01 — Dashboard");
const registryList = frames.get("02 — Asset Registry · List");
const employeesActive = frames.get("Employees · Active");
const maintBoard = frames.get("Maintenance · Kanban Board");
const maintList = frames.get("Maintenance · List View");
const auditLog = frames.get("03 — Equipment Audit Log");
const finReports = frames.get("Financial Reports");
const notifsDrawer = frames.get("Notifications Drawer");
const settingsProfile = frames.get("Settings · Profile");

const desktopHubs = [
  dashboard, registryList, employeesActive, maintBoard, maintList, auditLog, finReports,
  frames.get("Drilldown — Agency Split"),
  frames.get("Drilldown — Asset Health Status"),
  frames.get("Drilldown — Attention Monitor"),
  frames.get("Drilldown — Warranty Coverage"),
  frames.get("Employees · On Leave"),
  frames.get("Employees · Clearance"),
  frames.get("Employees · All")
].filter(Boolean);

for (const hub of desktopHubs) {
  // Find all nav instances and frames in sidebar
  const items = hub.findAll(n => n.name === "Dashboard" || n.name === "Asset Inventory" || n.name === "Employees" || n.name === "Maintenance" || n.name === "Audit Log" || n.name === "Financial Reports" || n.name === "Notifications" || n.name === "Settings");
  
  for (const item of items) {
    const name = item.name.toLowerCase();
    if (name === "dashboard" && dashboard && hub !== dashboard) {
      if (setReaction(item, dashboard)) wiredCount++;
    } else if (name === "asset inventory" && registryList && hub !== registryList) {
      if (setReaction(item, registryList)) wiredCount++;
    } else if (name === "employees" && employeesActive && hub !== employeesActive) {
      if (setReaction(item, employeesActive)) wiredCount++;
    } else if (name === "maintenance" && maintBoard && hub !== maintBoard && hub !== maintList) {
      if (setReaction(item, maintBoard)) wiredCount++;
    } else if (name === "audit log" && auditLog && hub !== auditLog) {
      if (setReaction(item, auditLog)) wiredCount++;
    } else if (name === "financial reports" && finReports && hub !== finReports) {
      if (setReaction(item, finReports)) wiredCount++;
    } else if (name === "notifications" && notifsDrawer) {
      if (setReaction(item, notifsDrawer)) wiredCount++;
    } else if (name === "settings" && settingsProfile) {
      if (setReaction(item, settingsProfile)) wiredCount++;
    }
  }
}

// 2. DASHBOARD ANALYTICAL DRILLDOWNS
if (dashboard) {
  const splitDrill = frames.get("Drilldown — Agency Split");
  const healthDrill = frames.get("Drilldown — Asset Health Status");
  const attentionDrill = frames.get("Drilldown — Attention Monitor");
  const warrantyDrill = frames.get("Drilldown — Warranty Coverage");

  // Agency Split card
  const agencyCards = dashboard.findAll(n => n.name.includes("Agency Inventory Split") || n.name.includes("Inventory Split") || n.name.includes("DOT") || (n.name.includes("4-Tiles Card") && n.x === 0 && n.y === 0));
  for (const c of agencyCards) {
    if (splitDrill && setReaction(c, splitDrill, "SMART_ANIMATE", 0.24)) wiredCount++;
  }

  // Health Status card
  const healthCards = dashboard.findAll(n => n.name.includes("Asset Health Status") || n.name.includes("Donut") || (n.name.includes("4-Tiles Card") && n.x > 500 && n.y === 0));
  for (const c of healthCards) {
    if (healthDrill && setReaction(c, healthDrill, "SMART_ANIMATE", 0.24)) wiredCount++;
  }

  // Attention Monitor card
  const attentionCards = dashboard.findAll(n => n.name.includes("Attention Monitor") || (n.name.includes("4-Tiles Card") && n.x === 0 && n.y > 350));
  for (const c of attentionCards) {
    if (attentionDrill && setReaction(c, attentionDrill, "SMART_ANIMATE", 0.24)) wiredCount++;
  }

  // Attention monitor "View maintenance queue →" link
  const maintLink = dashboard.findOne(n => n.name.includes("View maintenance queue") || (n.characters && n.characters.includes("View maintenance queue")));
  if (maintLink && maintBoard) {
    if (setReaction(maintLink, maintBoard, "DISSOLVE", 0.2)) wiredCount++;
  }

  // Warranty Coverage card
  const warrantyCards = dashboard.findAll(n => n.name.includes("Warranty") || (n.name.includes("4-Tiles Card") && n.x > 500 && n.y > 350));
  for (const c of warrantyCards) {
    if (warrantyDrill && setReaction(c, warrantyDrill, "SMART_ANIMATE", 0.24)) wiredCount++;
  }

  // KPI Needs Triage -> Maintenance
  const triageKPI = dashboard.findOne(n => n.name.includes("Needs Triage"));
  if (triageKPI && maintBoard) {
    if (setReaction(triageKPI, maintBoard, "DISSOLVE", 0.2)) wiredCount++;
  }
}

// Drilldowns back buttons
const drilldowns = [
  frames.get("Drilldown — Agency Split"),
  frames.get("Drilldown — Asset Health Status"),
  frames.get("Drilldown — Attention Monitor"),
  frames.get("Drilldown — Warranty Coverage")
].filter(Boolean);

for (const drill of drilldowns) {
  const backTargets = drill.findAll(n => n.name.toLowerCase().includes("back") || n.name.toLowerCase().includes("arrow") || n.name.toLowerCase().includes("breadcrumb") || (n.characters && n.characters.includes("Dashboard")));
  for (const bt of backTargets) {
    if (dashboard && setReaction(bt, dashboard, "SMART_ANIMATE", 0.24)) wiredCount++;
  }
}

// 3. ASSET REGISTRY -> DRAWER -> MODAL FLOW
const registryDrawer = frames.get("02 — Asset Registry · Split View (Drawer Open)");
const assetRecordModal = frames.get("04 — Asset Record · Read-Only Modal");
const addAssetModal = frames.get("Asset Record · Add");
const transferModal = frames.get("Transfer Asset · Modal");
const transferConfirm = frames.get("Transfer Asset · Recorded Confirmation");

if (registryList && registryDrawer) {
  // Table rows in registry list open split drawer
  const rows = registryList.findAll(n => n.name.toLowerCase().includes("asset row"));
  for (const row of rows) {
    if (setReaction(row, registryDrawer, "MOVE_IN_RIGHT", 0.24)) wiredCount++;
  }

  // "+ Add Asset" button opens Add Asset Modal
  const addBtn = registryList.findOne(n => n.name.includes("Action") && n.x > 900);
  if (addBtn && addAssetModal) {
    if (setReaction(addBtn, addAssetModal, "DISSOLVE", 0.2)) wiredCount++;
  }

  // Close drawer returns to list
  const closeDrawer = registryDrawer.findOne(n => n.name.toLowerCase().includes("close hint") || (n.name.toLowerCase().includes("close") && n.parent && n.parent.name.toLowerCase().includes("panel")));
  if (closeDrawer) {
    if (setReaction(closeDrawer, registryList, "MOVE_OUT_RIGHT", 0.2)) wiredCount++;
  }

  // "View full record" button in drawer opens modal
  const viewFullBtns = registryDrawer.findAll(n => n.name.toLowerCase().includes("view full record") || n.name.toLowerCase().includes("full record"));
  for (const vfb of viewFullBtns) {
    if (assetRecordModal && setReaction(vfb, assetRecordModal, "DISSOLVE", 0.2)) wiredCount++;
  }
}

if (assetRecordModal && registryDrawer) {
  // Close modal returns to drawer
  const closeRecords = assetRecordModal.findAll(n => n.name.toLowerCase().includes("close record") || n.name.toLowerCase().includes("backdrop") || n.name === "X");
  for (const cr of closeRecords) {
    if (setReaction(cr, registryDrawer, "DISSOLVE", 0.2)) wiredCount++;
  }
}

if (addAssetModal && registryList) {
  const cancelBtns = addAssetModal.findAll(n => n.name.toLowerCase().includes("cancel") || n.name.toLowerCase().includes("close"));
  for (const cb of cancelBtns) {
    if (setReaction(cb, registryList, "DISSOLVE", 0.2)) wiredCount++;
  }
}

// 4. EMPLOYEE DIRECTORY TABS & DRAWER
const empOnLeave = frames.get("Employees · On Leave");
const empClearance = frames.get("Employees · Clearance");
const empAll = frames.get("Employees · All");
const empDrawer = frames.get("Employee Detail Drawer");

const empScreens = [employeesActive, empOnLeave, empClearance, empAll].filter(Boolean);

for (const es of empScreens) {
  const tabActive = es.findOne(n => n.name.includes("Active") && n.parent && n.parent.name.includes("Tab"));
  const tabLeave = es.findOne(n => n.name.includes("Leave") && n.parent && n.parent.name.includes("Tab"));
  const tabClear = es.findOne(n => n.name.includes("Clearance") && n.parent && n.parent.name.includes("Tab"));
  const tabAll = es.findOne(n => n.name.includes("All") && n.parent && n.parent.name.includes("Tab"));

  if (tabActive && employeesActive && es !== employeesActive) {
    if (setReaction(tabActive, employeesActive, "DISSOLVE", 0.15)) wiredCount++;
  }
  if (tabLeave && empOnLeave && es !== empOnLeave) {
    if (setReaction(tabLeave, empOnLeave, "DISSOLVE", 0.15)) wiredCount++;
  }
  if (tabClear && empClearance && es !== empClearance) {
    if (setReaction(tabClear, empClearance, "DISSOLVE", 0.15)) wiredCount++;
  }
  if (tabAll && empAll && es !== empAll) {
    if (setReaction(tabAll, empAll, "DISSOLVE", 0.15)) wiredCount++;
  }

  // Clicking an employee row opens employee detail drawer
  const empRows = es.findAll(n => n.name.toLowerCase().includes("row") && n.name.toLowerCase().includes("employee"));
  for (const er of empRows) {
    if (empDrawer && setReaction(er, empDrawer, "MOVE_IN_RIGHT", 0.24)) wiredCount++;
  }
}

if (empDrawer && employeesActive) {
  const closeEmp = empDrawer.findOne(n => n.name.toLowerCase().includes("close"));
  if (closeEmp) {
    if (setReaction(closeEmp, employeesActive, "MOVE_OUT_RIGHT", 0.2)) wiredCount++;
  }
}

// 5. MAINTENANCE BOARD ↔ LIST & CONCURRENCY CONFLICT ENGINE
const resolveModal = frames.get("05 — Resolve Issue Modal");
const conflictModal = frames.get("06 — Save Conflict Modal");

if (maintBoard && maintList) {
  // Toggle to List
  const toList = maintBoard.findAll(n => n.name.toLowerCase().includes("list") || (n.characters && n.characters.includes("List")));
  for (const tl of toList) {
    if (setReaction(tl, maintList, "DISSOLVE", 0.15)) wiredCount++;
  }

  // Toggle to Board
  const toBoard = maintList.findAll(n => n.name.toLowerCase().includes("board") || (n.characters && n.characters.includes("Board")));
  for (const tb of toBoard) {
    if (setReaction(tb, maintBoard, "DISSOLVE", 0.15)) wiredCount++;
  }
}

if (maintBoard && resolveModal) {
  // Clicking Canon iR 2630 or any work order card opens Resolve Issue Modal
  const workCards = maintBoard.findAll(n => n.name.toLowerCase().includes("card") || n.name.toLowerCase().includes("issue") || n.name.toLowerCase().includes("canon") || n.name.toLowerCase().includes("order"));
  for (const wc of workCards) {
    if (setReaction(wc, resolveModal, "DISSOLVE", 0.2)) wiredCount++;
  }
}

if (resolveModal && conflictModal && maintBoard) {
  // Confirm resolution button triggers 06 Save Conflict Modal (demo story!)
  const confirmBtn = resolveModal.findOne(n => n.name.toLowerCase().includes("action") && n.x > 700);
  if (confirmBtn) {
    if (setReaction(confirmBtn, conflictModal, "DISSOLVE", 0.2)) wiredCount++;
  }

  // Cancel in resolve modal returns to board
  const cancelBtn = resolveModal.findOne(n => (n.name.toLowerCase().includes("action") && n.x < 700) || n.name.toLowerCase().includes("close"));
  if (cancelBtn) {
    if (setReaction(cancelBtn, maintBoard, "DISSOLVE", 0.2)) wiredCount++;
  }

  // Safe recovery / Reload on conflict modal resolves back to board
  const reloadBtn = conflictModal.findOne(n => n.name.toLowerCase().includes("safe recovery") || (n.name.toLowerCase().includes("action") && n.y < 250));
  if (reloadBtn) {
    if (setReaction(reloadBtn, maintBoard, "DISSOLVE", 0.2)) wiredCount++;
  }

  // Discard / Close returns to board
  const discardBtn = conflictModal.findOne(n => n.name.toLowerCase().includes("discard") || n.name.toLowerCase().includes("close"));
  if (discardBtn) {
    if (setReaction(discardBtn, maintBoard, "DISSOLVE", 0.2)) wiredCount++;
  }
}

// 6. MOBILE ANNUAL PHYSICAL COUNT (INDEPENDENT PROTOTYPE FLOW)
const mobileScan = frames.get("07 — Physical Count · Scan (Mobile)");
const mobileConfirm = frames.get("07 — Physical Count · Confirm (Mobile)");
const mobileComplete = frames.get("07 — Physical Count · Complete (Mobile)");

if (mobileScan && mobileConfirm) {
  // Tap viewfinder or scan action advances to Confirm
  const targets = mobileScan.findAll(n => n.name.toLowerCase().includes("viewfinder") || n.name.toLowerCase().includes("target") || n.name.toLowerCase().includes("scan") || n.name.toLowerCase().includes("action"));
  for (const t of targets) {
    if (setReaction(t, mobileConfirm, "MOVE_IN_RIGHT", 0.24)) wiredCount++;
  }
}

if (mobileConfirm && mobileComplete) {
  // Tap "Confirm & Next Asset" advances to Complete
  const nextBtns = mobileConfirm.findAll(n => n.name.toLowerCase().includes("action") || n.name.toLowerCase().includes("confirm"));
  for (const nb of nextBtns) {
    if (setReaction(nb, mobileComplete, "MOVE_IN_RIGHT", 0.24)) wiredCount++;
  }

  // Back button returns to Scan
  const backScan = mobileConfirm.findOne(n => n.name.toLowerCase().includes("back"));
  if (backScan && mobileScan) {
    if (setReaction(backScan, mobileScan, "MOVE_OUT_RIGHT", 0.2)) wiredCount++;
  }
}

if (mobileComplete && mobileScan) {
  // Tap submit returns to scan
  const submitBtns = mobileComplete.findAll(n => n.name.toLowerCase().includes("action") || n.name.toLowerCase().includes("submit"));
  for (const sb of submitBtns) {
    if (setReaction(sb, mobileScan, "DISSOLVE", 0.2)) wiredCount++;
  }
}

// 7. SETTINGS & OVERLAYS
if (settingsProfile) {
  const settingsGen = frames.get("Settings · General");
  const settingsNotifs = frames.get("Settings · Notifications");

  const tabGen = settingsProfile.findOne(n => n.name.includes("General"));
  if (tabGen && settingsGen) setReaction(tabGen, settingsGen, "DISSOLVE", 0.15);

  const tabNotifs = settingsProfile.findOne(n => n.name.includes("Notifications"));
  if (tabNotifs && settingsNotifs) setReaction(tabNotifs, settingsNotifs, "DISSOLVE", 0.15);

  const closeSettings = settingsProfile.findOne(n => n.name.toLowerCase().includes("close"));
  if (closeSettings && dashboard) setReaction(closeSettings, dashboard, "DISSOLVE", 0.2);
}

if (notifsDrawer && dashboard) {
  const closeNotifs = notifsDrawer.findOne(n => n.name.toLowerCase().includes("close"));
  if (closeNotifs) setReaction(closeNotifs, dashboard, "MOVE_OUT_RIGHT", 0.2);
}

figma.notify(`🎉 Successfully wired ${wiredCount} interactions on Final Prototype!`, { timeout: 4000 });
return { success: true, wiredInteractions: wiredCount };
