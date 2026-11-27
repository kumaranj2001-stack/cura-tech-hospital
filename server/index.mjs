import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest, setSecurityAndCorsHeaders } from "./apiRouter.mjs";
import { setupWebSocketServer, getConnectedClientsSummary, broadcast } from "./websocket.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Serve built static frontend when browser hits non-API routes (and dist/ exists)
  const isBrowserHtmlRoot = pathname === "/" && String(req.headers.accept || "").includes("text/html");
  if (!pathname.startsWith("/api") && !pathname.startsWith("/ws") && (pathname !== "/" || isBrowserHtmlRoot)) {
    if (fs.existsSync(DIST_DIR)) {
      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      let filePath = path.join(DIST_DIR, safePath === "/" ? "index.html" : safePath);
      if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, "index.html");
      }
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        setSecurityAndCorsHeaders(res);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
  }

  await handleApiRequest(req, res, {
    broadcast,
    getRealtimeSummary: getConnectedClientsSummary,
  });
});

// Attach bidirectional WebSocket real-time synchronization server
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[Cura-Tech Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Cura-Tech Backend] Real-time WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`[Cura-Tech Backend] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[Cura-Tech Backend] Real-time status: http://localhost:${PORT}/api/realtime/status`);
});
