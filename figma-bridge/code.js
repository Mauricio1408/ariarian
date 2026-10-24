// AriArian Figma Bridge Plugin: Main Thread
// Runs in the native Figma Plugin API sandbox with full read/write permissions.

figma.showUI(__html__, { width: 340, height: 180, title: "AriArian Bridge" });

figma.ui.onmessage = async (msg) => {
  if (msg && msg.type === "EXECUTE") {
    const { id, code } = msg;
    try {
      // AsyncFunction constructor with figma in scope
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction("figma", code);
      const result = await fn(figma);
      figma.ui.postMessage({
        type: "RESULT",
        id,
        result: result === undefined ? null : result
      });
    } catch (err) {
      console.error("Figma execution error:", err);
      figma.ui.postMessage({
        type: "RESULT",
        id,
        error: err.message || String(err)
      });
    }
  }
};
