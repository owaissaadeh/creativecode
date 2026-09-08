import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { injectFavicon } from "./lib/html";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", async (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");
    try {
      const config = await storage.getSiteConfig();
      html = injectFavicon(html, config.favicon_url);
    } catch (err) {
      console.error("Failed to inject favicon:", err);
    }
    res.set("Content-Type", "text/html").send(html);
  });
}
