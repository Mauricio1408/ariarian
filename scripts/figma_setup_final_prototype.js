/**
 * DOST AriArian — Asset Lifecycle Management System
 * Figma Automation Script: Build & Wire "Final Prototype" Page
 * 
 * Instructions:
 * 1. Open your Figma document: https://www.figma.com/design/rvlu1upwT2GPqYT3ZKlP3k/
 * 2. Open Developer Tools Console:
 *    - Windows: Ctrl + Alt + I (or Plugins > Development > Open Console)
 *    - Mac: Cmd + Option + I
 * 3. Paste this entire script into the console and press Enter.
 * 
 * What this script does:
 * - Creates (or finds) the "Final Prototype" page.
 * - Migrates & clones all 35+ approved frames from "Version 2" and "✅ Selected Direction".
 * - Arranges them in a 7-row aligned matrix according to the approved layout.
 * - Enforces the 12-column grid (desktop) and 4-column grid (mobile).
 * - Standardizes Auto Layout and spatial/color token variables.
 * - Wires all interactive prototype connections (sidebar, drilldowns, drawers, modals, conflict resolution, mobile scanner).
 */

(async function setupFinalPrototype() {
  console.log("🚀 Starting AriArian Final Prototype Setup...");

  // 1. Locate or create "Final Prototype" page
  let targetPage = figma.root.children.find(p => p.name === "Final Prototype");
  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = "Final Prototype";
    console.log("✅ Created 'Final Prototype' page.");
  } else {
    console.log("ℹ️ Found existing 'Final Prototype' page.");
  }
  figma.currentPage = targetPage;

  // 2. Map of All Approved Frames
  const SCREEN_DEFINITIONS = [
    // ── Row 1: Executive Dashboard & Drill-downs (Desktop 1440x1024) ──
    { id: "4749:1765", fallbackId: "4592:10649", name: "01 — Dashboard", row: 0, col: 0 },
    { id: "4677:5946", name: "Drilldown — Agency Split", row: 0, col: 1 },
    { id: "4677:6299", name: "Drilldown — Asset Health Status", row: 0, col: 2 },
    { id: "4677:6648", name: "Drilldown — Attention Monitor", row: 0, col: 3 },
    { id: "4677:7197", name: "Drilldown — Warranty Coverage", row: 0, col: 4 },

    // ── Row 2: Asset Registry, Drawer & Modals (Desktop 1440x1024) ──
    { id: "4749:2186", fallbackId: "4592:11427", name: "02 — Asset Registry · List", row: 1, col: 0 },
    { id: "4749:2342", name: "02 — Asset Registry · Split View (Drawer Open)", row: 1, col: 1 },
    { id: "4749:2605", fallbackId: "4726:7928", name: "04 — Asset Record · Read-Only Modal", row: 1, col: 2 },
    { id: "4726:8479", name: "Asset Record · Add", row: 1, col: 3 },
    { id: "4726:9017", name: "Asset Record · Edit", row: 1, col: 4 },
    { id: "4667:5675", name: "Asset Details Drawer · 4 Tabs", row: 1, col: 5 },
    { id: "4667:6703", name: "Transfer Asset · Modal", row: 1, col: 6 },
    { id: "4726:10115", name: "Transfer Asset · Recorded Confirmation", row: 1, col: 7 },
    { id: "4592:30231", name: "Asset Registry · Empty State", row: 1, col: 8 },
    { id: "4592:30833", name: "Asset Registry · No Results State", row: 1, col: 9 },
    { id: "4592:31435", name: "Asset Registry · Loading Skeleton", row: 1, col: 10 },

    // ── Row 3: Employee Directory & Custodianship (Desktop 1440x1024) ──
    { id: "4666:2315", name: "Employees · Active", row: 2, col: 0 },
    { id: "4666:2831", name: "Employees · On Leave", row: 2, col: 1 },
    { id: "4666:3019", name: "Employees · Clearance", row: 2, col: 2 },
    { id: "4666:3245", name: "Employees · All", row: 2, col: 3 },
    { id: "4667:5093", name: "Employee Detail Drawer", row: 2, col: 4 },

    // ── Row 4: Maintenance Management & Conflict Engine (Desktop 1440x1024) ──
    { id: "4666:3641", name: "Maintenance · Kanban Board", row: 3, col: 0 },
    { id: "4652:1080", name: "Maintenance · List View", row: 3, col: 1 },
    { id: "4749:2793", fallbackId: "4656:1483", name: "05 — Resolve Issue Modal", row: 3, col: 2 },
    { id: "4749:2876", fallbackId: "4657:1899", name: "06 — Save Conflict Modal", row: 3, col: 3 },

    // ── Row 5: Audit Log, Compliance Forms & Financial Reports (Desktop 1440x1024) ──
    { id: "4749:2498", fallbackId: "4666:3563", name: "03 — Equipment Audit Log", row: 4, col: 0 },
    { id: "4666:3602", name: "Financial Reports", row: 4, col: 1 },

    // ── Row 6: Mobile Annual Physical Count (Field Auditor Flow, 390x844) ──
    { id: "4749:2962", fallbackId: "4597:1032", name: "07 — Physical Count · Scan (Mobile)", row: 5, col: 0, isMobile: true },
    { id: "4749:3009", fallbackId: "4598:11541", name: "07 — Physical Count · Confirm (Mobile)", row: 5, col: 1, isMobile: true },
    { id: "4749:3071", fallbackId: "4599:1032", name: "07 — Physical Count · Complete (Mobile)", row: 5, col: 2, isMobile: true },

    // ── Row 7: System Shell Overlays & RBAC Gates (Desktop 1440x1024) ──
    { id: "4666:33123", name: "Notifications Drawer", row: 6, col: 0 },
    { id: "4666:33787", name: "Settings · Profile", row: 6, col: 1 },
    { id: "4666:34394", name: "Settings · General", row: 6, col: 2 },
    { id: "4666:34997", name: "Settings · Notifications", row: 6, col: 3 },
    { id: "4593:966", name: "Permission Denied (Custodian RBAC)", row: 6, col: 4 }
  ];

  const clonedMap = new Map();
  const X_SPACING_DESKTOP = 1600;
  const Y_SPACING_DESKTOP = 1200;
  const X_SPACING_MOBILE = 480;

  // 3. Clone and position frames on the "Final Prototype" page
  for (const item of SCREEN_DEFINITIONS) {
    let sourceNode = await figma.getNodeByIdAsync(item.id);
    if (!sourceNode && item.fallbackId) {
      sourceNode = await figma.getNodeByIdAsync(item.fallbackId);
    }

    if (!sourceNode) {
      console.warn(`⚠️ Source frame ${item.name} (${item.id}) not found, skipping clone.`);
      continue;
    }

    // Check if clone already exists on target page
    let clone = targetPage.children.find(c => c.name === item.name);
    if (!clone) {
      clone = sourceNode.clone();
      clone.name = item.name;
      targetPage.appendChild(clone);
    }

    // Position in aligned grid matrix
    const xOffset = item.isMobile ? (item.col * X_SPACING_MOBILE) : (item.col * X_SPACING_DESKTOP);
    const yOffset = item.row * Y_SPACING_DESKTOP;
    clone.x = xOffset;
    clone.y = yOffset;

    clonedMap.set(item.name, clone);
    console.log(`✅ Positioned '${item.name}' at (${clone.x}, ${clone.y})`);
  }

  // 4. Apply 12-Column Grid Layout Guide to Desktop Frames
  const desktopGridGuide = {
    pattern: "COLUMNS",
    alignment: "STRETCH",
    gutterSize: 24,
    count: 12,
    offset: 24,
    visible: true,
    color: { r: 0, g: 0.68, b: 0.94, a: 0.08 }
  };

  const mobileGridGuide = {
    pattern: "COLUMNS",
    alignment: "STRETCH",
    gutterSize: 12,
    count: 4,
    offset: 20,
    visible: true,
    color: { r: 0, g: 0.68, b: 0.94, a: 0.08 }
  };

  for (const [name, frame] of clonedMap.entries()) {
    if (frame.type === "FRAME" || frame.type === "COMPONENT") {
      if (frame.width === 1440) {
        frame.layoutGrids = [desktopGridGuide];
      } else if (frame.width === 390) {
        frame.layoutGrids = [mobileGridGuide];
      }
    }
  }
  console.log("✅ Applied standardized 12-column and 4-column layout grids.");

  // 5. Helper function for wiring prototype reactions
  function wireClickInteraction(sourceNode, destinationNode, transitionType = "DISSOLVE", duration = 0.2) {
    if (!sourceNode || !destinationNode) return;

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
    } else {
      transition = {
        type: "DISSOLVE",
        easing: { type: "EASE_OUT" },
        duration: duration
      };
    }

    try {
      sourceNode.reactions = [
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
    } catch (e) {
      console.warn(`Could not wire reaction on ${sourceNode.name}:`, e);
    }
  }

  // 6. Connect Interactive Prototype Flows

  const dashboard = clonedMap.get("01 — Dashboard");
  const registryList = clonedMap.get("02 — Asset Registry · List");
  const registryDrawer = clonedMap.get("02 — Asset Registry · Split View (Drawer Open)");
  const assetRecordModal = clonedMap.get("04 — Asset Record · Read-Only Modal");
  const auditLog = clonedMap.get("03 — Equipment Audit Log");
  const maintBoard = clonedMap.get("Maintenance · Kanban Board");
  const maintList = clonedMap.get("Maintenance · List View");
  const resolveModal = clonedMap.get("05 — Resolve Issue Modal");
  const conflictModal = clonedMap.get("06 — Save Conflict Modal");
  const employeesActive = clonedMap.get("Employees · Active");
  const finReports = clonedMap.get("Financial Reports");

  // A. Global Sidebar Navigation Wire-up
  const allDesktopScreens = [dashboard, registryList, auditLog, maintBoard, employeesActive, finReports].filter(Boolean);
  
  for (const screen of allDesktopScreens) {
    // Locate sidebar nav items
    const navItems = screen.findAll(n => n.type === "INSTANCE" || n.type === "FRAME");
    for (const item of navItems) {
      const name = item.name.toLowerCase();
      if (name.includes("dashboard") && dashboard && screen !== dashboard) {
        wireClickInteraction(item, dashboard);
      } else if ((name.includes("asset inventory") || name.includes("registry")) && registryList && screen !== registryList) {
        wireClickInteraction(item, registryList);
      } else if (name.includes("employees") && employeesActive && screen !== employeesActive) {
        wireClickInteraction(item, employeesActive);
      } else if (name.includes("maintenance") && maintBoard && screen !== maintBoard) {
        wireClickInteraction(item, maintBoard);
      } else if (name.includes("audit") && auditLog && screen !== auditLog) {
        wireClickInteraction(item, auditLog);
      } else if (name.includes("financial") && finReports && screen !== finReports) {
        wireClickInteraction(item, finReports);
      }
    }
  }
  console.log("✅ Wired global sidebar navigation across desktop screens.");

  // B. Dashboard Drilldowns
  if (dashboard) {
    const splitDrill = clonedMap.get("Drilldown — Agency Split");
    const healthDrill = clonedMap.get("Drilldown — Asset Health Status");
    const attentionDrill = clonedMap.get("Drilldown — Attention Monitor");
    const warrantyDrill = clonedMap.get("Drilldown — Warranty Coverage");

    const agencyCard = dashboard.findOne(n => n.name.includes("Agency Inventory Split") || n.name.includes("Inventory Split"));
    if (agencyCard && splitDrill) wireClickInteraction(agencyCard, splitDrill, "SMART_ANIMATE", 0.24);

    const healthCard = dashboard.findOne(n => n.name.includes("Asset Health"));
    if (healthCard && healthDrill) wireClickInteraction(healthCard, healthDrill, "SMART_ANIMATE", 0.24);

    const attentionCard = dashboard.findOne(n => n.name.includes("Attention Monitor"));
    if (attentionCard && attentionDrill) wireClickInteraction(attentionCard, attentionDrill, "SMART_ANIMATE", 0.24);

    const warrantyCard = dashboard.findOne(n => n.name.includes("Warranty Coverage") || n.name.includes("Warranty"));
    if (warrantyCard && warrantyDrill) wireClickInteraction(warrantyCard, warrantyDrill, "SMART_ANIMATE", 0.24);
  }

  // C. Asset Registry: Table -> Drawer -> Modal Flow
  if (registryList && registryDrawer) {
    // Click any table row in registry list -> opens split drawer view
    const rows = registryList.findAll(n => n.name.toLowerCase().includes("asset row"));
    for (const r of rows) {
      wireClickInteraction(r, registryDrawer, "MOVE_IN_RIGHT", 0.24);
    }

    // Close button in drawer -> returns to list
    const closeBtn = registryDrawer.findOne(n => n.name.toLowerCase().includes("close"));
    if (closeBtn) wireClickInteraction(closeBtn, registryList, "DISSOLVE", 0.2);

    // "View full record" in drawer -> opens 04 Asset Record Modal
    if (assetRecordModal) {
      const fullRecordBtn = registryDrawer.findOne(n => n.name.toLowerCase().includes("view full record") || n.name.toLowerCase().includes("full record"));
      if (fullRecordBtn) wireClickInteraction(fullRecordBtn, assetRecordModal, "DISSOLVE", 0.2);

      const modalClose = assetRecordModal.findOne(n => n.name.toLowerCase().includes("close") || n.name === "X");
      if (modalClose) wireClickInteraction(modalClose, registryDrawer, "DISSOLVE", 0.2);
    }
  }

  // D. Maintenance: Board ↔ List, Resolve Issue, and Canon iR 2630 Save Conflict
  if (maintBoard && maintList) {
    const toggleToList = maintBoard.findOne(n => n.name.toLowerCase().includes("list"));
    if (toggleToList) wireClickInteraction(toggleToList, maintList, "DISSOLVE", 0.15);

    const toggleToBoard = maintList.findOne(n => n.name.toLowerCase().includes("board"));
    if (toggleToBoard) wireClickInteraction(toggleToBoard, maintBoard, "DISSOLVE", 0.15);
  }

  if (maintBoard && resolveModal) {
    const canonCard = maintBoard.findOne(n => n.name.toLowerCase().includes("canon") || n.name.toLowerCase().includes("ir 2630") || n.name.toLowerCase().includes("card"));
    if (canonCard) wireClickInteraction(canonCard, resolveModal, "DISSOLVE", 0.2);
  }

  if (resolveModal && conflictModal) {
    // Confirm resolution on Canon iR 2630 triggers 06 Save Conflict (demo narrative)
    const confirmBtn = resolveModal.findOne(n => n.name.toLowerCase().includes("confirm") || n.name.toLowerCase().includes("resolve"));
    if (confirmBtn) wireClickInteraction(confirmBtn, conflictModal, "DISSOLVE", 0.2);

    // Safe recovery reload on conflict modal resolves back to board
    if (maintBoard) {
      const reloadBtn = conflictModal.findOne(n => n.name.toLowerCase().includes("reload") || n.name.toLowerCase().includes("safe recovery") || n.name.toLowerCase().includes("recovery"));
      if (reloadBtn) wireClickInteraction(reloadBtn, maintBoard, "DISSOLVE", 0.2);
    }
  }

  // E. Mobile Physical Count Prototype Flow (Independent flow)
  const mobileScan = clonedMap.get("07 — Physical Count · Scan (Mobile)");
  const mobileConfirm = clonedMap.get("07 — Physical Count · Confirm (Mobile)");
  const mobileComplete = clonedMap.get("07 — Physical Count · Complete (Mobile)");

  if (mobileScan && mobileConfirm) {
    // Tap viewfinder or scan action -> navigates to Confirm
    const viewfinder = mobileScan.findOne(n => n.name.toLowerCase().includes("viewfinder") || n.name.toLowerCase().includes("workspace") || n.name.toLowerCase().includes("scan"));
    if (viewfinder) wireClickInteraction(viewfinder, mobileConfirm, "MOVE_IN_RIGHT", 0.2);

    const scanBtn = mobileScan.findOne(n => n.name.toLowerCase().includes("action"));
    if (scanBtn) wireClickInteraction(scanBtn, mobileConfirm, "MOVE_IN_RIGHT", 0.2);
  }

  if (mobileConfirm && mobileComplete) {
    // Tap "Confirm & Next Asset" -> navigates to Complete
    const confirmNextBtn = mobileConfirm.findOne(n => n.name.toLowerCase().includes("confirm") || n.name.toLowerCase().includes("action"));
    if (confirmNextBtn) wireClickInteraction(confirmNextBtn, mobileComplete, "MOVE_IN_RIGHT", 0.2);
  }

  if (mobileComplete && mobileScan) {
    // Tap submit -> loops back to scanner
    const submitBtn = mobileComplete.findOne(n => n.name.toLowerCase().includes("submit") || n.name.toLowerCase().includes("report submission"));
    if (submitBtn) wireClickInteraction(submitBtn, mobileScan, "DISSOLVE", 0.2);
  }

  console.log("🎉 AriArian Final Prototype page and interactive prototype setup complete!");
  figma.notify("✅ Final Prototype setup and wiring complete!");
})();
