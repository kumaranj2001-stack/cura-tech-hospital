import path from "path";
import http from "node:http";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function erpApiBridgePlugin(): Plugin {
  return {
    name: "vite-plugin-erp-api-bridge",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (!url.pathname.startsWith("/api")) {
          next();
          return;
        }

        // Buffer raw request body once (up to 30MB for PDF invoice parsing)
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let aborted = false;

        req.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > 30 * 1024 * 1024) {
            aborted = true;
            req.destroy();
            if (!res.writableEnded) {
              res.statusCode = 413;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: "Payload too large" }));
            }
            return;
          }
          chunks.push(chunk);
        });

        req.on("end", async () => {
          if (aborted) return;
          const rawBody = Buffer.concat(chunks).toString("utf8");

          // Try forwarding to dedicated backend server on port 3001 first
          const forwarded = await new Promise<boolean>((resolve) => {
            const headers: Record<string, string | string[]> = {};
            for (const [k, v] of Object.entries(req.headers)) {
              if (v !== undefined && k.toLowerCase() !== "host" && k.toLowerCase() !== "content-length") {
                headers[k] = v;
              }
            }
            if (rawBody) {
              headers["content-length"] = String(Buffer.byteLength(rawBody));
            }
            const proxyReq = http.request(
              {
                hostname: "127.0.0.1",
                port: Number(process.env.PORT || 3001),
                path: req.url,
                method: req.method,
                headers,
                timeout: 15000,
              },
              (proxyRes) => {
                res.statusCode = proxyRes.statusCode || 200;
                for (const [hk, hv] of Object.entries(proxyRes.headers)) {
                  if (hv !== undefined) res.setHeader(hk, hv);
                }
                proxyRes.pipe(res);
                proxyRes.on("end", () => resolve(true));
              }
            );
            proxyReq.on("error", () => resolve(false));
            proxyReq.on("timeout", () => {
              proxyReq.destroy();
              resolve(false);
            });
            if (rawBody) proxyReq.write(rawBody);
            proxyReq.end();
          });

          if (forwarded) return;

          // Seamless fallback to in-process shared API router when running Vite standalone
          try {
            const routerPath = "./server/apiRouter.mjs";
            const mod = (await import(/* @vite-ignore */ routerPath)) as {
              handleApiRequest: (r: unknown, s: unknown, o: { rawBody: string }) => Promise<boolean>;
            };
            await mod.handleApiRequest(req, res, { rawBody });
          } catch (err) {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "API handler failed" }));
            }
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), erpApiBridgePlugin()],
  server: {
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:3001",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
