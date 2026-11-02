import express, { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { injectFavicon } from "./lib/html";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Optional subdomain: when RAKEEZ_HOSTNAME is set, that hostname serves the static
  // rakeez/ gallery as its own site (with normal directory-index resolution), bypassing
  // the main app entirely. Left unset, this is a no-op — same pattern as PORTAL_HOSTNAME.
  const rakeezHost = process.env.RAKEEZ_HOSTNAME;
  if (rakeezHost) {
    const rakeezDir = path.resolve(import.meta.dirname, "..", "client", "public", "rakeez");
    app.use((req, res, next) => {
      if (req.hostname === rakeezHost) return express.static(rakeezDir)(req, res, next);
      next();
    });
  }

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      try {
        const config = await storage.getSiteConfig();
        page = injectFavicon(page, config.favicon_url);
      } catch (err) {
        console.error("Failed to inject favicon:", err);
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
