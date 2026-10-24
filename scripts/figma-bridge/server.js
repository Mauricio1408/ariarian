/**
 * Local Figma Bridge Server
 * Runs with Bun on port 8765.
 * Exposes:
 *  - WebSocket at ws://localhost:8765/ws for Figma Plugin UI
 *  - POST /eval to execute arbitrary Figma Plugin code and get results
 *  - GET /status to check connection status
 */

const PORT = 8765;
let activeSocket = null;
const pendingRequests = new Map();
let reqCounter = 0;

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Health / Status endpoint
    if (url.pathname === "/status" && req.method === "GET") {
      return Response.json(
        {
          ok: true,
          connected: activeSocket !== null,
          pending: pendingRequests.size,
        },
        {
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Execute code in Figma
    if (url.pathname === "/eval" && req.method === "POST") {
      if (!activeSocket) {
        return Response.json(
          {
            ok: false,
            error: "Figma Bridge plugin is not connected. Please open the 'AriArian Bridge' plugin in Figma.",
          },
          {
            status: 503,
            headers: { "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      return new Promise(async (resolve) => {
        try {
          const body = await req.json();
          const code = body.code;
          if (!code) {
            return resolve(
              Response.json(
                { ok: false, error: "Missing 'code' in request body" },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
              )
            );
          }

          const id = `req_${++reqCounter}_${Date.now()}`;
          const timeout = setTimeout(() => {
            if (pendingRequests.has(id)) {
              pendingRequests.delete(id);
              resolve(
                Response.json(
                  { ok: false, error: "Execution timed out in Figma (30s)" },
                  { status: 504, headers: { "Access-Control-Allow-Origin": "*" } }
                )
              );
            }
          }, 30000);

          pendingRequests.set(id, { resolve, timeout });
          activeSocket.send(JSON.stringify({ type: "EVAL", id, code }));
        } catch (err) {
          resolve(
            Response.json(
              { ok: false, error: err.message },
              { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
            )
          );
        }
      });
    }

    return new Response("Figma Bridge Server Running", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },

  websocket: {
    open(ws) {
      console.log("🔌 Figma Plugin connected via WebSocket!");
      activeSocket = ws;
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message);
        if (data.type === "RESULT" && data.id) {
          const pending = pendingRequests.get(data.id);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(data.id);
            pending.resolve(
              Response.json(
                {
                  ok: data.error ? false : true,
                  result: data.result,
                  error: data.error,
                },
                {
                  headers: { "Access-Control-Allow-Origin": "*" },
                }
              )
            );
          }
        }
      } catch (err) {
        console.error("Error processing message from Figma:", err);
      }
    },
    close(ws) {
      console.log("🔌 Figma Plugin disconnected.");
      if (activeSocket === ws) activeSocket = null;
    },
  },
});

console.log(`🚀 Figma Bridge Server listening on http://localhost:${PORT}`);
console.log(`   - WebSocket: ws://localhost:${PORT}/ws`);
console.log(`   - Eval API:  http://localhost:${PORT}/eval`);
console.log(`   - Status:    http://localhost:${PORT}/status`);
