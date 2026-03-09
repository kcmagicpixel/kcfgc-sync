import type { Application } from "express";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Controller } from "../controller.model.js";
import { Container } from "#container";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** This list must contain ever route in the frontend, so that we can send the html on page reload. */
const frontendRoutes: string[] = [
  "/login",
  "/jobs",
  "/jobs/new",
  "/tournaments",
  "/posts",
  "/posts/new",
  "/posts/images",
  "/posts/replacements",
  "/users",
];

export class DashboardController implements Controller {
  async register(app: Application) {
    if (process.env["NODE_ENV"] === "production") {
      app.use(express.static(path.join(__dirname, "../../../public/web")));
      for (const route of frontendRoutes) {
        app.get(route, function sendIndexHtml(req, res) {
          return res.sendFile(
            path.join(__dirname, "../../../public/web/index.html")
          );
        });
      }
    } else {
      const { createServer } = await import("vite");
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: "spa",
        base: "/",
        configFile: path.join(
          __dirname,
          "../../../../dashboard-web/vite.config.ts"
        ),
        root: path.join(__dirname, "../../../../dashboard-web"),
      });
      app.use(vite.middlewares);
    }
  }
}

Container.register(DashboardController, []);
