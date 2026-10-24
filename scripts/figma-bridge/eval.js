/**
 * Evaluator helper to send code to the local bridge
 * Usage: bun scripts/figma-bridge/eval.js "return figma.currentPage.name"
 * Or:    bun scripts/figma-bridge/eval.js --file ./path-to-script.js
 */

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: bun eval.js <code> OR bun eval.js --file <filePath>");
  process.exit(1);
}

let code = "";
if (args[0] === "--file") {
  const filePath = args[1];
  code = await Bun.file(filePath).text();
} else {
  code = args.join(" ");
}

try {
  const res = await fetch("http://localhost:8765/eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log(JSON.stringify(data.result, null, 2));
  } else {
    console.error("❌ Figma Error:", data.error);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Failed to reach bridge server:", err.message);
  process.exit(1);
}
